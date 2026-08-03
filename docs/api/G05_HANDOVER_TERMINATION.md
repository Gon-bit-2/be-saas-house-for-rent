# G05 API bàn giao và thanh lý hợp đồng

> Cập nhật 31/07/2026. Method/path canonical nằm trong [API reference](API_REFERENCE.md); tài liệu này tập trung vào state transition và transaction.

## Xác thực và tenant

- Staff route: Bearer JWT, role theo controller và `x-tenant-id`.
- Renter route `/me`: Bearer JWT; scope suy ra từ profile/contract.
- Resource ngoài scope không được trả dữ liệu tenant khác.

## Tài sản

- `GET/POST/PATCH/DELETE /asset-categories...`: danh mục tài sản.
- `GET/POST/PATCH/DELETE /rooms/:roomId/assets` và `/room-assets/:id`: inventory hiện tại của phòng.
- Không xóa vật lý dữ liệu đã được snapshot trong biên bản.

## Bàn giao

| Actor | Endpoint chính | Hành vi |
|---|---|---|
| Renter | `GET /handovers/me`, `GET /handovers/me/:id` | Xem biên bản thuộc hợp đồng |
| Renter | `PATCH /handovers/me/:id/confirm` | Xác nhận phần của renter |
| Renter | `PATCH /handovers/me/:id/dispute` | Mở tranh chấp với lý do |
| Staff | `GET/POST/PATCH /handovers...` | List/detail/tạo/sửa draft |
| Staff | `PATCH /handovers/:id/confirm` | Xác nhận phần staff |
| Staff | `PATCH /handovers/:id/dispute` | Mở tranh chấp |
| Staff | `PATCH /handovers/:id/resolve` | Giải quyết tranh chấp |

State chính: `DRAFT → CONFIRMED` hoặc `DRAFT/CONFIRMED → DISPUTED → CONFIRMED` theo policy service. Repository dùng expected status/CAS; snapshot item không tự đổi theo inventory sau khi lập biên bản.

## Thanh lý hợp đồng

| Actor | Endpoint chính | Hành vi |
|---|---|---|
| Renter | `POST /contract-terminations/me` | Gửi yêu cầu |
| Renter | `GET /contract-terminations/me...` | Xem yêu cầu của mình |
| Renter | `PATCH /contract-terminations/me/:id/cancel` | Hủy khi còn cho phép |
| Staff | `GET/POST /contract-terminations...` | List/detail/tạo hộ |
| Staff | `PATCH .../:id/approve|reject|cancel|complete` | State transition |

State: `PENDING → APPROVED/REJECTED/CANCELED`; `APPROVED → COMPLETED/CANCELED` theo rule. `complete` cập nhật termination, contract, rental history và room trong transaction; room chỉ được release khi không có contract active xung đột.

## Lịch sử thuê và notification

Contract activation/expiration/termination cập nhật `rental_histories`. Các event quan trọng có thể tạo notification qua G10; lỗi push không được làm rollback transaction nghiệp vụ đã commit nếu pipeline thiết kế async.

## Lỗi và concurrency

- `400`: payload/transition không hợp lệ.
- `401/403`: token, role hoặc tenant context sai.
- `404`: resource không tồn tại trong scope.
- `409`: state đã đổi, room/contract xung đột hoặc action lặp.
- Concurrent confirm/resolve/complete chỉ một request được claim thành công.

## Kiểm thử bắt buộc

- Tenant A không đọc/sửa asset/handover/termination của tenant B.
- Renter chỉ thao tác contract có membership hợp lệ.
- Hai request transition đồng thời không ghi đè.
- Complete termination cập nhật contract/history/room atomically.
- Dispute lưu actor/lý do/timestamp và chỉ staff hợp lệ được resolve.
