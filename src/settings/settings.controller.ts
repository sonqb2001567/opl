import { Body, Controller, Get, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // GET /settings/shipping-fee - Ai cũng xem được phí ship
  @Get('shipping-fee')
  getShippingFee() {
    return { shippingFee: this.settingsService.getShippingFee() };
  }

  // PUT /settings/shipping-fee - Admin cấu hình phí ship
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('shipping-fee')
  setShippingFee(@Body('shippingFee') shippingFee: number) {
    if (typeof shippingFee !== 'number' || shippingFee < 0) {
      throw new BadRequestException('Phí vận chuyển phải là số không âm');
    }
    return { shippingFee: this.settingsService.setShippingFee(shippingFee) };
  }
}
