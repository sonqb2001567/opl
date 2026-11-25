import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt } from 'class-validator';

export class SetProductCategoriesDto {
  @ApiProperty({
    example: [1, 3],
    type: [Number],
    description: 'Danh sách ID danh mục mới của sản phẩm. Ghi đè toàn bộ danh mục cũ.',
  })
  @IsArray({ message: 'categoryIds phải là mảng ID danh mục' })
  @ArrayNotEmpty({ message: 'Sản phẩm phải thuộc ít nhất 1 danh mục' })
  @ArrayUnique({ message: 'Danh sách danh mục bị trùng' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Danh mục không hợp lệ' })
  categoryIds: number[];
}
