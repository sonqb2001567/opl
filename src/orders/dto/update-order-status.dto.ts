import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: ['PREPARING', 'SHIPPING', 'DELIVERED'],
    example: 'PREPARING',
    description: 'Chỉ được chuyển theo đúng quy trình PENDING → PREPARING → SHIPPING → DELIVERED',
  })
  @IsIn(['PREPARING', 'SHIPPING', 'DELIVERED'], { message: 'Trạng thái không hợp lệ' })
  status: 'PREPARING' | 'SHIPPING' | 'DELIVERED';
}
