# SaaS House Rental Backend

Backend cho nền tảng quản lý và cho thuê phòng trọ/chung cư mini theo mô hình SaaS multi-tenant kết hợp marketplace. Hệ thống phục vụ Super Admin, chủ trọ/nhân viên và người thuê trên cùng một modular monolith NestJS.

> Trạng thái tài liệu: đồng bộ theo working tree ngày 31/07/2026. Backend đã build, lint và unit test thành công; `frontend/` và `mobile/` chưa có implementation.

## Chức năng chính

- Xác thực email/OTP, Google OAuth, access/refresh token và RBAC.
- Quản lý tenant, gói SaaS, subscription và thanh toán gói qua PayOS.
- Quản lý nhà trọ, tầng, phòng, ảnh, tiện ích và marketplace moderation.
- Yêu cầu thuê, lịch xem phòng, lời mời người thuê, hợp đồng, tài sản, bàn giao và thanh lý.
- Đồng hồ/chỉ số điện nước, OCR công tơ, danh mục dịch vụ và gán dịch vụ.
- Hóa đơn, công nợ, QR, xác nhận thủ công và PayOS webhook có idempotency.
- Ticket, thông báo nội bộ, Socket.IO, Firebase push và BullMQ worker.
- Dashboard chủ trọ/nền tảng, review, report và moderation.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js, TypeScript 5.7 |
| Framework | NestJS 11 |
| Database | PostgreSQL, Prisma 7 |
| Queue/rate limit | Redis, BullMQ, NestJS Throttler |
| Validation/API | Zod, nestjs-zod, Swagger/OpenAPI |
| Tích hợp | PayOS, Google OAuth/Vision, Tesseract, Cloudinary, Resend, Firebase |
| Kiểm thử | Jest, Supertest |

## Kiến trúc

```text
HTTP / WebSocket
      │
Helmet · CORS · Rate limit · Authentication · Roles · Zod · Exception filter
      │
NestJS controllers → services → repositories → Prisma → PostgreSQL
      │                    ├──────────────→ PayOS / Cloudinary / Google / Resend
      └────────────────────└──────────────→ Redis / BullMQ / Firebase / Socket.IO
```

`AppModule` hiện nạp 27 module nghiệp vụ/hạ tầng. Các module được nhóm chi tiết trong [tài liệu kiến trúc](docs/systems/Mo_ta_kien_truc_he_thong_MVP.md); tài liệu đầy đủ bắt đầu tại [docs/README.md](docs/README.md).

## Yêu cầu môi trường

- Node.js 20 trở lên và npm.
- PostgreSQL tương thích với Prisma schema hiện tại.
- Redis cho global/resource rate limit, BullMQ và notification/OCR worker.
- Credential của dịch vụ ngoài chỉ cần khi chạy luồng tương ứng.

## Khởi tạo local

```bash
npm install
```

Sao chép `exemple.env` thành `.env`, sau đó cấu hình tối thiểu:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database>
ACCESS_TOKEN_SECRET=<secret-dai-va-ngau-nhien>
REFRESH_TOKEN_SECRET=<secret-khac>
API_KEY_SECRET=<internal-api-key>
PAYMENT_API_KEY=<payment-internal-key>
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGINS=http://localhost:3000
```

Không commit `.env`, service-account JSON, private key hoặc token thật. Danh sách biến đầy đủ và mô tả nhóm nằm trong `exemple.env`.

## Database

Kiểm tra schema và migration:

```bash
npx prisma validate --schema prisma/schema.prisma
npx prisma migrate status --schema prisma/schema.prisma
```

Môi trường phát triển mới:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma generate
npm run db:seed
```

`db:seed` tạo dữ liệu demo theo các biến `SEED_*`. Không chạy seed hoặc E2E lên database production. Xem [tài liệu CSDL](docs/db/db.md) để biết model, quan hệ và thứ tự migration.

## Chạy ứng dụng

```bash
# development
npm run start:dev

# build production
npm run build
npm run start:prod
```

Mặc định server lắng nghe cổng `3000` hoặc giá trị `PORT`.

## API và Swagger

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON runtime: `http://localhost:3000/docs-json`
- API reference: [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md)
- Runtime route index: [docs/api/API_RUNTIME_INDEX.md](docs/api/API_RUNTIME_INDEX.md)

Sau khi đổi controller/DTO/auth metadata:

```bash
npm run openapi:export
npm run docs:check
```

Route protected dùng Bearer token. Route landlord/staff theo tenant truyền thêm `x-tenant-id` khi guard tenant áp dụng.

## Kiểm thử và kiểm tra chất lượng

```bash
npm test -- --runInBand
npm run test:cov
npm run test:e2e
node node_modules/eslint/bin/eslint.js "{src,apps,libs,test}/**/*.ts"
npm run docs:check
```

Baseline 31/07/2026:

| Kiểm tra | Kết quả |
|---|---|
| Build | Đạt |
| ESLint không sửa file | Đạt |
| Unit test | 74/74 suite, 281/281 test |
| Prisma validate | Đạt |
| E2E | Có 5 scenario; cần PostgreSQL đã migrate và seed |

E2E tạo rồi dọn một tenant/property cách ly. Chỉ chạy trên database thử nghiệm.

## Các lệnh vận hành

| Lệnh | Mục đích |
|---|---|
| `npm run db:status` | Kiểm tra migration |
| `npm run db:seed` | Nạp dữ liệu demo |
| `npm run permission:sync` | Đồng bộ permission từ bản build |
| `npm run openapi:export` | Sinh OpenAPI và hai tài liệu API |
| `npm run docs:check` | Kiểm tra độ phủ API/DB, link và mẫu secret |
| `npm run security:preflight-webhook-logs` | Thống kê log webhook cần sanitize, không đổi dữ liệu |
| `npm run security:sanitize-webhook-logs` | Sanitize/xóa log theo retention; cần phê duyệt vận hành |

## Triển khai

Repository chưa có Dockerfile/IaC hoặc pipeline production canonical. Quy trình tối thiểu:

1. Cấu hình PostgreSQL và Redis production.
2. Cấp secret qua secret manager; cấu hình `NODE_ENV=production`, `CORS_ORIGINS`, trust proxy và URL callback.
3. Chạy `npm ci`, `npx prisma migrate deploy`, `npm run build`.
4. Chạy `node dist/main` bằng process manager/container.
5. Chạy worker trong cùng deployment theo cấu hình BullMQ hiện tại và giám sát Redis/queue.
6. Kiểm tra `/`, `/docs-json`, log lỗi, webhook signature và notification provider.

Không chạy `prisma migrate dev`, reset database hoặc seed demo trong production.

## Xử lý sự cố

- **Không kết nối PostgreSQL:** kiểm tra `DATABASE_URL`, server, quyền schema và migration status.
- **Redis/queue lỗi:** kiểm tra `REDIS_URL` hoặc bộ `REDIS_HOST/PORT/USERNAME/PASSWORD`.
- **CORS bị từ chối:** production yêu cầu danh sách origin HTTP(S) chính xác, không có path/wildcard.
- **Swagger lệch code:** chạy `npm run openapi:export` rồi `npm run docs:check`.
- **E2E báo thiếu seed:** chạy migration và `npm run db:seed` trên database test.
- **PayOS/OAuth/OCR/push không hoạt động:** kiểm tra nhóm biến môi trường tương ứng; core backend vẫn có thể build/test bằng mock.

## Phạm vi chưa hoàn thành

- Chưa có web frontend hoặc mobile app trong workspace hiện tại.
- Chưa có bằng chứng staging/production cho các dịch vụ ngoài và luồng concurrency thực trên PostgreSQL.
- Một số schema mở rộng như conversation/chat, reputation aggregate, contract template/file và invoice batch chưa có API hoàn chỉnh; xem backlog trong G01–G12.

## Tài liệu

Mục lục, quy tắc nguồn sự thật và trạng thái từng tài liệu: [docs/README.md](docs/README.md).

## Giấy phép

Package hiện khai báo `UNLICENSED` và `private: true`; đây không phải dự án mã nguồn mở nếu chưa có quyết định khác.
