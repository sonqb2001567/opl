import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;
}
