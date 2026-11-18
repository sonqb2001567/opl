import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = new URL(process.env.DATABASE_URL!);
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      connectionLimit: 5,
      allowPublicKeyRetrieval: true,
    });
    super({ adapter });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}