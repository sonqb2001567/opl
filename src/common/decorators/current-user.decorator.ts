import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Lấy user đã được JwtStrategy gắn vào request
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
