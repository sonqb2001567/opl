import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  @MaxLength(255)
  productName: string;

  @IsNotEmpty({ message: 'Mã SKU không được để trống' })
  @IsString()
  @MaxLength(50)
  skuCode: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Giá bán phải là số' })
  @Min(0, { message: 'Giá bán không được âm' })
  price: number;

  @Type(() => Number)
  @IsInt({ message: 'Danh mục không hợp lệ' })
  categoryId: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}
