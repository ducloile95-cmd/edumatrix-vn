# Hướng dẫn cài đặt & kết nối tích hợp — Edumatrix VN

> Tài liệu tổng hợp ngày 20/07/2026, gộp từ 5 file hướng dẫn cài đặt/kết nối trước đây (xem mục "Nguồn gộp" cuối bài). Khi có mâu thuẫn giữa các nguồn, tài liệu này ưu tiên **mã nguồn hiện tại** (đối chiếu 19/07/2026) — ví dụ Google Drive & Picker **đã triển khai xong**, không còn ở trạng thái "chưa triển khai" như một số tài liệu cũ mô tả.
>
> Phạm vi: Firebase, Cloudflare Worker, Meta (Facebook Messenger + Page + Webhook), Google Drive & Picker, VietQR. Áp dụng cho Windows + PowerShell, Firebase Spark plan, ứng dụng client-side.

## Mục lục

0. [Tổng quan — 5 lớp kết nối](#0-tổng-quan--5-lớp-kết-nối)
1. [Chuẩn bị dự án](#1-chuẩn-bị-dự-án)
2. [Firebase](#2-firebase)
3. [Cloudflare Worker](#3-cloudflare-worker)
4. [Kết nối Facebook / Meta App](#4-kết-nối-facebook--meta-app)
5. [Webhook HTTPS & liên kết phụ huynh (PSID)](#5-webhook-https--liên-kết-phụ-huynh-psid)
6. [Chức năng Messenger: Chat & Đăng bài](#6-chức-năng-messenger-chat--đăng-bài)
7. [Kết nối Google Drive & Picker](#7-kết-nối-google-drive--picker)
8. [VietQR — Thanh toán & QR](#8-vietqr--thanh-toán--qr)
9. [Bản đồ cấu hình Admin](#9-bản-đồ-cấu-hình-admin)
10. [Kiểm thử end-to-end](#10-kiểm-thử-end-to-end)
11. [Log & Firestore Rules liên quan](#11-log--firestore-rules-liên-quan)
12. [Xử lý lỗi theo triệu chứng](#12-xử-lý-lỗi-theo-triệu-chứng)
13. [Checklist Go-live](#13-checklist-go-live)
14. [Nguồn chính thức & tài liệu đối chiếu](#14-nguồn-chính-thức--tài-liệu-đối-chiếu)

---

## 0. Tổng quan — 5 lớp kết nối

Firebase giữ dữ liệu, Worker giữ bí mật, Meta nhận webhook, Google Drive lưu giáo án, VietQR tạo mã thanh toán. Mỗi lớp chỉ chịu một trách nhiệm — khi có lỗi, kiểm tra lần lượt từ trái sang phải để không trộn lỗi giao diện với lỗi hạ tầng.

| Lớp | Vai trò |
|---|---|
| **01 · Firebase** | Đăng nhập, Firestore, Hosting, App Check |
| **02 · Worker** | Xác thực Firebase ID token, giữ secret, gọi Meta Graph API |
| **03 · Meta** | Messenger, đăng bài Page, webhook và liên kết phụ huynh |
| **04 · Drive** | Chọn, tải lên và gọi lại giáo án |
| **05 · VietQR** | Danh sách ngân hàng và ảnh QR chuyển khoản |

Kiến trúc bảo mật chung: **frontend không bao giờ giữ secret**. Mọi lời gọi Graph API/Firestore-service-account đi qua Cloudflare Worker; frontend chỉ gửi Firebase ID token.

```text
Trình duyệt Staff ──Firebase ID token──▶ Cloudflare Worker ──Page Access Token──▶ Meta Graph API
Meta Webhook ──HTTPS + X-Hub-Signature-256──▶ Cloudflare Worker ──service account──▶ Firestore
Trình duyệt Admin ──Google OAuth access token (phiên)──▶ Google Drive API
```

Không đưa `META_PAGE_ACCESS_TOKEN`, `META_APP_SECRET`, Firebase private key hay Google refresh token vào Vite, Firestore hoặc mã frontend.

---

## 1. Chuẩn bị dự án

**Tài khoản & công cụ cần có:** Node.js/npm, Firebase CLI, tài khoản Cloudflare (quyền deploy Worker), Google Cloud, Meta for Developers, quyền Owner/Editor Firebase project `edumatrix-vn-576b1`, quyền Admin Meta Business + Facebook Page, domain production (`https://edumatrix-vn-576b1.web.app`), trang Privacy Policy/hướng dẫn xóa dữ liệu (bắt buộc khi đưa Meta App hoặc Google OAuth ra production).

**Thứ tự khuyến nghị:** chạy ứng dụng local → dựng Worker → kết nối Meta và Drive → mới triển khai Hosting production.

```powershell
Copy-Item .env.example .env.local
npm install
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run build
```

- Chỉ điền biến `VITE_*` mà ứng dụng thực sự dùng vào `.env.local`; không commit file này.
- Lint, typecheck, unit test, security-rules test và build phải qua trước khi bắt đầu cấu hình API bên ngoài.
- Chạy `npm run dev`, mở URL Vite hiển thị trong terminal, đăng nhập bằng tài khoản phù hợp.

---

## 2. Firebase

Project hiện tại: `edumatrix-vn-576b1`. Firebase cung cấp Auth, Firestore, Hosting và App Check.

**Biến public phía trình duyệt:**

```dotenv
VITE_FIREBASE_API_KEY=<firebase-web-api-key>
VITE_FIREBASE_AUTH_DOMAIN=edumatrix-vn-576b1.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=edumatrix-vn-576b1
VITE_FIREBASE_STORAGE_BUCKET=<firebase-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<firebase-web-app-id>
VITE_FIREBASE_MEASUREMENT_ID=<measurement-id-neu-co>
VITE_APPCHECK_SITE_KEY=<recaptcha-v3-site-key>
```

Firebase web config **không phải** khóa quản trị — bảo vệ dữ liệu bằng Firestore Rules, phân quyền người dùng và App Check, không phải bằng cách giấu biến `VITE_FIREBASE_*`.

**Các bước:**

1. Tạo Web App trong Firebase Console, sao chép web config vào `.env.local`, bật đúng phương thức đăng nhập dự án dùng.
2. Kiểm tra Firestore Rules bằng emulator: `npm run emulators` (Auth 9099, Firestore 8090, Hosting 5000).
3. Đăng ký App Check cho Web — mã nguồn hiện dùng reCAPTCHA v3. Theo dõi metrics trước, sau đó mới bật enforcement có kiểm soát.
4. Xóa debug token ở production — `VITE_APPCHECK_DEBUG_TOKEN` chỉ dành cho local, không đưa vào build production.
5. Deploy Rules, Indexes và Hosting:

```powershell
npx firebase login
npx firebase use edumatrix-vn-576b1
npm run test:rules
npm run build
npx firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Sau deploy, đăng nhập và mở một màn hình đọc Firestore để smoke test.

---

## 3. Cloudflare Worker

Worker là ranh giới bảo mật: nhận Firebase ID token từ frontend, xác minh quyền rồi mới dùng secret để gọi Meta. Không đặt secret trong `wrangler.jsonc` — local dùng `.dev.vars`, production dùng Wrangler Secrets. Môi trường `--env production` là Worker riêng (thường tên `edumatrix-messenger-production`).

**Biến công khai** (`workers/messenger/wrangler.jsonc`):

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

`ALLOWED_ORIGIN` phải khớp chính xác origin thật của webapp, nếu không trình duyệt sẽ chặn CORS. Không tự nâng phiên bản Graph API chỉ vì Meta có bản mới — nâng sau khi đọc changelog và chạy lại test send/post/webhook.

**Chạy local:**

```powershell
Set-Location workers/messenger
npm install
Copy-Item .dev.vars.example .dev.vars
npm run dev
npm test
npm run build:prod
```

`.dev.vars` (không commit, phải nằm trong `.gitignore`):

```dotenv
META_PAGE_ACCESS_TOKEN=<page-access-token>
META_APP_SECRET=<meta-app-secret>
META_WEBHOOK_VERIFY_TOKEN=<tu-tao-mot-chuoi-ngau-nhien>
FIREBASE_CLIENT_EMAIL=<service-account-client-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Giữ nguyên ký tự `\n` trong private key — Worker tự thay `\n` thành xuống dòng thật khi ký JWT. Service account này chỉ dùng để Worker ghi `messenger_connections` (bỏ qua Firestore Rules), lấy từ Firebase Console → Project settings → Service accounts → *Generate new private key*.

**Đặt 5 secret production và deploy:**

```powershell
npx wrangler login
npx wrangler secret put META_PAGE_ACCESS_TOKEN --env production
npx wrangler secret put META_APP_SECRET --env production
npx wrangler secret put META_WEBHOOK_VERIFY_TOKEN --env production
npx wrangler secret put FIREBASE_CLIENT_EMAIL --env production
npx wrangler secret put FIREBASE_PRIVATE_KEY --env production
npm run deploy:prod
```

Chuẩn bị đủ giá trị trước, thêm secret trong một phiên cấu hình rồi mới chạy `deploy:prod` lần cuối — mỗi lệnh `wrangler secret put` có thể tạo một version deploy mới.

**Smoke test:**

```powershell
curl.exe https://edumatrix-messenger.<cloudflare-account>.workers.dev/health
# => {"ok":true}
```

Cloudflare cấp HTTPS tự động cho `workers.dev`; production quan trọng có thể gắn custom domain (vd `https://api.edumatrix.vn`). Cuối cùng, đặt `VITE_MESSENGER_WORKER_URL=https://<worker-url>` ở frontend, build lại và xác minh CORS origin.

---

## 4. Kết nối Facebook / Meta App

### Tạo Meta App

1. Mở [Meta for Developers](https://developers.facebook.com/apps/) → **Create App** → chọn loại app cho doanh nghiệp, hoàn thành thông tin đơn vị sở hữu.
2. Trong App Dashboard, thêm sản phẩm **Messenger**.
3. Mở **App Settings → Basic**, điền App Domains, Privacy Policy URL, Terms of Service URL (nếu có), User Data Deletion URL/hướng dẫn xóa dữ liệu.
4. Ghi lại **App ID**; chỉ xem **App Secret** khi chuẩn bị nhập trực tiếp vào Cloudflare Secret.

### Kết nối Facebook Page

1. Vào phần thiết lập Messenger của Meta App, kết nối Facebook Page của trung tâm.
2. Xác nhận tài khoản thao tác có toàn quyền trên Page.
3. Tạo Page Access Token cho đúng Page — khuyến nghị dùng **System User token** (Business Settings → System Users) để token không hết hạn; token generate thường (Access Tokens → Generate Token) chỉ sống ngắn.
4. Dùng Access Token Debugger của Meta để kiểm tra: token thuộc đúng App, đúng Page, chưa hết hạn, đủ quyền cần thiết.

Không ghi token vào `settings/integrations` — trường `facebookPageId` trong Edumatrix chỉ là định danh công khai.

### Quyền cần chuẩn bị

| Chức năng | Quyền Meta | Mục đích |
|---|---|---|
| Messenger (Chat) | `pages_messaging` | Gửi trong cửa sổ 24h (`messaging_type: RESPONSE`); ngoài 24h phải dùng message tag |
| Đăng Page (Post bài) | `pages_manage_posts`, `pages_read_engagement` | Cần **Advanced Access** qua App Review mới đăng được cho người dùng thật |
| Quản lý webhook Page | `pages_manage_metadata` | Đăng ký/quản lý Page webhook |
| Chọn Page | `pages_show_list` | Liệt kê Page mà người dùng quản lý |

Khi App còn *Development*, chỉ tài khoản có vai trò trong App (admin/dev/tester) mới nhận tin/đăng được. Muốn dùng thật phải submit App Review và chuyển App sang *Live*. Kiểm tra lại quyền tại **App Review → Permissions and Features** trước khi go-live.

---

## 5. Webhook HTTPS & liên kết phụ huynh (PSID)

### Khai báo callback trong Meta

1. Meta App → Messenger → Settings → Webhooks.
2. Callback URL: `https://<worker-domain>/webhook`.
3. Verify Token phải trùng chính xác `META_WEBHOOK_VERIFY_TOKEN`.
4. Chọn subscription fields: `messages`, `messaging_postbacks`, `messaging_referrals`.
5. **Verify and Save**, đăng ký đúng Facebook Page vào webhook.

### Cách Worker xác minh

- GET handshake: Meta gửi `hub.mode`, `hub.verify_token`, `hub.challenge` — Worker chỉ trả lại challenge khi Verify Token khớp.
- POST sự kiện: phải có header `X-Hub-Signature-256`; Worker tính HMAC-SHA256 bằng `META_APP_SECRET` và so sánh constant-time. Sai chữ ký → HTTP 401, không ghi Firestore.

Kiểm tra handshake (chỉ kiểm tra GET, không kiểm tra chữ ký POST):

```powershell
curl.exe "https://<worker-domain>/webhook?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=edumatrix-ok"
# Kết quả mong đợi: edumatrix-ok
```

### Liên kết phụ huynh với Messenger

Để gửi Messenger cho một phụ huynh, hệ thống cần **PSID** (Page-Scoped ID) của họ — lấy khi phụ huynh nhắn vào Page kèm tham số `ref`.

```text
POST /api/messenger/referral { "parentUid": "<FIREBASE_UID>", "studentId": "<STUDENT_ID>" }
# Worker xác minh vai trò + phạm vi học sinh, sinh nonce 128-bit dùng một lần, hết hạn sau 24h, trả về:
https://m.me/<PAGE_USERNAME>?ref=<ONE_TIME_NONCE>
```

Khi phụ huynh bấm link và nhắn tin:

1. Meta gọi webhook.
2. Worker kiểm tra referral nonce còn hạn, chưa dùng, PSID chưa thuộc tài khoản khác.
3. Worker `extractReferralLinks()` đọc `referral.ref` (= UID) + `sender.id` (= PSID), dùng Firestore atomic commit để claim nonce (không ghi đè PSID đã có) và ghi:

```text
messenger_link_nonces/{nonce}   = { uid, status: "used", usedAt, usedByPsid }
messenger_connections/{uid}     = { uid, facebookPsid, pageId, status: "active", linkedAt }
messenger_psid_links/{psid}     = { uid, pageId, status: "active", updatedAt }
```

4. Tin nhắn được ghi vào `chat_threads/{threadId}/messages`; Admin/giáo viên được phân công thấy hội thoại trong module Chat.

Nếu một phụ huynh liên kết nhiều học sinh, phiên bản hiện tại gắn tin inbound với học sinh đầu tiên trong `studentIds` — cần thêm luồng chọn học sinh nếu muốn phân tuyến chính xác.

**Cấu hình frontend:**

```dotenv
VITE_MESSENGER_WORKER_URL=https://<worker-domain>
```

Nếu để trống, client `throw "MESSENGER_NOT_CONFIGURED"` — app vẫn chạy bình thường, chỉ chức năng Messenger tạm tắt. Chỉ biến URL này được phép xuất hiện trong bundle frontend; không nhập Page Access Token hoặc App Secret vào Cài đặt → Tích hợp.

---

## 6. Chức năng Messenger: Chat & Đăng bài

### Chat (gửi tin nhắn)

**Endpoint:** `POST /api/messenger/send` · **Header:** `Authorization: Bearer <Firebase ID token>`

Chỉ định người nhận bằng **một trong hai** cách:

```json
{ "recipientPsid": "<PSID phụ huynh>", "text": "Nội dung tin", "type": "attendance", "studentId": "hs001" }
```
```json
{ "studentId": "hs001", "text": "Bé vắng hôm nay." }
```

- `recipientPsid`: gửi thẳng tới 1 PSID (Admin cần đọc `messenger_connections` ở client để lấy).
- `studentId` không kèm `recipientPsid`: Worker tự resolve PSID phụ huynh phía server (service account, bỏ qua Rules) — đọc `students/{id}.parentUids` → `messenger_connections/{uid}` (status active) → gửi tới **tất cả** phụ huynh đã liên kết. Nhờ đó giáo viên cũng nhắn được mà không cần quyền đọc connection.
- `text` tối đa 2000 ký tự; nếu không có phụ huynh liên kết → `400 { error: "no_recipient" }`.
- Response (đa người nhận): `{ id, status: "sent"|"failed", sent, total, results }`.

```ts
import { sendMessenger } from "@/services/messenger/client";

try {
  const res = await sendMessenger({
    recipientPsid: connection.facebookPsid,
    text: `Bé ${student.fullName} vắng buổi hôm nay.`,
    type: "attendance",
    studentId: student.id,
  });
} catch (e) {
  // "AUTH_REQUIRED" | "MESSENGER_NOT_CONFIGURED" | "MESSENGER_SEND_FAILED" | "meta_..."
}
```

`messaging_type: "RESPONSE"` chỉ hợp lệ trong 24 giờ kể từ tin cuối của người dùng. Gửi chủ động ngoài 24h phải dùng **message tag** hợp lệ theo chính sách Meta/App Review:

```json
{ "studentId": "hs001", "text": "Cập nhật tài khoản học phí.", "tag": "ACCOUNT_UPDATE" }
```

### Post bài (Page feed)

**Endpoint:** `POST /api/messenger/post` · **Header:** `Authorization: Bearer <Firebase ID token>`

```json
{ "message": "Thông báo lịch nghỉ Tết...", "link": "https://edumatrix-vn.web.app/thong-bao" }
```

`link` tuỳ chọn, `message` tối đa 5000 ký tự.

```ts
import { postToPage } from "@/services/messenger/client";

const res = await postToPage({ message: "Trung tâm nghỉ lễ 2/9.", link: "https://..." });
// res = { id, status: "sent", postId: "<page-post-id>" }
```

Cần quyền `pages_manage_posts` ở mức **Advanced Access** (App Review). Nếu chưa duyệt, Meta trả lỗi quyền → Worker ghi `message_outbox` với `status: "failed"` và trả `502 { status: "failed", error: "meta_..." }`.

---

## 7. Kết nối Google Drive & Picker

> **Đã triển khai** — dùng Google Identity Services token model + scope `drive.file`, không cần client secret hay refresh token. Access token giữ trong bộ nhớ phiên hiện tại, thời hạn ngắn; hết hạn thì Admin bấm kết nối lại. Upload multipart giới hạn 5 MB.

### Thiết lập Google Cloud

1. Tạo hoặc chọn **Google Cloud Project**, ghi lại **Project Number** (khác Project ID — dùng cho Picker App ID).
2. Bật **Google Drive API** và **Google Picker API** trong cùng project.
3. Cấu hình **OAuth consent screen**: tên ứng dụng, email hỗ trợ, đối tượng người dùng (Internal nếu chỉ dùng trong 1 Google Workspace org; External nếu Admin dùng tài khoản ngoài tổ chức), thêm domain production vào Authorized domains, khai báo Privacy Policy/ToS nếu ra khỏi nhóm test, thêm scope `https://www.googleapis.com/auth/drive.file`, thêm Admin vào Test users nếu còn ở chế độ Testing.

   Không xin scope `drive` hay `drive.readonly` nếu chỉ cần thư mục/tệp do Edumatrix tạo hoặc người dùng chọn — scope rộng đòi hỏi quy trình xác minh phức tạp hơn.

4. Tạo **OAuth Client ID** loại **Web application**. Authorized JavaScript origins phải đúng origin, **không có path**, ví dụ:

   ```text
   http://localhost:5173
   https://edumatrix-vn-576b1.web.app
   ```

5. Tạo và giới hạn **API key** cho Picker theo HTTP referrer (localhost/production) và chỉ cho phép Google Picker API — không dùng key không giới hạn.

### Biến frontend (đã dùng trong mã nguồn hiện tại)

```dotenv
VITE_GOOGLE_CLIENT_ID=<oauth-client-id>.apps.googleusercontent.com
VITE_GOOGLE_PICKER_API_KEY=<restricted-api-key>
VITE_GOOGLE_PICKER_APP_ID=<google-cloud-project-number>
```

Build lại sau khi đổi `.env.local`.

### Thư mục giáo án & smoke test

1. Tạo thư mục giáo án trên Drive, lấy Folder ID (đoạn sau `/folders/` trong URL), chia sẻ thư mục cho tài khoản Google sẽ vận hành ứng dụng.
2. Lưu Folder ID tại `/app/settings?section=integrations`.
3. Smoke test trong màn hình giáo án: **Kết nối Drive → Chọn tệp → Tải lên tệp dưới 5 MB → Làm mới → Mở lại tệp → Ngắt kết nối**.

Chỉ dán Folder ID thủ công không đảm bảo OAuth token có quyền trên thư mục đó — người dùng phải chọn thư mục qua Picker, hoặc thư mục phải do Edumatrix tạo sau khi đã cấp quyền. Metadata upload phải có `parents: [driveFolderId]`; lưu `fileId`, `name`, `mimeType`, `webViewLink`, `uploadedBy`, `createdAt` vào Firestore nếu cần audit — không lưu nội dung file hai lần trong Firestore.

---

## 8. VietQR — Thanh toán & QR

Dùng API danh sách ngân hàng và Quick Link ảnh QR — **không cần API key**, nhưng **không tự xác nhận tiền đã vào tài khoản** (cần đối soát thủ công).

| Mục đích | Endpoint | Ghi chú |
|---|---|---|
| Danh sách ngân hàng | `api.vietqr.io/v2/banks` | Timeout 12 giây; chỉ giữ ngân hàng hỗ trợ chuyển khoản, BIN 6 chữ số |
| Ảnh thanh toán | `img.vietqr.io` | Quick Link chứa BIN, số tài khoản, số tiền, nội dung, tên tài khoản |

**Các bước:**

1. Mở `/app/settings?section=payment`, chọn ngân hàng, điền số tài khoản (6–19 ký tự chữ/số).
2. Điền tên tài khoản (tối thiểu 5 ký tự) và nội dung chuyển khoản — hỗ trợ placeholder `{invoiceCode}` và `{studentCode}`; template mặc định `compact2`.
3. Lưu và quét thử QR bằng ứng dụng ngân hàng thật — đối chiếu đúng ngân hàng, tài khoản, số tiền, nội dung. Không chuyển tiền thật nếu chỉ đang test.

---

## 9. Bản đồ cấu hình Admin

Admin chỉ lưu định danh và cấu hình công khai — secret nằm ngoài Firestore và ngoài bundle frontend.

| Giá trị | Nơi lưu đúng | Frontend thấy? |
|---|---|---|
| Facebook Page ID, Drive Folder ID, Webhook URL | Firestore `settings/integrations` | Có, theo quyền |
| Thông tin ngân hàng và mẫu VietQR | Firestore `settings/payment` | Có, theo quyền |
| `VITE_FIREBASE_*`, Google Client ID, Picker API key | `.env.local` / biến build hosting | Có |
| Meta token, Meta app secret, webhook verify token | Cloudflare Worker Secrets | Không |
| Firebase service account email và private key | Cloudflare Worker Secrets | Không |
| Google client secret, refresh token | Không dùng trong kiến trúc hiện tại | Không được thêm |

Hai trang cần nhớ: **Kết nối và API** tại `/app/settings?section=integrations`; **Thanh toán và QR** tại `/app/settings?section=payment`. Chỉ tài khoản Admin được thay đổi cấu hình hệ thống.

---

## 10. Kiểm thử end-to-end

### Worker (local & tự động)

```powershell
cd workers/messenger
cp .dev.vars.example .dev.vars     # điền secret thật, KHÔNG commit .dev.vars
wrangler dev                        # mặc định http://localhost:8787
npx vitest run
# 11/11 PASS: bearer, chữ ký HMAC, referral, health, webhook verify, send/post yêu cầu auth
```

Thử gửi thật bằng curl (cần Firebase ID token của 1 tài khoản Staff):

```powershell
$TOKEN = "<firebase-id-token>"
curl.exe -X POST https://<worker>/api/messenger/send `
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" `
  -d '{"recipientPsid":"<PSID>","text":"Test"}'
```

### Facebook

- [ ] Worker `/health` trả `{"ok":true}`.
- [ ] Meta Verify and Save thành công; Page subscribe đủ `messages`, `messaging_postbacks`, `messaging_referrals`.
- [ ] Phụ huynh mở link `m.me` và gửi tin → Firestore có `messenger_connections`, `chat_threads` và message con.
- [ ] Module Chat hiển thị hội thoại; Staff gửi phản hồi và `message_outbox` ghi `sent`.
- [ ] Admin đăng thử một bài Page.

### Google Drive

- [ ] Drive API + Picker API đã enable; OAuth origin khớp chính xác domain chạy app.
- [ ] Tài khoản test được thêm khi OAuth app còn Testing; consent chỉ xin scope `drive.file`.
- [ ] Thư mục được chọn/tạo sau khi cấp quyền; upload trả file ID và file xuất hiện đúng thư mục.
- [ ] Ngắt kết nối sẽ revoke access token và xóa token khỏi bộ nhớ.

### Bảo mật & vai trò

- [ ] Không có secret trong `.env` của Vite, không có secret trong Firestore.
- [ ] Không commit `.dev.vars`, service account JSON hoặc token.
- [ ] `ALLOWED_ORIGIN` khớp domain production; webhook POST sai chữ ký bị HTTP 401.
- [ ] Giáo viên chỉ đọc hội thoại của học sinh được phân công; tài khoản ngoài phạm vi bị từ chối.

---

## 11. Log & Firestore Rules liên quan

- **`message_outbox/{id}`** — nhật ký mọi lần gửi/đăng: `type`, `recipientPsid` (post = `"page"`), `content`, `status`, `messageTag`, `metaMessageId`, `actorUid`, `createdAt`.
  Rules: `read` nếu là Staff; `create` nếu Staff & `actorUid == uid` & `status ∈ {sent, failed}`; `update`/`delete` = cấm.
- **`messenger_connections/{uid}`** — PSID phụ huynh: `read` nếu Admin hoặc chính chủ; `write` = cấm (chỉ Worker qua service account ghi).

Theo dõi Worker logs, App Check metrics, webhook delivery, và đối soát VietQR thủ công sau khi mở production.

---

## 12. Xử lý lỗi theo triệu chứng

| Triệu chứng / Lỗi trả về | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| CORS khi gọi Worker | `ALLOWED_ORIGIN` sai | Đặt đúng origin (scheme + port, không path), deploy lại đúng environment |
| Worker trả `missing_bearer_token` (401) | Thiếu header Authorization / Firebase ID token | Đăng nhập lại, kiểm tra project ID và service-account secret |
| Worker trả 403 / `staff_required` | Vai trò/phạm vi dữ liệu sai | Kiểm tra `users/{uid}.role`, `status`, custom claims, quan hệ parent–student; không nới rule tạm thời |
| `firebase_keys_unavailable` | Không tải được x509 của Google | Lỗi mạng tạm thời, thử lại |
| `service_auth_failed` | Sai `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` | Đặt lại secret từ service account JSON |
| Meta không verify webhook | Sai Verify Token hoặc URL không phải HTTPS public | Callback phải là HTTPS `/webhook`; token trong Meta phải trùng Worker secret |
| Webhook GET được nhưng POST 401 | App Secret sai hoặc proxy làm thay đổi body | Đặt lại `META_APP_SECRET`, giữ raw body để verify chữ ký |
| `meta_...` (502) khi gửi tin/đăng bài | Token hết hạn, thiếu quyền, ngoài cửa sổ 24h, App còn Development | Tạo lại Page token nếu hết hạn; kiểm tra Page, quyền, App Review |
| `no_recipient` | Phụ huynh chưa liên kết Page | Tạo link nonce qua Worker rồi yêu cầu phụ huynh gửi tin |
| Chat chỉ đọc / không gửi được | Thiếu `VITE_MESSENGER_WORKER_URL` | Thêm env và build lại frontend |
| Google `origin_mismatch` | Authorized JavaScript origin chưa đăng ký hoặc có path | Thêm đúng scheme, host, port — không path |
| Google `access_denied` | User không phải test user hoặc từ chối scope | Thêm test user, kiểm tra consent screen |
| Picker mở nhưng không tải/chọn tệp | Sai Cloud Project / Project Number / API key restrictions / quyền thư mục | Kiểm tra cùng Cloud Project, đúng Project Number, đúng restriction |
| Drive trả 404 với Folder ID | Token không có quyền trên thư mục | Chọn lại bằng Picker hoặc tạo thư mục qua API |
| Drive upload bị chặn / 401 | Vượt 5 MB (giới hạn hiện tại) hoặc access token hết hạn | Yêu cầu Admin kết nối lại; tệp lớn cần resumable upload (chưa triển khai) |
| Danh sách VietQR không tải | Network tới `api.vietqr.io` | Ứng dụng vẫn dùng ngân hàng đã lưu; thử lại sau, không xóa cấu hình đang hoạt động |

Nguyên tắc chung: không đổi nhiều cấu hình cùng lúc — dùng Network tab, Worker logs và console từng nền tảng để xác định đúng lớp lỗi (xem mục 0).

---

## 13. Checklist Go-live

> Các mục có `[ ]`/`[x]` dưới đây là **trạng thái tài khoản Meta/Cloudflare production thật** (App Review, token, secret, webhook, gửi thử) — **không thể xác minh được từ source code**, chỉ Lợi tự làm và tick được từ máy có quyền truy cập Meta for Developers/Cloudflare dashboard. Rà lại lần cuối trước khi gộp tài liệu: 18/07/2026 — cần Lợi xác nhận lại trạng thái hiện tại. Checklist triển khai production đầy đủ hơn (mọi hạng mục, không chỉ Messenger) nằm ở `docs/CHECKLIST-TRIEN-KHAI-PRODUCTION.md`.

- [ ] App Meta chuyển sang **Live**; đã submit App Review cho `pages_messaging` (+ `pages_manage_posts` nếu dùng post).
- [ ] `META_PAGE_ACCESS_TOKEN` là **System User token** (không hết hạn).
- [ ] Tất cả secret đã `wrangler secret put` (không nằm trong repo).
- [x] `ALLOWED_ORIGIN` = domain production.
- [ ] Webhook đã verify (nút *Verify and Save* xanh) và subscribe đủ field.
- [ ] `VITE_MESSENGER_WORKER_URL` trỏ đúng Worker production.
- [x] Worker hỗ trợ `tag` cho luồng Messenger ngoài cửa sổ phản hồi.
- [ ] Gửi thử 1 chat + 1 post, kiểm tra `message_outbox` ghi `status: sent`.
- [ ] Không có secret trong client — tìm toàn repo trước khi phát hành (`.env.local`, `.dev.vars`, private key, access token, debug token).
- [ ] Ghi lại version đang chạy (Firebase release, Worker deployment/version, thời điểm đổi cấu hình nền tảng) để rollback có mục tiêu.
- [ ] Smoke test theo từng vai trò: Admin cấu hình; Staff gửi tin, tạo referral, quản lý giáo án; tài khoản ngoài phạm vi bị từ chối.

Hoàn tất các checkpoint ở trên rồi mới rà các điều kiện không thể tự động xác nhận (App Review, token thật, webhook production).

---

## 14. Nguồn chính thức & tài liệu đối chiếu

- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Wrangler Environments](https://developers.cloudflare.com/workers/wrangler/environments/)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Google Identity — OAuth 2.0 token model for Web](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google Drive — Choose Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google Picker overview](https://developers.google.com/workspace/drive/picker/guides/overview)
- [Meta Messenger Platform](https://developers.facebook.com/docs/messenger-platform/)
- [Meta Graph API Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Meta permissions reference](https://developers.facebook.com/docs/permissions/)
- [VietQR Quick Link](https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/)

Nguồn nội bộ đã đối chiếu: `.env.example`, `firebase.json`, `.firebaserc`, `workers/messenger/wrangler.jsonc`, Worker source/tests, Firebase Rules, adapter tích hợp trong `src/services/integrations`.

### Nguồn gộp vào tài liệu này

| File gốc | Ngày | Xử lý |
|---|---|---|
| `HUONG-DAN-CAI-DAT-WORKER-VA-KET-NOI-API.html` | 19/07/2026 | Nguồn chính (mới nhất, đối chiếu mã nguồn) — chuyển vào `docs/Infographic/` |
| `HUONG-DAN-CHI-TIET-KET-NOI-FACEBOOK-GOOGLE-DRIVE.html` | — | Nội dung trùng lặp với 2 nguồn dưới, đã gộp phần khác biệt — chuyển vào `docs/Infographic/` |
| `huong-dan-ket-noi-facebook-drive-webhook.html` | — | Bản HTML của `HUONG-DAN-KET-NOI-FACEBOOK-DRIVE-WEBHOOK.md` — chuyển vào `docs/Infographic/` |
| `HUONG-DAN-KET-NOI-FACEBOOK-DRIVE-WEBHOOK.md` | 17/07/2026 | Nguồn chính cho mục Facebook/Webhook — chuyển vào `docs/archive/` |
| `messenger-api-setup.md` | 11/07/2026 | Nguồn chính cho mục 6 (Chat & Post bài) — chuyển vào `docs/archive/` |

Lưu ý: `HUONG-DAN-KET-NOI-FACEBOOK-DRIVE-WEBHOOK.md` (17/07) mô tả Google Drive "chưa triển khai" và dùng tên biến cũ (`VITE_GOOGLE_DRIVE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, `VITE_GOOGLE_CLOUD_PROJECT_NUMBER`) — thông tin này **đã lỗi thời**, mục 7 ở trên dùng tên biến hiện hành (`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_PICKER_API_KEY`, `VITE_GOOGLE_PICKER_APP_ID`).
