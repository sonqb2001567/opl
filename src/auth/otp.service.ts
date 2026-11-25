import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import type { VerificationCodeType } from '../generated/prisma/enums.js';

// Mã OTP sống 10 phút, gửi lại cách nhau tối thiểu 60 giây,
// nhập sai quá 5 lần thì phải xin mã mới.
export const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(private readonly prisma: PrismaService) {}

  // Tạo mã OTP mới cho người dùng và trả về mã gốc để gửi mail.
  // Mã cũ cùng loại bị vô hiệu hoá để mỗi lúc chỉ có 1 mã dùng được.
  async issue(userId: number, type: VerificationCodeType): Promise<string> {
    const latest = await this.prisma.verificationCode.findFirst({
      where: { userId, type },
      orderBy: { createdAt: 'desc' },
    });

    // Chống spam gửi mail: phải đợi hết thời gian chờ mới xin mã mới
    if (latest) {
      const elapsedSeconds = (Date.now() - latest.createdAt.getTime()) / 1000;
      if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
        throw new BadRequestException(`Vui lòng đợi ${wait} giây nữa rồi gửi lại mã`);
      }
    }

    // 6 số, luôn đủ 6 ký tự (100000 - 999999)
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(otp, 10);

    await this.prisma.$transaction([
      // Vô hiệu hoá mọi mã cũ chưa dùng của cùng loại
      this.prisma.verificationCode.updateMany({
        where: { userId, type, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.verificationCode.create({
        data: {
          userId,
          type,
          codeHash,
          expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        },
      }),
    ]);

    return otp;
  }

  // Kiểm tra mã người dùng nhập. Đúng thì đánh dấu đã dùng, sai thì tăng số lần sai.
  async consume(userId: number, type: VerificationCodeType, otp: string): Promise<void> {
    const record = await this.prisma.verificationCode.findFirst({
      where: { userId, type, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Chưa có mã OTP nào đang chờ xác thực, vui lòng bấm gửi lại mã');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Mã OTP đã hết hạn, vui lòng bấm gửi lại mã');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Bạn đã nhập sai quá nhiều lần, vui lòng bấm gửi lại mã');
    }

    const isMatch = await bcrypt.compare(otp, record.codeHash);
    if (!isMatch) {
      const updated = await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_ATTEMPTS - updated.attempts;
      throw new BadRequestException(
        remaining > 0
          ? `Mã OTP không đúng, bạn còn ${remaining} lần thử`
          : 'Mã OTP không đúng và đã hết số lần thử, vui lòng bấm gửi lại mã',
      );
    }

    await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }
}
