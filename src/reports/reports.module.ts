import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [InventoryModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
