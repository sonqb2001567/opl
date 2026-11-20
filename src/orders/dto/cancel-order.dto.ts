import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ example: 'Đổi ý không muốn mua nữa' })
  @IsNotEmpty({ message: 'Phải nhập lý do hủy đơn' })
  @IsString()
  reason: string;
}
