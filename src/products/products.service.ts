import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tính tồn kho = tổng nhập - tổng xuất + tổng điều chỉnh
  private async getStock(productId: number) {
    const groups = await this.prisma.inventoryTransaction.groupBy({
      by: ['transactionType'],
      where: { productId },
      _sum: { quantity: true },
    });

    let stock = 0;
    for (const g of groups) {
      const sum = g._sum.quantity ?? 0;
      if (g.transactionType === 'IMPORT') stock += sum;
      if (g.transactionType === 'EXPORT') stock -= sum;
      if (g.transactionType === 'ADJUSTMENT') stock += sum; // quantity điều chỉnh có thể âm hoặc dương
    }
    return stock;
  }

  // Danh sách sản phẩm: tìm theo tên, lọc theo danh mục / trạng thái, có phân trang
  async findAll(query: { search?: string; categoryId?: string; status?: string; page?: string; limit?: string }) {
    const where: any = {};

    if (query.search) {
      // mode: 'insensitive' là bắt buộc trên Postgres - khác MySQL (collation
      // utf8mb4_unicode_ci so sánh sẵn không phân biệt hoa/thường), Postgres
      // mặc định phân biệt nên thiếu dòng này thì tìm "iphone" sẽ không ra "iPhone".
      where.productName = { contains: query.search, mode: 'insensitive' };
    }
    if (query.categoryId) {
      where.categoryId = Number(query.categoryId);
    }

    // Mặc định khách hàng chỉ thấy sản phẩm đang bán.
    // Nhân viên muốn xem tất cả thì truyền ?status=ALL
    if (query.status === 'ALL') {
      // không lọc theo status
    } else if (query.status === 'DISCONTINUED') {
      where.status = 'DISCONTINUED';
    } else {
      where.status = 'ON_SALE';
    }

    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // Chi tiết sản phẩm: kèm tồn kho và điểm đánh giá trung bình
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const stock = await this.getStock(id);

    // Chỉ tính các đánh giá đang hiển thị
    const rating = await this.prisma.review.aggregate({
      where: { productId: id, status: 'VISIBLE' },
      _avg: { rating: true },
      _count: true,
    });

    return {
      ...product,
      stock,
      inStock: stock > 0,
      averageRating: rating._avg.rating ?? 0,
      reviewCount: rating._count,
    };
  }

  // Product Staff thêm sản phẩm mới
  async create(dto: CreateProductDto) {
    // Kiểm tra SKU không trùng
    const existedSku = await this.prisma.product.findUnique({ where: { skuCode: dto.skuCode } });
    if (existedSku) {
      throw new BadRequestException('Mã SKU đã tồn tại');
    }

    // Kiểm tra danh mục hợp lệ
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category || category.status !== 'ACTIVE') {
      throw new BadRequestException('Danh mục không tồn tại hoặc đã ngừng sử dụng');
    }

    return this.prisma.product.create({
      data: {
        productName: dto.productName,
        skuCode: dto.skuCode,
        price: dto.price,
        categoryId: dto.categoryId,
        description: dto.description,
        imageUrl: dto.imageUrl,
      },
      include: { category: true },
    });
  }

  // Product Staff chỉnh sửa sản phẩm
  async update(id: number, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Nếu đổi SKU thì kiểm tra trùng với sản phẩm khác
    if (dto.skuCode) {
      const existedSku = await this.prisma.product.findUnique({ where: { skuCode: dto.skuCode } });
      if (existedSku && existedSku.id !== id) {
        throw new BadRequestException('Mã SKU đã tồn tại');
      }
    }

    // Nếu đổi danh mục thì kiểm tra danh mục hợp lệ
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category || category.status !== 'ACTIVE') {
        throw new BadRequestException('Danh mục không tồn tại hoặc đã ngừng sử dụng');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        productName: dto.productName,
        skuCode: dto.skuCode,
        price: dto.price,
        categoryId: dto.categoryId,
        description: dto.description,
        imageUrl: dto.imageUrl,
      },
      include: { category: true },
    });
  }

  // Ngừng kinh doanh sản phẩm (không xóa dữ liệu)
  async discontinue(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return this.prisma.product.update({
      where: { id },
      data: { status: 'DISCONTINUED' },
    });
  }

  // Bán lại sản phẩm đã ngừng kinh doanh
  async resume(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return this.prisma.product.update({
      where: { id },
      data: { status: 'ON_SALE' },
    });
  }

  // Chỉ cho xóa khi sản phẩm chưa có lịch sử giao dịch
  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const orderCount = await this.prisma.orderDetail.count({ where: { productId: id } });
    const inventoryCount = await this.prisma.inventoryTransaction.count({ where: { productId: id } });

    if (orderCount > 0 || inventoryCount > 0) {
      throw new BadRequestException(
        'Sản phẩm đã có lịch sử giao dịch, không thể xóa. Hãy dùng chức năng ngừng kinh doanh.',
      );
    }

    // Xóa luôn các cart item đang chứa sản phẩm này
    await this.prisma.cartItem.deleteMany({ where: { productId: id } });
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Đã xóa sản phẩm' };
  }

  // Cập nhật ảnh sản phẩm sau khi upload
  async updateImage(id: number, imageUrl: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return this.prisma.product.update({
      where: { id },
      data: { imageUrl },
    });
  }

  // Xóa ảnh sản phẩm
  async removeImage(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return this.prisma.product.update({
      where: { id },
      data: { imageUrl: null },
    });
  }
}
