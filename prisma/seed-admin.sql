-- Tạo tài khoản admin mặc định cho môi trường dev/test.
-- Chạy: npx prisma db execute --file prisma/seed-admin.sql
-- Đăng nhập: admin@test.com / admin123
INSERT INTO users (full_name, email, password, role, status, created_at, updated_at)
VALUES (
  'Quản Trị Viên',
  'admin@test.com',
  '$2b$10$i0IGmB3ElkF.N4Jbf3LEc.SlZvgHrdEMpG5BH/W4Z3lJPIPF2nSnS',
  'ADMIN',
  'ACTIVE',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE email = email;
