# Kế hoạch đồng bộ Meta Messenger Worker — 10/08/2026

## 1. Kết luận điều hành

Chưa nên triển khai hoặc gửi lại Meta App Review ngay. Code hiện build được và Worker hiện tại có đủ luồng OAuth, gửi Messenger, đăng bài, referral, đồng bộ hội thoại và webhook; tuy nhiên môi trường đang có **hai Worker production không cùng nguồn quản trị**, token Meta cục bộ không còn hợp lệ, khóa Firebase cục bộ bị thiếu, và Utility Messaging đang được bật trước khi trạng thái quyền được xác nhận.

Mục tiêu đồng bộ là đưa Git, Cloudflare, Firebase, website production và Meta App Dashboard về **một cấu hình chuẩn duy nhất**, sau đó mới quay video và gửi xét duyệt.

## 2. Phạm vi và giả định

- Chỉ kiểm tra đọc, build và test; chưa thay đổi secret, chưa deploy và chưa thay đổi cấu hình Meta.
- Website production chính: `https://edumatrix.id.vn`.
- Firebase project chính: `edumatrix-vn-576b1`.
- Worker chuẩn đề xuất: `https://edumatrix-messenger-production.ducloile99.workers.dev`, vì website production hiện đang gọi hostname này và hostname này có route mới `/api/messenger/sync-contexts`.
- Đề xuất trên chỉ trở thành quyết định sau khi xác nhận được Cloudflare account sở hữu Worker mới và quyền deploy từ CI/máy quản trị.

## 3. Hiện trạng đã xác minh

### Git và codebase

- `main`, `origin/main` và `HEAD` cùng ở commit `07a1036` (`fix bug v1`).
- Working tree không sạch: 8 thay đổi tracked đang là phần đảo ngược của commit `07a1036`, ngoài ra có `outputs/meta-app-review-guide/` và `zalo-service/` chưa track.
- Không được pull, reset, commit hoặc deploy trước khi quyết định giữ hay bỏ nhóm thay đổi này.
- Lint: đạt.
- Typecheck: đạt.
- Production build: đạt, 3.369 module được build.
- Kiểm tra mojibake: đạt.
- Worker: 50/50 test đạt; production dry-run build đạt.
- Firestore security rules: đạt.
- Frontend unit test: 274 test đạt, nhưng 1 test suite không khởi chạy vì Firebase App Check gọi `document` trong môi trường Node.

### Worker và website production

| Hạng mục | Worker mới | Worker cũ |
|---|---|---|
| Hostname | `edumatrix-messenger-production.ducloile99.workers.dev` | `edumatrix-messenger-production.edumatrix-vn.workers.dev` |
| `/health` | 200, version `a2622c69-c455-464f-891a-b45aba1381b8` | 200, version `66ae96d6-b632-43eb-94af-93767194b703` |
| `/api/messenger/sync-contexts` | Có route, trả 401 khi thiếu token | Không có route, trả 404 |
| Website production đang sử dụng | Có | Không |
| Wrangler account hiện tại nhìn thấy deployment | Không | Có |

Website production đã được kiểm tra trực tiếp và bundle đang chứa URL Worker mới. Cả hai Worker đều còn sống và đều chấp nhận CORS cho `https://edumatrix.id.vn` và Firebase Hosting.

Rủi ro chính: Worker mới không nằm trong lịch sử deployment của Cloudflare account đang đăng nhập bằng Wrangler. Vì vậy hiện chưa chứng minh được local source/commit nào tạo ra version đang chạy ở Worker mới.

### Meta API và secret

- Graph API đang dùng `v25.0`.
- Test đọc trực tiếp bằng `META_PAGE_ACCESS_TOKEN` trong `.dev.vars` đều bị Meta trả OAuth code `190`; debug token cho thấy token không hợp lệ.
- Kết luận trên chỉ áp dụng cho token tĩnh cục bộ. Production Worker có thể đang dùng token động được mã hóa trong Firestore hoặc secret khác.
- Không thể kiểm tra token động từ local vì `FIREBASE_PRIVATE_KEY` trong `.dev.vars` bị thiếu phần kết thúc của private key.
- Worker cũ có đủ tên secret cần thiết trên Cloudflare, nhưng không đọc được giá trị secret và không chứng minh được Worker mới dùng cùng secret.
- Luồng chọn Page lưu Page access token mã hóa vào `messenger_private_config/page`, sau đó Worker ưu tiên token động và chỉ fallback sang token tĩnh.
- Luồng OAuth hiện yêu cầu: `pages_show_list`, `pages_manage_metadata`, `pages_messaging`, `pages_read_engagement`, `pages_manage_posts`; khi Utility bật còn yêu cầu `page_utility_messaging`.
- Code chưa tự gọi `/{page-id}/subscribed_apps` sau khi chọn Page. Webhook subscription vì vậy phải được cấu hình thủ công hoặc bổ sung thành một bước riêng có test.

### Các lỗi/rủi ro code cần xử lý có giới hạn

1. `/api/meta/connect/start` trả 500 khi thiếu Bearer token; đúng ngữ nghĩa phải là 401, và trường hợp không phải admin phải là 403.
2. `safeConnectOrigin` tự fallback về origin đầu tiên khi nhận origin không hợp lệ. Nên từ chối origin ngoài allowlist thay vì fallback.
3. CORS cho origin ngoài allowlist trả header của origin mặc định. Trình duyệt vẫn chặn do không khớp, nhưng nên bỏ hẳn `Access-Control-Allow-Origin` cho request không hợp lệ.
4. `/health` chỉ trả Cloudflare version UUID, chưa có Git commit SHA hoặc release tag để truy vết source.
5. UI hiển thị “Đã kết nối” chỉ dựa vào việc có URL Worker/Page ID; chưa kiểm tra health, token hoặc trạng thái webhook.
6. Script production config chỉ so origin, Graph version, Page ID và cờ Utility; chưa đối chiếu Worker URL, callback URL, hostname chính, commit/version và trạng thái App Review.
7. `UTILITY_MESSAGING_ENABLED=true` ở cả frontend và Worker production dù chưa có bằng chứng quyền `page_utility_messaging` đã được cấp.

## 4. Trình tự đồng bộ đề xuất

### P0 — Đóng băng và chọn nguồn sự thật

**Thực hiện**

1. Không pull/reset/deploy khi working tree còn nhóm thay đổi đảo ngược commit `07a1036`.
2. Sao lưu diff hiện tại thành patch, sau đó quyết định một trong hai:
   - Giữ commit `07a1036`: bỏ riêng phần đảo ngược đang nằm trong working tree.
   - Loại commit `07a1036`: tạo một revert commit rõ ràng trên nhánh mới, không để thay đổi treo.
3. Xác nhận Cloudflare account sở hữu hostname `ducloile99.workers.dev` và cấp quyền Wrangler/CI cho repo này.
4. Chọn đúng một Worker production. Giữ Worker cũ chỉ như rollback tạm thời, không cấu hình song song lâu dài.

**Tiêu chí đạt**

- `git status` sạch, hoặc chỉ còn các file tài liệu đã thống nhất.
- `git rev-parse HEAD` được ghi vào release.
- Wrangler/CI liệt kê được deployment của Worker chuẩn.

**Rollback**

- Nếu chưa lấy được quyền Worker mới, không đổi website. Tạm dừng release và quyết định migrate Worker về account hiện quản lý được.

### P1 — Chuẩn hóa secret và tắt tính năng chưa được duyệt

**Thực hiện**

1. Đặt `VITE_UTILITY_MESSAGING_ENABLED=false` và `UTILITY_MESSAGING_ENABLED=false` cho đến khi Meta xác nhận quyền.
2. Tạo lại service-account private key cục bộ hợp lệ; không commit `.dev.vars`.
3. Kết nối lại Fanpage bằng OAuth để tạo Page token mới; không chép token vào URL hoặc log.
4. Cập nhật secret trên đúng Worker chuẩn: `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `META_APP_SECRET`, `META_PAGE_ACCESS_TOKEN` (fallback), `META_WEBHOOK_VERIFY_TOKEN`, `TURNSTILE_SECRET_KEY`.
5. Kiểm tra token bằng `/debug_token`, `/me/permissions`, Page ID và `/{page-id}/subscribed_apps`; chỉ ghi trạng thái/code, không ghi token.

**Tiêu chí đạt**

- Token debug có `is_valid=true`, đúng App ID và chưa hết hạn.
- Page ID trả đúng Page đã chọn.
- Có `pages_messaging`; các quyền khác chỉ yêu cầu khi tính năng tương ứng được bật.
- Utility vẫn tắt nếu `page_utility_messaging` chưa granted.

**Rollback**

- Giữ secret trước đó trong quy trình quản lý secret có version; nếu OAuth mới lỗi, rollback secret Worker nhưng không bật lại Utility.

### P2 — Sửa tối thiểu và tăng khả năng truy vết

**Thực hiện**

1. Map lỗi xác thực OAuth start thành 401/403 và thêm test.
2. Từ chối origin ngoài allowlist; thêm test CORS/OAuth origin.
3. Thêm Git SHA/release tag vào `/health` bằng biến build/deploy.
4. Sửa test bootstrap để App Check không khởi tạo trong Node hoặc dùng jsdom/mock phù hợp; khôi phục cổng `npm test` xanh hoàn toàn.
5. Mở rộng `check-production-config.mjs` để kiểm tra Worker URL chuẩn, callback URL, hostname và cờ Utility.
6. Quyết định webhook subscription:
   - Tự động gọi `/{page-id}/subscribed_apps` sau OAuth select, có xử lý lỗi và test; hoặc
   - Giữ cấu hình thủ công nhưng thêm endpoint/status check để UI chứng minh subscription đang hoạt động.

**Tiêu chí đạt**

- Lint, typecheck, build, frontend test, Worker test và rules test đều xanh.
- `/health` truy ra được đúng Git SHA.
- Request thiếu token trả 401; user không phải admin trả 403; origin lạ không nhận CORS allow-origin.

### P3 — Cấu hình Meta theo một hostname duy nhất

**Thực hiện trên Meta App Dashboard**

1. OAuth redirect URI: `https://<worker-chuan>/api/meta/connect/callback`.
2. Webhook callback: `https://<worker-chuan>/webhook`.
3. Verify token phải trùng `META_WEBHOOK_VERIFY_TOKEN` của đúng Worker.
4. Subscribe Page tối thiểu cho các trường cần chứng minh: `messages`, `messaging_postbacks`, `messaging_referrals`. Chỉ thêm trường Utility khi thực sự dùng và được duyệt.
5. Giảm permission request về đúng tính năng đem đi review; mỗi permission phải có một đoạn video chứng minh rõ ràng.

**Tiêu chí đạt**

- Meta webhook verify thành công.
- `subscribed_apps` xác nhận App đã subscribe Page.
- OAuth callback quay lại đúng hostname chuẩn, không đi qua Worker cũ.

### P4 — Deploy theo thứ tự Worker trước, website sau

**Thực hiện**

1. Deploy Worker chuẩn với Utility tắt.
2. Smoke test: health, CORS, 401/403, webhook challenge và OAuth start.
3. Chạy E2E bằng tài khoản admin: kết nối Page, chọn Page, nhận tin nhắn test, liên kết PSID và phản hồi trong cửa sổ 24 giờ.
4. Build website với `VITE_MESSENGER_WORKER_URL` trỏ đúng Worker chuẩn rồi mới deploy Hosting.
5. Kiểm tra bundle production thực tế không còn hostname cũ.
6. Theo dõi log Worker trong 24–48 giờ; sau canary mới ngừng Worker cũ.

**Tiêu chí đạt**

- Website, Worker health, Git SHA và Cloudflare deployment cùng chỉ về một release.
- Tin nhắn vào tạo/cập nhật hội thoại; tin nhắn trả lời thành công trong cửa sổ cho phép.
- Lỗi code 190 được hiển thị thành yêu cầu kết nối lại, không lộ token.

**Rollback**

- Rollback website về release liền trước.
- Worker cũ chỉ dùng rollback nếu frontend release đó không cần `/api/messenger/sync-contexts`; Worker cũ hiện trả 404 cho route này.
- Tắt Utility là kill switch mặc định.

### P5 — App Review và video bằng chứng

1. Chỉ quay sau khi P0–P4 đạt.
2. Dùng tài khoản reviewer/test user không có dữ liệu nhạy cảm.
3. Video phải quay liền mạch: URL website → đăng nhập → Settings → OAuth Facebook → chọn Page → nhận webhook → xem hội thoại → trả lời → kết quả trên Messenger.
4. Với mỗi permission, nêu chính xác thao tác nào cần quyền đó.
5. Không quay token, secret, DevTools chứa Authorization header hoặc dữ liệu học sinh thật.
6. Nếu Utility chưa được duyệt, ẩn/tắt toàn bộ UI và không đưa luồng Utility vào bản production/video thường.

## 5. Ma trận nghiệm thu cuối

| Cổng kiểm tra | Lệnh/kiểm tra | Kết quả yêu cầu |
|---|---|---|
| Git | `git status`, SHA release | Sạch và truy vết được |
| Frontend | `npm run lint && npm run typecheck && npm test && npm run build` | Tất cả exit 0 |
| Firestore | `npm run test:rules` | Exit 0 |
| Worker | `npm test && npm run build:prod` | Exit 0 |
| Worker live | `/health` | 200, đúng environment và Git SHA |
| Auth | Gọi route có/không token | 401/403/2xx đúng ngữ nghĩa |
| CORS | Hai origin hợp lệ + một origin lạ | Chỉ origin hợp lệ được allow |
| Meta token | `debug_token`, permissions | Valid, đúng App/Page, đủ quyền tối thiểu |
| Webhook | Verify + tin nhắn thật | Challenge đạt, event vào Worker |
| Production bundle | Tìm hostname Worker | Chỉ còn hostname chuẩn |
| Utility | Cờ frontend/Worker + quyền Meta | Tắt cho đến khi quyền granted |

## 6. Thứ tự commit đề xuất

1. `chore(git): resolve pending revert of 07a1036`
2. `fix(test): isolate Firebase App Check from Node tests`
3. `fix(worker): return correct auth and CORS responses`
4. `chore(worker): expose release git sha in health`
5. `chore(config): enforce canonical worker and disable utility`
6. `feat(meta): verify or automate page webhook subscription`
7. `docs(meta): update production and app-review evidence`

Mỗi commit phải độc lập, có test tương ứng và có thể revert riêng. Không gộp đổi secret, deploy Worker và deploy website vào cùng một bước không thể kiểm soát.
