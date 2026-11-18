import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { VouchersService } from './vouchers.service.js';
import { CreateVoucherDto } from './dto/create-voucher.dto.js';
import { UpdateVoucherDto } from './dto/update-voucher.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // GET /vouchers/check/:code - Khách kiểm tra mã trước khi đặt hàng
  @Get('check/:code')
  checkCode(@Param('code') code: string) {
    return this.vouchersService.checkCode(code);
  }

  // Các API bên dưới chỉ dành cho Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll(@Query('status') status?: string) {
    return this.vouchersService.findAll(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVoucherDto) {
    return this.vouchersService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.activate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.deactivate(id);
  }
}
