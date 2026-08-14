Với số lượng route hiện tại, mình khuyên **không test từng page một cách rời rạc**, mà chia thành 4 tầng:

1. **Route & Guard test**
2. **Page/API integration test**
3. **Business-flow E2E test**
4. **Permission/negative/error test**

Hai account bạn cung cấp có thể dùng làm test fixture:

- `admin`: kiểm tra Platform Admin + quyền system
- `landlord`: kiểm tra toàn bộ Tenant Operations

Mình không nhắc lại password trong plan để tránh credentials bị lặp lại không cần thiết.

---

# 1. Stack test nên dùng

Cho FE React/Vite hiện tại:

```text
Vitest
├── unit test
├── route/guard test
└── utility/hooks

React Testing Library
├── component test
├── form validation
└── page behavior

MSW
└── mock Backend API

Playwright
├── E2E
├── authentication
├── API integration thật
└── role/permission
```

Trong project:

```text
src/
tests/
├── unit/
├── integration/
├── guards/
└── helpers/

e2e/
├── auth/
├── public/
├── account/
├── landlord/
├── admin/
├── permissions/
└── errors/
```

---

# 2. Mức độ ưu tiên

Không nên test 100% mọi thứ ngay lập tức.

Chia thành:

```text
P0 = Critical
Không được phép lỗi

P1 = Important
Ảnh hưởng trực tiếp nghiệp vụ

P2 = Secondary
Ít ảnh hưởng hơn
```

Với hệ thống của bạn:

```text
P0
Authentication
Authorization
Tenant Context
Properties
Rooms
Renters
Contracts

P1
Rental Requests
Viewing Appointments
Services
Assets
Handovers
Terminations

P2
Dashboard
Action Center
Marketplace
Account Profile
Error pages
```

Dashboard không nhất thiết P0 vì lỗi dashboard thường không phá business flow chính.

---

# 3. Phase 1 — Test Public Routes

## TC-PUBLIC-01 — Marketplace Home

```text
GET /
```

Kiểm tra:

- load được không cần login
- không redirect `/login`
- API marketplace được gọi
- loading state
- empty state
- API error state
- data render đúng

---

## TC-PUBLIC-02 — Danh sách phòng

```text
GET /rooms
```

Test:

```text
✓ Hiển thị danh sách
✓ Pagination
✓ Search
✓ Filter
✓ Sort nếu có
✓ Click room → detail
✓ API trả [] → empty state
✓ API 500 → error
```

---

## TC-PUBLIC-03 — Room Detail

```text
GET /rooms/:roomId
```

Test:

```text
valid roomId
invalid roomId
room không tồn tại
room không còn available
API 404
API 500
```

Ngoài ra kiểm tra CTA:

```text
Xem phòng
Yêu cầu thuê
Đăng nhập
```

nếu guest thực hiện hành động cần auth.

---

# 4. Phase 2 — Authentication

Đây là nhóm **P0**.

## `/login`

### Successful login

```text
Given chưa login
When nhập account Landlord
Then login thành công
And redirect đúng trang
And access token/session được lưu đúng
```

### Sai mật khẩu

```text
401
→ hiển thị message
→ không redirect
→ không crash
```

### Validation

```text
email rỗng
email sai format
password rỗng
```

---

# 5. OTP Login

```text
/login/otp
```

Test:

```text
✓ nhập email/phone
✓ gửi OTP
✓ OTP đúng
✓ OTP sai
✓ OTP hết hạn
✓ resend OTP
✓ countdown
✓ spam resend
```

---

# 6. Register

```text
/register
```

Test:

```text
✓ register thành công
✓ email đã tồn tại
✓ password không đủ mạnh
✓ confirm password không khớp
✓ field required
✓ API lỗi
```

---

# 7. Forgot Password

```text
/forgot-password
```

```text
✓ email hợp lệ
✓ email không tồn tại
✓ validation
✓ request success
✓ request throttled
```

---

# 8. Reset Password

```text
/reset-password
```

Các case rất quan trọng:

```text
valid token
expired token
invalid token
missing token
password yếu
password confirmation khác nhau
reset thành công
```

---

# 9. Google OAuth Callback

```text
/auth/google/callback
```

Test:

```text
callback thành công
callback lỗi
missing code
invalid code
backend OAuth error
redirect sau OAuth
```

Không nhất thiết automation Google login thật.

Mock phần OAuth callback là đủ ở integration test.

---

# 10. Test RequireGuest

Rất đáng viết thành test riêng.

Các route:

```text
/login
/login/otp
/register
/forgot-password
/reset-password
```

Case:

```text
Guest
→ được phép vào

Authenticated
→ redirect khỏi auth page
```

Ví dụ:

```text
login user
↓
navigate /login
↓
expect redirect /app/dashboard hoặc destination tương ứng
```

---

# 11. Phase 3 — RequireAuth

Các page:

```text
/account
/account/select-tenant

/app/*
/admin
```

Test matrix:

| User     | `/account` | `/app/dashboard` | `/admin` |
| -------- | ---------: | ---------------: | -------: |
| Guest    |      Login |            Login |    Login |
| Landlord |         ✅ |               ✅ |      403 |
| Admin    |         ✅ |       tùy tenant |       ✅ |

Đây nên là automated test.

---

# 12. Account

## `/account`

Test:

```text
load profile
update profile
validation
API error
refresh
```

---

# 13. Select Tenant

```text
/account/select-tenant
```

Đây là **P0** vì toàn `/app/*` phụ thuộc Tenant Context.

Test:

```text
user có 0 tenant
user có 1 tenant
user có nhiều tenant
select tenant
switch tenant
tenant invalid
tenant disabled
```

Quan trọng:

```text
Tenant A selected

GET /app/properties
→ chỉ được load dữ liệu Tenant A
```

Sau switch:

```text
Tenant B selected
→ cache Tenant A không được leak sang Tenant B
```

Đặc biệt với TanStack Query.

Ví dụ query key phải kiểu:

```ts
;['properties', tenantId]
```

không nên chỉ:

```ts
;['properties']
```

---

# 14. Test RequireTenantContext

Rất quan trọng.

Case:

```text
authenticated
tenant selected
→ /app/dashboard được vào

authenticated
no tenant
→ /app/dashboard
→ redirect /account/select-tenant
```

Test thêm:

```text
tenant context bị xóa
tenantId invalid
tenant access revoked
```

---

# 15. Phase 4 — Properties

Đây là module đầu tiên mình sẽ E2E đầy đủ.

Routes:

```text
/app/properties
/app/properties/new
/app/properties/:id
/app/properties/:id/edit
```

E2E Flow:

```text
Login Landlord
↓
Select Tenant
↓
Properties
↓
Create Property
↓
View Detail
↓
Edit Property
↓
Verify updated data
```

Test cases:

### List

```text
list
pagination
search
filter
empty
API error
```

### Create

```text
valid data
missing field
invalid field
backend validation
duplicate data
```

### Detail

```text
valid ID
invalid ID
not found
belong to another tenant
```

### Edit

```text
load existing data
update
cancel
validation
```

---

# 16. Rooms

Routes:

```text
/app/quan-ly-phong/danh-sach
/app/quan-ly-phong/tao-moi
/app/quan-ly-phong/:id/chi-tiet
```

Main E2E:

```text
Create Property
↓
Create Room
↓
Room appears in list
↓
Open Room Detail
```

Test:

```text
room name
price
area
status
property relation
image
capacity
API validation
```

Nếu Room cần Property thì test:

```text
không có Property
→ không cho tạo Room
```

hoặc theo business rule BE hiện tại.

---

# 17. Rental Requests

```text
/app/quan-ly-nha-tro/yeu-cau-thue
/app/quan-ly-nha-tro/yeu-cau-thue/:id
```

Flow nên test:

```text
Guest/User marketplace
↓
Rental request
↓
Landlord
↓
Request list
↓
View request
↓
Approve/Reject
```

Test trạng thái:

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

Nếu backend định nghĩa status khác thì map lại.

---

# 18. Viewing Appointments

```text
/app/quan-ly-nha-tro/lich-xem-phong
/app/quan-ly-nha-tro/lich-xem-phong/:id
```

Flow:

```text
Create appointment
↓
Landlord sees appointment
↓
Open Detail
↓
Update status
```

Test:

```text
time conflict
past time
invalid appointment
cancel
confirm
```

---

# 19. Renters

```text
/app/nguoi-thue
/app/nguoi-thue/:id
```

Test:

```text
list renters
search renter
view renter
empty
not found
```

---

# 20. Renter Invitations

```text
/app/nguoi-thue/loi-moi/tao
/app/nguoi-thue/loi-moi/:id
```

Flow rất đáng E2E:

```text
Landlord
↓
Create invitation
↓
Invitation created
↓
Detail
↓
Verify status
```

Test:

```text
invalid email
existing renter
duplicate invitation
expired invite
accepted invite
rejected invite
```

---

# 21. Contracts — P0

Routes:

```text
/app/hop-dong
/app/hop-dong/tao
/app/hop-dong/:id
/app/hop-dong/:id/sua
/app/hop-dong/:id/thanh-vien
```

Đây là module nên test sâu nhất.

## Main Contract Flow

```text
Property
↓
Room
↓
Renter
↓
Create Contract
↓
Contract Detail
↓
Add Member
↓
Edit Contract
```

Test create:

```text
room
renter
start date
end date
deposit
rent amount
members
```

Negative:

```text
room đã có hợp đồng active
end <= start
invalid renter
missing required fields
```

---

# 22. Contract Members

```text
/app/hop-dong/:id/thanh-vien
```

Test:

```text
add member
remove member
duplicate member
invalid renter
contract not found
```

---

# 23. Assets

```text
/app/quan-ly-tai-san
/app/quan-ly-tai-san/phong/:roomId
```

Flow:

```text
Room
↓
Add asset
↓
Update asset
↓
Room assets
```

Test:

```text
asset quantity
asset condition
asset type
room relation
```

---

# 24. Handovers

```text
/app/ban-giao/:id
/app/ban-giao/:id/tranh-chap
```

Flow:

```text
Contract
↓
Handover
↓
Assets inspection
↓
Confirm
```

Dispute:

```text
handover
↓
raise dispute
↓
submit reason/evidence
```

Test invalid:

```text
completed handover
unauthorized user
invalid asset status
```

---

# 25. Contract Terminations

```text
/app/yeu-cau-ket-thuc-hop-dong
```

Flow:

```text
active contract
↓
termination request
↓
landlord view
↓
approve/reject
```

Test:

```text
duplicate request
already terminated
invalid contract
```

---

# 26. Services

Routes:

```text
/app/dich-vu
/app/dich-vu/tao-moi
/app/dich-vu/:id/chinh-sua
```

E2E:

```text
Create service
↓
List
↓
Edit
```

Test:

```text
name
unit
price
duplicate
invalid price
inactive service
```

---

# 27. Room Services

```text
/app/dich-vu-da-gan
/app/dich-vu-da-gan/tao-moi
```

Flow:

```text
Service
↓
Room
↓
Assign Service
↓
Verify
```

Negative:

```text
duplicate service-room relation
invalid room
invalid service
```

---

# 28. Dashboard

```text
/app/dashboard
```

Không cần test từng con số bằng E2E.

Integration test tốt hơn:

```text
API returns data
↓
cards render correctly
```

Check:

```text
total property
total room
occupied room
available room
contract
renter
```

Và:

```text
loading
empty
error
```

---

# 29. Action Center

```text
/app/action-center
```

Test:

```text
pending rental requests
appointments
contracts
termination requests
other actionable items
```

Một test quan trọng:

```text
click Action
→ navigation đúng Detail page
```

---

# 30. Admin

Route:

```text
/admin
```

Test bằng account Admin.

### Admin account

```text
login admin
↓
/admin
↓
200/render dashboard
```

### Landlord

```text
login landlord
↓
navigate /admin
↓
403
```

### Guest

```text
navigate /admin
↓
login
```

Đây là test **P0 security**.

---

# 31. Test RequireSystemRole

Nên viết riêng.

```text
ADMIN
→ access

LANDLORD
→ denied

STAFF
→ denied

no role
→ denied
```

Và đặc biệt:

```text
user sửa localStorage role = ADMIN
```

Frontend có thể hiện UI nhưng backend vẫn bắt buộc trả:

```text
403
```

Không bao giờ coi FE Guard là security boundary thực sự.

---

# 32. Error Pages

## 403

```text
/403
```

Kiểm tra:

```text
render correctly
back/home button
```

---

## Session expired

```text
/session-expired
```

Scenario đáng test:

```text
Login
↓
token expires
↓
API returns 401
↓
clear auth
↓
session-expired
```

Quan trọng hơn việc direct URL.

---

## 404

```text
/random-url-not-found
```

Expect:

```text
Not Found
```

---

# 33. API Error Matrix

Mỗi module không cần test mọi HTTP error.

Tạo một standard:

| HTTP | Expected FE        |
| ---- | ------------------ |
| 400  | validation/message |
| 401  | session handling   |
| 403  | forbidden          |
| 404  | not found          |
| 409  | conflict           |
| 422  | validation         |
| 500  | generic error      |

Mỗi loại chỉ cần test representative page.

Ví dụ:

```text
401 → Dashboard
403 → Admin
404 → Room Detail
409 → Contract/Create
422 → Property/Create
500 → Marketplace
```

---

# 34. Loading State

Mỗi page dùng React Query nên có ít nhất:

```text
Loading
Success
Empty
Error
```

Ví dụ:

```text
PropertiesPage

Loading
→ skeleton

Success
→ table

Empty
→ "Chưa có nhà trọ"

Error
→ retry
```

Đây là dạng test rất phù hợp với:

```text
Vitest
+
React Testing Library
+
MSW
```

không nên dùng Playwright cho tất cả.

---

# 35. TanStack Query cần test gì?

Đặc biệt kiểm tra mutation.

Ví dụ Create Property:

```text
POST property
↓
success
↓
invalidateQueries(["properties", tenantId])
↓
list refresh
```

Test:

```text
create
update
delete nếu có
invalidate
refetch
optimistic update nếu dùng
```

---

# 36. Axios/API layer

Nếu bạn có:

```text
src/shared/api
```

mình khuyên **không unit-test Axios chỉ để kiểm tra axios.get được gọi**.

Ví dụ test kiểu:

```ts
expect(axios.get).toHaveBeenCalled()
```

không mang nhiều giá trị.

Thay vào đó:

```text
React Page
↓
React Query
↓
API service
↓
MSW
```

như vậy test luôn được cả integration.

---

# 37. Test Responsive

Ít nhất test 3 viewport trong Playwright:

```ts
Desktop
1440 × 900

Tablet
768 × 1024

Mobile
390 × 844
```

Không cần chạy toàn bộ suite trên 3 viewport.

Chỉ chạy:

```text
Marketplace
Login
Dashboard
Properties list
Room list
Contract detail
```

---

# 38. Cross-browser

Với đồ án tốt nghiệp, mình nghĩ:

```text
Chromium → toàn bộ suite

Firefox → smoke test

WebKit → smoke test
```

Không cần toàn bộ test × 3 browser.

Smoke test:

```text
login
dashboard
property
room
contract
logout
```

---

# 39. Test database/data strategy

Đây là phần cực kỳ quan trọng nếu chạy E2E với Backend thật.

Không nên viết test dựa vào:

```text
property hiện tại ID = 12
room hiện tại ID = 50
```

vì dữ liệu sẽ thay đổi.

Thay vào đó:

```text
Test
↓
create Property
↓
lấy property.id
↓
create Room(property.id)
↓
create Contract(room.id)
```

Cuối test:

```text
cleanup
```

hoặc reset test DB.

---

# 40. Test naming

Mình đề xuất convention:

```text
AUTH-001
AUTH-002

PROPERTY-001
PROPERTY-002

ROOM-001

CONTRACT-001

RBAC-001
```

Ví dụ:

```text
AUTH-001
Landlord login successfully

AUTH-002
Reject incorrect password

RBAC-001
Landlord cannot access admin

TENANT-001
User without tenant context redirects to tenant selector

PROPERTY-001
Landlord creates property successfully
```

---

# 41. Bộ Smoke Test quan trọng nhất

Nếu bạn chỉ muốn bắt đầu với **10–15 test đầu tiên**, hãy viết đúng bộ này:

```text
01 Guest can access /
02 Guest can access /rooms
03 Guest accessing /app/dashboard → login

04 Landlord login successfully
05 Landlord can select tenant
06 Landlord can access dashboard

07 Landlord creates property
08 Landlord creates room

09 Landlord creates renter invitation

10 Landlord creates contract
11 Landlord opens contract detail

12 Landlord cannot access /admin

13 Admin login successfully
14 Admin can access /admin

15 Unknown URL → 404
```

Nếu 15 test này pass thì core architecture frontend/backend của bạn khá ổn.

---

# 42. Sau đó mở rộng thành Regression Suite

Mình sẽ chia regression của dự án bạn như sau:

```text
E2E
│
├── 01-auth.spec.ts
├── 02-route-guards.spec.ts
├── 03-marketplace.spec.ts
├── 04-account.spec.ts
├── 05-tenant-context.spec.ts
├── 06-properties.spec.ts
├── 07-rooms.spec.ts
├── 08-rental-requests.spec.ts
├── 09-viewing-appointments.spec.ts
├── 10-renters.spec.ts
├── 11-renter-invitations.spec.ts
├── 12-contracts.spec.ts
├── 13-contract-members.spec.ts
├── 14-assets.spec.ts
├── 15-handovers.spec.ts
├── 16-terminations.spec.ts
├── 17-services.spec.ts
├── 18-room-services.spec.ts
├── 19-admin.spec.ts
└── 20-errors.spec.ts
```

---

# 43. Authentication fixture

Không nên mỗi test đều:

```text
goto login
type email
type password
click login
```

Playwright hỗ trợ lưu authenticated state.

Thiết kế:

```text
e2e/
├── auth.setup.ts
├── .auth/
│   ├── landlord.json
│   └── admin.json
```

Flow:

```text
auth.setup.ts

Landlord login
→ save storageState

Admin login
→ save storageState
```

Sau đó:

```text
properties.spec.ts
rooms.spec.ts
contracts.spec.ts
```

dùng sẵn Landlord session.

Chỉ `auth.spec.ts` mới login trực tiếp.

Nhờ vậy test nhanh và ổn định hơn rất nhiều.

---

# 44. Cấu trúc Playwright mình đề xuất

```text
e2e/
│
├── setup/
│   ├── auth.setup.ts
│   └── test-data.setup.ts
│
├── fixtures/
│   ├── auth.fixture.ts
│   └── tenant.fixture.ts
│
├── pages/
│   ├── LoginPage.ts
│   ├── PropertiesPage.ts
│   ├── RoomsPage.ts
│   └── ContractsPage.ts
│
├── public/
│   └── marketplace.spec.ts
│
├── auth/
│   └── authentication.spec.ts
│
├── landlord/
│   ├── properties.spec.ts
│   ├── rooms.spec.ts
│   ├── renters.spec.ts
│   ├── contracts.spec.ts
│   ├── services.spec.ts
│   └── assets.spec.ts
│
├── admin/
│   └── admin.spec.ts
│
├── permissions/
│   ├── auth-guard.spec.ts
│   ├── tenant-guard.spec.ts
│   └── role-guard.spec.ts
│
└── errors/
    └── errors.spec.ts
```

---

# 45. Thứ tự triển khai mình đề xuất cho chính dự án này

Đừng code 20 file test cùng lúc.

### Sprint Test 1

```text
Playwright setup

↓

// login
// auth fixture
// landlord
// admin
```

Viết:

```text
AUTH
RequireAuth
RequireGuest
RequireSystemRole
```

---

### Sprint Test 2

```text
Tenant Context
Properties
Rooms
```

Sau Sprint 2 bạn sẽ kiểm tra được flow:

```text
Landlord
↓
Login
↓
Select Tenant
↓
Property
↓
Room
```

---

### Sprint Test 3

```text
Renters
Invitations
Contracts
Contract Members
```

Flow:

```text
Property
  ↓
Room
  ↓
Renter
  ↓
Contract
```

Đây là phần quan trọng nhất của đồ án.

---

### Sprint Test 4

```text
Assets
Services
Assigned Services
Handovers
Terminations
```

---

### Sprint Test 5

```text
Marketplace
Rental Request
Viewing Appointment
```

Lúc đó test xuyên suốt được:

```text
Marketplace user
        ↓
      Room
        ↓
Rental Request
        ↓
    Landlord
        ↓
  Approve/View
        ↓
      Renter
        ↓
     Contract
```

Đây sẽ là **E2E demo flow đẹp nhất cho đồ án tốt nghiệp**.

---

# Flow cuối cùng mình muốn project của bạn đạt được

```text
                    PUBLIC
                      │
                      ▼
                 Marketplace
                      │
                 View Room
                      │
              Rental Request
                      │
                      ▼
LANDLORD ── Login ── Tenant
                      │
                      ▼
                  Property
                      │
                      ▼
                    Room
                      │
             ┌────────┴────────┐
             ▼                 ▼
        Rental Request       Services
             │
             ▼
           Renter
             │
             ▼
          Contract
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
     Asset Member Handover
                   │
                   ▼
              Termination


ADMIN
  │
Login
  │
  ▼
/admin
```

## Mục tiêu coverage thực tế

Đối với đồ án này mình sẽ không ép `100% coverage`. Mục tiêu hợp lý hơn là:

```text
Unit / Integration
~70–80%

Critical business logic
~90%+

Playwright E2E
20–40 flow chính

Route Guards
100%

Auth / Permission
100% flow quan trọng
```

**Bước tiếp theo hợp lý nhất là chưa test Properties/Rooms ngay.** Hãy setup Playwright và viết trước khoảng **8 test cho Login + RequireAuth + RequireGuest + RequireTenantContext + RequireSystemRole**, vì nếu Guard/Auth sai thì toàn bộ `/app/*` phía sau đều không đáng tin cậy. Sau đó mới đi theo thứ tự **Properties → Rooms → Renters → Contracts**.
