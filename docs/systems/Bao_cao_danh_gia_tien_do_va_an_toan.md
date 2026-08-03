# Báo cáo đánh giá tiến độ và an toàn dự án

**Ngày đánh giá:** 31/07/2026

**Baseline:** Working tree nhánh `feat/handover-module`, gồm thay đổi chưa commit

**Phạm vi:** Phân tích tĩnh, build, unit test, lint và Prisma validate; không đọc secret, không chạy E2E/database/provider ngoài

## 1. Kết luận điều hành

Backend đã chuyển từ scaffold/core sang giai đoạn **backend MVP feature-complete có điều kiện**: 27 module được nạp, 34 controller, 214 operation; build/lint/Prisma validate và 294 unit test đều đạt. Dashboard platform, subscription billing, marketplace moderation, OCR, renter invitation, service catalog, handover/termination và trust moderation hiện đã có API.

Chưa thể tuyên bố MVP hoàn thành hoặc production-ready vì:

1. `frontend/` và `mobile/` chưa có implementation.
2. Năm E2E scenario cần PostgreSQL đã migrate/seed chưa được chạy trong đợt đánh giá này.
3. PayOS, Redis/BullMQ, Firebase, Google, Cloudinary và Resend chưa có bằng chứng staging.
4. Một số remediation concurrency/tenant isolation đã có code nhưng chưa được stress/integration test trên DB thật.
5. Dependency audit qua npm registry chưa chạy vì chưa có quyền gửi dependency metadata ra dịch vụ ngoài.

**Gate:** `PASS` cho build/unit/static documentation; `CONDITIONAL` cho integration QA; `BLOCK` cho production release đến khi hoàn tất exit criteria ở mục 7.

## 2. Bằng chứng chất lượng

| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| `npm run build` | PASS | Nest build exit 0 |
| ESLint không `--fix` | PASS | Không có finding |
| `npm test -- --runInBand` | PASS | 75/75 suite, 294/294 test, 0 snapshot |
| `npx prisma validate` | PASS | Schema hợp lệ |
| OpenAPI export | PASS | 214 operation, 34 controller |
| E2E | NOT RUN | 5 scenario, cần DB seed và có tạo/xóa dữ liệu test |
| Dependency audit online | NOT RUN | Chưa được phép gửi metadata ra registry |
| Provider/staging | NOT RUN | Không có credential/môi trường trong phạm vi |

Unit test sử dụng mock nhiều; PASS không thay thế integration test transaction, unique constraint, tenant isolation và queue/provider.

## 3. Tiến độ chức năng

| Nhóm | Mức hiện tại | Phần cần xác minh/hoàn thiện |
|---|---|---|
| G01 Auth/RBAC | Backend + hardening | Auth/provider và tenant E2E |
| G02 SaaS billing | API + PayOS adapter | Provider reconciliation |
| G03 Supply | API | Cloudinary/storage |
| G04 Marketplace | API core + moderation | Edge-case transition/query |
| G05 Contract lifecycle | API invitation/asset/handover/termination | File/template/signature/scheduler |
| G06 Utility/service/OCR | API | Provider/worker/import batch |
| G07 Invoice/debt | API core | Batch/scheduler/concurrency E2E |
| G08 Payment | Manual + PayOS/webhook | DB concurrency/provider E2E |
| G09 Ticket | API + isolation/rate limit | Chat/conversation riêng |
| G10 Notification | Inbox/socket/push/queue | Redis/Firebase staging |
| G11 Dashboard | Tenant + platform API | Audit/settings API |
| G12 Trust | Review/report/moderation | Reputation aggregate |

FR-29 chưa đạt ở cấp sản phẩm vì thiếu client dù self-service API đã có. FR-30 mới hoàn thiện theo từng miền; chưa có audit/settings interface thống nhất.

## 4. Đánh giá lại finding cũ

### 4.1. HIGH

| ID | Trạng thái | Bằng chứng hiện tại | Việc còn lại |
|---|---|---|---|
| SEC-H01 Ticket lộ internal comment | RESOLVED | Renter select/count lọc `isInternal=false`; relation tách endpoint; repository/service spec | E2E projection |
| SEC-H02 Race approve/reject payment | PARTIAL | Transaction + `updateMany where status=PENDING`, kiểm `count` | Test concurrent trên PostgreSQL |
| SEC-H03 Webhook không idempotent DB | PARTIAL | Unique `(provider, transactionCode)`, flow duplicate và digest | Xác nhận migration/stress webhook |
| SEC-H04 OTP dùng đồng thời | RESOLVED | Atomic `consumeVerificationCode`; conflict event và unit test | Integration concurrency khuyến nghị |
| SEC-H05 Refresh rotation race | RESOLVED | Atomic revoke/rotation, replay event và unit test | Multi-node integration khuyến nghị |
| SEC-H06 Thiếu auth/rate limit | PARTIAL | Global + auth/resource profile qua Redis, guard unit test | Redis staging/failover |
| SEC-H07 JWT role/tenant context cũ | PARTIAL | Guard đối chiếu tenant/member/status/role và phát security event | Chạy E2E tenant A/B và revoke test |

### 4.2. MEDIUM

| ID | Trạng thái | Bằng chứng hiện tại | Việc còn lại |
|---|---|---|---|
| SEC-M01 Verify OTP consume sớm | RESOLVED | Endpoint đã bỏ; controller test khóa behavior |
| SEC-M02 Helmet/CORS | RESOLVED | `main.ts`, config validation và unit test |
| SEC-M03 Google timeout | RESOLVED | `AbortSignal.timeout`, retry giới hạn và test |
| SEC-M04 Webhook PII/retention | PARTIAL | Payload allowlist/sanitize, HMAC digest, runbook retention | Chạy preflight/sanitize dữ liệu lịch sử và backup |
| SEC-M05 Ticket relation vô hạn | RESOLVED | Pagination, hard cap, rate profile, summary count |

`RESOLVED` ở đây nghĩa remediation có trong code/unit test; không phải chứng nhận penetration test hoặc production assurance.

## 5. Rủi ro còn mở

| Rủi ro | Mức | Hành động |
|---|---|---|
| Thiếu client end-to-end | HIGH sản phẩm | Xây web/mobile tối thiểu cho FR-29 |
| Chưa chạy DB E2E/concurrency | HIGH chất lượng | Database test riêng, migrate/seed, chạy E2E và stress race |
| Provider ngoài chưa xác minh | MEDIUM/HIGH vận hành | Staging credential + smoke/retry/webhook test |
| Historical webhook log/backup | MEDIUM dữ liệu | Preflight, sanitize, retention và backup expiry |
| Dependency vulnerability chưa scan | UNKNOWN | Chạy audit/SCA khi được phép kết nối registry |
| Audit/SystemSetting API thiếu | MEDIUM governance | Chốt scope G11 và data-retention policy |

## 6. Thay đổi interface đáng chú ý

- Swagger `/docs`, JSON `/docs-json`, error response có `requestId`.
- Route staff theo tenant yêu cầu `x-tenant-id` khi guard áp dụng.
- OTP không có endpoint verify độc lập.
- Ticket relation dùng endpoint phân trang.
- Marketplace có moderation status/history.
- G05 có renter invitation, asset, handover và contract termination.
- G02/G08 có PayOS subscription/invoice flow; webhook log được sanitize/idempotent.

Danh sách method/path canonical nằm tại [API runtime index](../api/API_RUNTIME_INDEX.md).

## 7. Exit criteria

- [ ] Chạy 5 E2E scenario trên PostgreSQL test đã migrate/seed.
- [ ] Thêm concurrency test cho payment/webhook/OTP/refresh/contract activation.
- [ ] Xác minh Redis rate-limit và BullMQ retry/idempotency trên staging.
- [ ] Smoke test PayOS, Firebase, Google, Cloudinary và Resend bằng credential staging.
- [ ] Chạy dependency SCA/audit có phê duyệt kết nối ngoài.
- [ ] Thực hiện preflight/sanitize webhook log và policy backup.
- [ ] Có client web/mobile cho hành trình renter tối thiểu.
- [ ] Re-run build/lint/unit/Prisma/OpenAPI/docs check và lưu bằng chứng release.

## 8. Giới hạn đánh giá

Không thực hiện exploit, fuzzing chủ động, penetration test, tải thật, kiểm tra infrastructure/cloud hoặc đọc `.env`. Báo cáo ưu tiên bằng chứng tĩnh và test cục bộ; mọi kết luận ngoài phạm vi được ghi `NOT RUN` hoặc `PARTIAL`.
