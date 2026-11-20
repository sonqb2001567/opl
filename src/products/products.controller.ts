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
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

@ApiTags(ApiTag.Products)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /products?search=&categoryId=&status=&page=&limit= - Ai cũng xem được
  @ApiOperation({
    summary: 'Danh sách sản phẩm, có tìm kiếm và phân trang (công khai)',
    description: 'Mặc định chỉ trả về sản phẩm đang bán (ON_SALE). Truyền `status=ALL` để xem tất cả.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm theo tên sản phẩm', example: 'iphone' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Lọc theo ID danh mục', example: 1 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ON_SALE', 'DISCONTINUED', 'ALL'],
    description: 'Bỏ trống = chỉ ON_SALE',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Trang, mặc định 1', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Số item mỗi trang, mặc định 10', example: 10 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1,
            productName: 'iPhone 15 Pro 256GB',
            skuCode: 'IP15P-256',
            price: 29990000,
            status: 'ON_SALE',
            imageUrl: '/uploads/1731000000000-123456789.jpg',
            categoryId: 1,
            category: { id: 1, categoryName: 'Điện thoại', status: 'ACTIVE' },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      },
    },
  })
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
  @ApiOperation({ summary: 'Chi tiết sản phẩm, kèm tồn kho và điểm đánh giá (công khai)' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // POST /products - Product Staff thêm sản phẩm
  @ApiOperation({ summary: 'Thêm sản phẩm' })
  @ApiConflictResponse({ description: 'Mã SKU đã tồn tại' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  // PATCH /products/:id - Chỉnh sửa sản phẩm
  @ApiOperation({ summary: 'Chỉnh sửa sản phẩm' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  // PATCH /products/:id/discontinue - Ngừng kinh doanh
  @ApiOperation({ summary: 'Ngừng kinh doanh sản phẩm', description: 'Chuyển status sang DISCONTINUED.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id/discontinue')
  discontinue(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.discontinue(id);
  }

  // PATCH /products/:id/resume - Bán lại
  @ApiOperation({ summary: 'Bán lại sản phẩm', description: 'Chuyển status về ON_SALE.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Patch(':id/resume')
  resume(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.resume(id);
  }

  // DELETE /products/:id - Chỉ xóa khi chưa có lịch sử giao dịch
  @ApiOperation({
    summary: 'Xóa sản phẩm',
    description: 'Chỉ xóa được khi sản phẩm chưa có giao dịch kho / đơn hàng / đánh giá nào.',
  })
  @ApiBadRequestResponse({ description: 'Sản phẩm đã có lịch sử giao dịch, không xóa được' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  // POST /products/:id/image - Upload ảnh sản phẩm (multipart/form-data, field "file")
  @ApiOperation({
    summary: 'Upload ảnh sản phẩm',
    description:
      'Gửi dạng `multipart/form-data` với field tên `file`. Chỉ nhận file ảnh, tối đa 5MB. ' +
      'Response trả về `imageUrl`, frontend ghép với host để hiển thị: `http://localhost:3000<imageUrl>`.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'File ảnh (jpg, png, webp...), tối đa 5MB' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Chưa chọn file, file không phải ảnh, hoặc vượt quá 5MB' })
  @ApiAuth('PRODUCT_STAFF')
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
  @ApiOperation({ summary: 'Xóa ảnh sản phẩm' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  @ApiAuth('PRODUCT_STAFF')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PRODUCT_STAFF')
  @Delete(':id/image')
  removeImage(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.removeImage(id);
  }
}
