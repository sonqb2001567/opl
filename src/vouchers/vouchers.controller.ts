import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service.js';
import { CreateVoucherDto } from './dto/create-voucher.dto.js';
import { UpdateVoucherDto } from './dto/update-voucher.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

@ApiTags(ApiTag.Vouchers)
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // GET /vouchers/check/:code - Khách kiểm tra mã trước khi đặt hàng
  @ApiOperation({
    summary: 'Kiểm tra mã giảm giá trước khi đặt hàng (công khai)',
    description: 'Trả về giá trị giảm nếu mã đang ACTIVE và còn trong thời gian hiệu lực.',
  })
  @ApiParam({ name: 'code', example: 'SALE50K' })
  @ApiNotFoundResponse({ description: 'Mã không tồn tại, đã tắt hoặc hết hiệu lực' })
  @Get('check/:code')
  checkCode(@Param('code') code: string) {
    return this.vouchersService.checkCode(code);
  }

  // Các API bên dưới chỉ dành cho Admin
  @ApiOperation({ summary: '[Admin] Danh sách mã giảm giá' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @ApiAuth('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query('status') status?: string) {
    return this.vouchersService.findAll(status);
  }

  @ApiOperation({ summary: '[Admin] Chi tiết mã giảm giá' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mã giảm giá' })
  @ApiAuth('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] Tạo mã giảm giá' })
  @ApiConflictResponse({ description: 'Mã giảm giá đã tồn tại' })
  @ApiAuth('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(dto);
  }

  @ApiOperation({ summary: '[Admin] Chỉnh sửa mã giảm giá' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mã giảm giá' })
  @ApiAuth('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVoucherDto) {
    return this.vouchersService.update(id, dto);
  }

  @ApiOperation({ summary: '[Admin] Bật mã giảm giá' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mã giảm giá' })
  @ApiAuth('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.activate(id);
  }

  @ApiOperation({ summary: '[Admin] Tắt mã giảm giá' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mã giảm giá' })
  @ApiAuth('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.deactivate(id);
  }
}
