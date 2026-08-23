# Kế Hoạch Báo Cáo: Khai Thác Cơ Sở Dữ Liệu (Hệ Thống Quản Lý Nhà Trọ SaaS)

Chào bạn, để bảo vệ thành công đồ án tốt nghiệp với chuyên đề **"Khai thác cơ sở dữ liệu"**, hội đồng sẽ không chỉ nhìn vào giao diện mà sẽ tập trung vào **cách bạn thiết kế, tổ chức, tối ưu và xử lý các luồng dữ liệu phức tạp (ACID, Transaction, Multi-tenant, Tối ưu truy vấn)**.

Dưới đây là kịch bản demo chi tiết (Step-by-step) kết hợp với những câu hỏi hội đồng có thể đặt ra và cách bạn trả lời (bảo vệ).

---

## 🌟 TỔNG QUAN (Phút 1 - 2)

**Hành động:** Trình chiếu sơ đồ ERD (hoặc Prisma Schema) và giới thiệu tổng quan.

- **Điểm nhấn DB:** "Hệ thống của em được thiết kế theo mô hình **Multi-tenant SaaS (Phần mềm dạng dịch vụ đa khách hàng)** sử dụng PostgreSQL và Prisma ORM. Dữ liệu của các chủ trọ (Tenant) được cô lập logic hoàn toàn thông qua khóa ngoại `tenantId` ở hầu hết các bảng core."

---

## 🔥 FLOW 1: Quản Lý Bất Động Sản & Quy Trình Kiểm Duyệt (Phút 3 - 5)

**Mục tiêu:** Thể hiện cách tổ chức dữ liệu phân cấp, quản lý trạng thái (State Machine) và cơ chế Audit.

- **Bước 1 (Demo):** Chủ trọ lần đầu tạo Khu trọ (Property) -> Hệ thống phát hiện tài khoản `UNVERIFIED` nên bắt buộc phải Upload CCCD và Sổ đỏ cùng lúc -> Bấm Tạo.
- **Bước 2 (Demo):** Khu trọ được tạo, đồng thời trạng thái Chủ trọ chuyển thành `PENDING`. Chuyển sang màn hình Admin duyệt giấy tờ -> Đổi sang `VERIFIED`.
- **Điểm nhấn khai thác CSDL:**
  - **Quản lý Trạng thái (State Machine):** Hệ thống sử dụng Enum (`VerificationStatus`) để quản lý vòng đời tài khoản (UNVERIFIED -> PENDING -> VERIFIED).
  - **Lưu trữ phi chuẩn hóa dạng mảng (Array type):** Cột `verificationDocuments` lưu trực tiếp mảng URL vào PostgreSQL, tối ưu cấu trúc bảng không cần JOIN.
  - **Cập nhật đồng thời (Transaction logic):** Khi tạo Khu trọ, Backend vừa gọi lệnh `create` cho bảng Property, vừa gọi lệnh `update` bảng Tenant để set `verificationStatus = PENDING`.
  - **Xóa mềm (Soft Delete):** Khi xóa Property, hệ thống update trường `deletedAt` để bảo lưu lịch sử.

> ❓ **Hội đồng có thể hỏi:** _Khi chủ trọ tạo khu trọ và upload giấy tờ, dữ liệu được ghi vào DB như thế nào?_
> 💡 **Cách trả lời:** _Em thiết kế tính năng tải ảnh đồng bộ lên Cloudinary để lấy URL, sau đó truyền vào Payload. Backend sẽ nhận dữ liệu và thực hiện cập nhật 2 bảng cùng lúc: Insert vào bảng `Property` và Update trường `verificationStatus` của bảng `Tenant` sang trạng thái `PENDING` chờ duyệt. Quá trình này giúp giảm số lần thao tác cho người dùng._

> ❓ **Hội đồng có thể hỏi:** _Nếu tôi xóa 1 Tòa nhà, thì các phòng và hợp đồng đang thuê bên trong xử lý ở DB thế nào?_
> 💡 **Cách trả lời:** _Em sử dụng cơ chế Soft Delete. Dữ liệu Tòa nhà chỉ cập nhật trường `deletedAt`. Prisma được cấu hình middleware để tự động bỏ qua các bản ghi có `deletedAt != null` trong các truy vấn thông thường. Đối với các bảng liên quan chặt chẽ (như Floor, Room), em dùng `onDelete: Cascade` (nếu là xóa cứng) hoặc cập nhật vòng lặp Soft Delete để bảo toàn tính vẹn toàn dữ liệu lịch sử._

---

## 🔥 FLOW 2: Luồng Ký Hợp Đồng Thuê Phòng (Phút 6 - 8) 👉 _Quan trọng nhất_

**Mục tiêu:** Thể hiện kỹ thuật **Database Transaction** (Giao dịch CSDL) và tính chất **ACID**.

- **Bước 1 (Demo):** Thao tác Duyệt yêu cầu thuê phòng -> Hệ thống tự động: Tạo Hợp đồng (Contract) + Tạo Biên bản bàn giao (HandoverRecord) + Đổi trạng thái Phòng thành `RENTED`.
- **Điểm nhấn khai thác CSDL:**
  - Luồng này tác động đến **nhiều bảng cùng một lúc**.
  - Em sử dụng **Prisma `$transaction`** (hoặc DB Transaction).
  - **Tính nguyên tử (Atomicity):** Nếu tạo hợp đồng thành công nhưng tạo biên bản bàn giao thất bại, toàn bộ quá trình sẽ bị `Rollback` trả lại trạng thái ban đầu, không có chuyện có hợp đồng mà không có phòng.

> ❓ **Hội đồng có thể hỏi:** _Trường hợp 2 khách thuê cùng ấn đặt 1 phòng cùng 1 giây (Concurrency / Race Condition), CSDL xử lý thế nào?_
> 💡 **Cách trả lời:** _Em áp dụng cơ chế khóa (Locking) hoặc ràng buộc mức CSDL. Trạng thái phòng (RoomStatus) sẽ được check ngay trong Transaction. Nếu phòng đã đổi sang `RENTED` bởi request 1, request 2 sẽ bị reject (dựa trên Optimistic Locking hoặc mệnh đề WHERE status = 'AVAILABLE' khi UPDATE)._

---

## 🔥 FLOW 3: Tự Động Hóa Dữ Liệu - Chốt Số & Tính Tiền (Phút 9 - 11)

**Mục tiêu:** Thể hiện khả năng xử lý lô (Batch processing) và khai thác dữ liệu phi cấu trúc (AI OCR).

- **Bước 1 (Demo):** Upload ảnh đồng hồ điện/nước -> AI OCR đọc ra số -> Hệ thống tự động tính toán ra Hóa đơn (InvoiceBatch) -> Gửi thông báo cho hàng loạt khách.
- **Điểm nhấn khai thác CSDL:**
  - **Từ phi cấu trúc sang cấu trúc:** Lưu trữ kết quả nhận diện AI vào bảng `OcrJob`, sau đó map vào bảng `MeterReading` (Chỉ số điện nước).
  - **Xử lý tính toán hóa đơn phức tạp:** Gom nhóm các công thức (giá điện bậc thang/cố định, tiền nước, dịch vụ rác, internet) từ bảng `Room` và `Service` để sinh ra `Invoice` và `Debt` (Công nợ).

> ❓ **Hội đồng có thể hỏi:** _Khi hệ thống có 1000 phòng cùng chốt điện nước vào cuối tháng, lưu lượng ghi vào DB lớn thì sao?_
> 💡 **Cách trả lời:** _Thay vì Insert từng dòng (gọi DB 1000 lần), em gom dữ liệu trên Backend và sử dụng lệnh `createMany` (Bulk Insert) để đẩy dữ liệu vào bảng `MeterReading` và `Invoice` chỉ trong 1 query duy nhất, giảm tải I/O cho cơ sở dữ liệu._

---

## 🔥 FLOW 4: Nhận Thanh Toán Tự Động qua Webhook (Phút 12 - 14)

**Mục tiêu:** Thể hiện khả năng đồng bộ dữ liệu thời gian thực và Log truy vết (Audit Trail).

- **Bước 1 (Demo):** Giả lập khách quét mã QR chuyển khoản -> Hệ thống nhận Webhook -> Tự động trừ Công nợ (Debt) -> Đổi trạng thái Hóa đơn sang `PAID`.
- **Điểm nhấn khai thác CSDL:**
  - Bảng `PaymentWebhookLog`: Em thiết kế một bảng riêng để lưu raw data từ Webhook. Điều này cực kỳ quan trọng trong thực tế để **đối soát (reconciliation)** khi ngân hàng bị lỗi.
  - Bảng `Debt` (Công nợ): Dữ liệu được tính toán dựa trên tổng hóa đơn trừ đi các `Payment` thành công.

> ❓ **Hội đồng có thể hỏi:** _Nếu Webhook của ngân hàng gửi đến 2 lần cho cùng 1 giao dịch thì sao?_
> 💡 **Cách trả lời:** _CSDL có bảng `Payment` với trường `transactionCode` được đặt là **Unique Constraint** (`@@unique`). Lần gửi thứ 2 sẽ bị DB từ chối (Duplicate Key Error), ngăn chặn hoàn toàn việc khách được cộng tiền 2 lần._

---

## 🔥 FLOW 5: Phân Quyền (RBAC) & Bảo Mật (Phút 15 - 17)

**Mục tiêu:** Khai thác các bảng trung gian (Many-to-Many).

- **Bước 1 (Demo):** Đăng nhập bằng tài khoản Nhân viên (Staff), thử truy cập tính năng Xóa tòa nhà -> Bị chặn.
- **Điểm nhấn khai thác CSDL:**
  - Kiến trúc RBAC: Bảng `Role`, `Permission` và bảng trung gian `RolePermission`.
  - Thay vì hardcode quyền, dữ liệu quyền được cấp phát động thông qua JOIN query từ DB.

---

## 🎯 Tóm lại: 4 Keyword "Ăn điểm" để nhắc đi nhắc lại khi bảo vệ

1. **Multi-tenant:** Dữ liệu cô lập logic tốt.
2. **Database Transaction:** Xử lý các nghiệp vụ nhạy cảm như hợp đồng, thanh toán.
3. **Soft Delete & Audit Log:** Không bao giờ mất dấu vết dữ liệu kế toán.
4. **Index & Bulk Insert:** Tối ưu hiệu năng khi hệ thống scale (mở rộng).

Chúc bạn tự tin và bùng nổ trong buổi bảo vệ ngày mai nhé! Cần làm rõ câu hỏi nào thêm cứ hỏi mình!
