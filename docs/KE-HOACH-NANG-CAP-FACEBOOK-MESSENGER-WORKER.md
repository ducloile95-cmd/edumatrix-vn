# Kế hoạch nâng cấp Facebook Messenger Worker

## 1. Thông tin tài liệu

- Hệ thống: EduMatrix VN
- Phạm vi: Facebook Messenger, Cloudflare Worker và kết nối Firestore
- Firebase: Giữ nguyên Spark Plan
- Ngày cập nhật: 28/07/2026
- Trạng thái: Giai đoạn 1 và một phần Giai đoạn 2 đã hoàn thành
- Nguyên tắc: Chẩn đoán đúng nguyên nhân trước khi sửa, không viết lại Worker khi chưa cần thiết

## 2. Mục tiêu

1. Khôi phục khả năng gửi và nhận Messenger ổn định.
2. Đảm bảo Admin và giáo viên được phân công có thể gửi tin đúng phạm vi.
3. Không làm lộ Page Access Token, App Secret hoặc Firebase Service Account.
4. Không nâng Firebase từ Spark lên Blaze.
5. Không bổ sung server, VPS hoặc dịch vụ trả phí nếu chưa có nhu cầu thực tế.
6. Giữ nguyên Firestore schema và hợp đồng API frontend khi có thể.
7. Có phương án kiểm thử, theo dõi và quay lui rõ ràng.

## 3. Kiến trúc mục tiêu

```text
Facebook Messenger
        |
        | Webhook
        v
Cloudflare Messenger Worker
        |
        | Firestore REST API
        v
Firebase Firestore
        ^
        |
        | Firebase Client SDK
        |
EduMatrix Web Client
        |
        | Firebase ID Token
        v
Cloudflare Messenger Worker
        |
        | Meta Graph API
        v
Facebook Messenger
```

### Trách nhiệm của từng thành phần

#### EduMatrix Web Client

- Hiển thị hội thoại.
- Gửi Firebase ID Token cho Worker.
- Không lưu hoặc truy cập Meta secret.
- Hiển thị mã lỗi thân thiện cho Admin và giáo viên.

#### Cloudflare Messenger Worker

- Xác minh Firebase ID Token.
- Kiểm tra vai trò và phạm vi học sinh.
- Xác minh chữ ký webhook Meta.
- Gọi Meta Graph API.
- Ghi hội thoại và trạng thái gửi vào Firestore.
- Quản lý liên kết giữa phụ huynh và PSID.

#### Firestore

- Lưu kết nối Messenger.
- Lưu hội thoại và tin nhắn.
- Lưu outbox và trạng thái gửi.
- Áp dụng phân quyền cho client.

#### Meta Messenger Platform

- Cung cấp webhook sự kiện.
- Cung cấp Send API.
- Áp dụng quyền `pages_messaging` và chính sách cửa sổ phản hồi.

## 4. Hiện trạng đã khảo sát

Worker hiện tại nằm tại:

```text
workers/messenger/src/index.ts
```

Worker đang đảm nhiệm:

- Xác thực Firebase.
- Kiểm tra vai trò Admin và Teacher.
- Kiểm tra phạm vi học sinh.
- Tạo liên kết Messenger một lần.
- Nhận webhook.
- Lưu hội thoại chưa liên kết.
- Gửi Messenger.
- Đăng bài Fanpage.
- Ghi Firestore qua REST API.

Các endpoint hiện có:

```text
GET  /health
GET  /webhook
POST /webhook
POST /api/messenger/send
POST /api/messenger/referral
POST /api/messenger/link
POST /api/messenger/post
POST /api/meta/connect/start
GET  /api/meta/connect/callback
POST /api/meta/connect/status
POST /api/meta/connect/select
```

### 4.1. Luồng kết nối Page bằng OAuth (bổ sung 28/07/2026)

Bốn endpoint `/api/meta/connect/*` cho phép Admin tự kết nối Fanpage trong giao diện
EduMatrix, thay cho việc dán tay Page Access Token vào Cloudflare secret.

Cả bốn endpoint đều yêu cầu Firebase ID Token và role `admin`
(`requireAdminRequest`). Giáo viên không truy cập được.

Trình tự:

1. `POST /api/meta/connect/start` — tạo `state` ngẫu nhiên, lưu vào
   `messenger_oauth_states/{state}` với hạn 10 phút, trả về `authorizationUrl`.
2. Trình duyệt mở popup tới `https://www.facebook.com/{version}/dialog/oauth`.
3. `GET /api/meta/connect/callback` — đổi `code` lấy user access token, gọi
   `/me/accounts` để lấy danh sách Page mà tài khoản quản trị, mã hóa và lưu tạm.
4. `POST /api/meta/connect/status` — frontend hỏi trạng thái và danh sách Page.
5. `POST /api/meta/connect/select` — Admin chọn Page. Worker lưu Page Access Token
   đã mã hóa vào `messenger_private_config/page` và cập nhật
   `settings/integrations`.

Quyền yêu cầu trong dialog OAuth hiện tại:

```text
pages_show_list, pages_manage_metadata, pages_messaging, pages_read_engagement,
pages_manage_posts, page_utility_messaging
```

Sáu quyền này khớp đúng các tính năng kết nối Page, Messenger, đăng Page và
Utility trong hồ sơ App Review đang chuẩn bị.

Cấu hình phải khai trong Meta App Dashboard:

```text
Valid OAuth Redirect URIs:
https://edumatrix-messenger-production.edumatrix-vn.workers.dev/api/meta/connect/callback
```

Collection Firestore phát sinh từ luồng này:

- `messenger_oauth_states` — state tạm, hạn 10 phút, xóa dữ liệu Page sau khi dùng.
- `messenger_private_config/page` — Page Access Token mã hóa AES-GCM bằng khóa dẫn
  xuất từ `META_APP_SECRET`. Token không bao giờ trả về frontend.

**Việc bắt buộc sau khi bổ sung `page_utility_messaging` vào `scope` (28/07/2026):**

Page Access Token đã lưu trước đó không tự có thêm quyền. Admin phải **kết nối lại
Fanpage** trong Cài đặt → Tích hợp thì token mới mang quyền Utility.

`page_utility_messaging` hiện chưa được Meta duyệt cho môi trường live. Facebook chỉ
cấp quyền này cho tài khoản là Admin hoặc Tester của App và bỏ qua âm thầm với tài
khoản khác — bốn quyền còn lại vẫn được cấp bình thường, luồng kết nối không hỏng.

Kiểm tra sau khi kết nối lại: mở Meta App Dashboard → mục quyền của Page, xác nhận
`page_utility_messaging` xuất hiện trong danh sách đã cấp. Chỉ khi đó mới quay video
kiểm thử Utility và đặt `UTILITY_MESSAGING_ENABLED=true`.

Frontend đang gọi Worker qua:

```text
src/services/integrations/messenger.ts
```

## 5. Kết quả Giai đoạn 1

### 5.1. Kết quả kiểm tra local

- Worker có 23 bài kiểm thử.
- Kết quả: 23/23 test đạt.
- Production dry-run build thành công.
- Kích thước upload khoảng 92,54 KiB.
- Kích thước gzip khoảng 19,54 KiB.

### 5.2. Kết quả kiểm tra production

- Frontend đã cấu hình Worker URL.
- Frontend đã cấu hình Page username.
- Worker `/health` trả HTTP 200.
- Endpoint gửi tin không có Firebase token trả HTTP 401.
- Webhook dùng Verify Token sai trả HTTP 403.
- Cloudflare production có đủ năm secret:
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `META_APP_SECRET`
  - `META_PAGE_ACCESS_TOKEN`
  - `META_WEBHOOK_VERIFY_TOKEN`

### 5.3. Sai lệch được phát hiện

Deployment production cũ sử dụng:

```text
ALLOWED_ORIGIN = "*"
```

Trong khi cấu hình production trong repository yêu cầu:

```text
ALLOWED_ORIGIN = "https://edumatrix-vn-576b1.web.app"
```

Điều này chứng minh Worker production đã bị lệch so với cấu hình đang quản lý trong codebase.

**Cập nhật 28/07/2026:** cấu hình production hiện tại đã có hai origin, không còn một:

```text
ALLOWED_ORIGIN = "https://edumatrix-vn-576b1.web.app,https://edumatrix.id.vn"
```

Worker tách chuỗi theo dấu phẩy và chỉ trả về origin khớp với header `Origin` của
request (`allowedOrigin`). Domain ngoài danh sách nhận origin đầu tiên, tức bị CORS chặn.

## 6. Kết quả Giai đoạn 2 đã thực hiện

Đã deploy lại Worker bằng đúng cấu hình production trong repository.

### Deployment mới

```text
Version ID: 6da968f8-436d-4444-99af-5ecdf4e947dd
```

### Version dùng để rollback

```text
Version ID: 57b9eea8-41b2-4eef-809c-9034eb134c2f
```

### Kết quả sau deploy

- `/health` hoạt động.
- 23/23 test đạt.
- Production build đạt.
- Đủ năm secret.
- `ALLOWED_ORIGIN` đã được giới hạn về domain EduMatrix production.
- Domain lạ không còn nhận quyền CORS dạng `*`.
- Request không xác thực bị chặn.
- Verify Token sai bị chặn.
- Không thay đổi Firestore schema.
- Không thay đổi giá trị secret.
- Không nâng Firebase lên Blaze.

## 7. Phân tích lỗi Road Teacher

> **Cập nhật 28/07/2026 — cách lấy Page Access Token đã thay đổi.**
>
> Worker không còn đọc thẳng `META_PAGE_ACCESS_TOKEN`. Hàm `configuredPageAccess`
> lấy token theo thứ tự:
>
> 1. cache trong bộ nhớ Worker, hạn 5 phút;
> 2. `messenger_private_config/page` — token do Admin kết nối qua OAuth, đã mã hóa;
> 3. secret `META_PAGE_ACCESS_TOKEN` — chỉ dùng khi hai bước trên không có dữ liệu.
>
> Hệ quả khi chẩn đoán lỗi `190`: phải xác định token đang dùng đến từ nguồn nào.
> Nếu Admin đã kết nối Page bằng OAuth thì cập nhật secret Cloudflare **không có tác
> dụng** — phải kết nối lại Page trong giao diện EduMatrix. Log
> `dynamic_page_config_unavailable` cho biết Worker đã rơi về secret.

Worker sử dụng chung một Page Access Token để gửi tin cho mọi nhân viên EduMatrix.

Vì vậy, quyền quản trị Facebook Page của Road Teacher không quyết định trực tiếp việc gửi tin từ EduMatrix.

Worker kiểm tra ba điều kiện:

1. Tài khoản EduMatrix có role `teacher`.
2. Tài khoản EduMatrix có status `active`.
3. UID giáo viên tồn tại trong `student.teacherIds`.

Nếu Admin gửi được nhưng Road Teacher không gửi được cùng một người nhận, các nguyên nhân ưu tiên kiểm tra là:

| Mã lỗi hoặc hiện tượng | Nguyên nhân dự kiến |
|---|---|
| `staff_required` | Role hoặc trạng thái tài khoản EduMatrix không hợp lệ |
| `student_scope_denied` | UID Road Teacher chưa được đồng bộ vào học sinh |
| `no_recipient` | Phụ huynh chưa liên kết Messenger |
| Meta code `190` | Page Access Token không hợp lệ hoặc hết hạn |
| Meta từ chối ngoài 24 giờ | Tin nhắn không phù hợp cửa sổ phản hồi |
| HTTP 500 với lỗi service auth | Firebase Service Account có vấn đề |

## 8. Công việc còn lại của Giai đoạn 2

### 8.1. Smoke test Road Teacher

1. Đăng nhập EduMatrix bằng Road Teacher.
2. Mở module Chat.
3. Chọn học sinh thuộc lớp Road Teacher đang phụ trách.
4. Gửi một tin thử trong cửa sổ phản hồi Messenger.
5. Ghi nhận:
   - HTTP status;
   - mã lỗi Worker;
   - trạng thái Meta;
   - log Cloudflare.

### 8.2. Nhánh sửa theo kết quả

#### Nếu lỗi `student_scope_denied`

- Kiểm tra UID Road Teacher trong `users`.
- Kiểm tra `users/{uid}.role`.
- Kiểm tra `users/{uid}.status`.
- Kiểm tra `classes/{classId}.teacherIds`.
- Kiểm tra `students/{studentId}.teacherIds`.
- Chạy lại luồng cập nhật phân công lớp bằng Admin để đồng bộ học sinh.
- Không thay đổi quyền Facebook.

#### Nếu lỗi `staff_required`

- Sửa role về `teacher` nếu tài khoản đang dùng sai role.
- Sửa status về `active` nếu tài khoản đang bị vô hiệu hóa ngoài ý muốn.
- Đăng xuất và đăng nhập lại để làm mới Firebase ID Token.

#### Nếu lỗi Meta code `190`

- Tạo Page Access Token mới từ đúng Meta App và Page.
- Kiểm tra quyền `pages_messaging`.
- Cập nhật Cloudflare secret `META_PAGE_ACCESS_TOKEN`.
- Không đưa token vào frontend hoặc repository.

#### Nếu lỗi webhook

- Kiểm tra Callback URL.
- Kiểm tra Verify Token.
- Kiểm tra `META_APP_SECRET`.
- Kiểm tra Page subscription:
  - `messages`
  - `messaging_postbacks`
  - `messaging_referrals`

#### Nếu lỗi cửa sổ 24 giờ

- Yêu cầu phụ huynh nhắn lại cho Page.
- Chỉ sử dụng Message Tag được Meta cho phép.
- Không sử dụng Message Tag tùy ý để vượt chính sách.

## 9. Giai đoạn 3: Gia cố Worker có điều kiện

Chỉ triển khai khi Giai đoạn 2 chứng minh Worker còn lỗi kiến trúc hoặc vận hành lặp lại.

### 9.1. Các thay đổi dự kiến

1. Cache Firebase public certificates theo thời hạn HTTP.
2. Cache Firebase service access token đến gần thời điểm hết hạn.
3. Gửi Page Access Token bằng Authorization header.
4. Giới hạn Message Tag theo danh sách được chấp thuận.
5. Chuẩn hóa log không chứa secret hoặc toàn bộ PSID.
6. Giữ Meta message ID làm ID Firestore để chống ghi trùng.
7. Thêm version vào `/health`.
8. Giữ nguyên endpoint frontend hiện tại.

### 9.2. Không thực hiện trong bản đầu

- Không thêm Cloudflare Queue.
- Không thêm Durable Objects.
- Không thêm KV.
- Không thêm Pipedream hoặc Make.
- Không thêm Firebase Functions.
- Không nâng Firebase Blaze.
- Không refactor chức năng đăng Fanpage trong cùng đợt.

## 10. Kế hoạch kiểm thử

### Unit test

- Admin gửi thành công.
- Teacher gửi học sinh được phân công.
- Teacher bị chặn với học sinh ngoài phạm vi.
- Firebase token thiếu hoặc sai.
- Meta token lỗi code `190`.
- Webhook signature sai.
- Webhook message ID trùng.
- Referral nonce hết hạn.
- Referral nonce đã được sử dụng.
- CORS domain production.
- CORS domain không hợp lệ.
- Không lộ secret trong response và log.

### Integration test

- Firebase ID Token thật.
- Firestore REST đọc và ghi thành công.
- Webhook verification thành công.
- Tin inbound tạo đúng thread và message.
- Tin outbound tạo đúng outbox.
- Phụ huynh chưa liên kết.
- Phụ huynh có nhiều học sinh.
- Học sinh có nhiều phụ huynh.

### Smoke test theo vai trò

| Tình huống | Kết quả mong đợi |
|---|---|
| Admin gửi cho học sinh đã liên kết | Thành công |
| Road Teacher gửi học sinh thuộc lớp | Thành công |
| Road Teacher gửi học sinh lớp khác | Bị từ chối rõ ràng |
| Phụ huynh gửi Page | EduMatrix nhận được |
| Facebook chưa liên kết gửi Page | Tạo hội thoại chưa liên kết |
| Token Meta sai | Hiển thị lỗi token |
| Ngoài cửa sổ phản hồi | Bị chặn hoặc dùng tag hợp lệ |

## 11. Kế hoạch triển khai

1. Chạy toàn bộ test Worker.
2. Chạy production dry-run.
3. Ghi lại Version ID hiện tại.
4. Deploy Worker production.
5. Kiểm tra `/health`.
6. Kiểm tra CORS.
7. Kiểm tra webhook verification.
8. Smoke test Admin.
9. Smoke test Road Teacher.
10. Smoke test inbound từ Messenger.
11. Theo dõi Cloudflare log.
12. Chỉ đóng sự cố khi hai chiều gửi và nhận đều đạt.

## 12. Kế hoạch rollback

Nếu deployment mới gặp lỗi:

1. Rollback về version:

```text
57b9eea8-41b2-4eef-809c-9034eb134c2f
```

2. Kiểm tra lại `/health`.
3. Khôi phục Callback URL cũ nếu đã thay đổi.
4. Khôi phục Worker URL frontend nếu đã thay đổi.
5. Không xóa Firestore data vì schema không thay đổi.
6. Giữ log lỗi để phân tích trước lần deploy tiếp theo.

## 13. Tiêu chí nghiệm thu

Hạng mục được xem là hoàn thành khi:

- Admin gửi Messenger thành công.
- Road Teacher gửi được cho học sinh thuộc phạm vi.
- Teacher ngoài phạm vi vẫn bị chặn.
- Phụ huynh gửi tin và EduMatrix nhận được.
- Tin inbound không bị tạo trùng.
- Tin outbound có trạng thái rõ ràng.
- Webhook Meta xác minh thành công.
- Token và secret không xuất hiện trong frontend, log hoặc repository.
- CORS chỉ cho phép domain được cấu hình.
- Không nâng Firebase Blaze.
- Toàn bộ test Worker đạt.
- Production build đạt.
- Có Version ID rollback đã kiểm tra.

## 14. Trạng thái thực hiện

| Hạng mục | Trạng thái |
|---|---|
| Khảo sát code Worker | Hoàn thành |
| Kiểm tra test local | Hoàn thành |
| Kiểm tra production dry-run | Hoàn thành |
| Kiểm tra Worker health | Hoàn thành |
| Kiểm tra danh sách secret | Hoàn thành |
| Phát hiện cấu hình CORS lệch | Hoàn thành |
| Deploy lại cấu hình production | Hoàn thành |
| Kiểm tra sau deploy | Hoàn thành |
| Smoke test Road Teacher | Chờ thực hiện |
| Xác định lỗi phân quyền cụ thể | Chờ smoke test |
| Kiểm tra gửi và nhận hai chiều | Chờ thực hiện |
| Đợt 1: Authorization header và Message Tag allowlist | Hoàn thành local |
| Đợt 2: Firebase cache và webhook dedupe | Hoàn thành local |
| Đợt 3: Health version, log an toàn và mã lỗi ổn định | Hoàn thành local |
| Đợt 4: Mở rộng kiểm thử Worker và frontend | Hoàn thành local |
| Kiểm thử Worker sau nâng cấp | 33/33 test đạt |
| Kiểm thử frontend | 81/81 test đạt |
| Deploy nâng cấp lên production | Hoàn thành |

## 15. Quyết định hiện tại

Đã triển khai local bốn đợt gia cố Worker: bảo mật Page Access Token, Message Tag theo allowlist, cache Firebase, chống xử lý lặp webhook, Cloudflare Version Metadata trong `/health`, log có cấu trúc, mã lỗi công khai ổn định và kiểm thử hồi quy.

Đã deploy Worker production với Version ID `6da968f8-436d-4444-99af-5ecdf4e947dd`. Bước tiếp theo là smoke test hai chiều theo vai trò trước khi deploy frontend.
