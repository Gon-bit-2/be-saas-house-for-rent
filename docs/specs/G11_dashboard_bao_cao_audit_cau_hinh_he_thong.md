# G11 - Đặc tả dashboard, báo cáo, audit và cấu hình hệ thống

> **Snapshot 31/07/2026:** Dashboard tenant (`summary`, `revenue-trend`, `recent-activity`) và dashboard platform (`summary`, `trends`) đều được nạp trong `AppModule`. `AuditLog` và `SystemSetting` vẫn chỉ có schema/chưa có API quản trị đầy đủ.

## 1. Tổng quan

G11 mô tả lớp tổng hợp và vận hành của hệ thống:

- Dashboard theo tenant.
- Chỉ số phòng, hợp đồng, tài chính và ticket.
- Xu hướng doanh thu.
- Hoạt động gần đây.
- Nền tảng dữ liệu audit.
- Nền tảng cấu hình hệ thống.

Mục tiêu của tài liệu:

- Landlord, manager và accountant biết cách gọi dashboard.
- Frontend hiểu chính xác ý nghĩa, phạm vi thời gian và công thức của từng metric.
- Backend hiểu repository aggregate và tenant isolation.
- Tester biết cách kiểm tra date range, UTC, role và số liệu.
- Admin biết cách gọi dashboard platform và ý nghĩa từng chỉ số toàn hệ thống.
- Người lập kế hoạch biết phần nào đã hoạt động, phần nào mới có Prisma schema và cách triển khai tiếp.

G11 liên quan trực tiếp FR-14, FR-25, FR-26, FR-28 và phần lịch sử/audit của FR-30.

### 1.1. Phạm vi

- Dashboard summary tenant.
- Dashboard summary và trends toàn hệ thống cho Super Admin.
- Revenue trend theo ngày hoặc tháng.
- Recent activity từ invoice, payment và ticket.
- Cách chuẩn hóa date range theo UTC.
- Mô hình `AuditLog`.
- Mô hình `SystemSetting`.
- Hạn chế hiện tại và backlog triển khai.

### 1.2. Ngoài phạm vi

| Nội dung                            | Tài liệu/ghi chú           |
| ----------------------------------- | -------------------------- |
| Chi tiết nhà/phòng                  | G03                        |
| Marketplace funnel                  | G04; G11 chưa có analytics |
| Hợp đồng                            | G05                        |
| Điện/nước                           | G06                        |
| Hóa đơn/công nợ                     | G07                        |
| Payment/reconciliation              | G08                        |
| Ticket                              | G09                        |
| Notification realtime               | G10                        |
| Review/reputation/report moderation | G12                        |
| Dashboard realtime                  | Không thuộc MVP hiện tại   |

### 1.3. Trạng thái triển khai

| Nhóm                             | Trạng thái hiện tại  | Ghi chú                      |
| -------------------------------- | -------------------- | ---------------------------- |
| Dashboard summary tenant         | Đã hoạt động         | REST, tenant-scoped          |
| Revenue trend                    | Đã hoạt động         | PostgreSQL `date_trunc`      |
| Recent activity                  | Đã hoạt động         | Invoice, payment, ticket     |
| Dashboard module wiring          | Đã hoạt động         | Có trong `AppModule.imports` |
| Dashboard Super Admin            | Đã hoạt động         | Summary và trends, REST      |
| Marketplace/conversion analytics | Chưa có              | Không có funnel              |
| Export/scheduled report          | Chưa có              | Không CSV/XLSX/PDF/email     |
| Audit log                        | Chỉ có Prisma schema | Không writer/API             |
| System setting                   | Chỉ có Prisma schema | Không CRUD/cache             |
| Realtime dashboard               | Không thuộc MVP      | Frontend refresh bằng REST   |

### 1.4. Cảnh báo cũ đã hết hiệu lực

Các báo cáo cũ ghi `DashboardModule` chưa được đăng ký. Source hiện tại đã:

- Import `DashboardModule`.
- Thêm module vào `AppModule.imports`.
- Expose ba route `/dashboard/*`.

Không mô tả dashboard hiện hành là “có code nhưng không gọi được”.

### 1.5. Dashboard Super Admin

Dashboard platform yêu cầu role `ADMIN`, không dùng `x-tenant-id`:

| Method | Endpoint | Nội dung |
| --- | --- | --- |
| `GET` | `/dashboard/platform/summary` | User, landlord, tenant, property, room, marketplace và subscription snapshot |
| `GET` | `/dashboard/platform/trends` | User/landlord/tenant/room mới và tin được publish theo ngày/tháng |

Query hỗ trợ `from`, `to`; trends thêm `groupBy=day|month`. Mặc định là tháng UTC hiện tại, tự chọn month khi range trên 62 ngày và từ chối khoảng lớn hơn 366 ngày. Response có `generatedAt`; dữ liệu xóa mềm không được tính.

## 2. Actor, xác thực và tenant context

### 2.1. Actor

| Actor               | Quyền hiện tại             | Header                       |
| ------------------- | -------------------------- | ---------------------------- |
| `LANDLORD`          | Xem dashboard tenant       | Bearer token + `x-tenant-id` |
| `MANAGER`           | Xem dashboard tenant       | Bearer token + `x-tenant-id` |
| `ACCOUNTANT`        | Xem dashboard tenant       | Bearer token + `x-tenant-id` |
| `ADMIN`             | Chưa có dashboard platform | Không có API hiện hành       |
| `MAINTENANCE_STAFF` | Không được gọi dashboard   | `Forbidden`                  |
| `TENANT`            | Không được gọi dashboard   | `Forbidden`                  |

Tất cả API G11 hiện hành đều protected.

### 2.2. Tenant isolation

Controller không nhận `tenantId` trong path, query hoặc body. Backend:

1. Xác thực access token.
2. Kiểm tra role decorator.
3. Đọc `x-tenant-id`.
4. Dùng `TenantAccessService.getActiveTenantContext`.
5. Kiểm tra tenant/membership active.
6. Truyền `tenant.tenantId` đã xác minh vào repository.

Mọi aggregate dashboard hiện hành đều có điều kiện `tenantId`.

### 2.3. Header mẫu

```http
Authorization: Bearer <accessToken>
x-tenant-id: 7
```

Thiếu tenant header hoặc dùng tenant không hợp lệ không được fallback sang tenant khác.

## 3. Tổng hợp endpoint hiện hành

| Method | Endpoint                     | Query                      | Chức năng          |
| ------ | ---------------------------- | -------------------------- | ------------------ |
| `GET`  | `/dashboard/summary`         | `from?`, `to?`             | Summary vận hành   |
| `GET`  | `/dashboard/revenue-trend`   | `from?`, `to?`, `groupBy?` | Xu hướng payment   |
| `GET`  | `/dashboard/recent-activity` | `limit?`                   | Hoạt động gần nhất |

G11 hiện không có:

- Endpoint dashboard Admin.
- Endpoint audit log.
- Endpoint system settings.
- Endpoint export.
- WebSocket/SSE dashboard.

## 4. Date range và timezone

### 4.1. Query

`from` và `to` dùng `z.coerce.date()`:

```http
GET /dashboard/summary?from=2026-07-01&to=2026-07-31
```

Giá trị không parse được thành date bị validation từ chối.

### 4.2. Range mặc định

Nếu không truyền query:

- `from`: 00:00:00.000 UTC ngày đầu tháng hiện tại.
- `to`: 23:59:59.999 UTC ngày hiện tại.

Ví dụ request chạy ngày 24/07/2026 UTC:

```json
{
  "from": "2026-07-01T00:00:00.000Z",
  "to": "2026-07-24T23:59:59.999Z"
}
```

### 4.3. Chuẩn hóa

- `from` luôn chuyển về đầu ngày UTC.
- `to` luôn chuyển về cuối ngày UTC.
- `from > to` trả `BadRequest` với thông báo khoảng thời gian không hợp lệ.

Nếu chỉ truyền một đầu:

- Thiếu `from`: dùng ngày đầu tháng UTC hiện tại.
- Thiếu `to`: dùng cuối ngày UTC hiện tại.

### 4.4. Giới hạn hiện tại

- Không có timezone theo tenant.
- Không có giới hạn số ngày tối đa.
- Không có preset `this_month`, `last_month`, `year_to_date`.
- Date không kèm timezone có thể bị client/runtime hiểu khác nhau trước khi backend chuẩn hóa UTC.

Frontend nên gửi ISO date rõ ràng, ví dụ `2026-07-01`.

## 5. Dashboard summary

### 5.1. Endpoint

```http
GET /dashboard/summary?from=2026-07-01&to=2026-07-31
Authorization: Bearer <accessToken>
x-tenant-id: 7
```

### 5.2. Cấu trúc response

```text
summary
├── tenantId
├── range
├── rooms
│   ├── totalRooms
│   ├── occupiedRooms
│   ├── availableRooms
│   ├── maintenanceRooms
│   └── occupancyRate
├── contracts
│   ├── activeContracts
│   └── endingSoonContracts
├── finance
│   ├── invoiceTotal
│   ├── paidAmount
│   ├── pendingPaymentAmount
│   ├── outstandingDebt
│   └── overdueDebt
└── tickets
    ├── open
    ├── inProgress
    ├── waitingRenter
    ├── resolved
    ├── closed
    └── urgentOpenTickets
```

### 5.3. Ví dụ response

```json
{
  "tenantId": 7,
  "range": {
    "from": "2026-07-01T00:00:00.000Z",
    "to": "2026-07-31T23:59:59.999Z"
  },
  "rooms": {
    "totalRooms": 40,
    "occupiedRooms": 28,
    "availableRooms": 8,
    "maintenanceRooms": 2,
    "occupancyRate": 70
  },
  "contracts": {
    "activeContracts": 28,
    "endingSoonContracts": 4
  },
  "finance": {
    "invoiceTotal": 125000000,
    "paidAmount": 102000000,
    "pendingPaymentAmount": 4500000,
    "outstandingDebt": 23000000,
    "overdueDebt": 7000000
  },
  "tickets": {
    "open": 3,
    "inProgress": 2,
    "waitingRenter": 1,
    "resolved": 5,
    "closed": 8,
    "urgentOpenTickets": 1
  }
}
```

## 6. Metric phòng

### 6.1. Cách tính

Repository chỉ lấy room:

- Đúng `tenantId`.
- `deletedAt=null`.

Sau đó group theo `Room.status`.

| Field              | Nguồn                |
| ------------------ | -------------------- |
| `totalRooms`       | Tổng room chưa xóa   |
| `occupiedRooms`    | Status `OCCUPIED`    |
| `availableRooms`   | Status `AVAILABLE`   |
| `maintenanceRooms` | Status `MAINTENANCE` |

### 6.2. Occupancy rate

```text
occupancyRate = occupiedRooms / totalRooms × 100
```

- Làm tròn 2 chữ số.
- Nếu `totalRooms=0`, trả 0.
- `RESERVED` không được tính là occupied.
- `INACTIVE` vẫn nằm trong `totalRooms` nhưng không có field riêng.

Room metric là snapshot hiện tại và không bị ảnh hưởng bởi `from/to`.

## 7. Metric hợp đồng

### 7.1. Active contracts

Đếm contract:

- Đúng tenant.
- `status=ACTIVE`.
- `deletedAt=null`.

Đây là snapshot hiện tại, không lọc theo dashboard range.

### 7.2. Ending soon contracts

Đếm contract active có:

```text
today UTC <= endDate <= today UTC + 30 ngày
```

Đặc điểm:

- Dùng thời điểm server hiện tại.
- Cửa sổ cố định 30 ngày.
- Không dùng `from/to`.
- Chưa có query cấu hình số ngày.

## 8. Metric tài chính

### 8.1. Invoice total

Tổng `Invoice.totalAmount` khi:

- Đúng tenant.
- Chưa xóa.
- Status thuộc `UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`.
- `billingMonth` nằm trong range.

`DRAFT` và `CANCELED` không được tính.

### 8.2. Paid amount

Tổng `Payment.amount` khi:

- Đúng tenant.
- `status=SUCCESS`.
- `paidAt` nằm trong range.

Đây là tiền đã được staff/provider ghi nhận thành công, không phải tổng invoice.

### 8.3. Pending payment amount

Tổng `Payment.amount` khi:

- Đúng tenant.
- `status=PENDING`.
- `createdAt` nằm trong range.

Metric này là lượng xác nhận/giao dịch đang chờ review được tạo trong kỳ.

### 8.4. Outstanding và overdue debt

`outstandingDebt`:

- Debt status `OPEN`, `PARTIAL`, `OVERDUE`.
- Tổng `remainingAmount`.

`overdueDebt`:

- Debt status `OVERDUE`.
- Tổng `remainingAmount`.

Hai metric là snapshot công nợ hiện tại và không lọc theo `from/to`.

### 8.5. Precision

Prisma Decimal được service chuyển bằng `Number(value)`. Response thuận tiện cho JSON nhưng số tiền rất lớn có thể vượt độ chính xác an toàn của JavaScript.

## 9. Metric ticket

### 9.1. Status count

Ticket được group theo status khi:

- Đúng tenant.
- `createdAt` nằm trong range.

Response trả:

- `OPEN`.
- `IN_PROGRESS`.
- `WAITING_RENTER`.
- `RESOLVED`.
- `CLOSED`.

`CANCELED` không có field riêng dù có thể tồn tại trong group result.

### 9.2. Urgent open

`urgentOpenTickets` đếm:

- Priority `URGENT`.
- Status `OPEN`, `IN_PROGRESS` hoặc `WAITING_RENTER`.
- Đúng tenant.

Metric này không lọc theo range, nên có thể gồm ticket được tạo trước `from`.

## 10. Ma trận semantics thời gian

Không phải mọi field trong summary đều dùng `range`.

| Metric             | Time field                 | Có dùng `from/to`? | Loại                     |
| ------------------ | -------------------------- | ------------------ | ------------------------ |
| Rooms              | Trạng thái hiện tại        | Không              | Snapshot                 |
| Active contracts   | Trạng thái hiện tại        | Không              | Snapshot                 |
| Ending soon        | `endDate`, today + 30 ngày | Không              | Fixed window             |
| Invoice total      | `billingMonth`             | Có                 | Period                   |
| Paid amount        | `paidAt`                   | Có                 | Period                   |
| Pending payment    | `createdAt`                | Có                 | Period                   |
| Outstanding debt   | Trạng thái hiện tại        | Không              | Snapshot                 |
| Overdue debt       | Trạng thái hiện tại        | Không              | Snapshot                 |
| Ticket by status   | `createdAt`                | Có                 | Cohort created in period |
| Urgent open ticket | Trạng thái hiện tại        | Không              | Snapshot                 |

Frontend phải hiển thị nhãn phù hợp; không được ghi chung tất cả là “trong kỳ” nếu chưa phân biệt.

## 11. Revenue trend

### 11.1. Endpoint

```http
GET /dashboard/revenue-trend?from=2026-07-01&to=2026-07-31&groupBy=day
Authorization: Bearer <accessToken>
x-tenant-id: 7
```

### 11.2. Grouping

`groupBy`:

- `day`.
- `month`.

Nếu không truyền:

- Range không quá 62 ngày: `day`.
- Range dài hơn 62 ngày: `month`.

### 11.3. Nguồn dữ liệu

Raw SQL chỉ lấy:

- Bảng `payments`.
- Đúng tenant.
- `status='SUCCESS'`.
- `paid_at` khác null.
- `paid_at` trong range.

PostgreSQL dùng:

- `date_trunc('day', paid_at)`.
- Hoặc `date_trunc('month', paid_at)`.

Range đầu vào được service chuẩn hóa theo UTC, nhưng raw SQL chưa chỉ định `AT TIME ZONE`. Ranh giới bucket của `date_trunc` trên `timestamptz` có thể phụ thuộc cấu hình timezone của PostgreSQL session. Môi trường cần giữ timezone database nhất quán hoặc sửa query để chỉ định timezone tường minh.

### 11.4. Response

```json
{
  "tenantId": 7,
  "range": {
    "from": "2026-07-01T00:00:00.000Z",
    "to": "2026-07-31T23:59:59.999Z"
  },
  "groupBy": "day",
  "items": [
    {
      "bucket": "2026-07-03T00:00:00.000Z",
      "amount": 9500000,
      "count": 4
    },
    {
      "bucket": "2026-07-04T00:00:00.000Z",
      "amount": 3250000,
      "count": 2
    }
  ]
}
```

Ngày/tháng không có payment không xuất hiện. Frontend muốn biểu đồ liên tục phải tự zero-fill hoặc chờ backend bổ sung.

### 11.5. Trường hợp rỗng

```json
{
  "tenantId": 7,
  "range": {
    "from": "2026-01-01T00:00:00.000Z",
    "to": "2026-01-31T23:59:59.999Z"
  },
  "groupBy": "day",
  "items": []
}
```

## 12. Recent activity

### 12.1. Endpoint

```http
GET /dashboard/recent-activity?limit=10
Authorization: Bearer <accessToken>
x-tenant-id: 7
```

`limit`:

- Mặc định 10.
- Số nguyên dương.
- Tối đa 50.

### 12.2. Cách tổng hợp

Repository chạy ba query:

1. Lấy tối đa `limit` invoice mới cập nhật.
2. Lấy tối đa `limit` payment mới cập nhật.
3. Lấy tối đa `limit` ticket mới cập nhật.
4. Map về cùng activity shape.
5. Merge.
6. Sort `occurredAt` giảm dần.
7. Lấy `limit` item.

Invoice `DRAFT` và invoice đã soft-delete không xuất hiện.

### 12.3. Activity shape

```json
{
  "type": "PAYMENT",
  "id": 901,
  "title": "Thanh toán INV-202607-001",
  "description": "Nguyễn Văn A - SUCCESS",
  "status": "SUCCESS",
  "occurredAt": "2026-07-24T09:15:00.000Z",
  "metadata": {
    "invoiceId": 801,
    "invoiceCode": "INV-202607-001",
    "payerId": 42,
    "amount": "3500000"
  }
}
```

### 12.4. Metadata theo type

| Type      | Metadata                                           |
| --------- | -------------------------------------------------- |
| `INVOICE` | `invoiceCode`, `roomId`, `roomCode`, `totalAmount` |
| `PAYMENT` | `invoiceId`, `invoiceCode`, `payerId`, `amount`    |
| `TICKET`  | `roomId`, `roomCode`, `priority`                   |

Frontend nên điều hướng bằng cặp `type + id`, không suy đoán ID thuộc cùng một bảng.

### 12.5. Giới hạn

- Không có pagination/cursor.
- Không có date filter.
- Không có property/room filter.
- Không có contract, meter reading hoặc rental request activity.
- `occurredAt` là `updatedAt` hiện tại của entity.
- Một entity cập nhật nhiều lần chỉ xuất hiện một snapshot, không tạo timeline immutable.

## 13. Ví dụ sử dụng

### 13.1. Summary mặc định

```bash
curl "http://localhost:3000/dashboard/summary" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: 7"
```

### 13.2. Summary theo range

```bash
curl "http://localhost:3000/dashboard/summary?from=2026-07-01&to=2026-07-31" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: 7"
```

### 13.3. Trend theo ngày/tháng

```bash
curl "http://localhost:3000/dashboard/revenue-trend?from=2026-07-01&to=2026-07-31&groupBy=day" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: 7"

curl "http://localhost:3000/dashboard/revenue-trend?from=2026-01-01&to=2026-12-31&groupBy=month" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: 7"
```

### 13.4. Activity

```bash
curl "http://localhost:3000/dashboard/recent-activity?limit=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-tenant-id: 7"
```

## 14. Lỗi thường gặp

| Tình huống                             | Kết quả                   |
| -------------------------------------- | ------------------------- |
| Thiếu Bearer token                     | `Unauthorized`            |
| Role ngoài landlord/manager/accountant | `Forbidden`               |
| Thiếu `x-tenant-id`                    | `TENANT_CONTEXT_REQUIRED` |
| Tenant/membership không active         | `TENANT_ACCESS_DENIED`    |
| `from > to`                            | `BadRequest`              |
| Date không parse được                  | `BadRequest`              |
| `groupBy` ngoài `day/month`            | `BadRequest`              |
| `limit <= 0` hoặc `limit > 50`         | `BadRequest`              |
| Range không có dữ liệu                 | Trả số 0 hoặc `items=[]`  |

## 15. AuditLog - chỉ có schema, chưa có API

### 15.1. Hiện trạng

Prisma có model `AuditLog`, nhưng source hiện không có:

- Audit module.
- Controller/service/repository.
- Interceptor hoặc middleware tự ghi log.
- Event/outbox audit.
- API list/detail.

Không có hành vi audit tự động chỉ vì model đã tồn tại.

### 15.2. Field

| Field        | Ý nghĩa                     |
| ------------ | --------------------------- |
| `tenantId`   | Tenant nguồn, có thể null   |
| `actorId`    | User thực hiện, có thể null |
| `action`     | Mã hành động                |
| `entityType` | Loại entity                 |
| `entityId`   | ID entity dạng chuỗi        |
| `oldValues`  | JSON trước thay đổi         |
| `newValues`  | JSON sau thay đổi           |
| `ipAddress`  | IP client                   |
| `userAgent`  | User agent                  |
| `createdAt`  | Thời điểm ghi               |

### 15.3. Relation và index

- Actor bị xóa: `actorId` chuyển null.
- Tenant bị xóa: audit log bị cascade delete.
- Có index `tenantId`.
- Có index `actorId`.
- Có index `(entityType, entityId)`.
- Chưa có index `createdAt` hoặc `action`.

### 15.4. Interface đề xuất - chưa tồn tại

Ví dụ nhóm interface tương lai:

- List audit tenant-scoped.
- List audit platform cho Admin.
- Detail audit có quyền và masking.
- Export audit có approval.

Các interface trên chưa thể gọi trong source hiện tại.

## 16. SystemSetting - chỉ có schema, chưa có API

### 16.1. Field

| Field         | Ý nghĩa                   |
| ------------- | ------------------------- |
| `key`         | Khóa unique toàn hệ thống |
| `value`       | JSON value                |
| `description` | Mô tả tùy chọn            |
| `updatedAt`   | Thời điểm cập nhật        |

### 16.2. Giới hạn schema

- Chỉ có global key, không có `tenantId`.
- Không có type hoặc JSON schema.
- Không có default value/version.
- Không có actor tạo/cập nhật.
- Không có history.
- Không có optimistic locking.
- Không có phân loại public/secret.

### 16.3. Interface đề xuất - chưa tồn tại

Ví dụ nhóm interface tương lai:

- Admin list/detail setting.
- Admin update setting có validation.
- Read-only public/client config allowlist.
- Tenant override nếu sản phẩm cần.
- History/rollback.

Hiện không có controller/service, cache hoặc feature-flag integration.

## 17. Chức năng chưa hoàn thiện và hướng triển khai

Mỗi interface đề xuất dưới đây đều **chưa tồn tại**.

### 17.1. Metric và tính đúng đắn

| #   | Hiện trạng                                      | Ảnh hưởng                           | Hướng triển khai                          | Dependency            | Tiêu chí hoàn thành          |
| --- | ----------------------------------------------- | ----------------------------------- | ----------------------------------------- | --------------------- | ---------------------------- |
| 1   | Summary trộn period/snapshot/fixed window       | Frontend hiểu sai “trong kỳ”        | Trả metadata semantics hoặc tách endpoint | API contract          | Mỗi metric có time basis rõ  |
| 2   | Debt không lọc range                            | So sánh với invoice kỳ bị lệch      | Tách current debt và debt movement        | G07                   | Snapshot/movement không nhầm |
| 3   | Ending soon cố định 30 ngày                     | Không tùy biến vận hành             | Query/config số ngày                      | SystemSetting         | Validate giới hạn ngày       |
| 4   | Ticket status theo range, urgent toàn thời gian | Hai card không cùng cohort          | Tách current/created-in-period            | G09                   | Metric name phản ánh đúng    |
| 5   | Không trả `RESERVED`/`INACTIVE`                 | Tổng trạng thái không giải thích đủ | Trả đầy đủ byStatus                       | G03                   | Tổng status khớp total       |
| 6   | Reserved không tính occupancy                   | Occupancy có thể thấp hơn vận hành  | Chốt occupied vs committed rate           | Product               | Công thức có test            |
| 7   | Không trả ticket `CANCELED`                     | Tổng ticket thiếu trạng thái        | Bổ sung field/byStatus                    | G09                   | Tổng status khớp DB          |
| 8   | Không có kỳ trước                               | Không thấy xu hướng                 | Previous-period compare                   | Date utilities        | Delta/percentage đúng        |
| 9   | Decimal thành JS number                         | Có thể mất precision                | Trả decimal string/minor unit             | Shared money contract | Giá trị lớn không sai        |
| 10  | Activity dùng entity snapshot                   | Không phải lịch sử thật             | Dùng domain event/audit stream            | Audit/outbox          | Mỗi thay đổi có event        |

### 17.2. Query và báo cáo

| #   | Hiện trạng                                               | Ảnh hưởng                              | Hướng triển khai                                      | Dependency                | Tiêu chí hoàn thành              |
| --- | -------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- | ------------------------- | -------------------------------- |
| 11  | Không filter property/room/renter/contract               | Không drill-down                       | Thêm filter có tenant validation                      | G03–G07                   | Không cross-tenant               |
| 12  | Không giới hạn date range                                | Query raw có thể rất lớn               | Max range theo groupBy                                | Validation                | Range quá lớn bị chặn            |
| 13  | Trend không zero-fill                                    | Biểu đồ bị đứt đoạn                    | Generate bucket hoặc frontend contract                | PostgreSQL/timezone       | Đủ bucket trong range            |
| 14  | Range UTC nhưng raw bucket phụ thuộc DB session timezone | Có thể lệch ngày/tháng giữa môi trường | Chỉ định timezone trong SQL và hỗ trợ tenant timezone | Tenant setting/PostgreSQL | UTC/DST/session timezone có test |
| 15  | Không revenue breakdown                                  | Không biết nguồn doanh thu             | Group property/room/method                            | G08                       | Tổng breakdown khớp total        |
| 16  | Không expense/net/cash-flow                              | Chưa phải P&L                          | Thiết kế expense ledger                               | Accounting                | Định nghĩa kế toán rõ            |
| 17  | Không debt aging                                         | Khó thu hồi nợ                         | Aging buckets theo due date                           | G07                       | Bucket không overlap             |
| 18  | Không utility analytics                                  | Không thấy tiêu thụ bất thường         | Aggregate G06                                         | Meter readings            | Theo period/property             |
| 19  | Không ticket SLA analytics                               | Không đo dịch vụ                       | SLA/response data                                     | G09                       | P50/P95 và overdue               |
| 20  | Không marketplace funnel                                 | Không đo conversion                    | View → appointment → request → contract               | G04                       | Event attribution rõ             |
| 21  | Không export                                             | Không lập báo cáo ngoài hệ thống       | CSV/XLSX/PDF async export                             | Storage/job               | File đúng filter                 |
| 22  | Không scheduled report                                   | Phải tải thủ công                      | Schedule + email/notification                         | G10/queue                 | Retry và recipient đúng          |
| 23  | Không reconciliation report                              | Khó chốt sổ                            | Payment/invoice/debt statement                        | G07–G08                   | Invariant và variance rõ         |

### 17.3. Dashboard platform và vận hành

| #   | Hiện trạng                             | Ảnh hưởng                            | Hướng triển khai                            | Dependency       | Tiêu chí hoàn thành             |
| --- | -------------------------------------- | ------------------------------------ | ------------------------------------------- | ---------------- | ------------------------------- |
| 24  | Không Dashboard Admin                  | FR-26 chưa đạt                       | Platform summary riêng                      | G02/G01          | ADMIN, không tenant header      |
| 25  | Không platform counts                  | Không theo dõi SaaS                  | Tenant/user/room/subscription metrics       | G02              | Soft-delete/status semantics rõ |
| 26  | Không marketplace moderation dashboard | FR-28 chưa đủ                        | Queue/listing stats                         | G04/G12          | Admin filter/action đúng        |
| 27  | Không cache/materialized view          | Aggregate tốn DB                     | Cache ngắn hạn/read model                   | Redis/PostgreSQL | Invalidation/freshness rõ       |
| 28  | Chưa benchmark                         | Không biết khả năng scale            | Load test + EXPLAIN                         | Dataset chuẩn    | Đạt SLO                         |
| 29  | Không `generatedAt`/freshness          | Client không biết dữ liệu mới cỡ nào | Response metadata                           | Cache contract   | Hiển thị được freshness         |
| 30  | Không slow-query observability riêng   | Khó điều tra                         | Trace/metric dashboard queries              | Observability    | Alert theo SLO                  |
| 31  | Raw SQL chưa integration test DB       | Mock không chứng minh query          | PostgreSQL integration                      | Test container   | Day/month kết quả đúng          |
| 32  | Chưa E2E tenant A/B                    | Isolation chưa chứng minh runtime    | HTTP + DB E2E                               | Auth seed        | Không rò tenant                 |
| 33  | Không realtime theo chủ đích MVP       | Cần refresh thủ công                 | Giữ REST; chỉ thêm invalidate event nếu cần | Product/G10      | REST vẫn là nguồn chuẩn         |

### 17.4. Audit

| #   | Hiện trạng                      | Ảnh hưởng                   | Hướng triển khai                       | Dependency      | Tiêu chí hoàn thành        |
| --- | ------------------------------- | --------------------------- | -------------------------------------- | --------------- | -------------------------- |
| 34  | Không writer/interceptor/outbox | Không có log thực tế        | Audit service + transactional strategy | Cross-module    | Action quan trọng luôn ghi |
| 35  | Không list/detail API           | Không điều tra được qua app | Tenant/Admin read-only API             | RBAC G01        | Masking và isolation       |
| 36  | Action/entity là string tự do   | Dữ liệu không nhất quán     | Enum/registry versioned                | Shared contract | Không typo/unknown action  |
| 37  | Không redact PII/secret         | JSON có thể lộ dữ liệu      | Allowlist/masking/encryption           | Privacy         | Secret không vào log       |
| 38  | Không tamper evidence           | Log có thể bị sửa           | Append-only role/hash chain/WORM       | Security/DB     | Phát hiện thay đổi         |
| 39  | Tenant delete cascade audit     | Mất lịch sử                 | Retain/anonymize thay cascade          | Legal/migration | Xóa tenant vẫn giữ audit   |
| 40  | Không retention/partition       | Bảng tăng vô hạn            | Policy + partition/archive             | Compliance      | Purge có approval/audit    |
| 41  | Thiếu index time/action         | List theo thời gian chậm    | Index tenant/time/action               | Migration       | Query plan đạt SLO         |

### 17.5. System settings

| #   | Hiện trạng                       | Ảnh hưởng                     | Hướng triển khai                          | Dependency     | Tiêu chí hoàn thành       |
| --- | -------------------------------- | ----------------------------- | ----------------------------------------- | -------------- | ------------------------- |
| 42  | Không CRUD Admin                 | Phải sửa DB trực tiếp         | API typed, role ADMIN                     | G01            | Validation/error ổn định  |
| 43  | JSON không schema/version        | Value sai làm hỏng runtime    | Registry key → schema/default/version     | Config service | Unknown/invalid bị chặn   |
| 44  | Không tenant override/precedence | Không tùy biến tenant         | Global → plan → tenant precedence nếu cần | G02            | Precedence có test        |
| 45  | Không cache invalidation         | Node đọc value cũ             | Cache + pub/sub version                   | Redis          | Multi-instance đồng bộ    |
| 46  | Không phân loại secret           | Có thể lộ credential          | Secret manager, masking                   | Security       | API không trả secret      |
| 47  | Không concurrency/history        | Update ghi đè, không rollback | Version/CAS + history                     | Audit          | Conflict và rollback      |
| 48  | Update không audit/notify        | Không truy vết thay đổi       | Audit event + ops notification            | Audit/G10      | Actor/before/after đầy đủ |

## 18. Thứ tự ưu tiên backlog

1. Chuẩn hóa semantics metric và date range.
2. Dashboard Super Admin và filter/report thiết yếu.
3. PostgreSQL integration, performance và caching.
4. Audit writer, redaction, immutability và retention.
5. System settings typed, versioned, cached và audited.

## 19. Checklist kiểm thử tài liệu

### 19.1. Access

- [ ] Landlord/manager/accountant gọi được với tenant header hợp lệ.
- [ ] Tenant/maintenance staff bị từ chối.
- [ ] Không đọc dashboard tenant khác.
- [ ] Tenant suspended/closed bị từ chối.

### 19.2. Date và summary

- [ ] Mặc định đầu tháng đến hôm nay UTC.
- [ ] `from/to` chuẩn hóa đầu/cuối ngày.
- [ ] `from > to` bị từ chối.
- [ ] Room/contracts/debt được nhận diện là snapshot.
- [ ] Ending soon dùng 30 ngày từ now.
- [ ] Invoice/payment/ticket dùng đúng time field.

### 19.3. Trend và activity

- [ ] Range <=62 ngày tự dùng `day`.
- [ ] Range >62 ngày tự dùng `month`.
- [ ] Chỉ payment SUCCESS vào trend.
- [ ] Bucket rỗng không được zero-fill.
- [ ] Activity chỉ gồm invoice/payment/ticket.
- [ ] Invoice draft không xuất hiện.

### 19.4. Schema-only

- [ ] AuditLog không bị mô tả như đang ghi tự động.
- [ ] SystemSetting không bị mô tả như có CRUD/cache.
- [ ] API đề xuất được gắn nhãn chưa tồn tại.

## 20. Tiêu chí nghiệm thu tài liệu

- Frontend hiểu đầy đủ response và time semantics.
- Staff biết role/header và cách gọi ba API.
- Tester có case UTC, range, tenant isolation và aggregate.
- Backend hiểu source table/filter của từng metric.
- Admin hiểu dashboard platform chưa tồn tại.
- Audit/settings được mô tả đúng là schema-only.
- Backlog có hiện trạng, ảnh hưởng, hướng triển khai, dependency và tiêu chí hoàn thành.

## 21. Nguồn mã đối chiếu

- `backend/src/modules/dashboard/dashboard.controller.ts`
- `backend/src/modules/dashboard/model/dashboard.model.ts`
- `backend/src/modules/dashboard/dashboard.service.ts`
- `backend/src/modules/dashboard/repositories/dashboard.repo.ts`
- `backend/src/modules/dashboard/dashboard.module.ts`
- `backend/src/app.module.ts`
- `backend/src/shared/modules/services/tenant-access.service.ts`
- `backend/prisma/schema.prisma`
