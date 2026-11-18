import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Xem danh sách danh mục (có thể lọc theo trạng thái)
  findAll(status?: string) {
    const where: any = {};
    if (status === 'ACTIVE' || status === 'INACTIVE') {
      where.status = status;
    }
    return this.prisma.category.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
    return category;
  }

  // Thêm danh mục mới
  async create(dto: CreateCategoryDto) {
    const existed = await this.prisma.category.findUnique({
      where: { categoryName: dto.categoryName },
    });
    if (existed) {
      throw new BadRequestException('Tên danh mục đã tồn tại');
    }
    return this.prisma.category.create({
      data: { categoryName: dto.categoryName },
    });
  }

  // Chỉnh sửa danh mục
  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);

    // Nếu đổi tên thì kiểm tra trùng tên với danh mục khác
    if (dto.categoryName) {
      const existed = await this.prisma.category.findUnique({
        where: { categoryName: dto.categoryName },
      });
      if (existed && existed.id !== id) {
        throw new BadRequestException('Tên danh mục đã tồn tại');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: { categoryName: dto.categoryName, status: dto.status },
    });
  }

  // Ngừng sử dụng danh mục
  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  // Xóa danh mục - phải kiểm tra còn sản phẩm liên kết không
  async remove(id: number) {
    await this.findOne(id);

    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });
    if (productCount > 0) {
      throw new BadRequestException(
        'Danh mục đang có sản phẩm, không thể xóa. Hãy ngừng sử dụng danh mục thay vì xóa.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Đã xóa danh mục' };
  }
}
