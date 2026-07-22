# Hướng dẫn chạy và kiểm thử Messenger Worker trước production

> Mục tiêu: kiểm tra Worker trên máy Windows, kết nối frontend local và thử Messenger thật bằng một Worker thử nghiệm. Chưa deploy Firebase Hosting hoặc Worker production.

## Hiểu nhanh 3 địa chỉ

| Thành phần | Địa chỉ |
|---|---|
| Frontend local | `http://localhost:5173` |
| Worker local | `http://localhost:8787` |
| Worker thử nghiệm công khai | `https://edumatrix-messenger.<tài-khoản>.workers.dev` |

Worker local kiểm tra được code, secret, CORS và API. Tuy nhiên Meta không gọi webhook vào `localhost`; để thử gửi/nhận Messenger thật, cần deploy Worker **thử nghiệm** bằng `npm run deploy`. Đây chưa phải Worker production.

---

## Phần A — Chuẩn bị secret local

### A1. Mở thư mục Worker

```powershell
Set-Location C:\Users\Admin\Documents\Edumatrix_VN\workers\messenger
npm install
```

### A2. Tạo file `.dev.vars`

```powershell
Copy-Item .dev.vars.example .dev.vars
notepad .dev.vars
```

Điền đủ năm dòng:

```dotenv
META_PAGE_ACCESS_TOKEN=<PAGE_ACCESS_TOKEN>
META_APP_SECRET=<APP_SECRET>
META_WEBHOOK_VERIFY_TOKEN=<CHUOI_NGAU_NHIEN>
FIREBASE_CLIENT_EMAIL=<CLIENT_EMAIL>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Nguồn của từng giá trị:

| Biến | Nguồn |
|---|---|
| `META_PAGE_ACCESS_TOKEN` | Token đã kiểm tra ở Meta Access Token Debugger |
| `META_APP_SECRET` | Meta App → App Settings → Basic |
| `META_WEBHOOK_VERIFY_TOKEN` | Chuỗi tự tạo, dùng lại khi khai báo webhook |
| `FIREBASE_CLIENT_EMAIL` | `client_email` trong Service Account JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` trong Service Account JSON |

Private key phải nằm trên một dòng và giữ nguyên ký tự `\n`.

Tạo Verify Token bằng PowerShell nếu chưa có:

```powershell
$verifyToken = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
$verifyToken
```

Lưu chuỗi vừa tạo vào trình quản lý mật khẩu và `.dev.vars`. Không gửi năm secret này qua chat.

Kiểm tra Git đang bỏ qua file:

```powershell
git check-ignore -v .dev.vars
```

Kết quả phải nhắc tới quy tắc `.dev.vars` trong `.gitignore`.

---

## Phần B — Test code Worker

Chạy tại `workers\messenger`:

```powershell
npm test
npm run build
```

Điều kiện đạt:

- `npm test` không có test thất bại.
- `npm run build` hoàn thành dry-run, không deploy.
- Không có lỗi TypeScript hoặc Wrangler.

Nếu hai lệnh này lỗi, chưa chạy Worker và chưa deploy.

---

## Phần C — Chạy Worker local

### C1. Khởi động Worker

Mở PowerShell thứ nhất:

```powershell
Set-Location C:\Users\Admin\Documents\Edumatrix_VN\workers\messenger
npm run dev
```

Giữ cửa sổ này mở. Worker dự kiến chạy tại:

```text
http://localhost:8787
```

### C2. Kiểm tra health

Mở PowerShell thứ hai:

```powershell
curl.exe http://localhost:8787/health
```

Kết quả đúng:

```json
{"ok":true}
```

### C3. Kiểm tra Verify Token

Thay `<VERIFY_TOKEN>` bằng đúng giá trị `META_WEBHOOK_VERIFY_TOKEN`:

```powershell
curl.exe "http://localhost:8787/webhook?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=edumatrix-ok"
```

Kết quả đúng:

```text
edumatrix-ok
```

Thử token sai:

```powershell
curl.exe -i "http://localhost:8787/webhook?hub.mode=subscribe&hub.verify_token=sai-token&hub.challenge=edumatrix-ok"
```

Kết quả đúng là HTTP `403 Forbidden`.

### C4. Kiểm tra API có bảo vệ đăng nhập

Gọi endpoint gửi tin mà không có Firebase ID token:

```powershell
curl.exe -i -X POST http://localhost:8787/api/messenger/send `
  -H "Content-Type: application/json" `
  -d '{"studentId":"test","text":"Test"}'
```

Kết quả đúng là HTTP `401` với lỗi:

```json
{"error":"missing_bearer_token"}
```

Điều này chứng minh endpoint không cho người lạ gọi trực tiếp.

### C5. Kiểm tra CORS cho frontend local

```powershell
curl.exe -i -X OPTIONS http://localhost:8787/api/messenger/send `
  -H "Origin: http://localhost:5173" `
  -H "Access-Control-Request-Method: POST"
```

Kết quả cần có:

```text
HTTP 204
access-control-allow-origin: http://localhost:5173
```

### Checkpoint Worker local

```text
[ ] npm test PASS
[ ] npm run build PASS
[ ] /health trả {"ok":true}
[ ] Verify Token đúng trả edumatrix-ok
[ ] Verify Token sai trả 403
[ ] API thiếu đăng nhập trả 401
[ ] CORS cho phép http://localhost:5173
```

---

## Phần D — Kết nối frontend local với Worker local

### D1. Cấu hình `.env.local`

Mở PowerShell tại thư mục gốc:

```powershell
Set-Location C:\Users\Admin\Documents\Edumatrix_VN
notepad .env.local
```

Thêm:

```dotenv
VITE_MESSENGER_WORKER_URL=http://localhost:8787
VITE_MESSENGER_PAGE_USERNAME=<PAGE_USERNAME>
```

Ví dụ Page có URL `facebook.com/luyenchudepcochi` thì:

```dotenv
VITE_MESSENGER_PAGE_USERNAME=luyenchudepcochi
```

Không thêm Page Access Token hoặc App Secret vào `.env.local`.

Để frontend sử dụng tài khoản Firebase thật, bảo đảm biến sau đang trống hoặc không tồn tại:

```dotenv
VITE_USE_EMULATORS=
```

Firebase Emulator token không phù hợp để Worker công khai xác minh bằng Firebase project thật.

### D2. Chạy frontend

Mở PowerShell thứ ba:

```powershell
Set-Location C:\Users\Admin\Documents\Edumatrix_VN
npm run dev
```

Mở:

```text
http://localhost:5173
```

Sau mỗi lần đổi `.env.local`, phải dừng và chạy lại `npm run dev`.

### D3. Kiểm tra giao diện

1. Đăng nhập bằng tài khoản Admin/Teacher của Firebase project thật.
2. Mở `/app/settings?section=integrations`.
3. Nhập Facebook Page ID.
4. Chưa cần nhập webhook URL local vì Meta không dùng được `localhost`.
5. Mở `/app/chat`.
6. Kiểm tra không còn cảnh báo thiếu `VITE_MESSENGER_WORKER_URL`.

Ở giai đoạn này, giao diện gọi được Worker local nhưng chưa nhận webhook Messenger thật.

---

## Phần E — Test Messenger thật trước production

Để Meta gọi được webhook, deploy Worker mặc định làm môi trường thử nghiệm. Worker này vẫn chỉ cho frontend local `http://localhost:5173` gọi API.

### E1. Đăng nhập Cloudflare

Trong thư mục `workers\messenger`:

```powershell
npx wrangler login
npx wrangler whoami
```

### E2. Đặt năm secret cho Worker thử nghiệm

Chạy lần lượt và dán secret khi Wrangler hỏi:

```powershell
npx wrangler secret put META_PAGE_ACCESS_TOKEN
npx wrangler secret put META_APP_SECRET
npx wrangler secret put META_WEBHOOK_VERIFY_TOKEN
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY
```

Không ghi giá trị secret trực tiếp trong câu lệnh.

### E3. Deploy Worker thử nghiệm

```powershell
npm run deploy
```

Ghi lại URL Wrangler trả về, ví dụ:

```text
https://edumatrix-messenger.<tài-khoản>.workers.dev
```

Kiểm tra:

```powershell
curl.exe https://edumatrix-messenger.<tài-khoản>.workers.dev/health
```

Kết quả phải là `{"ok":true}`.

### E4. Chuyển frontend local sang Worker thử nghiệm

Sửa `.env.local`:

```dotenv
VITE_MESSENGER_WORKER_URL=https://edumatrix-messenger.<tài-khoản>.workers.dev
VITE_MESSENGER_PAGE_USERNAME=<PAGE_USERNAME>
```

Dừng và chạy lại frontend:

```powershell
npm run dev
```

### E5. Cấu hình Meta webhook

Trong **Messenger from Meta → Cài đặt API Messenger**:

```text
URL gọi lại: https://edumatrix-messenger.<tài-khoản>.workers.dev/webhook
Xác minh mã: giá trị META_WEBHOOK_VERIFY_TOKEN
```

Giữ tùy chọn chứng thực máy khách ở trạng thái tắt, sau đó chọn **Xác minh và lưu**.

Subscribe đúng Page với ba field:

```text
messages
messaging_postbacks
messaging_referrals
```

### E6. Test Chat thật

1. Trong EduMatrix local, mở `/app/settings?section=integrations`.
2. Lưu Facebook Page ID và webhook URL công khai.
3. Mở `/app/chat`.
4. Tạo/copy link mời Messenger cho phụ huynh.
5. Phụ huynh mở link `m.me` và gửi một tin nhắn.
6. Kiểm tra tin xuất hiện trong Chat.
7. Gửi phản hồi từ EduMatrix.
8. Kiểm tra Messenger nhận được phản hồi.
9. Kiểm tra `message_outbox` có `status: sent`.

Khi Meta App còn Development, tài khoản Facebook thử nghiệm phải có vai trò Admin/Developer/Tester trong App.

---

## Khi nào được chuyển production?

Chỉ chuyển production khi tất cả mục sau đạt:

```text
[ ] Worker local test PASS
[ ] Frontend local gọi được Worker
[ ] Worker thử nghiệm /health hoạt động
[ ] Meta webhook Verify and Save thành công
[ ] Phụ huynh gửi tin vào Chat thành công
[ ] EduMatrix gửi phản hồi thành công
[ ] message_outbox ghi status: sent
[ ] Không có secret trong Git hoặc frontend
```

Production sử dụng các lệnh riêng:

```powershell
npx wrangler secret put META_PAGE_ACCESS_TOKEN --env production
npx wrangler secret put META_APP_SECRET --env production
npx wrangler secret put META_WEBHOOK_VERIFY_TOKEN --env production
npx wrangler secret put FIREBASE_CLIENT_EMAIL --env production
npx wrangler secret put FIREBASE_PRIVATE_KEY --env production
npm run build:prod
npm run deploy:prod
```

Không chạy các lệnh production trong giai đoạn kiểm thử local.
