# G07 - Đặc tả hóa đơn và công nợ

> **Snapshot 31/07/2026:** Invoice/debt self-service và staff CRUD/action đã có API; G08 cập nhật payment–invoice–debt bằng transaction. InvoiceBatch có schema nhưng orchestration/scheduler hàng tháng chưa hoàn chỉnh; concurrency cần E2E PostgreSQL.

## 1. Tổng quan

Tài liệu này mô tả nhóm tính năng G07 của backend: lập hóa đơn tiền thuê theo tháng, tạo các dòng tiền phòng/điện/nước/phí khác, phát hành hóa đơn, theo dõi trạng thái và duy trì bản ghi công nợ tương ứng.

Luồng đầu vào và đầu ra:

```text
Contract ACTIVE (G05)
├── monthlyPrice
└── MeterReading CONFIRMED (G06)
        ↓
Invoice
├── InvoiceItem RENT
├── InvoiceItem ELECTRICITY/WATER
├── InvoiceItem SERVICE/PARKING/INTERNET/OTHER
├── InvoiceItem PENALTY/DISCOUNT
└── Debt
        ↓
Payment SUCCESS (G08)
        ↓
Invoice.paidAmount/debtAmount + Debt được cập nhật
```

Mục tiêu của tài liệu:

- Người thuê biết cách xem hóa đơn của mình và hiểu từng khoản tiền.
- Landlord, manager và accountant biết cách tạo, sửa, phát hành, hủy và đánh dấu quá hạn.
- Frontend hiểu DTO, trạng thái, công thức và quan hệ giữa invoice với debt.
- Tester biết transaction, side effect, notification và các lỗi cần kiểm tra.
- Backend developer phân biệt chức năng đang chạy với batch billing, recurring billing và các phần chưa hoàn thiện.

### 1.1. Phạm vi

| Mảng                | Chức năng                                                                       |
| ------------------- | ------------------------------------------------------------------------------- |
| Self-service renter | Danh sách và chi tiết hóa đơn của main renter                                   |
| Quản lý invoice     | List, detail, create, update draft, issue, cancel, overdue                      |
| Invoice item        | Tiền phòng, điện, nước, dịch vụ, gửi xe, internet, phạt, giảm giá và khoản khác |
| Công nợ             | Tạo Debt cùng invoice, list tenant-scoped và cập nhật trạng thái                |
| Notification        | Thông báo khi phát hành hoặc chuyển quá hạn                                     |
| Điểm giao G08       | Payment thành công cập nhật paid/debt amount và trạng thái                      |
| Nền tảng mở rộng    | `InvoiceBatch` mới có Prisma schema                                             |

### 1.2. Ngoài phạm vi

| Chức năng                             | Nhóm tài liệu |
| ------------------------------------- | ------------- |
| Hợp đồng và giá thuê snapshot         | G05           |
| Đồng hồ, reading và đơn giá điện nước | G06           |
| QR, payment, review và webhook        | G08           |
| Notification engine và kênh gửi       | G10           |
| Dashboard doanh thu/công nợ           | G11           |

### 1.3. Trạng thái triển khai

| Nhóm                   | Trạng thái            | Nhận định                                           |
| ---------------------- | --------------------- | --------------------------------------------------- |
| Tạo invoice đơn lẻ     | Đã hoạt động          | Tạo items và Debt trong transaction                 |
| Dòng RENT              | Đã hoạt động          | Lấy `Contract.monthlyPrice`                         |
| Dòng ELECTRICITY/WATER | Đã hoạt động          | Chỉ lấy reading confirmed, đúng kỳ và chưa dùng     |
| Extra item             | Đã hoạt động          | Nhập thủ công khi tạo/cập nhật draft                |
| Update draft           | Đã hoạt động          | Thay extra items, giữ snapshot fixed items          |
| Issue/cancel/overdue   | Đã hoạt động          | Chưa có state history và một số transition còn race |
| Renter xem invoice     | Đã hoạt động một phần | Chỉ main renter; filter `/me` chưa áp dụng          |
| Debt ledger            | Đã hoạt động          | Một Debt cho mỗi Invoice                            |
| Payment integration    | Đã hoạt động          | G08 cập nhật bằng transaction có invoice lock       |
| Notification           | Đã hoạt động          | Issue/overdue gửi notification                      |
| Invoice batch          | Chỉ có schema         | Chưa có API/job                                     |
| Recurring billing      | Chưa có               | Không tự lập hóa đơn hằng tháng                     |
| PDF/export             | Chưa có               | Chỉ trả dữ liệu JSON                                |

## 2. Actor, xác thực và tenant context

### 2.1. Actor và header

| Actor        | Nhóm API                | Header                                |
| ------------ | ----------------------- | ------------------------------------- |
| `TENANT`     | `/invoices/me`          | `Authorization: Bearer <accessToken>` |
| `LANDLORD`   | Invoice/debt của tenant | Bearer token và `x-tenant-id`         |
| `MANAGER`    | Invoice/debt của tenant | Bearer token và `x-tenant-id`         |
| `ACCOUNTANT` | Invoice/debt của tenant | Bearer token và `x-tenant-id`         |

Renter:

```http
Authorization: Bearer <accessToken>
```

Staff:

```http
Authorization: Bearer <accessToken>
x-tenant-id: <tenantId>
Content-Type: application/json
```

Người thuê không gửi `x-tenant-id`. Backend giới hạn bằng `Invoice.renterId=currentUserId`. Staff được kiểm tra tenant active và membership active trước khi truy vấn.

### 2.2. Main renter và co-renter

Invoice gắn với `Contract.renterId`, tức main renter. API `/invoices/me` hiện không kiểm `ContractMember`; co-renter không đọc được invoice nếu không đồng thời là `Invoice.renterId`.

## 3. Mô hình dữ liệu

### 3.1. Quan hệ chính

```text
Tenant
└── Contract
    └── Invoice
        ├── InvoiceItem[]
        │   └── MeterReading?
        ├── Debt?                 (hiện được tạo 1-1 với invoice)
        ├── Payment[]             (G08)
        ├── PaymentQrCode[]       (G08)
        └── PaymentWebhookLog[]   (G08)
```

### 3.2. Invoice và Debt

| Invoice       | Debt              | Ý nghĩa                    |
| ------------- | ----------------- | -------------------------- |
| `totalAmount` | `originalAmount`  | Tổng nghĩa vụ ban đầu      |
| `paidAmount`  | `paidAmount`      | Tổng payment `SUCCESS`     |
| `debtAmount`  | `remainingAmount` | Số tiền còn phải trả       |
| `status`      | `status`          | Trạng thái hóa đơn/công nợ |
| `dueDate`     | `dueDate`         | Ngày đến hạn               |

Prisma bảo đảm mỗi invoice có tối đa một Debt:

```text
Debt.invoiceId @unique
```

Service tạo Debt cùng transaction với Invoice, vì vậy invoice tạo qua API hiện hành luôn có Debt nếu transaction thành công.

### 3.3. Invoice item và MeterReading

`InvoiceItem.meterReadingId` chỉ được dùng cho dòng điện/nước. Các dòng tiền phòng và extra item có giá trị null.

Khi một reading đã được InvoiceItem tham chiếu, G06 chặn sửa dữ liệu hoặc đổi trạng thái reading.

## 4. Enum và trạng thái

### 4.1. InvoiceStatus

| Giá trị          | Ý nghĩa                       |
| ---------------- | ----------------------------- |
| `DRAFT`          | Hóa đơn nháp, còn được sửa    |
| `UNPAID`         | Đã phát hành, chưa thanh toán |
| `PARTIALLY_PAID` | Đã thanh toán một phần        |
| `PAID`           | Đã thanh toán đủ              |
| `OVERDUE`        | Còn nợ và đã quá hạn          |
| `CANCELED`       | Hóa đơn đã hủy                |

### 4.2. DebtStatus

| Giá trị    | Ý nghĩa                          |
| ---------- | -------------------------------- |
| `OPEN`     | Còn nợ, chưa ghi nhận thanh toán |
| `PARTIAL`  | Đã thanh toán một phần           |
| `PAID`     | Đã tất toán                      |
| `OVERDUE`  | Còn nợ quá hạn                   |
| `CANCELED` | Công nợ bị hủy cùng invoice      |

### 4.3. InvoiceItemType

| Type          | Nguồn hiện tại          | Cách đưa vào tổng |
| ------------- | ----------------------- | ----------------- |
| `RENT`        | `Contract.monthlyPrice` | Subtotal          |
| `ELECTRICITY` | MeterReading điện       | Subtotal          |
| `WATER`       | MeterReading nước       | Subtotal          |
| `SERVICE`     | Extra item thủ công     | Subtotal          |
| `PARKING`     | Extra item thủ công     | Subtotal          |
| `INTERNET`    | Extra item thủ công     | Subtotal          |
| `OTHER`       | Extra item thủ công     | Subtotal          |
| `PENALTY`     | Extra item thủ công     | Cộng riêng        |
| `DISCOUNT`    | Extra item thủ công     | Trừ riêng         |

### 4.4. InvoiceBatchStatus

```text
DRAFT | PROCESSING | COMPLETED | FAILED
```

Model và enum batch đã có trong schema nhưng chưa có endpoint hoặc worker tạo invoice hàng loạt.

## 5. Quy ước API

### 5.1. Phân trang

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

`page` mặc định `1`; `limit` mặc định `20`, tối đa `100`.

### 5.2. Billing month và date

- `billingMonth` được chuẩn hóa về ngày đầu tháng UTC.
- `from/to` trong list cũng được chuẩn hóa về ngày đầu tháng.
- Nếu có `billingMonth`, backend bỏ qua khoảng `from/to`.
- `issueDate` và `dueDate` được chuẩn hóa thành date UTC.
- Due date không được trước issue date.

### 5.3. Decimal

Database lưu tiền, quantity và unit price bằng Prisma `Decimal`. Service tạo invoice hiện chuyển các giá trị sang JavaScript `number` để tính tổng; response thực tế có thể biểu diễn Decimal dạng chuỗi tùy serializer.

### 5.4. Validation

- DTO dùng schema `strict`; field lạ bị từ chối.
- ID phải là số nguyên dương.
- Quantity và unit price không âm.
- Body update phải có ít nhất một field.
- API action issue/cancel/overdue không nhận body.

## 6. Tổng hợp endpoint

| Method  | Endpoint                | Role                                | Tenant header | Nội dung                |
| ------- | ----------------------- | ----------------------------------- | ------------- | ----------------------- |
| `GET`   | `/invoices/me`          | `TENANT`                            | Không         | List invoice của mình   |
| `GET`   | `/invoices/me/:id`      | `TENANT`                            | Không         | Detail invoice của mình |
| `GET`   | `/invoices/debts`       | `LANDLORD`, `MANAGER`, `ACCOUNTANT` | Có            | List công nợ            |
| `GET`   | `/invoices`             | Cùng nhóm staff                     | Có            | List invoice            |
| `GET`   | `/invoices/:id`         | Cùng nhóm staff                     | Có            | Detail invoice          |
| `POST`  | `/invoices`             | Cùng nhóm staff                     | Có            | Tạo invoice và Debt     |
| `PATCH` | `/invoices/:id`         | Cùng nhóm staff                     | Có            | Sửa draft               |
| `PATCH` | `/invoices/:id/issue`   | Cùng nhóm staff                     | Có            | Phát hành               |
| `PATCH` | `/invoices/:id/cancel`  | Cùng nhóm staff                     | Có            | Hủy                     |
| `PATCH` | `/invoices/:id/overdue` | Cùng nhóm staff                     | Có            | Đánh dấu quá hạn        |

## 7. API truy vấn

### 7.1. Query chung

| Field           | Invoice list  | Debt list  | Ý nghĩa                                 |
| --------------- | ------------- | ---------- | --------------------------------------- |
| `page`, `limit` | Có            | Có         | Phân trang                              |
| `billingMonth`  | Có            | Có         | Đúng một tháng                          |
| `from`, `to`    | Có            | Có         | Khoảng tháng nếu không có billing month |
| `roomId`        | Có            | Có         | Lọc phòng                               |
| `contractId`    | Có            | Có         | Lọc hợp đồng                            |
| `renterId`      | Có            | Có         | Lọc main renter                         |
| `propertyId`    | Có            | Có         | Lọc nhà trọ qua room                    |
| `search`        | Có            | Có         | Tìm invoice/renter/room                 |
| `status`        | InvoiceStatus | DebtStatus | Lọc trạng thái tương ứng                |

Search invoice:

- Invoice code.
- Renter full name, email.
- Room code, title.

Search debt:

- Invoice code.
- Renter full name, email.
- Room code, title.

### 7.2. `GET /invoices`

Chỉ trả invoice:

```text
tenantId = tenant hiện tại
deletedAt IS NULL
```

Kết quả sắp theo billing month giảm dần, sau đó created time giảm dần.

### 7.3. `GET /invoices/debts`

Debt sắp theo:

1. Due date tăng dần.
2. ID giảm dần.

Endpoint không có debt detail riêng; response list đã chứa invoice, contract, room/property và renter.

### 7.4. `GET /invoices/me`

Chỉ trả invoice có `renterId=currentUserId`, chưa xóa.

DTO tiếp nhận toàn bộ filter list, nhưng service/repository hiện chỉ dùng `page` và `limit`. Các field `status`, `billingMonth`, `from`, `to`, `roomId`, `contractId`, `renterId`, `propertyId`, `search` đang bị bỏ qua.

Endpoint hiện không loại `DRAFT`; main renter có thể thấy invoice nháp ngay sau khi staff tạo.

### 7.5. Detail

`GET /invoices/:id` giới hạn theo tenant. `GET /invoices/me/:id` giới hạn theo main renter. Không tiết lộ sự tồn tại của invoice ngoài phạm vi; kết quả là `NotFound`.

## 8. Response invoice và debt

Invoice select hiện gồm:

- Field invoice và totals.
- Contract code/status/start/end.
- Room và property/address.
- Main renter full name/email/phone.
- Invoice items.
- Reading previous/current/consumption nếu item có reading.
- Debt hiện tại.
- `_count.payments`.

`_count.payments` chỉ là số bản ghi, không phải lịch sử payment. Payment detail thuộc G08.

Debt select gồm:

- Original/paid/remaining amount.
- Status, due date, resolved time.
- Invoice summary.
- Contract summary.
- Room/property.
- Renter.

## 9. `POST /invoices`

### 9.1. Body

| Field          | Bắt buộc | Validation/ý nghĩa                      |
| -------------- | -------- | --------------------------------------- |
| `contractId`   | Có       | ID dương                                |
| `billingMonth` | Có       | Date, chuẩn hóa đầu tháng               |
| `issueDate`    | Không    | Mặc định ngày hiện tại                  |
| `dueDate`      | Không    | Mặc định theo contract                  |
| `note`         | Không    | Nullable, tối đa 5000                   |
| `status`       | Không    | `DRAFT` hoặc `UNPAID`, mặc định `DRAFT` |
| `extraItems`   | Không    | Tối đa 100, mặc định `[]`               |

Extra item:

```json
{
  "itemType": "SERVICE",
  "description": "Phí vệ sinh tháng 07/2026",
  "quantity": 1,
  "unitPrice": 100000
}
```

### 9.2. Điều kiện contract

Backend tìm contract:

```text
id = contractId
tenantId = tenant hiện tại
status = ACTIVE
deletedAt IS NULL
startDate <= ngày cuối billing month
endDate >= ngày đầu billing month
room.deletedAt IS NULL
```

Contract phải đang `ACTIVE` tại thời điểm gọi API. Một contract đã chuyển `EXPIRED/TERMINATED` không được dùng, kể cả khi billing month nằm trong thời gian trước đây contract từng có hiệu lực.

### 9.3. Điều kiện reading

Backend lấy reading đồng thời:

```text
tenantId = invoice tenant
contractId = contract
roomId = contract room
billingMonth = invoice month
status = CONFIRMED
chưa có InvoiceItem tham chiếu
```

Không bắt buộc có đủ cả điện và nước. Invoice vẫn tạo được nếu không tìm thấy reading.

### 9.4. Công thức

```text
subtotal =
  tổng RENT, ELECTRICITY, WATER,
  SERVICE, PARKING, INTERNET, OTHER

penaltyAmount = tổng PENALTY
discountAmount = tổng DISCOUNT

totalAmount = max(0, subtotal + penaltyAmount - discountAmount)
paidAmount = 0
debtAmount = totalAmount
```

Dòng RENT:

```text
quantity = 1
unitPrice = Contract.monthlyPrice
amount = Contract.monthlyPrice
```

Dòng utility dùng quantity, unit price và amount đã snapshot trên MeterReading.

### 9.5. Issue date và due date mặc định

Nếu không truyền issue date, dùng ngày hiện tại.

Due date mặc định lấy `paymentDueDay` của contract trong billing month, giới hạn tối đa ngày 28. Nếu ngày đó trước issue date, due date được đẩy lên bằng issue date.

### 9.6. Invoice code

Backend thử tối đa 10 lần:

```text
INV-{tenantId}-{YYYYMM}-{randomSuffix}
```

`invoiceCode` unique toàn hệ thống.

### 9.7. Transaction tạo dữ liệu

Trong một transaction:

1. Tạo Invoice.
2. Tạo tất cả InvoiceItem nested.
3. Tạo Debt theo invoice.
4. Trả invoice đầy đủ.

Debt trạng thái được tính từ status/remaining amount. Với hóa đơn có giá trị dương, cả invoice `DRAFT` và `UNPAID` hiện tạo Debt `OPEN`.

Nếu tạo trực tiếp với status `UNPAID`, notification “Hóa đơn mới” được gửi sau transaction.

### 9.8. Ví dụ

```json
{
  "contractId": 501,
  "billingMonth": "2026-07-15",
  "issueDate": "2026-07-01",
  "dueDate": "2026-07-05",
  "status": "DRAFT",
  "note": "Vui lòng thanh toán đúng hạn",
  "extraItems": [
    {
      "itemType": "SERVICE",
      "description": "Phí vệ sinh",
      "quantity": 1,
      "unitPrice": 100000
    },
    {
      "itemType": "PARKING",
      "description": "Gửi xe máy",
      "quantity": 2,
      "unitPrice": 100000
    },
    {
      "itemType": "DISCOUNT",
      "description": "Giảm giá hỗ trợ",
      "quantity": 1,
      "unitPrice": 50000
    }
  ]
}
```

## 10. `PATCH /invoices/:id`

Chỉ invoice `DRAFT` được sửa.

Body:

- `issueDate?`
- `dueDate?`
- `note?`
- `extraItems?`

Không cho sửa:

- Contract.
- Room/renter.
- Billing month.
- Code.
- Status.
- Fixed item trực tiếp.

Backend:

1. Lấy fixed items hiện có loại `RENT`, `ELECTRICITY`, `WATER`.
2. Nếu không gửi extra items, giữ các extra item hiện có.
3. Nếu gửi, thay bằng danh sách mới.
4. Tính lại totals.
5. Trong transaction xóa toàn bộ item rồi tạo lại.
6. Cập nhật invoice và Debt.

Backend không truy vấn lại contract price hoặc reading mới. Fixed items được copy từ snapshot của draft hiện có.

## 11. Action và state transition

### 11.1. `PATCH /invoices/:id/issue`

Không có body.

Điều kiện:

```text
Invoice.status = DRAFT
```

Transaction:

```text
Invoice.status → UNPAID
Debt.status    → OPEN
```

Sau transaction, notification được gửi cho renter.

### 11.2. `PATCH /invoices/:id/overdue`

Không có body.

Điều kiện:

- Invoice đang `UNPAID` hoặc `PARTIALLY_PAID`.
- `debtAmount > 0`.
- Due date trước ngày hiện tại.

Transaction:

```text
Invoice.status → OVERDUE
Debt.status    → OVERDUE
```

Sau transaction, notification quá hạn được gửi.

### 11.3. `PATCH /invoices/:id/cancel`

Không có body.

Không hủy được nếu:

- Invoice `PAID`.
- Có bất kỳ Payment `SUCCESS`.

Kết quả:

```text
Invoice.status → CANCELED
Debt.status    → CANCELED
Debt.resolvedAt = current time
```

Hiện không tự reject payment pending, không hủy QR G08 và không gỡ InvoiceItem khỏi reading.

## 12. G08 cập nhật invoice và debt

Khi staff approve Payment:

1. G08 khóa invoice bằng PostgreSQL `FOR UPDATE`.
2. Aggregate toàn bộ Payment `SUCCESS`.
3. Tính:

```text
newPaidAmount = sum(success payments)
remainingAmount = totalAmount - newPaidAmount
```

4. Cập nhật:

| Điều kiện                   | Invoice          | Debt                     |
| --------------------------- | ---------------- | ------------------------ |
| Remaining = 0               | `PAID`           | `PAID`, set `resolvedAt` |
| Remaining > 0, chưa quá hạn | `PARTIALLY_PAID` | `PARTIAL`                |
| Remaining > 0, đã quá hạn   | `OVERDUE`        | `OVERDUE`                |

Payment pending hoặc failed không làm giảm công nợ.

## 13. Lỗi thường gặp

| Tình huống                                             | Kết quả                   |
| ------------------------------------------------------ | ------------------------- |
| Contract không thuộc tenant/không active/không giao kỳ | `NotFound`                |
| Room của contract đã xóa                               | `NotFound`                |
| Contract đã có invoice cùng tháng                      | `Conflict`                |
| Due date trước issue date                              | `BadRequest`              |
| Update invoice không phải draft                        | `BadRequest`              |
| Issue invoice không phải draft                         | `BadRequest`              |
| Overdue invoice không còn nợ/sai status/chưa đến hạn   | `BadRequest`              |
| Cancel invoice paid                                    | `BadRequest`              |
| Cancel invoice có payment success                      | `BadRequest`              |
| Invoice ngoài tenant hoặc ngoài renter                 | `NotFound`                |
| Thiếu tenant header                                    | `TENANT_CONTEXT_REQUIRED` |
| Không thuộc tenant                                     | `TENANT_ACCESS_DENIED`    |
| Sai role                                               | `Forbidden`               |

## 14. Ví dụ sử dụng

Các ví dụ giả định backend chạy tại `http://localhost:3000`.

### 14.1. Renter xem invoice

```bash
curl "http://localhost:3000/invoices/me?page=1&limit=20" \
  -H "Authorization: Bearer <RENTER_ACCESS_TOKEN>"
```

```bash
curl "http://localhost:3000/invoices/me/801" \
  -H "Authorization: Bearer <RENTER_ACCESS_TOKEN>"
```

### 14.2. Staff lọc invoice và debt

```bash
curl "http://localhost:3000/invoices?billingMonth=2026-07-01&status=UNPAID&propertyId=30" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

```bash
curl "http://localhost:3000/invoices/debts?status=OVERDUE&from=2026-01-01&to=2026-12-01" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

### 14.3. Tạo invoice

```bash
curl -X POST "http://localhost:3000/invoices" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": 501,
    "billingMonth": "2026-07-01",
    "status": "DRAFT",
    "extraItems": [
      {
        "itemType": "SERVICE",
        "description": "Phí vệ sinh",
        "quantity": 1,
        "unitPrice": 100000
      }
    ]
  }'
```

### 14.4. Update draft

```bash
curl -X PATCH "http://localhost:3000/invoices/801" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "dueDate": "2026-07-10",
    "note": "Đã điều chỉnh hạn thanh toán",
    "extraItems": [
      {
        "itemType": "SERVICE",
        "description": "Phí vệ sinh",
        "quantity": 1,
        "unitPrice": 100000
      },
      {
        "itemType": "PENALTY",
        "description": "Phí vi phạm",
        "quantity": 1,
        "unitPrice": 50000
      }
    ]
  }'
```

### 14.5. Issue, overdue và cancel

```bash
curl -X PATCH "http://localhost:3000/invoices/801/issue" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

```bash
curl -X PATCH "http://localhost:3000/invoices/801/overdue" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

```bash
curl -X PATCH "http://localhost:3000/invoices/802/cancel" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

## 15. Chức năng chưa hoàn thiện và hướng triển khai

Mọi API đề xuất trong phần này đều **chưa tồn tại**.

### 15.1. Toàn vẹn tài chính và concurrency

| #   | Hiện trạng                                  | Ảnh hưởng                                        | Hướng triển khai                                               | Dependency         | Tiêu chí hoàn thành                  |
| --- | ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------- | ------------------ | ------------------------------------ |
| 1   | Không có unique `(contractId,billingMonth)` | Concurrent create có thể tạo invoice trùng       | Partial/normal unique phù hợp soft delete hoặc idempotency key | Migration          | Hai request: một thành công, một 409 |
| 2   | Invoice code check-before-create            | Unique race có thể thành 500                     | Catch Prisma P2002 và retry/map conflict                       | Prisma             | Lỗi ổn định, có integration test     |
| 3   | Issue/cancel/overdue read rồi update        | Transition đồng thời có thể gửi notification lặp | CAS theo current status hoặc lock row                          | PostgreSQL         | Chỉ một transition thắng             |
| 4   | Tổng tiền dùng JS number                    | Rủi ro precision                                 | Dùng Prisma.Decimal/decimal library end-to-end                 | G08                | Golden tests cho số lẻ               |
| 5   | Không có rounding policy                    | Client/backend có thể lệch                       | Chốt scale, rounding mode và VND integer policy                | Product/accounting | Công thức được dùng thống nhất       |
| 6   | `QUARTERLY` bị bỏ qua                       | Hợp đồng quý vẫn thu một tháng                   | Billing-cycle strategy                                         | G05                | Monthly/quarterly cases đúng         |
| 7   | Không proration giữa tháng                  | Có thể thu đủ tháng sai nghiệp vụ                | Move-in/out proration policy                                   | G05/G06            | Boundary cases có test               |
| 8   | Zero-total status chưa chốt                 | Invoice và Debt có thể lệch trạng thái           | Quy tắc zero invoice/credit                                    | Accounting         | Invoice/Debt consistent              |
| 9   | Discount vượt subtotal vẫn hợp lệ           | Discount snapshot lớn hơn obligation             | Validation hoặc credit balance policy                          | Product            | Không tạo dữ liệu khó hiểu           |
| 10  | Chưa có tax/VAT                             | Không đáp ứng nghiệp vụ mở rộng                  | Tax line/snapshot và legal invoice fields                      | Product/legal      | Totals đối soát được                 |

### 15.2. Invoice lifecycle

| #   | Hiện trạng                          | Ảnh hưởng                         | Hướng triển khai                                | Dependency      | Tiêu chí hoàn thành             |
| --- | ----------------------------------- | --------------------------------- | ----------------------------------------------- | --------------- | ------------------------------- |
| 11  | Renter thấy draft                   | Lộ hóa đơn chưa phát hành         | Renter query chỉ trả issued/history phù hợp     | Self-service    | Draft không xuất hiện           |
| 12  | Overdue thủ công                    | Invoice quá hạn có thể vẫn unpaid | Scheduler idempotent                            | BullMQ/schedule | Tự chuyển đúng ngày             |
| 13  | Không có status history             | Khó audit                         | InvoiceStatusHistory/outbox event               | Audit           | Có actor/before/after/time      |
| 14  | Cancel thiếu reason/time riêng      | Khó đối soát                      | Cancel DTO reason và audit fields               | Audit           | Response/history có lý do       |
| 15  | Cancel không xử lý pending payment  | Payment treo                      | Transaction hoặc workflow reject/cancel pending | G08             | Không còn pending không xử lý   |
| 16  | Cancel không đóng QR/link           | Renter vẫn có thể trả vào link cũ | Hủy tất cả QR và provider link                  | G08/PayOS       | Link không còn payable          |
| 17  | Notification ngoài transaction      | State đổi nhưng event có thể mất  | Transactional outbox + retry                    | G10             | Event eventually delivered      |
| 18  | Không có void/reissue/credit note   | Không sửa sai invoice đã issue    | Legal state machine và replacement link         | Accounting      | Truy vết invoice nguồn/thay thế |
| 19  | Có `deletedAt`, chưa có archive API | Soft delete chưa vận hành         | Archive chỉ với điều kiện an toàn               | Audit/G08       | Không phá history/payment       |
| 20  | Không có closing period             | Dữ liệu kỳ cũ có thể thay đổi     | Month closing/permission override               | Accounting      | Kỳ đóng không mutate            |

### 15.3. Item, reading và dịch vụ

| #   | Hiện trạng                             | Ảnh hưởng                      | Hướng triển khai                              | Dependency | Tiêu chí hoàn thành              |
| --- | -------------------------------------- | ------------------------------ | --------------------------------------------- | ---------- | -------------------------------- |
| 21  | Không bắt buộc đủ reading              | Issue thiếu điện/nước          | Completeness rule/warning theo room config    | G06        | Thiếu reading được hiển thị/chặn |
| 22  | Draft không lấy reading mới            | Reading confirm sau bị bỏ sót  | Regenerate fixed items có preview             | G06        | Bổ sung đúng, không duplicate    |
| 23  | Reading khóa từ lúc draft              | Khó sửa chỉ số trước issue     | Chốt lock tại draft hay issue; support detach | G06        | Workflow không phá audit         |
| 24  | Cancel vẫn giữ reading reference       | Reading không tái sử dụng được | Release/supersede policy trong transaction    | G06        | Reissue đúng kỳ được             |
| 25  | Canceled invoice chặn invoice thay thế | Không lập lại hóa đơn cùng kỳ  | Replacement/version invariant                 | Migration  | Một effective invoice/kỳ         |
| 26  | Không regenerate rent/utilities        | Snapshot lỗi khó sửa           | Rebuild command có change summary             | G05/G06    | Chỉ draft được rebuild           |
| 27  | Phí dịch vụ nhập tay                   | Dễ thiếu/sai phí               | Service catalog và assignment                 | G06        | Auto item đúng kỳ                |
| 28  | Không phát hiện extra item trùng       | Có thể thu trùng               | Business key/template rule                    | Product    | Duplicate được cảnh báo          |
| 29  | Không có item audit                    | Không biết khoản nào thay đổi  | Item snapshot version/diff                    | Audit      | Truy vết update draft            |

### 15.4. Query và self-service

| #   | Hiện trạng                      | Ảnh hưởng                   | Hướng triển khai                    | Dependency  | Tiêu chí hoàn thành        |
| --- | ------------------------------- | --------------------------- | ----------------------------------- | ----------- | -------------------------- |
| 30  | Filter `/invoices/me` bị bỏ qua | UI filter sai               | Áp dụng filter an toàn theo renter  | Repository  | Contract test từng filter  |
| 31  | Không có `/debts/me`            | Renter khó xem tổng công nợ | Self-service debt summary/list      | G08         | Chỉ đọc debt của mình      |
| 32  | Co-renter không thấy invoice    | Trải nghiệm chưa chốt       | Policy main/co-renter               | G05         | Quyền có test              |
| 33  | Invoice chỉ trả payment count   | Không xem lịch sử trả tiền  | Link/expand hoặc G08 `/payments/me` | G08         | Renter thấy payment status |
| 34  | Không PDF/email/export          | Không có chứng từ tải về    | Render immutable snapshot           | Storage/G10 | File đúng invoice version  |
| 35  | Không sort tùy chọn             | Bảng tài chính hạn chế      | Allowlist sort                      | API         | Stable pagination          |
| 36  | Không validate `from<=to`       | Query khó hiểu              | Zod cross-field refine              | API         | Invalid range trả 400      |

### 15.5. Invoice batch và recurring billing

| #   | Hiện trạng                     | Hướng triển khai                               | Tiêu chí hoàn thành                               |
| --- | ------------------------------ | ---------------------------------------------- | ------------------------------------------------- |
| 37  | `InvoiceBatch` chỉ có schema   | CRUD/preview tenant-scoped                     | Preview liệt kê contract eligible/missing reading |
| 38  | Không có batch worker          | BullMQ job idempotent theo tenant/month        | Retry không tạo invoice trùng                     |
| 39  | Không có partial failure model | Lưu item result/error theo contract            | User biết invoice nào lỗi                         |
| 40  | Không có resume/retry          | Retry failed items, giữ successful             | Không duplicate                                   |
| 41  | Không có batch notification    | Thông báo completed/failed                     | Đúng actor và summary                             |
| 42  | Không recurring schedule       | Cấu hình ngày lập hóa đơn theo tenant/contract | Tự tạo đúng kỳ                                    |

### 15.6. Kiểm thử và vận hành

| #   | Hiện trạng                           | Hướng triển khai                           | Tiêu chí hoàn thành              |
| --- | ------------------------------------ | ------------------------------------------ | -------------------------------- |
| 43  | Chưa có PostgreSQL integration test  | Test unique, transaction, tenant isolation | Rollback và race được chứng minh |
| 44  | Chưa có E2E G05-G08                  | Contract → reading → invoice → payment     | Totals/ledger đúng DB            |
| 45  | Chưa có reconciliation invariant job | Kiểm tra Invoice, Debt, SUCCESS payments   | Sai lệch được alert/sửa có audit |
| 46  | Chưa benchmark list debt             | Explain analyze/index review               | Đạt SLO với dữ liệu mục tiêu     |

## 16. Thứ tự ưu tiên backlog

1. Unique invoice kỳ, CAS state transition và Decimal/rounding.
2. Cancel/reissue, release reading và đóng QR/payment.
3. Quarterly, proration và utility completeness.
4. Overdue scheduler, outbox và audit history.
5. Filter self-service, debt renter và PDF.
6. InvoiceBatch, recurring billing và closing period.
7. PostgreSQL integration, reconciliation và E2E G05-G08.

## 17. Checklist kiểm thử tài liệu

### 17.1. Create

- [ ] Contract đúng tenant, active và giao billing month.
- [ ] Duplicate contract/month bị từ chối theo hành vi hiện tại.
- [ ] RENT lấy monthly price.
- [ ] Chỉ confirmed/unused reading được đưa vào.
- [ ] Extra item và công thức totals đúng.
- [ ] Due date không trước issue date.
- [ ] Invoice/items/debt rollback cùng nhau.

### 17.2. Update/action

- [ ] Chỉ draft được update/issue.
- [ ] Update thay extra item, giữ fixed item.
- [ ] Overdue chỉ khi còn nợ và quá hạn.
- [ ] Paid/success-payment invoice không cancel.
- [ ] Invoice và Debt đổi trạng thái cùng transaction.

### 17.3. Access

- [ ] Staff bắt buộc tenant context.
- [ ] Tenant isolation list/detail/debt.
- [ ] Renter chỉ đọc invoice có renterId của mình.
- [ ] Ghi nhận draft visibility và filter `/me` chưa hoạt động.

### 17.4. G08 integration

- [ ] Pending/failed payment không giảm debt.
- [ ] Partial payment cập nhật hai bảng đúng.
- [ ] Full payment tất toán và set resolved time.
- [ ] Overdue partial vẫn giữ overdue.

## 18. Tiêu chí nghiệm thu tài liệu

- Người mới hiểu quan hệ Contract → Reading → Invoice → Debt → Payment.
- Frontend biết chính xác header, query, body, response và state action.
- Accountant hiểu công thức, snapshot và điều kiện phát hành/hủy/quá hạn.
- Tester biết transaction nào phải nhất quán.
- Backend developer nhận diện được duplicate race, precision gap và canceled-invoice gap.
- InvoiceBatch/recurring/PDF không bị mô tả như tính năng đang hoạt động.
- G07 không mô tả lại chi tiết PayOS/payment review thuộc G08.

## 19. Nguồn mã đối chiếu

- `backend/src/modules/invoices/invoices.controller.ts`
- `backend/src/modules/invoices/invoices.service.ts`
- `backend/src/modules/invoices/model/invoices.model.ts`
- `backend/src/modules/invoices/repositories/invoices.repo.ts`
- `backend/src/modules/utility-meters`
- `backend/src/modules/contracts`
- `backend/src/modules/payments/repositories/payments.repo.ts`
- `backend/src/modules/notifications/notification-events.service.ts`
- `backend/prisma/schema.prisma`
- `backend/docs/systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md`
- `backend/docs/systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md`
