import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVoucherDto {
  @ApiProperty({ example: 'SALE50K', maxLength: 50, description: 'Mã giảm giá, không được trùng' })
  @IsNotEmpty({ message: 'Mã giảm giá không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 50000, minimum: 0, description: 'Số tiền giảm trực tiếp (VND)' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Giá trị giảm phải là số' })
  @Min(0, { message: 'Giá trị giảm không được âm' })
  discountValue: number;

  @ApiPropertyOptional({ example: 'Áp dụng cho đơn từ 500.000đ' })
  @IsOptional()
  @IsString()
  conditions?: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', description: 'ISO 8601' })
  @IsDateString({}, { message: 'Thời gian bắt đầu không hợp lệ' })
  validFrom: string;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z', description: 'ISO 8601' })
  @IsDateString({}, { message: 'Thời gian kết thúc không hợp lệ' })
  validTo: string;
}
