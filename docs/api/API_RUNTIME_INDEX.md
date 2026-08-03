# Runtime API Index

> Sinh tự động từ NestJS runtime ngày 2026-08-03T13:24:05.605Z. Không chỉnh sửa thủ công.

- Tổng số operation: **214**
- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /docs-json`
- Route protected dùng Bearer JWT; route staff theo tenant có thể yêu cầu `x-tenant-id`.
- Error chung: `400`, `401`, `403`, `404`, `409`, `429`, `500`.

## amenities

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/amenities` | Bearer JWT | `AmenitiesController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/amenities` | Bearer JWT | `AmenitiesController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/amenities/{id}` | Bearer JWT | `AmenitiesController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |

## asset-categories

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/asset-categories` | Bearer JWT | `AssetCategoriesController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/asset-categories` | Bearer JWT | `AssetCategoriesController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| DELETE | `/asset-categories/{id}` | Bearer JWT | `AssetCategoriesController_delete` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/asset-categories/{id}` | Bearer JWT | `AssetCategoriesController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/asset-categories/{id}` | Bearer JWT | `AssetCategoriesController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |

## auth

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| POST | `/auth/forgot-password` | Công khai | `AuthController_forgotPassword` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/auth/google/callback` | Công khai | `AuthController_googleCallback` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/auth/google/session` | Công khai | `AuthController_googleSession` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/auth/google/url` | Công khai | `AuthController_getGoogleAuthorizationUrl` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/auth/login` | Công khai | `AuthController_login` | 201, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/auth/logout` | Bearer JWT | `AuthController_logout` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/auth/profile` | Bearer JWT | `AuthController_getProfile` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/auth/profile` | Bearer JWT | `AuthController_updateProfile` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/auth/refresh-token` | Công khai | `AuthController_refreshToken` | 201, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/auth/register` | Công khai | `AuthController_register` | 201, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/auth/send-otp` | Công khai | `AuthController_sendOTP` | 201, 400, 401, 403, 404, 409, 429, 500 |

## contract-terminations

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/contract-terminations` | Bearer JWT | `ContractTerminationsController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/contract-terminations` | Bearer JWT | `ContractTerminationsController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/contract-terminations/{id}` | Bearer JWT | `ContractTerminationsController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/contract-terminations/{id}/approve` | Bearer JWT | `ContractTerminationsController_approve` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/contract-terminations/{id}/cancel` | Bearer JWT | `ContractTerminationsController_cancel` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/contract-terminations/{id}/complete` | Bearer JWT | `ContractTerminationsController_complete` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/contract-terminations/{id}/reject` | Bearer JWT | `ContractTerminationsController_reject` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/contract-terminations/me` | Bearer JWT | `ContractTerminationsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/contract-terminations/me` | Bearer JWT | `ContractTerminationsController_createMine` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/contract-terminations/me/{id}` | Bearer JWT | `ContractTerminationsController_getMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/contract-terminations/me/{id}/cancel` | Bearer JWT | `ContractTerminationsController_cancelMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## contracts

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/contracts` | Bearer JWT | `ContractsController_listForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/contracts` | Bearer JWT | `ContractsController_createDraft` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/contracts/{id}` | Bearer JWT | `ContractsController_getForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/contracts/{id}` | Bearer JWT | `ContractsController_updateDraft` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/contracts/{id}/activate` | Bearer JWT | `ContractsController_activate` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/contracts/{id}/cancel` | Bearer JWT | `ContractsController_cancel` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/contracts/{id}/expire` | Bearer JWT | `ContractsController_expire` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/contracts/me` | Bearer JWT | `ContractsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/contracts/me/{id}` | Bearer JWT | `ContractsController_getMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## dashboard

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/dashboard/platform/summary` | Bearer JWT | `PlatformDashboardController_getSummary` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/dashboard/platform/trends` | Bearer JWT | `PlatformDashboardController_getTrends` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/dashboard/recent-activity` | Bearer JWT | `DashboardController_getRecentActivities` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/dashboard/revenue-trend` | Bearer JWT | `DashboardController_getRevenueTrend` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/dashboard/summary` | Bearer JWT | `DashboardController_getSummary` | 200, 400, 401, 403, 404, 409, 429, 500 |

## device-tokens

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| POST | `/device-tokens` | Bearer JWT | `NotificationsController_registerDeviceToken` | 201, 400, 401, 403, 404, 409, 429, 500 |
| DELETE | `/device-tokens/{id}` | Bearer JWT | `NotificationsController_disableDeviceToken` | 200, 400, 401, 403, 404, 409, 429, 500 |

## handovers

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/handovers` | Bearer JWT | `HandoversController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/handovers` | Bearer JWT | `HandoversController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/handovers/{id}` | Bearer JWT | `HandoversController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/handovers/{id}` | Bearer JWT | `HandoversController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/handovers/{id}/confirm` | Bearer JWT | `HandoversController_confirm` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/handovers/{id}/dispute` | Bearer JWT | `HandoversController_dispute` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/handovers/{id}/resolve` | Bearer JWT | `HandoversController_resolve` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/handovers/me` | Bearer JWT | `HandoversController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/handovers/me/{id}` | Bearer JWT | `HandoversController_getMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/handovers/me/{id}/confirm` | Bearer JWT | `HandoversController_confirmMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/handovers/me/{id}/dispute` | Bearer JWT | `HandoversController_disputeMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## invoices

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/invoices` | Bearer JWT | `InvoicesController_listForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/invoices` | Bearer JWT | `InvoicesController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/invoices/{id}` | Bearer JWT | `InvoicesController_getForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/invoices/{id}` | Bearer JWT | `InvoicesController_updateDraft` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/invoices/{id}/cancel` | Bearer JWT | `InvoicesController_cancel` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/invoices/{id}/issue` | Bearer JWT | `InvoicesController_issue` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/invoices/{id}/overdue` | Bearer JWT | `InvoicesController_markOverdue` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/invoices/debts` | Bearer JWT | `InvoicesController_listDebts` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/invoices/debts/me` | Bearer JWT | `InvoicesController_listMyDebts` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/invoices/me` | Bearer JWT | `InvoicesController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/invoices/me/{id}` | Bearer JWT | `InvoicesController_getMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/invoices/me/{id}/payment-confirmations` | Bearer JWT | `PaymentsController_submitMyConfirmation` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/invoices/me/{id}/payment-qr` | Bearer JWT | `PaymentsController_getMyPaymentQr` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/invoices/me/{id}/payment-qr` | Bearer JWT | `PaymentsController_createMyPaymentQr` | 201, 400, 401, 403, 404, 409, 429, 500 |

## marketplace

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/marketplace/admin/rooms` | Bearer JWT | `MarketplaceAdminController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/marketplace/admin/rooms/{id}` | Bearer JWT | `MarketplaceAdminController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/marketplace/admin/rooms/{id}/history` | Bearer JWT | `MarketplaceAdminController_getHistory` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/marketplace/admin/rooms/{id}/status` | Bearer JWT | `MarketplaceAdminController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/marketplace/rooms` | Công khai | `MarketplaceController_listRooms` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/marketplace/rooms/{id}` | Công khai | `MarketplaceController_getRoomById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/marketplace/rooms/{id}/rental-requests` | Bearer JWT | `MarketplaceController_createRentalRequest` | 201, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/marketplace/rooms/{id}/viewing-appointments` | Bearer JWT | `MarketplaceController_createViewingAppointment` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/marketplace/rooms/{roomId}/review-summary` | Công khai | `ReviewsPublicController_getSummary` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/marketplace/rooms/{roomId}/reviews` | Công khai | `ReviewsPublicController_listPublic` | 200, 400, 401, 403, 404, 409, 429, 500 |

## meter-readings

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/meter-readings` | Bearer JWT | `MeterReadingsController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/meter-readings` | Bearer JWT | `MeterReadingsController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/meter-readings/{id}` | Bearer JWT | `MeterReadingsController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/meter-readings/{id}` | Bearer JWT | `MeterReadingsController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/meter-readings/{id}/status` | Bearer JWT | `MeterReadingsController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |

## notifications

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/notifications` | Bearer JWT | `NotificationsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/notifications/{id}/read` | Bearer JWT | `NotificationsController_markRead` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/notifications/read-all` | Bearer JWT | `NotificationsController_markAllRead` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/notifications/test` | Bearer JWT | `NotificationsController_sendTest` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/notifications/unread-count` | Bearer JWT | `NotificationsController_countUnread` | 200, 400, 401, 403, 404, 409, 429, 500 |

## ocr

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/ocr/jobs` | Bearer JWT | `OcrController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/ocr/jobs` | Bearer JWT | `OcrController_create` | 202, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/ocr/jobs/{id}` | Bearer JWT | `OcrController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/ocr/jobs/{id}/accept` | Bearer JWT | `OcrController_accept` | 201, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/ocr/jobs/{id}/retry` | Bearer JWT | `OcrController_retry` | 202, 400, 401, 403, 404, 409, 429, 500 |

## payment-webhooks

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| POST | `/payment-webhooks/payos` | Công khai | `PaymentsController_handlePayosWebhook` | 201, 400, 401, 403, 404, 409, 429, 500 |

## payments

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/payments` | Bearer JWT | `PaymentsController_listForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/payments/{id}` | Bearer JWT | `PaymentsController_getForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/payments/{id}/approve` | Bearer JWT | `PaymentsController_approve` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/payments/{id}/reject` | Bearer JWT | `PaymentsController_reject` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/payments/me` | Bearer JWT | `PaymentsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/payments/me/{id}` | Bearer JWT | `PaymentsController_getMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## plans

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/plans` | Bearer JWT | `PlansController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/plans` | Bearer JWT | `PlansController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/plans/{id}` | Bearer JWT | `PlansController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/plans/{id}` | Bearer JWT | `PlansController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/plans/available` | Bearer JWT | `PlansController_listAvailable` | 200, 400, 401, 403, 404, 409, 429, 500 |

## properties

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/properties` | Bearer JWT | `PropertiesController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/properties` | Bearer JWT | `PropertiesController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| DELETE | `/properties/{id}` | Bearer JWT | `PropertiesController_softDelete` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/properties/{id}` | Bearer JWT | `PropertiesController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/properties/{id}` | Bearer JWT | `PropertiesController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/properties/{id}/status` | Bearer JWT | `PropertiesController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/properties/{propertyId}/floors` | Bearer JWT | `PropertiesController_listFloors` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/properties/{propertyId}/floors` | Bearer JWT | `PropertiesController_createFloor` | 201, 400, 401, 403, 404, 409, 429, 500 |
| DELETE | `/properties/{propertyId}/floors/{floorId}` | Bearer JWT | `PropertiesController_deleteFloor` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/properties/{propertyId}/floors/{floorId}` | Bearer JWT | `PropertiesController_updateFloor` | 200, 400, 401, 403, 404, 409, 429, 500 |

## rental-requests

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/rental-requests` | Bearer JWT | `RentalRequestsController_listForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/rental-requests/{id}` | Bearer JWT | `RentalRequestsController_getForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/rental-requests/{id}/decision` | Bearer JWT | `RentalRequestsController_decide` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/rental-requests/me` | Bearer JWT | `RentalRequestsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/rental-requests/me/{id}` | Bearer JWT | `RentalRequestsController_updateMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/rental-requests/me/{id}/cancel` | Bearer JWT | `RentalRequestsController_cancelMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## renters

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/renters` | Bearer JWT | `RentersController_listForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/renters/{id}` | Bearer JWT | `RentersController_getForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/renters/{id}` | Bearer JWT | `RentersController_updateForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/renters/{id}/history` | Bearer JWT | `RentersController_listHistory` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/renters/invitations` | Bearer JWT | `RentersController_invite` | 201, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/renters/invitations/accept` | Bearer JWT | `RentersController_acceptInvitation` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/renters/me` | Bearer JWT | `RentersController_getMe` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/renters/me` | Bearer JWT | `RentersController_updateMe` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/renters/me/history` | Bearer JWT | `RentersController_listMyHistory` | 200, 400, 401, 403, 404, 409, 429, 500 |

## reports

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| POST | `/reports` | Bearer JWT | `ReportsController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/reports/admin` | Bearer JWT | `ReportsAdminController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/reports/admin/{id}` | Bearer JWT | `ReportsAdminController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/reports/admin/{id}/status` | Bearer JWT | `ReportsAdminController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/reports/me` | Bearer JWT | `ReportsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/reports/me/{id}` | Bearer JWT | `ReportsController_getMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## reviews

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| POST | `/reviews` | Bearer JWT | `ReviewsController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/reviews/admin` | Bearer JWT | `ReviewsAdminController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/reviews/admin/{id}` | Bearer JWT | `ReviewsAdminController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/reviews/admin/{id}/status` | Bearer JWT | `ReviewsAdminController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/reviews/me` | Bearer JWT | `ReviewsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/reviews/me/{id}` | Bearer JWT | `ReviewsController_getMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## room-assets

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| DELETE | `/room-assets/{id}` | Bearer JWT | `RoomAssetsController_delete` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/room-assets/{id}` | Bearer JWT | `RoomAssetsController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/room-assets/{id}` | Bearer JWT | `RoomAssetsController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |

## room-viewing-appointments

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/room-viewing-appointments` | Bearer JWT | `ViewingAppointmentsController_listForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/room-viewing-appointments/{id}/status` | Bearer JWT | `ViewingAppointmentsController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/room-viewing-appointments/me` | Bearer JWT | `ViewingAppointmentsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/room-viewing-appointments/me/{id}/cancel` | Bearer JWT | `ViewingAppointmentsController_cancelMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## rooms

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/rooms` | Bearer JWT | `RoomsController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/rooms` | Bearer JWT | `RoomsController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| DELETE | `/rooms/{id}` | Bearer JWT | `RoomsController_softDelete` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/rooms/{id}` | Bearer JWT | `RoomsController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/rooms/{id}` | Bearer JWT | `RoomsController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/rooms/{id}/amenities` | Bearer JWT | `RoomsController_replaceAmenities` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/rooms/{id}/images` | Bearer JWT | `RoomsController_uploadImages` | 201, 400, 401, 403, 404, 409, 429, 500 |
| DELETE | `/rooms/{id}/images/{imageId}` | Bearer JWT | `RoomsController_deleteImage` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/rooms/{id}/images/{imageId}` | Bearer JWT | `RoomsController_updateImage` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/rooms/{id}/marketplace` | Bearer JWT | `RoomsController_updateMarketplace` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/rooms/{id}/status` | Bearer JWT | `RoomsController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/rooms/{roomId}/assets` | Bearer JWT | `RoomAssetsController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/rooms/{roomId}/assets` | Bearer JWT | `RoomAssetsController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |

## root

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/` | Công khai | `AppController_getHello` | 200, 400, 401, 403, 404, 409, 429, 500 |

## service-assignments

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/service-assignments` | Bearer JWT | `ServiceChargesController_listAssignments` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/service-assignments` | Bearer JWT | `ServiceChargesController_createAssignment` | 201, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/service-assignments/{id}` | Bearer JWT | `ServiceChargesController_updateAssignment` | 200, 400, 401, 403, 404, 409, 429, 500 |

## service-catalog

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/service-catalog` | Bearer JWT | `ServiceChargesController_listCatalog` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/service-catalog` | Bearer JWT | `ServiceChargesController_createCatalogItem` | 201, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/service-catalog/{id}` | Bearer JWT | `ServiceChargesController_updateCatalogItem` | 200, 400, 401, 403, 404, 409, 429, 500 |

## subscription-payments

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/subscription-payments` | Bearer JWT | `SubscriptionPaymentsController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/subscription-payments/{id}` | Bearer JWT | `SubscriptionPaymentsController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/subscription-payments/me` | Bearer JWT | `SubscriptionPaymentsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/subscription-payments/me/{id}` | Bearer JWT | `SubscriptionPaymentsController_getMineById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/subscription-payments/me/{id}/cancel` | Bearer JWT | `SubscriptionPaymentsController_cancel` | 201, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/subscription-payments/me/payos` | Bearer JWT | `SubscriptionPaymentsController_createCheckout` | 201, 400, 401, 403, 404, 409, 429, 500 |

## subscriptions

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/subscriptions/me` | Bearer JWT | `SubscriptionPaymentsController_getMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## tenants

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/tenants` | Bearer JWT | `TenantsController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/tenants` | Bearer JWT | `TenantsController_createLandlordTenant` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tenants/{id}` | Bearer JWT | `TenantsController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tenants/{id}` | Bearer JWT | `TenantsController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tenants/{id}/plan` | Bearer JWT | `TenantsController_assignPlan` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tenants/{id}/status` | Bearer JWT | `TenantsController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tenants/{id}/verification` | Bearer JWT | `TenantsController_updateVerification` | 200, 400, 401, 403, 404, 409, 429, 500 |

## tickets

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/tickets` | Bearer JWT | `TicketsController_listForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/tickets` | Bearer JWT | `TicketsController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tickets/{id}` | Bearer JWT | `TicketsController_getForLandlord` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tickets/{id}/assign` | Bearer JWT | `TicketsController_assign` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tickets/{id}/attachments` | Bearer JWT | `TicketsController_listStaffAttachments` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/tickets/{id}/attachments` | Bearer JWT | `TicketsController_addAttachment` | 201, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/tickets/{id}/attachments/upload` | Bearer JWT | `TicketsController_uploadAttachment` | 201, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tickets/{id}/close` | Bearer JWT | `TicketsController_closeForStaff` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tickets/{id}/comments` | Bearer JWT | `TicketsController_listStaffComments` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/tickets/{id}/comments` | Bearer JWT | `TicketsController_addComment` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tickets/{id}/history` | Bearer JWT | `TicketsController_listStaffHistory` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tickets/{id}/status` | Bearer JWT | `TicketsController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tickets/me` | Bearer JWT | `TicketsController_listMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tickets/me/{id}` | Bearer JWT | `TicketsController_getMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tickets/me/{id}/attachments` | Bearer JWT | `TicketsController_listMyAttachments` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tickets/me/{id}/cancel` | Bearer JWT | `TicketsController_cancelMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tickets/me/{id}/close` | Bearer JWT | `TicketsController_closeMine` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tickets/me/{id}/comments` | Bearer JWT | `TicketsController_listMyComments` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/tickets/me/{id}/history` | Bearer JWT | `TicketsController_listMyHistory` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/tickets/me/{id}/reopen` | Bearer JWT | `TicketsController_reopenMine` | 200, 400, 401, 403, 404, 409, 429, 500 |

## users

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/users/{id}` | Bearer JWT | `UsersController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/users/{id}/status` | Bearer JWT | `UsersController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/users/landlords` | Bearer JWT | `UsersController_listLandlords` | 200, 400, 401, 403, 404, 409, 429, 500 |

## utility-meters

| Method | Path | Access | Operation ID | Responses |
|---|---|---|---|---|
| GET | `/utility-meters` | Bearer JWT | `UtilityMetersController_list` | 200, 400, 401, 403, 404, 409, 429, 500 |
| POST | `/utility-meters` | Bearer JWT | `UtilityMetersController_create` | 201, 400, 401, 403, 404, 409, 429, 500 |
| GET | `/utility-meters/{id}` | Bearer JWT | `UtilityMetersController_getById` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/utility-meters/{id}` | Bearer JWT | `UtilityMetersController_update` | 200, 400, 401, 403, 404, 409, 429, 500 |
| PATCH | `/utility-meters/{id}/status` | Bearer JWT | `UtilityMetersController_updateStatus` | 200, 400, 401, 403, 404, 409, 429, 500 |

