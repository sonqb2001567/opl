import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

// Giỏ hàng chỉ dành cho khách hàng
@ApiTags(ApiTag.Cart)
@ApiAuth('CUSTOMER')
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CUSTOMER')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // GET /cart - Xem giỏ hàng của mình
  @ApiOperation({
    summary: 'Xem giỏ hàng của mình',
    description: 'Giỏ hàng được tạo tự động ở lần thêm sản phẩm đầu tiên.',
  })
  @Get()
  getCart(@CurrentUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  // POST /cart/items - Thêm sản phẩm vào giỏ
  @ApiOperation({
    summary: 'Thêm sản phẩm vào giỏ',
    description: 'Nếu sản phẩm đã có trong giỏ thì số lượng được cộng dồn.',
  })
  @ApiBadRequestResponse({ description: 'Sản phẩm ngừng bán hoặc không đủ tồn kho' })
  @Post('items')
  addItem(@CurrentUser() user: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  // PATCH /cart/items/:itemId - Đổi số lượng
  @ApiOperation({ summary: 'Đổi số lượng một dòng trong giỏ' })
  @ApiParam({ name: 'itemId', description: 'ID của cart item (không phải productId)', example: 1 })
  @ApiNotFoundResponse({ description: 'Không tìm thấy dòng này trong giỏ của bạn' })
  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() user: any,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  // DELETE /cart/items/:itemId - Xóa 1 sản phẩm khỏi giỏ
  @ApiOperation({ summary: 'Xóa một sản phẩm khỏi giỏ' })
  @ApiParam({ name: 'itemId', description: 'ID của cart item (không phải productId)', example: 1 })
  @ApiNotFoundResponse({ description: 'Không tìm thấy dòng này trong giỏ của bạn' })
  @Delete('items/:itemId')
  removeItem(@CurrentUser() user: any, @Param('itemId', ParseIntPipe) itemId: number) {
    return this.cartService.removeItem(user.id, itemId);
  }

  // DELETE /cart - Xóa toàn bộ giỏ hàng
  @ApiOperation({ summary: 'Xóa toàn bộ giỏ hàng' })
  @Delete()
  clearCart(@CurrentUser() user: any) {
    return this.cartService.clearCart(user.id);
  }
}
