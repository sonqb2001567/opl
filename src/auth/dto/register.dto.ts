import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
