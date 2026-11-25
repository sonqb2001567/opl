import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ example: 'customer@example.com', format: 'email' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}
