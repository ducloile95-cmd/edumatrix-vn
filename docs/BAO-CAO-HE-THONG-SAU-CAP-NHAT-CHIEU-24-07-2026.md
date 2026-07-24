# Báo cáo hệ thống sau cập nhật chiều 24/07/2026

## 1. Tóm tắt điều hành

- Phạm vi đánh giá: commit `b5f466e` lúc 17:25:51 ngày 24/07/2026, tiêu đề `Update Meta API Mesenger`.
- Quy mô commit: 27 tệp, 1.204 dòng thêm và 205 dòng xóa.
- Trọng tâm: Meta Messenger, giao diện hội thoại, thông báo âm thanh, quyền tạo môn/khóa học cho giáo viên, sửa KPI dashboard, sửa trạng thái tải dữ liệu lớp học và đồng bộ cấu hình Google Drive/Picker.
- Kết quả mã nguồn: typecheck, lint, 75 unit test, bộ test Firestore Rules, kiểm tra mojibake và production build đều đạt.
- Kết quả Worker: 23/23 test đạt; dry-run production đạt sau khi sửa cấu hình.
- Kết nối có thể xác minh không làm thay đổi dữ liệu: Firebase Hosting, Firebase Auth API, Google OAuth discovery, Google Drive API, Meta Page và Cloudflare Worker đều phản hồi.
- Chưa thực hiện: gửi tin Messenger thật, đăng bài Facebook thật, thao tác Google Picker bằng tài khoản người dùng hoặc deploy production. Các bước này cần tài khoản/quyền production và có tác động bên ngoài.
- Kết luận: mã nguồn đủ điều kiện cho vòng UAT có kiểm soát. Chưa nên coi production đã hoàn tất cho đến khi deploy lại Worker với CORS đã giới hạn và chạy smoke test bằng tài khoản thật.

## 2. Thay đổi chính trong bản cập nhật

### Meta Messenger và chat

- Bổ sung tiếp nhận tin nhắn từ tài khoản Facebook chưa liên kết.
- Bổ sung lấy tên và ảnh đại diện từ Graph API.
- Bổ sung luồng Admin liên kết hội thoại với học sinh/phụ huynh.
- Bổ sung trả lời trực tiếp hội thoại chưa liên kết.
- Cải thiện thông báo lỗi Page Access Token, bao gồm mã Meta `190`.
- Chuẩn hóa Firebase private key trước khi ký JWT.
- Bổ sung CORS cho nhiều origin và header `Vary: Origin`.
- Ghi thêm trạng thái liên kết, PSID, Page ID, tên và avatar vào dữ liệu chat.

### Ứng dụng web

- Thiết kế lại trang chat và popup theo bố cục hai cột.
- Bổ sung âm thanh khi có thông báo hoặc tin nhắn mới.
- Cho phép giáo viên tạo học sinh, môn học và khóa học theo Firestore Rules mới.
- Sửa race condition khi dữ liệu tương tác lớp học chưa tải xong.
- Sửa heading trùng cấp trên các trang chính.
- Sửa KPI bài chờ chấm/bài chưa nộp bằng cách đếm trực tiếp từ submissions.
- Tăng kích thước nút thu gọn Sidebar lên chuẩn tương tác hiện tại.

### Cấu hình tích hợp

- Frontend trỏ tới Worker production:
  `https://edumatrix-messenger-production.edumatrix-vn.workers.dev`
- Meta Page username: `cochichudep`.
- Google OAuth client, Picker API key và Picker app ID đã được khai báo.
- Firebase project: `edumatrix-vn-576b1`.

## 3. Kết quả kiểm tra mã nguồn

| Hạng mục | Kết quả | Bằng chứng |
|---|---:|---|
| TypeScript | Đạt | `npm run typecheck`, exit code 0 |
| ESLint | Đạt | `npm run lint`, 0 lỗi/cảnh báo |
| Unit test ứng dụng | Đạt | 19 tệp, 75/75 test |
| Firestore Rules | Đạt | 12 tệp test, lệnh kết thúc exit code 0 |
| Worker test | Đạt | 1 tệp, 23/23 test |
| Kiểm tra mojibake | Đạt | `npm run check:mojibake`, exit code 0 |
| Production build web | Đạt | Vite build 7.794 modules |
| Worker dry-run mặc định | Đạt | bundle 92,54 KiB; gzip 19,54 KiB |
| Worker dry-run production | Đạt sau sửa | CORS HTTPS hợp lệ; bundle thành công |
| Diff hygiene | Đạt | `git diff --check` không báo whitespace error |

Ghi chú môi trường:

- Lần chạy đầu tiên thất bại vì `node_modules` chưa có dependency mới `@phosphor-icons/react`.
- Sau `npm install`, toàn bộ typecheck/test/build đạt. Đây là sai lệch môi trường cục bộ so với lockfile, không phải lỗi TypeScript trong commit.
- Máy đang dùng Node `v24.16.0`; `superstatic@9.2.0` chỉ khai báo hỗ trợ Node 18/20/22. Nên dùng Node 22 LTS cho CI và deploy tooling.

## 4. Trạng thái kết nối API

| Nền tảng | Trạng thái xác minh | Mức xác minh |
|---|---|---|
| Firebase Hosting | HTTP 200 | Endpoint production truy cập được |
| Firebase Auth API | HTTP 200 | API key và project config phản hồi |
| Firestore | Đạt emulator rules tests | Schema/quyền được kiểm thử cục bộ; chưa ghi production |
| Google OAuth | HTTP 200 | Discovery endpoint truy cập được; client ID đúng định dạng |
| Google Drive API | HTTP 401 như mong đợi khi thiếu OAuth | Endpoint và API key được chấp nhận; cần đăng nhập để kiểm thử Picker thực tế |
| Meta Page `m.me/cochichudep` | HTTP 200 | Page route truy cập được |
| Messenger Worker `/health` | HTTP 200, `{"ok":true}` | Worker production đang hoạt động |
| Meta Send API | Chưa gửi thật | Tránh phát sinh tin nhắn ngoài ý muốn |
| Meta Feed API | Chưa đăng thật | Tránh tạo bài viết production |
| Meta Webhook | Có unit test chữ ký/challenge | Chưa phát sinh webhook thật trong lần đánh giá này |

Luồng tích hợp hiện tại:

1. Web app lấy Firebase ID token.
2. Web app gọi Cloudflare Worker bằng Bearer token.
3. Worker xác thực token với Firebase, kiểm tra role/scope.
4. Worker dùng secret production để gọi Meta Graph API.
5. Worker ghi outbox, hội thoại và message vào Firestore qua service account.
6. Google Picker chạy phía client bằng OAuth client ID và API key đã giới hạn theo origin.

## 5. Phát hiện và xử lý

### P1 — CORS production bị mở toàn bộ origin

Commit đổi `ALLOWED_ORIGIN` từ domain Firebase Hosting sang `*`. Probe production xác nhận cả origin lạ cũng nhận `Access-Control-Allow-Origin: *`.

Đã sửa trong working tree:

- Khôi phục `ALLOWED_ORIGIN` về `https://edumatrix-vn-576b1.web.app`.
- Khai báo lại danh sách secret bắt buộc trong environment `production` để tránh cấu hình môi trường không kế thừa.
- `npm run build:prod` đã đạt sau sửa.

Trạng thái còn lại: Worker production đang chạy vẫn trả CORS `*` cho đến khi phiên bản sửa được deploy. Chưa tự deploy trong lần đánh giá này.

### P1 — Chưa xác minh secret và thao tác Meta production

Môi trường hiện tại không có `CLOUDFLARE_API_TOKEN`, nên không thể đọc deployment metadata hoặc xác nhận các secret của environment production bằng Wrangler. Health check không sử dụng các secret Meta/Firebase nên chỉ chứng minh Worker sống, chưa chứng minh luồng gửi tin hoàn chỉnh.

Hành động cần làm:

1. Xác nhận đủ năm secret trong environment `production`.
2. Deploy Worker.
3. Gửi một tin nhắn test tới tài khoản QA đã đồng ý nhận tin.
4. Xác nhận outbox, chat thread, message và response window trong Firestore.

### P2 — Coverage chưa tương xứng với phần Worker mới

Worker tăng khoảng 215 dòng nhưng test chỉ thay đổi rất ít. Hiện đã có test cho parsing profile, payload, HMAC, referral và health, nhưng thiếu integration test có mock cho:

- hội thoại chưa liên kết;
- endpoint `/api/messenger/link`;
- trả lời trực tiếp chỉ dành cho Admin;
- bảo toàn lịch sử message khi liên kết;
- CORS với origin hợp lệ và origin lạ;
- lỗi service-account/private-key;
- retry `429` và `5xx`.

Khuyến nghị bổ sung trước khi mở rộng số người dùng Messenger.

### P2 — Dependency audit

`npm audit` báo 13 vấn đề: 10 moderate, 2 high, 1 critical.

- Critical `tar` và phần lớn chuỗi high/moderate nằm dưới `firebase-tools`, chủ yếu ảnh hưởng tooling phát triển/CLI.
- `react-router-dom@6.30.4` và `react-router@6.30.4` có advisory moderate trong runtime.
- Bản sửa do npm đề xuất có thể kéo theo thay đổi major, vì vậy không chạy `npm audit fix --force` tự động.

Khuyến nghị:

1. Nâng `react-router-dom` trong một PR riêng và chạy lại routing/UAT.
2. Nâng `firebase-tools` trong một PR tooling riêng.
3. Dùng Node 22 LTS để tránh sai lệch engine.

### P3 — Cấu hình public nằm trong tệp mẫu

`.env.example` chứa Firebase Web config, reCAPTCHA site key, Google OAuth client ID và Google Picker API key. Các giá trị này là public-by-design, nhưng Google API key vẫn phải được giới hạn:

- chỉ Google Drive API và Google Picker API;
- chỉ origin production được phép;
- có quota và cảnh báo sử dụng bất thường.

Không phát hiện Page Access Token, Meta App Secret hoặc Firebase service-account key trong các tệp frontend được kiểm tra.

## 6. Đánh giá rủi ro phát hành

| Khu vực | Mức rủi ro | Lý do |
|---|---:|---|
| Build/type safety | Thấp | Tất cả kiểm tra đạt |
| Firestore Rules | Thấp–trung bình | Test đạt; quyền teacher vừa được mở rộng có chủ đích |
| UI chat | Trung bình | Thay đổi lớn, cần UAT responsive và dữ liệu thật |
| Messenger Worker | Trung bình–cao | Logic mới nhiều, coverage endpoint còn thiếu |
| CORS production | Cao cho tới khi deploy lại | Bản đang chạy vẫn mở `*` |
| Google Picker | Trung bình | Cấu hình có mặt nhưng chưa hoàn tất OAuth UI smoke test |
| Supply chain | Trung bình | Có advisory runtime và tooling cần nâng cấp có kiểm soát |

Quyết định đề xuất: **Cho phép UAT, chưa xác nhận production hoàn tất**.

## 7. Checklist phát hành đề xuất

- [x] Đồng bộ dependency cục bộ.
- [x] Typecheck.
- [x] Lint.
- [x] Unit tests.
- [x] Firestore Rules tests.
- [x] Worker tests.
- [x] Production build web.
- [x] Worker production dry-run.
- [x] Khôi phục CORS production về origin HTTPS cụ thể.
- [ ] Review và commit thay đổi cấu hình Worker.
- [ ] Cấu hình `CLOUDFLARE_API_TOKEN` cho CI hoặc phiên deploy.
- [ ] Xác nhận năm Worker secrets trong environment production.
- [ ] Deploy Worker production.
- [ ] Probe lại CORS: origin hợp lệ được phép, origin lạ không được phép.
- [ ] UAT gửi/nhận Messenger bằng tài khoản QA.
- [ ] UAT liên kết hội thoại chưa gán với học sinh/phụ huynh.
- [ ] UAT Google Picker đăng nhập, chọn file và lưu metadata.
- [ ] Kiểm tra Firebase App Check trên domain production.
- [ ] Lập kế hoạch xử lý dependency audit.

## 8. Phạm vi và giới hạn

- Báo cáo dựa trên commit đã push lên `main`, kiểm tra cục bộ và các probe HTTP không thay đổi dữ liệu.
- Không đọc hoặc hiển thị giá trị secret.
- Không gửi tin, đăng bài, sửa dữ liệu production hoặc deploy.
- Trong lúc đánh giá xuất hiện thay đổi chưa commit ở `src/components/layouts/Sidebar.tsx`, `src/components/layouts/Topbar.tsx` và tệp mới `src/components/layouts/SidebarClockWeather.tsx`; các thay đổi này không thuộc commit chiều 24/07 và không được chỉnh sửa/đánh giá trong báo cáo này.
