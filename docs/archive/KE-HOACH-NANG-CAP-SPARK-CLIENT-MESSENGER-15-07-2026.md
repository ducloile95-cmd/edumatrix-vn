# Kế hoạch nâng cấp Spark/client-side và phương án Messenger ngoài

Ngày cập nhật: 15/07/2026

Trạng thái hiện tại (cập nhật 18/07/2026 sau khi rà lại P1-P5): P1 đạt mục tiêu (có `h1` thật trên mỗi trang, lint/typecheck sạch) nhưng mô tả kỹ thuật cũ trong bảng lộ trình từng ghi sai component - đã sửa lại bên dưới; `npm test`/`npm run build`/`npm run test:rules` chưa xác nhận được trong sandbox (thiếu binary Rollup native và JDK 21+), cần chạy trên máy thật. P2 đạt phần lớn, còn một khoảng lệch nhỏ ở Staff dashboard - xem ghi chú trong bảng lộ trình. P3 đạt 85%: Worker production config đã local-ready, `ALLOWED_ORIGIN` production là `https://edumatrix-vn-576b1.web.app`, script `build:prod`/`deploy:prod` bắt buộc `--env production`; còn chờ phê duyệt Cloudflare dry-run/deploy vì thao tác đó gửi bundle/config ra bên ngoài. P4 đạt 45%: Worker/client đã hỗ trợ payload `MESSAGE_TAG` qua trường `tag`, nhưng Meta App Live, App Review, webhook production và gửi thử thật vẫn phải làm ngoài local. P5 đạt ~95% phạm vi local-ready: đã bổ sung nút "Nhắn mới" + chọn học sinh để bắt đầu hội thoại mới (không cần thread có sẵn), ô chọn tag RESPONSE/MESSAGE_TAG khi gửi, chỉ báo đang gửi/gửi thành công, lỗi thô từ Worker được dịch sang thông báo thân thiện, và cột Loại gửi trong Nhật ký gửi. P6 hoàn thành local-ready: fallback không API qua nút copy link mời liên kết (`m.me/<page>?ref=<uid>`) khi gửi báo `no_recipient`, và banner mở Trang Facebook khi Worker chưa cấu hình - chỉ còn thiếu Lợi điền `VITE_MESSENGER_PAGE_USERNAME` thật. P7 đã đối chiếu xong phần xác minh được từ code (checklist Go-live mục 8 và `messenger-api-setup.md` mục 12) - phần còn lại (App Review, deploy production thật, gửi thử tin thật) chỉ Lợi tự làm được từ máy có quyền truy cập Meta/Cloudflare.

Roadmap/diagram động để kiểm tra tiến trình: [roadmap-spark-client-messenger-diagram-15-07-2026.html](./roadmap-spark-client-messenger-diagram-15-07-2026.html)

## 1. Kết luận điều kiện tiên quyết

| Điều kiện | Quyết định áp dụng |
|---|---|
| Firebase Spark plan | Core app chỉ dùng Firebase Hosting, Authentication, Firestore, App Check và Firestore Security Rules. |
| Code client-side | Luồng nghiệp vụ chính chạy trong React/Vite qua Firebase Web SDK. Không dùng Cloud Functions, Cloud Run, App Hosting backend, server secret hoặc Admin SDK trong core app. |
| Facebook Messenger | Không thể gọi trực tiếp từ browser một cách an toàn vì Meta Page Access Token/App Secret sẽ bị lộ. Messenger phải là nhánh tích hợp ngoài core Spark. |
| Kênh thông báo chính | `announcements` trong Firestore là kênh chính. Messenger chỉ là kênh bổ sung, có thể tắt mà không làm hỏng webapp. |

## 2. Phương án kết nối Facebook/Messenger API

| Phương án | Mô tả | Phù hợp Spark/client-side? | Ưu điểm | Rủi ro/điều kiện | Khuyến nghị |
|---|---|---:|---|---|---|
| A. Cloudflare Worker ngoài Firebase | Frontend gửi Firebase ID token tới Worker; Worker giữ Meta token trong secret, kiểm tra quyền Staff, gọi Meta Graph API và ghi log. | Có điều kiện: core app vẫn Spark/client-side, Messenger là external integration. | Chi phí thấp, không cần Firebase Blaze, token không nằm trong browser, repo đã có `workers/messenger`. | Cần Cloudflare account, secret riêng, App Review của Meta, vận hành thêm một deployment ngoài Firebase. | Nên dùng nếu cần gửi Messenger tự động. |
| B. Vercel/Netlify Function ngoài Firebase | Tương tự Worker nhưng deploy bằng Vercel/Netlify serverless. | Có điều kiện. | Dễ triển khai nếu đã dùng nền tảng đó. | Có cold start, quota/chi phí riêng, vẫn là backend ngoài. | Phương án dự phòng, không ưu tiên khi đã có Worker. |
| C. VPS/server nhỏ | Tự chạy API proxy Messenger trên server riêng. | Có điều kiện. | Toàn quyền kiểm soát. | Tốn vận hành, bảo mật, SSL, update, monitoring. | Không nên cho quy mô nhỏ. |
| D. Không dùng API, chỉ mở link `m.me` | App hiển thị link Messenger/Page để Staff nhắn thủ công. | Có, thuần client-side. | Không cần token, không cần backend, an toàn nhất. | Không tự động gửi, không có log gửi tự động, phụ thuộc thao tác thủ công. | Dùng làm fallback hoặc MVP nếu muốn giữ 100% client-side. |
| E. Firebase Cloud Functions | Dùng function giữ Meta token và gọi Graph API. | Không phù hợp Spark. | Tích hợp Firebase tốt. | Cloud Functions không thuộc Spark theo bảng giá Firebase; cần Blaze. | Chỉ dùng nếu chấp nhận chuyển Blaze. |

## 3. Kiến trúc khuyến nghị

```text
Core Spark/client-side
React/Vite frontend
  -> Firebase Auth
  -> Firestore Client SDK
  -> Firestore Security Rules
  -> Firebase Hosting

Messenger ngoài Firebase
React/Vite frontend
  -> Firebase ID token
  -> Cloudflare Worker
       -> verify Firebase ID token
       -> kiểm tra users/{uid}.role/status
       -> giữ Meta Page Access Token trong Worker Secret
       -> gọi Meta Graph API /me/messages
       -> ghi message_outbox
```

Nguyên tắc: Nếu Worker lỗi, hết quota, sai CORS hoặc Meta từ chối quyền, webapp vẫn phải chạy bình thường; chỉ chức năng gửi Messenger bị disabled hoặc báo lỗi cục bộ.

## 4. Ranh giới bảo mật

| Ranh giới | Bắt buộc |
|---|---|
| Browser | Chỉ có Firebase public config và `VITE_MESSENGER_WORKER_URL`; không có Page Access Token, App Secret, service account JSON hoặc private key. |
| Worker | Giữ Meta token và Firebase service credentials bằng secret; không log secret; chỉ nhận request có Firebase ID token hợp lệ. |
| Firestore Rules | Vẫn là lớp bảo mật chính cho core app. Không dùng UI guard thay Rules. |
| Messenger recipient | Chỉ gửi tới PSID đã liên kết qua webhook/referral hoặc qua dữ liệu đã được xác thực. |
| Audit | Mỗi lần gửi cần ghi `message_outbox` với actor, loại tin, trạng thái, thời điểm và lỗi rút gọn nếu thất bại. |

## 5. Lộ trình cập nhật kế hoạch

| Giai đoạn | Việc cần làm | Tiêu chí hoàn thành |
|---|---|---|
| P0 | Chốt core app không phụ thuộc Messenger. Ẩn hoặc disable Messenger nếu thiếu `VITE_MESSENGER_WORKER_URL`. | Deploy Spark vẫn dùng được toàn bộ quản lý lớp, học phí, thông báo nội bộ khi không có Worker. |
| P1 | Hoàn tất blocker production: có `h1` thật trên mỗi trang (thực tế render qua `Topbar.tsx`, không phải `PageHeader` như mô tả cũ - `PageHeader` không render `h1`, các prop `title`/`description`/`eyebrow` của nó khai báo nhưng không dùng; mục tiêu accessibility vẫn đạt, chỉ là mô tả kỹ thuật cũ sai), lint sạch, rules tests pass. | `npm run lint`, `npm run typecheck` pass (đã xác nhận trong sandbox 18/07); `npm test`, `npm run build`, `npm run test:rules` cần chạy trên máy thật (sandbox thiếu binary Rollup native và JDK 21+). |
| P2 | Hoàn tất tối ưu Spark quota/bundle: giảm đọc preview, giữ pagination/limit, tách Firestore khỏi đường tải ban đầu. | Auth/login không preload Firestore; Viewer dashboard preview dùng limit nhỏ hơn trang danh sách đầy đủ; build pass; full Firestore là async chunk có ngân sách 650 kB để giữ cache/realtime. **Ghi chú rà lại 18/07:** Staff dashboard (`staffDashboard.ts`) hiện dùng lại nguyên `listClasses()`/`listSessions()` với cùng limit (200/300) như trang danh sách đầy đủ, chưa có limit preview riêng nhỏ hơn như Viewer dashboard - lệch nhẹ so với tiêu chí, chưa sửa vì ngoài phạm vi P5. |
| P3 | Hoàn thiện Worker production config. | Local-ready: `check:prod-config`, Worker typecheck và Worker tests pass; `npm run build:prod`/`deploy:prod` dùng `--env production`. Còn cần Cloudflare dry-run/deploy được phê duyệt. |
| P4 | Hoàn thiện Meta setup. | Local-prep: Worker/client hỗ trợ `tag` cho `MESSAGE_TAG`, test payload pass. Còn cần Meta App Live, Page connected, webhook verified, quyền `pages_messaging` được duyệt nếu gửi cho người dùng thật. |
| P5 | Bổ sung UI trạng thái Messenger. | **Local-ready, cập nhật 18/07:** Staff thấy rõ Worker chưa cấu hình; có nút "Nhắn mới" trong tab Hội thoại mở picker chọn học sinh (tìm kiếm theo tên/mã, tự scope theo teacher/admin qua `listStudents()`) để bắt đầu hoặc tiếp tục hội thoại mà không cần thread có sẵn - `handleSend` phía Worker đã tự resolve PSID và tạo `chat_threads` từ `studentId`, không cần sửa Worker/Rules; sau khi gửi lần đầu thành công, danh sách hội thoại tự làm mới và tự chọn hội thoại vừa tạo. Có ô nhập tag tùy chọn (RESPONSE mặc định / MESSAGE_TAG khi nhập tag) ở cả hội thoại có sẵn lẫn hội thoại mới, kiểm tra định dạng `A-Z`/`_` phía client trước khi gửi. Có chỉ báo "Đang gửi..." và "Đã gửi thành công." Lỗi thô từ Worker (`no_recipient`, `invalid_message_tag`, `student_scope_denied`, `staff_required`, `missing_bearer_token`, `meta_...`) được dịch sang thông báo tiếng Việt qua `friendlyMessengerError()` thay vì hiện mã lỗi thô. Nhật ký gửi có thêm cột Loại gửi (RESPONSE/TAG · tên tag). Còn thiếu duy nhất: smoke test với Worker production thật, và xác minh tag cụ thể có được Meta App Review chấp nhận hay không (phụ thuộc P4). |
| P6 | Thêm fallback liên kết an toàn. | **Local-ready, cập nhật 19/07:** Staff yêu cầu Worker tạo nonce ngẫu nhiên dùng một lần, hạn 24 giờ; link `m.me/<page>?ref=<nonce>` không lộ Firebase UID. Webhook dùng atomic commit, từ chối nonce hết hạn/đã dùng và không ghi đè PSID đã liên kết tài khoản khác. Firestore Rules cấm mọi client truy cập nonce và reverse-index. Còn cần điền `VITE_MESSENGER_PAGE_USERNAME` thật khi có Page để tính năng hiện ra. |
| P7 | Kiểm thử go-live. | **Đối chiếu 18/07:** đã rà lại toàn bộ checklist Go-live (mục 8 dưới đây, và `docs/messenger-api-setup.md` mục 12) từng dòng với code/config thật, tick các mục xác minh được từ sandbox kèm bằng chứng cụ thể. Phần còn lại - App Meta chuyển Live/App Review, deploy Worker production thật, gửi thử 1 tin thật + kiểm tra `message_outbox` - đều cần thao tác trên Cloudflare/Meta dashboard thật, chỉ Lợi tự làm được từ máy có quyền truy cập. |

### Chính sách P2 quota/bundle

- Giữ full Firestore SDK cho phần cần offline persistence/cache và realtime profile `users/{uid}`; không chuyển hàng loạt sang `firestore/lite` vì sẽ mất cache và có thể tăng read quota trên Spark.
- Firestore không được nằm trong preload ban đầu của login/auth. Build phải cho thấy `dist/index.html` không preload `firebase-firestore`.
- Query preview/dashboard phải có limit nhỏ hơn query trang chi tiết. Trang danh sách lớn phải dùng pagination hoặc page size cố định.
- Realtime listener chỉ dùng cho dữ liệu cần cập nhật tức thì; không dùng listener rộng trên collection lớn.
- Async chunk `firebase-firestore` có ngân sách 650 kB trong Vite. Nếu vượt ngân sách này thì quay lại tách route/query hoặc đánh giá lại `firestore/lite` theo từng module.

## 6. Điều kiện Meta cần chuẩn bị

| Hạng mục | Ghi chú |
|---|---|
| Meta Developer App | Cần app liên kết với Facebook Page của trung tâm. |
| Page Access Token | Phải nằm trong secret của Worker, không nằm trong frontend. Nên dùng cơ chế token dài hạn/System User nếu đủ điều kiện Business. |
| App Secret | Chỉ dùng trong Worker để xác thực webhook signature. |
| Webhook | Dùng để nhận referral/linking event và lưu PSID vào `messenger_connections/{uid}`. |
| App Review | Gửi tin thật qua Page thường cần quyền phù hợp như `pages_messaging`; post bài cần quyền quản lý post/page tương ứng. |
| Chính sách nhắn tin | Tin Messenger chịu giới hạn chính sách Meta, ví dụ cửa sổ phản hồi tiêu chuẩn và tag hợp lệ cho một số loại tin. |

### Chính sách P4 Messenger tag

- Mặc định Worker vẫn gửi `messaging_type: "RESPONSE"` để không đổi hành vi hiện tại.
- Khi frontend truyền `tag`, Worker gửi `messaging_type: "MESSAGE_TAG"` và thêm `tag` vào payload Meta; đồng thời ghi `messageTag` vào `message_outbox` để audit.
- Worker chỉ kiểm tra định dạng tag ở mức local (`A-Z` và `_`). Việc tag có được dùng cho nội dung cụ thể hay không phụ thuộc chính sách Meta/App Review và phải xác minh khi smoke test thật.
- Không đưa Page Access Token, App Secret hoặc service account vào browser; Messenger API tự động tiếp tục là nhánh ngoài Firebase Spark.

## 7. Quyết định triển khai

| Câu hỏi | Quyết định |
|---|---|
| Có phương án kết nối Facebook API để chạy Messenger ngoài không? | Có. Phương án nên dùng là Cloudflare Worker ngoài Firebase. |
| Có giữ được Firebase Spark không? | Có, nếu coi Messenger là nhánh ngoài Firebase và core app không phụ thuộc Worker. |
| Có giữ được code client-side không? | Có cho core app. Không thể giữ 100% client-side cho Messenger API tự động vì cần bảo vệ secret. |
| Nếu muốn 100% client-side thì làm sao? | Chỉ dùng link `m.me`/copy nội dung để Staff gửi thủ công, không gọi Meta API từ app. |

## 8. Go/No-Go checklist

**Ghi chú rà lại 18/07/2026:** các mục dưới đây đã được đối chiếu trực tiếp với code/config trong repo (không phải suy đoán). Mục nào chỉ xác nhận được bằng thao tác thật trên Cloudflare/Meta dashboard (deploy, App Review, gửi thử) thì giữ nguyên chưa tick - chỉ Lợi tự làm được từ máy thật.

- [x] Core app chạy được khi `VITE_MESSENGER_WORKER_URL` rỗng. (`configured` trong `ChatPage.tsx` gate toàn bộ UI Messenger; `.env`/`.env.local` hiện để trống và app chạy bình thường suốt các lần build/typecheck trong sandbox)
- [x] Không có token Meta hoặc service account trong source, bundle, `.env` commit. (`.env`/`.env.example` chỉ chứa Firebase public config; `.gitignore` chặn `.env`, `.env.local`, `.dev.vars*`; secret Worker chỉ đặt qua `wrangler secret put`, không xuất hiện trong repo)
- [ ] Worker production dùng đúng `--env production`. (local-ready: `workers/messenger/package.json` bắt buộc `--env production` trong cả `build:prod` và `deploy:prod` - script đã enforce sẵn; còn cần Lợi tự deploy thật để xác nhận)
- [x] `ALLOWED_ORIGIN` là Firebase Hosting production domain.
- [x] Firestore Rules cấm client ghi `messenger_connections`. (`firebase/firestore.rules` - `match /messenger_connections/{uid}` có `allow write: if false`)
- [x] Staff gửi tin phải qua Firebase ID token. (`sendMessenger`/`postToPage` trong `client.ts` luôn gắn `Authorization: Bearer <idToken>`; Worker `requireStaff()` xác thực token trước khi xử lý)
- [x] Viewer không có UI gửi tin từ Page. (`app/router.tsx` - `ROUTES.STAFF_CHAT` chỉ role admin/teacher; không route Viewer nào trỏ tới ChatPage/Composer/PostQueueList)
- [x] UI Staff disable gửi Fanpage/Messenger khi thiếu `VITE_MESSENGER_WORKER_URL`.
- [x] UI Staff hiển thị trạng thái Messenger trước/sau khi gửi.
- [x] Có fallback link `m.me` khi Worker chưa cấu hình. (mới hoàn thành 18/07 - P6: nút copy link mời phụ huynh liên kết khi gửi báo `no_recipient`, banner mở Trang Facebook khi Worker chưa cấu hình; cần biến `VITE_MESSENGER_PAGE_USERNAME` - hiện để trống, Lợi tự điền khi có Page thật, tính năng tự ẩn nếu chưa điền)
- [x] Worker/client hỗ trợ `tag` cho luồng Messenger ngoài cửa sổ phản hồi.
- [x] Có log thành công/thất bại trong `message_outbox`. (Worker `handleSend`/`handlePost` luôn ghi `message_outbox` với `status: sent|failed`, kể cả khi Meta từ chối)
- [x] Có hướng dẫn tắt Messenger mà không rollback toàn app. (`docs/messenger-api-setup.md` mục 6: để trống `VITE_MESSENGER_WORKER_URL` thì app vẫn chạy, chỉ Messenger tạm tắt)
