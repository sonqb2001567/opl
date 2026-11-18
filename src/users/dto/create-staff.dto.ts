import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  // Admin chỉ được tạo tài khoản nhân viên
  @IsIn(['PRODUCT_STAFF', 'INVENTORY_STAFF'], { message: 'Role phải là PRODUCT_STAFF hoặc INVENTORY_STAFF' })
  role: 'PRODUCT_STAFF' | 'INVENTORY_STAFF';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
