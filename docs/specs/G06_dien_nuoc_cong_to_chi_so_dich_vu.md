# G06 - Đặc tả điện nước, công tơ, chỉ số và dịch vụ

> **Snapshot 31/07/2026:** Utility meter/reading, OCR queue-review-accept, service catalog và service assignment đã có API. Import/batch và kiểm chứng provider/worker thật còn backlog; mọi nhãn cũ “OCR/dịch vụ chỉ để sau” đã hết hiệu lực.

## 1. Tổng quan

Tài liệu này mô tả nhóm tính năng G06 của backend: cấu hình đồng hồ điện/nước cho phòng, nhập chỉ số thủ công theo kỳ, tính lượng tiêu thụ, snapshot đơn giá và chuyển chỉ số đã xác nhận sang nghiệp vụ hóa đơn.

Luồng chính hiện tại:

```text
Room có electricityPrice/waterPrice (G03)
        ↓
Tạo UtilityMeter ELECTRICITY/WATER
        ↓
Nhập MeterReading theo billingMonth
        ↓
Tính consumption và amount
        ↓
Xác nhận reading
        ↓
G07 lấy reading CONFIRMED để tạo InvoiceItem
```

MVP hỗ trợ nhập tay và OCR công tơ có bước người dùng duyệt trước khi tạo reading. Nguồn `IMPORT` mới chỉ tồn tại trong enum. Hệ thống cũng chưa có danh mục phí dịch vụ định kỳ; các khoản `SERVICE`, `PARKING`, `INTERNET` hiện được nhập thủ công ở G07.

Mục tiêu của tài liệu:

- Landlord/manager biết cách cấu hình và quản lý đồng hồ.
- Accountant biết cách nhập, sửa, xác nhận và tra cứu chỉ số.
- Frontend hiểu cách backend chọn chỉ số cũ, đơn giá và tính thành tiền.
- Tester biết các ràng buộc tenant, trạng thái, kỳ ghi số và liên kết hóa đơn.
- Backend developer biết phần nào mới có schema hoặc còn thiếu tính toàn vẹn nghiệp vụ.

### 1.1. Phạm vi

| Mảng              | Chức năng                                                |
| ----------------- | -------------------------------------------------------- |
| Đồng hồ           | List, detail, tạo, cập nhật mã/đơn vị và trạng thái      |
| Chỉ số            | List, detail, tạo thủ công, cập nhật và đổi trạng thái   |
| Tính toán         | `current - previous`, nhân đơn giá và snapshot amount    |
| Liên kết hợp đồng | Gắn active contract phù hợp khi tạo reading nếu tìm thấy |
| Liên kết hóa đơn  | G07 sử dụng reading `CONFIRMED` chưa được dùng           |
| OCR                | Upload, xử lý nền, review và tạo reading nháp             |
| Nền tảng mở rộng  | Import và cấu hình dịch vụ chưa hoàn thiện               |

### 1.2. Ngoài phạm vi

| Chức năng                             | Nhóm tài liệu |
| ------------------------------------- | ------------- |
| CRUD room và giá điện/nước trên room  | G03           |
| Hợp đồng active dùng để gắn reading   | G05           |
| Tạo, phát hành hóa đơn và extra items | G07           |
| Thanh toán hóa đơn                    | G08           |
| Dashboard tiêu thụ/doanh thu          | G11           |

### 1.3. Trạng thái triển khai

| Nhóm                      | Trạng thái            | Nhận định                                              |
| ------------------------- | --------------------- | ------------------------------------------------------ |
| Cấu hình meter            | Đã hoạt động          | Không có delete hoặc quy trình thay thiết bị           |
| Nhập reading thủ công     | Đã hoạt động          | Có tự lấy previous và giá room                         |
| Tính consumption/amount   | Đã hoạt động          | Tính bằng Decimal cho cả nhập tay và OCR               |
| Review trạng thái reading | Đã hoạt động một phần | Cho đổi enum trực tiếp, chưa có state machine          |
| Tích hợp invoice          | Đã hoạt động          | Chỉ lấy confirmed, đúng contract/room/month, chưa dùng |
| Phí dịch vụ định kỳ       | Chưa có               | Chỉ có extra item nhập tay ở G07                       |
| OCR                       | Đã hoạt động          | Tesseract.js, BullMQ, feature gate và human review     |
| Import                    | Chỉ có enum           | Không có upload hoặc xử lý file                        |
| Phát hiện bất thường      | Chưa có               | `ABNORMAL` do người dùng tự chọn                       |
| Renter self-service       | Chưa có               | Renter chưa có API xem reading                         |

## 2. Actor, quyền và tenant context

### 2.1. Actor

| Actor               | Meter API                    | Reading API                  |
| ------------------- | ---------------------------- | ---------------------------- |
| `LANDLORD`          | Có                           | Có                           |
| `MANAGER`           | Có                           | Có                           |
| `ACCOUNTANT`        | Không                        | Có                           |
| `MAINTENANCE_STAFF` | Không                        | Không                        |
| `TENANT`            | Không                        | Không                        |
| `ADMIN`             | Không qua các controller G06 | Không qua các controller G06 |

Tất cả endpoint hiện hành của G06 đều protected và tenant-scoped:

```http
Authorization: Bearer <accessToken>
x-tenant-id: <tenantId>
Content-Type: application/json
```

Backend dùng `TenantAccessService.getActiveTenantContext` trước khi truy vấn. Tenant phải active và user phải có membership active.

### 2.2. Vai trò ACCOUNTANT

`ACCOUNTANT` được nhập và đổi trạng thái reading nhưng không được tạo/cập nhật meter. Frontend dành cho kế toán cần lấy danh sách meter qua một nguồn phù hợp với permission hiện hành; không nên giả định accountant gọi được `GET /utility-meters`.

Đây là một điểm phân quyền cần được kiểm tra lại khi thiết kế UI thực tế.

## 3. Mô hình dữ liệu

### 3.1. Quan hệ chính

```text
Tenant
└── Property
    └── Room
        ├── electricityPrice
        ├── waterPrice
        └── UtilityMeter
            ├── type
            ├── meterCode
            ├── unit
            ├── status
            ├── MeterReading[]
            │   ├── Contract?
            │   └── InvoiceItem[]
            └── OcrJob[]       [đã có API/worker/review]
```

### 3.2. UtilityMeter

| Field       | Ý nghĩa                      |
| ----------- | ---------------------------- |
| `tenantId`  | Tenant sở hữu dữ liệu        |
| `roomId`    | Room lắp meter               |
| `type`      | Điện hoặc nước               |
| `meterCode` | Mã nhận diện thiết bị vật lý |
| `unit`      | Đơn vị đo, ví dụ `kWh`, `m3` |
| `status`    | Active, inactive hoặc broken |

Prisma có unique constraint:

```text
@@unique([roomId, type])
```

Vì vậy mỗi room có tối đa một bản ghi meter điện và một meter nước, kể cả meter cũ đang `INACTIVE` hoặc `BROKEN`.

### 3.3. MeterReading

| Field                        | Ý nghĩa                                           |
| ---------------------------- | ------------------------------------------------- |
| `billingMonth`               | Kỳ ghi số, chuẩn hóa về ngày 1 của tháng          |
| `previousValue`              | Chỉ số đầu kỳ                                     |
| `currentValue`               | Chỉ số cuối kỳ                                    |
| `consumption`                | `currentValue - previousValue`                    |
| `unitPrice`                  | Đơn giá được snapshot tại thời điểm tạo/sửa       |
| `amount`                     | `consumption × unitPrice`                         |
| `contractId`                 | Active contract tìm được cho room/kỳ; có thể null |
| `imageUrl`                   | URL ảnh chứng minh; có thể null                   |
| `source`                     | Nguồn dữ liệu, API hiện tại luôn là `MANUAL`      |
| `status`                     | Trạng thái review                                 |
| `recordedAt`                 | Thời điểm tạo bản ghi                             |
| `createdById`, `updatedById` | Actor tạo/cập nhật                                |

Prisma bảo đảm:

```text
@@unique([meterId, billingMonth])
```

Một meter chỉ có một reading cho mỗi tháng.

## 4. Enum và ý nghĩa trạng thái

### 4.1. MeterType

| Giá trị       | Giá mặc định lấy từ room | Unit mặc định |
| ------------- | ------------------------ | ------------- |
| `ELECTRICITY` | `Room.electricityPrice`  | `kWh`         |
| `WATER`       | `Room.waterPrice`        | `m3`          |

### 4.2. MeterStatus

| Giá trị    | Có tạo reading mới được không? | Ý nghĩa        |
| ---------- | ------------------------------ | -------------- |
| `ACTIVE`   | Có                             | Đang hoạt động |
| `INACTIVE` | Không                          | Tạm ngưng      |
| `BROKEN`   | Không                          | Hỏng/cần thay  |

### 4.3. ReadingSource

| Giá trị  | Trạng thái triển khai |
| -------- | --------------------- |
| `MANUAL` | Đang hoạt động        |
| `OCR`    | Đã có upload, worker, review và accept |
| `IMPORT` | Chỉ có enum           |

### 4.4. ReadingStatus

| Giá trị     | Ý nghĩa      | Có được G07 lấy không?          |
| ----------- | ------------ | ------------------------------- |
| `DRAFT`     | Bản nháp     | Không                           |
| `CONFIRMED` | Đã xác nhận  | Có, nếu khớp các điều kiện khác |
| `ABNORMAL`  | Cần kiểm tra | Không                           |
| `REJECTED`  | Bị từ chối   | Không                           |

API hiện cho caller chọn bất kỳ status hợp lệ khi tạo và đổi trực tiếp giữa các status nếu reading chưa được invoice sử dụng. Chưa có state machine dựa trên trạng thái trước.

### 4.5. OcrJobStatus

```text
PENDING | PROCESSING | SUCCESS | FAILED | NEED_REVIEW
```

Enum và model tồn tại để mở rộng; hiện không có endpoint OCR.

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

### 5.2. Date và billing month

Client có thể gửi một ISO date bất kỳ trong tháng. Backend chuẩn hóa:

```text
2026-07-18T09:00:00+07:00
        ↓
2026-07-01T00:00:00.000Z
```

List theo `billingMonth`, `from`, `to` cũng chuẩn hóa về ngày đầu tháng UTC.

### 5.3. Decimal và tiền

Prisma lưu reading value, consumption, unit price và amount bằng `Decimal`. Service hiện chuyển sang JavaScript `number` để tính:

```text
consumption = currentValue - previousValue
amount = consumption * unitPrice
```

Chưa có quy tắc làm tròn riêng. Client nên hiển thị response Decimal cẩn thận và không tự thay thế giá trị backend khi lập hóa đơn.

### 5.4. Validation

- DTO là `strict`; field lạ bị từ chối.
- ID phải là số nguyên dương.
- Chỉ số và giá không âm.
- Body update phải có ít nhất một field.
- `imageUrl` phải là URL hợp lệ nếu không null.

## 6. API cấu hình đồng hồ

### 6.1. Tổng hợp endpoint

| Method  | Endpoint                     | Role                  | Nội dung        |
| ------- | ---------------------------- | --------------------- | --------------- |
| `GET`   | `/utility-meters`            | `LANDLORD`, `MANAGER` | Danh sách meter |
| `GET`   | `/utility-meters/:id`        | `LANDLORD`, `MANAGER` | Chi tiết meter  |
| `POST`  | `/utility-meters`            | `LANDLORD`, `MANAGER` | Tạo meter       |
| `PATCH` | `/utility-meters/:id`        | `LANDLORD`, `MANAGER` | Sửa code/unit   |
| `PATCH` | `/utility-meters/:id/status` | `LANDLORD`, `MANAGER` | Đổi trạng thái  |

Không có `DELETE /utility-meters/:id`.

### 6.2. `GET /utility-meters`

Query:

| Field        | Kiểu    | Ý nghĩa                |
| ------------ | ------- | ---------------------- |
| `page`       | integer | Trang                  |
| `limit`      | integer | Số bản ghi, tối đa 100 |
| `roomId`     | integer | Lọc room               |
| `propertyId` | integer | Lọc property qua room  |
| `type`       | enum    | Điện/nước              |
| `status`     | enum    | Trạng thái meter       |

Danh sách sắp xếp `createdAt` mới nhất trước.

Mỗi meter trả:

- Field meter.
- Room code/title.
- Giá điện/nước hiện tại trên room.
- Property và địa chỉ hành chính.
- Tối đa một reading gần nhất theo billing month và ID.

Reading gần nhất trong meter response hiện không lọc status, vì vậy có thể là `DRAFT`, `ABNORMAL` hoặc `REJECTED`.

### 6.3. `GET /utility-meters/:id`

Chỉ trả meter có cùng `tenantId`. ID tenant khác được xử lý như không tìm thấy.

### 6.4. `POST /utility-meters`

Body:

| Field       | Bắt buộc | Validation                              |
| ----------- | -------- | --------------------------------------- |
| `roomId`    | Có       | ID dương, room thuộc tenant và chưa xóa |
| `type`      | Có       | `ELECTRICITY`, `WATER`                  |
| `meterCode` | Có       | Trim, 1-100 ký tự                       |
| `unit`      | Không    | Trim, 1-20 ký tự                        |
| `status`    | Không    | Mặc định `ACTIVE`                       |

Ví dụ điện:

```json
{
  "roomId": 205,
  "type": "ELECTRICITY",
  "meterCode": "EVN-P205-001"
}
```

Ví dụ nước:

```json
{
  "roomId": 205,
  "type": "WATER",
  "meterCode": "W-P205-001",
  "unit": "m3",
  "status": "ACTIVE"
}
```

Backend:

1. Xác định tenant active.
2. Tìm room thuộc tenant, `deletedAt=null`.
3. Kiểm tra room chưa có meter cùng type.
4. Gán unit mặc định nếu thiếu.
5. Tạo meter.

`meterCode` hiện không có unique constraint toàn tenant hoặc toàn hệ thống.

### 6.5. `PATCH /utility-meters/:id`

Body cho phép:

```json
{
  "meterCode": "EVN-P205-NEW",
  "unit": "kWh"
}
```

Không cho đổi:

- `roomId`
- `type`
- `tenantId`

Sửa code của bản ghi hiện tại không tạo lịch sử thay thiết bị.

### 6.6. `PATCH /utility-meters/:id/status`

```json
{
  "status": "BROKEN"
}
```

Backend chỉ kiểm meter thuộc tenant rồi cập nhật. Không có state machine hoặc reason. Đổi sang `INACTIVE/BROKEN` ngăn tạo reading mới nhưng không thay đổi lịch sử reading.

## 7. API chỉ số điện nước

### 7.1. Tổng hợp endpoint

| Method  | Endpoint                     | Role                                | Nội dung              |
| ------- | ---------------------------- | ----------------------------------- | --------------------- |
| `GET`   | `/meter-readings`            | `LANDLORD`, `MANAGER`, `ACCOUNTANT` | Danh sách reading     |
| `GET`   | `/meter-readings/:id`        | Cùng nhóm                           | Chi tiết reading      |
| `POST`  | `/meter-readings`            | Cùng nhóm                           | Nhập reading thủ công |
| `PATCH` | `/meter-readings/:id`        | Cùng nhóm                           | Sửa và tính lại       |
| `PATCH` | `/meter-readings/:id/status` | Cùng nhóm                           | Đổi trạng thái        |

### 7.2. `GET /meter-readings`

Query:

| Field           | Ý nghĩa                                            |
| --------------- | -------------------------------------------------- |
| `page`, `limit` | Phân trang                                         |
| `billingMonth`  | Đúng một tháng                                     |
| `from`, `to`    | Khoảng tháng, chỉ dùng khi không có `billingMonth` |
| `roomId`        | Lọc room                                           |
| `meterId`       | Lọc meter                                          |
| `type`          | `ELECTRICITY` hoặc `WATER`                         |
| `status`        | ReadingStatus                                      |

Nếu đồng thời gửi `billingMonth` và `from/to`, backend ưu tiên `billingMonth`.

Kết quả sắp theo:

1. `billingMonth` giảm dần.
2. `recordedAt` giảm dần.

Response gồm:

- Giá trị, consumption, unit price, amount, image, source, status.
- Meter type/code/unit/status.
- Room và property.
- Contract code/status/date nếu đã liên kết.
- `_count.invoiceItems` để biết reading đã được dùng hay chưa.

### 7.3. `POST /meter-readings`

Body:

| Field           | Bắt buộc | Validation/nguồn mặc định          |
| --------------- | -------- | ---------------------------------- |
| `meterId`       | Có       | ID dương, meter thuộc tenant       |
| `billingMonth`  | Có       | Date, chuẩn hóa ngày đầu tháng UTC |
| `currentValue`  | Có       | Không âm                           |
| `previousValue` | Không    | Reading trước hoặc `0`             |
| `unitPrice`     | Không    | Giá điện/nước hiện tại của room    |
| `imageUrl`      | Không    | URL hoặc null                      |
| `status`        | Không    | Mặc định `DRAFT`                   |

Ví dụ:

```json
{
  "meterId": 301,
  "billingMonth": "2026-07-18",
  "currentValue": 1350.5,
  "imageUrl": "https://cdn.example.com/meters/301/2026-07.jpg",
  "status": "DRAFT"
}
```

Backend xử lý:

1. Tìm meter trong tenant; room chưa xóa.
2. Chỉ chấp nhận meter `ACTIVE`.
3. Chuẩn hóa tháng.
4. Chặn meter đã có reading trong tháng.
5. Tìm reading gần nhất trước tháng hiện tại với status khác `REJECTED`.
6. Chọn previous value:
   - Giá trị caller gửi, nếu có.
   - Nếu không, `currentValue` của reading gần nhất.
   - Nếu chưa có lịch sử, `0`.
7. Chọn unit price:
   - Caller gửi, nếu có.
   - Nếu không, giá tương ứng trên room.
8. Chặn current nhỏ hơn previous.
9. Tính consumption và amount.
10. Tìm active contract phù hợp room/tháng.
11. Tạo reading với `source=MANUAL` và actor.

Kết quả minh họa:

```json
{
  "billingMonth": "2026-07-01T00:00:00.000Z",
  "previousValue": "1280.50",
  "currentValue": "1350.50",
  "consumption": "70.00",
  "unitPrice": "3800.00",
  "amount": "266000.00",
  "source": "MANUAL",
  "status": "DRAFT"
}
```

### 7.4. Cách tìm contract cho reading

Repository hiện tìm:

```text
tenantId = current tenant
roomId = meter room
Contract.status = ACTIVE
Contract.deletedAt IS NULL
Contract.startDate <= billingMonth
Contract.endDate >= billingMonth
```

`billingMonth` là ngày 1 của tháng. Vì vậy hợp đồng bắt đầu sau ngày 1 có thể không được gắn, dù có hiệu lực trong một phần tháng. Nếu không tìm thấy, reading vẫn được tạo với `contractId=null`.

### 7.5. `PATCH /meter-readings/:id`

Body cho phép:

```json
{
  "previousValue": 1280.5,
  "currentValue": 1360.5,
  "unitPrice": 3900,
  "imageUrl": null
}
```

Backend dùng giá trị mới hoặc giữ field cũ rồi tính lại consumption và amount.

Không sửa được khi:

- Reading đang `CONFIRMED`.
- Reading đã có ít nhất một `InvoiceItem`.

Reading `DRAFT`, `ABNORMAL`, `REJECTED` hiện vẫn sửa được nếu chưa dùng trong invoice.

Không cho sửa:

- Meter.
- Billing month.
- Room.
- Contract.
- Source.

### 7.6. `PATCH /meter-readings/:id/status`

Body:

```json
{
  "status": "CONFIRMED"
}
```

Chỉ bị chặn khi reading đã được dùng trong invoice. Service hiện không kiểm state transition cũ → mới và không chạy thêm anomaly rule khi xác nhận.

Điều này có nghĩa một reading `CONFIRMED` chưa dùng có thể bị đổi lại `DRAFT`, sau đó mới chỉnh dữ liệu.

## 8. Công thức và nguồn giá

### 8.1. Tính lượng tiêu thụ

```text
previousValue = 1280.5
currentValue  = 1350.5

consumption = 1350.5 - 1280.5 = 70
```

Nếu `currentValue < previousValue`, API trả `BadRequest`.

### 8.2. Tính thành tiền

```text
consumption = 70 kWh
unitPrice   = 3,800 VND/kWh

amount = 70 × 3,800 = 266,000 VND
```

### 8.3. Snapshot đơn giá

Khi reading đã được tạo, `unitPrice` nằm trên chính reading. Thay đổi `Room.electricityPrice` hoặc `Room.waterPrice` sau đó không tự sửa reading cũ.

Caller được phép truyền `unitPrice` để override giá room cho riêng kỳ đó. Chưa có bảng giá hoặc bước phê duyệt override.

### 8.4. Nguồn previous value

Reading gần nhất được chọn theo billing month nhỏ hơn tháng hiện tại, status khác `REJECTED`. Điều này bao gồm cả `DRAFT`, `CONFIRMED` và `ABNORMAL`.

Backend không bắt buộc previous value mới phải bằng current value kỳ trước nếu caller chủ động truyền field.

## 9. Tích hợp với hóa đơn G07

G07 tìm reading thỏa đồng thời:

```text
tenantId = invoice tenant
contractId = invoice contract
roomId = invoice room
billingMonth = invoice billingMonth
status = CONFIRMED
invoiceItems NONE
```

Mỗi reading được chuyển thành một invoice item:

| Meter type    | Invoice item type | Dữ liệu                                     |
| ------------- | ----------------- | ------------------------------------------- |
| `ELECTRICITY` | `ELECTRICITY`     | consumption, unit price, amount, reading ID |
| `WATER`       | `WATER`           | consumption, unit price, amount, reading ID |

Description chứa tháng, previous/current và unit.

G07 không yêu cầu bắt buộc phải có cả điện và nước. Nếu không tìm thấy reading phù hợp, invoice vẫn có thể được tạo với tiền phòng và các item khác.

Khi invoice item đã tham chiếu reading:

- Không sửa reading.
- Không đổi status reading.
- Một reading không được dùng tiếp cho invoice khác qua query hiện hành.

## 10. Dịch vụ và các khoản phí khác

FR-15 yêu cầu cấu hình điện, nước và phí dịch vụ. Trạng thái thực tế:

| Loại             | Hiện trạng                                |
| ---------------- | ----------------------------------------- |
| Giá điện         | Lưu trên Room, snapshot sang MeterReading |
| Giá nước         | Lưu trên Room, snapshot sang MeterReading |
| Phí dịch vụ      | Chưa có model/API cấu hình                |
| Phí gửi xe       | Chưa có model/API cấu hình                |
| Internet         | Chưa có model/API cấu hình                |
| Phụ thu/giảm trừ | G07 cho nhập từng dòng khi tạo invoice    |

G07 hiện nhận `extraItems` loại:

```text
SERVICE | PARKING | INTERNET | PENALTY | DISCOUNT | OTHER
```

Đây là dòng hóa đơn nhập tay, không phải dịch vụ đã được cấu hình, gán cho phòng và tự sinh theo kỳ.

## 11. Luồng nghiệp vụ hoàn chỉnh

### 11.1. Cấu hình meter cho room

1. Landlord/manager chọn room.
2. Tạo meter điện và/hoặc nước.
3. Backend chặn trùng type trong room.
4. Meter active sẵn sàng nhập reading.

### 11.2. Nhập reading đầu tiên

1. Chưa có reading cũ.
2. Không truyền `previousValue`.
3. Backend dùng `0`.
4. Giá lấy từ room nếu caller không override.

Với meter đã hoạt động trước khi đưa lên hệ thống, caller nên truyền chỉ số đầu kỳ thực tế để tránh tính toàn bộ giá trị meter từ 0.

### 11.3. Nhập reading kỳ tiếp theo

1. Backend tìm reading trước tháng hiện tại.
2. Dùng current value kỳ trước làm previous.
3. Kiểm tra current mới.
4. Tính consumption/amount và lưu draft.

### 11.4. Xử lý reading bất thường

Hiện tại user chủ động đổi status `ABNORMAL`, chỉnh dữ liệu nếu cần, rồi đổi `CONFIRMED` hoặc `REJECTED`. Backend chưa tự phát hiện tăng đột biến và chưa lưu reason.

### 11.5. Xác nhận và lập hóa đơn

1. Staff/accountant xác nhận reading.
2. G07 tạo invoice đúng contract và month.
3. G07 snapshot reading thành invoice item.
4. Reading bị khóa khỏi sửa/status update do có invoice item.

### 11.6. Meter hỏng

Đổi meter thành `BROKEN` ngăn reading mới. Hiện chưa thể tạo meter cùng type thay thế vì unique room/type vẫn áp dụng; thao tác thực tế chỉ có thể sửa code của meter hiện tại hoặc đổi lại status, làm mất ý nghĩa lịch sử thay thiết bị.

## 12. Lỗi thường gặp

| Tình huống                                 | Kết quả                      |
| ------------------------------------------ | ---------------------------- |
| Room/meter/reading ngoài tenant            | `NotFound`                   |
| Room đã có meter cùng type                 | `Conflict`                   |
| Meter inactive/broken                      | `BadRequest` khi tạo reading |
| Meter đã có reading trong tháng            | `Conflict`                   |
| Current nhỏ hơn previous                   | `BadRequest`                 |
| Sửa reading confirmed                      | `BadRequest`                 |
| Sửa/đổi status reading đã dùng cho invoice | `BadRequest`                 |
| Body rỗng hoặc field lạ                    | Validation error             |
| Thiếu tenant context                       | `TENANT_CONTEXT_REQUIRED`    |
| Membership không active/sai tenant         | `TENANT_ACCESS_DENIED`       |
| Sai role                                   | `Forbidden`                  |

Hai bước kiểm tra trùng meter/reading được thực hiện trước create. Prisma unique constraint bảo vệ database, nhưng lỗi cạnh tranh đồng thời chưa được ánh xạ rõ thành response `Conflict`.

## 13. Ví dụ sử dụng

Các ví dụ giả định backend chạy tại `http://localhost:3000`.

### 13.1. Tạo meter điện và nước

```bash
curl -X POST "http://localhost:3000/utility-meters" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 205,
    "type": "ELECTRICITY",
    "meterCode": "EVN-P205-001"
  }'
```

```bash
curl -X POST "http://localhost:3000/utility-meters" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 205,
    "type": "WATER",
    "meterCode": "W-P205-001"
  }'
```

### 13.2. Lọc meter

```bash
curl "http://localhost:3000/utility-meters?propertyId=30&roomId=205&status=ACTIVE" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

### 13.3. Đánh dấu meter hỏng

```bash
curl -X PATCH "http://localhost:3000/utility-meters/301/status" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{"status":"BROKEN"}'
```

### 13.4. Nhập reading đầu tiên

```bash
curl -X POST "http://localhost:3000/meter-readings" \
  -H "Authorization: Bearer <STAFF_OR_ACCOUNTANT_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "meterId": 301,
    "billingMonth": "2026-07-01",
    "previousValue": 1280.5,
    "currentValue": 1350.5,
    "status": "DRAFT"
  }'
```

### 13.5. Nhập kỳ sau, tự lấy previous và override giá

```bash
curl -X POST "http://localhost:3000/meter-readings" \
  -H "Authorization: Bearer <STAFF_OR_ACCOUNTANT_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "meterId": 301,
    "billingMonth": "2026-08-15",
    "currentValue": 1425.5,
    "unitPrice": 3900,
    "imageUrl": "https://cdn.example.com/meters/301/2026-08.jpg"
  }'
```

### 13.6. Sửa và xác nhận reading

```bash
curl -X PATCH "http://localhost:3000/meter-readings/701" \
  -H "Authorization: Bearer <STAFF_OR_ACCOUNTANT_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "currentValue": 1427.5
  }'
```

```bash
curl -X PATCH "http://localhost:3000/meter-readings/701/status" \
  -H "Authorization: Bearer <STAFF_OR_ACCOUNTANT_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED"}'
```

### 13.7. Lọc reading

```bash
curl "http://localhost:3000/meter-readings?from=2026-01-01&to=2026-12-01&type=ELECTRICITY&status=CONFIRMED" \
  -H "Authorization: Bearer <STAFF_OR_ACCOUNTANT_TOKEN>" \
  -H "x-tenant-id: 10"
```

## 14. Chức năng chưa hoàn thiện và hướng triển khai

Mọi API đề xuất trong phần này đều **chưa tồn tại**.

### 14.1. Giá và phí dịch vụ

| #   | Hiện trạng                                   | Ảnh hưởng                      | Hướng triển khai                                      | Dependency         | Tiêu chí hoàn thành           |
| --- | -------------------------------------------- | ------------------------------ | ----------------------------------------------------- | ------------------ | ----------------------------- |
| 1   | Không có service catalog                     | Không tái sử dụng cấu hình phí | Model service tenant-scoped, unit và calculation type | G07                | CRUD và isolation có test     |
| 2   | Không gán service cho property/room/contract | Không biết ai phải trả         | Assignment có effective date và override              | G03/G05            | Invoice lấy đúng assignment   |
| 3   | Không có recurring rule                      | Extra item phải nhập tay       | Rule theo phòng/người/số lượng/fixed                  | G07                | Tự sinh idempotent theo kỳ    |
| 4   | Giá điện/nước không version                  | Không truy lịch sử bảng giá    | Price schedule có `effectiveFrom/To`                  | G03                | Reading chọn đúng giá theo kỳ |
| 5   | Override unit price không cần reason         | Khó kiểm toán                  | Permission, reason và approval tùy ngưỡng             | Audit              | Override truy vết được        |
| 6   | Chưa có thuế/làm tròn/bậc thang              | Sai khác quyết toán            | Money Decimal và pricing strategy                     | Product/accounting | Golden tests cho công thức    |

### 14.2. Meter lifecycle

| #   | Hiện trạng                                | Ảnh hưởng                    | Hướng triển khai                                               | Dependency    | Tiêu chí hoàn thành                   |
| --- | ----------------------------------------- | ---------------------------- | -------------------------------------------------------------- | ------------- | ------------------------------------- |
| 7   | Unique room/type giữ cả meter cũ          | Không thay meter sạch        | Meter installation lịch sử hoặc `endedAt`, unique active meter | Migration     | Chỉ một installation active           |
| 8   | Sửa meter code làm mất ranh giới thiết bị | Lịch sử reading mơ hồ        | Replacement transaction, closing/opening index                 | Meter history | Reading giữ đúng meter vật lý         |
| 9   | Không có installed/removed date           | Không audit vòng đời         | Thêm timestamps và reason                                      | Schema        | Timeline đầy đủ                       |
| 10  | Status đổi tự do                          | Không có policy              | State machine active/inactive/broken/replaced                  | Audit         | Transition và reason có test          |
| 11  | Meter thiếu updatedAt/actor               | Khó truy vết                 | Bổ sung audit fields hoặc audit event                          | Migration     | Biết ai sửa code/status               |
| 12  | Accountant đọc meter API bị chặn          | UI nhập chỉ số khó lấy meter | Cấp read-only permission hoặc endpoint lookup riêng            | RBAC G01      | Accountant tra cứu nhưng không mutate |

### 14.3. Reading consistency và state machine

| #   | Hiện trạng                          | Ảnh hưởng                        | Hướng triển khai                                  | Dependency | Tiêu chí hoàn thành                            |
| --- | ----------------------------------- | -------------------------------- | ------------------------------------------------- | ---------- | ---------------------------------------------- |
| 13  | Caller tạo thẳng confirmed/rejected | Bypass review                    | Create luôn draft, endpoint submit/confirm/reject | RBAC       | Chỉ actor hợp lệ confirm                       |
| 14  | Status đổi tự do                    | Có thể mở lại terminal state     | Transition matrix và optimistic lock              | Audit      | Invalid transition bị từ chối                  |
| 15  | ABNORMAL do caller tự chọn          | Không phát hiện tự động          | Threshold theo lịch sử/room/property              | Analytics  | Rule giải thích được, có false-positive review |
| 16  | Previous lấy cả draft/abnormal      | Chuỗi chỉ số không tin cậy       | Chốt source reading hợp lệ, thường confirmed      | Product    | Previous có nguồn rõ                           |
| 17  | Caller override previous tự do      | Chuỗi bị đứt                     | So với kỳ trước, yêu cầu reason/approval          | Audit      | Discontinuity bị phát hiện                     |
| 18  | Backfill không cập nhật kỳ sau      | Consumption giữa kỳ sai          | Reconciliation chain hoặc khóa sau confirm        | Scheduler  | Backfill tạo danh sách ảnh hưởng               |
| 19  | Không kiểm tháng tương lai          | Tạo dữ liệu sai kỳ               | Policy max month và timezone                      | Product    | Boundary test                                  |
| 20  | Không validate from <= to           | Query khó hiểu                   | Cross-field Zod refine                            | API        | Invalid range trả 400                          |
| 21  | Không có deletion policy            | Reading sai không có workflow rõ | Reject/supersede thay hard delete                 | Accounting | Lịch sử không mất                              |
| 22  | Decimal chuyển sang JS number       | Rủi ro precision                 | Tính bằng Decimal library và rounding policy      | G07        | Golden financial tests                         |

### 14.4. Contract và invoice integration

| #   | Hiện trạng                                 | Ảnh hưởng                          | Hướng triển khai                                   | Dependency | Tiêu chí hoàn thành            |
| --- | ------------------------------------------ | ---------------------------------- | -------------------------------------------------- | ---------- | ------------------------------ |
| 23  | Contract match theo ngày 1 tháng           | Bỏ sót contract bắt đầu giữa tháng | Dùng overlap month hoặc billing policy             | G05        | Mid-month tests                |
| 24  | Reading có thể contractId null             | G07 không lấy được                 | Relink/reconciliation có tenant checks             | G05        | Reading được gắn an toàn       |
| 25  | Không sửa contractId qua API               | Không khắc phục dữ liệu            | Internal command hoặc job idempotent               | Audit      | Không cho link sai room/month  |
| 26  | Invoice không yêu cầu đủ meter             | Phát hành thiếu điện/nước          | Completeness policy/warning/block theo cấu hình    | G07        | UI/API nêu rõ missing readings |
| 27  | Không có API kỳ thiếu reading              | Kế toán kiểm tay                   | Closing checklist theo property/room               | Dashboard  | Danh sách thiếu chính xác      |
| 28  | Nhiều contract trong tháng chưa chia usage | Sai người chịu phí                 | Proration/move-in move-out readings                | G05/G07    | Scenario đổi renter có test    |
| 29  | Reading đã dùng khóa toàn bộ               | Sửa sai phải thao tác ngoài luồng  | Credit/cancel/reissue invoice và supersede reading | G07/G08    | Audit chain không mất          |

### 14.5. OCR, import và image

OCR hiện đã có multipart upload, tenant/plan gate, file hash chống trùng, BullMQ processor, Tesseract/Google Vision provider, confidence threshold, `NEED_REVIEW`, retry và accept tạo reading `source=OCR`. Phần còn lại:

| # | Hiện trạng | Ảnh hưởng | Hướng triển khai | Tiêu chí hoàn thành |
|---|---|---|---|---|
| 30 | Provider/queue chưa kiểm chứng staging | Không biết behavior khi Redis/provider gián đoạn | Smoke, retry, timeout và idempotency test | Không tạo job/reading trùng khi retry |
| 31 | `IMPORT` chỉ có enum | Không nhập hàng loạt | CSV/XLSX preview, validate, conflict report, commit | Partial error minh bạch, retry an toàn |
| 32 | Chưa có retention policy cho ảnh OCR | Tăng chi phí và phạm vi dữ liệu | Chốt storage lifecycle/signed access | Ảnh hết hạn đúng policy, audit đủ |

### 14.6. Self-service, audit và kiểm thử

| #   | Hiện trạng                        | Ảnh hưởng                            | Hướng triển khai                                     | Dependency    | Tiêu chí hoàn thành                     |
| --- | --------------------------------- | ------------------------------------ | ---------------------------------------------------- | ------------- | --------------------------------------- |
| 37  | Renter không xem reading          | Không đối chiếu điện nước            | `/meter-readings/me` theo active/historical contract | G05           | Không đọc phòng khác                    |
| 38  | Không có notification khi confirm | Renter không biết chỉ số             | Event reading confirmed/abnormal                     | G10           | Đúng recipient, idempotent              |
| 39  | Không có status/change history    | Khó giải quyết tranh chấp            | MeterReadingHistory before/after/actor/reason        | Audit         | Mọi thay đổi quan trọng truy được       |
| 40  | Check-then-create có race         | Unique violation có thể thành 500    | Catch Prisma conflict hoặc transactional upsert      | PostgreSQL    | Hai request đồng thời: một 2xx, một 409 |
| 41  | Chưa có integration test DB thật  | Chưa chứng minh isolation/constraint | PostgreSQL integration suite                         | Test infra    | Tenant và unique cases chạy CI          |
| 42  | Chưa có E2E G03→G06→G07           | Chưa chứng minh snapshot và invoice  | Room price → meter → reading → confirm → invoice     | G03/G07       | Amount và reference đúng DB             |
| 43  | Chưa benchmark list/read history  | Có thể chậm khi dữ liệu lớn          | Explain analyze và index review                      | Observability | SLO và query plan được ghi nhận         |

## 15. Thứ tự ưu tiên backlog

1. State machine reading, precision và tính toàn vẹn chuỗi chỉ số.
2. Sửa contract matching, relink và kiểm soát kỳ thiếu reading.
3. Danh mục dịch vụ, assignment và lịch sử đơn giá.
4. Meter replacement và lịch sử thiết bị.
5. OCR upload → process → review → confirmed reading.
6. Import hàng loạt và conflict handling.
7. Renter self-service, audit, PostgreSQL integration test và E2E G03-G07.

## 16. Checklist kiểm thử tài liệu

### 16.1. Meter

- [ ] Landlord/manager cần Bearer và `x-tenant-id`.
- [ ] Accountant không mutate meter.
- [ ] Room ngoài tenant bị từ chối.
- [ ] Một room không tạo hai meter cùng type.
- [ ] Unit mặc định điện/nước đúng.
- [ ] Update chỉ cho code/unit; status dùng endpoint riêng.

### 16.2. Reading create

- [ ] Chỉ meter active được tạo reading.
- [ ] Billing month chuẩn hóa ngày đầu tháng UTC.
- [ ] Không trùng meter/month.
- [ ] Previous tự lấy đúng theo hành vi hiện tại.
- [ ] Unit price lấy đúng room hoặc override.
- [ ] Current nhỏ hơn previous bị từ chối.
- [ ] Consumption và amount tính đúng.
- [ ] Source luôn `MANUAL`.

### 16.3. Reading update/status

- [ ] Update tính lại consumption/amount.
- [ ] Confirmed reading không sửa dữ liệu.
- [ ] Reading có invoice item không sửa hoặc đổi status.
- [ ] Ghi nhận state transition hiện chưa được giới hạn.

### 16.4. Invoice handoff

- [ ] Chỉ confirmed reading được lấy.
- [ ] Reading phải khớp tenant/contract/room/month.
- [ ] Reading đã dùng không được lấy lại.
- [ ] Invoice item giữ meter reading reference.
- [ ] Ghi nhận invoice có thể tạo khi thiếu reading.

### 16.5. Phần chưa hoàn thiện

- [ ] Không mô tả service catalog, OCR hoặc import như API hiện hành.
- [ ] Nêu rõ gap mid-month contract.
- [ ] Nêu rõ meter replacement và previous chain.
- [ ] Nêu rõ accountant không đọc được meter controller.

## 17. Tiêu chí nghiệm thu tài liệu

- Landlord biết cách tạo meter và xử lý meter hỏng theo khả năng hiện tại.
- Accountant biết thứ tự nhập, sửa, đánh dấu và xác nhận reading.
- Frontend hiểu previous value, unit price, billing month và công thức amount.
- Tester biết điều kiện khóa reading sau khi vào invoice.
- Backend developer nhìn thấy các gap về state machine, precision, contract matching và concurrency.
- Phí dịch vụ định kỳ, OCR và import được ghi đúng là chưa hoàn thiện.
- G06 chỉ mô tả điểm giao sang G07, không thay thế đặc tả hóa đơn.

## 18. Nguồn mã đối chiếu

- `backend/src/modules/utility-meters/utility-meters.controller.ts`
- `backend/src/modules/utility-meters/utility-meters.service.ts`
- `backend/src/modules/utility-meters/meter-readings.controller.ts`
- `backend/src/modules/utility-meters/meter-readings.service.ts`
- `backend/src/modules/utility-meters/model/utility-meters.model.ts`
- `backend/src/modules/utility-meters/repositories/utility-meters.repo.ts`
- `backend/src/modules/rooms`
- `backend/src/modules/contracts`
- `backend/src/modules/invoices/invoices.service.ts`
- `backend/src/modules/invoices/repositories/invoices.repo.ts`
- `backend/prisma/schema.prisma`
- `backend/docs/systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md`
- `backend/docs/systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md`
