import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ example: 1, description: 'ID sản phẩm' })
  @Type(() => Number)
  @IsInt()
  productId: number;

  // Số lượng thực tế sau khi kiểm kê
  @ApiProperty({ example: 48, minimum: 0, description: 'Số lượng thực tế đếm được sau khi kiểm kê' })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng thực tế phải là số nguyên' })
  @Min(0, { message: 'Số lượng thực tế không được âm' })
  actualQuantity: number;

  // Bắt buộc nhập lý do khi điều chỉnh
  @ApiProperty({ example: 'Kiểm kê tháng 11, thiếu 2 sản phẩm do hỏng' })
  @IsNotEmpty({ message: 'Phải nhập lý do điều chỉnh' })
  @IsString()
  reason: string;
}
