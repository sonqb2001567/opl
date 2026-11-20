import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiConflictResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

@ApiTags(ApiTag.Auth)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register - Khách hàng đăng ký tài khoản
  @ApiOperation({
    summary: 'Đăng ký tài khoản khách hàng',
    description: 'Tài khoản tạo ra luôn có role CUSTOMER. Muốn tạo nhân viên thì dùng POST /users (Admin).',
  })
  @ApiConflictResponse({ description: 'Email đã được sử dụng' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /auth/login - Đăng nhập, trả về token
  @ApiOperation({
    summary: 'Đăng nhập, trả về accessToken',
    description: 'Lưu accessToken lại và gửi kèm mọi request sau dưới header `Authorization: Bearer <token>`.',
  })
  @ApiOkResponse({
    description: 'Đăng nhập thành công',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: { id: 1, fullName: 'Nguyễn Văn A', email: 'customer@example.com', role: 'CUSTOMER' },
      },
    },
  })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // POST /auth/change-password - Đổi mật khẩu
  @ApiOperation({ summary: 'Đổi mật khẩu của chính mình' })
  @ApiAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  // GET /auth/me - Xem thông tin cá nhân
  @ApiOperation({ summary: 'Xem thông tin cá nhân của token đang dùng' })
  @ApiAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  // PATCH /auth/me - Cập nhật thông tin cá nhân
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @ApiAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }
}
