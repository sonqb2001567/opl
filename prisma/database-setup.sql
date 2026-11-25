-- =====================================================================
-- OPL Ecommerce Backend - Script tạo lại database PostgreSQL
-- =====================================================================
--
-- Script này tạo lại TOÀN BỘ database từ đầu: 13 bảng, 11 kiểu enum,
-- khoá ngoại, index, bản ghi migration của Prisma và tài khoản admin
-- mặc định.
--
-- CẢNH BÁO: script XOÁ sạch bảng cũ trong schema `public` trước khi tạo
-- lại. Đừng chạy trên database có dữ liệu cần giữ.
--
-- KHÁC MySQL: Postgres không có `CREATE DATABASE IF NOT EXISTS`, nên
-- script KHÔNG tự tạo database. Phải có database sẵn và kết nối vào nó:
--   - Docker Compose: biến POSTGRES_DB trong .env.docker tự tạo `opl`
--   - Render: database được tạo lúc tạo blueprint
--   - Máy dev: `createdb opl` hoặc `CREATE DATABASE opl;` trong psql
--
-- ---------------------------------------------------------------------
-- CÁCH CHẠY
-- ---------------------------------------------------------------------
-- Cách 1 - Prisma (không cần cài psql, dùng DATABASE_URL trong .env):
--   npx prisma db execute --file prisma/database-setup.sql
--
-- Cách 2 - psql (từ thư mục ecommerce-webapp):
--   psql "postgresql://postgres:matkhau@localhost:5432/opl" -f prisma/database-setup.sql
--
-- Cách 3 - pgAdmin / DBeaver: mở file, Execute toàn bộ script.
--
-- ---------------------------------------------------------------------
-- SAU KHI CHẠY SCRIPT
-- ---------------------------------------------------------------------
--   1. Copy `.env.example` thành `.env`, điền user/password Postgres:
--        DATABASE_URL="postgresql://postgres:matkhau@localhost:5432/opl"
--   2. npm install
--   3. npx prisma generate        # sinh Prisma Client vào src/generated/prisma
--   4. npm run start:dev          # server chạy tại http://localhost:3000
--
-- Đăng nhập admin: admin@test.com / admin123
-- =====================================================================

-- Dữ liệu có tiếng Việt, ép encoding của kết nối về UTF8 cho chắc
-- (thay cho `SET NAMES utf8mb4` của MySQL).
SET client_encoding = 'UTF8';

-- ---------------------------------------------------------------------
-- 1. Xoá các bảng + kiểu enum cũ (nếu có)
-- ---------------------------------------------------------------------
-- CASCADE tự xoá luôn khoá ngoại trỏ tới bảng, nên không cần tắt
-- foreign key check như `SET FOREIGN_KEY_CHECKS = 0` của MySQL.
DROP TABLE IF EXISTS "cart_items" CASCADE;
DROP TABLE IF EXISTS "carts" CASCADE;
DROP TABLE IF EXISTS "reviews" CASCADE;
DROP TABLE IF EXISTS "order_details" CASCADE;
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "inventory_transactions" CASCADE;
DROP TABLE IF EXISTS "product_categories" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "vouchers" CASCADE;
DROP TABLE IF EXISTS "verification_codes" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- Postgres lưu enum thành kiểu dữ liệu riêng, xoá bảng không xoá kiểu
DROP TYPE IF EXISTS "UserRole";
DROP TYPE IF EXISTS "UserStatus";
DROP TYPE IF EXISTS "CategoryStatus";
DROP TYPE IF EXISTS "ProductStatus";
DROP TYPE IF EXISTS "InventoryTransactionType";
DROP TYPE IF EXISTS "OrderStatus";
DROP TYPE IF EXISTS "PaymentMethod";
DROP TYPE IF EXISTS "PaymentStatus";
DROP TYPE IF EXISTS "ReviewStatus";
DROP TYPE IF EXISTS "VoucherStatus";
DROP TYPE IF EXISTS "VerificationCodeType";

-- ---------------------------------------------------------------------
-- 2. Kiểu enum
-- ---------------------------------------------------------------------
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PRODUCT_STAFF', 'INVENTORY_STAFF', 'CUSTOMER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'LOCKED');
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ProductStatus" AS ENUM ('ON_SALE', 'DISCONTINUED');
CREATE TYPE "InventoryTransactionType" AS ENUM ('IMPORT', 'EXPORT', 'ADJUSTMENT');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BANK_TRANSFER', 'E_WALLET');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN');
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "VerificationCodeType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

-- ---------------------------------------------------------------------
-- 3. Tạo bảng
-- ---------------------------------------------------------------------
-- SERIAL thay cho AUTO_INCREMENT, TIMESTAMP(3) thay cho DATETIME(3).

-- Người dùng: admin, nhân viên sản phẩm, nhân viên kho, khách hàng
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20),
    "address" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    -- NULL = email chưa xác thực OTP => chưa đăng nhập được
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- Mã OTP 6 số gửi qua email (xác thực email / đặt lại mật khẩu).
-- Chỉ lưu bản băm bcrypt của mã, không lưu mã gốc.
CREATE TABLE "verification_codes" (
    "verification_code_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "VerificationCodeType" NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("verification_code_id")
);

-- Danh mục sản phẩm
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- Sản phẩm (danh mục nằm ở bảng trung gian product_categories)
CREATE TABLE "products" (
    "product_id" SERIAL NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "sku_code" VARCHAR(50) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "status" "ProductStatus" NOT NULL DEFAULT 'ON_SALE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("product_id")
);

-- Bảng trung gian của quan hệ N-N Category <-> Product.
-- Khoá chính ghép nên 1 sản phẩm không gán trùng 1 danh mục hai lần.
CREATE TABLE "product_categories" (
    "product_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id", "category_id")
);

-- Phiếu nhập / xuất / điều chỉnh kho
CREATE TABLE "inventory_transactions" (
    "transaction_id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "transaction_type" "InventoryTransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- Đơn hàng
CREATE TABLE "orders" (
    "order_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "shipping_address" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "shipping_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- Chi tiết đơn hàng (1 đơn - 1 dòng chi tiết, xem UNIQUE ở mục 4)
CREATE TABLE "order_details" (
    "order_detail_id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_details_pkey" PRIMARY KEY ("order_detail_id")
);

-- Đánh giá sản phẩm
CREATE TABLE "reviews" (
    "review_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("review_id")
);

-- Mã giảm giá
CREATE TABLE "vouchers" (
    "voucher_id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "conditions" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("voucher_id")
);

-- Giỏ hàng (1 khách hàng - 1 giỏ)
CREATE TABLE "carts" (
    "cart_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("cart_id")
);

-- Sản phẩm trong giỏ hàng
CREATE TABLE "cart_items" (
    "cart_item_id" SERIAL NOT NULL,
    "cart_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("cart_item_id")
);

-- ---------------------------------------------------------------------
-- 4. Index (Postgres tách CREATE INDEX ra khỏi CREATE TABLE)
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "categories_category_name_key" ON "categories"("category_name");
CREATE UNIQUE INDEX "products_sku_code_key" ON "products"("sku_code");
CREATE INDEX "products_status_idx" ON "products"("status");
CREATE INDEX "product_categories_category_id_idx" ON "product_categories"("category_id");
CREATE INDEX "verification_codes_user_id_type_created_at_idx" ON "verification_codes"("user_id", "type", "created_at");
CREATE INDEX "inventory_transactions_product_id_idx" ON "inventory_transactions"("product_id");
CREATE INDEX "inventory_transactions_staff_id_idx" ON "inventory_transactions"("staff_id");
CREATE INDEX "inventory_transactions_created_at_idx" ON "inventory_transactions"("created_at");
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");
CREATE INDEX "order_details_product_id_idx" ON "order_details"("product_id");
-- UNIQUE trên order_id => quan hệ Order - OrderDetail là 1-1
CREATE UNIQUE INDEX "order_details_order_id_key" ON "order_details"("order_id");
CREATE INDEX "reviews_product_id_status_idx" ON "reviews"("product_id", "status");
CREATE INDEX "reviews_customer_id_idx" ON "reviews"("customer_id");
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");
CREATE INDEX "vouchers_status_valid_from_valid_to_idx" ON "vouchers"("status", "valid_from", "valid_to");
CREATE UNIQUE INDEX "carts_customer_id_key" ON "carts"("customer_id");
CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id", "product_id");

-- ---------------------------------------------------------------------
-- 5. Khoá ngoại
-- ---------------------------------------------------------------------
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_details" ADD CONSTRAINT "order_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_details" ADD CONSTRAINT "order_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("cart_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- 6. Đồng bộ trạng thái migration cho Prisma
-- ---------------------------------------------------------------------
-- Đánh dấu các migration là ĐÃ CHẠY, để `npx prisma migrate status` /
-- `migrate dev` không đòi reset lại database.
-- Checksum là SHA-256 của từng file prisma/migrations/<tên>/migration.sql.
--
-- Nếu sau này file migration bị sửa và Prisma báo lỗi checksum, chạy:
--   npx prisma migrate resolve --applied <tên migration>
CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

INSERT INTO "_prisma_migrations"
  ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
VALUES
  (
    gen_random_uuid()::text,
    '6e99907f7e12d315078d6c2f3fa673844f024bad32220a1f98a8cc0671289cfd',
    now(),
    '20261031174921_init',
    now(),
    1
  ),
  (
    gen_random_uuid()::text,
    'a46bc69dff843a7c2671ec5a247a269068d97032bf408c44c94d78e82c4cbc16',
    now(),
    '20261125093000_email_otp_product_category_nn_order_1_1',
    now(),
    1
  );

-- ---------------------------------------------------------------------
-- 7. Dữ liệu khởi tạo: tài khoản admin
-- ---------------------------------------------------------------------
-- Mật khẩu đã hash bcrypt. Đăng nhập: admin@test.com / admin123
-- email_verified_at được set sẵn nên admin đăng nhập được ngay, không cần OTP.
--
-- Cách khác không cần chạy SQL: bỏ đoạn INSERT này, đặt ADMIN_SETUP_KEY trong
-- .env rồi gọi POST /auth/bootstrap-admin với header x-setup-key.
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

-- ---------------------------------------------------------------------
-- 8. Kiểm tra kết quả
-- ---------------------------------------------------------------------
SELECT table_name AS "Bảng đã tạo"
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT "user_id", "email", "role", "status" FROM "users";
