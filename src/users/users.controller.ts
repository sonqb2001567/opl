import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { SetRoleDto } from './dto/set-role.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

// Toàn bộ API quản lý người dùng chỉ dành cho Admin
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /users - Tạo tài khoản nhân viên
  @Post()
  createStaff(@Body() dto: CreateStaffDto) {
    return this.usersService.createStaff(dto);
  }

  // GET /users?role=&status= - Danh sách người dùng
  @Get()
  findAll(@Query('role') role?: string, @Query('status') status?: string) {
    return this.usersService.findAll(role, status);
  }

  // GET /users/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // PATCH /users/:id - Chỉnh sửa thông tin
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // PATCH /users/:id/lock - Khóa tài khoản
  @Patch(':id/lock')
  lock(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.lock(id);
  }

  // PATCH /users/:id/unlock - Mở khóa tài khoản
  @Patch(':id/unlock')
  unlock(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.unlock(id);
  }

  // PATCH /users/:id/role - Phân quyền nhân viên
  @Patch(':id/role')
  setRole(@Param('id', ParseIntPipe) id: number, @Body() dto: SetRoleDto) {
    return this.usersService.setRole(id, dto);
  }
}
