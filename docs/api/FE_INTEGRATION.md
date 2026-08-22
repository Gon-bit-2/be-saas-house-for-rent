# Hướng dẫn tích hợp Frontend với Backend v1

## 1. Baseline và tương thích

- API hiện tại không có prefix và được xem là **v1**.
- Frontend tích hợp theo `docs/api/openapi.json` tại tag `fe-baseline-v1`.
- Backend không xóa URL, đổi kiểu field, đổi nullable/required hoặc đổi response shape của v1.
- Thay đổi tương thích có thể bổ sung field optional. Thay đổi breaking phải dùng URL `/v2` và tăng major version contract.

## 2. Authorization và refresh token

Mọi API protected nhận access token:

```http
Authorization: Bearer <accessToken>
```

`POST /auth/login` là luồng hai bước. Lần đầu gửi email/password để nhận OTP; lần sau gửi thêm `code` để nhận:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

Khi access token hết hạn, gọi:

```http
POST /auth/refresh-token
Content-Type: application/json

{ "refreshToken": "<current-refresh-token>" }
```

Refresh token được rotate. Sau response thành công, client phải thay **cả access token và refresh token**. Token cũ dùng lại trả `401` và có thể làm backend ghi nhận replay. Frontend nên dùng một refresh promise dùng chung để tránh nhiều request đồng thời rotate cùng token.

`POST /auth/logout` cần Bearer token và refresh token trong body. Logout chỉ revoke refresh token được gửi.

## 3. Tenant context

`GET /auth/profile` trả các `tenantMembers` đang hoạt động, bao gồm tenant, role và permissions. Với API vận hành của landlord/staff, gửi tenant đã chọn:

```http
x-tenant-id: 10
```

Không gửi header này cho marketplace public, renter self-service (`/me`) hoặc notification cá nhân. OpenAPI đánh dấu header là required trên đúng operation tenant-scoped.

- Thiếu hoặc sai định dạng: `400 TENANT_CONTEXT_REQUIRED`.
- User không thuộc tenant: `403 TENANT_ACCESS_DENIED`.
- Resource thuộc tenant khác: trả `404` để không làm lộ sự tồn tại.

## 4. Pagination và kiểu dữ liệu

List chuẩn:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

- `page` mặc định 1.
- `limit` mặc định 20, tối đa 100.
- Date-only dùng `YYYY-MM-DD`; timestamp dùng ISO-8601.
- Decimal/tiền tệ trong response là decimal string để không mất độ chính xác.
- Field có mặt nhưng chưa có giá trị dùng `null`; field optional chỉ khi bị lược bỏ theo quyền hoặc ngữ cảnh.

## 5. Error response

Mọi lỗi JSON dùng shape:

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Resource state has changed",
  "details": {},
  "timestamp": "2026-08-03T12:00:00.000Z",
  "path": "/rental-requests/123/decision",
  "requestId": "9f5b7890-4be7-43ad-a347-359e9146600d"
}
```

`details` là optional. Backend phản hồi `x-request-id`; frontend có thể gửi `x-request-id` để đối soát log.

| HTTP  | Khi nào xử lý                                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------- |
| `400` | Request/query/header sai validation hoặc transition không hợp lệ. Hiển thị lỗi nghiệp vụ; không retry tự động. |
| `401` | Access/refresh token hết hạn, sai hoặc refresh replay. Thử refresh đúng một lần; nếu thất bại thì đăng xuất.   |
| `403` | Đúng danh tính nhưng thiếu role/permission hoặc tenant membership. Không retry.                                |
| `404` | Không tồn tại hoặc resource nằm ngoài caller scope.                                                            |
| `409` | Unique constraint, optimistic concurrency hoặc state đã đổi. Reload resource trước khi cho thao tác lại.       |
| `429` | Vượt rate limit. Chờ số giây trong header `Retry-After` trước khi retry.                                       |

## 6. REST là nguồn dữ liệu chuẩn

Frontend đọc lại REST sau reconnect/tab resume và dùng `id` để merge. Socket.IO và TypeScript SDK không thuộc baseline P0 này.
