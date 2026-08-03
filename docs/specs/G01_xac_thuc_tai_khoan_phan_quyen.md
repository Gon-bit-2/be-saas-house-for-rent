# G01 - Đặc tả xác thực, tài khoản và phân quyền

> **Snapshot 31/07/2026:** Auth/OTP/Google OAuth/access-refresh token/profile/RBAC đã có API. OTP được consume atomically trong action cuối; refresh rotation có replay detection; global/auth rate limit, Helmet/CORS và tenant-context revalidation đã được nạp. Cần kiểm chứng multi-node/provider và E2E PostgreSQL trước production.

## 1. Tổng quan

Tài liệu này mô tả nhóm tính năng G01 của backend: xác thực, tài khoản, OTP, Google OAuth, JWT, refresh token, RBAC và tenant context. Mục tiêu là để người đọc biết cách sử dụng API, biết request nào cần token, request nào cần quyền, và hiểu backend kiểm tra quyền truy cập như thế nào trước khi cho vào nghiệp vụ.

G01 là nền bảo mật dùng chung cho các nhóm nghiệp vụ còn lại. Các module như nhà trọ, phòng, hợp đồng, hóa đơn, thanh toán, ticket và dashboard không tự quyết định danh tính người gọi. Chúng nhận danh tính đã được xác thực từ guard và chỉ xử lý dữ liệu trong phạm vi role hoặc tenant hợp lệ.

Phạm vi thuộc G01:

| Mảng | Chức năng |
| --- | --- |
| Xác thực | Đăng ký, đăng nhập OTP 2 bước, Google OAuth, refresh token, đăng xuất |
| Tài khoản | Xem hồ sơ, cập nhật hồ sơ, trạng thái tài khoản |
| OTP | Gửi OTP, kiểm tra OTP, giới hạn số lần thử, đánh dấu OTP đã dùng |
| Token | Access token, refresh token, refresh token rotation, revoke token |
| Phân quyền | Role, permission theo route/method, role decorator |
| Tenant context | Xác định user đang thao tác trong tenant nào qua `x-tenant-id` |

Không thuộc G01:

| Ngoài phạm vi | Nhóm tài liệu phụ trách |
| --- | --- |
| Quản lý gói SaaS, subscription, subscription payment | G02 |
| Quản lý phòng, nhà trọ, marketplace | G03, G04 |
| Hợp đồng, hóa đơn, thanh toán, ticket | G05, G07, G08, G09 |
| Dashboard và báo cáo | G11 |

## 2. Thuật ngữ và vai trò

### 2.1. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
| --- | --- |
| Access token | JWT ngắn hạn dùng để gọi API bảo vệ qua header `Authorization: Bearer <accessToken>`. |
| Refresh token | Token dài hạn dùng để lấy cặp token mới. Backend chỉ lưu hash của refresh token. |
| Token pair | Cặp `{ accessToken, refreshToken }` trả về sau khi đăng nhập, Google session hoặc refresh token thành công. |
| OTP | Mã xác thực 6 chữ số gửi qua email, dùng cho đăng ký, đăng nhập và quên mật khẩu. |
| RBAC | Cơ chế phân quyền dựa trên role và permission. |
| Permission | Quyền truy cập một route cụ thể, theo format `path_method`, ví dụ `/auth/profile_GET`. |
| Principal | Thông tin người gọi đã được backend xác thực và gắn vào request. |
| Tenant context | Ngữ cảnh tenant hiện tại, lấy từ header `x-tenant-id` với các API vận hành của chủ trọ/nhân viên. |
| Public endpoint | API có decorator public, không cần Bearer token. |
| Protected endpoint | API mặc định cần Bearer token nếu không khai báo public. |

### 2.2. Vai trò người dùng

| Role | Ý nghĩa | Ngữ cảnh sử dụng |
| --- | --- | --- |
| `ADMIN` | Super Admin quản trị toàn bộ nền tảng. | Quản lý user, tenant, gói dịch vụ, dữ liệu cấp hệ thống. |
| `LANDLORD` | Chủ trọ, chủ sở hữu tenant. | Quản lý dữ liệu vận hành trong tenant. |
| `MANAGER` | Quản lý nhà trọ. | Thao tác vận hành trong tenant theo permission được cấp. |
| `ACCOUNTANT` | Nhân sự kế toán. | Thường xử lý hóa đơn, công nợ, thanh toán trong tenant. |
| `MAINTENANCE_STAFF` | Nhân sự bảo trì. | Thường xử lý ticket/sự cố trong tenant. |
| `TENANT` | Người thuê hoặc người tìm phòng. | Marketplace, hồ sơ người thuê, hợp đồng, hóa đơn, thanh toán, ticket cá nhân. |

### 2.3. Các nguồn xác định quyền

Backend không chỉ nhìn một field duy nhất để quyết định quyền. Các khái niệm sau cần phân biệt rõ:

| Nguồn | Nằm ở đâu | Dùng để làm gì |
| --- | --- | --- |
| `User.systemRole` | Bảng `User` | Xác định quyền cấp hệ thống, ví dụ `ADMIN`. |
| `RenterProfile` | Quan hệ của `User` | Xác định user có thể hoạt động như người thuê `TENANT`. |
| `TenantMember.roleId` | Bảng `TenantMember` | Xác định role của user trong một tenant cụ thể, ví dụ `LANDLORD`, `MANAGER`. |
| `AccessTokenPayload.roleName` | Principal trên request | Role đã được guard phân giải cho request hiện tại. |
| `AccessTokenPayload.tenantId` | Principal trên request | Tenant hiện tại sau khi backend kiểm tra `x-tenant-id`. |

Access token hiện tại chỉ chứa danh tính nền tảng như `userId` và `ver=2`. Role và tenant context được `AccessTokenGuard` phân giải lại từ database ở mỗi request bảo vệ.

## 3. API đặc tả

Mặc định mọi endpoint đều là protected và cần Bearer token, trừ khi controller/handler khai báo public. Với API tenant-scoped của nhóm chủ trọ/nhân viên, ngoài Bearer token còn cần header `x-tenant-id`.

### 3.1. Auth API

| Endpoint | Loại | Quyền | Request chính | Response chính | Mục đích |
| --- | --- | --- | --- | --- | --- |
| `POST /auth/send-otp` | Public | Không cần token | `email`, `type` | `message` | Gửi OTP cho đăng ký, đăng nhập hoặc quên mật khẩu. |
| `POST /auth/register` | Public | Không cần token | `email`, `passwordHash`, `confirmPassword`, `fullName`, `phone?`, `code`, `roleCode` | User không gồm password | Đăng ký tài khoản mới sau khi xác minh OTP. |
| `POST /auth/login` | Public | Không cần token | `email`, `passwordHash`, `code?` | Bước 1: `message`; bước 2: token pair | Đăng nhập bằng email/mật khẩu và OTP. |
| `POST /auth/refresh-token` | Public | Không cần access token | `refreshToken` | Token pair mới | Rotate refresh token và cấp token mới. |
| `POST /auth/logout` | Protected | User đã đăng nhập | `refreshToken` | `message` | Revoke refresh token hiện tại. |
| `POST /auth/forgot-password` | Public | Không cần token | `email`, `code`, `newPassword`, `confirmNewPassword` | `message` | Đặt lại mật khẩu bằng OTP. |
| `GET /auth/google/url` | Public | Không cần token | Không có body | `{ url }` | Lấy URL để chuyển người dùng sang Google OAuth. |
| `GET /auth/google/callback` | Public | Google gọi về | `code`, `state`, `error?` query | Redirect frontend | Xử lý callback Google và tạo `sessionToken` dùng một lần. |
| `POST /auth/google/session` | Public | Không cần token | `sessionToken` | Token pair | Đổi Google session token lấy access/refresh token. |
| `GET /auth/profile` | Protected | User đã đăng nhập | Bearer token | User profile | Lấy hồ sơ user hiện tại. |
| `PATCH /auth/profile` | Protected | User đã đăng nhập | `fullName?`, `phone?`, `avatarUrl?` | User profile | Cập nhật hồ sơ user hiện tại. |

### 3.2. User Admin API

Các API này dành cho `ADMIN`. `RolesGuard` cho phép `ADMIN` truy cập nếu access token hợp lệ và permission tương ứng tồn tại.

| Endpoint | Loại | Quyền | Request chính | Response chính | Mục đích |
| --- | --- | --- | --- | --- | --- |
| `GET /users/landlords` | Protected | `ADMIN` | `page?`, `limit?`, `search?`, `status?` | Danh sách phân trang | Xem danh sách tài khoản chủ trọ. |
| `GET /users/:id` | Protected | `ADMIN` | `id` path | User detail | Xem chi tiết người dùng. |
| `PATCH /users/:id/status` | Protected | `ADMIN` | `status` | User detail | Khóa, mở hoặc cập nhật trạng thái user. |

`status` của user nhận các giá trị: `ACTIVE`, `INACTIVE`, `BANNED`.

### 3.3. Tenant Admin API liên quan G01

Các API tenant admin thuộc G02 về mặt nghiệp vụ SaaS, nhưng được nhắc trong G01 vì chúng ảnh hưởng trực tiếp tới quyền truy cập và tenant context.

| Endpoint | Loại | Quyền | Request chính | Response chính | Mục đích |
| --- | --- | --- | --- | --- | --- |
| `GET /tenants` | Protected | `ADMIN` | `page?`, `limit?`, `search?`, `status?`, `verificationStatus?`, `planId?` | Danh sách phân trang | Xem danh sách tenant. |
| `GET /tenants/:id` | Protected | `ADMIN` | `id` path | Tenant detail | Xem chi tiết tenant. |
| `POST /tenants` | Protected | `ADMIN` | Thông tin owner, tenant, plan | Tenant detail | Tạo tài khoản chủ trọ kèm tenant. |
| `PATCH /tenants/:id` | Protected | `ADMIN` | `name?`, `taxCode?`, `phone?`, `email?`, `address?` | Tenant detail | Cập nhật thông tin tenant. |
| `PATCH /tenants/:id/status` | Protected | `ADMIN` | `status` | Tenant detail | Cập nhật trạng thái tenant. |
| `PATCH /tenants/:id/verification` | Protected | `ADMIN` | `verificationStatus` | Tenant detail | Cập nhật trạng thái xác minh tenant. |
| `PATCH /tenants/:id/plan` | Protected | `ADMIN` | `planId`, `billingCycle?`, `autoRenew?` | Subscription/Tenant detail | Gán gói cho tenant. |

`status` của tenant nhận các giá trị: `ACTIVE`, `SUSPENDED`, `CLOSED`.

`verificationStatus` nhận các giá trị: `UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED`.

## 4. Luồng xử lý

### 4.1. Luồng đăng ký bằng email OTP

Điều kiện bắt đầu: người dùng có email hợp lệ và muốn tạo tài khoản `LANDLORD` hoặc `TENANT`.

Các bước:

1. Frontend gọi `POST /auth/send-otp` với `type=REGISTER`.
2. Backend tạo OTP 6 chữ số, hash OTP và lưu vào `VerificationCode`.
3. Nếu còn OTP cũ cùng email/type chưa dùng và chưa hết hạn, backend đánh dấu OTP cũ là `invalidatedAt`.
4. Backend gửi OTP qua email.
5. Người dùng nhập OTP, frontend gọi `POST /auth/register`.
6. Backend kiểm OTP mới nhất còn hiệu lực, chưa dùng, chưa bị vô hiệu hóa và chưa vượt quá số lần thử.
7. Backend kiểm email chưa tồn tại.
8. Backend hash mật khẩu rồi tạo `User`.
9. Nếu `roleCode=LANDLORD`, backend tạo thêm `Tenant` và `TenantMember` role `LANDLORD`.
10. Nếu `roleCode=TENANT`, backend tạo `RenterProfile`.
11. Backend đánh dấu email đã xác minh và trả về thông tin user không gồm mật khẩu.

Kết quả thành công: tài khoản được tạo, email được verified, user có đúng ngữ cảnh ban đầu là chủ trọ hoặc người thuê.

Lỗi thường gặp:

| Tình huống | Kết quả |
| --- | --- |
| OTP sai | `BadRequest` với thông báo OTP không đúng. |
| OTP hết hạn/đã dùng/bị vô hiệu hóa | `BadRequest` với thông báo OTP không tồn tại hoặc hết hạn. |
| Nhập sai quá số lần cho phép | OTP bị vô hiệu hóa, cần xin OTP mới. |
| Email đã tồn tại | `UnprocessableEntity` hoặc `Conflict` tùy luồng tạo tài khoản. |
| Mật khẩu không đủ mạnh hoặc confirm không khớp | Lỗi validation từ Zod DTO. |

### 4.2. Luồng đăng nhập 2 bước bằng OTP

Điều kiện bắt đầu: tài khoản đã tồn tại, chưa bị khóa và có mật khẩu hợp lệ.

Các bước:

1. Frontend gọi `POST /auth/login` với `email` và `passwordHash`, chưa gửi `code`.
2. Backend chuẩn hóa email, tìm user chưa xóa mềm.
3. Backend từ chối nếu user không tồn tại, mật khẩu sai hoặc `status` khác `ACTIVE`.
4. Backend tạo OTP loại `LOGIN`, lưu hash và gửi email.
5. Backend trả message yêu cầu nhập OTP.
6. Frontend gọi lại `POST /auth/login` với `email`, `passwordHash`, `code`.
7. Backend kiểm lại email/mật khẩu và kiểm OTP.
8. Backend tạo access token `ver=2` và refresh token.
9. Backend hash refresh token, lưu kèm `userAgent`, `ip`, `expiresAt`.
10. Backend cập nhật `lastLoginAt`.

Kết quả thành công: frontend nhận `{ accessToken, refreshToken }`.

Lỗi thường gặp:

| Tình huống | Kết quả |
| --- | --- |
| Email hoặc mật khẩu sai | `Unauthorized`. |
| Tài khoản `INACTIVE` hoặc `BANNED` | `Unauthorized`. |
| OTP sai/hết hạn | `BadRequest`. |

### 4.3. Luồng refresh token rotation

Điều kiện bắt đầu: frontend có refresh token còn hạn.

Các bước:

1. Frontend gọi `POST /auth/refresh-token` với `refreshToken`.
2. Backend verify chữ ký và hạn của refresh token.
3. Backend tìm user theo `userId` trong token và yêu cầu user đang `ACTIVE`.
4. Backend tạo token pair mới.
5. Backend hash refresh token cũ.
6. Backend trong transaction tìm refresh token cũ còn hiệu lực, chưa revoke và thuộc user hiện tại.
7. Backend revoke refresh token cũ với lý do `Token rotation`.
8. Backend lưu hash refresh token mới.
9. Nếu token cũ không còn hợp lệ, backend ghi cảnh báo replay và từ chối.

Kết quả thành công: refresh token cũ không dùng lại được; frontend phải thay cả access token và refresh token bằng cặp mới.

Lỗi thường gặp:

| Tình huống | Kết quả |
| --- | --- |
| Refresh token hết hạn | `Unauthorized`. |
| Refresh token đã bị revoke | `Unauthorized`. |
| Refresh token cũ bị dùng lại | `Unauthorized`, backend ghi log `security_event=refresh_replay`. |
| User bị khóa sau khi token được cấp | `Unauthorized`. |

### 4.4. Luồng đăng xuất

Điều kiện bắt đầu: user đang đăng nhập và còn refresh token đang lưu ở client.

Các bước:

1. Frontend gọi `POST /auth/logout` với Bearer access token và body `refreshToken`.
2. Backend hash refresh token.
3. Backend cập nhật `revokedAt` và `revokedReason=User logout` cho refresh token nếu token đang còn hiệu lực.
4. Backend trả message đăng xuất thành công.

Kết quả thành công: refresh token bị revoke và không thể dùng để refresh nữa. Frontend nên xóa access token và refresh token khỏi client storage.

### 4.5. Luồng quên mật khẩu

Điều kiện bắt đầu: user quên mật khẩu nhưng còn truy cập được email.

Các bước:

1. Frontend gọi `POST /auth/send-otp` với `type=FORGOT_PASSWORD`.
2. Người dùng nhập OTP và mật khẩu mới.
3. Frontend gọi `POST /auth/forgot-password`.
4. Backend kiểm OTP loại `FORGOT_PASSWORD`.
5. Backend tìm user theo email.
6. Backend hash mật khẩu mới.
7. Backend cập nhật mật khẩu.
8. Backend revoke toàn bộ refresh token hiện tại của user với lý do `Password reset`.

Kết quả thành công: người dùng phải đăng nhập lại bằng mật khẩu mới.

### 4.6. Luồng Google OAuth

Điều kiện bắt đầu: frontend muốn cho người dùng đăng nhập bằng Google.

Các bước:

1. Frontend gọi `GET /auth/google/url`.
2. Backend tạo Google authorization URL với scope cấu hình và `state` đã ký bằng HMAC.
3. `state` chứa `ip`, `userAgent`, `nonce`, `exp` để chống giả mạo callback và lệch thiết bị.
4. Frontend redirect người dùng sang URL của Google.
5. Google callback về `GET /auth/google/callback` với `code` và `state`.
6. Backend kiểm `state`, đổi `code` lấy Google access token, gọi userinfo.
7. Backend yêu cầu email Google tồn tại và đã xác minh.
8. Nếu email đã tồn tại, backend dùng user hiện có và đánh dấu verified nếu cần.
9. Nếu email chưa tồn tại, backend tạo user mới theo role người thuê, tạo `RenterProfile`, đặt mật khẩu ngẫu nhiên đã hash.
10. Backend tạo `sessionToken` dùng một lần trong bộ nhớ và redirect frontend về `GOOGLE_CLIENT_REDIRECT_URI?sessionToken=...`.
11. Frontend gọi `POST /auth/google/session` với `sessionToken`.
12. Backend consume session token, kiểm user ACTIVE và cấp token pair.

Kết quả thành công: frontend nhận `{ accessToken, refreshToken }`.

Lưu ý vận hành: `sessionToken` Google hiện được lưu trong memory của process. Nếu chạy nhiều instance backend, cần cơ chế lưu session dùng chung như Redis để tránh callback vào instance này nhưng đổi session ở instance khác.

### 4.7. Luồng gọi API protected

Điều kiện bắt đầu: frontend có access token hợp lệ.

Request phải có:

```http
Authorization: Bearer <accessToken>
```

Các bước backend:

1. `AuthenticationGuard` chạy toàn cục.
2. Nếu endpoint public thì bỏ qua xác thực Bearer.
3. Nếu endpoint protected, `AccessTokenGuard` lấy token từ header.
4. Backend verify access token.
5. Backend tìm user `ACTIVE` và chưa bị xóa mềm.
6. Backend dựng principal và gắn vào request bằng key `user`.
7. Backend kiểm permission theo role và route hiện tại.
8. `RolesGuard` kiểm role nếu endpoint có decorator `@Roles()` hoặc các helper như `@IsAdmin()`.
9. Controller/service lấy principal qua `@ActiveUser()`.

Kết quả thành công: nghiệp vụ phía sau nhận được `userId`, `roleName`, `contextKind` và nếu có thì `tenantId`, `memberId`.

### 4.8. Luồng gọi API tenant-scoped

Điều kiện bắt đầu: user thuộc nhóm vận hành tenant, ví dụ `LANDLORD`, `MANAGER`, `ACCOUNTANT`, `MAINTENANCE_STAFF`.

Request phải có:

```http
Authorization: Bearer <accessToken>
x-tenant-id: <tenantId>
```

Các bước backend:

1. `AccessTokenGuard` parse `x-tenant-id`.
2. Backend tìm `TenantMember` theo `userId` và `tenantId`.
3. Membership phải `ACTIVE`.
4. Tenant phải `ACTIVE` và chưa bị xóa mềm.
5. Backend lấy `roleId` và `role.name` từ membership.
6. Backend dựng principal với `contextKind=TENANT`, `tenantId`, `memberId`, `roleId`, `roleName`.
7. Permission guard kiểm route/method theo role trong tenant.
8. Service nghiệp vụ có thể gọi `TenantAccessService.getActiveTenantContext(userId)` để lấy tenant context đã xác thực.

Nếu API yêu cầu staff tenant nhưng thiếu `x-tenant-id`, backend trả `TENANT_CONTEXT_REQUIRED`.

Nếu user không thuộc tenant hoặc tenant/membership không active, backend trả `TENANT_ACCESS_DENIED`.

### 4.9. Luồng phân quyền RBAC

RBAC gồm hai lớp:

| Lớp | Thành phần | Mục đích |
| --- | --- | --- |
| Permission theo route | `AccessTokenGuard` + bảng `Role`, `Permission`, `RolePermission` | Kiểm role hiện tại có quyền gọi path/method hay không. |
| Role decorator | `RolesGuard` + `@Roles()`, `@IsAdmin()`, `@IsLandlord()` | Kiểm endpoint chỉ cho nhóm role cụ thể. |

Permission key được tạo từ route và HTTP method theo format:

```text
<path>_<method>
```

Ví dụ:

```text
/auth/profile_GET
/tenants/:id/status_PATCH
```

Quyền role được cache ngắn hạn theo key `roleId:<roleId>` để giảm truy vấn database. Nếu đổi permission ở DB, cần lưu ý cache có thể còn hiệu lực trong thời gian ngắn.

## 5. Cơ chế bảo mật và phân quyền

### 5.1. Mật khẩu

- Mật khẩu đầu vào được validate độ mạnh: tối thiểu 8 ký tự, tối đa 100 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.
- Backend hash mật khẩu trước khi lưu.
- Khi login, backend so sánh mật khẩu nhập vào với hash đã lưu.
- Khi quên mật khẩu thành công, toàn bộ refresh token của user bị revoke để ép đăng nhập lại.

### 5.2. OTP

- OTP có 6 chữ số.
- OTP được lưu dạng hash trong `VerificationCode`.
- Mỗi OTP có `type`: `REGISTER`, `LOGIN`, `FORGOT_PASSWORD`.
- Khi tạo OTP mới cùng email/type, OTP cũ còn hiệu lực bị đánh dấu `invalidatedAt`.
- OTP hợp lệ phải chưa hết hạn, chưa `consumedAt`, chưa `invalidatedAt`.
- Nhập sai tăng `attempts`.
- Khi vượt quá số lần thử cấu hình, OTP bị vô hiệu hóa và người dùng phải xin mã mới.
- Khi xác minh thành công, OTP được đánh dấu `consumedAt`.

### 5.3. Access token

- Access token là JWT dùng cho API protected.
- Token hiện tại được phát hành với `ver=2`.
- Guard vẫn có cơ chế grace period cho legacy token nếu cấu hình `LEGACY_ACCESS_TOKEN_GRACE_UNTIL` còn hiệu lực.
- Token sai, thiếu, hết hạn hoặc không verify được sẽ bị từ chối.
- Role/tenant không được tin hoàn toàn từ token; backend phân giải lại từ database.

### 5.4. Refresh token

- Refresh token là JWT riêng, dùng tại `POST /auth/refresh-token`.
- Backend lưu hash refresh token, không lưu raw token.
- Mỗi lần refresh thành công, refresh token cũ bị revoke và refresh token mới được tạo.
- Nếu refresh token cũ bị dùng lại, request bị từ chối.
- Logout chỉ revoke refresh token được gửi trong body.
- Reset password revoke toàn bộ refresh token của user.

### 5.5. Tenant isolation

- API tenant-scoped phải có `x-tenant-id`.
- User phải có `TenantMember` active trong tenant đó.
- Tenant phải `ACTIVE` và chưa bị xóa mềm.
- Service nghiệp vụ chỉ nên lấy tenant context từ `TenantAccessService`, không tự tin vào dữ liệu từ client.
- Query nghiệp vụ phải lọc theo `tenantId` để tenant A không đọc/sửa dữ liệu tenant B.

## 6. Quy tắc lỗi và trạng thái

### 6.1. Lỗi xác thực

| Tình huống | HTTP exception | Thông điệp/mã thường gặp |
| --- | --- | --- |
| Thiếu Bearer token | `Unauthorized` | `Error.MissingAccessToken` |
| Access token sai/hết hạn | `Unauthorized` | `Error.InvalidAccessToken` |
| Email hoặc mật khẩu sai | `Unauthorized` | `Email hoặc mật khẩu không đúng` |
| Tài khoản không active | `Unauthorized` | `Tài khoản đã bị vô hiệu hóa` |
| Refresh token sai/hết hạn/revoked | `Unauthorized` | `Refresh token không hợp lệ hoặc đã hết hạn` |
| Google session sai/hết hạn | `Unauthorized` | `Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn` |

### 6.2. Lỗi OTP và validation

| Tình huống | HTTP exception | Thông điệp/mã thường gặp |
| --- | --- | --- |
| OTP không tồn tại/hết hạn/đã dùng | `BadRequest` | `Mã OTP không tồn tại hoặc đã hết hạn` |
| OTP sai | `BadRequest` | `Mã OTP không đúng` |
| OTP vượt quá số lần thử | `BadRequest` | `Bạn đã vượt quá số lần thử cho phép...` |
| Password confirm không khớp | Validation error | `Mật khẩu không khớp` hoặc message tương ứng |
| Không có field khi cập nhật profile | Validation error | `Vui lòng cung cấp ít nhất một trường để cập nhật` |

### 6.3. Lỗi phân quyền và tenant

| Tình huống | HTTP exception | Thông điệp/mã thường gặp |
| --- | --- | --- |
| Thiếu `x-tenant-id` ở API tenant-scoped | `BadRequest` | `TENANT_CONTEXT_REQUIRED` |
| `x-tenant-id` không phải số dương hợp lệ | `BadRequest` | `TENANT_CONTEXT_REQUIRED` |
| User không thuộc tenant | `Forbidden` | `TENANT_ACCESS_DENIED` |
| Tenant hoặc membership không active | `Forbidden` | `TENANT_ACCESS_DENIED` |
| Không có permission cho route/method | `Forbidden` | `Error.Forbidden` |
| Không đúng role decorator | `Forbidden` | `Error.PermissionDenied` |

## 7. Ví dụ sử dụng

### 7.1. Đăng ký tài khoản chủ trọ

Bước 1: gửi OTP đăng ký.

```http
POST /auth/send-otp
Content-Type: application/json

{
  "email": "landlord@example.com",
  "type": "REGISTER"
}
```

Bước 2: đăng ký bằng OTP nhận qua email.

```http
POST /auth/register
Content-Type: application/json

{
  "email": "landlord@example.com",
  "passwordHash": "Password@123",
  "confirmPassword": "Password@123",
  "fullName": "Nguyen Van A",
  "phone": "0900000000",
  "code": "123456",
  "roleCode": "LANDLORD"
}
```

Kết quả: backend tạo `User`, tạo `Tenant`, tạo `TenantMember` role `LANDLORD`, đánh dấu email đã xác minh.

### 7.2. Đăng nhập 2 bước

Bước 1: gửi email/mật khẩu để nhận OTP.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "landlord@example.com",
  "passwordHash": "Password@123"
}
```

Bước 2: gửi lại email/mật khẩu kèm OTP.

```http
POST /auth/login
Content-Type: application/json

{
  "email": "landlord@example.com",
  "passwordHash": "Password@123",
  "code": "123456"
}
```

Response thành công:

```json
{
  "accessToken": "<jwt-access-token>",
  "refreshToken": "<jwt-refresh-token>"
}
```

### 7.3. Gọi API protected

```http
GET /auth/profile
Authorization: Bearer <accessToken>
```

Nếu token hợp lệ, backend trả profile của user hiện tại.

### 7.4. Gọi API tenant-scoped

Ví dụ một API vận hành tenant như danh sách phòng cần cả access token và tenant context.

```http
GET /rooms
Authorization: Bearer <accessToken>
x-tenant-id: 10
```

Backend chỉ cho qua nếu user là thành viên active của tenant `10`, tenant đang active và role có permission gọi endpoint đó.

### 7.5. Refresh token

```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "<current-refresh-token>"
}
```

Response thành công:

```json
{
  "accessToken": "<new-access-token>",
  "refreshToken": "<new-refresh-token>"
}
```

Sau response này, client phải bỏ refresh token cũ và lưu refresh token mới.

### 7.6. Logout

```http
POST /auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "<current-refresh-token>"
}
```

Response thành công:

```json
{
  "message": "Đăng xuất thành công"
}
```

### 7.7. Cập nhật profile

```http
PATCH /auth/profile
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "fullName": "Nguyen Van A",
  "phone": "0911111111",
  "avatarUrl": "https://example.com/avatar.png"
}
```

Ít nhất một trong ba field `fullName`, `phone`, `avatarUrl` phải được gửi.

## 8. Tiêu chí nghiệm thu

### 8.1. Với frontend developer

- Biết đăng ký phải gọi `send-otp` trước rồi mới `register`.
- Biết đăng nhập là luồng 2 bước: bước đầu nhận message OTP, bước sau nhận token pair.
- Biết lưu và thay thế refresh token sau mỗi lần refresh.
- Biết mọi API protected cần `Authorization: Bearer <accessToken>`.
- Biết API vận hành tenant cần thêm `x-tenant-id`.
- Biết user bị logout local sau khi gọi logout hoặc reset password.

### 8.2. Với backend developer

- Biết `AuthenticationGuard` là guard toàn cục điều phối Bearer/API key/public.
- Biết endpoint protected mặc định dùng Bearer token.
- Biết `AccessTokenGuard` verify token, resolve principal, kiểm user active, tenant context và permission route/method.
- Biết `RolesGuard` kiểm role decorator sau khi principal đã được gắn vào request.
- Biết service tenant-scoped lấy context qua `TenantAccessService`.
- Biết không tin `tenantId`, `roleId`, `roleName` từ client body/query.

### 8.3. Với tester

Các case tối thiểu cần kiểm:

| Nhóm | Case |
| --- | --- |
| Đăng ký | OTP đúng tạo user; OTP sai bị từ chối; email trùng bị từ chối; role không hợp lệ bị từ chối. |
| Đăng nhập | Sai mật khẩu bị từ chối; tài khoản inactive/banned bị từ chối; thiếu OTP chỉ gửi OTP; đúng OTP trả token pair. |
| OTP | OTP cũ bị vô hiệu hóa khi gửi OTP mới; OTP quá hạn không dùng được; nhập sai quá số lần bị khóa OTP. |
| Refresh token | Refresh thành công trả token mới; token cũ không dùng lại được; user bị khóa không refresh được. |
| Logout | Refresh token sau logout không refresh được. |
| Profile | Không token bị từ chối; token đúng xem/cập nhật được; body rỗng khi cập nhật bị từ chối. |
| RBAC | User không đủ role không gọi được API admin; `ADMIN` gọi được API admin nếu có permission. |
| Tenant isolation | Thiếu `x-tenant-id` bị từ chối; tenant sai bị từ chối; tenant A không đọc/sửa dữ liệu tenant B. |
| Google OAuth | State sai/hết hạn bị từ chối; email Google chưa verified bị từ chối; session token chỉ dùng một lần. |

## 9. Nguồn mã đối chiếu

| Nội dung | File |
| --- | --- |
| Auth endpoint | `backend/src/modules/auth/auth.controller.ts` |
| Auth business logic | `backend/src/modules/auth/auth.service.ts` |
| Auth DTO/Zod schema | `backend/src/modules/auth/model/auth.model.ts` |
| User admin API | `backend/src/modules/users/users.controller.ts`, `backend/src/modules/users/model/users.model.ts` |
| Tenant admin API | `backend/src/modules/tenants/tenants.controller.ts`, `backend/src/modules/tenants/model/tenants.model.ts` |
| Guard xác thực | `backend/src/common/guard/authentication.guard.ts`, `backend/src/common/guard/access-token.guard.ts` |
| Guard phân quyền role | `backend/src/common/guard/roles.guard.ts` |
| Tenant context helper | `backend/src/shared/modules/services/tenant-access.service.ts` |
| Role constants | `backend/src/common/constants/role.constant.ts` |
| Auth constants | `backend/src/common/constants/auth.constant.ts` |
| Dữ liệu chính | `backend/prisma/schema.prisma` |

