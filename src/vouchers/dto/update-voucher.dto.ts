import { PartialType } from '@nestjs/swagger';
import { CreateVoucherDto } from './create-voucher.dto.js';

// PartialType của @nestjs/swagger giữ lại cả validation lẫn mô tả field trên Swagger UI
export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {}
