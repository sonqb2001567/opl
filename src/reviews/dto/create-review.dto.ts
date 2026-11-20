import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 1, description: 'ID sản phẩm (phải là sản phẩm đã mua và đơn đã giao)' })
  @Type(() => Number)
  @IsInt()
  productId: number;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Số sao từ 1 đến 5' })
  @Type(() => Number)
  @IsInt({ message: 'Điểm đánh giá phải là số nguyên' })
  @Min(1, { message: 'Điểm đánh giá thấp nhất là 1 sao' })
  @Max(5, { message: 'Điểm đánh giá cao nhất là 5 sao' })
  rating: number;

  @ApiPropertyOptional({ example: 'Sản phẩm dùng rất tốt, giao hàng nhanh' })
  @IsOptional()
  @IsString()
  comment?: string;
}
