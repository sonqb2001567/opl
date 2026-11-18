import { IsIn } from 'class-validator';

export class SetRoleDto {
  @IsIn(['PRODUCT_STAFF', 'INVENTORY_STAFF'], { message: 'Role phải là PRODUCT_STAFF hoặc INVENTORY_STAFF' })
  role: 'PRODUCT_STAFF' | 'INVENTORY_STAFF';
}
