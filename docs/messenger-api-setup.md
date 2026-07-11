# Hướng dẫn kết nối API Messenger (Chat & Post bài)

Tài liệu này hướng dẫn cấu hình đầy đủ để dùng hai chức năng qua Meta Graph API:

- **Chat** — gửi tin nhắn Messenger từ Staff tới phụ huynh (đã triển khai).
- **Post bài** — đăng bài lên trang (Page feed) của trung tâm (đã triển khai endpoint tối thiểu).

> Cập nhật: 11/07/2026. Áp dụng cho `workers/messenger` (Cloudflare Worker) + `src/services/messenger/client.ts` (frontend).

---

## 1. Kiến trúc & vì sao cần Worker

Frontend **không bao giờ** giữ Meta Page Access Token. Mọi lời gọi Graph API đi qua một Cloudflare Worker giữ token dưới dạng **Secret**.

```
Trình duyệt (Staff)                Cloudflare Worker                 Meta Graph API
─────────────────                  ─────────────────                 ──────────────
sendMessenger()  ──Firebase ID──▶  /api/messenger/send  ──Page Token──▶ /me/messages   (chat)
postToPage()     ──Firebase ID──▶  /api/messenger/post  ──Page Token──▶ /me/feed       (post)
                                        │
                                        ├─ verify Firebase ID token (jose + x509 Google)
                                        ├─ requireStaff (đọc users/{uid}: role admin|teacher, status active)
                                        └─ ghi message_outbox (log sent/failed) bằng ID token của user

Meta (webhook) ──sự kiện referral──▶  /webhook  ──service account──▶ Firestore messenger_connections/{uid}
```

**Nguyên tắc bảo mật (đối chiếu tiêu chí Phase 11):**

| Tiêu chí | Cách đảm bảo |
|---|---|
| Token không xuất hiện ở frontend | Frontend chỉ gửi Firebase ID token; Page token nằm trong Worker Secret |
| Chỉ Staff được gửi | `requireStaff()` kiểm tra `role ∈ {admin, teacher}` và `status == active` |
| Có log thành công/thất bại | Mỗi lần gửi/đăng ghi `message_outbox` với `status: sent|failed` |
| Webapp vẫn chạy nếu Messenger lỗi | Client `throw` lỗi có mã rõ ràng; caller tự xử lý, không làm sập app |

---

## 2. Chuẩn bị

- Tài khoản **Meta for Developers** (developers.facebook.com) và một **Facebook Page** của trung tâm.
- Tài khoản **Cloudflare** + `wrangler` CLI (`npm i -g wrangler` hoặc dùng `npx wrangler`).
- Quyền tải **Service Account** của dự án Firebase (Console → Project settings → Service accounts).

---

## 3. Bước 1 — Tạo Meta App & lấy khoá

1. **Tạo App**: developers.facebook.com → *My Apps* → *Create App* → loại **Business**.
2. **Thêm sản phẩm**:
   - *Messenger* (cho chat).
   - Liên kết Page của trung tâm vào App (*Messenger → Settings → Access Tokens → Add/Connect a Page*).
3. **Lấy Page Access Token**:
   - Tại *Messenger → Settings → Access Tokens*, chọn Page → *Generate Token*.
   - Khuyến nghị dùng **System User token** (Business Settings → System Users) để token **không hết hạn**; token generate thường chỉ sống ngắn.
   - → đây là giá trị `META_PAGE_ACCESS_TOKEN`.
4. **Lấy App Secret**: *App Settings → Basic → App Secret* → `META_APP_SECRET`.
5. **Quyền (Permissions) cần xin App Review**:

   | Chức năng | Quyền Meta | Ghi chú |
   |---|---|---|
   | Chat | `pages_messaging` | Gửi trong cửa sổ 24h (messaging_type `RESPONSE`). Ngoài 24h phải dùng message tag. |
   | Post bài | `pages_manage_posts`, `pages_read_engagement` | Cần **Advanced Access** qua App Review mới đăng được cho người dùng thật |

   > Khi App còn ở chế độ *Development*, chỉ tài khoản có vai trò trong App (admin/dev/tester) mới nhận tin/đăng được. Muốn dùng thật phải submit App Review + chuyển App sang *Live*.

---

## 4. Bước 2 — Cấu hình & deploy Cloudflare Worker

### 4.1. Biến công khai (`workers/messenger/wrangler.jsonc`)

Đã có sẵn, sửa cho khớp môi trường:

```jsonc
"vars": {
  "FIREBASE_PROJECT_ID": "edumatrix-vn-576b1",
  "META_GRAPH_VERSION": "v22.0",
  "ALLOWED_ORIGIN": "https://<domain-webapp-cua-ban>"   // CORS: đúng origin của frontend
}
```

> `ALLOWED_ORIGIN` phải khớp origin thật của webapp (vd `https://edumatrix-vn.web.app`), nếu không trình duyệt sẽ chặn CORS. Lúc dev để `http://localhost:5173`.

Production dùng environment `production`: thay `REPLACE_WITH_HOSTING_DOMAIN` bằng domain Hosting thật và deploy bằng `wrangler deploy --env production`. Không deploy cấu hình mặc định local lên production.

### 4.2. Secret (KHÔNG commit — dùng `wrangler secret put`)

```bash
cd workers/messenger

wrangler secret put META_PAGE_ACCESS_TOKEN      # Page token ở bước 3.3
wrangler secret put META_APP_SECRET             # App Secret ở bước 3.4
wrangler secret put META_WEBHOOK_VERIFY_TOKEN   # tự đặt 1 chuỗi ngẫu nhiên dài (dùng lại ở bước 5)
wrangler secret put FIREBASE_CLIENT_EMAIL       # từ service account JSON: "client_email"
wrangler secret put FIREBASE_PRIVATE_KEY        # từ service account JSON: "private_key" (giữ nguyên \n)
```

**Lấy `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`:** tải Service Account JSON (Firebase Console → Project settings → Service accounts → *Generate new private key*). Lấy đúng 2 trường:

```json
{
  "client_email": "firebase-adminsdk-xxxxx@edumatrix-vn-576b1.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n"
}
```

> Worker tự thay `\n` thành xuống dòng thật khi ký JWT (`FIREBASE_PRIVATE_KEY.replace(/\\n/g,"\n")`), nên dán nguyên chuỗi có `\n` là được. Service account này chỉ được Worker dùng để ghi `messenger_connections` (bỏ qua Firestore Rules).

### 4.3. Deploy

```bash
cd workers/messenger
npm install
wrangler deploy
```

Lấy URL Worker sau khi deploy, ví dụ: `https://edumatrix-messenger.<account>.workers.dev`.

Kiểm tra nhanh:

```bash
curl https://edumatrix-messenger.<account>.workers.dev/health
# => {"ok":true}
```

---

## 5. Bước 3 — Webhook (liên kết PSID phụ huynh)

Để gửi Messenger cho một phụ huynh, hệ thống cần **PSID** (Page-Scoped ID) của họ. PSID được lấy khi phụ huynh nhắn vào Page kèm tham số `ref` = UID Firebase.

1. Trong *Messenger → Settings → Webhooks* của App:
   - **Callback URL**: `https://<worker-url>/webhook`
   - **Verify Token**: đúng giá trị `META_WEBHOOK_VERIFY_TOKEN` đã đặt ở bước 4.2.
   - **Subscription fields**: tích `messages`, `messaging_postbacks`, `messaging_referrals`.
2. Tạo link m.me cho phụ huynh (hiển thị trong app phụ huynh):
   ```
   https://m.me/<PAGE_USERNAME>?ref=<FIREBASE_UID>
   ```
   Khi phụ huynh bấm và nhắn, Meta gọi webhook; Worker `extractReferralLinks()` đọc `referral.ref` (= UID) + `sender.id` (= PSID) và ghi:
   ```
   messenger_connections/{uid} = { uid, facebookPsid, pageId, status: "active", linkedAt }
   ```
3. Từ đó, khi gửi chat, lấy `facebookPsid` của phụ huynh trong `messenger_connections/{uid}` để truyền vào `recipientPsid`.

> Chữ ký webhook được xác thực bằng HMAC-SHA256 (`X-Hub-Signature-256`) với `META_APP_SECRET`, so sánh constant-time — sự kiện giả mạo bị loại.

---

## 6. Bước 4 — Cấu hình Frontend

Trong `.env` (xem `.env.example`):

```
VITE_MESSENGER_WORKER_URL=https://edumatrix-messenger.<account>.workers.dev
```

> Nếu để trống, client `throw "MESSENGER_NOT_CONFIGURED"` — app vẫn chạy bình thường, chỉ chức năng Messenger tạm tắt.

---

## 7. Chức năng CHAT (Messenger)

**Endpoint:** `POST /api/messenger/send` · **Header:** `Authorization: Bearer <Firebase ID token>`

**Body:** cần **một trong hai** cách chỉ định người nhận:
```json
{ "recipientPsid": "<PSID phụ huynh>", "text": "Nội dung tin", "type": "attendance", "studentId": "hs001" }
```
```json
{ "studentId": "hs001", "text": "Bé vắng hôm nay." }
```
- `recipientPsid`: gửi thẳng tới 1 PSID (cần Admin đọc `messenger_connections` ở client để lấy).
- `studentId` **không kèm** `recipientPsid`: Worker **tự resolve PSID phụ huynh server-side** (service account, bỏ qua Rules) — đọc `students/{id}.parentUids` → `messenger_connections/{uid}` (status active) → gửi tới **tất cả** phụ huynh đã liên kết. Nhờ đó **Giáo viên cũng nhắn được** mà không cần quyền đọc connection.
- `text` tối đa 2000 ký tự. Nếu không có phụ huynh liên kết → `400 { error: "no_recipient" }`.

**Response** (đa người nhận): `{ id, status: "sent"|"failed", sent, total, results }` — `sent/total` = số phụ huynh gửi thành công.

**Gọi từ code:**
```ts
import { sendMessenger } from "@/services/messenger/client";

try {
  const res = await sendMessenger({
    recipientPsid: connection.facebookPsid,
    text: `Bé ${student.fullName} vắng buổi hôm nay.`,
    type: "attendance",
    studentId: student.id,
  });
  // res = { id, status: "sent" }
} catch (e) {
  // "AUTH_REQUIRED" | "MESSENGER_NOT_CONFIGURED" | "MESSENGER_SEND_FAILED" | "meta_..."
}
```

**Chính sách Meta:** `messaging_type: "RESPONSE"` chỉ hợp lệ trong **24 giờ** kể từ tin cuối của người dùng. Gửi chủ động ngoài 24h phải dùng **message tag** hợp lệ (vd `ACCOUNT_UPDATE`) — cần chỉnh `sendGraph()` để thêm `tag`.

---

## 8. Chức năng POST BÀI (Page feed)

**Endpoint:** `POST /api/messenger/post` · **Header:** `Authorization: Bearer <Firebase ID token>`

**Body:**
```json
{ "message": "Thông báo lịch nghỉ Tết...", "link": "https://edumatrix-vn.web.app/thong-bao" }
```
`link` tuỳ chọn. `message` tối đa 5000 ký tự.

**Gọi từ code:**
```ts
import { postToPage } from "@/services/messenger/client";

const res = await postToPage({ message: "Trung tâm nghỉ lễ 2/9.", link: "https://..." });
// res = { id, status: "sent", postId: "<page-post-id>" }
```

**Yêu cầu riêng:** cần quyền `pages_manage_posts` ở mức **Advanced Access** (App Review). Nếu chưa được duyệt, Meta trả lỗi quyền → Worker ghi `message_outbox` với `status: "failed"` và trả `502 { status: "failed", error: "meta_..." }`.

---

## 9. Kiểm thử

### 9.1. Chạy Worker local
```bash
cd workers/messenger
cp .dev.vars.example .dev.vars     # điền secret thật (KHÔNG commit .dev.vars)
wrangler dev                        # mặc định http://localhost:8787
```

### 9.2. Test tự động (không cần secret thật)
```bash
cd workers/messenger
npx vitest run
# 11/11 PASS: bearer, chữ ký HMAC, referral, health, webhook verify, send/post yêu cầu auth
```

### 9.3. Thử gửi thật bằng curl (cần ID token của 1 tài khoản Staff)
```bash
TOKEN="<firebase-id-token>"
curl -X POST https://<worker>/api/messenger/send \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"recipientPsid":"<PSID>","text":"Test"}'
```

---

## 10. Log & Firestore Rules

- **`message_outbox/{id}`** — nhật ký mọi lần gửi/đăng: `type`, `recipientPsid` (post = `"page"`), `content`, `status`, `metaMessageId`, `actorUid`, `createdAt`.
  Rules: `read` nếu là Staff; `create` nếu Staff & `actorUid == uid` & `status ∈ {sent,failed}`; `update/delete` = cấm.
- **`messenger_connections/{uid}`** — PSID phụ huynh: `read` nếu Admin hoặc chính chủ; `write` = cấm (chỉ Worker qua service account ghi).

---

## 11. Xử lý lỗi thường gặp

| Lỗi trả về | Nguyên nhân | Cách khắc phục |
|---|---|---|
| `missing_bearer_token` (401) | Thiếu header Authorization | Đăng nhập lại, gửi kèm ID token |
| `staff_required` | Tài khoản không phải admin/teacher active | Kiểm tra `users/{uid}.role` và `status` |
| `firebase_keys_unavailable` | Không tải được x509 của Google | Lỗi mạng tạm thời, thử lại |
| `service_auth_failed` | Sai `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` | Đặt lại secret từ service account JSON |
| `meta_...` (502) | Meta từ chối (token hết hạn, thiếu quyền, ngoài 24h) | Xem chi tiết mã lỗi Meta; kiểm tra token/quyền/App Review |
| Bị chặn CORS | `ALLOWED_ORIGIN` sai | Đặt đúng origin webapp rồi `wrangler deploy` lại |

---

## 12. Checklist Go-live

- [ ] App Meta chuyển sang **Live**; đã submit App Review cho `pages_messaging` (+ `pages_manage_posts` nếu dùng post).
- [ ] `META_PAGE_ACCESS_TOKEN` là **System User token** (không hết hạn).
- [ ] Tất cả secret đã `wrangler secret put` (không nằm trong repo).
- [ ] `ALLOWED_ORIGIN` = domain production.
- [ ] Webhook đã verify (nút *Verify and Save* xanh) và subscribe đủ field.
- [ ] `VITE_MESSENGER_WORKER_URL` trỏ đúng Worker production.
- [ ] Gửi thử 1 chat + 1 post, kiểm tra `message_outbox` ghi `status: sent`.
