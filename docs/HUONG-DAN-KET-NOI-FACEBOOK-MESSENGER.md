# Hướng dẫn hoàn chỉnh kết nối Facebook Messenger và kích hoạt Chat

> Dự án: EduMatrix VN  
> Phạm vi: Facebook Page, Meta App, Page Access Token, Firebase Service Account, Cloudflare Worker, webhook HTTPS, cấu hình frontend và kiểm thử Chat.  
> Thực hiện tuần tự từ Bước 1 đến Bước 8; không chuyển sang Google Drive trước khi checkpoint Chat đạt.

## Nguyên tắc bảo mật

- `Facebook Page ID`, `Page username` và `Meta App ID` là định danh công khai, có thể ghi lại để cấu hình.
- `Meta App Secret` và `Page Access Token` là bí mật.
- Không gửi App Secret hoặc Page Access Token qua chat, email hoặc ảnh chụp màn hình.
- Không đưa secret vào `.env`, `.env.local`, `.env.real` của frontend.
- Không nhập secret tại màn hình **EduMatrix → Cài đặt → Tích hợp**.
- Không commit secret vào Git.
- Sau này, secret chỉ được nhập trực tiếp vào **Cloudflare Worker Secrets**.

---

## Bước 1 — Chuẩn bị Facebook Page và Meta App

### 1.1. Kiểm tra Facebook Page

Cần sử dụng một Facebook Page của trung tâm, không sử dụng trang Facebook cá nhân.

1. Mở Facebook Page.
2. Chọn **Settings & privacy → Settings**.
3. Mở **Page setup → Page access**. Tùy giao diện, mục này có thể mang tên **New Pages Experience → Page access**.
4. Trong **People with Facebook access**, kiểm tra tài khoản đang thao tác có quyền **Full control**.

Nếu tài khoản chỉ có quyền tạo nội dung hoặc xử lý tin nhắn, việc kết nối Page với Meta App có thể bị từ chối.

### 1.2. Lấy Facebook Page ID

1. Mở Facebook Page.
2. Vào **About**, **Page transparency** hoặc **Settings → Page setup**.
3. Tìm trường **Page ID**.
4. Ghi lại chuỗi số, ví dụ:

```text
123456789012345
```

Sau này Page ID được nhập tại:

```text
EduMatrix → Cài đặt → Tích hợp → Facebook Page ID
```

Page ID không phải access token.

### 1.3. Xác định Page username

Mở địa chỉ Facebook Page, ví dụ:

```text
https://www.facebook.com/edumatrix.vn
```

Trong ví dụ trên, Page username là:

```text
edumatrix.vn
```

Mở thử đường dẫn Messenger:

```text
https://m.me/<PAGE_USERNAME>
```

Kết quả đúng: trình duyệt mở cuộc hội thoại Messenger với Page của trung tâm.

Sau này frontend sử dụng giá trị này:

```dotenv
VITE_MESSENGER_PAGE_USERNAME=<PAGE_USERNAME>
```

Chỉ nhập username, không nhập toàn bộ URL Facebook hoặc URL `m.me`.

### 1.4. Đăng ký Meta for Developers

1. Mở [Meta for Developers](https://developers.facebook.com/).
2. Đăng nhập bằng tài khoản có **Full control** trên Page.
3. Nếu được yêu cầu, chọn **Get Started**.
4. Xác nhận email và số điện thoại.
5. Hoàn thành đăng ký tài khoản nhà phát triển.
6. Bật xác thực hai lớp nếu Meta yêu cầu.

### 1.5. Tạo Meta App

1. Mở [Meta App Dashboard](https://developers.facebook.com/apps/).
2. Chọn **Create App**.
3. Nếu Meta hỏi trường hợp sử dụng, chọn lựa chọn liên quan đến **Messenger**, **Business messaging** hoặc **Manage messaging**. Nếu không thấy, chọn **Other**.
4. Nếu Meta hỏi loại ứng dụng, chọn **Business**.
5. Nhập thông tin:
   - **App name:** `EduMatrix VN`.
   - **App contact email:** email quản trị đang sử dụng.
   - **Business portfolio:** chọn doanh nghiệp sở hữu Facebook Page nếu đã có.
6. Chọn **Create App** và xác nhận mật khẩu nếu được yêu cầu.

### 1.6. Thêm Messenger vào Meta App

1. Trong App Dashboard, tìm **Add products to your app** hoặc **Add use cases**.
2. Tìm **Messenger** hoặc **Messenger from Meta**.
3. Chọn **Set up** hoặc **Customize**.
4. Mở **Messenger API Settings**.

Dấu hiệu đã hoàn thành:

- Danh sách bên trái hiển thị **Messenger from Meta**.
- Trang chính có tiêu đề **Thiết lập API Messenger**.
- Có các phần **Đặt cấu hình webhook** và **Tạo mã truy cập**.

Ở thời điểm này:

- Không điền **URL gọi lại**.
- Không điền **Xác minh mã**.
- Không bật **Đính kèm chứng thực máy khách vào yêu cầu Webhook**.
- Không bấm **Xác minh và lưu**.

Meta không thể gọi webhook qua `localhost`. URL webhook chỉ được cấu hình sau khi Cloudflare Worker đã có URL HTTPS công khai.

### 1.7. Ghi lại App ID

1. Vào **App Settings → Basic**.
2. Ghi lại **App ID**.
3. Kiểm tra tên App và Business portfolio.

Không sao chép hoặc gửi **App Secret**. App Secret sẽ chỉ được dùng ở bước cấu hình Cloudflare Worker.

### 1.8. Giữ App ở Development

Trong giai đoạn cấu hình và kiểm thử, giữ App ở trạng thái:

```text
Development
```

Ở Development mode, việc nhắn tin thử thường chỉ áp dụng cho tài khoản có vai trò trong App như Admin, Developer hoặc Tester. Chưa chuyển App sang Live trước khi Worker và webhook hoạt động ổn định.

### Checkpoint Bước 1

```text
[ ] Có Facebook Page
[ ] Tài khoản có Full control trên Page
[ ] Đã ghi lại Page ID
[ ] Đã ghi lại Page username
[ ] Link https://m.me/<PAGE_USERNAME> mở đúng Page
[ ] Đã tạo Meta App
[ ] Đã thêm Messenger from Meta
[ ] Trang Thiết lập API Messenger đã xuất hiện
[ ] Đã ghi lại App ID
[ ] App vẫn đang ở Development mode
```

---

## Bước 2 — Kết nối Facebook Page và tạo Page Access Token

### Kết quả cần đạt

Sau Bước 2, cần có:

1. Facebook Page đã kết nối với Meta App.
2. Một Page Access Token dành cho đúng Page.
3. Token có các quyền cần thiết để tiếp tục kiểm thử Messenger.
4. Token được giữ bí mật và chưa đưa vào source code.

### 2.1. Mở phần tạo mã truy cập

1. Trong Meta App Dashboard, chọn **Messenger from Meta**.
2. Chọn **Cài đặt API Messenger**.
3. Cuộn xuống phần **2. Tạo mã truy cập**.
4. Mở rộng phần này nếu nó đang thu gọn.

Không quay lại điền phần webhook ở phía trên.

### 2.2. Kết nối Facebook Page

Trong phần **Tạo mã truy cập**:

1. Chọn **Kết nối Trang**, **Add or remove Pages** hoặc nút có nội dung tương đương.
2. Meta có thể mở cửa sổ đăng nhập/xác nhận quyền. Chọn **Continue as ...** bằng đúng tài khoản có Full control.
3. Chọn đúng Facebook Page của trung tâm.
4. Không chọn nhầm Page cá nhân hoặc Page thử nghiệm khác.
5. Khi Meta hiển thị danh sách quyền, giữ các quyền cần thiết cho Page và Messenger.
6. Chọn **Continue**, **Save** hoặc **Done** để hoàn tất.

Nếu không thấy Page trong danh sách:

- Kiểm tra tài khoản đang đăng nhập có Full control trên Page.
- Kiểm tra Page có thuộc đúng Business portfolio không.
- Thử đăng xuất các tài khoản Facebook khác trong trình duyệt.
- Kiểm tra Meta App và Page có cùng Business portfolio hoặc đã được chia sẻ quyền phù hợp.

### 2.3. Kiểm tra Page đã xuất hiện

Quay lại **Cài đặt API Messenger → Tạo mã truy cập**.

Kết quả đúng:

- Tên Facebook Page xuất hiện trong danh sách.
- Page ID hiển thị đúng với Page ID đã ghi ở Bước 1.
- Có nút **Tạo mã**, **Generate token** hoặc **Generate access token**.

Nếu Page ID không khớp, dừng lại và gỡ Page vừa kết nối; không tạo token cho nhầm Page.

### 2.4. Tạo Page Access Token cho giai đoạn thử nghiệm

1. Tại dòng của đúng Facebook Page, chọn **Tạo mã** hoặc **Generate token**.
2. Meta có thể yêu cầu đăng nhập lại hoặc xác nhận quyền; hoàn tất yêu cầu đó.
3. Đọc cảnh báo của Meta và xác nhận tạo token.
4. Sao chép Page Access Token đúng một lần.
5. Lưu token tạm thời trong trình quản lý mật khẩu an toàn.

Tuyệt đối không lưu token vào:

```text
.env
.env.local
.env.real
wrangler.jsonc
settings/integrations
tài liệu Markdown
Git commit
ảnh chụp màn hình
```

Không dán token vào tài liệu này. Chỉ ghi trạng thái:

```text
Page Access Token: Đã tạo và lưu an toàn
```

Token tạo trực tiếp từ giao diện phù hợp để hoàn tất luồng thử nghiệm ban đầu. Trước khi vận hành production lâu dài, cần chuẩn hóa token dài hạn/System User token theo cấu hình Business của đơn vị.

### 2.5. Kiểm tra các quyền cần thiết

Các chức năng của dự án liên quan đến các quyền sau:

| Chức năng | Quyền Meta dự kiến |
|---|---|
| Gửi và nhận Messenger | `pages_messaging` |
| Quản lý subscription webhook Page | `pages_manage_metadata` |
| Chọn/liệt kê Page | `pages_show_list` |
| Đăng bài lên Page | `pages_manage_posts` |
| Đọc tương tác Page | `pages_read_engagement` |

Trong giai đoạn đầu, mục tiêu chính là Messenger Chat. Các quyền đăng bài Page có thể cần Advanced Access/App Review riêng và không nên được xem là điều kiện để hoàn thành kiểm thử Chat cơ bản.

### 2.6. Kiểm tra token bằng Access Token Debugger

1. Mở [Meta Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/).
2. Dán Page Access Token trực tiếp vào công cụ của Meta.
3. Chọn **Debug**.
4. Kiểm tra:
   - Token hợp lệ.
   - App ID đúng với Meta App `EduMatrix VN`.
   - User/Page ID tương ứng đúng Page.
   - Token chưa hết hạn hoặc thời hạn phù hợp với loại token đã tạo.
   - Danh sách quyền có các quyền Messenger/Page cần thiết.
5. Không chụp ảnh màn hình có chứa toàn bộ token.

Nếu debugger báo token không hợp lệ hoặc thuộc sai App/Page, hủy token đó và tạo lại từ đúng Meta App.

### 2.7. Không điền token vào frontend

Sau khi tạo token, chưa sửa file frontend. Dự án yêu cầu token được đặt dưới tên:

```text
META_PAGE_ACCESS_TOKEN
```

Nhưng biến này chỉ tồn tại trong:

- `.dev.vars` khi chạy Worker local; hoặc
- Cloudflare Worker Secrets khi deploy Worker.

Frontend chỉ nhận URL công khai của Worker:

```dotenv
VITE_MESSENGER_WORKER_URL=https://<worker-domain>
```

### Checkpoint Bước 2

```text
[ ] Đúng Facebook Page đã được kết nối với Meta App
[ ] Page ID trong Meta khớp Page ID đã ghi ở Bước 1
[ ] Đã tạo Page Access Token
[ ] Token được lưu trong trình quản lý mật khẩu
[ ] Token không nằm trong frontend hoặc repository
[ ] Access Token Debugger báo token hợp lệ
[ ] App ID của token đúng Meta App EduMatrix VN
[ ] Token thuộc đúng Facebook Page
[ ] Đã kiểm tra danh sách quyền
[ ] App vẫn đang ở Development mode
```

### Thông tin được phép dùng để báo cáo checkpoint

```text
Page đã kết nối: Có/Không
Page ID khớp: Có/Không
Token đã tạo: Có/Không
Debugger báo hợp lệ: Có/Không
App ID khớp: Có/Không
Quyền pages_messaging xuất hiện: Có/Không
Quyền pages_manage_metadata xuất hiện: Có/Không
```

Không cung cấp giá trị Page Access Token hoặc App Secret.

---

## Bước tiếp theo sau khi Bước 2 thành công

Sau khi toàn bộ checkpoint Bước 2 đạt, tiếp tục **Bước 3 — tạo Firebase Service Account và chuẩn bị năm secret cho Cloudflare Worker**:

```text
META_PAGE_ACCESS_TOKEN
META_APP_SECRET
META_WEBHOOK_VERIFY_TOKEN
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Chưa cấu hình webhook trước khi Worker được deploy và endpoint `/health` trả về `{"ok":true}`.

---

## Bước 3 — Tạo Firebase Service Account

### 3.1. Vì sao Worker cần Service Account?

Frontend gửi Firebase ID token của Admin/Teacher cho Worker. Worker xác minh token đó và dùng Service Account để đọc/ghi các collection nội bộ như:

```text
messenger_link_nonces
messenger_connections
messenger_psid_links
chat_threads
message_outbox
```

Service Account là secret cấp cao. Không đặt file JSON của nó trong thư mục dự án.

### 3.2. Tải khóa từ Firebase Console

1. Mở [Firebase Console](https://console.firebase.google.com/).
2. Chọn project **edumatrix-vn-576b1**.
3. Chọn biểu tượng bánh răng → **Project settings**.
4. Mở tab **Service accounts**.
5. Chọn **Firebase Admin SDK**.
6. Chọn **Generate new private key**.
7. Xác nhận tải file JSON.
8. Chuyển file JSON ra một thư mục bí mật ngoài `C:\Users\Admin\Documents\Edumatrix_VN`.

Không đổi tên file thành `.env` và không copy file vào `workers/messenger`.

### 3.3. Lấy hai giá trị Worker cần

Mở JSON bằng trình soạn thảo văn bản. Chỉ cần hai trường:

```json
{
  "client_email": "firebase-adminsdk-...@edumatrix-vn-576b1.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

Ánh xạ:

```text
FIREBASE_CLIENT_EMAIL = giá trị client_email
FIREBASE_PRIVATE_KEY  = giá trị private_key
```

Khi nhập private key vào Worker, giữ `\n` dưới dạng hai ký tự gạch chéo ngược và chữ `n`, để toàn bộ secret nằm trên một dòng. Mã Worker sẽ chuyển chúng thành xuống dòng thật khi sử dụng.

### Checkpoint Bước 3

```text
[ ] File JSON được tải từ đúng project edumatrix-vn-576b1
[ ] File nằm ngoài repository
[ ] Đã xác định FIREBASE_CLIENT_EMAIL
[ ] Đã xác định FIREBASE_PRIVATE_KEY
[ ] Không gửi hai giá trị này qua chat
```

---

## Bước 4 — Chuẩn bị và deploy Cloudflare Worker

Worker là lớp duy nhất giữ Meta token, Meta App Secret và Firebase private key.

### 4.1. Chuẩn bị năm secret

Trước khi mở terminal, chuẩn bị trong trình quản lý mật khẩu:

| Tên secret | Nguồn |
|---|---|
| `META_PAGE_ACCESS_TOKEN` | Page Access Token ở Bước 2 |
| `META_APP_SECRET` | Meta App → App Settings → Basic |
| `META_WEBHOOK_VERIFY_TOKEN` | Chuỗi ngẫu nhiên tự tạo |
| `FIREBASE_CLIENT_EMAIL` | `client_email` ở Bước 3 |
| `FIREBASE_PRIVATE_KEY` | `private_key` ở Bước 3 |

Tạo Verify Token ngẫu nhiên trong PowerShell:

```powershell
$verifyToken = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
$verifyToken
```

Lưu kết quả vào trình quản lý mật khẩu với tên `META_WEBHOOK_VERIFY_TOKEN`. Đây không phải Meta App Secret và không được dùng chung với mật khẩu khác.

### 4.2. Chọn môi trường triển khai

Dự án có hai cấu hình Worker:

| Mục đích | Lệnh deploy | Origin được phép |
|---|---|---|
| Thử với frontend local | `npm run deploy` | `http://localhost:5173` |
| Production | `npm run deploy:prod` | `https://edumatrix-vn-576b1.web.app` |

Khuyến nghị hiện tại: dùng **Worker thử nghiệm + frontend local** trước. Source hiện có nhiều thay đổi chưa commit và bản Hosting production đang cũ; không deploy frontend production cho đến khi đã test, commit và xác nhận phạm vi phát hành.

### 4.3. Cài đặt và đăng nhập Cloudflare

Mở PowerShell:

```powershell
Set-Location C:\Users\Admin\Documents\Edumatrix_VN\workers\messenger
npm install
npx wrangler login
```

Trình duyệt sẽ mở trang Cloudflare. Đăng nhập, chọn đúng tài khoản và cho phép Wrangler. Kiểm tra:

```powershell
npx wrangler whoami
```

Kết quả đúng phải hiển thị tài khoản Cloudflare, không còn thông báo `You are not authenticated`.

### 4.4. Đặt secret cho Worker thử nghiệm

Chạy từng lệnh. Wrangler sẽ yêu cầu nhập secret; dán giá trị tại prompt, không viết giá trị trực tiếp trong câu lệnh:

```powershell
npx wrangler secret put META_PAGE_ACCESS_TOKEN
npx wrangler secret put META_APP_SECRET
npx wrangler secret put META_WEBHOOK_VERIFY_TOKEN
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
```

Với `FIREBASE_PRIVATE_KEY`, dán phiên bản một dòng còn các ký tự `\n`.

Không dùng dạng sau vì secret sẽ xuất hiện trong lịch sử terminal:

```powershell
# KHÔNG LÀM
npx wrangler secret put META_APP_SECRET --text "gia-tri-secret"
```

### 4.5. Chạy test và deploy Worker thử nghiệm

```powershell
npm test
npm run build
npm run deploy
```

Sau deploy, Wrangler in ra URL tương tự:

```text
https://edumatrix-messenger.<cloudflare-subdomain>.workers.dev
```

Ghi lại URL này dưới tên `WORKER_URL`. Không thêm `/webhook` vào biến này.

### 4.6. Kiểm tra Worker

```powershell
curl.exe https://edumatrix-messenger.<cloudflare-subdomain>.workers.dev/health
```

Kết quả bắt buộc:

```json
{"ok":true}
```

Nếu `/health` không đạt, không cấu hình webhook Meta.

### 4.7. Phương án production sau khi thử nghiệm đạt

Khi sẵn sàng production, đặt lại năm secret cho đúng environment:

```powershell
npx wrangler secret put META_PAGE_ACCESS_TOKEN --env production
npx wrangler secret put META_APP_SECRET --env production
npx wrangler secret put META_WEBHOOK_VERIFY_TOKEN --env production
npx wrangler secret put FIREBASE_CLIENT_EMAIL --env production
npx wrangler secret put FIREBASE_PRIVATE_KEY --env production
npm run build:prod
npm run deploy:prod
```

Worker production thường có URL/tên riêng, ví dụ `edumatrix-messenger-production`. Không dùng nhầm URL Worker local/test trong build production.

### Checkpoint Bước 4

```text
[ ] wrangler whoami hiển thị đúng tài khoản
[ ] Đã đặt đủ 5 Worker secrets
[ ] npm test PASS
[ ] npm run build hoặc npm run build:prod PASS
[ ] Worker deploy thành công
[ ] Đã ghi lại WORKER_URL
[ ] GET <WORKER_URL>/health trả {"ok":true}
```

---

## Bước 5 — Cấu hình Meta Webhook HTTPS

### 5.1. Kiểm tra handshake trước trên máy

Dùng đúng Verify Token đã đặt vào Worker:

```powershell
curl.exe "<WORKER_URL>/webhook?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=edumatrix-ok"
```

Kết quả đúng:

```text
edumatrix-ok
```

Nếu nhận `Forbidden`, Verify Token trong Worker không khớp. Đặt lại secret rồi deploy lại trước khi tiếp tục.

### 5.2. Điền webhook trong Meta

Trở lại màn hình **Messenger from Meta → Cài đặt API Messenger → 1. Đặt cấu hình webhook**.

Điền:

```text
URL gọi lại: <WORKER_URL>/webhook
Xác minh mã: <META_WEBHOOK_VERIFY_TOKEN>
```

Ví dụ:

```text
https://edumatrix-messenger.example.workers.dev/webhook
```

Lưu ý:

- URL phải bắt đầu bằng `https://`.
- URL phải kết thúc chính xác bằng `/webhook`.
- Không thêm Verify Token vào query string.
- Giữ **Đính kèm chứng thực máy khách vào yêu cầu Webhook** ở trạng thái tắt.
- Chọn **Xác minh và lưu**.

Kết quả đúng: Meta báo webhook đã được xác minh, không báo callback URL hoặc Verify Token không hợp lệ.

### 5.3. Đăng ký các trường webhook

Trong phần Webhooks hoặc subscription của Page:

1. Chọn đối tượng **Page** nếu Meta hỏi loại đối tượng.
2. Chọn đúng Facebook Page đã kết nối ở Bước 2.
3. Đăng ký tối thiểu các field:

```text
messages
messaging_postbacks
messaging_referrals
```

4. Chọn **Subscribe**, **Save** hoặc **Đăng ký**.
5. Kiểm tra Page hiển thị trạng thái đã subscribed.

`messaging_referrals` là field bắt buộc cho cơ chế liên kết phụ huynh bằng link `m.me?...ref=<nonce>` của EduMatrix.

### 5.4. Kiểm tra App Secret nếu webhook POST lỗi

Meta ký webhook POST bằng App Secret. Worker kiểm tra header `X-Hub-Signature-256`. Nếu webhook GET verify được nhưng tin nhắn thật trả HTTP 401:

1. Vào **Meta App → App Settings → Basic**.
2. Xác nhận `META_APP_SECRET` trong Worker thuộc đúng App.
3. Đặt lại secret:

```powershell
npx wrangler secret put META_APP_SECRET
npm run deploy
```

Không tắt phần xác minh chữ ký trong mã nguồn.

### Checkpoint Bước 5

```text
[ ] Kiểm tra handshake bằng curl trả edumatrix-ok
[ ] Meta Verify and Save thành công
[ ] Callback URL kết thúc bằng /webhook
[ ] Đúng Facebook Page đã subscribe webhook
[ ] Đã subscribe messages
[ ] Đã subscribe messaging_postbacks
[ ] Đã subscribe messaging_referrals
```

---

## Bước 6 — Cấu hình frontend và kích hoạt Chat

### 6.1. Cấu hình frontend local

Mở file `.env.local` tại thư mục gốc dự án và thêm:

```dotenv
VITE_MESSENGER_WORKER_URL=<WORKER_URL>
VITE_MESSENGER_PAGE_USERNAME=<PAGE_USERNAME>
```

Ví dụ:

```dotenv
VITE_MESSENGER_WORKER_URL=https://edumatrix-messenger.example.workers.dev
VITE_MESSENGER_PAGE_USERNAME=edumatrix.vn
```

Không có dấu `/` ở cuối Worker URL. Không thêm token hoặc App Secret.

Khởi động lại Vite sau khi sửa env:

```powershell
Set-Location C:\Users\Admin\Documents\Edumatrix_VN
npm run dev
```

Vite chỉ đọc biến môi trường lúc khởi động nên reload trình duyệt đơn thuần có thể chưa đủ.

### 6.2. Lưu cấu hình công khai trong EduMatrix

1. Đăng nhập EduMatrix bằng tài khoản Admin.
2. Mở:

```text
http://localhost:5173/app/settings?section=integrations
```

3. Nhập:
   - **Facebook Page ID:** Page ID ở Bước 1.
   - **Webhook callback URL:** `<WORKER_URL>/webhook`.
4. Không nhập gì vào Google Drive ở giai đoạn này.
5. Chọn **Lưu cấu hình**.
6. Thẻ **Messenger Worker** phải chuyển sang trạng thái đã cấu hình và hiển thị Worker URL.

Các trường tại màn hình này đều là dữ liệu công khai. Không nhập token vào bất kỳ ô nào.

### 6.3. Kiểm tra module Chat đã bật

Mở:

```text
http://localhost:5173/app/chat
```

Kết quả mong đợi:

- Không còn cảnh báo thiếu `VITE_MESSENGER_WORKER_URL`.
- Có các tab **Hội thoại**, **Nhật ký gửi** và **Fanpage**.
- Nút tạo tin/link mời Messenger xuất hiện khi học sinh có tài khoản phụ huynh liên kết.

Nếu vẫn báo chưa cấu hình, dừng Vite, kiểm tra đúng tên biến rồi chạy `npm run dev` lại.

### 6.4. Cấu hình production frontend sau này

Khi phát hành production:

```dotenv
VITE_MESSENGER_WORKER_URL=https://<production-worker-url>
VITE_MESSENGER_PAGE_USERNAME=<PAGE_USERNAME>
```

Sau đó phải test/commit source trước khi build và deploy. Theo runbook của dự án, không deploy từ working tree chưa commit/tag:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build
npx firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Không thực hiện phần production này trong lúc chỉ đang thử API local.

### Checkpoint Bước 6

```text
[ ] .env.local có Worker URL và Page username
[ ] Đã khởi động lại Vite
[ ] Đã lưu Facebook Page ID trong Cài đặt → Tích hợp
[ ] Đã lưu webhook URL công khai
[ ] Thẻ Messenger Worker báo đã cấu hình
[ ] /app/chat không còn cảnh báo thiếu Worker
```

---

## Bước 7 — Liên kết phụ huynh và kiểm thử Chat thật

EduMatrix không gửi tin chỉ dựa vào Facebook Page ID. Hệ thống cần PSID của phụ huynh, được tạo an toàn khi phụ huynh mở link mời một lần và nhắn vào Page.

### 7.1. Chuẩn bị dữ liệu thử

Cần có:

1. Một tài khoản EduMatrix Admin hoặc Teacher đang hoạt động.
2. Một học sinh có `studentId` hợp lệ.
3. Một tài khoản phụ huynh role `viewer`, status `active`.
4. UID phụ huynh nằm trong quan hệ của học sinh (`parentUids`/`studentIds` theo dữ liệu hiện tại).
5. Nếu Meta App còn Development, tài khoản Facebook dùng để thử phải là Admin/Developer/Tester của App và đã chấp nhận lời mời vai trò nếu Meta yêu cầu.

### 7.2. Tạo link mời liên kết

1. Đăng nhập EduMatrix bằng Admin hoặc Teacher được phân công học sinh.
2. Mở **Chat**.
3. Chọn **Nhắn mới** hoặc học sinh cần liên kết.
4. Chọn phụ huynh.
5. Chọn **Copy link mời phụ huynh liên kết Messenger**.

Link có dạng:

```text
https://m.me/<PAGE_USERNAME>?ref=<ONE_TIME_NONCE>
```

Yêu cầu bảo mật:

- Link chỉ chứa nonce ngẫu nhiên, không chứa Firebase UID.
- Nonce hết hạn sau 24 giờ.
- Nonce chỉ sử dụng một lần.

### 7.3. Phụ huynh xác nhận liên kết

1. Mở link bằng tài khoản Facebook thử nghiệm.
2. Messenger mở đúng Page.
3. Chọn **Bắt đầu/Get Started** nếu xuất hiện.
4. Gửi một tin nhắn văn bản, ví dụ:

```text
Xin chào EduMatrix
```

Chỉ mở link mà không gửi tin có thể chưa tạo sự kiện referral cần thiết.

### 7.4. Kiểm tra dữ liệu inbound

Trong Firebase Console → Firestore Database, kiểm tra:

```text
messenger_link_nonces/{nonce}   status = used
messenger_connections/{uid}     status = active
messenger_psid_links/{psid}      status = active
chat_threads/{threadId}
chat_threads/{threadId}/messages/{messageId}
```

Không chỉnh tay PSID vào Firestore. Worker phải là thành phần tạo liên kết.

Quay lại `/app/chat`. Hội thoại và tin nhắn `Xin chào EduMatrix` phải xuất hiện ở tab **Hội thoại**.

### 7.5. Gửi phản hồi từ EduMatrix

1. Mở hội thoại vừa nhận.
2. Nhập tin nhắn ngắn, ví dụ:

```text
EduMatrix đã nhận được tin nhắn thử nghiệm.
```

3. Để trống Message Tag khi đang phản hồi trong cửa sổ 24 giờ.
4. Chọn **Gửi**.
5. Kiểm tra tài khoản Messenger phụ huynh nhận được tin.
6. Mở tab **Nhật ký gửi** và kiểm tra trạng thái `sent`.
7. Trong Firestore, kiểm tra `message_outbox` có bản ghi `status: sent`.

Không dùng `ACCOUNT_UPDATE` hoặc tag khác chỉ để vượt cửa sổ 24 giờ; message tag phải đúng trường hợp sử dụng và chính sách Meta.

### 7.6. Kiểm tra gửi/nhận lần hai

1. Từ Messenger phụ huynh, gửi thêm một tin khác.
2. Kiểm tra tin xuất hiện trong đúng thread EduMatrix.
3. Từ EduMatrix, gửi phản hồi lần hai.
4. Xác nhận không tạo connection trùng và nonce cũ không dùng lại được.

### Checkpoint hoàn thành kết nối Chat

```text
[ ] Worker /health hoạt động
[ ] Meta webhook đã verify và subscribe đủ field
[ ] Frontend Chat nhận Worker URL
[ ] Tạo được link m.me có nonce
[ ] Phụ huynh mở link và gửi tin
[ ] messenger_connections được Worker tạo
[ ] Tin inbound xuất hiện trong /app/chat
[ ] EduMatrix gửi phản hồi thành công
[ ] Messenger phụ huynh nhận phản hồi
[ ] message_outbox ghi status: sent
[ ] Không có secret trong frontend, Firestore công khai hoặc Git
```

Khi toàn bộ checkpoint này đạt, kết nối Facebook Messenger API và chức năng Chat được xem là thành công trong môi trường thử nghiệm.

---

## Bước 8 — Đưa Meta App và Worker lên production

Chỉ thực hiện sau khi Bước 7 đạt.

### 8.1. Chuẩn bị Meta App Live

1. Bổ sung **Privacy Policy URL**.
2. Bổ sung hướng dẫn hoặc URL **User Data Deletion**.
3. Kiểm tra App Domains và thông tin doanh nghiệp.
4. Vào **App Review → Permissions and Features**.
5. Xin quyền/Advanced Access cần thiết, tối thiểu xem xét `pages_messaging`; nếu đăng bài Page thì xem xét thêm `pages_manage_posts` và `pages_read_engagement`.
6. Chuẩn bị video/screencast và tài khoản test nếu Meta yêu cầu khi review.
7. Chỉ chuyển App sang **Live** sau khi các yêu cầu được chấp thuận và smoke test lại.

### 8.2. Production Worker

1. Đặt năm secret với `--env production` như mục 4.7.
2. Chạy `npm run build:prod`.
3. Chạy `npm run deploy:prod`.
4. Kiểm tra `<PRODUCTION_WORKER_URL>/health`.
5. Đổi webhook Meta sang `<PRODUCTION_WORKER_URL>/webhook` nếu trước đó dùng Worker thử nghiệm.
6. Verify lại và subscribe lại đúng Page nếu Meta yêu cầu.

### 8.3. Production frontend

1. Đặt `VITE_MESSENGER_WORKER_URL` thành production Worker URL.
2. Đặt đúng `VITE_MESSENGER_PAGE_USERNAME`.
3. Xác nhận Worker production có `ALLOWED_ORIGIN=https://edumatrix-vn-576b1.web.app`.
4. Chạy toàn bộ test và build.
5. Commit/tag phiên bản đã kiểm thử.
6. Deploy Firebase Hosting/Rules/Indexes.
7. Smoke test lại link mời, inbound, outbound và `message_outbox` trên production.

### 8.4. Token production

Token tạo trực tiếp ở Messenger Settings có thể phù hợp cho thử nghiệm nhưng cần theo dõi thời hạn. Với vận hành dài hạn, cấu hình System User token trong Meta Business nếu tài khoản/doanh nghiệp hỗ trợ, cấp đúng tài sản và quyền tối thiểu, sau đó cập nhật:

```powershell
npx wrangler secret put META_PAGE_ACCESS_TOKEN --env production
npm run deploy:prod
```

Nếu Worker trả lỗi Meta code `190`, kiểm tra token hết hạn hoặc bị thu hồi trước tiên.

---

## Bảng xử lý lỗi nhanh

| Hiện tượng | Nguyên nhân thường gặp | Cách kiểm tra |
|---|---|---|
| Meta không Verify and Save | URL không public HTTPS hoặc Verify Token sai | Gọi handshake bằng curl; kiểm tra `/webhook` |
| Handshake trả `Forbidden` | Verify Token không khớp Worker | Đặt lại `META_WEBHOOK_VERIFY_TOKEN` và deploy lại |
| Webhook POST trả 401 | `META_APP_SECRET` sai | Lấy App Secret từ đúng Meta App và cập nhật Worker secret |
| Worker `/health` lỗi | Worker chưa deploy hoặc URL sai | Xem output deploy và Cloudflare logs |
| Trình duyệt báo CORS | `ALLOWED_ORIGIN` không khớp frontend | Local dùng default Worker; production dùng `--env production` |
| Chat báo chưa cấu hình | Thiếu `VITE_MESSENGER_WORKER_URL` | Sửa `.env.local`, dừng và chạy lại Vite |
| Không tạo được link mời | Thiếu Page username/Worker URL hoặc quan hệ phụ huynh | Kiểm tra env và dữ liệu student/viewer |
| `no_recipient` | Phụ huynh chưa liên kết PSID | Tạo link mời, mở link và gửi tin vào Page |
| `service_auth_failed` | Sai Firebase email/private key | Đặt lại hai Firebase secrets từ đúng JSON |
| Meta code `190` | Token sai, hết hạn hoặc bị thu hồi | Kiểm tra Access Token Debugger, tạo/cập nhật token |
| Gửi ngoài 24 giờ thất bại | Không còn response window | Không lạm dụng tag; kiểm tra chính sách và quyền Meta |
| Development mode chỉ một số tài khoản dùng được | Tài khoản không có App role | Thêm Admin/Developer/Tester hoặc hoàn tất App Review/Live |

---

## Cổng chuyển sang hướng dẫn Google Drive

Chỉ bắt đầu cấu hình Google Drive khi các mục sau đều đạt:

```text
[ ] Nhận được tin Messenger vào EduMatrix Chat
[ ] Gửi được phản hồi từ EduMatrix tới Messenger
[ ] message_outbox có status: sent
[ ] Webhook không còn lỗi signature/permission
[ ] Không có secret bị đưa vào repository
```

Sau đó tạo tài liệu/hướng dẫn tiếp theo cho Google Drive theo đúng các biến hiện hành của dự án:

```text
VITE_GOOGLE_CLIENT_ID
VITE_GOOGLE_PICKER_API_KEY
VITE_GOOGLE_PICKER_APP_ID
```
