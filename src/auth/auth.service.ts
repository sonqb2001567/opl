import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // Đăng ký tài khoản khách hàng
  async register(dto: RegisterDto) {
    // Kiểm tra email đã tồn tại chưa
    const existed = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existed) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    // Băm mật khẩu trước khi lưu
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        password: hashedPassword,
        phoneNumber: dto.phoneNumber,
        address: dto.address,
        role: 'CUSTOMER',
      },
    });

    // Không trả về mật khẩu
    const { password: _password, ...result } = user;
    return result;
  }

  // Đăng nhập, trả về JWT token
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    // Tài khoản bị khóa thì không cho đăng nhập
    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  // Đổi mật khẩu (yêu cầu nhập đúng mật khẩu cũ)
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  // Xem thông tin cá nhân
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    const { password: _password, ...result } = user;
    return result;
  }

  // Cập nhật thông tin cá nhân
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        address: dto.address,
      },
    });
    const { password: _password, ...result } = user;
    return result;
  }
}
