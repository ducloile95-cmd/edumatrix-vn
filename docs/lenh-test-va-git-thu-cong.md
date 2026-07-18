# Lệnh test trên sandbox & lệnh Git thủ công

Tài liệu tham khảo nhanh (không phải kế hoạch) — gom lệnh cần chạy để xác nhận thay đổi trước khi merge, và lệnh Git thủ công dùng khi công cụ commit/push tự động không chạy được.

## 1. Test app chính

Chạy tại thư mục gốc project (`Edumatrix_VN`):

```bash
npm run typecheck   # tsc --noEmit -p tsconfig.app.json - PASS = không lỗi kiểu
npm run lint        # eslint . --ext ts,tsx --max-warnings 0 - PASS = 0 warning/error
npm run build       # tsc --noEmit + vite build - xác nhận build production được
npm test            # vitest run src
```

Trong môi trường chỉnh sửa (sandbox) chỉ `typecheck`/`lint` chạy được. `build`/`test` bị chặn bởi lỗi môi trường (thiếu binary `@rollup/rollup-linux-x64-gnu` — `node_modules` build sẵn cho Windows, không chạy được trên Linux sandbox). Cần chạy 2 lệnh này trên máy thật để xác nhận cuối cùng.

## 2. Test Firestore Security Rules

```bash
npm run test:rules   # node scripts/run-rules-tests.mjs, dùng Firebase Emulator
```

Cần **Java (JDK) 21 trở lên** cài sẵn trên máy (ví dụ tải tại https://adoptium.net). Sandbox chỉnh sửa chỉ có JDK 11 nên không chạy được lệnh này ở đó — luôn cần chạy trên máy thật.

## 3. Test Cloudflare Worker (Messenger)

Test tự động, không cần secret thật:

```bash
cd workers/messenger
npm install
npm test
```

Chạy Worker local để thử tay:

```bash
cd workers/messenger
cp .dev.vars.example .dev.vars   # điền secret thật, KHÔNG commit file này
npm run dev                       # mặc định http://localhost:8787
curl http://localhost:8787/health # kỳ vọng: {"ok":true}
```

Kiểm tra cấu hình trước khi lên production (dry-run, chưa deploy thật):

```bash
cd workers/messenger
npm run build:prod
```

Deploy Worker lên production thật (cần đã đặt đủ secret qua `wrangler secret put`, xem `docs/messenger-api-setup.md` mục 4.2):

```bash
cd workers/messenger
npm run deploy:prod
```

Gửi thử 1 tin Messenger thật (cần ID token của tài khoản Staff đang đăng nhập):

```bash
curl -X POST https://<worker-url>/api/messenger/send \
  -H "Authorization: Bearer <firebase-id-token>" -H "Content-Type: application/json" \
  -d '{"studentId":"<id-hoc-sinh>","text":"Test"}'
```

Sau đó vào Firestore Console kiểm tra collection `message_outbox` có bản ghi mới `status: sent`.

## 4. Git thủ công (khi commit/push tự động không chạy)

Chạy tại thư mục gốc project (`Edumatrix_VN`).

**Xem trạng thái + thay đổi:**

```bash
git status
git diff                # thay đổi chưa add
git diff --staged       # thay đổi đã add, chưa commit
```

**Add + commit:**

```bash
git add -A
git commit -m "Mô tả ngắn gọn thay đổi"
```

**Push lên remote:**

```bash
git push
```

Nếu branch hiện tại chưa có upstream (lần đầu push 1 branch mới):

```bash
git push -u origin <ten-branch>
```

**Kiểm tra lại sau khi commit/push:**

```bash
git log --oneline -5
git status
```

**Xem branch/remote hiện có:**

```bash
git branch -vv
git remote -v
```

### Xử lý sự cố thường gặp

`git status` báo hàng trăm/nghìn file "modified" dù không sửa gì thật — thường do lệch line-ending (CRLF/LF) giữa môi trường chỉnh sửa và máy Windows, không phải lỗi thật. Kiểm tra:

```bash
git diff --stat | tail -20
git config core.autocrlf
```

Nếu đúng là lệch line-ending thuần túy (nội dung file không đổi thật), thường không cần xử lý gì trên máy Windows — git ở đó tự chuẩn hoá theo `core.autocrlf` đã cấu hình.

Muốn hủy thay đổi chưa commit (cẩn thận — mất thay đổi thật, không khôi phục được):

```bash
git restore <file>   # hủy 1 file cụ thể
git restore .         # hủy toàn bộ thay đổi chưa add trong thư mục hiện tại
```
