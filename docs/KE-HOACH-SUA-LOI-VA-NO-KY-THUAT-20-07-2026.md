# Kế hoạch Sửa lỗi & Cập nhật Nợ kỹ thuật — Edumatrix VN

> **Trạng thái: Đã chốt phạm vi (20/07), chờ duyệt Đợt 1 để bắt đầu.** Dựa trên `docs/BAO-CAO-REVIEW-MA-NGUON-20-07-2026.md` (review 20/07/2026). Chưa có dòng code nào được sửa. Lợi đã chọn: **ảnh Fanpage sửa đầy đủ (Option A)**, **gộp Đợt 6 vào lần triển khai này** (đủ 6 đợt), **duyệt và triển khai từng đợt một** — xong 1 đợt sẽ báo cáo kết quả (typecheck/lint + diff) và đợi duyệt mới sang đợt kế tiếp.

## Nguyên tắc thực hiện
- Sửa theo từng đợt (batch) độc lập, mỗi đợt có thể duyệt/triển khai riêng, không phụ thuộc đợt sau.
- Mỗi thay đổi chỉ chạm đúng phạm vi lỗi đã review — không refactor lan sang code không liên quan, không thêm tính năng/cấu hình ngoài phạm vi.
- Không đụng `features/students/**` (module đã khoá theo yêu cầu trước, chỉ tham chiếu khi cần).
- Verify sau mỗi đợt bằng `npm run typecheck` + `npm run lint` (build/test/dev không chạy được trong sandbox do `node_modules` build cho Windows — đã ghi nhận trước đó). Riêng đợt đụng Firestore Rules cần Lợi tự chạy `npm run test:rules` (sandbox thiếu JDK 21+, không chạy được).
- Sau khi 1 đợt xong: cập nhật trạng thái ✅/⏳ ngay trong file này, giống các kế hoạch trước.

---

## Quyết định đã chốt

- **Ảnh Fanpage (mục 1.2): Option A — sửa đầy đủ.** Thêm luồng upload ảnh qua Graph API (`POST /me/photos?published=false` cho từng ảnh lấy `photo_id`, rồi gửi `attached_media` trong `POST /me/feed`). Việc thực hiện trong Worker (`workers/messenger/src/index.ts`) — chỉnh `PostBody`, `postGraph()`, cập nhật `messenger.ts`/`messenger.test.ts` phía client và `worker.test.ts` phía Worker cho khớp field `imageUrls` mới.
- **Đợt 6 (CSS/UI polish): gộp vào lần triển khai này** — đủ 6 đợt, không để lại.
- **Duyệt & triển khai từng đợt một** — mỗi đợt xong sẽ báo cáo typecheck/lint + tóm tắt diff, đợi Lợi duyệt mới sang đợt kế.

---

## Đợt 1 — Bug ảnh hưởng thao tác hàng ngày ✅ HOÀN THÀNH (20/07)

**1.1 `AssignmentsPage` hiện tên học sinh thay vì ID thô — ✅ Xong**
- Thêm query `listStudents` (cùng key `["students"]` với `ScoresPage` — dùng chung cache, không tốn thêm read), join `studentId` → `fullName`, fallback về ID nếu chưa tải xong.

**1.2 Ảnh Fanpage (Option A — sửa đầy đủ) — ✅ Xong**
- Worker (`workers/messenger/src/index.ts`): `PostBody` thêm `imageUrls`; hàm mới `uploadPhoto()` (POST `/me/photos` với `published: false` lấy `photo_id`), `buildFeedPayload()` gắn `attached_media` vào `/me/feed`; validate tối đa 4 URL http/https (khớp giới hạn 4 ảnh trong Firestore Rules), lỗi trả mã `invalid_post_images`.
- **Quyết định kỹ thuật cần biết**: Graph API từ chối khi gửi cả `link` và `attached_media` trong cùng bài — nên khi có ảnh, link được nối vào cuối message (vẫn bấm được, chỉ không có card preview link).
- Client (`messenger.ts`): thêm thông báo lỗi tiếng Việt cho `invalid_post_images` (client vốn đã gửi `imageUrls` sẵn, không cần sửa gì thêm).
- Tests: thêm 3 test case vào `worker.test.ts` (validate URL ảnh, payload thường, payload có `attached_media` + link gập vào message).

**Verify Đợt 1**: typecheck app ✅, lint 2 file sửa ✅, typecheck worker ✅; vitest không chạy được trong sandbox (rollup native binary Windows) → đã verify 12 assertion cho `validPostImages`/`buildFeedPayload` bằng script standalone, tất cả PASS. **Lợi cần chạy `npm test` trong `workers/messenger` trên máy thật + smoke test đăng 1 bài có ảnh lên Fanpage thật trước khi deploy Worker production.**

---

## Đợt 2 — Vá khoảng trống Firestore Rules ✅ HOÀN THÀNH (20/07)

**2.1 `payments` — ✅ Xong**: rule `create` thêm điều kiện `invoices/{invoiceId}.studentId == request.resource.data.studentId` (cùng document đã `get()` để so `amount` — rules engine dedupe, không tốn thêm lượt đọc).

**2.2 `submissions` — ✅ Xong**: rule `create` thêm điều kiện `classes/{classId}.studentIds.hasAny([studentId])` — học sinh phải thực sự trong lớp mới nộp bài được.

**2.3 `sessions` — ✅ Xong**: `validSessionData` thêm `data.endAt >= data.startAt` (cùng cú pháp `validCourseData`/`validRecurrence` đã dùng).

**Test đã bổ sung** (3 test âm, tái hiện đúng từng lỗ hổng — sẽ FAIL với rules cũ, PASS với rules mới):
- `phase9-rules.test.ts`: "viewer cannot report payment against another student's invoice" (+fixture `invoice-other` của student-2).
- `phase7-rules.test.ts`: "viewer cannot submit to a class the student is not enrolled in" (+fixture class-2/assignment-3).
- `phase4-rules.test.ts`: "staff cannot create a session ending before it starts".

**Đã đối chiếu fixture hiện có** — không có test nào bị phá bởi rules chặt hơn: phase9 invoice-1↔student-1 khớp; phase7 class-1 chứa student-1; mọi fixture session có endAt ≥ startAt; các fixture ghi bằng `withSecurityRulesDisabled` không bị ảnh hưởng. Client cũng không có luồng ghi hợp lệ nào bị chặn (payments ghi studentId từ chính invoice đang hiển thị; UI session đã enforce endAt > startAt sẵn).

**Verify Đợt 2**: typecheck 3 file test ✅; cú pháp rules theo đúng mẫu có sẵn trong file. **Lợi cần chạy `npm run test:rules` trên máy thật (cần JDK 21+, sandbox không chạy được) trước khi `firebase deploy --only firestore:rules`.**

---

## Đợt 3 — Đồng bộ Frontend cho cả 3 tài khoản ✅ HOÀN THÀNH (20/07)

**3.1 Bottom-navigation thật cho Viewer — ✅ Xong**
- Component mới `src/components/layouts/BottomNavigation.tsx`: 5 tab lấy từ `NAVIGATION_BY_ROLE.viewer` (không hardcode danh sách), `NavLink` + trạng thái active, `min-h-touch`, hỗ trợ safe-area-inset (iPhone), chỉ hiện `< lg` — desktop vẫn dùng Sidebar.
- `ViewerShell.tsx`: bọc content với `pb-16 lg:pb-0` (không bị bottom-nav che) + render `BottomNavigation`. `AppShell`/`Sidebar` của Admin/Teacher không bị đụng.

**3.2 Dịch trạng thái enum cho Viewer — ✅ Xong**
- Tạo `src/features/invoices/constants.ts` (chuyển `INVOICE_STATUS_LABEL`/`TONE` từ local const của `InvoicesPage` ra dùng chung — `InvoicesPage` giờ import từ đây, hành vi không đổi).
- Tạo `src/features/assignments/constants.ts` (`SUBMISSION_STATUS_LABEL`/`TONE` mới: Đã nộp/Đang chấm/Đã chấm/Cần làm lại).
- `ViewerTuitionPage` + `ViewerAssignmentsPage` hiển thị qua `StatusBadge` giống phía Staff, hết enum tiếng Anh thô.

**3.3 Loading/Error/Empty state cho `AssignmentsPage`/`ScoresPage` — ✅ Xong**
- `AssignmentsPage`: 3 state cho danh sách bài + 3 state cho danh sách bài nộp (chỉ hiện khi đã chọn bài), có nút Thử lại.
- `ScoresPage`: 3 state cho danh sách học sinh của lớp đã chọn.
- Dùng đúng bộ `LoadingSkeleton`/`ErrorState`/`EmptyState` như các trang khác, không chế mới.

**3.4 Button dùng chung — ✅ Xong**: 5 nút trần (`Giao bài`, `Nhắc chưa nộp`, `Chấm`, `Làm lại`, `Lưu điểm cả lớp`) chuyển sang component `Button` (primary/secondary), không sửa `Button.tsx`.

**Verify Đợt 3**: typecheck toàn app ✅, lint 9 file sửa/tạo ✅ (có 1 lỗi type narrowing ở BottomNavigation phát hiện qua tsc, đã sửa bằng type guard). **Lợi nên mở thử tài khoản Viewer trên điện thoại/màn hình hẹp để nghiệm thu bottom-nav.**

---

## Đợt 4 — Hiệu năng/Quota Backend dài hạn ✅ HOÀN THÀNH (20/07)

**4.1 Giảm gọi lặp `getCurrentUserDoc()` — ✅ Xong (cách làm khác kế hoạch, đơn giản hơn)**
- Thay vì đổi chữ ký ~10 hàm service + mọi caller, thêm cache module-level trong `authz.ts`: `AuthContext` (vốn đã giữ `onSnapshot` realtime trên `users/{uid}`) đẩy snapshot vào `setCachedUserDoc()`; `getCurrentUserDoc()` trả cache khi uid khớp, fallback fetch khi chưa có. Cache tự cập nhật theo realtime, tự vô hiệu khi đổi user. Không caller nào phải sửa.
- `students.ts` `listStudents` (bản sao chép fetch users/{uid} riêng) chuyển sang dùng chung `getCurrentUserDoc()` → cũng hưởng cache.
- Hiệu quả: một lần tải Staff Dashboard trước đây tốn 7-8 read lặp `users/{uid}`, giờ 0 (đã có sẵn từ AuthContext).

**4.2 Truy vấn Teacher-scoped lọc tại server — ✅ Xong (phạm vi điều chỉnh có chủ đích)**
- `attendance.ts` (3 hàm) + `assignments.ts` (`listSubmissionsByStudents`): nhánh Teacher giữ `classId ==` (bắt buộc — Rules chứng minh `canManageClass` chỉ với 1 get/lớp) và **thêm** `sessionId/studentId in [...]` (chunk 30) để lọc tại server — hết fetch-toàn-bộ-lịch-sử-rồi-lọc-client. Query equality+in không cần composite index (Firestore index merging).
- **Không sửa `invoices.ts`/`lessonPlans.ts` — có lý do**: rule đọc invoices của Teacher (`isAssignedTeacherForStudent`) cần 1 `get()` **cho mỗi** studentId — query `in` 30 giá trị sẽ vượt giới hạn 10 document-access/request của Rules và bị từ chối ngay. `lessonPlans` nhánh Teacher fetch đúng dataset cần hiển thị (mọi giáo án của lớp phụ trách), không có lọc thừa. Đây là giới hạn kiến trúc Rules, không phải bỏ sót.

**4.3 `firestore.indexes.json` — ✅ Đã audit, KHÔNG cần sửa**: đối chiếu toàn bộ query trong `src/services/firestore/*` — chỉ 3 query cần composite index (scores studentId+createdAt, sessions classId+startAt, chat_threads assignedTeacherIds+lastMessageAt) và cả 3 đều đã khai báo đúng trong file. Các query còn lại là equality-only (index merging) hoặc single-field. Phát hiện "thiếu index" trong báo cáo review là quá thận trọng — equality-only không cần composite.

**4.4 `.gitignore` — ✅ Xong**: thêm `.env.real`, `.env.emulator`.

**4.5 `enrollments.ts` — ✅ Xong**: cả `enrollStudent` lẫn `unenrollStudent` chuyển sang `runTransaction`. `unenrollStudent` giờ dùng `students.currentClassIds` đọc **trong** transaction làm nguồn sự thật (thay vì query enrollments ngoài transaction) — hết lost-update `teacherIds` hoàn toàn, đồng thời bớt 1 query.

**4.6 `saveAttendance` — ✅ Xong**: chunk 200 giữ nguyên (200 entry × tối đa 2 op = 400 < giới hạn 500 op/batch — sĩ số thực tế <200 nên luôn là 1 batch nguyên tử); bổ sung: nếu >1 batch và lỗi giữa chừng, rebuild summary best-effort để summary khớp phần đã ghi rồi mới ném lỗi. `remindMissing` giữ nguyên (announcement idempotent theo doc ID, retry vô hại).

**Test bổ sung**: 1 unit test mới trong `assignments.test.ts` xác nhận nhánh Teacher phát query `classId ==` + `studentId in [...]`. Test cũ không bị ảnh hưởng (đã đối chiếu — chúng chỉ cover `createAssignment`/`listAssignments`, không đổi).

**Verify Đợt 4**: typecheck toàn app ✅, lint 7 file ✅ (1 lỗi import UserDoc do dọn thừa tay, tsc bắt được, đã sửa). **Lợi cần chạy `npm test` trên máy thật** (vitest không chạy được trong sandbox) **và mở thử Dashboard bằng tài khoản Teacher** để xác nhận các query mới không bị Rules từ chối (nếu có lỗi permission-denied ở Điểm danh/Bài tập thì báo lại ngay).

---

## Đợt 5 — Độ tin cậy tích hợp Facebook ✅ HOÀN THÀNH (20/07)

**5.1 Cảnh báo chủ động khi Meta token lỗi/hết hạn — ✅ Xong**
- Worker: thêm `metaErrorCode()` — lỗi Meta dạng object giờ được JSON.stringify (giữ `"code":190` = token hết hạn/không hợp lệ) thay vì thành chuỗi `[object Object]` vô dụng như trước; áp dụng cho cả send/post/upload ảnh.
- Client (`IntegrationsWorkspace`): thêm query đọc 50 bản ghi `message_outbox` gần nhất (hàm `listMessageOutbox` có sẵn, Rules đã cho staff đọc); hiện cảnh báo đỏ khi: phát hiện `"code":190` (thông báo đích danh token + lệnh `wrangler secret put` cần chạy), hoặc ≥3 lượt gửi thất bại (thông báo chung kiểm tra Worker/quyền Meta). Type `MessageOutboxDoc` bổ sung field `error?` (Worker vốn đã ghi field này, type chưa khai).

**5.2 Xử lý 429 rate-limit trong Worker — ✅ Xong**
- `sendGraph`: retry đúng 1 lần cho cả 5xx (như cũ) lẫn 429; riêng 429 đợi theo header `Retry-After` (chặn trên 5 giây) trước khi thử lại. Không thêm hàng đợi/backoff vô hạn — giữ đơn giản, phù hợp quy mô 1 trường.
- `postGraph` (đăng Fanpage) giữ nguyên không retry — thao tác thủ công tần suất thấp, admin bấm lại được, và giờ đã có cảnh báo 5.1 khi lỗi lặp.

**Test bổ sung**: 1 test `metaErrorCode` trong `worker.test.ts` (object → JSON giữ code 190; chuỗi/thiếu → nguyên trạng).

**Verify Đợt 5**: typecheck app ✅, lint ✅, typecheck worker ✅. **Lợi chạy `npm test` trong `workers/messenger` trên máy thật; lưu ý cảnh báo 5.1 chỉ hiện khi thực sự có bản ghi failed trong `message_outbox` — có thể thử bằng cách tạm điền sai token ở môi trường dev.**

---

## Đợt 6 — Dọn nợ kỹ thuật CSS/UI ✅ HOÀN THÀNH (20/07)

- **6.1 ✅** Xoá dead prop `title`/`description` khỏi mọi lời gọi `PageHeader`; các trang không có `actions` bỏ luôn component/import rỗng.
- **6.2 ✅** Tạo component `Tabs`/`Tab` dùng chung và thay các tab bar ở Điểm danh, Danh mục, Học tập, Người dùng, Tài chính, Chat/Chat demo và Cài đặt; chuẩn hoá `min-h-touch`.
- **6.3 ✅** Thêm token cỡ chữ nhỏ `2xs`/`3xs` và thay toàn bộ bốn giá trị arbitrary đã nêu.
- **6.4 ✅** Sửa màu điều khiển `Pagination` từ `success` sang `primary` (trạng thái disabled giữ `neutral`).
- **6.5 ✅** Thêm token `chat-bubble`/`chat-tail`, áp dụng cho Chat và Chat demo.
- **6.6 ✅** Bỏ gợi ý phím tắt `F` và icon lọc không có handler khỏi `Sidebar`.
- **6.7 ✅** `StatCard` tone `primary` dùng `text-primary-700`.
- **6.8 ✅** Vô hiệu hoá lựa chọn `Tối`/`Theo hệ thống`, gắn nhãn `Sắp ra mắt` và chuẩn hoá preference cũ về giao diện sáng.

**Verify Đợt 6**: typecheck toàn app ✅, lint các file thay đổi ✅.

---

## Không nằm trong phạm vi đợt này (ghi nhận, chưa sửa)

- Nâng cấp Firebase lên Blaze / thêm Cloud Functions — kết luận review là chưa cần thiết ở quy mô hiện tại.
- Bổ sung `hasOnly` cho Rules `scores`/`attendance`/`invoices` — rủi ro thấp (chỉ staff được ghi), để dành nếu có thời gian sau các đợt trên.
- `access_token` Meta truyền qua query string thay vì header — thay đổi này cần test kỹ hành vi Graph API, để riêng nếu cần.

---

## Câu hỏi cần Lợi trả lời trước khi bắt đầu

1. Ảnh Fanpage (mục 1.2): chọn Option A (sửa đầy đủ) hay Option B (tạm ẩn)?
2. Có gộp Đợt 6 (CSS/UI polish, không ảnh hưởng chức năng) vào lần triển khai này không, hay để lại làm sau?
3. Duyệt toàn bộ 6 đợt để triển khai tuần tự, hay muốn duyệt/triển khai từng đợt một (an toàn hơn, dễ kiểm tra hơn)?
