# Hướng dẫn kết nối Facebook Messenger API với EduMatrix dành cho người no-code

> Dự án: EduMatrix VN  
> Đối tượng: Người không biết lập trình  
> Mục tiêu: Kết nối Facebook Page với EduMatrix để phụ huynh liên kết Messenger và Admin/giáo viên có thể gửi tin nhắn.  
> Cập nhật: 22/07/2026

---

## 1. Hiểu đơn giản hệ thống hoạt động thế nào

EduMatrix không gửi yêu cầu trực tiếp từ trình duyệt đến Facebook. Luồng kết nối là:

```text
EduMatrix
   ↓
Cloudflare Worker — giữ token và khóa bí mật
   ↓
Facebook Messenger API
   ↓
Facebook Page và Messenger của phụ huynh
```

Cloudflare Worker là một cầu nối bảo mật. Page Access Token, Meta App Secret và Firebase Private Key chỉ được lưu ở Cloudflare, không được nhập vào giao diện EduMatrix hoặc file cấu hình frontend.

---

## 2. Những thứ cần chuẩn bị

Trước khi bắt đầu, cần có:

- Một Facebook Page của trung tâm.
- Tài khoản Facebook có quyền **Full control** trên Page.
- Tài khoản [Meta for Developers](https://developers.facebook.com/).
- Tài khoản [Cloudflare](https://dash.cloudflare.com/).
- Quyền quản trị Firebase project `edumatrix-vn-576b1`.
- Máy tính đã cài Node.js và npm.
- Quyền mở PowerShell trên máy tính.

### Quy tắc bảo mật bắt buộc

- Không gửi `Page Access Token` cho người khác.
- Không gửi `Meta App Secret` cho người khác.
- Không gửi file Firebase Service Account JSON.
- Không chụp ảnh màn hình có token, App Secret hoặc Private Key.
- Không dán secret vào `.env`, `.env.local`, tài liệu Markdown hoặc GitHub.
- Không nhập secret tại **EduMatrix → Cài đặt → Tích hợp**.
- Chỉ nhập secret trực tiếp vào Cloudflare Worker Secrets.

Các thông tin sau không phải bí mật và có thể ghi lại:

- Facebook Page ID.
- Facebook Page username.
- Meta App ID.
- Cloudflare Worker URL.

---

# PHẦN A — CHUẨN BỊ FACEBOOK PAGE

## Bước 1: Kiểm tra quyền quản trị Facebook Page

1. Mở Facebook Page của trung tâm.
2. Chọn **Settings & privacy**.
3. Chọn **Settings**.
4. Tìm **Page access**.
5. Trong **People with Facebook access**, tìm tài khoản đang sử dụng.
6. Kiểm tra tài khoản có quyền **Full control**.

Nếu chỉ có quyền đăng bài hoặc trả lời tin nhắn thì chưa đủ. Hãy nhờ người đang có Full control cấp lại quyền.

## Bước 2: Lấy Facebook Page ID

Tìm Page ID tại một trong các vị trí sau:

- **About**.
- **Page transparency**.
- **Settings → Page setup**.

Page ID là một chuỗi số, ví dụ:

```text
100488521748588
```

Ghi lại Page ID. Đây không phải token.

## Bước 3: Lấy Page username

Ví dụ địa chỉ Facebook Page là:

```text
https://www.facebook.com/Edumatrix-VN
```

Page username là:

```text
Edumatrix-VN
```

Kiểm tra bằng cách mở:

```text
https://m.me/Edumatrix-VN
```

Nếu Messenger mở đúng cuộc trò chuyện với Page, username đã chính xác.

Sau này hệ thống dùng giá trị này cho:

```dotenv
VITE_MESSENGER_PAGE_USERNAME=Edumatrix-VN
```

Chỉ nhập username, không nhập toàn bộ URL Facebook hoặc URL `m.me`.

### Checkpoint Phần A

```text
[ ] Có Facebook Page
[ ] Tài khoản có Full control
[ ] Đã ghi lại Page ID
[ ] Đã ghi lại Page username
[ ] Link m.me mở đúng Page
```

---

# PHẦN B — TẠO META APP VÀ THÊM MESSENGER

## Bước 4: Đăng ký Meta for Developers

1. Truy cập [Meta for Developers](https://developers.facebook.com/).
2. Đăng nhập bằng tài khoản có Full control trên Page.
3. Nếu xuất hiện nút **Get Started**, bấm vào.
4. Xác nhận email và số điện thoại.
5. Hoàn thành đăng ký nhà phát triển.
6. Bật xác thực hai lớp nếu Meta yêu cầu.

## Bước 5: Tạo Meta App

1. Mở [Meta App Dashboard](https://developers.facebook.com/apps/).
2. Bấm **Create App** hoặc **Tạo ứng dụng**.
3. Nếu Meta hỏi trường hợp sử dụng, chọn mục liên quan đến:
   - Messenger;
   - Business messaging;
   - Manage messaging;
   - Tương tác với khách hàng trên Messenger from Meta.
4. Nếu không thấy lựa chọn phù hợp, chọn **Other**.
5. Nếu Meta hỏi loại ứng dụng, chọn **Business**.
6. Điền:
   - **App name:** `EduMatrix VN` hoặc tên dễ nhận biết.
   - **App contact email:** email quản trị.
   - **Business portfolio:** doanh nghiệp đang sở hữu Page.
7. Bấm **Create App**.

## Bước 6: Thêm Messenger vào ứng dụng

Tại màn hình **Bảng điều khiển** của Meta App:

1. Tìm khung **Tùy chỉnh ứng dụng và các yêu cầu**.
2. Bấm dòng:

```text
Tùy chỉnh trường hợp sử dụng Tương tác với khách hàng trên Messenger from Meta
```

3. Không chọn **Đăng nhập bằng Facebook** ở menu bên trái. Đây là chức năng đăng nhập, không phải Messenger API.
4. Mở trang thiết lập Messenger API.

Kết quả đúng là màn hình có các phần:

```text
1. Đặt cấu hình webhook
2. Tạo mã truy cập
3. Hoàn tất quy trình Xét duyệt ứng dụng
```

## Bước 7: Ghi lại App ID

1. Mở **Cài đặt ứng dụng → Thông tin cơ bản** hoặc **App Settings → Basic**.
2. Ghi lại **App ID**.
3. Kiểm tra tên ứng dụng và Business Portfolio.
4. Giữ ứng dụng ở chế độ **Development** trong giai đoạn thử nghiệm.

Không sao chép hoặc gửi App Secret. App Secret chỉ được nhập vào Cloudflare Worker ở phần sau.

### Checkpoint Phần B

```text
[ ] Đã đăng ký Meta for Developers
[ ] Đã tạo Meta App
[ ] Đã thêm trường hợp sử dụng Messenger
[ ] Đã thấy mục Đặt cấu hình webhook
[ ] Đã thấy mục Tạo mã truy cập
[ ] Đã ghi lại App ID
[ ] App vẫn ở Development mode
```

---

# PHẦN C — KẾT NỐI PAGE VÀ TẠO PAGE ACCESS TOKEN

## Bước 8: Kết nối Facebook Page

Trong màn hình thiết lập Messenger API:

1. Mở phần **2. Tạo mã truy cập**.
2. Nếu Page chưa xuất hiện, bấm **Thêm trang**, **Connect Page** hoặc nút tương tự.
3. Đăng nhập lại Facebook nếu được yêu cầu.
4. Chọn đúng Facebook Page của trung tâm.
5. Đồng ý các quyền cần thiết.
6. Bấm **Continue**, **Save** hoặc **Done**.

Sau khi kết nối, kiểm tra:

- Tên Page chính xác.
- Page ID trên Meta khớp Page ID đã ghi ở Bước 2.
- Có nút **Tạo** trong cột **Mã**.

Nếu không thấy Page:

- Kiểm tra tài khoản có Full control.
- Kiểm tra có đăng nhập nhầm tài khoản Facebook không.
- Kiểm tra Page và Meta App có cùng Business Portfolio không.
- Kiểm tra Page đã được cấp cho đúng người trong Business Settings chưa.

## Bước 9: Tạo Page Access Token

1. Ở phần **2. Tạo mã truy cập**, tìm đúng dòng của Page.
2. Nhìn sang cột **Mã** bên phải.
3. Bấm **Tạo**.
4. Đăng nhập lại và xác nhận quyền nếu Meta yêu cầu.
5. Meta hiển thị một chuỗi token dài.
6. Sao chép token đúng một lần.
7. Lưu token vào trình quản lý mật khẩu với tên:

```text
META_PAGE_ACCESS_TOKEN
```

Không lưu token vào:

```text
.env
.env.local
.env.real
wrangler.jsonc
GitHub
tài liệu Markdown
giao diện Cài đặt → Tích hợp
ảnh chụp màn hình
```

## Bước 10: Kiểm tra Page Access Token

1. Mở [Meta Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/).
2. Dán token trực tiếp vào công cụ của Meta.
3. Bấm **Debug**.
4. Kiểm tra:
   - Token hợp lệ.
   - App ID đúng Meta App vừa tạo.
   - Token thuộc đúng Facebook Page.
   - Token chưa hết hạn.
   - Có quyền `pages_messaging`.
   - Có quyền `pages_manage_metadata`.

Các quyền liên quan đến dự án:

| Mục đích | Quyền Meta |
|---|---|
| Gửi và nhận Messenger | `pages_messaging` |
| Quản lý đăng ký Webhook Page | `pages_manage_metadata` |
| Hiển thị/chọn Page | `pages_show_list` |
| Đăng bài lên Page | `pages_manage_posts` |
| Đọc tương tác Page | `pages_read_engagement` |

Trong giai đoạn đầu, chỉ tập trung hoàn thành Messenger Chat. Chức năng đăng bài cần quyền và quy trình xét duyệt riêng.

### Checkpoint Phần C

```text
[ ] Đúng Page đã được kết nối
[ ] Page ID khớp
[ ] Đã tạo Page Access Token
[ ] Token được lưu an toàn
[ ] Token không nằm trong frontend hoặc repository
[ ] Debugger báo token hợp lệ
[ ] App ID của token chính xác
[ ] Có pages_messaging
[ ] Có pages_manage_metadata
```

---

# PHẦN D — CHỌN WEBHOOK SUBSCRIPTIONS

## Bước 11: Chọn đúng ba sự kiện Webhook

Tại dòng Facebook Page trong phần **2. Tạo mã truy cập**:

1. Bấm **Thêm đăng ký**.
2. Cửa sổ **Edit Page Subscriptions** xuất hiện.
3. Chỉ tích đúng ba mục:

```text
messages
messaging_postbacks
messaging_referrals
```

Vị trí thường thấy:

- `messages`: cột trái.
- `messaging_postbacks`: cột phải.
- `messaging_referrals`: cột phải, ngay dưới `messaging_postbacks`.

4. Bấm nút xanh **Confirm**.

Không cần chọn:

- `feed`.
- `message_deliveries`.
- `message_reads`.
- `message_echoes`.
- Các sự kiện khác.

Ý nghĩa ba mục đã chọn:

| Mục | Công dụng |
|---|---|
| `messages` | Nhận sự kiện khi người dùng gửi tin nhắn cho Page |
| `messaging_postbacks` | Nhận sự kiện khi người dùng bấm nút trong Messenger |
| `messaging_referrals` | Nhận mã liên kết khi phụ huynh mở link mời từ EduMatrix |

Việc chọn ba mục này chưa đủ để Webhook hoạt động. Cần deploy Cloudflare Worker và xác minh Callback URL ở phần sau.

---

# PHẦN E — TẠO FIREBASE SERVICE ACCOUNT

## Bước 12: Tải khóa Firebase

1. Mở [Firebase Console](https://console.firebase.google.com/).
2. Chọn project `edumatrix-vn-576b1`.
3. Bấm biểu tượng bánh răng.
4. Chọn **Project settings**.
5. Mở tab **Service accounts**.
6. Chọn **Firebase Admin SDK**.
7. Bấm **Generate new private key**.
8. Xác nhận tải file JSON.

Chuyển file JSON ra ngoài thư mục dự án:

```text
C:\Users\Admin\Documents\Edumatrix_VN
```

Không đưa file JSON vào thư mục `workers/messenger` và không gửi file cho người khác.

## Bước 13: Lấy hai giá trị Firebase

Mở file JSON bằng Notepad và tìm:

```json
{
  "client_email": "firebase-adminsdk-...@edumatrix-vn-576b1.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

Ánh xạ:

```text
FIREBASE_CLIENT_EMAIL = nội dung client_email
FIREBASE_PRIVATE_KEY  = nội dung private_key
```

Giữ nguyên các ký tự `\n` trong Private Key.

### Checkpoint Phần E

```text
[ ] File JSON thuộc đúng project edumatrix-vn-576b1
[ ] File nằm ngoài repository
[ ] Đã xác định FIREBASE_CLIENT_EMAIL
[ ] Đã xác định FIREBASE_PRIVATE_KEY
[ ] Không chia sẻ hai giá trị này
```

---

# PHẦN F — TRIỂN KHAI CLOUDFLARE WORKER

## Bước 14: Chuẩn bị năm secret

Chuẩn bị đủ năm giá trị sau trong trình quản lý mật khẩu:

| Tên secret | Nguồn |
|---|---|
| `META_PAGE_ACCESS_TOKEN` | Page Access Token ở Bước 9 |
| `META_APP_SECRET` | Meta App → App Settings → Basic |
| `META_WEBHOOK_VERIFY_TOKEN` | Chuỗi ngẫu nhiên tự tạo |
| `FIREBASE_CLIENT_EMAIL` | File Service Account JSON |
| `FIREBASE_PRIVATE_KEY` | File Service Account JSON |

Tạo Verify Token bằng PowerShell:

```powershell
$verifyToken = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
$verifyToken
```

Lưu kết quả với tên:

```text
META_WEBHOOK_VERIFY_TOKEN
```

Verify Token là chuỗi do bạn tự tạo. Nó không phải App Secret và không phải Page Access Token.

## Bước 15: Đăng nhập Cloudflare

Mở PowerShell và chạy từng dòng:

```powershell
Set-Location C:\Users\Admin\Documents\Edumatrix_VN\workers\messenger
npm install
npx wrangler login
```

Trình duyệt sẽ mở Cloudflare:

1. Đăng nhập.
2. Chọn đúng tài khoản Cloudflare.
3. Cho phép Wrangler kết nối.

Kiểm tra:

```powershell
npx wrangler whoami
```

Kết quả đúng là PowerShell hiển thị thông tin tài khoản Cloudflare.

## Bước 16: Nhập năm secret cho Worker thử nghiệm

Chạy từng lệnh:

```powershell
npx wrangler secret put META_PAGE_ACCESS_TOKEN
npx wrangler secret put META_APP_SECRET
npx wrangler secret put META_WEBHOOK_VERIFY_TOKEN
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
```

Sau mỗi lệnh:

1. PowerShell yêu cầu nhập giá trị.
2. Dán đúng giá trị tương ứng.
3. Nhấn Enter.

Khi nhập secret, ký tự có thể không xuất hiện trên màn hình. Đây là hành vi bình thường.

## Bước 17: Chạy kiểm thử

Trong PowerShell, vẫn ở thư mục `workers/messenger`, chạy:

```powershell
npm test
```

Chỉ tiếp tục khi các bài kiểm thử hoàn tất thành công.

## Bước 18: Deploy Worker thử nghiệm

Chạy:

```powershell
npm run deploy
```

Sau khi deploy, Cloudflare in ra URL tương tự:

```text
https://edumatrix-messenger.ten-tai-khoan.workers.dev
```

Ghi lại toàn bộ URL này với tên `WORKER_URL`.

## Bước 19: Kiểm tra Worker

Thay URL ví dụ bằng URL thật và chạy:

```powershell
curl.exe https://edumatrix-messenger.ten-tai-khoan.workers.dev/health
```

Kết quả đúng:

```json
{"ok":true}
```

Nếu không nhận được `{"ok":true}`, chưa cấu hình Webhook trên Meta.

### Checkpoint Phần F

```text
[ ] Đã đăng nhập Cloudflare
[ ] Đã nhập đủ 5 secret
[ ] npm test thành công
[ ] Worker deploy thành công
[ ] Đã ghi lại WORKER_URL
[ ] WORKER_URL/health trả {"ok":true}
```

---

# PHẦN G — XÁC MINH META WEBHOOK

## Bước 20: Điền Callback URL và Verify Token

Quay lại Meta App Dashboard và mở phần **1. Đặt cấu hình webhook**.

Điền ô **URL gọi lại**:

```text
https://<WORKER_URL>/webhook
```

Ví dụ:

```text
https://edumatrix-messenger.example.workers.dev/webhook
```

Điền ô **Xác minh mã** bằng đúng giá trị đã lưu với tên:

```text
META_WEBHOOK_VERIFY_TOKEN
```

Sau đó:

1. Giữ tắt lựa chọn **Đính kèm chứng thực máy khách vào yêu cầu Webhook**.
2. Bấm **Xác minh và lưu**.

Kết quả đúng: Meta báo Webhook được xác minh thành công.

Không được:

- Dùng App Secret làm Verify Token.
- Dùng Page Access Token làm Verify Token.
- Thêm Verify Token vào cuối Callback URL.
- Dùng địa chỉ `localhost`.
- Bỏ phần `/webhook` ở cuối URL.

## Bước 21: Kiểm tra đăng ký Page

Tại phần **2. Tạo mã truy cập**, kiểm tra dòng của Page hiển thị ba sự kiện:

```text
messages
messaging_postbacks
messaging_referrals
```

Nếu chưa có:

1. Bấm **Thêm đăng ký**.
2. Chọn đúng ba mục trên.
3. Bấm **Confirm**.

### Checkpoint Phần G

```text
[ ] Callback URL dùng HTTPS
[ ] Callback URL kết thúc bằng /webhook
[ ] Verify Token khớp secret Cloudflare
[ ] Meta báo xác minh thành công
[ ] Page đăng ký messages
[ ] Page đăng ký messaging_postbacks
[ ] Page đăng ký messaging_referrals
```

---

# PHẦN H — CẤU HÌNH EDUMATRIX

## Bước 22: Cấu hình frontend local

Mở file `.env.local` ở thư mục gốc dự án và thêm:

```dotenv
VITE_MESSENGER_WORKER_URL=https://<worker-url>
VITE_MESSENGER_PAGE_USERNAME=<page-username>
```

Ví dụ:

```dotenv
VITE_MESSENGER_WORKER_URL=https://edumatrix-messenger.example.workers.dev
VITE_MESSENGER_PAGE_USERNAME=Edumatrix-VN
```

Chỉ có hai giá trị công khai này được đặt trong frontend.

Không thêm:

```text
META_PAGE_ACCESS_TOKEN
META_APP_SECRET
META_WEBHOOK_VERIFY_TOKEN
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Sau khi sửa `.env.local`, dừng và chạy lại ứng dụng để Vite đọc cấu hình mới.

## Bước 23: Lưu thông tin công khai trong EduMatrix

1. Đăng nhập EduMatrix bằng tài khoản Admin.
2. Mở **Cài đặt**.
3. Chọn **Tích hợp**.
4. Tìm phần Facebook/Messenger.
5. Điền các thông tin công khai nếu giao diện có ô tương ứng:
   - Facebook Page ID.
   - Page username.
   - Worker URL.
6. Bấm **Lưu**.

Không nhập token hoặc secret tại màn hình này.

---

# PHẦN I — LIÊN KẾT PHỤ HUYNH VÀ KIỂM THỬ CHAT

## Bước 24: Chuẩn bị dữ liệu thử

Cần có:

- Một học sinh thử nghiệm.
- Một tài khoản phụ huynh liên kết với học sinh đó.
- Một tài khoản Admin hoặc giáo viên có trạng thái active.
- Một tài khoản Facebook được phép thử Meta App trong Development mode.

## Bước 25: Tạo liên kết Messenger

Trong EduMatrix:

1. Mở thông tin học sinh hoặc phụ huynh.
2. Tìm chức năng liên kết Messenger.
3. Bấm tạo link hoặc gửi lời mời.
4. Hệ thống tạo đường dẫn dạng:

```text
https://m.me/<PAGE_USERNAME>?ref=<ONE_TIME_NONCE>
```

Mã sau `ref=` chỉ dùng một lần và có thời hạn.

## Bước 26: Phụ huynh xác nhận liên kết

1. Mở link bằng tài khoản Facebook của phụ huynh.
2. Messenger mở đúng Facebook Page.
3. Bấm **Get Started** nếu Messenger hiển thị nút này.
4. Gửi ít nhất một tin nhắn cho Page, ví dụ:

```text
Xin chào
```

Sau khi tin được gửi, Meta gọi Webhook và EduMatrix ghi lại mã Messenger của phụ huynh.

## Bước 27: Gửi tin từ EduMatrix

1. Đăng nhập EduMatrix bằng Admin hoặc giáo viên.
2. Mở module Chat.
3. Chọn đúng học sinh hoặc phụ huynh.
4. Nhập tin thử:

```text
EduMatrix kiểm tra kết nối Messenger.
```

5. Bấm gửi.
6. Kiểm tra Messenger của phụ huynh.

Kết nối cơ bản hoàn tất khi:

- Phụ huynh gửi được tin cho Page.
- EduMatrix nhận được trạng thái liên kết.
- Admin/giáo viên gửi được tin từ EduMatrix.
- Phụ huynh nhận được tin trên Messenger.

### Lưu ý về cửa sổ 24 giờ

Tin nhắn phản hồi thông thường chủ yếu hợp lệ trong vòng 24 giờ kể từ tương tác gần nhất của người dùng. Không sử dụng kết nối này để gửi quảng cáo hoặc tin hàng loạt không được phép. Gửi ngoài cửa sổ cho phép cần đúng loại Message Tag và tuân thủ chính sách Meta.

### Checkpoint Phần I

```text
[ ] Có học sinh và phụ huynh thử nghiệm
[ ] Đã tạo link mời Messenger
[ ] Link mở đúng Page
[ ] Phụ huynh đã gửi tin đầu tiên
[ ] EduMatrix ghi nhận liên kết
[ ] Admin/giáo viên gửi tin thành công
[ ] Phụ huynh nhận tin trên Messenger
```

---

# PHẦN J — ĐƯA ỨNG DỤNG LÊN PRODUCTION

Chỉ thực hiện phần này sau khi toàn bộ kiểm thử ở Development mode thành công.

## Bước 28: Chuẩn bị App Review

1. Chuẩn bị trang Privacy Policy.
2. Chuẩn bị hướng dẫn xóa dữ liệu người dùng.
3. Kiểm tra email liên hệ của ứng dụng.
4. Mở **App Review → Permissions and Features**.
5. Xin quyền `pages_messaging`.
6. Nếu dùng đăng bài, xin thêm:
   - `pages_manage_posts`;
   - `pages_read_engagement`.
7. Chuẩn bị video quay lại luồng sử dụng thực tế.
8. Giải thích rõ EduMatrix dùng quyền để giáo viên/Admin liên hệ phụ huynh.
9. Gửi yêu cầu xét duyệt.

Trong Development mode, thông thường chỉ người có vai trò Admin, Developer hoặc Tester của App sử dụng được. Người dùng thật chỉ nên được mở sau khi các quyền cần thiết được duyệt.

## Bước 29: Đặt secret production

Mở PowerShell:

```powershell
Set-Location C:\Users\Admin\Documents\Edumatrix_VN\workers\messenger
npx wrangler secret put META_PAGE_ACCESS_TOKEN --env production
npx wrangler secret put META_APP_SECRET --env production
npx wrangler secret put META_WEBHOOK_VERIFY_TOKEN --env production
npx wrangler secret put FIREBASE_CLIENT_EMAIL --env production
npx wrangler secret put FIREBASE_PRIVATE_KEY --env production
```

## Bước 30: Deploy Worker production

Chạy:

```powershell
npm run deploy:prod
```

Kiểm tra:

```powershell
curl.exe https://<production-worker-url>/health
```

Kết quả phải là:

```json
{"ok":true}
```

Cấu hình dự án hiện cho phép frontend production:

```text
https://edumatrix-vn-576b1.web.app
```

## Bước 31: Cấu hình frontend production

Đặt:

```dotenv
VITE_MESSENGER_WORKER_URL=https://<production-worker-url>
VITE_MESSENGER_PAGE_USERNAME=<page-username>
```

Build và deploy lại frontend sau khi đã kiểm thử và xác nhận phạm vi phát hành.

## Bước 32: Chuyển Meta App sang Live

Chỉ chuyển sang **Live** khi:

- App Review đã được chấp thuận.
- Worker production hoạt động.
- Webhook production xác minh thành công.
- Page đã đăng ký đủ ba sự kiện.
- Frontend production trỏ đúng Worker URL.
- Đã thử gửi và nhận tin bằng tài khoản thật.

---

# XỬ LÝ LỖI THƯỜNG GẶP

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Không thấy Page khi kết nối | Tài khoản không có Full control hoặc sai Business Portfolio | Kiểm tra Page access và Business Settings |
| Meta không cho tạo token | Page chưa kết nối hoặc tài khoản thiếu quyền | Kết nối lại Page bằng đúng tài khoản Full control |
| Token Debugger báo invalid | Token hết hạn, sai App hoặc sai Page | Tạo lại token từ đúng Meta App và Page |
| Worker `/health` không hoạt động | Worker chưa deploy hoặc URL sai | Chạy lại `npm run deploy`, sao chép đúng URL |
| Meta không Xác minh và lưu Webhook | Callback URL sai hoặc Verify Token không khớp | Dùng HTTPS, thêm `/webhook`, kiểm tra Verify Token |
| Webhook trả Forbidden | Verify Token trong Meta khác Cloudflare secret | Đặt lại `META_WEBHOOK_VERIFY_TOKEN` và deploy lại |
| Chat báo chưa cấu hình | Thiếu `VITE_MESSENGER_WORKER_URL` | Thêm biến vào `.env.local`, khởi động lại frontend |
| Trình duyệt báo CORS | Worker đang cho phép sai frontend origin | Kiểm tra `ALLOWED_ORIGIN` và deploy đúng environment |
| `service_auth_failed` | Firebase Client Email hoặc Private Key sai | Đặt lại hai Firebase secrets từ đúng JSON |
| Meta trả lỗi code 190 | Page Access Token hết hạn hoặc không hợp lệ | Tạo token mới và cập nhật Worker secret |
| Chỉ Admin/Tester nhận được tin | App vẫn ở Development mode | Thêm App role để thử hoặc hoàn tất App Review và chuyển Live |
| Không gửi được ngoài 24 giờ | Vi phạm cửa sổ nhắn tin của Meta | Chờ người dùng tương tác hoặc dùng Message Tag hợp lệ |
| Phụ huynh mở link nhưng không liên kết | Chưa gửi tin, referral hết hạn hoặc thiếu subscription | Tạo link mới, kiểm tra `messaging_referrals`, gửi tin đầu tiên |

---

# CHECKLIST HOÀN CHỈNH

```text
FACEBOOK PAGE
[ ] Có Facebook Page
[ ] Tài khoản có Full control
[ ] Đã ghi Page ID
[ ] Đã ghi Page username
[ ] Link m.me mở đúng Page

META APP
[ ] Đã tạo Meta App
[ ] Đã thêm Messenger
[ ] Đã ghi App ID
[ ] App đang ở Development mode
[ ] Đúng Page đã kết nối với App

TOKEN
[ ] Đã tạo Page Access Token
[ ] Token được lưu trong trình quản lý mật khẩu
[ ] Token không nằm trong frontend hoặc repository
[ ] Token Debugger báo hợp lệ
[ ] Có pages_messaging
[ ] Có pages_manage_metadata

WEBHOOK SUBSCRIPTIONS
[ ] Đã chọn messages
[ ] Đã chọn messaging_postbacks
[ ] Đã chọn messaging_referrals
[ ] Không chọn thừa các sự kiện không cần thiết

FIREBASE
[ ] Đã tải Service Account từ đúng project
[ ] File JSON nằm ngoài repository
[ ] Đã có FIREBASE_CLIENT_EMAIL
[ ] Đã có FIREBASE_PRIVATE_KEY

CLOUDFLARE
[ ] Đã đăng nhập Wrangler
[ ] Đã nhập đủ 5 secret
[ ] npm test thành công
[ ] Worker deploy thành công
[ ] /health trả {"ok":true}

META WEBHOOK
[ ] Callback URL là HTTPS
[ ] Callback URL kết thúc bằng /webhook
[ ] Verify Token khớp Cloudflare secret
[ ] Xác minh và lưu thành công
[ ] Page đăng ký đủ 3 sự kiện

EDUMATRIX
[ ] Có VITE_MESSENGER_WORKER_URL
[ ] Có VITE_MESSENGER_PAGE_USERNAME
[ ] Không có secret trong frontend
[ ] Đã khởi động lại ứng dụng sau khi sửa env

KIỂM THỬ
[ ] Đã tạo link liên kết phụ huynh
[ ] Phụ huynh mở đúng Page
[ ] Phụ huynh gửi tin đầu tiên
[ ] EduMatrix ghi nhận liên kết
[ ] EduMatrix gửi tin thành công
[ ] Phụ huynh nhận được tin

PRODUCTION
[ ] Có Privacy Policy
[ ] Có hướng dẫn xóa dữ liệu
[ ] App Review được chấp thuận
[ ] Đã dùng secret production
[ ] Worker production hoạt động
[ ] Webhook production hoạt động
[ ] Frontend production trỏ đúng Worker
[ ] Đã smoke test bằng tài khoản thật
[ ] App đã chuyển sang Live
```

---

## Các giá trị được phép báo cáo khi cần hỗ trợ

Có thể cung cấp:

```text
Page đã kết nối: Có/Không
Page ID khớp: Có/Không
Token đã tạo: Có/Không
Debugger báo hợp lệ: Có/Không
App ID khớp: Có/Không
Có pages_messaging: Có/Không
Có pages_manage_metadata: Có/Không
Worker /health thành công: Có/Không
Webhook xác minh thành công: Có/Không
Đã chọn đủ ba subscription: Có/Không
```

Không cung cấp giá trị thực của:

```text
META_PAGE_ACCESS_TOKEN
META_APP_SECRET
META_WEBHOOK_VERIFY_TOKEN
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

---

## Tài liệu liên quan trong dự án

- `docs/HUONG-DAN-KET-NOI-FACEBOOK-MESSENGER.md` — tài liệu Messenger kỹ thuật đầy đủ.
- `docs/HUONG-DAN-CAI-DAT-TICH-HOP.md` — hướng dẫn tổng hợp các tích hợp.
- `workers/messenger/.dev.vars.example` — mẫu tên biến cho Worker local.
- `workers/messenger/wrangler.jsonc` — cấu hình Cloudflare Worker.
- `.env.example` — mẫu biến môi trường frontend.

