import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register - Khách hàng đăng ký tài khoản
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /auth/login - Đăng nhập, trả về token
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /auth/change-password - Đổi mật khẩu
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  // GET /auth/me - Xem thông tin cá nhân
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  // PATCH /auth/me - Cập nhật thông tin cá nhân
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }
}
