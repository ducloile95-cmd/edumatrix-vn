# Báo cáo Review Mã nguồn — Edumatrix VN

Ngày thực hiện: 20/07/2026. Phạm vi: review mã nguồn hiện tại, **không chỉnh sửa code**. Phương pháp: 3 lượt đọc mã độc lập (backend/logic/Rules; frontend/CSS cho 3 tài khoản; tích hợp Facebook + Google Drive), áp dụng nguyên tắc Karpathy (đơn giản, đúng, không suy đoán) cho backend và nguyên tắc chống-giao-diện-rập-khuôn cho frontend, sau đó xác minh chéo trực tiếp trên mã nguồn các phát hiện mức Cao/Nghiêm trọng trước khi tổng hợp. Báo cáo này phản ánh trạng thái mã nguồn tại thời điểm review — đối chiếu lại nếu dùng sau này.

## Tóm tắt điều hành

| Hạng mục | Tình trạng | Ghi chú |
|---|---|---|
| Backend/Rules | Tốt, còn 2 lỗ hổng Rules mức Cao cần vá | Không có lỗ hổng khai thác trực tiếp; có 2 loại chi phí quota "âm thầm cộng dồn" |
| Frontend 3 tài khoản (Admin/Teacher/Viewer) | Chưa đồng bộ, chưa sẵn sàng production toàn diện | Viewer không có UI di động thật; module Bài tập & Điểm là nợ kỹ thuật rõ nhất |
| Firebase Spark (dài hạn) | Khả thi, kèm điều kiện | Kiến trúc đúng hướng nhưng 2 mẫu truy vấn sẽ ăn quota tăng dần theo thời gian, không theo quy mô |
| Client-side code (dài hạn) | Khả thi | Deny-by-default Rules đầy đủ cho phần lớn collection cốt lõi; không có listener/polling rò rỉ |
| Facebook Graph API | Kiến trúc bảo mật đúng, có 1 bug chức năng | Không leak secret; nhưng đăng ảnh lên Fanpage đang **không hoạt động** |
| Google Drive API | Khả thi, đúng như tài liệu | Không có secret ở client, đúng scope hẹp, không phá vỡ ràng buộc Spark |

Không phát hiện lỗ hổng bảo mật khai thác được ngay (secret leak, thiếu xác thực) ở cả 3 mảng. Các vấn đề nghiêm trọng nhất đều là **lỗi tích hợp/logic dữ liệu và khoảng trống Rules**, không phải rò rỉ bí mật.

---

## Phần 1 — Backend, logic, Firestore Rules

*Phạm vi đã đọc: `src/services/firebase/*`, toàn bộ 26 file `src/services/firestore/*.ts`, `src/schemas/*`, `firebase/firestore.rules` (975 dòng), `firebase/firestore.indexes.json`, `src/app/guards/*`, `src/app/providers.tsx`.*

### Cao

**1. Firestore Rules không đối chiếu `studentId` xuyên collection cho `payments` và `submissions` — đã xác minh trực tiếp trên `firestore.rules:887-892`.**
Rule tạo `payments` chỉ kiểm tra `invoices/{invoiceId}.amount` khớp payment, **không** kiểm tra `invoices/{invoiceId}.studentId` có khớp `studentId` mà phụ huynh khai không. Về lý thuyết một phụ huynh sở hữu học sinh A có thể tạo bản ghi thanh toán trỏ tới hoá đơn của học sinh B (nếu biết đúng số tiền và ID hoá đơn). Cùng dạng lỗi lặp lại ở `submissions` (`firestore.rules:793-797`): kiểm tra `classId` của assignment nhưng không kiểm tra học sinh có thực sự nằm trong lớp đó (`classes/{classId}.studentIds`). Rào cản khai thác là Firestore auto-ID khó đoán, nên rủi ro thực tế thấp, nhưng đây là lỗi hệ thống (lặp lại 2 lần cùng một mẫu) trong tầng bảo mật chính mà toàn kiến trúc client-only dựa vào — nên vá.

**2. Mọi hàm đọc dữ liệu tự fetch lại `users/{uid}` của người gọi để xác định role, dù `AuthContext` đã giữ sẵn dữ liệu này qua `onSnapshot`.**
`getCurrentUserDoc()` (`authz.ts:10-17`) bị gọi lặp lại trong gần mọi hàm `list*` (sessions, assignments, attendance, invoices, lessonPlans, students...). Một lần tải Dashboard nhân viên tạo ra 7-8 lần đọc lặp cùng 1 document chỉ để biết role — dữ liệu đã có sẵn trong bộ nhớ ứng dụng. Đây là chi phí quota tăng theo **số tính năng dashboard**, không theo dữ liệu thực.

**3. Truy vấn theo lớp/học sinh của vai trò Teacher không giới hạn thời gian, fetch-toàn-bộ-rồi-lọc client-side.**
`attendance.ts:88-97` (lặp lại ở `:122-131`, `:151-165`), `assignments.ts:130-149`, `lessonPlans.ts:82-95`, `invoices.ts:94-105`: nhánh Teacher fetch toàn bộ lịch sử của lớp (tới `limit(500)`) rồi lọc ở client, thay vì lọc trực tiếp theo `sessionId`/`studentId` như nhánh Admin đã làm đúng. Chi phí đọc tỉ lệ với **tổng lịch sử tích luỹ theo thời gian** của một lớp, không phải phạm vi thực sự cần — đây là rủi ro dài hạn rõ nhất cho mô hình Spark miễn phí.

**4. Race condition (TOCTOU) trong `unenrollStudent`/`enrollStudent`.**
`enrollments.ts:56-92`: `remainingTeacherIds` được tính từ query đọc **ngoài** transaction, rồi `batch.update` ghi đè toàn bộ field `teacherIds` (không phải `arrayRemove`/`arrayUnion`). Nếu có `enrollStudent()` khác chạy đồng thời, đây là lost-update kinh điển. So sánh: `classes.ts` `updateClass()` đã dùng `runTransaction` đúng cách — cho thấy đội ngũ biết cách làm đúng, chỉ chưa áp dụng nhất quán.

**5. `firestore.indexes.json` không khớp truy vấn đa-field thực tế** — nhiều composite query (vd `assignments.ts:82-90`) không có index tương ứng khai báo trong file, nghĩa là file này không còn là nguồn sự thật để dựng lại project (disaster recovery/CI).

### Trung bình
- `.env.real`/`.env.emulator` vẫn chưa được `.gitignore` che (vấn đề tồn đọng từ audit trước) — hiện chưa chứa secret thật nhưng cơ chế bảo vệ có lỗ hổng.
- `saveAttendance`/`remindMissing` dùng nhiều `writeBatch` rời rạc khi >200 bản ghi — không atomic, rủi ro ghi dở dang thấp (sĩ số thực tế <200) nhưng vẫn là antipattern.
- Rules cho `sessions` thiếu ràng buộc `endAt >= startAt` (có ở UI nhưng không ở Rules — lớp bảo mật thật).
- Zod schema chỉ dùng ở tầng UI form, tầng service không re-validate trước khi ghi; Rules cho `scores`/`attendance`/`invoices` thiếu `hasOnly` nên không chặn field thừa (không đồng đều so với `students`/`classes` được validate chặt).

### Đã xác nhận tốt
- Lỗi transaction tuần tự ở `scores.ts` (từng bị audit trước flag) **đã được sửa** — nay dùng một `runTransaction` nguyên tử cho cả lớp.
- Không có polling (`setInterval`) nào trong toàn bộ `src/`; chỉ 4 `onSnapshot` đều có `limit()` hoặc là 1 document/phiên — không có listener rò rỉ.
- Guard `RequireAuth`/`RequireRole` đúng là chỉ UX, Rules backing đầy đủ mọi role đã audit.
- Collection nhạy cảm của Messenger (`message_outbox`, `messenger_connections`...) khoá `write: if false` phía client, đẩy đúng logic ra Worker ngoài — đúng nguyên tắc "logic không tin được client thì không đặt trong Rules".

**Verdict Phần 1**: kiến trúc client-only trên Spark phù hợp cho quy mô hiện tại (comment trong code tự ghi "<50 tài khoản"). Rủi ro dài hạn không đến từ số tài khoản mà từ **thời gian tích luỹ dữ liệu** — dashboard tổng hợp sẽ tốn quota tăng dần dù số học sinh/lớp hoạt động không đổi. Khuyến nghị khi mở rộng: sửa các truy vấn Teacher-scoped để lọc tại nguồn thay vì client, truyền `userDoc` từ context xuống thay vì gọi lại Firestore, đồng bộ `firestore.indexes.json`, vá 2 khoảng trống Rules payments/submissions. Chưa cần Cloud Functions/Blaze ngay.

---

## Phần 2 — Frontend & CSS cho 3 tài khoản (Admin/Teacher/Viewer)

*Phạm vi: `tailwind.config.ts`, `src/index.css`, toàn bộ `components/layouts`, `components/ui`, `components/feedback`, `components/motion`, `constants/navigation.ts`, spot-check các trang tiêu biểu của cả 3 role. Đã xác minh trực tiếp finding #1 bằng cách đọc lại `ViewerShell.tsx`/`AppShell.tsx`.*

### Nghiêm trọng

**1. `ViewerShell` không phải shell riêng cho Phụ huynh/Học sinh — chỉ là alias của `AppShell` (đã xác minh).**
```tsx
// ViewerShell.tsx — comment tự ghi "mobile-first"
export function ViewerShell({ children }) { return <AppShell>{children}</AppShell>; }
```
Không có component bottom-navigation nào trong toàn bộ codebase. Viewer (nhóm dùng di động nhiều nhất) phải mở hamburger menu và chọn trong drawer desktop — mâu thuẫn trực tiếp với comment "mobile-first" ngay trong file. Đây là lệch kiến trúc, không phải tiểu tiết.

**2. Màn hình chấm bài của Giáo viên hiển thị ID thô thay vì tên học sinh.**
`AssignmentsPage.tsx:181` render `{item.studentId}` (document ID) — không có bước join với danh sách học sinh, trong khi `ScoresPage.tsx:70` cùng module đã làm đúng (`{student.fullName}`). Ảnh hưởng trực tiếp thao tác chấm bài hàng ngày.

### Cao
- Trạng thái enum tiếng Anh (`invoice.status`, `submission.status`) hiển thị thô cho phụ huynh/học sinh (`ViewerTuitionPage.tsx:44-46`, `ViewerAssignmentsPage.tsx:93`) trong khi phía Staff luôn dịch qua `StatusBadge` + label map.
- `AssignmentsPage`/`ScoresPage` (2 màn hình cốt lõi của Giáo viên) hoàn toàn không có loading/error/empty state — mọi trang danh sách khác trong app đều dùng bộ `LoadingSkeleton`/`ErrorState`/`EmptyState` nhất quán, riêng 2 trang này thì không.
- Module "Bài tập & Điểm" (Learning) có 2 thế hệ giao diện khác hẳn trong cùng 1 trang: tab "Tổng quan" đã redesign chỉn chu (StatCard, ChartPanel), 2 tab liền kề vẫn là form HTML trần (input/button không dùng component `Button` dùng chung).

### Trung bình
- `PageHeader` đã âm thầm bỏ dead prop `title`/`description` (component chỉ render `actions`) nhưng ~11 trang vẫn truyền 2 prop này như có tác dụng — bằng chứng chúng đã lệch dữ liệu thật ở `Topbar`/`navigation.ts`.
- Không có component `Tabs` dùng chung — 2 kiểu tab bar song song (`border-bottom-2` vs `underline span`), 1 nơi lệch token chiều cao (`min-h-[50px]` thay vì `min-h-touch`).
- Thiếu token cỡ chữ nhỏ trong `tailwind.config.ts` → 90+ giá trị pixel tuỳ ý (`text-[11.75px]`, `text-[12.5px]`...) trên 27 file.
- Bo góc bong bóng chat dùng giá trị arbitrary rời rạc (`rounded-[14px]`, `rounded-br-[4px]`) không khớp thang `borderRadius` đã khai báo.
- Màu `success` (xanh lá) bị dùng cho nút điều hướng phân trang (`Pagination.tsx`) — lệch ngữ nghĩa màu so với phần còn lại của app, ảnh hưởng hầu hết mọi danh sách.
- Ô tìm kiếm Sidebar có 2 affordance giả (gợi ý phím tắt "F", icon lọc) không có handler nào phía sau.
- `StatCard` tone `primary` dùng sắc độ chữ (`-500`) khác 5 tone còn lại (`-700`), trông nhạt hơn hẳn khi đặt cạnh nhau.

### Thấp
- Tuỳ chọn Dark mode trong Cài đặt hoàn toàn chưa có hiệu lực (0 class `dark:` trong codebase) — component tự ghi chú thực trạng nên không phải hành vi lừa dối, nhưng nên cân nhắc ẩn tuỳ chọn thay vì hiện disclaimer.
- Overuse giá trị arbitrary Tailwind nói chung (218 lần/46 file), phần lớn hợp lệ nhưng củng cố quan sát về token chưa phủ hết nhu cầu các trang phức tạp (chat, timetable).

**Verdict Phần 2**: lớp component dùng chung và các trang đã qua vòng redesign gần đây (Lớp học, Điểm danh, Danh mục, Giáo án, Tổng quan Viewer) có chất lượng tốt, token nhất quán, motion/a11y chỉn chu. Nhưng **frontend chưa đồng bộ và chưa sẵn sàng production đầy đủ trên cả 3 tài khoản** vì 2 lý do cụ thể: Viewer thiếu UI di động thật, và module Bài tập & Điểm là vùng nợ kỹ thuật rõ rệt kèm 1 bug hiển thị thật. Phần còn lại là debt tích luỹ kiểu "mỗi trang tự chế lại một chút" — không chặn go-live nhưng cần dọn trước khi hệ thống lớn hơn.

---

## Phần 3 — Tích hợp Facebook (Messenger/Fanpage) & Google Drive

*Phạm vi: `src/services/integrations/{messenger,googleDrive}.ts`, toàn bộ `workers/messenger/src/index.ts` (478 dòng), `firebase/firestore.rules:900-974`, grep toàn repo tìm secret hardcode. Đã xác minh trực tiếp finding #2 bằng cách đọc lại `PostBody` interface và `postGraph()` trong Worker.*

### Không tìm thấy leak secret
Grep các mẫu token thật của Meta (`EAA[A-Za-z0-9]{20,}`), `client_secret`, `GOCSPX-`, `BEGIN PRIVATE KEY`, `service_account` trên toàn repo chỉ khớp file doc hướng dẫn/placeholder. `.gitignore` loại trừ đúng `.env`, `.dev.vars`, `.dev.vars.*`. `META_PAGE_ACCESS_TOKEN`/`META_APP_SECRET`/`FIREBASE_PRIVATE_KEY` chỉ tồn tại như tên biến `Env`, giá trị thật chưa từng lộ ra client hay repo — tuyên bố "secret chỉ nằm trong Cloudflare Worker qua `wrangler secret`" là **đúng với thực tế mã nguồn**.

### Cao — Bug chức năng (đã xác minh, không phải bảo mật)
**Đăng ảnh lên Fanpage không hoạt động.** UI (`ImageUrlInput.tsx:91-94`) hứa "Facebook tự tải ảnh từ đường dẫn này khi đăng", `Composer.tsx`/`PostQueueList.tsx` gửi `imageUrls` xuống `postToPage()`. Nhưng phía Worker, `interface PostBody { message: string; link?: string }` (`index.ts:25`) **không có field `imageUrls`**, và `postGraph()` (`index.ts:380-388`) chỉ build payload `{ message, link }` gửi tới Graph API `/me/feed` — ảnh bị âm thầm loại bỏ hoàn toàn. Không có test nào (kể cả `messenger.test.ts`, `worker.test.ts`) verify ảnh thực sự lên bài. Cần sửa (thêm luồng upload qua `/me/photos` + `attached_media`) hoặc tạm ẩn field ảnh khỏi Composer.

### Trung bình — Rủi ro vận hành dài hạn
- Không có cơ chế phát hiện/cảnh báo khi Page Access Token hết hạn — chỉ lộ ra thụ động qua status "failed" trong `message_outbox`.
- `access_token` truyền qua query string thay vì header — rủi ro token lọt vào access log nếu bật logging URL đầy đủ.
- Không có rate limiting/backoff phía Worker cho lỗi 429 của Meta.
- Webhook xử lý tuần tự, không có DLQ nếu 1 message trong batch lỗi giữa chừng (dù đã chống trùng lặp đúng cách bằng `metaMessageId` làm doc ID).
- Google Drive: giới hạn cứng 5MB, không có theo dõi quota Drive API tự động; quyền folder có thể "trôi" nếu chủ sở hữu đổi chia sẻ mà không ai biết.

### Xác nhận đúng thiết kế
- `lesson_plan_public` (đọc được bởi phụ huynh) không chứa `driveFileId`/link riêng tư — đúng yêu cầu checklist.
- Google Drive chỉ dùng 3 biến public (`CLIENT_ID`, `PICKER_API_KEY`, `PICKER_APP_ID`), không secret, scope hẹp `drive.file`, token chỉ giữ trong RAM tab, không persist — đúng như tuyên bố, và đúng hướng giải quyết việc Spark đã mất Firebase Storage.
- Webhook Worker verify HMAC signature (`META_APP_SECRET`) và Firebase ID token đúng chuẩn trước khi cho ghi/gửi.

**Verdict Phần 3**: kiến trúc "Spark cho app chính + Cloudflare Worker riêng cho phần cần secret" là **giải pháp đúng đắn, khả thi duy trì lâu dài mà không cần nâng Blaze** — không phải giải pháp tạm bợ. Google Drive integration đúng như tài liệu mô tả, không cần thay đổi. Facebook integration có nền bảo mật đúng nhưng **cần vá bug đăng ảnh trước khi coi là production-ready**, và nên bổ sung giám sát chủ động cho token hết hạn/rate limit khi mở rộng quy mô.

---

## Đánh giá tổng thể: tính khả quan vận hành dài hạn

**Firebase Spark Plan**: phù hợp tiếp tục dùng, không cần nâng Blaze trong ngắn/trung hạn. Rủi ro thật là 2 mẫu truy vấn đọc dư thừa (Phần 1, mục 2-3) sẽ đẩy dần tới ngưỡng cảnh báo 70% (35.000 đọc/ngày) mà `docs/CHECKLIST-TRIEN-KHAI-PRODUCTION.md` đã thiết lập — nên coi đây là việc cần làm trước khi lượng dữ liệu lịch sử tích luỹ vài năm, không phải việc khẩn cấp ngay.

**Code client-side (logic không có backend)**: kiến trúc hợp lý và được thực thi khá nhất quán — Rules deny-by-default đầy đủ cho phần lớn collection cốt lõi, không có listener/polling rò rỉ, phần logic thật sự cần giữ bí mật (Messenger) đã được tách đúng ra Worker riêng. Cần vá 2 khoảng trống Rules mức Cao và dọn nợ kỹ thuật frontend trước khi coi là hoàn thiện.

**Kết nối API Facebook**: khả thi lâu dài về mặt kiến trúc (không lộ secret), nhưng đang có 1 bug chức năng thật (ảnh không lên bài) cần sửa, và thiếu giám sát chủ động cho token/rate-limit trước khi vận hành ở quy mô nhiều Page/nhiều giáo viên.

**Kết nối API Google Drive**: khả thi lâu dài, đúng như thiết kế, không tìm thấy vấn đề cần thay đổi.

---

## Danh sách ưu tiên xử lý (tổng hợp theo mức độ, không kèm code)

1. **Nghiêm trọng/Cao — Frontend**: dựng bottom-navigation thật cho Viewer; sửa `AssignmentsPage` hiển thị tên học sinh thay vì ID.
2. **Cao — Backend**: vá Rules `payments`/`submissions` thiếu cross-check `studentId`/enrollment.
3. **Cao — Tích hợp**: sửa hoặc tạm ẩn tính năng đăng ảnh Fanpage (Worker thiếu `imageUrls`).
4. **Cao — Frontend**: đưa `AssignmentsPage`/`ScoresPage` vào redesign chung (loading/error/empty state, dùng component `Button` dùng chung); dịch trạng thái enum sang tiếng Việt cho Viewer.
5. **Trung bình — Backend**: sửa truy vấn Teacher-scoped để lọc tại nguồn; giảm gọi lặp `getCurrentUserDoc()`; đồng bộ `firestore.indexes.json`; sửa `.gitignore` cho `.env.real`/`.env.emulator`.
6. **Trung bình — Tích hợp**: bổ sung giám sát token Meta hết hạn + xử lý rate-limit 429.
7. **Trung bình/Thấp — Frontend**: dọn dead prop `PageHeader`, gộp component `Tabs` dùng chung, bổ sung token cỡ chữ nhỏ, sửa màu `Pagination`, bỏ affordance giả ở Sidebar.

---

*Báo cáo này chỉ đọc và đánh giá mã nguồn hiện có, không thực hiện thay đổi nào. Các phát hiện mức Nghiêm trọng/Cao quan trọng nhất đã được xác minh trực tiếp bằng cách đọc lại file nguồn liên quan trước khi đưa vào báo cáo.*
