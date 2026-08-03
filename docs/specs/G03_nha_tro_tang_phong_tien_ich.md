# G03 - Đặc tả nhà trọ, tầng, phòng và tiện ích

> **Snapshot 31/07/2026:** CRUD property/floor/room/image/amenity, soft-delete và state marketplace đã có API. Luồng submit/moderation tin nằm giữa G03–G04; upload ảnh cần Cloudinary thật để nghiệm thu integration.

## 1. Tổng quan

Tài liệu này mô tả nhóm tính năng G03 của backend: quản lý nhà trọ, tầng, phòng, ảnh phòng, tiện ích của phòng, trạng thái vận hành và trạng thái đăng tin của phòng. Mục tiêu là để người đọc biết API nào cần gọi, dữ liệu nào phải gửi, backend kiểm tra những gì và các bản ghi liên hệ với nhau như thế nào.

G03 quản lý nguồn cung phòng từ phía chủ trọ. Một quy trình điển hình là:

1. Chủ trọ tạo nhà trọ.
2. Chủ trọ tạo các tầng thuộc nhà trọ, nếu mô hình nhà có chia tầng.
3. Chủ trọ tạo phòng và gán phòng vào nhà trọ/tầng.
4. Chủ trọ gán tiện ích và tải ảnh phòng.
5. Khi phòng đủ điều kiện, chủ trọ chuyển tin phòng sang `PUBLISHED`.
6. Khi phòng không còn trống, backend tự ẩn phòng khỏi marketplace khi trạng thái phòng được cập nhật.

### 1.1. Phạm vi G03

| Mảng | Chức năng |
| --- | --- |
| Nhà trọ | Xem danh sách, xem chi tiết, tạo, cập nhật, đổi trạng thái, xóa mềm |
| Tầng | Xem danh sách theo nhà trọ, tạo, cập nhật, xóa |
| Phòng | Xem danh sách, xem chi tiết, tạo, cập nhật, đổi trạng thái, xóa mềm |
| Marketplace phía chủ trọ | Chuyển tin phòng sang `DRAFT`, `HIDDEN` hoặc `PUBLISHED` |
| Tiện ích phòng | Xem danh mục tiện ích và thay thế toàn bộ tiện ích được gán cho phòng |
| Ảnh phòng | Tải nhiều ảnh, sửa metadata, chọn thumbnail, xóa ảnh |
| Danh mục tiện ích | `ADMIN` tạo/cập nhật; `LANDLORD`, `MANAGER` tra cứu tiện ích đang hoạt động |
| Cô lập tenant | Chỉ đọc và sửa dữ liệu thuộc tenant hiện tại |

### 1.2. Ngoài phạm vi

| Chức năng | Nhóm phụ trách |
| --- | --- |
| Danh sách phòng công khai, tìm kiếm phòng, yêu thích, lịch xem phòng, yêu cầu thuê | G04 |
| Người thuê, hợp đồng, lịch sử thuê, bàn giao phòng | G05 |
| Đồng hồ và chỉ số điện nước | G06 |
| Hóa đơn, công nợ, thanh toán | G07, G08 |
| Tài sản trong phòng | Nhóm nghiệp vụ tài sản riêng |
| Cơ chế đăng nhập, JWT, RBAC và cách dựng tenant context | G01 |

G03 chỉ mô tả thao tác quản lý tin phòng từ phía chủ trọ. Việc người tìm phòng xem hoặc tương tác với tin đã đăng không thuộc tài liệu này.

## 2. Actor, thuật ngữ và mô hình dữ liệu

### 2.1. Actor

| Actor | Phạm vi sử dụng |
| --- | --- |
| `LANDLORD` | Quản lý nhà trọ, tầng, phòng, ảnh và tiện ích trong tenant mà mình là thành viên active. |
| `MANAGER` | Có cùng nhóm endpoint G03 với `LANDLORD`, nhưng vẫn phụ thuộc permission của role trong tenant. |
| `ADMIN` | Quản trị danh mục tiện ích toàn hệ thống. Không dùng các API nhà/tầng/phòng như một tenant operator nếu không có tenant context phù hợp. |
| `TENANT` | Không được sử dụng API quản trị G03. Các chức năng tìm và xem phòng thuộc G04. |

### 2.2. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| Tenant | Không gian dữ liệu của một đơn vị/chủ trọ. Nhà, tầng và phòng đều được cô lập theo `tenantId`. |
| Property | Nhà trọ, tòa nhà, chung cư mini hoặc cụm phòng do tenant quản lý. |
| Floor | Tầng thuộc một property. Phòng có thể không gắn tầng nếu `floorId=null`. |
| Room | Phòng cho thuê, chứa giá, diện tích, sức chứa, trạng thái vận hành và trạng thái marketplace. |
| Room image | Ảnh của phòng, có thứ tự hiển thị, caption và cờ thumbnail. |
| Amenity | Danh mục tiện ích dùng chung toàn hệ thống, ví dụ Wifi, điều hòa, bãi xe. |
| Room amenity | Liên kết nhiều-nhiều giữa phòng và tiện ích. |
| Soft delete | Không xóa vật lý bản ghi mà đánh dấu `deletedAt`, `deletedById`. |
| Tenant-scoped | Request chỉ được thao tác dữ liệu thuộc tenant được xác định bởi `x-tenant-id`. |
| Marketplace status | Trạng thái của tin đăng phòng, tách biệt với trạng thái vận hành của phòng. |

### 2.3. Quan hệ dữ liệu

```text
Tenant
└── Property
    ├── Floor
    │   └── Room (floorId có thể null)
    └── Room
        ├── RoomImage
        └── RoomAmenity
            └── Amenity (danh mục toàn hệ thống)
```

Các quan hệ chính:

| Quan hệ | Quy tắc |
| --- | --- |
| `Tenant -> Property` | Một tenant có nhiều nhà trọ; property luôn có `tenantId`. |
| `Property -> Floor` | Một nhà trọ có thể có nhiều tầng. |
| `Property -> Room` | Mỗi phòng bắt buộc thuộc đúng một nhà trọ. |
| `Floor -> Room` | Một tầng có nhiều phòng; phòng có thể không thuộc tầng nào. |
| `Room -> RoomImage` | Một phòng có nhiều ảnh. |
| `Room <-> Amenity` | Quan hệ nhiều-nhiều qua `RoomAmenity`. |

### 2.4. Các enum

#### Loại nhà trọ

| Giá trị | Ý nghĩa |
| --- | --- |
| `HOUSE` | Nhà nguyên căn |
| `MINI_APARTMENT` | Chung cư mini |
| `DORM` | Ký túc xá hoặc phòng ở ghép |
| `APARTMENT` | Căn hộ chung cư |

#### Trạng thái nhà trọ

| Giá trị | Ý nghĩa |
| --- | --- |
| `ACTIVE` | Nhà trọ đang hoạt động |
| `INACTIVE` | Nhà trọ tạm ngưng |
| `MAINTENANCE` | Nhà trọ đang bảo trì |

#### Trạng thái vận hành của phòng

| Giá trị | Ý nghĩa |
| --- | --- |
| `AVAILABLE` | Phòng trống, có thể cho thuê |
| `OCCUPIED` | Phòng đang có người thuê |
| `RESERVED` | Phòng đã được đặt cọc/giữ chỗ |
| `MAINTENANCE` | Phòng đang bảo trì |
| `INACTIVE` | Phòng tạm dừng hoạt động |

#### Trạng thái marketplace

Prisma lưu năm trạng thái:

| Giá trị | Ý nghĩa |
| --- | --- |
| `DRAFT` | Tin nháp |
| `PENDING_REVIEW` | Đang chờ duyệt |
| `PUBLISHED` | Đang công khai |
| `REJECTED` | Bị từ chối |
| `HIDDEN` | Bị ẩn |

Tuy nhiên, API `PATCH /rooms/:id/marketplace` hiện chỉ nhận ba giá trị do phía chủ trọ điều khiển:

```text
DRAFT | HIDDEN | PUBLISHED
```

API danh sách phòng vẫn cho phép lọc theo cả năm trạng thái.

## 3. Xác thực và quyền truy cập

### 3.1. Header cho API tenant-scoped

Tất cả API `properties`, `floors`, `rooms`, ảnh phòng và gán tiện ích phòng đều là protected. Request phải có:

```http
Authorization: Bearer <accessToken>
x-tenant-id: <tenantId>
```

Ví dụ:

```http
Authorization: Bearer eyJhbGciOi...
x-tenant-id: 12
Content-Type: application/json
```

Backend thực hiện các lớp kiểm tra:

1. Access token phải hợp lệ.
2. Tài khoản phải đang hoạt động.
3. `x-tenant-id` phải xác định được tenant hiện tại.
4. User phải là thành viên `ACTIVE` của tenant.
5. Tenant phải đang hoạt động.
6. Role hiện tại phải là `LANDLORD` hoặc `MANAGER`.
7. Role phải có permission tương ứng với route và HTTP method.
8. Service tiếp tục lọc dữ liệu bằng `tenantId` để chống truy cập chéo tenant.

Không được tin vào `tenantId` gửi trong body. Với các bản ghi G03, backend lấy `tenantId` từ tenant context đã xác thực.

### 3.2. Ngoại lệ: danh mục tiện ích toàn hệ thống

`Amenity` là danh mục dùng chung, không thuộc một tenant cụ thể:

| API | Role | Có cần `x-tenant-id`? |
| --- | --- | --- |
| `GET /amenities` | `LANDLORD`, `MANAGER` | Có, để guard dựng role tenant hiện tại |
| `GET /amenities` | `ADMIN` | Không |
| `POST /amenities` | `ADMIN` | Không |
| `PATCH /amenities/:id` | `ADMIN` | Không |

`ADMIN` được guard cho phép truy cập endpoint quản trị danh mục. Người vận hành tenant chỉ nhìn thấy tiện ích `isActive=true`, kể cả khi truyền `isActive=false`.

## 4. Quy ước request và response

### 4.1. Path parameter

Các ID trong path phải là số nguyên dương. NestJS sử dụng `ParseIntPipe`; giá trị không phải số sẽ bị từ chối trước khi vào service.

### 4.2. Validation body và query

DTO dùng Zod schema với chế độ `strict`. Vì vậy:

- Field không khai báo trong schema sẽ bị từ chối.
- Các API cập nhật yêu cầu có ít nhất một field.
- Một số field số trong query/body được ép kiểu từ chuỗi số.
- Body JSON phải gửi đúng tên field và đúng enum viết hoa.

### 4.3. Phân trang

Các API danh sách property, room và amenity trả:

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

Giá trị mặc định:

- `page=1`
- `limit=20`
- `limit` tối đa `100`

### 4.4. Kiểu số thập phân

Các field như `latitude`, `longitude`, `area`, `basePrice`, `depositAmount`, `electricityPrice`, `waterPrice` được lưu bằng kiểu `Decimal` trong Prisma. Client nên xử lý response như giá trị decimal chính xác và không giả định luôn là số nguyên.

## 5. API nhà trọ

Các endpoint trong phần này yêu cầu `LANDLORD` hoặc `MANAGER`, Bearer token và `x-tenant-id`.

### 5.1. Tổng hợp endpoint

| Method | Endpoint | Request chính | Response | Mục đích |
| --- | --- | --- | --- | --- |
| `GET` | `/properties` | Query lọc/phân trang | Danh sách phân trang | Xem nhà trọ trong tenant |
| `GET` | `/properties/:id` | `id` | Property kèm floors | Xem chi tiết nhà trọ |
| `POST` | `/properties` | Thông tin property | Property vừa tạo | Tạo nhà trọ |
| `PATCH` | `/properties/:id` | Một hoặc nhiều field | Property đã cập nhật | Cập nhật nhà trọ |
| `PATCH` | `/properties/:id/status` | `status` | Property đã cập nhật | Đổi trạng thái |
| `DELETE` | `/properties/:id` | `id` | Property có `deletedAt` | Xóa mềm nhà trọ |

### 5.2. `GET /properties`

Query:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `page` | integer | Không | Mặc định `1`, phải lớn hơn 0 |
| `limit` | integer | Không | Mặc định `20`, từ 1 đến 100 |
| `search` | string | Không | Tìm trong tên, địa chỉ, tỉnh, quận/huyện, phường/xã |
| `status` | `PropertyStatus` | Không | Lọc trạng thái |
| `type` | `PropertyType` | Không | Lọc loại nhà |
| `province` | string | Không | Tìm gần đúng, không phân biệt hoa thường |
| `district` | string | Không | Tìm gần đúng, không phân biệt hoa thường |
| `ward` | string | Không | Tìm gần đúng, không phân biệt hoa thường |

Backend luôn thêm điều kiện `tenantId=<tenant hiện tại>` và `deletedAt=null`.

Ví dụ:

```http
GET /properties?page=1&limit=20&status=ACTIVE&district=Cau%20Giay
Authorization: Bearer <accessToken>
x-tenant-id: 12
```

Mỗi phần tử có thông tin property và `_count` gồm số tầng, số phòng.

### 5.3. `GET /properties/:id`

Trả chi tiết property thuộc tenant hiện tại và danh sách `floors` được sắp theo:

1. `floorNumber` tăng dần.
2. `id` tăng dần nếu cùng `floorNumber`.

Nếu ID không tồn tại, đã xóa mềm hoặc thuộc tenant khác, backend trả `NotFound` với thông báo `Không tìm thấy nhà trọ`. Cách trả lỗi này tránh tiết lộ tài nguyên của tenant khác.

### 5.4. `POST /properties`

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `name` | string | Có | 2-255 ký tự |
| `type` | `PropertyType` | Có | Một trong bốn loại nhà |
| `province` | string | Có | 1-100 ký tự |
| `district` | string | Có | 1-100 ký tự |
| `ward` | string | Có | 1-100 ký tự |
| `addressDetail` | string | Có | 1-2000 ký tự |
| `latitude` | number | Không | Từ -90 đến 90 |
| `longitude` | number | Không | Từ -180 đến 180 |
| `description` | string/null | Không | Tối đa 5000 ký tự |
| `status` | `PropertyStatus` | Không | Mặc định `ACTIVE` |

`tenantId` và `createdById` do backend tự gán.

Ví dụ:

```json
{
  "name": "Nhà trọ Hoa Mai",
  "type": "MINI_APARTMENT",
  "province": "Hà Nội",
  "district": "Cầu Giấy",
  "ward": "Dịch Vọng",
  "addressDetail": "Số 25 ngõ 80 Trần Thái Tông",
  "latitude": 21.0335,
  "longitude": 105.7812,
  "description": "Có thang máy, khóa vân tay và khu để xe.",
  "status": "ACTIVE"
}
```

### 5.5. `PATCH /properties/:id`

Cho phép cập nhật một hoặc nhiều field của body tạo property. Body rỗng bị từ chối.

Không gửi `tenantId`, `createdById`, `updatedById` hoặc `deletedAt`. Backend tự gán `updatedById` theo user đang gọi.

Gửi `"description": null` để xóa mô tả.

### 5.6. `PATCH /properties/:id/status`

Body:

```json
{
  "status": "MAINTENANCE"
}
```

API đổi trạng thái property không tự đổi trạng thái của các phòng bên trong. Tuy nhiên, property không `ACTIVE` sẽ khiến phòng không đủ điều kiện chuyển sang marketplace `PUBLISHED`.

### 5.7. `DELETE /properties/:id`

Đây là xóa mềm:

- Backend kiểm property thuộc tenant hiện tại và chưa bị xóa.
- Backend đếm các phòng chưa xóa có trạng thái `OCCUPIED` hoặc `RESERVED`.
- Nếu có ít nhất một phòng như vậy, request bị từ chối.
- Nếu không có, backend cập nhật `deletedAt` và `deletedById` của property.

Lỗi chặn:

```text
Không thể xóa nhà trọ đang có phòng đã thuê hoặc đặt cọc
```

Lưu ý hiện trạng: xóa mềm property không tự xóa mềm các phòng `AVAILABLE`, `MAINTENANCE` hoặc `INACTIVE` bên trong. API property/floor không còn tìm thấy property đã xóa, trong khi truy vấn room hiện lọc theo `Room.deletedAt` và `tenantId`. Client không nên coi thao tác này là xóa toàn bộ cây dữ liệu.

## 6. API tầng

Tầng được quản lý lồng dưới property.

### 6.1. Tổng hợp endpoint

| Method | Endpoint | Request | Response | Mục đích |
| --- | --- | --- | --- | --- |
| `GET` | `/properties/:propertyId/floors` | `propertyId` | Mảng floor | Xem tầng của nhà |
| `POST` | `/properties/:propertyId/floors` | `name`, `floorNumber` | Floor vừa tạo | Tạo tầng |
| `PATCH` | `/properties/:propertyId/floors/:floorId` | Một hoặc nhiều field | Floor đã cập nhật | Sửa tầng |
| `DELETE` | `/properties/:propertyId/floors/:floorId` | Path IDs | Floor đã xóa | Xóa vật lý tầng rỗng |

### 6.2. `GET /properties/:propertyId/floors`

Backend kiểm property thuộc tenant hiện tại và chưa xóa mềm, sau đó trả danh sách tầng sắp theo `floorNumber`, rồi `id`.

Mỗi floor có `_count.rooms`. Đây là số quan hệ phòng theo truy vấn Prisma của floor.

### 6.3. `POST /properties/:propertyId/floors`

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `name` | string | Có | 1-100 ký tự |
| `floorNumber` | integer | Có | Từ -10 đến 200 |

`floorNumber` dùng để sắp xếp và có thể là số âm cho tầng hầm.

Ví dụ:

```json
{
  "name": "Tầng 1",
  "floorNumber": 1
}
```

### 6.4. `PATCH /properties/:propertyId/floors/:floorId`

Body có thể chứa `name`, `floorNumber` hoặc cả hai, nhưng không được rỗng.

Backend kiểm đồng thời:

- Property thuộc tenant hiện tại.
- Floor thuộc đúng property trong path.
- Property chưa bị xóa mềm.

### 6.5. `DELETE /properties/:propertyId/floors/:floorId`

Floor chỉ được xóa khi không còn phòng chưa xóa mềm gắn với floor.

Nếu còn phòng:

```text
Không thể xóa tầng đang có phòng
```

Khác với property và room, thao tác này xóa vật lý bản ghi floor sau khi đã kiểm tra floor rỗng.

## 7. API phòng

### 7.1. Tổng hợp endpoint

| Method | Endpoint | Request chính | Response | Mục đích |
| --- | --- | --- | --- | --- |
| `GET` | `/rooms` | Query lọc/phân trang | Danh sách phân trang | Xem phòng trong tenant |
| `GET` | `/rooms/:id` | `id` | Room detail | Xem chi tiết phòng |
| `POST` | `/rooms` | Thông tin phòng, `amenityIds` | Room detail | Tạo phòng |
| `PATCH` | `/rooms/:id` | Một hoặc nhiều field | Room detail | Cập nhật phòng |
| `PATCH` | `/rooms/:id/status` | `status` | Room detail | Đổi trạng thái vận hành |
| `PATCH` | `/rooms/:id/marketplace` | `marketplaceStatus` | Room detail | Đổi trạng thái tin |
| `PATCH` | `/rooms/:id/amenities` | `amenityIds` | Room detail | Thay toàn bộ tiện ích |
| `DELETE` | `/rooms/:id` | `id` | Room có `deletedAt` | Xóa mềm phòng |

Room detail gồm:

- Thông tin chính của phòng.
- Property rút gọn.
- Floor rút gọn hoặc `null`.
- Danh sách ảnh, thumbnail đứng trước rồi theo `sortOrder`.
- Danh sách liên kết tiện ích và thông tin amenity.

### 7.2. `GET /rooms`

Query:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `page` | integer | Không | Mặc định 1 |
| `limit` | integer | Không | Mặc định 20, tối đa 100 |
| `search` | string | Không | Tìm trong mã phòng, tiêu đề, mô tả, tên property |
| `propertyId` | integer | Không | Lọc theo nhà trọ |
| `floorId` | integer | Không | Lọc theo tầng |
| `status` | `RoomStatus` | Không | Lọc trạng thái phòng |
| `marketplaceStatus` | `MarketplaceStatus` | Không | Lọc theo cả năm trạng thái marketplace |
| `minPrice` | number | Không | `basePrice >= minPrice` |
| `maxPrice` | number | Không | `basePrice <= maxPrice` |
| `minArea` | number | Không | `area >= minArea` |
| `maxArea` | number | Không | `area <= maxArea` |

Backend luôn lọc `tenantId=<tenant hiện tại>` và `Room.deletedAt=null`.

Ví dụ:

```http
GET /rooms?propertyId=31&status=AVAILABLE&minPrice=2000000&maxPrice=5000000
Authorization: Bearer <accessToken>
x-tenant-id: 12
```

Schema hiện không có validation chéo `minPrice <= maxPrice` hoặc `minArea <= maxArea`; client nên tự bảo đảm cặp giá trị hợp lý.

### 7.3. `GET /rooms/:id`

Chỉ trả room chưa xóa mềm thuộc tenant hiện tại. Room thuộc tenant khác cũng được phản hồi như không tìm thấy:

```text
Không tìm thấy phòng
```

### 7.4. `POST /rooms`

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `propertyId` | integer | Có | Property phải thuộc tenant và chưa xóa |
| `floorId` | integer/null | Không | Nếu có, floor phải thuộc đúng property |
| `roomCode` | string | Có | 1-50 ký tự, duy nhất trong property |
| `title` | string | Có | 2-255 ký tự |
| `area` | number | Có | Lớn hơn 0 |
| `maxOccupants` | integer | Có | Lớn hơn 0 |
| `basePrice` | number | Có | Không âm |
| `depositAmount` | number | Có | Không âm |
| `electricityPrice` | number | Có | Không âm |
| `waterPrice` | number | Có | Không âm |
| `description` | string/null | Không | Tối đa 5000 ký tự |
| `status` | `RoomStatus` | Không | Mặc định `AVAILABLE` |
| `amenityIds` | integer[] | Không | Mặc định `[]`, tối đa 100 phần tử |

Ví dụ:

```json
{
  "propertyId": 31,
  "floorId": 105,
  "roomCode": "P101",
  "title": "Phòng khép kín có ban công",
  "area": 28.5,
  "maxOccupants": 2,
  "basePrice": 4500000,
  "depositAmount": 4500000,
  "electricityPrice": 3800,
  "waterPrice": 30000,
  "description": "Phòng có cửa sổ lớn, giờ giấc tự do.",
  "status": "AVAILABLE",
  "amenityIds": [1, 3, 8]
}
```

Backend xử lý:

1. Lấy tenant context active.
2. Kiểm property thuộc tenant.
3. Nếu có `floorId`, kiểm floor thuộc property.
4. Kiểm `roomCode` chưa tồn tại trong property.
5. Loại ID tiện ích trùng nhau.
6. Kiểm tất cả tiện ích đều tồn tại và `isActive=true`.
7. Tạo room và các `RoomAmenity` trong cùng transaction.
8. Luôn khởi tạo `marketplaceStatus=DRAFT`.

Nếu một bước trong transaction thất bại, room và liên kết tiện ích không được tạo dở dang.

### 7.5. `PATCH /rooms/:id`

Cho phép cập nhật:

- `floorId`
- `roomCode`
- `title`
- `area`
- `maxOccupants`
- `basePrice`
- `depositAmount`
- `electricityPrice`
- `waterPrice`
- `description`

Không cập nhật `propertyId`, `status`, `marketplaceStatus` hoặc `amenityIds` qua endpoint này. Hãy dùng endpoint chuyên biệt cho các field đó.

Body phải có ít nhất một field. Khi đổi `floorId`, floor mới phải thuộc property hiện tại của room. Gửi `"floorId": null` để bỏ liên kết tầng; gửi `"description": null` để xóa mô tả.

### 7.6. `PATCH /rooms/:id/status`

Body:

```json
{
  "status": "OCCUPIED"
}
```

Quy tắc:

- Nếu status mới là `AVAILABLE`, backend chỉ đổi trạng thái phòng; marketplace status hiện tại được giữ nguyên.
- Nếu status mới khác `AVAILABLE`, backend đồng thời đặt `marketplaceStatus=HIDDEN`.

Hệ quả: phòng đang có người thuê, đã đặt cọc, bảo trì hoặc ngừng hoạt động không tiếp tục hiển thị công khai.

### 7.7. `PATCH /rooms/:id/marketplace`

Body hợp lệ:

```json
{
  "marketplaceStatus": "PUBLISHED"
}
```

| Trạng thái yêu cầu | Backend xử lý |
| --- | --- |
| `PUBLISHED` | Kiểm điều kiện đăng, đặt `publishedAt` bằng thời điểm hiện tại |
| `DRAFT` | Chuyển về nháp và đặt `publishedAt=null` |
| `HIDDEN` | Ẩn tin; giữ nguyên `publishedAt` hiện có |

Để chuyển sang `PUBLISHED`, đồng thời phải thỏa:

1. Room có `status=AVAILABLE`.
2. Property có `status=ACTIVE`.
3. Room có ít nhất một ảnh.

Các lỗi tương ứng:

```text
Chỉ phòng đang trống mới được đăng marketplace
Chỉ nhà trọ đang hoạt động mới được đăng phòng
Phòng cần có ít nhất một hình ảnh trước khi đăng marketplace
```

Endpoint này quản lý trạng thái tin phía chủ trọ. Hành vi duyệt tin công khai với `PENDING_REVIEW` hoặc `REJECTED`, nếu được áp dụng, thuộc luồng quản trị/marketplace khác.

### 7.8. `PATCH /rooms/:id/amenities`

Body:

```json
{
  "amenityIds": [1, 3, 8]
}
```

Đây là thao tác **thay thế toàn bộ**, không phải thêm từng phần:

1. Backend loại ID trùng.
2. Kiểm tất cả ID trỏ tới tiện ích active.
3. Trong transaction, xóa toàn bộ liên kết cũ.
4. Tạo lại liên kết theo danh sách mới.
5. Trả room detail sau cập nhật.

Gửi mảng rỗng để gỡ toàn bộ tiện ích:

```json
{
  "amenityIds": []
}
```

Nếu danh sách có tiện ích không tồn tại hoặc đã tắt:

```text
Danh sách tiện ích chứa tiện ích không tồn tại hoặc đã bị tắt
```

### 7.9. `DELETE /rooms/:id`

Đây là xóa mềm:

- Không cho xóa room `OCCUPIED`.
- Không cho xóa room `RESERVED`.
- Các trạng thái còn lại có thể xóa.
- Khi xóa, backend đặt `deletedAt`, `deletedById` và `marketplaceStatus=HIDDEN`.

Lỗi chặn:

```text
Không thể xóa phòng đang thuê hoặc đã đặt cọc
```

Room đã xóa không xuất hiện trong danh sách/chi tiết room của G03.

Lưu ý hiện trạng: ràng buộc database là `@@unique([propertyId, roomCode])`, và kiểm tra trùng mã hiện không loại bản ghi đã xóa mềm. Vì vậy `roomCode` của room đã xóa mềm vẫn không thể tái sử dụng trong cùng property.

## 8. API ảnh phòng

### 8.1. Tổng hợp endpoint

| Method | Endpoint | Content-Type | Request | Response |
| --- | --- | --- | --- | --- |
| `POST` | `/rooms/:id/images` | `multipart/form-data` | Field `files` | Room detail với ảnh mới |
| `PATCH` | `/rooms/:id/images/:imageId` | `application/json` | Metadata ảnh | Ảnh đã cập nhật |
| `DELETE` | `/rooms/:id/images/:imageId` | Không có body | Path IDs | Ảnh đã xóa |

### 8.2. Upload ảnh

Quy tắc upload:

| Quy tắc | Giá trị |
| --- | --- |
| Tên field multipart | `files` |
| Số file tối đa trong một request | 10 |
| Kích thước tối đa | 5 MB mỗi file |
| MIME type | `image/jpeg`, `image/jpg`, `image/png`, `image/webp` |
| Số file tối thiểu | 1 |
| Nơi lưu | Cloudinary, thư mục `rooms/{tenantId}/{roomId}` |

Ví dụ cURL:

```bash
curl -X POST "http://localhost:3000/rooms/205/images" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-tenant-id: 12" \
  -F "files=@./phong-ngu.jpg" \
  -F "files=@./ban-cong.webp"
```

Backend xử lý:

1. Kiểm có ít nhất một file.
2. Kiểm room thuộc tenant hiện tại.
3. Upload từng file lên Cloudinary.
4. `sortOrder` mới bắt đầu từ số ảnh hiện có.
5. Nếu room chưa có ảnh, ảnh đầu tiên của lần upload trở thành thumbnail.
6. Lưu các ảnh và trả room detail.
7. Nếu quá trình thất bại, backend cố xóa các file đã upload trong request đó để tránh file rác.

Lỗi định dạng:

```text
Chỉ hỗ trợ ảnh jpg, jpeg, png hoặc webp
```

Lỗi không có file:

```text
Vui lòng chọn ít nhất một ảnh phòng
```

### 8.3. Cập nhật ảnh

`PATCH /rooms/:id/images/:imageId` nhận ít nhất một field:

| Field | Kiểu | Quy tắc |
| --- | --- | --- |
| `caption` | string/null | Tối đa 255 ký tự; `null` để xóa caption |
| `sortOrder` | integer | Từ 0 trở lên |
| `isThumbnail` | boolean | `true` để chọn làm ảnh đại diện |

Ví dụ:

```json
{
  "caption": "Ban công nhìn ra phố",
  "sortOrder": 1,
  "isThumbnail": true
}
```

Khi một ảnh được đặt `isThumbnail=true`, backend bỏ cờ thumbnail của tất cả ảnh khác trong cùng room trước khi cập nhật ảnh này.

Hệ thống bảo đảm **tối đa một** thumbnail cho mỗi room. Hệ thống không bắt buộc luôn phải có thumbnail: client có thể đặt ảnh hiện tại thành `false`, hoặc xóa ảnh thumbnail, và backend hiện không tự chọn ảnh thay thế.

### 8.4. Xóa ảnh

Backend kiểm `imageId` thuộc đúng room và tenant, sau đó:

1. Xóa bản ghi ảnh trong database.
2. Cố xóa tài nguyên Cloudinary theo `publicId`.
3. Nếu Cloudinary xóa thất bại, lỗi này được bỏ qua và response vẫn trả ảnh đã xóa khỏi database.

Client nên tải lại room detail sau khi thay đổi nhiều ảnh để có thứ tự và thumbnail mới nhất.

## 9. API danh mục tiện ích

### 9.1. Tổng hợp endpoint

| Method | Endpoint | Role | Request | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/amenities` | `LANDLORD`, `MANAGER`, `ADMIN` | Query lọc/phân trang | Danh sách phân trang |
| `POST` | `/amenities` | `ADMIN` | Thông tin tiện ích | Tiện ích vừa tạo |
| `PATCH` | `/amenities/:id` | `ADMIN` | Một hoặc nhiều field | Tiện ích đã cập nhật |

Không có API xóa tiện ích trong module hiện tại. `ADMIN` có thể dùng `isActive=false` để ngừng cho phép gán tiện ích.

### 9.2. `GET /amenities`

Query:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `page` | integer | Không | Mặc định 1 |
| `limit` | integer | Không | Mặc định 20, tối đa 100 |
| `search` | string | Không | Tìm trong tên hoặc category |
| `category` | string | Không | Tìm gần đúng, không phân biệt hoa thường |
| `isActive` | boolean hoặc `"true"`/`"false"` | Không | Chỉ có hiệu lực với `ADMIN` |

Kết quả sắp xếp theo `category`, sau đó `name`.

Quy tắc theo role:

- `ADMIN`: xem active và inactive; có thể dùng `isActive` để lọc.
- `LANDLORD`, `MANAGER`: backend luôn ép `isActive=true`.

### 9.3. `POST /amenities`

Chỉ `ADMIN`.

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `name` | string | Có | 2-100 ký tự |
| `icon` | string/null | Không | Tối đa 100 ký tự |
| `category` | string | Có | 2-100 ký tự |
| `isActive` | boolean | Không | Mặc định `true` |

Ví dụ:

```json
{
  "name": "Điều hòa",
  "icon": "air-conditioner",
  "category": "Tiện nghi phòng",
  "isActive": true
}
```

### 9.4. `PATCH /amenities/:id`

Chỉ `ADMIN`. Cho phép cập nhật một hoặc nhiều field của body tạo tiện ích. Body rỗng bị từ chối.

Gửi `"icon": null` để xóa icon. Nếu ID không tồn tại:

```text
Không tìm thấy tiện ích
```

Khi chuyển `isActive=false`, tiện ích không còn xuất hiện với landlord/manager và không thể gán mới vào room. Liên kết `RoomAmenity` đã tồn tại không bị endpoint này tự xóa.

## 10. Các luồng xử lý chính

### 10.1. Thiết lập một nhà trọ mới

Điều kiện bắt đầu: user là `LANDLORD` hoặc `MANAGER`, membership và tenant đều active.

Các bước:

1. Gọi `POST /properties`.
2. Nếu nhà có chia tầng, gọi `POST /properties/:propertyId/floors` cho từng tầng.
3. Gọi `GET /amenities` để lấy ID tiện ích đang hoạt động.
4. Gọi `POST /rooms` với `propertyId`, `floorId` và `amenityIds`.
5. Gọi `POST /rooms/:id/images` để tải ảnh.
6. Gọi `PATCH /rooms/:id/marketplace` với `PUBLISHED` khi đủ điều kiện.

Kết quả: property và room được tạo trong đúng tenant; phòng có thể xuất hiện trên marketplace theo luồng G04.

### 10.2. Tạo phòng không chia tầng

Không bắt buộc tạo floor. Khi tạo room:

```json
{
  "propertyId": 31,
  "floorId": null,
  "roomCode": "A01",
  "title": "Căn studio tầng trệt",
  "area": 25,
  "maxOccupants": 2,
  "basePrice": 4000000,
  "depositAmount": 4000000,
  "electricityPrice": 3800,
  "waterPrice": 30000,
  "amenityIds": []
}
```

### 10.3. Phòng được đặt cọc hoặc có người thuê

1. Nghiệp vụ liên quan xác định phòng chuyển sang `RESERVED` hoặc `OCCUPIED`.
2. Gọi `PATCH /rooms/:id/status`.
3. Backend đổi room status.
4. Vì status khác `AVAILABLE`, backend tự đặt marketplace status thành `HIDDEN`.
5. Room không thể bị xóa mềm khi đang `RESERVED` hoặc `OCCUPIED`.

### 10.4. Đưa phòng trở lại cho thuê

1. Gọi `PATCH /rooms/:id/status` với `AVAILABLE`.
2. Backend không tự đăng lại tin; `marketplaceStatus` vẫn giữ giá trị hiện tại.
3. Kiểm property `ACTIVE` và room có ảnh.
4. Gọi `PATCH /rooms/:id/marketplace` với `PUBLISHED`.

Điều này ngăn việc phòng tự xuất hiện công khai chỉ vì status được chuyển về trống.

### 10.5. Thay danh sách tiện ích

1. Gọi `GET /amenities` để lấy danh sách active hiện tại.
2. Người dùng chọn toàn bộ tiện ích muốn giữ.
3. Gọi `PATCH /rooms/:id/amenities` với toàn bộ ID đã chọn.
4. Backend thay thế các liên kết trong transaction.

Frontend không được chỉ gửi ID mới thêm nếu muốn giữ các tiện ích cũ.

### 10.6. Xóa dữ liệu

| Đối tượng | Kiểu xóa | Điều kiện chặn | Hệ quả |
| --- | --- | --- | --- |
| Property | Xóa mềm | Có room `OCCUPIED`/`RESERVED` | Đặt `deletedAt`, `deletedById` |
| Floor | Xóa vật lý | Còn bất kỳ room chưa xóa nào | Bản ghi floor bị xóa |
| Room | Xóa mềm | Room `OCCUPIED`/`RESERVED` | Đặt `deletedAt`, `deletedById`, ẩn marketplace |
| RoomImage | Xóa vật lý | Ảnh không thuộc room/tenant | Xóa DB rồi cố xóa Cloudinary |
| Amenity | Không có API xóa | Không áp dụng | Dùng `isActive=false` |

## 11. Quy tắc nghiệp vụ

### 11.1. Cô lập tenant

- Property, floor và room đều có `tenantId`.
- Mọi truy vấn quản lý đều lấy tenant từ user context.
- Tài nguyên thuộc tenant khác được phản hồi như không tìm thấy.
- Floor phải thuộc đúng property trong path.
- Room chỉ được gắn vào property thuộc tenant hiện tại.
- Nếu có floor, floor phải thuộc đúng property của room.

### 11.2. Mã phòng

- `roomCode` duy nhất trong phạm vi một property.
- Hai property khác nhau có thể dùng cùng mã `P101`.
- Đổi mã phòng cũng phải kiểm trùng.
- Mã của room đã xóa mềm hiện vẫn giữ chỗ do unique constraint và logic truy vấn.

### 11.3. Trạng thái phòng và marketplace

Hai trạng thái có mục đích khác nhau:

| Field | Trả lời câu hỏi |
| --- | --- |
| `status` | Phòng đang trống, có người ở, được giữ chỗ, bảo trì hay inactive? |
| `marketplaceStatus` | Tin phòng đang nháp, chờ duyệt, công khai, bị từ chối hay bị ẩn? |

Không được dùng `marketplaceStatus` thay cho trạng thái thuê thực tế.

### 11.4. Tiện ích

- Amenity là danh mục toàn hệ thống.
- Chỉ amenity active mới được gán mới vào room.
- ID trùng trong request được backend loại bỏ.
- Tối đa 100 phần tử trong `amenityIds`.
- Thay tiện ích là thao tác replace-all trong transaction.

### 11.5. Ảnh và thumbnail

- Upload tối đa 10 ảnh mỗi request, không phải tối đa 10 ảnh cho cả room.
- Ảnh đầu tiên của room tự thành thumbnail.
- Đặt ảnh khác làm thumbnail sẽ bỏ cờ ảnh cũ.
- Có thể tồn tại room không có thumbnail.
- Publish chỉ yêu cầu có ít nhất một ảnh, không yêu cầu ảnh đó đang được đánh dấu thumbnail.

### 11.6. Audit cơ bản

Backend tự ghi các field actor:

- Property: `createdById`, `updatedById`, `deletedById`.
- Room: `createdById`, `updatedById`, `deletedById`.
- Amenity: `createdById`, `updatedById`.

Client không gửi các field này.

## 12. Lỗi và cách xử lý

| Tình huống | Loại lỗi điển hình | Thông báo/hành vi |
| --- | --- | --- |
| Thiếu hoặc sai Bearer token | `Unauthorized` | Request không qua guard xác thực |
| Thiếu tenant context | `Unauthorized`/mã auth context | Theo cơ chế G01, thường là `TENANT_CONTEXT_REQUIRED` |
| Không thuộc tenant | `Forbidden`/mã tenant access | Theo cơ chế G01, thường là `TENANT_ACCESS_DENIED` |
| Sai role hoặc permission | `Forbidden` | `Error.PermissionDenied` hoặc lỗi permission tương ứng |
| Path ID không phải số | `BadRequest` | Lỗi `ParseIntPipe` |
| Body/query sai schema | `BadRequest` | Chi tiết validation từ Zod DTO |
| Property không tồn tại/sai tenant/đã xóa | `NotFound` | `Không tìm thấy nhà trọ` |
| Floor không tồn tại hoặc sai property | `NotFound` | `Không tìm thấy tầng` hoặc `Không tìm thấy tầng thuộc nhà trọ này` |
| Room không tồn tại/sai tenant/đã xóa | `NotFound` | `Không tìm thấy phòng` |
| Ảnh không thuộc room/tenant | `NotFound` | `Không tìm thấy ảnh phòng` |
| Trùng `roomCode` | `Conflict` | `Mã phòng đã tồn tại trong nhà trọ này` |
| Amenity không tồn tại/inactive | `BadRequest` | Danh sách tiện ích không hợp lệ |
| Xóa property có room đang thuê/giữ chỗ | `BadRequest` | Không thể xóa nhà trọ |
| Xóa floor còn room | `BadRequest` | Không thể xóa tầng |
| Xóa room đang thuê/giữ chỗ | `BadRequest` | Không thể xóa phòng |
| Publish room không đủ điều kiện | `BadRequest` | Chỉ rõ phòng, property hoặc ảnh chưa hợp lệ |
| Upload sai loại file | `BadRequest` | Chỉ hỗ trợ jpg/jpeg/png/webp |
| Upload không có file | `BadRequest` | Vui lòng chọn ít nhất một ảnh phòng |

Frontend nên hiển thị thông báo nghiệp vụ từ backend và không tự suy luận rằng `NotFound` nghĩa là tài nguyên chắc chắn không tồn tại toàn hệ thống; tài nguyên có thể thuộc tenant khác.

## 13. Ví dụ sử dụng hoàn chỉnh

### 13.1. Tạo property

```bash
curl -X POST "http://localhost:3000/properties" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-tenant-id: 12" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nhà trọ Hoa Mai",
    "type": "MINI_APARTMENT",
    "province": "Hà Nội",
    "district": "Cầu Giấy",
    "ward": "Dịch Vọng",
    "addressDetail": "Số 25 ngõ 80 Trần Thái Tông",
    "status": "ACTIVE"
  }'
```

### 13.2. Tạo floor

```bash
curl -X POST "http://localhost:3000/properties/31/floors" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-tenant-id: 12" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tầng 1",
    "floorNumber": 1
  }'
```

### 13.3. Tạo room

```bash
curl -X POST "http://localhost:3000/rooms" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-tenant-id: 12" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": 31,
    "floorId": 105,
    "roomCode": "P101",
    "title": "Phòng khép kín có ban công",
    "area": 28.5,
    "maxOccupants": 2,
    "basePrice": 4500000,
    "depositAmount": 4500000,
    "electricityPrice": 3800,
    "waterPrice": 30000,
    "amenityIds": [1, 3, 8]
  }'
```

Response đại diện:

```json
{
  "id": 205,
  "tenantId": 12,
  "propertyId": 31,
  "floorId": 105,
  "roomCode": "P101",
  "title": "Phòng khép kín có ban công",
  "area": "28.50",
  "maxOccupants": 2,
  "basePrice": "4500000.00",
  "depositAmount": "4500000.00",
  "electricityPrice": "3800.00",
  "waterPrice": "30000.00",
  "description": null,
  "status": "AVAILABLE",
  "marketplaceStatus": "DRAFT",
  "publishedAt": null,
  "images": [],
  "amenities": [
    {
      "amenity": {
        "id": 1,
        "name": "Wifi",
        "icon": "wifi",
        "category": "Tiện nghi phòng",
        "isActive": true
      }
    }
  ]
}
```

Response thực tế còn có thông tin property, floor và các field audit/thời gian theo select hiện tại.

### 13.4. Upload ảnh và đăng marketplace

```bash
curl -X POST "http://localhost:3000/rooms/205/images" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-tenant-id: 12" \
  -F "files=@./p101-1.jpg" \
  -F "files=@./p101-2.webp"
```

```bash
curl -X PATCH "http://localhost:3000/rooms/205/marketplace" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-tenant-id: 12" \
  -H "Content-Type: application/json" \
  -d '{
    "marketplaceStatus": "PUBLISHED"
  }'
```

### 13.5. Đổi phòng sang trạng thái đã đặt cọc

```bash
curl -X PATCH "http://localhost:3000/rooms/205/status" \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-tenant-id: 12" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "RESERVED"
  }'
```

Sau request này, `marketplaceStatus` được backend đặt thành `HIDDEN`.

## 14. Checklist kiểm thử và tiêu chí nghiệm thu

### 14.1. Xác thực và tenant isolation

- [ ] Thiếu Bearer token bị từ chối.
- [ ] Thiếu `x-tenant-id` với landlord/manager bị từ chối.
- [ ] User không thuộc tenant bị từ chối.
- [ ] `LANDLORD` và `MANAGER` có thể gọi endpoint khi có permission.
- [ ] `TENANT` không thể gọi API quản trị G03.
- [ ] ID thuộc tenant khác trả `NotFound` hoặc lỗi tenant access phù hợp.

### 14.2. Property và floor

- [ ] Tạo property với field bắt buộc thành công.
- [ ] Enum property sai bị validation error.
- [ ] Danh sách chỉ trả property chưa xóa của tenant hiện tại.
- [ ] Xóa property có room `OCCUPIED` bị chặn.
- [ ] Xóa property có room `RESERVED` bị chặn.
- [ ] Tạo/cập nhật floor đúng property thành công.
- [ ] Cập nhật floor qua property khác bị từ chối.
- [ ] Xóa floor còn room bị chặn.
- [ ] Xóa floor rỗng thành công.

### 14.3. Room

- [ ] Tạo room với property thuộc tenant thành công.
- [ ] Floor không thuộc property bị từ chối.
- [ ] Hai room cùng `roomCode` trong một property bị từ chối.
- [ ] Hai property khác nhau có thể dùng cùng `roomCode`.
- [ ] Room mới luôn có `marketplaceStatus=DRAFT`.
- [ ] Body cập nhật room rỗng bị từ chối.
- [ ] Gửi `floorId=null` bỏ liên kết tầng.
- [ ] Đổi room khỏi `AVAILABLE` tự đặt marketplace `HIDDEN`.
- [ ] Xóa room `OCCUPIED`/`RESERVED` bị chặn.
- [ ] Xóa room trạng thái khác thực hiện soft delete và ẩn tin.

### 14.4. Marketplace

- [ ] Publish room `AVAILABLE`, property `ACTIVE`, có ảnh thành công.
- [ ] Publish room không `AVAILABLE` bị chặn.
- [ ] Publish khi property không `ACTIVE` bị chặn.
- [ ] Publish room chưa có ảnh bị chặn.
- [ ] Chuyển `DRAFT` đặt `publishedAt=null`.
- [ ] Chuyển `HIDDEN` không xóa `publishedAt` hiện có.
- [ ] API cập nhật từ chối `PENDING_REVIEW` và `REJECTED`.
- [ ] API list vẫn lọc được cả năm trạng thái marketplace.

### 14.5. Tiện ích và ảnh

- [ ] Landlord/manager chỉ xem amenity active.
- [ ] Admin xem và lọc được amenity inactive.
- [ ] Chỉ admin tạo/cập nhật amenity.
- [ ] Không gán được amenity inactive hoặc không tồn tại.
- [ ] Gửi `amenityIds=[]` gỡ toàn bộ tiện ích.
- [ ] ID amenity trùng được loại bỏ.
- [ ] Upload đúng field `files` và định dạng hợp lệ thành công.
- [ ] Trên 10 file, trên 5 MB/file hoặc MIME sai bị từ chối.
- [ ] Ảnh đầu tiên của room trở thành thumbnail.
- [ ] Chọn thumbnail mới bỏ thumbnail cũ.
- [ ] Không thể sửa/xóa ảnh thuộc room hoặc tenant khác.

### 14.6. Tiêu chí tài liệu

Tài liệu đạt yêu cầu khi:

- Frontend developer biết thứ tự tạo property, floor, room, tiện ích, ảnh và publish.
- Frontend developer biết endpoint nào cần Bearer token và `x-tenant-id`.
- Backend developer hiểu nơi tenant context được kiểm và nơi repository lọc `tenantId`.
- Tester có đủ case cho validation, trạng thái, xóa, publish, ảnh và tenant isolation.
- Người đọc phân biệt được `Room.status` với `Room.marketplaceStatus`.
- Nội dung G03 không mô tả lại luồng public marketplace của G04 hoặc hợp đồng/người thuê của G05.

## 15. Nguồn mã đối chiếu

Tài liệu được đối chiếu theo trạng thái mã nguồn hiện tại, ưu tiên implementation hơn tài liệu tiến độ cũ:

- `backend/src/modules/properties/properties.controller.ts`
- `backend/src/modules/properties/properties.service.ts`
- `backend/src/modules/properties/model/properties.model.ts`
- `backend/src/modules/properties/repositories/properties.repo.ts`
- `backend/src/modules/rooms/rooms.controller.ts`
- `backend/src/modules/rooms/rooms.service.ts`
- `backend/src/modules/rooms/room-images.service.ts`
- `backend/src/modules/rooms/model/rooms.model.ts`
- `backend/src/modules/rooms/repositories/rooms.repo.ts`
- `backend/src/modules/amenities/amenities.controller.ts`
- `backend/src/modules/amenities/amenities.service.ts`
- `backend/src/modules/amenities/model/amenities.model.ts`
- `backend/src/modules/amenities/repositories/amenities.repo.ts`
- `backend/src/common/guard/roles.guard.ts`
- `backend/src/common/utils/pagination.util.ts`
- `backend/prisma/schema.prisma`

