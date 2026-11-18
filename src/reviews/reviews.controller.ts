import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // GET /reviews/product/:productId - Ai cũng xem được đánh giá sản phẩm
  @Get('product/:productId')
  findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.findByProduct(productId);
  }

  // POST /reviews - Khách đánh giá sản phẩm đã mua
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  // PATCH /reviews/:id - Khách chỉnh sửa đánh giá của mình
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.update(user.id, id, dto);
  }

  // GET /reviews?productId=&status= - Admin xem danh sách đánh giá
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAllForAdmin(@Query('productId') productId?: string, @Query('status') status?: string) {
    return this.reviewsService.findAllForAdmin(productId, status);
  }

  // PATCH /reviews/:id/hide - Admin ẩn đánh giá vi phạm
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/hide')
  hide(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.hide(id);
  }

  // PATCH /reviews/:id/restore - Admin khôi phục đánh giá
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.restore(id);
  }
}
