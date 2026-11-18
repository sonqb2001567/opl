import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// Báo cáo thống kê chỉ dành cho Admin
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // GET /reports/revenue?from=&to=&groupBy=day|month - Biểu đồ doanh thu
  @Get('revenue')
  getRevenue(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.reportsService.getRevenue(from, to, groupBy);
  }

  // GET /reports/orders - Thống kê đơn hàng theo trạng thái
  @Get('orders')
  getOrderStats() {
    return this.reportsService.getOrderStats();
  }

  // GET /reports/low-stock?threshold= - Sản phẩm sắp hết hàng
  @Get('low-stock')
  getLowStock(@Query('threshold') threshold?: string) {
    return this.reportsService.getLowStock(threshold);
  }
}
