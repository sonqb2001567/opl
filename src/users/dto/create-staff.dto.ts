import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Trần Thị B', maxLength: 100 })
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'staff@example.com', format: 'email' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  // Admin chỉ được tạo tài khoản nhân viên
  @ApiProperty({
    enum: ['PRODUCT_STAFF', 'INVENTORY_STAFF'],
    example: 'PRODUCT_STAFF',
    description: 'Admin chỉ được tạo tài khoản nhân viên',
  })
  @IsIn(['PRODUCT_STAFF', 'INVENTORY_STAFF'], { message: 'Role phải là PRODUCT_STAFF hoặc INVENTORY_STAFF' })
  role: 'PRODUCT_STAFF' | 'INVENTORY_STAFF';

  @ApiPropertyOptional({ example: '0901234567', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '12 Nguyễn Trãi, Quận 1, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;
}
