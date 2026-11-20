import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

// Báo cáo thống kê chỉ dành cho Admin
@ApiTags(ApiTag.Reports)
@ApiAuth('ADMIN')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // GET /reports/revenue?from=&to=&groupBy=day|month - Biểu đồ doanh thu
  @ApiOperation({
    summary: 'Doanh thu theo thời gian',
    description: 'Dữ liệu để vẽ biểu đồ. Chỉ tính các đơn đã DELIVERED.',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Từ ngày (ISO 8601)', example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, description: 'Đến ngày (ISO 8601)', example: '2026-12-31' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'month'], description: 'Mặc định day' })
  @Get('revenue')
  getRevenue(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.reportsService.getRevenue(from, to, groupBy);
  }

  // GET /reports/orders - Thống kê đơn hàng theo trạng thái
  @ApiOperation({ summary: 'Số lượng đơn hàng theo từng trạng thái' })
  @ApiOkResponse({
    schema: {
      example: { PENDING: 3, PREPARING: 1, SHIPPING: 2, DELIVERED: 12, CANCELLED: 1 },
    },
  })
  @Get('orders')
  getOrderStats() {
    return this.reportsService.getOrderStats();
  }

  // GET /reports/low-stock?threshold= - Sản phẩm sắp hết hàng
  @ApiOperation({ summary: 'Sản phẩm sắp hết hàng' })
  @ApiQuery({
    name: 'threshold',
    required: false,
    description: 'Ngưỡng cảnh báo tồn kho, mặc định 10',
    example: 10,
  })
  @Get('low-stock')
  getLowStock(@Query('threshold') threshold?: string) {
    return this.reportsService.getLowStock(threshold);
  }
}
