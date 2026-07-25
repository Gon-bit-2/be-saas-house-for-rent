# Báo cáo đánh giá tiến độ và an toàn dự án

**Dự án:** Nền tảng Web/App quản lý và cho thuê phòng trọ, chung cư mini theo mô hình SaaS & Marketplace  
**Ngày đánh giá:** 22/07/2026  
**Baseline:** Toàn bộ working tree hiện tại, bao gồm thay đổi chưa commit  
**Phạm vi kiểm chứng:** Phân tích tĩnh, build, unit test và lint; không kết nối cơ sở dữ liệu hoặc dịch vụ bên ngoài

## 1. Kết luận điều hành

Backend đã có khối lượng triển khai đáng kể và biên dịch được. Toàn bộ 38 unit test suite hiện có, gồm 135 test, đều vượt qua. Tuy nhiên sản phẩm MVP chưa sẵn sàng nghiệm thu hoặc triển khai vì bốn nguyên nhân chính:

1. `frontend/` và `mobile/` không có mã nguồn hoặc manifest, do đó chưa có luồng người dùng end-to-end.
2. Security review ở trạng thái **BLOCK** với **0 CRITICAL, 7 HIGH và 5 MEDIUM**. Các rủi ro HIGH gồm lộ bình luận ticket nội bộ, race condition trong payment/OTP/refresh token, webhook PayOS thiếu idempotency ở DB, thiếu rate limit và tenant/role context chưa được xác minh lại đầy đủ.
3. Test hiện tại chủ yếu mock repository/service. Chưa có bằng chứng cho tenant isolation, transaction, constraint và authorization pipeline trên PostgreSQL thật.
4. `DashboardModule` có source và unit test nhưng chưa nằm trong `AppModule.imports`, nên các route dashboard hiện không được expose khi chạy ứng dụng.

### 1.1. Tóm tắt trạng thái chức năng

| Trạng thái | Số FR | Ý nghĩa |
| --- | ---: | --- |
| Hoàn thiện backend | 19 | Có controller/service/repository hoặc luồng backend tương ứng và được wiring, nhưng chưa đồng nghĩa đã nghiệm thu end-to-end hay vượt security gate. |
| Hoàn thiện một phần | 6 | Có một phần luồng chính, còn thiếu capability đáng kể so với tiêu chí nghiệm thu. |
| Có code nhưng chưa khả dụng | 2 | Có implementation nhưng chưa được wiring để ứng dụng phục vụ route. |
| Chưa triển khai | 3 | Chỉ có schema/docs hoặc không có mã nguồn. |
| Ngoài MVP | 0 | Không FR-01–FR-30 nào bị loại khỏi tài liệu MVP hiện hành; một số capability phụ như AI/chatbot nằm ngoài danh sách FR. |

Trong 22 yêu cầu mức **Must**, 18 yêu cầu đã có backend core, 2 yêu cầu triển khai một phần, 1 yêu cầu có code nhưng chưa khả dụng và 1 yêu cầu chưa triển khai. Chỉ số này đo mức phủ backend, không phải tỷ lệ hoàn thành sản phẩm.

### 1.2. Mức sẵn sàng theo chiều chất lượng

| Chiều đánh giá | Trạng thái | Nhận định |
| --- | --- | --- |
| Build/TypeScript | Đạt | `npm run build` trả exit code 0. |
| Unit test | Đạt có điều kiện | 38/38 suite, 135/135 test pass; coverage không có threshold bắt buộc. |
| Lint | Không đạt | Lint chỉ đọc thất bại; output hơn 4.600 dòng, phần lớn liên quan Prettier/CRLF nhưng có cả lỗi unsafe typing và unused import. |
| Integration/E2E | Chưa chứng minh | Chỉ có một smoke E2E `GET /`; không chạy vì baseline không dùng DB/dịch vụ thật. |
| Bảo mật và dữ liệu | BLOCK | Còn 7 finding HIGH, gồm rò rỉ dữ liệu và sai lệch sổ công nợ có thể xảy ra. |
| Web/Mobile | Chưa triển khai | Hai thư mục tương ứng đang trống. |
| Sẵn sàng demo MVP | Chưa đạt | Thiếu client, dashboard chưa được wiring và chưa có luồng nghiệp vụ E2E. |

## 2. Phương pháp và quy tắc chấm

### 2.1. Thứ tự ưu tiên bằng chứng

1. Kết quả build/test chạy trên working tree hiện tại.
2. Controller/service/repository được đăng ký trong module và module được import vào `AppModule`.
3. Unit test mô tả hành vi của business logic.
4. Prisma schema/migration.
5. Tài liệu nghiệp vụ và mô tả trạng thái.

Tài liệu `tai_lieu_phan_tich_nghiep_vu_he_thong.md` đang thấp hơn trạng thái source thực tế ở Contract, Invoice, Payment, Ticket, Notification và Dashboard. Vì vậy nhãn trong tài liệu không được dùng thay cho kiểm tra implementation.

### 2.2. Định nghĩa trạng thái

- **Hoàn thiện backend:** Có luồng API/backend cốt lõi và được wiring. Trạng thái này không bảo đảm UI, integration thật hoặc an toàn phát hành.
- **Hoàn thiện một phần:** Có mã thực thi nhưng thiếu một hay nhiều tiêu chí chính của FR.
- **Có code nhưng chưa khả dụng:** Implementation tồn tại nhưng route không được đăng ký trong application graph.
- **Chưa triển khai:** Chỉ có schema/docs hoặc không có source.
- **Ngoài MVP:** Được tài liệu xác định rõ là không thuộc phạm vi MVP.

## 3. Ma trận FR-01–FR-30

| FR | Ưu tiên | Chức năng | Trạng thái | Bằng chứng chính | Phần còn thiếu/rủi ro | Tin cậy |
| --- | --- | --- | --- | --- | --- | --- |
| FR-01 | Must | Đăng ký, đăng nhập, đăng xuất | Hoàn thiện backend | `src/modules/auth/auth.controller.ts:38-151`; token/OTP flow tại `auth.service.ts:95-257`; auth unit spec | OTP/refresh có race condition; chưa có rate limit và E2E auth runtime. | Medium |
| FR-02 | Should | Quản lý hồ sơ cá nhân | Hoàn thiện backend | `GET/PATCH /auth/profile` tại `auth.controller.ts:162-174`; profile service/repository | Chưa có client và API contract E2E. | Medium |
| FR-03 | Must | RBAC và cách ly tenant | Hoàn thiện một phần | Global `AuthenticationGuard` và `RolesGuard` tại `src/app.module.ts:85-97`; `TenantAccessService` tại `src/shared/modules/services/tenant-access.service.ts:21-48` | Tenant bị đình chỉ chưa bị lọc; role/tenant trong JWT có thể lệch context hiện hành; thiếu integration test tenant A/B. | High |
| FR-04 | Must | Quản lý tenant/chủ trọ | Hoàn thiện backend | Tenant routes tại `src/modules/tenants/tenants.controller.ts:19-62`; đăng ký LANDLORD tạo User/Tenant/TenantMember trong transaction tại `auth.repo.ts:110-167` | Chưa kiểm chứng DB thật và trạng thái tenant trong request guard. | High |
| FR-05 | Should | Quản lý gói dịch vụ SaaS | Hoàn thiện một phần | Plan CRUD tại `src/modules/plans/plans.controller.ts:12-32`; gán plan tại `tenants.controller.ts:61`; có `Plan`/`Subscription` schema | Chưa có nghiệp vụ/lịch sử `SubscriptionPayment` hoàn chỉnh. | High |
| FR-06 | Must | Quản lý nhà trọ | Hoàn thiện backend | Property/floor CRUD và soft delete tại `src/modules/properties/properties.controller.ts:20-87`; service spec | Chưa kiểm chứng constraint và soft-delete filtering trên DB thật. | High |
| FR-07 | Must | Quản lý phòng | Hoàn thiện backend | Room/status/amenity/image/soft-delete routes tại `src/modules/rooms/rooms.controller.ts:50-134`; room/image/amenity specs | Repository coverage thấp; Cloudinary thật chưa kiểm chứng. | High |
| FR-08 | Must | Đăng phòng lên Marketplace | Hoàn thiện backend | `PATCH /rooms/:id/marketplace` tại `rooms.controller.ts:86`; marketplace chỉ đọc phòng public/available; room/marketplace specs | Chưa có UI và E2E publish → public listing. | High |
| FR-09 | Must | Tìm kiếm và lọc phòng | Hoàn thiện backend | `GET /marketplace/rooms` tại `src/modules/marketplace/marketplace.controller.ts:21`; query DTO/repository và spec | Chưa kiểm chứng hiệu năng/index với dữ liệu lớn. | High |
| FR-10 | Must | Xem chi tiết phòng | Hoàn thiện backend | `GET /marketplace/rooms/:id` tại `marketplace.controller.ts:27`; room detail select và spec | Chưa có client để nghiệm thu nội dung hiển thị. | High |
| FR-11 | Must | Gửi yêu cầu thuê/xem phòng | Hoàn thiện backend | Public submit tại `marketplace.controller.ts:33-44`; quản lý request/appointment tại `rental-requests.controller.ts` và `viewing-appointments.controller.ts`; service specs | Chưa có journey E2E và notification cho rental request chưa rõ. | High |
| FR-12 | Must | Quản lý người thuê | Hoàn thiện một phần | `GET/PATCH /renters/me`, list/detail landlord tại `src/modules/renters/renters.controller.ts:17-36` | Không có API landlord tạo/cập nhật/gán người thuê; chưa quản lý `RentalHistory`. | High |
| FR-13 | Must | Quản lý hợp đồng | Hoàn thiện backend | Contract CRUD/activate/cancel và renter view tại `src/modules/contracts/contracts.controller.ts:12-64`; contract service spec | Contract file, termination request, handover chưa có nghiệp vụ hoàn chỉnh; transaction thật chưa kiểm chứng. | High |
| FR-14 | Should | Hợp đồng sắp hết hạn | Có code nhưng chưa khả dụng | Dashboard repository/service có metric và spec; `DashboardModule` được import tại `src/app.module.ts:16` | Module không nằm trong `AppModule.imports` dòng 54-83 nên route chưa tồn tại khi chạy app. | High |
| FR-15 | Must | Cấu hình điện nước/dịch vụ | Hoàn thiện backend | Utility meter CRUD/status tại `src/modules/utility-meters/utility-meters.controller.ts:18-47`; utility specs | Phần phí dịch vụ tổng quát chưa có module độc lập; DB integration chưa kiểm chứng. | High |
| FR-16 | Must | Nhập chỉ số điện/nước | Hoàn thiện backend | Meter reading CRUD/status tại `meter-readings.controller.ts:18-47`; test chỉ số mới nhỏ hơn chỉ số cũ và kỳ trùng | Chưa kiểm chứng locking/concurrency và constraint DB. | High |
| FR-17 | Could | OCR điện/nước demo | Chưa triển khai | Có model `OcrJob` và `ReadingSource.OCR` trong Prisma | Không có module/controller/service OCR. | High |
| FR-18 | Must | Tạo hóa đơn tháng | Hoàn thiện backend | `POST /invoices` tại `src/modules/invoices/invoices.controller.ts:52`; invoice service/repository và specs | Chưa có E2E meter → invoice trên PostgreSQL. | High |
| FR-19 | Must | Trạng thái hóa đơn | Hoàn thiện backend | Issue/cancel/overdue routes tại `invoices.controller.ts:58-81`; invoice specs | Chưa kiểm chứng concurrent state transition. | High |
| FR-20 | Must | Theo dõi công nợ | Hoàn thiện backend | `GET /invoices/debts` tại `invoices.controller.ts:34`; Debt model và logic cập nhật khi payment được duyệt | Race payment có thể làm sai `paidAmount`/`debtAmount`. | High |
| FR-21 | Must | Thanh toán QR thủ công | Hoàn thiện backend | QR và confirmation tại `src/modules/payments/payments.controller.ts:22-47`; PayOS adapter và payment specs | PayOS thật chưa kiểm chứng; webhook thiếu idempotency DB. | Medium |
| FR-22 | Must | Lịch sử thanh toán | Hoàn thiện backend | List/detail/approve/reject tại `payments.controller.ts:48-67`; payment repository cập nhật invoice/debt | Concurrent approve/reject có thể ghi sai sổ; chưa có integration test. | Medium |
| FR-23 | Must | Ticket sự cố | Hoàn thiện backend | Ticket lifecycle/comment/attachment tại `src/modules/tickets/tickets.controller.ts:16-78`; ticket specs | Security gate BLOCK: renter có thể nhận cả comment nội bộ và PII staff. | High |
| FR-24 | Should | Thông báo | Hoàn thiện một phần | Internal notification, unread/read-all và device token tại `src/modules/notifications/notifications.controller.ts:7-46`; gateway/processor/Firebase provider tồn tại | Chưa thấy event rental request; Redis/BullMQ/Firebase/Socket.IO thật chưa kiểm chứng. | Medium |
| FR-25 | Must | Dashboard chủ trọ | Có code nhưng chưa khả dụng | `summary`, `revenue-trend`, `recent-activity` tại `src/modules/dashboard/dashboard.controller.ts:9-25`; service/repository specs | `DashboardModule` chưa được thêm vào `AppModule.imports`. | High |
| FR-26 | Should | Dashboard Super Admin | Chưa triển khai | Không có controller/service dashboard cấp platform | Dashboard hiện chỉ phục vụ LANDLORD/MANAGER/ACCOUNTANT. | High |
| FR-27 | Must | Khóa/mở tài khoản chủ trọ | Hoàn thiện backend | Admin routes tại `src/modules/users/users.controller.ts:10-25`; controller/service specs | Access token guard không truy vấn lại user status; tài khoản bị khóa có thể còn dùng token đến khi hết hạn. | High |
| FR-28 | Should | Quản lý Marketplace cơ bản | Hoàn thiện một phần | Super Admin có thể dùng public marketplace list | Không có API quản trị/thống kê marketplace riêng. | Medium |
| FR-29 | Must | Mobile/App người thuê | Chưa triển khai | `mobile/` không có source hoặc manifest | Toàn bộ user journey mobile chưa có. | High |
| FR-30 | Should | Xóa mềm và lịch sử | Hoàn thiện một phần | Property/room có soft delete; nhiều model có audit fields | `AuditLog` chỉ có schema; chưa có module ghi/xem audit đồng bộ cho dữ liệu quan trọng. | High |

### 3.1. Chức năng ngoài core hoặc chỉ có schema

- AI gợi ý phòng, AI gợi ý giá và chatbot đã được loại khỏi MVP hiện hành.
- `RoomAsset`, handover, review, reputation và report vi phạm mới chủ yếu ở mức schema/docs.
- Background job đã được dùng trong notification dù tài liệu cũ mô tả là nền tảng mở rộng.
- Payment webhook đã có code dù tài liệu MVP nói chưa kích hoạt trong luồng chính.

## 4. Kết quả kiểm thử và chất lượng

| Loại | Lệnh | Kết quả | Cách diễn giải |
| --- | --- | --- | --- |
| Unit + coverage | `npm run test:cov -- --runInBand` | PASS, 38/38 suite, 135/135 test, 0 snapshot; Jest 18,395 giây | Chứng minh một phần business logic cô lập; không chứng minh DB/guard/network runtime. |
| Build | `npm run build` | PASS, exit code 0 | Source TypeScript hiện biên dịch được. |
| Lint chỉ đọc | `npx eslint "src/**/*.ts" "test/**/*.ts"` | FAIL | Phần lớn output là format/CRLF; vẫn có unsafe assignment/call, unused import và unhandled bootstrap promise. |
| E2E | `npm run test:e2e` | Không chạy theo baseline | E2E duy nhất là smoke `GET /`; khởi tạo `AppModule` và có thể kéo DB/Redis/dịch vụ ngoài. |

### 4.1. Khoảng trống kiểm thử quan trọng

- Không có integration test riêng với PostgreSQL/Prisma.
- Repository nghiệp vụ phần lớn có coverage 0%; dashboard repository là ngoại lệ có spec.
- Không có test runtime đáng tin cậy cho access-token guard, roles guard, tenant context và permission cache.
- `tickets` có coverage quan sát được khoảng 26% statements; controller/repository chưa được phủ.
- `rooms` khoảng 64% statements; `properties.service` khoảng 55% statements.
- Notification gateway/processor/Firebase, PayOS/network callback, Redis/BullMQ và Cloudinary chưa được chứng minh.
- Controller test kiểm tra decorator bằng reflection không tương đương kiểm thử authorization qua HTTP pipeline.
- Không có coverage threshold, nên suite vẫn xanh khi module có coverage thấp.

## 5. Kiểm toán bảo mật và tính toàn vẹn dữ liệu

**Kết quả:** `BLOCK` — chưa sẵn sàng QA tích hợp hoặc triển khai trước khi xử lý toàn bộ finding HIGH.

### 5.1. Findings mức HIGH

| ID | Finding và bằng chứng | Tác động/điều kiện | Hướng xử lý |
| --- | --- | --- | --- |
| SEC-H01 | **Renter đọc được bình luận ticket nội bộ.** `ticketCommentSelect` trả `isInternal`, message và email user tại `src/modules/tickets/repositories/tickets.repo.ts:15-23`; cùng `ticketSelect` được dùng cho `findUserTicket` dòng 128-135. | Người thuê gọi list/detail ticket có thể nhận ghi chú nội bộ và PII staff. Xác nhận bằng phân tích data projection. | Tách select renter/staff; renter chỉ nhận comment `isInternal=false`; loại email/phone không cần thiết; thêm integration test list/detail. |
| SEC-H02 | **Race duyệt/từ chối payment.** Precheck PENDING ở `payments.service.ts:124-154` nằm ngoài transaction; repository đọc/update không ràng `status=PENDING` tại `payments.repo.ts:303-383`. | Hai request đồng thời có thể cộng tiền hai lần hoặc reject ghi đè approve, làm sai invoice/debt. | Dùng CAS `updateMany where id, tenantId, status=PENDING`, yêu cầu `count=1`; serialize/lock invoice khi tính tổng; test approve/approve và approve/reject song song. |
| SEC-H03 | **Webhook PayOS không idempotent ở DB.** `findPaymentByProviderReference` rồi `create` tại `payments.repo.ts:242-276`; schema chỉ index `transactionCode`, không unique. | Hai webhook retry/đồng thời có thể tạo nhiều Payment cho một giao dịch. | Thêm unique composite `(provider, transactionCode)` hoặc provider reference chuẩn; dùng upsert/insert-on-conflict trong transaction. |
| SEC-H04 | **OTP one-time có thể được dùng đồng thời.** Đọc code hợp lệ, bcrypt compare rồi update theo `id` tại `auth.service.ts:496-515` và `auth.repo.ts:439-480`. | Hai request đồng thời đều có thể vượt verify và thực hiện reset/register/login. | Consume bằng conditional update/CAS với `consumedAt=null`, `invalidatedAt=null`, expiry/attempts hợp lệ; chỉ tiếp tục khi đúng một row được cập nhật. |
| SEC-H05 | **Refresh-token rotation có thể phát hành nhiều successor.** Find valid → revoke → issue tách bước tại `auth.service.ts:215-230`; kết quả `updateMany` revoke không được kiểm tra. | Replay song song có thể phát hành nhiều token pair từ cùng refresh token. | Atomic conditional revoke + tạo successor trong transaction; kiểm tra count; cân nhắc token family/reuse detection. |
| SEC-H06 | **Không có rate limit cho auth/OTP public.** Các endpoint public tại `auth.controller.ts:38-139`; `AppModule` không cấu hình `ThrottlerModule`/guard. | Brute force mật khẩu/OTP, credential stuffing, email bombing và tiêu hao bcrypt/email. | Global distributed rate limit, quota riêng IP/email/device, cooldown resend, lockout tăng dần và response chống enumeration. |
| SEC-H07 | **JWT role không gắn và không được đối chiếu với tenant hiện hành.** Token chọn `tenantMembers[0]` tại `auth.service.ts:282-297`; permission guard chỉ tra role tại `access-token.guard.ts:175-217`; tenant resolver không lọc `tenant.status` tại `tenant-access.service.ts:21-48`. | User bị ban/downgrade hoặc tenant đình chỉ có thể dùng token cũ; user nhiều tenant có thể mang role của tenant này vào context tenant khác. | Tenant context tường minh; token/request mang `tenantId`/`memberId`; guard xác minh User, Tenant, TenantMember đều ACTIVE và role khớp; cache ngắn có invalidation khi đổi quyền. |

### 5.2. Findings mức MEDIUM

| ID | Finding và bằng chứng | Tác động/điều kiện | Hướng xử lý |
| --- | --- | --- | --- |
| SEC-M01 | **`verify-otp` tự consume code trước bước tiếp theo.** `auth.service.ts:240-248` cho thấy verify riêng và forgot-password cùng consume OTP. | Client gọi đúng chuỗi verify → submit sẽ nhận lỗi OTP đã dùng. | Bỏ endpoint verify riêng hoặc trả challenge token one-time cho bước kế tiếp. |
| SEC-M02 | **Thiếu security headers và CORS allowlist runtime.** `src/main.ts:5-8` chỉ gắn Zod pipe/listen; package/config có Helmet/CORS nhưng không dùng. | Thiếu hardening HTTP; policy cross-origin không rõ hoặc không hoạt động như cấu hình gợi ý. | Bật Helmet; parse allowlist từ `CORS_ORIGINS`; giới hạn methods/headers/credentials và fail closed theo môi trường. |
| SEC-M03 | **Google OAuth/userinfo không có timeout/cancellation.** Native fetch và OAuth call tại `auth.service.ts:320-336` không có abort/timeout. | Upstream treo có thể giữ socket và làm cạn tài nguyên. | Dùng `AbortSignal.timeout`, timeout cấu hình và retry giới hạn cho lỗi transient/idempotent. |
| SEC-M04 | **Lưu nguyên webhook có PII ngân hàng.** Payment webhook model/service lưu payload chứa tên/số tài khoản vào JSON. | Tăng phạm vi PII khi DB/log export bị truy cập; không thấy retention/redaction. | Allowlist trường cần đối soát, mask/mã hóa dữ liệu nhạy cảm, TTL/retention và audit quyền đọc. |
| SEC-M05 | **Ticket list hydrate relation không giới hạn.** Root ticket có pagination nhưng `comments`/`attachments` lấy toàn bộ tại `tickets.repo.ts:25-47`. | User có thể tạo nhiều relation làm payload/query/memory tăng mạnh. | Không hydrate relation trong list; pagination/cap comment và attachment; quota/rate limit create. |

### 5.3. Secrets và cấu hình

- Không phát hiện secret/config nhạy cảm đang được Git track theo kiểm tra hiện tại.
- `.env` và `src/secrets/firebase-service-account.json` tồn tại local nhưng đang ignored/untracked; báo cáo không đọc hoặc ghi lại giá trị.
- Env schema đang dùng nhiều `z.string()` cho secret nên chuỗi rỗng vẫn hợp lệ; nên dùng `.min(1)` và yêu cầu độ dài/entropy tối thiểu cho JWT/API secret.

## 6. Đề xuất thay đổi interface và dữ liệu

Báo cáo này không sửa API/schema/type. Các thay đổi dưới đây cần được thiết kế và migration trong đợt triển khai riêng:

| Bề mặt | Đề xuất |
| --- | --- |
| Access token/tenant context | Bổ sung `tenantId` và `memberId` vào tenant-scoped token hoặc cơ chế chọn tenant tường minh; guard phải đối chiếu user/tenant/membership/role hiện hành. |
| Payment transition | Repository expose thao tác CAS PENDING → SUCCESS/FAILED và trả lỗi conflict nếu transition đã được xử lý. |
| PayOS idempotency | Thêm unique composite cho provider + transaction reference và chuyển create sang upsert/insert-on-conflict. |
| Ticket response | Tách response DTO/select giữa renter và staff; renter không nhận internal comment hoặc PII nhân viên không cần thiết. |
| OTP/refresh | Thao tác consume/rotate trả kết quả atomic để service chỉ phát hành token hoặc tiếp tục flow khi đúng một record được chuyển trạng thái. |

## 7. Lộ trình cải thiện

### P0 — Chặn rò rỉ và sai dữ liệu

1. Sửa SEC-H01–SEC-H07 và thêm regression test tương ứng.
2. Đăng ký `DashboardModule` trong `AppModule.imports` và thêm route smoke test.
3. Bắt buộc tenant status ACTIVE, membership ACTIVE và role đúng tenant trên mọi request tenant-scoped.
4. Dùng transaction/CAS/unique constraint cho payment, webhook, OTP và refresh-token rotation.
5. Bật rate limiting, Helmet và CORS allowlist.

### P1 — Hoàn thiện khả năng nghiệm thu MVP

1. Xây integration test PostgreSQL/Prisma cho tenant A/B, soft delete, constraint và transaction.
2. Xây E2E cho luồng marketplace → rental request → contract → meter reading → invoice → payment → ticket/notification.
3. Hoàn thiện API landlord quản lý renter, rental history, contract file/termination và subscription payment.
4. Hoàn thiện Super Admin dashboard/marketplace management.
5. Triển khai web quản trị/marketplace và mobile hoặc giao diện người thuê cho FR-29.
6. Kiểm thử adapter PayOS, Redis/BullMQ, Firebase, Cloudinary và SMTP bằng môi trường test tách biệt.

### P2 — Nâng quality gate và đồng bộ tài liệu

1. Dọn lint baseline để lint trở thành quality gate đáng tin cậy; tách lỗi format khỏi lỗi type-safety.
2. Đặt coverage threshold theo module; ưu tiên guard, repository, ticket, room, property, notification và payment.
3. Tách E2E khỏi dịch vụ thật bằng test infrastructure hoặc adapter giả.
4. Cập nhật `tai_lieu_phan_tich_nghiep_vu_he_thong.md`, `ad.md` và tài liệu kiến trúc theo source hiện tại, đặc biệt Contract/Invoice/Payment/Ticket/Notification/Dashboard, webhook và background job.
5. Bổ sung retention, redaction, encryption và audit policy cho PII/webhook log.

## 8. Tiêu chí thoát BLOCK

Hệ thống chỉ nên chuyển từ BLOCK sang sẵn sàng QA tích hợp khi:

- Cả 7 finding HIGH được sửa và có regression test.
- Dashboard routes thực sự được expose.
- Tenant A không thể đọc/ghi dữ liệu tenant B qua HTTP và Prisma integration test.
- Concurrent payment/webhook/OTP/refresh test chứng minh invariant dữ liệu.
- Build, unit, lint và security regression suite đều pass.

Hệ thống chỉ nên được coi là hoàn thành MVP khi bổ sung thêm:

- Web/mobile client đủ cho các user journey trong tiêu chí MVP.
- E2E nghiệp vụ cốt lõi chạy qua API và database thật trong môi trường test.
- Các dịch vụ ngoài quan trọng được kiểm thử bằng sandbox/test credentials.
- Tài liệu trạng thái khớp implementation đã phát hành.

## 9. Giới hạn đánh giá

- Không kết nối PostgreSQL, Redis hoặc áp migration.
- Không gọi PayOS, Firebase, Cloudinary, SMTP hay Google OAuth thật.
- Không chạy E2E vì baseline đã chọn static + test sẵn có không phụ thuộc dịch vụ thật.
- Không đánh giá UX, accessibility hoặc performance client vì frontend/mobile trống.
- Báo cáo phản ánh working tree local ngày 22/07/2026, không phản ánh riêng commit `HEAD`.
- Line reference có thể thay đổi sau khi source được format hoặc chỉnh sửa.

## 10. Kết luận cuối

Backend core đã đi xa hơn tài liệu trạng thái cũ và có nền tảng nghiệp vụ tương đối rộng. Điểm mạnh là module hóa rõ, build thành công và unit suite hiện có đều xanh. Tuy nhiên chưa thể tuyên bố dự án hoàn thiện hoặc an toàn dữ liệu: client chưa tồn tại, dashboard chưa được wiring, kiểm thử vẫn thiên về mock, và các finding HIGH có thể gây lộ dữ liệu hoặc sai sổ tài chính trong điều kiện thực tế.

Thứ tự hợp lý là đóng P0 trước, xây integration/E2E và client ở P1, rồi chuẩn hóa quality gate/tài liệu ở P2. Việc phát triển thêm tính năng mới trước khi xử lý P0 sẽ làm tăng rủi ro sửa lại và khó xác minh tính đúng đắn của dữ liệu.
