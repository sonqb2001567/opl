import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../generated/prisma/enums.js';

export const ROLES_KEY = 'roles';

// Dùng: @Roles('ADMIN', 'PRODUCT_STAFF')
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
