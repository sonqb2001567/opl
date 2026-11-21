import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

// Đường dẫn trang tài liệu API, đổi được qua biến môi trường SWAGGER_PATH
export const SWAGGER_PATH = process.env.SWAGGER_PATH ?? 'docs';

// Tên các nhóm API hiển thị trên Swagger UI
export const ApiTag = {
  Auth: 'Auth - Đăng ký / Đăng nhập / Tài khoản',
  Users: 'Users - Quản lý người dùng (Admin)',
  Categories: 'Categories - Danh mục sản phẩm',
  Products: 'Products - Sản phẩm',
  Inventory: 'Inventory - Quản lý kho',
  Cart: 'Cart - Giỏ hàng (Customer)',
  Orders: 'Orders - Đơn hàng',
  Reviews: 'Reviews - Đánh giá sản phẩm',
  Vouchers: 'Vouchers - Mã giảm giá',
  Reports: 'Reports - Báo cáo thống kê (Admin)',
  Settings: 'Settings - Cấu hình hệ thống',
} as const;

const DESCRIPTION = `
API cho website bán hàng OPL. Dùng trang này để tra cứu endpoint, schema request/response
và thử API trực tiếp trước khi gọi từ frontend.

### Cách lấy token để thử API
1. Gọi \`POST /auth/register\` (khách hàng) hoặc dùng tài khoản có sẵn.
2. Gọi \`POST /auth/login\` → copy giá trị \`accessToken\` trong response.
3. Bấm nút **Authorize** ở góc trên bên phải, dán token vào rồi bấm **Authorize**.
4. Mọi request có ổ khóa 🔒 sẽ tự động gửi kèm header \`Authorization: Bearer <token>\`.

Token được ghi nhớ sau khi reload trang, không cần Authorize lại.

### Phân quyền
| Role | Phạm vi |
| --- | --- |
| \`CUSTOMER\` | Giỏ hàng, đặt hàng, đánh giá sản phẩm đã mua |
| \`PRODUCT_STAFF\` | Danh mục, sản phẩm, ảnh sản phẩm |
| \`INVENTORY_STAFF\` | Nhập / xuất / điều chỉnh kho, xử lý đơn hàng |
| \`ADMIN\` | Người dùng, mã giảm giá, kiểm duyệt đánh giá, báo cáo, cấu hình |

Endpoint không có ổ khóa là API công khai, gọi được mà không cần token.

### Lỗi thường gặp
| Mã | Ý nghĩa |
| --- | --- |
| \`400\` | Dữ liệu gửi lên không hợp lệ (xem \`message\` để biết field nào sai) |
| \`401\` | Thiếu token hoặc token hết hạn |
| \`403\` | Token hợp lệ nhưng role không có quyền gọi endpoint này |
| \`404\` | Không tìm thấy bản ghi |
| \`409\` | Trùng dữ liệu (email, SKU, mã giảm giá...) |

Ảnh sản phẩm được phục vụ tĩnh tại \`/uploads/<tên-file>\`.
`;

export function setupSwagger(app: INestApplication): void {
  const builder = new DocumentBuilder()
    .setTitle('OPL Ecommerce API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0');

  // Không khai báo server nào thì Swagger UI gọi API theo đúng origin của trang
  // đang mở, nên chạy ở localhost hay qua Cloudflare Tunnel đều đúng.
  // Chỉ đặt PUBLIC_URL khi cần ghim cứng một địa chỉ (domain riêng, reverse proxy).
  if (process.env.PUBLIC_URL) {
    builder.addServer(process.env.PUBLIC_URL, 'Public');
  }

  const config = builder
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Dán accessToken lấy từ POST /auth/login (không cần ghi chữ "Bearer")',
      },
      'bearer',
    )
    .addTag(ApiTag.Auth)
    .addTag(ApiTag.Products)
    .addTag(ApiTag.Categories)
    .addTag(ApiTag.Cart)
    .addTag(ApiTag.Orders)
    .addTag(ApiTag.Reviews)
    .addTag(ApiTag.Vouchers)
    .addTag(ApiTag.Inventory)
    .addTag(ApiTag.Users)
    .addTag(ApiTag.Reports)
    .addTag(ApiTag.Settings)
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    // Giữ token sau khi reload trang để không phải Authorize lại
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none', // thu gọn các nhóm API cho dễ nhìn
      filter: true, // hiện ô tìm kiếm endpoint
      tagsSorter: 'alpha',
      displayRequestDuration: true,
    },
    customSiteTitle: 'OPL Ecommerce API Docs',
    // Frontend có thể tải file spec tại /docs-json hoặc /docs-yaml
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
    yamlDocumentUrl: `${SWAGGER_PATH}-yaml`,
  });
}
