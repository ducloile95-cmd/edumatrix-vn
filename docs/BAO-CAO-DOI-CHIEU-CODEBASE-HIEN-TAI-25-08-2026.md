# BÁO CÁO ĐỐI CHIẾU ĐÁNH GIÁ PRODUCTION VỚI CODEBASE HIỆN TẠI

**Hệ thống:** EduMatrix VN  
**Ngày đối chiếu:** 25/08/2026  
**Tài liệu nguồn:** `BAO-CAO-DANH-GIA-CODEBASE-VA-KHA-THI-PRODUCTION-25-08-2026.md`  
**Phương pháp:** đọc độc lập tài liệu nguồn, kiểm tra trực tiếp working tree, chạy lại quality gates và smoke test read-only các endpoint production.

---

## 1. Kết luận điều hành

Kết luận quan trọng nhất của báo cáo gốc vẫn đúng: **không nên Go-Live Messenger cho dữ liệu thật khi ba lỗi P1 chưa được sửa**. Code hiện tại vẫn có đủ bằng chứng cho cả ba lỗi:

1. Quan hệ Messenger vẫn bị rút gọn sai khi một phụ huynh có nhiều con hoặc một học sinh có nhiều người giám hộ.
2. Worker vẫn ghi thay toàn bộ document thread, có thể làm mất `tagIds`, `messengerPsid`, `pageId` và metadata ngoài ownership của Worker.
3. Xóa conversation vẫn chỉ liệt kê message một lần rồi xóa parent, không khóa webhook ghi đồng thời và không kiểm tra subcollection đã rỗng.

Tuy nhiên, báo cáo gốc **không còn phản ánh chính xác codebase đang checkout** ở một số điểm quan trọng:

- Phạm vi Git trong báo cáo sai: checkout hiện tại là `codex/meta-sync-full-fix` tại `60c4862`, không phải `main`.
- Nhánh hiện tại lệch `origin/main` theo hai phía: 19 commit chỉ có ở HEAD và 6 commit chỉ có ở `origin/main`.
- `firebase.json` trên nhánh hiện tại đã quản lý security headers; finding P2.10 chỉ còn đúng với `origin/main`, nơi các header này đang bị thiếu.
- UI và Firestore Rules hiện đã cho Teacher tạo hóa đơn và xác nhận thanh toán trong phạm vi được phân công; finding P2.7 của báo cáo gốc đã lỗi thời.
- Bộ test hiện tại là 305 frontend + 214 Rules + 55 Worker = **574 test**, không phải 540.
- Full dependency audit hiện có **5 moderate, 0 high**, không còn 2 high + 5 moderate.

### Quyết định cập nhật

- **Messenger production:** No-Go.
- **Triển khai toàn hệ thống từ `origin/main`:** No-Go cho đến khi hòa giải divergence và xác nhận lại các file bị xóa/thay đổi, đặc biệt `firebase.json`, Rules, indexes và UI.
- **Pilot không bật Messenger:** Có thể cân nhắc có điều kiện sau khi khóa đúng release baseline, chạy E2E ba role, xác nhận App Check/quota và có backup/restore evidence.
- **Pilot có Messenger:** Chỉ dùng dữ liệu thử nghiệm; không dùng dữ liệu phụ huynh/học sinh thật trước khi xử lý P1.

---

## 2. Phạm vi Git thực tế

| Nội dung | Báo cáo gốc | Đối chiếu hiện tại |
|---|---|---|
| Nhánh | `main` | `codex/meta-sync-full-fix` |
| HEAD | Không ghi rõ | `60c4862` |
| Worktree | Sạch | Không sạch: hai báo cáo ngày 25/08 đang untracked; báo cáo đối chiếu này được tạo mới |
| Quan hệ với remote | Local `main` đi trước 5 commit | HEAD và `origin/main` đã diverge: 19 commit bên HEAD, 6 commit bên remote |
| Local `main` | Được xem là nhánh kiểm tra | `main` local ở `07a1036`, đang sau `origin/main` 6 commit |

Đây không chỉ là sai số tài liệu. Hai nhánh khác nhau đáng kể về Rules, indexes, security headers, UI, test và asset. Vì vậy cần chọn một release candidate duy nhất trước khi sửa lỗi hoặc deploy; không nên lấy kết quả test của nhánh hiện tại để chứng minh cho `origin/main`.

---

## 3. Kết quả kiểm tra lại

| Kiểm tra | Kết quả hiện tại | So với báo cáo gốc |
|---|---:|---|
| `npm run typecheck` | Pass | Không đổi |
| `npm run lint` | Pass | Không đổi |
| `npm test` | 305/305 pass khi chạy lại độc lập | Tăng từ 282 lên 305 |
| `npm run test:rules` | 214/214 pass | Tăng từ 203 lên 214 |
| Worker `npm test` | 55/55 pass | Không đổi |
| Tổng test | 574 pass | Tăng từ 540 lên 574 |
| `npm run build` | Pass | Không đổi |
| Worker `npm run build:prod` | Pass | Không đổi |
| `npm run check:mojibake` | Pass | Không đổi |
| `npm audit --omit=dev` | 0 vulnerability | Không đổi |
| Full `npm audit` | 5 moderate, 0 high | Tốt hơn số liệu cũ |

Lần chạy frontend đầu tiên trong lúc nhiều quality gate chạy song song có 1 lỗi tại `ScoresPage.test.tsx` do không tìm thấy option “Lớp 10A”. Test này pass khi chạy riêng và toàn bộ suite pass khi chạy lại độc lập. Đây chưa phải regression chức năng đã chứng minh, nhưng là dấu hiệu test có thể nhạy với tải/timing và nên theo dõi nếu tái diễn trên CI.

### Build production

Các chunk lớn nhất vẫn gần số liệu báo cáo gốc:

- Firestore: 490,18 KB raw / 122,83 KB gzip.
- Charts: 454,38 KB raw / 118,96 KB gzip.
- React vendor: 240,21 KB raw / 74,32 KB gzip.
- Entry app: 272,00 KB raw / 86,00 KB gzip.

Chưa có bundle budget nên finding về quality gate hiệu năng vẫn còn đúng.

---

## 4. Đối chiếu từng finding

### 4.1. P1 — Release blockers

| Finding gốc | Trạng thái | Bằng chứng hiện tại |
|---|---|---|
| P1.1 Gán sai học sinh/người giám hộ | **Xác nhận** | Nonce chỉ lưu `uid`; PSID link chỉ lưu `uid`; webhook vẫn dùng `users.studentIds[0]`; liên kết thủ công vẫn dùng `students.parentUids[0]`. `threadId` trong PSID link còn có thể bị tái sử dụng giữa các ngữ cảnh học sinh. |
| P1.2 Mất tag/metadata sau tin mới | **Xác nhận** | `writeDocument()` gọi REST `PATCH` không có update mask. `writeChatEvent()` dựng lại thread nhưng không giữ `tagIds`, `messengerPsid`, `pageId`. Chưa có regression test bảo toàn field. |
| P1.3 Xóa conversation không đầy đủ | **Xác nhận** | `deleteChatConversation()` list message một lần, commit xóa message và parent; không có tombstone/deleting state, vòng lặp đến rỗng, audit hay orphan cleanup. |

Ba finding trên cũng còn xuất hiện trong source của `origin/main`; chưa có nhánh nào được kiểm tra ở đây đã sửa chúng.

### 4.2. P2 — Rủi ro production

| Finding gốc | Trạng thái | Điều chỉnh cần ghi nhận |
|---|---|---|
| P2.1 Race unread counter | **Xác nhận** | Worker vẫn đọc `unreadStaffCount`, cộng 1 rồi ghi; client đặt về 0 bằng update riêng. Không transaction/atomic increment. |
| P2.2 Realtime thread không giới hạn | **Xác nhận, mức rủi ro cao hơn mô tả** | Admin subscribe toàn bộ thread. Teacher hiện subscribe danh sách student rồi mở một listener thread cho từng student, đều không `limit`; ngoài read volume còn có listener fan-out. |
| P2.3 Không pagination message | **Xác nhận** | Chỉ subscribe 50 message mới nhất; không có cursor/load older. |
| P2.4 OAuth ready state không kiểm tra expiry | **Xác nhận** | `metaConnectState()` chỉ kiểm tra state, uid; status/select không kiểm tra `expiresAt`. |
| P2.5 Audit log yếu, không atomic | **Xác nhận** | Audit vẫn ghi client-side, catch rồi chỉ `console.error`; enum/target còn hẹp và không bao phủ tài chính, Messenger, xóa conversation, hủy buổi học, thay đổi tích hợp. |
| P2.6 Viewer dashboard fan-out | **Xác nhận** | Có limit hợp lý, nhưng vẫn đọc theo student/class/course và 8 nhóm dữ liệu; chưa có materialized dashboard hay metrics read/session. |
| P2.7 Mâu thuẫn quyền tài chính | **Không còn đúng với checkout hiện tại** | UI cho Admin hoặc Teacher quản lý; Rules cho Teacher tạo invoice theo class được phân công và xác nhận payment theo student scope. Cần cập nhật báo cáo/tài liệu thành quyết định hiện hành, không mở thêm quyền. |
| P2.8 Outbox dở dang | **Xác nhận** | Type, query và component `Outbox` còn tồn tại nhưng không được render; Worker không ghi `message_outbox`. Checklist vẫn yêu cầu đối chiếu collection này nên cũng đã lỗi thời. |
| P2.9 CI không build Worker production | **Xác nhận** | Job Worker chỉ `npm ci`, test và audit; thiếu `check:prod-config`/`build:prod`. |
| P2.10 Headers không nằm trong source | **Đã sửa trên checkout, vẫn lỗi trên `origin/main`** | Nhánh hiện tại khai báo CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy và `frame-ancestors`. `origin/main` không có các header này. |
| P2.11 Chưa có E2E production | **Xác nhận** | Không có Playwright/Cypress; checklist còn 35 mục chưa tick và 5 mục đã tick cũng ghi rõ chưa xác nhận lại Console. |

### 4.3. P3 — Nợ kỹ thuật

| Finding gốc | Trạng thái | Ghi chú cập nhật |
|---|---|---|
| README/tài liệu lệch code | **Xác nhận** | README vẫn ghi React 18 trong khi package dùng React 19.2.7; phần Phase còn ghi chưa chạy Rules test. Checklist vẫn nhắc Outbox đã không còn trong luồng. |
| Component lớn | **Xác nhận** | `ChatWorkspace.tsx` 496 dòng; `AttendanceMarkPanel.tsx` 472 dòng. Chỉ nên tách theo ranh giới nghiệp vụ khi sửa liên quan. |
| Thiếu coverage/performance/runtime gates | **Xác nhận** | Không coverage threshold, browser E2E, Lighthouse, bundle budget, Sentry hay OpenTelemetry. |
| Ngữ cảnh lớp trong chat tùy ý | **Xác nhận** | `threadContext()` lấy class tồn tại đầu tiên trong `currentClassIds`; chưa có quyết định rõ thread theo student hay student + class. |

---

## 5. Findings mới hoặc được nâng mức

### N1. Release baseline đang không xác định — Blocker vận hành

Working tree, local `main` và `origin/main` là ba trạng thái khác nhau. `origin/main` còn chứa thay đổi lớn/xóa nhiều file so với HEAD hiện tại. Deploy từ nhánh sai có thể làm mất security headers, indexes, test hoặc tính năng đang chạy.

**Hành động:** chọn commit release candidate, review diff theo nhóm chức năng, merge/rebase có kiểm soát, sau đó chạy lại toàn bộ gate trên đúng commit đó. Không dùng cụm từ “main hiện tại” cho đến khi ba trạng thái được hòa giải.

### N2. Có hai Worker production đang hoạt động — P2 vận hành/bảo mật

Smoke test ngày 25/08/2026:

- Endpoint canonical trong `.env.real`: `edumatrix-messenger-production.edumatrix-vn.workers.dev`, HTTP 200, release `ad64de11e607`.
- Endpoint cũ được báo cáo gốc kiểm tra: `edumatrix-messenger-production.ducloile99.workers.dev`, HTTP 200, release `e5ba6ea667f1`.

Frontend production hiện tham chiếu endpoint canonical `edumatrix-vn`; endpoint `ducloile99` không còn được frontend hiện tại sử dụng nhưng vẫn công khai. Điều này tạo nhầm lẫn vận hành, duy trì một phiên bản cũ và có thể để lại webhook/secret/cấu hình chưa được quản trị đồng nhất.

**Hành động:** xác minh Meta webhook đang trỏ endpoint nào, kiểm tra traffic/log, thu hồi secret và vô hiệu hóa Worker cũ nếu không còn consumer; ghi một endpoint duy nhất vào runbook.

### N3. Báo cáo test pass cần gắn với cách chạy

Suite pass hoàn toàn khi chạy độc lập, nhưng một test UI đã fail khi chạy đồng thời với các gate khác rồi pass lại. Không nâng thành blocker lúc này; nếu tái diễn trong CI, cần sửa synchronization/mocking thay vì tăng timeout tùy ý.

### N4. Source và production hiện khớp header, nhưng remote main có thể làm regression

Hai frontend endpoint trả HTTP 200 và có CSP/HSTS. Các asset hash trên production trùng build hiện tại. Đây là bằng chứng tốt cho checkout hiện tại, nhưng không chứng minh `origin/main` an toàn để deploy vì remote đang thiếu khai báo header.

---

## 6. Đánh giá kiến trúc và khả năng production sau đối chiếu

### Phần có nền tảng tốt

- Typecheck, lint, build và 574 test pass khi chạy độc lập.
- Rules có độ phủ lớn và deny-by-default.
- Worker giữ Meta secret server-side, xác minh Firebase token và webhook signature.
- Production dependency audit sạch.
- Security headers đang tồn tại cả trong checkout hiện tại và endpoint đang chạy.
- Các luồng học vụ chính có nhiều kiểm tra schema, transaction và Rules scope.

### Phần chưa đủ để production

- Mô hình định danh Messenger sai ở trường hợp gia đình nhiều con/nhiều người giám hộ.
- Ownership field trên thread chưa được thiết kế; full-document write có thể gây mất dữ liệu.
- Xóa dữ liệu, unread counter và audit chưa đủ tính nguyên tử.
- Không có E2E xuyên dịch vụ, monitoring runtime, quota evidence, App Check enforcement evidence hay restore drill.
- Release branch không thống nhất và tồn tại hai Worker production.
- Realtime/listener và dashboard fan-out mới phù hợp pilot nhỏ, chưa có đo lường thực tế.

Không nên coi điểm 6,3/10 của báo cáo gốc là một quality gate có thể tái lập vì tài liệu không định nghĩa trọng số/rubric đo. Kết luận định tính “conditional pilot, no-go rộng” vẫn hợp lý; trạng thái Messenger và release management hiện quan trọng hơn điểm số tổng hợp.

---

## 7. Thứ tự xử lý đề xuất

### A. Blocker trước mọi release mới

1. Chọn và khóa một release candidate; hòa giải `codex/meta-sync-full-fix`, local `main` và `origin/main`.
2. Thiết kế khóa định danh Messenger tối thiểu là `parentUid + studentId`; lưu `studentId` trong nonce và PSID relationship; UI liên kết thủ công phải chọn đúng parent + student.
3. Chuyển ghi thread sang update mask/transaction theo field ownership; thêm regression test giữ nguyên tag và metadata.
4. Thiết kế xóa với tombstone/deleting state, chặn webhook, lặp delete đến rỗng, xóa parent cuối cùng và audit.
5. Sửa unread bằng transaction hoặc mô hình `lastInboundAt`/`lastReadAt`.
6. Kiểm tra OAuth expiry tại status/select, xóa encrypted pages khi hết hạn và có cleanup TTL/job.

### B. Production hardening

1. Thêm `npm run build:prod` hoặc ít nhất `check:prod-config` vào CI Worker.
2. Giới hạn/paginate thread, thêm pagination message; tránh một listener cho mỗi student.
3. Chuyển audit thao tác nhạy cảm sang backend/Worker và thiết kế append-only queryable audit.
4. Quyết định xóa hẳn Outbox hay phục hồi delivery log server-side; đồng bộ checklist.
5. Xác minh và tắt Worker production cũ.
6. Cập nhật README, permission matrix và production checklist theo implementation hiện tại.

### C. Go-Live evidence

1. E2E ba role trên đúng release candidate.
2. E2E gia đình nhiều con/nhiều guardian và gửi/nhận Messenger thật.
3. App Check metrics/enforcement và quota alert có ảnh/bằng chứng.
4. Backup production và restore drill sang môi trường riêng.
5. Smoke Google Drive đầy đủ; responsive/keyboard/reduced-motion QA.
6. Lưu commit, Firebase Hosting release, Rules/index deployment và Worker version trong release record.

---

## 8. Tiêu chí Go/No-Go cập nhật

### Go có điều kiện

- Release candidate duy nhất, không còn divergence chưa giải quyết trong quy trình deploy.
- Không còn ba P1 Messenger và có regression test tương ứng.
- Tất cả 574 test hiện tại pass trên đúng commit phát hành; không bỏ qua test flaky.
- E2E ba role và Messenger multi-child/multi-guardian pass.
- App Check, quota, backup/restore và security headers có bằng chứng.
- Chỉ còn một Worker production được quản lý và Meta webhook trỏ đúng endpoint.

### No-Go nếu còn một trong các điều kiện

- Vẫn dùng `studentIds[0]`/`parentUids[0]` để quyết định ngữ cảnh Messenger.
- Worker vẫn full-replace thread hoặc unread vẫn read–modify–write không atomic.
- Xóa conversation chưa chặn concurrent webhook và chưa chứng minh subcollection rỗng.
- Chưa xác định commit/branch nào là nguồn deploy.
- `origin/main` có thể làm mất security headers/indexes/tính năng khi deploy.
- Hai Worker production còn hoạt động mà không có ownership/consumer rõ ràng.
- Chưa có backup/restore và E2E production tương đương.

---

## 9. Kết luận cuối

Báo cáo gốc đã xác định đúng vùng rủi ro lớn nhất là Messenger và tính nguyên tử dữ liệu. Sau khi kiểm tra lại, ba P1 vẫn nguyên vẹn nên quyết định No-Go cho Messenger production không thay đổi.

Điểm cần sửa trong cách quản trị hiện tại là không được coi báo cáo gốc như ảnh chụp chính xác của repository nữa. Code đang checkout đã tiến thêm ở security headers, quyền tài chính, test và dependency audit, nhưng repository lại diverge mạnh với `origin/main`, đồng thời hai Worker production vẫn tồn tại. Vì vậy, việc đầu tiên không phải mở rộng thêm tính năng mà là **khóa release baseline**, sau đó sửa đúng các blocker Messenger bằng thay đổi tối thiểu có regression test.

