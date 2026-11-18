import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /products?search=&categoryId=&status=&page=&limit= - Ai cũng xem được
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll({ search, categoryId, status, page, limit });
  }

  // GET /products/:id - Chi tiết sản phẩm (kèm tồn kho + đánh giá)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // POST /products - Product Staff thêm sản phẩm
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  // PATCH /products/:id - Chỉnh sửa sản phẩm
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  // PATCH /products/:id/discontinue - Ngừng kinh doanh
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id/discontinue')
  discontinue(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.discontinue(id);
  }

  // PATCH /products/:id/resume - Bán lại
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id/resume')
  resume(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.resume(id);
  }

  // DELETE /products/:id - Chỉ xóa khi chưa có lịch sử giao dịch
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  // POST /products/:id/image - Upload ảnh sản phẩm (multipart/form-data, field "file")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          // Đặt tên file duy nhất để không bị ghi đè
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + extname(file.originalname);
          callback(null, uniqueName);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Chỉ cho phép file ảnh
        if (!file.mimetype.startsWith('image/')) {
          return callback(new BadRequestException('Chỉ cho phép upload file ảnh'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // tối đa 5MB
    }),
  )
  uploadImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file ảnh');
    }
    return this.productsService.updateImage(id, '/uploads/' + file.filename);
  }

  // DELETE /products/:id/image - Xóa ảnh sản phẩm
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Delete(':id/image')
  removeImage(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.removeImage(id);
  }
}
