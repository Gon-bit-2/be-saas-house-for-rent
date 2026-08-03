# G09 - Đặc tả ticket sự cố và bảo trì

> **Snapshot 03/08/2026:** Tenant isolation theo role, state machine/CAS, renter close/reopen/cancel, landlord close override, Cloudinary upload ảnh, audit/history và notification theo recipient đã được triển khai. Conversation/chat, work order, vật tư và chi phí vẫn ngoài phạm vi. Các nhận định “chưa có” ở snapshot 31/07 trong phần phân tích lịch sử được thay thế bởi snapshot này.

## 1. Tổng quan

G09 mô tả toàn bộ luồng tiếp nhận và xử lý sự cố trong thời gian thuê phòng, từ lúc người thuê báo lỗi đến khi chủ trọ hoặc nhân viên bảo trì phân công, trao đổi và cập nhật kết quả.

Mục tiêu của tài liệu:

- Người thuê biết điều kiện để tạo ticket và cách theo dõi tiến độ.
- Frontend biết API nào dùng cho renter, API nào dùng cho staff và khi nào cần `x-tenant-id`.
- Staff biết cách lọc, phân công, bình luận và cập nhật trạng thái.
- Backend hiểu cách hệ thống xác định hợp đồng, cách ly tenant và giới hạn dữ liệu trả về.
- Tester có đủ dữ liệu để kiểm tra quyền truy cập, state transition, rate limit và hard cap.
- Người lập kế hoạch biết phần nào chưa hoàn thiện và thứ tự nên triển khai tiếp.

G09 tương ứng chủ yếu với FR-23.

### 1.1. Phạm vi

- Người thuê tạo ticket cho phòng đang thuê.
- Người thuê chính và người ở cùng xem ticket liên quan đến hợp đồng.
- Chủ trọ, quản lý và nhân viên bảo trì xem ticket trong tenant.
- Lọc, tìm kiếm và phân trang ticket.
- Phân công hoặc bỏ phân công người xử lý.
- Cập nhật trạng thái ticket.
- Trao đổi bằng bình luận công khai hoặc bình luận nội bộ.
- Gắn metadata file đính kèm.
- Phát sự kiện notification sang G10.
- Rate limit thao tác ghi và hard cap số quan hệ.

### 1.2. Ngoài phạm vi

| Nội dung                                    | Tài liệu/ghi chú           |
| ------------------------------------------- | -------------------------- |
| Hợp đồng và thành viên hợp đồng             | G05                        |
| Notification nội bộ, realtime và push       | G10                        |
| Dashboard thống kê ticket                   | G11                        |
| Chat realtime bằng `Conversation`/`Message` | Mới có schema, chưa có API |
| Work order, vật tư và chi phí sửa chữa      | Chưa triển khai            |

### 1.3. Trạng thái triển khai

| Nhóm                                      | Trạng thái hiện tại   | Ghi chú                                                   |
| ----------------------------------------- | --------------------- | --------------------------------------------------------- |
| Tạo/list/detail ticket                    | Đã hoạt động          | Có kiểm tra quyền renter và tenant                        |
| Filter và phân trang ticket               | Đã hoạt động          | Filter được áp dụng tại service                           |
| Phân công                                 | Đã triển khai         | Maintenance chỉ thấy ticket được giao; không tự assign    |
| Cập nhật trạng thái                       | Đã triển khai         | Transition matrix và CAS, terminal được khóa              |
| Bình luận công khai/nội bộ                | Đã hoạt động          | Renter không nhận internal comment                        |
| Phân trang comment/attachment             | Đã hoạt động          | Không hydrate toàn bộ trong list/detail                   |
| Rate limit và hard cap                    | Đã hoạt động          | Dùng Redis và row lock                                    |
| Kiểm tra trạng thái tenant khi renter tạo | Đã triển khai         | Contract, room/property và tenant phải active/chưa xóa    |
| Upload file vật lý                        | Đã triển khai         | JPEG/PNG/WebP, 5 MB, decode validation và Cloudinary      |
| State machine đầy đủ                      | Đã triển khai         | Staff/renter action riêng, conflict đồng thời trả `409`   |
| Lịch sử transition/audit                  | Đã triển khai         | Projection riêng cho staff và renter                      |
| Ticket chat                               | Chỉ có schema         | Chưa có module/controller/service                         |

### 1.4. Cảnh báo cũ đã được xử lý

Repository hiện đã tách projection giữa renter và staff:

- Renter comments được lọc `isInternal=false` ngay tại truy vấn database.
- Renter không nhận email hoặc phone của staff trong ticket, comment và attachment.
- List/detail chỉ trả `commentCount` và `attachmentCount`; quan hệ được đọc qua API phân trang riêng.

Không coi lỗi “renter đọc được bình luận nội bộ và PII staff” trong báo cáo cũ là hành vi hiện tại.

## 2. Actor, xác thực và tenant context

### 2.1. Actor và header

| Actor               | Chức năng                                            | Header bắt buộc                       |
| ------------------- | ---------------------------------------------------- | ------------------------------------- |
| `TENANT`            | Tạo ticket, xem ticket của mình, comment, attachment | `Authorization: Bearer <accessToken>` |
| `LANDLORD`          | Quản lý ticket trong tenant                          | Bearer token và `x-tenant-id`         |
| `MANAGER`           | Quản lý ticket trong tenant                          | Bearer token và `x-tenant-id`         |
| `MAINTENANCE_STAFF` | Xem, nhận và xử lý ticket                            | Bearer token và `x-tenant-id`         |

API G09 không public.

### 2.2. Cách xác định tenant

Renter không gửi `x-tenant-id` khi tạo ticket. Backend:

1. Nhận `userId`, `roomId` và `contractId?`.
2. Tìm hợp đồng `ACTIVE`, chưa xóa, thuộc room chưa xóa.
3. Kiểm tra user là main renter hoặc có trong `ContractMember`.
4. Lấy `tenantId`, `roomId` và `contractId` từ hợp đồng tìm được.
5. Tạo ticket bằng dữ liệu đã xác minh.

Client không được tự chỉ định `tenantId`.

Staff gửi `x-tenant-id`. `TenantAccessService` yêu cầu tenant và membership hiện hành hợp lệ. Request sang tenant khác bị từ chối hoặc trả `NotFound`.

### 2.3. Quyền nhìn thấy ticket của renter

Renter được đọc ticket khi thỏa ít nhất một điều kiện:

- `Ticket.createdById` là user hiện tại.
- User là `Contract.renterId`.
- User có bản ghi `ContractMember` trong hợp đồng của ticket.

Quyền đọc lịch sử không yêu cầu hợp đồng còn `ACTIVE`. Điều kiện `ACTIVE` chỉ bắt buộc lúc tạo ticket mới.

### 2.4. Quyền hiện tại của maintenance staff

`MAINTENANCE_STAFF` hiện dùng cùng API tenant-scoped với landlord và manager. Role này:

- Xem toàn bộ ticket trong tenant.
- Xem comment nội bộ và thông tin liên hệ staff.
- Cập nhật trạng thái mọi ticket.
- Giao ticket cho landlord, manager hoặc maintenance staff khác.

Hệ thống chưa áp dụng policy “chỉ xem hoặc sửa ticket được giao cho mình”.

## 3. Mô hình dữ liệu

### 3.1. Quan hệ chính

```text
Tenant
└── Room
    └── Contract
        ├── renterId
        ├── ContractMember[]
        └── Ticket
            ├── createdBy
            ├── assignedToUser
            ├── TicketComment[]
            ├── TicketAttachment[]
            └── Notification[] [G10, liên kết logic qua data]

Ticket ── Conversation[] [chỉ có schema, chưa có API]
```

### 3.2. Ticket

| Field                    | Ý nghĩa                                             |
| ------------------------ | --------------------------------------------------- |
| `id`                     | ID ticket                                           |
| `tenantId`               | Tenant quản lý ticket                               |
| `roomId`                 | Phòng xảy ra sự cố                                  |
| `contractId`             | Hợp đồng liên quan; có thể `null` nếu quan hệ bị gỡ |
| `assignedTo`             | User đang được giao xử lý                           |
| `title`                  | Tiêu đề ngắn                                        |
| `description`            | Mô tả chi tiết                                      |
| `category`               | Danh mục sự cố                                      |
| `priority`               | Mức ưu tiên                                         |
| `status`                 | Trạng thái xử lý                                    |
| `createdById`            | User tạo ticket                                     |
| `updatedById`            | User cập nhật gần nhất                              |
| `deletedById`            | Có trong schema nhưng chưa có delete workflow       |
| `resolvedAt`             | Thời điểm gần nhất chuyển sang `RESOLVED`/`CLOSED`  |
| `createdAt`, `updatedAt` | Thời gian tạo/cập nhật                              |

### 3.3. TicketComment

| Field        | Ý nghĩa                       |
| ------------ | ----------------------------- |
| `ticketId`   | Ticket sở hữu comment         |
| `userId`     | Người gửi                     |
| `message`    | Nội dung, tối đa 5.000 ký tự  |
| `isInternal` | `true` nếu chỉ staff được xem |
| `createdAt`  | Thời điểm gửi                 |

Renter luôn tạo comment công khai. Nếu renter gửi `isInternal=true`, backend trả `Forbidden`.

### 3.4. TicketAttachment

| Field        | Ý nghĩa                |
| ------------ | ---------------------- |
| `ticketId`   | Ticket sở hữu file     |
| `fileUrl`    | URL do client gửi      |
| `fileType`   | Chuỗi mô tả loại file  |
| `uploadedBy` | User gắn file          |
| `createdAt`  | Thời điểm tạo metadata |

API hiện không nhận multipart, không upload file và không tự xác minh URL có thuộc storage của hệ thống hay không.

## 4. Enum và trạng thái

### 4.1. TicketCategory

| Giá trị       | Ý nghĩa   |
| ------------- | --------- |
| `ELECTRICITY` | Điện      |
| `WATER`       | Nước      |
| `INTERNET`    | Internet  |
| `FURNITURE`   | Nội thất  |
| `SECURITY`    | An ninh   |
| `CLEANING`    | Vệ sinh   |
| `OTHER`       | Nhóm khác |

### 4.2. TicketPriority

| Giá trị  | Ý nghĩa          |
| -------- | ---------------- |
| `LOW`    | Có thể xử lý sau |
| `MEDIUM` | Mức mặc định     |
| `HIGH`   | Cần ưu tiên      |
| `URGENT` | Khẩn cấp         |

### 4.3. TicketStatus

| Giá trị          | Ý nghĩa nghiệp vụ                  |
| ---------------- | ---------------------------------- |
| `OPEN`           | Mới tiếp nhận                      |
| `IN_PROGRESS`    | Đang xử lý                         |
| `WAITING_RENTER` | Chờ renter phản hồi/phối hợp       |
| `RESOLVED`       | Staff cho rằng sự cố đã được xử lý |
| `CLOSED`         | Đã đóng                            |
| `CANCELED`       | Đã hủy                             |

Theo code hiện tại:

- `CLOSED` và `CANCELED` là terminal khi cập nhật trạng thái.
- `RESOLVED` chưa phải terminal.
- Chưa có bảng transition hợp lệ giữa các trạng thái còn lại.

## 5. Quy ước API

### 5.1. Phân trang

Response phân trang dùng cấu trúc chung:

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

Ticket list:

- `page`: mặc định 1.
- `limit`: mặc định 20, tối đa 100.

Comment/attachment:

- `page`: mặc định 1.
- `limit`: mặc định 20, tối đa 50.

### 5.2. Validation

Zod object dùng chế độ strict. Field không được khai báo có thể làm request bị từ chối.

| Field                                | Rule                                       |
| ------------------------------------ | ------------------------------------------ |
| `roomId`, `contractId`, `assignedTo` | Số nguyên dương                            |
| `title`                              | 1–255 ký tự sau trim                       |
| `description`, `message`             | 1–5.000 ký tự sau trim                     |
| `fileUrl`                            | 1–5.000 ký tự; chưa bắt buộc là URL hợp lệ |
| `fileType`                           | 1–50 ký tự                                 |
| `attachments` lúc tạo                | Tối đa 10                                  |

## 6. Tổng hợp endpoint

| Method  | Endpoint                      | Actor             | `x-tenant-id` | Chức năng                  |
| ------- | ----------------------------- | ----------------- | ------------- | -------------------------- |
| `POST`  | `/tickets`                    | `TENANT`          | Không         | Tạo ticket                 |
| `GET`   | `/tickets/me`                 | `TENANT`          | Không         | List ticket của renter     |
| `GET`   | `/tickets/me/:id`             | `TENANT`          | Không         | Detail ticket của renter   |
| `GET`   | `/tickets/me/:id/comments`    | `TENANT`          | Không         | Comment công khai          |
| `GET`   | `/tickets/me/:id/attachments` | `TENANT`          | Không         | Attachment của ticket      |
| `GET`   | `/tickets`                    | Staff G09         | Có            | List ticket trong tenant   |
| `GET`   | `/tickets/:id`                | Staff G09         | Có            | Detail ticket trong tenant |
| `GET`   | `/tickets/:id/comments`       | Staff G09         | Có            | Comment gồm internal       |
| `GET`   | `/tickets/:id/attachments`    | Staff G09         | Có            | Attachment cho staff       |
| `PATCH` | `/tickets/:id/status`         | Staff G09         | Có            | Đổi trạng thái             |
| `PATCH` | `/tickets/:id/assign`         | Staff G09         | Có            | Giao/bỏ giao               |
| `POST`  | `/tickets/:id/comments`       | Renter hoặc staff | Tùy actor     | Thêm comment               |
| `POST`  | `/tickets/:id/attachments`    | Renter hoặc staff | Tùy actor     | Thêm attachment            |

“Staff G09” gồm `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`.

## 7. Tạo ticket

### 7.1. Endpoint

```http
POST /tickets
Authorization: Bearer <renterAccessToken>
Content-Type: application/json
```

### 7.2. Body

```json
{
  "roomId": 25,
  "contractId": 108,
  "title": "Vòi nước nhà vệ sinh bị rò",
  "description": "Nước chảy liên tục từ tối qua.",
  "category": "WATER",
  "priority": "HIGH",
  "attachments": [
    {
      "fileUrl": "https://cdn.example.com/tickets/leak-01.jpg",
      "fileType": "image/jpeg"
    }
  ]
}
```

`contractId`, `priority` và `attachments` có thể bỏ:

- `priority` mặc định `MEDIUM`.
- `attachments` mặc định `[]`.
- Nếu không có `contractId`, backend chọn hợp đồng active mới nhất của user cho room.

### 7.3. Xử lý backend

1. Xác thực role `TENANT`.
2. Áp dụng global throttle và `ticket-create` resource limit.
3. Tìm hợp đồng:
   - `status=ACTIVE`;
   - `deletedAt=null`;
   - đúng `roomId`;
   - room chưa xóa;
   - user là main renter hoặc contract member.
4. Nếu có `contractId`, hợp đồng phải đồng thời khớp ID đó.
5. Trong transaction:
   - tạo `Ticket` trạng thái `OPEN`;
   - lưu `createdById` và `updatedById`;
   - tạo các `TicketAttachment` ban đầu;
   - đọc lại detail bằng renter projection.
6. Sau transaction, gọi G10 thông báo ticket mới cho staff tenant.

Truy vấn hiện chưa kiểm tra `Tenant.status=ACTIVE`. Vì vậy renter có thể tạo ticket từ hợp đồng active thuộc tenant đã `SUSPENDED`/`CLOSED`, trong khi staff tenant-scoped có thể không truy cập được để xử lý.

### 7.4. Response chính

Response gồm ticket detail, room, property, contract, người tạo/người được giao theo projection renter, cùng:

```json
{
  "commentCount": 0,
  "attachmentCount": 1
}
```

Response không nhúng danh sách comment/attachment.

### 7.5. Lỗi

| Trường hợp                         | Kết quả                   |
| ---------------------------------- | ------------------------- |
| Không có hợp đồng active hợp lệ    | `NotFound`                |
| `contractId` không thuộc room/user | `NotFound`                |
| Body sai enum/validation           | `BadRequest`              |
| Quá rate limit                     | HTTP 429 và `Retry-After` |

## 8. List và detail ticket

### 8.1. Query list

| Query           | Ý nghĩa                                          |
| --------------- | ------------------------------------------------ |
| `page`, `limit` | Phân trang                                       |
| `status`        | Lọc trạng thái                                   |
| `category`      | Lọc danh mục                                     |
| `priority`      | Lọc ưu tiên                                      |
| `roomId`        | Lọc phòng                                        |
| `contractId`    | Lọc hợp đồng                                     |
| `assignedTo`    | Lọc assignee                                     |
| `search`        | Title, description, room code hoặc tên người tạo |

### 8.2. Renter list/detail

```http
GET /tickets/me?status=IN_PROGRESS&priority=HIGH&page=1&limit=20
Authorization: Bearer <renterAccessToken>
```

```http
GET /tickets/me/501
Authorization: Bearer <renterAccessToken>
```

Renter projection:

- Không có email/phone của người tạo hoặc assignee.
- Không có `description` trong summary; detail có description.
- `commentCount` chỉ đếm comment công khai.
- `attachmentCount` đếm toàn bộ attachment.

Ticket không thuộc phạm vi được trả `NotFound` để không lộ sự tồn tại.

### 8.3. Staff list/detail

```http
GET /tickets?status=OPEN&category=WATER&search=A-203&page=1&limit=20
Authorization: Bearer <staffAccessToken>
x-tenant-id: 7
```

```http
GET /tickets/501
Authorization: Bearer <staffAccessToken>
x-tenant-id: 7
```

Staff projection có thể gồm email/phone của người tạo và assignee. List được sắp:

1. `priority` giảm dần.
2. `createdAt` mới nhất trước.

## 9. Comment và attachment

### 9.1. Đọc comment

Renter:

```http
GET /tickets/me/501/comments?page=1&limit=20
Authorization: Bearer <renterAccessToken>
```

Chỉ trả comment `isInternal=false`; user trong comment chỉ có `id`, `fullName`.

Staff:

```http
GET /tickets/501/comments?page=1&limit=20
Authorization: Bearer <staffAccessToken>
x-tenant-id: 7
```

Trả cả comment công khai và nội bộ; user có thể gồm email.

Comment được sắp tăng dần theo `createdAt`, sau đó `id`.

### 9.2. Thêm comment

```http
POST /tickets/501/comments
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "message": "Kỹ thuật sẽ đến kiểm tra lúc 14:00.",
  "isInternal": false
}
```

Staff có thể tạo internal comment:

```json
{
  "message": "Cần thay van khóa, dự kiến chi phí 250.000 đồng.",
  "isInternal": true
}
```

Renter gửi `isInternal=true` nhận `Forbidden`.

### 9.3. Đọc attachment

```http
GET /tickets/me/501/attachments?page=1&limit=20
Authorization: Bearer <renterAccessToken>
```

```http
GET /tickets/501/attachments?page=1&limit=20
Authorization: Bearer <staffAccessToken>
x-tenant-id: 7
```

Renter không nhận email uploader. Staff có thể nhận email để phục vụ vận hành.

### 9.4. Thêm attachment

```http
POST /tickets/501/attachments
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "fileUrl": "https://cdn.example.com/tickets/repair-result.jpg",
  "fileType": "image/jpeg"
}
```

Đây là API tạo metadata, không phải upload file.

### 9.5. Hard cap và concurrency

Khi thêm comment/attachment:

1. Transaction khóa row ticket bằng `SELECT ... FOR UPDATE`.
2. Đếm tổng relation hiện tại.
3. So với cấu hình hard cap.
4. Nếu đạt giới hạn, trả `Conflict` với mã `TICKET_RELATION_LIMIT_REACHED`.
5. Nếu chưa đạt, tạo relation trong cùng transaction.

Default:

| Cấu hình                     | Giá trị |
| ---------------------------- | ------- |
| `TICKET_COMMENT_HARD_CAP`    | 500     |
| `TICKET_ATTACHMENT_HARD_CAP` | 50      |

## 10. Phân công ticket

### 10.1. Giao ticket

```http
PATCH /tickets/501/assign
Authorization: Bearer <staffAccessToken>
x-tenant-id: 7
Content-Type: application/json

{
  "assignedTo": 88
}
```

Điều kiện:

- Ticket thuộc tenant context.
- Ticket không ở `CLOSED` hoặc `CANCELED`.
- User 88 là active tenant member.
- Role của user 88 thuộc `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`.

Nếu ticket đang `OPEN`, thao tác giao tự chuyển sang `IN_PROGRESS`.

### 10.2. Bỏ phân công

```json
{
  "assignedTo": null
}
```

Bỏ phân công không tự đổi trạng thái. Ví dụ ticket `IN_PROGRESS` vẫn giữ `IN_PROGRESS`.

### 10.3. Side effect

Backend gọi G10 sau khi update:

- Emit `ticket.updated` cho người tạo và assignee mới.
- Tạo notification `TICKET`.
- Enqueue push notification nếu có device token.

Assignee cũ hiện không được thông báo riêng.

## 11. Cập nhật trạng thái

### 11.1. Endpoint

```http
PATCH /tickets/501/status
Authorization: Bearer <staffAccessToken>
x-tenant-id: 7
Content-Type: application/json

{
  "status": "RESOLVED"
}
```

### 11.2. Quy tắc hiện hành

| Trạng thái cũ   | Trạng thái mới     | Hành vi             |
| --------------- | ------------------ | ------------------- |
| `CLOSED`        | Khác `CLOSED`      | Từ chối             |
| `CANCELED`      | Khác `CANCELED`    | Từ chối             |
| `CLOSED`        | `CLOSED`           | Cho phép update lặp |
| `CANCELED`      | `CANCELED`         | Cho phép update lặp |
| Trạng thái khác | Bất kỳ enum hợp lệ | Hiện cho phép       |

`resolvedAt`:

- Đặt bằng thời điểm hiện tại khi status mới là `RESOLVED` hoặc `CLOSED`.
- Đặt `null` khi status mới là trạng thái khác.

Hệ thống chưa có state machine đầy đủ. Ví dụ `OPEN → CLOSED` và `RESOLVED → OPEN` hiện vẫn có thể xảy ra.

## 12. Rate limit

G09 chịu global rate limit của hệ thống và resource rate limit riêng cho thao tác ghi.

| Profile             | Endpoint                        | Default trong 1 giờ |
| ------------------- | ------------------------------- | ------------------- |
| `ticket-create`     | `POST /tickets`                 | 10                  |
| `ticket-comment`    | `POST /tickets/:id/comments`    | 60                  |
| `ticket-attachment` | `POST /tickets/:id/attachments` | 30                  |

Window mặc định: `TICKET_WRITE_RATE_TTL_MS=3.600.000`.

Bucket dùng HMAC của `userId`, không lưu user ID thô trong Redis key. Khi bị chặn:

- HTTP 429.
- Header `Retry-After`.
- Security event được ghi log.

Các giá trị trên có thể được override bằng biến môi trường.

## 13. G10 integration

### 13.1. Ticket mới

Recipient:

- Tenant owner.
- Active member role `LANDLORD`.
- Active member role `MANAGER`.
- Active member role `MAINTENANCE_STAFF`.
- Loại user tạo ticket khỏi danh sách.
- Loại ID trùng.

### 13.2. Ticket được cập nhật

Các thao tác status, assignment, comment và attachment đều gọi cùng `notifyTicketUpdated`.

Recipient hiện tại:

- `createdById`.
- `assignedTo` hiện tại.

Nội dung notification hiện dùng chung “Ticket được cập nhật” và mô tả status hiện tại, kể cả khi thay đổi thực tế chỉ là comment hoặc attachment.

Chi tiết delivery xem G10.

## 14. Lỗi thường gặp

| Tình huống                               | Kết quả chính             |
| ---------------------------------------- | ------------------------- |
| Renter không có hợp đồng active cho room | `NotFound`                |
| Ticket không thuộc renter                | `NotFound`                |
| Ticket không thuộc tenant hiện tại       | `NotFound`                |
| Thiếu `x-tenant-id` ở API staff          | `TENANT_CONTEXT_REQUIRED` |
| Membership/tenant không hợp lệ           | `TENANT_ACCESS_DENIED`    |
| Role không được phép                     | `Forbidden`               |
| Renter tạo internal comment              | `Forbidden`               |
| Assignee không hợp lệ                    | `BadRequest`              |
| Assign ticket terminal                   | `BadRequest`              |
| Chuyển ticket terminal sang status khác  | `BadRequest`              |
| Vượt comment/attachment hard cap         | `Conflict`                |
| Body/query sai Zod schema                | `BadRequest`              |
| Vượt rate limit                          | HTTP 429                  |

## 15. Ví dụ hành trình hoàn chỉnh

### 15.1. Renter tạo và theo dõi

```bash
curl -X POST "http://localhost:3000/tickets" \
  -H "Authorization: Bearer $RENTER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 25,
    "title": "Mất điện ổ cắm gần cửa",
    "description": "Các ổ khác vẫn hoạt động bình thường.",
    "category": "ELECTRICITY",
    "priority": "HIGH",
    "attachments": []
  }'

curl "http://localhost:3000/tickets/me?status=OPEN&page=1&limit=20" \
  -H "Authorization: Bearer $RENTER_TOKEN"
```

### 15.2. Staff lọc và phân công

```bash
curl "http://localhost:3000/tickets?status=OPEN&priority=HIGH" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "x-tenant-id: 7"

curl -X PATCH "http://localhost:3000/tickets/501/assign" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "x-tenant-id: 7" \
  -H "Content-Type: application/json" \
  -d '{"assignedTo":88}'
```

### 15.3. Trao đổi và hoàn tất

```bash
curl -X POST "http://localhost:3000/tickets/501/comments" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "x-tenant-id: 7" \
  -H "Content-Type: application/json" \
  -d '{"message":"Đã thay ổ cắm, chờ người thuê kiểm tra.","isInternal":false}'

curl -X PATCH "http://localhost:3000/tickets/501/status" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "x-tenant-id: 7" \
  -H "Content-Type: application/json" \
  -d '{"status":"RESOLVED"}'
```

Renter hiện chưa có endpoint xác nhận kết quả và đóng ticket; đây là backlog.

## 16. Chức năng chưa hoàn thiện và hướng triển khai

Các API đề xuất trong phần này đều **chưa tồn tại**.

### 16.1. State machine, quyền và concurrency

| #   | Hiện trạng                                  | Ảnh hưởng                      | Hướng triển khai                                      | Dependency        | Tiêu chí hoàn thành                 |
| --- | ------------------------------------------- | ------------------------------ | ----------------------------------------------------- | ----------------- | ----------------------------------- |
| 1   | Chỉ khóa `CLOSED`/`CANCELED`                | Có transition không hợp lệ     | Khai báo transition matrix theo actor                 | Product rule      | Unit/integration test mọi cạnh      |
| 2   | Renter không có cancel/confirm/close/reopen | Hành trình thiếu bước xác nhận | Thêm action API riêng cho renter                      | State machine     | Renter chỉ action ticket của mình   |
| 3   | Cho phép `OPEN → CLOSED`, `RESOLVED → OPEN` | Mất ý nghĩa lifecycle          | Bắt buộc luồng OPEN → IN_PROGRESS → RESOLVED → CLOSED | State machine     | Request sai trả Conflict/BadRequest |
| 4   | Terminal ticket vẫn nhận relation           | Lịch sử có thể bị sửa sau đóng | Quy định read-only hoặc reopen trước khi ghi          | Product rule      | Comment/attachment terminal bị chặn |
| 5   | Status/assign update không CAS              | Request đồng thời ghi đè       | Thêm version hoặc conditional update                  | Prisma/PostgreSQL | Chỉ một transition thắng            |
| 6   | Maintenance staff thấy/sửa toàn tenant      | Quyền rộng hơn nhu cầu         | Policy assigned-only hoặc permission riêng            | RBAC G01          | Test assigned/unassigned/cross-user |

### 16.2. Lịch sử, SLA và vận hành bảo trì

| #   | Hiện trạng                         | Ảnh hưởng                      | Hướng triển khai                    | Dependency                | Tiêu chí hoàn thành                |
| --- | ---------------------------------- | ------------------------------ | ----------------------------------- | ------------------------- | ---------------------------------- |
| 7   | Không có transition history        | Không truy vết được            | Thêm `TicketStatusHistory`          | Migration/audit           | Lưu actor, from/to, time, note     |
| 8   | Không có assignment history        | Không biết ai từng phụ trách   | Lưu event giao/bỏ giao              | Audit                     | Timeline đầy đủ                    |
| 9   | Không có SLA/due date              | Không đo ticket trễ            | Cấu hình SLA theo priority/category | Scheduler/G10             | Cảnh báo quá hạn đúng giờ          |
| 10  | Không có first response metric     | Không đo chất lượng hỗ trợ     | Lưu `firstRespondedAt`              | Comment/status events     | Chỉ set lần đầu                    |
| 11  | Không có work order/chi phí/vật tư | Không quản lý sửa chữa thực tế | Thiết kế work order liên kết ticket | Module bảo trì            | Theo dõi nhân công, vật tư, vendor |
| 12  | Không có preventive maintenance    | Chỉ xử lý sự cố bị động        | Thêm lịch bảo trì định kỳ           | Scheduler/property assets | Sinh task đúng chu kỳ              |

### 16.3. Attachment và comment

| #   | Hiện trạng                                   | Ảnh hưởng                        | Hướng triển khai                    | Dependency       | Tiêu chí hoàn thành               |
| --- | -------------------------------------------- | -------------------------------- | ----------------------------------- | ---------------- | --------------------------------- |
| 13  | Chỉ nhận URL tùy ý                           | URL giả hoặc ngoài quyền sở hữu  | Upload ticket riêng, signed URL     | Storage          | File thuộc đúng user/ticket       |
| 14  | `fileType` là chuỗi tự do                    | Không tin cậy MIME               | Sniff MIME phía server              | Upload service   | Chặn file không hỗ trợ            |
| 15  | Không giới hạn byte/virus scan tại G09       | Rủi ro bảo mật                   | Size limit, allowlist, malware scan | Storage/security | Test file quá lớn/độc hại         |
| 16  | Không xóa attachment                         | Không sửa được file sai          | API soft-delete attachment          | Audit/storage    | Xóa metadata và file an toàn      |
| 17  | Không sửa/xóa comment                        | Không xử lý nội dung sai         | Policy edit window/soft delete      | Audit            | Giữ lịch sử chỉnh sửa             |
| 18  | Hard cap ban đầu và relation cần kiểm thử DB | Chưa chứng minh concurrency thật | PostgreSQL integration test         | Test container   | Không vượt cap khi chạy song song |

### 16.4. Chat, notification và dữ liệu

| #   | Hiện trạng                                            | Ảnh hưởng                       | Hướng triển khai                                | Dependency      | Tiêu chí hoàn thành             |
| --- | ----------------------------------------------------- | ------------------------------- | ----------------------------------------------- | --------------- | ------------------------------- |
| 19  | `Conversation`/`Message` chỉ có schema                | Chưa có chat realtime ticket    | Thiết kế API/gateway hoặc giữ comment           | Product/G10     | Quyết định một nguồn trao đổi   |
| 20  | Comment/attachment dùng status notification           | Nội dung gây hiểu nhầm          | Event riêng `COMMENT_ADDED`, `ATTACHMENT_ADDED` | G10 templates   | Payload và nội dung đúng action |
| 21  | Không loại actor cập nhật                             | User tự nhận notification       | Truyền `actorId`, loại actor                    | G10             | Không self-notify ngoài policy  |
| 22  | Không báo assignee cũ                                 | Người cũ không biết đã bàn giao | Event reassignment gồm old/new                  | G10             | Hai bên nhận đúng thông báo     |
| 23  | Co-renter không phải creator có thể không được notify | Người liên quan bỏ lỡ cập nhật  | Xác định recipient theo contract members        | G05/G10         | Recipient matrix được test      |
| 24  | Có `deletedById` nhưng không `deletedAt`              | Soft delete không hoàn chỉnh    | Bổ sung lifecycle archive/delete                | Migration/audit | Query mặc định loại dữ liệu xóa |

### 16.5. Kiểm thử, hiệu năng và retention

| #   | Hiện trạng                       | Ảnh hưởng                               | Hướng triển khai                              | Dependency         | Tiêu chí hoàn thành                |
| --- | -------------------------------- | --------------------------------------- | --------------------------------------------- | ------------------ | ---------------------------------- |
| 25  | Chưa có E2E tenant A/B           | Chưa chứng minh isolation               | HTTP + PostgreSQL E2E                         | Test env           | Không đọc/ghi cross-tenant         |
| 26  | Chưa E2E toàn hành trình         | Có thể lỗi tích hợp                     | Renter create → assign → resolve → close      | G10/test env       | State và notification đúng         |
| 27  | Chưa kiểm Redis rate limit thật  | Khác biệt mock/runtime                  | Integration test Redis                        | Redis test         | Bucket và Retry-After đúng         |
| 28  | Search/list chưa benchmark       | Có thể chậm khi dữ liệu lớn             | Seed tải và EXPLAIN ANALYZE                   | PostgreSQL         | Đạt latency mục tiêu               |
| 29  | Index chưa phủ mọi filter        | Query tổ hợp có thể scan                | Đánh giá room/contract/category/priority/time | DBA                | Plan dùng index phù hợp            |
| 30  | Không có retention/archive       | Dữ liệu/file tăng vô hạn                | Chính sách archive và storage lifecycle       | Compliance/storage | Job chạy an toàn, có audit         |
| 31  | Create không lọc tenant `ACTIVE` | Sinh ticket nhưng staff không thể xử lý | Thêm tenant status vào contract lookup        | G01/G02            | Suspended/closed tenant bị từ chối |

## 17. Thứ tự ưu tiên backlog

1. State machine, tenant status, terminal-write policy và quyền maintenance staff.
2. Upload an toàn, attachment ownership và chống ghi đè concurrent.
3. Lịch sử transition/assignment, SLA và renter confirm/close/reopen.
4. Chuẩn hóa notification theo action và recipient.
5. Work order, chat, retention, hiệu năng và E2E.

## 18. Checklist kiểm thử tài liệu

### 18.1. Renter

- [ ] Tạo ticket khi là main renter của hợp đồng active.
- [ ] Tạo ticket khi là contract member.
- [ ] Không tạo ticket cho room/hợp đồng người khác.
- [ ] Không đọc internal comment.
- [ ] Không nhận email/phone staff.
- [ ] Không tạo `isInternal=true`.

### 18.2. Staff và tenant

- [ ] Thiếu `x-tenant-id` bị từ chối.
- [ ] Không đọc ticket tenant khác.
- [ ] Assignee phải là active member có role hợp lệ.
- [ ] Assign `OPEN` chuyển `IN_PROGRESS`.
- [ ] Unassign không tự đổi status.
- [ ] Terminal ticket không thể chuyển sang trạng thái khác.

### 18.3. Limit và concurrency

- [ ] Resource limit trả 429 và `Retry-After`.
- [ ] Comment hard cap trả Conflict.
- [ ] Attachment hard cap trả Conflict.
- [ ] Hai request song song không vượt hard cap.
- [ ] List/detail không hydrate relation.

### 18.4. G10

- [ ] Ticket mới thông báo đúng staff.
- [ ] Update thông báo creator/assignee.
- [ ] Renter không nhận nội dung internal comment trong notification payload.
- [ ] Notification failure được nhận diện là khoảng trống outbox.

## 19. Tiêu chí nghiệm thu tài liệu

- Người mới hiểu ticket thuộc tenant nào và ai được xem.
- Frontend biết chính xác header, body, query và endpoint relation.
- Staff hiểu assignment, status và giới hạn state machine hiện tại.
- Tester có case visibility, PII, internal comment, tenant isolation, rate limit và hard cap.
- Backend developer hiểu transaction tạo ticket và row lock relation.
- Phần chưa hoàn thiện phân biệt rõ code hiện hành với API tương lai.
- Chat, upload vật lý, history, SLA và work order không bị mô tả như đã hoạt động.

## 20. Nguồn mã đối chiếu

- `backend/src/modules/tickets/tickets.controller.ts`
- `backend/src/modules/tickets/model/tickets.model.ts`
- `backend/src/modules/tickets/tickets.service.ts`
- `backend/src/modules/tickets/repositories/tickets.repo.ts`
- `backend/src/common/rate-limit/resource-rate-limit.guard.ts`
- `backend/src/config/env.config.ts`
- `backend/src/modules/notifications/notification-events.service.ts`
- `backend/prisma/schema.prisma`
