Contract
Tạo hợp đồng, liên kết phòng/người thuê, cập nhật trạng thái phòng sang đang thuê khi hợp đồng active.

UtilityMeter, MeterReading
Cấu hình đồng hồ/đơn giá, nhập chỉ số điện nước thủ công. OCR chỉ để sau nếu còn thời gian.

Invoice, InvoiceItem, Debt
Tạo hóa đơn tháng, tính tiền phòng/điện/nước/dịch vụ, theo dõi paidAmount, totalAmount, trạng thái công nợ.

Payment QR thủ công
Sinh/hiển thị QR, người thuê gửi xác nhận, chủ trọ duyệt thanh toán, cập nhật hóa đơn/công nợ. Webhook giữ schema nhưng chưa kích hoạt.

Ticket, Notification
Người thuê gửi sự cố, chủ trọ xử lý. Tạo thông báo nội bộ cho hóa đơn, thanh toán, ticket. Push notification thật để sau.

Dashboard
Làm sau khi đã có dữ liệu thật từ room/contract/invoice/payment/ticket, vì dashboard chỉ là tổng hợp.

Super Admin nâng cao
Thống kê toàn hệ thống, quản lý marketplace, khóa/mở khóa chủ trọ, xem dữ liệu tổng quan.

Mở rộng sau MVP
OCR demo, queue/background job, push notification thật, subscription payment thật, payment webhook tự động
