
## 1. Yêu cầu môi trường

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 22+ (máy dev đang dùng 24.20.0) | project dùng ESM (`"type": "module"`); `package.json` không khai báo `engines` nên đây là mức đã chạy thực tế |
| npm | 10+ (đang dùng 11.19.0) | |
| PostgreSQL | 16+ (dev/deploy đang dùng 17) | Windows: service `postgresql-x64-17` phải đang chạy |

Kiểm tra nhanh:

```bash
node --version
npm --version
psql --version
```

Trên Windows nếu `psql` chưa có trong PATH, đường dẫn thường là:
`C:\Program Files\PostgreSQL\17\bin\psql.exe`

> Project dùng **PostgreSQL**, không phải MySQL. Lý do: bản deploy chạy trên Render
> free tier mà Render không có MySQL managed (xem mục 10). Prisma chỉ cho một
> `provider` duy nhất nên local và server dùng cùng một loại database.
>
> Không muốn cài Postgres lên máy? Dùng Docker — xem **mục 9**, chỉ cần Docker.

---

## 2. Cài đặt (5 bước)

> Muốn chạy trên server bằng Docker thay vì cài tay Node + Postgres? Bỏ qua mục này,
> xem thẳng **mục 9 — Chạy bằng Docker**. Muốn deploy lên Render free tier để
> người khác gọi API qua Internet? Xem **mục 10**.

### Bước 1 — Clone và cài package

```bash
git clone <url-repo>
cd ecommerce-webapp
npm install
```

### Bước 2 — Tạo database

Khác MySQL, Postgres **không** có `CREATE DATABASE IF NOT EXISTS`, nên phải tạo
database rỗng trước rồi mới nạp script:

```bash
# 1. Tạo database rỗng tên `opl`
createdb -U postgres opl
#    hoặc: psql -U postgres -c "CREATE DATABASE opl;"

# 2. Nạp toàn bộ cấu trúc + admin
psql -U postgres -d opl -f prisma/database-setup.sql
```

Script `prisma/database-setup.sql` tạo 10 kiểu enum, 11 bảng, khoá ngoại, index,
đánh dấu migration của Prisma, và seed 1 tài khoản admin.

**Không có `psql` trong PATH?** Làm xong bước 3 (`.env`) rồi dùng Prisma để nạp,
không cần client Postgres:

```bash
npm run db:setup
```

**pgAdmin / DBeaver:** tạo database `opl`, mở file `prisma/database-setup.sql`,
Execute toàn bộ script.

Chạy xong script in ra danh sách 12 bảng (11 bảng + `_prisma_migrations`) và dòng
tài khoản admin. Nếu thấy vậy là thành công.

> ⚠️ Script **xoá sạch** bảng cũ trong database `opl` rồi tạo lại. Chỉ chạy khi
> bạn muốn làm mới database.

> Muốn dùng tên database khác `opl`? Chỉ cần tạo database tên khác và sửa
> `DATABASE_URL` ở bước 3 cho khớp — script SQL không chứa tên database (chỉ câu
> `SELECT` kiểm tra ở cuối lọc theo schema `public`).

### Bước 3 — Tạo file `.env`

Copy `.env.example` thành `.env` rồi điền mật khẩu Postgres của bạn:

```bash
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

```ini
DATABASE_URL="postgresql://postgres:MAT_KHAU_CUA_BAN@localhost:5432/opl"
JWT_SECRET="doi_thanh_chuoi_random_dai"
PORT=3000
```

Hai biến tuỳ chọn cho trang tài liệu API (xem mục 5), bỏ trống cũng được:

```ini
SWAGGER_PATH=docs        # đường dẫn trang tài liệu, mặc định "docs"
SWAGGER_ENABLED=true     # đặt "false" để tắt trang tài liệu (nên tắt ở production)
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

Mở **http://localhost:3000/docs** để xem trang tài liệu API (Swagger UI) — xem mục 5.

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
Mật khẩu tối thiểu 6 ký tự. Muốn thêm admin thứ hai thì chạy SQL thủ công trong
Postgres hoặc dùng `PATCH /users/:id/role`.

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
| `npm run db:setup` | Nạp `prisma/database-setup.sql` qua Prisma (xoá bảng cũ, tạo lại + admin) |
| `npm run db:seed:admin` | Chỉ seed lại tài khoản admin (không xoá gì) |
| `npm run test:api` | Chạy bộ test API Postman |
| `npm run test:api:report` | Chạy test API + xuất report ra `postman/reports/` |

Bộ test API nằm ở `postman/collections/opl ecommerce api/`. Cần cài Postman CLI và
đăng nhập (`postman login`) trước khi chạy `test:api`.

---

## 5. Tài liệu API cho frontend (Swagger UI)

Chạy server rồi mở **http://localhost:3000/docs**. Trang này liệt kê toàn bộ **65
endpoint**, kèm schema request/response, ví dụ dữ liệu, mã lỗi, và **gọi thử API
được ngay trên trình duyệt** — không cần Postman.

| Đường dẫn | Dùng để làm gì |
|---|---|
| `/docs` | Trang Swagger UI (giao diện đọc + gọi thử API) |
| `/docs-json` | File OpenAPI 3 dạng JSON — dùng để sinh code client |
| `/docs-yaml` | File OpenAPI 3 dạng YAML |

> Đổi `/docs` thành đường dẫn khác bằng biến `SWAGGER_PATH`, tắt hẳn bằng
> `SWAGGER_ENABLED=false` (xem bước 3 mục 2).

### Cách gọi thử API có đăng nhập

Trên Swagger UI, endpoint nào có **ổ khóa 🔒** là cần token. 56/65 endpoint cần token,
9 endpoint còn lại gọi được luôn.

1. Mở nhóm **Auth**, chọn `POST /auth/login` → **Try it out**.
2. Sửa body thành tài khoản của bạn (mặc định có sẵn `admin@test.com` / `admin123`)
   rồi bấm **Execute**.
3. Copy giá trị `accessToken` trong phần Response body.
4. Bấm nút **Authorize** ở góc trên bên phải trang → dán token vào → **Authorize** →
   **Close**. *Chỉ dán token, không ghi thêm chữ `Bearer`.*
5. Từ giờ mọi request đều tự gửi kèm `Authorization: Bearer <token>`.

Token được nhớ cả khi F5 lại trang (`persistAuthorization`), nên không phải
Authorize lại mỗi lần. Token hết hạn sau 1 ngày → login lại rồi Authorize lại.

> Nhớ mục 3: role `ADMIN` **không** phải superuser. Token admin sẽ nhận `403` ở các
> endpoint của `PRODUCT_STAFF` / `INVENTORY_STAFF`. Muốn thử hết thì tạo nhân viên
> qua `POST /users` rồi login bằng tài khoản đó để lấy token tương ứng.

### Mẹo dùng trang tài liệu

- **Ô Search** ở đầu trang: lọc nhanh theo tag, ví dụ gõ `Cart`.
- Các nhóm mặc định được **thu gọn**, bấm vào tên nhóm để mở.
- Mỗi endpoint có mục **Schema** cạnh **Example Value** — xem đầy đủ kiểu dữ liệu,
  field bắt buộc, giá trị enum, min/max.
- Tiêu đề endpoint có tiền tố `[Customer]` / `[Staff]` / `[Admin]` để biết role nào gọi.
- Trang hiển thị cả **thời gian phản hồi** của mỗi request đã gọi thử.
- Upload ảnh sản phẩm (`POST /products/{id}/image`): Swagger UI hiện sẵn nút **Choose
  File**, chọn ảnh rồi Execute. Response trả về `imageUrl`, frontend ghép thành
  `http://localhost:3000<imageUrl>` để hiển thị.

### Sinh code client từ spec

File `/docs-json` là OpenAPI 3 chuẩn, dùng được với mọi generator:

```bash
# Lưu spec ra file
curl http://localhost:3000/docs-json -o openapi.json

# Ví dụ: sinh client TypeScript + Axios
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json -g typescript-axios -o ./src/api-client
```

Hoặc import thẳng URL `http://localhost:3000/docs-json` vào Postman / Insomnia /
Hoppscotch để có sẵn toàn bộ request.

### Thêm tài liệu cho endpoint mới

Khi viết endpoint mới, thêm các decorator sau để nó hiện đẹp trên `/docs`:

```ts
@ApiTags(ApiTag.Products)                  // nhóm endpoint, hằng số ở src/swagger.ts
export class ProductsController {

  @ApiOperation({ summary: 'Mô tả ngắn 1 dòng' })
  @ApiQuery({ name: 'search', required: false, example: 'iphone' })
  @ApiAuth('PRODUCT_STAFF')                // gắn ổ khóa 🔒 + khai báo lỗi 401/403
  @Get()
  findAll() { /* ... */ }
}
```

Trong DTO thì dùng `@ApiProperty` / `@ApiPropertyOptional` để có ví dụ dữ liệu:

```ts
export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro 256GB', maxLength: 255 })
  @IsNotEmpty()
  productName: string;
}
```

Các file liên quan:

| File | Nội dung |
|---|---|
| `src/swagger.ts` | Cấu hình `DocumentBuilder`, danh sách tag, phần mô tả đầu trang |
| `src/common/decorators/api-auth.decorator.ts` | `@ApiAuth(...roles)` — gộp `@ApiBearerAuth` + lỗi 401/403 |
| `src/main.ts` | Gọi `setupSwagger(app)` khi bootstrap |

> Lưu ý: DTO kế thừa phải dùng `PartialType` của **`@nestjs/swagger`** (không phải
> `@nestjs/mapped-types`), nếu không các field sẽ biến mất khỏi tài liệu.

---

## 6. Danh sách API

Bảng dưới để tra nhanh. Chi tiết request/response thì xem `/docs` ở mục 5.

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

## 7. Cấu trúc project

```
ecommerce-webapp/
├── prisma/
│   ├── schema.prisma            # Định nghĩa 11 model
│   ├── database-setup.sql       # Script tạo lại DB cho người mới clone
│   ├── seed-admin.sql           # Chỉ seed admin (DB đã có sẵn bảng)
│   └── migrations/              # Migration history của Prisma
├── src/
│   ├── main.ts                  # Bootstrap, ValidationPipe, CORS, static /uploads, Swagger
│   ├── swagger.ts               # Cấu hình trang tài liệu API /docs
│   ├── app.module.ts
│   ├── prisma/                  # PrismaService (driver adapter Postgres)
│   ├── auth/                    # Đăng ký, đăng nhập, JWT strategy
│   ├── common/                  # JwtAuthGuard, RolesGuard, decorators (@ApiAuth)
│   ├── users/ categories/ products/ inventory/
│   ├── cart/ orders/ reviews/ vouchers/
│   └── settings/ reports/
├── postman/collections/         # Bộ test API
├── uploads/                     # Ảnh sản phẩm (không commit)
├── Dockerfile                   # Build image (multi-stage: build → runtime)
├── docker-compose.yml           # 2 service: app + postgres (xem mục 9)
├── render.yaml                  # Blueprint deploy Render free tier (xem mục 10)
├── .dockerignore
├── .env.example                 # Mẫu biến môi trường khi chạy bằng npm
└── .env.docker.example          # Mẫu biến môi trường khi chạy bằng Docker
```

---

## 8. Sửa lỗi thường gặp

**`Cannot find module './generated/prisma/client.js'`**
Chưa chạy `npx prisma generate` (bước 4).

**`password authentication failed for user "postgres"`**
Sai mật khẩu trong `DATABASE_URL` ở `.env`.

**`database "opl" does not exist`**
Chưa tạo database (bước 2 — Postgres không tự tạo như MySQL), hoặc tên database
trong `DATABASE_URL` khác tên đã `createdb`.

**`relation "users" does not exist`**
Database đã có nhưng chưa nạp cấu trúc. Chạy `npm run db:setup`.

**`ECONNREFUSED 127.0.0.1:5432`**
Postgres chưa chạy. Windows: mở `services.msc`, start service `postgresql-x64-17`.
Hoặc:

```powershell
net start postgresql-x64-17
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

**`/docs` trả về 404**
Biến `SWAGGER_ENABLED` đang là `false` trong `.env`, hoặc `SWAGGER_PATH` đã được đổi
sang đường dẫn khác. Khi server start, log in ra đúng URL của trang tài liệu.

**Gọi thử trên `/docs` bị `401` dù đã Authorize**
Token hết hạn (hạn 1 ngày) → login lại, bấm **Authorize** → **Logout** → dán token mới.

---

## 9. Chạy bằng Docker

Cách này **không cần cài Node hay Postgres** trên server — chỉ cần Docker Engine 20.10+
và Docker Compose v2. `docker-compose.yml` dựng 2 container:

| Service | Image | Vai trò |
|---|---|---|
| `app` | build từ `Dockerfile` | NestJS API, cổng 3000 trong container |
| `db` | `postgres:17-alpine` | PostgreSQL, chỉ nghe trong network nội bộ của compose |

### Bước 1 — Tạo file `.env.docker`

```bash
cp .env.docker.example .env.docker     # PowerShell: Copy-Item .env.docker.example .env.docker
```

Sửa tối thiểu 2 biến trong file đó:

```ini
POSTGRES_PASSWORD=mat_khau_manh_cua_ban
JWT_SECRET=chuoi_random_that_dai
```

> File này **khác** `.env` dùng cho `npm run start:dev`. Trong Docker, `DATABASE_URL`
> do compose tự ghép (`postgresql://postgres:...@db:5432/opl`) — host là tên service
> `db`, không phải `localhost`, nên không đặt `DATABASE_URL` trong `.env.docker`.

> Dùng bản MySQL cũ của project rồi? Volume `mysql_data` không tương thích. Xoá một
> lần trước khi chạy bản Postgres: `docker compose --env-file .env.docker down -v`
> (mất dữ liệu cũ).

### Bước 2 — Build và chạy

```bash
docker compose --env-file .env.docker up -d --build
```

Lần đầu mất vài phút: build image (cài package, `npx prisma generate`, `nest build`)
rồi Postgres tự tạo database `opl` (biến `POSTGRES_DB`) và chạy
`prisma/database-setup.sql` để tạo 11 bảng + tài khoản admin — **không cần chạy tay
script SQL hay `prisma migrate`**.

⚠️ Luôn thêm `--env-file .env.docker`. Thiếu nó, compose đọc nhầm `.env` của máy dev
và dừng với lỗi báo thiếu biến.

### Bước 3 — Kiểm tra

```bash
docker compose --env-file .env.docker ps          # cả 2 service phải running/healthy
docker compose --env-file .env.docker logs -f app # chờ dòng "Server đang chạy tại ..."
curl http://localhost:3000
```

> `--env-file .env.docker` cần cho **mọi** lệnh compose (`ps`, `logs`, `exec`, `down`...),
> không riêng `up` — compose nội suy biến mỗi lần đọc file cấu hình. Muốn gõ ngắn hơn,
> đặt biến môi trường một lần cho cả phiên terminal rồi bỏ cờ đi:
>
> ```bash
> export COMPOSE_ENV_FILES=.env.docker     # PowerShell: $env:COMPOSE_ENV_FILES=".env.docker"
> docker compose ps
> ```

Đăng nhập bằng tài khoản admin ở mục 3 (`admin@test.com` / `admin123`) —
**đổi mật khẩu ngay sau lần đăng nhập đầu tiên trên server thật.**

### Các lệnh hay dùng

Các lệnh dưới đây giả định đã `export COMPOSE_ENV_FILES=.env.docker`; nếu không, thêm
`--env-file .env.docker` ngay sau `docker compose`.

```bash
# Xem log
docker compose logs -f app

# Deploy code mới (build lại image, giữ nguyên dữ liệu)
git pull
docker compose up -d --build

# Dừng (giữ dữ liệu)
docker compose down

# Dừng và XOÁ SẠCH database + ảnh upload
docker compose down -v

# Vào shell psql trong container (không cần nhập mật khẩu, kết nối local trong container)
docker compose exec db psql -U postgres -d opl

# Backup / restore database
docker compose exec -T db pg_dump -U postgres opl > backup.sql
docker compose exec -T db psql -U postgres -d opl < backup.sql
```

### Dữ liệu được giữ ở đâu

Hai Docker volume, không mất khi `docker compose down` hay deploy lại:

| Volume | Nội dung |
|---|---|
| `pgdata` | Toàn bộ database |
| `uploads_data` | Ảnh sản phẩm (`/app/uploads`) |

Chỉ `docker compose down -v` mới xoá chúng.

### Lưu ý khi lên production

- **Swagger**: `.env.docker.example` đặt sẵn `SWAGGER_ENABLED=false`. Muốn bật để test
  thì đổi thành `true` rồi `up -d` lại.
- **Cổng Postgres**: mặc định không mở ra ngoài. Cần nối pgAdmin/DBeaver từ máy bạn
  thì bỏ comment phần `ports` của service `db` trong `docker-compose.yml` — chỉ nên
  làm tạm thời.
- **HTTPS**: app chạy HTTP trần. Trên server thật nên đặt Nginx/Caddy reverse proxy
  phía trước và chỉ mở 80/443 ra internet.
- **Đổi `POSTGRES_PASSWORD`** sau khi volume `pgdata` đã tạo thì **không** đổi được
  mật khẩu thật của Postgres — phải `ALTER USER postgres PASSWORD '...'` trong psql
  hoặc xoá volume làm lại từ đầu.

### Sửa lỗi Docker

**`app` restart liên tục, log báo `ECONNREFUSED` hoặc `password authentication failed`**
`POSTGRES_PASSWORD` trong `.env.docker` khác mật khẩu đã lưu trong volume `pgdata`
(đặt ở lần chạy đầu). Dùng lại mật khẩu cũ, hoặc `docker compose down -v` để làm lại
từ đầu (mất dữ liệu).

**`relation "users" does not exist`**
Volume `pgdata` đã tồn tại từ trước nên Postgres **không** chạy lại
`database-setup.sql` (script trong `docker-entrypoint-initdb.d` chỉ chạy khi volume
còn rỗng). Nạp tay:

```bash
docker compose exec -T db psql -U postgres -d opl < prisma/database-setup.sql
```

**Compose báo thiếu `POSTGRES_PASSWORD` / `JWT_SECRET`**
Quên `--env-file .env.docker`, hoặc chưa copy file từ `.env.docker.example`.

**Build lỗi `Cannot find module './generated/prisma/client.js'`**
Bước `npx prisma generate` trong `Dockerfile` bị bỏ qua — kiểm tra `.dockerignore`
không loại nhầm `prisma/schema.prisma`.

**Đổi code rồi mà container vẫn chạy code cũ**
Thiếu `--build`: `docker compose --env-file .env.docker up -d --build`.

**Tiếng Việt trong database bị hỏng (`Quáº£n Trá»‹ ViÃªn`)**
Postgres mặc định dùng encoding UTF8 nên lỗi này hiếm khi đến từ server; thường là
client (`cmd`/Git Bash) gửi hoặc hiển thị sai. Kiểm tra nhanh — phải ra đúng 13:

```bash
docker compose exec -T db psql -U postgres -d opl \
  -c "SELECT char_length(full_name) FROM users WHERE user_id=1;"
```

---


## 10. Deploy lên Render (free tier)

Dùng khi frontend/tester cần gọi API qua Internet mà **không muốn clone project** và
cũng không cần máy bạn phải bật. Render giữ một URL HTTPS **cố định** dạng
`https://opl-api.onrender.com`.

### Free tier hoạt động thế nào

| | |
|---|---|
| **Ngủ sau 15 phút** không có request | Request kế tiếp tự đánh thức, mất **~1 phút**. Đây là hành vi đã chọn: không chạy 24/7, tự dậy khi cần |
| **Ảnh upload sẽ mất** | Free tier không có persistent disk. `POST /products/{id}/image` vẫn chạy, nhưng sau khi service ngủ hoặc deploy lại thì `/uploads/...` trả 404 |
| **Database free hết hạn sau 30 ngày** | Có 14 ngày gia hạn để nâng cấp, sau đó Render xoá. Dung lượng 1 GB, mỗi workspace chỉ 1 database free |
| **750 giờ instance/tháng** | Tính chung cho cả workspace |

### Bước 1 — Đẩy code lên GitHub

Render deploy từ Git, nên mọi file cấu hình phải được commit:

```bash
git add -A
git commit -m "Deploy Render: chuyen sang PostgreSQL"
git push
```

### Bước 2 — Tạo Blueprint trên Render

File `render.yaml` ở gốc repo đã khai báo sẵn web service + database, không phải
điền tay gì trên giao diện.

1. Vào [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Kết nối GitHub, chọn repo này → **Connect**.
3. Render đọc `render.yaml` và hiện 2 resource sắp tạo: `opl-api` (web) và `opl-db`
   (Postgres) → **Apply**.

Build lần đầu mất ~5–10 phút (Docker build: `npm ci`, `prisma generate`, `nest build`).
Xem tiến trình ở tab **Logs** của service `opl-api`.

`DATABASE_URL` và `JWT_SECRET` do Render tự điền (`fromDatabase` và `generateValue`
trong `render.yaml`) — **không** commit connection string hay secret vào repo.

### Bước 3 — Nạp cấu trúc database

Database mới tạo là **rỗng**, chưa có bảng. Render free không chạy được pre-deploy
command, nên nạp một lần từ máy bạn qua **External Database URL**:

1. Dashboard → database `opl-db` → **Connect** → copy **External Database URL**.
2. Chạy từ thư mục `ecommerce-webapp` (nhớ thêm `?sslmode=require` vào cuối URL):

```powershell
# PowerShell
$env:DATABASE_URL="postgresql://opl:...@dpg-xxxx.singapore-postgres.render.com/opl?sslmode=require"
npm run db:setup
```

```bash
# Git Bash / Linux / macOS
DATABASE_URL="postgresql://opl:...@dpg-xxxx.singapore-postgres.render.com/opl?sslmode=require" npm run db:setup
```

Lệnh này tạo 11 bảng, index, khoá ngoại và tài khoản admin — giống hệt lúc cài local.

> `?sslmode=require` là bắt buộc khi kết nối từ ngoài vào Render. Thiếu nó sẽ lỗi
> `SSL connection is required`. Bên trong Render thì app dùng Internal URL, không cần SSL.

### Bước 4 — Kiểm tra

```bash
curl https://opl-api.onrender.com            # -> Hello World!
curl -X POST https://opl-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@test.com\",\"password\":\"admin123\"}"
```

Trang tài liệu: **https://opl-api.onrender.com/docs** (`SWAGGER_ENABLED=true` đã đặt
sẵn trong `render.yaml`). Swagger UI tự lấy origin của trang nên không cần `PUBLIC_URL`.

Gửi teammate đúng URL đó — khác Cloudflare quick tunnel, URL này **không đổi** và
không phụ thuộc máy bạn có bật hay không.

### Chạy bộ test Postman trên bản Render

Collection mặc định trỏ `baseUrl` về `http://localhost:3000`, ghi đè lúc chạy chứ
không cần sửa file:

```bash
curl https://opl-api.onrender.com            # đánh thức service trước
npm run test:api -- --env-var baseUrl=https://opl-api.onrender.com
```

> Bộ test tạo dữ liệu thật (user, sản phẩm, đơn hàng) vào database Render. Chạy nhiều
> lần sẽ đầy 1 GB quota và một số request kiểm tra trùng email/SKU có thể lệch kết
> quả. Nên chạy bộ test đầy đủ ở local, trên Render chỉ chạy smoke.

### Deploy code mới

`autoDeployTrigger: commit` nên chỉ cần:

```bash
git push
```

Render tự build lại và deploy. Muốn deploy tay: dashboard → **Manual Deploy**.

### Việc phải làm định kỳ

- **Sau 30 ngày**, database free hết hạn. Tạo database free mới (hoặc `Apply` lại
  blueprint), cập nhật `DATABASE_URL` của service nếu Render không tự nối, rồi chạy
  lại bước 3. Dữ liệu cũ **không** tự chuyển sang.
- **Muốn giữ dữ liệu trước khi hết hạn**: `pg_dump "<External URL>" > backup.sql`.

### Bảo mật khi mở ra Internet

- **Đổi mật khẩu admin ngay**: `admin@test.com` / `admin123` là tài khoản seed ai
  cũng biết, và URL `.onrender.com` thì public. Dùng `PATCH /users/:id` hoặc đổi hash
  trong `prisma/seed-admin.sql` trước khi nạp.
- **`ipAllowList` trong `render.yaml` đang mở `0.0.0.0/0`** để chạy được bước 3 từ máy
  bạn. Xong rồi nên siết lại thành IP của bạn (`https://ifconfig.me` → `1.2.3.4/32`)
  rồi commit + Apply lại blueprint.
- **Đừng dùng cho dữ liệu thật** — đây là môi trường demo/test.

### Sửa lỗi Render

**Deploy fail: `Port scan timeout reached, no open ports detected`**
App không bind `0.0.0.0`. `src/main.ts` đã gọi `app.listen(port, '0.0.0.0')` — nếu
sửa dòng đó thì phải giữ tham số host.

**Request đầu tiên timeout / Postman báo `ETIMEDOUT`**
Service đang ngủ, cần ~1 phút để dậy. Gọi `GET /` một lần cho nó thức rồi mới chạy bộ
test; trong Postman tăng **Settings → Request timeout** lên 90000 ms.

**App log `relation "users" does not exist`**
Chưa chạy bước 3, hoặc đã tạo database mới sau khi database cũ hết hạn.

**App log `SSL connection is required` khi chạy `npm run db:setup`**
Thiếu `?sslmode=require` ở cuối External Database URL.

**502 Bad Gateway ngay sau khi deploy**
Container còn đang khởi động. Đợi tới khi log in ra `Server đang chạy tại ...`.

**Build vượt quota build minutes**
Mỗi `git push` là một lần build Docker. Gộp commit trước khi push nếu đang gần hết quota.

---

## 11. Chia sẻ nhanh từ máy local (Cloudflare Tunnel)

Cách cũ, vẫn dùng được khi muốn teammate gọi thẳng vào Docker trên máy bạn (ví dụ
đang sửa code và muốn họ test ngay, không chờ build trên Render).

### Cài một lần

```powershell
winget install --id Cloudflare.cloudflared
```

### Mỗi lần muốn chia sẻ

```bash
npm run share
```

Script `scripts/share-api.ps1` bật stack Docker, chờ API trả lời, mở tunnel rồi in URL
và copy vào clipboard:

```
  API    https://abc-def-ghi.trycloudflare.com
  Docs   https://abc-def-ghi.trycloudflare.com/docs
```

`Ctrl+C` để đóng tunnel — container Docker vẫn chạy tiếp.

> Script chạy `up -d` **không** kèm `--build` cho nhanh. Vừa sửa code thì build lại
> trước, nếu không tunnel sẽ phục vụ code cũ:
> `docker compose --env-file .env.docker up -d --build`

### Khác biệt so với Render

| | Cloudflare quick tunnel | Render free |
|---|---|---|
| URL | Random, đổi mỗi lần chạy lại | Cố định `opl-api.onrender.com` |
| Máy bạn tắt | API chết theo | API vẫn sống (ngủ rồi tự dậy) |
| Độ trễ lần đầu | Không | ~1 phút nếu service đang ngủ |
| Ảnh upload | Giữ trong volume Docker | Mất khi ngủ/deploy lại |
| Dữ liệu | Postgres trong Docker trên máy bạn | Postgres free, hết hạn 30 ngày |

Cần API sống 24/7 và giữ được ảnh upload thì thuê **VPS ~$5/tháng** rồi chạy nguyên
`docker-compose.yml` này.
