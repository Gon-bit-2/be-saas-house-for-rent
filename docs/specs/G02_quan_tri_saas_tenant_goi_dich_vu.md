# G02 - Đặc tả quản trị SaaS, tenant và gói dịch vụ

> **Snapshot 31/07/2026:** Tenant/landlord/plan/subscription và PayOS subscription payment đã có API runtime, gồm checkout, cancel, list/detail và webhook completion idempotent. Provider/reconciliation/refund production vẫn cần staging; mọi nhãn cũ “subscription payment chỉ có dữ liệu” đã hết hiệu lực.

## 1. Tổng quan

Tài liệu này mô tả nhóm tính năng G02 của backend: quản lý tài khoản chủ trọ, đơn vị chủ trọ (`Tenant`), gói dịch vụ SaaS (`Plan`) và đăng ký sử dụng gói (`Subscription`). Tài liệu đồng thời ghi rõ những phần mới có nền tảng dữ liệu hoặc mới hoàn thiện một phần để đội phát triển không hiểu nhầm đó là chức năng đã sẵn sàng sử dụng.

Mục tiêu của G02 là giúp:

- Super Admin biết API nào cần gọi để tạo gói, tạo tenant, khóa tài khoản, xác minh tenant và đổi gói.
- Frontend biết field, enum, header, thứ tự gọi API và cách xử lý lỗi.
- Backend developer hiểu transaction tạo tenant và transaction đổi plan.
- Tester phân biệt được trạng thái tài khoản, tenant, plan và subscription.
- Người lập kế hoạch biết chính xác phần SaaS billing nào chưa được triển khai.

### 1.1. Actor và quyền truy cập

Actor chính của G02 là `ADMIN`.

Tất cả API được mô tả trong tài liệu này:

- Là protected endpoint.
- Cần access token hợp lệ.
- Yêu cầu role `ADMIN`.
- Không cần `x-tenant-id` vì đây là nghiệp vụ quản trị cấp nền tảng.

Header cơ bản:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

G02 không mô tả lại cách đăng nhập, JWT, permission key hoặc guard hoạt động chi tiết. Các nội dung đó thuộc G01.

### 1.2. Phạm vi

| Mảng | Nội dung |
| --- | --- |
| Tài khoản chủ trọ | Danh sách landlord, xem chi tiết user, khóa/mở/cấm tài khoản |
| Tenant | Danh sách, chi tiết, tạo mới, cập nhật thông tin và trạng thái |
| Xác minh tenant | Super Admin cập nhật `verificationStatus` |
| Plan | Danh sách, chi tiết, tạo, cập nhật và bật/tắt khả năng đăng ký mới |
| Subscription | Tạo subscription ban đầu và đổi plan cho tenant |
| Subscription payment | Checkout PayOS, cancel, list/detail, webhook hoàn tất và idempotency |

### 1.3. Ngoài phạm vi

| Nội dung | Nhóm tài liệu |
| --- | --- |
| Đăng nhập, JWT, RBAC, refresh token và guard | G01 |
| Quản lý nhà trọ, tầng, phòng và tiện ích | G03 |
| Thanh toán hóa đơn thuê phòng | G08 |
| Dashboard chủ trọ và dashboard toàn hệ thống | G11 |
| Quản lý marketplace cấp nền tảng | Nhóm marketplace/admin riêng |

`SubscriptionPayment` là thanh toán phí sử dụng nền tảng SaaS. Nó không phải `Payment` dùng để thanh toán hóa đơn thuê phòng.

### 1.4. Trạng thái triển khai tổng quát

| Nhóm chức năng | Trạng thái | Nhận định |
| --- | --- | --- |
| Quản lý tài khoản landlord | Đã có backend | Có list, detail và cập nhật trạng thái user |
| Quản lý tenant | Đã có backend | Có list, detail, create, update, status và verification |
| Quản lý plan | Đã có backend | Có list, detail, create và update |
| Tạo subscription ban đầu | Đã có backend | Được tạo trong transaction tạo tenant |
| Đổi plan | Đã có billing flow | Tạo pending subscription/payment; provider hoàn tất mới activate |
| Subscription lifecycle | Đã có core | Pending/active/cancel/expire; scheduler/proration nâng cao còn backlog |
| Subscription payment | Đã có API | PayOS checkout/cancel/list/detail/webhook idempotent |
| Plan quota và feature flag | Một phần | Một số flag như OCR đã được enforce; quota khác cần rà soát |

## 2. Thuật ngữ và mô hình dữ liệu

### 2.1. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| Super Admin | Người quản trị toàn bộ nền tảng, tương ứng role `ADMIN`. |
| Landlord account | Tài khoản `User` của chủ trọ. |
| Tenant | Đơn vị/tổ chức chủ trọ, là ranh giới dữ liệu vận hành. |
| Tenant owner | User đứng tên sở hữu tenant qua `Tenant.ownerUserId`. |
| Tenant member | Quan hệ user tham gia tenant với một role và trạng thái membership. |
| Plan | Gói SaaS định nghĩa giá, quota và feature flags. |
| Subscription | Một lần tenant đăng ký sử dụng một plan trong một khoảng thời gian. |
| Billing cycle | Chu kỳ tháng hoặc năm dùng để tính `expiredAt`. |
| Auto renew | Cờ thể hiện mong muốn tự động gia hạn; hiện tại mới được lưu dữ liệu. |
| Subscription payment | Giao dịch thanh toán phí SaaS cho subscription. Hiện mới có Prisma model. |
| Platform-scoped API | API quản trị toàn hệ thống, không bị giới hạn bởi `x-tenant-id`. |

### 2.2. Quan hệ dữ liệu

```text
User chủ trọ
├── sở hữu Tenant qua Tenant.ownerUserId
└── TenantMember role LANDLORD
        └── Tenant
            ├── dữ liệu vận hành theo tenantId
            └── Subscription
                ├── Plan
                └── SubscriptionPayment
```

Khi Super Admin tạo tenant bằng `POST /tenants`, backend tạo bốn bản ghi nghiệp vụ trong cùng transaction:

1. `User` chủ trọ.
2. `Tenant`.
3. `TenantMember` có role `LANDLORD`.
4. `Subscription` có trạng thái `ACTIVE`.

Nếu một bước thất bại, transaction phải rollback để tránh tồn tại user mà không có tenant hoặc tenant không có subscription.

### 2.3. Phân biệt các loại trạng thái

| Field | Đối tượng | Trả lời câu hỏi | Ảnh hưởng hiện tại |
| --- | --- | --- | --- |
| `User.status` | Tài khoản | User có được xác thực và gọi API bảo vệ không? | Access token guard chỉ chấp nhận user `ACTIVE`. |
| `Tenant.status` | Đơn vị chủ trọ | Tenant có được vận hành dữ liệu tenant-scoped không? | Guard chỉ dựng tenant context cho tenant `ACTIVE`. |
| `Tenant.verificationStatus` | Tenant | Tenant đã được Super Admin xác minh chưa? | Hiện chủ yếu được lưu/hiển thị; chưa có workflow chứng từ. |
| `Plan.isActive` | Plan | Plan có còn cho đăng ký/gán mới không? | Tạo tenant và đổi plan chỉ nhận plan active. |
| `Subscription.status` | Subscription | Đăng ký đang dùng thử, active, quá hạn, hủy hay hết hạn? | Luồng hiện tại mới chủ động tạo `ACTIVE` và hủy `ACTIVE` cũ khi đổi plan. |
| `SubscriptionPayment.status` | Thanh toán SaaS | Giao dịch thanh toán gói đang ở trạng thái nào? | Chưa có API xử lý. |

Khóa user và đình chỉ tenant là hai thao tác độc lập:

- Khóa user không tự đình chỉ tenant.
- Đình chỉ tenant không tự khóa owner.
- Một owner bị khóa không thể gọi API protected.
- Một tenant bị đình chỉ không thể được dùng làm tenant context cho API vận hành.

## 3. Enum và trạng thái

### 3.1. User status

| Giá trị | Ý nghĩa |
| --- | --- |
| `ACTIVE` | Tài khoản hoạt động |
| `INACTIVE` | Tài khoản bị vô hiệu hóa |
| `BANNED` | Tài khoản bị cấm |

### 3.2. Tenant status

| Giá trị | Ý nghĩa |
| --- | --- |
| `ACTIVE` | Tenant được phép vận hành |
| `SUSPENDED` | Tenant bị tạm ngưng |
| `CLOSED` | Tenant đã đóng |

### 3.3. Verification status

| Giá trị | Ý nghĩa |
| --- | --- |
| `UNVERIFIED` | Chưa xác minh |
| `PENDING` | Đang chờ xác minh |
| `VERIFIED` | Đã xác minh |
| `REJECTED` | Bị từ chối xác minh |

### 3.4. Billing cycle

| Giá trị | Cách tính hiện tại |
| --- | --- |
| `MONTHLY` | `expiredAt` bằng thời điểm bắt đầu cộng một tháng |
| `YEARLY` | `expiredAt` bằng thời điểm bắt đầu cộng một năm |

Backend dùng phép cộng tháng/năm của JavaScript `Date`. Chưa có chính sách riêng cho ngày cuối tháng, timezone tính phí hoặc ngày gia hạn.

### 3.5. Subscription status

| Giá trị | Ý nghĩa dữ liệu | Luồng hiện tại |
| --- | --- | --- |
| `TRIALING` | Đang dùng thử | Có trong schema, chưa có API tạo trial |
| `ACTIVE` | Đang hoạt động | Được dùng khi tạo tenant/đổi plan |
| `PAST_DUE` | Quá hạn thanh toán | Có trong schema, chưa có job chuyển trạng thái |
| `CANCELED` | Đã hủy | Được dùng khi đổi plan |
| `EXPIRED` | Đã hết hạn | Có trong schema, chưa có job chuyển trạng thái |

### 3.6. Subscription payment status

| Giá trị | Ý nghĩa |
| --- | --- |
| `PENDING` | Giao dịch đang chờ |
| `PAID` | Đã thanh toán |
| `FAILED` | Thanh toán thất bại |
| `REFUNDED` | Đã hoàn tiền |

Các enum này đã tồn tại trong Prisma schema nhưng hiện chưa có API thanh toán gói SaaS.

## 4. Quy ước API

### 4.1. Xác thực

Request hợp lệ:

```http
Authorization: Bearer <adminAccessToken>
```

Không gửi:

```http
x-tenant-id: ...
```

Super Admin được xác định bằng system role `ADMIN`. Các controller `users`, `plans` và `tenants` đều sử dụng `@IsAdmin()`.

### 4.2. Path parameter

Các ID trong path được parse bằng `ParseIntPipe`. ID không phải số sẽ bị từ chối trước khi chạy service.

### 4.3. Validation

DTO sử dụng Zod schema strict:

- Field lạ bị từ chối.
- Enum phải đúng chữ hoa.
- API cập nhật yêu cầu ít nhất một field.
- Một số số truyền dưới dạng chuỗi có thể được ép sang number.
- `limit` tối đa 100.

### 4.4. Phân trang

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

### 4.5. Decimal

Giá plan và số tiền thanh toán được lưu bằng Prisma `Decimal`. Frontend nên xử lý giá trị decimal chính xác và không phụ thuộc vào việc response luôn được serialize thành number.

## 5. API quản lý tài khoản chủ trọ

### 5.1. Tổng hợp endpoint

| Method | Endpoint | Request | Response | Trạng thái |
| --- | --- | --- | --- | --- |
| `GET` | `/users/landlords` | Query phân trang/lọc | Danh sách landlord | Đã hoạt động |
| `GET` | `/users/:id` | User ID | User detail | Đã hoạt động |
| `PATCH` | `/users/:id/status` | `status` | User detail | Đã hoạt động |

### 5.2. `GET /users/landlords`

Query:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `page` | integer | Không | Mặc định 1, lớn hơn 0 |
| `limit` | integer | Không | Mặc định 20, tối đa 100 |
| `search` | string | Không | Tìm theo họ tên, email, phone hoặc tên tenant sở hữu |
| `status` | `UserStatus` | Không | `ACTIVE`, `INACTIVE`, `BANNED` |

Điều kiện xác định landlord:

- User chưa bị xóa mềm.
- Có ít nhất một `TenantMember` với `roleId=LANDLORD`.

Kết quả sắp theo `createdAt` giảm dần.

Mỗi user gồm:

- Thông tin profile và trạng thái.
- `ownedTenants` chưa bị xóa mềm.
- Membership có role landlord và tenant liên quan.
- Thời điểm xác minh, đăng nhập và tạo/cập nhật.
- Không trả password hash.

Ví dụ:

```http
GET /users/landlords?page=1&limit=20&status=ACTIVE&search=hoa
Authorization: Bearer <adminAccessToken>
```

### 5.3. `GET /users/:id`

Trả user chưa bị xóa mềm cùng tenant sở hữu và membership landlord.

Nếu không tìm thấy:

```text
Không tìm thấy người dùng
```

Endpoint chỉ trả user chưa xóa mềm có membership role `LANDLORD`; user loại khác trả `NotFound`.

### 5.4. `PATCH /users/:id/status`

Body:

```json
{
  "status": "INACTIVE",
  "reason": "Tạm khóa để xác minh vi phạm"
}
```

Cho phép:

```text
ACTIVE | INACTIVE | BANNED
```

Luồng xử lý:

1. Kiểm tra user tồn tại, chưa xóa mềm và có role landlord.
2. Nếu status không đổi, trả dữ liệu hiện tại và không ghi audit trùng.
3. Trong transaction, cập nhật `User.status` và tạo `AuditLog` gồm actor, status cũ/mới và lý do.
4. Khi khóa/cấm, revoke toàn bộ refresh token còn hiệu lực.
5. Ở request protected tiếp theo, access token guard truy vấn lại user và chỉ chấp nhận `ACTIVE`.

Đổi status user không tự cập nhật:

- `Tenant.status`.
- `Tenant.verificationStatus`.
- `Subscription.status`.

Khóa/cấm landlord không tự đổi trạng thái tenant, subscription hoặc tin marketplace.

## 6. API quản lý plan

### 6.1. Tổng hợp endpoint

| Method | Endpoint | Request | Response | Trạng thái |
| --- | --- | --- | --- | --- |
| `GET` | `/plans` | Query phân trang/lọc | Danh sách plan | Đã hoạt động |
| `GET` | `/plans/:id` | Plan ID | Plan detail | Đã hoạt động |
| `POST` | `/plans` | Thông tin plan | Plan vừa tạo | Đã hoạt động |
| `PATCH` | `/plans/:id` | Một hoặc nhiều field | Plan đã cập nhật | Đã hoạt động |

Không có API xóa plan. Dùng `PATCH /plans/:id` với `isActive=false` để ngừng cho phép gán mới.

### 6.2. `GET /plans`

Query:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `page` | integer | Không | Mặc định 1 |
| `limit` | integer | Không | Mặc định 20, tối đa 100 |
| `search` | string | Không | Tìm trong code và name, không phân biệt hoa thường |
| `isActive` | boolean hoặc `"true"`/`"false"` | Không | Lọc plan đang hoạt động hoặc đã tắt |

Kết quả được sắp:

1. Plan active trước.
2. `createdAt` mới nhất trước.

### 6.3. `GET /plans/:id`

Trả:

- `id`, `code`, `name`, `description`.
- `priceMonthly`, `priceYearly`.
- `maxRooms`, `maxStaff`.
- `allowAiOcr`, `allowWebhookPayment`.
- `isActive`.
- `createdAt`, `createdById`, `updatedById`.

Nếu không tìm thấy:

```text
Không tìm thấy gói dịch vụ
```

### 6.4. `POST /plans`

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `code` | string | Có | 2-50 ký tự |
| `name` | string | Có | 2-100 ký tự |
| `description` | string | Không | Tối đa 2000 ký tự |
| `priceMonthly` | number | Có | Không âm |
| `priceYearly` | number | Có | Không âm |
| `maxRooms` | integer | Có | Lớn hơn 0 |
| `maxStaff` | integer | Có | Lớn hơn 0 |
| `allowAiOcr` | boolean | Không | Mặc định `false` |
| `allowWebhookPayment` | boolean | Không | Mặc định `false` |
| `isActive` | boolean | Không | Mặc định `true` |

Ví dụ:

```json
{
  "code": "basic plan",
  "name": "Basic",
  "description": "Phù hợp cho chủ trọ quy mô nhỏ.",
  "priceMonthly": 99000,
  "priceYearly": 990000,
  "maxRooms": 20,
  "maxStaff": 2,
  "allowAiOcr": false,
  "allowWebhookPayment": false,
  "isActive": true
}
```

Backend chuẩn hóa code:

1. Trim khoảng trắng đầu/cuối.
2. Chuyển thành chữ hoa.
3. Thay một hoặc nhiều khoảng trắng bằng `_`.

Ví dụ:

```text
" basic plan " -> "BASIC_PLAN"
```

Sau chuẩn hóa, backend kiểm code đã tồn tại hay chưa. Nếu trùng:

```text
Mã gói dịch vụ đã tồn tại
```

`createdById` được gán theo admin đang gọi.

### 6.5. `PATCH /plans/:id`

Cho phép cập nhật:

- `name`
- `description`
- `priceMonthly`
- `priceYearly`
- `maxRooms`
- `maxStaff`
- `allowAiOcr`
- `allowWebhookPayment`
- `isActive`

Không cho cập nhật `code`. Body phải có ít nhất một field.

Schema hiện không nhận `description=null`. Có thể gửi chuỗi rỗng nếu cần biểu diễn mô tả trống, nhưng chưa có API chuyên biệt để đặt field này về `null`.

Khi cập nhật:

- Backend kiểm plan tồn tại.
- Ghi `updatedById`.
- Không tự cập nhật trạng thái các subscription hiện có.
- Không tạo version hoặc snapshot giá/quota cũ.

### 6.6. Vô hiệu hóa plan

Request:

```json
{
  "isActive": false
}
```

Hệ quả:

- Plan vẫn tồn tại và vẫn xem được.
- Tenant đang dùng plan không bị hủy subscription.
- Không thể dùng plan này khi tạo tenant mới.
- Không thể gán plan này bằng `PATCH /tenants/:id/plan`.

## 7. API quản lý tenant và subscription

### 7.1. Tổng hợp endpoint

| Method | Endpoint | Request | Response | Trạng thái |
| --- | --- | --- | --- | --- |
| `GET` | `/tenants` | Query phân trang/lọc | Danh sách tenant | Đã hoạt động |
| `GET` | `/tenants/:id` | Tenant ID | Tenant detail | Đã hoạt động |
| `POST` | `/tenants` | Owner, tenant và plan | Tenant detail | Đã hoạt động |
| `PATCH` | `/tenants/:id` | Thông tin tenant | Tenant detail | Đã hoạt động |
| `PATCH` | `/tenants/:id/status` | `status` | Tenant detail | Đã hoạt động |
| `PATCH` | `/tenants/:id/verification` | `verificationStatus` | Tenant detail | Đã hoạt động |
| `PATCH` | `/tenants/:id/plan` | Plan và billing cycle | Tenant detail | Hoàn thiện một phần |

### 7.2. `GET /tenants`

Query:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `page` | integer | Không | Mặc định 1 |
| `limit` | integer | Không | Mặc định 20, tối đa 100 |
| `search` | string | Không | Tìm tên, slug, email/phone tenant hoặc tên/email owner |
| `status` | `TenantStatus` | Không | `ACTIVE`, `SUSPENDED`, `CLOSED` |
| `verificationStatus` | `VerificationStatus` | Không | Lọc trạng thái xác minh |
| `planId` | integer | Không | Tenant có subscription `ACTIVE` của plan này |

Backend luôn loại tenant đã xóa mềm bằng `deletedAt=null`.

Kết quả được sắp theo `createdAt` giảm dần.

Mỗi tenant gồm:

- Thông tin tenant và trạng thái.
- Owner rút gọn.
- Mảng `subscriptions` chứa tối đa một bản ghi mới nhất theo `createdAt`.
- Plan chi tiết của subscription đó.
- `createdById`, `updatedById`.

Lưu ý: `subscriptions` trong response là mảng dù chỉ chứa tối đa một phần tử. Đây không phải API lịch sử subscription đầy đủ.

### 7.3. `GET /tenants/:id`

Chỉ tìm tenant:

- Có đúng ID.
- Chưa bị xóa mềm.

Response dùng cùng cấu trúc tenant select với API danh sách.

Nếu không tìm thấy:

```text
Không tìm thấy tenant
```

### 7.4. `POST /tenants`

API này tạo tài khoản chủ trọ, tenant, membership và subscription ban đầu.

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `fullName` | string | Có | 2-255 ký tự |
| `email` | email | Có | Tối đa 255, chưa được dùng |
| `phone` | string | Không | 6-50 ký tự, chưa được dùng |
| `password` | string | Có | 8-100 ký tự, có hoa, thường, số và ký tự đặc biệt |
| `tenantName` | string | Có | 2-255 ký tự |
| `taxCode` | string | Không | Tối đa 50 ký tự |
| `tenantPhone` | string | Không | 6-50 ký tự |
| `tenantEmail` | email | Không | Tối đa 255 ký tự |
| `address` | string | Không | Tối đa 2000 ký tự |
| `planId` | integer | Có | Plan phải active |
| `billingCycle` | `BillingCycle` | Không | Mặc định `MONTHLY` |
| `autoRenew` | boolean | Không | Mặc định `true` |

Ví dụ:

```json
{
  "fullName": "Nguyễn Văn An",
  "email": "owner@example.com",
  "phone": "0900000000",
  "password": "Password1!",
  "tenantName": "Nhà trọ Cầu Giấy",
  "taxCode": "TAX-001",
  "tenantPhone": "0911111111",
  "tenantEmail": "contact@example.com",
  "address": "Cầu Giấy, Hà Nội",
  "planId": 2,
  "billingCycle": "MONTHLY",
  "autoRenew": true
}
```

Luồng xử lý:

1. Kiểm tra email user chưa tồn tại.
2. Nếu có phone, kiểm tra phone user chưa tồn tại.
3. Kiểm tra plan tồn tại và `isActive=true`.
4. Hash password.
5. Sinh slug từ `tenantName`.
6. Nếu slug bị trùng, thêm hậu tố `-2`, `-3`... đến khi tìm được slug trống.
7. Ghi `startedAt` bằng thời điểm hiện tại.
8. Tính `expiredAt` theo billing cycle.
9. Mở transaction.
10. Kiểm tra lại role `LANDLORD` và plan active trong transaction.
11. Tạo `User`.
12. Tạo `Tenant`.
13. Tạo `TenantMember` role `LANDLORD`, status `ACTIVE`.
14. Tạo `Subscription` status `ACTIVE`.
15. Trả tenant detail.

Giá trị mặc định từ schema:

- User có status mặc định `ACTIVE`.
- Tenant có status mặc định `ACTIVE`.
- Tenant có verification mặc định `UNVERIFIED`.
- Membership có status `ACTIVE`.
- Subscription có status `ACTIVE`.

Fallback dữ liệu liên hệ:

- Nếu không có `tenantPhone`, tenant dùng phone của owner.
- Nếu không có `tenantEmail`, tenant dùng email của owner.
- Các field tùy chọn khác được lưu `null`.

Lỗi:

| Tình huống | Loại lỗi | Thông báo |
| --- | --- | --- |
| Email user đã tồn tại | `Conflict` | `Email đã được sử dụng` |
| Phone user đã tồn tại | `Conflict` | `Số điện thoại đã được sử dụng` |
| Plan không tồn tại/inactive | `NotFound` | `Không tìm thấy gói dịch vụ đang hoạt động` |
| Password yếu | Validation error | Thông báo điều kiện mật khẩu cụ thể |
| Body sai field/enum | Validation error | Lỗi Zod DTO |

### 7.5. `PATCH /tenants/:id`

Cho phép cập nhật:

| Field | Kiểu | Cách xóa giá trị |
| --- | --- | --- |
| `name` | string | Không nhận `null` |
| `taxCode` | string/null | Gửi `null` |
| `phone` | string/null | Gửi `null` |
| `email` | email/null | Gửi `null` |
| `address` | string/null | Gửi `null` |

Body phải có ít nhất một field.

Không cho cập nhật qua API này:

- `slug`
- `ownerUserId`
- `status`
- `verificationStatus`
- Plan/subscription
- `deletedAt`

Backend ghi `updatedById` theo admin đang thao tác.

### 7.6. `PATCH /tenants/:id/status`

Body:

```json
{
  "status": "SUSPENDED"
}
```

Cho phép:

```text
ACTIVE | SUSPENDED | CLOSED
```

Backend hiện cho phép chuyển trực tiếp giữa các giá trị enum, chưa có state machine hoặc yêu cầu lý do.

Khi tenant chuyển khỏi `ACTIVE`:

- Owner user không tự bị khóa.
- Subscription không tự bị hủy.
- Guard không dựng tenant context cho tenant `SUSPENDED` hoặc `CLOSED`.
- Các request vận hành có `x-tenant-id` của tenant đó bị từ chối.
- Admin vẫn xem và cập nhật tenant qua API platform-scoped.

### 7.7. `PATCH /tenants/:id/verification`

Body:

```json
{
  "verificationStatus": "VERIFIED"
}
```

Cho phép:

```text
UNVERIFIED | PENDING | VERIFIED | REJECTED
```

Backend hiện chỉ:

1. Kiểm tra tenant tồn tại.
2. Cập nhật enum.
3. Ghi `updatedById`.
4. Trả tenant detail.

Chưa có hồ sơ minh chứng, lý do từ chối, người duyệt riêng, thời điểm duyệt hoặc rule chuyển trạng thái.

### 7.8. `PATCH /tenants/:id/plan`

Body:

| Field | Kiểu | Bắt buộc | Quy tắc |
| --- | --- | --- | --- |
| `planId` | integer | Có | Plan phải active |
| `billingCycle` | `MONTHLY`/`YEARLY` | Không | Mặc định `MONTHLY` |
| `autoRenew` | boolean | Không | Mặc định `true` |

Ví dụ:

```json
{
  "planId": 3,
  "billingCycle": "YEARLY",
  "autoRenew": false
}
```

Luồng hiện tại:

1. Kiểm tra tenant tồn tại.
2. Kiểm tra plan mới active.
3. Tính `startedAt` và `expiredAt` từ thời điểm hiện tại.
4. Mở transaction.
5. Kiểm tra lại tenant và plan.
6. Cập nhật tất cả subscription `ACTIVE` của tenant thành `CANCELED`.
7. Đặt `autoRenew=false` cho các subscription cũ.
8. Tạo subscription mới với status `ACTIVE`.
9. Ghi `Tenant.updatedById`.
10. Trả tenant detail với subscription mới nhất.

Điểm cần hiểu chính xác:

- Plan mới có hiệu lực ngay.
- Có thể gán lại đúng plan hiện tại; backend vẫn hủy subscription cũ và tạo bản ghi mới.
- Không có bước tạo `SubscriptionPayment`.
- Không chờ thanh toán thành công.
- Không tính hoàn tiền, chênh lệch hoặc thời gian còn lại.
- Không kiểm tra quota hiện tại có phù hợp plan mới hay không.

## 8. Các luồng sử dụng chính

### 8.1. Tạo plan mới

Điều kiện: admin đã đăng nhập và có access token.

```bash
curl -X POST "http://localhost:3000/plans" \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "basic plan",
    "name": "Basic",
    "description": "Gói cho chủ trọ nhỏ.",
    "priceMonthly": 99000,
    "priceYearly": 990000,
    "maxRooms": 20,
    "maxStaff": 2,
    "allowAiOcr": false,
    "allowWebhookPayment": false,
    "isActive": true
  }'
```

Kết quả: plan được tạo với code `BASIC_PLAN`.

### 8.2. Tạo tenant và chủ trọ

```bash
curl -X POST "http://localhost:3000/tenants" \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Nguyễn Văn An",
    "email": "owner@example.com",
    "phone": "0900000000",
    "password": "Password1!",
    "tenantName": "Nhà trọ Cầu Giấy",
    "planId": 2,
    "billingCycle": "MONTHLY",
    "autoRenew": true
  }'
```

Kết quả:

- Tạo user chủ trọ.
- Tạo tenant có slug, status `ACTIVE`, verification `UNVERIFIED`.
- Tạo membership `LANDLORD/ACTIVE`.
- Tạo subscription `ACTIVE`.

### 8.3. Đổi plan

```bash
curl -X PATCH "http://localhost:3000/tenants/12/plan" \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": 3,
    "billingCycle": "YEARLY",
    "autoRenew": false
  }'
```

Kết quả: active subscription cũ bị `CANCELED`, subscription mới `ACTIVE` ngay lập tức.

### 8.4. Đình chỉ tenant

```bash
curl -X PATCH "http://localhost:3000/tenants/12/status" \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUSPENDED"
  }'
```

Kết quả: user owner vẫn active nhưng không thể dùng tenant 12 làm context vận hành.

### 8.5. Khóa tài khoản chủ trọ

```bash
curl -X PATCH "http://localhost:3000/users/45/status" \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "BANNED"
  }'
```

Kết quả: user 45 bị từ chối ở request protected tiếp theo. Tenant do user này sở hữu không tự đổi trạng thái.

### 8.6. Vô hiệu hóa plan

```bash
curl -X PATCH "http://localhost:3000/plans/2" \
  -H "Authorization: Bearer <adminAccessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

Kết quả: plan không còn dùng được cho tenant/subscription mới; subscription hiện có không tự thay đổi.

## 9. Quy tắc nghiệp vụ hiện tại

### 9.1. Plan

- Code plan là duy nhất.
- Code chỉ được nhập khi tạo.
- Code được chuẩn hóa chữ hoa và khoảng trắng.
- Giá không được âm.
- `maxRooms` và `maxStaff` phải là số nguyên dương.
- Plan inactive không được gán mới.
- Vô hiệu hóa plan không ảnh hưởng subscription hiện có.

### 9.2. Tenant

- Tenant có đúng một owner qua `ownerUserId`.
- Slug tenant là duy nhất.
- Tenant mới mặc định `ACTIVE`.
- Tenant mới mặc định `UNVERIFIED`.
- Tenant đã xóa mềm không xuất hiện trong API list/detail.
- Chưa có API xóa mềm tenant.

### 9.3. Owner và membership

- Email user phải chưa được sử dụng.
- Phone user, nếu cung cấp, phải chưa được sử dụng.
- Password được hash trước khi lưu.
- Owner đồng thời có membership `LANDLORD/ACTIVE`.
- Admin truyền mật khẩu ban đầu qua request; chưa có luồng invitation.

### 9.4. Subscription

- Tenant mới được tạo với subscription `ACTIVE`.
- Chỉ plan active được dùng.
- Đổi plan hủy toàn bộ active subscription cũ.
- Subscription mới bắt đầu ngay tại thời điểm đổi plan.
- `MONTHLY` cộng một tháng, `YEARLY` cộng một năm.
- `autoRenew` hiện mới là dữ liệu, chưa tự gia hạn.

### 9.5. Audit hiện có

| Đối tượng | Audit hiện có |
| --- | --- |
| Plan | `createdById`, `updatedById` |
| Tenant | `createdById`, `updatedById` |
| User status | Chưa lưu actor thực hiện |
| Subscription | Không có actor field riêng |
| Subscription payment | Chưa có nghiệp vụ |

## 10. Lỗi và cách xử lý

| Tình huống | Loại lỗi điển hình | Thông báo/hành vi |
| --- | --- | --- |
| Thiếu/sai access token | `Unauthorized` | Không qua guard |
| Không phải `ADMIN` | `Forbidden` | Không đủ role/permission |
| ID path không phải số | `BadRequest` | Lỗi `ParseIntPipe` |
| Body/query sai schema | `BadRequest` | Chi tiết Zod validation |
| User không tồn tại | `NotFound` | `Không tìm thấy người dùng` |
| Plan không tồn tại | `NotFound` | `Không tìm thấy gói dịch vụ` |
| Tạo/gán plan inactive | `NotFound` | `Không tìm thấy gói dịch vụ đang hoạt động` |
| Code plan trùng | `Conflict` | `Mã gói dịch vụ đã tồn tại` |
| Tenant không tồn tại | `NotFound` | `Không tìm thấy tenant` |
| Email owner trùng | `Conflict` | `Email đã được sử dụng` |
| Phone owner trùng | `Conflict` | `Số điện thoại đã được sử dụng` |
| Password yếu | `BadRequest` | Thông báo điều kiện mật khẩu |
| Enum trạng thái sai | `BadRequest` | Validation error |
| Body cập nhật rỗng | `BadRequest` | Yêu cầu ít nhất một trường |

Với xung đột đồng thời, database unique constraint có thể phát sinh lỗi Prisma trước khi service chuyển thành thông báo nghiệp vụ thân thiện. Phần này cần integration test và chuẩn hóa error mapping.

## 11. Chức năng chưa hoàn thiện và hướng triển khai tiếp

> Tất cả nội dung trong chương này là hiện trạng thiếu hoặc đề xuất tương lai. Đây không phải API đang hoạt động.

### 11.1. Thanh toán gói SaaS

**Hiện trạng:** `SubscriptionPaymentsModule` đã có API self-service/admin, PayOS checkout/cancel, unique provider transaction, conditional transition và webhook completion kích hoạt subscription đúng một lần.

**Phần còn lại:** integration test với PayOS/PostgreSQL thật, refund/proration, reconciliation định kỳ, xử lý callback trễ và monitoring/alert.

**Tiêu chí tiếp theo:** webhook retry không gia hạn hai lần; callback sai reference không đổi subscription; lịch sử tenant/admin phân trang đúng; refund/proration có policy và audit.

### 11.2. Lịch sử subscription

**Hiện trạng**

- Database giữ nhiều subscription.
- Response tenant chỉ lấy một subscription mới nhất.
- Không có endpoint xem lịch sử hoặc xem một subscription.

**Ảnh hưởng**

- Admin không tra cứu được toàn bộ lần nâng/hạ/đổi gói.
- Khó đối soát subscription với payment.

**Hướng triển khai**

- Bổ sung API lịch sử phân trang.
- Cho phép lọc status, plan và khoảng thời gian.
- Trả price snapshot/payment liên quan khi mô hình dữ liệu đã hỗ trợ.

**Dependency**

- Subscription billing.
- Audit và price snapshot.

**Tiêu chí hoàn thành**

- Xem được toàn bộ lịch sử theo thứ tự thời gian.
- Phân biệt rõ subscription hiện tại và subscription cũ.
- Không làm thay đổi response tenant hiện hành nếu cần tương thích.

### 11.3. Gia hạn tự động

**Hiện trạng**

- `autoRenew` chỉ được lưu.
- Không có scheduler hoặc processor gia hạn.

**Ảnh hưởng**

- Subscription hết `expiredAt` không tự tạo chu kỳ mới.
- Cờ `autoRenew=true` chưa mang lại hành vi thực tế.

**Hướng triển khai**

- Job định kỳ tìm subscription sắp hết hạn.
- Tạo payment/renewal attempt có idempotency key.
- Chỉ gia hạn sau khi thanh toán thành công theo chính sách.
- Xử lý retry, notification và failure.

**Dependency**

- Subscription payment.
- Queue/scheduler.
- Chính sách grace period.

**Tiêu chí hoàn thành**

- Một chu kỳ chỉ được gia hạn đúng một lần.
- Retry không tạo subscription/payment trùng.
- Có log, notification và test thời gian.

### 11.4. Quá hạn, hết hạn và đình chỉ tự động

**Hiện trạng**

- Có enum `PAST_DUE`, `EXPIRED`.
- Không có job chuyển trạng thái.
- Tenant không tự chuyển `SUSPENDED` khi quá hạn.

**Ảnh hưởng**

- Subscription có thể vẫn `ACTIVE` sau `expiredAt`.
- Tenant vẫn vận hành nếu admin không can thiệp.

**Hướng triển khai**

- Định nghĩa grace period.
- Chuyển `ACTIVE -> PAST_DUE -> EXPIRED`.
- Đình chỉ tenant theo chính sách và mở lại khi thanh toán.
- Không khóa owner user nếu chỉ có vấn đề billing.

**Dependency**

- Scheduler, payment, notification.
- Quy tắc tenant suspension.

**Tiêu chí hoàn thành**

- State transition đúng thời gian và idempotent.
- Tenant context bị chặn/mở lại đúng trạng thái.
- Có integration test với clock cố định.

### 11.5. Cưỡng chế quota plan

**Hiện trạng**

- `maxRooms`, `maxStaff` chỉ được lưu và trả trong response.
- Tạo room chưa kiểm `maxRooms`.
- Chưa có API staff để thực thi `maxStaff`.

**Ảnh hưởng**

- Tenant có thể vượt quota plan.
- Nâng/hạ plan không kiểm dữ liệu đang sử dụng.

**Hướng triển khai**

- Tạo service dùng chung để lấy active subscription/plan.
- Kiểm quota trong cùng transaction hoặc với locking phù hợp.
- Quy định behavior khi downgrade dưới mức đang sử dụng.

**Dependency**

- Active subscription phải nhất quán.
- Staff management.

**Tiêu chí hoàn thành**

- Request vượt quota bị từ chối với error code rõ ràng.
- Concurrent create không vượt quota.
- Có test downgrade và soft-deleted resource.

### 11.6. Cưỡng chế feature flags

**Hiện trạng**

- `allowAiOcr`, `allowWebhookPayment` chỉ được lưu.
- Module nghiệp vụ chưa kiểm các cờ này.

**Ảnh hưởng**

- Feature flag chưa thực sự giới hạn tính năng.

**Hướng triển khai**

- Xây subscription entitlement service.
- Kiểm entitlement tại service/guard phù hợp.
- Trả lỗi phân biệt không có quyền role và không có quyền theo plan.

**Dependency**

- OCR module.
- Webhook payment configuration.
- Active subscription resolution.

**Tiêu chí hoàn thành**

- Tenant không có entitlement bị chặn.
- Đổi plan làm entitlement thay đổi nhất quán.
- Có unit và integration test.

### 11.7. Thanh toán khi đổi plan, proration và price snapshot

**Hiện trạng**

- Plan mới active ngay khi gọi API.
- Không tạo payment.
- Không tính thời gian còn lại hoặc chênh lệch giá.
- Subscription không lưu giá tại thời điểm đăng ký.
- Response subscription đọc thông tin plan hiện tại; sửa giá plan có thể thay đổi cách nhìn lịch sử.

**Ảnh hưởng**

- Không có đối soát doanh thu nâng/hạ gói.
- Lịch sử không bảo toàn đầy đủ giá/quyền lợi lúc đăng ký.

**Hướng triển khai**

- Chốt chính sách upgrade/downgrade.
- Lưu price/quota snapshot trên subscription hoặc subscription item/version.
- Chỉ kích hoạt plan mới theo kết quả thanh toán.
- Tính credit/proration bằng kiểu decimal.

**Dependency**

- Subscription payment.
- Plan versioning.
- Chính sách tài chính.

**Tiêu chí hoàn thành**

- Tổng tiền có thể kiểm chứng.
- Lịch sử giữ nguyên giá cũ khi plan thay đổi.
- Không kích hoạt gói hai lần khi callback lặp.

### 11.8. Quản lý staff

**Hiện trạng**

- Có model `TenantMember`.
- Chỉ tạo membership owner `LANDLORD` trong các luồng hiện tại.
- Chưa có API mời, thêm, đổi role, disable hoặc xóa staff.

**Ảnh hưởng**

- Chưa quản lý được `MANAGER`, `ACCOUNTANT`, `MAINTENANCE_STAFF`.
- `maxStaff` chưa thể áp dụng đầy đủ.

**Hướng triển khai**

- Thiết kế invitation và membership lifecycle.
- Xác minh role hợp lệ và tenant isolation.
- Kiểm `maxStaff` khi invite/activate.

**Dependency**

- Email/invitation.
- RBAC G01.
- Quota service.

**Tiêu chí hoàn thành**

- Landlord quản lý staff trong tenant của mình.
- Không thêm vượt quota.
- Disable membership chặn request tiếp theo.

### 11.9. Tenant self-service

**Hiện trạng**

- Chỉ `ADMIN` có API plan/tenant/subscription.
- Landlord chưa xem được subscription, billing history hoặc thay `autoRenew`.

**Ảnh hưởng**

- Mọi thao tác cần Super Admin.
- Không có màn hình billing tự phục vụ.

**Hướng triển khai**

- API tenant-scoped xem plan/usage/billing.
- Cho owner bật/tắt auto renew theo policy.
- Luồng yêu cầu nâng/hạ gói có payment.

**Dependency**

- Subscription billing và quota usage.
- Authorization owner/landlord.

**Tiêu chí hoàn thành**

- Owner chỉ xem tenant của mình.
- Không lộ billing giữa tenant.
- Thay auto renew có audit.

### 11.10. Xác minh tenant

**Hiện trạng**

- Admin có thể đặt trực tiếp mọi verification enum.
- Không có tài liệu minh chứng, lý do từ chối, người duyệt riêng hoặc thời điểm duyệt.

**Ảnh hưởng**

- Không có hồ sơ kiểm toán cho quyết định xác minh.
- Có thể chuyển trạng thái không hợp lệ.

**Hướng triển khai**

- Model hồ sơ xác minh và attachment.
- State machine, rejection reason, reviewer và timestamps.
- Notification khi trạng thái thay đổi.

**Dependency**

- File storage.
- Audit và notification.

**Tiêu chí hoàn thành**

- Mỗi quyết định truy vết được.
- Transition không hợp lệ bị chặn.
- Tenant xem được kết quả và lý do phù hợp.

### 11.11. Xóa tenant

**Hiện trạng**

- `Tenant.deletedAt` tồn tại.
- List/detail đã lọc tenant xóa mềm.
- Không có endpoint xóa/khôi phục.

**Ảnh hưởng**

- Không thể hoàn tất lifecycle tenant qua API.

**Hướng triển khai**

- Quy định `CLOSED` khác soft delete như thế nào.
- Xác định dependency phải xử lý trước khi xóa.
- Thiết kế soft delete, restore và retention.

**Dependency**

- Dữ liệu vận hành, billing và audit.

**Tiêu chí hoàn thành**

- Không làm mất lịch sử bắt buộc.
- Tenant đã xóa không truy cập được.
- Restore, nếu hỗ trợ, giữ quan hệ nhất quán.

### 11.12. Provisioning chủ trọ

**Hiện trạng**

- Admin truyền password trực tiếp khi tạo tenant.
- Không có email mời, mật khẩu tạm hoặc bắt buộc đổi mật khẩu.
- Luồng tạo không đặt `emailVerifiedAt`.

**Ảnh hưởng**

- Admin phải trao mật khẩu ngoài hệ thống.
- Khó chứng minh người nhận sở hữu email.

**Hướng triển khai**

- Gửi invitation token dùng một lần.
- Owner tự đặt password.
- Xác minh email và revoke invitation sau khi dùng.

**Dependency**

- Email service và token security.
- Auth G01.

**Tiêu chí hoàn thành**

- Admin không biết password thật.
- Token hết hạn/dùng lại bị từ chối.
- Owner kích hoạt và xác minh email thành công.

### 11.13. Audit và giới hạn user endpoint

**Hiện trạng**

- Đổi user status không ghi actor.
- `GET/PATCH /users/:id` giới hạn đối tượng là landlord và thao tác đổi status có audit.
- Không có rule chống admin tự khóa.

**Ảnh hưởng**

- Khó truy vết thay đổi tài khoản.
- Endpoint có phạm vi rộng hơn tên nhóm chức năng.

**Hướng triển khai**

- Truyền actor ID và ghi audit log.
- Tách API quản trị user toàn hệ thống và API landlord rõ ràng.
- Quy định bảo vệ tài khoản admin cuối cùng/tự khóa.

**Dependency**

- Audit module và policy quản trị.

**Tiêu chí hoàn thành**

- Mọi thay đổi status có actor, old/new value và timestamp.
- API phản ánh đúng phạm vi đối tượng.
- Test self-lock và last-admin policy.

### 11.14. An toàn concurrency

**Hiện trạng**

- Không có constraint database bảo đảm chỉ một subscription `ACTIVE` cho mỗi tenant.
- Đổi plan dùng `updateMany` rồi `create` trong transaction nhưng hai transaction đồng thời vẫn cần được kiểm chứng.
- Email, phone, slug và plan code được kiểm tra trước khi tạo.
- Chưa có integration test PostgreSQL cho các request đồng thời.

**Ảnh hưởng**

- Có thể phát sinh nhiều active subscription hoặc lỗi unique khó hiểu.
- Logic check-then-create có thể race.

**Hướng triển khai**

- Thêm chiến lược locking/serialization hoặc constraint phù hợp.
- Map Prisma unique error thành lỗi nghiệp vụ ổn định.
- Viết integration test đồng thời.

**Dependency**

- PostgreSQL test database.
- Quyết định constraint active subscription.

**Tiêu chí hoàn thành**

- Hai request đổi plan đồng thời vẫn chỉ có một active subscription.
- Email/phone/slug/code không tạo bản ghi trùng.
- Client nhận lỗi nhất quán.

### 11.15. Plan lifecycle và versioning

**Hiện trạng**

- Không có API xóa plan.
- Code plan bất biến qua API.
- Sửa giá/quota cập nhật trực tiếp bản ghi plan.
- Subscription không tham chiếu một version bất biến.

**Ảnh hưởng**

- Khó bảo toàn lịch sử quyền lợi và giá.
- Không có quy trình retire/archive ngoài `isActive=false`.

**Hướng triển khai**

- Chọn mô hình plan version hoặc snapshot.
- Quy định khi nào cho sửa plan đang có subscriber.
- Giữ `isActive=false` như trạng thái ngừng bán.

**Dependency**

- Billing và reporting.

**Tiêu chí hoàn thành**

- Lịch sử subscription không thay đổi khi plan mới được chỉnh sửa.
- Plan đang được sử dụng không bị xóa phá quan hệ.

## 12. Thứ tự ưu tiên triển khai phần còn thiếu

| Ưu tiên | Nhóm công việc | Lý do |
| ---: | --- | --- |
| 1 | Subscription lifecycle và một active subscription | Là nền tảng cho toàn bộ billing |
| 2 | Subscription payment và lịch sử giao dịch | Bổ sung luồng thu phí/đối soát |
| 3 | Quota và feature entitlement | Biến cấu hình plan thành giới hạn thực |
| 4 | Renewal, expiration và tenant suspension tự động | Hoàn thiện vòng đời subscription |
| 5 | Tenant self-service và staff management | Giảm phụ thuộc Super Admin |
| 6 | Verification, audit và provisioning an toàn | Hoàn thiện quản trị và truy vết |

Không nên triển khai auto-renew trước khi có idempotency cho payment và quy tắc một active subscription.

## 13. Checklist kiểm thử

### 13.1. Authorization

- [ ] Thiếu Bearer token bị từ chối.
- [ ] User không phải `ADMIN` bị từ chối.
- [ ] Admin gọi API không cần `x-tenant-id`.
- [ ] Path ID không phải số bị từ chối.

### 13.2. Plan

- [ ] Tạo plan hợp lệ thành công.
- [ ] Code được chuẩn hóa đúng.
- [ ] Code trùng sau chuẩn hóa bị từ chối.
- [ ] Giá âm, quota bằng 0 hoặc body có field lạ bị từ chối.
- [ ] Update body rỗng bị từ chối.
- [ ] Không thể cập nhật code.
- [ ] Plan inactive không gán được cho tenant mới.
- [ ] Vô hiệu hóa plan không hủy subscription hiện có.

### 13.3. Tenant và owner

- [ ] Tạo tenant với plan active thành công.
- [ ] Transaction tạo đủ user, tenant, membership và subscription.
- [ ] Một bước thất bại không để lại bản ghi dở dang.
- [ ] Email/phone owner trùng bị từ chối.
- [ ] Slug tiếng Việt được chuẩn hóa và thêm hậu tố khi trùng.
- [ ] Plan missing/inactive bị từ chối.
- [ ] Default billing cycle là monthly.
- [ ] Default auto renew là true.
- [ ] Tenant mới active và unverified.
- [ ] Update nullable field bằng `null` thành công.
- [ ] List/search/filter tenant hoạt động đúng.

### 13.4. Subscription

- [ ] Tạo tenant sinh subscription `ACTIVE`.
- [ ] Billing monthly/yearly tính đúng `expiredAt`.
- [ ] Đổi plan hủy active subscription cũ.
- [ ] Subscription cũ có `autoRenew=false`.
- [ ] Subscription mới active ngay.
- [ ] Đổi plan không tạo `SubscriptionPayment`.
- [ ] Response tenant chỉ có subscription mới nhất.

### 13.5. Trạng thái và isolation

- [ ] Tenant `SUSPENDED` không dùng được tenant context.
- [ ] Tenant `CLOSED` không dùng được tenant context.
- [ ] Đình chỉ tenant không khóa user owner.
- [ ] User `INACTIVE` hoặc `BANNED` bị guard từ chối ở request tiếp theo.
- [ ] Khóa user không tự đổi tenant status.
- [ ] Verification status cập nhật đúng enum.

### 13.6. Phần chưa hoàn thiện

- [ ] Tài liệu không mô tả `SubscriptionPayment` như API đang chạy.
- [ ] `autoRenew`, quota và feature flags được ghi rõ là chưa có behavior đầy đủ.
- [ ] API tương lai, nếu được đề xuất, có nhãn “chưa tồn tại”.
- [ ] Dashboard Super Admin không được đưa vào G02.
- [ ] Payment hóa đơn thuê phòng không bị nhầm với subscription payment.

## 14. Tiêu chí nghiệm thu tài liệu

Tài liệu đạt yêu cầu khi:

- Người mới hiểu được quan hệ `User -> Tenant -> Subscription -> Plan`.
- Frontend biết toàn bộ endpoint G02 hiện có, field request và header cần gửi.
- Frontend phân biệt khóa user với đình chỉ tenant.
- Tester tạo được case cho plan, tenant, subscription và authorization.
- Backend developer hiểu transaction tạo tenant gồm bốn bản ghi.
- Backend developer hiểu đổi plan hiện không thu tiền hoặc tính proration.
- Product/technical lead nhìn thấy đầy đủ backlog subscription billing.
- Không có chức năng chưa triển khai nào được trình bày như đã sẵn sàng.

## 15. Nguồn mã đối chiếu

Tài liệu ưu tiên trạng thái mã nguồn hiện tại:

- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/model/users.model.ts`
- `backend/src/modules/users/repositories/users.repo.ts`
- `backend/src/modules/plans/plans.controller.ts`
- `backend/src/modules/plans/plans.service.ts`
- `backend/src/modules/plans/model/plans.model.ts`
- `backend/src/modules/plans/repositories/plans.repo.ts`
- `backend/src/modules/tenants/tenants.controller.ts`
- `backend/src/modules/tenants/tenants.service.ts`
- `backend/src/modules/tenants/model/tenants.model.ts`
- `backend/src/modules/tenants/repositories/tenants.repo.ts`
- `backend/src/common/guard/access-token.guard.ts`
- `backend/src/common/guard/roles.guard.ts`
- `backend/src/common/utils/pagination.util.ts`
- `backend/prisma/schema.prisma`
- `backend/docs/systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md`
- `backend/docs/systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md`

Nếu báo cáo tiến độ cũ mâu thuẫn với implementation hiện tại, tài liệu này lấy controller, service, repository, guard và Prisma schema hiện tại làm nguồn sự thật.
