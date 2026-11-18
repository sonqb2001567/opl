import { IsNotEmpty, IsString } from 'class-validator';

export class CancelOrderDto {
  @IsNotEmpty({ message: 'Phải nhập lý do hủy đơn' })
  @IsString()
  reason: string;
}
