import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SetRoleDto {
  @ApiProperty({ enum: ['PRODUCT_STAFF', 'INVENTORY_STAFF'], example: 'INVENTORY_STAFF' })
  @IsIn(['PRODUCT_STAFF', 'INVENTORY_STAFF'], { message: 'Role phải là PRODUCT_STAFF hoặc INVENTORY_STAFF' })
  role: 'PRODUCT_STAFF' | 'INVENTORY_STAFF';
}
