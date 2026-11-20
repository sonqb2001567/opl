import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

@ApiTags(ApiTag.Categories)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /categories?status= - Ai cũng xem được danh mục
  @ApiOperation({ summary: 'Danh sách danh mục (công khai)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @Get()
  findAll(@Query('status') status?: string) {
    return this.categoriesService.findAll(status);
  }

  // GET /categories/:id
  @ApiOperation({ summary: 'Chi tiết danh mục (công khai)' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  // POST /categories - Product Staff thêm danh mục
  @ApiOperation({ summary: 'Thêm danh mục' })
  @ApiConflictResponse({ description: 'Tên danh mục đã tồn tại' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  // PATCH /categories/:id - Chỉnh sửa danh mục
  @ApiOperation({ summary: 'Chỉnh sửa danh mục' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  // PATCH /categories/:id/deactivate - Ngừng sử dụng danh mục
  @ApiOperation({
    summary: 'Ngừng sử dụng danh mục',
    description: 'Chuyển status sang INACTIVE, không xóa dữ liệu.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.deactivate(id);
  }

  // DELETE /categories/:id - Chỉ xóa được khi không còn sản phẩm liên kết
  @ApiOperation({
    summary: 'Xóa danh mục',
    description: 'Chỉ xóa được khi danh mục không còn sản phẩm nào liên kết.',
  })
  @ApiBadRequestResponse({ description: 'Danh mục vẫn còn sản phẩm liên kết' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy danh mục' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
