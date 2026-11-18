import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // Khách đánh giá sản phẩm - phải mua hàng thành công rồi mới được đánh giá
  async create(customerId: number, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Kiểm tra khách đã mua sản phẩm này trong 1 đơn đã giao chưa
    const purchased = await this.prisma.orderDetail.findFirst({
      where: {
        productId: dto.productId,
        order: { customerId, status: 'DELIVERED' },
      },
    });
    if (!purchased) {
      throw new BadRequestException('Bạn cần mua sản phẩm này trước khi đánh giá');
    }

    // Mỗi khách chỉ đánh giá 1 lần / sản phẩm, muốn đổi thì chỉnh sửa
    const existed = await this.prisma.review.findFirst({
      where: { customerId, productId: dto.productId },
    });
    if (existed) {
      throw new BadRequestException('Bạn đã đánh giá sản phẩm này rồi, hãy dùng chức năng chỉnh sửa');
    }

    return this.prisma.review.create({
      data: {
        customerId,
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  // Khách chỉnh sửa đánh giá của chính mình
  async update(customerId: number, reviewId: number, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }
    if (review.customerId !== customerId) {
      throw new ForbiddenException('Bạn chỉ được chỉnh sửa đánh giá của chính mình');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { rating: dto.rating, comment: dto.comment },
    });
  }

  // Xem đánh giá của 1 sản phẩm (chỉ hiện đánh giá VISIBLE) kèm điểm trung bình
  async findByProduct(productId: number) {
    const reviews = await this.prisma.review.findMany({
      where: { productId, status: 'VISIBLE' },
      include: { customer: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const aggregate = await this.prisma.review.aggregate({
      where: { productId, status: 'VISIBLE' },
      _avg: { rating: true },
      _count: true,
    });

    return {
      averageRating: aggregate._avg.rating ?? 0,
      reviewCount: aggregate._count,
      reviews,
    };
  }

  // Admin xem danh sách đánh giá (lọc theo sản phẩm / trạng thái)
  findAllForAdmin(productId?: string, status?: string) {
    const where: any = {};
    if (productId) {
      where.productId = Number(productId);
    }
    if (status) {
      where.status = status;
    }
    return this.prisma.review.findMany({
      where,
      include: {
        customer: { select: { id: true, fullName: true, email: true } },
        product: { select: { id: true, productName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin ẩn đánh giá vi phạm
  async hide(reviewId: number) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }
    return this.prisma.review.update({ where: { id: reviewId }, data: { status: 'HIDDEN' } });
  }

  // Admin khôi phục đánh giá
  async restore(reviewId: number) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }
    return this.prisma.review.update({ where: { id: reviewId }, data: { status: 'VISIBLE' } });
  }
}
