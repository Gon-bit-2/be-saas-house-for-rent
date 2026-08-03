# G04 - Đặc tả marketplace, yêu cầu thuê và lịch xem phòng

> **Snapshot 03/08/2026:** Filter self-service, renter resubmit, state machine request/appointment, partial unique request, conflict lịch 60 phút bằng advisory lock và notification moderation/lead đã được triển khai. Favorite, view log, sort/radius và các mục ngoài phạm vi vẫn là backlog. Các nhận định “chưa có” ở snapshot 31/07 trong phần phân tích lịch sử được thay thế bởi snapshot này.

## 1. Tổng quan

Tài liệu này mô tả nhóm tính năng G04 của backend: hiển thị phòng công khai, tìm kiếm phòng, xem chi tiết, đặt lịch xem phòng, gửi yêu cầu thuê và xử lý lead từ phía chủ trọ.

G04 bắt đầu khi chủ trọ gửi phòng sang `PENDING_REVIEW` và Super Admin duyệt thành `PUBLISHED`. Luồng kết thúc khi yêu cầu thuê được duyệt và phòng chuyển sang `RESERVED`, hoặc khi yêu cầu tiếp tục được chuyển thành hợp đồng theo G05.

Mục tiêu của tài liệu:

- Khách vãng lai biết cách tìm và xem phòng mà không cần đăng nhập.
- Người thuê biết điều kiện, API và trạng thái khi đặt lịch hoặc gửi yêu cầu thuê.
- Chủ trọ biết cách xem, lọc và xử lý lead trong đúng tenant.
- Frontend biết endpoint nào cần Bearer token và endpoint nào cần `x-tenant-id`.
- Tester biết các state transition và lỗi cần kiểm tra.
- Backend developer biết những giới hạn bảo mật, concurrency và hành trình còn thiếu.

### 1.1. Phạm vi

| Mảng | Chức năng |
| --- | --- |
| Marketplace public | Danh sách, tìm kiếm, lọc và xem chi tiết phòng |
| Hành động người thuê | Tạo lịch xem phòng và yêu cầu thuê |
| Self-service yêu cầu thuê | Xem danh sách của mình và hủy yêu cầu hợp lệ |
| Self-service lịch xem | Xem lịch của mình và hủy lịch hợp lệ |
| Chủ trọ xử lý yêu cầu | Danh sách, chi tiết, duyệt, từ chối, yêu cầu bổ sung |
| Chủ trọ xử lý lịch | Danh sách, xác nhận, dời, từ chối, hủy, hoàn tất, phân công staff |
| Dữ liệu mở rộng | `FavoriteRoom`, `RoomViewLog` mới có Prisma schema |

### 1.2. Ngoài phạm vi

| Chức năng | Nhóm tài liệu |
| --- | --- |
| Chủ trọ tạo phòng, tải ảnh và publish/ẩn tin | G03 |
| Hồ sơ người thuê chi tiết | G05 |
| Tạo, ký và kích hoạt hợp đồng | G05 |
| Notification engine và push/realtime | G10 |
| Dashboard marketplace và conversion analytics | G11 |
| AI recommendation | Không thuộc MVP hiện tại |

### 1.3. Trạng thái triển khai

| Nhóm | Trạng thái | Nhận định |
| --- | --- | --- |
| Danh sách/chi tiết marketplace | Đã hoạt động | Public, chỉ trả room đạt điều kiện hiện hành |
| Tìm kiếm và lọc | Đã hoạt động một phần | Có nhiều filter nhưng chưa có sort/radius và validation chéo |
| Tạo yêu cầu thuê/lịch xem | Đã hoạt động | Yêu cầu role `TENANT` và có `RenterProfile` |
| Chủ trọ xử lý request | Đã triển khai | State machine, CAS reserve và partial unique request active |
| Chủ trọ xử lý appointment | Đã triển khai | State machine, role staff và conflict room/staff 60 phút |
| Self-service người thuê | Đã triển khai | Filter `/me`, cancel và resubmit `NEED_MORE_INFO` |
| Favorite | Chỉ có schema | Chưa có API/service |
| View log | Chỉ có schema | Chưa ghi log khi xem phòng |
| Notification marketplace | Đã tích hợp | Moderation, request và appointment dùng delivery best-effort |
| Admin moderation | Đã hoạt động | Có queue, detail, history và state machine duyệt/từ chối/ẩn |

## 2. Actor, quyền truy cập và mô hình dữ liệu

### 2.1. Actor và header

| Actor | Nhóm API | Header |
| --- | --- | --- |
| Khách vãng lai | List/detail marketplace | Không cần token |
| User đã đăng nhập bất kỳ | List/detail marketplace | Token không bắt buộc vì endpoint public |
| `TENANT` | Tạo request/appointment và API `/me` | `Authorization: Bearer <accessToken>` |
| `LANDLORD`, `MANAGER` | Xử lý request/appointment | Bearer token và `x-tenant-id` |
| `ADMIN` | Dashboard kiểm duyệt marketplace | Bearer token, không cần `x-tenant-id` |

### 2.1.1. API kiểm duyệt Super Admin

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `GET` | `/marketplace/admin/rooms` | Danh sách/lọc tin toàn sàn |
| `GET` | `/marketplace/admin/rooms/:id` | Chi tiết tin, tenant và owner |
| `GET` | `/marketplace/admin/rooms/:id/history` | Lịch sử chuyển trạng thái có phân trang |
| `PATCH` | `/marketplace/admin/rooms/:id/status` | Duyệt, từ chối hoặc ẩn tin |

Chủ trọ không còn được đặt `PUBLISHED` trực tiếp. Luồng hợp lệ là `DRAFT/REJECTED/HIDDEN → PENDING_REVIEW`; Admin chuyển `PENDING_REVIEW → PUBLISHED/REJECTED` hoặc `PUBLISHED → HIDDEN`. Từ chối và ẩn bởi Admin bắt buộc có lý do. Public marketplace chỉ trả phòng thuộc property và tenant đang `ACTIVE`.

Public request:

```http
GET /marketplace/rooms
```

Renter request:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Landlord/manager request:

```http
Authorization: Bearer <accessToken>
x-tenant-id: <tenantId>
Content-Type: application/json
```

Người thuê không gửi `x-tenant-id`. Principal renter được dựng từ tài khoản và `RenterProfile`, không phải membership trong tenant của chủ trọ.

### 2.2. Quan hệ dữ liệu

```text
Tenant
└── Property
    └── Room
        ├── RoomViewingAppointment
        │   └── RentalRequest (appointmentId có thể null)
        │       └── Contract (G05)
        ├── RentalRequest
        ├── FavoriteRoom       [chỉ có schema]
        └── RoomViewLog        [chỉ có schema]
```

Các ID cần phân biệt:

| Field | Trỏ tới |
| --- | --- |
| `tenantId` | Tenant sở hữu phòng và lead |
| `roomId` | Room được xem hoặc xin thuê |
| `renterId` | `User.id` của người thuê, không phải `RenterProfile.id` |
| `appointmentId` | Lịch xem trước đó, không bắt buộc |
| `assignedStaffId` | `User.id` của staff được phân công |
| `createdById`, `updatedById` | User thực hiện thao tác |

### 2.3. Trạng thái room và marketplace

| Field | Ý nghĩa |
| --- | --- |
| `Room.status` | Trạng thái vận hành/thuê: phòng trống, giữ chỗ, đang thuê, bảo trì hoặc inactive |
| `Room.marketplaceStatus` | Trạng thái tin: nháp, chờ duyệt, công khai, từ chối hoặc ẩn |

Public marketplace hiện chỉ trả room đồng thời:

```text
Room.status = AVAILABLE
Room.marketplaceStatus = PUBLISHED
```

Khi một rental request được duyệt:

```text
Room.status = RESERVED
Room.marketplaceStatus = HIDDEN
```

### 2.4. Rental request status

| Giá trị | Ý nghĩa | Cách đạt trạng thái hiện tại |
| --- | --- | --- |
| `PENDING` | Chờ chủ trọ xử lý | Mặc định khi tạo |
| `APPROVED` | Được duyệt, phòng được giữ chỗ | Landlord/manager quyết định |
| `REJECTED` | Bị từ chối | Landlord/manager quyết định |
| `NEED_MORE_INFO` | Cần bổ sung thông tin | Landlord/manager quyết định |
| `CANCELED` | Người thuê đã hủy | Renter cancel khi còn hợp lệ |
| `CONVERTED_TO_CONTRACT` | Đã chuyển thành hợp đồng | G05 cập nhật khi kích hoạt contract |

### 2.5. Appointment status

| Giá trị | Ý nghĩa |
| --- | --- |
| `PENDING` | Chờ xác nhận |
| `CONFIRMED` | Đã xác nhận |
| `REJECTED` | Chủ trọ từ chối |
| `RESCHEDULED` | Đã dời sang thời gian mới |
| `CANCELED` | Người thuê hoặc chủ trọ hủy |
| `COMPLETED` | Đã xem phòng xong |

### 2.6. Property type

```text
HOUSE | MINI_APARTMENT | DORM | APARTMENT
```

## 3. Quy ước API

### 3.1. Phân trang

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

Mặc định:

- `page=1`
- `limit=20`
- `limit` tối đa 100

### 3.2. Validation

DTO dùng Zod strict schema:

- Field lạ bị từ chối.
- ID phải là số nguyên dương.
- Enum phải đúng chữ hoa.
- Date/datetime được `z.coerce.date()` chuyển thành `Date`.
- Chuỗi ghi chú/tin nhắn tối đa 2000 ký tự.

### 3.3. Date và timezone

Hiện tại:

- `expectedStartDate` được so sánh theo ngày sau khi đưa cả giá trị và `today` về `00:00` theo timezone của process backend.
- `scheduledAt` được so sánh timestamp trực tiếp với `Date.now()`.
- Database lưu `scheduledAt` dạng `Timestamptz`.
- `expectedStartDate` lưu dạng `Date`.

Client nên gửi ISO 8601 rõ timezone cho datetime:

```text
2026-08-15T09:00:00+07:00
```

Chính sách timezone nghiệp vụ chưa được chuẩn hóa đầy đủ và được ghi trong backlog.

## 4. API marketplace public

### 4.1. Tổng hợp endpoint

| Method | Endpoint | Auth | Response |
| --- | --- | --- | --- |
| `GET` | `/marketplace/rooms` | Public | Danh sách phòng phân trang |
| `GET` | `/marketplace/rooms/:id` | Public | Chi tiết phòng công khai |

### 4.2. Điều kiện phòng công khai

Repository áp dụng:

- `Room.deletedAt=null`.
- `Room.status=AVAILABLE`.
- `Room.marketplaceStatus=PUBLISHED`.
- Property chưa xóa mềm.
- `Property.status=ACTIVE`.

Hiện chưa có điều kiện:

```text
Room.tenant.status = ACTIVE
```

Vì vậy phòng của tenant vừa bị `SUSPENDED` hoặc `CLOSED` có thể vẫn xuất hiện nếu các điều kiện room/property còn đúng. Đây là hạn chế ưu tiên cao, không phải hành vi mong muốn.

### 4.3. `GET /marketplace/rooms`

Query:

| Field | Kiểu | Bắt buộc | Hành vi |
| --- | --- | --- | --- |
| `page` | integer | Không | Mặc định 1 |
| `limit` | integer | Không | Mặc định 20, tối đa 100 |
| `search` | string | Không | Tìm title, roomCode, description, property name/address |
| `province` | string | Không | Tìm gần đúng, không phân biệt hoa thường |
| `district` | string | Không | Tìm gần đúng |
| `ward` | string | Không | Tìm gần đúng |
| `propertyType` | enum | Không | Lọc loại property |
| `minPrice` | number | Không | `basePrice >= minPrice` |
| `maxPrice` | number | Không | `basePrice <= maxPrice` |
| `minArea` | number | Không | `area >= minArea` |
| `maxArea` | number | Không | `area <= maxArea` |
| `maxOccupants` | integer | Không | Room có `maxOccupants >=` giá trị yêu cầu |
| `amenityIds` | CSV hoặc number[] | Không | Room phải có tất cả tiện ích |

Tên `maxOccupants` trong query dễ gây nhầm. Semantics thực tế là số người cần ở tối thiểu mà sức chứa của room phải đáp ứng.

Ví dụ:

```http
GET /marketplace/rooms?province=Hà%20Nội&district=Cầu%20Giấy&minPrice=2500000&maxPrice=5000000&maxOccupants=2&amenityIds=1,3,8
```

Khi `amenityIds=1,3,8`, backend tạo ba điều kiện AND. Room chỉ đạt nếu có cả ba tiện ích.

Chuỗi amenity được:

1. Tách bằng dấu phẩy.
2. Trim.
3. Chuyển thành số.
4. Bỏ giá trị không phải số nguyên dương.
5. Loại ID trùng.

Hiện giá trị sai bị bỏ âm thầm. Ví dụ `amenityIds=1,abc,3` được hiểu như `1,3`.

Thứ tự kết quả cố định:

1. `publishedAt` giảm dần.
2. `createdAt` giảm dần.

Chưa có query sort theo giá hoặc diện tích.

Response mỗi room gồm:

- ID và các field giá/diện tích/sức chứa.
- Trạng thái room và marketplace.
- Property, địa chỉ chi tiết, latitude, longitude.
- Floor, nếu có.
- Danh sách ảnh, thumbnail trước rồi theo `sortOrder`.
- Danh sách tiện ích.

### 4.4. `GET /marketplace/rooms/:id`

Chỉ trả room còn thỏa toàn bộ điều kiện public tại thời điểm gọi.

Nếu room:

- Không tồn tại.
- Đã xóa mềm.
- Không còn `AVAILABLE`.
- Không còn `PUBLISHED`.
- Property không active hoặc đã xóa.

Backend trả:

```text
Không tìm thấy phòng đang hiển thị trên marketplace
```

Response không tiết lộ room đang tồn tại nhưng không được public.

Response hiện có thể chứa:

- Địa chỉ chi tiết.
- Tọa độ.
- Giá thuê, tiền cọc, giá điện, giá nước.
- `tenantId`, `propertyId`, `floorId`, `roomCode`.

Mức độ công khai của các field này chưa có privacy policy riêng.

## 5. API người thuê tạo hành động marketplace

Các API phần này:

- Cần Bearer token.
- Yêu cầu role `TENANT`.
- Không cần `x-tenant-id`.
- User phải có `RenterProfile`.

### 5.1. Tổng hợp endpoint

| Method | Endpoint | Body | Response |
| --- | --- | --- | --- |
| `POST` | `/marketplace/rooms/:id/rental-requests` | Ngày dọn vào, message, appointment | Rental request |
| `POST` | `/marketplace/rooms/:id/viewing-appointments` | Thời gian và note | Appointment |

### 5.2. Điều kiện chung

Trước khi tạo, backend:

1. Tìm room qua điều kiện public.
2. Kiểm user có `RenterProfile`.
3. Lấy `tenantId` trực tiếp từ room; client không gửi tenant ID.

Backend hiện chỉ kiểm profile tồn tại. `verificationStatus` của profile chưa được kiểm.

### 5.3. Tạo rental request

Endpoint:

```http
POST /marketplace/rooms/:id/rental-requests
```

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `expectedStartDate` | date | Có | Không trước ngày hiện tại |
| `message` | string/null | Không | Tối đa 2000 ký tự |
| `appointmentId` | integer/null | Không | Phải thuộc cùng renter và room |

Ví dụ:

```json
{
  "expectedStartDate": "2026-09-01",
  "message": "Tôi muốn thuê lâu dài, dự kiến ở hai người.",
  "appointmentId": 350
}
```

Backend xử lý:

1. Kiểm room còn public/available.
2. Kiểm renter profile.
3. So sánh ngày dự kiến với ngày hiện tại.
4. Tìm request đang hoạt động trùng renter/room.
5. Nếu có appointment ID, kiểm appointment thuộc renter và room.
6. Tạo request:
   - `tenantId` từ room.
   - `renterId` từ access token.
   - `status=PENDING`.
   - `createdById=renterId`.

Trạng thái được coi là request đang xử lý trùng:

```text
PENDING | NEED_MORE_INFO | APPROVED
```

Nếu trùng:

```text
Bạn đã có yêu cầu thuê đang xử lý cho phòng này
```

Appointment liên kết hiện chỉ được kiểm:

- Đúng ID.
- Đúng renter.
- Đúng room.

Backend chưa kiểm appointment đang `COMPLETED`, `CONFIRMED` hay đã `CANCELED`/`REJECTED`.

### 5.4. Tạo viewing appointment

Endpoint:

```http
POST /marketplace/rooms/:id/viewing-appointments
```

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `scheduledAt` | datetime | Có | Phải lớn hơn thời điểm hiện tại |
| `note` | string/null | Không | Tối đa 2000 ký tự |

Ví dụ:

```json
{
  "scheduledAt": "2026-08-15T09:00:00+07:00",
  "note": "Tôi có thể đến sớm hơn khoảng 10 phút."
}
```

Appointment mới:

- Có `status=PENDING`.
- Chưa có assigned staff.
- Chưa có landlord note.
- Gắn tenant từ room.

Hiện không kiểm:

- Renter đã có appointment trùng room/thời gian hay chưa.
- Staff/property có khung giờ làm việc hay không.
- Số lượng lịch tối đa trong một slot.

## 6. API yêu cầu thuê của người thuê

### 6.1. Tổng hợp endpoint

| Method | Endpoint | Body | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/rental-requests/me` | Không | Xem danh sách request của mình |
| `PATCH` | `/rental-requests/me/:id/cancel` | `{}` | Hủy request hợp lệ |

### 6.2. `GET /rental-requests/me`

DTO nhận:

| Field | Kiểu |
| --- | --- |
| `page`, `limit` | Phân trang |
| `status` | Rental request status |
| `roomId` | Room ID |
| `propertyId` | Property ID |
| `search` | Chuỗi tìm kiếm |

**Hành vi hiện tại:** service chỉ dùng `page` và `limit`. `status`, `roomId`, `propertyId`, `search` được DTO parse nhưng không truyền xuống repository.

Repository chỉ lọc:

```text
renterId = user hiện tại
```

Kết quả sắp `createdAt` giảm dần.

Response gồm:

- Thông tin request.
- Renter.
- Room và property rút gọn.
- Appointment rút gọn nếu được liên kết.

### 6.3. `PATCH /rental-requests/me/:id/cancel`

Body bắt buộc là JSON object rỗng:

```json
{}
```

Renter chỉ hủy được:

```text
PENDING | NEED_MORE_INFO
```

Không hủy được:

```text
APPROVED | REJECTED | CANCELED | CONVERTED_TO_CONTRACT
```

Nếu request không thuộc user hiện tại:

```text
Không tìm thấy yêu cầu thuê của bạn
```

Nếu status không hợp lệ:

```text
Chỉ có thể hủy yêu cầu đang chờ hoặc cần bổ sung thông tin
```

Hủy request chỉ đổi status thành `CANCELED`, không xóa dữ liệu.

## 7. API yêu cầu thuê phía chủ trọ

Các endpoint:

- Yêu cầu Bearer token.
- Yêu cầu `LANDLORD` hoặc `MANAGER`.
- Yêu cầu `x-tenant-id`.
- Chỉ truy cập request có `tenantId` bằng tenant context.

### 7.1. Tổng hợp endpoint

| Method | Endpoint | Request | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/rental-requests` | Query filter | Danh sách lead trong tenant |
| `GET` | `/rental-requests/:id` | ID | Chi tiết lead |
| `PATCH` | `/rental-requests/:id/decision` | `status` | Duyệt/từ chối/yêu cầu bổ sung |

### 7.2. `GET /rental-requests`

Query:

| Field | Hành vi |
| --- | --- |
| `page`, `limit` | Phân trang |
| `status` | Lọc request status |
| `roomId` | Lọc room |
| `propertyId` | Lọc property qua room |
| `search` | Tìm renter name/email/phone và room code/title |

Backend luôn thêm `tenantId` từ tenant context.

Kết quả sắp `createdAt` mới nhất trước.

Response gồm:

- Request và trạng thái.
- Renter profile verification status.
- Room/property rút gọn.
- Appointment rút gọn.

### 7.3. `GET /rental-requests/:id`

Trả request thuộc tenant hiện tại.

Request tenant khác cũng được trả như không tìm thấy:

```text
Không tìm thấy yêu cầu thuê
```

### 7.4. `PATCH /rental-requests/:id/decision`

Body:

```json
{
  "status": "APPROVED"
}
```

Decision API chỉ nhận:

```text
APPROVED | REJECTED | NEED_MORE_INFO
```

Request hiện tại phải là:

```text
PENDING | NEED_MORE_INFO
```

Nếu không:

```text
Chỉ xử lý được yêu cầu đang chờ hoặc cần bổ sung thông tin
```

#### Duyệt request

1. Service đọc request và room.
2. Room phải `AVAILABLE`.
3. Repository mở transaction.
4. Cập nhật request thành `APPROVED`.
5. Đọc `roomId`.
6. Cập nhật room thành:

```text
status = RESERVED
marketplaceStatus = HIDDEN
```

7. Trả request sau cập nhật.

Nếu room không còn trống:

```text
Phòng không còn trống để duyệt yêu cầu thuê
```

#### Từ chối hoặc yêu cầu bổ sung

Với `REJECTED` hoặc `NEED_MORE_INFO`, backend chỉ cập nhật request status và `updatedById`; room không thay đổi.

#### Chuyển thành hợp đồng

G04 không có decision `CONVERTED_TO_CONTRACT`. G05 cập nhật trạng thái này khi contract gắn request được kích hoạt.

## 8. API lịch xem của người thuê

### 8.1. Tổng hợp endpoint

| Method | Endpoint | Body | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/room-viewing-appointments/me` | Không | Xem lịch của mình |
| `PATCH` | `/room-viewing-appointments/me/:id/cancel` | `{}` | Hủy lịch hợp lệ |

### 8.2. `GET /room-viewing-appointments/me`

DTO nhận:

- `page`, `limit`.
- `status`.
- `roomId`.
- `propertyId`.
- `from`, `to`.

**Hành vi hiện tại:** service chỉ áp dụng `page` và `limit`; các filter còn lại bị bỏ qua.

Repository lọc theo `renterId` và sắp `scheduledAt` giảm dần.

Response hiện dùng cùng select với phía landlord, gồm:

- Renter.
- Assigned staff với full name, email, phone.
- Room/property.
- `note`.
- `landlordNote`.
- Status và timestamps.

`landlordNote` được schema mô tả là ghi chú riêng của chủ trọ/nhân viên nhưng hiện vẫn được trả cho renter. Đây là privacy gap ưu tiên cao.

### 8.3. `PATCH /room-viewing-appointments/me/:id/cancel`

Body:

```json
{}
```

Cho phép hủy:

```text
PENDING | CONFIRMED | RESCHEDULED
```

Không cho hủy:

```text
REJECTED | CANCELED | COMPLETED
```

Nếu lịch không thuộc renter:

```text
Không tìm thấy lịch hẹn của bạn
```

Nếu status không hợp lệ:

```text
Không thể hủy lịch hẹn ở trạng thái hiện tại
```

## 9. API lịch xem phía chủ trọ

### 9.1. Tổng hợp endpoint

| Method | Endpoint | Request | Mục đích |
| --- | --- | --- | --- |
| `GET` | `/room-viewing-appointments` | Query filter | Danh sách lịch trong tenant |
| `PATCH` | `/room-viewing-appointments/:id/status` | Status và metadata | Xử lý lịch |

Hiện không có `GET /room-viewing-appointments/:id`.

### 9.2. `GET /room-viewing-appointments`

Query:

| Field | Hành vi |
| --- | --- |
| `page`, `limit` | Phân trang |
| `status` | Lọc appointment status |
| `roomId` | Lọc room |
| `propertyId` | Lọc property |
| `from` | `scheduledAt >= from` |
| `to` | `scheduledAt <= to` |

Backend thêm `tenantId` từ tenant context.

Kết quả sắp:

1. `scheduledAt` tăng dần.
2. `createdAt` giảm dần nếu cùng thời gian.

### 9.3. `PATCH /room-viewing-appointments/:id/status`

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `status` | enum | Có | Không nhận `PENDING` |
| `scheduledAt` | datetime | Không | Nếu gửi phải ở tương lai |
| `assignedStaffId` | integer/null | Không | User phải là active member trong tenant |
| `landlordNote` | string/null | Không | Tối đa 2000 ký tự |

Status cho phép:

```text
CONFIRMED | REJECTED | RESCHEDULED | CANCELED | COMPLETED
```

Quy tắc:

- `RESCHEDULED` bắt buộc gửi `scheduledAt`.
- `scheduledAt` gửi với status khác vẫn được cập nhật nếu ở tương lai.
- `assignedStaffId=null` bỏ phân công.
- `landlordNote=null` xóa ghi chú.
- Backend ghi `updatedById`.

Nếu dời lịch mà thiếu thời gian:

```text
Cần cung cấp thời gian mới khi dời lịch hẹn
```

Nếu thời gian không ở tương lai:

```text
Thời gian hẹn xem phòng phải ở tương lai
```

Nếu staff không phải active tenant member:

```text
Nhân viên được phân công không thuộc tenant hiện tại
```

Backend hiện không kiểm trạng thái cũ. Ví dụ appointment `COMPLETED` về mặt kỹ thuật vẫn có thể chuyển thành `CONFIRMED` nếu gọi API với body hợp lệ.

## 10. Luồng nghiệp vụ hoàn chỉnh

### 10.1. Khách tìm phòng

1. Gọi `GET /marketplace/rooms`.
2. Backend chỉ lấy room `AVAILABLE/PUBLISHED` thuộc property active.
3. Backend áp dụng filter và phân trang.
4. Khách chọn room và gọi detail.

Kết quả: không cần tài khoản hoặc tenant header.

### 10.2. Người thuê đặt lịch xem

Điều kiện:

- Đã đăng nhập role `TENANT`.
- Có `RenterProfile`.
- Room còn public.
- Thời gian ở tương lai.

Kết quả: appointment `PENDING`.

### 10.3. Chủ trọ xác nhận và phân công

1. Gọi list appointment với `x-tenant-id`.
2. Chọn appointment.
3. Gọi update status `CONFIRMED`.
4. Có thể gửi `assignedStaffId` và `landlordNote`.

Backend kiểm staff active trong tenant nhưng chưa kiểm role staff.

### 10.4. Chủ trọ dời lịch

Body:

```json
{
  "status": "RESCHEDULED",
  "scheduledAt": "2026-08-16T14:00:00+07:00",
  "assignedStaffId": 72,
  "landlordNote": "Khách đã đồng ý qua điện thoại."
}
```

Backend yêu cầu thời gian mới ở tương lai.

### 10.5. Người thuê tạo request độc lập

Không gửi `appointmentId`. Request được tạo `PENDING` nếu không có request trùng đang xử lý.

### 10.6. Người thuê tạo request sau lịch xem

Gửi `appointmentId`. Backend kiểm appointment thuộc đúng renter và room, nhưng chưa kiểm appointment status.

### 10.7. Chủ trọ yêu cầu bổ sung

1. Gọi decision với `NEED_MORE_INFO`.
2. Request chuyển status.
3. Room vẫn available/public.

Hiện renter chưa có API sửa message/ngày và gửi lại, nên luồng này chưa hoàn chỉnh.

### 10.8. Chủ trọ duyệt request

1. Request phải đang `PENDING` hoặc `NEED_MORE_INFO`.
2. Room phải `AVAILABLE`.
3. Transaction duyệt request.
4. Room chuyển `RESERVED`.
5. Marketplace chuyển `HIDDEN`.

### 10.9. Chuyển sang hợp đồng

1. G05 tạo draft contract từ request `APPROVED`.
2. Khi contract được kích hoạt, repository hợp đồng cập nhật request thành `CONVERTED_TO_CONTRACT`.
3. Room chuyển từ `RESERVED` sang `OCCUPIED` theo nghiệp vụ hợp đồng.

## 11. Ví dụ sử dụng

### 11.1. Tìm phòng

```bash
curl "http://localhost:3000/marketplace/rooms?district=Cầu%20Giấy&minPrice=2500000&maxPrice=5000000&maxOccupants=2&amenityIds=1,3"
```

### 11.2. Xem chi tiết

```bash
curl "http://localhost:3000/marketplace/rooms/205"
```

### 11.3. Tạo lịch xem

```bash
curl -X POST "http://localhost:3000/marketplace/rooms/205/viewing-appointments" \
  -H "Authorization: Bearer <renterAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledAt": "2026-08-15T09:00:00+07:00",
    "note": "Tôi muốn xem phòng và khu để xe."
  }'
```

### 11.4. Tạo rental request có appointment

```bash
curl -X POST "http://localhost:3000/marketplace/rooms/205/rental-requests" \
  -H "Authorization: Bearer <renterAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "expectedStartDate": "2026-09-01",
    "message": "Tôi muốn thuê lâu dài.",
    "appointmentId": 350
  }'
```

### 11.5. Xem request của mình

```bash
curl "http://localhost:3000/rental-requests/me?page=1&limit=20" \
  -H "Authorization: Bearer <renterAccessToken>"
```

### 11.6. Người thuê hủy request

```bash
curl -X PATCH "http://localhost:3000/rental-requests/me/410/cancel" \
  -H "Authorization: Bearer <renterAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 11.7. Chủ trọ duyệt request

```bash
curl -X PATCH "http://localhost:3000/rental-requests/410/decision" \
  -H "Authorization: Bearer <landlordAccessToken>" \
  -H "x-tenant-id: 12" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED"
  }'
```

### 11.8. Chủ trọ dời lịch và phân công staff

```bash
curl -X PATCH "http://localhost:3000/room-viewing-appointments/350/status" \
  -H "Authorization: Bearer <landlordAccessToken>" \
  -H "x-tenant-id: 12" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "RESCHEDULED",
    "scheduledAt": "2026-08-16T14:00:00+07:00",
    "assignedStaffId": 72,
    "landlordNote": "Đã xác nhận lại với khách."
  }'
```

## 12. Quy tắc lỗi

| Tình huống | Loại lỗi | Thông báo/hành vi |
| --- | --- | --- |
| Public room không còn hợp lệ | `NotFound` | Không tìm thấy phòng đang hiển thị |
| Renter thiếu token/sai role | `Unauthorized`/`Forbidden` | Không qua guard |
| Chưa có renter profile | `BadRequest` | `Tài khoản chưa có hồ sơ người thuê` |
| Ngày dọn vào quá khứ | `BadRequest` | Ngày dự kiến không được ở quá khứ |
| Thời gian xem không tương lai | `BadRequest` | Thời gian hẹn phải ở tương lai |
| Request trùng đang xử lý | `Conflict` | Đã có yêu cầu đang xử lý |
| Appointment liên kết sai | `BadRequest` | Lịch hẹn không hợp lệ cho phòng |
| Request không thuộc renter | `NotFound` | Không tìm thấy yêu cầu của bạn |
| Appointment không thuộc renter | `NotFound` | Không tìm thấy lịch hẹn của bạn |
| Request ngoài tenant | `NotFound` | Không tìm thấy yêu cầu thuê |
| Appointment ngoài tenant | `NotFound` | Không tìm thấy lịch hẹn xem phòng |
| Request không còn xử lý được | `BadRequest` | Chỉ xử lý request chờ/cần bổ sung |
| Room không còn trống | `BadRequest` | Không thể duyệt |
| Reschedule thiếu thời gian | `BadRequest` | Cần cung cấp thời gian mới |
| Staff ngoài tenant | `BadRequest` | Nhân viên không thuộc tenant |
| Thiếu tenant header | `Forbidden`/auth context error | Theo G01 |
| Body/query sai | `BadRequest` | Zod validation |

## 13. Chức năng chưa hoàn thiện và hướng triển khai

> Mọi đề xuất trong chương này đều **chưa tồn tại** nếu không được nêu rõ là hành vi hiện tại. Không dùng chúng như API contract hiện hành.

### 13.1. Bảo mật và toàn vẹn dữ liệu

| # | Hiện trạng | Ảnh hưởng | Hướng triển khai | Dependency | Tiêu chí hoàn thành |
| ---: | --- | --- | --- | --- | --- |
| 1 | Public query chưa lọc tenant `ACTIVE` | Tenant bị đình chỉ vẫn có thể hiện phòng | Thêm relation filter tenant active vào list/detail | Marketplace repository, tenant status | Room của tenant suspended/closed biến mất ngay |
| 2 | Renter appointment response có `landlordNote` và PII staff | Lộ ghi chú nội bộ/email/phone | Tách renter select và landlord select; chỉ trả field public | Repository/DTO response | Renter không nhận internal note hoặc PII ngoài policy |
| 3 | Check room available xảy ra trước transaction duyệt | Hai request có thể cùng được approve | Conditional update/locking trong transaction | PostgreSQL transaction | Concurrent approve chỉ một request thắng |
| 4 | Approve không xử lý request khác cùng room | Lead khác vẫn pending khi room reserved | Trong cùng transaction reject/close request cạnh tranh | State policy, notification | Không còn active request mâu thuẫn |
| 5 | Request approved không có cancel/release | Room có thể bị kẹt `RESERVED` | Thêm state transition có lý do và release room có điều kiện | G03 room, G05 contract | Hủy approved request trả room về trạng thái đúng |
| 6 | Duplicate request dùng check-then-create | Concurrent create có thể tạo trùng | Constraint/locking hoặc idempotency key | Prisma migration | Hai request đồng thời chỉ tạo một lead active |
| 7 | Chưa chứng minh rate limit/action chống spam | Có thể spam request/appointment và public search | Rate limit theo IP/user/room, cooldown và monitoring | Auth/rate limiter | Request vượt ngưỡng bị chặn bằng error rõ ràng |

### 13.2. State machine và hành trình người dùng

| # | Hiện trạng | Ảnh hưởng | Hướng triển khai | Dependency | Tiêu chí hoàn thành |
| ---: | --- | --- | --- | --- | --- |
| 8 | Appointment không kiểm status cũ | Terminal state có thể chuyển ngược | Định nghĩa transition matrix | Service và tests | Mọi transition ngoài matrix bị từ chối |
| 9 | `NEED_MORE_INFO` không có renter update/resubmit | Hành trình bị bế tắc | API renter sửa message/date và submit lại | Rental request DTO/service | Renter bổ sung rồi request về `PENDING` |
| 10 | Link appointment không kiểm status | Có thể link lịch canceled/rejected | Chỉ nhận status được business chấp nhận | Marketplace service | Appointment sai status bị từ chối |
| 11 | Không kiểm lịch trùng/slot/staff conflict | Đặt trùng thời gian | Conflict query và chính sách slot/business hours | Appointment repository | Không tạo/phân công lịch xung đột |
| 12 | Staff chỉ cần active membership | Có thể phân công role không phù hợp | Giới hạn role/permission được dẫn khách | G01 RBAC, staff management | Chỉ role cho phép được phân công |
| 13 | Renter không có detail request/appointment | Phải tìm trong list phân trang | Bổ sung detail self-service an toàn | Controller/service | Chỉ owner xem được detail |
| 14 | Landlord không có appointment detail | UI phải lấy từ list | Bổ sung detail tenant-scoped | Tenant isolation | Appointment ngoài tenant trả NotFound |
| 15 | Muốn đổi staff/note phải gửi status | Dễ vô tình đổi trạng thái | Tách partial metadata update hoặc thiết kế DTO rõ | API compatibility | Update staff/note không đổi status |
| 16 | Chỉ kiểm RenterProfile tồn tại | Profile rejected vẫn tạo lead | Chốt policy verification theo sản phẩm | G05 renter profile | Status không đủ điều kiện bị chặn rõ ràng |

### 13.3. Truy vấn và dữ liệu marketplace

| # | Hiện trạng | Ảnh hưởng | Hướng triển khai | Dependency | Tiêu chí hoàn thành |
| ---: | --- | --- | --- | --- | --- |
| 17 | Filter rental request `/me` bị bỏ qua | UI filter trả sai dữ liệu | Xây where theo renter + query | Service/repository | Mọi filter DTO có hiệu lực |
| 18 | Filter appointment `/me` bị bỏ qua | Lọc status/date không hoạt động | Xây where theo renter + query | Service/repository | Status/room/property/from/to đúng |
| 19 | Không validate min/max và from/to | Query nghịch lý trả rỗng khó hiểu | Zod refine validation chéo | DTO | `min > max`, `from > to` bị từ chối |
| 20 | Amenity ID sai bị loại âm thầm | Lỗi client bị che giấu | Strict CSV parser và validation error | Marketplace DTO | Token sai trả lỗi rõ |
| 21 | Chưa có sort/radius | Trải nghiệm tìm kiếm hạn chế | Sort allowlist, geospatial/radius nếu cần | Query/index | Sort ổn định và có test |
| 22 | Timezone chưa chuẩn hóa | Sai ngày/giờ giữa môi trường | Quy định UTC wire format và business timezone | Config/date utility | Test timezone và DST nếu áp dụng |
| 23 | Có thể xóa hết ảnh sau publish | Public room không có ảnh | Khi xóa ảnh cuối, ẩn tin hoặc chặn xóa | G03 images | Public room luôn có ảnh |
| 24 | Amenity inactive vẫn liên kết/hiển thị | Filter và UI dùng tiện ích đã tắt | Lọc active hoặc cleanup relation theo policy | G03 amenity | Marketplace chỉ dùng amenity hợp lệ |
| 25 | Công khai exact address/toạ độ chưa có policy | Rủi ro privacy/an toàn | Chốt field public list/detail và masking | Product/privacy | Response đúng policy, có contract test |

### 13.4. Tính năng chỉ có schema hoặc chưa triển khai

| # | Hiện trạng | Ảnh hưởng | Hướng triển khai | Dependency | Tiêu chí hoàn thành |
| ---: | --- | --- | --- | --- | --- |
| 26 | `FavoriteRoom` chỉ có schema | Không lưu danh sách yêu thích | API add/remove/list idempotent | Auth, marketplace visibility | User chỉ quản lý favorite của mình |
| 27 | `RoomViewLog` chỉ có schema | Không có dữ liệu lượt xem | Ghi log detail view với privacy/retention | Optional auth, IP/user-agent policy | View được ghi không chặn response chính |
| 28 | Không có conversion analytics | Không đo view → contract | Event/funnel aggregation | View log, appointments, requests, G05 | Dashboard có số liệu kiểm chứng |
| 29 | Không có notification marketplace | Hai bên không biết lead thay đổi | Emit event create/decision/cancel/reschedule | G10 notification | Đúng recipient, idempotent, không lộ tenant |
| 30 | Không có admin marketplace API | FR-28 chưa hoàn chỉnh | Admin list/detail/filter theo platform | G02/G11 admin | Admin xem được public/review data |
| 31 | `PENDING_REVIEW`, `REJECTED` chưa có workflow | Status schema không có hành vi | Moderation state machine và reviewer/audit | Admin marketplace | Publish/reject có rule và history |
| 32 | Không có contact workflow riêng | Chỉ có request/appointment | Chốt có cần contact masking/chat/call lead | Product, privacy | Contact không lộ ngoài policy |

### 13.5. Audit, hiệu năng và kiểm thử

| # | Hiện trạng | Ảnh hưởng | Hướng triển khai | Dependency | Tiêu chí hoàn thành |
| ---: | --- | --- | --- | --- | --- |
| 33 | Chỉ lưu status hiện tại | Không truy vết transition | Status history/event log với actor/reason/time | Audit module | Xem được toàn bộ timeline |
| 34 | Có `deletedById` nhưng không `deletedAt`/delete API | Audit field chưa có lifecycle rõ | Chọn status-only hoặc soft-delete đầy đủ | Data retention policy | Schema/API nhất quán |
| 35 | Chưa có PostgreSQL integration test | Mock không chứng minh transaction/isolation | Test DB thật cho repositories/guards | Test infrastructure | Race và tenant A/B được kiểm |
| 36 | Chưa benchmark dữ liệu lớn | Chưa biết độ trễ search | Seed data, EXPLAIN ANALYZE và load test | PostgreSQL | Đạt SLA được chốt |
| 37 | Index cho lead/view/amenity chưa được đánh giá | List/filter có thể chậm | Index theo query thực tế | Migration/performance test | Query plan dùng index phù hợp |
| 38 | Chưa có E2E xuyên G03-G05 | Chưa chứng minh hành trình hoàn chỉnh | E2E publish → view → appointment/request → approve → contract | Modules G03/G04/G05 | Journey chạy qua HTTP và DB thật |

## 14. Thứ tự ưu tiên backlog

| Ưu tiên | Hạng mục |
| ---: | --- |
| 1 | Tenant active filter, tách response PII và concurrency khi approve |
| 2 | State machine, xử lý request cạnh tranh và release reservation |
| 3 | Sửa filter `/me` và hoàn thiện `NEED_MORE_INFO` |
| 4 | Notification, appointment conflict và rate limiting |
| 5 | Favorite, view log và conversion analytics |
| 6 | Admin moderation, audit history và tối ưu hiệu năng |

Không nên triển khai analytics trước khi sửa privacy của view log và tính đúng đắn của approve flow.

## 15. Checklist kiểm thử

### 15.1. Marketplace public

- [ ] List/detail không cần token.
- [ ] Chỉ trả room `AVAILABLE/PUBLISHED`, chưa xóa, property active.
- [ ] Room không còn public trả NotFound ở detail.
- [ ] Search title, code, property name/address hoạt động.
- [ ] Filter khu vực, loại property, giá, diện tích và sức chứa đúng.
- [ ] Nhiều amenity dùng semantics AND.
- [ ] Phân trang và thứ tự publish đúng.

### 15.2. Renter tạo lead

- [ ] Sai role hoặc thiếu token bị từ chối.
- [ ] Thiếu profile bị từ chối.
- [ ] Profile tồn tại tạo appointment/request thành công.
- [ ] Ngày dọn vào hôm nay được chấp nhận.
- [ ] Ngày trước hôm nay bị từ chối.
- [ ] Appointment ở hiện tại/quá khứ bị từ chối.
- [ ] Request trùng active bị từ chối.
- [ ] Appointment không cùng renter/room bị từ chối.

### 15.3. Self-service

- [ ] Renter chỉ thấy request/appointment của mình.
- [ ] Request `PENDING`/`NEED_MORE_INFO` hủy được.
- [ ] Request status khác không hủy được.
- [ ] Appointment `PENDING`/`CONFIRMED`/`RESCHEDULED` hủy được.
- [ ] Appointment terminal không hủy được.
- [ ] Body cancel khác `{}` bị strict validation từ chối.
- [ ] Ghi nhận hiện tại filter `/me` chưa hoạt động để tránh test kỳ vọng sai.

### 15.4. Landlord/manager

- [ ] Thiếu hoặc sai `x-tenant-id` bị từ chối.
- [ ] Không xem/xử lý request/appointment tenant khác.
- [ ] List request áp dụng status/room/property/search.
- [ ] List appointment áp dụng status/room/property/date.
- [ ] Chỉ quyết định request `PENDING`/`NEED_MORE_INFO`.
- [ ] Approve room available làm request approved và room reserved/hidden.
- [ ] Approve room không available bị từ chối.
- [ ] Reschedule thiếu thời gian bị từ chối.
- [ ] Thời gian mới không tương lai bị từ chối.
- [ ] Staff ngoài tenant bị từ chối.
- [ ] `assignedStaffId=null` bỏ phân công.
- [ ] `landlordNote=null` xóa ghi chú.

### 15.5. Phần chưa hoàn thiện

- [ ] Tài liệu không mô tả favorite/view log như API đang hoạt động.
- [ ] Notification và admin moderation được ghi rõ chưa tồn tại.
- [ ] Privacy gap `landlordNote` được nêu rõ.
- [ ] Tenant status gap và approval race được đánh dấu ưu tiên cao.
- [ ] API tương lai không xuất hiện trong bảng API hiện hành.

## 16. Tiêu chí nghiệm thu tài liệu

Tài liệu đạt yêu cầu khi:

- Khách vãng lai biết cách tìm và xem phòng.
- Renter biết cần token/profile, body cần gửi và khi nào được hủy.
- Landlord biết header tenant, filter, decision và hệ quả lên room.
- Frontend phân biệt được request status, appointment status và room status.
- Tester có case cho public visibility, tenant isolation và state transition.
- Backend developer nhìn thấy các race condition, privacy gap và flow bị thiếu.
- Người lập kế hoạch có backlog rõ thứ tự, dependency và tiêu chí hoàn thành.
- G03 publish, G04 lead workflow và G05 contract không bị trộn phạm vi.

## 17. Nguồn mã đối chiếu

Tài liệu ưu tiên trạng thái implementation hiện tại:

- `backend/src/modules/marketplace/marketplace.controller.ts`
- `backend/src/modules/marketplace/marketplace.service.ts`
- `backend/src/modules/marketplace/model/marketplace.model.ts`
- `backend/src/modules/marketplace/repositories/marketplace.repo.ts`
- `backend/src/modules/rental-requests/rental-requests.controller.ts`
- `backend/src/modules/rental-requests/rental-requests.service.ts`
- `backend/src/modules/rental-requests/viewing-appointments.controller.ts`
- `backend/src/modules/rental-requests/viewing-appointments.service.ts`
- `backend/src/modules/rental-requests/model/rental-requests.model.ts`
- `backend/src/modules/rental-requests/repositories/rental-requests.repo.ts`
- `backend/src/modules/contracts/repositories/contracts.repo.ts`
- `backend/src/modules/notifications/notification-events.service.ts`
- `backend/src/shared/modules/services/tenant-access.service.ts`
- `backend/prisma/schema.prisma`
- `backend/docs/systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md`
- `backend/docs/systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md`

Nếu báo cáo tiến độ cũ mâu thuẫn với controller, service, repository hoặc schema hiện tại, tài liệu này lấy mã nguồn hiện tại làm nguồn sự thật.
