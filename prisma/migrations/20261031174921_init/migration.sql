-- CreateTable
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

-- CreateTable
CREATE TABLE `categories` (
    `category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_name` VARCHAR(100) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_category_name_key`(`category_name`),
    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE `carts` (
    `cart_id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `carts_customer_id_key`(`customer_id`),
    PRIMARY KEY (`cart_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cart_items` (
    `cart_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `cart_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    INDEX `cart_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `cart_items_cart_id_product_id_key`(`cart_id`, `product_id`),
    PRIMARY KEY (`cart_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_staff_id_fkey` FOREIGN KEY (`staff_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_details` ADD CONSTRAINT `order_details_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`order_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_details` ADD CONSTRAINT `order_details_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `carts` ADD CONSTRAINT `carts_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`cart_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE CASCADE ON UPDATE CASCADE;
