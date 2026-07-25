# Tài liệu yêu cầu chức năng MVP

**Đề tài:** Xây dựng nền tảng Web/App quản lý và cho thuê phòng trọ, chung cư mini thông minh theo mô hình SaaS & Marketplace  
**Sinh viên thực hiện:** Nguyễn Văn Thiện  
**MSSV:** 221A290093  
**Giảng viên hướng dẫn:** Quách Anh Dũng  
**Năm:** 2026

## 1. Giới thiệu

Tài liệu này mô tả phạm vi chức năng cho phiên bản MVP của nền tảng quản lý và cho thuê phòng trọ, chung cư mini theo mô hình SaaS & Marketplace. MVP tập trung vào các nghiệp vụ cốt lõi để phục vụ demo, đánh giá đồ án và làm nền tảng mở rộng sau này.

Phạm vi hiện tại đã được đồng bộ với backend và Prisma schema sau khi thu gọn:

- Đã loại khỏi MVP và schema: AI gợi ý phòng, AI gợi ý giá thuê, chatbot hỗ trợ.
- Không triển khai realtime dashboard trong MVP; dashboard cập nhật bằng REST API khi tải trang hoặc bấm làm mới.
- Giữ lại dữ liệu/nền tảng mở rộng cho: webhook thanh toán tự động, push notification, background job/queue, subscription payment và OCR điện nước demo.
- Thanh toán trong luồng MVP vẫn là QR/xác nhận thủ công; webhook thanh toán chỉ được giữ để tích hợp sau.

### 1.1. Mục tiêu tài liệu

- Xác định rõ phạm vi chức năng cần xây dựng trong phiên bản MVP.
- Làm cơ sở cho thiết kế cơ sở dữ liệu, API, giao diện và kiểm thử.
- Thống nhất nghiệp vụ giữa Super Admin, Chủ trọ và Người thuê.
- Hạn chế phát sinh phạm vi trong quá trình thực hiện đồ án.

### 1.2. Phạm vi hệ thống

- Web Platform cho Super Admin và Chủ trọ.
- Marketplace cơ bản cho người tìm phòng.
- Mobile App hoặc giao diện người thuê để xem phòng đang thuê, hợp đồng, hóa đơn, thanh toán và ticket.
- SaaS Multi-tenant đơn giản bằng `tenantId`/`ownerId`.
- Thanh toán QR thủ công trong MVP, có lưu thiết kế webhook để mở rộng sau.
- Dashboard báo cáo bằng REST API, không dùng realtime.

### 1.3. Nhóm người dùng

| Nhóm người dùng | Mô tả | Quyền chính |
| --- | --- | --- |
| Super Admin | Quản trị toàn bộ nền tảng SaaS. | Quản lý tenant, chủ trọ, gói dịch vụ, thống kê tổng quan, phòng trên marketplace. |
| Chủ trọ/Quản lý nhà trọ | Vận hành nhà trọ và nghiệp vụ hằng tháng. | Quản lý nhà, phòng, người thuê, hợp đồng, điện nước, hóa đơn, thanh toán, ticket, dashboard. |
| Người thuê/Người tìm phòng | Tìm phòng hoặc đang thuê phòng trong hệ thống. | Tìm phòng, gửi yêu cầu thuê/xem phòng, xem hợp đồng, hóa đơn, thanh toán QR, gửi ticket, xem thông báo. |

## 2. Tổng quan chức năng MVP

MVP không đặt mục tiêu triển khai toàn bộ tính năng nâng cao. Luồng nghiệp vụ chính là: chủ trọ đăng phòng, người thuê gửi yêu cầu, chủ trọ tạo hợp đồng, nhập điện nước, tạo hóa đơn, người thuê thanh toán QR và chủ trọ xác nhận thanh toán.

### 2.1. Chức năng giữ lại trong MVP

| Nhóm chức năng | Mức độ thực hiện |
| --- | --- |
| Đăng nhập và phân quyền | JWT, refresh token, RBAC và các vai trò chính. |
| Multi-tenant SaaS | Tách dữ liệu bằng `tenantId`/`ownerId`. |
| Quản lý nhà trọ và phòng | CRUD, trạng thái phòng, hình ảnh, tiện ích, đăng marketplace. |
| Marketplace tìm phòng | Danh sách phòng, lọc cơ bản, chi tiết phòng, yêu cầu thuê/xem phòng. |
| Quản lý người thuê | Hồ sơ người thuê, gán phòng, lịch sử thuê. |
| Quản lý hợp đồng | Hợp đồng dạng dữ liệu, trạng thái, liên kết phòng/người thuê. |
| Điện nước và dịch vụ | Cấu hình đồng hồ, nhập chỉ số thủ công, OCR demo nếu cần. |
| Hóa đơn và công nợ | Tạo hóa đơn tháng, tính tổng tiền, trạng thái thanh toán, công nợ. |
| Thanh toán QR thủ công | Tạo/hiển thị QR, người thuê gửi xác nhận, chủ trọ duyệt. |
| Ticket sự cố | Người thuê gửi sự cố, chủ trọ cập nhật trạng thái xử lý. |
| Thông báo | Thông báo nội bộ; giữ nền tảng `DeviceToken` cho push notification thật. |
| Dashboard cơ bản | Doanh thu, công nợ, phòng trống, hợp đồng sắp hết hạn, ticket. |
| Super Admin | Quản lý tenant, chủ trọ, gói dịch vụ và thống kê tổng quan. |
| Subscription payment | Giữ dữ liệu lịch sử thanh toán gói SaaS để mở rộng/đối soát. |
| Background job/queue | Giữ bảng job để hỗ trợ tác vụ nền khi cần. |

### 2.2. Chức năng loại khỏi MVP hoặc chưa kích hoạt

| Tính năng | Trạng thái | Ghi chú |
| --- | --- | --- |
| AI gợi ý phòng | Đã loại khỏi MVP và schema | Thay bằng tìm kiếm/lọc thủ công. |
| AI gợi ý giá thuê | Đã loại khỏi MVP và schema | Không còn bảng `RoomPriceSuggestion` hay field plan tương ứng. |
| Chatbot hỗ trợ | Đã loại khỏi MVP và schema | Không còn bảng session/message chatbot. |
| Realtime dashboard | Không triển khai trong MVP | Dashboard dùng API thông thường. |
| Webhook thanh toán tự động | Chưa kích hoạt trong MVP, giữ schema | Thanh toán hiện tại vẫn xác nhận thủ công; `PaymentWebhookLog` được giữ để tích hợp sau. |
| Push notification thật | Giữ nền tảng dữ liệu | `DeviceToken` được giữ; MVP có thể dùng thông báo nội bộ trước. |
| Queue/background job | Giữ nền tảng dữ liệu | `BackgroundJob` được giữ; MVP có thể xử lý trực tiếp nếu chưa cần worker. |
| Subscription payment | Giữ nền tảng dữ liệu | `SubscriptionPayment` được giữ cho lịch sử thanh toán gói SaaS. |
| OCR điện/nước | Tùy chọn demo | `OcrJob` và `ReadingSource.OCR` được giữ; nhập tay vẫn là quy trình chính. |

## 3. Yêu cầu chức năng chi tiết

| Mã | Chức năng | Ưu tiên | Mô tả và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| FR-01 | Đăng ký, đăng nhập, đăng xuất | Must | Người dùng đăng ký/đăng nhập bằng email hoặc số điện thoại và mật khẩu. Đăng nhập đúng trả JWT, sai thông tin bị từ chối, token hết hạn không truy cập API bảo vệ. |
| FR-02 | Quản lý hồ sơ cá nhân | Should | Người dùng xem/cập nhật họ tên, số điện thoại, email, ảnh đại diện. Dữ liệu cập nhật hiển thị lại chính xác. |
| FR-03 | Phân quyền RBAC | Must | Phân quyền theo Super Admin, Chủ trọ/nhân viên và Người thuê. Người thuê không vào quản trị; chủ trọ không xem dữ liệu tenant khác. |
| FR-04 | Quản lý tenant/chủ trọ | Must | Mỗi chủ trọ tương ứng một tenant. Dữ liệu nghiệp vụ gắn `tenantId`; Super Admin xem danh sách tenant. |
| FR-05 | Quản lý gói dịch vụ SaaS | Should | Super Admin tạo/sửa gói Free/Basic/Pro, gán gói cho tenant, lưu trạng thái subscription và lịch sử thanh toán gói nếu có. |
| FR-06 | Quản lý nhà trọ | Must | Chủ trọ thêm/sửa/xóa mềm/xem danh sách nhà trọ. Chỉ chủ sở hữu mới xem/sửa dữ liệu của mình. |
| FR-07 | Quản lý phòng | Must | Quản lý giá thuê, diện tích, số người tối đa, tiện ích, hình ảnh, trạng thái phòng. Trạng thái phòng thay đổi đúng theo hợp đồng/thao tác. |
| FR-08 | Đăng phòng lên Marketplace | Must | Chủ trọ bật/tắt hiển thị phòng. Chỉ phòng khả dụng và được public mới xuất hiện công khai. |
| FR-09 | Tìm kiếm và lọc phòng | Must | Người tìm phòng lọc theo khu vực, giá, diện tích, trạng thái/loại phòng. Không dùng AI gợi ý. |
| FR-10 | Xem chi tiết phòng | Must | Hiển thị hình ảnh, giá, địa chỉ, mô tả, tiện ích, phí dịch vụ và liên hệ/yêu cầu thuê. |
| FR-11 | Gửi yêu cầu thuê/xem phòng | Must | Người tìm phòng gửi thông tin liên hệ, thời gian mong muốn, ghi chú. Chủ trọ xử lý trạng thái mới/đã xử lý/từ chối. |
| FR-12 | Quản lý người thuê | Must | Chủ trọ thêm/cập nhật người thuê, gán vào phòng/hợp đồng. Một phòng có thể có một hoặc nhiều người thuê. |
| FR-13 | Quản lý hợp đồng | Must | Tạo hợp đồng gồm phòng, người thuê, ngày hiệu lực, tiền cọc, giá thuê, điều khoản, trạng thái. Hợp đồng active làm phòng đang thuê. |
| FR-14 | Hợp đồng sắp hết hạn | Should | Dashboard hiển thị hợp đồng sắp hết hạn trong khoảng cấu hình, ví dụ 30 ngày. |
| FR-15 | Cấu hình điện nước/dịch vụ | Must | Chủ trọ cấu hình đơn giá điện, nước và các phí dịch vụ. Hóa đơn lấy đúng đơn giá áp dụng. |
| FR-16 | Nhập chỉ số điện/nước | Must | Nhập chỉ số cũ/mới theo kỳ. Hệ thống tính lượng sử dụng và cảnh báo chỉ số mới nhỏ hơn chỉ số cũ. |
| FR-17 | OCR điện/nước demo | Could | Tải ảnh công tơ để gợi ý chỉ số; chủ trọ phải xác nhận/chỉnh sửa trước khi lưu. |
| FR-18 | Tạo hóa đơn tháng | Must | Tạo hóa đơn gồm tiền phòng, điện, nước, dịch vụ, phụ thu/giảm trừ. Tổng tiền tính đúng và gắn đúng phòng/người thuê. |
| FR-19 | Trạng thái hóa đơn | Must | Hóa đơn có draft/unpaid/partial/paid/overdue/canceled. Trạng thái cập nhật đúng sau thanh toán. |
| FR-20 | Theo dõi công nợ | Must | Tính số tiền còn nợ theo hóa đơn/phòng/người thuê. Công nợ giảm khi thanh toán được xác nhận. |
| FR-21 | Thanh toán QR thủ công | Must | Người thuê xem QR/thông tin chuyển khoản, gửi xác nhận và minh chứng. Chủ trọ xác nhận thủ công. |
| FR-22 | Lịch sử thanh toán | Must | Lưu số tiền, ngày thanh toán, người xác nhận, trạng thái, ghi chú. Mỗi lần duyệt tạo bản ghi lịch sử. |
| FR-23 | Ticket sự cố | Must | Người thuê gửi sự cố kèm mô tả/hình ảnh; chủ trọ cập nhật trạng thái xử lý. |
| FR-24 | Thông báo | Should | Tạo thông báo nội bộ khi có hóa đơn, yêu cầu thuê, thanh toán, ticket. Có nền tảng token push nếu cần mở rộng. |
| FR-25 | Dashboard chủ trọ | Must | Hiển thị tổng phòng, phòng trống/đang thuê, doanh thu tháng, công nợ, hợp đồng sắp hết hạn, ticket đang xử lý. |
| FR-26 | Dashboard Super Admin | Should | Hiển thị tổng chủ trọ, phòng, người dùng, phòng đang public marketplace. |
| FR-27 | Quản lý tài khoản chủ trọ | Must | Super Admin xem, khóa/mở khóa tài khoản chủ trọ. Tài khoản bị khóa không dùng chức năng quản trị. |
| FR-28 | Quản lý Marketplace cơ bản | Should | Super Admin xem danh sách phòng đang public; chưa cần kiểm duyệt phức tạp. |
| FR-29 | Mobile/App người thuê | Must | Người thuê xem phòng đang thuê, hợp đồng, hóa đơn, QR, gửi xác nhận thanh toán, ticket, thông báo. |
| FR-30 | Xóa mềm và lịch sử | Should | Dữ liệu quan trọng như phòng, hợp đồng, hóa đơn không xóa vật lý ngay. |

## 4. Quy trình nghiệp vụ chính

| Quy trình | Mô tả |
| --- | --- |
| Đăng phòng | Chủ trọ tạo nhà trọ -> tạo phòng -> cập nhật giá/hình ảnh/tiện ích -> bật marketplace -> người tìm phòng xem được. |
| Yêu cầu thuê/xem phòng | Người tìm phòng xem chi tiết -> gửi yêu cầu -> chủ trọ duyệt/từ chối/liên hệ -> nếu chấp nhận thì tạo người thuê và hợp đồng. |
| Tạo hợp đồng | Chủ trọ chọn phòng và người thuê -> nhập ngày, tiền cọc, giá thuê -> lưu hợp đồng -> phòng chuyển đang thuê khi hợp đồng hiệu lực. |
| Điện nước và hóa đơn | Cấu hình đơn giá -> nhập chỉ số -> tạo hóa đơn -> hệ thống tính tổng tiền -> người thuê xem hóa đơn. |
| Thanh toán QR thủ công | Người thuê xem QR -> chuyển khoản -> gửi xác nhận -> chủ trọ đối soát -> duyệt thanh toán -> cập nhật hóa đơn/công nợ. |
| Xử lý sự cố | Người thuê tạo ticket -> chủ trọ nhận thông báo -> cập nhật xử lý -> hoàn thành/từ chối -> người thuê theo dõi. |

## 5. Yêu cầu phi chức năng

| Mã | Yêu cầu | Mô tả |
| --- | --- | --- |
| NFR-01 | Bảo mật | Mật khẩu băm hash; API quan trọng yêu cầu JWT; kiểm tra role và tenant. |
| NFR-02 | Cách ly dữ liệu | Dữ liệu tenant phải lọc theo `tenantId`/`ownerId`. |
| NFR-03 | Tính đúng đắn dữ liệu | Hóa đơn, chỉ số, thanh toán và công nợ phải nhất quán. |
| NFR-04 | Hiệu năng | Danh sách lớn hỗ trợ phân trang, tìm kiếm, lọc. |
| NFR-05 | Khả dụng | Hệ thống chạy ổn định trong demo, lỗi nhập liệu rõ ràng. |
| NFR-06 | Dễ sử dụng | Giao diện rõ luồng, thao tác nhanh với phòng, hóa đơn, thanh toán. |
| NFR-07 | Bảo trì | Backend tổ chức module rõ; frontend tách component/service/state. |
| NFR-08 | Tương thích | Web chạy trên trình duyệt phổ biến; mobile demo bằng emulator/Expo nếu cần. |

## 6. Dữ liệu chính cần quản lý

| Thực thể | Mô tả |
| --- | --- |
| `User` | Tài khoản đăng nhập, thông tin cá nhân, trạng thái. |
| `Role`, `Permission`, `RolePermission` | Vai trò và quyền truy cập API. |
| `Tenant`, `TenantMember` | Đơn vị chủ trọ và thành viên trong tenant. |
| `Plan`, `Subscription`, `SubscriptionPayment` | Gói SaaS, đăng ký gói và lịch sử thanh toán gói. |
| `Property`, `Floor`, `Room`, `RoomImage`, `Amenity` | Nhà trọ, tầng, phòng, hình ảnh, tiện ích. |
| `RenterProfile`, `RentalHistory` | Hồ sơ người thuê và lịch sử thuê. |
| `RentalRequest`, `RoomViewingAppointment` | Yêu cầu thuê/xem phòng và lịch hẹn xem phòng. |
| `Contract`, `ContractMember`, `ContractFile` | Hợp đồng thuê và thành viên hợp đồng. |
| `UtilityMeter`, `MeterReading`, `OcrJob` | Đồng hồ điện/nước, chỉ số và OCR demo. |
| `Invoice`, `InvoiceItem`, `InvoiceBatch` | Hóa đơn, chi tiết hóa đơn, đợt tạo hóa đơn. |
| `Payment`, `PaymentQrCode`, `PaymentWebhookLog` | Thanh toán, QR và log webhook tương lai. |
| `Ticket`, `TicketAttachment`, `TicketComment` | Sự cố, đính kèm và trao đổi xử lý. |
| `Notification`, `DeviceToken` | Thông báo nội bộ và nền tảng push notification. |
| `BackgroundJob`, `AuditLog`, `SystemSetting` | Tác vụ nền, nhật ký thao tác và cấu hình hệ thống. |

## 7. Ưu tiên triển khai

| Ưu tiên | Nhóm chức năng | Ghi chú |
| --- | --- | --- |
| 1 | Auth, RBAC, tenant | Nền tảng bảo mật và cách ly dữ liệu. |
| 2 | Nhà trọ, phòng, người thuê | Dữ liệu nền cho toàn bộ nghiệp vụ. |
| 3 | Hợp đồng, điện nước, hóa đơn, công nợ | Nghiệp vụ quan trọng nhất khi bảo vệ. |
| 4 | Thanh toán QR thủ công | Hoàn thiện luồng hóa đơn -> thanh toán. |
| 5 | Dashboard cơ bản | Thể hiện giá trị quản lý. |
| 6 | Marketplace | Kết nối người thuê và chủ trọ. |
| 7 | Mobile/giao diện người thuê | Hoàn thiện trải nghiệm người thuê. |
| 8 | Ticket, thông báo, Super Admin | Hoàn thiện vận hành. |
| 9 | OCR, push, queue, webhook, subscription payment | Mở rộng hoặc kích hoạt sau khi core ổn định. |

## 8. Tiêu chí hoàn thành MVP

- Super Admin quản lý được chủ trọ/tenant, gói dịch vụ và thống kê tổng quan.
- Chủ trọ quản lý được nhà, phòng, người thuê và hợp đồng.
- Chủ trọ nhập được chỉ số điện/nước và tạo hóa đơn tháng.
- Người thuê xem được hóa đơn, QR thanh toán và gửi xác nhận thanh toán.
- Chủ trọ xác nhận thanh toán, hệ thống cập nhật công nợ.
- Người thuê gửi ticket sự cố và theo dõi trạng thái.
- Marketplace hiển thị phòng trống, hỗ trợ tìm kiếm/lọc và gửi yêu cầu thuê/xem phòng.
- Dữ liệu giữa các chủ trọ được cách ly đúng theo `tenantId`.
- Dashboard hiển thị số liệu cơ bản bằng REST API, không cần realtime.