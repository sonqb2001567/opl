import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['PREPARING', 'SHIPPING', 'DELIVERED'], { message: 'Trạng thái không hợp lệ' })
  status: 'PREPARING' | 'SHIPPING' | 'DELIVERED';
}
