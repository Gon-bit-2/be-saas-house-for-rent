# Tài liệu tham chiếu API hiện tại

> Sinh tự động từ NestJS runtime ngày 2026-08-03T13:24:05.610Z. Không chỉnh sửa thủ công.

## Quy ước chung

- Base URL local: `http://localhost:3000`; không có global prefix `/api`.
- Swagger UI: `GET /docs`; contract runtime: `GET /docs-json`.
- Route protected dùng `Authorization: Bearer <access-token>`.
- Route landlord/staff theo tenant truyền `x-tenant-id` khi guard tenant áp dụng.
- Request được kiểm tra bằng Zod strict; ngày giờ dùng ISO 8601.
- Error chuẩn: `{ statusCode, code, message, details?, timestamp, path, requestId }`.
- Mọi route chịu global rate limit; profile riêng được ghi ở từng operation.
- Tổng cộng **214 operation** thuộc **34 controller**.

## Mục lục

- [Danh mục tiện ích (3)](#amenities)
- [Danh mục tài sản (5)](#asset-categories)
- [Xác thực và hồ sơ (11)](#auth)
- [Thanh lý hợp đồng (11)](#contract-terminations)
- [Hợp đồng (9)](#contracts)
- [Dashboard (5)](#dashboard)
- [Thiết bị nhận push (2)](#device-tokens)
- [Bàn giao phòng (11)](#handovers)
- [Hóa đơn và công nợ (14)](#invoices)
- [Marketplace và kiểm duyệt (10)](#marketplace)
- [Chỉ số điện nước (5)](#meter-readings)
- [Thông báo (5)](#notifications)
- [OCR công tơ (5)](#ocr)
- [Webhook thanh toán (1)](#payment-webhooks)
- [Thanh toán hóa đơn (6)](#payments)
- [Gói dịch vụ (5)](#plans)
- [Nhà trọ và tầng (10)](#properties)
- [Yêu cầu thuê (6)](#rental-requests)
- [Người thuê và lời mời (9)](#renters)
- [Báo cáo vi phạm (6)](#reports)
- [Đánh giá và uy tín (6)](#reviews)
- [Tài sản trong phòng (3)](#room-assets)
- [Lịch xem phòng (4)](#room-viewing-appointments)
- [Phòng, tiện ích và ảnh (13)](#rooms)
- [Trạng thái dịch vụ (1)](#root)
- [Gán dịch vụ (3)](#service-assignments)
- [Danh mục dịch vụ (3)](#service-catalog)
- [Thanh toán gói SaaS (6)](#subscription-payments)
- [Subscription hiện hành (1)](#subscriptions)
- [Đơn vị chủ trọ (7)](#tenants)
- [Ticket sự cố (20)](#tickets)
- [Người dùng và chủ trọ (3)](#users)
- [Đồng hồ điện nước (5)](#utility-meters)

<a id="amenities"></a>

## Danh mục tiện ích

Đặc tả nghiệp vụ: [G03_nha_tro_tang_phong_tien_ich.md](../specs/G03_nha_tro_tang_phong_tien_ich.md).

### GET `/amenities`

- Operation ID: `AmenitiesController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `category` | query | Không | `string` |
| `isActive` | query | Không | schema inline |

### POST `/amenities`

- Operation ID: `AmenitiesController_create`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateAmenityBodyDTO`; bắt buộc: có.

### PATCH `/amenities/{id}`

- Operation ID: `AmenitiesController_update`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateAmenityBodyDTO`; bắt buộc: có.

<a id="asset-categories"></a>

## Danh mục tài sản

Đặc tả nghiệp vụ: [G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md](../specs/G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md).

### GET `/asset-categories`

- Operation ID: `AssetCategoriesController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |

### POST `/asset-categories`

- Operation ID: `AssetCategoriesController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateAssetCategoryBodyDTO`; bắt buộc: có.

### DELETE `/asset-categories/{id}`

- Operation ID: `AssetCategoriesController_delete`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### GET `/asset-categories/{id}`

- Operation ID: `AssetCategoriesController_getById`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/asset-categories/{id}`

- Operation ID: `AssetCategoriesController_update`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateAssetCategoryBodyDTO`; bắt buộc: có.

<a id="auth"></a>

## Xác thực và hồ sơ

Đặc tả nghiệp vụ: [G01_xac_thuc_tai_khoan_phan_quyen.md](../specs/G01_xac_thuc_tai_khoan_phan_quyen.md).

### POST `/auth/forgot-password`

- Operation ID: `AuthController_forgotPassword`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `verify`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

**Request body**

- `application/json`: `ForgotPasswordBodyDTO`; bắt buộc: có.

### GET `/auth/google/callback`

- Operation ID: `AuthController_googleCallback`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

### POST `/auth/google/session`

- Operation ID: `AuthController_googleSession`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

**Request body**

- `application/json`: `GoogleSessionBodyDTO`; bắt buộc: có.

### GET `/auth/google/url`

- Operation ID: `AuthController_getGoogleAuthorizationUrl`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

### POST `/auth/login`

- Operation ID: `AuthController_login`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `login`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

**Request body**

- `application/json`: `LoginBodyDTO`; bắt buộc: có.

### POST `/auth/logout`

- Operation ID: `AuthController_logout`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `LogoutBodyDTO`; bắt buộc: có.

### GET `/auth/profile`

- Operation ID: `AuthController_getProfile`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

### PATCH `/auth/profile`

- Operation ID: `AuthController_updateProfile`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `UpdateProfileBodyDTO`; bắt buộc: có.

### POST `/auth/refresh-token`

- Operation ID: `AuthController_refreshToken`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `refresh`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

**Request body**

- `application/json`: `RefreshTokenBodyDTO`; bắt buộc: có.

### POST `/auth/register`

- Operation ID: `AuthController_register`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `verify`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

**Request body**

- `application/json`: `RegisterBodyDTO`; bắt buộc: có.

### POST `/auth/send-otp`

- Operation ID: `AuthController_sendOTP`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `otp`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

**Request body**

- `application/json`: `SendOTPBodyDTO`; bắt buộc: có.

<a id="contract-terminations"></a>

## Thanh lý hợp đồng

Đặc tả nghiệp vụ: [G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md](../specs/G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md).

### GET `/contract-terminations`

- Operation ID: `ContractTerminationsController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `contractId` | query | Không | `integer` |
| `roomId` | query | Không | `integer` |

### POST `/contract-terminations`

- Operation ID: `ContractTerminationsController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateContractTerminationBodyDTO`; bắt buộc: có.

### GET `/contract-terminations/{id}`

- Operation ID: `ContractTerminationsController_getById`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/contract-terminations/{id}/approve`

- Operation ID: `ContractTerminationsController_approve`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `ReviewContractTerminationBodyDTO`; bắt buộc: có.

### PATCH `/contract-terminations/{id}/cancel`

- Operation ID: `ContractTerminationsController_cancel`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `EmptyContractTerminationBodyDTO`; bắt buộc: có.

### PATCH `/contract-terminations/{id}/complete`

- Operation ID: `ContractTerminationsController_complete`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `CompleteContractTerminationBodyDTO`; bắt buộc: có.

### PATCH `/contract-terminations/{id}/reject`

- Operation ID: `ContractTerminationsController_reject`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `ReviewContractTerminationBodyDTO`; bắt buộc: có.

### GET `/contract-terminations/me`

- Operation ID: `ContractTerminationsController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `contractId` | query | Không | `integer` |
| `roomId` | query | Không | `integer` |

### POST `/contract-terminations/me`

- Operation ID: `ContractTerminationsController_createMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateContractTerminationBodyDTO`; bắt buộc: có.

### GET `/contract-terminations/me/{id}`

- Operation ID: `ContractTerminationsController_getMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/contract-terminations/me/{id}/cancel`

- Operation ID: `ContractTerminationsController_cancelMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `EmptyContractTerminationBodyDTO`; bắt buộc: có.

<a id="contracts"></a>

## Hợp đồng

Đặc tả nghiệp vụ: [G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md](../specs/G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md).

### GET `/contracts`

- Operation ID: `ContractsController_listForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `roomId` | query | Không | `integer` |
| `renterId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `x-tenant-id` | header | Có | `integer` |

### POST `/contracts`

- Operation ID: `ContractsController_createDraft`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `CreateContractBodyDTO`; bắt buộc: có.

### GET `/contracts/{id}`

- Operation ID: `ContractsController_getForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/contracts/{id}`

- Operation ID: `ContractsController_updateDraft`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdateContractBodyDTO`; bắt buộc: có.

### PATCH `/contracts/{id}/activate`

- Operation ID: `ContractsController_activate`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/contracts/{id}/cancel`

- Operation ID: `ContractsController_cancel`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/contracts/{id}/expire`

- Operation ID: `ContractsController_expire`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### GET `/contracts/me`

- Operation ID: `ContractsController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `roomId` | query | Không | `integer` |
| `renterId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `search` | query | Không | `string` |

### GET `/contracts/me/{id}`

- Operation ID: `ContractsController_getMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

<a id="dashboard"></a>

## Dashboard

Đặc tả nghiệp vụ: [G11_dashboard_bao_cao_audit_cau_hinh_he_thong.md](../specs/G11_dashboard_bao_cao_audit_cau_hinh_he_thong.md).

### GET `/dashboard/platform/summary`

- Operation ID: `PlatformDashboardController_getSummary`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |

### GET `/dashboard/platform/trends`

- Operation ID: `PlatformDashboardController_getTrends`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `groupBy` | query | Không | `string` |

### GET `/dashboard/recent-activity`

- Operation ID: `DashboardController_getRecentActivities`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `limit` | query | Không | `integer` |

### GET `/dashboard/revenue-trend`

- Operation ID: `DashboardController_getRevenueTrend`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `groupBy` | query | Không | `string` |

### GET `/dashboard/summary`

- Operation ID: `DashboardController_getSummary`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |

<a id="device-tokens"></a>

## Thiết bị nhận push

Đặc tả nghiệp vụ: [G10_thong_bao_realtime_push_notification.md](../specs/G10_thong_bao_realtime_push_notification.md).

### POST `/device-tokens`

- Operation ID: `NotificationsController_registerDeviceToken`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `RegisterDeviceTokenBodyDTO`; bắt buộc: có.

### DELETE `/device-tokens/{id}`

- Operation ID: `NotificationsController_disableDeviceToken`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

<a id="handovers"></a>

## Bàn giao phòng

Đặc tả nghiệp vụ: [G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md](../specs/G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md).

### GET `/handovers`

- Operation ID: `HandoversController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `contractId` | query | Không | `integer` |
| `roomId` | query | Không | `integer` |
| `type` | query | Không | `string` |
| `status` | query | Không | `string` |

### POST `/handovers`

- Operation ID: `HandoversController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateHandoverBodyDTO`; bắt buộc: có.

### GET `/handovers/{id}`

- Operation ID: `HandoversController_getById`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/handovers/{id}`

- Operation ID: `HandoversController_update`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateHandoverBodyDTO`; bắt buộc: có.

### PATCH `/handovers/{id}/confirm`

- Operation ID: `HandoversController_confirm`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `ConfirmHandoverBodyDTO`; bắt buộc: có.

### PATCH `/handovers/{id}/dispute`

- Operation ID: `HandoversController_dispute`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `DisputeHandoverBodyDTO`; bắt buộc: có.

### PATCH `/handovers/{id}/resolve`

- Operation ID: `HandoversController_resolve`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `ResolveHandoverBodyDTO`; bắt buộc: có.

### GET `/handovers/me`

- Operation ID: `HandoversController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `contractId` | query | Không | `integer` |
| `roomId` | query | Không | `integer` |
| `type` | query | Không | `string` |
| `status` | query | Không | `string` |

### GET `/handovers/me/{id}`

- Operation ID: `HandoversController_getMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/handovers/me/{id}/confirm`

- Operation ID: `HandoversController_confirmMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `ConfirmHandoverBodyDTO`; bắt buộc: có.

### PATCH `/handovers/me/{id}/dispute`

- Operation ID: `HandoversController_disputeMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `DisputeHandoverBodyDTO`; bắt buộc: có.

<a id="invoices"></a>

## Hóa đơn và công nợ

Đặc tả nghiệp vụ: [G07_hoa_don_cong_no.md](../specs/G07_hoa_don_cong_no.md).

### GET `/invoices`

- Operation ID: `InvoicesController_listForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `billingMonth` | query | Không | schema inline |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `roomId` | query | Không | `integer` |
| `contractId` | query | Không | `integer` |
| `renterId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `status` | query | Không | `string` |
| `x-tenant-id` | header | Có | `integer` |

### POST `/invoices`

- Operation ID: `InvoicesController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `CreateInvoiceBodyDTO`; bắt buộc: có.

### GET `/invoices/{id}`

- Operation ID: `InvoicesController_getForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/invoices/{id}`

- Operation ID: `InvoicesController_updateDraft`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdateInvoiceBodyDTO`; bắt buộc: có.

### PATCH `/invoices/{id}/cancel`

- Operation ID: `InvoicesController_cancel`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/invoices/{id}/issue`

- Operation ID: `InvoicesController_issue`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/invoices/{id}/overdue`

- Operation ID: `InvoicesController_markOverdue`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### GET `/invoices/debts`

- Operation ID: `InvoicesController_listDebts`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `billingMonth` | query | Không | schema inline |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `roomId` | query | Không | `integer` |
| `contractId` | query | Không | `integer` |
| `renterId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `status` | query | Không | `string` |
| `x-tenant-id` | header | Có | `integer` |

### GET `/invoices/debts/me`

- Operation ID: `InvoicesController_listMyDebts`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `billingMonth` | query | Không | schema inline |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `roomId` | query | Không | `integer` |
| `contractId` | query | Không | `integer` |
| `renterId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `status` | query | Không | `string` |

### GET `/invoices/me`

- Operation ID: `InvoicesController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `billingMonth` | query | Không | schema inline |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `roomId` | query | Không | `integer` |
| `contractId` | query | Không | `integer` |
| `renterId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `status` | query | Không | `string` |

### GET `/invoices/me/{id}`

- Operation ID: `InvoicesController_getMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### POST `/invoices/me/{id}/payment-confirmations`

- Operation ID: `PaymentsController_submitMyConfirmation`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `SubmitPaymentConfirmationBodyDTO`; bắt buộc: có.

### GET `/invoices/me/{id}/payment-qr`

- Operation ID: `PaymentsController_getMyPaymentQr`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### POST `/invoices/me/{id}/payment-qr`

- Operation ID: `PaymentsController_createMyPaymentQr`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `CreatePaymentQrBodyDTO`; bắt buộc: có.

<a id="marketplace"></a>

## Marketplace và kiểm duyệt

Đặc tả nghiệp vụ: [G04_marketplace_yeu_cau_thue_lich_xem_phong.md](../specs/G04_marketplace_yeu_cau_thue_lich_xem_phong.md).

### GET `/marketplace/admin/rooms`

- Operation ID: `MarketplaceAdminController_list`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `marketplaceStatus` | query | Không | `string` |
| `roomStatus` | query | Không | `string` |
| `tenantId` | query | Không | `integer` |
| `province` | query | Không | `string` |
| `district` | query | Không | `string` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |

### GET `/marketplace/admin/rooms/{id}`

- Operation ID: `MarketplaceAdminController_getById`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### GET `/marketplace/admin/rooms/{id}/history`

- Operation ID: `MarketplaceAdminController_getHistory`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |

### PATCH `/marketplace/admin/rooms/{id}/status`

- Operation ID: `MarketplaceAdminController_updateStatus`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateAdminMarketplaceStatusBodyDTO`; bắt buộc: có.

### GET `/marketplace/rooms`

- Operation ID: `MarketplaceController_listRooms`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `province` | query | Không | `string` |
| `district` | query | Không | `string` |
| `ward` | query | Không | `string` |
| `propertyType` | query | Không | `string` |
| `minPrice` | query | Không | `number` |
| `maxPrice` | query | Không | `number` |
| `minArea` | query | Không | `number` |
| `maxArea` | query | Không | `number` |
| `maxOccupants` | query | Không | `integer` |
| `amenityIds` | query | Không | schema inline |

### GET `/marketplace/rooms/{id}`

- Operation ID: `MarketplaceController_getRoomById`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### POST `/marketplace/rooms/{id}/rental-requests`

- Operation ID: `MarketplaceController_createRentalRequest`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `CreateMarketplaceRentalRequestBodyDTO`; bắt buộc: có.

### POST `/marketplace/rooms/{id}/viewing-appointments`

- Operation ID: `MarketplaceController_createViewingAppointment`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `CreateMarketplaceViewingAppointmentBodyDTO`; bắt buộc: có.

### GET `/marketplace/rooms/{roomId}/review-summary`

- Operation ID: `ReviewsPublicController_getSummary`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `roomId` | path | Có | `number` |

### GET `/marketplace/rooms/{roomId}/reviews`

- Operation ID: `ReviewsPublicController_listPublic`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `roomId` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |

<a id="meter-readings"></a>

## Chỉ số điện nước

Đặc tả nghiệp vụ: [G06_dien_nuoc_cong_to_chi_so_dich_vu.md](../specs/G06_dien_nuoc_cong_to_chi_so_dich_vu.md).

### GET `/meter-readings`

- Operation ID: `MeterReadingsController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `billingMonth` | query | Không | schema inline |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `roomId` | query | Không | `integer` |
| `meterId` | query | Không | `integer` |
| `type` | query | Không | `string` |
| `status` | query | Không | `string` |

### POST `/meter-readings`

- Operation ID: `MeterReadingsController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateMeterReadingBodyDTO`; bắt buộc: có.

### GET `/meter-readings/{id}`

- Operation ID: `MeterReadingsController_getById`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/meter-readings/{id}`

- Operation ID: `MeterReadingsController_update`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateMeterReadingBodyDTO`; bắt buộc: có.

### PATCH `/meter-readings/{id}/status`

- Operation ID: `MeterReadingsController_updateStatus`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateMeterReadingStatusBodyDTO`; bắt buộc: có.

<a id="notifications"></a>

## Thông báo

Đặc tả nghiệp vụ: [G10_thong_bao_realtime_push_notification.md](../specs/G10_thong_bao_realtime_push_notification.md).

### GET `/notifications`

- Operation ID: `NotificationsController_listMine`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `type` | query | Không | `string` |
| `isRead` | query | Không | schema inline |

### PATCH `/notifications/{id}/read`

- Operation ID: `NotificationsController_markRead`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `EmptyNotificationBodyDTO`; bắt buộc: có.

### PATCH `/notifications/read-all`

- Operation ID: `NotificationsController_markAllRead`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `EmptyNotificationBodyDTO`; bắt buộc: có.

### POST `/notifications/test`

- Operation ID: `NotificationsController_sendTest`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `EmptyNotificationBodyDTO`; bắt buộc: có.

### GET `/notifications/unread-count`

- Operation ID: `NotificationsController_countUnread`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

<a id="ocr"></a>

## OCR công tơ

Đặc tả nghiệp vụ: [G06_dien_nuoc_cong_to_chi_so_dich_vu.md](../specs/G06_dien_nuoc_cong_to_chi_so_dich_vu.md).

### GET `/ocr/jobs`

- Operation ID: `OcrController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `roomId` | query | Không | `integer` |
| `meterId` | query | Không | `integer` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |

### POST `/ocr/jobs`

- Operation ID: `OcrController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `ocr-create`.
- Response: 202, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateOcrJobBodyDTO`; bắt buộc: có.

### GET `/ocr/jobs/{id}`

- Operation ID: `OcrController_getById`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### POST `/ocr/jobs/{id}/accept`

- Operation ID: `OcrController_accept`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `AcceptOcrJobBodyDTO`; bắt buộc: có.

### POST `/ocr/jobs/{id}/retry`

- Operation ID: `OcrController_retry`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `ocr-create`.
- Response: 202, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

<a id="payment-webhooks"></a>

## Webhook thanh toán

Đặc tả nghiệp vụ: [G08_thanh_toan_qr_doi_soat_webhook.md](../specs/G08_thanh_toan_qr_doi_soat_webhook.md).

### POST `/payment-webhooks/payos`

- Operation ID: `PaymentsController_handlePayosWebhook`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

**Request body**

- `application/json`: `PayosWebhookBodyDTO`; bắt buộc: có.

<a id="payments"></a>

## Thanh toán hóa đơn

Đặc tả nghiệp vụ: [G08_thanh_toan_qr_doi_soat_webhook.md](../specs/G08_thanh_toan_qr_doi_soat_webhook.md).

### GET `/payments`

- Operation ID: `PaymentsController_listForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `invoiceId` | query | Không | `integer` |
| `renterId` | query | Không | `integer` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `search` | query | Không | `string` |
| `x-tenant-id` | header | Có | `integer` |

### GET `/payments/{id}`

- Operation ID: `PaymentsController_getForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/payments/{id}/approve`

- Operation ID: `PaymentsController_approve`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `ReviewPaymentBodyDTO`; bắt buộc: có.

### PATCH `/payments/{id}/reject`

- Operation ID: `PaymentsController_reject`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `ReviewPaymentBodyDTO`; bắt buộc: có.

### GET `/payments/me`

- Operation ID: `PaymentsController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `invoiceId` | query | Không | `integer` |
| `renterId` | query | Không | `integer` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `search` | query | Không | `string` |

### GET `/payments/me/{id}`

- Operation ID: `PaymentsController_getMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

<a id="plans"></a>

## Gói dịch vụ

Đặc tả nghiệp vụ: [G02_quan_tri_saas_tenant_goi_dich_vu.md](../specs/G02_quan_tri_saas_tenant_goi_dich_vu.md).

### GET `/plans`

- Operation ID: `PlansController_list`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `isActive` | query | Không | schema inline |

### POST `/plans`

- Operation ID: `PlansController_create`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreatePlanBodyDTO`; bắt buộc: có.

### GET `/plans/{id}`

- Operation ID: `PlansController_getById`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/plans/{id}`

- Operation ID: `PlansController_update`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdatePlanBodyDTO`; bắt buộc: có.

### GET `/plans/available`

- Operation ID: `PlansController_listAvailable`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

<a id="properties"></a>

## Nhà trọ và tầng

Đặc tả nghiệp vụ: [G03_nha_tro_tang_phong_tien_ich.md](../specs/G03_nha_tro_tang_phong_tien_ich.md).

### GET `/properties`

- Operation ID: `PropertiesController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `status` | query | Không | `string` |
| `type` | query | Không | `string` |
| `province` | query | Không | `string` |
| `district` | query | Không | `string` |
| `ward` | query | Không | `string` |
| `x-tenant-id` | header | Có | `integer` |

### POST `/properties`

- Operation ID: `PropertiesController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `CreatePropertyBodyDTO`; bắt buộc: có.

### DELETE `/properties/{id}`

- Operation ID: `PropertiesController_softDelete`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### GET `/properties/{id}`

- Operation ID: `PropertiesController_getById`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/properties/{id}`

- Operation ID: `PropertiesController_update`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdatePropertyBodyDTO`; bắt buộc: có.

### PATCH `/properties/{id}/status`

- Operation ID: `PropertiesController_updateStatus`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdatePropertyStatusBodyDTO`; bắt buộc: có.

### GET `/properties/{propertyId}/floors`

- Operation ID: `PropertiesController_listFloors`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `propertyId` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### POST `/properties/{propertyId}/floors`

- Operation ID: `PropertiesController_createFloor`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `propertyId` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `CreateFloorBodyDTO`; bắt buộc: có.

### DELETE `/properties/{propertyId}/floors/{floorId}`

- Operation ID: `PropertiesController_deleteFloor`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `propertyId` | path | Có | `number` |
| `floorId` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/properties/{propertyId}/floors/{floorId}`

- Operation ID: `PropertiesController_updateFloor`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `propertyId` | path | Có | `number` |
| `floorId` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdateFloorBodyDTO`; bắt buộc: có.

<a id="rental-requests"></a>

## Yêu cầu thuê

Đặc tả nghiệp vụ: [G04_marketplace_yeu_cau_thue_lich_xem_phong.md](../specs/G04_marketplace_yeu_cau_thue_lich_xem_phong.md).

### GET `/rental-requests`

- Operation ID: `RentalRequestsController_listForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `roomId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `x-tenant-id` | header | Có | `integer` |

### GET `/rental-requests/{id}`

- Operation ID: `RentalRequestsController_getForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/rental-requests/{id}/decision`

- Operation ID: `RentalRequestsController_decide`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `DecideRentalRequestBodyDTO`; bắt buộc: có.

### GET `/rental-requests/me`

- Operation ID: `RentalRequestsController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `roomId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `search` | query | Không | `string` |

### PATCH `/rental-requests/me/{id}`

- Operation ID: `RentalRequestsController_updateMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateMyRentalRequestBodyDTO`; bắt buộc: có.

### PATCH `/rental-requests/me/{id}/cancel`

- Operation ID: `RentalRequestsController_cancelMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `CancelMyRentalRequestBodyDTO`; bắt buộc: có.

<a id="renters"></a>

## Người thuê và lời mời

Đặc tả nghiệp vụ: [G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md](../specs/G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md).

### GET `/renters`

- Operation ID: `RentersController_listForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `verificationStatus` | query | Không | `string` |

### GET `/renters/{id}`

- Operation ID: `RentersController_getForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/renters/{id}`

- Operation ID: `RentersController_updateForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateRenterForLandlordBodyDTO`; bắt buộc: có.

### GET `/renters/{id}/history`

- Operation ID: `RentersController_listHistory`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |

### POST `/renters/invitations`

- Operation ID: `RentersController_invite`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `InviteRenterBodyDTO`; bắt buộc: có.

### POST `/renters/invitations/accept`

- Operation ID: `RentersController_acceptInvitation`.
- Xác thực: Bearer JWT; role: không giới hạn role riêng.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

**Request body**

- `application/json`: `AcceptRenterInvitationBodyDTO`; bắt buộc: có.

### GET `/renters/me`

- Operation ID: `RentersController_getMe`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

### PATCH `/renters/me`

- Operation ID: `RentersController_updateMe`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `UpdateRenterProfileBodyDTO`; bắt buộc: có.

### GET `/renters/me/history`

- Operation ID: `RentersController_listMyHistory`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |

<a id="reports"></a>

## Báo cáo vi phạm

Đặc tả nghiệp vụ: [G12_danh_gia_uy_tin_bao_cao_vi_pham.md](../specs/G12_danh_gia_uy_tin_bao_cao_vi_pham.md).

### POST `/reports`

- Operation ID: `ReportsController_create`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `trust-write`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateReportBodyDTO`; bắt buộc: có.

### GET `/reports/admin`

- Operation ID: `ReportsAdminController_list`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `targetType` | query | Không | `string` |
| `reporterId` | query | Không | `integer` |
| `handledBy` | query | Không | `integer` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `search` | query | Không | `string` |

### GET `/reports/admin/{id}`

- Operation ID: `ReportsAdminController_getById`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/reports/admin/{id}/status`

- Operation ID: `ReportsAdminController_updateStatus`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateReportStatusBodyDTO`; bắt buộc: có.

### GET `/reports/me`

- Operation ID: `ReportsController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `targetType` | query | Không | `string` |

### GET `/reports/me/{id}`

- Operation ID: `ReportsController_getMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

<a id="reviews"></a>

## Đánh giá và uy tín

Đặc tả nghiệp vụ: [G12_danh_gia_uy_tin_bao_cao_vi_pham.md](../specs/G12_danh_gia_uy_tin_bao_cao_vi_pham.md).

### POST `/reviews`

- Operation ID: `ReviewsController_create`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `trust-write`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateReviewBodyDTO`; bắt buộc: có.

### GET `/reviews/admin`

- Operation ID: `ReviewsAdminController_list`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `tenantId` | query | Không | `integer` |
| `roomId` | query | Không | `integer` |
| `reviewerId` | query | Không | `integer` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `search` | query | Không | `string` |

### GET `/reviews/admin/{id}`

- Operation ID: `ReviewsAdminController_getById`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/reviews/admin/{id}/status`

- Operation ID: `ReviewsAdminController_updateStatus`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateReviewStatusBodyDTO`; bắt buộc: có.

### GET `/reviews/me`

- Operation ID: `ReviewsController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `roomId` | query | Không | `integer` |

### GET `/reviews/me/{id}`

- Operation ID: `ReviewsController_getMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

<a id="room-assets"></a>

## Tài sản trong phòng

Đặc tả nghiệp vụ: [G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md](../specs/G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md).

### DELETE `/room-assets/{id}`

- Operation ID: `RoomAssetsController_delete`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### GET `/room-assets/{id}`

- Operation ID: `RoomAssetsController_getById`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/room-assets/{id}`

- Operation ID: `RoomAssetsController_update`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateRoomAssetBodyDTO`; bắt buộc: có.

<a id="room-viewing-appointments"></a>

## Lịch xem phòng

Đặc tả nghiệp vụ: [G04_marketplace_yeu_cau_thue_lich_xem_phong.md](../specs/G04_marketplace_yeu_cau_thue_lich_xem_phong.md).

### GET `/room-viewing-appointments`

- Operation ID: `ViewingAppointmentsController_listForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `roomId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/room-viewing-appointments/{id}/status`

- Operation ID: `ViewingAppointmentsController_updateStatus`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdateViewingAppointmentStatusBodyDTO`; bắt buộc: có.

### GET `/room-viewing-appointments/me`

- Operation ID: `ViewingAppointmentsController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `roomId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |

### PATCH `/room-viewing-appointments/me/{id}/cancel`

- Operation ID: `ViewingAppointmentsController_cancelMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `CancelMyViewingAppointmentBodyDTO`; bắt buộc: có.

<a id="rooms"></a>

## Phòng, tiện ích và ảnh

Đặc tả nghiệp vụ: [G03_nha_tro_tang_phong_tien_ich.md](../specs/G03_nha_tro_tang_phong_tien_ich.md).

### GET `/rooms`

- Operation ID: `RoomsController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `propertyId` | query | Không | `integer` |
| `floorId` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `marketplaceStatus` | query | Không | `string` |
| `minPrice` | query | Không | `number` |
| `maxPrice` | query | Không | `number` |
| `minArea` | query | Không | `number` |
| `maxArea` | query | Không | `number` |
| `x-tenant-id` | header | Có | `integer` |

### POST `/rooms`

- Operation ID: `RoomsController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `CreateRoomBodyDTO`; bắt buộc: có.

### DELETE `/rooms/{id}`

- Operation ID: `RoomsController_softDelete`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### GET `/rooms/{id}`

- Operation ID: `RoomsController_getById`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/rooms/{id}`

- Operation ID: `RoomsController_update`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdateRoomBodyDTO`; bắt buộc: có.

### PATCH `/rooms/{id}/amenities`

- Operation ID: `RoomsController_replaceAmenities`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `ReplaceRoomAmenitiesBodyDTO`; bắt buộc: có.

### POST `/rooms/{id}/images`

- Operation ID: `RoomsController_uploadImages`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### DELETE `/rooms/{id}/images/{imageId}`

- Operation ID: `RoomsController_deleteImage`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `imageId` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/rooms/{id}/images/{imageId}`

- Operation ID: `RoomsController_updateImage`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `imageId` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdateRoomImageBodyDTO`; bắt buộc: có.

### PATCH `/rooms/{id}/marketplace`

- Operation ID: `RoomsController_updateMarketplace`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdateRoomMarketplaceBodyDTO`; bắt buộc: có.

### PATCH `/rooms/{id}/status`

- Operation ID: `RoomsController_updateStatus`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdateRoomStatusBodyDTO`; bắt buộc: có.

### GET `/rooms/{roomId}/assets`

- Operation ID: `RoomAssetsController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `roomId` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `condition` | query | Không | `string` |
| `categoryId` | query | Không | `integer` |
| `x-tenant-id` | header | Có | `integer` |

### POST `/rooms/{roomId}/assets`

- Operation ID: `RoomAssetsController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `roomId` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `CreateRoomAssetBodyDTO`; bắt buộc: có.

<a id="root"></a>

## Trạng thái dịch vụ

### GET `/`

- Operation ID: `AppController_getHello`.
- Xác thực: Công khai; role: không áp dụng.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.
- Auth metadata: `None`.

<a id="service-assignments"></a>

## Gán dịch vụ

Đặc tả nghiệp vụ: [G06_dien_nuoc_cong_to_chi_so_dich_vu.md](../specs/G06_dien_nuoc_cong_to_chi_so_dich_vu.md).

### GET `/service-assignments`

- Operation ID: `ServiceChargesController_listAssignments`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `isActive` | query | Không | `boolean` |
| `serviceItemId` | query | Không | `integer` |
| `roomId` | query | Không | `integer` |
| `contractId` | query | Không | `integer` |

### POST `/service-assignments`

- Operation ID: `ServiceChargesController_createAssignment`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateServiceAssignmentBodyDTO`; bắt buộc: có.

### PATCH `/service-assignments/{id}`

- Operation ID: `ServiceChargesController_updateAssignment`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateServiceAssignmentBodyDTO`; bắt buộc: có.

<a id="service-catalog"></a>

## Danh mục dịch vụ

Đặc tả nghiệp vụ: [G06_dien_nuoc_cong_to_chi_so_dich_vu.md](../specs/G06_dien_nuoc_cong_to_chi_so_dich_vu.md).

### GET `/service-catalog`

- Operation ID: `ServiceChargesController_listCatalog`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `isActive` | query | Không | `boolean` |
| `search` | query | Không | `string` |

### POST `/service-catalog`

- Operation ID: `ServiceChargesController_createCatalogItem`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateServiceCatalogItemBodyDTO`; bắt buộc: có.

### PATCH `/service-catalog/{id}`

- Operation ID: `ServiceChargesController_updateCatalogItem`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `ACCOUNTANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateServiceCatalogItemBodyDTO`; bắt buộc: có.

<a id="subscription-payments"></a>

## Thanh toán gói SaaS

Đặc tả nghiệp vụ: [G02_quan_tri_saas_tenant_goi_dich_vu.md](../specs/G02_quan_tri_saas_tenant_goi_dich_vu.md).

### GET `/subscription-payments`

- Operation ID: `SubscriptionPaymentsController_list`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `tenantId` | query | Không | `integer` |
| `subscriptionId` | query | Không | `integer` |
| `planId` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `purpose` | query | Không | `string` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |
| `search` | query | Không | `string` |

### GET `/subscription-payments/{id}`

- Operation ID: `SubscriptionPaymentsController_getById`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### GET `/subscription-payments/me`

- Operation ID: `SubscriptionPaymentsController_listMine`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `purpose` | query | Không | `string` |
| `from` | query | Không | schema inline |
| `to` | query | Không | schema inline |

### GET `/subscription-payments/me/{id}`

- Operation ID: `SubscriptionPaymentsController_getMineById`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### POST `/subscription-payments/me/{id}/cancel`

- Operation ID: `SubscriptionPaymentsController_cancel`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### POST `/subscription-payments/me/payos`

- Operation ID: `SubscriptionPaymentsController_createCheckout`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateSubscriptionCheckoutBodyDTO`; bắt buộc: có.

<a id="subscriptions"></a>

## Subscription hiện hành

Đặc tả nghiệp vụ: [G02_quan_tri_saas_tenant_goi_dich_vu.md](../specs/G02_quan_tri_saas_tenant_goi_dich_vu.md).

### GET `/subscriptions/me`

- Operation ID: `SubscriptionPaymentsController_getMine`.
- Xác thực: Bearer JWT; role: `LANDLORD`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

<a id="tenants"></a>

## Đơn vị chủ trọ

Đặc tả nghiệp vụ: [G02_quan_tri_saas_tenant_goi_dich_vu.md](../specs/G02_quan_tri_saas_tenant_goi_dich_vu.md).

### GET `/tenants`

- Operation ID: `TenantsController_list`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `status` | query | Không | `string` |
| `verificationStatus` | query | Không | `string` |
| `planId` | query | Không | `integer` |

### POST `/tenants`

- Operation ID: `TenantsController_createLandlordTenant`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateTenantBodyDTO`; bắt buộc: có.

### GET `/tenants/{id}`

- Operation ID: `TenantsController_getById`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/tenants/{id}`

- Operation ID: `TenantsController_update`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateTenantBodyDTO`; bắt buộc: có.

### PATCH `/tenants/{id}/plan`

- Operation ID: `TenantsController_assignPlan`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `AssignTenantPlanBodyDTO`; bắt buộc: có.

### PATCH `/tenants/{id}/status`

- Operation ID: `TenantsController_updateStatus`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateTenantStatusBodyDTO`; bắt buộc: có.

### PATCH `/tenants/{id}/verification`

- Operation ID: `TenantsController_updateVerification`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateTenantVerificationBodyDTO`; bắt buộc: có.

<a id="tickets"></a>

## Ticket sự cố

Đặc tả nghiệp vụ: [G09_ticket_su_co_bao_tri.md](../specs/G09_ticket_su_co_bao_tri.md).

### GET `/tickets`

- Operation ID: `TicketsController_listForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `category` | query | Không | `string` |
| `priority` | query | Không | `string` |
| `roomId` | query | Không | `integer` |
| `contractId` | query | Không | `integer` |
| `assignedTo` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `x-tenant-id` | header | Có | `integer` |

### POST `/tickets`

- Operation ID: `TicketsController_create`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `ticket-create`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateTicketBodyDTO`; bắt buộc: có.

### GET `/tickets/{id}`

- Operation ID: `TicketsController_getForLandlord`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/tickets/{id}/assign`

- Operation ID: `TicketsController_assign`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `AssignTicketBodyDTO`; bắt buộc: có.

### GET `/tickets/{id}/attachments`

- Operation ID: `TicketsController_listStaffAttachments`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `x-tenant-id` | header | Có | `integer` |

### POST `/tickets/{id}/attachments`

- Operation ID: `TicketsController_addAttachment`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`, `TENANT`.
- Rate limit: `ticket-attachment`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `CreateTicketAttachmentBodyDTO`; bắt buộc: có.

### POST `/tickets/{id}/attachments/upload`

- Operation ID: `TicketsController_uploadAttachment`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`, `TENANT`.
- Rate limit: `ticket-attachment`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `multipart/form-data`: `object`; bắt buộc: có.

### PATCH `/tickets/{id}/close`

- Operation ID: `TicketsController_closeForStaff`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `CloseTicketBodyDTO`; bắt buộc: có.

### GET `/tickets/{id}/comments`

- Operation ID: `TicketsController_listStaffComments`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `x-tenant-id` | header | Có | `integer` |

### POST `/tickets/{id}/comments`

- Operation ID: `TicketsController_addComment`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`, `TENANT`.
- Rate limit: `ticket-comment`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `CreateTicketCommentBodyDTO`; bắt buộc: có.

### GET `/tickets/{id}/history`

- Operation ID: `TicketsController_listStaffHistory`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `x-tenant-id` | header | Có | `integer` |

### PATCH `/tickets/{id}/status`

- Operation ID: `TicketsController_updateStatus`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`, `MAINTENANCE_STAFF`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `x-tenant-id` | header | Có | `integer` |

**Request body**

- `application/json`: `UpdateTicketStatusBodyDTO`; bắt buộc: có.

### GET `/tickets/me`

- Operation ID: `TicketsController_listMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `status` | query | Không | `string` |
| `category` | query | Không | `string` |
| `priority` | query | Không | `string` |
| `roomId` | query | Không | `integer` |
| `contractId` | query | Không | `integer` |
| `assignedTo` | query | Không | `integer` |
| `search` | query | Không | `string` |

### GET `/tickets/me/{id}`

- Operation ID: `TicketsController_getMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### GET `/tickets/me/{id}/attachments`

- Operation ID: `TicketsController_listMyAttachments`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |

### PATCH `/tickets/me/{id}/cancel`

- Operation ID: `TicketsController_cancelMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/tickets/me/{id}/close`

- Operation ID: `TicketsController_closeMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### GET `/tickets/me/{id}/comments`

- Operation ID: `TicketsController_listMyComments`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |

### GET `/tickets/me/{id}/history`

- Operation ID: `TicketsController_listMyHistory`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |

### PATCH `/tickets/me/{id}/reopen`

- Operation ID: `TicketsController_reopenMine`.
- Xác thực: Bearer JWT; role: `TENANT`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

<a id="users"></a>

## Người dùng và chủ trọ

Đặc tả nghiệp vụ: [G01_xac_thuc_tai_khoan_phan_quyen.md](../specs/G01_xac_thuc_tai_khoan_phan_quyen.md).

### GET `/users/{id}`

- Operation ID: `UsersController_getById`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/users/{id}/status`

- Operation ID: `UsersController_updateStatus`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateUserStatusBodyDTO`; bắt buộc: có.

### GET `/users/landlords`

- Operation ID: `UsersController_listLandlords`.
- Xác thực: Bearer JWT; role: `ADMIN`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `search` | query | Không | `string` |
| `status` | query | Không | `string` |

<a id="utility-meters"></a>

## Đồng hồ điện nước

Đặc tả nghiệp vụ: [G06_dien_nuoc_cong_to_chi_so_dich_vu.md](../specs/G06_dien_nuoc_cong_to_chi_so_dich_vu.md).

### GET `/utility-meters`

- Operation ID: `UtilityMetersController_list`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `page` | query | Không | `integer` |
| `limit` | query | Không | `integer` |
| `roomId` | query | Không | `integer` |
| `propertyId` | query | Không | `integer` |
| `type` | query | Không | `string` |
| `status` | query | Không | `string` |

### POST `/utility-meters`

- Operation ID: `UtilityMetersController_create`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 201, 400, 401, 403, 404, 409, 429, 500.

**Request body**

- `application/json`: `CreateUtilityMeterBodyDTO`; bắt buộc: có.

### GET `/utility-meters/{id}`

- Operation ID: `UtilityMetersController_getById`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

### PATCH `/utility-meters/{id}`

- Operation ID: `UtilityMetersController_update`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateUtilityMeterBodyDTO`; bắt buộc: có.

### PATCH `/utility-meters/{id}/status`

- Operation ID: `UtilityMetersController_updateStatus`.
- Xác thực: Bearer JWT; role: `LANDLORD`, `MANAGER`.
- Rate limit: `global`.
- Response: 200, 400, 401, 403, 404, 409, 429, 500.

| Tham số | Vị trí | Bắt buộc | Schema |
|---|---|:---:|---|
| `id` | path | Có | `number` |

**Request body**

- `application/json`: `UpdateUtilityMeterStatusBodyDTO`; bắt buộc: có.

## Ví dụ xác thực

```bash
curl "http://localhost:3000/auth/profile" \
  -H "Authorization: Bearer <access-token>"
```

Với route staff theo tenant, thêm `-H "x-tenant-id: <tenant-id>"`. Không ghi secret thật vào tài liệu.

