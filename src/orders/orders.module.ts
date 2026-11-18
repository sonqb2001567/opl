import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [InventoryModule, SettingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
