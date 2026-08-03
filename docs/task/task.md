# Trạng thái triển khai và backlog

> Cập nhật ngày 31/07/2026 theo working tree hiện tại.

## 1. Trạng thái theo nhóm

| Nhóm | Đã có | Backlog chính |
|---|---|---|
| G01 | Auth/OTP/OAuth/token/RBAC/tenant guard/rate limit | Integration đa node/provider |
| G02 | Tenant/plan/subscription/PayOS billing | Refund/reconciliation nâng cao |
| G03 | Property/floor/room/image/amenity | Storage staging |
| G04 | Public marketplace/request/appointment/moderation | Hoàn thiện edge-case filter/transition |
| G05 | Profile/invitation/contract/asset/handover/termination/history | Template/file/e-sign/scheduler |
| G06 | Meter/reading/OCR/service catalog/assignment | Import/batch/provider staging |
| G07 | Invoice/debt/state transition | Invoice batch/scheduler |
| G08 | QR/manual payment/PayOS/webhook/subscription payment | Provider + concurrency E2E |
| G09 | Ticket/comment/attachment/assign/status/rate limit | Conversation/chat |
| G10 | Inbox/read/device/socket/push/queue | Firebase/Redis staging |
| G11 | Tenant/platform dashboard | AuditLog/SystemSetting API |
| G12 | Review/report/public summary/moderation | Reputation aggregate |

## 2. Ưu tiên giai đoạn tiếp theo

1. Chạy PostgreSQL E2E và concurrency suite cho luồng tiền/tenant/contract.
2. Xây client web/mobile tối thiểu cho landlord và renter.
3. Dựng staging Redis và provider ngoài, kiểm tra retry/idempotency.
4. Hoàn thiện contract file/template/signature, invoice batch và audit/settings theo nhu cầu đồ án.
5. Thiết lập CI chạy build, unit, lint, Prisma validate, OpenAPI export và docs check.

## 3. Definition of done

- Source, migration, OpenAPI và tài liệu cùng một baseline.
- Unit và E2E phù hợp đều pass; không ghi “đạt” khi chưa chạy.
- Tenant isolation và state transition có negative/concurrency test.
- Không có secret/PII trong Git hoặc tài liệu.
- Provider ngoài có evidence staging hoặc được đánh dấu dependency chưa xác minh.

## 4. Nguồn đối chiếu

- [Mục lục tài liệu](../README.md)
- [Báo cáo tiến độ/an toàn](../systems/Bao_cao_danh_gia_tien_do_va_an_toan.md)
- [API runtime index](../api/API_RUNTIME_INDEX.md)
- [Prisma schema](../../prisma/schema.prisma)
