# G10 - Đặc tả thông báo nội bộ, realtime và push notification

> **Snapshot 03/08/2026:** Boolean filter tường minh, type/payload chuẩn hóa cho marketplace và rental request, Socket.IO CORS allowlist, enqueue failure bookkeeping, FCM retry/disable token và event coverage G04/G09 đã được triển khai. Redis/Firebase staging và Socket cross-user E2E vẫn cần môi trường ngoài. Các nhận định “chưa có” ở snapshot 31/07 trong phần phân tích lịch sử được thay thế bởi snapshot này.

## 1. Tổng quan

G10 mô tả cách hệ thống tạo, lưu, đọc và phân phối thông báo đến người dùng. Một business event có thể tạo ba hình thức tiếp nhận:

1. Notification nội bộ lưu trong PostgreSQL.
2. Realtime event qua Socket.IO.
3. Push notification qua BullMQ và Firebase Cloud Messaging.

Mục tiêu của tài liệu:

- Người dùng biết cách đọc và đánh dấu thông báo.
- Frontend/mobile biết REST là nguồn dữ liệu bền vững và realtime/push là kênh delivery.
- Backend biết sự kiện nào đã tích hợp, recipient nào được chọn và pipeline retry hoạt động ra sao.
- Ops biết các dependency Redis, BullMQ và Firebase.
- Tester biết cách kiểm tra API, Socket.IO, device token và worker.
- Người lập kế hoạch biết các khoảng trống về outbox, idempotency, security và event coverage.

G10 tương ứng chủ yếu với FR-24.

### 1.1. Phạm vi

- Danh sách notification của user hiện tại.
- Filter theo type và trạng thái đã đọc.
- Đếm notification chưa đọc.
- Đánh dấu một hoặc toàn bộ notification đã đọc.
- Tạo notification thử nghiệm.
- Đăng ký và vô hiệu hóa device token.
- Phát realtime event theo user room.
- Tạo background job và enqueue BullMQ.
- Gửi push bằng Firebase Cloud Messaging.
- Cập nhật trạng thái job và health của device token.
- Event từ invoice, payment, ticket, marketplace, rental request và viewing appointment.

### 1.2. Ngoài phạm vi

| Nội dung                               | Tài liệu/ghi chú          |
| -------------------------------------- | ------------------------- |
| Nghiệp vụ nguồn invoice/payment/ticket | G07–G09                   |
| Contract event                         | G05; chưa nối G10         |
| Email/SMS                              | Không phải kênh hiện hành |
| Dashboard queue/notification           | G11 hoặc backlog          |
| Admin broadcast                        | Chưa có API               |
| Notification preference                | Chưa triển khai           |

### 1.3. Ba lớp delivery

```text
Business event
   └── Notification trong PostgreSQL
       ├── Socket.IO realtime
       └── BackgroundJob + BullMQ
           └── Firebase Cloud Messaging
               └── DeviceToken
```

Notification trong database là nguồn dữ liệu để client đồng bộ lại. Socket.IO và FCM giúp nhận nhanh hơn nhưng không thay thế `GET /notifications`.

### 1.4. Trạng thái triển khai

| Thành phần                    | Trạng thái hiện tại   | Ghi chú                                           |
| ----------------------------- | --------------------- | ------------------------------------------------- |
| Notification nội bộ           | Đã triển khai         | Boolean codec xử lý đúng `true/false`              |
| Socket.IO theo user room      | Đã triển khai         | Token bắt buộc, CORS allowlist, chỉ room theo user |
| Device token                  | Đã có API             | Register và disable                               |
| BullMQ background job         | Đã triển khai         | Retry 5 lần; enqueue lỗi ghi `FAILED` best-effort  |
| Firebase push                 | Đã tích hợp code      | Chưa chứng minh credential/FCM thật               |
| Invoice event                 | Đã tích hợp           | Issued và overdue                                 |
| Payment event                 | Đã tích hợp           | Pending và reviewed                               |
| Ticket event                  | Đã tích hợp           | Created/assigned/status/comment/attachment        |
| Contract event                | Chưa tích hợp         | Enum đã có                                        |
| Appointment/rental request    | Đã tích hợp           | Type và payload điều hướng riêng                  |
| Preference/template/retention | Chưa có               | Backlog                                           |

### 1.5. Không dùng nhãn trạng thái cũ

Một số tài liệu cũ mô tả push notification và queue chỉ là schema/nền tảng mở rộng. Mã nguồn hiện tại đã có:

- `NotificationsGateway`.
- `NotificationsProcessor`.
- `FirebaseProvider` và `FirebasePushService`.
- Queue `notifications`.
- `BackgroundJob` persistence.
- Device token lifecycle.

Vì chưa có bằng chứng kiểm thử external infrastructure, tài liệu dùng nhãn: **đã có code, chưa chứng minh môi trường thật**.

## 2. Actor, xác thực và tenant context

### 2.1. HTTP API

Mọi HTTP API G10:

- Đều protected.
- Dùng `Authorization: Bearer <accessToken>`.
- Phục vụ chính user hiện tại.
- Không cần `x-tenant-id`.

Service luôn lọc notification hoặc device token bằng `userId` lấy từ access token. User không thể truyền `userId` trong body để đọc dữ liệu người khác.

### 2.2. Ý nghĩa `tenantId`

`Notification.tenantId` là metadata nguồn:

- Có giá trị khi event phát sinh trong một tenant.
- Có thể `null` với system notification.
- Không được dùng làm điều kiện sở hữu notification.

Quyền đọc dựa trên `Notification.userId`.

### 2.3. Socket authentication

Namespace:

```text
/notifications
```

Client gửi access token theo một trong hai cách:

```javascript
io('http://localhost:3000/notifications', {
  auth: { token: accessToken },
})
```

hoặc:

```http
Authorization: Bearer <accessToken>
```

`auth.token` có thể chứa chuỗi token thô hoặc `Bearer <token>`.

Kết nối hợp lệ được join room nội bộ:

```text
user:<userId>
```

Client không tự chọn room.

## 3. Mô hình dữ liệu

### 3.1. Notification

| Field       | Ý nghĩa                           |
| ----------- | --------------------------------- |
| `id`        | ID notification                   |
| `userId`    | Người nhận                        |
| `tenantId`  | Tenant nguồn, có thể `null`       |
| `title`     | Tiêu đề                           |
| `content`   | Nội dung                          |
| `type`      | Nhóm nghiệp vụ                    |
| `data`      | JSON phục vụ điều hướng/deep-link |
| `isRead`    | Đã đọc hay chưa                   |
| `readAt`    | Thời điểm đọc                     |
| `createdAt` | Thời điểm tạo                     |

`data` chưa có schema/version public ổn định. Client cần kiểm tra field trước khi dùng.

### 3.2. DeviceToken

| Field          | Ý nghĩa                              |
| -------------- | ------------------------------------ |
| `id`           | ID bản ghi thiết bị                  |
| `userId`       | Chủ sở hữu                           |
| `token`        | FCM registration token               |
| `fid`          | Firebase Installation ID tùy chọn    |
| `platform`     | `IOS`, `ANDROID`, `WEB`              |
| `deviceName`   | Tên hiển thị tùy chọn                |
| `isActive`     | Có được dùng để push không           |
| `lastSeenAt`   | Lần gần nhất client register/refresh |
| `lastUsedAt`   | Lần gần nhất backend thử gửi         |
| `failureCount` | Số lỗi gửi đã ghi nhận               |
| `lastError`    | Mã lỗi FCM gần nhất                  |
| `disabledAt`   | Thời điểm bị vô hiệu hóa             |

Unique hiện tại là cặp `(userId, token)`, không phải unique toàn hệ thống theo token.

### 3.3. BackgroundJob

| Field                        | Ý nghĩa                            |
| ---------------------------- | ---------------------------------- |
| `tenantId`                   | Tenant nguồn, có thể `null`        |
| `queueName`                  | `notifications`                    |
| `externalJobId`              | ID BullMQ sau khi enqueue          |
| `jobType`                    | `send-push`                        |
| `payload`                    | `notificationId`, `userId`, `type` |
| `status`                     | Trạng thái worker                  |
| `attempts`                   | Số lần thử                         |
| `errorMessage`               | Lỗi gần nhất                       |
| `processedAt`, `completedAt` | Mốc xử lý                          |

## 4. Enum

### 4.1. NotificationType

| Giá trị       | Ý nghĩa            | Event hiện hành       |
| ------------- | ------------------ | --------------------- |
| `INVOICE`     | Hóa đơn            | Có                    |
| `PAYMENT`     | Thanh toán         | Có                    |
| `CONTRACT`    | Hợp đồng           | Chưa có event handler |
| `TICKET`      | Sự cố/bảo trì      | Có                    |
| `APPOINTMENT` | Lịch xem phòng     | Chưa có event handler |
| `SYSTEM`      | Thông báo hệ thống | Có test notification  |

Rental request chưa có enum riêng và chưa phát notification.

### 4.2. DevicePlatform

- `IOS`
- `ANDROID`
- `WEB`

### 4.3. BackgroundJobStatus

| Giá trị     | Ý nghĩa                      |
| ----------- | ---------------------------- |
| `WAITING`   | Đã tạo trong DB, chờ worker  |
| `ACTIVE`    | Worker đang xử lý            |
| `RETRYING`  | Lỗi và BullMQ còn lượt retry |
| `COMPLETED` | Đã kết thúc xử lý            |
| `FAILED`    | Hết lượt retry               |

`COMPLETED` không đồng nghĩa mọi thiết bị nhận push. Job vẫn hoàn thành nếu:

- User không có active token.
- Một số token gửi lỗi nhưng FCM trả response bình thường.
- Invalid token đã được disable.

## 5. Tổng hợp interface

### 5.1. HTTP API

| Method   | Endpoint                      | Body/query                          | Chức năng                 |
| -------- | ----------------------------- | ----------------------------------- | ------------------------- |
| `GET`    | `/notifications`              | `page`, `limit`, `type?`, `isRead?` | List của user             |
| `GET`    | `/notifications/unread-count` | Không                               | Đếm unread                |
| `PATCH`  | `/notifications/:id/read`     | `{}`                                | Đánh dấu một notification |
| `PATCH`  | `/notifications/read-all`     | `{}`                                | Đánh dấu tất cả           |
| `POST`   | `/notifications/test`         | `{}`                                | Tạo notification test     |
| `POST`   | `/device-tokens`              | Token và device metadata            | Register/upsert           |
| `DELETE` | `/device-tokens/:id`          | Không                               | Disable token             |

### 5.2. Socket.IO event

| Event                  | Ý nghĩa                        |
| ---------------------- | ------------------------------ |
| `notification.created` | Notification mới đã được tạo   |
| `notification.read`    | Trạng thái đọc thay đổi        |
| `ticket.updated`       | Ticket liên quan được cập nhật |

## 6. Danh sách và trạng thái đọc

### 6.1. List notification

```http
GET /notifications?page=1&limit=20&type=INVOICE&isRead=true
Authorization: Bearer <accessToken>
```

Query:

| Field    | Rule                                     |
| -------- | ---------------------------------------- |
| `page`   | Số nguyên dương, mặc định 1              |
| `limit`  | Số nguyên dương, mặc định 20, tối đa 100 |
| `type`   | `NotificationType`, optional             |
| `isRead` | Boolean coercion, optional               |

Giới hạn hiện tại: query string luôn đi vào Zod dưới dạng chuỗi và schema dùng `z.coerce.boolean()`. Với phiên bản Zod của dự án:

- `"true"` → `true`.
- `"false"` → `true`.
- `"1"` và `"0"` → `true`.
- Chỉ chuỗi rỗng mới thành `false`.

Vì vậy `?isRead=false` hiện lọc notification đã đọc thay vì unread. Frontend chưa nên dựa vào filter unread này cho đến khi backend chuyển sang parser boolean tường minh.

Response:

```json
{
  "data": [
    {
      "id": 1001,
      "userId": 42,
      "tenantId": 7,
      "title": "Hóa đơn mới",
      "content": "Hóa đơn INV-202607-001 đã được phát hành.",
      "type": "INVOICE",
      "data": {
        "sourceType": "INVOICE",
        "sourceId": 801,
        "invoiceCode": "INV-202607-001"
      },
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-07-24T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Sắp xếp theo `createdAt` mới nhất, sau đó `id` giảm dần.

### 6.2. Unread count

```http
GET /notifications/unread-count
Authorization: Bearer <accessToken>
```

Service trả số lượng unread của user hiện tại.

### 6.3. Đánh dấu một notification

```http
PATCH /notifications/1001/read
Authorization: Bearer <accessToken>
Content-Type: application/json

{}
```

Luồng:

1. Tìm notification theo cả `id` và `userId`.
2. Không tìm thấy: `NotFound`.
3. Nếu đã đọc: trả bản ghi hiện tại, không ghi lại `readAt`.
4. Nếu chưa đọc: đặt `isRead=true`, `readAt=now`.
5. Emit `notification.read` cho user room.

Endpoint có tính idempotent ở mức trạng thái đọc.

### 6.4. Đánh dấu tất cả

```http
PATCH /notifications/read-all
Authorization: Bearer <accessToken>
Content-Type: application/json

{}
```

Backend:

- Update tất cả notification `isRead=false` của user.
- Đặt cùng thời điểm đọc theo câu lệnh update.
- Đếm lại unread.
- Trả `{ "unreadCount": 0 }` trong trạng thái bình thường.
- Emit `notification.read` với payload:

```json
{
  "all": true,
  "unreadCount": 0
}
```

## 7. Notification test

```http
POST /notifications/test
Authorization: Bearer <accessToken>
Content-Type: application/json

{}
```

Endpoint tạo một notification:

```json
{
  "title": "Thông báo thử nghiệm",
  "content": "Firebase FCM và thông báo nội bộ đã sẵn sàng.",
  "type": "SYSTEM",
  "data": {
    "sourceType": "SYSTEM",
    "sourceId": "test"
  }
}
```

Notification được lưu, emit realtime và enqueue push như event nghiệp vụ thật.

Endpoint hiện cho phép mọi authenticated user gọi và chưa có resource rate limit riêng.

## 8. Device token

### 8.1. Register/upsert

```http
POST /device-tokens
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "token": "fcm-registration-token",
  "fid": "firebase-installation-id",
  "platform": "ANDROID",
  "deviceName": "Samsung S23"
}
```

Validation:

| Field        | Rule                    |
| ------------ | ----------------------- |
| `token`      | Bắt buộc, 1–5.000 ký tự |
| `fid`        | Optional, 1–255 ký tự   |
| `platform`   | `IOS`, `ANDROID`, `WEB` |
| `deviceName` | Optional, 1–100 ký tự   |

Upsert theo `(userId, token)`.

Khi tạo:

- `isActive=true`.
- `lastSeenAt=now`.

Khi register lại:

- Cập nhật `fid`, `platform`, `deviceName`.
- Kích hoạt lại token.
- Xóa `disabledAt`.
- Reset `failureCount=0`, `lastError=null`.
- Cập nhật `lastSeenAt`.

Response hiện trả cả chuỗi token.

### 8.2. Disable

```http
DELETE /device-tokens/301
Authorization: Bearer <accessToken>
```

Backend update bằng cả `id` và `userId`:

- `isActive=false`.
- `disabledAt=now`.

Token bị disable không được worker chọn để gửi push.

Nếu ID không thuộc user, repository hiện dựa vào lỗi update của Prisma và chưa map thành `NotFound` nghiệp vụ rõ ràng.

### 8.3. Không có list device

Hiện chưa có:

- `GET /device-tokens`.
- Đổi tên thiết bị độc lập.
- Logout một thiết bị theo FID.
- Logout tất cả thiết bị.

Client cần lưu ID trả về khi register nếu muốn disable chính xác.

## 9. Socket.IO realtime

### 9.1. Kết nối

```javascript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000/notifications', {
  auth: {
    token: accessToken,
  },
})

socket.on('connect', () => {
  console.log('Connected', socket.id)
})

socket.on('disconnect', (reason) => {
  console.log('Disconnected', reason)
})
```

Thiếu token hoặc verify JWT lỗi làm server disconnect client.

### 9.2. `notification.created`

```javascript
socket.on('notification.created', (notification) => {
  notificationStore.prepend(notification)
  notificationStore.unreadCount += 1
})
```

Payload là notification select đầy đủ.

Client nên deduplicate theo `notification.id` vì reconnect hoặc đồng bộ REST có thể đưa cùng bản ghi vào store.

### 9.3. `notification.read`

Một notification:

```json
{
  "id": 1001,
  "isRead": true,
  "readAt": "2026-07-24T10:30:00.000Z"
}
```

Read all:

```json
{
  "all": true,
  "unreadCount": 0
}
```

### 9.4. `ticket.updated`

```json
{
  "ticketId": 501,
  "status": "IN_PROGRESS"
}
```

Event này giúp màn hình ticket refresh nhanh. Cùng thao tác có thể đồng thời tạo:

- `ticket.updated`.
- `notification.created`.

Frontend không được tăng đôi một business event. Hai event phục vụ hai store khác nhau: ticket state và notification inbox.

### 9.5. REST vẫn là nguồn đồng bộ

Socket event không có replay/cursor. Khi reconnect:

1. Gọi `GET /notifications`.
2. Gọi `GET /notifications/unread-count`.
3. Merge theo notification ID.
4. Tiếp tục lắng nghe realtime.

## 10. Nguồn event và recipient

### 10.1. Invoice

| Event           | Recipient          | Nội dung chính  |
| --------------- | ------------------ | --------------- |
| Invoice issued  | `invoice.renterId` | Hóa đơn mới     |
| Invoice overdue | `invoice.renterId` | Hóa đơn quá hạn |

Type: `INVOICE`.

Payload có thể gồm invoice ID/code, amount, due date hoặc debt amount.

### 10.2. Payment

Payment pending:

- Tenant owner.
- Active member `LANDLORD`.
- Active member `MANAGER`.
- Active member `ACCOUNTANT`.
- Loại recipient trùng.

Payment reviewed:

- Payer của payment.
- Nội dung khác nhau giữa `SUCCESS` và trạng thái bị từ chối.

Type: `PAYMENT`.

### 10.3. Ticket

Ticket created:

- Tenant owner.
- Active member `LANDLORD`.
- Active member `MANAGER`.
- Active member `MAINTENANCE_STAFF`.
- Loại `createdById`.

Ticket updated:

- `createdById`.
- `assignedTo` hiện tại.

Trước khi persistence, `createAndDispatch`:

- Loại ID trùng.
- Loại ID không phải số nguyên dương.

### 10.4. Event chưa có

| Nguồn                                                | Hiện trạng        |
| ---------------------------------------------------- | ----------------- |
| Contract create/sign/activate/expire/terminate       | Chưa có handler   |
| Viewing appointment create/confirm/reschedule/cancel | Chưa có handler   |
| Rental request create/decision/cancel                | Chưa có handler   |
| Meter reading confirm/abnormal                       | Chưa có handler   |
| Subscription/tenant verification                     | Chưa có handler   |
| System broadcast                                     | Chưa có admin API |

`CONTRACT` và `APPOINTMENT` tồn tại trong enum nhưng không chứng minh event đã hoạt động.

## 11. Pipeline persistence và dispatch

### 11.1. Tạo notification

1. Module nghiệp vụ gọi `NotificationEventsService`.
2. Service tính recipient.
3. `NotificationsService.createAndDispatch` chuẩn hóa recipient.
4. Repository dùng Prisma transaction để tạo một notification cho mỗi user.
5. Sau khi transaction thành công, xử lý từng notification:
   - emit Socket.IO;
   - tạo BackgroundJob;
   - add BullMQ job;
   - lưu `externalJobId`.

Nếu không có recipient hợp lệ, trả `[]` và không tạo dữ liệu.

### 11.2. Tính độc lập của các kênh

Notification persistence hoàn thành trước realtime và push.

`enqueuePush` bắt lỗi, ghi log và không xóa notification. Vì vậy:

- Notification inbox vẫn có dữ liệu nếu Redis/BullMQ lỗi ở bước enqueue.
- Push có thể không được gửi.
- BackgroundJob có thể bị kẹt `WAITING` nếu tạo DB thành công nhưng queue add thất bại.

Tuy nhiên, business module gọi notification sau khi transaction nghiệp vụ đã commit. Nếu bước tạo Notification trong database lỗi, request nghiệp vụ có thể trả lỗi dù state nghiệp vụ đã thay đổi. Đây là khoảng trống cần transactional outbox.

## 12. BullMQ worker và Firebase

### 12.1. Job

Queue:

```text
notifications
```

Job name:

```text
send-push
```

Job data:

```json
{
  "backgroundJobId": 7001,
  "notificationId": 1001
}
```

Options hiện hành:

- Tối đa 5 attempts.
- Exponential backoff.
- Delay gốc 3.000 ms.
- Jitter 0,5.
- Giữ tối đa 1.000 completed job và 5.000 failed job trong Redis.

### 12.2. Worker

1. Đổi BackgroundJob thành `ACTIVE`.
2. Đọc Notification theo ID.
3. Nếu notification không tồn tại:
   - đánh dấu job `COMPLETED`;
   - không gửi push.
4. Lấy active device token của user.
5. Gửi FCM.
6. Cập nhật từng token.
7. Đánh dấu job `COMPLETED`.

Khi có exception:

- Còn lượt thử: `RETRYING`.
- Hết lượt thử: `FAILED`.
- Lưu `attempts` và `errorMessage`.
- Throw lại để BullMQ thực hiện retry.

### 12.3. FCM batching

Token được chia chunk tối đa 500, phù hợp giới hạn multicast.

FCM notification:

```json
{
  "notification": {
    "title": "Tiêu đề",
    "body": "Nội dung"
  },
  "data": {
    "notificationId": "1001",
    "type": "TICKET",
    "sourceType": "TICKET",
    "sourceId": "501"
  }
}
```

Tất cả value trong FCM data được chuyển thành string.

### 12.4. Token success/failure

Thành công:

- `lastUsedAt=now`.
- `failureCount=0`.
- `lastError=null`.

Thất bại:

- `lastUsedAt=now`.
- Tăng `failureCount`.
- Ghi `lastError`.

Token bị disable ngay với các mã:

- `messaging/invalid-registration-token`.
- `messaging/registration-token-not-registered`.
- `messaging/invalid-argument`.

Lỗi khác không tự disable token.

### 12.5. Firebase credential

Provider dùng Firebase Admin Application Default Credentials. Môi trường cần cấu hình credential hợp lệ, thường qua `GOOGLE_APPLICATION_CREDENTIALS`.

Có source code không đồng nghĩa Firebase production đã được xác minh. Cần smoke test riêng với project và thiết bị được phép.

## 13. Lỗi và failure mode

| Tình huống                               | Hành vi hiện tại                                 |
| ---------------------------------------- | ------------------------------------------------ |
| Notification không thuộc user            | `NotFound` khi mark read                         |
| Đọc notification đã read                 | Trả bản ghi hiện tại                             |
| Body `{}` có field thừa                  | `BadRequest`                                     |
| Type/platform sai enum                   | `BadRequest`                                     |
| Device token ID không thuộc user         | Prisma update error, chưa map rõ                 |
| Socket thiếu/sai token                   | Disconnect                                       |
| Redis/BullMQ enqueue lỗi                 | Log lỗi; notification nội bộ vẫn còn             |
| FCM invalid token                        | Tăng failure và disable token                    |
| FCM transient exception                  | BullMQ retry                                     |
| Không có active device token             | Job vẫn hoàn thành                               |
| Notification bị xóa trước worker         | Job hoàn thành không gửi                         |
| Notification DB create lỗi sau nghiệp vụ | Có thể trả lỗi sau khi state nghiệp vụ đã commit |

## 14. Ví dụ sử dụng

### 14.1. List unread và đếm

```bash
curl "http://localhost:3000/notifications?type=INVOICE&page=1&limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl "http://localhost:3000/notifications/unread-count" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 14.2. Mark read

```bash
curl -X PATCH "http://localhost:3000/notifications/1001/read" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -X PATCH "http://localhost:3000/notifications/read-all" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 14.3. Register và disable device

```bash
curl -X POST "http://localhost:3000/device-tokens" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token":"fcm-registration-token",
    "fid":"installation-id",
    "platform":"WEB",
    "deviceName":"Chrome on Windows"
  }'

curl -X DELETE "http://localhost:3000/device-tokens/301" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 14.4. Test delivery

```bash
curl -X POST "http://localhost:3000/notifications/test" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Kết quả cần kiểm:

1. Có row `Notification`.
2. Socket nhận `notification.created`.
3. Có row `BackgroundJob`.
4. Worker chuyển job đến terminal state.
5. Thiết bị active nhận push nếu Firebase hợp lệ.

## 15. Chức năng chưa hoàn thiện và hướng triển khai

Các API đề xuất trong phần này đều **chưa tồn tại**.

### 15.1. Reliability, outbox và idempotency

| #   | Hiện trạng                                 | Ảnh hưởng                        | Hướng triển khai                         | Dependency       | Tiêu chí hoàn thành              |
| --- | ------------------------------------------ | -------------------------------- | ---------------------------------------- | ---------------- | -------------------------------- |
| 1   | Notification tạo sau transaction nghiệp vụ | State đổi nhưng event có thể mất | Transactional outbox cùng business write | Migration/worker | Event eventually delivered       |
| 2   | Không có event ID/idempotency key          | Retry tạo notification trùng     | Unique `(eventId,userId,channel)`        | Outbox           | Replay không tạo trùng           |
| 3   | Queue add lỗi có thể để job `WAITING`      | Push kẹt vĩnh viễn               | Reconciliation scheduler                 | BullMQ/DB        | Job WAITING quá hạn được enqueue |
| 4   | Không có dead-letter/replay                | Khó phục hồi production          | DLQ và admin replay có audit             | Ops/admin auth   | Replay chọn lọc, idempotent      |
| 5   | Set externalJobId lỗi sau enqueue          | DB và Redis lệch                 | Outbox dispatcher quản lý atomic state   | Reconciliation   | Đối soát phát hiện và sửa        |
| 6   | Fanout tạo từng row trong transaction      | Event recipient lớn khó scale    | Batch/outbox fanout có giới hạn          | PostgreSQL       | Broadcast lớn không timeout      |

### 15.2. WebSocket security và lifecycle

| #   | Hiện trạng                   | Ảnh hưởng                               | Hướng triển khai                       | Dependency        | Tiêu chí hoàn thành       |
| --- | ---------------------------- | --------------------------------------- | -------------------------------------- | ----------------- | ------------------------- |
| 7   | Socket chỉ verify chữ ký JWT | Không kiểm `ver=2`/user status hiện tại | Dùng chung principal resolver với HTTP | G01               | User inactive bị từ chối  |
| 8   | Không ngắt khi token hết hạn | Socket sống lâu hơn phiên               | Re-auth/expiry timer                   | Token service     | Disconnect đúng `exp`     |
| 9   | Không ngắt khi user bị khóa  | Có thể tiếp tục nhận dữ liệu            | Session revocation/pub-sub             | G01/Redis         | Ban user ngắt mọi socket  |
| 10  | `cors: true`                 | Origin quá rộng                         | Dùng allowlist `CORS_ORIGINS`          | Deployment config | Origin lạ bị chặn         |
| 11  | Không có replay/cursor       | Mất event khi offline                   | REST resync chuẩn hoặc event cursor    | Frontend contract | Reconnect không mất state |
| 12  | Chưa có Socket E2E           | Chưa chứng minh isolation               | Test auth, room và cross-user          | Test server       | User A không nhận event B |

### 15.3. Device token và push security

| #   | Hiện trạng                    | Ảnh hưởng                                | Hướng triển khai                      | Dependency           | Tiêu chí hoàn thành           |
| --- | ----------------------------- | ---------------------------------------- | ------------------------------------- | -------------------- | ----------------------------- |
| 13  | Token unique theo user        | Một FCM token có thể thuộc nhiều account | Global unique token + transfer owner  | Migration            | Token chỉ có một owner active |
| 14  | Worker không lọc user status  | User bị khóa vẫn có thể nhận push        | Join/check active user lúc dispatch   | G01                  | Inactive/banned không nhận    |
| 15  | Response trả raw token        | Tăng bề mặt lộ secret thiết bị           | Response DTO che token                | API versioning       | Chỉ trả masked metadata       |
| 16  | Không có device list/detail   | User không quản lý phiên push            | API list thiết bị của mình            | Response DTO         | Chỉ thấy device của mình      |
| 17  | Disable lỗi chưa map NotFound | Client khó xử lý                         | Service existence check/error mapping | Prisma               | ID lạ trả 404 ổn định         |
| 18  | Không logout all devices      | Token cũ còn active                      | API disable all/except current        | Auth device identity | Logout policy được test       |
| 19  | Không threshold lỗi transient | Token lỗi lặp vô hạn                     | Disable/quarantine theo policy        | Metrics              | Token vượt threshold dừng gửi |
| 20  | Chưa chứng minh Firebase thật | Push có thể không hoạt động              | Emulator + staging smoke test         | Firebase project     | Thiết bị nhận payload đúng    |

### 15.4. Event coverage và recipient semantics

| #   | Hiện trạng                                  | Ảnh hưởng                        | Hướng triển khai                         | Dependency | Tiêu chí hoàn thành            |
| --- | ------------------------------------------- | -------------------------------- | ---------------------------------------- | ---------- | ------------------------------ |
| 21  | Không event contract                        | Bỏ lỡ bước ký/kích hoạt/hết hạn  | Handler create/sign/activate/expire      | G05        | Đúng recipient, idempotent     |
| 22  | Không event appointment                     | Hai bên không biết lịch đổi      | Handler create/confirm/reschedule/cancel | G04        | Payload có time/timezone       |
| 23  | Không event rental request                  | Lead thay đổi không được báo     | Handler create/decision/cancel           | G04        | Renter/staff nhận đúng         |
| 24  | Không event meter reading                   | Renter không biết chỉ số         | Handler confirmed/abnormal               | G06        | Không gửi draft                |
| 25  | Không subscription/verification event       | Admin/landlord thiếu thông tin   | Handler lifecycle G02                    | G02        | Recipient theo platform/tenant |
| 26  | Ticket comment/attachment dùng update chung | Nội dung gây hiểu nhầm           | Domain event/template riêng              | G09        | Nội dung đúng hành động        |
| 27  | Không loại actor cập nhật ticket            | Self-notification dư thừa        | Truyền `actorId` và policy exclude       | G09        | Matrix actor/recipient test    |
| 28  | Không báo assignee cũ                       | Bàn giao không rõ                | Event reassignment old/new               | G09        | Cả hai nhận đúng loại event    |
| 29  | Co-renter có thể không nhận ticket update   | Người liên quan bị bỏ sót        | Recipient theo contract membership       | G05/G09    | Main/co-renter policy rõ       |
| 30  | Owner luôn được đưa vào recipient tenant    | Có thể gửi user không còn active | Chuẩn hóa recipient resolver             | G01/G02    | Chỉ active authorized user     |

### 15.5. User control, template và data contract

| #   | Hiện trạng                            | Ảnh hưởng                                      | Hướng triển khai                               | Dependency             | Tiêu chí hoàn thành              |
| --- | ------------------------------------- | ---------------------------------------------- | ---------------------------------------------- | ---------------------- | -------------------------------- |
| 31  | Không có preference                   | User không điều chỉnh tần suất                 | Preference theo type/channel                   | Schema/UI              | In-app bắt buộc, push tùy policy |
| 32  | Không có quiet hours                  | Push làm phiền                                 | Timezone + quiet schedule                      | User profile/scheduler | Delivery trì hoãn đúng giờ       |
| 33  | Không có template                     | Nội dung hard-code khó quản lý                 | Versioned template service                     | Localization           | Snapshot test template           |
| 34  | Chưa localization                     | Nội dung một ngôn ngữ                          | Locale theo user                               | User profile           | Fallback ngôn ngữ rõ             |
| 35  | `data` không version/schema           | Frontend dễ vỡ deep-link                       | Typed payload registry                         | Shared contracts       | Contract test web/mobile         |
| 36  | Không mark unread                     | Thiếu thao tác inbox                           | API action mới                                 | Product                | Ownership và realtime đúng       |
| 37  | Không archive/delete                  | Inbox tăng vô hạn                              | Archive/retention policy                       | Compliance             | Không xóa dữ liệu cần giữ        |
| 38  | Không admin broadcast                 | Không gửi thông báo hệ thống                   | Admin API + audience preview                   | G01/G11                | Audit, quota, idempotency        |
| 39  | Test endpoint mở mọi user             | Có thể spam notification/push                  | Tắt production hoặc rate/role limit            | Config/RBAC            | Không abuse production           |
| 40  | Không email/SMS fallback              | Sự kiện quan trọng chỉ một kênh                | Channel adapters theo preference               | Provider/compliance    | Retry và opt-in rõ               |
| 41  | `isRead=false` bị coerce thành `true` | Không list unread đúng theo query thông thường | Dùng preprocess nhận `true`/`false` tường minh | Zod DTO                | Test cả chuỗi true/false         |

### 15.6. Hiệu năng, monitoring và kiểm thử

| #   | Hiện trạng                                | Ảnh hưởng                     | Hướng triển khai                  | Dependency         | Tiêu chí hoàn thành             |
| --- | ----------------------------------------- | ----------------------------- | --------------------------------- | ------------------ | ------------------------------- |
| 42  | Notification thiếu index user/read/time   | Inbox lớn có thể chậm         | Index `(userId,isRead,createdAt)` | Migration          | Query plan dùng index           |
| 43  | Không metric delivery                     | Không biết push thành công    | Metrics success/fail/latency      | Observability      | Dashboard theo channel          |
| 44  | Không metric queue lag/retry              | Không phát hiện worker nghẽn  | BullMQ telemetry/alerts           | Monitoring         | Alert theo SLO                  |
| 45  | Không cảnh báo invalid token rate         | Không biết client token lỗi   | Metric theo platform/app version  | Client metadata    | Alert khi vượt threshold        |
| 46  | Không admin job status API                | Ops phải đọc DB               | Read-only job dashboard           | G11/RBAC           | Filter failed/retrying          |
| 47  | Không retention BackgroundJob             | DB tăng vô hạn                | Scheduler archive/purge           | Compliance         | Batch purge có audit            |
| 48  | Không retention Notification              | Inbox tăng vô hạn             | Chính sách theo type/user         | Product/compliance | Job không xóa unread quan trọng |
| 49  | Chưa test Redis/BullMQ thật               | Mock không chứng minh retry   | Integration test Redis            | Test container     | Retry/status nhất quán          |
| 50  | Chưa test Firebase emulator/staging       | Không chứng minh payload      | Emulator + staging device         | Firebase           | Multicast/invalid token đúng    |
| 51  | Chưa E2E business → inbox → socket → push | Chưa chứng minh toàn pipeline | Journey test G07–G10              | Full test env      | Không mất/trùng event           |

## 16. Thứ tự ưu tiên backlog

1. Transactional outbox, idempotency và queue reconciliation.
2. WebSocket authentication/lifecycle và device-token ownership.
3. Hoàn thiện event coverage và recipient semantics.
4. Preference, template, payload versioning và retention.
5. Monitoring, replay, external integration test và performance.

## 17. Checklist kiểm thử tài liệu

### 17.1. REST notification

- [ ] User chỉ list notification của mình.
- [ ] Filter `type` hoạt động.
- [ ] Ghi nhận `isRead=false` đang bị coercion sai và có test hồi quy cho bản sửa.
- [ ] Mark read notification lạ trả `NotFound`.
- [ ] Mark read lặp không đổi `readAt`.
- [ ] Read-all không tác động user khác.
- [ ] Strict empty body từ chối field thừa.

### 17.2. Device token

- [ ] Register mới tạo active token.
- [ ] Register lại reset failure và kích hoạt lại.
- [ ] User không disable token của user khác.
- [ ] Invalid FCM token bị disable.
- [ ] Transient error không disable ngay.

### 17.3. Socket.IO

- [ ] Thiếu/sai access token bị disconnect.
- [ ] User chỉ join room của mình.
- [ ] Nhận đúng `notification.created`.
- [ ] Nhận đúng payload single/read-all.
- [ ] Ticket update không bị frontend tính hai lần.
- [ ] Reconnect thực hiện REST resync.

### 17.4. Queue và FCM

- [ ] Notification tạo BackgroundJob `WAITING`.
- [ ] Worker chuyển `ACTIVE → COMPLETED`.
- [ ] Exception chuyển `RETRYING` rồi `FAILED`.
- [ ] Không có token vẫn hoàn thành job.
- [ ] FCM chia chunk tối đa 500.
- [ ] Enqueue lỗi không xóa notification nội bộ.

### 17.5. Event matrix

- [ ] Invoice issued/overdue đúng renter.
- [ ] Payment pending đúng staff tài chính.
- [ ] Payment reviewed đúng payer.
- [ ] Ticket created đúng staff và loại creator.
- [ ] Ticket updated đúng creator/assignee.
- [ ] Contract/appointment/rental request không bị hiểu nhầm là đã tích hợp.

## 18. Tiêu chí nghiệm thu tài liệu

- Người dùng biết cách đọc và quản lý unread notification.
- Frontend/mobile hiểu REST, Socket.IO và FCM có vai trò khác nhau.
- Backend developer hiểu recipient, persistence, job retry và token lifecycle.
- Ops biết dependency và failure mode của Redis/BullMQ/Firebase.
- Tester có đủ case ownership, realtime isolation, retry và invalid token.
- Push được mô tả đúng là đã có code nhưng chưa chứng minh external environment.
- Contract, appointment, rental request, preference và broadcast không bị mô tả như đã hoạt động.
- Backlog nêu rõ hiện trạng, ảnh hưởng, hướng triển khai, dependency và tiêu chí hoàn thành.

## 19. Nguồn mã đối chiếu

- `backend/src/modules/notifications/notifications.controller.ts`
- `backend/src/modules/notifications/model/notifications.model.ts`
- `backend/src/modules/notifications/notifications.service.ts`
- `backend/src/modules/notifications/repositories/notifications.repo.ts`
- `backend/src/modules/notifications/notification-events.service.ts`
- `backend/src/modules/notifications/notifications.gateway.ts`
- `backend/src/modules/notifications/notifications.processor.ts`
- `backend/src/modules/notifications/firebase-push.service.ts`
- `backend/src/modules/notifications/firebase.provider.ts`
- `backend/src/modules/notifications/notifications.module.ts`
- `backend/src/modules/notifications/notifications.constants.ts`
- `backend/src/modules/invoices/invoices.service.ts`
- `backend/src/modules/payments/payments.service.ts`
- `backend/src/modules/tickets/tickets.service.ts`
- `backend/src/app.module.ts`
- `backend/src/config/env.config.ts`
- `backend/prisma/schema.prisma`
