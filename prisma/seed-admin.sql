-- Tạo tài khoản admin mặc định cho môi trường dev/test (PostgreSQL).
-- Chạy: npx prisma db execute --file prisma/seed-admin.sql
-- Đăng nhập: admin@test.com / admin123

-- Dữ liệu có tiếng Việt, ép encoding của kết nối về UTF8 cho chắc
-- (thay cho `SET NAMES utf8mb4` của MySQL).
SET client_encoding = 'UTF8';

INSERT INTO "users" ("full_name", "email", "password", "role", "status", "created_at", "updated_at")
VALUES (
  'Quản Trị Viên',
  'admin@test.com',
  '$2b$10$i0IGmB3ElkF.N4Jbf3LEc.SlZvgHrdEMpG5BH/W4Z3lJPIPF2nSnS',
  'ADMIN',
  'ACTIVE',
  now(),
  now()
)
ON CONFLICT ("email") DO NOTHING;
