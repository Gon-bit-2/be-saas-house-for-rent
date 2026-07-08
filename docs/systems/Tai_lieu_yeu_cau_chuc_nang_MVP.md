TRƯỜNG ĐẠI HỌC VĂN HIẾN
KHOA CÔNG NGHỆ THÔNG TIN

TÀI LIỆU YÊU CẦU CHỨC NĂNG

Đề tài:
Xây dựng nền tảng Web/App quản lý và cho thuê phòng trọ, chung cư mini thông minh theo mô hình SaaS & Marketplace

Sinh viên thực hiện: Nguyễn Văn Thiện
MSSV: 221A290093
Giảng viên hướng dẫn: Quách Anh Dũng
Năm: 2026

1. Giới thiệu
   Tài liệu này mô tả các yêu cầu chức năng cho phiên bản MVP của nền tảng Web/App quản lý và cho thuê phòng trọ, chung cư mini theo mô hình SaaS & Marketplace. Phiên bản này tập trung vào các nghiệp vụ cốt lõi để đảm bảo tính khả thi trong thời gian thực hiện đồ án.
   Phạm vi đã được điều chỉnh bằng cách loại bỏ các tính năng nâng cao gồm: AI gợi ý phòng, AI gợi ý giá thuê, chatbot hỗ trợ, webhook thanh toán tự động và realtime dashboard. Các tính năng còn lại được triển khai theo phiên bản đơn giản, đủ phục vụ demo và đánh giá hệ thống.
   1.1. Mục tiêu tài liệu
   • Xác định rõ phạm vi chức năng cần xây dựng trong phiên bản MVP.
   • Làm cơ sở cho thiết kế cơ sở dữ liệu, thiết kế API, thiết kế giao diện và kiểm thử.
   • Giúp thống nhất các nghiệp vụ chính giữa các nhóm người dùng: Super Admin, Chủ trọ và Người thuê.
   • Giảm rủi ro phát sinh phạm vi trong quá trình thực hiện đồ án.
   1.2. Phạm vi hệ thống
   • Xây dựng Web Platform cho Super Admin và Chủ trọ.
   • Xây dựng Marketplace cơ bản cho người tìm phòng.
   • Xây dựng Mobile App hoặc giao diện người thuê để xem thông tin thuê phòng, hóa đơn, thanh toán và gửi sự cố.
   • Triển khai mô hình SaaS Multi-tenant đơn giản bằng cách tách dữ liệu theo tenantId/ownerId.
   • Hỗ trợ thanh toán QR ở mức hiển thị mã QR và xác nhận thủ công, chưa tích hợp webhook ngân hàng tự động.
   • Dashboard báo cáo cập nhật bằng API thông thường, không sử dụng realtime dashboard.
   1.3. Nhóm người dùng
   Nhóm người dùng Mô tả Quyền chính
   Super Admin Người quản trị toàn bộ nền tảng SaaS. Quản lý tài khoản chủ trọ, tenant, gói dịch vụ, thống kê tổng quan, danh sách phòng trên marketplace.
   Chủ trọ/Quản lý nhà trọ Người sử dụng nền tảng để quản lý nhà trọ, phòng, người thuê và vận hành hằng tháng. Quản lý nhà, phòng, người thuê, hợp đồng, điện nước, hóa đơn, thanh toán, ticket sự cố và dashboard.
   Người thuê/Người tìm phòng Người dùng tìm phòng hoặc đang thuê phòng trong hệ thống. Tìm phòng, gửi yêu cầu thuê/xem phòng, xem hợp đồng, xem hóa đơn, thanh toán QR, gửi ticket sự cố, xem thông báo.

2. Mô tả tổng quan hệ thống
   Hệ thống được xây dựng theo hướng một nền tảng SaaS kết hợp Marketplace. Chủ trọ sử dụng hệ thống để quản lý vận hành nhà trọ, còn người thuê sử dụng hệ thống để tìm phòng, theo dõi hóa đơn và tương tác với chủ trọ sau khi thuê.
   Phiên bản MVP không đặt mục tiêu triển khai toàn bộ tính năng nâng cao, mà tập trung tạo ra một quy trình nghiệp vụ hoàn chỉnh: đăng phòng, người thuê gửi yêu cầu, chủ trọ tạo hợp đồng, nhập điện nước, tạo hóa đơn, người thuê thanh toán bằng QR và chủ trọ xác nhận thanh toán.
   2.1. Các chức năng giữ lại trong MVP
   Nhóm chức năng Mức độ thực hiện
   Đăng nhập và phân quyền Triển khai đầy đủ với JWT, RBAC và các vai trò chính.
   Multi-tenant SaaS Triển khai đơn giản bằng tenantId/ownerId để cách ly dữ liệu giữa các chủ trọ.
   Quản lý nhà trọ và phòng Triển khai đầy đủ các thao tác CRUD, trạng thái phòng và đăng phòng lên marketplace.
   Marketplace tìm phòng Triển khai danh sách phòng, bộ lọc cơ bản, chi tiết phòng và yêu cầu thuê/xem phòng.
   Quản lý người thuê Triển khai thông tin người thuê, gán phòng và lịch sử thuê cơ bản trong phạm vi chủ trọ.
   Quản lý hợp đồng Triển khai hợp đồng dạng dữ liệu, chưa cần chữ ký số hay hợp đồng điện tử phức tạp.
   Điện nước và dịch vụ Nhập chỉ số thủ công, cấu hình đơn giá và lưu lịch sử chỉ số.
   Hóa đơn và công nợ Tạo hóa đơn tháng, tính tổng tiền, trạng thái thanh toán và công nợ.
   Thanh toán QR Tạo/hiển thị QR, người thuê gửi xác nhận, chủ trọ xác nhận thủ công.
   Ticket sự cố Người thuê gửi sự cố, chủ trọ cập nhật trạng thái xử lý.
   Thông báo nội bộ Thông báo trong ứng dụng, chưa cần push notification thật.
   Dashboard cơ bản Tổng quan doanh thu, công nợ, phòng trống, hợp đồng sắp hết hạn, ticket.
   Super Admin Quản lý tenant, chủ trọ, gói dịch vụ dữ liệu và thống kê tổng quan.

2.2. Các chức năng ngoài phạm vi phiên bản chính
Tính năng Trạng thái Lý do
AI gợi ý phòng Loại khỏi MVP Cần dữ liệu hành vi người dùng đủ lớn; có thể thay bằng lọc thủ công theo tiêu chí.
AI gợi ý giá thuê Loại khỏi MVP Cần dữ liệu thị trường và mô hình phân tích giá, dễ vượt phạm vi đồ án.
Chatbot hỗ trợ Loại khỏi MVP Không ảnh hưởng trực tiếp đến nghiệp vụ quản lý phòng trọ cốt lõi.
Webhook thanh toán tự động Loại khỏi MVP Tích hợp ngân hàng/cổng thanh toán thật phức tạp; thay bằng xác nhận thủ công.
Realtime dashboard Loại khỏi MVP Dashboard có thể cập nhật bằng API khi tải trang hoặc bấm làm mới.
AI OCR điện/nước Tùy chọn mở rộng Có thể làm demo đơn giản: OCR gợi ý chỉ số, chủ trọ vẫn xác nhận thủ công.
Firebase Cloud Messaging Đơn giản hóa Thay bằng thông báo nội bộ trong hệ thống.
Subscription payment Đơn giản hóa Chỉ lưu gói Free/Basic/Pro và trạng thái, chưa cần thanh toán gói dịch vụ thật.
BullMQ/Queue Đơn giản hóa Có thể triển khai sau; trong MVP xử lý trực tiếp khi tạo hóa đơn hoặc gửi thông báo.

3. Yêu cầu chức năng chi tiết
   Các yêu cầu chức năng được đánh mã FR. Mức ưu tiên sử dụng MoSCoW: Must Have là bắt buộc trong MVP, Should Have là nên có nếu đủ thời gian, Could Have là mở rộng.
   Mã Chức năng Ưu tiên Mô tả yêu cầu và tiêu chí nghiệm thu
   FR-01 Đăng ký, đăng nhập và đăng xuất Must Người dùng có thể đăng ký tài khoản, đăng nhập bằng email/số điện thoại và mật khẩu, đăng xuất khỏi hệ thống. Hệ thống trả về JWT khi đăng nhập thành công. Tiêu chí nghiệm thu: đăng nhập đúng vai trò, sai mật khẩu bị từ chối, token hết hạn không truy cập được API bảo vệ.
   FR-02 Quản lý hồ sơ cá nhân Should Người dùng có thể xem và cập nhật thông tin cơ bản gồm họ tên, số điện thoại, email và ảnh đại diện nếu có. Tiêu chí nghiệm thu: thông tin cập nhật được lưu và hiển thị lại chính xác.
   FR-03 Phân quyền RBAC Must Hệ thống phân quyền theo vai trò Super Admin, Chủ trọ và Người thuê. Mỗi API/màn hình quan trọng cần kiểm tra quyền. Tiêu chí nghiệm thu: người thuê không truy cập được trang quản trị chủ trọ; chủ trọ không xem dữ liệu của chủ trọ khác.
   FR-04 Quản lý tenant/chủ trọ Must Mỗi chủ trọ tương ứng với một tenant. Dữ liệu nhà, phòng, hợp đồng, hóa đơn, ticket được gắn tenantId. Super Admin có thể xem danh sách tenant. Tiêu chí nghiệm thu: dữ liệu được lọc đúng theo tenantId.
   FR-05 Quản lý gói dịch vụ SaaS đơn giản Should Super Admin tạo/sửa gói Free, Basic, Pro và gán gói cho chủ trọ. MVP chỉ lưu thông tin gói, chưa tích hợp thanh toán subscription thật. Tiêu chí nghiệm thu: chủ trọ có một gói sử dụng và trạng thái hoạt động.
   FR-06 Quản lý nhà trọ/chung cư mini Must Chủ trọ thêm, sửa, xóa mềm, xem danh sách nhà trọ. Thông tin gồm tên nhà, địa chỉ, mô tả, số tầng, ghi chú. Tiêu chí nghiệm thu: chỉ chủ trọ sở hữu mới xem/sửa được nhà trọ của mình.
   FR-07 Quản lý phòng Must Chủ trọ thêm, sửa, xóa mềm phòng; quản lý giá thuê, diện tích, số người tối đa, tiện ích, hình ảnh, trạng thái trống/đang thuê/đang sửa/ngừng sử dụng. Tiêu chí nghiệm thu: trạng thái phòng thay đổi đúng theo hợp đồng và thao tác của chủ trọ.
   FR-08 Đăng phòng lên Marketplace Must Chủ trọ có thể bật/tắt trạng thái hiển thị phòng trên marketplace. Chỉ các phòng trống và được bật hiển thị mới xuất hiện công khai. Tiêu chí nghiệm thu: phòng tắt hiển thị không xuất hiện trên danh sách tìm phòng.
   FR-09 Tìm kiếm và lọc phòng Must Người tìm phòng xem danh sách phòng, lọc theo khu vực, khoảng giá, diện tích, loại phòng/trạng thái. Không sử dụng AI gợi ý. Tiêu chí nghiệm thu: bộ lọc trả về danh sách phù hợp điều kiện.
   FR-10 Xem chi tiết phòng Must Người dùng xem hình ảnh, giá, địa chỉ, mô tả, tiện ích, phí dịch vụ và thông tin liên hệ/yêu cầu thuê. Tiêu chí nghiệm thu: dữ liệu chi tiết đúng với thông tin chủ trọ đã đăng.
   FR-11 Gửi yêu cầu thuê hoặc xem phòng Must Người tìm phòng gửi yêu cầu gồm thông tin liên hệ, thời gian mong muốn xem phòng, ghi chú. Chủ trọ nhận và xử lý yêu cầu. Tiêu chí nghiệm thu: yêu cầu được lưu, hiển thị ở màn hình chủ trọ và có trạng thái mới/đã xử lý/từ chối.
   FR-12 Quản lý người thuê Must Chủ trọ thêm người thuê, cập nhật thông tin cá nhân, gán người thuê vào phòng. Một phòng có thể có một hoặc nhiều người thuê. Tiêu chí nghiệm thu: người thuê được liên kết đúng với phòng và hợp đồng.
   FR-13 Quản lý hợp đồng Must Chủ trọ tạo hợp đồng thuê gồm phòng, người thuê, ngày bắt đầu, ngày kết thúc, tiền cọc, giá thuê, điều khoản cơ bản, trạng thái. Người thuê có thể xem hợp đồng của mình. Tiêu chí nghiệm thu: hợp đồng còn hiệu lực làm phòng chuyển trạng thái đang thuê.
   FR-14 Theo dõi hợp đồng sắp hết hạn Should Hệ thống hiển thị danh sách hợp đồng sắp hết hạn trong khoảng cấu hình, ví dụ 30 ngày. Tiêu chí nghiệm thu: dashboard hiển thị đúng hợp đồng gần hết hạn.
   FR-15 Cấu hình đơn giá điện, nước và phí dịch vụ Must Chủ trọ cấu hình đơn giá điện, nước, phí rác, internet, giữ xe hoặc phí dịch vụ cố định theo phòng/nhà. Tiêu chí nghiệm thu: hóa đơn lấy đúng đơn giá đang áp dụng.
   FR-16 Nhập chỉ số điện/nước thủ công Must Chủ trọ nhập chỉ số cũ, chỉ số mới theo tháng. Hệ thống tự tính lượng sử dụng và cảnh báo nếu chỉ số mới nhỏ hơn chỉ số cũ. Tiêu chí nghiệm thu: lượng tiêu thụ được tính đúng.
   FR-17 AI OCR điện/nước mức demo Could Nếu còn thời gian, hệ thống cho phép tải ảnh công tơ và gợi ý chỉ số bằng OCR. Chủ trọ phải xác nhận/chỉnh sửa trước khi lưu. Tiêu chí nghiệm thu: OCR chỉ là hỗ trợ, nhập thủ công vẫn là quy trình chính.
   FR-18 Tạo hóa đơn hàng tháng Must Chủ trọ tạo hóa đơn cho từng phòng theo tháng gồm tiền phòng, điện, nước, phí dịch vụ, phụ thu, giảm trừ. Tiêu chí nghiệm thu: tổng tiền tự tính đúng và hóa đơn gắn đúng phòng/người thuê.
   FR-19 Quản lý trạng thái hóa đơn Must Hóa đơn có trạng thái nháp/chưa thanh toán/thanh toán một phần/đã thanh toán/quá hạn. Tiêu chí nghiệm thu: trạng thái thay đổi đúng sau khi ghi nhận thanh toán.
   FR-20 Theo dõi công nợ Must Hệ thống tính số tiền còn nợ theo hóa đơn, phòng và người thuê. Chủ trọ xem danh sách công nợ. Tiêu chí nghiệm thu: công nợ giảm đúng khi thanh toán được xác nhận.
   FR-21 Thanh toán QR thủ công Must Người thuê xem mã QR/thông tin chuyển khoản theo hóa đơn. Người thuê gửi xác nhận đã chuyển khoản kèm ghi chú/ảnh minh chứng nếu có. Chủ trọ kiểm tra và xác nhận thủ công. Tiêu chí nghiệm thu: không cần webhook, nhưng lịch sử thanh toán được lưu đầy đủ.
   FR-22 Lịch sử thanh toán Must Hệ thống lưu số tiền thanh toán, ngày thanh toán, người xác nhận, trạng thái và ghi chú. Người thuê/chủ trọ xem lại lịch sử. Tiêu chí nghiệm thu: mỗi lần xác nhận thanh toán tạo một bản ghi lịch sử.
   FR-23 Ticket sự cố/bảo trì Must Người thuê gửi sự cố theo phòng, mô tả nội dung và đính kèm hình ảnh nếu có. Chủ trọ cập nhật trạng thái mới/đang xử lý/đã hoàn thành/từ chối. Tiêu chí nghiệm thu: người thuê xem được tiến độ xử lý ticket.
   FR-24 Thông báo nội bộ Should Hệ thống tạo thông báo trong ứng dụng khi có hóa đơn mới, yêu cầu thuê, xác nhận thanh toán hoặc cập nhật ticket. Không bắt buộc push notification. Tiêu chí nghiệm thu: người dùng xem danh sách thông báo và đánh dấu đã đọc.
   FR-25 Dashboard chủ trọ cơ bản Must Dashboard hiển thị tổng phòng, phòng trống, phòng đang thuê, doanh thu tháng, công nợ, hợp đồng sắp hết hạn, ticket đang xử lý. Không dùng realtime. Tiêu chí nghiệm thu: số liệu cập nhật khi tải trang hoặc bấm làm mới.
   FR-26 Dashboard Super Admin Should Super Admin xem tổng số chủ trọ, tổng số phòng, tổng người dùng, tổng phòng đang đăng trên marketplace. Tiêu chí nghiệm thu: số liệu tổng quan hiển thị đúng từ dữ liệu hệ thống.
   FR-27 Quản lý tài khoản chủ trọ bởi Super Admin Must Super Admin xem, khóa/mở khóa tài khoản chủ trọ. Tiêu chí nghiệm thu: tài khoản bị khóa không đăng nhập hoặc không sử dụng chức năng quản trị.
   FR-28 Quản lý Marketplace cơ bản Should Super Admin xem danh sách phòng đang được đăng. Không cần quy trình kiểm duyệt nội dung phức tạp. Tiêu chí nghiệm thu: Super Admin nắm được nội dung đang hiển thị công khai.
   FR-29 Mobile App/Giao diện người thuê Must Người thuê đăng nhập, xem phòng đang thuê, hợp đồng, hóa đơn, QR thanh toán, gửi xác nhận thanh toán, gửi ticket và xem thông báo. Tiêu chí nghiệm thu: người thuê thao tác được các nghiệp vụ sau khi thuê.
   FR-30 Xóa mềm và lưu lịch sử cơ bản Should Các dữ liệu quan trọng như phòng, hợp đồng, hóa đơn không xóa vật lý ngay mà chuyển trạng thái/xóa mềm. Tiêu chí nghiệm thu: dữ liệu cũ không mất khỏi lịch sử vận hành.

4. Quy trình nghiệp vụ chính
   Quy trình Mô tả
   Quy trình đăng phòng Chủ trọ tạo nhà trọ -> tạo phòng -> cập nhật giá, hình ảnh, tiện ích -> bật trạng thái đăng marketplace -> người tìm phòng xem được phòng.
   Quy trình yêu cầu thuê/xem phòng Người tìm phòng xem chi tiết phòng -> gửi yêu cầu thuê/xem phòng -> chủ trọ nhận yêu cầu -> duyệt/từ chối/liên hệ -> nếu chấp nhận thì tạo người thuê và hợp đồng.
   Quy trình tạo hợp đồng Chủ trọ chọn phòng và người thuê -> nhập ngày bắt đầu/kết thúc, tiền cọc, giá thuê -> lưu hợp đồng -> phòng chuyển sang đang thuê.
   Quy trình điện nước và hóa đơn Chủ trọ cấu hình đơn giá -> nhập chỉ số điện/nước tháng -> tạo hóa đơn -> hệ thống tính tổng tiền -> người thuê xem hóa đơn.
   Quy trình thanh toán QR thủ công Người thuê xem QR -> chuyển khoản -> gửi xác nhận -> chủ trọ kiểm tra -> xác nhận thanh toán -> hóa đơn/công nợ được cập nhật.
   Quy trình xử lý sự cố Người thuê gửi ticket -> chủ trọ nhận thông báo -> cập nhật đang xử lý -> hoàn thành/từ chối -> người thuê theo dõi trạng thái.

5. Yêu cầu phi chức năng
   Mã Yêu cầu Mô tả
   NFR-01 Bảo mật Mật khẩu phải được mã hóa băm; API quan trọng yêu cầu JWT; kiểm tra vai trò và tenantId trước khi trả dữ liệu.
   NFR-02 Cách ly dữ liệu Dữ liệu của từng chủ trọ phải được lọc theo tenantId/ownerId; người dùng không được truy cập dữ liệu ngoài phạm vi.
   NFR-03 Tính đúng đắn dữ liệu Hóa đơn, chỉ số điện/nước, thanh toán và công nợ phải đảm bảo nhất quán. Không cho phép chỉ số mới nhỏ hơn chỉ số cũ nếu không có xác nhận đặc biệt.
   NFR-04 Hiệu năng Các danh sách lớn cần hỗ trợ phân trang, tìm kiếm và lọc. Dashboard chỉ cần phản hồi trong thời gian chấp nhận được với dữ liệu demo.
   NFR-05 Khả dụng Hệ thống cần chạy ổn định trong quá trình demo; các lỗi nhập liệu phải có thông báo rõ ràng.
   NFR-06 Dễ sử dụng Giao diện đơn giản, rõ luồng nghiệp vụ; chủ trọ thao tác nhanh với phòng, hóa đơn và thanh toán.
   NFR-07 Bảo trì mã nguồn Backend tổ chức theo module; frontend tách component, service API và state; đặt tên rõ ràng.
   NFR-08 Tương thích Web chạy trên trình duyệt phổ biến; Mobile App chạy được môi trường Android/iOS hoặc ít nhất demo bằng emulator.

6. Dữ liệu chính cần quản lý
   Thực thể Mô tả
   User Tài khoản người dùng, thông tin đăng nhập, vai trò.
   Tenant/Owner Thông tin chủ trọ/đơn vị sử dụng SaaS, gói dịch vụ, trạng thái.
   Property Nhà trọ/chung cư mini, địa chỉ, mô tả.
   Room Phòng, giá thuê, diện tích, trạng thái, thông tin đăng marketplace.
   TenantProfile/Renter Thông tin người thuê, liên kết với tài khoản người dùng nếu có.
   RentalRequest Yêu cầu thuê/xem phòng từ marketplace.
   Contract Hợp đồng thuê, ngày hiệu lực, tiền cọc, trạng thái.
   MeterReading Chỉ số điện/nước theo phòng và kỳ tháng.
   ServiceFee Cấu hình đơn giá và phí dịch vụ.
   Invoice Hóa đơn tiền phòng, điện nước, dịch vụ, trạng thái thanh toán.
   Payment Lịch sử thanh toán, số tiền, xác nhận thủ công.
   Ticket Sự cố/bảo trì, trạng thái xử lý.
   Notification Thông báo nội bộ trong hệ thống.

7. Ưu tiên triển khai
   Ưu tiên Nhóm chức năng Ghi chú
   1 Auth, RBAC, tenantId Làm đầu tiên để đảm bảo nền tảng bảo mật và cách ly dữ liệu.
   2 Nhà trọ, phòng, người thuê Là dữ liệu nền cho toàn bộ nghiệp vụ.
   3 Hợp đồng, điện nước, hóa đơn, công nợ Là phần nghiệp vụ quan trọng nhất khi bảo vệ.
   4 Thanh toán QR thủ công Giúp hoàn thiện luồng hóa đơn -> thanh toán.
   5 Dashboard cơ bản Giúp hội đồng thấy được giá trị quản lý.
   6 Marketplace Giữ đúng định hướng kết nối người thuê và chủ trọ.
   7 Mobile/người thuê Hoàn thiện trải nghiệm phía người thuê sau khi thuê phòng.
   8 Ticket, thông báo nội bộ, Super Admin Bổ sung tính hoàn chỉnh và vận hành hệ thống.
   9 OCR demo hoặc queue đơn giản Chỉ làm nếu còn thời gian sau khi các phần chính ổn định.

8. Tiêu chí hoàn thành MVP
   • Super Admin tạo/quản lý được chủ trọ và xem thống kê tổng quan.
   • Chủ trọ quản lý được nhà, phòng, người thuê và hợp đồng.
   • Chủ trọ nhập chỉ số điện/nước và tạo được hóa đơn tháng.
   • Người thuê xem được hóa đơn, QR thanh toán và gửi xác nhận thanh toán.
   • Chủ trọ xác nhận thanh toán, hệ thống cập nhật công nợ.
   • Người thuê gửi ticket sự cố và theo dõi trạng thái xử lý.
   • Marketplace hiển thị phòng trống, cho phép tìm kiếm/lọc và gửi yêu cầu thuê/xem phòng.
   • Dữ liệu giữa các chủ trọ được cách ly đúng theo tenantId.
   • Dashboard hiển thị số liệu cơ bản và không cần realtime.
