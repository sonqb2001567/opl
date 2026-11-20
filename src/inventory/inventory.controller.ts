import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service.js';
import { ImportStockDto } from './dto/import-stock.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

// Các API quản lý kho dành cho Inventory Staff (Admin cũng được xem)
@ApiTags(ApiTag.Inventory)
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // GET /inventory/stock - Xem tồn kho tất cả sản phẩm
  @ApiOperation({
    summary: 'Tồn kho của tất cả sản phẩm',
    description: 'Tồn kho = tổng IMPORT - tổng EXPORT + tổng ADJUSTMENT.',
  })
  @ApiAuth('INVENTORY_STAFF', 'ADMIN')
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @Get('stock')
  getAllStock() {
    return this.inventoryService.getAllStock();
  }

  // GET /inventory/stock/:productId - Xem tồn kho 1 sản phẩm
  @ApiOperation({ summary: 'Tồn kho của một sản phẩm' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  @ApiAuth('INVENTORY_STAFF', 'ADMIN')
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @Get('stock/:productId')
  getStockByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.inventoryService.getStockByProduct(productId);
  }

  // POST /inventory/import - Ghi nhận nhập kho
  @ApiOperation({ summary: 'Ghi nhận nhập kho' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy sản phẩm' })
  @ApiAuth('INVENTORY_STAFF')
  @Roles('INVENTORY_STAFF')
  @Post('import')
  importStock(@CurrentUser() user: any, @Body() dto: ImportStockDto) {
    return this.inventoryService.importStock(user.id, dto);
  }

  // POST /inventory/export - Ghi nhận xuất kho
  @ApiOperation({ summary: 'Ghi nhận xuất kho', description: 'Không cho xuất vượt quá tồn kho hiện có.' })
  @ApiBadRequestResponse({ description: 'Số lượng xuất vượt quá tồn kho' })
  @ApiAuth('INVENTORY_STAFF')
  @Roles('INVENTORY_STAFF')
  @Post('export')
  exportStock(@CurrentUser() user: any, @Body() dto: ImportStockDto) {
    return this.inventoryService.exportStock(user.id, dto);
  }

  // POST /inventory/adjust - Điều chỉnh tồn kho sau kiểm kê
  @ApiOperation({
    summary: 'Điều chỉnh tồn kho sau kiểm kê',
    description: 'Gửi số lượng thực tế đếm được, hệ thống tự ghi bút toán ADJUSTMENT cho phần lệch.',
  })
  @ApiAuth('INVENTORY_STAFF')
  @Roles('INVENTORY_STAFF')
  @Post('adjust')
  adjustStock(@CurrentUser() user: any, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(user.id, dto);
  }

  // GET /inventory/history?productId=&type=&staffId=&from=&to= - Lịch sử kho
  @ApiOperation({ summary: 'Lịch sử giao dịch kho' })
  @ApiQuery({ name: 'productId', required: false, example: 1 })
  @ApiQuery({ name: 'type', required: false, enum: ['IMPORT', 'EXPORT', 'ADJUSTMENT'] })
  @ApiQuery({ name: 'staffId', required: false, description: 'ID nhân viên thực hiện', example: 2 })
  @ApiQuery({ name: 'from', required: false, description: 'Từ ngày (ISO 8601)', example: '2026-11-01' })
  @ApiQuery({ name: 'to', required: false, description: 'Đến ngày (ISO 8601)', example: '2026-11-30' })
  @ApiAuth('INVENTORY_STAFF', 'ADMIN')
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @Get('history')
  getHistory(
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('staffId') staffId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.inventoryService.getHistory({ productId, type, staffId, from, to });
  }
}
