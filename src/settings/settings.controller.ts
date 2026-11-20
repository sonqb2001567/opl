import { Body, Controller, Get, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

@ApiTags(ApiTag.Settings)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // GET /settings/shipping-fee - Ai cũng xem được phí ship
  @ApiOperation({
    summary: 'Xem phí vận chuyển đang áp dụng (công khai)',
    description: 'Frontend gọi API này để hiển thị phí ship ở trang giỏ hàng / thanh toán.',
  })
  @ApiOkResponse({ schema: { example: { shippingFee: 30000 } } })
  @Get('shipping-fee')
  getShippingFee() {
    return { shippingFee: this.settingsService.getShippingFee() };
  }

  // PUT /settings/shipping-fee - Admin cấu hình phí ship
  @ApiOperation({ summary: '[Admin] Cấu hình phí vận chuyển' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['shippingFee'],
      properties: {
        shippingFee: { type: 'number', minimum: 0, example: 30000, description: 'Phí vận chuyển (VND)' },
      },
    },
  })
  @ApiOkResponse({ schema: { example: { shippingFee: 30000 } } })
  @ApiBadRequestResponse({ description: 'Phí vận chuyển phải là số không âm' })
  @ApiAuth('ADMIN')
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
