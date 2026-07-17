# Hướng dẫn kết nối Facebook API, Google Drive và Webhook HTTPS

Tài liệu áp dụng cho Edumatrix VN tại ngày 17/07/2026.

## 1. Phạm vi tính năng

| Tích hợp | Tính năng Edumatrix | Trạng thái mã nguồn |
|---|---|---|
| Facebook Messenger | Nhận tin phụ huynh, hiển thị hội thoại, gửi phản hồi, lưu nhật ký | Đã có frontend, Firestore và Cloudflare Worker |
| Facebook Page | Admin đăng nội dung và liên kết lên Page | Đã có endpoint Worker |
| Google Drive | Chọn thư mục lưu giáo án, tài liệu và tệp xuất | Mới lưu Folder ID, chưa có OAuth hoặc upload |
| Webhook HTTPS | Nhận sự kiện Messenger, xác minh chữ ký, ghi hội thoại | Đã có tại `GET/POST /webhook` |

## 2. Kiến trúc bắt buộc

```text
Trình duyệt Staff
  | Firebase ID token
  v
Cloudflare Worker
  | Page Access Token
  v
Meta Graph API

Meta Webhook
  | HTTPS + X-Hub-Signature-256
  v
Cloudflare Worker
  | Firebase service account
  v
Firestore

Trình duyệt Admin
  | Google OAuth access token theo phiên
  v
Google Drive API
```

Không đưa `META_PAGE_ACCESS_TOKEN`, `META_APP_SECRET`, Firebase private key hoặc Google refresh token vào Vite, Firestore hay mã frontend.

## 3. Chuẩn bị

- Quyền Admin của Meta Business và Facebook Page trung tâm.
- Tài khoản Meta for Developers.
- Tài khoản Cloudflare có quyền deploy Worker.
- Quyền Owner hoặc Editor của Firebase project `edumatrix-vn-576b1`.
- Google Cloud project thuộc tổ chức hoặc tài khoản quản trị trung tâm.
- Domain production, hiện tại là `https://edumatrix-vn-576b1.web.app`.
- Trang Privacy Policy và hướng dẫn xóa dữ liệu để khai báo khi đưa Meta App hoặc Google OAuth ra production.

## 4. Kết nối Facebook API

### Tạo Meta App

1. Mở [Meta for Developers](https://developers.facebook.com/apps/).
2. Chọn **Create App**.
3. Chọn loại app phù hợp cho doanh nghiệp và hoàn thành thông tin đơn vị sở hữu.
4. Trong App Dashboard, thêm sản phẩm **Messenger**.
5. Mở **App Settings > Basic** và điền:
   - App Domains.
   - Privacy Policy URL.
   - Terms of Service URL nếu có.
   - User Data Deletion URL hoặc hướng dẫn xóa dữ liệu.
6. Ghi lại **App ID**. Chỉ xem **App Secret** khi chuẩn bị nhập trực tiếp vào Cloudflare Secret.

### Kết nối Facebook Page

1. Vào phần thiết lập Messenger của Meta App.
2. Kết nối Facebook Page của trung tâm.
3. Xác nhận tài khoản đang thao tác có toàn quyền trên Page.
4. Tạo Page Access Token cho đúng Page.
5. Dùng Access Token Debugger của Meta để kiểm tra:
   - Token thuộc đúng App.
   - Token thuộc đúng Page.
   - Token chưa hết hạn.
   - Các quyền cần thiết đã được cấp.

Không ghi token vào `settings/integrations`. Trường `facebookPageId` trong Edumatrix chỉ là định danh công khai.

### Quyền cần chuẩn bị

| Chức năng | Quyền thường dùng | Mục đích |
|---|---|---|
| Messenger | `pages_messaging` | Gửi và nhận tin nhắn Page |
| Đăng Page | `pages_manage_posts` | Tạo bài viết trên Page |
| Đọc Page | `pages_read_engagement` | Đọc dữ liệu Page cần thiết |
| Quản lý webhook Page | `pages_manage_metadata` | Đăng ký hoặc quản lý Page webhook |
| Chọn Page | `pages_show_list` | Liệt kê Page mà người dùng quản lý |

Quyền thực tế phụ thuộc luồng đăng nhập và trạng thái App Review. Kiểm tra lại trong mục **App Review > Permissions and Features** của chính Meta App trước khi go-live.

### Cấu hình Cloudflare Worker

Tệp cấu hình đã có tại `workers/messenger/wrangler.jsonc`.

```jsonc
{
  "vars": {
    "FIREBASE_PROJECT_ID": "edumatrix-vn-576b1",
    "META_GRAPH_VERSION": "v22.0",
    "ALLOWED_ORIGIN": "http://localhost:5173"
  },
  "env": {
    "production": {
      "vars": {
        "FIREBASE_PROJECT_ID": "edumatrix-vn-576b1",
        "META_GRAPH_VERSION": "v22.0",
        "ALLOWED_ORIGIN": "https://edumatrix-vn-576b1.web.app"
      }
    }
  }
}
```

Không tự đổi phiên bản Graph API chỉ vì Meta có phiên bản mới. Nâng phiên bản sau khi đọc changelog và chạy lại test send, post và webhook.

### Nhập secret production

Chạy tại thư mục dự án:

```powershell
Set-Location workers/messenger
npx wrangler login
npx wrangler secret put META_PAGE_ACCESS_TOKEN --env production
npx wrangler secret put META_APP_SECRET --env production
npx wrangler secret put META_WEBHOOK_VERIFY_TOKEN --env production
npx wrangler secret put FIREBASE_CLIENT_EMAIL --env production
npx wrangler secret put FIREBASE_PRIVATE_KEY --env production
```

Giá trị `META_WEBHOOK_VERIFY_TOKEN` là chuỗi ngẫu nhiên do quản trị viên tự tạo. Không dùng App Secret làm Verify Token.

`FIREBASE_CLIENT_EMAIL` và `FIREBASE_PRIVATE_KEY` lấy từ Firebase Console > Project settings > Service accounts. Không tải cả tệp JSON lên frontend hoặc Drive.

### Build và deploy Worker

```powershell
Set-Location workers/messenger
npm install
npm test
npm run build:prod
npm run deploy:prod
```

Sau deploy, lưu URL Worker. Ví dụ:

```text
https://edumatrix-messenger.<cloudflare-account>.workers.dev
```

Kiểm tra:

```powershell
curl.exe https://edumatrix-messenger.<cloudflare-account>.workers.dev/health
```

Kết quả mong đợi:

```json
{"ok":true}
```

Cloudflare cấp HTTPS tự động cho `workers.dev`. Với production quan trọng, có thể gắn custom domain như `https://api.edumatrix.vn`.

## 5. Thiết lập Webhook HTTPS

### Khai báo callback trong Meta

1. Mở Meta App > Messenger > Settings > Webhooks.
2. Callback URL:

   ```text
   https://<worker-domain>/webhook
   ```

3. Verify Token phải giống chính xác `META_WEBHOOK_VERIFY_TOKEN`.
4. Chọn các subscription field:
   - `messages`
   - `messaging_postbacks`
   - `messaging_referrals`
5. Chọn **Verify and Save**.
6. Đăng ký đúng Facebook Page vào webhook.

### Cách Worker xác minh

- Meta gửi GET với `hub.mode`, `hub.verify_token` và `hub.challenge`.
- Worker chỉ trả lại challenge khi Verify Token khớp.
- Sự kiện POST phải có `X-Hub-Signature-256`.
- Worker tính HMAC-SHA256 bằng `META_APP_SECRET` và so sánh constant-time.
- Payload sai chữ ký nhận HTTP 401 và không được ghi Firestore.

### Kiểm tra handshake

```powershell
curl.exe "https://<worker-domain>/webhook?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=edumatrix-ok"
```

Kết quả mong đợi là `edumatrix-ok`.

Lệnh trên chỉ kiểm tra GET handshake. Không dùng nó để kiểm tra chữ ký POST.

### Liên kết phụ huynh với Messenger

Edumatrix cần Page-Scoped ID của phụ huynh. Tạo liên kết:

```text
https://m.me/<PAGE_USERNAME>?ref=<FIREBASE_UID_PHU_HUYNH>
```

Sau khi phụ huynh mở link và gửi tin:

1. Meta gọi webhook.
2. Worker đọc referral UID và PSID.
3. Worker ghi `messenger_connections/{uid}`.
4. Tin nhắn được ghi vào `chat_threads/{threadId}/messages`.
5. Admin hoặc giáo viên được phân công nhìn thấy hội thoại trong module Chat.

Nếu một phụ huynh liên kết nhiều học sinh, phiên bản hiện tại gắn tin inbound với học sinh đầu tiên trong `studentIds`. Cần thêm luồng chọn học sinh trong Messenger nếu muốn phân tuyến chính xác.

## 6. Cấu hình frontend Facebook

Trong tệp env dùng khi build frontend:

```dotenv
VITE_MESSENGER_WORKER_URL=https://<worker-domain>
```

Chỉ biến URL này được phép xuất hiện trong bundle frontend. Sau khi thay env, build và deploy lại frontend.

Trong Cài đặt > Tích hợp:

- Facebook Page ID: nhập định danh Page công khai.
- Webhook callback URL: nhập `https://<worker-domain>/webhook`.
- Không nhập Page Access Token hoặc App Secret.

## 7. Kết nối Google Drive

### Trạng thái hiện tại

Edumatrix mới lưu `driveFolderId` trong `settings/integrations`. Folder ID không phải thông tin xác thực và không tự cấp quyền truy cập. Muốn tải tệp thật phải triển khai Google Identity Services và Drive API.

Với Firebase Spark và code client-side, phương án phù hợp là:

- Admin bấm **Kết nối Google Drive**.
- Trình duyệt xin access token bằng Google Identity Services.
- Token chỉ giữ trong bộ nhớ của phiên hiện tại.
- Edumatrix gọi Drive API trực tiếp bằng HTTPS.
- Dùng scope tối thiểu `https://www.googleapis.com/auth/drive.file`.
- Không lưu refresh token trong Firestore hoặc Local Storage.

### Tạo Google Cloud project

1. Mở [Google Cloud Console](https://console.cloud.google.com/).
2. Chọn hoặc tạo project dành riêng cho Edumatrix.
3. Vào **APIs & Services > Library**.
4. Enable **Google Drive API**.
5. Nếu dùng giao diện chọn tệp hoặc thư mục, enable thêm **Google Picker API**.

### Cấu hình OAuth consent screen

1. Mở **Google Auth Platform** hoặc **APIs & Services > OAuth consent screen**.
2. Điền App name, support email và developer contact.
3. Thêm domain production vào Authorized domains.
4. Khai báo Privacy Policy và Terms of Service nếu đưa app ra ngoài nhóm test.
5. Chọn audience:
   - Internal nếu chỉ dùng trong một Google Workspace organization.
   - External nếu Admin có thể dùng tài khoản Google bên ngoài tổ chức.
6. Thêm scope `https://www.googleapis.com/auth/drive.file`.
7. Trong chế độ Testing, thêm tài khoản Admin vào Test users.

Không xin scope `drive` hoặc `drive.readonly` nếu chức năng chỉ cần thư mục và tệp do Edumatrix tạo hoặc người dùng chọn. Scope rộng có thể yêu cầu quy trình xác minh và đánh giá bảo mật phức tạp hơn.

### Tạo OAuth Client ID

1. Vào **APIs & Services > Credentials**.
2. Chọn **Create Credentials > OAuth client ID**.
3. Application type: **Web application**.
4. Authorized JavaScript origins:

   ```text
   http://localhost:5173
   https://edumatrix-vn-576b1.web.app
   https://<custom-domain-neu-co>
   ```

5. Không thêm path như `/app/settings` vào JavaScript origin.
6. Sao chép Client ID.

Client ID là định danh công khai nên có thể dùng trong frontend. Client Secret không được dùng trong luồng token model chạy ở trình duyệt.

### Chọn hoặc tạo thư mục Edumatrix

Phương án khuyến nghị:

1. Admin kết nối Google Drive.
2. Dùng Google Picker để chọn thư mục đã có, hoặc tạo thư mục mới qua Drive API.
3. Xác nhận thư mục có quyền truy cập theo scope `drive.file`.
4. Lưu duy nhất Folder ID vào Cài đặt > Tích hợp.

Folder ID nằm trong URL:

```text
https://drive.google.com/drive/folders/<FOLDER_ID>
```

Chỉ dán Folder ID thủ công không đảm bảo OAuth token có quyền trên thư mục đó. Người dùng phải chọn thư mục qua Picker, hoặc thư mục phải do Edumatrix tạo sau khi đã cấp quyền.

### Biến frontend dự kiến

Các biến dưới đây chưa được mã nguồn hiện tại sử dụng. Chỉ thêm khi triển khai Drive runtime:

```dotenv
VITE_GOOGLE_DRIVE_CLIENT_ID=<oauth-web-client-id>
VITE_GOOGLE_API_KEY=<api-key-neu-dung-google-picker>
VITE_GOOGLE_CLOUD_PROJECT_NUMBER=<project-number-neu-dung-picker>
```

Hạn chế API key theo HTTP referrer và chỉ cho phép Google Picker API. Không dùng API key thay cho OAuth access token.

### Luồng OAuth client-side

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

```ts
const tokenClient = google.accounts.oauth2.initTokenClient({
  client_id: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID,
  scope: "https://www.googleapis.com/auth/drive.file",
  callback: (response) => {
    if (response.error) throw new Error(response.error);
    driveAccessToken = response.access_token;
  },
});

// Chỉ gọi sau thao tác bấm nút của Admin.
tokenClient.requestAccessToken({ prompt: "consent" });
```

Không tự động mở consent popup khi tải trang. Access token hết hạn thì yêu cầu Admin kết nối lại.

### Upload tệp vào Drive

- Tệp nhỏ tối đa 5 MB có thể dùng multipart upload.
- Tệp lớn hoặc mạng không ổn định nên dùng resumable upload.
- Metadata phải có `parents: [driveFolderId]`.
- Lưu `fileId`, `name`, `mimeType`, `webViewLink`, `uploadedBy` và `createdAt` vào Firestore nếu cần audit.
- Không lưu nội dung file hai lần trong Firestore.

Ví dụ multipart:

```ts
const metadata = {
  name: file.name,
  mimeType: file.type || "application/octet-stream",
  parents: [driveFolderId],
};

const boundary = `edumatrix_${crypto.randomUUID()}`;
const body = new Blob([
  `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
  JSON.stringify(metadata),
  `\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
  file,
  `\r\n--${boundary}--`,
]);

const response = await fetch(
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${driveAccessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  },
);
```

Nếu cần upload nền khi Admin không mở trình duyệt, client-side token model không đủ. Khi đó phải bổ sung authorization code flow và lưu refresh token trong secret store của backend hoặc Worker. Không lưu refresh token trong Firebase client.

## 8. Kiểm tra end-to-end

### Facebook

- [ ] Worker `/health` trả `{"ok":true}`.
- [ ] Meta Verify and Save thành công.
- [ ] Page subscribe đủ `messages`, `messaging_postbacks`, `messaging_referrals`.
- [ ] Phụ huynh mở link `m.me` và gửi tin.
- [ ] Firestore có `messenger_connections`, `chat_threads` và message con.
- [ ] Module Chat hiển thị hội thoại.
- [ ] Staff gửi phản hồi và `message_outbox` ghi `sent`.
- [ ] Admin đăng thử một bài Page.

### Google Drive

- [ ] Drive API đã enable.
- [ ] OAuth origin khớp chính xác domain chạy app.
- [ ] Tài khoản test được thêm khi OAuth app còn Testing.
- [ ] Consent chỉ xin scope `drive.file`.
- [ ] Thư mục được chọn hoặc tạo sau khi cấp quyền.
- [ ] Upload trả file ID và file xuất hiện đúng thư mục.
- [ ] Ngắt kết nối sẽ revoke access token và xóa token khỏi bộ nhớ.

### Bảo mật

- [ ] Không có secret trong `.env` của Vite.
- [ ] Không có secret trong Firestore.
- [ ] Không commit `.dev.vars`, service account JSON hoặc token.
- [ ] `ALLOWED_ORIGIN` khớp domain production.
- [ ] Webhook POST sai chữ ký bị HTTP 401.
- [ ] Giáo viên chỉ đọc hội thoại của học sinh được phân công.

## 9. Lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Meta không verify webhook | Sai Verify Token hoặc URL không public HTTPS | Kiểm tra Worker URL và secret đúng environment |
| Webhook GET được nhưng POST 401 | App Secret sai hoặc proxy làm thay đổi body | Đặt lại `META_APP_SECRET`, giữ raw body để verify |
| Chat chỉ đọc | Thiếu `VITE_MESSENGER_WORKER_URL` | Thêm env và build lại frontend |
| Meta trả lỗi quyền | App còn Development hoặc thiếu Advanced Access | Kiểm tra role test, App Review và quyền token |
| `no_recipient` | Phụ huynh chưa liên kết Page | Gửi link `m.me?ref=<uid>` và yêu cầu gửi tin |
| Google `origin_mismatch` | Origin chưa đăng ký hoặc có path | Thêm đúng scheme, host và port |
| Google `access_denied` | User không phải test user hoặc từ chối scope | Thêm test user, kiểm tra consent screen |
| Drive trả 404 với Folder ID | Token không có quyền trên thư mục | Chọn lại bằng Picker hoặc tạo thư mục qua API |
| Upload 401 | Access token hết hạn | Yêu cầu Admin kết nối lại |
| CORS từ Worker | `ALLOWED_ORIGIN` sai | Sửa production vars và deploy lại |

## 10. Nguồn chính thức

- [Meta Messenger Platform](https://developers.facebook.com/docs/messenger-platform/)
- [Meta Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Meta permissions reference](https://developers.facebook.com/docs/permissions/)
- [Google Drive JavaScript quickstart](https://developers.google.com/workspace/drive/api/quickstart/js)
- [Google Identity Services token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare routes and domains](https://developers.cloudflare.com/workers/configuration/routing/)
