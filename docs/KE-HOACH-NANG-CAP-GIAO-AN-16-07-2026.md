# Kế hoạch nâng cấp Module Giáo án — 16/07/2026

> Trạng thái: **CHỜ DUYỆT**. Chưa đụng tới code thật (`src/`, `firebase/firestore.rules`). Đi kèm 1 file demo tĩnh: `docs/edumatrix-ui-lessonplans-demo-16-07-2026.html`.

## 0. Giả định (Assumptions — theo karpathy-guidelines, nêu rõ trước khi code)

Yêu cầu gốc chỉ nói "thiết kế 1 mẫu soạn giáo án chuyên nghiệp" mà không chỉ định các trường cụ thể, nên các quyết định dưới đây là suy luận hợp lý từ bối cảnh trung tâm dạy học thêm (không phải trường phổ thông theo CT GDPT 2018 chính quy), và **tôi tự quyết để không chặn tiến độ** — nếu sai hướng, có thể chỉnh trước khi triển khai thật:

1. **Cấu trúc giáo án chuyên nghiệp** = 5 khối cố định (Thông tin chung → Mục tiêu → Chuẩn bị → Tiến trình buổi học theo hoạt động có thời gian → Bài tập/Đánh giá), thay vì các "section" tự do tiêu đề+nội dung như hiện tại. Đây là cấu trúc giáo án phổ biến trong dạy học (mở đầu/khởi động, hình thành/luyện tập, vận dụng, củng cố), rút gọn cho phù hợp trung tâm.
2. **"Buổi học" (sessionId) trở thành lựa chọn thật** từ danh sách buổi học có sẵn của lớp (bảng `sessions`), thay vì ô nhập tay mã buổi như hiện tại — đây vừa là nâng cấp chức năng, vừa sửa một lỗ hổng dữ liệu (mã buổi tự gõ có thể sai/không tồn tại).
3. **Giữ nguyên hệ thống mẫu (template)** nhưng nâng cấp mẫu theo cấu trúc mới, hiển thị dạng thẻ thay vì dropdown đơn thuần.
4. **Không thêm rich-text/upload file** ở vòng này — nội dung vẫn là văn bản thuần (textarea), giữ đúng tinh thần Simplicity First; có thể bổ sung sau nếu cần.
5. **Có nút "In giáo án"** (dùng `window.print()` + CSS in) vì giáo án chuyên nghiệp thường cần bản in — chi phí cài đặt gần như bằng 0, không cần thư viện mới.
6. **Không đổi quyền truy cập** — vẫn Admin + Teacher được vào module (đúng route hiện tại `ROUTES.STAFF_LESSON_PLANS`), phụ huynh (viewer) chỉ thấy `publicSummary` qua `lesson_plan_public` như hiện có.

Nếu người dùng muốn khác đi ở điểm nào, có thể phản hồi trước khi tôi triển khai thật.

## 1. Hiện trạng (kết quả khảo sát)

- **Trang**: `src/features/lesson-plans/pages/LessonPlansPage.tsx` — 1 file phẳng 93 dòng, không tách component, danh sách `<ul>` phẳng (tiêu đề + trạng thái + số section), không tìm kiếm/lọc, không KPI.
- **Form hiện tại**: modal 1 khối, section tự do (tiêu đề + nội dung, thêm/xoá tuỳ ý), ô "Mã buổi học" là **input text tự gõ** — không liên kết bảng `sessions` thật.
- **Schema** (`src/schemas/lessonPlan.ts`): `title`, `classId/courseId/subjectId/sessionId` (nullable), `sections: {title, content}[]` (≥1), `publicSummary`, `status`.
- **Service** (`src/services/firestore/lessonPlans.ts`): CRUD cơ bản qua client SDK (Spark plan, không có Cloud Functions) + `publishSummary()` tự đồng bộ sang `lesson_plan_public` khi `status=published && classId` có giá trị.
- **Rules** (`firebase/firestore.rules`): có kiểm tra quyền (`isAdmin() || isAssignedTeacherForClass()`) nhưng **không có `validLessonPlanData`-kiểu hasAll/hasOnly** như `courses`/`classes`/`sessions`/`students`/`subjects` đã có — nghĩa là bất kỳ field nào cũng ghi được, không có ràng buộc hình dạng dữ liệu ở tầng Rules.
- **Lỗi phát hiện được**: `allow read` của `lesson_plans` là `isAdmin() || (classId != null && isAssignedTeacherForClass(classId))`. Nếu một giáo án được tạo với `classId = null`, **chính giáo viên tạo ra nó cũng không đọc lại được** (chỉ Admin đọc được). Sẽ sửa trong vòng này.
- **Điểm chạm module khác**: Sidebar mục "Giáo án" (icon `NotebookPen`, chỉ Admin+Teacher thấy); `ViewerDashboardPage`/`viewerDashboard.ts` lấy `publicSummary` qua `listPublicLessonPlansByClass()` để hiện "Giáo án tóm tắt" cho phụ huynh — **không đổi phần này** (giữ nguyên hợp đồng field `publicSummary`, `lessonPlanId`, `classId` trong `lesson_plan_public`).
- **Đã có sẵn, tái dùng được**: `listSessionsByClass(classId, from, to, pageSize)` trong `src/services/firestore/sessions.ts` — dùng thẳng cho bộ chọn buổi học, không cần viết mới.

## 2. Chuỗi logic Database → Backend (Rules) → Frontend

```
Firestore (schemaless)                Rules (chốt hình dạng + quyền)          Frontend (form + hiển thị)
─────────────────────────             ────────────────────────────           ──────────────────────────
lesson_plans/{id}                     validLessonPlanData(): hasAll/hasOnly   LessonPlanForm.tsx
 title, classId, courseId,             + status enum                          → chọn Lớp → tự lọc Buổi học
 subjectId, sessionId,                validLessonPlanObjectives()             → 3 ô Mục tiêu
 objectives{knowledge,skills,attitude} validLessonPlanPreparation()           → 2 ô Chuẩn bị
 preparation{teacher,student}          activities: list                       → useFieldArray Hoạt động
 activities[]{name,durationMinutes,    quyền: Admin hoặc GV được gán lớp       → tổng phút tự cộng, so với
   content,expectedOutcome}             + createdBy == uid khi đọc              thời lượng buổi học đã chọn
 homework, notesAfterTeaching                                                 → Bài tập về nhà / Ghi chú
 publicSummary, status                                                        → Lưu nháp / Xuất bản

   │ publish khi status=published && classId có giá trị (giữ nguyên cơ chế cũ)
   ▼
lesson_plan_public/{id}               canManageClass() / viewer đúng lớp con  ViewerDashboardPage (không đổi)
 lessonPlanId, classId, publicSummary                                        LessonPlanDetail.tsx (staff, đầy đủ)

lesson_plan_templates/{id}            isStaff() CRUD, hasOnly theo mẫu mới    Thư viện mẫu dạng thẻ trong form

sessions/{id}  ──(join phía client)──────────────────────────────────────►   KPI "Buổi thiếu giáo án":
 classId, startAt, endAt                                                     so khớp sessionId đã có giáo án
                                                                              với buổi học sắp tới của lớp
```

**Vì sao join ở client**: Firestore không hỗ trợ join phía server; Spark plan không có Cloud Functions. Cách làm giống hệt các vòng trước (vd. tính tự động học phí hoá đơn) — lấy `sessions` theo lớp + `lesson_plans` đã tải, đối chiếu bằng `sessionId` ở phía client. Chấp nhận được ở quy mô 1 trung tâm nhỏ; nếu dữ liệu lớn lên sẽ cần đánh index/phân trang — ghi nhận là đánh đổi đã biết, không xử lý thừa ở vòng này (Simplicity First).

## 3. Thay đổi dữ liệu (`src/types/academic.ts`)

```ts
export interface LessonPlanObjectives { knowledge: string; skills: string; attitude: string; }
export interface LessonPlanPreparation { teacher: string; student: string; }
export interface LessonPlanActivity {
  name: string;
  durationMinutes: number;
  content: string;
  expectedOutcome: string;
}
export interface LessonPlanDoc {
  title: string;
  classId: string | null;
  courseId: string | null;
  subjectId: string | null;
  sessionId: string | null;
  objectives: LessonPlanObjectives;
  preparation: LessonPlanPreparation;
  activities: LessonPlanActivity[];
  homework: string;
  notesAfterTeaching: string;
  attachmentUrl: string | null;   // link tài liệu đính kèm (Google Drive/OneDrive đã chia sẻ) — KHÔNG lưu qua Firebase Storage
  attachmentLabel: string;         // tên hiển thị, vd "Đề luyện tập Unit 5.pdf"
  publicSummary: string;
  status: LessonPlanStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface LessonPlanTemplateDoc {
  name: string;
  objectives: LessonPlanObjectives;
  preparation: LessonPlanPreparation;
  activities: LessonPlanActivity[];
  homework: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

`LessonPlanSection` (kiểu cũ) **giữ lại** trong file types — chỉ dùng cho hàm chuẩn hoá dữ liệu cũ, không dùng trong doc mới.

### Di trú dữ liệu cũ (không cần script — theo đúng cách đã làm với `pricePerSession`)

Giáo án cũ (nếu có) chỉ có `sections`, thiếu các field mới. Vì Spark plan không có Admin SDK để chạy batch migrate, dùng **chuẩn hoá phía client khi đọc** (lazy migration):

```ts
function normalizeLessonPlan(raw: Partial<LessonPlanDoc> & { sections?: LessonPlanSection[] }): LessonPlanDoc {
  return {
    ...raw,
    objectives: raw.objectives ?? { knowledge: "", skills: "", attitude: "" },
    preparation: raw.preparation ?? { teacher: "", student: "" },
    activities: raw.activities ?? (raw.sections ?? []).map(s => ({
      name: s.title, durationMinutes: 0, content: s.content, expectedOutcome: "",
    })),
    homework: raw.homework ?? "",
    notesAfterTeaching: raw.notesAfterTeaching ?? "",
  } as LessonPlanDoc;
}
```

Áp dụng trong `listLessonPlans()`/đọc chi tiết. Lần lưu tiếp theo (nháp hoặc xuất bản) sẽ ghi lại theo hình dạng mới — không cần script riêng, giáo án cũ vẫn mở/sửa/xem bình thường trong lúc chuyển đổi.

## 4. Thay đổi Rules (`firebase/firestore.rules`)

- Thêm `validLessonPlanData()`, `validLessonPlanObjectives()`, `validLessonPlanPreparation()` (hasAll/hasOnly theo đúng field trên, gồm cả `attachmentUrl`/`attachmentLabel` — 2 field string thường, không cần rule riêng vì không đụng Storage; giữ nhẹ — không validate sâu từng phần tử `activities[]` để tránh rules phức tạp không cần thiết).
- Áp `validLessonPlanData()` vào `allow create` và `allow update` của `lesson_plans` (giáo án cũ chưa lưu lại vẫn đọc được bình thường vì Rules chỉ chặn ghi, không chặn đọc theo hình dạng).
- **Sửa lỗi đọc**: `allow read` của `lesson_plans` thêm điều kiện `|| resource.data.createdBy == request.auth.uid` để người tạo luôn đọc lại được giáo án của chính mình kể cả khi chưa gắn lớp.
- `lesson_plan_templates`: thêm `hasOnly` theo mẫu field mới.
- `lesson_plan_public`: **không đổi** (giữ nguyên hợp đồng cho `ViewerDashboardPage`).
- Cập nhật fixture liên quan trong `firebase/tests/academic-rules.test.ts` nếu có test giả lập tạo/sửa lesson_plans theo hình cũ (không chạy được bộ test này trong sandbox — thiếu JDK 21, đã ghi nhận từ trước — sẽ tự kiểm bằng đọc code + nhờ người dùng chạy `npm run test:rules` khi rảnh).

## 5. Thay đổi Service (`src/services/firestore/lessonPlans.ts`)

- `createLessonPlan`/`updateLessonPlan`: nhận input theo `LessonPlanDoc` mới.
- `listLessonPlans()`/đọc theo id: áp `normalizeLessonPlan()` cho mỗi doc trả về.
- Thêm `listUpcomingSessionsWithoutLessonPlan(classIds, days = 7)`: dùng `listSessionsByClass()` có sẵn (không viết truy vấn Firestore mới) lấy buổi học sắp tới theo từng lớp, đối chiếu `sessionId` với danh sách giáo án đã tải, trả về buổi chưa có giáo án — phục vụ KPI cảnh báo.
- `createLessonPlanTemplate`: theo hình dạng mẫu mới (objectives/preparation/activities/homework).

## 6. Thay đổi Frontend

Tách module từ 1 file phẳng thành cấu trúc component (đúng khuôn mẫu đã áp dụng cho Lớp học/Catalog):

- `src/features/lesson-plans/pages/LessonPlansPage.tsx` — điều phối: KPI row + tabs "Danh sách" / "Soạn giáo án".
- `src/features/lesson-plans/components/LessonPlanList.tsx` — bảng danh sách (tìm kiếm, lọc lớp/trạng thái, cột Buổi học hiện ngày thật lấy từ session), khối cảnh báo "Buổi học sắp tới thiếu giáo án".
- `src/features/lesson-plans/components/LessonPlanForm.tsx` — **form thiết lập giáo án** (khối 0 trong demo): Thông tin chung (chọn Lớp → tự lọc Buổi học của lớp đó bằng `listSessionsByClass`, tự hiện Môn học/Khóa học của lớp), Mục tiêu (3 ô), Chuẩn bị (2 ô), Tiến trình buổi học (`useFieldArray`, mỗi hoạt động có tên/phút/nội dung/kết quả, tổng phút tự cộng và so sánh với thời lượng buổi học đã chọn), Bài tập về nhà, **Tài liệu đính kèm** (2 ô: tên hiển thị + link chia sẻ, xem mục 7b.2 — không upload file, chỉ lưu link), Tóm tắt công khai, thư viện mẫu dạng thẻ, Lưu nháp/Xuất bản.
- `src/features/lesson-plans/components/LessonPlanDetail.tsx` — **module giáo án hiển thị**: xem đầy đủ giáo án dạng tài liệu (không phải form), có nút In (`window.print()` + CSS `@media print`, xem mục 7b.1) và nút "Xem tài liệu đính kèm ↗" nếu có `attachmentUrl` (mở tab mới, không nhúng/tải file), dùng lại được cho cả xem trước trước khi lưu.
- `src/schemas/lessonPlan.ts`: viết lại theo cấu trúc mới (zod object lồng nhau cho `objectives`/`preparation`, mảng `activities` min 1).

## 7. Thứ tự triển khai (khi được duyệt)

1. Types + hàm `normalizeLessonPlan` + `utils` liên quan (nếu cần tách riêng).
2. Firestore Rules (`validLessonPlanData` + sửa lỗi đọc `createdBy`) + soát fixture test.
3. Service layer (`lessonPlans.ts` viết lại theo hình mới, thêm `listUpcomingSessionsWithoutLessonPlan`).
4. `schemas/lessonPlan.ts` viết lại.
5. `LessonPlanForm.tsx` (form thiết lập).
6. `LessonPlanDetail.tsx` (module hiển thị) + `LessonPlanList.tsx` + `LessonPlansPage.tsx` lắp ráp lại.
7. `npm run typecheck` + `npm run lint` toàn repo, đối chiếu `src/features/students/**` không đổi.

Mỗi bước xong đều dừng kiểm tra clean trước khi sang bước kế — đúng thói quen đã dùng suốt các vòng trước.

## 7b. Đính kèm PDF + In giáo án — KHÔNG dùng Firebase File Storage

Bổ sung theo yêu cầu 16/07/2026: đưa cả 2 chức năng (đính kèm PDF, in giáo án) vào phạm vi kế hoạch/demo lần này, với ràng buộc rõ: **không dùng Firebase Storage** (đã xác nhận bị gỡ khỏi Spark plan từ 03/02/2026, dự án Spark bị chặn hoàn toàn — lỗi 402/403 dù file nhỏ cỡ nào).

### 7b.1. In giáo án — không cần lưu file, không liên quan Storage

Dùng `window.print()` render thẳng nội dung `LessonPlanDetail.tsx` (đã có trong demo mục 6) + CSS `@media print` ẩn sidebar/topbar/nút bấm, chỉ để lại nội dung tài liệu. Người dùng tự "Lưu thành PDF" từ hộp tho ại in của trình duyệt nếu muốn. Không đụng tới bất kỳ dịch vụ lưu trữ nào — dùng được ngay trên Spark.

### 7b.2. Đính kèm PDF — phương án "link tham chiếu", không upload qua backend của hệ thống

Thay vì xây pipeline tải file lên (vốn mới cần Storage), giáo án chỉ lưu **1 đường link** trỏ tới file mà giáo viên đã tự lưu ở nơi khác (Google Drive/OneDrive của họ, đã bật "Ai có link đều xem được"). Hệ thống không tải, không giữ bản sao file:

- Field mới trong `LessonPlanDoc` (mục 3): `attachmentUrl: string | null`, `attachmentLabel: string` — 2 chuỗi văn bản thường, nặng vài chục byte, không phải file nhị phân.
- **Form thiết lập giáo án**: thêm khối "Tài liệu đính kèm" — 1 ô nhập tên hiển thị (vd "Đề luyện tập Unit 5.pdf") + 1 ô dán link chia sẻ, có gợi ý rõ "Dán link Google Drive/OneDrive đã bật chia sẻ xem — hệ thống không lưu trữ file, chỉ lưu đường dẫn". Validate nhẹ ở client: link phải bắt đầu `https://`.
- **Module hiển thị**: nếu có `attachmentUrl`, hiện 1 nút/chip "Xem tài liệu đính kèm ↗" mở link ở tab mới (`target="_blank" rel="noopener"`). Không nhúng/preview PDF trong app (tránh phải tải file về, giữ đúng tinh thần không cần Storage).
- **Rules**: chỉ cần đưa 2 field vào `hasOnly` của `validLessonPlanData()` (đã cập nhật ở mục 3-4), không cần rule đặc biệt vì không có object Storage nào để cấp quyền.
- **Chi phí/độ phức tạp**: gần như bằng 0 — không OAuth, không API key, không thư viện mới, không phát sinh chi phí Firebase. Đánh đổi: giáo viên phải tự tạo link chia sẻ trước (thao tác 1 lần trên Drive/OneDrive của họ), hệ thống không kiểm soát được việc chủ file đổi quyền chia sẻ/xoá file sau này (rủi ro link chết — chấp nhận được ở quy mô hiện tại, đúng tinh thần Simplicity First thay vì xây cả một lớp quản lý file).

### 7b.3. Phương án đầy đủ hơn (không chọn cho vòng này, ghi lại để sau)

Nếu sau này muốn giáo viên upload trực tiếp trong app thay vì tự dán link, có 2 hướng đã trao đổi trước đó — **không nằm trong phạm vi triển khai lần này**:
- Google Drive Picker/API tích hợp riêng (OAuth2 + Drive API, phức tạp hơn nhiều so với 7b.2, xem chi tiết đánh đổi đã ghi trong bộ nhớ dự án).
- Nâng cấp Blaze để dùng lại Firebase Storage trực tiếp (cần khai thẻ, dù có hạn mức miễn phí).

## 8. Demo đính kèm

`docs/edumatrix-ui-lessonplans-demo-16-07-2026.html` — 1 file tĩnh, 2 tab:
- **"Module hiển thị"**: KPI (Tổng giáo án/Bản nháp/Đã xuất bản/Buổi thiếu giáo án), bảng danh sách + tìm/lọc, panel chi tiết giáo án dạng tài liệu chuyên nghiệp có nút In + nút Xem tài liệu đính kèm.
- **"Form thiết lập"**: form soạn giáo án đầy đủ theo cấu trúc mới ở mục 6, có xem trước tổng thời gian hoạt động, thư viện mẫu dạng thẻ, khối đính kèm tài liệu (link, không upload file).

Demo dùng dữ liệu giả, chưa nối vào code thật — đúng quy trình Lập kế hoạch → Demo → Đợi duyệt → Triển khai đã áp dụng cho các module trước.
