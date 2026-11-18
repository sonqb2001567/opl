import { Body, Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ===== API cho khách hàng =====

  // POST /orders - Đặt hàng từ giỏ hàng
  @Roles('CUSTOMER')
  @Post()
  placeOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.placeOrder(user.id, dto);
  }

  // GET /orders/my?status= - Lịch sử mua hàng của mình
  @Roles('CUSTOMER')
  @Get('my')
  getMyOrders(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.ordersService.getMyOrders(user.id, status);
  }

  // GET /orders/my/:id - Chi tiết đơn của mình (theo dõi trạng thái)
  @Roles('CUSTOMER')
  @Get('my/:id')
  getMyOrder(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getMyOrder(user.id, id);
  }

  // POST /orders/:id/cancel - Khách hủy đơn (khi đơn còn chờ xác nhận)
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
  @Roles('CUSTOMER')
  @Post(':id/payment-callback')
  paymentCallback(@Param('id', ParseIntPipe) id: number, @Body('success', ParseBoolPipe) success: boolean) {
    return this.ordersService.handlePaymentCallback(id, success);
  }

  // ===== API cho nhân viên kho =====

  // GET /orders?status= - Danh sách đơn cần xử lý
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @Get()
  getAllOrders(@Query('status') status?: string) {
    return this.ordersService.getAllOrders(status);
  }

  // GET /orders/:id - Chi tiết đơn hàng
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @Get(':id')
  getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderById(id);
  }

  // PATCH /orders/:id/status - Cập nhật trạng thái theo quy trình
  // PENDING -> PREPARING -> SHIPPING -> DELIVERED
  @Roles('INVENTORY_STAFF')
  @Patch(':id/status')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  // POST /orders/:id/cancel-by-staff - Nhân viên kho hủy đơn
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
