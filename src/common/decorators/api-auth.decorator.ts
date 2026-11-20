import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { UserRole } from '../../generated/prisma/enums.js';

// Dùng: @ApiAuth('ADMIN') hoặc @ApiAuth('INVENTORY_STAFF', 'ADMIN')
// Gắn ổ khóa 🔒 trên Swagger UI và khai báo sẵn 2 lỗi auth thường gặp.
export const ApiAuth = (...roles: UserRole[]) =>
  applyDecorators(
    ApiBearerAuth('bearer'),
    ApiUnauthorizedResponse({ description: 'Thiếu token hoặc token hết hạn' }),
    ApiForbiddenResponse({
      description: roles.length ? `Chỉ dành cho role: ${roles.join(', ')}` : 'Không có quyền truy cập',
    }),
  );
