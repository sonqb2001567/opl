import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImportStockDto } from './dto/import-stock.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // Tính tồn kho hiện tại của 1 sản phẩm
  async getStock(productId: number) {
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
      if (g.transactionType === 'ADJUSTMENT') stock += sum; // delta có thể âm hoặc dương
    }
    return stock;
  }

  // Xem tồn kho của tất cả sản phẩm
  async getAllStock() {
    const products = await this.prisma.product.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, productName: true, skuCode: true, status: true },
    });

    // Tính tồn kho từng sản phẩm (đơn giản, chạy tuần tự)
    const result = [];
    for (const p of products) {
      const stock = await this.getStock(p.id);
      result.push({ ...p, stock });
    }
    return result;
  }

  // Xem tồn kho 1 sản phẩm
  async getStockByProduct(productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    const stock = await this.getStock(productId);
    return {
      productId: product.id,
      productName: product.productName,
      skuCode: product.skuCode,
      stock,
    };
  }

  // Ghi nhận nhập kho
  async importStock(staffId: number, dto: ImportStockDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const transaction = await this.prisma.inventoryTransaction.create({
      data: {
        productId: dto.productId,
        staffId,
        transactionType: 'IMPORT',
        quantity: dto.quantity,
        reason: dto.reason,
      },
    });

    const stock = await this.getStock(dto.productId);
    return { message: 'Nhập kho thành công', transaction, currentStock: stock };
  }

  // Ghi nhận xuất kho - không cho xuất quá số lượng tồn
  async exportStock(staffId: number, dto: ImportStockDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const stock = await this.getStock(dto.productId);
    if (stock < dto.quantity) {
      throw new BadRequestException(`Số lượng tồn kho không đủ (hiện còn ${stock})`);
    }

    const transaction = await this.prisma.inventoryTransaction.create({
      data: {
        productId: dto.productId,
        staffId,
        transactionType: 'EXPORT',
        quantity: dto.quantity,
        reason: dto.reason,
      },
    });

    return { message: 'Xuất kho thành công', transaction, currentStock: stock - dto.quantity };
  }

  // Điều chỉnh tồn kho sau kiểm kê: nhập số lượng thực tế, hệ thống tự tính chênh lệch
  async adjustStock(staffId: number, dto: AdjustStockDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const currentStock = await this.getStock(dto.productId);
    const delta = dto.actualQuantity - currentStock;

    if (delta === 0) {
      throw new BadRequestException('Số lượng thực tế bằng số lượng trên hệ thống, không cần điều chỉnh');
    }

    const transaction = await this.prisma.inventoryTransaction.create({
      data: {
        productId: dto.productId,
        staffId,
        transactionType: 'ADJUSTMENT',
        quantity: delta,
        reason: dto.reason,
      },
    });

    return { message: 'Điều chỉnh tồn kho thành công', transaction, currentStock: dto.actualQuantity };
  }

  // Tra cứu lịch sử kho: lọc theo sản phẩm, loại giao dịch, người thực hiện, khoảng thời gian
  async getHistory(query: { productId?: string; type?: string; staffId?: string; from?: string; to?: string }) {
    const where: any = {};

    if (query.productId) {
      where.productId = Number(query.productId);
    }
    if (query.type) {
      where.transactionType = query.type;
    }
    if (query.staffId) {
      where.staffId = Number(query.staffId);
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    return this.prisma.inventoryTransaction.findMany({
      where,
      include: {
        product: { select: { id: true, productName: true, skuCode: true } },
        staff: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
