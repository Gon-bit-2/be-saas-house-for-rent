TRƯỜNG ĐẠI HỌC VĂN HIẾN
KHOA CÔNG NGHỆ THÔNG TIN

MÔ TẢ KIẾN TRÚC HỆ THỐNG

Đề tài:
Xây dựng nền tảng Web/App quản lý và cho thuê phòng trọ, chung cư mini thông minh theo mô hình SaaS & Marketplace

Sinh viên thực hiện: Nguyễn Văn Thiện
MSSV: 221A290093
Giảng viên hướng dẫn: Quách Anh Dũng
Năm: 2026

1. Mục tiêu kiến trúc
   Tài liệu này mô tả kiến trúc hệ thống cho phiên bản MVP của nền tảng Web/App quản lý và cho thuê phòng trọ, chung cư mini theo mô hình SaaS & Marketplace. Kiến trúc được thiết kế theo hướng dễ triển khai, dễ bảo trì, phù hợp với phạm vi một đồ án tốt nghiệp và vẫn thể hiện được đặc trưng SaaS Multi-tenant.
   Các mục tiêu chính của kiến trúc gồm:
   • Tách rõ các lớp: giao diện người dùng, backend API, nghiệp vụ và lưu trữ dữ liệu.
   • Đảm bảo cách ly dữ liệu giữa các chủ trọ bằng tenantId/ownerId.
   • Hỗ trợ đầy đủ các nghiệp vụ lõi: phòng, người thuê, hợp đồng, điện nước, hóa đơn, thanh toán QR thủ công, ticket và dashboard.
   • Giảm độ phức tạp bằng cách loại bỏ các thành phần không cần thiết cho MVP như AI gợi ý, chatbot, webhook thanh toán tự động và realtime dashboard.
   • Cho phép mở rộng trong tương lai khi cần tích hợp AI, webhook, push notification hoặc xử lý tác vụ nền.
2. Kiến trúc tổng quan
   Hệ thống sử dụng kiến trúc client-server với backend API tập trung. Web Platform, Marketplace và Mobile App giao tiếp với Backend thông qua REST API. Backend xử lý xác thực, phân quyền, nghiệp vụ và truy cập dữ liệu thông qua Prisma ORM. PostgreSQL là cơ sở dữ liệu chính.

Hình 1. Kiến trúc tổng quan hệ thống MVP
2.1. Các lớp kiến trúc
Lớp Thành phần Trách nhiệm
Client Layer Next.js Web Platform, Marketplace Web, React Native Mobile App Hiển thị giao diện, gửi yêu cầu API, nhận dữ liệu, quản lý trạng thái người dùng và biểu mẫu.
API Layer NestJS REST API Tiếp nhận request, xác thực JWT, kiểm tra quyền, validate dữ liệu, điều phối nghiệp vụ.
Business Layer Các module nghiệp vụ trong NestJS Xử lý logic quản lý phòng, hợp đồng, hóa đơn, thanh toán, ticket, thông báo, dashboard.
Data Access Layer Prisma ORM Truy vấn PostgreSQL, ánh xạ model dữ liệu, hỗ trợ lọc theo tenantId.
Data Layer PostgreSQL Lưu dữ liệu chính của hệ thống: người dùng, nhà, phòng, hợp đồng, hóa đơn, thanh toán, ticket.
Supporting Layer Redis/BullMQ tùy chọn, QR generator, file storage, OCR demo tùy chọn Hỗ trợ cache, tác vụ nền hoặc tiện ích mở rộng. Trong MVP có thể rút gọn để giảm thời gian triển khai.

3. Mô hình triển khai đề xuất
   Để thuận tiện cho phát triển và demo, hệ thống có thể triển khai theo mô hình đơn giản bằng Docker Compose hoặc triển khai thủ công trên một VPS/cloud server. Nginx đóng vai trò reverse proxy cho Web và API. PostgreSQL chạy dưới dạng service riêng.
   Thành phần triển khai Công nghệ đề xuất Ghi chú
   Web Platform Next.js/ReactJS + Shadcn UI Dành cho Super Admin, Chủ trọ và Marketplace. Có thể build static/SSR tùy cách triển khai.
   Mobile App React Native Dành cho người thuê. Trong demo có thể chạy bằng emulator hoặc Expo.
   Backend API NestJS Triển khai dưới dạng một ứng dụng backend modular monolith.
   Database PostgreSQL Lưu dữ liệu chính. Có thể chạy local, Docker hoặc managed database.
   ORM Prisma Quản lý schema, migration và truy vấn dữ liệu.
   Cache/Queue Redis/BullMQ tùy chọn Không bắt buộc trong MVP. Nếu dùng, chỉ xử lý tác vụ đơn giản như tạo hóa đơn hàng loạt/gửi thông báo.
   File Storage Local storage hoặc Cloudinary/S3 tương đương Lưu hình ảnh phòng, ảnh ticket, ảnh minh chứng thanh toán.
   Reverse Proxy Nginx Định tuyến domain/subdomain đến web và API.

4. Kiến trúc Backend
   Backend được tổ chức theo dạng modular monolith. Tức là toàn bộ backend nằm trong một project NestJS, nhưng được chia thành các module nghiệp vụ độc lập. Cách này phù hợp với đồ án vì dễ triển khai hơn microservices, nhưng vẫn có cấu trúc rõ ràng và dễ mở rộng.
   Module Trách nhiệm
   AuthModule Đăng ký, đăng nhập, JWT, mã hóa mật khẩu, refresh token nếu có.
   UserModule Quản lý người dùng, thông tin cá nhân, trạng thái tài khoản.
   RbacModule Vai trò, quyền truy cập, guard kiểm tra quyền.
   TenantModule Quản lý tenant/chủ trọ, gói dịch vụ, trạng thái hoạt động.
   PropertyModule Quản lý nhà trọ/chung cư mini.
   RoomModule Quản lý phòng, trạng thái phòng, hình ảnh, tiện ích, đăng marketplace.
   MarketplaceModule Danh sách phòng công khai, tìm kiếm/lọc, chi tiết phòng.
   RentalRequestModule Yêu cầu thuê/xem phòng, xử lý yêu cầu bởi chủ trọ.
   RenterModule Quản lý người thuê, gán người thuê vào phòng.
   ContractModule Tạo và quản lý hợp đồng thuê.
   MeterModule Cấu hình đơn giá, nhập chỉ số điện/nước, lưu lịch sử.
   InvoiceModule Tạo hóa đơn, tính tổng tiền, trạng thái hóa đơn, công nợ.
   PaymentModule QR thanh toán, xác nhận thanh toán thủ công, lịch sử thanh toán.
   TicketModule Ticket sự cố/bảo trì, trạng thái xử lý, ảnh đính kèm.
   NotificationModule Thông báo nội bộ trong hệ thống.
   DashboardModule Tổng hợp số liệu dashboard qua API thông thường.
   AdminModule Chức năng dành cho Super Admin.
   OcrModule OCR điện/nước mức demo, chủ trọ xác nhận thủ công.

4.1. Nguyên tắc tổ chức API
• Sử dụng REST API theo tài nguyên: /auth, /users, /properties, /rooms, /contracts, /invoices, /payments, /tickets.
• Các API danh sách cần hỗ trợ phân trang, tìm kiếm và lọc.
• Các API cần validate input bằng DTO và class-validator.
• Các API cần kiểm tra JWT trước, sau đó kiểm tra vai trò và tenantId.
• Các phản hồi lỗi cần thống nhất định dạng để frontend dễ hiển thị.
Nhóm API Ví dụ endpoint Mục đích
Auth POST /auth/register, POST /auth/login, POST /auth/logout Xác thực người dùng.
Room GET /rooms, POST /rooms, PATCH /rooms/:id Quản lý phòng trong tenant của chủ trọ.
Marketplace GET /marketplace/rooms, GET /marketplace/rooms/:id Hiển thị phòng công khai cho người tìm phòng.
Contract POST /contracts, GET /contracts/:id Tạo và xem hợp đồng thuê.
Meter POST /meter-readings, GET /meter-readings Nhập và xem chỉ số điện/nước.
Invoice POST /invoices/generate, GET /invoices, PATCH /invoices/:id/status Tạo hóa đơn, quản lý trạng thái và công nợ.
Payment POST /payments/confirm-request, PATCH /payments/:id/approve Người thuê gửi xác nhận, chủ trọ duyệt thanh toán.
Ticket POST /tickets, PATCH /tickets/:id/status Gửi và xử lý sự cố.
Dashboard GET /dashboard/owner, GET /dashboard/admin Lấy số liệu tổng quan, không realtime.

5. Kiến trúc Frontend và Mobile
   Frontend được chia theo nhóm người dùng. Web Platform phục vụ Super Admin và Chủ trọ, đồng thời có phần Marketplace công khai cho người tìm phòng. Mobile App hoặc giao diện người thuê phục vụ người thuê sau khi đăng nhập.
   Ứng dụng Người dùng Chức năng chính
   Web Super Admin Super Admin Quản lý tenant/chủ trọ, gói dịch vụ, thống kê tổng quan, xem danh sách phòng marketplace.
   Web Chủ trọ Chủ trọ/Quản lý Quản lý nhà, phòng, người thuê, hợp đồng, điện nước, hóa đơn, thanh toán, ticket, dashboard.
   Marketplace Web Người tìm phòng Xem danh sách phòng, lọc phòng, xem chi tiết, gửi yêu cầu thuê/xem phòng.
   Mobile App Người thuê Người thuê Xem phòng đang thuê, hợp đồng, hóa đơn, QR thanh toán, gửi xác nhận, gửi ticket, xem thông báo.

5.1. Nguyên tắc tổ chức giao diện
• Tách layout theo vai trò: Super Admin, Chủ trọ, Người thuê/Marketplace.
• Tách component dùng chung như bảng dữ liệu, form nhập liệu, modal xác nhận, thông báo lỗi.
• Tách service gọi API để dễ bảo trì và thay đổi endpoint.
• Sử dụng state management vừa đủ, tránh phức tạp hóa nếu dữ liệu chưa lớn.
• Các màn hình quan trọng cần có loading, empty state và thông báo lỗi rõ ràng. 6. Thiết kế Multi-tenant
Phiên bản MVP sử dụng mô hình shared database, shared schema. Tất cả chủ trọ dùng chung một cơ sở dữ liệu và cùng bộ bảng, nhưng các bảng nghiệp vụ được gắn tenantId hoặc ownerId để tách dữ liệu. Đây là cách triển khai phù hợp vì đơn giản, dễ demo và vẫn thể hiện đúng đặc trưng SaaS.
Thành phần Cách xử lý trong MVP
tenantId/ownerId Các bảng Property, Room, Renter, Contract, MeterReading, Invoice, Payment, Ticket, Notification đều gắn tenantId/ownerId.
Tenant Guard Sau khi xác thực, backend lấy tenantId của người dùng và tự động lọc dữ liệu theo tenantId.
Super Admin Có thể xem dữ liệu tổng quan toàn hệ thống nhưng không chỉnh sửa nghiệp vụ chi tiết nếu không cần.
Marketplace Chỉ hiển thị phòng được bật công khai và còn trạng thái trống.
Kiểm thử cách ly Tạo ít nhất 2 chủ trọ khác nhau để kiểm thử rằng mỗi chủ trọ chỉ xem dữ liệu của mình.

7. Kiến trúc dữ liệu
   Cơ sở dữ liệu sử dụng PostgreSQL. Prisma ORM chịu trách nhiệm định nghĩa schema, migration và truy vấn. Dữ liệu được thiết kế xoay quanh tenant/chủ trọ, nhà trọ, phòng, người thuê, hợp đồng, chỉ số điện nước, hóa đơn, thanh toán và ticket.
   Thực thể Thuộc tính chính Quan hệ/Ghi chú
   User id, fullName, phone, email, passwordHash, role, status Một user có một vai trò chính; người thuê có thể liên kết với Renter.
   Tenant id, ownerUserId, name, planId, status Đại diện cho một chủ trọ/đơn vị sử dụng SaaS.
   Plan id, name, price, maxRooms, status Gói Free/Basic/Pro ở mức dữ liệu.
   Property id, tenantId, name, address, description Một tenant có nhiều nhà trọ.
   Room id, tenantId, propertyId, name, price, area, status, isPublished Một nhà trọ có nhiều phòng; phòng có thể đăng marketplace.
   Renter id, tenantId, userId?, fullName, phone, identityNo Người thuê thuộc phạm vi tenant.
   RentalRequest id, roomId, requesterName, phone, expectedTime, status Yêu cầu thuê/xem phòng từ marketplace.
   Contract id, tenantId, roomId, renterId, startDate, endDate, deposit, status Liên kết người thuê và phòng.
   ServiceFee id, tenantId, propertyId/roomId, type, price, unit Đơn giá điện/nước/phí dịch vụ.
   MeterReading id, tenantId, roomId, month, oldIndex, newIndex, usage Chỉ số điện/nước theo tháng.
   Invoice id, tenantId, roomId, renterId, month, totalAmount, paidAmount, status Hóa đơn và công nợ.
   Payment id, tenantId, invoiceId, amount, method, proofImage, status, approvedBy Thanh toán QR xác nhận thủ công.
   Ticket id, tenantId, roomId, renterId, title, description, status, images Sự cố/bảo trì.
   Notification id, userId, title, content, isRead, type Thông báo nội bộ.

8. Bảo mật và phân quyền
   Bảo mật trong MVP tập trung vào xác thực người dùng, phân quyền theo vai trò và cách ly dữ liệu theo tenant. Đây là phần cần kiểm thử kỹ vì liên quan trực tiếp đến mô hình SaaS.
   Cơ chế Mô tả
   Password Hashing Mật khẩu được băm bằng bcrypt/argon2, không lưu mật khẩu dạng rõ.
   JWT Authentication Sau khi đăng nhập, backend cấp access token cho client. API bảo vệ yêu cầu token hợp lệ.
   RBAC Guard Kiểm tra vai trò trước khi cho phép truy cập chức năng.
   Tenant Guard Tự động lọc dữ liệu theo tenantId của người dùng đang đăng nhập.
   Input Validation Kiểm tra dữ liệu đầu vào bằng DTO để tránh lỗi dữ liệu và lỗi nghiệp vụ.
   Soft Delete Dữ liệu quan trọng có thể dùng trạng thái/xóa mềm thay vì xóa vật lý.
   Audit Log cơ bản Có thể lưu người tạo/người cập nhật và thời điểm cập nhật cho các bảng quan trọng.

9. Kiến trúc thanh toán QR thủ công
   Do không triển khai webhook thanh toán tự động trong MVP, quy trình thanh toán được thiết kế theo hướng bán tự động. Hệ thống tạo thông tin thanh toán/QR theo hóa đơn, người thuê chuyển khoản bên ngoài, sau đó gửi xác nhận trong hệ thống để chủ trọ duyệt.
   Bước Mô tả
10. Tạo hóa đơn Chủ trọ tạo hóa đơn, hệ thống tính tổng tiền và sinh nội dung chuyển khoản theo mã hóa đơn.
11. Hiển thị QR Người thuê xem QR/thông tin chuyển khoản gồm ngân hàng, số tài khoản, người nhận, số tiền, nội dung.
12. Người thuê xác nhận Người thuê chuyển khoản bằng app ngân hàng rồi gửi xác nhận/ảnh minh chứng nếu có.
13. Chủ trọ kiểm tra Chủ trọ đối chiếu giao dịch thực tế bên ngoài hệ thống.
14. Duyệt thanh toán Chủ trọ xác nhận số tiền đã nhận; hệ thống cập nhật Payment, Invoice và công nợ.

15. Dashboard không realtime
    Dashboard trong MVP không sử dụng WebSocket. Frontend gọi API tổng hợp dữ liệu khi tải trang hoặc khi người dùng bấm làm mới. Cách này đơn giản, ổn định hơn và vẫn đủ để demo các chỉ số vận hành.
    Chỉ số Nguồn dữ liệu
    Tổng số phòng Bảng Room theo tenantId.
    Phòng trống/đang thuê Trạng thái Room.
    Doanh thu tháng Tổng Payment đã được duyệt hoặc Invoice đã thanh toán trong tháng.
    Công nợ Invoice.totalAmount - Invoice.paidAmount.
    Hợp đồng sắp hết hạn Contract.endDate trong khoảng 30 ngày tới.
    Ticket đang xử lý Ticket.status = NEW/IN_PROGRESS.
    Phòng đăng marketplace Room.isPublished = true và Room.status = AVAILABLE.

16. Luồng xử lý chính
    Luồng Mô tả kỹ thuật
    Tạo phòng và đăng marketplace Chủ trọ gọi API tạo Room -> backend gắn tenantId -> lưu Room -> bật isPublished -> Marketplace API chỉ trả phòng thỏa điều kiện công khai.
    Người thuê gửi yêu cầu Marketplace gửi RentalRequest -> backend lưu theo roomId/tenantId -> chủ trọ xem yêu cầu trong dashboard hoặc màn hình yêu cầu thuê.
    Tạo hợp đồng Chủ trọ chọn renter + room -> tạo Contract -> backend cập nhật Room.status = OCCUPIED nếu hợp đồng có hiệu lực.
    Tạo hóa đơn Chủ trọ nhập MeterReading -> InvoiceModule lấy tiền phòng, điện, nước, dịch vụ -> tính totalAmount -> lưu Invoice.
    Xác nhận thanh toán Người thuê gửi Payment request -> chủ trọ duyệt -> Payment.status = APPROVED -> cập nhật paidAmount và Invoice.status.
    Xử lý ticket Người thuê tạo Ticket -> chủ trọ cập nhật trạng thái -> NotificationModule tạo thông báo nội bộ cho người thuê.

17. Các quyết định rút gọn trong MVP
    Vấn đề Quyết định kiến trúc MVP Hướng mở rộng sau này
    AI gợi ý phòng Không triển khai, thay bằng tìm kiếm/lọc thủ công. Thu thập dữ liệu hành vi, xây module recommendation.
    AI gợi ý giá thuê Không triển khai. Tích hợp dữ liệu thị trường, phân tích giá theo khu vực/diện tích.
    Chatbot Không triển khai. Tích hợp chatbot hỗ trợ FAQ và hướng dẫn sử dụng.
    Webhook thanh toán Không triển khai, chủ trọ xác nhận thủ công. Tích hợp cổng thanh toán/ngân hàng có callback/webhook.
    Realtime dashboard Không triển khai WebSocket, dùng API polling/manual refresh. Sử dụng WebSocket/SSE khi có nhu cầu realtime.
    Push notification Thông báo nội bộ trong hệ thống. Tích hợp Firebase Cloud Messaging.
    Queue xử lý nền Có thể không dùng hoặc dùng rất ít. Dùng BullMQ cho tạo hóa đơn hàng loạt, OCR, gửi thông báo.
    OCR điện/nước lưu ảnh và lịch sử ,kết quả phải được xác nhận thủ công. Tối ưu model OCR, lưu ảnh và lịch sử kiểm tra.

18. Thứ tự triển khai theo kiến trúc
    Thứ tự Hạng mục Kết quả cần đạt
    1 Khởi tạo backend, database, Prisma Project NestJS chạy được, kết nối PostgreSQL và có migration ban đầu.
    2 Auth, RBAC, Tenant Guard Đăng nhập được, phân quyền và cách ly dữ liệu cơ bản.
    3 Property, Room, Renter Quản lý được nhà, phòng và người thuê.
    4 Contract, Meter, Invoice Hoàn thành nghiệp vụ thuê phòng và tạo hóa đơn.
    5 Payment QR manual Người thuê gửi xác nhận, chủ trọ duyệt và cập nhật công nợ.
    6 Web chủ trọ và Super Admin Có giao diện quản trị các nghiệp vụ chính.
    7 Marketplace Người tìm phòng xem, lọc và gửi yêu cầu thuê.
    8 Mobile/người thuê Người thuê xem hợp đồng, hóa đơn, thanh toán và ticket.
    9 Dashboard, ticket, notification Hoàn thiện vận hành và báo cáo cơ bản.
    10 Kiểm thử, sửa lỗi, tài liệu Hoàn thiện demo, báo cáo, slide và hướng dẫn sử dụng.

19. Kết luận
    Kiến trúc MVP được thiết kế theo hướng thực tế và khả thi: một backend NestJS modular monolith, một cơ sở dữ liệu PostgreSQL dùng chung có tách tenantId, web/mobile client gọi REST API và các module nghiệp vụ rõ ràng. Cách thiết kế này giúp dự án vẫn thể hiện được giá trị SaaS & Marketplace nhưng tránh các thành phần quá phức tạp trong thời gian thực hiện đồ án.
    Sau khi phiên bản MVP ổn định, hệ thống có thể mở rộng thêm AI gợi ý, AI định giá, chatbot, webhook thanh toán, realtime dashboard, push notification và xử lý tác vụ nền bằng queue.
