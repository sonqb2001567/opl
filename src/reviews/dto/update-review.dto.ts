import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Điểm đánh giá phải là số nguyên' })
  @Min(1, { message: 'Điểm đánh giá thấp nhất là 1 sao' })
  @Max(5, { message: 'Điểm đánh giá cao nhất là 5 sao' })
  rating?: number;

  @ApiPropertyOptional({ example: 'Dùng thêm 1 tuần thì thấy pin hơi yếu' })
  @IsOptional()
  @IsString()
  comment?: string;
}
