import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AdjustStockDto {
  @Type(() => Number)
  @IsInt()
  productId: number;

  // Số lượng thực tế sau khi kiểm kê
  @Type(() => Number)
  @IsInt({ message: 'Số lượng thực tế phải là số nguyên' })
  @Min(0, { message: 'Số lượng thực tế không được âm' })
  actualQuantity: number;

  // Bắt buộc nhập lý do khi điều chỉnh
  @IsNotEmpty({ message: 'Phải nhập lý do điều chỉnh' })
  @IsString()
  reason: string;
}
