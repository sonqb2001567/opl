import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor() {
    // Chỉ tạo transporter khi đã cấu hình đủ MAIL_HOST / MAIL_USER / MAIL_PASS.
    // Thiếu bất kỳ biến nào thì chạy ở "chế độ console": mã OTP được in ra log
    // để vẫn test được bằng Postman / Swagger mà không cần tài khoản SMTP.
    const host = process.env.MAIL_HOST;
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    if (host && user && pass) {
      const port = Number(process.env.MAIL_PORT) || 587;
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // cổng 465 dùng SSL, 587 dùng STARTTLS
        auth: { user, pass },
      });
      this.logger.log(`Gửi email qua SMTP ${host}:${port}`);
    } else {
      this.logger.warn('Chưa cấu hình MAIL_HOST/MAIL_USER/MAIL_PASS - mã OTP sẽ được in ra console');
    }
  }

  // true khi đang gửi mail thật, false khi chỉ log ra console.
  // AuthService dùng cờ này để quyết định có trả OTP trong response hay không.
  get isSmtpConfigured(): boolean {
    return this.transporter !== null;
  }

  // Gửi mã OTP xác thực email sau khi đăng ký
  sendEmailVerificationOtp(to: string, fullName: string, otp: string, minutes: number) {
    return this.send(
      to,
      'Xác thực email đăng ký tài khoản',
      `Xin chào ${fullName},

Mã xác thực email của bạn là: ${otp}

Mã có hiệu lực trong ${minutes} phút. Nhập mã này ở bước xác thực để hoàn tất đăng ký.
Nếu bạn không đăng ký tài khoản tại OPL Shop, hãy bỏ qua email này.`,
    );
  }

  // Gửi mã OTP đặt lại mật khẩu
  sendPasswordResetOtp(to: string, fullName: string, otp: string, minutes: number) {
    return this.send(
      to,
      'Mã đặt lại mật khẩu',
      `Xin chào ${fullName},

Mã đặt lại mật khẩu của bạn là: ${otp}

Mã có hiệu lực trong ${minutes} phút. Nếu không phải bạn yêu cầu, hãy bỏ qua email này
và đổi mật khẩu để đảm bảo an toàn.`,
    );
  }

  // Gửi mail, thất bại thì chỉ ghi log chứ không làm vỡ request đăng ký.
  private async send(to: string, subject: string, text: string) {
    if (!this.transporter) {
      this.logger.warn(`[MAIL -> ${to}] ${subject}\n${text}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to,
        subject: `[OPL Shop] ${subject}`,
        text,
      });
      this.logger.log(`Đã gửi email "${subject}" tới ${to}`);
    } catch (error) {
      // Không throw: tài khoản đã được tạo, khách có thể bấm gửi lại mã.
      this.logger.error(`Gửi email tới ${to} thất bại: ${(error as Error).message}`);
      this.logger.warn(`[MAIL -> ${to}] ${subject}\n${text}`);
    }
  }
}
