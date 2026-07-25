# Mô tả kiến trúc hệ thống MVP

**Đề tài:** Xây dựng nền tảng Web/App quản lý và cho thuê phòng trọ, chung cư mini thông minh theo mô hình SaaS & Marketplace  
**Sinh viên thực hiện:** Nguyễn Văn Thiện  
**MSSV:** 221A290093  
**Giảng viên hướng dẫn:** Quách Anh Dũng  
**Năm:** 2026

## 1. Mục tiêu kiến trúc

Kiến trúc MVP được thiết kế theo hướng dễ triển khai, dễ bảo trì và phù hợp với phạm vi đồ án tốt nghiệp, đồng thời vẫn thể hiện đặc trưng SaaS Multi-tenant.

Mục tiêu chính:

- Tách rõ client, API, business logic, data access và database.
- Đảm bảo cách ly dữ liệu theo `tenantId`/`ownerId`.
- Hỗ trợ các nghiệp vụ cốt lõi: phòng, người thuê, hợp đồng, điện nước, hóa đơn, thanh toán QR thủ công, ticket và dashboard.
- Loại bỏ AI gợi ý phòng, AI gợi ý giá và chatbot khỏi MVP/schema hiện tại.
- Giữ nền tảng mở rộng cho webhook thanh toán, push notification, background job, subscription payment và OCR demo.
- Không dùng realtime dashboard trong MVP; dashboard lấy dữ liệu qua REST API.

## 2. Kiến trúc tổng quan

Hệ thống sử dụng kiến trúc client-server với backend API tập trung. Web Platform, Marketplace và Mobile App gọi REST API đến backend NestJS. Backend xử lý xác thực, phân quyền, nghiệp vụ và truy cập PostgreSQL thông qua Prisma ORM.

### 2.1. Các lớp kiến trúc

| Lớp | Thành phần | Trách nhiệm |
| --- | --- | --- |
| Client Layer | Next.js/React Web, Marketplace Web, React Native Mobile App | Hiển thị giao diện, gọi API, quản lý trạng thái người dùng và form. |
| API Layer | NestJS REST API | Nhận request, xác thực JWT/API key, validate DTO, điều phối nghiệp vụ. |
| Business Layer | Các module NestJS | Xử lý nghiệp vụ phòng, hợp đồng, hóa đơn, thanh toán, ticket, thông báo, dashboard. |
| Data Access Layer | Prisma ORM | Truy vấn PostgreSQL, mapping model, lọc dữ liệu theo tenant. |
| Data Layer | PostgreSQL | Lưu dữ liệu chính của hệ thống. |
| Supporting Layer | QR generator, file storage, Redis/BullMQ, push provider, webhook endpoint, OCR | Hỗ trợ thanh toán QR, ảnh, job nền, push notification, webhook và OCR khi kích hoạt. |

## 3. Mô hình triển khai đề xuất

| Thành phần | Công nghệ đề xuất | Ghi chú |
| --- | --- | --- |
| Web Platform | Next.js/React + Shadcn UI | Dành cho Super Admin, Chủ trọ và Marketplace. |
| Mobile App | React Native/Expo | Dành cho người thuê; có thể demo bằng emulator. |
| Backend API | NestJS modular monolith | Một project backend, chia module theo nghiệp vụ. |
| Database | PostgreSQL | Shared database, shared schema, tách tenant bằng cột `tenantId`. |
| ORM | Prisma | Quản lý schema, migration và generated client. |
| Cache/Queue | Redis/BullMQ | Giữ nền tảng cho job nền, có thể kích hoạt sau. |
| File Storage | Local storage hoặc Cloudinary/S3 | Lưu ảnh phòng, ticket, minh chứng thanh toán, ảnh OCR. |
| Push Notification | FCM/APNs/Web Push | Giữ `DeviceToken` để mở rộng push notification thật. |
| Reverse Proxy | Nginx | Định tuyến web/API khi deploy. |

## 4. Kiến trúc Backend

Backend theo dạng modular monolith. Hiện tại có module auth thật và các module nghiệp vụ sẽ được triển khai dần theo ưu tiên MVP.

| Module | Trách nhiệm |
| --- | --- |
| `AuthModule` | Đăng ký, đăng nhập, OTP, Google OAuth, JWT, refresh token. |
| `UserModule` | Quản lý tài khoản, hồ sơ cá nhân, trạng thái user. |
| `RoleModule`/`RbacModule` | Vai trò, quyền, đồng bộ permission route. |
| `TenantModule` | Tenant/chủ trọ, thành viên tenant, gói đang sử dụng. |
| `PropertyModule` | Quản lý nhà trọ/chung cư mini. |
| `RoomModule` | Quản lý phòng, hình ảnh, tiện ích, trạng thái marketplace. |
| `MarketplaceModule` | API công khai xem/lọc phòng và gửi yêu cầu thuê/xem phòng. |
| `RentalRequestModule` | Xử lý yêu cầu thuê/xem phòng từ marketplace. |
| `RenterModule` | Hồ sơ người thuê và gán người thuê vào phòng/hợp đồng. |
| `ContractModule` | Tạo và quản lý hợp đồng thuê. |
| `MeterModule` | Đồng hồ, chỉ số điện/nước, OCR demo nếu kích hoạt. |
| `InvoiceModule` | Tạo hóa đơn, tính tổng tiền, trạng thái, công nợ. |
| `PaymentModule` | QR thanh toán, xác nhận thủ công, lịch sử thanh toán; giữ webhook log cho tương lai. |
| `TicketModule` | Ticket sự cố, đính kèm, bình luận, trạng thái xử lý. |
| `NotificationModule` | Thông báo nội bộ và nền tảng push notification. |
| `DashboardModule` | Tổng hợp số liệu bằng REST API. |
| `SubscriptionModule` | Gói SaaS, subscription và lịch sử thanh toán gói. |
| `BackgroundJobModule` | Quản lý metadata job nền khi queue được kích hoạt. |
| `AdminModule` | Các chức năng tổng quan cho Super Admin. |

### 4.1. Nguyên tắc API

- REST API theo tài nguyên: `/auth`, `/users`, `/tenants`, `/properties`, `/rooms`, `/contracts`, `/invoices`, `/payments`, `/tickets`.
- API danh sách phải hỗ trợ phân trang, tìm kiếm và lọc.
- Input validate bằng DTO/Zod/class-validator theo pattern của backend.
- API bảo vệ cần JWT, RBAC và kiểm tra tenant.
- Lỗi API cần có định dạng nhất quán để frontend xử lý.

| Nhóm API | Ví dụ endpoint | Mục đích |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` | Xác thực người dùng. |
| Room | `GET /rooms`, `POST /rooms`, `PATCH /rooms/:id` | Quản lý phòng trong tenant. |
| Marketplace | `GET /marketplace/rooms`, `GET /marketplace/rooms/:id` | Hiển thị phòng công khai. |
| Contract | `POST /contracts`, `GET /contracts/:id` | Tạo/xem hợp đồng. |
| Meter | `POST /meter-readings`, `GET /meter-readings` | Nhập/xem chỉ số điện nước. |
| Invoice | `POST /invoices/generate`, `GET /invoices`, `PATCH /invoices/:id/status` | Tạo hóa đơn và quản lý công nợ. |
| Payment | `POST /payments/confirm-request`, `PATCH /payments/:id/approve` | Người thuê gửi xác nhận, chủ trọ duyệt. |
| Payment Webhook | `POST /payment-webhooks/...` | Chưa dùng trong MVP; schema/guard được giữ cho tương lai. |
| Ticket | `POST /tickets`, `PATCH /tickets/:id/status` | Gửi và xử lý sự cố. |
| Dashboard | `GET /dashboard/owner`, `GET /dashboard/admin` | Lấy số liệu tổng quan không realtime. |

## 5. Kiến trúc Frontend và Mobile

| Ứng dụng | Người dùng | Chức năng chính |
| --- | --- | --- |
| Web Super Admin | Super Admin | Quản lý tenant, chủ trọ, gói dịch vụ, thống kê tổng quan, phòng marketplace. |
| Web Chủ trọ | Chủ trọ/Quản lý | Quản lý nhà, phòng, người thuê, hợp đồng, điện nước, hóa đơn, thanh toán, ticket, dashboard. |
| Marketplace Web | Người tìm phòng | Xem danh sách phòng, lọc phòng, xem chi tiết, gửi yêu cầu thuê/xem phòng. |
| Mobile/App người thuê | Người thuê | Xem phòng đang thuê, hợp đồng, hóa đơn, QR, gửi xác nhận, ticket, thông báo. |

Nguyên tắc giao diện:

- Tách layout theo vai trò.
- Tách component dùng chung: bảng, form, modal, empty state, loading, error state.
- Tách service gọi API để dễ bảo trì.
- Dùng state management vừa đủ với quy mô MVP.

## 6. Thiết kế Multi-tenant

MVP dùng shared database và shared schema. Mỗi bảng nghiệp vụ quan trọng cần gắn `tenantId` hoặc có đường liên kết rõ về tenant.

| Thành phần | Cách xử lý |
| --- | --- |
| `tenantId`/`ownerId` | Gắn vào Property, Room, Contract, MeterReading, Invoice, Payment, Ticket, Notification và các bảng nghiệp vụ liên quan. |
| Tenant guard/query scope | Backend lấy tenant hiện tại từ user/tenant member và lọc dữ liệu trước khi trả về. |
| Super Admin | Có thể xem tổng quan toàn hệ thống, hạn chế sửa nghiệp vụ chi tiết nếu không cần. |
| Marketplace | Chỉ trả phòng được public và còn khả dụng. |
| Kiểm thử cách ly | Tạo ít nhất 2 tenant để đảm bảo tenant A không đọc/sửa dữ liệu tenant B. |

## 7. Kiến trúc dữ liệu

Schema hiện tại giữ các model nền tảng sau:

| Nhóm | Model chính | Ghi chú |
| --- | --- | --- |
| Auth/RBAC | `User`, `Device`, `RefreshToken`, `VerificationCode`, `Role`, `Permission`, `RolePermission` | Nền tảng đăng nhập và phân quyền. |
| SaaS | `Tenant`, `TenantMember`, `Plan`, `Subscription`, `SubscriptionPayment` | Giữ thanh toán gói SaaS thật/lịch sử thanh toán. |
| Property/Room | `Property`, `Floor`, `Room`, `RoomImage`, `Amenity`, `RoomAmenity` | Dữ liệu nhà và phòng. |
| Marketplace | `RoomViewLog`, `FavoriteRoom`, `RoomViewingAppointment`, `RentalRequest` | Không dùng AI gợi ý. |
| Contract | `ContractTemplate`, `Contract`, `ContractMember`, `ContractFile`, `ContractTerminationRequest` | Quản lý hợp đồng và thanh lý. |
| Asset/Handover | `AssetCategory`, `RoomAsset`, `HandoverRecord`, `HandoverAssetItem` | Quản lý tài sản và bàn giao. |
| Meter/OCR | `UtilityMeter`, `MeterReading`, `OcrJob` | Nhập tay là chính, OCR là demo/mở rộng. |
| Invoice/Payment | `InvoiceBatch`, `Invoice`, `InvoiceItem`, `Payment`, `PaymentQrCode`, `PaymentWebhookLog` | QR thủ công trong MVP, webhook log giữ để mở rộng. |
| Ticket/Conversation | `Ticket`, `TicketAttachment`, `TicketComment`, `Conversation`, `ConversationMember`, `Message` | Hỗ trợ xử lý sự cố và trao đổi. |
| Trust/Moderation | `Review`, `ReputationScore`, `Report` | Giữ schema, chưa bắt buộc trong MVP cơ bản. |
| Notification/Operation | `Notification`, `DeviceToken`, `BackgroundJob`, `AuditLog`, `SystemSetting` | Thông báo, push token, job nền và audit. |

Đã loại khỏi schema hiện tại:

- `AiRecommendationLog`
- `RoomPriceSuggestion`
- `ChatbotSession`
- `ChatbotMessage`
- Các enum và field plan liên quan AI pricing/chatbot.

## 8. Bảo mật và phân quyền

| Cơ chế | Mô tả |
| --- | --- |
| Password Hashing | Mật khẩu băm hash, không lưu plain text. |
| JWT Authentication | API bảo vệ yêu cầu access token hợp lệ. |
| Refresh Token | Refresh token lưu hash, có thể revoke/rotate. |
| RBAC | Role/permission kiểm tra quyền truy cập API. |
| Tenant isolation | Mỗi query nghiệp vụ cần lọc theo tenant. |
| API key/payment API key | Dùng cho endpoint nội bộ/webhook khi kích hoạt. |
| Soft delete | Dữ liệu quan trọng ưu tiên xóa mềm. |
| Audit log | Lưu thao tác quan trọng để truy vết. |

## 9. Thanh toán QR và webhook tương lai

Trong MVP, thanh toán vẫn là quy trình thủ công:

| Bước | Mô tả |
| --- | --- |
| 1 | Chủ trọ tạo hóa đơn, hệ thống sinh nội dung chuyển khoản/QR. |
| 2 | Người thuê xem QR và chuyển khoản ngoài hệ thống. |
| 3 | Người thuê gửi xác nhận và minh chứng nếu có. |
| 4 | Chủ trọ đối soát giao dịch thực tế. |
| 5 | Chủ trọ duyệt thanh toán, hệ thống cập nhật Payment, Invoice và công nợ. |

`PaymentWebhookLog` và `PaymentApiKeyGuard` được giữ để sau này tích hợp webhook ngân hàng/cổng thanh toán. MVP không tự động cập nhật hóa đơn bằng webhook.

## 10. Dashboard không realtime

Dashboard không dùng WebSocket/SSE trong MVP. Frontend gọi API tổng hợp khi tải trang hoặc bấm làm mới.

| Chỉ số | Nguồn dữ liệu |
| --- | --- |
| Tổng số phòng | `Room` theo tenant. |
| Phòng trống/đang thuê | `Room.status`. |
| Doanh thu tháng | `Payment` đã duyệt hoặc `Invoice` đã thanh toán. |
| Công nợ | `Invoice.totalAmount - Invoice.paidAmount`. |
| Hợp đồng sắp hết hạn | `Contract.endDate` trong khoảng cấu hình. |
| Ticket đang xử lý | `Ticket.status` đang mở/đang xử lý. |
| Phòng marketplace | `Room` được public và khả dụng. |

## 11. Quyết định rút gọn và mở rộng

| Vấn đề | Quyết định hiện tại | Hướng mở rộng |
| --- | --- | --- |
| AI gợi ý phòng | Không triển khai, đã xóa schema. | Thêm lại module recommendation khi có dữ liệu hành vi. |
| AI gợi ý giá | Không triển khai, đã xóa schema. | Thêm lại khi có dữ liệu thị trường và model phân tích. |
| Chatbot | Không triển khai, đã xóa schema. | Thêm module chatbot/FAQ sau MVP. |
| Webhook thanh toán | Chưa kích hoạt trong MVP, giữ schema. | Tích hợp PayOS/VNPay/MoMo/ngân hàng với verify signature và idempotency. |
| Realtime dashboard | Không dùng realtime. | Dùng WebSocket/SSE khi có nhu cầu. |
| Push notification | Giữ `DeviceToken`. | Kích hoạt FCM/APNs/Web Push khi cần. |
| Queue/background job | Giữ `BackgroundJob`. | Dùng BullMQ cho tạo hóa đơn hàng loạt, gửi thông báo, OCR. |
| Subscription payment | Giữ `SubscriptionPayment`. | Tích hợp thanh toán gói SaaS và đối soát. |
| OCR điện/nước | Giữ `OcrJob`, nhập tay là chính. | Kết nối dịch vụ OCR và queue nếu cần. |

## 12. Thứ tự triển khai đề xuất

| Thứ tự | Hạng mục | Kết quả cần đạt |
| --- | --- | --- |
| 1 | Khởi tạo backend, database, Prisma | Project chạy được, schema validate, generate client. |
| 2 | Auth, RBAC, tenant isolation | Đăng nhập, phân quyền, cách ly dữ liệu. |
| 3 | Property, Room, Renter | Quản lý nhà, phòng và người thuê. |
| 4 | Contract, Meter, Invoice | Hoàn thành nghiệp vụ thuê phòng và tạo hóa đơn. |
| 5 | Payment QR manual | Xác nhận thanh toán thủ công và cập nhật công nợ. |
| 6 | Web chủ trọ và Super Admin | Giao diện quản trị nghiệp vụ chính. |
| 7 | Marketplace | Tìm/lọc phòng và gửi yêu cầu thuê/xem phòng. |
| 8 | Mobile/App người thuê | Xem hợp đồng, hóa đơn, thanh toán, ticket. |
| 9 | Dashboard, ticket, notification | Hoàn thiện vận hành và báo cáo. |
| 10 | Mở rộng | OCR, push, queue, webhook, subscription payment. |

## 13. Kết luận

Kiến trúc MVP hiện tại là một NestJS modular monolith kết nối PostgreSQL bằng Prisma, phù hợp cho đồ án và có khả năng mở rộng thành sản phẩm SaaS. Phạm vi đã được thu gọn bằng cách bỏ AI recommendation, AI pricing và chatbot, nhưng vẫn giữ các nền tảng mở rộng quan trọng như webhook thanh toán, push notification, background job, subscription payment và OCR demo.