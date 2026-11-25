import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro 256GB', maxLength: 255 })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  @MaxLength(255)
  productName: string;

  @ApiProperty({ example: 'IP15P-256', maxLength: 50, description: 'Mã SKU, không được trùng' })
  @IsNotEmpty({ message: 'Mã SKU không được để trống' })
  @IsString()
  @MaxLength(50)
  skuCode: string;

  @ApiProperty({ example: 29990000, minimum: 0, description: 'Giá bán (VND)' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá bán phải là số' })
  @Min(0, { message: 'Giá bán không được âm' })
  price: number;

  // Quan hệ N-N: 1 sản phẩm thuộc được nhiều danh mục
  @ApiProperty({
    example: [1, 2],
    type: [Number],
    description: 'Danh sách ID danh mục (lấy từ GET /categories). Phải có ít nhất 1 danh mục đang ACTIVE.',
  })
  @IsArray({ message: 'categoryIds phải là mảng ID danh mục' })
  @ArrayNotEmpty({ message: 'Sản phẩm phải thuộc ít nhất 1 danh mục' })
  @ArrayUnique({ message: 'Danh sách danh mục bị trùng' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Danh mục không hợp lệ' })
  categoryIds: number[];

  @ApiPropertyOptional({ example: 'Màn hình 6.1 inch, chip A17 Pro, pin 3274mAh' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '/uploads/1731000000000-123456789.jpg',
    maxLength: 500,
    description: 'Thường để trống rồi upload ảnh qua POST /products/{id}/image',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}
