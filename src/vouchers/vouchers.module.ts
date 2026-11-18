import { Module } from '@nestjs/common';
import { VouchersService } from './vouchers.service.js';
import { VouchersController } from './vouchers.controller.js';

@Module({
  controllers: [VouchersController],
  providers: [VouchersService],
})
export class VouchersModule {}
