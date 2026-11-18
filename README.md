
## 1. Yêu cầu môi trường

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 22+ (máy dev đang dùng 24.20.0) | project dùng ESM (`"type": "module"`); `package.json` không khai báo `engines` nên đây là mức đã chạy thực tế |
| npm | 10+ (đang dùng 11.19.0) | |
| MySQL | 8.0+ | Windows: service `MYSQL80` phải đang chạy |

Kiểm tra nhanh:

```bash
node --version
npm --version
mysql --version
```

Trên Windows nếu `mysql` chưa có trong PATH, đường dẫn thường là:
`C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`

---

## 2. Cài đặt (5 bước)

### Bước 1 — Clone và cài package

```bash
git clone <url-repo>
cd ecommerce-webapp
npm install
```

### Bước 2 — Tạo database

Chạy script `prisma/database-setup.sql`. Script này tạo database `opl`, toàn bộ
11 bảng, khoá ngoại, index, đánh dấu migration của Prisma, và seed 1 tài khoản admin.

**Cách A — dòng lệnh** (từ thư mục `ecommerce-webapp`):

```bash
mysql -u root -p < prisma/database-setup.sql
```

**Cách B — MySQL Workbench / DBeaver:** mở file `prisma/database-setup.sql`, bấm
Execute toàn bộ script.

Chạy xong script in ra danh sách 12 bảng (11 bảng + `_prisma_migrations`) và dòng
tài khoản admin. Nếu thấy vậy là thành công.

> ⚠️ Script **xoá sạch** dữ liệu cũ trong database `opl` rồi tạo lại. Chỉ chạy khi
> bạn muốn làm mới database.

> Muốn dùng tên database khác `opl`? Sửa `opl` ở 3 chỗ trong file SQL
> (`CREATE DATABASE`, `USE`, câu `SELECT` cuối file) và sửa `DATABASE_URL` ở bước 3
> cho khớp.

### Bước 3 — Tạo file `.env`

Copy `.env.example` thành `.env` rồi điền mật khẩu MySQL của bạn:

```bash
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

```ini
DATABASE_URL="mysql://root:MAT_KHAU_CUA_BAN@localhost:3306/opl"
JWT_SECRET="doi_thanh_chuoi_random_dai"
PORT=3000
```

`.env` nằm trong `.gitignore` — mỗi người tự tạo file này trên máy mình, không commit.

### Bước 4 — Sinh Prisma Client

```bash
npx prisma generate
```

Lệnh này sinh code vào `src/generated/prisma/`. Thư mục đó **không được commit**
(trong `.gitignore`), nên bước này là bắt buộc sau khi clone, nếu không server sẽ
báo lỗi thiếu module.

### Bước 5 — Chạy server

```bash
npm run start:dev
```

Server chạy tại **http://localhost:3000**. Kiểm tra:

```bash
curl http://localhost:3000
```

---

## 3. Đăng nhập lần đầu

Script SQL đã tạo sẵn tài khoản quản trị:

| Email | Mật khẩu | Role |
|---|---|---|
| `admin@test.com` | `admin123` | `ADMIN` |

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@test.com\",\"password\":\"admin123\"}"
```

Trả về:

```json
{
  "accessToken": "eyJhbGciOi...",
  "user": { "id": 1, "fullName": "Quản Trị Viên", "email": "admin@test.com", "role": "ADMIN" }
}
```

Các API cần đăng nhập thì gửi kèm header:

```
Authorization: Bearer <accessToken>
```

### ⚠️ Lưu ý quan trọng về phân quyền

**`ADMIN` KHÔNG phải superuser.** `RolesGuard` (`src/common/guards/roles.guard.ts:24`)
so sánh role chính xác, không có cơ chế cho ADMIN đi qua mọi route. Nghĩa là tài
khoản admin **không** tạo được sản phẩm hay nhập kho — sẽ nhận `403 Forbidden`.

Muốn test đầy đủ, dùng token admin tạo thêm nhân viên qua `POST /users`:

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token-admin>" \
  -d "{\"fullName\":\"NV San Pham\",\"email\":\"ps@test.com\",\"password\":\"123456\",\"role\":\"PRODUCT_STAFF\"}"
```

Tạo tương tự với `"role":"INVENTORY_STAFF"`. Khách hàng thì tự đăng ký qua
`POST /auth/register` (luôn được gán role `CUSTOMER`).

`POST /users` chỉ tạo được nhân viên — `CreateStaffDto` giới hạn `role` trong
`PRODUCT_STAFF` / `INVENTORY_STAFF`, không tạo được `ADMIN` hay `CUSTOMER`.
Mật khẩu tối thiểu 6 ký tự. Muốn thêm admin thứ hai thì chạy thủ công trong MySQL
hoặc dùng `PATCH /users/:id/role`.

---

## 4. Các lệnh npm

| Lệnh | Tác dụng |
|---|---|
| `npm run start:dev` | Chạy dev, tự reload khi sửa code |
| `npm run start` | Chạy thường |
| `npm run build` | Build ra `dist/` |
| `npm run start:prod` | Chạy bản đã build |
| `npm run lint` | Lint bằng oxlint |
| `npm run format` | Format bằng prettier |
| `npm test` | Unit test (vitest) |
| `npm run test:e2e` | Test e2e |
| `npm run test:api` | Chạy bộ test API Postman |
| `npm run test:api:report` | Chạy test API + xuất report ra `postman/reports/` |

Bộ test API nằm ở `postman/collections/opl ecommerce api/`. Cần cài Postman CLI và
đăng nhập (`postman login`) trước khi chạy `test:api`.

---

## 5. Danh sách API

Không có global prefix — route nằm ngay ở gốc. "Công khai" = không cần token.

### Xác thực — `/auth`

| Method | Route | Quyền |
|---|---|---|
| POST | `/auth/register` | Công khai |
| POST | `/auth/login` | Công khai |
| POST | `/auth/change-password` | Đã đăng nhập |
| GET | `/auth/me` | Đã đăng nhập |
| PATCH | `/auth/me` | Đã đăng nhập |

### Người dùng — `/users` (toàn bộ: `ADMIN`)

| Method | Route |
|---|---|
| POST | `/users` |
| GET | `/users` |
| GET | `/users/:id` |
| PATCH | `/users/:id` |
| PATCH | `/users/:id/lock` |
| PATCH | `/users/:id/unlock` |
| PATCH | `/users/:id/role` |

### Danh mục — `/categories`

| Method | Route | Quyền |
|---|---|---|
| GET | `/categories` | Công khai |
| GET | `/categories/:id` | Công khai |
| POST | `/categories` | `PRODUCT_STAFF` |
| PATCH | `/categories/:id` | `PRODUCT_STAFF` |
| PATCH | `/categories/:id/deactivate` | `PRODUCT_STAFF` |
| DELETE | `/categories/:id` | `PRODUCT_STAFF` |

### Sản phẩm — `/products`

| Method | Route | Quyền |
|---|---|---|
| GET | `/products` | Công khai |
| GET | `/products/:id` | Công khai |
| POST | `/products` | `PRODUCT_STAFF` |
| PATCH | `/products/:id` | `PRODUCT_STAFF` |
| PATCH | `/products/:id/discontinue` | `PRODUCT_STAFF` |
| PATCH | `/products/:id/resume` | `PRODUCT_STAFF` |
| DELETE | `/products/:id` | `PRODUCT_STAFF` |
| POST | `/products/:id/image` | `PRODUCT_STAFF` (upload file) |
| DELETE | `/products/:id/image` | `PRODUCT_STAFF` |

Ảnh upload lưu vào `uploads/` (thư mục tự tạo khi chạy server, không commit) và
truy cập qua `http://localhost:3000/uploads/<tên-file>`.

### Kho — `/inventory`

| Method | Route | Quyền |
|---|---|---|
| GET | `/inventory/stock` | `INVENTORY_STAFF`, `ADMIN` |
| GET | `/inventory/stock/:productId` | `INVENTORY_STAFF`, `ADMIN` |
| GET | `/inventory/history` | `INVENTORY_STAFF`, `ADMIN` |
| POST | `/inventory/import` | `INVENTORY_STAFF` |
| POST | `/inventory/export` | `INVENTORY_STAFF` |
| POST | `/inventory/adjust` | `INVENTORY_STAFF` |

Tồn kho không lưu thành cột riêng — tính từ bảng `inventory_transactions`.

### Giỏ hàng — `/cart` (toàn bộ: `CUSTOMER`)

| Method | Route |
|---|---|
| GET | `/cart` |
| POST | `/cart/items` |
| PATCH | `/cart/items/:itemId` |
| DELETE | `/cart/items/:itemId` |
| DELETE | `/cart` |

### Đơn hàng — `/orders`

| Method | Route | Quyền |
|---|---|---|
| POST | `/orders` | `CUSTOMER` |
| GET | `/orders/my` | `CUSTOMER` |
| GET | `/orders/my/:id` | `CUSTOMER` |
| POST | `/orders/:id/cancel` | `CUSTOMER` |
| POST | `/orders/:id/payment-callback` | `CUSTOMER` |
| GET | `/orders` | `INVENTORY_STAFF`, `ADMIN` |
| GET | `/orders/:id` | `INVENTORY_STAFF`, `ADMIN` |
| PATCH | `/orders/:id/status` | `INVENTORY_STAFF` |
| POST | `/orders/:id/cancel-by-staff` | `INVENTORY_STAFF` |

### Đánh giá — `/reviews`

| Method | Route | Quyền |
|---|---|---|
| GET | `/reviews/product/:productId` | Công khai |
| POST | `/reviews` | `CUSTOMER` |
| PATCH | `/reviews/:id` | `CUSTOMER` |
| GET | `/reviews` | `ADMIN` |
| PATCH | `/reviews/:id/hide` | `ADMIN` |
| PATCH | `/reviews/:id/restore` | `ADMIN` |

### Voucher — `/vouchers`

| Method | Route | Quyền |
|---|---|---|
| GET | `/vouchers/check/:code` | Công khai |
| GET | `/vouchers` | `ADMIN` |
| GET | `/vouchers/:id` | `ADMIN` |
| POST | `/vouchers` | `ADMIN` |
| PATCH | `/vouchers/:id` | `ADMIN` |
| PATCH | `/vouchers/:id/activate` | `ADMIN` |
| PATCH | `/vouchers/:id/deactivate` | `ADMIN` |

### Cấu hình & báo cáo

| Method | Route | Quyền |
|---|---|---|
| GET | `/settings/shipping-fee` | Công khai |
| PUT | `/settings/shipping-fee` | `ADMIN` |
| GET | `/reports/revenue` | `ADMIN` |
| GET | `/reports/orders` | `ADMIN` |
| GET | `/reports/low-stock` | `ADMIN` |

Phí vận chuyển lưu trong bộ nhớ (`src/settings/settings.service.ts`), mặc định
30.000đ và **reset về mặc định mỗi lần restart server**.

---

## 6. Cấu trúc project

```
ecommerce-webapp/
├── prisma/
│   ├── schema.prisma            # Định nghĩa 11 model
│   ├── database-setup.sql       # Script tạo lại DB cho người mới clone
│   ├── seed-admin.sql           # Chỉ seed admin (DB đã có sẵn bảng)
│   └── migrations/              # Migration history của Prisma
├── src/
│   ├── main.ts                  # Bootstrap, ValidationPipe, CORS, static /uploads
│   ├── app.module.ts
│   ├── prisma/                  # PrismaService (driver adapter MariaDB)
│   ├── auth/                    # Đăng ký, đăng nhập, JWT strategy
│   ├── common/                  # JwtAuthGuard, RolesGuard, decorators
│   ├── users/ categories/ products/ inventory/
│   ├── cart/ orders/ reviews/ vouchers/
│   └── settings/ reports/
├── postman/collections/         # Bộ test API
├── uploads/                     # Ảnh sản phẩm (không commit)
└── .env.example                 # Mẫu biến môi trường
```

---

## 7. Sửa lỗi thường gặp

**`Cannot find module './generated/prisma/client.js'`**
Chưa chạy `npx prisma generate` (bước 4).

**`Access denied for user 'root'@'localhost'`**
Sai mật khẩu trong `DATABASE_URL` ở `.env`.

**`Unknown database 'opl'`**
Chưa chạy `prisma/database-setup.sql` (bước 2), hoặc tên database trong `.env`
không khớp tên trong file SQL.

**`ECONNREFUSED 127.0.0.1:3306`**
MySQL chưa chạy. Windows: mở `services.msc`, start service `MYSQL80`. Hoặc:

```powershell
net start MYSQL80
```

**`403 Forbidden` dù đã đăng nhập bằng admin**
Đúng như thiết kế — xem lại mục 3, phần "Lưu ý quan trọng về phân quyền".
Route đó cần `PRODUCT_STAFF` hoặc `INVENTORY_STAFF`, không phải `ADMIN`.

**`401 Unauthorized`**
Thiếu header `Authorization: Bearer <token>`, hoặc token hết hạn (hạn 1 ngày), hoặc
`JWT_SECRET` trên máy bạn khác với lúc token được tạo.

**Prisma báo migration chưa áp dụng / đòi reset database**
Script SQL đã ghi sẵn bản ghi vào `_prisma_migrations`. Nếu vẫn lỗi checksum:

```bash
npx prisma migrate resolve --applied 20261031174921_init
```

**Muốn làm lại database từ đầu**
Chạy lại `prisma/database-setup.sql` — script tự xoá bảng cũ rồi tạo lại.
