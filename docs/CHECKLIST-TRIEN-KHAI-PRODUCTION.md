# Checklist triển khai production EduMatrix

Ngày lập: 19/07/2026. Chỉ đánh dấu hoàn tất khi có bằng chứng từ Console hoặc smoke test production; “code-ready” không đồng nghĩa “đã triển khai”.

## 1. Firebase App Check

- [ ] Xác nhận domain production và preview hợp lệ trong reCAPTCHA v3.
- [ ] Build production có `VITE_APPCHECK_SITE_KEY`; không có `VITE_APPCHECK_DEBUG_TOKEN`.
- [ ] Triển khai ở chế độ theo dõi, quan sát request hợp lệ/không hợp lệ tối thiểu 24 giờ.
- [ ] Đăng ký debug token riêng cho emulator/dev, không dùng token đó ở production.
- [ ] Khi metrics ổn định, bật enforcement cho Firestore; kiểm thử các luồng Admin/Teacher/Viewer.
- [ ] Chỉ bật enforcement cho Authentication sau khi xác nhận toàn bộ provider/client production gửi App Check đúng.
- [ ] Lưu ảnh metrics, thời điểm bật enforcement và người xác nhận vào hồ sơ phát hành.

## 2. Giới hạn Firebase Spark

- [ ] Chỉ dùng Firebase Console làm nguồn quota; không bật lại telemetry Firestore trong app.
- [ ] Cảnh báo nội bộ ở 35.000 Firestore reads/ngày (70% của 50.000).
- [ ] Cảnh báo ở 14.000 writes/ngày hoặc 14.000 deletes/ngày (70% của 20.000).
- [ ] Đặt ngưỡng Hosting transfer bằng 70% quota hiện được hiển thị trong Firebase Console.
- [ ] Ghi người nhận, kênh cảnh báo và phương án giảm tải: tắt phần không thiết yếu, giảm refresh/realtime, kiểm tra query bất thường.
- [ ] Lưu ảnh quota sau 24 giờ và 7 ngày đầu production.

## 3. Google Drive cho giáo án

- [ ] Bật Google Drive API và Google Picker API trong đúng Google Cloud project.
- [ ] Cấu hình OAuth consent screen, authorized JavaScript origins cho localhost, preview và production.
- [ ] Giới hạn Picker API key theo origins và chỉ các API cần thiết.
- [ ] Điền `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_PICKER_API_KEY`, `VITE_GOOGLE_PICKER_APP_ID`; không thêm client secret/refresh token.
- [ ] Admin lưu `driveFolderId` trong Settings > Tích hợp và xác nhận quyền thư mục của nhân sự.
- [ ] Smoke test kết nối, chọn tệp, upload <= 5 MB, mở lại giáo án, refresh metadata, unlink, tệp bị xóa và sai quyền.
- [ ] Kiểm tra `lesson_plan_public` không chứa Drive file ID hoặc private web view link.

## 4. Messenger Worker và Meta

- [ ] Deploy Worker production với secrets bằng `wrangler secret`; không đặt secret trong frontend/repository.
- [ ] Điền `VITE_MESSENGER_WORKER_URL` và `VITE_MESSENGER_PAGE_USERNAME` production.
- [ ] Xác minh CORS chỉ cho origin production dự kiến.
- [ ] Webhook production verified; subscription gồm messages, messaging_postbacks, messaging_referrals.
- [ ] Tạo link từ UI; URL chỉ chứa nonce, không chứa Firebase UID; giáo viên chỉ tạo được cho phụ huynh của học sinh được phân công.
- [ ] Xác nhận nonce dùng lại/hết hạn bị từ chối và PSID không thể chiếm tài khoản khác.
- [ ] Gửi/nhận một tin thật và đối chiếu `message_outbox`, `chat_threads`, `messenger_connections`.

## 5. QA giao diện Admin

- [ ] Kiểm tra Overview, Settings > Tích hợp và Giáo án ở 360, 768, 1024 và 1440 px.
- [ ] Kiểm tra light/dark mode và `prefers-reduced-motion`.
- [ ] Chỉ dùng bàn phím để mở `?section=integrations`, nhập cấu hình, kết nối/ngắt Drive và retry.
- [ ] Xác nhận loading, empty, success, expired, denied, timeout và retry có thông báo, không mất dữ liệu form.
- [ ] Không tràn ngang, bị che nội dung, mất focus hoặc có vùng bấm nhỏ hơn chuẩn hiện có.

## 6. Cổng phát hành

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:rules`
- [ ] `npm run build`
- [ ] Trong `workers/messenger`: `npm test` và `npm run build:prod`
- [ ] Không có secret mới trong diff và bundle frontend.
- [ ] Ghi commit/deployment ID, thời điểm, người triển khai và kết quả smoke test.
