import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
