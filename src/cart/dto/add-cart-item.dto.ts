import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AddCartItemDto {
  @Type(() => Number)
  @IsInt()
  productId: number;

  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;
}
