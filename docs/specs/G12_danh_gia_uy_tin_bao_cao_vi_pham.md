# G12 - Đặc tả đánh giá, uy tín và báo cáo vi phạm

> **Snapshot 31/07/2026:** Review create/self-service/public summary, review moderation, report create/self-service và ADMIN report moderation đã có API/migration/state constraint. `ReputationScore` vẫn chưa có workflow tổng hợp đa nguồn hoàn chỉnh. Snapshot giữ nguyên các bổ sung G12 chưa commit.

## 1. Tổng quan

G12 là lớp trust và moderation của marketplace:

- Xác thực đánh giá từ người đã thuê.
- Công khai phản hồi đáng tin cậy.
- Tổng hợp điểm uy tín của phòng/chủ trọ.
- Tiếp nhận báo cáo vi phạm.
- Hỗ trợ Admin kiểm duyệt và thực thi hành động.

Trạng thái hiện tại: **G12 Backend MVP đã có API review, moderation, public summary và report workflow**. Điểm reputation tổng hợp nhiều nguồn vẫn được giữ ngoài MVP cho đến khi có công thức chính thức.

Mục tiêu của tài liệu:

- Người đọc biết chính xác dữ liệu nào đã được thiết kế.
- Frontend biết endpoint MVP hiện hành và các phần vẫn là backlog.
- Backend có hiện trạng rõ cho review/report và roadmap riêng cho reputation/enforcement mở rộng.
- Product/tester hiểu những policy còn phải khóa.
- Người lập kế hoạch thấy dependency, rủi ro và tiêu chí hoàn thành.

### 1.1. Phạm vi

- Model `Review`.
- Model `ReputationScore`.
- Model `Report`.
- Enum review/reputation/report.
- Quan hệ với User, Tenant, Room và Contract.
- Trạng thái triển khai hiện tại.
- Luồng review/report hiện hành và luồng reputation/appeal đề xuất.
- Backlog về integrity, moderation, privacy, anti-abuse và testing.

### 1.2. Ngoài phạm vi

| Nội dung                           | Tài liệu  |
| ---------------------------------- | --------- |
| Marketplace public room            | G04       |
| Renter/contract eligibility source | G05       |
| Ticket response data               | G09       |
| Notification moderation            | G10       |
| Dashboard moderation               | G11       |
| Khóa user/tenant/listing           | G01–G04   |
| AI recommendation                  | Ngoài MVP |

### 1.3. Trạng thái triển khai

| Thành phần | Trạng thái | Có thể gọi API? |
|---|---|---|
| `Review` | Đã có schema, constraint và API | Có |
| Review self-service | Tạo/list/detail từ contract xác thực | Có |
| Public review | Approved + visible, không lộ PII | Có |
| Review moderation | Admin state machine + audit | Có |
| Review summary | Aggregate trực tiếp theo phòng | Có |
| `Report` | Đã có schema, snapshot và API | Có |
| Report submission | Target resolver + chống duplicate mở | Có |
| Report moderation | Admin claim/resolve/reject + audit | Có |
| Notification moderation | `REVIEW` và `REPORT` | Có |
| `ReputationScore` tổng hợp | Chưa có công thức/trọng số | Không |
### 1.4. Bằng chứng source

- `ReviewsModule` và `ReportsModule` được import trong `AppModule`.
- Mỗi module có controller, service, repository, Zod DTO và unit test.
- Prisma migration bảo vệ score, visibility, uniqueness và moderation metadata.
- Public reputation MVP được aggregate trực tiếp từ review approved-visible; không ghi `ReputationScore`.
- Moderation ghi `AuditLog` cùng transaction và gửi notification sau commit.
## 2. Hành trình hiện hành và mở rộng

```text
Renter đã thuê
├── Review phòng/chủ trọ
│   ├── Moderation
│   ├── Public marketplace
│   └── ReputationScore
│
└── Report đối tượng vi phạm
    ├── Admin moderation
    ├── Enforcement action
    ├── Audit
    └── Notification
```

Đây là mô hình mục tiêu để định hướng triển khai, không phải luồng có thể sử dụng hiện tại.

## 3. Actor dự kiến

Các actor dưới đây là đề xuất, chưa có guard/controller G12.

| Actor          | Trách nhiệm dự kiến                                    |
| -------------- | ------------------------------------------------------ |
| Khách vãng lai | Xem review/reputation đã public                        |
| `TENANT`       | Gửi review/report và theo dõi nội dung của mình        |
| `LANDLORD`     | Xem phản hồi liên quan; quyền trả lời cần thiết kế     |
| `ADMIN`        | Moderation review/report và xem reputation diagnostics |
| System worker  | Recalculate reputation                                 |

Các quyết định chưa được code hóa:

- MVP chỉ cho `ADMIN` approve/reject/hide/restore review.
- Landlord không có quyền moderation review trong MVP.
- Renter được review khi contract `ACTIVE`, `ENDED` hay cả hai?
- Review có ẩn danh công khai không?
- Ai có role moderator riêng ngoài `ADMIN`?

Roadmap nên ưu tiên policy bảo vệ tính độc lập của review; không để đối tượng bị đánh giá tự ý duyệt/xóa phản hồi.

## 4. Mô hình Review

### 4.1. Mục đích

`Review` lưu đánh giá của user về một room thuộc tenant, có thể liên kết contract làm bằng chứng đã thuê.

### 4.2. Field

| Field              | Kiểu/ý nghĩa              |
| ------------------ | ------------------------- |
| `id`               | ID tự tăng                |
| `tenantId`         | Tenant sở hữu room        |
| `roomId`           | Room được đánh giá        |
| `contractId`       | Contract căn cứ, nullable |
| `reviewerId`       | User gửi review           |
| `rating`           | Điểm tổng thể             |
| `content`          | Nội dung review           |
| `cleanlinessScore` | Điểm vệ sinh              |
| `locationScore`    | Điểm vị trí               |
| `priceScore`       | Điểm giá                  |
| `serviceScore`     | Điểm dịch vụ              |
| `isVisible`        | Cờ hiển thị               |
| `status`           | Trạng thái moderation     |
| `createdAt`        | Thời điểm tạo             |

### 4.3. Quan hệ

```text
Review
├── Tenant     onDelete: Cascade
├── Room       onDelete: Cascade
├── Contract?  onDelete: SetNull
└── Reviewer   onDelete: Restrict
```

Hệ quả:

- Xóa vật lý tenant hoặc room có thể xóa toàn bộ review liên quan.
- Xóa contract chỉ gỡ `contractId`, review vẫn còn.
- Không thể xóa reviewer nếu còn review do relation `Restrict`.

### 4.4. ReviewStatus

| Giá trị    | Ý nghĩa dự kiến            |
| ---------- | -------------------------- |
| `PENDING`  | Chờ moderation             |
| `APPROVED` | Được phép public           |
| `REJECTED` | Bị từ chối                 |
| `HIDDEN`   | Từng tồn tại nhưng đang ẩn |

Schema chưa có state machine. Các transition hợp lệ chưa được định nghĩa.

### 4.5. Giới hạn integrity

Comment trong schema ghi score 1–5, nhưng database chưa có check constraint. Do đó schema hiện cho phép:

- `rating=0`.
- `rating=100`.
- Component score âm hoặc lớn hơn 5.

Các khoảng trống khác:

- `contractId` nullable.
- Không unique theo contract/reviewer/room.
- Không bảo đảm `room.tenantId = review.tenantId`.
- Không bảo đảm contract thuộc cùng room/tenant.
- Không bảo đảm reviewer là renter/member của contract.
- Không có `updatedAt`.
- Không có moderation actor/reason/time.
- Không có edit/delete/appeal history.

### 4.6. Mâu thuẫn visibility

Default hiện tại:

```text
status = PENDING
isVisible = true
```

Nếu public query tương lai chỉ kiểm `isVisible=true`, review pending có thể bị lộ. Quy tắc public bắt buộc nên là:

```text
status = APPROVED AND isVisible = true
```

Tốt hơn nữa, cân nhắc đổi default `isVisible=false` và chỉ bật trong transaction approve.

## 5. Mô hình ReputationScore

### 5.1. Mục đích

`ReputationScore` dự kiến tổng hợp uy tín cho:

- Một tenant.
- Một room cụ thể.

### 5.2. Field

| Field                 | Ý nghĩa                  |
| --------------------- | ------------------------ |
| `targetType`          | `TENANT` hoặc `ROOM`     |
| `tenantId`            | Tenant liên quan         |
| `roomId`              | Room liên quan, nullable |
| `averageRating`       | Điểm review trung bình   |
| `totalReviews`        | Tổng review              |
| `ticketResponseScore` | Điểm xử lý ticket        |
| `transparencyScore`   | Điểm minh bạch chi phí   |
| `verificationScore`   | Điểm xác minh            |
| `finalScore`          | Điểm cuối                |
| `updatedAt`           | Thời điểm cập nhật       |

Các Decimal dùng kiểu `Decimal(3,2)`.

### 5.3. ReputationTargetType

| Giá trị  | Invariant dự kiến                    |
| -------- | ------------------------------------ |
| `TENANT` | `roomId` phải null                   |
| `ROOM`   | `roomId` phải có và thuộc `tenantId` |

Database hiện chưa enforce hai invariant này.

### 5.4. Phần chưa tồn tại

- Công thức `finalScore`.
- Trọng số.
- Nguồn `ticketResponseScore`.
- Nguồn `transparencyScore`.
- Mapping tenant verification thành score.
- Job tính lần đầu.
- Job recalculate.
- Event trigger.
- Unique constraint theo target.
- Lịch sử/version thuật toán.
- API public/admin.
- Tích hợp marketplace ranking.

Không được tự suy ra `finalScore` từ field vì source chưa có công thức.

### 5.5. Rủi ro duplicate

Schema không có unique:

```text
(targetType, tenantId, roomId)
```

Nhiều row reputation cho cùng target có thể tồn tại. API tương lai cần constraint phù hợp, đặc biệt vì PostgreSQL unique với nullable column cần thiết kế cẩn thận.

## 6. Mô hình Report

### 6.1. Mục đích

`Report` lưu báo cáo vi phạm hoặc thông tin sai lệch do user gửi lên moderation.

### 6.2. Field

| Field         | Ý nghĩa                        |
| ------------- | ------------------------------ |
| `reporterId`  | User gửi report                |
| `targetType`  | Loại đối tượng                 |
| `targetId`    | ID đối tượng dạng chuỗi        |
| `reason`      | Lý do ngắn, tối đa theo DB 255 |
| `description` | Mô tả tùy chọn                 |
| `status`      | Trạng thái moderation          |
| `handledBy`   | Admin xử lý                    |
| `createdAt`   | Thời điểm gửi                  |
| `resolvedAt`  | Thời điểm hoàn tất             |

### 6.3. ReportTargetType

- `ROOM`.
- `TENANT`.
- `REVIEW`.
- `USER`.

`targetId` là string polymorphic, không có foreign key đến các bảng đích.

### 6.4. ReportStatus

| Giá trị     | Ý nghĩa dự kiến               |
| ----------- | ----------------------------- |
| `PENDING`   | Chờ tiếp nhận                 |
| `REVIEWING` | Admin đang kiểm tra           |
| `RESOLVED`  | Xác định có xử lý             |
| `REJECTED`  | Không đủ căn cứ/không vi phạm |

Schema chưa định nghĩa transition và không ngăn chuyển ngược từ terminal state.

### 6.5. Relation

- Reporter bị `Restrict` khi xóa.
- Handler bị `SetNull` khi xóa.
- Target không có relation.

Do không có foreign key target:

- Target có thể không tồn tại.
- Target có thể bị xóa mà report vẫn giữ string ID.
- Backend tương lai phải resolve theo `targetType`.
- Cần snapshot dữ liệu quan trọng để điều tra sau khi target thay đổi.

### 6.6. Dữ liệu còn thiếu cho phạm vi mở rộng

Migration hiện đã có moderation reason/time cho review và snapshot/fingerprint/reviewing/resolution/update time cho report. Phần chưa có policy/schema hoàn chỉnh:

- Evidence attachment và retention.
- Enforcement action liên kết user/tenant/listing.
- Appeal fields và workflow.
- Priority/SLA.
- Source channel/IP/device với privacy policy.

## 7. Public interface hiện hành

### Review

- `POST /reviews`.
- `GET /reviews/me`, `GET /reviews/me/:id`.
- `GET /marketplace/rooms/:roomId/reviews`.
- `GET /marketplace/rooms/:roomId/review-summary`.
- `GET /reviews/admin`, `GET /reviews/admin/:id`.
- `PATCH /reviews/admin/:id/status`.

### Report

- `POST /reports`.
- `GET /reports/me`, `GET /reports/me/:id`.
- `GET /reports/admin`, `GET /reports/admin/:id`.
- `PATCH /reports/admin/:id/status`.

Các API public chỉ trả review approved-visible và projection không chứa reviewer ID, email, phone hoặc contract ID. API self-service luôn scope theo user hiện tại; moderation chỉ dành cho `ADMIN`.
## 8. Thiết kế và backlog mở rộng

Các phần đã có API được mô tả tại mục 7. Các nội dung appeal, reputation đa nguồn, enforcement và retention nâng cao dưới đây vẫn là backlog mở rộng.

### 8.1. Nhóm interface renter review

Nhóm đề xuất:

- Tạo review từ contract đủ điều kiện.
- List review của mình.
- Xem detail review của mình.
- Chỉnh sửa review trong policy cho phép.
- Rút review trước moderation.
- Gửi appeal khi bị reject/hide.

Không cho client truyền `tenantId` độc lập. Backend phải suy ra tenant/room/reviewer từ contract và access token.

### 8.2. Nhóm interface public

Nhóm đề xuất:

- List review approved/visible theo room.
- Summary rating theo room/tenant.
- Public reputation.

Public response cần:

- Mask reviewer theo privacy policy.
- Không trả contract ID/PII.
- Chỉ dùng review `APPROVED && isVisible=true`.
- Có pagination/sort.
- Có distribution theo số sao nếu cần.

### 8.3. Nhóm interface moderation

Nhóm đề xuất:

- Admin list/detail review queue.
- Approve/reject/hide.
- Lưu reason, actor và timestamp.
- Admin list/detail report queue.
- Start review.
- Resolve/reject report.
- Ghi enforcement action.
- Appeal review/report.

Các action phải có audit và notification.

### 8.4. Nhóm interface reputation

Nhóm đề xuất:

- Public read reputation.
- Admin diagnostics.
- Internal recalculation.
- History/version.

Recalculate endpoint nếu có phải internal/Admin, rate-limited và idempotent; không mở public.

## 9. Luồng renter gửi review - đề xuất

### 9.1. Điều kiện bắt đầu

Policy cần chốt trước khi code:

- User là main renter hoặc contract member?
- Contract phải `ACTIVE`, `EXPIRED` hay `TERMINATED`?
- Có cần chờ sau ngày check-in/check-out?
- Mỗi contract được review một lần hay mỗi user một lần?
- Có cửa sổ chỉnh sửa bao lâu?

Đề xuất mặc định:

- Chỉ người có quan hệ contract đã xác minh.
- Contract đã bắt đầu và không bị `DRAFT/CANCELED`.
- Một review cho mỗi reviewer + contract + room.

### 9.2. Xử lý backend đề xuất

1. Xác thực role renter.
2. Rate limit.
3. Tìm contract thuộc user.
4. Suy ra room và tenant.
5. Kiểm tra eligibility.
6. Validate mọi score từ 1 đến 5.
7. Chặn duplicate bằng DB unique.
8. Tạo:
   - `status=PENDING`.
   - `isVisible=false`.
9. Ghi audit/outbox.
10. Thông báo moderation queue.

### 9.3. Kết quả

Review pending không xuất hiện marketplace. Renter xem được trạng thái trong self-service.

## 10. Luồng moderation review - đề xuất

### 10.1. State machine

```text
PENDING ──approve──> APPROVED
   │
   └──reject──────> REJECTED

APPROVED ──hide───> HIDDEN
HIDDEN ──restore──> APPROVED
REJECTED/HIDDEN ──appeal──> PENDING_REVIEW_APPEAL [cần model/state mới]
```

Schema hiện chưa có trạng thái appeal.

### 10.2. Approve

Trong transaction:

- Conditional update từ `PENDING`.
- Set `APPROVED`.
- Set `isVisible=true`.
- Lưu moderator/reason/time.
- Tạo outbox audit/notification.

Sau commit:

- Recalculate reputation.
- Invalidate marketplace cache.
- Thông báo reviewer.

### 10.3. Reject/hide

- Bắt buộc reason.
- `isVisible=false`.
- Không xóa vật lý review.
- Recalculate reputation nếu review từng được tính.
- Lưu action history.

Đối tượng bị review không nên có quyền tự hide ngoài moderation policy có audit.

## 11. Luồng reputation - đề xuất

### 11.1. Nguồn dữ liệu

Ví dụ nguồn cần thiết kế:

- Review approved.
- Ticket response/resolution SLA từ G09.
- Invoice/payment transparency từ G07–G08.
- Tenant verification từ G02.

### 11.2. Công thức

Chưa có công thức hiện hành. Phiên bản tương lai cần lưu:

- Algorithm version.
- Trọng số từng component.
- Sample size.
- Time window.
- Minimum data threshold.
- Giá trị fallback khi thiếu nguồn.

### 11.3. Recalculation

Trigger dự kiến:

- Review approved/hidden/restored.
- Ticket SLA thay đổi.
- Tenant verification thay đổi.
- Reconciliation dữ liệu định kỳ.

Job phải:

- Idempotent.
- Dùng lock hoặc unique upsert.
- Không tạo duplicate target.
- Lưu history.
- Phát hiện stale score.

### 11.4. Public display

Frontend cần phân biệt:

- `finalScore`.
- `averageRating`.
- `totalReviews`.
- Thời điểm tính.
- Version.
- “Chưa đủ dữ liệu” thay vì hiển thị 0 như điểm xấu.

## 12. Luồng gửi report - đề xuất

### 12.1. Tạo report

1. Xác thực user.
2. Rate limit theo user/IP/target.
3. Validate `targetType`.
4. Resolve target và kiểm tra tồn tại.
5. Chặn tự report nếu policy yêu cầu.
6. Tạo fingerprint chống duplicate.
7. Upload evidence an toàn.
8. Snapshot target cần điều tra.
9. Tạo `PENDING`.
10. Audit và thông báo moderation.

Gửi report không tự động khóa/ẩn target.

### 12.2. Self-service

User nên xem:

- Target summary đã mask.
- Reason.
- Status.
- Created/resolved time.
- Resolution summary phù hợp privacy.

Không trả internal moderator note.

## 13. Luồng moderation report - đề xuất

### 13.1. State machine

```text
PENDING → REVIEWING → RESOLVED
                    └→ REJECTED
```

Không cho chuyển terminal state nếu chưa có reopen/appeal workflow rõ ràng.

### 13.2. Bắt đầu xử lý

- Conditional claim một report.
- Set handler.
- Set reviewing time.
- Chống hai moderator cùng claim.

### 13.3. Resolve

Lưu:

- Finding.
- Resolution reason.
- Enforcement action.
- Target snapshot.
- Handler.
- Resolved time.

Action có thể yêu cầu module sở hữu thực hiện:

- Hide room listing qua G03/G04.
- Hide review qua G12.
- Suspend tenant qua G02.
- Ban user qua G01/G02.

G12 không nên update trực tiếp tùy tiện; dùng service/action có audit của module sở hữu.

### 13.4. Notification

Notification cho reporter và đối tượng bị xử lý phải:

- Không lộ danh tính reporter nếu policy bảo mật.
- Không lộ internal evidence/note.
- Có link appeal nếu được phép.
- Idempotent.

## 14. Data integrity đề xuất

### 14.1. Review

Các constraint cần cân nhắc:

- CHECK mọi score từ 1 đến 5.
- Unique reviewer/contract/room theo eligibility policy.
- `contractId` bắt buộc nếu chỉ verified stay.
- Backend transaction kiểm room/tenant/contract.
- Default `isVisible=false`.

### 14.2. Reputation

Hai unique target logic:

- Một row tenant score trên mỗi tenant.
- Một row room score trên mỗi room.

Cần CHECK:

- `TENANT → roomId IS NULL`.
- `ROOM → roomId IS NOT NULL`.
- Score trong khoảng 0–5.
- `totalReviews >= 0`.

### 14.3. Report

Do polymorphic target khó dùng FK:

- Resolve target ở service.
- Lưu target snapshot.
- Index `targetType + targetId`.
- Lưu fingerprint.
- Không cascade report khi target bị xóa.

## 15. Privacy và security đề xuất

### 15.1. Review privacy

- Không public email/phone/CCCD.
- Cân nhắc chỉ hiển thị tên rút gọn và avatar.
- Không public contract code.
- Sanitize content.
- Chống stored XSS ở client và server rendering.
- Rate limit và abuse detection.

### 15.2. Report privacy

- Danh tính reporter có thể cần bảo mật với target.
- Evidence có signed URL và permission.
- Internal note chỉ moderator.
- PII phải redacted trong audit/log/export.
- Có retention/legal hold.

### 15.3. Moderator security

- Permission riêng cho read/claim/resolve/enforce.
- Maker-checker cho action nghiêm trọng.
- Re-auth hoặc approval với ban/suspend.
- Audit append-only.
- Không cho moderator xử lý report có conflict of interest nếu policy yêu cầu.

## 16. Notification và audit dependency

G12 tương lai phụ thuộc:

- G10 cho review/report status notification.
- G11 AuditLog cho mọi moderation/enforcement.
- Transactional outbox để không mất event.

Event dự kiến:

- `review.submitted`.
- `review.approved`.
- `review.rejected`.
- `review.hidden`.
- `report.submitted`.
- `report.reviewing`.
- `report.resolved`.
- `report.rejected`.
- `reputation.recalculated`.

MVP hiện gọi `NotificationEventsService` sau commit và ghi `AuditLog` trong transaction. Transactional outbox cho các event trên vẫn là backlog.

## 17. Trạng thái hoàn thành Backend MVP

- Review eligibility dựa trên main renter/co-renter và contract đã bắt đầu.
- DTO và database cùng bảo vệ score 1-5; unique reviewer-contract chống duplicate cạnh tranh.
- Review pending mặc định ẩn; public query luôn dùng điều kiện approved-visible.
- Admin moderation dùng conditional update, metadata moderator và audit transaction.
- Public summary trả count, distribution và trung bình trực tiếp từ review hợp lệ.
- Report resolver hỗ trợ room, tenant, review, user; lưu target snapshot và fingerprint.
- Report moderation có claim riêng, chỉ handler được resolve/reject và terminal state không mở lại.
- Notification review/report không chứa reporter identity hoặc internal moderator data.
- Unit test bao phủ validation, eligibility, privacy, transition, ownership và target resolver.

## 18. Backlog sau MVP

1. Công thức `ReputationScore` đa nguồn, algorithm version và history.
2. Evidence attachment có signed URL, MIME/size validation và access control.
3. Appeal/reopen workflow và permission moderator riêng.
4. Enforcement command qua module sở hữu với maker-checker cho hành động nghiêm trọng.
5. Transactional outbox, SLA dashboard, retention/legal hold và anti-abuse nâng cao.
6. PostgreSQL integration/E2E race test trong môi trường test database chuyên dụng.
7. Frontend marketplace, renter mobile và admin moderation UI.

## 19. Tiêu chí nghiệm thu Backend MVP

- [x] Review mới là `PENDING` và không public.
- [x] Tenant/room/reviewer được suy ra từ contract, không nhận từ client.
- [x] Một reviewer chỉ tạo được một review trên mỗi contract.
- [x] Public response không chứa reviewer ID, email, phone hoặc contract ID.
- [x] Moderation review/report có state machine, actor, timestamp và audit.
- [x] Report target sai hoặc self-report bị từ chối.
- [x] Duplicate report đang mở bị chặn bằng partial unique index.
- [x] Summary không có dữ liệu trả average `null`, không trả 0 như điểm xấu.
- [x] Reputation đa nguồn không bị giả lập bằng component score 0.
- [x] Prisma validate/generate, unit tests và backend build là release gate.

## 20. Giới hạn vận hành

- Notification là best-effort sau commit; lỗi Redis/FCM không rollback moderation.
- Migration dừng nếu gặp legacy review/report không thể backfill an toàn.
- Submit report không tự động khóa, ẩn hoặc suspend target.
- `ReputationScore` được giữ trong schema nhưng chưa có API hoặc worker.

## 21. Nguồn mã đối chiếu

- `backend/prisma/schema.prisma`
- `backend/src/modules/reviews`
- `backend/src/modules/reports`
- `backend/prisma/migrations/20260730120000_complete_g12_trust_moderation`
- `backend/src/app.module.ts`
- `backend/docs/systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md`
- `backend/docs/systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md`
