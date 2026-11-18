import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

// Giỏ hàng chỉ dành cho khách hàng
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // GET /cart - Xem giỏ hàng của mình
  @Get()
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  // POST /cart/items - Thêm sản phẩm vào giỏ
  @Post('items')
  addItem(@CurrentUser() user: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  // PATCH /cart/items/:itemId - Đổi số lượng
  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() user: any,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  // DELETE /cart/items/:itemId - Xóa 1 sản phẩm khỏi giỏ
  @Delete('items/:itemId')
  removeItem(@CurrentUser() user: any, @Param('itemId', ParseIntPipe) itemId: number) {
    return this.cartService.removeItem(user.id, itemId);
  }

  // DELETE /cart - Xóa toàn bộ giỏ hàng
  @Delete()
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user.id);
  }
}
