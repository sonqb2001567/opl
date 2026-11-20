import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

@ApiTags(ApiTag.Reviews)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // GET /reviews/product/:productId - Ai cũng xem được đánh giá sản phẩm
  @ApiOperation({
    summary: 'Đánh giá của một sản phẩm (công khai)',
    description: 'Chỉ trả về các đánh giá đang hiển thị (VISIBLE).',
  })
  @Get('product/:productId')
  findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.findByProduct(productId);
  }

  // POST /reviews - Khách đánh giá sản phẩm đã mua
  @ApiOperation({
    summary: '[Customer] Đánh giá sản phẩm đã mua',
    description: 'Chỉ đánh giá được sản phẩm thuộc đơn đã DELIVERED, và mỗi sản phẩm chỉ đánh giá 1 lần.',
  })
  @ApiBadRequestResponse({ description: 'Chưa mua sản phẩm này hoặc đã đánh giá trước đó' })
  @ApiAuth('CUSTOMER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  // PATCH /reviews/:id - Khách chỉnh sửa đánh giá của mình
  @ApiOperation({ summary: '[Customer] Chỉnh sửa đánh giá của mình' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đánh giá của bạn' })
  @ApiAuth('CUSTOMER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.update(user.id, id, dto);
  }

  // GET /reviews?productId=&status= - Admin xem danh sách đánh giá
  @ApiOperation({ summary: '[Admin] Danh sách đánh giá để kiểm duyệt' })
  @ApiQuery({ name: 'productId', required: false, example: 1 })
  @ApiQuery({ name: 'status', required: false, enum: ['VISIBLE', 'HIDDEN'] })
  @ApiAuth('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAllForAdmin(@Query('productId') productId?: string, @Query('status') status?: string) {
    return this.reviewsService.findAllForAdmin(productId, status);
  }

  // PATCH /reviews/:id/hide - Admin ẩn đánh giá vi phạm
  @ApiOperation({ summary: '[Admin] Ẩn đánh giá vi phạm' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đánh giá' })
  @ApiAuth('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/hide')
  hide(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.hide(id);
  }

  // PATCH /reviews/:id/restore - Admin khôi phục đánh giá
  @ApiOperation({ summary: '[Admin] Khôi phục đánh giá đã ẩn' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đánh giá' })
  @ApiAuth('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.restore(id);
  }
}
