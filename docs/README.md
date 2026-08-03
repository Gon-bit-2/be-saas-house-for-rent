# Mục lục tài liệu dự án

> Baseline: working tree nhánh `feat/handover-module`, ngày 31/07/2026 (Asia/Saigon).

Tài liệu phục vụ đồng thời báo cáo đồ án và công việc phát triển/kiểm thử. Khi có mâu thuẫn, ưu tiên nguồn theo thứ tự: runtime + test, controller/service/repository, Prisma schema/migration, sau đó mới đến tài liệu mô tả.

## Trạng thái tổng quan

| Hạng mục | Trạng thái có bằng chứng |
|---|---|
| Backend NestJS | Build và lint đạt |
| Unit test | 74/74 suite, 281/281 test |
| Prisma schema | `prisma validate` đạt |
| API runtime | 206 operation, 34 controller |
| E2E | 5 scenario, cần PostgreSQL đã migrate/seed |
| Frontend | Chưa có implementation |
| Mobile | Chưa có implementation |

`Đã có backend` không đồng nghĩa `đã nghiệm thu end-to-end`. Tích hợp PayOS, Firebase, Google, Cloudinary, Resend, PostgreSQL concurrency và Redis thật cần môi trường ngoài để xác minh.

## Lộ trình đọc

### Người chấm/đọc đồ án

1. [Yêu cầu chức năng MVP](systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md)
2. [Phân tích nghiệp vụ](systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md)
3. [Kiến trúc hệ thống](systems/Mo_ta_kien_truc_he_thong_MVP.md)
4. [Báo cáo tiến độ và an toàn](systems/Bao_cao_danh_gia_tien_do_va_an_toan.md)

### Developer/tester

1. [README dự án](../README.md)
2. [API reference](api/API_REFERENCE.md)
3. [Runtime API index](api/API_RUNTIME_INDEX.md)
4. [Tài liệu CSDL](db/db.md)
5. Đặc tả G01–G12 tương ứng với module đang làm việc.

## Đặc tả nghiệp vụ

| Nhóm | Nội dung | Trạng thái backend |
|---|---|---|
| [G01](specs/G01_xac_thuc_tai_khoan_phan_quyen.md) | Auth, tài khoản, RBAC | Core + hardening đã có |
| [G02](specs/G02_quan_tri_saas_tenant_goi_dich_vu.md) | Tenant, plan, subscription payment | API đã có |
| [G03](specs/G03_nha_tro_tang_phong_tien_ich.md) | Nhà, tầng, phòng, tiện ích | API đã có |
| [G04](specs/G04_marketplace_yeu_cau_thue_lich_xem_phong.md) | Marketplace, request, appointment, moderation | API core + moderation đã có |
| [G05](specs/G05_nguoi_thue_hop_dong_lich_su_thue_ban_giao.md) | Renter, invitation, contract, asset, handover, termination | API đã có; file/template còn backlog |
| [G06](specs/G06_dien_nuoc_cong_to_chi_so_dich_vu.md) | Meter, reading, OCR, service catalog | API đã có |
| [G07](specs/G07_hoa_don_cong_no.md) | Invoice, debt | API core đã có |
| [G08](specs/G08_thanh_toan_qr_doi_soat_webhook.md) | QR, payment, PayOS, subscription billing | API/webhook đã có |
| [G09](specs/G09_ticket_su_co_bao_tri.md) | Ticket, comment, attachment | API đã có |
| [G10](specs/G10_thong_bao_realtime_push_notification.md) | Notification, Socket.IO, Firebase, BullMQ | Backend đã có; cần provider thật |
| [G11](specs/G11_dashboard_bao_cao_audit_cau_hinh_he_thong.md) | Dashboard tenant/nền tảng, audit/settings | Hai dashboard đã có; audit/settings API còn backlog |
| [G12](specs/G12_danh_gia_uy_tin_bao_cao_vi_pham.md) | Review, report, moderation, reputation | Review/report API đã có; aggregate reputation còn backlog |

## API và dữ liệu

- [OpenAPI JSON](api/openapi.json) là contract máy đọc được sinh từ runtime.
- [Runtime API index](api/API_RUNTIME_INDEX.md) là bảng method/path/access đầy đủ.
- [API reference](api/API_REFERENCE.md) bổ sung role, rate-limit, parameter và request-body.
- [G05 handover/termination API](api/G05_HANDOVER_TERMINATION.md) và [OCR API](api/OCR.md) là hướng dẫn chuyên đề.
- [Tài liệu CSDL](db/db.md) mô tả toàn bộ bảng hiện có trong Prisma.

## Tài liệu vận hành và tiến độ

- [SEC-M01–SEC-M05](systems/SEC_M01_M05_trien_khai.md): thay đổi security và rollout webhook log.
- [Task/status](task/task.md): ma trận nhóm chức năng và backlog gần nhất.
- [Tóm tắt/điều hướng](systems/ad.md): trang ngắn, không phải nguồn trạng thái độc lập.

## Quy trình cập nhật

1. Thay đổi controller/DTO/auth metadata: chạy `npm run openapi:export`.
2. Thay đổi Prisma schema/migration: cập nhật `db/db.md` và đặc tả liên quan.
3. Thay đổi nghiệp vụ: cập nhật G01–G12, ma trận FR và báo cáo tiến độ.
4. Chạy `npm run docs:check`, build, unit test, ESLint và Prisma validate.
5. Chỉ ghi E2E/integration là đạt khi đã thực sự chạy trên môi trường test phù hợp.

## Quy ước bảo trì

- Không ghi secret thật, payload ngân hàng nguyên bản hoặc dữ liệu cá nhân vào tài liệu.
- Phân biệt rõ `đã triển khai`, `đã kiểm chứng`, `cần dịch vụ ngoài` và `backlog`.
- Không chỉnh tay ba artifact API được sinh tự động.
- Không coi README của `.agents`, dependency hoặc Prisma Client sinh tự động là tài liệu dự án.
