import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy giỏ hàng của khách, chưa có thì tạo mới (quan hệ 1-1 với User)
  private async getOrCreateCart(customerId: number) {
    let cart = await this.prisma.cart.findUnique({ where: { customerId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { customerId } });
    }
    return cart;
  }

  // Xem giỏ hàng kèm tổng tiền tạm tính
  async getCart(customerId: number) {
    const cart = await this.getOrCreateCart(customerId);

    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        product: {
          select: { id: true, productName: true, skuCode: true, price: true, imageUrl: true, status: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Tạm tính = tổng (giá x số lượng)
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.product.price) * item.quantity;
    }

    return { cartId: cart.id, items, subtotal };
  }

  // Thêm sản phẩm vào giỏ (đã có thì cộng dồn số lượng)
  async addItem(customerId: number, dto: AddCartItemDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    if (product.status !== 'ON_SALE') {
      throw new BadRequestException('Sản phẩm đã ngừng kinh doanh');
    }

    const cart = await this.getOrCreateCart(customerId);

    const existedItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: dto.productId } },
    });

    if (existedItem) {
      await this.prisma.cartItem.update({
        where: { id: existedItem.id },
        data: { quantity: existedItem.quantity + dto.quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId: dto.productId, quantity: dto.quantity },
      });
    }

    return this.getCart(customerId);
  }

  // Cập nhật số lượng 1 sản phẩm trong giỏ
  async updateItem(customerId: number, itemId: number, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(customerId);

    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    // Kiểm tra item có thuộc giỏ hàng của mình không
    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(customerId);
  }

  // Xóa 1 sản phẩm khỏi giỏ
  async removeItem(customerId: number, itemId: number) {
    const cart = await this.getOrCreateCart(customerId);

    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(customerId);
  }

  // Xóa toàn bộ giỏ hàng
  async clearCart(customerId: number) {
    const cart = await this.getOrCreateCart(customerId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Đã xóa toàn bộ giỏ hàng' };
  }
}
