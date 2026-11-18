import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /categories?status= - Ai cũng xem được danh mục
  @Get()
  findAll(@Query('status') status?: string) {
    return this.categoriesService.findAll(status);
  }

  // GET /categories/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  // POST /categories - Product Staff thêm danh mục
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  // PATCH /categories/:id - Chỉnh sửa danh mục
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  // PATCH /categories/:id/deactivate - Ngừng sử dụng danh mục
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.deactivate(id);
  }

  // DELETE /categories/:id - Chỉ xóa được khi không còn sản phẩm liên kết
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
