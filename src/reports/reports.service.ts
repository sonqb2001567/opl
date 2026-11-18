import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  // Báo cáo doanh thu theo ngày/tháng trong khoảng thời gian.
  // Chỉ tính các đơn ĐÃ GIAO (đơn hủy không tính vào doanh thu).
  async getRevenue(from?: string, to?: string, groupBy?: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1); // mặc định từ đầu năm
    const toDate = to ? new Date(to) : new Date();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate > toDate) {
      throw new BadRequestException('Khoảng thời gian không hợp lệ');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: { totalAmount: true, createdAt: true },
    });

    // Gom nhóm doanh thu theo ngày hoặc tháng
    const grouped: Record<string, { revenue: number; orderCount: number }> = {};
    for (const order of orders) {
      let key: string;
      if (groupBy === 'month') {
        // dạng 2026-11
        key = order.createdAt.toISOString().slice(0, 7);
      } else {
        // dạng 2026-11-15
        key = order.createdAt.toISOString().slice(0, 10);
      }
      if (!grouped[key]) {
        grouped[key] = { revenue: 0, orderCount: 0 };
      }
      grouped[key].revenue += Number(order.totalAmount);
      grouped[key].orderCount += 1;
    }

    // Chuyển về mảng và sắp xếp theo thời gian để dễ vẽ biểu đồ
    const chart = Object.keys(grouped)
      .sort()
      .map((key) => ({ date: key, ...grouped[key] }));

    const totalRevenue = chart.reduce((sum, row) => sum + row.revenue, 0);

    return {
      from: fromDate,
      to: toDate,
      groupBy: groupBy === 'month' ? 'month' : 'day',
      totalRevenue,
      totalOrders: orders.length,
      chart,
    };
  }

  // Thống kê đơn hàng theo trạng thái
  async getOrderStats() {
    const groups = await this.prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    const stats: Record<string, number> = {
      PENDING: 0,
      PREPARING: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    for (const g of groups) {
      stats[g.status] = g._count;
    }

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    return { total, byStatus: stats };
  }

  // Thống kê tồn kho: tổng quan + danh sách sản phẩm sắp hết hàng
  async getLowStock(threshold?: string) {
    const limit = Number(threshold) > 0 ? Number(threshold) : 10;

    const allStock = await this.inventoryService.getAllStock();
    const lowStock = allStock.filter((p) => p.stock <= limit);

    return {
      threshold: limit,
      totalProducts: allStock.length,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock,
    };
  }
}
