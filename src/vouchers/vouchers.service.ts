import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVoucherDto } from './dto/create-voucher.dto.js';
import { UpdateVoucherDto } from './dto/update-voucher.dto.js';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin xem danh sách voucher
  findAll(status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    return this.prisma.voucher.findMany({ where, orderBy: { id: 'desc' } });
  }

  async findOne(id: number) {
    const voucher = await this.prisma.voucher.findUnique({ where: { id } });
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }
    return voucher;
  }

  // Admin tạo chương trình giảm giá
  async create(dto: CreateVoucherDto) {
    const existed = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
    if (existed) {
      throw new BadRequestException('Mã giảm giá đã tồn tại');
    }

    const validFrom = new Date(dto.validFrom);
    const validTo = new Date(dto.validTo);
    if (validFrom >= validTo) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    return this.prisma.voucher.create({
      data: {
        code: dto.code,
        discountValue: dto.discountValue,
        conditions: dto.conditions,
        validFrom,
        validTo,
      },
    });
  }

  // Admin chỉnh sửa voucher
  async update(id: number, dto: UpdateVoucherDto) {
    await this.findOne(id);

    if (dto.code) {
      const existed = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
      if (existed && existed.id !== id) {
        throw new BadRequestException('Mã giảm giá đã tồn tại');
      }
    }

    return this.prisma.voucher.update({
      where: { id },
      data: {
        code: dto.code,
        discountValue: dto.discountValue,
        conditions: dto.conditions,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      },
    });
  }

  // Kích hoạt / ngừng chương trình
  async activate(id: number) {
    await this.findOne(id);
    return this.prisma.voucher.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async deactivate(id: number) {
    await this.findOne(id);
    return this.prisma.voucher.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  // Khách kiểm tra mã giảm giá trước khi đặt hàng
  async checkCode(code: string) {
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });
    const now = new Date();

    if (!voucher || voucher.status !== 'ACTIVE' || now < voucher.validFrom || now > voucher.validTo) {
      return { valid: false, message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' };
    }

    return {
      valid: true,
      code: voucher.code,
      discountValue: voucher.discountValue,
      conditions: voucher.conditions,
      validTo: voucher.validTo,
    };
  }
}
