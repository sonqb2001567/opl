-- =====================================================================
-- 1. Xác thực email bằng mã OTP + quên mật khẩu
-- =====================================================================
CREATE TYPE "VerificationCodeType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Tài khoản tạo trước khi có tính năng này coi như đã xác thực,
-- nếu không thì tất cả người dùng cũ sẽ không đăng nhập được nữa.
UPDATE "users" SET "email_verified_at" = now();

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

CREATE INDEX "verification_codes_user_id_type_created_at_idx" ON "verification_codes"("user_id", "type", "created_at");

ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- 2. Category - Product: đổi từ 1-N sang N-N
-- =====================================================================
CREATE TABLE "product_categories" (
    "product_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id", "category_id")
);

CREATE INDEX "product_categories_category_id_idx" ON "product_categories"("category_id");

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Chuyển dữ liệu cũ: mỗi sản phẩm đang có đúng 1 danh mục
INSERT INTO "product_categories" ("product_id", "category_id")
SELECT "product_id", "category_id" FROM "products";

-- Bỏ cột khoá ngoại 1-N cũ
DROP INDEX IF EXISTS "products_category_id_idx";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_category_id_fkey";
ALTER TABLE "products" DROP COLUMN "category_id";

-- =====================================================================
-- 3. Order - OrderDetail: đổi từ 1-N sang 1-1
-- =====================================================================
-- CẢNH BÁO: đơn hàng cũ có nhiều dòng chi tiết không còn hợp lệ với quan hệ
-- 1-1. Chỉ giữ lại dòng đầu tiên của mỗi đơn, các dòng còn lại bị xoá.
DELETE FROM "order_details"
WHERE "order_detail_id" NOT IN (
  SELECT MIN("order_detail_id") FROM "order_details" GROUP BY "order_id"
);

DROP INDEX IF EXISTS "order_details_order_id_product_id_key";
CREATE UNIQUE INDEX "order_details_order_id_key" ON "order_details"("order_id");
