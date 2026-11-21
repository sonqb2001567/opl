import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Postgres: adapter nhận thẳng connection string, kể cả tham số ?sslmode=require
    // mà Render bắt buộc khi kết nối từ ngoài vào (External Database URL).
    // Trên Render thì app và database cùng network nội bộ nên dùng Internal URL
    // không cần SSL.
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      // Render Postgres free giới hạn ~97 kết nối, giữ pool nhỏ cho chắc
      max: 5,
    });
    super({ adapter });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
