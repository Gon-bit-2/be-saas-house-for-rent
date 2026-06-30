Dưới đây là **thiết kế danh sách bảng và quan hệ CSDL** cho dự án SaaS & Marketplace quản lý/cho thuê phòng trọ, chung cư mini. Mình thiết kế theo hướng **Multi-tenant**, dễ triển khai với **PostgreSQL + Prisma**, mở rộng tốt cho Web Platform, Mobile App, AI, thanh toán, ticket, dashboard và subscription.

---

# 1. Nguyên tắc thiết kế tổng thể

Hệ thống nên chia dữ liệu thành 2 nhóm lớn:

## Nhóm dữ liệu toàn hệ thống

Dùng cho Super Admin quản lý toàn nền tảng:

- Người dùng
- Chủ trọ / tenant
- Gói dịch vụ
- Subscription
- Cấu hình hệ thống
- Marketplace
- Báo cáo vi phạm
- Audit log toàn hệ thống

## Nhóm dữ liệu theo từng chủ trọ

Mỗi chủ trọ là một **tenant** riêng. Các bảng nghiệp vụ quan trọng nên có `tenant_id` để tách dữ liệu:

- Nhà / tòa nhà
- Phòng
- Người thuê
- Hợp đồng
- Hóa đơn
- Thanh toán
- Tài sản
- Ticket sự cố
- Nhân viên
- Chỉ số điện nước

---

# 2. Nhóm bảng người dùng, phân quyền và Multi-tenant

## 2.1. `users`

Lưu thông tin tài khoản đăng nhập của toàn bộ hệ thống.

| Cột               | Kiểu dữ liệu | Mô tả                    |
| ----------------- | ------------ | ------------------------ |
| id                | UUID         | Khóa chính               |
| full_name         | VARCHAR      | Họ tên                   |
| email             | VARCHAR      | Email đăng nhập          |
| phone             | VARCHAR      | Số điện thoại            |
| password_hash     | TEXT         | Mật khẩu đã mã hóa       |
| avatar_url        | TEXT         | Ảnh đại diện             |
| status            | ENUM         | ACTIVE, INACTIVE, BANNED |
| email_verified_at | TIMESTAMP    | Thời gian xác minh email |
| phone_verified_at | TIMESTAMP    | Thời gian xác minh SĐT   |
| last_login_at     | TIMESTAMP    | Lần đăng nhập gần nhất   |
| created_at        | TIMESTAMP    | Ngày tạo                 |
| updated_at        | TIMESTAMP    | Ngày cập nhật            |
| deleted_at        | TIMESTAMP    | Xóa mềm                  |

**Quan hệ:**

- Một `user` có thể thuộc nhiều `tenant` thông qua bảng `tenant_members`.
- Một `user` có thể là người thuê thông qua bảng `renter_profiles`.
- Một `user` có thể tạo đánh giá, ticket, thanh toán, lịch xem phòng.

---

## 2.2. `roles`

Lưu danh sách vai trò trong hệ thống.

| Cột         | Kiểu dữ liệu | Mô tả                                |
| ----------- | ------------ | ------------------------------------ |
| id          | UUID         | Khóa chính                           |
| code        | VARCHAR      | SUPER_ADMIN, LANDLORD, STAFF, RENTER |
| name        | VARCHAR      | Tên vai trò                          |
| description | TEXT         | Mô tả                                |

---

## 2.3. `permissions`

Lưu danh sách quyền chi tiết.

| Cột         | Kiểu dữ liệu | Mô tả                            |
| ----------- | ------------ | -------------------------------- |
| id          | UUID         | Khóa chính                       |
| code        | VARCHAR      | Ví dụ: ROOM_CREATE, INVOICE_VIEW |
| name        | VARCHAR      | Tên quyền                        |
| module      | VARCHAR      | Module áp dụng                   |
| description | TEXT         | Mô tả                            |

---

## 2.4. `role_permissions`

Bảng trung gian giữa vai trò và quyền.

| Cột           | Kiểu dữ liệu | Mô tả                   |
| ------------- | ------------ | ----------------------- |
| role_id       | UUID         | FK đến `roles.id`       |
| permission_id | UUID         | FK đến `permissions.id` |

**Quan hệ:**

- Một role có nhiều permission.
- Một permission có thể thuộc nhiều role.

---

## 2.5. `tenants`

Đây là bảng đại diện cho từng **chủ trọ / tổ chức / đơn vị kinh doanh phòng trọ** trong mô hình SaaS.

| Cột                 | Kiểu dữ liệu | Mô tả                                   |
| ------------------- | ------------ | --------------------------------------- |
| id                  | UUID         | Khóa chính                              |
| owner_user_id       | UUID         | FK đến `users.id`                       |
| name                | VARCHAR      | Tên chủ trọ / thương hiệu               |
| slug                | VARCHAR      | Định danh URL                           |
| tax_code            | VARCHAR      | Mã số thuế nếu có                       |
| phone               | VARCHAR      | SĐT liên hệ                             |
| email               | VARCHAR      | Email liên hệ                           |
| address             | TEXT         | Địa chỉ                                 |
| verification_status | ENUM         | UNVERIFIED, PENDING, VERIFIED, REJECTED |
| status              | ENUM         | ACTIVE, SUSPENDED, CLOSED               |
| created_at          | TIMESTAMP    | Ngày tạo                                |
| updated_at          | TIMESTAMP    | Ngày cập nhật                           |
| deleted_at          | TIMESTAMP    | Xóa mềm                                 |

**Quan hệ:**

- Một `tenant` có một chủ sở hữu chính là `owner_user_id`.
- Một `tenant` có nhiều nhân viên trong `tenant_members`.
- Một `tenant` có nhiều nhà, phòng, hợp đồng, hóa đơn, ticket.

---

## 2.6. `tenant_members`

Quản lý nhân sự của từng chủ trọ.

| Cột        | Kiểu dữ liệu | Mô tả                     |
| ---------- | ------------ | ------------------------- |
| id         | UUID         | Khóa chính                |
| tenant_id  | UUID         | FK đến `tenants.id`       |
| user_id    | UUID         | FK đến `users.id`         |
| role_id    | UUID         | FK đến `roles.id`         |
| status     | ENUM         | ACTIVE, INVITED, DISABLED |
| joined_at  | TIMESTAMP    | Ngày tham gia             |
| created_at | TIMESTAMP    | Ngày tạo                  |

**Quan hệ:**

- Một `tenant` có nhiều `tenant_members`.
- Một `user` có thể làm việc trong nhiều `tenant`.

---

# 3. Nhóm bảng gói dịch vụ SaaS

## 3.1. `plans`

Lưu các gói dịch vụ như Free, Pro, Business.

| Cột                   | Kiểu dữ liệu | Mô tả                       |
| --------------------- | ------------ | --------------------------- |
| id                    | UUID         | Khóa chính                  |
| code                  | VARCHAR      | FREE, PRO, BUSINESS         |
| name                  | VARCHAR      | Tên gói                     |
| description           | TEXT         | Mô tả                       |
| price_monthly         | DECIMAL      | Giá theo tháng              |
| price_yearly          | DECIMAL      | Giá theo năm                |
| max_rooms             | INT          | Số phòng tối đa             |
| max_staff             | INT          | Số nhân viên tối đa         |
| allow_ai_ocr          | BOOLEAN      | Cho phép OCR                |
| allow_ai_pricing      | BOOLEAN      | Cho phép AI gợi ý giá       |
| allow_chatbot         | BOOLEAN      | Cho phép chatbot            |
| allow_webhook_payment | BOOLEAN      | Cho phép webhook thanh toán |
| is_active             | BOOLEAN      | Gói có đang hoạt động không |
| created_at            | TIMESTAMP    | Ngày tạo                    |

---

## 3.2. `subscriptions`

Lưu gói dịch vụ hiện tại của từng chủ trọ.

| Cột           | Kiểu dữ liệu | Mô tả                                         |
| ------------- | ------------ | --------------------------------------------- |
| id            | UUID         | Khóa chính                                    |
| tenant_id     | UUID         | FK đến `tenants.id`                           |
| plan_id       | UUID         | FK đến `plans.id`                             |
| status        | ENUM         | TRIALING, ACTIVE, PAST_DUE, CANCELED, EXPIRED |
| started_at    | TIMESTAMP    | Ngày bắt đầu                                  |
| expired_at    | TIMESTAMP    | Ngày hết hạn                                  |
| billing_cycle | ENUM         | MONTHLY, YEARLY                               |
| auto_renew    | BOOLEAN      | Tự động gia hạn                               |
| created_at    | TIMESTAMP    | Ngày tạo                                      |
| updated_at    | TIMESTAMP    | Ngày cập nhật                                 |

**Quan hệ:**

- Một `tenant` có nhiều lịch sử subscription.
- Tại một thời điểm nên chỉ có một subscription active.

---

## 3.3. `subscription_payments`

Lưu lịch sử thanh toán gói SaaS của chủ trọ.

| Cột              | Kiểu dữ liệu | Mô tả                           |
| ---------------- | ------------ | ------------------------------- |
| id               | UUID         | Khóa chính                      |
| subscription_id  | UUID         | FK đến `subscriptions.id`       |
| tenant_id        | UUID         | FK đến `tenants.id`             |
| amount           | DECIMAL      | Số tiền                         |
| payment_method   | VARCHAR      | Phương thức                     |
| transaction_code | VARCHAR      | Mã giao dịch                    |
| status           | ENUM         | PENDING, PAID, FAILED, REFUNDED |
| paid_at          | TIMESTAMP    | Thời gian thanh toán            |
| created_at       | TIMESTAMP    | Ngày tạo                        |

---

# 4. Nhóm bảng quản lý nhà, phòng, tiện ích

## 4.1. `properties`

Đại diện cho nhà trọ, tòa nhà, chung cư mini hoặc cụm phòng.

| Cột            | Kiểu dữ liệu | Mô tả                                  |
| -------------- | ------------ | -------------------------------------- |
| id             | UUID         | Khóa chính                             |
| tenant_id      | UUID         | FK đến `tenants.id`                    |
| name           | VARCHAR      | Tên nhà / tòa nhà                      |
| type           | ENUM         | HOUSE, MINI_APARTMENT, DORM, APARTMENT |
| province       | VARCHAR      | Tỉnh / thành                           |
| district       | VARCHAR      | Quận / huyện                           |
| ward           | VARCHAR      | Phường / xã                            |
| address_detail | TEXT         | Địa chỉ chi tiết                       |
| latitude       | DECIMAL      | Vĩ độ                                  |
| longitude      | DECIMAL      | Kinh độ                                |
| description    | TEXT         | Mô tả                                  |
| status         | ENUM         | ACTIVE, INACTIVE, MAINTENANCE          |
| created_at     | TIMESTAMP    | Ngày tạo                               |
| updated_at     | TIMESTAMP    | Ngày cập nhật                          |
| deleted_at     | TIMESTAMP    | Xóa mềm                                |

**Quan hệ:**

- Một `tenant` có nhiều `properties`.
- Một `property` có nhiều `rooms`.

---

## 4.2. `floors`

Quản lý tầng trong từng tòa nhà.

| Cột          | Kiểu dữ liệu | Mô tả                  |
| ------------ | ------------ | ---------------------- |
| id           | UUID         | Khóa chính             |
| tenant_id    | UUID         | FK đến `tenants.id`    |
| property_id  | UUID         | FK đến `properties.id` |
| name         | VARCHAR      | Tên tầng               |
| floor_number | INT          | Số tầng                |
| created_at   | TIMESTAMP    | Ngày tạo               |

---

## 4.3. `rooms`

Lưu thông tin phòng trọ/chung cư mini.

| Cột                | Kiểu dữ liệu | Mô tả                                                |
| ------------------ | ------------ | ---------------------------------------------------- |
| id                 | UUID         | Khóa chính                                           |
| tenant_id          | UUID         | FK đến `tenants.id`                                  |
| property_id        | UUID         | FK đến `properties.id`                               |
| floor_id           | UUID         | FK đến `floors.id`, nullable                         |
| room_code          | VARCHAR      | Mã phòng                                             |
| title              | VARCHAR      | Tiêu đề đăng phòng                                   |
| area               | DECIMAL      | Diện tích                                            |
| max_occupants      | INT          | Số người tối đa                                      |
| base_price         | DECIMAL      | Giá thuê cơ bản                                      |
| deposit_amount     | DECIMAL      | Tiền cọc                                             |
| electricity_price  | DECIMAL      | Giá điện                                             |
| water_price        | DECIMAL      | Giá nước                                             |
| description        | TEXT         | Mô tả                                                |
| status             | ENUM         | AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE, INACTIVE |
| marketplace_status | ENUM         | DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, HIDDEN   |
| published_at       | TIMESTAMP    | Ngày đăng marketplace                                |
| created_at         | TIMESTAMP    | Ngày tạo                                             |
| updated_at         | TIMESTAMP    | Ngày cập nhật                                        |
| deleted_at         | TIMESTAMP    | Xóa mềm                                              |

**Quan hệ:**

- Một `property` có nhiều `rooms`.
- Một `room` có nhiều hình ảnh, tiện ích, tài sản, hợp đồng, hóa đơn, chỉ số điện nước.
- Một `room` có thể xuất hiện trên marketplace nếu `marketplace_status = PUBLISHED`.

---

## 4.4. `room_images`

Lưu hình ảnh phòng.

| Cột          | Kiểu dữ liệu | Mô tả             |
| ------------ | ------------ | ----------------- |
| id           | UUID         | Khóa chính        |
| room_id      | UUID         | FK đến `rooms.id` |
| url          | TEXT         | Link ảnh          |
| caption      | VARCHAR      | Chú thích         |
| sort_order   | INT          | Thứ tự hiển thị   |
| is_thumbnail | BOOLEAN      | Ảnh đại diện      |
| created_at   | TIMESTAMP    | Ngày tạo          |

---

## 4.5. `amenities`

Danh mục tiện ích dùng chung toàn hệ thống.

| Cột       | Kiểu dữ liệu | Mô tả         |
| --------- | ------------ | ------------- |
| id        | UUID         | Khóa chính    |
| name      | VARCHAR      | Tên tiện ích  |
| icon      | VARCHAR      | Icon          |
| category  | VARCHAR      | Nhóm tiện ích |
| is_active | BOOLEAN      | Trạng thái    |

Ví dụ tiện ích:

- Máy lạnh
- Gác lửng
- Toilet riêng
- Wifi
- Bãi giữ xe
- Camera an ninh
- Máy giặt
- Ban công

---

## 4.6. `room_amenities`

Bảng trung gian giữa phòng và tiện ích.

| Cột        | Kiểu dữ liệu | Mô tả                 |
| ---------- | ------------ | --------------------- |
| room_id    | UUID         | FK đến `rooms.id`     |
| amenity_id | UUID         | FK đến `amenities.id` |

**Quan hệ:**

- Một phòng có nhiều tiện ích.
- Một tiện ích có thể thuộc nhiều phòng.

---

# 5. Nhóm bảng người thuê và hồ sơ thuê

## 5.1. `renter_profiles`

Thông tin hồ sơ người thuê trên mobile app.

| Cột                     | Kiểu dữ liệu | Mô tả                                   |
| ----------------------- | ------------ | --------------------------------------- |
| id                      | UUID         | Khóa chính                              |
| user_id                 | UUID         | FK đến `users.id`                       |
| date_of_birth           | DATE         | Ngày sinh                               |
| gender                  | ENUM         | MALE, FEMALE, OTHER                     |
| identity_number         | VARCHAR      | CCCD/CMND                               |
| identity_front_url      | TEXT         | Ảnh CCCD mặt trước                      |
| identity_back_url       | TEXT         | Ảnh CCCD mặt sau                        |
| permanent_address       | TEXT         | Địa chỉ thường trú                      |
| occupation              | VARCHAR      | Nghề nghiệp                             |
| emergency_contact_name  | VARCHAR      | Người liên hệ khẩn cấp                  |
| emergency_contact_phone | VARCHAR      | SĐT khẩn cấp                            |
| verification_status     | ENUM         | UNVERIFIED, PENDING, VERIFIED, REJECTED |
| created_at              | TIMESTAMP    | Ngày tạo                                |
| updated_at              | TIMESTAMP    | Ngày cập nhật                           |

**Quan hệ:**

- Một `user` có một `renter_profile`.
- Một người thuê có thể có nhiều hợp đồng thuê qua thời gian.

---

## 5.2. `rental_histories`

Lưu lịch sử thuê phòng của người thuê.

| Cột         | Kiểu dữ liệu | Mô tả                     |
| ----------- | ------------ | ------------------------- |
| id          | UUID         | Khóa chính                |
| renter_id   | UUID         | FK đến `users.id`         |
| tenant_id   | UUID         | FK đến `tenants.id`       |
| room_id     | UUID         | FK đến `rooms.id`         |
| contract_id | UUID         | FK đến `contracts.id`     |
| started_at  | DATE         | Ngày bắt đầu thuê         |
| ended_at    | DATE         | Ngày kết thúc             |
| status      | ENUM         | ACTIVE, ENDED, TERMINATED |
| created_at  | TIMESTAMP    | Ngày tạo                  |

---

# 6. Nhóm bảng marketplace, tìm phòng, đặt lịch

## 6.1. `room_view_logs`

Lưu lịch sử xem phòng để phục vụ AI gợi ý.

| Cột        | Kiểu dữ liệu | Mô tả                                                |
| ---------- | ------------ | ---------------------------------------------------- |
| id         | UUID         | Khóa chính                                           |
| user_id    | UUID         | FK đến `users.id`, nullable nếu khách chưa đăng nhập |
| room_id    | UUID         | FK đến `rooms.id`                                    |
| ip_address | VARCHAR      | IP người xem                                         |
| user_agent | TEXT         | Thiết bị/trình duyệt                                 |
| viewed_at  | TIMESTAMP    | Thời gian xem                                        |

---

## 6.2. `favorite_rooms`

Danh sách phòng yêu thích của người thuê.

| Cột        | Kiểu dữ liệu | Mô tả             |
| ---------- | ------------ | ----------------- |
| user_id    | UUID         | FK đến `users.id` |
| room_id    | UUID         | FK đến `rooms.id` |
| created_at | TIMESTAMP    | Ngày thêm         |

---

## 6.3. `room_viewing_appointments`

Đặt lịch xem phòng.

| Cột               | Kiểu dữ liệu | Mô tả                                                          |
| ----------------- | ------------ | -------------------------------------------------------------- |
| id                | UUID         | Khóa chính                                                     |
| tenant_id         | UUID         | FK đến `tenants.id`                                            |
| room_id           | UUID         | FK đến `rooms.id`                                              |
| renter_id         | UUID         | FK đến `users.id`                                              |
| assigned_staff_id | UUID         | FK đến `users.id`, nullable                                    |
| scheduled_at      | TIMESTAMP    | Thời gian hẹn xem                                              |
| note              | TEXT         | Ghi chú của người thuê                                         |
| landlord_note     | TEXT         | Ghi chú của chủ trọ                                            |
| status            | ENUM         | PENDING, CONFIRMED, REJECTED, RESCHEDULED, CANCELED, COMPLETED |
| created_at        | TIMESTAMP    | Ngày tạo                                                       |
| updated_at        | TIMESTAMP    | Ngày cập nhật                                                  |

---

## 6.4. `rental_requests`

Yêu cầu thuê phòng.

| Cột                 | Kiểu dữ liệu | Mô tả                                                                        |
| ------------------- | ------------ | ---------------------------------------------------------------------------- |
| id                  | UUID         | Khóa chính                                                                   |
| tenant_id           | UUID         | FK đến `tenants.id`                                                          |
| room_id             | UUID         | FK đến `rooms.id`                                                            |
| renter_id           | UUID         | FK đến `users.id`                                                            |
| appointment_id      | UUID         | FK đến `room_viewing_appointments.id`, nullable                              |
| message             | TEXT         | Lời nhắn                                                                     |
| expected_start_date | DATE         | Ngày muốn thuê                                                               |
| status              | ENUM         | PENDING, APPROVED, REJECTED, NEED_MORE_INFO, CANCELED, CONVERTED_TO_CONTRACT |
| created_at          | TIMESTAMP    | Ngày tạo                                                                     |
| updated_at          | TIMESTAMP    | Ngày cập nhật                                                                |

**Quan hệ:**

- Một yêu cầu thuê được duyệt có thể chuyển thành một hợp đồng.

---

# 7. Nhóm bảng hợp đồng và ký online

## 7.1. `contract_templates`

Mẫu hợp đồng của từng chủ trọ.

| Cột              | Kiểu dữ liệu | Mô tả                          |
| ---------------- | ------------ | ------------------------------ |
| id               | UUID         | Khóa chính                     |
| tenant_id        | UUID         | FK đến `tenants.id`            |
| name             | VARCHAR      | Tên mẫu                        |
| content          | TEXT         | Nội dung mẫu hợp đồng          |
| variables_schema | JSONB        | Danh sách biến có thể thay thế |
| is_default       | BOOLEAN      | Mẫu mặc định                   |
| created_at       | TIMESTAMP    | Ngày tạo                       |
| updated_at       | TIMESTAMP    | Ngày cập nhật                  |

Ví dụ `variables_schema`:

```json
{
  "renter_name": "string",
  "room_code": "string",
  "base_price": "number",
  "deposit_amount": "number",
  "start_date": "date",
  "end_date": "date"
}
```

---

## 7.2. `contracts`

Lưu hợp đồng thuê phòng.

| Cột                   | Kiểu dữ liệu | Mô tả                                                                                    |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| id                    | UUID         | Khóa chính                                                                               |
| tenant_id             | UUID         | FK đến `tenants.id`                                                                      |
| room_id               | UUID         | FK đến `rooms.id`                                                                        |
| renter_id             | UUID         | FK đến `users.id`                                                                        |
| rental_request_id     | UUID         | FK đến `rental_requests.id`, nullable                                                    |
| template_id           | UUID         | FK đến `contract_templates.id`, nullable                                                 |
| contract_code         | VARCHAR      | Mã hợp đồng                                                                              |
| start_date            | DATE         | Ngày bắt đầu                                                                             |
| end_date              | DATE         | Ngày kết thúc                                                                            |
| monthly_price         | DECIMAL      | Giá thuê mỗi tháng                                                                       |
| deposit_amount        | DECIMAL      | Tiền cọc                                                                                 |
| billing_cycle         | ENUM         | MONTHLY, QUARTERLY                                                                       |
| payment_due_day       | INT          | Ngày hạn thanh toán hằng tháng                                                           |
| content_snapshot      | TEXT         | Nội dung hợp đồng đã sinh                                                                |
| status                | ENUM         | DRAFT, WAITING_LANDLORD_SIGN, WAITING_RENTER_SIGN, ACTIVE, EXPIRED, TERMINATED, CANCELED |
| signed_by_landlord_at | TIMESTAMP    | Chủ trọ ký lúc                                                                           |
| signed_by_renter_at   | TIMESTAMP    | Người thuê ký lúc                                                                        |
| created_at            | TIMESTAMP    | Ngày tạo                                                                                 |
| updated_at            | TIMESTAMP    | Ngày cập nhật                                                                            |
| deleted_at            | TIMESTAMP    | Xóa mềm                                                                                  |

---

## 7.3. `contract_members`

Trong trường hợp một phòng có nhiều người ở, bảng này lưu danh sách người thuê liên quan đến hợp đồng.

| Cột         | Kiểu dữ liệu | Mô tả                  |
| ----------- | ------------ | ---------------------- |
| id          | UUID         | Khóa chính             |
| contract_id | UUID         | FK đến `contracts.id`  |
| user_id     | UUID         | FK đến `users.id`      |
| role        | ENUM         | MAIN_RENTER, CO_RENTER |
| created_at  | TIMESTAMP    | Ngày tạo               |

---

## 7.4. `contract_files`

Lưu file PDF hợp đồng đã xuất.

| Cột         | Kiểu dữ liệu | Mô tả                 |
| ----------- | ------------ | --------------------- |
| id          | UUID         | Khóa chính            |
| contract_id | UUID         | FK đến `contracts.id` |
| file_url    | TEXT         | Link file             |
| file_type   | VARCHAR      | PDF, DOCX             |
| version     | INT          | Phiên bản             |
| created_at  | TIMESTAMP    | Ngày tạo              |

---

## 7.5. `contract_termination_requests`

Yêu cầu trả phòng / thanh lý hợp đồng.

| Cột                    | Kiểu dữ liệu | Mô tả                                            |
| ---------------------- | ------------ | ------------------------------------------------ |
| id                     | UUID         | Khóa chính                                       |
| tenant_id              | UUID         | FK đến `tenants.id`                              |
| contract_id            | UUID         | FK đến `contracts.id`                            |
| requested_by           | UUID         | FK đến `users.id`                                |
| reason                 | TEXT         | Lý do trả phòng                                  |
| expected_move_out_date | DATE         | Ngày dự kiến trả phòng                           |
| status                 | ENUM         | PENDING, APPROVED, REJECTED, COMPLETED, CANCELED |
| created_at             | TIMESTAMP    | Ngày tạo                                         |
| updated_at             | TIMESTAMP    | Ngày cập nhật                                    |

---

# 8. Nhóm bảng tài sản, bàn giao phòng

## 8.1. `asset_categories`

Danh mục loại tài sản.

| Cột         | Kiểu dữ liệu | Mô tả            |
| ----------- | ------------ | ---------------- |
| id          | UUID         | Khóa chính       |
| name        | VARCHAR      | Tên loại tài sản |
| description | TEXT         | Mô tả            |

Ví dụ:

- Giường
- Tủ
- Máy lạnh
- Chìa khóa
- Đồng hồ điện
- Đồng hồ nước
- Bàn ghế

---

## 8.2. `room_assets`

Tài sản trong phòng.

| Cột         | Kiểu dữ liệu | Mô tả                            |
| ----------- | ------------ | -------------------------------- |
| id          | UUID         | Khóa chính                       |
| tenant_id   | UUID         | FK đến `tenants.id`              |
| room_id     | UUID         | FK đến `rooms.id`                |
| category_id | UUID         | FK đến `asset_categories.id`     |
| name        | VARCHAR      | Tên tài sản                      |
| quantity    | INT          | Số lượng                         |
| condition   | ENUM         | NEW, GOOD, NORMAL, DAMAGED, LOST |
| description | TEXT         | Mô tả                            |
| image_url   | TEXT         | Ảnh tài sản                      |
| created_at  | TIMESTAMP    | Ngày tạo                         |
| updated_at  | TIMESTAMP    | Ngày cập nhật                    |
| deleted_at  | TIMESTAMP    | Xóa mềm                          |

---

## 8.3. `handover_records`

Biên bản bàn giao / trả phòng.

| Cột                   | Kiểu dữ liệu | Mô tả                      |
| --------------------- | ------------ | -------------------------- |
| id                    | UUID         | Khóa chính                 |
| tenant_id             | UUID         | FK đến `tenants.id`        |
| contract_id           | UUID         | FK đến `contracts.id`      |
| room_id               | UUID         | FK đến `rooms.id`          |
| type                  | ENUM         | CHECKIN, CHECKOUT          |
| note                  | TEXT         | Ghi chú                    |
| signed_by_landlord_at | TIMESTAMP    | Chủ trọ xác nhận           |
| signed_by_renter_at   | TIMESTAMP    | Người thuê xác nhận        |
| status                | ENUM         | DRAFT, CONFIRMED, DISPUTED |
| created_at            | TIMESTAMP    | Ngày tạo                   |

---

## 8.4. `handover_asset_items`

Chi tiết tài sản trong biên bản bàn giao.

| Cột                | Kiểu dữ liệu | Mô tả                            |
| ------------------ | ------------ | -------------------------------- |
| id                 | UUID         | Khóa chính                       |
| handover_record_id | UUID         | FK đến `handover_records.id`     |
| room_asset_id      | UUID         | FK đến `room_assets.id`          |
| quantity           | INT          | Số lượng                         |
| condition          | ENUM         | NEW, GOOD, NORMAL, DAMAGED, LOST |
| note               | TEXT         | Ghi chú                          |
| image_url          | TEXT         | Ảnh bằng chứng                   |

---

# 9. Nhóm bảng điện nước, OCR và chỉ số tiêu thụ

## 9.1. `utility_meters`

Quản lý đồng hồ điện/nước theo phòng.

| Cột        | Kiểu dữ liệu | Mô tả                    |
| ---------- | ------------ | ------------------------ |
| id         | UUID         | Khóa chính               |
| tenant_id  | UUID         | FK đến `tenants.id`      |
| room_id    | UUID         | FK đến `rooms.id`        |
| type       | ENUM         | ELECTRICITY, WATER       |
| meter_code | VARCHAR      | Mã đồng hồ               |
| unit       | VARCHAR      | kWh, m3                  |
| status     | ENUM         | ACTIVE, INACTIVE, BROKEN |
| created_at | TIMESTAMP    | Ngày tạo                 |

---

## 9.2. `meter_readings`

Lưu chỉ số điện nước hằng tháng.

| Cột            | Kiểu dữ liệu | Mô tả                                |
| -------------- | ------------ | ------------------------------------ |
| id             | UUID         | Khóa chính                           |
| tenant_id      | UUID         | FK đến `tenants.id`                  |
| room_id        | UUID         | FK đến `rooms.id`                    |
| meter_id       | UUID         | FK đến `utility_meters.id`           |
| contract_id    | UUID         | FK đến `contracts.id`, nullable      |
| billing_month  | DATE         | Tháng ghi chỉ số                     |
| previous_value | DECIMAL      | Chỉ số cũ                            |
| current_value  | DECIMAL      | Chỉ số mới                           |
| consumption    | DECIMAL      | Số tiêu thụ                          |
| unit_price     | DECIMAL      | Đơn giá                              |
| amount         | DECIMAL      | Thành tiền                           |
| image_url      | TEXT         | Ảnh đồng hồ                          |
| source         | ENUM         | MANUAL, OCR, IMPORT                  |
| status         | ENUM         | DRAFT, CONFIRMED, ABNORMAL, REJECTED |
| recorded_by    | UUID         | FK đến `users.id`                    |
| recorded_at    | TIMESTAMP    | Ngày ghi                             |

---

## 9.3. `ocr_jobs`

Lưu tác vụ OCR xử lý ảnh điện nước.

| Cột              | Kiểu dữ liệu | Mô tả                                             |
| ---------------- | ------------ | ------------------------------------------------- |
| id               | UUID         | Khóa chính                                        |
| tenant_id        | UUID         | FK đến `tenants.id`                               |
| room_id          | UUID         | FK đến `rooms.id`                                 |
| meter_id         | UUID         | FK đến `utility_meters.id`                        |
| uploaded_by      | UUID         | FK đến `users.id`                                 |
| image_url        | TEXT         | Ảnh đầu vào                                       |
| recognized_value | DECIMAL      | Chỉ số nhận diện                                  |
| confidence       | DECIMAL      | Độ tin cậy                                        |
| raw_result       | JSONB        | Kết quả thô từ OCR                                |
| status           | ENUM         | PENDING, PROCESSING, SUCCESS, FAILED, NEED_REVIEW |
| error_message    | TEXT         | Lỗi nếu có                                        |
| created_at       | TIMESTAMP    | Ngày tạo                                          |
| processed_at     | TIMESTAMP    | Ngày xử lý xong                                   |

---

# 10. Nhóm bảng hóa đơn, công nợ và thanh toán

## 10.1. `invoice_batches`

Dùng khi tạo hóa đơn hàng loạt.

| Cột            | Kiểu dữ liệu | Mô tả                                |
| -------------- | ------------ | ------------------------------------ |
| id             | UUID         | Khóa chính                           |
| tenant_id      | UUID         | FK đến `tenants.id`                  |
| billing_month  | DATE         | Tháng lập hóa đơn                    |
| created_by     | UUID         | FK đến `users.id`                    |
| status         | ENUM         | DRAFT, PROCESSING, COMPLETED, FAILED |
| total_invoices | INT          | Tổng số hóa đơn                      |
| created_at     | TIMESTAMP    | Ngày tạo                             |

---

## 10.2. `invoices`

Hóa đơn tiền phòng, điện, nước, dịch vụ.

| Cột             | Kiểu dữ liệu | Mô tả                                                  |
| --------------- | ------------ | ------------------------------------------------------ |
| id              | UUID         | Khóa chính                                             |
| tenant_id       | UUID         | FK đến `tenants.id`                                    |
| batch_id        | UUID         | FK đến `invoice_batches.id`, nullable                  |
| contract_id     | UUID         | FK đến `contracts.id`                                  |
| room_id         | UUID         | FK đến `rooms.id`                                      |
| renter_id       | UUID         | FK đến `users.id`                                      |
| invoice_code    | VARCHAR      | Mã hóa đơn                                             |
| billing_month   | DATE         | Tháng tính tiền                                        |
| issue_date      | DATE         | Ngày phát hành                                         |
| due_date        | DATE         | Hạn thanh toán                                         |
| subtotal        | DECIMAL      | Tạm tính                                               |
| discount_amount | DECIMAL      | Giảm giá                                               |
| penalty_amount  | DECIMAL      | Phí phạt                                               |
| total_amount    | DECIMAL      | Tổng tiền                                              |
| paid_amount     | DECIMAL      | Đã thanh toán                                          |
| debt_amount     | DECIMAL      | Còn nợ                                                 |
| status          | ENUM         | DRAFT, UNPAID, PARTIALLY_PAID, PAID, OVERDUE, CANCELED |
| note            | TEXT         | Ghi chú                                                |
| created_at      | TIMESTAMP    | Ngày tạo                                               |
| updated_at      | TIMESTAMP    | Ngày cập nhật                                          |

---

## 10.3. `invoice_items`

Chi tiết từng khoản trong hóa đơn.

| Cột              | Kiểu dữ liệu | Mô tả                                                                          |
| ---------------- | ------------ | ------------------------------------------------------------------------------ |
| id               | UUID         | Khóa chính                                                                     |
| invoice_id       | UUID         | FK đến `invoices.id`                                                           |
| item_type        | ENUM         | RENT, ELECTRICITY, WATER, SERVICE, PARKING, INTERNET, PENALTY, DISCOUNT, OTHER |
| description      | TEXT         | Nội dung                                                                       |
| quantity         | DECIMAL      | Số lượng                                                                       |
| unit_price       | DECIMAL      | Đơn giá                                                                        |
| amount           | DECIMAL      | Thành tiền                                                                     |
| meter_reading_id | UUID         | FK đến `meter_readings.id`, nullable                                           |
| created_at       | TIMESTAMP    | Ngày tạo                                                                       |

---

## 10.4. `payments`

Lưu thanh toán của người thuê.

| Cột              | Kiểu dữ liệu | Mô tả                                        |
| ---------------- | ------------ | -------------------------------------------- |
| id               | UUID         | Khóa chính                                   |
| tenant_id        | UUID         | FK đến `tenants.id`                          |
| invoice_id       | UUID         | FK đến `invoices.id`                         |
| payer_id         | UUID         | FK đến `users.id`                            |
| amount           | DECIMAL      | Số tiền thanh toán                           |
| method           | ENUM         | CASH, BANK_TRANSFER, QR, WALLET              |
| provider         | VARCHAR      | VietQR, VNPay, MoMo, ZaloPay                 |
| transaction_code | VARCHAR      | Mã giao dịch                                 |
| status           | ENUM         | PENDING, SUCCESS, FAILED, CANCELED, REFUNDED |
| paid_at          | TIMESTAMP    | Thời gian thanh toán                         |
| created_at       | TIMESTAMP    | Ngày tạo                                     |

---

## 10.5. `payment_qr_codes`

Lưu mã QR động cho hóa đơn.

| Cột          | Kiểu dữ liệu | Mô tả                           |
| ------------ | ------------ | ------------------------------- |
| id           | UUID         | Khóa chính                      |
| tenant_id    | UUID         | FK đến `tenants.id`             |
| invoice_id   | UUID         | FK đến `invoices.id`            |
| provider     | VARCHAR      | Nhà cung cấp QR                 |
| qr_content   | TEXT         | Nội dung QR                     |
| qr_image_url | TEXT         | Ảnh QR                          |
| amount       | DECIMAL      | Số tiền                         |
| expired_at   | TIMESTAMP    | Thời gian hết hạn               |
| status       | ENUM         | ACTIVE, EXPIRED, PAID, CANCELED |
| created_at   | TIMESTAMP    | Ngày tạo                        |

---

## 10.6. `payment_webhook_logs`

Log webhook thanh toán từ cổng thanh toán.

| Cột              | Kiểu dữ liệu | Mô tả                                  |
| ---------------- | ------------ | -------------------------------------- |
| id               | UUID         | Khóa chính                             |
| provider         | VARCHAR      | Tên cổng thanh toán                    |
| tenant_id        | UUID         | FK đến `tenants.id`, nullable lúc đầu  |
| invoice_id       | UUID         | FK đến `invoices.id`, nullable lúc đầu |
| transaction_code | VARCHAR      | Mã giao dịch                           |
| payload          | JSONB        | Dữ liệu webhook gốc                    |
| signature_valid  | BOOLEAN      | Chữ ký hợp lệ không                    |
| status           | ENUM         | RECEIVED, PROCESSED, FAILED, IGNORED   |
| error_message    | TEXT         | Lỗi nếu có                             |
| received_at      | TIMESTAMP    | Thời gian nhận                         |

---

# 11. Nhóm bảng ticket, bảo trì và chat

## 11.1. `tickets`

Ticket báo cáo sự cố.

| Cột         | Kiểu dữ liệu | Mô tả                                                              |
| ----------- | ------------ | ------------------------------------------------------------------ |
| id          | UUID         | Khóa chính                                                         |
| tenant_id   | UUID         | FK đến `tenants.id`                                                |
| room_id     | UUID         | FK đến `rooms.id`                                                  |
| contract_id | UUID         | FK đến `contracts.id`, nullable                                    |
| created_by  | UUID         | FK đến `users.id`                                                  |
| assigned_to | UUID         | FK đến `users.id`, nullable                                        |
| title       | VARCHAR      | Tiêu đề                                                            |
| description | TEXT         | Mô tả sự cố                                                        |
| category    | ENUM         | ELECTRICITY, WATER, INTERNET, FURNITURE, SECURITY, CLEANING, OTHER |
| priority    | ENUM         | LOW, MEDIUM, HIGH, URGENT                                          |
| status      | ENUM         | OPEN, IN_PROGRESS, WAITING_RENTER, RESOLVED, CLOSED, CANCELED      |
| created_at  | TIMESTAMP    | Ngày tạo                                                           |
| updated_at  | TIMESTAMP    | Ngày cập nhật                                                      |
| resolved_at | TIMESTAMP    | Ngày xử lý xong                                                    |

---

## 11.2. `ticket_attachments`

Ảnh / file đính kèm ticket.

| Cột         | Kiểu dữ liệu | Mô tả                  |
| ----------- | ------------ | ---------------------- |
| id          | UUID         | Khóa chính             |
| ticket_id   | UUID         | FK đến `tickets.id`    |
| file_url    | TEXT         | Link file              |
| file_type   | VARCHAR      | image, video, document |
| uploaded_by | UUID         | FK đến `users.id`      |
| created_at  | TIMESTAMP    | Ngày tạo               |

---

## 11.3. `ticket_comments`

Bình luận trong ticket.

| Cột         | Kiểu dữ liệu | Mô tả                      |
| ----------- | ------------ | -------------------------- |
| id          | UUID         | Khóa chính                 |
| ticket_id   | UUID         | FK đến `tickets.id`        |
| user_id     | UUID         | FK đến `users.id`          |
| message     | TEXT         | Nội dung                   |
| is_internal | BOOLEAN      | Ghi chú nội bộ cho chủ trọ |
| created_at  | TIMESTAMP    | Ngày tạo                   |

---

## 11.4. `conversations`

Phòng chat giữa người thuê và chủ trọ.

| Cột         | Kiểu dữ liệu | Mô tả                                               |
| ----------- | ------------ | --------------------------------------------------- |
| id          | UUID         | Khóa chính                                          |
| tenant_id   | UUID         | FK đến `tenants.id`                                 |
| room_id     | UUID         | FK đến `rooms.id`, nullable                         |
| contract_id | UUID         | FK đến `contracts.id`, nullable                     |
| ticket_id   | UUID         | FK đến `tickets.id`, nullable                       |
| type        | ENUM         | ROOM_CHAT, CONTRACT_CHAT, TICKET_CHAT, SUPPORT_CHAT |
| created_at  | TIMESTAMP    | Ngày tạo                                            |

---

## 11.5. `conversation_members`

Thành viên trong cuộc trò chuyện.

| Cột             | Kiểu dữ liệu | Mô tả                     |
| --------------- | ------------ | ------------------------- |
| conversation_id | UUID         | FK đến `conversations.id` |
| user_id         | UUID         | FK đến `users.id`         |
| joined_at       | TIMESTAMP    | Ngày tham gia             |

---

## 11.6. `messages`

Tin nhắn trong cuộc trò chuyện.

| Cột             | Kiểu dữ liệu | Mô tả                     |
| --------------- | ------------ | ------------------------- |
| id              | UUID         | Khóa chính                |
| conversation_id | UUID         | FK đến `conversations.id` |
| sender_id       | UUID         | FK đến `users.id`         |
| content         | TEXT         | Nội dung                  |
| message_type    | ENUM         | TEXT, IMAGE, FILE, SYSTEM |
| file_url        | TEXT         | File đính kèm             |
| read_at         | TIMESTAMP    | Đã đọc lúc                |
| created_at      | TIMESTAMP    | Ngày gửi                  |
| deleted_at      | TIMESTAMP    | Xóa mềm                   |

---

# 12. Nhóm bảng đánh giá, uy tín, báo cáo vi phạm

## 12.1. `reviews`

Đánh giá phòng và chủ trọ.

| Cột               | Kiểu dữ liệu | Mô tả                               |
| ----------------- | ------------ | ----------------------------------- |
| id                | UUID         | Khóa chính                          |
| tenant_id         | UUID         | FK đến `tenants.id`                 |
| room_id           | UUID         | FK đến `rooms.id`                   |
| contract_id       | UUID         | FK đến `contracts.id`, nullable     |
| reviewer_id       | UUID         | FK đến `users.id`                   |
| rating            | INT          | Điểm 1-5                            |
| content           | TEXT         | Nội dung đánh giá                   |
| cleanliness_score | INT          | Điểm vệ sinh                        |
| location_score    | INT          | Điểm vị trí                         |
| price_score       | INT          | Điểm giá                            |
| service_score     | INT          | Điểm dịch vụ                        |
| is_visible        | BOOLEAN      | Có hiển thị không                   |
| status            | ENUM         | PENDING, APPROVED, REJECTED, HIDDEN |
| created_at        | TIMESTAMP    | Ngày tạo                            |

---

## 12.2. `reputation_scores`

Điểm uy tín tổng hợp của chủ trọ/phòng.

| Cột                   | Kiểu dữ liệu | Mô tả                       |
| --------------------- | ------------ | --------------------------- |
| id                    | UUID         | Khóa chính                  |
| target_type           | ENUM         | TENANT, ROOM                |
| tenant_id             | UUID         | FK đến `tenants.id`         |
| room_id               | UUID         | FK đến `rooms.id`, nullable |
| average_rating        | DECIMAL      | Điểm đánh giá trung bình    |
| total_reviews         | INT          | Số đánh giá                 |
| ticket_response_score | DECIMAL      | Điểm xử lý sự cố            |
| transparency_score    | DECIMAL      | Điểm minh bạch chi phí      |
| verification_score    | DECIMAL      | Điểm xác minh               |
| final_score           | DECIMAL      | Điểm tổng                   |
| updated_at            | TIMESTAMP    | Ngày cập nhật               |

---

## 12.3. `reports`

Báo cáo vi phạm marketplace.

| Cột         | Kiểu dữ liệu | Mô tả                                  |
| ----------- | ------------ | -------------------------------------- |
| id          | UUID         | Khóa chính                             |
| reporter_id | UUID         | FK đến `users.id`                      |
| target_type | ENUM         | ROOM, TENANT, REVIEW, USER             |
| target_id   | UUID         | ID đối tượng bị báo cáo                |
| reason      | VARCHAR      | Lý do                                  |
| description | TEXT         | Mô tả                                  |
| status      | ENUM         | PENDING, REVIEWING, RESOLVED, REJECTED |
| handled_by  | UUID         | FK đến `users.id`, nullable            |
| created_at  | TIMESTAMP    | Ngày tạo                               |
| resolved_at | TIMESTAMP    | Ngày xử lý                             |

---

# 13. Nhóm bảng thông báo

## 13.1. `notifications`

Thông báo trong hệ thống.

| Cột        | Kiểu dữ liệu | Mô tả                                                   |
| ---------- | ------------ | ------------------------------------------------------- |
| id         | UUID         | Khóa chính                                              |
| user_id    | UUID         | FK đến `users.id`                                       |
| tenant_id  | UUID         | FK đến `tenants.id`, nullable                           |
| title      | VARCHAR      | Tiêu đề                                                 |
| content    | TEXT         | Nội dung                                                |
| type       | ENUM         | INVOICE, PAYMENT, CONTRACT, TICKET, APPOINTMENT, SYSTEM |
| data       | JSONB        | Dữ liệu phụ                                             |
| is_read    | BOOLEAN      | Đã đọc chưa                                             |
| read_at    | TIMESTAMP    | Đọc lúc                                                 |
| created_at | TIMESTAMP    | Ngày tạo                                                |

---

## 13.2. `device_tokens`

Token thiết bị để gửi Firebase Cloud Messaging.

| Cột         | Kiểu dữ liệu | Mô tả             |
| ----------- | ------------ | ----------------- |
| id          | UUID         | Khóa chính        |
| user_id     | UUID         | FK đến `users.id` |
| token       | TEXT         | FCM token         |
| platform    | ENUM         | IOS, ANDROID, WEB |
| device_name | VARCHAR      | Tên thiết bị      |
| is_active   | BOOLEAN      | Trạng thái        |
| created_at  | TIMESTAMP    | Ngày tạo          |
| updated_at  | TIMESTAMP    | Ngày cập nhật     |

---

# 14. Nhóm bảng AI gợi ý và chatbot

## 14.1. `ai_recommendation_logs`

Log gợi ý phòng cho người thuê hoặc gợi ý giá cho chủ trọ.

| Cột         | Kiểu dữ liệu | Mô tả                                 |
| ----------- | ------------ | ------------------------------------- |
| id          | UUID         | Khóa chính                            |
| user_id     | UUID         | FK đến `users.id`, nullable           |
| tenant_id   | UUID         | FK đến `tenants.id`, nullable         |
| type        | ENUM         | ROOM_RECOMMENDATION, PRICE_SUGGESTION |
| input_data  | JSONB        | Dữ liệu đầu vào                       |
| output_data | JSONB        | Kết quả AI                            |
| model_name  | VARCHAR      | Model sử dụng                         |
| created_at  | TIMESTAMP    | Ngày tạo                              |

---

## 14.2. `room_price_suggestions`

Lưu kết quả AI gợi ý giá thuê.

| Cột             | Kiểu dữ liệu | Mô tả               |
| --------------- | ------------ | ------------------- |
| id              | UUID         | Khóa chính          |
| tenant_id       | UUID         | FK đến `tenants.id` |
| room_id         | UUID         | FK đến `rooms.id`   |
| suggested_price | DECIMAL      | Giá AI đề xuất      |
| min_price       | DECIMAL      | Giá thấp            |
| max_price       | DECIMAL      | Giá cao             |
| confidence      | DECIMAL      | Độ tin cậy          |
| reason          | TEXT         | Lý do gợi ý         |
| input_snapshot  | JSONB        | Dữ liệu đầu vào     |
| created_at      | TIMESTAMP    | Ngày tạo            |

---

## 14.3. `chatbot_sessions`

Phiên chatbot hỗ trợ người dùng.

| Cột        | Kiểu dữ liệu | Mô tả                         |
| ---------- | ------------ | ----------------------------- |
| id         | UUID         | Khóa chính                    |
| user_id    | UUID         | FK đến `users.id`, nullable   |
| tenant_id  | UUID         | FK đến `tenants.id`, nullable |
| channel    | ENUM         | WEB, MOBILE                   |
| status     | ENUM         | ACTIVE, CLOSED                |
| created_at | TIMESTAMP    | Ngày tạo                      |
| ended_at   | TIMESTAMP    | Kết thúc lúc                  |

---

## 14.4. `chatbot_messages`

Tin nhắn trong phiên chatbot.

| Cột         | Kiểu dữ liệu | Mô tả                        |
| ----------- | ------------ | ---------------------------- |
| id          | UUID         | Khóa chính                   |
| session_id  | UUID         | FK đến `chatbot_sessions.id` |
| sender_type | ENUM         | USER, BOT, STAFF             |
| message     | TEXT         | Nội dung                     |
| metadata    | JSONB        | Dữ liệu phụ                  |
| created_at  | TIMESTAMP    | Ngày tạo                     |

---

# 15. Nhóm bảng hàng đợi, webhook, audit log

## 15.1. `background_jobs`

Lưu trạng thái các tác vụ nền nếu muốn hiển thị cho Admin.

| Cột           | Kiểu dữ liệu | Mô tả                                        |
| ------------- | ------------ | -------------------------------------------- |
| id            | UUID         | Khóa chính                                   |
| tenant_id     | UUID         | FK đến `tenants.id`, nullable                |
| queue_name    | VARCHAR      | Tên queue                                    |
| job_type      | VARCHAR      | Loại job                                     |
| payload       | JSONB        | Dữ liệu xử lý                                |
| status        | ENUM         | WAITING, ACTIVE, COMPLETED, FAILED, RETRYING |
| attempts      | INT          | Số lần thử                                   |
| error_message | TEXT         | Lỗi                                          |
| created_at    | TIMESTAMP    | Ngày tạo                                     |
| processed_at  | TIMESTAMP    | Ngày xử lý                                   |
| completed_at  | TIMESTAMP    | Ngày hoàn tất                                |

---

## 15.2. `audit_logs`

Ghi lại thao tác quan trọng.

| Cột         | Kiểu dữ liệu | Mô tả                             |
| ----------- | ------------ | --------------------------------- |
| id          | UUID         | Khóa chính                        |
| tenant_id   | UUID         | FK đến `tenants.id`, nullable     |
| actor_id    | UUID         | FK đến `users.id`, nullable       |
| action      | VARCHAR      | CREATE_INVOICE, UPDATE_ROOM_PRICE |
| entity_type | VARCHAR      | ROOM, CONTRACT, INVOICE           |
| entity_id   | UUID         | ID đối tượng                      |
| old_values  | JSONB        | Dữ liệu cũ                        |
| new_values  | JSONB        | Dữ liệu mới                       |
| ip_address  | VARCHAR      | IP                                |
| user_agent  | TEXT         | Thiết bị                          |
| created_at  | TIMESTAMP    | Ngày tạo                          |

---

## 15.3. `system_settings`

Cấu hình hệ thống.

| Cột         | Kiểu dữ liệu | Mô tả         |
| ----------- | ------------ | ------------- |
| id          | UUID         | Khóa chính    |
| key         | VARCHAR      | Tên cấu hình  |
| value       | JSONB        | Giá trị       |
| description | TEXT         | Mô tả         |
| updated_at  | TIMESTAMP    | Ngày cập nhật |

---

# 16. Tóm tắt quan hệ chính giữa các bảng

## Quan hệ người dùng và tenant

```text
users 1---n tenant_members n---1 tenants
users 1---1 renter_profiles
roles 1---n tenant_members
roles n---n permissions
```

## Quan hệ nhà, phòng, tiện ích

```text
tenants 1---n properties
properties 1---n floors
properties 1---n rooms
floors 1---n rooms
rooms 1---n room_images
rooms n---n amenities
```

## Quan hệ marketplace

```text
users 1---n room_view_logs
users n---n rooms thông qua favorite_rooms
rooms 1---n room_viewing_appointments
rooms 1---n rental_requests
rental_requests 1---0..1 contracts
```

## Quan hệ hợp đồng

```text
rooms 1---n contracts
users 1---n contracts với vai trò renter
contracts 1---n contract_members
contracts 1---n contract_files
contracts 1---n invoices
contracts 1---n handover_records
contracts 1---n contract_termination_requests
```

## Quan hệ hóa đơn và thanh toán

```text
invoice_batches 1---n invoices
invoices 1---n invoice_items
invoices 1---n payments
invoices 1---n payment_qr_codes
payments 1---n payment_webhook_logs hoặc webhook_logs liên kết ngược qua transaction_code
```

## Quan hệ điện nước và OCR

```text
rooms 1---n utility_meters
utility_meters 1---n meter_readings
meter_readings 0..1---n invoice_items
utility_meters 1---n ocr_jobs
```

## Quan hệ ticket và chat

```text
rooms 1---n tickets
contracts 1---n tickets
tickets 1---n ticket_comments
tickets 1---n ticket_attachments
tickets 0..1---1 conversations
conversations 1---n messages
conversations n---n users thông qua conversation_members
```

## Quan hệ đánh giá và uy tín

```text
rooms 1---n reviews
tenants 1---n reviews
users 1---n reviews
rooms 1---1 reputation_scores
tenants 1---1 reputation_scores
```

---

# 17. Danh sách bảng nên triển khai theo từng giai đoạn

## Giai đoạn 1: Core quản lý phòng trọ

Nên làm trước các bảng:

1. `users`
2. `roles`
3. `permissions`
4. `role_permissions`
5. `tenants`
6. `tenant_members`
7. `properties`
8. `floors`
9. `rooms`
10. `room_images`
11. `amenities`
12. `room_amenities`
13. `renter_profiles`

---

## Giai đoạn 2: Hợp đồng, hóa đơn, thanh toán

Triển khai tiếp:

1. `contract_templates`
2. `contracts`
3. `contract_members`
4. `contract_files`
5. `invoice_batches`
6. `invoices`
7. `invoice_items`
8. `payments`
9. `payment_qr_codes`
10. `payment_webhook_logs`

---

## Giai đoạn 3: Mobile app và vận hành

Triển khai:

1. `utility_meters`
2. `meter_readings`
3. `ocr_jobs`
4. `tickets`
5. `ticket_comments`
6. `ticket_attachments`
7. `notifications`
8. `device_tokens`
9. `handover_records`
10. `handover_asset_items`
11. `room_assets`
12. `asset_categories`

---

## Giai đoạn 4: Marketplace và AI

Triển khai:

1. `room_view_logs`
2. `favorite_rooms`
3. `room_viewing_appointments`
4. `rental_requests`
5. `reviews`
6. `reputation_scores`
7. `reports`
8. `ai_recommendation_logs`
9. `room_price_suggestions`
10. `chatbot_sessions`
11. `chatbot_messages`

---

## Giai đoạn 5: SaaS nâng cao và giám sát

Triển khai:

1. `plans`
2. `subscriptions`
3. `subscription_payments`
4. `background_jobs`
5. `audit_logs`
6. `system_settings`

---

# 18. Một số lưu ý quan trọng khi triển khai với PostgreSQL + Prisma

## 18.1. Các bảng nghiệp vụ nên có `tenant_id`

Các bảng sau nên bắt buộc có `tenant_id`:

- `properties`
- `rooms`
- `contracts`
- `invoices`
- `payments`
- `tickets`
- `meter_readings`
- `room_assets`
- `handover_records`
- `background_jobs`
- `audit_logs`

Điều này giúp query dễ hơn:

```ts
where: {
  tenantId: currentTenantId;
}
```

Và tránh rò rỉ dữ liệu giữa các chủ trọ.

---

## 18.2. Nên dùng UUID cho khóa chính

Với hệ thống SaaS có nhiều tenant, nên dùng:

```ts
id String @id @default(uuid())
```

Thay vì auto increment integer để tránh lộ số lượng dữ liệu và dễ đồng bộ về sau.

---

## 18.3. Nên có soft delete

Các bảng quan trọng nên có:

```text
deleted_at TIMESTAMP NULL
```

Đặc biệt là:

- `users`
- `tenants`
- `properties`
- `rooms`
- `contracts`
- `invoices`
- `room_assets`

Không nên xóa cứng dữ liệu tài chính, hợp đồng, hóa đơn.

---

## 18.4. Nên tạo index cho các cột quan trọng

Các cột nên đánh index:

```text
tenant_id
room_id
contract_id
renter_id
status
created_at
billing_month
invoice_code
transaction_code
```

Ví dụ:

```prisma
@@index([tenantId])
@@index([tenantId, status])
@@index([tenantId, createdAt])
@@index([tenantId, billingMonth])
```

---

## 18.5. Với marketplace nên tối ưu tìm kiếm

Bảng `rooms` nên có index cho:

```text
province
district
ward
base_price
area
status
marketplace_status
```

Về sau có thể tích hợp thêm:

- PostgreSQL Full Text Search
- PostGIS để tìm phòng theo vị trí
- Elasticsearch hoặc Meilisearch nếu marketplace lớn

---

# 19. Sơ đồ tổng quan module

```text
users
 ├── renter_profiles
 ├── tenant_members ─── tenants ─── subscriptions ─── plans
 │                         │
 │                         ├── properties ─── floors
 │                         │       │
 │                         │       └── rooms ─── room_images
 │                         │               ├── room_amenities ─── amenities
 │                         │               ├── room_assets ─── asset_categories
 │                         │               ├── utility_meters ─── meter_readings
 │                         │               ├── contracts ─── invoices ─── invoice_items
 │                         │               │       │              └── payments
 │                         │               │       └── handover_records
 │                         │               ├── tickets ─── ticket_comments
 │                         │               ├── rental_requests
 │                         │               ├── room_viewing_appointments
 │                         │               └── reviews
 │                         │
 │                         ├── audit_logs
 │                         ├── background_jobs
 │                         └── notifications
 │
 ├── favorite_rooms
 ├── room_view_logs
 └── chatbot_sessions
```

---

# 20. Kết luận đề xuất

Với đề tài của bạn, database nên thiết kế theo hướng:

- **Một database dùng chung**
- **Tách dữ liệu bằng `tenant_id`**
- **Dùng UUID làm khóa chính**
- **Có soft delete**
- **Có audit log**
- **Có bảng trung gian rõ ràng cho quan hệ nhiều-nhiều**
- **Tách module theo nghiệp vụ để dễ mở rộng**
- **Không trộn dữ liệu marketplace với dữ liệu vận hành nội bộ**
- **Không xóa cứng hợp đồng, hóa đơn, thanh toán**

Bộ bảng trên đủ để triển khai một hệ thống tốt nghiệp có quy mô lớn, chuyên nghiệp và có khả năng phát triển thành sản phẩm SaaS thực tế.
