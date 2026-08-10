# Biên bản đồng bộ production — 10/08/2026

## Kết quả đã xác minh

- Cloudflare account đang đăng nhập: `ducloile99@gmail.com`.
- Worker chuẩn: `https://edumatrix-messenger-production.ducloile99.workers.dev`.
- Cloudflare Worker version: `de0847d6-b89e-4617-a27b-10ac5b221208`.
- Release Git trên `/health`: `be75ebccb8bd`.
- Firebase project: `edumatrix-vn-576b1`.
- Firebase Hosting: `https://edumatrix-vn-576b1.web.app`.
- Firestore rules và indexes đã triển khai thành công.
- Firebase Hosting đã release thành công.
- Utility Messaging đang tắt ở frontend và Worker cho đến khi Meta phê duyệt quyền tương ứng.

## Cổng kiểm tra đã đạt

- Typecheck: đạt.
- Lint: đạt.
- Frontend: 279/279 test đạt.
- Firestore rules: toàn bộ test đạt.
- Production build: đạt, 3.369 module được build.
- Worker production verifier: đạt.
- `/health` trả đúng release Git.
- `/api/meta/connect/start` không có Bearer token trả `401`.
- CORS chỉ cho phép các origin production đã cấu hình; origin lạ không nhận `Access-Control-Allow-Origin`.
- Website production tải đúng trang đăng nhập và bundle mới.

## Vấn đề runtime còn mở

### Firebase App Check

Trình duyệt production nhận lỗi lặp lại:

```text
@firebase/app-check: AppCheck: 400 error (appCheck/initial-throttle)
```

reCAPTCHA v3 đã tải site key, nhưng bước đổi token App Check bị Firebase từ chối. Không tắt App Check trong production để né lỗi. Cần kiểm tra trong Firebase Console:

1. App Check của Web App `1:87387037612:web:a989627388655e1c8aa409` đã đăng ký reCAPTCHA v3.
2. Site key trong Firebase Console trùng site key đang build vào production.
3. Domain `edumatrix-vn-576b1.web.app` và `edumatrix.id.vn` nằm trong danh sách domain hợp lệ của reCAPTCHA.
4. Sau khi sửa, mở lại website và xác nhận console không còn lỗi `appCheck/initial-throttle`.
5. Chỉ bật enforcement sau khi đăng nhập và các truy vấn Firestore đã chạy thành công với token App Check hợp lệ.

### Meta OAuth và Facebook Page

Worker có đủ tên secret production, nhưng Cloudflare không cho đọc lại giá trị secret. Vì vậy chưa được phép kết luận Page token còn hợp lệ chỉ từ danh sách secret.

Cần thực hiện E2E bằng một tài khoản admin đã đăng nhập Edumatrix:

1. Vào `Cài đặt` → `Tích hợp` → `Meta Messenger`.
2. Chọn kết nối lại Facebook và hoàn tất OAuth trên đúng Meta App.
3. Chọn Page ID `100488521748588`.
4. Xác nhận Worker tự gọi `/{page-id}/subscribed_apps` và UI báo webhook đã xác minh.
5. Gửi tin nhắn thật vào Page; xác nhận hội thoại được tạo/cập nhật trong Edumatrix.
6. Trả lời trong cửa sổ 24 giờ; xác nhận tin nhắn xuất hiện trên Messenger.
7. Không quay hoặc ghi log access token, Authorization header, secret hay dữ liệu học sinh thật.

## Thứ tự hoàn tất còn lại

1. Sửa cấu hình App Check trong Firebase Console và chạy lại smoke test đăng nhập/Firestore.
2. Đăng nhập ứng dụng bằng admin test.
3. Chạy lại OAuth Meta để cấp Page token mới.
4. Xác minh `subscribed_apps`, webhook inbound và reply outbound.
5. Theo dõi Worker logs trong 24–48 giờ.
6. Chỉ sau khi các bước trên đạt mới quay video và gửi Meta App Review.

## Rollback

- Worker có thể rollback về version `a72fa2fe-98d7-449f-84c0-be67a19d56e4` nếu version hiện tại phát sinh lỗi.
- Firebase Hosting có thể rollback về release ngay trước trong Firebase Console.
- Giữ `UTILITY_MESSAGING_ENABLED=false` là kill switch mặc định cho tính năng chưa được Meta phê duyệt.
