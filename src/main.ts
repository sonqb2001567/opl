import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // Tạo thư mục chứa ảnh upload nếu chưa có
  if (!existsSync('./uploads')) {
    mkdirSync('./uploads');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Kiểm tra dữ liệu đầu vào cho tất cả API
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // bỏ các field thừa không khai báo trong DTO
      transform: true, // tự chuyển kiểu dữ liệu theo DTO
    }),
  );

  app.enableCors();

  // Cho phép truy cập ảnh sản phẩm qua đường dẫn /uploads/...
  app.useStaticAssets('uploads', { prefix: '/uploads/' });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server đang chạy tại http://localhost:${process.env.PORT ?? 3000}`);
}
await bootstrap();
