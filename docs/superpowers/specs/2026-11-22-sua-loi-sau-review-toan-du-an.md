# Spec: Sửa toàn bộ lỗi sau review toàn dự án (22/11/2026)

**Trạng thái:** Bản nháp — chờ xác nhận các quyết định ở mục 2.
**Nguồn:** 3 review chỉ đọc trên `HEAD 84a9e58` (rules/backend, tầng dữ liệu, UI). Lỗi A1, A2 đã được đối chiếu lại trực tiếp với `firebase/firestore.rules`.
**Kế hoạch liên quan:** [Tối ưu chi phí Firestore](../plans/2026-11-22-toi-uu-chi-phi-firestore.md) (nhóm E dưới đây).

## 1. Mục tiêu

1. Không tài khoản nào làm được việc vượt quyền vai trò của mình, **dù gọi Firestore trực tiếp** — rules là chốt chặn thật, client chỉ là UX.
2. Tiền học phí chỉ chảy về tài khoản ngân hàng của trung tâm; không tính tiền trùng; trạng thái hoá đơn phản ánh đúng thực tế.
3. Không mất dữ liệu đã lưu do lỗi tải hoặc bấm nhầm.
4. Vận hành 0đ/tháng (Spark) hoặc < 100.000đ/tháng.

**Ngoài phạm vi:** thiết kế lại giao diện, tính năng mới, đổi tên collection, thêm Cloud Functions, thay thư viện `zca-js` (vấn đề pháp lý — chủ dự án tự quyết).

## 2. Quyết định cần chủ dự án xác nhận

Spec dùng **mặc định** ở cột phải. Đổi mặc định nào thì các mục được liệt kê phải sửa theo.

| # | Câu hỏi | Mặc định trong spec | Ảnh hưởng |
|---|---|---|---|
| Q1 | Giáo viên có được **tạo hoá đơn** không? | Có, nhưng chỉ theo lớp được phân công, giá lấy từ khoá học/billing item (không nhập tay) | A1 |
| Q2 | Giáo viên có được **xác nhận/từ chối thanh toán** không? | Không — chỉ admin | A1, D3 |
| Q3 | Giáo viên có được **xoá** tài khoản phụ huynh, học sinh, lớp, khoá, môn không? | Không — mọi thao tác xoá chỉ admin. Giáo viên có thể *lưu trữ* (`status: archived`) lớp của mình | A2, D2 |
| Q4 | Giáo viên có cần **xem dữ liệu lớp không được phân công** không (ví dụ dạy thay)? | Không — chỉ lớp/học sinh được phân công. Dạy thay = admin thêm vào `teacherIds` | A3 |
| Q5 | Hoá đơn bị từ chối chứng từ (`rejected`) thì sao? | Vẫn là khoản nợ; phụ huynh nộp lại chứng từ. Muốn huỷ hẳn → trạng thái mới `void` (chỉ admin) | C1 |

## 3. Yêu cầu chi tiết

Mỗi mục: **Hiện trạng → Yêu cầu → Tiêu chí chấp nhận (TCCN)**. Mức: 🔴 nghiêm trọng, 🟠 nên sửa, 🟡 nhỏ.

### Nhóm A — Firestore rules

#### A1 🔴 Hoá đơn: chặn số tiền tuỳ ý và tài khoản ngân hàng lạ
- **Hiện trạng:** `firestore.rules:1641-1647` — nhánh giáo viên chỉ kiểm tra `classId` thuộc lớp được phân công. `validInvoiceData` (922-974) coi `sourceType` là tuỳ chọn (dòng 945): bỏ trường này thì không kiểm tra học sinh thuộc lớp và số tiền. `bankBin/accountNumber/accountName` không bao giờ được so với `settings/payment`.
- **Yêu cầu:**
  1. Mọi lệnh tạo hoá đơn (kể cả admin) phải có `bankBin`, `accountNumber`, `accountName` **bằng đúng** giá trị trong `settings/payment` tại thời điểm tạo.
  2. Nhánh giáo viên bắt buộc có `sourceType` ∈ {`class`, `billing_item`}; nhánh "không có `sourceType`" (hoá đơn nhập tay) chỉ dành cho admin.
  3. Nhánh `sourceType == 'class'`: `unitPriceSnapshot` phải bằng giá của khoá học (`courses/{courseId}`, trường giá hiện hành — xác minh tên trường trong `src/types/academic.ts`), không được nhập tay.
  4. Theo Q2: các chuyển trạng thái thanh toán (`pending → paid`, `pending → rejected`) trên `invoices` và `payments` chỉ admin.
  5. Client (`src/services/firestore/invoices.ts`) lấy thông tin ngân hàng từ `getPaymentSettings()` — không có ô nhập ở form.
- **TCCN (test rules mới trong `firebase/tests/`):**
  - Giáo viên tạo hoá đơn không có `sourceType` → **bị từ chối**.
  - Giáo viên tạo hoá đơn `sourceType: 'class'` cho học sinh **không** thuộc lớp → bị từ chối.
  - Bất kỳ ai tạo hoá đơn có `accountNumber` khác `settings/payment` → bị từ chối.
  - `unitPriceSnapshot` khác giá khoá học → bị từ chối.
  - Admin tạo hoá đơn hợp lệ, giáo viên tạo hoá đơn hợp lệ cho lớp mình → được phép.
  - Giáo viên chuyển hoá đơn sang `paid` → bị từ chối.

#### A2 🔴 Xoá dữ liệu lõi chỉ admin
- **Hiện trạng:** `allow delete: if isStaff()` ở `users` (1006, chỉ trừ chính mình), `subjects` (1134), `courses` (1153), `students` (1208), `classes` (1279). Test hiện tại khẳng định giáo viên được xoá (`academic-rules.test.ts:214,276,381,492`, `security-rules.test.ts:290`).
- **Yêu cầu:**
  1. Cả 5 chỗ đổi thành `isAdmin()` (`users` vẫn giữ `request.auth.uid != uid`).
  2. Không cho xoá tài khoản có `role == 'admin'` nếu đó là admin đang hoạt động cuối cùng — rules không đếm được, nên làm ở client (D2) **và** quy định: xoá admin chỉ thực hiện qua Firebase Console (ghi vào `docs/operations-runbook.md`). Rules: `allow delete` trên `users/{uid}` từ chối khi `resource.data.role == 'admin'`.
  3. Kiểm tra phụ thuộc (`assertDeletionAllowed`) giữ ở client như hiện tại — không chuyển vào rules (không đếm được trong rules).
- **TCCN:** sửa các test cũ thành "giáo viên xoá → bị từ chối"; thêm test "admin xoá user có role admin → bị từ chối", "admin xoá lớp/học sinh/khoá/môn → được phép".

#### A3 🔴 Giáo viên chỉ đọc dữ liệu lớp được phân công
- **Hiện trạng:** ~25 rule `allow read: if isStaff() || ...` (dòng 981, 1041, 1177, 1220, 1287, 1314, 1387, 1397, 1443, 1458, 1471, 1478, 1488, 1500, 1512, 1524, 1542, 1557, 1606, 1630, 1640, 1665, 1700, 1714, 1770). Điều kiện "giáo viên được phân công" đặt cạnh không bao giờ có hiệu lực.
- **Yêu cầu:**
  1. Với dữ liệu gắn lớp/học sinh (`students`, `classes`, `enrollments`, `sessions`, `attendance`, `attendance_summaries`, `assignments`, `submissions`, `scores`, `student_summaries`, `invoices`, `payments`, `announcements`, `session_*`, `chat_threads`): đổi thành `isAdmin() || (isTeacher() && <điều kiện phân công sẵn có: isAssignedTeacherForClass / ForStudent>) || <nhánh viewer sẵn có>`.
  2. `users`: giáo viên chỉ đọc được hồ sơ của chính mình, của giáo viên khác (để hiển thị tên), và phụ huynh có `studentIds` giao với học sinh mình phụ trách. Nếu điều kiện cuối không viết được bằng rules → giáo viên **không** đọc `users` phụ huynh; tên/điện thoại phụ huynh hiển thị cho giáo viên lấy từ `students` (trường liên hệ đã có trên hồ sơ học sinh — xác minh).
  3. `link_requests`, `audit_logs`, `settings/payment`, `messenger_*` (không phải thread): chỉ admin đọc.
  4. Danh mục dùng chung (`subjects`, `courses`, `billing_items`, `standard_lessons`, `settings/general`, `settings/academic`): giáo viên vẫn đọc tất cả.
  5. **Mọi truy vấn danh sách ở client phải khớp rules** (Firestore từ chối cả truy vấn nếu không chứng minh được mọi kết quả hợp lệ): với vai trò giáo viên, `listStudents`, `listInvoices`, `listPayments`, `listAssignments`, `listSessions`, `listAttendance*`, `listScores*`, `listUsers*`… phải thêm `where("teacherIds", "array-contains", uid)` hoặc lọc theo `classId in [...]` (chia nhóm 30). `listClasses` đã làm đúng (`classes.ts:336-338`) — làm theo mẫu này.
  6. Cập nhật mẫu rules trong `AI-AGENTS-GUIDE-EDUMATRIX-VN.md` để không còn khuyến nghị `isStaff()` cho read.
- **TCCN:**
  - Test rules: giáo viên A đọc học sinh/điểm/hoá đơn của lớp giáo viên B → bị từ chối; đọc của lớp mình → được phép; truy vấn danh sách không có bộ lọc phân công → bị từ chối.
  - Chạy thử bằng tài khoản giáo viên trên emulator: đi qua mọi trang trong menu giáo viên, **không có lỗi `permission-denied`** trong console.

#### A4 🟠 Giáo trình và mẫu giáo án
- **Hiện trạng:** giáo viên tạo/sửa `course_curricula`, `course_curriculum_items` của mọi khoá (1489-1507); ghi đè mọi `lesson_plan_templates`, không kiểm tra `ownerUid` (1472-1473).
- **Yêu cầu:** giáo trình: `isAdmin() || isAssignedTeacherForCourse(data.courseId)`. Mẫu giáo án: tạo phải có `ownerUid == request.auth.uid`; sửa/xoá: `isAdmin() || resource.data.ownerUid == request.auth.uid`; `ownerUid` bất biến.
- **TCCN:** test rules cho từng nhánh cho phép/từ chối ở trên.

#### A5 🟠 `link_requests`: validate khi chủ sở hữu cập nhật
- **Hiện trạng:** dòng 1059 — khi chưa `approved`, chủ yêu cầu sửa được mọi trường, kể cả `email`, thêm khoá tuỳ ý, `children` không giới hạn.
- **Yêu cầu:** cập nhật của chủ dùng lại bộ kiểm tra khoá và kích thước của nhánh tạo; `email`, `uid`, `createdAt` bất biến; `status` chỉ được giữ nguyên hoặc chuyển `rejected → pending`.
- **TCCN:** test: đổi `email` → từ chối; thêm khoá lạ → từ chối; `children` vượt giới hạn của nhánh tạo → từ chối; sửa tên con hợp lệ → được phép.

#### A6 🟡 `audit_logs` chỉ ghi đúng tác nhân
- **Yêu cầu:** tạo log phải có `actorUid == request.auth.uid`, `action` thuộc danh sách cố định (lấy từ các giá trị client đang ghi trong `src/services/firestore/auditLog.ts`), `meta` là map có kích thước ≤ 20 khoá; không ai được sửa/xoá.
- **TCCN:** test ghi log với `actorUid` của người khác → từ chối.

#### A7 🟡 Giáo viên bị khoá không đọc được giáo án
- **Yêu cầu:** `lesson_plans` read (1445): nhánh `createdBy == auth.uid` thêm `isActive()`.

#### A8 🟡 `messenger_delivery_events`: giới hạn giáo viên theo học sinh phụ trách
- **Yêu cầu:** nhánh tạo của giáo viên (1772) thêm `isAssignedTeacherForStudent(data.studentId)`.

### Nhóm B — Worker Messenger và Zalo service

#### B1 🟠 Dashboard phụ huynh không lộ dữ liệu chưa công bố
- **Hiện trạng:** `materializeViewerDashboard` (`workers/messenger/src/index.ts:1084-1093`) dùng service account, sao chép mọi `assignments` (cả nháp, đã đóng), mọi `scores` (bỏ qua `published`), và `studentIds` đầy đủ của lớp.
- **Yêu cầu:** áp đúng điều kiện của rules viewer: assignments `status == 'published'`; scores `published != false`; thay `classes[].studentIds` bằng số lượng (`studentCount`). Viết thành hàm thuần được export (`viewerVisibleDashboard(raw)`) để test.
- **TCCN:** test worker: đầu vào có bài nháp + điểm chưa công bố → đầu ra không chứa; không còn `studentIds` của học sinh khác.

#### B2 🟠 Dashboard phụ huynh không đọc thừa
- **Hiện trạng:** `byField` (1081-1083) gọi `queryDocuments` (đọc **toàn bộ** document theo `classId/studentId`) rồi mới `.slice(0, perId)`. Lớp có 200 buổi học → 200 lượt đọc để lấy 12.
- **Yêu cầu:** truyền `limit = perId` và `orderBy` thời gian giảm dần (`startAt`/`createdAt`/`markedAt` tuỳ collection) vào truy vấn; thêm composite index cần thiết vào `firebase/firestore.indexes.json`.
- **TCCN:** test worker kiểm tra body request có `limit` bằng `perId`; deploy index trước khi deploy Worker.

#### B3 🟡 Môi trường dev của Worker không trỏ vào production
- **Hiện trạng:** `wrangler.jsonc` môi trường mặc định có `FIREBASE_PROJECT_ID: "edumatrix-vn-576b1"`.
- **Yêu cầu:** môi trường mặc định dùng `demo-edumatrix` (khớp emulator); chỉ `env.production` trỏ vào project thật. Cập nhật `docs/HUONG-DAN-TEST-WORKER-LOCAL.md`.

#### B4 🟡 Zalo service
- **Yêu cầu:** bỏ `trust proxy 1` trừ khi có biến môi trường `TRUST_PROXY=1` (ghi rõ trong `zalo-service/README.md`); dọn `rateBuckets` hết hạn mỗi lần kiểm tra (hoặc `setInterval` 60s); idempotency key trùng nhưng payload khác → trả `409`.

#### B5 🟡 Phân trang `offset` trong Worker
- Thực hiện theo Task 5 của kế hoạch chi phí (cursor `__name__`).

### Nhóm C — Dữ liệu và nghiệp vụ

#### C1 🟠 Không tính tiền trùng buổi học
- **Hiện trạng:** `InvoiceCreationForm.tsx:108-124` bỏ hoá đơn `rejected` khi đếm buổi đã tính tiền; `createInvoices` (`invoices.ts:55-86`) dùng ID ngẫu nhiên, bấm hai lần hoặc hai admin cùng lúc tạo hoá đơn trùng.
- **Yêu cầu (theo Q5):**
  1. Đếm buổi đã tính gồm mọi trạng thái trừ `void`.
  2. Thêm trạng thái `void` vào `InvoiceStatus`, rules (`data.status in [...]`) và nhãn UI "Đã huỷ"; chỉ admin chuyển `unpaid/rejected → void`; `void` không tính vào công nợ (`InvoicesPage.tsx:147`).
  3. ID hoá đơn tạo theo lớp là tất định: `stableDocumentId(["class", classId, studentId, billedFromSessionCount, quantity])` (dùng helper `stableDocumentId` sẵn có — xác minh vị trí bằng grep) và tạo bằng transaction `get → nếu tồn tại thì báo "đã có hoá đơn cho đợt này"`.
- **TCCN:** unit test: hoá đơn `rejected` 8 buổi + 10 buổi đã học → chỉ tính 2 buổi mới; tạo hai lần cùng đầu vào → lần hai báo lỗi, chỉ có 1 document.

#### C2 🟠 Trạng thái "Quá hạn" hiển thị đúng
- **Hiện trạng:** không code nào ghi `overdue`; bộ lọc và badge "Quá hạn" luôn trống.
- **Yêu cầu:** hàm thuần `effectiveInvoiceStatus(invoice, now): InvoiceStatus` trả `overdue` khi `status == 'unpaid' && dueAt < now` (so theo ngày giờ Việt Nam); dùng ở `InvoicesPage` (bộ lọc, badge, đếm), `ViewerTuitionPage`, dashboard tài chính. Không ghi `overdue` xuống Firestore.
- **TCCN:** unit test cho các trường hợp: chưa đến hạn, quá hạn 1 phút, đã trả, `pending`.

#### C3 🟠 Phát hiện buổi thiếu điểm danh theo sĩ số lúc điểm danh
- **Hiện trạng:** `attendance.ts:296-305` so `summary.total` với sĩ số **hiện tại** của lớp.
- **Yêu cầu:** khi lưu điểm danh, ghi thêm `expectedTotal` (sĩ số lớp lúc đó) vào `attendance_summaries`; so sánh dùng `expectedTotal ?? klass.studentIds.length` (tương thích dữ liệu cũ). Cập nhật rules cho trường mới (`int`, ≥ 0).
- **TCCN:** unit test: lớp thêm 1 học sinh sau buổi đã điểm danh đủ → buổi đó không bị báo thiếu.

#### C4 🟡 `saveClassScores` chặn NaN/Infinity
- **Yêu cầu:** `scores.ts:9,11` kiểm tra `Number.isFinite` cho `maxScore` và từng điểm, ném `SCORE_INVALID`; rules `scores` thêm `data.score is number && data.score >= 0 && data.score <= data.maxScore` nếu chưa có.

#### C5 🟡 Kiểm tra phụ thuộc trước khi xoá nằm sát transaction
- Giữ như hiện tại (cửa sổ race rất nhỏ, chỉ admin được xoá sau A2). Ghi chú `shortcut:` tại `deleteClass`, `deleteStudent`, `deleteUserAccount`.

#### C6 🟡 Mã hoá đơn theo giờ Việt Nam
- `utils/payment.ts:1`: lấy tháng bằng `formatInTimeZone(now, "Asia/Ho_Chi_Minh", "MM")` (date-fns-tz đã có).

#### C7 🟡 Gỡ học sinh khỏi lớp khi thiếu bản ghi enrollment
- `enrollments.ts:236`: trong transaction, nếu enrollment không tồn tại thì bỏ qua bước cập nhật enrollment (giống `syncStudentEnrollments`). Unit test cho học sinh không có enrollment.

### Nhóm D — Giao diện

#### D1 🟠 Bộ dịch tiếng Anh không đụng vào dữ liệu người dùng và không làm chậm app
- **Hiện trạng:** `DocumentTranslationBridge.tsx:13-31` + `translations.ts:70-83` thay chuỗi con trên mọi text node; MutationObserver quét lại toàn trang; `en.generated.json` 178 KB nằm trong chunk chính.
- **Yêu cầu:**
  1. Bridge bỏ qua mọi node nằm trong phần tử có `translate="no"` hoặc `data-no-translate` (dùng `closest`).
  2. Thêm `translate="no"` cho mọi vùng hiển thị dữ liệu người nhập: tên người/học sinh/lớp, nội dung chat, thông báo, nhận xét, bài tập, ghi chú. Cách làm: thêm prop/thuộc tính ở các component dùng chung (`DataListPanel`, `StatusBadge` không cần; ô bảng tên, `ChatThread`, khung tin nhắn) trước, sau đó rà từng trang.
  3. Chỉ xử lý các node trong `MutationRecord.addedNodes`/`characterData` thay vì quét lại toàn bộ.
  4. Tải `en.generated.json` bằng `import()` động chỉ khi chọn tiếng Anh.
  5. Regex khớp theo ranh giới từ (đầu/cuối chuỗi hoặc ký tự không phải chữ) để không thay giữa từ.
- **TCCN:** test component: văn bản trong `translate="no"` giữ nguyên ở chế độ EN; bundle chính (`index-*.js`) giảm ≥ 150 KB (kiểm tra bằng `npm run build` + `npm run check:bundle-budget`).

#### D2 🟠 Ẩn nút xoá theo quyền
- `UsersAdminPage.tsx:140,152`: chỉ admin thấy nút xoá; không hiện nút xoá cho dòng có `role == 'admin'`. Áp dụng tương tự cho nút xoá lớp/học sinh/khoá/môn (theo Q3).

#### D3 🟠 Xác nhận trước khi duyệt/từ chối thanh toán
- `InvoicesPage.tsx:313`: bấm "Xác nhận"/"Từ chối" mở `Modal` (component sẵn có) hiển thị tên học sinh, mã hoá đơn, số tiền; từ chối bắt buộc nhập lý do nếu schema đã có trường lý do (xác minh). Chỉ admin thấy hai nút (Q2).

#### D4 🟠 Trang lớp học không ghi đè dữ liệu khi tải lỗi
- `ClassroomInteractionPage.tsx:109-134, 257`: khối lỗi xét **tất cả** query (`session`, `interaction`, `savedEntries`, …); effect khởi tạo chỉ chạy khi mọi query `isSuccess`; nút Lưu bị vô hiệu khi có query lỗi; "Thử lại" gọi `refetch` cho mọi query lỗi.
- **TCCN:** test component: mock `savedEntries` lỗi → không render form, không gọi hàm lưu; bấm Thử lại → refetch cả các query.

#### D5 🟡 Form giáo án không tự reset
- `LessonPlansPage.tsx:74`: `initialValues` bọc `useMemo`; thay `history.pushState` (28-32) bằng `useSearchParams` của `react-router`.

#### D6 🟡 Xác nhận các thao tác xoá còn thiếu
- Thu hồi lời mời (`UsersAdminPage.tsx:152`), xoá thẻ chat (`ChatWorkspace.tsx:133`): dùng hộp xác nhận cùng kiểu với các thao tác xoá khác trong app.

#### D7 🟡 Error boundary theo route
- Gắn `RouteErrorBoundary` (đã có) làm `errorElement` cho từng layout route trong `src/app/router.tsx`; lỗi tải chunk (`ChunkLoadError`/"Failed to fetch dynamically imported module") hiển thị nút "Tải lại trang".

#### D8 🟡 Dọn dẹp
- `vite.config.ts:10`: đổi `react-router-dom` thành `react-router` trong manual chunk.
- `router.tsx:120`: xoá `RequireRole` lồng thừa.
- Gộp `Logo.tsx` và `EduMatrixLogo.tsx` thành một component (giữ API của `Logo`, chuyển LandingPage sang dùng nó).

### Nhóm E — Chi phí vận hành

Thực hiện toàn bộ [kế hoạch tối ưu chi phí](../plans/2026-11-22-toi-uu-chi-phi-firestore.md) (Task 0–7), cộng thêm:
- **E1** B2 ở trên (dashboard phụ huynh đọc thừa).
- **E2** InvoicesPage chỉ gửi ID của job còn `pending/processing` khi poll.
- **E3** Tổng quan điểm danh admin (`attendance.ts:353-356`) tính từ `attendance_summaries` thay vì đọc mọi `attendance` 30 ngày.
- **TCCN:** < 40.000 lượt đọc/ngày trong 3 ngày làm việc liên tiếp (tab Usage của Firestore).

### Nhóm F — Scripts và cấu hình

- **F1 🟡** `scripts/migrate-lesson-plans.mjs`: thêm `--apply` (mặc định dry-run), kết nối emulator thật khi có `FIRESTORE_EMULATOR_HOST` (`connectFirestoreEmulator`), in project id và yêu cầu xác nhận trước khi ghi.
- **F2 🟡** `migrate-messenger-contexts.mjs`, `migrate-r3-enrollment-version.mjs`: bắt buộc `--project <id>`, không có mặc định production.
- **F3 🟡** `git rm --cached .env.emulator` (giữ file local); `validate-production-env.mjs` kiểm tra cả `.env.real.local` nếu tồn tại.

## 4. Thứ tự triển khai

| Đợt | Nội dung | Lý do | Cần trước khi |
|---|---|---|---|
| 1 | A1, A2, D2, D3 | Chặn mất tiền và mất dữ liệu ngay; thay đổi nhỏ | Có giao dịch thật |
| 2 | E (kế hoạch chi phí) + B2, B5 | Tránh app ngừng chạy do hết hạn mức | Mở cho phụ huynh dùng rộng |
| 3 | A3 + sửa truy vấn client | Lớn nhất, dễ gây `permission-denied`; cần chạy thử từng trang | Thêm giáo viên thứ hai |
| 4 | C1, C2, C3, D4, B1 | Đúng nghiệp vụ, không lộ dữ liệu | Kỳ thu học phí kế tiếp |
| 5 | A4–A8, B3, B4, C4–C7, D1, D5–D8, F1–F3 | Còn lại | — |

Mỗi đợt là một nhánh/PR riêng; rules và client thay đổi cùng lúc thì deploy rules **cùng lúc** với hosting (`firebase deploy --only firestore:rules,hosting`).

## 5. Tiêu chí nghiệm thu chung

- `npm run typecheck`, `npm test`, `npm run lint`, `npm run test:rules` đều đạt; `cd workers/messenger && npm test` đạt.
- Mỗi mục 🔴/🟠 có ít nhất một test tự động chứng minh hành vi mới (rules test cho nhóm A, unit/component test cho C/D, worker test cho B).
- Chạy thử trên emulator bằng 3 tài khoản (admin, giáo viên, phụ huynh) đi qua mọi trang trong menu: không có lỗi `permission-denied` ngoài các trường hợp bị chặn có chủ đích.
- Cập nhật `CODE_REVIEW_ISSUES.md`: đánh dấu từng mục đã sửa kèm commit.

## 6. Rủi ro

- **A3 có thể làm hỏng màn hình giáo viên** nếu sót một truy vấn danh sách chưa thêm bộ lọc. Giảm rủi ro: làm theo từng collection, chạy test rules + chạy thử emulator sau mỗi collection.
- **A1 điểm 1** khiến mọi hoá đơn tạo lúc `settings/payment` đang được sửa có thể bị từ chối; chấp nhận được (thử lại).
- **C1 điểm 3** đổi cách sinh ID hoá đơn — hoá đơn cũ giữ ID ngẫu nhiên; logic đếm buổi vẫn đọc theo `studentId/classId` nên không cần migrate.
- Mỗi `get()` trong rules tính 1 lượt đọc; A1 thêm 1–2 lượt mỗi hoá đơn tạo ra — không đáng kể.
