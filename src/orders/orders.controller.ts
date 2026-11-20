import { Body, Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

const ORDER_STATUSES = ['PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

@ApiTags(ApiTag.Orders)
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ===== API cho khách hàng =====

  // POST /orders - Đặt hàng từ giỏ hàng
  @ApiOperation({
    summary: '[Customer] Đặt hàng từ giỏ hàng',
    description:
      'Lấy toàn bộ sản phẩm đang có trong giỏ để tạo đơn, trừ tồn kho rồi xóa giỏ. ' +
      'Giỏ hàng phải có ít nhất 1 sản phẩm.',
  })
  @ApiBadRequestResponse({ description: 'Giỏ hàng trống, không đủ tồn kho, hoặc mã giảm giá không hợp lệ' })
  @ApiAuth('CUSTOMER')
  @Roles('CUSTOMER')
  @Post()
  placeOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.placeOrder(user.id, dto);
  }

  // GET /orders/my?status= - Lịch sử mua hàng của mình
  @ApiOperation({ summary: '[Customer] Lịch sử mua hàng của mình' })
  @ApiQuery({ name: 'status', required: false, enum: ORDER_STATUSES })
  @ApiAuth('CUSTOMER')
  @Roles('CUSTOMER')
  @Get('my')
  getMyOrders(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.ordersService.getMyOrders(user.id, status);
  }

  // GET /orders/my/:id - Chi tiết đơn của mình (theo dõi trạng thái)
  @ApiOperation({ summary: '[Customer] Chi tiết đơn của mình, dùng để theo dõi trạng thái' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng của bạn' })
  @ApiAuth('CUSTOMER')
  @Roles('CUSTOMER')
  @Get('my/:id')
  getMyOrder(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getMyOrder(user.id, id);
  }

  // POST /orders/:id/cancel - Khách hủy đơn (khi đơn còn chờ xác nhận)
  @ApiOperation({
    summary: '[Customer] Hủy đơn của mình',
    description: 'Chỉ hủy được khi đơn còn ở trạng thái PENDING. Tồn kho được hoàn lại.',
  })
  @ApiBadRequestResponse({ description: 'Đơn đã được xử lý, không hủy được nữa' })
  @ApiAuth('CUSTOMER')
  @Roles('CUSTOMER')
  @Post(':id/cancel')
  cancelMyOrder(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelMyOrder(user.id, id, dto);
  }

  // POST /orders/:id/payment-callback - Giả lập kết quả thanh toán online
  @ApiOperation({
    summary: '[Customer] Giả lập kết quả thanh toán online',
    description: 'Dùng cho đơn BANK_TRANSFER / E_WALLET. Gửi `success=true` khi cổng thanh toán báo thành công.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['success'],
      properties: { success: { type: 'boolean', example: true } },
    },
  })
  @ApiAuth('CUSTOMER')
  @Roles('CUSTOMER')
  @Post(':id/payment-callback')
  paymentCallback(@Param('id', ParseIntPipe) id: number, @Body('success', ParseBoolPipe) success: boolean) {
    return this.ordersService.handlePaymentCallback(id, success);
  }

  // ===== API cho nhân viên kho =====

  // GET /orders?status= - Danh sách đơn cần xử lý
  @ApiOperation({ summary: '[Staff] Danh sách đơn hàng cần xử lý' })
  @ApiQuery({ name: 'status', required: false, enum: ORDER_STATUSES })
  @ApiAuth('INVENTORY_STAFF', 'ADMIN')
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @Get()
  getAllOrders(@Query('status') status?: string) {
    return this.ordersService.getAllOrders(status);
  }

  // GET /orders/:id - Chi tiết đơn hàng
  @ApiOperation({ summary: '[Staff] Chi tiết đơn hàng' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng' })
  @ApiAuth('INVENTORY_STAFF', 'ADMIN')
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @Get(':id')
  getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderById(id);
  }

  // PATCH /orders/:id/status - Cập nhật trạng thái theo quy trình
  // PENDING -> PREPARING -> SHIPPING -> DELIVERED
  @ApiOperation({
    summary: '[Staff] Cập nhật trạng thái đơn hàng',
    description: 'Phải đi đúng thứ tự: PENDING → PREPARING → SHIPPING → DELIVERED. Không được nhảy bước.',
  })
  @ApiBadRequestResponse({ description: 'Chuyển trạng thái không đúng quy trình' })
  @ApiAuth('INVENTORY_STAFF')
  @Roles('INVENTORY_STAFF')
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  // POST /orders/:id/cancel-by-staff - Nhân viên kho hủy đơn
  @ApiOperation({
    summary: '[Staff] Nhân viên kho hủy đơn',
    description: 'Dùng khi không thể giao hàng. Tồn kho được hoàn lại.',
  })
  @ApiBadRequestResponse({ description: 'Đơn đã giao hoặc đã hủy trước đó' })
  @ApiAuth('INVENTORY_STAFF')
  @Roles('INVENTORY_STAFF')
  @Post(':id/cancel-by-staff')
  cancelByStaff(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelByStaff(id, dto, user.id);
  }
}
