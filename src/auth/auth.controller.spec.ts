import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OtpService } from './otp.service.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        // Mock các dependency để không cần kết nối DB thật / không gửi mail thật
        { provide: JwtService, useValue: { sign: () => 'fake-token' } },
        { provide: PrismaService, useValue: { user: { findUnique: async () => null } } },
        { provide: MailService, useValue: { isSmtpConfigured: false } },
        { provide: OtpService, useValue: { issue: async () => '123456', consume: async () => undefined } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
