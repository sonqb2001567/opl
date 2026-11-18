import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { ImportStockDto } from './dto/import-stock.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

// Các API quản lý kho dành cho Inventory Staff (Admin cũng được xem)
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // GET /inventory/stock - Xem tồn kho tất cả sản phẩm
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @Get('stock')
  getAllStock() {
    return this.inventoryService.getAllStock();
  }

  // GET /inventory/stock/:productId - Xem tồn kho 1 sản phẩm
  @Roles('INVENTORY_STAFF', 'ADMIN')
  @Get('stock/:productId')
  getStockByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.inventoryService.getStockByProduct(productId);
  }

  // POST /inventory/import - Ghi nhận nhập kho
  @Roles('INVENTORY_STAFF')
  @Post('import')
  importStock(@CurrentUser() user: any, @Body() dto: ImportStockDto) {
    return this.inventoryService.importStock(user.id, dto);
  }

  // POST /inventory/export - Ghi nhận xuất kho
  @Roles('INVENTORY_STAFF')
  @Post('export')
  exportStock(@CurrentUser() user: any, @Body() dto: ImportStockDto) {
    return this.inventoryService.exportStock(user.id, dto);
  }

  // POST /inventory/adjust - Điều chỉnh tồn kho sau kiểm kê
  @Roles('INVENTORY_STAFF')
  @Post('adjust')
  adjustStock(@CurrentUser() user: any, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(user.id, dto);
  }

  // GET /inventory/history?productId=&type=&staffId=&from=&to= - Lịch sử kho
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
