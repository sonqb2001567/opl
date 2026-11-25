-- Tạo tài khoản admin mặc định cho môi trường dev/test (PostgreSQL).
-- Chạy: npx prisma db execute --file prisma/seed-admin.sql
-- Đăng nhập: admin@test.com / admin123
--
-- Cách khác không cần chạy SQL: đặt ADMIN_SETUP_KEY trong .env rồi gọi
-- POST /auth/bootstrap-admin với header x-setup-key (chỉ dùng được khi
-- hệ thống chưa có admin nào).

-- Dữ liệu có tiếng Việt, ép encoding của kết nối về UTF8 cho chắc
-- (thay cho `SET NAMES utf8mb4` của MySQL).
SET client_encoding = 'UTF8';

-- email_verified_at set sẵn nên admin đăng nhập được ngay, không cần xác thực OTP
INSERT INTO "users" ("full_name", "email", "password", "role", "status", "email_verified_at", "created_at", "updated_at")
VALUES (
  'Quản Trị Viên',
  'admin@test.com',
  '$2b$10$i0IGmB3ElkF.N4Jbf3LEc.SlZvgHrdEMpG5BH/W4Z3lJPIPF2nSnS',
  'ADMIN',
  'ACTIVE',
  now(),
  now(),
  now()
)
ON CONFLICT ("email") DO NOTHING;
