import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { CartModule } from './cart/cart.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { VouchersModule } from './vouchers/vouchers.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SettingsModule } from './settings/settings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    VouchersModule,
    ReportsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
