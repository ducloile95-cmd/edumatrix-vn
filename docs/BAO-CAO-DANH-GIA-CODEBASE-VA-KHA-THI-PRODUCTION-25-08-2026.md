# BÁO CÁO ĐÁNH GIÁ CODEBASE VÀ TÍNH KHẢ THI PRODUCTION

**Hệ thống:** EduMatrix VN  
**Ngày tổng hợp:** 25/08/2026  
**Phạm vi:** Toàn bộ repository, 5 commit mới nhất trên `main`, ứng dụng React/Firebase, Firestore Rules, Cloudflare Worker Messenger, CI/CD, cấu hình build và các endpoint production  
**Phương pháp:** Review read-only, kiểm tra mã nguồn, đối chiếu nghiệp vụ, chạy kiểm thử tự động, build production, dependency audit và smoke test endpoint

---

## 1. Tóm tắt điều hành

Codebase EduMatrix đã có nền tảng kỹ thuật tương đối tốt, cách tổ chức nghiệp vụ rõ và có mức độ kiểm thử cao hơn nhiều dự án MVP thông thường. Kiến trúc Firebase client-first kết hợp Cloudflare Worker phù hợp với mục tiêu vận hành chi phí thấp, quy mô nhỏ và không lưu bí mật Meta trên trình duyệt.

Tuy nhiên, hệ thống **chưa nên Go-Live toàn diện** ở trạng thái hiện tại. Ba vấn đề cần ưu tiên cao nhất nằm trong module Messenger:

1. Quan hệ Messenger chưa định danh đúng khi một phụ huynh có nhiều con hoặc một học sinh có nhiều người giám hộ.
2. Worker có thể ghi đè và làm mất nhãn/metadata của hội thoại sau khi có tin nhắn mới.
3. Quy trình xóa hội thoại chưa bảo đảm xóa hết subcollection trong trường hợp có webhook ghi đồng thời.

Các vấn đề trên có thể gây sai dữ liệu, sai người tiếp nhận hoặc khiến tuyên bố xóa dữ liệu không đúng với hành vi thực tế. Đây là các lỗi cần sửa trước khi đưa Messenger vào vận hành thật.

### 1.1. Điểm đánh giá tổng hợp

| Hạng mục | Điểm | Nhận xét |
|---|---:|---|
| Kiến trúc kỹ thuật | 7.5/10 | Phù hợp quy mô nhỏ, tách secret hợp lý, cấu trúc module tương đối rõ |
| Chất lượng code | 7/10 | Type-safe, lint sạch, test tốt; vẫn có component lớn và một số mô hình ghi dữ liệu chưa an toàn |
| Bảo mật và phân quyền | 7/10 | Rules deny-by-default và test tốt; audit trail, App Check và cấu hình deploy cần hoàn thiện |
| Độ đúng nghiệp vụ | 6/10 | Phần lớn luồng giáo dục hợp lý; Messenger và quyền tài chính còn mâu thuẫn |
| Khả năng mở rộng | 5.5/10 | Đủ cho pilot nhỏ; realtime chat và dashboard fan-out chưa phù hợp quy mô lớn |
| Sẵn sàng vận hành | 5/10 | Có runbook và checklist nhưng còn nhiều mục production chưa được xác nhận |
| **Tổng thể** | **6.3/10** | **Conditional Go cho pilot; No-Go cho triển khai rộng** |

### 1.2. Quyết định đề xuất

- **Pilot nội bộ/nhóm nhỏ:** Có thể triển khai có điều kiện sau khi xử lý toàn bộ P1 và chạy E2E thật.
- **Production giới hạn:** Phù hợp với khoảng 1 Admin, 1 Teacher và dưới 50 Viewer nếu có giám sát quota.
- **Production diện rộng:** Chưa phù hợp do Messenger, audit, monitoring và chiến lược scale chưa hoàn thiện.

---

## 2. Phạm vi và trạng thái repository

### 2.1. Phạm vi Git

- Nhánh kiểm tra: `main`.
- Trạng thái khi review: worktree sạch.
- Nhánh local đang đi trước `origin/main` 5 commit.
- Phạm vi thay đổi mới: 44 file, khoảng 729 dòng thêm và 900 dòng xóa.
- Các thay đổi tập trung vào Meta Messenger, Chat UI, Firestore Rules và cấu hình Worker.

### 2.2. Quy mô codebase

- Khoảng 219 file TypeScript/TSX production.
- Khoảng 26.817 dòng code production.
- 74 file test, khoảng 6.045 dòng test.
- Không phát hiện cấu hình E2E bằng Playwright hoặc Cypress.
- Không phát hiện cấu hình Lighthouse, performance budget, Sentry hoặc OpenTelemetry.

### 2.3. Công nghệ chính

- React 19.
- React Router 8.
- TypeScript 5.6.
- Vite 6.
- Firebase 12: Authentication, Firestore, App Check và Hosting.
- Cloudflare Worker cho Meta Messenger và các secret server-side.
- Vitest và Firebase Emulator cho test.

README hiện vẫn có một số thông tin cũ, ví dụ phiên bản React và trạng thái các phase, nên chưa thể được xem là nguồn mô tả hệ thống hoàn toàn chính xác.

---

## 3. Kết quả kiểm tra tự động

| Kiểm tra | Kết quả | Ghi chú |
|---|---:|---|
| `npm run typecheck` | Pass | Không có lỗi TypeScript |
| `npm run lint` | Pass | Không có lỗi lint |
| `npm test` | 282/282 pass | 74 file test frontend/service/component |
| `npm run test:rules` | 203/203 pass | 14 file kiểm thử Firestore Rules |
| Worker `npm test` | 55/55 pass | Kiểm thử Worker Messenger |
| Tổng số test | 540 pass | Không phát hiện test fail |
| `npm run build` | Pass | Frontend production build thành công |
| Worker `npm run build:prod` | Pass | Production dry-build thành công |
| `npm audit --omit=dev` | 0 vulnerability | Không có lỗ hổng production dependency được báo cáo |
| Full root `npm audit` | 2 high, 5 moderate | Nằm trong dependency dev/CI, cần lên lịch cập nhật |
| `npm run check:mojibake` | Pass | Không phát hiện lỗi encoding theo checker |
| `git diff --check` | Pass | Không có whitespace error |
| Quét marker secret trong `dist` | Không phát hiện | Không thấy private key/secret marker phổ biến |

### 3.1. Kích thước build đáng chú ý

- Firestore chunk: khoảng 490 KB raw, 123 KB gzip.
- Charts chunk: khoảng 454 KB raw, 119 KB gzip.
- React vendor chunk: khoảng 74 KB gzip.

Các chunk này chưa phải blocker ở quy mô hiện tại, nhưng nên có bundle budget để tránh tăng không kiểm soát.

### 3.2. Smoke test production

| Endpoint | Kết quả |
|---|---|
| `https://edumatrix.id.vn` | HTTP 200 |
| `https://edumatrix-vn-576b1.web.app` | HTTP 200 |
| `https://edumatrix-messenger-production.ducloile99.workers.dev/health` | HTTP 200, `environment=production` |

Domain chính hiện trả về CSP, HSTS, `X-Content-Type-Options`, Referrer-Policy và Permissions-Policy. Tuy nhiên, các header này không được mô tả đầy đủ trong `firebase.json` hiện tại; vì vậy cấu hình production chưa tái tạo được hoàn toàn từ repository.

---

## 4. Findings P1 — Phải xử lý trước production

### P1.1. Messenger có thể gán tin nhắn sai học sinh

**Vị trí liên quan:**

- `workers/messenger/src/index.ts:1117-1124`
- `workers/messenger/src/index.ts:1352-1357`
- `workers/messenger/src/index.ts:1079-1087`

API tạo referral nhận cả `parentUid` và `studentId`, đồng thời có kiểm tra quan hệ giữa hai đối tượng. Tuy nhiên, document nonce chỉ lưu `uid`, không lưu `studentId`. Khi webhook Messenger đến, Worker đọc `users/{parentUid}.studentIds[0]` và gán hội thoại cho học sinh đầu tiên.

Liên kết thủ công có vấn đề tương tự: Worker nhận `studentId` nhưng tự chọn `student.parentUids[0]`, trong khi UI không yêu cầu Admin chọn chính xác người giám hộ.

**Tình huống lỗi:**

1. Phụ huynh có hai con A và B.
2. Giáo viên tạo referral cho con B.
3. Phụ huynh nhắn Messenger.
4. Worker chọn `studentIds[0]`, có thể là con A.
5. Thread được gắn sai lớp và sai giáo viên phụ trách.

**Tác động:**

- Sai hồ sơ học sinh.
- Sai giáo viên nhận tin.
- Sai ngữ cảnh lớp học.
- Có nguy cơ lộ thông tin giữa các học sinh trong cùng gia đình.
- Dữ liệu hội thoại khó sửa sau khi đã phát sinh nhiều message.

**Khuyến nghị:**

- Referral nonce phải lưu `parentUid`, `studentId` và mục đích sử dụng.
- `messenger_psid_links` nên lưu quan hệ cụ thể thay vì chỉ lưu `uid`.
- Nếu một PSID cần trao đổi cho nhiều học sinh, cần có cơ chế chọn ngữ cảnh rõ ràng hoặc thread riêng theo học sinh.
- UI liên kết thủ công phải yêu cầu chọn cả phụ huynh và học sinh.
- Thêm test cho phụ huynh nhiều con, học sinh nhiều người giám hộ và thay đổi lớp.

### P1.2. Tin nhắn mới có thể làm mất tag và metadata hội thoại

**Vị trí liên quan:**

- `workers/messenger/src/index.ts:561-569`
- `workers/messenger/src/index.ts:907-927`
- `src/services/firestore/chat.ts:64-74`

`writeDocument()` sử dụng Firestore REST `PATCH` nhưng không truyền update mask. Hàm `writeChatEvent()` sau đó dựng lại toàn bộ document thread nhưng không bao gồm một số trường đã được client quản lý như:

- `tagIds`
- `messengerPsid`
- `pageId`
- Các metadata mở rộng có thể được bổ sung sau này

Do đó, sau khi nhân viên gắn tag vào thread, tin nhắn inbound/outbound tiếp theo có thể thay thế document và xóa tag.

**Tác động:**

- Chức năng phân loại hội thoại không đáng tin cậy.
- Mất metadata liên kết Messenger.
- Có thể phát sinh lỗi gửi lại hoặc tra cứu thread.
- Hành vi khó phát hiện vì thao tác gắn tag ban đầu vẫn báo thành công.

**Khuyến nghị:**

- Dùng `updateDocumentFields()` với update mask cho các trường Worker sở hữu.
- Hoặc dùng transaction để đọc và cập nhật đúng các trường cần thay đổi.
- Xác định rõ ownership của từng field giữa client và Worker.
- Thêm regression test: gắn tag → nhận tin → tag vẫn tồn tại.

### P1.3. Xóa hội thoại không bảo đảm xóa toàn bộ message

**Vị trí liên quan:**

- `workers/messenger/src/index.ts:604-612`
- `src/features/chat/ChatConversationPanel.tsx:325-330`

Worker hiện liệt kê các message hiện có, sau đó commit xóa message và parent thread. Firestore không cascade xóa subcollection. Nếu webhook tạo message mới sau bước liệt kê nhưng trước lúc parent bị xóa, message đó có thể trở thành orphan.

Điều này không phù hợp với nội dung UI cam kết rằng toàn bộ tin nhắn sẽ bị xóa.

**Khuyến nghị:**

1. Chuyển thread sang trạng thái `deleting` hoặc tạo deletion tombstone.
2. Webhook phải từ chối hoặc chuyển hướng ghi đối với thread đang xóa.
3. Lặp batch delete đến khi subcollection rỗng.
4. Xóa parent document sau cùng.
5. Ghi audit log cho người thực hiện và số message đã xóa.
6. Có job kiểm tra orphan định kỳ.

---

## 5. Findings P2 — Rủi ro production đáng kể

### P2.1. Race condition ở bộ đếm tin chưa đọc

**Vị trí:**

- `workers/messenger/src/index.ts:910-923`
- `src/services/firestore/chat.ts:77-81`

Worker đọc thread, tính `unreadStaffCount + 1`, rồi ghi lại. Client đồng thời có thể đặt bộ đếm về 0. Hai thao tác không nằm trong transaction nên có thể ghi đè lẫn nhau.

**Khuyến nghị:** Dùng transaction hoặc atomic increment; bổ sung `lastReadAt`/`lastInboundAt` để xác định trạng thái đọc một cách ổn định.

### P2.2. Realtime chat tải không giới hạn thread

**Vị trí:** `src/services/firestore/chat.ts:18-25`

Admin subscribe toàn bộ `chat_threads`; Teacher subscribe toàn bộ thread có UID trong `assignedTeacherIds`. Query không có `limit`.

Ở dưới 50 người dùng, vấn đề có thể chưa rõ. Khi lịch sử hội thoại tăng, snapshot ban đầu và mỗi lần reconnect sẽ tiêu thụ nhiều reads, tăng thời gian tải và gây áp lực lên quota Spark.

**Khuyến nghị:**

- Subscribe 30–100 thread gần nhất.
- Dùng cursor để tải trang tiếp theo.
- Tách “thread đang hoạt động” và “thread lưu trữ”.
- Theo dõi số reads thực tế trong 7 ngày đầu production.

### P2.3. Không có pagination lịch sử chat

**Vị trí:** `src/services/firestore/chat.ts:28-32`

UI chỉ subscribe 50 message gần nhất và không có chức năng tải message cũ hơn.

**Khuyến nghị:** Thêm cursor theo `createdAt`/document ID, nút tải lịch sử và chính sách retention rõ ràng.

### P2.4. OAuth state đã sẵn sàng không được kiểm tra hết hạn

**Vị trí:**

- `workers/messenger/src/index.ts:1173-1177`
- `workers/messenger/src/index.ts:1229-1236`
- `workers/messenger/src/index.ts:1249-1282`

Callback kiểm tra `expiresAt` khi state còn `pending`, nhưng endpoint status/select không tái kiểm tra expiry. Encrypted Page tokens có thể tồn tại trong state lâu hơn thời hạn mong muốn nếu người dùng không hoàn tất bước chọn Page.

**Khuyến nghị:**

- Kiểm tra expiry tại mọi endpoint dùng state.
- Xóa/null `encryptedPages` khi state hết hạn hoặc lỗi.
- Thiết lập TTL hoặc scheduled cleanup.
- Ghi log trạng thái expired/used/rejected.

### P2.5. Audit log chưa đủ và không atomic

**Vị trí:**

- `src/services/firestore/auditLog.ts:7-30`
- `firebase/firestore.rules:1016-1025`

Audit log được ghi từ client, tách khỏi thao tác chính và lỗi ghi log bị nuốt. Vì vậy nghiệp vụ có thể thành công nhưng audit không tồn tại. Target type hiện giới hạn ở invite, user, settings, attendance session và gradebook.

Các thao tác chưa được audit đầy đủ:

- Tạo/sửa/xóa hóa đơn.
- Xác nhận hoặc hủy thanh toán.
- Gửi Messenger và gửi hàng loạt.
- Xóa hội thoại.
- Hủy buổi học.
- Thay đổi liên kết phụ huynh–học sinh.
- Thay đổi kết nối Meta/Drive.

Rules audit cũng chưa giới hạn chặt action enum, schema metadata, độ dài nội dung và tính bất biến sau khi ghi.

**Khuyến nghị:** Các thao tác nhạy cảm nên đi qua backend/Worker và ghi append-only audit gần với giao dịch nghiệp vụ. Cần màn hình hoặc công cụ truy vấn audit dành cho Admin.

### P2.6. Dashboard phụ huynh fan-out nhiều collection

**Vị trí:** `src/services/firestore/viewerDashboard.ts:55-88`

Một lần mở dashboard có thể đọc dữ liệu từ học sinh, lớp, khóa học, buổi học, giáo án, bài tập, bài nộp, điểm, điểm danh, hóa đơn và thông báo.

Các query hiện đã có giới hạn và chỉ đọc course liên quan, đây là cải tiến hợp lý. Tuy nhiên, cách thực hiện chưa đạt mục tiêu 1–2 reads bằng `viewer_dashboards/{uid}` được mô tả trong tài liệu thiết kế.

**Khuyến nghị:**

- Giữ cách hiện tại cho pilot nếu quota thực tế ổn định.
- Ghi metrics số reads trên mỗi lần mở dashboard.
- Khi số lượng viewer tăng, tạo materialized dashboard hoặc summary document.
- Nếu không thực hiện summary, sửa tài liệu để phản ánh kiến trúc thực tế.

### P2.7. Mâu thuẫn quyền tài chính giữa code và tài liệu

Tài liệu nghiệp vụ cho phép Teacher tạo hóa đơn hoặc xác nhận thanh toán, trong khi UI và Firestore Rules giới hạn cho Admin.

**Vị trí tham khảo:**

- `src/pages/invoices/InvoicesPage.tsx`
- `firebase/firestore.rules:1525-1556`

Giới hạn tài chính cho Admin là cách phân tách trách nhiệm hợp lý. Vấn đề nằm ở việc code và đặc tả không cùng một quyết định.

**Cần quyết định nghiệp vụ:**

- Nếu Teacher được thu tiền: bổ sung quyền, UI, audit và giới hạn theo lớp.
- Nếu chỉ Admin được xử lý tài chính: cập nhật tài liệu, permission matrix và hướng dẫn người dùng.

### P2.8. Message Outbox là mô hình dở dang

**Vị trí:**

- `src/services/firestore/chat.ts:84-90`
- `src/features/chat/ChatWorkspace.tsx:482-496`

Type, query và component Outbox vẫn còn nhưng giao diện hiện tại không sử dụng; Worker cũng không còn ghi `message_outbox` theo luồng mới.

Message trong thread vẫn có trạng thái `sent/failed`, nhưng không có một màn hình tổng hợp các lần gửi thất bại để Admin xử lý.

**Khuyến nghị:**

- Nếu Outbox không còn thuộc sản phẩm: xóa code và tài liệu chết.
- Nếu cần vận hành Messenger nghiêm túc: ghi delivery log server-side, tạo failed queue và hỗ trợ retry có kiểm soát.

### P2.9. CI chưa build cấu hình production của Worker

**Vị trí:** `.github/workflows/ci.yml:40-41`

CI chạy test và audit Worker nhưng không chạy `npm run build:prod`. Một thay đổi sai production origins, Graph API version hoặc cấu hình Wrangler vẫn có thể vượt CI.

**Khuyến nghị:** Thêm `npm run build:prod` và validation cấu hình production vào CI bắt buộc.

### P2.10. Security headers không được quản lý đầy đủ trong source

**Vị trí:** `firebase.json:11-16`

Production đang có security headers tốt, nhưng repository chỉ khai báo cache header cho static asset. Deploy lại từ trạng thái repository có thể không tái tạo đúng cấu hình đang chạy.

**Khuyến nghị:** Khai báo CSP, HSTS, `nosniff`, Referrer-Policy, Permissions-Policy và `frame-ancestors` trong cấu hình deploy; thêm smoke test kiểm tra header sau release.

### P2.11. Chưa có bằng chứng E2E production

Hệ thống có unit/component test và Firestore Rules test tốt, nhưng chưa có test xuyên suốt các dịch vụ thật:

`Invite → đăng nhập → tạo lớp → ghi danh → tạo buổi → điểm danh → bài tập → nộp bài → chấm điểm → hóa đơn → thanh toán → dashboard phụ huynh → Messenger`.

Checklist production còn 35 mục chưa đánh dấu, bao gồm:

- App Check enforcement và metrics.
- Quota alert.
- Google Drive API key restriction và smoke test.
- Messenger gửi/nhận thật.
- Responsive và accessibility QA.
- Secret-in-bundle/release evidence.
- Production smoke đầy đủ theo role.

---

## 6. Findings P3 — Nợ kỹ thuật và khả năng bảo trì

### P3.1. Tài liệu không đồng bộ với code

- README ghi React 18 trong khi package dùng React 19.
- Trạng thái một số phase trong README không còn đúng.
- Đặc tả viewer dashboard, Outbox và quyền tài chính không khớp implementation.
- Một số checklist lịch sử có thể không phản ánh bản deploy mới nhất.

**Khuyến nghị:** Chọn một tài liệu kiến trúc/nghiệp vụ làm source of truth và liên kết các checklist triển khai vào release cụ thể.

### P3.2. Component lớn

Một số file có kích thước lớn:

- `ChatWorkspace.tsx`: gần 500 dòng.
- `AttendanceMarkPanel.tsx`: hơn 470 dòng.

Các component lớn không phải lỗi tự thân, nhưng làm tăng xác suất regression và khiến kiểm thử hành vi khó hơn.

**Khuyến nghị:** Chỉ tách theo ranh giới nghiệp vụ thật như data hook, action panel, message list hoặc state machine; tránh tách component hình thức.

### P3.3. Chưa có quality gate về coverage và hiệu năng

- Không có coverage threshold.
- Không có E2E browser test.
- Không có bundle size budget.
- Không có Lighthouse CI.
- Không có runtime error monitoring.

### P3.4. Ngữ cảnh lớp học trong chat chưa rõ

**Vị trí:** `workers/messenger/src/index.ts:715-734`

Nếu học sinh có nhiều `currentClassIds`, Worker chọn lớp đầu tiên đọc được. Điều này có thể phù hợp nếu hội thoại mang tính “theo học sinh”, nhưng tên lớp hiển thị sẽ mang tính tùy ý.

**Khuyến nghị:** Quyết định rõ thread là `parent + student` hay `parent + student + class`, sau đó đồng bộ ID, UI và Rules theo quyết định đó.

---

## 7. Đánh giá theo từng nhóm nghiệp vụ

### 7.1. Người dùng, lời mời và phân quyền

**Hợp lý:**

- Role Admin/Teacher/Viewer rõ.
- Có trạng thái user và luồng lời mời.
- UI guard được hỗ trợ bởi Firestore Rules, không chỉ ẩn nút ở frontend.
- Teacher được giới hạn theo học sinh/lớp được phân công.
- Viewer đọc dữ liệu theo quan hệ học sinh.

**Chưa hợp lý hoặc cần xác nhận:**

- Cần kiểm thử E2E khi user bị khóa trong lúc đang đăng nhập.
- Cần kiểm tra toàn bộ luồng đổi quan hệ phụ huynh–học sinh đối với dữ liệu đã tồn tại.
- Audit cho thay đổi quyền và liên kết cần mạnh hơn.

### 7.2. Học sinh, lớp, khóa học và ghi danh

**Hợp lý:**

- Các entity được tách tương đối đúng trách nhiệm.
- Dùng ID xác định và batch/transaction ở các luồng quan trọng.
- Quan hệ current class và teacher phục vụ truy vấn quyền nhanh.

**Chưa hợp lý hoặc cần xác nhận:**

- Cần kiểm tra dữ liệu denormalized khi chuyển lớp hoặc thay giáo viên.
- Chat hiện lấy lớp đầu tiên, không phản ánh đầy đủ học sinh học nhiều lớp.
- Cần chạy integrity audit định kỳ và lưu bằng chứng xử lý.

### 7.3. Buổi học, giáo án và tương tác lớp học

**Hợp lý:**

- Tách session và lesson plan.
- Dùng Google Drive/external link thay vì lưu binary vào Firestore.
- Public lesson plan có định hướng không lộ private file ID.

**Chưa hợp lý hoặc cần xác nhận:**

- Chưa có smoke test production toàn bộ upload/open/refresh/unlink/delete.
- Chưa xác nhận API key restriction và permission folder thật.
- Hủy buổi học cần audit rõ hơn.

### 7.4. Điểm danh

**Hợp lý:**

- Có mô hình theo session và học sinh.
- Có logic điều chỉnh và audit cho một số thay đổi điểm danh.
- Rules tests hỗ trợ kiểm soát quyền.

**Chưa hợp lý hoặc cần xác nhận:**

- Component thao tác lớn, dễ phát sinh state phức tạp.
- Cần E2E cho cập nhật đồng thời hoặc giáo viên mất mạng.
- Cần xác nhận quy tắc khóa/chỉnh sửa điểm danh sau khi buổi học kết thúc.

### 7.5. Bài tập, bài nộp và điểm

**Hợp lý:**

- Tách assignment, submission và score.
- Viewer được giới hạn theo học sinh.
- Có snapshot và giới hạn query ở dashboard.

**Chưa hợp lý hoặc cần xác nhận:**

- Cần E2E cho nộp lại, chấm lại và xóa bài tập đã có submission.
- Audit thay đổi điểm cần bảo đảm không thất bại âm thầm.
- Cần thống nhất chính sách chỉnh sửa điểm đã công bố.

### 7.6. Hóa đơn và thanh toán

**Hợp lý:**

- VietQR và đối soát thủ công phù hợp MVP chi phí thấp.
- Hóa đơn lưu snapshot dữ liệu tài chính và người học.
- Quyền Admin-only hiện tại là lựa chọn an toàn về phân tách trách nhiệm.

**Chưa hợp lý hoặc cần xác nhận:**

- Tài liệu nói Teacher có quyền nhưng code không cho phép.
- Audit tài chính chưa đầy đủ và không atomic.
- Chưa có bằng chứng xử lý double-confirm hoặc hai Admin xác nhận đồng thời.
- Cần quy tắc rõ cho hủy, hoàn tiền và sửa hóa đơn sau thanh toán.

### 7.7. Dashboard phụ huynh

**Hợp lý:**

- Chỉ tải course liên quan thay vì toàn collection.
- Các danh sách đã có giới hạn.
- Tổng hợp đúng nhiều loại dữ liệu cần thiết cho phụ huynh.

**Chưa hợp lý hoặc cần xác nhận:**

- Số round-trip và reads cao hơn mục tiêu tài liệu.
- Chưa có cache/materialized summary.
- Chưa đo quota thực tế theo số con và số lớp.

### 7.8. Thông báo nội bộ và Messenger

**Hợp lý:**

- Tách secret khỏi frontend.
- Có xác minh signature webhook và Firebase token.
- Có CORS allowlist.
- OAuth state và Page token được mã hóa.
- Có xác minh đăng ký webhook Page.
- Utility messaging bị khóa trước khi được Meta phê duyệt.

**Không hợp lý hoặc chưa hoàn thiện:**

- Sai mô hình liên kết nhiều con/nhiều phụ huynh.
- Worker có thể ghi đè tag và metadata.
- Bộ đếm unread có race condition.
- Xóa conversation chưa an toàn.
- Chỉ hiển thị 50 message gần nhất.
- Outbox/global delivery report dở dang.
- Chưa có retry queue hoặc dashboard gửi thất bại.

### 7.9. Settings và tích hợp

**Hợp lý:**

- Tách settings công khai và private config.
- Meta Page token không nằm trong frontend.
- Có kiểm tra origin production.

**Chưa hợp lý hoặc cần xác nhận:**

- OAuth state cleanup chưa hoàn thiện.
- App Check enforcement chưa có bằng chứng.
- Cấu hình header production chưa nằm đầy đủ trong source.
- Cần phân quyền và audit thay đổi tích hợp chặt hơn.

---

## 8. Bảo mật, dữ liệu và vận hành

### 8.1. Điểm mạnh bảo mật

- Firestore Rules deny-by-default.
- Có 203 Rules tests.
- Worker xác minh JWT và webhook signature.
- CORS giới hạn production origins.
- Secret Meta nằm server-side.
- Không phát hiện private key hoặc secret marker trong frontend bundle.
- Production dependency audit không phát hiện vulnerability.
- Production domain đang có CSP và HSTS.

### 8.2. Khoảng trống bảo mật/vận hành

- App Check đã tích hợp nhưng enforcement và metrics chưa được xác nhận.
- Security headers chưa tái tạo từ repository.
- Audit log chưa đáng tin cậy cho thao tác nhạy cảm.
- Chưa có runtime error monitoring.
- Chưa có cảnh báo quota được xác nhận.
- Dev dependencies còn 2 high và 5 moderate.
- Chưa có restore drill và bằng chứng backup offsite/scheduled thành công.
- Chưa có cleanup tự động cho OAuth state và một số dữ liệu tạm.

### 8.3. Backup và phục hồi

Repository có script export, integrity audit và quy trình repair theo hướng an toàn. Đây là điểm tốt. Tuy nhiên, tồn tại script không đồng nghĩa dữ liệu production đang được backup đều đặn.

Trước Go-Live cần có bằng chứng:

1. Một bản export production thành công.
2. Nơi lưu backup tách khỏi tài khoản vận hành chính nếu có thể.
3. Kiểm tra checksum hoặc khả năng đọc file backup.
4. Restore thử một tập dữ liệu sang môi trường riêng.
5. Ghi RPO/RTO phù hợp quy mô trung tâm.

---

## 9. Đánh giá khả năng mở rộng

### 9.1. Quy mô nhỏ

Với khoảng 1 Admin, 1 Teacher và dưới 50 Viewer, kiến trúc hiện tại khả thi nếu:

- Không subscribe realtime quá nhiều collection.
- Có quota monitoring.
- Dashboard không bị mở/refetch liên tục.
- Messenger được sửa các lỗi P1.

### 9.2. Quy mô trung bình

Khi đạt hàng trăm viewer hoặc hàng nghìn thread, các điểm sau sẽ trở thành giới hạn:

- Subscribe toàn bộ chat thread.
- Dashboard fan-out nhiều query.
- Worker query bằng offset/list thủ công.
- Thiếu materialized summary.
- Thiếu monitoring và retry queue.
- Audit log client-side.

### 9.3. Quy mô lớn

Nếu hướng tới nhiều trung tâm hoặc multi-tenant, kiến trúc cần được đánh giá lại về:

- Tenant isolation trong document ID và Rules.
- Backend xử lý nghiệp vụ tài chính.
- Queue cho webhook và notification.
- Idempotency toàn bộ side effect.
- Observability tập trung.
- Backup/retention theo tenant.
- Hạn mức Firebase và Worker.

Codebase hiện chưa nên được xem là multi-tenant production-ready.

---

## 10. Kế hoạch xử lý ưu tiên

### Giai đoạn A — Release blockers

- [ ] Lưu `studentId` trong Messenger referral/link model.
- [ ] Cho Admin chọn chính xác phụ huynh khi liên kết thủ công.
- [ ] Không dùng `studentIds[0]` hoặc `parentUids[0]` làm quyết định nghiệp vụ.
- [ ] Chuyển Worker thread write sang update mask/transaction.
- [ ] Thêm test bảo toàn `tagIds`, `messengerPsid`, `pageId`.
- [ ] Thiết kế xóa conversation có tombstone và cleanup orphan.
- [ ] Thêm test nhiều con, nhiều người giám hộ và webhook đồng thời.

### Giai đoạn B — Production hardening

- [ ] Sửa unread counter bằng transaction/atomic operation.
- [ ] Thêm pagination thread và message.
- [ ] Kiểm tra expiry tại mọi endpoint OAuth state.
- [ ] Bổ sung audit server-side cho tài chính, Messenger và xóa dữ liệu.
- [ ] Thống nhất permission matrix Admin/Teacher.
- [ ] Thêm Worker production build vào CI.
- [ ] Đưa security headers vào `firebase.json`.
- [ ] Cập nhật production checklist bằng bằng chứng mới.

### Giai đoạn C — Go-Live verification

- [ ] Chạy E2E đủ ba role trên production.
- [ ] Gửi và nhận Messenger thật.
- [ ] Kiểm tra nonce dùng lại, nonce hết hạn và liên kết sai người.
- [ ] Kiểm tra Google Drive upload/open/refresh/unlink/delete.
- [ ] Xác nhận App Check metrics và enforcement.
- [ ] Cấu hình quota alert.
- [ ] Thực hiện backup và restore drill.
- [ ] Kiểm tra responsive ở 360, 768, 1024 và 1440 px.
- [ ] Kiểm tra keyboard navigation và reduced motion.
- [ ] Lưu release evidence: commit, build, Rules, Worker version và ảnh console.

### Giai đoạn D — Scale và bảo trì

- [ ] Materialize viewer dashboard nếu metrics cho thấy cần thiết.
- [ ] Thêm runtime error monitoring.
- [ ] Thêm browser E2E vào CI.
- [ ] Thiết lập coverage và bundle budget.
- [ ] Dọn Outbox/dead code và cập nhật README.
- [ ] Chia nhỏ component lớn theo ranh giới nghiệp vụ.
- [ ] Cập nhật dev dependencies có cảnh báo audit.

---

## 11. Tiêu chí Go/No-Go đề xuất

### Bắt buộc để Go

- Không còn finding P1.
- 540 test hiện tại vẫn pass và có thêm regression test Messenger.
- E2E ba role pass trên môi trường production hoặc staging tương đương.
- App Check và quota được xác nhận.
- Messenger gửi/nhận thật đúng học sinh.
- Backup và restore test thành công.
- Security headers được quản lý trong source.
- Có người chịu trách nhiệm theo dõi lỗi/quota sau release.

### No-Go nếu còn một trong các điều kiện

- Worker vẫn dùng học sinh/phụ huynh đầu tiên để định danh Messenger.
- Tin nhắn mới vẫn có thể xóa tag/metadata.
- Không chứng minh được xóa conversation đầy đủ.
- Firestore Rules production chưa khớp commit phát hành.
- App Check làm gián đoạn một trong ba role.
- Chưa có backup production đầu tiên.
- Chưa gửi/nhận Messenger thật trên Page production.

---

## 12. Kết luận cuối cùng

EduMatrix không phải một codebase yếu. Hệ thống có nhiều quyết định kỹ thuật đúng: phân quyền Firestore nghiêm túc, test Rules lớn, secrets được đưa ra khỏi frontend, dữ liệu tài chính có snapshot, các query quan trọng có giới hạn và có tài liệu vận hành.

Điểm cản production hiện tại không nằm ở việc build hoặc test cơ bản — tất cả các kiểm tra này đều pass — mà nằm ở **độ đúng của mô hình nghiệp vụ Messenger, tính nguyên tử của các thao tác dữ liệu và bằng chứng vận hành thực tế**.

Sau khi xử lý các finding P1, hoàn thành nhóm production hardening và chạy E2E thật, hệ thống có thể vận hành hợp lý cho một trung tâm nhỏ. Trước thời điểm đó, chỉ nên triển khai pilot có giám sát, dữ liệu giới hạn và kế hoạch rollback rõ ràng.

---

## 13. Tài liệu và file trọng yếu đã đối chiếu

- `package.json`
- `.nvmrc`
- `.github/workflows/ci.yml`
- `firebase.json`
- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`
- `src/services/firestore/chat.ts`
- `src/services/firestore/auditLog.ts`
- `src/services/firestore/viewerDashboard.ts`
- `src/features/chat/ChatWorkspace.tsx`
- `src/features/chat/ChatConversationPanel.tsx`
- `src/pages/chat/ChatPage.tsx`
- `src/pages/invoices/InvoicesPage.tsx`
- `workers/messenger/src/index.ts`
- `workers/messenger/wrangler.jsonc`
- `docs/CHECKLIST-TRIEN-KHAI-PRODUCTION.md`
- `docs/operations-runbook.md`

**Lưu ý:** Báo cáo phản ánh trạng thái codebase và endpoint tại thời điểm kiểm tra. Những cấu hình chỉ tồn tại trong Firebase Console, Meta Console, Google Cloud Console hoặc Cloudflare Dashboard cần được xác nhận lại trong release checklist trước mỗi lần triển khai.
