import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { OtpService, OTP_TTL_MINUTES } from './otp.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly otpService: OtpService,
  ) {}

  // Đăng ký tài khoản khách hàng, sau đó gửi mã OTP xác thực email.
  // Tài khoản chưa xác thực email thì chưa đăng nhập được.
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

    const otp = await this.otpService.issue(user.id, 'EMAIL_VERIFY');
    await this.mailService.sendEmailVerificationOtp(user.email, user.fullName, otp, OTP_TTL_MINUTES);

    // Không trả về mật khẩu
    const { password: _password, ...result } = user;
    return {
      message: `Đã gửi mã OTP tới ${user.email}. Nhập mã tại POST /auth/verify-email để hoàn tất đăng ký.`,
      user: result,
      ...this.devOtp(otp),
    };
  }

  // Xác thực email bằng mã OTP 6 số
  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email đã được xác thực trước đó');
    }

    await this.otpService.consume(user.id, 'EMAIL_VERIFY', dto.otp);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });

    return { message: 'Xác thực email thành công, bạn có thể đăng nhập' };
  }

  // Gửi lại mã OTP xác thực email
  async resendVerificationOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email đã được xác thực, không cần gửi lại mã');
    }

    const otp = await this.otpService.issue(user.id, 'EMAIL_VERIFY');
    await this.mailService.sendEmailVerificationOtp(user.email, user.fullName, otp, OTP_TTL_MINUTES);

    return {
      message: `Đã gửi lại mã OTP tới ${user.email}, mã có hiệu lực ${OTP_TTL_MINUTES} phút`,
      ...this.devOtp(otp),
    };
  }

  // Quên mật khẩu: gửi mã OTP đặt lại mật khẩu qua email.
  // Email không tồn tại cũng trả về thông báo giống nhau để không bị dò danh sách email.
  async forgotPassword(dto: ForgotPasswordDto) {
    const message = `Nếu email ${dto.email} có tài khoản, mã đặt lại mật khẩu đã được gửi tới hộp thư đó`;

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { message };
    }

    const otp = await this.otpService.issue(user.id, 'PASSWORD_RESET');
    await this.mailService.sendPasswordResetOtp(user.email, user.fullName, otp, OTP_TTL_MINUTES);

    return { message, ...this.devOtp(otp) };
  }

  // Đặt lại mật khẩu bằng mã OTP nhận qua email
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này');
    }

    await this.otpService.consume(user.id, 'PASSWORD_RESET', dto.otp);

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        // Nhận được mã qua email nghĩa là đã chứng minh sở hữu email đó
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });

    return { message: 'Đặt lại mật khẩu thành công, hãy đăng nhập bằng mật khẩu mới' };
  }

  // Tạo tài khoản admin đầu tiên. Bảo vệ bằng ADMIN_SETUP_KEY trong .env
  // và chỉ chạy được khi hệ thống chưa có admin nào.
  async bootstrapAdmin(setupKey: string | undefined, dto: CreateAdminDto) {
    const expectedKey = process.env.ADMIN_SETUP_KEY;
    if (!expectedKey) {
      throw new ForbiddenException('Chức năng chưa được bật, hãy đặt ADMIN_SETUP_KEY trong .env');
    }
    if (setupKey !== expectedKey) {
      throw new ForbiddenException('Setup key không đúng');
    }

    const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount > 0) {
      throw new ForbiddenException(
        'Hệ thống đã có tài khoản admin. Dùng POST /users (token admin) để tạo thêm tài khoản.',
      );
    }

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
        phoneNumber: dto.phoneNumber,
        address: dto.address,
        role: 'ADMIN',
        // Admin tạo bằng setup key thì xác thực luôn, đăng nhập được ngay
        emailVerifiedAt: new Date(),
      },
    });

    const { password: _password, ...result } = user;
    return { message: 'Tạo tài khoản admin thành công', user: result };
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

    // Chưa xác thực email thì chưa cho vào
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Email chưa được xác thực, vui lòng kiểm tra hộp thư hoặc gọi POST /auth/resend-otp',
      );
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

  // Khi chưa cấu hình SMTP thì trả mã OTP ngay trong response để test được
  // bằng Postman / Swagger. Có SMTP thật thì không bao giờ lộ mã ra response.
  private devOtp(otp: string) {
    return this.mailService.isSmtpConfigured ? {} : { devOtp: otp };
  }
}
