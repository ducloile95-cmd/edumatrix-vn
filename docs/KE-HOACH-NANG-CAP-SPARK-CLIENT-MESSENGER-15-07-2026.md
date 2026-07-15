# Kế hoạch nâng cấp Spark/client-side và phương án Messenger ngoài

Ngày cập nhật: 15/07/2026

Trạng thái hiện tại: P1/P2 đã hoàn tất. P3 đạt 85%: Worker production config đã local-ready, `ALLOWED_ORIGIN` production là `https://edumatrix-vn-576b1.web.app`, script `build:prod`/`deploy:prod` bắt buộc `--env production`; còn chờ phê duyệt Cloudflare dry-run/deploy vì thao tác đó gửi bundle/config ra bên ngoài. P4 đạt 45%: Worker/client đã hỗ trợ payload `MESSAGE_TAG` qua trường `tag`, nhưng Meta App Live, App Review, webhook production và gửi thử thật vẫn phải làm ngoài local. P5 đạt 70%: UI Staff đã hiển thị trạng thái Worker, học sinh/phụ huynh, RESPONSE/MESSAGE_TAG, đang gửi, lỗi và thành công.

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
| P1 | Hoàn tất blocker production: `PageHeader` render `h1`, lint sạch, rules tests pass. | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:rules` pass. |
| P2 | Hoàn tất tối ưu Spark quota/bundle: giảm đọc preview, giữ pagination/limit, tách Firestore khỏi đường tải ban đầu. | Auth/login không preload Firestore; dashboard preview dùng limit nhỏ hơn; build pass; full Firestore là async chunk có ngân sách 650 kB để giữ cache/realtime. |
| P3 | Hoàn thiện Worker production config. | Local-ready: `check:prod-config`, Worker typecheck và Worker tests pass; `npm run build:prod`/`deploy:prod` dùng `--env production`. Còn cần Cloudflare dry-run/deploy được phê duyệt. |
| P4 | Hoàn thiện Meta setup. | Local-prep: Worker/client hỗ trợ `tag` cho `MESSAGE_TAG`, test payload pass. Còn cần Meta App Live, Page connected, webhook verified, quyền `pages_messaging` được duyệt nếu gửi cho người dùng thật. |
| P5 | Bổ sung UI trạng thái Messenger. | Local-ready: Staff thấy rõ Worker chưa cấu hình, danh sách học sinh đang tải/lỗi, chưa chọn học sinh, chưa gắn phụ huynh, RESPONSE/MESSAGE_TAG, đang gửi, gửi thành công/thất bại. Còn cần smoke test với Worker production thật. |
| P6 | Thêm fallback không API. | Có nút mở `m.me/<page>?ref=<uid>` hoặc copy nội dung tin để Staff nhắn thủ công. |
| P7 | Kiểm thử go-live. | Gửi thử 1 tin thật, kiểm tra `message_outbox`, kiểm tra app vẫn chạy khi Worker tắt. |

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

- [ ] Core app chạy được khi `VITE_MESSENGER_WORKER_URL` rỗng.
- [ ] Không có token Meta hoặc service account trong source, bundle, `.env` commit.
- [ ] Worker production dùng đúng `--env production`.
- [x] `ALLOWED_ORIGIN` là Firebase Hosting production domain.
- [ ] Firestore Rules cấm client ghi `messenger_connections`.
- [ ] Staff gửi tin phải qua Firebase ID token.
- [ ] Viewer không có UI gửi tin từ Page.
- [x] UI Staff disable gửi Fanpage/Messenger khi thiếu `VITE_MESSENGER_WORKER_URL`.
- [x] UI Staff hiển thị trạng thái Messenger trước/sau khi gửi.
- [ ] Có fallback link `m.me` khi Worker chưa cấu hình.
- [x] Worker/client hỗ trợ `tag` cho luồng Messenger ngoài cửa sổ phản hồi.
- [ ] Có log thành công/thất bại trong `message_outbox`.
- [ ] Có hướng dẫn tắt Messenger mà không rollback toàn app.
