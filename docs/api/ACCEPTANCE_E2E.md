# P0 Acceptance E2E

Suite `test/p0-acceptance.e2e-spec.ts` chạy Nest HTTP và Prisma trên PostgreSQL thật. Email, Cloudinary, BullMQ queue và FCM được thay bằng test double; Redis disposable chỉ phục vụ throttling/runtime wiring.

## Môi trường disposable

```bash
npm run e2e:up
```

Đặt `DATABASE_URL_E2E` theo `.env.e2e.example`, sau đó chạy:

```bash
npm run test:e2e:acceptance
npm run e2e:down
```

Runner từ chối reset nếu database host không phải local hoặc tên database không kết thúc bằng `_e2e`. Không được trỏ `DATABASE_URL_E2E` vào database development, staging hoặc production.

## Journey được khóa

1. Login hai bước bằng OTP → refresh rotation → profile; refresh token cũ bị từ chối.
2. Tạo property/room → upload ảnh → submit moderation → publish marketplace → appointment/rental request → approve.
3. Ticket create → multipart upload → maintenance bị chặn trước assign → resolve → renter close → history.
4. Notification REST → unread-count → mark read; dữ liệu chỉ thuộc user hiện tại.
5. Tenant A không đọc resource tenant B; tenant header ngoài membership trả 403.
6. Hai rental request approve đồng thời: một thành công, một 409, chỉ một request được approve.
7. Hai appointment trùng cửa sổ 60 phút: một 201, một 409.
8. Hai ticket transition đồng thời: một thành công, một 409, chỉ một audit history entry.

Kết quả chạy acceptance được báo cáo riêng với unit baseline 75 suites/294 tests; không cộng acceptance case vào số unit test.
