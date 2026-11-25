import { Body, Controller, Get, Headers, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { ApiTag } from '../swagger.js';

@ApiTags(ApiTag.Auth)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register - Khách hàng đăng ký tài khoản + gửi OTP xác thực email
  @ApiOperation({
    summary: 'Đăng ký tài khoản khách hàng (gửi mã OTP xác thực email)',
    description:
      'Tài khoản tạo ra luôn có role CUSTOMER và **chưa đăng nhập được** cho tới khi xác thực email ' +
      'bằng `POST /auth/verify-email`. Mã OTP gồm 6 số, hiệu lực 10 phút.\n\n' +
      'Khi server chưa cấu hình SMTP (`MAIL_HOST`/`MAIL_USER`/`MAIL_PASS`), mã OTP được in ra console ' +
      'và trả kèm trong response ở field `devOtp` để test được ngay.\n\n' +
      'Muốn tạo nhân viên thì dùng `POST /users` (Admin).',
  })
  @ApiOkResponse({
    description: 'Đăng ký thành công, đã gửi OTP',
    schema: {
      example: {
        message: 'Đã gửi mã OTP tới customer@example.com. Nhập mã tại POST /auth/verify-email để hoàn tất đăng ký.',
        user: { id: 2, fullName: 'Nguyễn Văn A', email: 'customer@example.com', role: 'CUSTOMER', emailVerifiedAt: null },
        devOtp: '123456',
      },
    },
  })
  @ApiConflictResponse({ description: 'Email đã được sử dụng' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /auth/verify-email - Nhập mã OTP để xác thực email
  @ApiOperation({
    summary: 'Xác thực email bằng mã OTP',
    description: 'Nhập mã 6 số nhận qua email. Xác thực xong mới đăng nhập được.',
  })
  @ApiOkResponse({ schema: { example: { message: 'Xác thực email thành công, bạn có thể đăng nhập' } } })
  @ApiBadRequestResponse({ description: 'Mã OTP sai, hết hạn, hoặc email đã xác thực trước đó' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tài khoản với email này' })
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  // POST /auth/resend-otp - Gửi lại mã OTP xác thực email
  @ApiOperation({
    summary: 'Gửi lại mã OTP xác thực email',
    description: 'Mỗi lần gửi lại cách nhau tối thiểu 60 giây. Mã cũ bị vô hiệu hoá khi có mã mới.',
  })
  @ApiBadRequestResponse({ description: 'Email đã xác thực, hoặc chưa hết thời gian chờ gửi lại' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tài khoản với email này' })
  @Post('resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendVerificationOtp(dto);
  }

  // POST /auth/forgot-password - Gửi mã OTP đặt lại mật khẩu
  @ApiOperation({
    summary: 'Quên mật khẩu - gửi mã OTP đặt lại mật khẩu',
    description:
      'Gửi mã 6 số tới email, hiệu lực 10 phút. Email không tồn tại cũng trả về thông báo giống nhau ' +
      'để không bị dò danh sách email người dùng.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Nếu email customer@example.com có tài khoản, mã đặt lại mật khẩu đã được gửi tới hộp thư đó',
        devOtp: '123456',
      },
    },
  })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // POST /auth/reset-password - Đặt lại mật khẩu bằng OTP
  @ApiOperation({
    summary: 'Quên mật khẩu - đặt lại mật khẩu bằng mã OTP',
    description: 'Dùng mã nhận từ `POST /auth/forgot-password`. Không cần nhập mật khẩu cũ.',
  })
  @ApiOkResponse({ schema: { example: { message: 'Đặt lại mật khẩu thành công, hãy đăng nhập bằng mật khẩu mới' } } })
  @ApiBadRequestResponse({ description: 'Mã OTP sai hoặc đã hết hạn' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy tài khoản với email này' })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // POST /auth/bootstrap-admin - Tạo tài khoản admin đầu tiên
  @ApiOperation({
    summary: 'Tạo tài khoản admin đầu tiên (cần setup key)',
    description:
      'Thay cho việc chạy `prisma/seed-admin.sql`. Yêu cầu header `x-setup-key` khớp với `ADMIN_SETUP_KEY` ' +
      'trong `.env`, và **chỉ dùng được khi hệ thống chưa có admin nào** — gọi lần thứ hai sẽ bị 403.\n\n' +
      'Tài khoản tạo ra được xác thực email sẵn nên đăng nhập được ngay. ' +
      'Muốn thêm admin về sau thì dùng `POST /users` với token của admin hiện có.',
  })
  @ApiHeader({ name: 'x-setup-key', description: 'Giá trị của ADMIN_SETUP_KEY trong .env', required: true })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Tạo tài khoản admin thành công',
        user: { id: 1, fullName: 'Quản Trị Viên', email: 'admin@test.com', role: 'ADMIN', status: 'ACTIVE' },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Sai setup key, chưa đặt ADMIN_SETUP_KEY, hoặc hệ thống đã có admin' })
  @ApiConflictResponse({ description: 'Email đã được sử dụng' })
  @Post('bootstrap-admin')
  bootstrapAdmin(@Headers('x-setup-key') setupKey: string | undefined, @Body() dto: CreateAdminDto) {
    return this.authService.bootstrapAdmin(setupKey, dto);
  }

  // POST /auth/login - Đăng nhập, trả về token
  @ApiOperation({
    summary: 'Đăng nhập, trả về accessToken',
    description:
      'Lưu accessToken lại và gửi kèm mọi request sau dưới header `Authorization: Bearer <token>`. ' +
      'Tài khoản chưa xác thực email hoặc đang bị khoá sẽ bị từ chối.',
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
  @ApiUnauthorizedResponse({ description: 'Sai email/mật khẩu, tài khoản bị khoá, hoặc email chưa xác thực' })
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
