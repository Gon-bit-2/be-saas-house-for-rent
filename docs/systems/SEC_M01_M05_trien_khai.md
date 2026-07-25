# Triển khai SEC-M01–SEC-M05

## Thay đổi API

- `POST /auth/verify-otp` đã bị xóa. Mã OTP chỉ được consume trong `POST /auth/register`, `POST /auth/login` hoặc `POST /auth/forgot-password`.
- Ticket list/detail không còn nhúng `comments` và `attachments`; response trả `commentCount` và `attachmentCount`.
- Relation ticket được phân trang bằng `page` và `limit` (mặc định 20, tối đa 50):
  - renter: `GET /tickets/me/:id/comments`, `GET /tickets/me/:id/attachments`;
  - staff: `GET /tickets/:id/comments`, `GET /tickets/:id/attachments` và bắt buộc `X-Tenant-Id`.

## Rollout webhook log

1. Cấu hình `PAYMENT_WEBHOOK_LOG_HMAC_SECRET` riêng, tối thiểu 32 ký tự.
2. Deploy migration `20260722130000_secure_payment_webhook_logs` và code ghi payload đã sanitize.
3. Chạy `npm run security:preflight-webhook-logs` để lấy số row nhạy cảm và row quá hạn. Lệnh này không thay đổi dữ liệu.
4. Sau khi duyệt kết quả, chạy `npm run security:sanitize-webhook-logs`. Lệnh xóa log quá 90 ngày và sanitize row còn giữ theo batch resumable.
5. Xác nhận không còn sensitive JSON path và không còn `payload_digest IS NULL`, rồi tạo migration kế tiếp đặt `payload_digest` và `digest_key_version` thành `NOT NULL`.

Không tự động chạy bước 4 trong schema migration vì HMAC secret chỉ tồn tại ở runtime. Các bản backup đã tạo trước khi sanitize vẫn phải được giới hạn quyền truy cập và hết hạn theo chính sách retention.

## Cấu hình vận hành

- Production bắt buộc có `CORS_ORIGINS` gồm các origin HTTP(S) chính xác; wildcard và origin có path bị từ chối khi startup.
- Helmet bật HSTS ở production, không bật preload. CORS không dùng credentials và chỉ expose `Retry-After`.
- Google token exchange có timeout 5 giây và không retry; userinfo timeout 3 giây, retry tối đa một lần cho `429/502/503/504`.
- Ticket write limiter dùng Redis, mặc định theo user: create 10/giờ, comment 60/giờ, attachment 30/giờ. Hard cap mặc định là 500 comments và 50 attachments mỗi ticket.
