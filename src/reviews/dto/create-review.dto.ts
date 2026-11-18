import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @Type(() => Number)
  @IsInt()
  productId: number;

  @Type(() => Number)
  @IsInt({ message: 'Điểm đánh giá phải là số nguyên' })
  @Min(1, { message: 'Điểm đánh giá thấp nhất là 1 sao' })
  @Max(5, { message: 'Điểm đánh giá cao nhất là 5 sao' })
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
