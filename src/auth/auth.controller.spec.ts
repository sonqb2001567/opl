import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        // Mock các dependency để không cần kết nối DB thật
        { provide: JwtService, useValue: { sign: () => 'fake-token' } },
        { provide: PrismaService, useValue: { user: { findUnique: async () => null } } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
