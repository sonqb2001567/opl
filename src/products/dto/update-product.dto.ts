import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto.js';

// PartialType của @nestjs/swagger giữ lại cả validation lẫn mô tả field trên Swagger UI
export class UpdateProductDto extends PartialType(CreateProductDto) {}
