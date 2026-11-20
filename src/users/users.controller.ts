import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { SetRoleDto } from './dto/set-role.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

// Toàn bộ API quản lý người dùng chỉ dành cho Admin
@ApiTags(ApiTag.Users)
@ApiAuth('ADMIN')
@ApiNotFoundResponse({ description: 'Không tìm thấy người dùng' })
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /users - Tạo tài khoản nhân viên
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên (PRODUCT_STAFF / INVENTORY_STAFF)' })
  @ApiConflictResponse({ description: 'Email đã được sử dụng' })
  @Post()
  createStaff(@Body() dto: CreateStaffDto) {
    return this.usersService.createStaff(dto);
  }

  // GET /users?role=&status= - Danh sách người dùng
  @ApiOperation({ summary: 'Danh sách người dùng' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['ADMIN', 'PRODUCT_STAFF', 'INVENTORY_STAFF', 'CUSTOMER'],
    description: 'Lọc theo role',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'LOCKED'], description: 'Lọc theo trạng thái' })
  @Get()
  findAll(@Query('role') role?: string, @Query('status') status?: string) {
    return this.usersService.findAll(role, status);
  }

  // GET /users/:id
  @ApiOperation({ summary: 'Chi tiết một người dùng' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // PATCH /users/:id - Chỉnh sửa thông tin
  @ApiOperation({ summary: 'Chỉnh sửa thông tin người dùng' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // PATCH /users/:id/lock - Khóa tài khoản
  @ApiOperation({ summary: 'Khóa tài khoản', description: 'Tài khoản bị khóa sẽ không đăng nhập được.' })
  @Patch(':id/lock')
  lock(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.lock(id);
  }

  // PATCH /users/:id/unlock - Mở khóa tài khoản
  @ApiOperation({ summary: 'Mở khóa tài khoản' })
  @Patch(':id/unlock')
  unlock(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.unlock(id);
  }

  // PATCH /users/:id/role - Phân quyền nhân viên
  @ApiOperation({ summary: 'Đổi role của nhân viên' })
  @Patch(':id/role')
  setRole(@Param('id', ParseIntPipe) id: number, @Body() dto: SetRoleDto) {
    return this.usersService.setRole(id, dto);
  }
}
