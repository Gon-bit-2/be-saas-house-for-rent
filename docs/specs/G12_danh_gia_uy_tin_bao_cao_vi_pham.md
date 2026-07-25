# G12 - Đặc tả đánh giá, uy tín và báo cáo vi phạm

## 1. Tổng quan

G12 là lớp trust và moderation dự kiến giúp marketplace:

- Xác thực đánh giá từ người đã thuê.
- Công khai phản hồi đáng tin cậy.
- Tổng hợp điểm uy tín của phòng/chủ trọ.
- Tiếp nhận báo cáo vi phạm.
- Hỗ trợ Admin kiểm duyệt và thực thi hành động.

Trạng thái quan trọng nhất: **G12 chưa có API hoặc nghiệp vụ backend đang hoạt động**. Source hiện chỉ có Prisma schema và một thư mục `reviews` rỗng.

Mục tiêu của tài liệu:

- Người đọc biết chính xác dữ liệu nào đã được thiết kế.
- Frontend không gọi nhầm endpoint chưa tồn tại.
- Backend có roadmap rõ để triển khai review, reputation và report.
- Product/tester hiểu những policy còn phải khóa.
- Người lập kế hoạch thấy dependency, rủi ro và tiêu chí hoàn thành.

### 1.1. Phạm vi

- Model `Review`.
- Model `ReputationScore`.
- Model `Report`.
- Enum review/reputation/report.
- Quan hệ với User, Tenant, Room và Contract.
- Trạng thái triển khai hiện tại.
- Luồng nghiệp vụ đề xuất cho tương lai.
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

| Thành phần              | Trạng thái           | Có thể gọi API? |
| ----------------------- | -------------------- | --------------- |
| `Review`                | Chỉ có Prisma schema | Không           |
| `ReputationScore`       | Chỉ có Prisma schema | Không           |
| `Report`                | Chỉ có Prisma schema | Không           |
| Review self-service     | Chưa tồn tại         | Không           |
| Public review           | Chưa tồn tại         | Không           |
| Review moderation       | Chưa tồn tại         | Không           |
| Reputation calculation  | Chưa tồn tại         | Không           |
| Public reputation       | Chưa tồn tại         | Không           |
| Report submission       | Chưa tồn tại         | Không           |
| Report moderation       | Chưa tồn tại         | Không           |
| Notification moderation | Chưa tồn tại         | Không           |
| Audit moderation        | Chưa tồn tại         | Không           |

### 1.4. Bằng chứng source

- Prisma có `Review`, `ReputationScore`, `Report`.
- Prisma có các enum liên quan.
- Không có controller, service, repository hoặc DTO.
- Không có source gọi `prisma.review`, `prisma.reputationScore` hoặc `prisma.report`.
- `backend/src/modules/reviews` hiện không có file.
- `ReviewsModule` không được import vào `AppModule`.

Schema tồn tại không đồng nghĩa nghiệp vụ đã hoạt động hoặc database đã bảo vệ mọi quy tắc được ghi trong comment.

## 2. Hành trình dự kiến

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

- Landlord có được approve review hay chỉ Admin?
- Landlord có được hide review tiêu cực hay chỉ phản hồi?
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

### 6.6. Dữ liệu còn thiếu

- Evidence attachment.
- Moderation note.
- Resolution reason.
- Enforcement action.
- `updatedAt`.
- `reviewingAt`.
- Appeal fields.
- Priority/SLA.
- Source channel/IP/device.
- Duplicate/fingerprint.

## 7. Public interface hiện hành

G12 hiện có:

```text
0 controller
0 service
0 repository
0 DTO
0 HTTP endpoint
0 background job
```

Không có endpoint để:

- Tạo review.
- Xem review.
- Duyệt review.
- Xem reputation.
- Tạo report.
- Theo dõi report.
- Moderation report.

Frontend phải coi G12 là chưa khả dụng.

## 8. Thiết kế triển khai đề xuất - chưa tồn tại

Toàn bộ nội dung chương này là roadmap, không phải API hiện hành.

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

Các event này chưa tồn tại.

## 17. Chức năng chưa hoàn thiện và hướng triển khai

Toàn bộ G12 hiện chưa hoàn thiện; mọi interface đề xuất đều **chưa tồn tại**.

### 17.1. Review

| #   | Hiện trạng                           | Ảnh hưởng                     | Hướng triển khai                     | Dependency    | Tiêu chí hoàn thành             |
| --- | ------------------------------------ | ----------------------------- | ------------------------------------ | ------------- | ------------------------------- |
| 1   | Không module/controller/service      | Không dùng được               | Tạo vertical module review           | G01/G05       | API + tests + docs              |
| 2   | Chưa chốt eligibility                | User không đúng có thể review | Policy contract/status/date          | G05/Product   | Matrix eligibility có test      |
| 3   | Không DB score constraint            | Lưu điểm ngoài 1–5            | Zod + DB CHECK                       | Migration     | Mọi score hợp lệ                |
| 4   | Không unique review                  | Spam nhiều review             | Unique theo policy                   | Migration     | Concurrent create chỉ một thắng |
| 5   | Không enforce cross-entity           | Review sai tenant/room        | Suy ra từ contract trong transaction | G05           | Không client-controlled tenant  |
| 6   | Visible true + pending               | Có nguy cơ lộ chưa duyệt      | Default false + public condition kép | Migration/G04 | Pending không public            |
| 7   | Không edit/delete policy             | Khó sửa hoặc lạm dụng sửa     | Edit window + history/withdraw       | Product/Audit | Không sửa sau policy            |
| 8   | Không moderation metadata            | Không truy vết quyết định     | Actor/reason/time/history            | G11 audit     | Mọi action có evidence          |
| 9   | Không appeal                         | Không xử lý khiếu nại         | Appeal model/state/SLA               | Moderation    | Một quy trình rõ                |
| 10  | Không public list/detail             | Marketplace không hiển thị    | Public read API                      | G04           | Chỉ approved visible            |
| 11  | Không reviewer masking               | Có thể lộ PII                 | Public projection riêng              | Privacy       | Không email/phone/contract      |
| 12  | Không landlord response/helpful vote | Thiếu tương tác trust         | Response/vote model có abuse guard   | Product       | Một response, vote unique       |
| 13  | Không content moderation             | Spam/XSS/toxicity             | Sanitize + policy/manual queue       | Security      | Nội dung độc hại bị chặn        |
| 14  | Không index                          | List public/moderation chậm   | Index room/tenant/status/time        | Migration     | Query plan đạt SLO              |
| 15  | Không retention/legal hold           | Xóa dữ liệu không kiểm soát   | Retention + anonymization            | Legal         | Policy/job/audit rõ             |

### 17.2. Reputation

| #   | Hiện trạng                 | Ảnh hưởng                           | Hướng triển khai                        | Dependency    | Tiêu chí hoàn thành       |
| --- | -------------------------- | ----------------------------------- | --------------------------------------- | ------------- | ------------------------- |
| 16  | Không thuật toán/trọng số  | `finalScore` vô nghĩa               | Spec formula versioned                  | Product/Data  | Golden dataset pass       |
| 17  | Không unique target        | Nhiều score cùng target             | Partial/functional unique strategy      | Migration     | Một current score/target  |
| 18  | Không target invariant     | Tenant score có room sai            | DB CHECK + service validation           | Migration     | ROOM/TENANT hợp lệ        |
| 19  | Không recalc job           | Score không được tạo/cập nhật       | Queue worker/event trigger              | G10/outbox    | Idempotent retry          |
| 20  | Không history/version      | Không giải thích thay đổi           | Reputation history/snapshot             | Schema        | Truy ra version/input     |
| 21  | Không stale detection      | Hiển thị điểm cũ                    | Source watermark/recalculatedAt         | Scheduler     | Alert/rebuild stale       |
| 22  | Không anti-gaming          | Review giả thao túng score          | Verified stay, weighting, fraud signals | G05/Security  | Abuse test/monitoring     |
| 23  | Không public API           | Marketplace không đọc được          | Public projection + cache               | G04           | Không lộ internal factors |
| 24  | Không marketplace ranking  | Score không ảnh hưởng discovery     | Ranking policy có fallback              | G04           | A/B/off switch            |
| 25  | Không xử lý review bị hide | Score vẫn dùng dữ liệu không hợp lệ | Event decrement/full recalc             | Review worker | Score khớp approved set   |

### 17.3. Report và moderation

| #   | Hiện trạng                     | Ảnh hưởng                          | Hướng triển khai                      | Dependency     | Tiêu chí hoàn thành        |
| --- | ------------------------------ | ---------------------------------- | ------------------------------------- | -------------- | -------------------------- |
| 26  | Không submit/history API       | Không báo vi phạm được             | User report module                    | G01            | Ownership/rate test        |
| 27  | Target string không FK         | Dangling target                    | Resolver + snapshot + index           | Target modules | Target sai bị từ chối      |
| 28  | Không evidence                 | Khó điều tra                       | Secure attachment model/upload        | Storage        | Permission/MIME/size       |
| 29  | Không chống duplicate/spam     | Queue bị ngập                      | Fingerprint/rate/cooldown             | Redis/DB       | Concurrent duplicate chặn  |
| 30  | Không state machine            | Chuyển trạng thái tùy ý            | Conditional transitions               | Product        | Terminal/reopen test       |
| 31  | Không handler note/action      | Không biết đã xử lý gì             | Finding/resolution/action fields      | Schema         | Resolve bắt buộc reason    |
| 32  | Không enforcement mapping      | Resolve không tạo hiệu lực         | Command sang module sở hữu            | G01–G04        | Action atomic/audited      |
| 33  | Không moderation queue/SLA     | Report tồn đọng                    | Filter/claim/priority/deadline        | G11            | Aging dashboard/alerts     |
| 34  | Không notification             | Hai phía không biết kết quả        | Privacy-safe G10 events               | G10            | Recipient/content đúng     |
| 35  | Không audit                    | Action nghiêm trọng không truy vết | Append-only audit/outbox              | G11            | Actor/before/after         |
| 36  | Không appeal                   | Không sửa quyết định sai           | Appeal workflow                       | Product/Legal  | SLA và independent review  |
| 37  | Không moderator permission     | ADMIN quá rộng                     | Permission read/claim/resolve/enforce | G01            | Least privilege            |
| 38  | Không index                    | Queue/list target chậm             | Status/type/time/target index         | Migration      | Query plan đạt SLO         |
| 39  | Không privacy/redaction        | Lộ reporter/evidence               | Projection/masking/access log         | Privacy        | Target không thấy reporter |
| 40  | Không retention/legal workflow | Dữ liệu tăng hoặc bị xóa sớm       | Retention/legal hold/export           | Legal          | Policy tự động có audit    |

### 17.4. Kiểm thử và vận hành

| #   | Hiện trạng                    | Ảnh hưởng                      | Hướng triển khai                            | Dependency        | Tiêu chí hoàn thành        |
| --- | ----------------------------- | ------------------------------ | ------------------------------------------- | ----------------- | -------------------------- |
| 41  | Không Zod/response contract   | Client/server không thống nhất | Typed DTO + OpenAPI/docs                    | API standard      | Strict validation          |
| 42  | Không unit/integration/E2E    | Không chứng minh logic         | Test pyramid                                | Test DB/Redis     | Critical paths covered     |
| 43  | Không isolation test          | Rò review/report tenant/user   | Tenant/user A/B E2E                         | Auth seed         | Không cross-access         |
| 44  | Không concurrency review      | Duplicate race                 | Parallel PostgreSQL test                    | Unique constraint | Một review thắng           |
| 45  | Không recalc idempotency test | Retry làm lệch score           | Worker replay tests                         | Queue             | Same event same result     |
| 46  | Không moderation race test    | Hai Admin xử lý đè             | Claim/CAS test                              | PostgreSQL        | Một decision thắng         |
| 47  | Không benchmark public list   | Marketplace có thể chậm        | Seed/load/EXPLAIN                           | Dataset           | SLO/index đạt              |
| 48  | Không E2E review journey      | Không chứng minh trust loop    | Contract → review → approve → reputation    | G04/G05/G10/G11   | Public score đúng          |
| 49  | Không E2E report journey      | Không chứng minh enforcement   | Report → moderation → action → notify/audit | G01–G11           | State/action nhất quán     |
| 50  | Không seed/demo data          | Khó demo/QA                    | Deterministic fixtures                      | Seed scripts      | Đủ trạng thái và edge case |

## 18. Thứ tự ưu tiên backlog

1. Review eligibility, validation, uniqueness và tenant integrity.
2. Moderation state machine, audit và notification.
3. Public review API, privacy và content safety.
4. Reputation formula, version, unique target và recalculate.
5. Report workflow, enforcement action và appeal.
6. Performance, anti-abuse, seed và E2E.

## 19. Checklist nghiệm thu tài liệu

### 19.1. Hiện trạng

- [ ] Ghi rõ không có API G12 hiện hành.
- [ ] Không mô tả thư mục reviews như module đã hoạt động.
- [ ] Không coi comment score 1–5 là DB constraint.
- [ ] Không tự phát minh công thức reputation.
- [ ] Không mô tả moderation/notification/audit như đã có.

### 19.2. Schema

- [ ] Field/relation/cascade Review đúng Prisma.
- [ ] Field/Decimal/target Reputation đúng Prisma.
- [ ] Target string và handler Report đúng Prisma.
- [ ] Enum đầy đủ.
- [ ] Thiếu index/unique/check được ghi rõ.

### 19.3. Roadmap

- [ ] Mọi endpoint đề xuất có nhãn chưa tồn tại.
- [ ] Eligibility và public visibility được phân biệt.
- [ ] Moderation có actor/reason/history.
- [ ] Reputation có version/idempotency.
- [ ] Report không tự động phạt khi mới submit.
- [ ] Enforcement dùng module sở hữu.
- [ ] Privacy reporter/reviewer được đề cập.

## 20. Tiêu chí nghiệm thu tài liệu

- Người đọc biết G12 chưa thể sử dụng qua API.
- Backend hiểu dữ liệu schema và các invariant còn thiếu.
- Product biết policy cần khóa trước khi triển khai.
- Frontend biết public review/reputation là roadmap.
- Tester có danh sách case integrity, moderation, privacy và concurrency.
- Người lập kế hoạch có backlog theo dependency và ưu tiên.
- Không có tính năng tương lai nào bị trình bày như đã hoạt động.

## 21. Nguồn mã đối chiếu

- `backend/prisma/schema.prisma`
- `backend/src/modules/reviews`
- `backend/src/app.module.ts`
- `backend/docs/systems/Tai_lieu_yeu_cau_chuc_nang_MVP.md`
- `backend/docs/systems/tai_lieu_phan_tich_nghiep_vu_he_thong.md`
