# Tài liệu phân tích nghiệp vụ hệ thống

> Đồng bộ theo working tree backend ngày 31/07/2026. Trạng thái API chi tiết nằm trong G01–G12 và OpenAPI runtime.

## 1. Bài toán

Hệ thống giải quyết ba lớp nghiệp vụ: quản trị nền tảng SaaS, vận hành tài sản cho thuê theo tenant và marketplace/self-service của người thuê. Mọi luồng tài chính/tài sản phải truy vết được actor, tenant, trạng thái và thời gian.

## 2. Bounded context

| Context | Trách nhiệm | Nhóm đặc tả |
|---|---|---|
| Identity & SaaS | Auth, RBAC, tenant, plan, subscription | G01–G02 |
| Rental supply | Property, floor, room, amenity | G03 |
| Acquisition | Marketplace, moderation, request, appointment | G04 |
| Tenancy lifecycle | Renter, invitation, contract, asset, handover, termination | G05 |
| Consumption | Meter, reading, OCR, service catalog/assignment | G06 |
| Receivable | Invoice, item, debt | G07 |
| Settlement | QR, payment, PayOS, webhook, subscription billing | G08 |
| Support | Ticket, comment, attachment | G09 |
| Communication | Notification, Socket.IO, Firebase, queue | G10 |
| Insight/governance | Dashboard, audit, setting | G11 |
| Trust | Review, report, moderation, reputation | G12 |

## 3. Vai trò và phạm vi

- `ADMIN`: dữ liệu toàn nền tảng và route moderation/platform.
- `LANDLORD`: chủ sở hữu tenant và nghiệp vụ vận hành.
- `MANAGER`, `ACCOUNTANT`, `MAINTENANCE_STAFF`: quyền giới hạn theo route và membership.
- `RENTER`: self-service dựa trên profile/contract; không chọn tenant tùy ý.

User/tenant/member bị khóa hoặc không active phải bị từ chối tại request time, không chỉ dựa vào role cũ trong JWT.

## 4. Trạng thái triển khai theo context

| Context | Backend | Giới hạn còn lại |
|---|---|---|
| G01 | Core + hardening | Integration auth/provider |
| G02 | Plan/tenant/subscription payment | Provider/staging reconciliation |
| G03 | CRUD + upload/marketplace status | Cloudinary thật |
| G04 | Public/search/request/appointment/moderation | Một số state/query edge case |
| G05 | Invitation/contract/assets/handover/termination | File/template/signature/scheduler |
| G06 | Meter/reading/OCR/service | Import/batch và provider thật |
| G07 | Invoice/debt | Invoice batch/scheduler đầy đủ |
| G08 | Manual + PayOS/webhook | Concurrency/provider E2E |
| G09 | Ticket core/relation/rate limit | Conversation/chat riêng |
| G10 | Inbox/socket/push/queue | Firebase/Redis staging |
| G11 | Tenant + platform dashboard | Audit/settings API |
| G12 | Review/report/moderation | Reputation aggregate đa nguồn |

## 5. Quy trình chính

### 5.1. Nguồn cung đến hợp đồng

1. Landlord tạo property/floor/room, ảnh và tiện ích.
2. Room hợp lệ được publish; ADMIN có thể moderation.
3. Renter tạo appointment/request.
4. Landlord duyệt request, mời renter hoặc dùng profile đã có.
5. Tạo/activate contract; room và rental history chuyển theo trạng thái.

### 5.2. Bàn giao và kết thúc

1. Khai báo asset category/room asset.
2. Tạo handover check-in/check-out và snapshot tình trạng.
3. Hai bên confirm hoặc dispute; staff resolve dispute.
4. Termination request được approve/reject/cancel/complete theo quyền.
5. Chỉ release room khi không còn contract active xung đột.

### 5.3. Tiêu thụ đến thanh toán

1. Cấu hình meter và service catalog/assignment.
2. Nhập reading hoặc tạo OCR job; người dùng accept kết quả.
3. Tạo/issue invoice và debt.
4. Renter lấy QR/gửi confirmation hoặc PayOS callback.
5. Staff approve/reject; transaction cập nhật payment/invoice/debt atomically.
6. Event tạo notification và dashboard phản ánh dữ liệu mới.

### 5.4. Support và trust

Ticket tách comment public/internal và attachment có pagination/hard cap. Review chỉ được public sau moderation; report chỉ actor có quyền xem, ADMIN xử lý status. Reputation aggregate chưa phải interface hoàn chỉnh.

## 6. Quy tắc xuyên hệ thống

- ID trong API là integer dương; ngày giờ ISO 8601.
- DTO strict, list có pagination; query phải kiểm tra khoảng giá/ngày hợp lệ.
- Tenant/resource scope áp dụng ở guard và repository.
- State terminal không quay lại trạng thái trước nếu không có transition được định nghĩa.
- Tác vụ retry/webhook phải idempotent.
- Soft-delete/retention khác nhau theo miền; dữ liệu tài chính/audit không xóa vật lý tùy tiện.
- Public projection không trả tenant ID, địa chỉ chi tiết hoặc PII không cần thiết.

## 7. Failure mode

| Tình huống | Kết quả mong đợi |
|---|---|
| Token/tenant/role không hợp lệ | `401/403` theo error contract |
| Resource ngoài scope | `404` hoặc `403` theo policy, không lộ dữ liệu |
| Payload/query sai | `400` với details và requestId |
| Transition/ràng buộc xung đột | `409` |
| Rate limit | `429` và `Retry-After` |
| Provider/worker lỗi | Lưu trạng thái retry/failure; không commit kết quả một phần |
| Webhook trùng | Nhận diện duplicate, không cộng tiền lần hai |

## 8. Kênh sử dụng

Backend đã có API cho web quản trị và renter self-service. Frontend/mobile chưa tồn tại trong workspace nên mọi mô tả UI chỉ là tiêu chí tương lai, không phải phần đã triển khai.

## 9. Nghiệm thu

- Unit test xác minh business logic và guard/filter/provider bằng mock.
- E2E xác minh HTTP, PostgreSQL seed và tenant isolation.
- Staging xác minh Redis/BullMQ, PayOS, Firebase, Google, Cloudinary, Resend.
- `npm run docs:check` xác minh API/DB/link/secret coverage.

## 10. Nguồn canonical

- [Yêu cầu MVP](Tai_lieu_yeu_cau_chuc_nang_MVP.md)
- [Kiến trúc](Mo_ta_kien_truc_he_thong_MVP.md)
- [G01–G12](../README.md#đặc-tả-nghiệp-vụ)
- [API reference](../api/API_REFERENCE.md)
- [Database](../db/db.md)
