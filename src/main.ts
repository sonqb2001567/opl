import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module.js';
import { SWAGGER_PATH, setupSwagger } from './swagger.js';

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

  // Trang tài liệu API cho frontend (tắt được bằng SWAGGER_ENABLED=false)
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  const port = process.env.PORT ?? 3000;
  // Bind 0.0.0.0 để PaaS (Render) nhìn thấy cổng; mặc định chỉ listen localhost
  // là coi như service không mở cổng và deploy sẽ bị đánh fail.
  await app.listen(port, '0.0.0.0');
  console.log(`Server đang chạy tại http://localhost:${port}`);
  if (swaggerEnabled) {
    console.log(`Tài liệu API: http://localhost:${port}/${SWAGGER_PATH}`);
  }
}
await bootstrap();
