# Triển khai SEC-M01–SEC-M05

> Runbook được rà soát lại ngày 31/07/2026. Không chạy lệnh `--apply` trên production trước khi có backup, secret và phê duyệt.

## 1. Thay đổi API đã áp dụng

- `POST /auth/verify-otp` không tồn tại; OTP được consume atomically trong register/login/forgot-password.
- Ticket list/detail không nhúng toàn bộ comment/attachment; relation có endpoint phân trang riêng.
- Renter không nhận comment `isInternal=true` hoặc PII staff không cần thiết.
- Route tenant dùng `x-tenant-id` và đối chiếu membership/status/role hiện hành.
- API trả error contract có `requestId`; global/resource rate limit có `429`.

## 2. Các kiểm soát đã triển khai

| Kiểm soát | Hiện trạng |
|---|---|
| Payment approve/reject | Conditional update/transaction, chống duyệt lặp |
| PayOS webhook | Provider reference unique/idempotent, payload sanitize |
| OTP | Atomic consume và giới hạn attempt |
| Refresh token | Rotation/replay detection |
| Auth/resource rate limit | Redis-backed profiles |
| HTTP hardening | Helmet, CORS allowlist, timeout Google |
| Ticket relation | Tách endpoint, pagination/hard cap |

## 3. Rollout webhook log

1. Cấp `PAYMENT_WEBHOOK_LOG_HMAC_SECRET` riêng, tối thiểu theo validation trong `env.config.ts`.
2. Deploy migration `20260722130000_secure_payment_webhook_logs` và các migration mới hơn.
3. Chạy `npm run security:preflight-webhook-logs`; lệnh chỉ thống kê row nhạy cảm/quá hạn.
4. Kiểm tra backup, retention và kết quả preflight.
5. Khi được phê duyệt, chạy `npm run security:sanitize-webhook-logs` theo batch resumable.
6. Xác nhận không còn field nhạy cảm, digest thiếu hoặc row quá retention.
7. Giới hạn/quay vòng backup cũ vì migration không thể sanitize backup ngoại tuyến.

## 4. Cấu hình production

- `CORS_ORIGINS`: origin HTTP(S) chính xác; không wildcard/path.
- `TRUST_PROXY_HOPS`: chỉ đặt theo reverse proxy thực tế.
- Redis: bắt buộc cho throttling/queue; bảo vệ bằng network policy và credential.
- PayOS/Google/Firebase/Cloudinary/Resend: credential qua secret manager.
- Log: không ghi access token, OTP, raw webhook PII hoặc service-account.

## 5. Xác minh sau deploy

- Health/API docs truy cập theo policy.
- Auth bị rate-limit đúng và không enumeration.
- Tenant A không đọc/sửa resource tenant B.
- Webhook trùng không tạo payment/cộng công nợ lần hai.
- Ticket renter không thấy internal comment.
- Queue retry không tạo notification/OCR result trùng.

Các kiểm tra concurrency và provider phải chạy trên staging; unit test không thay thế PostgreSQL/Redis/integration test thật.
