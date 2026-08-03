# G08 - Đặc tả thanh toán, QR, đối soát và webhook

> **Snapshot 31/07/2026:** QR/manual confirmation/staff approve-reject, PayOS invoice webhook và PayOS subscription billing đã có API. Provider reference unique, CAS và webhook digest/sanitization đã triển khai; provider/concurrency/retention lịch sử cần staging. Snapshot giữ nguyên các bổ sung G08 chưa commit.

## 1. Tổng quan

Tài liệu này mô tả nhóm tính năng G08 của backend: tạo mã QR PayOS cho hóa đơn, người thuê gửi xác nhận chuyển khoản, staff đối soát và duyệt/từ chối payment, landlord thanh toán gói SaaS, cập nhật hóa đơn/công nợ và tiếp nhận webhook PayOS dùng chung.

Luồng tổng quát:

```text
Invoice UNPAID/PARTIALLY_PAID/OVERDUE (G07)
├── Renter tạo PayOS QR
│       ↓
│   PayOS nhận tiền và gửi webhook
│       ↓
│   Payment QR/PENDING
│
└── Renter gửi manual confirmation
        ↓
    Payment BANK_TRANSFER/PENDING
        ↓
Landlord/Manager/Accountant review
    ├── Approve → Payment SUCCESS
    │              ↓
    │       Invoice + Debt cập nhật
    └── Reject → Payment FAILED

Landlord chọn plan + billing cycle
        ↓
SubscriptionPayment PayOS/PENDING
        ↓
PayOS nhận tiền và gửi cùng webhook
        ↓
SubscriptionPayment PAID
    ├── RENEWAL → gia hạn Subscription hiện tại
    └── PLAN_CHANGE → kích hoạt Subscription PENDING
```

Webhook đã được triển khai trong mã nguồn hiện tại. Với payment hóa đơn, webhook hợp lệ chỉ tạo `Payment PENDING` và vẫn cần staff review trước khi tác động tới sổ công nợ. Với `SubscriptionPayment`, webhook PayOS đã xác minh là nguồn sự thật: backend chuyển payment thành `PAID` và gia hạn/kích hoạt subscription ngay trong một transaction.

Mục tiêu của tài liệu:

- Người thuê biết cách lấy/tạo QR và gửi xác nhận thanh toán.
- Landlord, manager và accountant biết cách lọc, xem, đối soát và review payment.
- Landlord biết cách tạo, tái sử dụng hoặc hủy checkout mua/đổi/gia hạn gói SaaS.
- Frontend hiểu payment status, QR status và dữ liệu nào thay đổi sau approve.
- Người vận hành biết cấu hình PayOS, webhook signature, log sanitization và retention.
- Tester/backend developer hiểu row lock, idempotency, các nhánh webhook và phần còn thiếu.

### 1.1. Phạm vi

| Mảng                | Chức năng                                                   |
| ------------------- | ----------------------------------------------------------- |
| Renter QR           | Lấy QR active hoặc tạo PayOS payment link                   |
| Manual confirmation | Gửi số tiền, reference, evidence, note và paid time         |
| Staff payment       | List, detail, approve, reject                               |
| Ledger              | Aggregate payment success, cập nhật Invoice và Debt         |
| PayOS webhook       | Verify signature, match QR, tạo pending payment             |
| Idempotency         | Unique provider/transaction reference và duplicate handling |
| Webhook security    | Allowlist payload, HMAC digest, sanitized error             |
| Maintenance         | BullMQ retention job xóa webhook log cũ                     |
| Notification        | Staff nhận pending; renter nhận review result               |
| Subscription PayOS  | Landlord checkout, cancel, history và kích hoạt qua webhook |
| Webhook routing     | Dùng chung endpoint cho invoice và subscription payment     |

### 1.2. Ngoài phạm vi

| Chức năng                                              | Nhóm tài liệu |
| ------------------------------------------------------ | ------------- |
| Tạo/phát hành invoice và Debt                          | G07           |
| Quản trị catalog plan và admin override subscription   | G02           |
| Frontend/mobile checkout subscription                  | G02/frontend  |
| Proration, auto-renew scheduler và refund subscription | G02           |
| Notification engine và push/realtime                   | G10           |
| Dashboard doanh thu/payment                            | G11           |

### 1.3. Trạng thái triển khai

| Nhóm                       | Trạng thái             | Nhận định                                            |
| -------------------------- | ---------------------- | ---------------------------------------------------- |
| PayOS QR/payment link      | Đã hoạt động theo code | Cần credential/network thật để kiểm chứng môi trường |
| Tái sử dụng QR             | Đã hoạt động           | Cùng invoice, debt amount và còn hiệu lực            |
| Manual confirmation        | Đã hoạt động           | Tạo payment pending, chưa giảm debt                  |
| Staff list/detail          | Đã hoạt động           | Tenant-scoped                                        |
| Approve/reject             | Đã hoạt động           | Approve có invoice row lock và CAS payment           |
| Partial/full payment       | Đã hoạt động           | Cập nhật Invoice/Debt trong transaction              |
| PayOS webhook              | Đã hoạt động           | Verify một lần, route invoice hoặc subscription      |
| Idempotency webhook        | Đã hoạt động           | Unique `(provider, transactionCode)`                 |
| Webhook log sanitization   | Đã hoạt động           | Không lưu các field ngân hàng/signature nhạy cảm     |
| HMAC digest                | Đã hoạt động           | Có key version và production validation              |
| Retention job              | Đã hoạt động           | BullMQ lúc 02:00 hằng ngày                           |
| Payment history của renter | Chưa có                | Không có `/payments/me`                              |
| Refund/reversal            | Chưa có                | Chỉ có enum                                          |
| Cash/wallet                | Chưa có API            | Chỉ có enum                                          |
| Provider reconciliation    | Chưa có                | Không tự hỏi lại PayOS khi mất webhook               |
| Subscription checkout      | Đã hoạt động           | Giá lấy từ plan; một checkout pending mỗi tenant     |
| Subscription webhook       | Đã hoạt động           | Idempotent; gia hạn/đổi gói trong transaction        |
| PayOS provider dùng chung  | Đã hoạt động           | `PayosModule` phục vụ invoice và subscription        |

### 1.4. Các cảnh báo cũ đã được sửa

Không ghi các mục sau như lỗi hiện tại:

- Approve payment đã khóa invoice bằng PostgreSQL `FOR UPDATE`.
- Transition payment đã dùng conditional `updateMany where status=PENDING`.
- Payment PayOS đã có unique composite `(provider, transactionCode)`.
- Duplicate webhook được nhận diện tại database.
- Webhook payload được allowlist; signature, số/tên tài khoản đối tác không được lưu trong JSON log.
- Payload gốc có HMAC-SHA256 digest và key version.
- Đã có job retention webhook log.
- Invoice QR và subscription checkout dùng chung sequence sinh `orderCode`.
- Webhook invoice lookup bắt buộc khớp đồng thời `orderCode` và `paymentLinkId`.
- Webhook không khớp invoice được phân luồng tiếp sang `SubscriptionPayment`, không kết luận failed ngay.

Các cơ chế này vẫn cần PostgreSQL/concurrency và môi trường PayOS integration test.

## 2. Actor, xác thực và rate limit

### 2.1. Actor và header

| Actor        | API                                         | Header                               |
| ------------ | ------------------------------------------- | ------------------------------------ |
| `TENANT`     | QR và confirmation của invoice mình         | Bearer token                         |
| `LANDLORD`   | List/detail/review payment                  | Bearer + `x-tenant-id`               |
| `LANDLORD`   | Subscription checkout/history/cancel        | Bearer; tenant lấy từ active context |
| `MANAGER`    | List/detail/review payment                  | Bearer + `x-tenant-id`               |
| `ACCOUNTANT` | List/detail/review payment                  | Bearer + `x-tenant-id`               |
| `ADMIN`      | Đối soát subscription payment toàn hệ thống | Bearer                               |
| PayOS        | `POST /payment-webhooks/payos`              | Không Bearer; payload có signature   |

Renter:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Staff:

```http
Authorization: Bearer <accessToken>
x-tenant-id: <tenantId>
Content-Type: application/json
```

### 2.2. Webhook public không có nghĩa bỏ xác minh

Webhook dùng `AuthType.None` để PayOS gọi mà không cần access token. `PayosService.verifyWebhook` kiểm tra signature bằng PayOS checksum key trước khi business logic chấp nhận giao dịch.

Payload sai schema/signature bị từ chối. Global Redis throttler vẫn áp dụng vì `ThrottlerGuard` là global guard.

## 3. Mô hình dữ liệu

```text
Invoice
├── PaymentQrCode[]
├── Payment[]
│   ├── payer: User
│   ├── approvedBy: User?
│   ├── rejectedBy: User?
│   └── qrCode: PaymentQrCode?
└── PaymentWebhookLog[]

Subscription
├── SubscriptionPayment[]
│   ├── tenant: Tenant
│   ├── createdBy/updatedBy: User?
│   └── webhookLogs: PaymentWebhookLog[]
└── plan: Plan
```

### 3.1. Payment

| Field                     | Ý nghĩa                                           |
| ------------------------- | ------------------------------------------------- |
| `tenantId`                | Tenant nhận tiền                                  |
| `invoiceId`               | Invoice được thanh toán                           |
| `payerId`                 | User thanh toán                                   |
| `qrCodeId`                | QR liên quan, có thể null                         |
| `amount`                  | Số tiền payment                                   |
| `method`                  | Cash, bank transfer, QR hoặc wallet               |
| `provider`                | `MANUAL_CONFIRMATION`, `PayOS` hoặc provider khác |
| `transactionCode`         | Reference đối soát                                |
| `status`                  | PENDING/SUCCESS/FAILED/CANCELED/REFUNDED          |
| `paidAt`                  | Thời điểm trả tiền theo renter/provider/review    |
| `submittedAt`             | Thời điểm gửi xác nhận vào hệ thống               |
| `evidenceUrl`             | URL minh chứng                                    |
| `renterNote`              | Ghi chú renter/provider                           |
| `approvedById/approvedAt` | Dữ liệu duyệt                                     |
| `rejectedById/rejectedAt` | Dữ liệu từ chối                                   |
| `landlordNote`            | Ghi chú đối soát                                  |

Prisma có:

```text
@@unique([provider, transactionCode])
```

Nhiều payment có `transactionCode=null` vẫn được phép theo hành vi PostgreSQL.

### 3.2. PaymentQrCode

QR lưu:

- Tenant, invoice và provider.
- PayOS `orderCode`, `paymentLinkId`.
- QR content, checkout URL và optional image URL.
- Amount.
- Provider status.
- Expiration time.
- Internal QR status.

`orderCode` và `paymentLinkId` unique.

### 3.3. PaymentWebhookLog

Log chứa field đối soát đã chọn, payload sanitized, HMAC digest, digest key version, signature validity, trạng thái xử lý và error message.

Tenant/invoice có thể null khi webhook chưa map được QR. Log subscription dùng `subscriptionPaymentId`; do đó một webhook có thể liên kết invoice hoặc subscription payment mà vẫn dùng chung cơ chế sanitize, digest và retention.

### 3.4. SubscriptionPayment

`SubscriptionPayment` lưu snapshot và định danh đối soát của checkout gói SaaS:

| Field                        | Ý nghĩa                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `subscriptionId`, `tenantId` | Subscription đích; composite foreign key bảo đảm cùng tenant                   |
| `purpose`                    | `RENEWAL` hoặc `PLAN_CHANGE`                                                   |
| `amount`                     | Snapshot từ `Plan.priceMonthly` hoặc `priceYearly`; client không truyền amount |
| `provider`                   | Hiện chỉ hỗ trợ `PayOS`                                                        |
| `orderCode`, `paymentLinkId` | Hai định danh bắt buộc phải cùng khớp khi nhận webhook                         |
| `checkoutUrl`, `qrContent`   | Dữ liệu checkout/QR trả cho landlord                                           |
| `providerStatus`             | Trạng thái gần nhất nhận từ PayOS                                              |
| `transactionCode`, `paidAt`  | Reference và thời điểm thanh toán đã xác minh                                  |
| `expiredAt`                  | Hạn của payment link                                                           |
| `createdById`, `updatedById` | Audit actor                                                                    |

Ràng buộc quan trọng:

- Unique `orderCode`, `paymentLinkId` và `(provider, transactionCode)`.
- Partial unique index chỉ cho một `SubscriptionPayment PENDING` trên mỗi tenant.
- Partial unique index chỉ cho một `Subscription ACTIVE` và một `Subscription PENDING` trên mỗi tenant.
- Invoice QR và subscription checkout lấy `orderCode` từ sequence PostgreSQL `payos_order_code_seq` dùng chung, bắt đầu ở vùng mã cao để tránh trùng dữ liệu cũ.

## 4. Enum và ý nghĩa

### 4.1. PaymentMethod

| Giá trị         | API hiện tạo được          |
| --------------- | -------------------------- |
| `BANK_TRANSFER` | Manual renter confirmation |
| `QR`            | PayOS verified webhook     |
| `CASH`          | Chưa có API                |
| `WALLET`        | Chưa có API                |

### 4.2. PaymentStatus

| Giá trị    | Ý nghĩa/cách đạt hiện tại              |
| ---------- | -------------------------------------- |
| `PENDING`  | Manual confirmation hoặc PayOS webhook |
| `SUCCESS`  | Staff approve                          |
| `FAILED`   | Staff reject                           |
| `CANCELED` | Có enum, chưa có API                   |
| `REFUNDED` | Có enum, chưa có API                   |

Payment bị staff từ chối dùng `FAILED`, không có status `REJECTED`.

### 4.3. QrCodeStatus

| Giá trị    | Cách đạt hiện tại                                 |
| ---------- | ------------------------------------------------- |
| `ACTIVE`   | QR draft/link mới                                 |
| `PAID`     | Payment liên kết được approve và tất toán invoice |
| `CANCELED` | Tạo link PayOS lỗi                                |
| `EXPIRED`  | Có enum nhưng chưa có job cập nhật                |

Query active QR kiểm thêm `expiredAt>now`, nên QR hết thời gian không được trả dù status trong DB vẫn có thể là `ACTIVE`.

### 4.4. WebhookLogStatus

| Giá trị     | Ý nghĩa                                                       |
| ----------- | ------------------------------------------------------------- |
| `RECEIVED`  | Đã nhận, model có default                                     |
| `PROCESSED` | Đã tạo invoice payment mới hoặc hoàn tất subscription payment |
| `IGNORED`   | Business event không thành công hoặc duplicate                |
| `FAILED`    | Signature/payload/mapping/amount/reference conflict lỗi       |

### 4.5. Subscription status và payment status

`SubscriptionStatus` bổ sung `PENDING` cho subscription chờ checkout đổi gói. `SubscriptionPaymentStatus` gồm:

| Giá trị    | Ý nghĩa/cách đạt hiện tại                                             |
| ---------- | --------------------------------------------------------------------- |
| `PENDING`  | Checkout đã tạo và đang chờ PayOS                                     |
| `PAID`     | Webhook hợp lệ đã claim payment và cập nhật subscription              |
| `FAILED`   | Tạo payment link thất bại                                             |
| `CANCELED` | Landlord hủy checkout; plan-change subscription liên quan cũng bị hủy |
| `EXPIRED`  | Checkout quá hạn; được phát hiện khi đọc/tạo checkout tiếp theo       |
| `REFUNDED` | Có enum nhưng chưa có API/luồng refund                                |

## 5. Tổng hợp endpoint

| Method  | Endpoint                                 | Actor           | Tenant header | Nội dung                                  |
| ------- | ---------------------------------------- | --------------- | ------------- | ----------------------------------------- |
| `GET`   | `/invoices/me/:id/payment-qr`            | `TENANT`        | Không         | Lấy QR active đúng debt                   |
| `POST`  | `/invoices/me/:id/payment-qr`            | `TENANT`        | Không         | Tạo/tái sử dụng QR                        |
| `POST`  | `/invoices/me/:id/payment-confirmations` | `TENANT`        | Không         | Gửi manual confirmation                   |
| `GET`   | `/payments`                              | Staff tài chính | Có            | List payment                              |
| `GET`   | `/payments/:id`                          | Staff tài chính | Có            | Detail payment                            |
| `PATCH` | `/payments/:id/approve`                  | Staff tài chính | Có            | Duyệt payment                             |
| `PATCH` | `/payments/:id/reject`                   | Staff tài chính | Có            | Từ chối payment                           |
| `POST`  | `/payment-webhooks/payos`                | PayOS           | Không         | Webhook public có signature               |
| `GET`   | `/plans/available`                       | `LANDLORD`      | Không         | Plan active có thể mua                    |
| `GET`   | `/subscriptions/me`                      | `LANDLORD`      | Không         | Subscription hiện tại và checkout pending |
| `POST`  | `/subscription-payments/me/payos`        | `LANDLORD`      | Không         | Tạo/tái sử dụng checkout                  |
| `GET`   | `/subscription-payments/me`              | `LANDLORD`      | Không         | Lịch sử payment tenant mình               |
| `GET`   | `/subscription-payments/me/:id`          | `LANDLORD`      | Không         | Chi tiết thuộc tenant mình                |
| `POST`  | `/subscription-payments/me/:id/cancel`   | `LANDLORD`      | Không         | Hủy link PayOS đang chờ                   |
| `GET`   | `/subscription-payments`                 | `ADMIN`         | Không         | Đối soát toàn hệ thống                    |
| `GET`   | `/subscription-payments/:id`             | `ADMIN`         | Không         | Chi tiết đối soát                         |

`POST /invoices/me/:id/payment-qr` yêu cầu body JSON rỗng `{}` vì DTO là strict empty object.

## 6. Điều kiện invoice có thể thanh toán

Payment service chỉ nhận invoice:

```text
Invoice.renterId = currentUserId
Invoice.deletedAt IS NULL
Invoice.status ∈ UNPAID | PARTIALLY_PAID | OVERDUE
```

Debt amount phải dương khi tạo QR hoặc confirmation.

Không thể dùng payment API renter cho invoice:

- `DRAFT`
- `PAID`
- `CANCELED`
- Thuộc renter khác

Invoice ngoài phạm vi trả `NotFound`; invoice đúng renter nhưng sai status trả `BadRequest`.

## 7. API QR của renter

### 7.1. `GET /invoices/me/:id/payment-qr`

Backend tìm QR:

```text
invoiceId = invoice
provider = PayOS
status = ACTIVE
expiredAt > now
amount = Invoice.debtAmount hiện tại
paymentLinkId IS NOT NULL
```

Nếu không có, trả `NotFound`. Endpoint này không tự tạo QR.

### 7.2. `POST /invoices/me/:id/payment-qr`

Body:

```json
{}
```

Nếu đã có active QR đúng amount, trả lại QR hiện có và không gọi PayOS lần nữa.

Nếu chưa có:

1. Tính expiration theo `PAYOS_QR_EXPIRE_MINUTES`.
2. Transaction tạo QR draft; database cấp `orderCode` từ sequence `payos_order_code_seq` dùng chung với subscription checkout.

3. Gọi PayOS tạo payment link:
   - `orderCode`
   - Amount được `Math.round`
   - Description `INV{invoiceId}`, tối đa 25 ký tự
   - Return URL và cancel URL
   - Expired timestamp
   - Buyer name/email/phone
   - Một item có invoice code
4. Lưu:
   - `paymentLinkId`
   - `checkoutUrl`
   - `qrContent`
   - `providerStatus`
5. Nếu call lỗi, đánh QR internal `CANCELED`, provider status `CREATE_FAILED`, rồi ném lại lỗi.

### 7.3. QR response

Response gồm:

- ID, tenant/invoice.
- Provider.
- Order code/payment link ID.
- QR content/image URL/checkout URL.
- Amount/provider status.
- Expired time/internal status.
- Created/updated time.

Client có thể hiển thị `qrContent` bằng QR renderer hoặc điều hướng `checkoutUrl`. Backend hiện không tự tạo `qrImageUrl`.

## 8. Manual payment confirmation

### 8.1. Body

| Field             | Bắt buộc | Validation                                     |
| ----------------- | -------- | ---------------------------------------------- |
| `amount`          | Có       | Số dương, không vượt debt tại thời điểm submit |
| `transactionCode` | Không    | Trim, 1-100                                    |
| `evidenceUrl`     | Không    | Trim, 1-5000; hiện không validate URL          |
| `renterNote`      | Không    | Trim, 1-5000                                   |
| `paidAt`          | Không    | Date; chưa chặn tương lai                      |

Ví dụ:

```json
{
  "amount": 1500000,
  "transactionCode": "MB-20260718-ABC123",
  "evidenceUrl": "https://cdn.example.com/payment-evidence/example.jpg",
  "renterNote": "Em đã chuyển khoản một phần",
  "paidAt": "2026-07-18T10:30:00+07:00"
}
```

### 8.2. Backend tạo payment

```text
method          = BANK_TRANSFER
provider        = MANUAL_CONFIRMATION
status          = PENDING
submittedAt     = now
createdById     = renter
updatedById     = renter
```

Payment pending chưa làm thay đổi Invoice hoặc Debt. Sau khi tạo, notification được gửi tới membership active có role landlord, manager hoặc accountant trong tenant.

## 9. API staff list/detail

### 9.1. `GET /payments`

Query:

| Field           | Ý nghĩa                                          |
| --------------- | ------------------------------------------------ |
| `page`, `limit` | Phân trang                                       |
| `status`        | PaymentStatus                                    |
| `invoiceId`     | Lọc invoice                                      |
| `renterId`      | Được map thành `payerId`                         |
| `from`, `to`    | Lọc `Payment.createdAt`                          |
| `search`        | Transaction code, invoice code, payer name/email |

`from/to` không lọc theo `paidAt` hoặc `submittedAt`. Chưa validate `from<=to`.

Danh sách sắp theo created time giảm dần, sau đó ID giảm dần.

### 9.2. `GET /payments/:id`

Response gồm:

- Payment fields và review audit fields.
- Invoice code/status/total/paid/debt/due date.
- Room.
- Payer full name/email/phone.
- QR data nếu có.
- Approver/rejecter basic profile.

Chỉ payment thuộc tenant hiện tại được trả.

## 10. Approve payment

### 10.1. Body

```json
{
  "landlordNote": "Đã kiểm tra giao dịch trên tài khoản ngân hàng"
}
```

Note optional, trim, 1-5000 nếu có.

### 10.2. Transaction và chống race

Repository thực hiện:

1. Tìm payment reference theo tenant.
2. Khóa invoice:

```sql
SELECT id
FROM invoices
WHERE id = :invoiceId
  AND tenant_id = :tenantId
FOR UPDATE
```

3. Đọc lại payment/invoice trong transaction.
4. Payment phải `PENDING`.
5. Invoice phải:

```text
UNPAID | PARTIALLY_PAID | OVERDUE
```

6. Payment amount không vượt debt hiện tại.
7. Conditional transition:

```text
Payment PENDING → SUCCESS
```

8. Ghi approver/time/note; paid time mặc định now nếu chưa có.
9. Aggregate mọi Payment `SUCCESS` của invoice.
10. Chặn tổng payment vượt total amount.
11. Tính remaining.
12. Cập nhật Invoice và Debt.
13. Cập nhật QR liên kết:
    - Remaining zero → `PAID`.
    - Còn nợ → `ACTIVE`.
14. Trả Payment detail.

Invoice row lock serialize các approval cùng invoice. Conditional update ngăn cùng payment được approve/reject nhiều lần.

### 10.3. Trạng thái ledger

| Remaining | Due date     | Invoice          | Debt                     |
| --------- | ------------ | ---------------- | ------------------------ |
| `0`       | Bất kỳ       | `PAID`           | `PAID`, set `resolvedAt` |
| `>0`      | Chưa quá hạn | `PARTIALLY_PAID` | `PARTIAL`                |
| `>0`      | Đã quá hạn   | `OVERDUE`        | `OVERDUE`                |

Sau commit, notification review result được gửi cho payer.

## 11. Reject payment

Reject:

1. Kiểm tra payment thuộc tenant.
2. Conditional update chỉ payment `PENDING`.
3. Chuyển status thành `FAILED`.
4. Ghi rejecter/time/note.
5. Không thay đổi Invoice/Debt.
6. Gửi notification cho payer sau khi update.

Approve hoặc reject payment đã xử lý trả `Conflict`.

## 12. PayOS webhook

### 12.1. Endpoint và body

```http
POST /payment-webhooks/payos
Content-Type: application/json
```

Body yêu cầu:

- Root `code`, `desc`, `success`, `signature`.
- Data:
  - `orderCode`
  - `amount`
  - `description`
  - `accountNumber`
  - `reference`
  - `transactionDateTime`
  - `currency`
  - `paymentLinkId`
  - `code`, `desc`
  - Các counter/virtual account field optional/nullable theo DTO.

Schema là strict; field ngoài schema có thể bị validation từ chối.

### 12.2. Verify và nhánh xử lý

1. `PayosService.verifyWebhook` kiểm signature.
2. Parse transaction time.
3. Nếu root/data không thể hiện giao dịch thành công:
   - Log `IGNORED`.
   - ACK `{code:"00", desc:"success", success:true}`.
4. Tìm invoice QR bằng đồng thời `orderCode` và `paymentLinkId`.
5. Nếu không tìm thấy invoice QR:
   - Transaction time phải parse hợp lệ.
   - Chuyển verified data sang `SubscriptionPaymentsService`.
   - Subscription payment cũng phải khớp đồng thời provider, `orderCode` và `paymentLinkId`.
   - Nếu subscription khớp, log outcome với `subscriptionPaymentId`.
   - Chỉ khi cả hai loại đều không khớp mới log `FAILED` và ACK để tránh retry vô hạn.
6. Amount không khớp QR:
   - Log `FAILED`.
   - ACK.
7. Tạo Payment:

```text
method          = QR
provider        = PayOS
transactionCode = data.reference
status          = PENDING
paidAt          = parsed provider time
submittedAt     = now
renterNote      = PayOS webhook verified
```

8. Payment mới:
   - Notification cho staff.
   - Log `PROCESSED`.
9. Duplicate cùng reference:
   - Kiểm tra existing payment có cùng tenant/invoice/QR/amount.
   - Khớp → log `IGNORED`, không gửi notification lần hai.
   - Không khớp → security warning và log `FAILED`.
10. Signature verification hoặc business exception sau khi request đã vào service:
    - Log sanitized `FAILED`.
    - Trả `BadRequest`.

Payload không đạt Zod schema bị global validation pipe từ chối trước khi controller gọi service, nên luồng hiện tại không tạo `PaymentWebhookLog` cho trường hợp đó.

### 12.3. Vì sao webhook invoice chỉ tạo PENDING

Webhook chứng minh PayOS gửi event hợp lệ, nhưng thiết kế hiện tại vẫn yêu cầu staff đối soát:

```text
Verified webhook ≠ Payment SUCCESS
Verified webhook → Payment PENDING → staff approve
```

Invoice/Debt không đổi ngay ở webhook.

### 12.4. Luồng Subscription Payment

#### Tạo checkout

Body duy nhất do client gửi:

```json
{
  "planId": 3,
  "billingCycle": "MONTHLY"
}
```

Backend lấy plan active và tự chọn `priceMonthly` hoặc `priceYearly`. Giá phải lớn hơn 0 và là số nguyên VND; client không thể ghi đè amount.

Với một tenant:

- Request trùng plan/cycle trả lại checkout `PENDING` còn hạn.
- Request khác khi còn checkout `PENDING` trả `409 Conflict`.
- Checkout hết hạn được chuyển `EXPIRED`; subscription `PENDING` của plan change được chuyển `CANCELED`.
- `TenantsService.assignPlan` cũng từ chối admin override khi tenant còn checkout PayOS pending.

Nếu cùng plan và cycle với subscription hiện tại, payment có purpose `RENEWAL` và dùng subscription đó. Nếu khác plan/cycle hoặc tenant chưa có subscription hiện tại, backend tạo subscription `PENDING` và payment có purpose `PLAN_CHANGE`.

#### Webhook thành công

Repository chạy transaction `Serializable` và claim có điều kiện:

```text
SubscriptionPayment PENDING → PAID
```

Trước khi claim, service kiểm provider, hai identifier, amount và currency `VND`. Trong transaction:

- `RENEWAL`: lấy mốc muộn hơn giữa `Subscription.expiredAt` và `paidAt`, rồi cộng đúng một tháng/năm; status `PAST_DUE` hoặc `EXPIRED` trở lại `ACTIVE`.
- `PLAN_CHANGE`: hủy subscription `ACTIVE` cũ, kích hoạt subscription `PENDING` tại `paidAt` và tính kỳ mới từ `paidAt`. Phiên bản hiện tại không proration/hoàn thời gian còn lại.
- Phép cộng lịch chạy theo UTC và clamp ngày cuối tháng, bao gồm 29/30/31 và năm nhuận.
- Không tự mở lại tenant bị suspend bởi quản trị.

Webhook lặp trả ACK nhưng không gia hạn/kích hoạt lần hai. Hai webhook đồng thời được bảo vệ bởi conditional update, transaction Serializable và unique transaction reference. Payload xung đột được log `FAILED` và không làm thay đổi subscription.

#### Hủy checkout

API cancel đọc trạng thái payment link từ PayOS trước. Nếu provider đã `PAID`, backend trả conflict và chờ webhook. Nếu chưa paid, backend gọi `cancelPaymentLink`, chuyển payment thành `CANCELED` và hủy subscription `PENDING` liên quan. Không có API delete, manual mark-paid, manual refund hoặc cập nhật status tùy ý.

#### Tra cứu và isolation

- Landlord chỉ đọc payment thuộc tenant trong access-token context; manager, accountant và renter không được tạo checkout.
- Lịch sử của landlord hỗ trợ `page`, `limit`, `status`, `purpose`, `from`, `to`.
- Admin list toàn hệ thống hỗ trợ thêm `tenantId`, `subscriptionId`, `planId` và `search`.
- `GET /subscriptions/me` trả subscription hiện tại theo thứ tự ưu tiên `ACTIVE`, `PAST_DUE`, `EXPIRED` cùng checkout pending còn hạn.

## 13. Webhook security và retention

### 13.1. Payload sanitization

Log chỉ giữ:

- Root code/description/success.
- Order code, amount, reference.
- Transaction time, currency.
- Payment link ID.
- Provider data code/description.

Không lưu trong JSON sanitized:

- Webhook signature.
- Account number.
- Counter account name/number.
- Virtual account name/number.
- Description tự do và unknown nested fields.

Provider/error text được loại newline/tab, trim và cắt tối đa.

### 13.2. Payload digest

Backend canonicalize payload gốc rồi tạo:

```text
HMAC-SHA256(payload, PAYMENT_WEBHOOK_LOG_HMAC_SECRET)
```

Database lưu digest và digest key version. Production từ chối khởi động nếu dùng development-only HMAC secret mặc định.

### 13.3. Retention

Payments module đăng ký BullMQ queue `payments-maintenance`.

Scheduler upsert job:

```text
payment-webhook-retention
cron: 0 2 * * *
```

Processor:

1. Tính cutoff theo `PAYMENT_WEBHOOK_RETENTION_DAYS`.
2. Xóa log cũ theo batch `PAYMENT_WEBHOOK_RETENTION_BATCH_SIZE`.
3. Lặp đến khi batch cuối nhỏ hơn limit.
4. Ghi số log đã xóa.

Redis/BullMQ phải hoạt động để scheduler/worker chạy.

## 14. Cấu hình môi trường

Tài liệu chỉ nêu tên, không ghi giá trị secret:

- `PAYOS_CLIENT_ID`
- `PAYOS_API_KEY`
- `PAYOS_CHECKSUM_KEY`
- `PAYOS_RETURN_URL`
- `PAYOS_CANCEL_URL`
- `PAYOS_QR_EXPIRE_MINUTES`
- `PAYOS_SUBSCRIPTION_RETURN_URL`
- `PAYOS_SUBSCRIPTION_CANCEL_URL`
- `PAYOS_SUBSCRIPTION_EXPIRE_MINUTES` (mặc định 15 phút)
- `PAYMENT_WEBHOOK_LOG_HMAC_SECRET`
- `PAYMENT_WEBHOOK_LOG_DIGEST_VERSION`
- `PAYMENT_WEBHOOK_RETENTION_DAYS`
- `PAYMENT_WEBHOOK_RETENTION_BATCH_SIZE`
- Redis connection settings

Return/cancel URL phải trỏ đến route frontend hoặc service thực sự tồn tại trong môi trường triển khai. Backend hiện không có controller cho `/payments/payos/return`, `/payments/payos/cancel`, `/subscriptions/payos/return` hoặc `/subscriptions/payos/cancel`.

## 15. Lỗi thường gặp

| Tình huống                             | Kết quả                                 |
| -------------------------------------- | --------------------------------------- |
| Invoice không thuộc renter             | `NotFound`                              |
| Invoice draft/paid/canceled            | `BadRequest` với QR/confirmation        |
| Invoice không còn debt                 | `BadRequest`                            |
| GET không có active QR đúng amount     | `NotFound`                              |
| Confirmation amount vượt debt          | `BadRequest`                            |
| Payment ngoài tenant                   | `NotFound`                              |
| Payment đã approve/reject              | `Conflict`                              |
| Invoice không còn payable khi approve  | `BadRequest`                            |
| Amount vượt debt tại lúc approve       | `BadRequest`                            |
| Tổng success payments vượt total       | `Conflict`                              |
| Webhook signature sai                  | Log failed rồi trả `BadRequest`         |
| Webhook không đạt Zod schema           | `BadRequest`, không vào business log    |
| QR/amount/reference mismatch           | Log failed và ACK tùy nhánh             |
| Plan không tồn tại/inactive/free       | `NotFound` hoặc `BadRequest`            |
| Tenant có checkout khác đang pending   | `Conflict`                              |
| Hủy checkout đã paid/non-pending       | `Conflict`                              |
| Subscription amount/currency mismatch  | Log failed, ACK và không đổi dữ liệu    |
| Admin assign plan khi checkout pending | `Conflict`                              |
| Thiếu tenant context staff             | `TENANT_CONTEXT_REQUIRED`               |
| Sai membership/role                    | `TENANT_ACCESS_DENIED` hoặc `Forbidden` |
| Quá global rate limit                  | `ThrottlerException`                    |

## 16. Ví dụ sử dụng

Các ví dụ giả định backend chạy tại `http://localhost:3000`.

### 16.1. Lấy hoặc tạo QR

```bash
curl "http://localhost:3000/invoices/me/801/payment-qr" \
  -H "Authorization: Bearer <RENTER_ACCESS_TOKEN>"
```

```bash
curl -X POST "http://localhost:3000/invoices/me/801/payment-qr" \
  -H "Authorization: Bearer <RENTER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 16.2. Manual confirmation

```bash
curl -X POST "http://localhost:3000/invoices/me/801/payment-confirmations" \
  -H "Authorization: Bearer <RENTER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500000,
    "transactionCode": "DEMO-REFERENCE-001",
    "evidenceUrl": "https://cdn.example.com/demo/evidence.jpg",
    "renterNote": "Thanh toán một phần",
    "paidAt": "2026-07-18T10:30:00+07:00"
  }'
```

### 16.3. Staff list/detail

```bash
curl "http://localhost:3000/payments?status=PENDING&invoiceId=801&from=2026-07-01&to=2026-07-31" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

```bash
curl "http://localhost:3000/payments/901" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

### 16.4. Approve/reject

```bash
curl -X PATCH "http://localhost:3000/payments/901/approve" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{"landlordNote":"Đã đối chiếu giao dịch"}'
```

```bash
curl -X PATCH "http://localhost:3000/payments/902/reject" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{"landlordNote":"Không tìm thấy giao dịch"}'
```

### 16.5. Webhook minh họa

Payload dưới đây chỉ mô tả shape. `signature` phải do PayOS tạo; không tự dựng để gọi production.

```json
{
  "code": "00",
  "desc": "success",
  "success": true,
  "data": {
    "orderCode": 12345,
    "amount": 1500000,
    "description": "INV801",
    "accountNumber": "DEMO",
    "reference": "PAYOS-DEMO-REFERENCE",
    "transactionDateTime": "2026-07-18 10:30:00",
    "currency": "VND",
    "paymentLinkId": "demo-payment-link-id",
    "code": "00",
    "desc": "Thành công",
    "counterAccountBankId": null,
    "counterAccountBankName": null,
    "counterAccountName": null,
    "counterAccountNumber": null,
    "virtualAccountName": null,
    "virtualAccountNumber": null
  },
  "signature": "<PAYOS_SIGNATURE>"
}
```

### 16.6. Subscription checkout

Liệt kê plan và tạo checkout:

```bash
curl "http://localhost:3000/plans/available" \
  -H "Authorization: Bearer <LANDLORD_ACCESS_TOKEN>"

curl -X POST "http://localhost:3000/subscription-payments/me/payos" \
  -H "Authorization: Bearer <LANDLORD_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"planId":3,"billingCycle":"MONTHLY"}'
```

Đọc trạng thái hiện tại/lịch sử và hủy checkout đang chờ:

```bash
curl "http://localhost:3000/subscriptions/me" \
  -H "Authorization: Bearer <LANDLORD_ACCESS_TOKEN>"

curl "http://localhost:3000/subscription-payments/me?page=1&limit=20" \
  -H "Authorization: Bearer <LANDLORD_ACCESS_TOKEN>"

curl -X POST "http://localhost:3000/subscription-payments/me/701/cancel" \
  -H "Authorization: Bearer <LANDLORD_ACCESS_TOKEN>"
```

`returnUrl`/`cancelUrl` chỉ phục vụ UX. Client phải đọc lại trạng thái backend; không dùng redirect làm bằng chứng thanh toán.

## 17. Chức năng chưa hoàn thiện và hướng triển khai

Mọi API đề xuất trong phần này đều **chưa tồn tại**.

### 17.1. Renter self-service

| #   | Hiện trạng                      | Ảnh hưởng                          | Hướng triển khai                                   | Dependency    | Tiêu chí hoàn thành              |
| --- | ------------------------------- | ---------------------------------- | -------------------------------------------------- | ------------- | -------------------------------- |
| 1   | Không có `/payments/me`         | Renter không theo dõi confirmation | List/detail theo payer/invoice ownership           | G07           | Chỉ đọc payment của mình         |
| 2   | Invoice chỉ trả payment count   | Không thấy pending/success/failed  | Link/expand payment history                        | G07           | UI hiển thị review result        |
| 3   | Không cancel pending            | Confirmation gửi sai bị treo       | Cancel chỉ payment manual pending của mình         | State machine | Không ảnh hưởng webhook payment  |
| 4   | Evidence chỉ là string          | Không kiểm file ownership          | Multipart upload, MIME/size/signed URL             | Storage       | Chỉ actor hợp lệ đọc file        |
| 5   | `paidAt` có thể ở tương lai     | Dữ liệu đối soát sai               | Date boundary/timezone validation                  | Product       | Future date bị chặn              |
| 6   | Evidence/reference đều optional | Thiếu căn cứ review                | Policy bắt buộc theo method/amount                 | Product       | DTO động có test                 |
| 7   | Nhiều pending vượt debt         | Queue review bị spam               | Pending sum warning/cap/idempotency                | Invoice lock  | Submit concurrent được kiểm soát |
| 8   | Không chống duplicate manual    | Một giao dịch gửi nhiều lần        | Provider/reference normalization, conflict mapping | Migration     | Duplicate trả 409 rõ             |
| 9   | Không có receipt                | Thiếu chứng từ sau duyệt           | Receipt endpoint/file immutable                    | G07/storage   | Receipt gắn success payment      |

### 17.2. Payment method, review và ledger

| #   | Hiện trạng                     | Ảnh hưởng                    | Hướng triển khai                             | Dependency     | Tiêu chí hoàn thành            |
| --- | ------------------------------ | ---------------------------- | -------------------------------------------- | -------------- | ------------------------------ |
| 10  | Không có staff cash entry      | Không ghi nhận tiền mặt      | API staff create payment với maker audit     | RBAC           | CASH success qua review policy |
| 11  | WALLET chỉ có enum             | Chưa tích hợp ví             | Adapter/provider contract                    | Provider       | Không mô tả như active         |
| 12  | Không refund                   | `REFUNDED` không dùng        | Refund request/provider/ledger reversal      | G07/accounting | Debt/invoice consistent        |
| 13  | Không cancel/chargeback        | Không xử lý reversal         | Payment reversal state machine               | Provider       | Lưu payment nguồn/đảo          |
| 14  | Reject reason optional         | Audit yếu                    | Bắt buộc reason cho reject                   | Product        | History có lý do               |
| 15  | Manual unique lỗi chưa map     | Có thể lộ lỗi Prisma         | Catch P2002 → Conflict                       | Prisma         | Response ổn định               |
| 16  | Không có transition history    | Khó điều tra                 | PaymentStatusHistory                         | Audit          | Actor/before/after/time        |
| 17  | Không maker-checker            | Một role có thể làm mọi bước | Permission create/review tách biệt           | G01            | Policy có test                 |
| 18  | Notification ngoài transaction | Có thể mất notification      | Transactional outbox                         | G10            | Retry idempotent               |
| 19  | Chưa có invariant repair       | Ledger lệch khó sửa          | Reconciliation Invoice/Debt/Success payments | G07            | Alert và repair có audit       |

### 17.3. QR lifecycle và PayOS

| #   | Hiện trạng                                | Ảnh hưởng                             | Hướng triển khai                                  | Dependency | Tiêu chí hoàn thành         |
| --- | ----------------------------------------- | ------------------------------------- | ------------------------------------------------- | ---------- | --------------------------- |
| 20  | Concurrent create QR                      | Có thể tạo nhiều link active          | Invoice lock/idempotency key/unique active intent | PostgreSQL | Hai request dùng một QR     |
| 21  | Expired time không đổi status             | DB vẫn `ACTIVE`                       | Scheduler cập nhật `EXPIRED`                      | BullMQ     | Status phản ánh thực tế     |
| 22  | Debt đổi không hủy QR cũ                  | Link amount cũ còn ngoài PayOS        | Cancel provider link khi partial/reissue          | PayOS      | Link cũ không trả được      |
| 23  | Full payment chỉ update QR của payment    | QR khác vẫn active                    | Đóng mọi QR active của invoice                    | G07        | Không còn active link       |
| 24  | Invoice cancel không hủy link             | Có thể nhận tiền vào invoice canceled | Cross-module cancel transaction/saga              | G07/PayOS  | Provider/internal cùng đóng |
| 25  | Provider thành công, DB update lỗi        | Orphan payment link                   | Compensating cancel/reconciliation job            | PayOS      | Orphan được phát hiện       |
| 26  | Create failure chỉ đánh internal canceled | Provider link có thể vẫn tồn tại      | Gọi cancel provider nếu có ID                     | PayOS      | Compensate idempotent       |
| 27  | Default return/cancel route không tồn tại | Redirect 404 nếu không cấu hình       | Frontend routes hoặc backend handler              | Frontend   | Environment validated       |
| 28  | Không có return/cancel UX                 | User không biết kết quả               | Status screen polling/payment history             | Frontend   | Không coi redirect là proof |
| 29  | Invoice PayOS integer vs Decimal          | Amount webhook có thể mismatch        | VND integer policy trước tạo invoice/QR           | G07        | Round một lần, test         |
| 30  | Không list/cancel/regenerate QR           | Vận hành khó                          | Renter/staff QR history API                       | Provider   | Access và lifecycle đúng    |

### 17.4. Webhook và reconciliation

| #   | Hiện trạng                               | Ảnh hưởng                              | Hướng triển khai                              | Dependency    | Tiêu chí hoàn thành               |
| --- | ---------------------------------------- | -------------------------------------- | --------------------------------------------- | ------------- | --------------------------------- |
| 32  | Không kiểm QR status/expiry              | Link cũ vẫn tạo pending                | Chốt policy received-after-expiry             | QR lifecycle  | Không mất tiền nhưng có cảnh báo  |
| 33  | Không kiểm invoice payable               | Canceled/paid invoice có pending mới   | Validate và route reconciliation exception    | G07           | Không review mơ hồ                |
| 34  | Invoice branch chưa kiểm currency VND    | Payload currency khác vẫn có thể xử lý | Áp dụng check như SubscriptionPayment         | PayOS         | Non-VND failed                    |
| 35  | Invoice branch cho phép date parse null  | Thiếu transaction time                 | Áp dụng check như subscription routing        | DTO/service   | Invalid format failed             |
| 36  | Verified non-success log signature false | Audit signature sai                    | Truyền `signatureValid=true` sau verify       | Webhook       | Unit test branch                  |
| 37  | Notification lỗi sau payment create      | 400 rồi duplicate retry không notify   | Outbox/event persisted cùng payment           | G10           | Retry không mất event             |
| 38  | Webhook log ngoài payment transaction    | Có thể thiếu log hoặc payment          | Transaction/outbox processing record          | PostgreSQL    | Mọi event có outcome              |
| 39  | Không query lại PayOS                    | Mất webhook không được phục hồi        | Reconciliation scheduler theo active QR       | PayOS/BullMQ  | Missed event được phát hiện       |
| 40  | Không có webhook log API                 | Ops phải query DB                      | Admin/ops read-only API, redacted             | RBAC/audit    | Failed filter/replay              |
| 41  | Không replay failed                      | Sửa mapping xong không xử lý lại       | Idempotent replay command                     | Ops           | Không duplicate payment           |
| 42  | Chỉ global rate limit                    | Retry PayOS có thể bị ảnh hưởng        | Dedicated provider-friendly throttle          | Redis         | Security và availability cân bằng |
| 43  | Thiếu alert/metric                       | Security event dễ bị bỏ qua            | Metrics signature/mismatch/conflict/retention | Observability | Alert có runbook                  |

### 17.5. Cấu hình nhận tiền và vận hành

| #   | Hiện trạng                      | Ảnh hưởng                                  | Hướng triển khai                                      | Dependency    | Tiêu chí hoàn thành           |
| --- | ------------------------------- | ------------------------------------------ | ----------------------------------------------------- | ------------- | ----------------------------- |
| 44  | Không có bank account model/API | Không hỗ trợ chuyển khoản tĩnh theo tenant | Tenant payment account, verification, masking         | G02/security  | Chỉ owner quản lý             |
| 45  | PayOS credential cấp hệ thống   | Không multi-merchant                       | Credential per tenant hoặc platform settlement design | Product/PayOS | Secret vault và rotation      |
| 46  | Không payout/settlement         | Không đối soát tiền về                     | Settlement import/provider report                     | Accounting    | Payment ↔ settlement match    |
| 47  | Không statement report          | Khó chốt sổ                                | Export reconciliation report                          | G11           | Reference/amount/status rõ    |
| 48  | Chưa chứng minh PayOS sandbox   | Adapter có thể lệch môi trường             | Contract/sandbox tests                                | PayOS         | QR + webhook test environment |
| 49  | Chưa có DB concurrency suite    | Cơ chế lock chưa được chứng minh E2E       | PostgreSQL approve/approve, approve/reject            | Test infra    | Ledger invariant giữ          |
| 50  | Chưa có E2E G07-G08             | Chưa chứng minh hành trình hoàn chỉnh      | Invoice → QR/manual → pending → approve → paid        | G07/G10       | HTTP và DB thật               |

### 17.6. Subscription Payment còn ngoài phiên bản

| #   | Hiện trạng                                                            | Ảnh hưởng                                                     | Hướng triển khai                            | Dependency         | Tiêu chí hoàn thành                     |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------- | ------------------ | --------------------------------------- |
| 51  | Chưa có frontend/mobile checkout                                      | Landlord chỉ gọi được API                                     | Plan picker, QR/status screen               | Frontend/mobile    | Không coi redirect là proof             |
| 52  | Expiry chỉ được lazy-detect                                           | Checkout cũ có thể giữ `PENDING` nếu không được đọc lại       | Scheduler query/cancel PayOS                | BullMQ/PayOS       | Status provider và DB đồng bộ           |
| 53  | Không có proration/refund                                             | Đổi gói bỏ phần thời gian còn lại                             | Policy và ledger refund riêng               | Product/accounting | Tính toán có audit                      |
| 54  | Chưa có auto-renew scheduler                                          | Landlord phải chủ động checkout                               | Renewal intent/notification/provider policy | G02/G10            | Retry idempotent                        |
| 55  | Chưa có PostgreSQL concurrent integration test riêng cho subscription | Bất biến mới chủ yếu được bảo vệ bằng constraint và unit test | Test hai create/hai webhook trên DB thật    | Test infra         | Chỉ một payment/subscription được claim |

## 18. Thứ tự ưu tiên backlog

1. QR concurrency, lifecycle và hủy external link.
2. Webhook identifier/status/currency/date validation.
3. Outbox notification và provider reconciliation.
4. Renter payment history, evidence upload và pending cancellation.
5. Refund/reversal, payment audit và maker-checker.
6. Tenant payment account, multi-merchant và settlement.
7. PostgreSQL concurrency, PayOS sandbox và E2E G07-G08.
8. Scheduler expiry/reconciliation và PostgreSQL concurrency test cho Subscription Payment.

## 19. Checklist kiểm thử tài liệu

### 19.1. Renter

- [ ] Chỉ invoice main renter và payable được tạo QR/confirmation.
- [ ] GET QR không tự tạo.
- [ ] POST tái sử dụng active QR đúng amount.
- [ ] Confirmation amount dương, không vượt debt.
- [ ] Pending payment không đổi invoice/debt.

### 19.2. Staff

- [ ] Bắt buộc tenant context và role phù hợp.
- [ ] List/detail không rò tenant.
- [ ] Approve chỉ pending và invoice payable.
- [ ] Partial/full/overdue ledger đúng.
- [ ] Reject không đổi ledger.
- [ ] Approve/reject lặp trả conflict.

### 19.3. Concurrency

- [ ] Hai approve cùng payment chỉ một thành công.
- [ ] Approve/reject cùng payment chỉ một transition.
- [ ] Hai payment của cùng invoice không làm tổng vượt total.
- [ ] Invoice row lock serialize aggregate.

### 19.4. Webhook

- [ ] Signature invalid bị từ chối và log sanitized.
- [ ] Business non-success được ignored/ACK.
- [ ] QR missing/amount mismatch được failed/ACK.
- [ ] Payment mới là pending, không giảm debt.
- [ ] Duplicate reference không tạo payment thứ hai.
- [ ] Reference conflict được security log.
- [ ] Payload log không chứa account/signature PII.

### 19.5. Maintenance

- [ ] Scheduler được upsert.
- [ ] Processor xóa đúng cutoff/batch.
- [ ] Redis unavailable có monitoring.
- [ ] Production yêu cầu HMAC secret riêng.

### 19.6. Subscription Payment

- [ ] Chỉ `LANDLORD` tạo/xem/hủy checkout của tenant mình; `ADMIN` chỉ đọc đối soát.
- [ ] Amount lấy từ plan active và đúng monthly/yearly; body không nhận amount.
- [ ] Request giống nhau tái sử dụng link; request khác bị conflict.
- [ ] Chỉ một payment `PENDING`, một subscription `PENDING` và một subscription `ACTIVE` mỗi tenant.
- [ ] Webhook phải khớp provider, `orderCode`, `paymentLinkId`, amount và `VND`.
- [ ] Webhook lặp/đồng thời không gia hạn hoặc kích hoạt hai lần.
- [ ] Renewal active/past-due/expired và ngày cuối tháng/năm nhuận đúng.
- [ ] Plan change chỉ active sau webhook; cancel/expire/fail không kích hoạt plan.
- [ ] Admin assign plan bị chặn khi checkout PayOS còn pending.
- [ ] Invoice QR webhook hiện tại không bị route nhầm sang subscription.

## 20. Tiêu chí nghiệm thu tài liệu

- Renter biết khi nào lấy QR, tạo QR hoặc gửi confirmation.
- Staff hiểu review payment và hệ quả lên Invoice/Debt.
- Frontend không coi redirect là bằng chứng payment success; invoice payment vẫn cần staff review, subscription cần đọc trạng thái đã xử lý bởi webhook.
- Tester hiểu row lock, CAS và provider-reference idempotency.
- Ops hiểu sanitized log, digest, retention và biến môi trường.
- Backend developer nhìn thấy QR/webhook/outbox/reconciliation gap.
- Webhook hiện hành không bị mô tả là schema-only.
- Refund, cash/wallet, renter history và bank account không bị mô tả như tính năng đã hoạt động.
- G08 phân biệt rõ Payment hóa đơn cần staff review với `SubscriptionPayment` được hoàn tất trực tiếp từ webhook PayOS.

## 21. Nguồn mã đối chiếu

- `backend/src/modules/payments/payments.controller.ts`
- `backend/src/modules/payments/payments.service.ts`
- `backend/src/modules/payments/model/payments.model.ts`
- `backend/src/modules/payments/repositories/payments.repo.ts`
- `backend/src/modules/payos/payos.module.ts`
- `backend/src/modules/payos/payos.service.ts`
- `backend/src/modules/subscription-payments/subscription-payments.controller.ts`
- `backend/src/modules/subscription-payments/subscription-payments.service.ts`
- `backend/src/modules/subscription-payments/repositories/subscription-payments.repo.ts`
- `backend/src/modules/subscription-payments/subscription-period.util.ts`
- `backend/src/modules/payments/webhook-log.security.ts`
- `backend/src/modules/payments/payments-maintenance.scheduler.ts`
- `backend/src/modules/payments/payments-maintenance.processor.ts`
- `backend/src/modules/invoices`
- `backend/src/modules/notifications/notification-events.service.ts`
- `backend/src/config/env.config.ts`
- `backend/src/app.module.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260726090000_add_subscription_payos_billing/migration.sql`
- `backend/docs/systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md`
- `backend/docs/systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md`
