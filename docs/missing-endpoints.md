# Trạng thái các API frontend từng báo thiếu

Tài liệu này ghi nhận contract backend thực tế sau khi hoàn thiện các endpoint. Phạm vi thay đổi chỉ gồm backend NestJS, OpenAPI và test; frontend vẫn có thể giữ mock/hook cho đến khi được nối API.

## Đã hoàn thành

### Chi tiết lịch hẹn xem phòng

- Endpoint: GET /room-viewing-appointments/:id
- Quyền: LANDLORD, MANAGER; dữ liệu luôn giới hạn theo active tenant.
- Response gồm renter, assignedStaff và room.
- Room có basePrice, depositAmount và property gồm id, name, addressDetail, ward, district, province.
- Trả 404 khi lịch hẹn không tồn tại hoặc thuộc tenant khác.

### Chi tiết lời mời người thuê

- Endpoint: GET /renters/invitations/:id
- Quyền: LANDLORD, MANAGER; route tĩnh được khai báo trước GET /renters/:id.
- Response gồm thông tin người nhận, tenant, người tạo, timestamps và acceptedUserId.
- Status được suy ra theo thứ tự ACCEPTED, CANCELED, EXPIRED, PENDING.
- Không trả codeHash, attemptCount, OTP hoặc link có quyền chấp nhận lời mời.

### Dashboard Action Center

- Endpoint: GET /dashboard/action-center
- Quyền: LANDLORD, MANAGER, ACCOUNTANT.
- Response gồm pendingRequests, expiringContracts, unpaidInvoices và openTickets; mỗi khối có total và tối đa 5 items.
- Pending request mới nhất trước; hợp đồng gần hết hạn trước; hóa đơn còn nợ kèm daysOverdue; ticket ưu tiên cao và cũ hơn trước.
- Toàn bộ truy vấn được giới hạn theo tenant.

### Thống kê công nợ

- Endpoint: GET /invoices/debts và GET /invoices/debts/me.
- Giữ nguyên data và meta, bổ sung stats gồm totalOutstanding, overdueMoreThan30Days, overdueWithin30Days và currentNotDue.
- Chỉ tính khoản còn nợ, loại PAID và CANCELED.
- Mốc ngày dùng đầu ngày UTC; stats áp dụng các filter nội dung hiện tại nhưng không dùng pagination và status.

### Thành viên hợp đồng

- Endpoint: GET /contracts/:id và GET /contracts/me/:id.
- Contract response và OpenAPI đã khai báo members[].
- Mỗi member gồm id, userId, role, createdAt và user.

## Ghi chú triển khai

- Không có migration database; invitation vẫn dùng OTP.
- Controller chỉ nhận request và phân quyền, service xử lý nghiệp vụ, repository chỉ truy vấn.
- Các method chính: getForLandlord, getInvitation, getActionCenter và getDebtStats.
- OpenAPI đã được sinh lại với 217 operations; các route mới có tenant header và response schema tương ứng.
