import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVoucherDto {
  @IsNotEmpty({ message: 'Mã giảm giá không được để trống' })
  @IsString()
  @MaxLength(50)
  code: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Giá trị giảm phải là số' })
  @Min(0, { message: 'Giá trị giảm không được âm' })
  discountValue: number;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsDateString({}, { message: 'Thời gian bắt đầu không hợp lệ' })
  validFrom: string;

  @IsDateString({}, { message: 'Thời gian kết thúc không hợp lệ' })
  validTo: string;
}
