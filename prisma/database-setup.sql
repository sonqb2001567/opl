-- =====================================================================
-- OPL Ecommerce Backend - Script tạo lại database MySQL
-- =====================================================================
--
-- Script này tạo lại TOÀN BỘ database từ đầu: 11 bảng, khoá ngoại,
-- index, bản ghi migration của Prisma và tài khoản admin mặc định.
--
-- CẢNH BÁO: script XOÁ sạch dữ liệu cũ trong database `opl` trước khi
-- tạo lại. Đừng chạy trên database có dữ liệu cần giữ.
--
-- ---------------------------------------------------------------------
-- CÁCH CHẠY
-- ---------------------------------------------------------------------
-- Cách 1 - MySQL Workbench / DBeaver:
--   Mở file này, bấm Execute (toàn bộ script).
--
-- Cách 2 - dòng lệnh (từ thư mục ecommerce-webapp):
--   mysql -u root -p < prisma/database-setup.sql
--
--   Trên Windows nếu `mysql` chưa có trong PATH:
--   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < prisma/database-setup.sql
--
-- ---------------------------------------------------------------------
-- SAU KHI CHẠY SCRIPT
-- ---------------------------------------------------------------------
--   1. Copy `.env.example` thành `.env`, điền user/password MySQL của bạn:
--        DATABASE_URL="mysql://root:matkhau@localhost:3306/opl"
--   2. npm install
--   3. npx prisma generate        # sinh Prisma Client vào src/generated/prisma
--   4. npm run start:dev          # server chạy tại http://localhost:3000
--
-- Đăng nhập admin: admin@test.com / admin123
--
-- ---------------------------------------------------------------------
-- ĐỔI TÊN DATABASE
-- ---------------------------------------------------------------------
-- Muốn dùng tên khác thì sửa `opl` ở 3 chỗ: CREATE DATABASE / USE ngay
-- dưới đây và câu SELECT kiểm tra ở cuối file; đồng thời sửa tên database
-- trong DATABASE_URL ở file .env cho khớp.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `opl`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `opl`;

-- ---------------------------------------------------------------------
-- 1. Xoá các bảng cũ (nếu có), theo thứ tự ngược quan hệ khoá ngoại
-- ---------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `cart_items`;
DROP TABLE IF EXISTS `carts`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `order_details`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `inventory_transactions`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `vouchers`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `_prisma_migrations`;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 2. Tạo bảng
-- ---------------------------------------------------------------------

-- Người dùng: admin, nhân viên sản phẩm, nhân viên kho, khách hàng
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(20) NULL,
    `address` TEXT NULL,
    `role` ENUM('ADMIN', 'PRODUCT_STAFF', 'INVENTORY_STAFF', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
    `status` ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Danh mục sản phẩm
CREATE TABLE `categories` (
    `category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_name` VARCHAR(100) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_category_name_key`(`category_name`),
    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sản phẩm
CREATE TABLE `products` (
    `product_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `sku_code` VARCHAR(50) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `description` TEXT NULL,
    `image_url` VARCHAR(500) NULL,
    `status` ENUM('ON_SALE', 'DISCONTINUED') NOT NULL DEFAULT 'ON_SALE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_sku_code_key`(`sku_code`),
    INDEX `products_category_id_idx`(`category_id`),
    INDEX `products_status_idx`(`status`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Phiếu nhập / xuất / điều chỉnh kho
CREATE TABLE `inventory_transactions` (
    `transaction_id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `staff_id` INTEGER NOT NULL,
    `transaction_type` ENUM('IMPORT', 'EXPORT', 'ADJUSTMENT') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_transactions_product_id_idx`(`product_id`),
    INDEX `inventory_transactions_staff_id_idx`(`staff_id`),
    INDEX `inventory_transactions_created_at_idx`(`created_at`),
    PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Đơn hàng
CREATE TABLE `orders` (
    `order_id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `shipping_address` TEXT NOT NULL,
    `payment_method` ENUM('COD', 'BANK_TRANSFER', 'E_WALLET') NOT NULL,
    `payment_status` ENUM('UNPAID', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    `shipping_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `cancel_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `orders_customer_id_idx`(`customer_id`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_created_at_idx`(`created_at`),
    PRIMARY KEY (`order_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Chi tiết đơn hàng
CREATE TABLE `order_details` (
    `order_detail_id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,

    INDEX `order_details_product_id_idx`(`product_id`),
    UNIQUE INDEX `order_details_order_id_product_id_key`(`order_id`, `product_id`),
    PRIMARY KEY (`order_detail_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Đánh giá sản phẩm
CREATE TABLE `reviews` (
    `review_id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `rating` SMALLINT NOT NULL,
    `comment` TEXT NULL,
    `status` ENUM('VISIBLE', 'HIDDEN') NOT NULL DEFAULT 'VISIBLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reviews_product_id_status_idx`(`product_id`, `status`),
    INDEX `reviews_customer_id_idx`(`customer_id`),
    PRIMARY KEY (`review_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Mã giảm giá
CREATE TABLE `vouchers` (
    `voucher_id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `discount_value` DECIMAL(12, 2) NOT NULL,
    `conditions` TEXT NULL,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_to` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vouchers_code_key`(`code`),
    INDEX `vouchers_status_valid_from_valid_to_idx`(`status`, `valid_from`, `valid_to`),
    PRIMARY KEY (`voucher_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Giỏ hàng (1 khách hàng - 1 giỏ)
CREATE TABLE `carts` (
    `cart_id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `carts_customer_id_key`(`customer_id`),
    PRIMARY KEY (`cart_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sản phẩm trong giỏ hàng
CREATE TABLE `cart_items` (
    `cart_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `cart_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    INDEX `cart_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `cart_items_cart_id_product_id_key`(`cart_id`, `product_id`),
    PRIMARY KEY (`cart_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Khoá ngoại
-- ---------------------------------------------------------------------
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `order_details` ADD CONSTRAINT `order_details_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `order_details` ADD CONSTRAINT `order_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reviews` ADD CONSTRAINT `reviews_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `reviews` ADD CONSTRAINT `reviews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `carts` ADD CONSTRAINT `carts_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`cart_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- 4. Đồng bộ trạng thái migration cho Prisma
-- ---------------------------------------------------------------------
-- Đánh dấu migration `20261031174921_init` là ĐÃ CHẠY, để `npx prisma
-- migrate status` / `migrate dev` không đòi reset lại database.
-- Checksum là SHA-256 của prisma/migrations/20261031174921_init/migration.sql.
--
-- Nếu sau này file migration đó bị sửa và Prisma báo lỗi checksum, chạy:
--   npx prisma migrate resolve --applied 20261031174921_init
CREATE TABLE `_prisma_migrations` (
    `id` VARCHAR(36) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `migration_name` VARCHAR(255) NOT NULL,
    `logs` TEXT NULL,
    `rolled_back_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applied_steps_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_prisma_migrations`
  (`id`, `checksum`, `finished_at`, `migration_name`, `started_at`, `applied_steps_count`)
VALUES (
  UUID(),
  '910e4de264b82e57388fbf1d0f8913e743b2eb3199c95c33aab4206dd016035a',
  NOW(3),
  '20261031174921_init',
  NOW(3),
  1
);

-- ---------------------------------------------------------------------
-- 5. Dữ liệu khởi tạo: tài khoản admin
-- ---------------------------------------------------------------------
-- Mật khẩu đã hash bcrypt. Đăng nhập: admin@test.com / admin123
INSERT INTO `users` (`full_name`, `email`, `password`, `role`, `status`, `created_at`, `updated_at`)
VALUES (
  'Quản Trị Viên',
  'admin@test.com',
  '$2b$10$i0IGmB3ElkF.N4Jbf3LEc.SlZvgHrdEMpG5BH/W4Z3lJPIPF2nSnS',
  'ADMIN',
  'ACTIVE',
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE `email` = `email`;

-- ---------------------------------------------------------------------
-- 6. Kiểm tra kết quả
-- ---------------------------------------------------------------------
SELECT TABLE_NAME AS 'Bảng đã tạo'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'opl'
ORDER BY TABLE_NAME;

SELECT `user_id`, `email`, `role`, `status` FROM `users`;
