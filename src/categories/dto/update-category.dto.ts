import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  @MaxLength(100)
  categoryName?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
