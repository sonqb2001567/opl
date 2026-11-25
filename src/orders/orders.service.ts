import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly settingsService: SettingsService,
  ) {}

  // Khách hàng đặt hàng từ giỏ hàng.
  // Order - OrderDetail là quan hệ 1-1 nên MỖI SẢN PHẨM trong giỏ thành MỘT ĐƠN RIÊNG:
  // giỏ có 3 sản phẩm => tạo 3 đơn hàng, mỗi đơn có đúng 1 dòng chi tiết.
  async placeOrder(customerId: number, dto: CreateOrderDto) {
    // 1. Lấy giỏ hàng
    const cart = await this.prisma.cart.findUnique({
      where: { customerId },
      include: { cartItems: { include: { product: true } } },
    });
    if (!cart || cart.cartItems.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    // 2. Kiểm tra từng sản phẩm: còn bán không, tồn kho đủ không
    for (const item of cart.cartItems) {
      if (item.product.status !== 'ON_SALE') {
        throw new BadRequestException(`Sản phẩm "${item.product.productName}" đã ngừng kinh doanh, vui lòng xóa khỏi giỏ hàng`);
      }
      const stock = await this.inventoryService.getStock(item.productId);
      if (stock < item.quantity) {
        throw new BadRequestException(
          `Sản phẩm "${item.product.productName}" không đủ hàng (còn ${stock}, cần ${item.quantity})`,
        );
      }
    }

    // 3. Tính tiền hàng từng dòng (giá lấy từ DB, không tin giá từ client gửi lên)
    const lines = cart.cartItems.map((item) => ({
      item,
      lineSubtotal: Number(item.product.price) * item.quantity,
      lineDiscount: 0,
    }));
    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);

    // 4. Kiểm tra mã giảm giá (nếu có)
    let discountAmount = 0;
    if (dto.voucherCode) {
      const voucher = await this.prisma.voucher.findUnique({ where: { code: dto.voucherCode } });
      const now = new Date();
      if (!voucher || voucher.status !== 'ACTIVE' || now < voucher.validFrom || now > voucher.validTo) {
        throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn');
      }
      // Giảm giá không vượt quá tiền hàng
      discountAmount = Math.min(Number(voucher.discountValue), subtotal);
    }

    // 5. Chia tiền giảm giá cho từng đơn theo tỷ lệ tiền hàng.
    //    Phần lẻ do làm tròn được dồn vào đơn cuối để tổng giảm giá khớp đúng mã.
    let remainingDiscount = discountAmount;
    lines.forEach((line, index) => {
      const isLast = index === lines.length - 1;
      line.lineDiscount = isLast
        ? remainingDiscount
        : Math.min(remainingDiscount, Math.round((discountAmount * line.lineSubtotal) / subtotal));
      remainingDiscount -= line.lineDiscount;
    });

    // 6. Phí vận chuyển lấy từ cấu hình hệ thống, tính cho từng đơn
    //    vì mỗi đơn được giao độc lập
    const shippingFee = this.settingsService.getShippingFee();

    // 7. Tạo các đơn hàng + chi tiết + trừ kho + xóa giỏ trong 1 transaction
    //    để đảm bảo dữ liệu nhất quán, không trừ kho nhiều lần
    const orders = await this.prisma.$transaction(async (tx) => {
      const created = [];

      for (const line of lines) {
        const newOrder = await tx.order.create({
          data: {
            customerId,
            shippingAddress: dto.shippingAddress,
            paymentMethod: dto.paymentMethod,
            paymentStatus: 'UNPAID',
            shippingFee,
            discountAmount: line.lineDiscount,
            totalAmount: line.lineSubtotal - line.lineDiscount + shippingFee,
            status: 'PENDING',
            // Quan hệ 1-1: tạo đúng 1 dòng chi tiết cho đơn
            orderDetail: {
              create: {
                productId: line.item.productId,
                quantity: line.item.quantity,
                unitPrice: line.item.product.price, // lưu giá tại thời điểm đặt hàng
              },
            },
          },
          include: { orderDetail: { include: { product: true } } },
        });

        // Ghi nhận xuất kho cho sản phẩm của đơn
        await tx.inventoryTransaction.create({
          data: {
            productId: line.item.productId,
            staffId: customerId, // người thực hiện là khách đặt hàng
            transactionType: 'EXPORT',
            quantity: line.item.quantity,
            reason: `Xuất kho cho đơn hàng #${newOrder.id}`,
          },
        });

        created.push(newOrder);
      }

      // Xóa giỏ hàng sau khi đặt thành công
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    return {
      message:
        orders.length === 1
          ? 'Đặt hàng thành công'
          : `Đặt hàng thành công, giỏ hàng được tách thành ${orders.length} đơn (mỗi đơn 1 sản phẩm)`,
      orderCount: orders.length,
      orders,
      summary: {
        subtotal,
        discountAmount,
        shippingFee, // phí mỗi đơn
        totalShippingFee: shippingFee * orders.length,
        totalAmount: subtotal - discountAmount + shippingFee * orders.length,
      },
    };
  }

  // Khách xem lịch sử mua hàng của mình
  getMyOrders(customerId: number, status?: string) {
    const where: any = { customerId };
    if (status) {
      where.status = status;
    }
    return this.prisma.order.findMany({
      where,
      include: { orderDetail: { include: { product: { select: { id: true, productName: true, imageUrl: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Khách xem chi tiết 1 đơn của mình
  async getMyOrder(customerId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetail: { include: { product: true } } },
    });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order;
  }

  // Khách hủy đơn của mình - chỉ khi đơn đang chờ xác nhận
  async cancelMyOrder(customerId: number, orderId: number, dto: CancelOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Chỉ được hủy đơn khi đơn đang ở trạng thái chờ xác nhận');
    }
    return this.cancelOrder(orderId, dto.reason, customerId);
  }

  // Nhân viên kho xem danh sách đơn hàng (lọc theo trạng thái)
  getAllOrders(status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    return this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Nhân viên kho xem chi tiết đơn hàng
  async getOrderById(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        orderDetail: { include: { product: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    return order;
  }

  // Nhân viên kho cập nhật trạng thái đơn theo đúng quy trình
  async updateStatus(orderId: number, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Quy trình: PENDING -> PREPARING -> SHIPPING -> DELIVERED
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['PREPARING'],
      PREPARING: ['SHIPPING'],
      SHIPPING: ['DELIVERED'],
    };

    const allowed = allowedTransitions[order.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển đơn từ trạng thái ${order.status} sang ${dto.status}`,
      );
    }

    const data: any = { status: dto.status };

    // Đơn COD giao thành công thì coi như đã thanh toán
    if (dto.status === 'DELIVERED' && order.paymentMethod === 'COD' && order.paymentStatus === 'UNPAID') {
      data.paymentStatus = 'PAID';
    }

    const updated = await this.prisma.order.update({ where: { id: orderId }, data });
    return { message: 'Cập nhật trạng thái thành công', order: updated };
  }

  // Nhân viên kho hủy đơn - được hủy khi đơn chưa giao đi
  async cancelByStaff(orderId: number, dto: CancelOrderDto, staffId: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    if (order.status !== 'PENDING' && order.status !== 'PREPARING') {
      throw new BadRequestException('Chỉ được hủy đơn đang chờ xác nhận hoặc đang chuẩn bị');
    }
    return this.cancelOrder(orderId, dto.reason, staffId);
  }

  // Hàm hủy đơn dùng chung: cập nhật trạng thái + hoàn kho trong 1 transaction.
  // Kiểm tra trạng thái ngay trong transaction để không hoàn kho 2 lần.
  private async cancelOrder(orderId: number, reason: string, userId: number) {
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderDetail: true },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }
      // Đơn đã hủy rồi thì không hủy lại (tránh hoàn kho nhiều lần)
      if (order.status === 'CANCELLED') {
        throw new BadRequestException('Đơn hàng đã được hủy trước đó');
      }
      if (order.status === 'DELIVERED') {
        throw new BadRequestException('Đơn hàng đã giao, không thể hủy');
      }

      // Hoàn kho: nhập lại số lượng đã xuất khi tạo đơn (1-1 nên chỉ có 1 dòng)
      if (order.orderDetail) {
        await tx.inventoryTransaction.create({
          data: {
            productId: order.orderDetail.productId,
            staffId: userId,
            transactionType: 'IMPORT',
            quantity: order.orderDetail.quantity,
            reason: `Hoàn kho do hủy đơn hàng #${order.id}`,
          },
        });
      }

      // Đơn đã thanh toán thì ghi nhận cần hoàn tiền
      const paymentStatus = order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus;

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelReason: reason, paymentStatus },
      });
    });

    return { message: 'Hủy đơn hàng thành công', order: cancelled };
  }

  // Giả lập callback từ cổng thanh toán online (BANK_TRANSFER / E_WALLET)
  async handlePaymentCallback(orderId: number, success: boolean) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    if (order.paymentMethod === 'COD') {
      throw new BadRequestException('Đơn COD không dùng thanh toán online');
    }
    if (order.paymentStatus !== 'UNPAID') {
      throw new BadRequestException('Đơn hàng đã được xử lý thanh toán trước đó');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: success ? 'PAID' : 'FAILED' },
    });
    return { message: success ? 'Thanh toán thành công' : 'Thanh toán thất bại', order: updated };
  }
}
