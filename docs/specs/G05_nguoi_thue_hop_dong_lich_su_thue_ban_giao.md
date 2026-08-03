# G05 - Đặc tả người thuê, hợp đồng, lịch sử thuê và bàn giao

> **Snapshot 31/07/2026:** Renter profile, invitation one-time, contract, rental history, asset inventory, handover/dispute và contract termination đã có API cùng migration/transaction. Contract template/file/e-signature và scheduler hết hạn tự động vẫn là backlog. Snapshot này hợp nhất, không thay thế mất các chỉnh sửa G05 đang có trong working tree.

## 1. Tổng quan

Tài liệu này mô tả nhóm tính năng G05 của backend: hồ sơ người thuê, danh sách người thuê theo tenant, hợp đồng thuê phòng, người thuê chính, người ở cùng và các thay đổi dữ liệu khi hợp đồng được kích hoạt.

G05 tiếp nhận kết quả từ G04 khi một yêu cầu thuê đã được duyệt, nhưng cũng cho phép chủ trọ tạo hợp đồng trực tiếp mà không cần yêu cầu thuê. Luồng hiện tại kết thúc ở bước hợp đồng được kích hoạt hoặc hợp đồng chưa active bị hủy. Các bước ký, hết hạn, thanh lý, trả phòng và bàn giao mới có một phần nền tảng dữ liệu, chưa có API hoàn chỉnh.

Mục tiêu của tài liệu:

- Người thuê biết cách xem, cập nhật hồ sơ thuê nhà và xem hợp đồng liên quan đến mình.
- Chủ trọ biết cách tra cứu người thuê, tạo hợp đồng, khai báo người ở cùng, cập nhật và kích hoạt hợp đồng.
- Frontend biết API nào cần `x-tenant-id`, field nào có thể gửi và trạng thái nào được thao tác.
- Tester biết các điều kiện, side effect, transaction và lỗi cần kiểm tra.
- Backend developer phân biệt phần đã hoạt động với các model mới chỉ tồn tại trong Prisma schema.

### 1.1. Phạm vi

| Mảng                | Chức năng                                                                |
| ------------------- | ------------------------------------------------------------------------ |
| Hồ sơ người thuê    | Người thuê xem và cập nhật thông tin thuê nhà của mình                   |
| Tra cứu người thuê  | Landlord/manager tìm và xem người thuê có quan hệ với tenant             |
| Hợp đồng            | List, detail, tạo draft, cập nhật, activate và cancel                    |
| Thành viên hợp đồng | Người thuê chính và người ở cùng                                         |
| Liên kết G04        | Tạo contract từ rental request `APPROVED` và chuyển request khi activate |
| Lịch sử thuê        | Tạo `RentalHistory ACTIVE` khi activate contract                         |
| Nền tảng mở rộng    | Template, file hợp đồng, thanh lý, tài sản và bàn giao mới có schema     |

### 1.2. Ngoài phạm vi

| Chức năng                                   | Nhóm tài liệu |
| ------------------------------------------- | ------------- |
| Đăng ký, đăng nhập và hồ sơ tài khoản chung | G01           |
| Nhà, phòng và trạng thái marketplace        | G03           |
| Lịch xem, yêu cầu thuê và duyệt lead        | G04           |
| Đồng hồ và chỉ số điện nước                 | G06           |
| Hóa đơn và công nợ                          | G07           |
| Thanh toán và tiền cọc                      | G08           |
| Dashboard hợp đồng sắp hết hạn              | G11           |

### 1.3. Trạng thái triển khai

| Nhóm                   | Trạng thái            | Nhận định                                                                |
| ---------------------- | --------------------- | ------------------------------------------------------------------------ |
| Renter self-profile    | Đã hoạt động          | Có xem/cập nhật, chưa có upload giấy tờ hoặc verification workflow       |
| Landlord renter lookup | Đã hoạt động          | Nhận diện qua request, appointment, contract/member và rental history    |
| Tạo/cập nhật contract  | Đã hoạt động          | Có validation phòng, renter, sức chứa và transaction members             |
| Kích hoạt contract     | Đã hoạt động          | Có transaction/CAS cập nhật room/history/request; chữ ký vẫn là luồng riêng |
| Renter xem contract    | Đã hoạt động          | Main renter và co-renter đều có quyền đọc                                |
| Hủy contract           | Đã hoạt động một phần | Chỉ hủy contract chưa active, chưa release reservation                   |
| Ký hợp đồng            | Chỉ có schema         | Chưa có API cập nhật chữ ký hoặc trạng thái chờ ký                       |
| Hết hạn/thanh lý       | Hoạt động một phần    | Thanh lý/trả phòng đã có API; scheduler hết hạn chưa thuộc phạm vi       |
| Rental history         | Đã hoạt động          | Có API lịch sử và đóng bản ghi atomically khi hoàn tất thanh lý          |
| Template/file hợp đồng | Chỉ có schema         | Chưa có module/controller/service                                        |
| Tài sản/bàn giao       | Đã hoạt động          | Có inventory, check-in/check-out, ký hai phía và xử lý tranh chấp        |

Chi tiết API bàn giao và thanh lý mới xem tại `docs/api/G05_HANDOVER_TERMINATION.md`.

## 2. Actor, xác thực và tenant context

### 2.1. Actor và header

| Actor      | API                                    | Header                                |
| ---------- | -------------------------------------- | ------------------------------------- |
| `TENANT`   | `/renters/me`, `/contracts/me`         | `Authorization: Bearer <accessToken>` |
| `LANDLORD` | `/renters`, `/contracts` phía vận hành | Bearer token và `x-tenant-id`         |
| `MANAGER`  | Tương tự landlord                      | Bearer token và `x-tenant-id`         |

Renter self-service:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Landlord/manager:

```http
Authorization: Bearer <accessToken>
x-tenant-id: <tenantId>
Content-Type: application/json
```

`TENANT` là tên role hệ thống của người thuê, không phải bản ghi tổ chức `Tenant`. Người thuê dùng API `/me` không gửi `x-tenant-id`; quyền được xác định từ `userId` trong access token và quan hệ trực tiếp với hồ sơ/hợp đồng.

### 2.2. Các ID cần phân biệt

| Field              | Trỏ tới                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| `renterId`         | `User.id` của người thuê chính                                           |
| `coRenterIds`      | Mảng `User.id` của người ở cùng                                          |
| `RenterProfile.id` | ID hồ sơ chi tiết, không dùng thay `User.id`                             |
| `tenantId`         | Đơn vị vận hành phòng và hợp đồng                                        |
| `roomId`           | Phòng được thuê                                                          |
| `rentalRequestId`  | Yêu cầu thuê G04, không bắt buộc                                         |
| `templateId`       | Mẫu hợp đồng của tenant, không bắt buộc                                  |
| `contractId`       | Hợp đồng dùng bởi history, reading, invoice, ticket và các nghiệp vụ sau |

## 3. Mô hình dữ liệu và thuật ngữ

### 3.1. Quan hệ chính

```text
User
└── RenterProfile

Tenant
└── Property
    └── Room
        ├── RentalRequest? (G04)
        ├── Contract
        │   ├── renter: User
        │   ├── ContractMember[]
        │   ├── ContractTemplate?
        │   ├── ContractFile[]                  [chỉ có schema]
        │   ├── RentalHistory[]
        │   ├── ContractTerminationRequest[]   [đã có API]
        │   ├── HandoverRecord[]                [đã có API]
        │   ├── MeterReading[]                  [G06]
        │   └── Invoice[]                       [G07]
        └── RoomAsset[]                         [đã có API]
```

### 3.2. User và RenterProfile

| Dữ liệu         | Ý nghĩa                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| `User`          | Tài khoản, họ tên, email, phone, avatar và trạng thái truy cập                        |
| `RenterProfile` | Ngày sinh, giới tính, giấy tờ, địa chỉ, nghề nghiệp, liên hệ khẩn cấp và verification |

`PATCH /renters/me` chỉ cập nhật `RenterProfile`. Muốn cập nhật họ tên, phone hoặc avatar, client dùng API profile thuộc G01.

### 3.3. Contract và ContractMember

`Contract.renterId` là người thuê chính chịu trách nhiệm hợp đồng. Khi tạo contract, backend đồng thời tạo:

- Một `ContractMember` role `MAIN_RENTER` cho `renterId`.
- Không hoặc nhiều `ContractMember` role `CO_RENTER` cho `coRenterIds`.

Người ở cùng được phép đọc contract qua API `/contracts/me`, nhưng không thay thế người thuê chính.

### 3.4. Các enum

#### VerificationStatus

| Giá trị      | Ý nghĩa        |
| ------------ | -------------- |
| `UNVERIFIED` | Chưa xác minh  |
| `PENDING`    | Đang chờ duyệt |
| `VERIFIED`   | Đã xác minh    |
| `REJECTED`   | Bị từ chối     |

#### ContractStatus

| Giá trị                 | Ý nghĩa thiết kế          | API hiện tại tạo/chuyển được          |
| ----------------------- | ------------------------- | ------------------------------------- |
| `DRAFT`                 | Hợp đồng nháp             | `POST /contracts`                     |
| `WAITING_LANDLORD_SIGN` | Chờ chủ trọ ký            | Chưa có API chuyển vào trạng thái này |
| `WAITING_RENTER_SIGN`   | Chờ renter ký             | Chưa có API chuyển vào trạng thái này |
| `ACTIVE`                | Đang có hiệu lực          | `PATCH /contracts/:id/activate`       |
| `EXPIRED`               | Hết hạn                   | Chưa có API/job                       |
| `TERMINATED`            | Thanh lý trước hạn        | Chưa có API                           |
| `CANCELED`              | Hủy trước khi có hiệu lực | `PATCH /contracts/:id/cancel`         |

Sự tồn tại của enum không có nghĩa toàn bộ state machine đã được triển khai.

#### Các enum liên quan

```text
Gender:
MALE | FEMALE | OTHER

ContractBillingCycle:
MONTHLY | QUARTERLY

ContractMemberRole:
MAIN_RENTER | CO_RENTER

RentalHistoryStatus:
ACTIVE | ENDED | TERMINATED

TerminationRequestStatus:
PENDING | APPROVED | REJECTED | COMPLETED | CANCELED

AssetCondition:
NEW | GOOD | NORMAL | DAMAGED | LOST

HandoverType:
CHECKIN | CHECKOUT

HandoverStatus:
DRAFT | CONFIRMED | DISPUTED
```

## 4. Quy ước API

### 4.1. Phân trang

Các API list trả:

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

`page` mặc định `1`; `limit` mặc định `20` và tối đa `100`.

### 4.2. Date và Decimal

- DTO dùng `z.coerce.date()`, vì vậy client nên gửi ISO 8601.
- `dateOfBirth`, `startDate`, `endDate` được lưu kiểu date ở PostgreSQL.
- `monthlyPrice` và `depositAmount` là Prisma `Decimal`; JSON thực tế có thể biểu diễn dạng chuỗi tùy serializer.
- Client không nên dùng số thực nhị phân để tự quyết toán tiền.

### 4.3. Validation

DTO dùng schema `strict`; field không khai báo bị từ chối. Các ID phải là số nguyên dương. Body update phải chứa ít nhất một field.

## 5. API hồ sơ người thuê

### 5.1. Tổng hợp endpoint

| Method  | Endpoint       | Role                  | Tenant header | Nội dung                          |
| ------- | -------------- | --------------------- | ------------- | --------------------------------- |
| `GET`   | `/renters/me`  | `TENANT`              | Không         | Hồ sơ của user hiện tại           |
| `PATCH` | `/renters/me`  | `TENANT`              | Không         | Cập nhật RenterProfile            |
| `GET`   | `/renters`     | `LANDLORD`, `MANAGER` | Có            | Danh sách renter liên quan tenant |
| `GET`   | `/renters/:id` | `LANDLORD`, `MANAGER` | Có            | Chi tiết renter liên quan tenant  |

### 5.2. `GET /renters/me`

Backend tìm user chưa xóa và trả:

- Thông tin tài khoản cơ bản.
- Toàn bộ `RenterProfile`.
- Tối đa 10 rental request gần nhất của user.
- Tối đa 10 viewing appointment gần nhất của user.

Nếu tài khoản không có `RenterProfile`, API trả `NotFound`.

### 5.3. `PATCH /renters/me`

Body:

| Field                   | Kiểu   | Nullable | Validation                |
| ----------------------- | ------ | -------- | ------------------------- |
| `dateOfBirth`           | date   | Có       | Date hợp lệ               |
| `gender`                | enum   | Có       | `MALE`, `FEMALE`, `OTHER` |
| `identityNumber`        | string | Có       | Tối đa 50                 |
| `identityFrontUrl`      | URL    | Có       | URL hợp lệ, tối đa 2000   |
| `identityBackUrl`       | URL    | Có       | URL hợp lệ, tối đa 2000   |
| `permanentAddress`      | string | Có       | Tối đa 2000               |
| `occupation`            | string | Có       | Tối đa 100                |
| `emergencyContactName`  | string | Có       | Tối đa 100                |
| `emergencyContactPhone` | string | Có       | Tối đa 50                 |

Ví dụ:

```json
{
  "dateOfBirth": "2001-04-18",
  "gender": "MALE",
  "identityNumber": "001201012345",
  "permanentAddress": "Phường Dịch Vọng, Cầu Giấy, Hà Nội",
  "occupation": "Lập trình viên",
  "emergencyContactName": "Nguyễn Văn B",
  "emergencyContactPhone": "0900000000"
}
```

Gửi `null` để xóa một field nullable:

```json
{
  "identityBackUrl": null
}
```

API không cho renter tự thay `verificationStatus`.

### 5.4. `GET /renters`

Query:

| Field                | Ý nghĩa                              |
| -------------------- | ------------------------------------ |
| `page`, `limit`      | Phân trang                           |
| `search`             | Tìm theo full name, email hoặc phone |
| `verificationStatus` | Lọc trạng thái xác minh              |

Điều kiện hiện tại:

```text
User.deletedAt IS NULL
User.status = ACTIVE
User có RenterProfile
User có ít nhất một RentalRequest hoặc ViewingAppointment thuộc tenant
```

Đây là danh sách lead/renter từng tương tác với tenant, chưa phải danh sách đầy đủ người đang thuê. Nếu một contract được tạo trực tiếp cho user chưa từng có request/appointment, user đó có thể không xuất hiện ở endpoint này.

### 5.5. `GET /renters/:id`

Ngoài profile, response trả tối đa 10 request và 10 appointment của renter, được giới hạn đúng tenant hiện tại.

User phải có request hoặc appointment trong tenant. Backend hiện không dùng contract/rental history để xác định quan hệ truy cập.

## 6. API hợp đồng

### 6.1. Tổng hợp endpoint

| Method  | Endpoint                  | Role                  | Tenant header | Nội dung                      |
| ------- | ------------------------- | --------------------- | ------------- | ----------------------------- |
| `GET`   | `/contracts/me`           | `TENANT`              | Không         | Danh sách contract của mình   |
| `GET`   | `/contracts/me/:id`       | `TENANT`              | Không         | Chi tiết contract của mình    |
| `GET`   | `/contracts`              | `LANDLORD`, `MANAGER` | Có            | Danh sách contract tenant     |
| `GET`   | `/contracts/:id`          | `LANDLORD`, `MANAGER` | Có            | Chi tiết contract tenant      |
| `POST`  | `/contracts`              | `LANDLORD`, `MANAGER` | Có            | Tạo contract `DRAFT`          |
| `PATCH` | `/contracts/:id`          | `LANDLORD`, `MANAGER` | Có            | Sửa contract có thể chỉnh sửa |
| `PATCH` | `/contracts/:id/activate` | `LANDLORD`, `MANAGER` | Có            | Kích hoạt contract            |
| `PATCH` | `/contracts/:id/cancel`   | `LANDLORD`, `MANAGER` | Có            | Hủy contract chưa active      |

### 6.2. Response contract

Select hiện tại gồm:

- Field chính của contract và thời điểm ký.
- Room, property và trạng thái room/marketplace.
- Main renter và verification status.
- Rental request liên quan.
- Tên template.
- Danh sách member cùng full name, email, phone.
- Tối đa một `RentalHistory ACTIVE` gần nhất.

Response chưa trả `ContractFile`, termination request hoặc handover record.

### 6.3. `GET /contracts`

Query:

| Field           | Ý nghĩa                                                    |
| --------------- | ---------------------------------------------------------- |
| `page`, `limit` | Phân trang                                                 |
| `status`        | Lọc ContractStatus                                         |
| `roomId`        | Lọc phòng                                                  |
| `renterId`      | Lọc người thuê chính                                       |
| `propertyId`    | Lọc nhà trọ                                                |
| `search`        | Mã contract, tên/email/phone renter, mã hoặc tiêu đề phòng |

Contract phải thuộc tenant và `deletedAt=null`.

### 6.4. `GET /contracts/me`

User thấy contract khi:

```text
Contract.renterId = currentUserId
OR ContractMember.userId = currentUserId
```

DTO tiếp nhận các filter giống list landlord, nhưng service hiện chỉ dùng `page` và `limit`. `status`, `roomId`, `renterId`, `propertyId`, `search` đang bị bỏ qua ở API `/me`.

### 6.5. `POST /contracts`

Body:

| Field             | Bắt buộc | Validation/ý nghĩa                          |
| ----------------- | -------- | ------------------------------------------- |
| `roomId`          | Có       | ID dương, room thuộc tenant                 |
| `renterId`        | Có       | `User.id` của main renter                   |
| `rentalRequestId` | Không    | Request `APPROVED`, cùng room/renter/tenant |
| `templateId`      | Không    | Template thuộc tenant                       |
| `contractCode`    | Không    | 1-100 ký tự, duy nhất toàn hệ thống         |
| `startDate`       | Có       | Date                                        |
| `endDate`         | Có       | Phải sau start date                         |
| `monthlyPrice`    | Có       | Không âm                                    |
| `depositAmount`   | Có       | Không âm                                    |
| `billingCycle`    | Có       | `MONTHLY` hoặc `QUARTERLY`                  |
| `paymentDueDay`   | Có       | Số nguyên 1-28                              |
| `contentSnapshot` | Có       | Chuỗi không rỗng                            |
| `coRenterIds`     | Không    | Tối đa 20 ID trước khi kiểm sức chứa        |

Ví dụ:

```json
{
  "roomId": 205,
  "renterId": 99,
  "rentalRequestId": 410,
  "startDate": "2026-08-01",
  "endDate": "2027-07-31",
  "monthlyPrice": 3500000,
  "depositAmount": 3500000,
  "billingCycle": "MONTHLY",
  "paymentDueDay": 5,
  "contentSnapshot": "# Hợp đồng thuê phòng\nNội dung đã chốt...",
  "coRenterIds": [100]
}
```

Backend xử lý:

1. Kiểm tra khoảng ngày.
2. Tìm room thuộc tenant, chưa xóa, status `AVAILABLE` hoặc `RESERVED`.
3. Loại ID co-renter trùng nhau tại DTO.
4. Chặn main renter xuất hiện trong co-renter.
5. Kiểm tra tổng người không vượt `maxOccupants`.
6. Kiểm tra tất cả user active và có RenterProfile.
7. Nếu có request, kiểm tra `APPROVED` và khớp room/renter.
8. Nếu có template, kiểm tra thuộc tenant.
9. Kiểm tra hoặc sinh contract code.
10. Trong một transaction tạo Contract, member chính và các co-renter.

Nếu không truyền `contractCode`, backend thử sinh tối đa 5 lần:

```text
HD-{tenantId}-{YYYYMMDD}-{randomSuffix}
```

### 6.6. `PATCH /contracts/:id`

Chỉ sửa được contract:

```text
DRAFT | WAITING_LANDLORD_SIGN | WAITING_RENTER_SIGN
```

Body cho phép:

- `startDate`
- `endDate`
- `monthlyPrice`
- `depositAmount`
- `billingCycle`
- `paymentDueDay`
- `contentSnapshot`
- `coRenterIds`

Không cho đổi main renter, room, rental request, template hoặc contract code.

Nếu gửi `coRenterIds`, backend xóa toàn bộ co-renter cũ rồi tạo lại danh sách mới trong transaction. Không gửi field này thì giữ nguyên.

### 6.7. `PATCH /contracts/:id/activate`

Không có request body.

Điều kiện:

- Contract thuộc tenant, chưa xóa.
- Contract đang `DRAFT`, `WAITING_LANDLORD_SIGN` hoặc `WAITING_RENTER_SIGN`.
- Room đang `AVAILABLE` hoặc `RESERVED`.
- Không có contract `ACTIVE` khác của room theo kết quả kiểm tra hiện tại.

Transaction:

```text
Contract.status             -> ACTIVE
Room.status                 -> OCCUPIED
Room.marketplaceStatus      -> HIDDEN
RentalHistory               -> tạo mới, status ACTIVE
RentalRequest.status        -> CONVERTED_TO_CONTRACT (nếu có)
```

`RentalHistory.startedAt` lấy từ `Contract.startDate`, không phải thời điểm gọi activate.

Hiện tại activate không kiểm tra hai bên đã ký và không kiểm tra ngày hiện tại có nằm trong khoảng hợp đồng.

### 6.8. `PATCH /contracts/:id/cancel`

Không có request body.

- Contract `ACTIVE` không được cancel qua endpoint này.
- Contract `EXPIRED`, `TERMINATED`, `CANCELED` cũng bị từ chối.
- Các trạng thái draft/chờ ký được chuyển thành `CANCELED`.

Endpoint hiện chỉ đổi contract status; không cập nhật room hoặc rental request.

## 7. Luồng nghiệp vụ

### 7.1. Renter hoàn thiện hồ sơ

1. User role `TENANT` đăng nhập.
2. Gọi `GET /renters/me`.
3. Gọi `PATCH /renters/me` với các field cần bổ sung.
4. Backend cập nhật `RenterProfile` theo `userId`.
5. Response trả lại user, profile và hành trình gần nhất.

Việc cập nhật hồ sơ không tự chuyển `verificationStatus`.

### 7.2. Chủ trọ tra cứu renter

1. Landlord/manager chọn tenant.
2. Gửi Bearer token và `x-tenant-id`.
3. Backend kiểm membership active và tenant active.
4. Truy vấn renter có request/appointment trong tenant.
5. Trả danh sách phân trang hoặc detail giới hạn tenant.

### 7.3. Tạo contract trực tiếp

Không truyền `rentalRequestId`. Luồng phù hợp khi chủ trọ đã có thông tin renter ngoài marketplace. Tuy nhiên, user vẫn phải tồn tại, active và có RenterProfile.

### 7.4. Tạo contract từ request

1. G04 đã duyệt request thành `APPROVED`, room thành `RESERVED`.
2. Landlord gọi `POST /contracts` với request, room và renter tương ứng.
3. Backend tạo contract `DRAFT`; request vẫn `APPROVED`.
4. Chỉ khi activate contract, request mới thành `CONVERTED_TO_CONTRACT`.

### 7.5. Thay đổi người ở cùng

1. Contract phải còn editable.
2. Gửi danh sách hoàn chỉnh trong `coRenterIds`.
3. Backend kiểm tra active profile và room capacity.
4. Transaction thay thế toàn bộ co-renter.

### 7.6. Kích hoạt contract

Activate là bước có side effect lớn. Sau khi thành công:

- Renter có contract active.
- Room được coi là đang có người thuê ngay lập tức.
- Tin marketplace bị ẩn.
- Lịch sử thuê active được tạo.
- Request nguồn được đóng hành trình.

Không có thao tác rollback nghiệp vụ tự động nếu bước activate được thực hiện nhầm.

### 7.7. Hủy contract chưa active

Hủy contract draft không đồng nghĩa hủy rental request hoặc trả room từ `RESERVED` về `AVAILABLE`. Frontend không nên giả định phòng tự được giải phóng.

## 8. Lỗi và trạng thái thường gặp

| Tình huống                                             | Kết quả                   |
| ------------------------------------------------------ | ------------------------- |
| Không có RenterProfile                                 | `NotFound`                |
| Renter không có quan hệ request/appointment với tenant | `NotFound`                |
| Room không thuộc tenant                                | `NotFound`                |
| Room không `AVAILABLE/RESERVED` khi tạo hoặc activate  | `BadRequest`              |
| End date không sau start date                          | `BadRequest`              |
| Main renter nằm trong co-renter                        | `BadRequest`              |
| Vượt `maxOccupants`                                    | `BadRequest`              |
| User không active hoặc thiếu profile                   | `BadRequest`              |
| Request không approved hoặc không khớp                 | `BadRequest`              |
| Template không thuộc tenant                            | `NotFound`                |
| Contract code trùng                                    | `Conflict`                |
| Room đã có active contract khác                        | `Conflict`                |
| Sửa contract không editable                            | `BadRequest`              |
| Cancel contract active/terminal                        | `BadRequest`              |
| Thiếu `x-tenant-id`                                    | `TENANT_CONTEXT_REQUIRED` |
| Không thuộc tenant                                     | `TENANT_ACCESS_DENIED`    |
| Sai role                                               | `Forbidden`               |

## 9. Ví dụ sử dụng

Các ví dụ giả định backend chạy tại `http://localhost:3000`.

### 9.1. Xem và cập nhật hồ sơ renter

```bash
curl "http://localhost:3000/renters/me" \
  -H "Authorization: Bearer <RENTER_ACCESS_TOKEN>"
```

```bash
curl -X PATCH "http://localhost:3000/renters/me" \
  -H "Authorization: Bearer <RENTER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "occupation": "Lập trình viên",
    "permanentAddress": "Cầu Giấy, Hà Nội",
    "emergencyContactName": "Nguyễn Văn B",
    "emergencyContactPhone": "0900000000"
  }'
```

### 9.2. Landlord tìm renter

```bash
curl "http://localhost:3000/renters?page=1&limit=20&search=nguyen&verificationStatus=VERIFIED" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

### 9.3. Tạo contract từ request approved

```bash
curl -X POST "http://localhost:3000/contracts" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": 205,
    "renterId": 99,
    "rentalRequestId": 410,
    "startDate": "2026-08-01",
    "endDate": "2027-07-31",
    "monthlyPrice": 3500000,
    "depositAmount": 3500000,
    "billingCycle": "MONTHLY",
    "paymentDueDay": 5,
    "contentSnapshot": "Nội dung hợp đồng đã chốt",
    "coRenterIds": [100]
  }'
```

### 9.4. Cập nhật contract draft

```bash
curl -X PATCH "http://localhost:3000/contracts/501" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyPrice": 3700000,
    "paymentDueDay": 3,
    "coRenterIds": [100, 101]
  }'
```

### 9.5. Activate và cancel

```bash
curl -X PATCH "http://localhost:3000/contracts/501/activate" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

```bash
curl -X PATCH "http://localhost:3000/contracts/502/cancel" \
  -H "Authorization: Bearer <STAFF_ACCESS_TOKEN>" \
  -H "x-tenant-id: 10"
```

### 9.6. Renter xem contract

```bash
curl "http://localhost:3000/contracts/me?page=1&limit=20" \
  -H "Authorization: Bearer <RENTER_ACCESS_TOKEN>"
```

```bash
curl "http://localhost:3000/contracts/me/501" \
  -H "Authorization: Bearer <RENTER_ACCESS_TOKEN>"
```

## 10. Chức năng chưa hoàn thiện và hướng triển khai

Mọi API đề xuất trong phần này đều **chưa tồn tại**. Không dùng chúng như API hiện hành.

### 10.1. Hồ sơ và quản lý renter

| #   | Hiện trạng                                       | Ảnh hưởng                                | Hướng triển khai                                                 | Dependency        | Tiêu chí hoàn thành                           |
| --- | ------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------- | ----------------- | --------------------------------------------- |
| 1   | Landlord chưa tạo/cập nhật renter                | FR-12 mới đáp ứng một phần               | Thêm provisioning/invite renter và update có consent             | G01, notification | Tạo renter an toàn, không truyền mật khẩu thô |
| 2   | List/detail chỉ dựa request/appointment          | Contract tạo trực tiếp có thể không hiện | Thêm quan hệ contract member/rental history vào access predicate | Contract          | Renter đang/đã thuê luôn tra cứu đúng tenant  |
| 3   | Không có verification workflow                   | Enum không phản ánh quy trình duyệt      | API submit/review/reject kèm actor, reason, timestamp            | Storage, audit    | Transition hợp lệ và có lịch sử               |
| 4   | Identity image chỉ là URL                        | Không quản lý quyền/file lifecycle       | Upload server-side, ownership, MIME/size và signed URL           | Storage           | Chỉ chủ thể hợp lệ đọc được file              |
| 5   | Contract chỉ yêu cầu profile tồn tại             | Profile rejected vẫn có thể ký           | Chốt policy verification theo sản phẩm                           | G04, product      | Status không đủ điều kiện bị chặn rõ          |
| 6   | Không validate tuổi/ngày sinh/CCCD trùng         | Dữ liệu hồ sơ kém tin cậy                | Validation nghiệp vụ và uniqueness phù hợp                       | Product/legal     | Case biên có test                             |
| 7   | Landlord response chứa CCCD/ảnh/liên hệ khẩn cấp | Rủi ro PII                               | Tách list/detail select, masking và permission chi tiết          | Privacy/security  | List tối thiểu dữ liệu, detail có audit       |
| 8   | Request/appointment trong detail giới hạn 10     | Không xem đủ lịch sử                     | API lịch sử phân trang riêng                                     | G04               | Có filter, paging và tenant isolation         |

### 10.2. State machine và tính toàn vẹn hợp đồng

| #   | Hiện trạng                                  | Ảnh hưởng                                         | Hướng triển khai                                                    | Dependency        | Tiêu chí hoàn thành                         |
| --- | ------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- | ----------------- | ------------------------------------------- |
| 9   | Không có API gửi ký                         | Trạng thái waiting không dùng được                | Thiết kế transition draft → landlord sign → renter sign             | Notification      | Chỉ transition hợp lệ được chấp nhận        |
| 10  | Hai thời điểm ký chưa được ghi              | Không chứng minh xác nhận                         | Endpoint sign có actor, timestamp và consent snapshot               | Auth, audit       | Hai bên chỉ ký contract liên quan           |
| 11  | Activate trực tiếp từ draft                 | Bỏ qua chữ ký                                     | Chỉ activate sau khi đủ điều kiện ký, hoặc policy override có audit | Signing           | Không bypass ngoài quyền đặc biệt           |
| 12  | Không kiểm ngày khi activate                | Contract tương lai/hết hạn làm room occupied ngay | Chốt effective-date policy và scheduler                             | Background job    | Trạng thái room đúng theo ngày              |
| 13  | Check active contract nằm ngoài transaction | Hai request đồng thời có thể cùng active          | Lock/conditional update hoặc DB exclusion/constraint                | PostgreSQL        | Concurrency test chỉ một request thành công |
| 14  | Không có DB rule một active contract/phòng  | Invariant phụ thuộc service                       | Thiết kế partial unique hoặc cơ chế lock phù hợp                    | Migration         | DB bảo vệ invariant                         |
| 15  | Approved request có thể tạo nhiều draft     | Hành trình bị nhân đôi                            | Unique/policy một contract chưa terminal mỗi request                | G04               | Request không bị tái sử dụng sai            |
| 16  | Cancel không release reservation            | Room kẹt `RESERVED/HIDDEN`                        | Transaction cancel + quyết định request + conditional room release  | G03, G04          | Không ảnh hưởng contract/request khác       |
| 17  | Không có expire scheduler                   | Contract quá hạn vẫn active                       | Job idempotent chuyển `EXPIRED`                                     | Scheduler         | Chạy lặp không tạo sai trạng thái           |
| 18  | Không có terminate active contract          | Không trả phòng được trong hệ thống               | Termination request và landlord decision                            | Handover, G07/G08 | Có state machine, reason và ngày hiệu lực   |
| 19  | RentalHistory không được đóng               | Lịch sử luôn active                               | Cập nhật `endedAt`, `ENDED/TERMINATED` trong transaction            | Termination       | Không còn history active sau kết thúc       |
| 20  | Room không tự về available                  | Phòng kẹt occupied                                | Kiểm contract active khác rồi release room                          | G03               | Room chỉ available khi an toàn              |
| 21  | Không có policy republish                   | Không biết tin nên draft hay hidden               | Tách release room và quyết định marketplace                         | G03               | Trạng thái tin có quy tắc rõ                |
| 22  | Content sửa được khi waiting sign           | Chữ ký có thể áp vào nội dung thay đổi            | Version immutable, hash snapshot và reset signature khi sửa         | Contract file     | Mỗi chữ ký gắn đúng version                 |
| 23  | Không có notification contract              | Hai bên không biết cần hành động                  | Event create/send/sign/activate/expire/terminate                    | G10               | Event idempotent và đúng recipient          |
| 24  | Không có transition history                 | Khó audit tranh chấp                              | ContractStatusHistory/outbox audit                                  | Audit             | Truy ra actor, before/after, time           |

### 10.3. Truy vấn và privacy

| #   | Hiện trạng                                        | Ảnh hưởng                     | Hướng triển khai                                           | Dependency         | Tiêu chí hoàn thành               |
| --- | ------------------------------------------------- | ----------------------------- | ---------------------------------------------------------- | ------------------ | --------------------------------- |
| 25  | Filter `/contracts/me` bị bỏ qua                  | UI filter sai kỳ vọng         | Áp dụng status/room/property/search có giới hạn quyền      | Contract repo      | Contract test từng filter         |
| 26  | Member response lộ email/phone của nhau           | Rủi ro PII                    | Tách renter/staff projection và mask field                 | Privacy            | Renter chỉ nhận field cần thiết   |
| 27  | Không có detail scope riêng cho main/co-renter    | Mọi member nhận cùng response | Xây policy field theo vai trò member                       | Product            | Contract test response role-based |
| 28  | API rental history đã có nhưng chưa E2E DB        | Có thể còn lỗi scope/filter    | Chạy list mine/tenant bằng PostgreSQL seed                  | Contract lifecycle | History đúng tenant/user          |
| 29  | Contract có `deletedAt` nhưng không có delete API | Soft-delete chưa vận hành     | Chỉ cho archive contract hợp lệ, không xóa lịch sử pháp lý | Legal/audit        | Không phá invoice/history         |

### 10.4. Phạm vi đã có API và phần schema-only

`ContractTerminationRequest`, `AssetCategory`, `RoomAsset`, `HandoverRecord` và `HandoverAssetItem` đã có API, transaction và unit test. Phần còn schema/backlog:

| # | Model/capability | Hiện trạng | Hướng triển khai và tiêu chí |
|---|---|---|---|
| 30 | `ContractTemplate` | Chưa có API | CRUD tenant-scoped, version/default rõ ràng |
| 31 | `ContractFile` | Chưa có API | Upload/download/version immutable/access control |
| 32 | Chữ ký hợp đồng | Chưa có workflow | Identity, consent, hash/version và audit pháp lý |
| 33 | Bồi thường từ dispute | Chưa nối invoice/debt | Policy duyệt và audit trước khi tạo khoản phải thu |

### 10.5. Audit, kiểm thử và vận hành

| #   | Hiện trạng                             | Hướng triển khai                                            | Tiêu chí hoàn thành               |
| --- | -------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| 39  | Chưa có integration test PostgreSQL    | Test transaction, constraint, tenant isolation bằng DB thật | Race và rollback được chứng minh  |
| 40  | Chưa có E2E G04→G05→G06/G07            | Journey approve → contract → activate → reading/invoice     | HTTP và DB chạy xuyên suốt        |
| 41  | Chưa có test future/expired activation | Bổ sung date boundary/timezone tests                        | Không phụ thuộc timezone máy chạy |
| 42  | Chưa có legal retention policy         | Chốt retention file, PII, contract và handover              | Archive/xóa đúng quy định         |

## 11. Thứ tự ưu tiên backlog

1. State machine ký, activate, expire và terminate.
2. Chống activate đồng thời và bảo đảm một active contract cho mỗi room.
3. Release reservation, kết thúc rental history và trả trạng thái room an toàn.
4. Sửa phạm vi renter lookup, filter `/me` và bảo vệ PII.
5. Contract template, content version và file hợp đồng.
6. Staging/integration test cho termination, tài sản và bàn giao đã có.
7. Notification, audit, integration test và E2E G04-G08.

## 12. Checklist kiểm thử tài liệu

### 12.1. Renter profile

- [ ] Renter có profile xem được `/renters/me`.
- [ ] User thiếu profile nhận `NotFound`.
- [ ] Update một field thành công.
- [ ] Gửi `null` xóa field nullable.
- [ ] Body rỗng hoặc field lạ bị từ chối.
- [ ] Renter không tự đổi verification status.

### 12.2. Landlord renter lookup

- [ ] Bắt buộc Bearer và `x-tenant-id`.
- [ ] Search và verification filter hoạt động.
- [ ] Renter không liên quan tenant không được đọc.
- [ ] Ghi nhận hạn chế contract-only renter.

### 12.3. Contract create/update

- [ ] Room ngoài tenant bị từ chối.
- [ ] Room không available/reserved bị từ chối.
- [ ] Date range, giá và due day được validate.
- [ ] Main/co-renter active, có profile và không vượt capacity.
- [ ] Rental request phải approved và khớp room/renter.
- [ ] Contract và members được rollback cùng nhau khi transaction lỗi.
- [ ] Chỉ status editable được update.

### 12.4. Activate/cancel

- [ ] Activate đổi contract, room, marketplace, history và request.
- [ ] Room có active contract khác bị từ chối.
- [ ] Cancel active/terminal bị từ chối.
- [ ] Test ghi nhận các gap ký, concurrency và release reservation.

### 12.5. Self-service contract

- [ ] Main renter đọc được contract.
- [ ] Co-renter đọc được contract.
- [ ] User không liên quan nhận `NotFound`.
- [ ] Ghi nhận filter `/me` chưa hoạt động.

## 13. Tiêu chí nghiệm thu tài liệu

- Người mới hiểu khác nhau giữa `User`, `RenterProfile`, `Tenant`, `Contract.renterId` và `ContractMember`.
- Frontend biết chính xác header, DTO và thứ tự tạo/cập nhật/activate contract.
- Tester biết activate tạo hoặc cập nhật những bản ghi nào.
- Backend developer nhận diện được race condition, privacy gap và lifecycle gap.
- Template, file, termination, asset và handover không bị mô tả như tính năng đang dùng được.
- G05 không mô tả lại lead workflow G04, điện nước G06 hoặc hóa đơn G07.

## 14. Nguồn mã đối chiếu

- `backend/src/modules/renters/renters.controller.ts`
- `backend/src/modules/renters/renters.service.ts`
- `backend/src/modules/renters/model/renters.model.ts`
- `backend/src/modules/renters/repositories/renters.repo.ts`
- `backend/src/modules/contracts/contracts.controller.ts`
- `backend/src/modules/contracts/contracts.service.ts`
- `backend/src/modules/contracts/model/contracts.model.ts`
- `backend/src/modules/contracts/repositories/contracts.repo.ts`
- `backend/src/modules/rental-requests`
- `backend/prisma/schema.prisma`
- `backend/docs/systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md`
- `backend/docs/systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md`
