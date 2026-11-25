import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { SetRoleDto } from './dto/set-role.dto.js';
import type { UserRole, UserStatus } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin tạo tài khoản nhân viên / admin khác
  async createStaff(dto: CreateStaffDto) {
    const existed = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existed) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        phoneNumber: dto.phoneNumber,
        address: dto.address,
        // Tài khoản do Admin tạo không cần xác thực OTP, đăng nhập được ngay.
        // Chỉ khách hàng tự đăng ký mới phải xác thực email.
        emailVerifiedAt: new Date(),
      },
    });

    const { password: _password, ...result } = user;
    return result;
  }

  // Xem danh sách người dùng, lọc theo role / status
  async findAll(role?: string, status?: string) {
    const where: any = {};
    if (role) {
      where.role = role as UserRole;
    }
    if (status) {
      where.status = status as UserStatus;
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    // Bỏ trường password khỏi kết quả
    return users.map(({ password: _password, ...u }) => u);
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    const { password: _password, ...result } = user;
    return result;
  }

  // Admin chỉnh sửa thông tin nhân viên
  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id); // kiểm tra tồn tại
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        address: dto.address,
      },
    });
    const { password: _password, ...result } = user;
    return result;
  }

  // Khóa tài khoản
  async lock(id: number) {
    const user = await this.findOne(id);
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Không thể khóa tài khoản Admin');
    }
    await this.prisma.user.update({ where: { id }, data: { status: 'LOCKED' } });
    return { message: 'Đã khóa tài khoản' };
  }

  // Mở khóa tài khoản
  async unlock(id: number) {
    await this.findOne(id);
    await this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
    return { message: 'Đã mở khóa tài khoản' };
  }

  // Phân quyền nhân viên (Product Staff <-> Inventory Staff)
  async setRole(id: number, dto: SetRoleDto) {
    const user = await this.findOne(id);
    if (user.role === 'ADMIN' || user.role === 'CUSTOMER') {
      throw new BadRequestException('Chỉ được phân quyền cho tài khoản nhân viên');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });
    const { password: _password, ...result } = updated;
    return result;
  }
}
