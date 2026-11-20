import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ImportStockDto {
  @ApiProperty({ example: 1, description: 'ID sản phẩm' })
  @Type(() => Number)
  @IsInt()
  productId: number;

  @ApiProperty({ example: 50, minimum: 1, description: 'Số lượng nhập / xuất' })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;

  @ApiPropertyOptional({ example: 'Nhập hàng từ nhà cung cấp ABC' })
  @IsOptional()
  @IsString()
  reason?: string;
}
