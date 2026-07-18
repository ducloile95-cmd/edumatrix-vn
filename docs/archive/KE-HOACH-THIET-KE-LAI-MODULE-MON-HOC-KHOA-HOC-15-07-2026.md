# Kế hoạch thiết kế lại Frontend — Module Môn học & Khóa học

Ngày lập: 15/07/2026
Phạm vi: `src/features/catalog/**`, route `/app/catalog` (không đổi path).
Nguồn chuẩn áp dụng: `DESIGN-SYSTEM-v2.md` + `KE-HOACH-DESIGN-FRONTEND-TOAN-HE-THONG.md`; nhất quán với cách làm đã duyệt ở Module Lớp học (15/07/2026): KPI đầu trang, tái dùng service function có sẵn, không thêm loại truy vấn Firestore mới.
Quy trình: **Kế hoạch (tài liệu này) → Demo tĩnh (`edumatrix-ui-catalog-demo-15-07-2026.html`) → Chờ chủ dự án duyệt → mới đụng vào code thật.**

## 1. Quyết định đã chốt với chủ dự án

| Câu hỏi | Lựa chọn đã chọn |
|---|---|
| Điều hướng 2 nhánh | **Tab trong cùng 1 trang `/app/catalog`** (segmented control đầu trang) — không thêm route, không đổi sidebar |
| Cách gộp Môn học & Khóa học | **Khóa học làm bảng trung tâm, gắn thẻ môn học inline; Môn học quản lý ở panel gọn bên cạnh** |
| Độ sâu Dashboard | **KPI + biểu đồ trực quan** (khóa học theo trạng thái, khóa học theo môn, phân bố học phí) |

## 2. Vì sao làm lại module này

`CatalogPage.tsx` hiện tại chỉ xếp chồng 2 khối `SubjectsList`/`CoursesList` độc lập, mỗi khối là `<ul>` đơn giản, không có KPI, không có biểu đồ, không liên kết dữ liệu giữa môn học và khóa học dù `CourseDoc.subjectIds` đã tham chiếu `SubjectDoc` sẵn.

Phát hiện thêm khi đọc code (đáng sửa cùng đợt vì ảnh hưởng trực tiếp đến trải nghiệm "chuyên nghiệp" mà yêu cầu đặt ra):

| Khoảng trống | Bằng chứng |
|---|---|
| **Khóa học không sửa được** — chỉ tạo mới (`CourseForm.tsx` không nhận `editingCourse`) và đổi trạng thái qua `<select>` rời trong bảng | `CourseForm.tsx` dòng 8, `CoursesList.tsx` dòng 75-87 |
| **Môn học không sửa được** — chỉ tạo mới và lưu trữ/kích hoạt lại, không sửa tên/mã/mô tả | `SubjectForm.tsx`, `SubjectsList.tsx` dòng 62-74 |
| Bảng khóa học không hiện tên môn học — chỉ ẩn trong dữ liệu, không hiển thị trên UI | `CoursesList.tsx` — không có cột môn học |
| Không có chỉ số tổng quan nào (KPI/biểu đồ) cho toàn danh mục | `CatalogPage.tsx` |

## 3. Nhánh 1 — Dashboard (tab "Tổng quan")

Toàn bộ tính từ `listCourses()` + `listSubjects()` — **2 hàm đã dùng sẵn** ở `CourseForm`/`SubjectsList`/`CoursesList`, cùng `queryKey` nên chia sẻ cache React Query với tab Danh mục. Không gọi thêm bất kỳ hàm Firestore nào khác (không cần `listClasses`).

**Hàng KPI (4 thẻ, dùng lại `StatCard` đã tách khi làm Module Lớp học):**

1. Tổng số khóa học (mọi trạng thái)
2. Đang mở (status `active`) — hint: "X nháp · Y đã kết thúc"
3. Môn học đang dùng (status `active`) — hint: "Z môn đã lưu trữ"
4. Môn học chưa có khóa học — cảnh báo dữ liệu (tone `warning`), tính bằng `subjects` không xuất hiện trong bất kỳ `course.subjectIds` nào

**3 biểu đồ (recharts — thư viện đã dùng ở `StaffDashboardPage`/`ScoresPage`, không thêm dependency mới):**

| Biểu đồ | Loại | Dữ liệu |
|---|---|---|
| Khóa học theo trạng thái | Bar ngang | Đếm `courses` theo `status` (3 nhóm: Nháp/Đang mở/Đã kết thúc) |
| Khóa học theo môn học | Bar ngang | Đếm khóa học tham chiếu mỗi `subjectId`, top 6 môn nhiều khóa nhất + gộp phần còn lại vào "Khác" nếu &gt;6 môn |
| Phân bố học phí | Bar dọc (histogram) | Bucket `tuitionFee` theo khoảng 2 triệu VNĐ, cùng kiểu histogram đã dùng ở `ScoresPage` |

**Khối "Môn học chưa có khóa học"** (nếu có): list nhỏ bên cạnh biểu đồ trạng thái, mỗi dòng có nút "Thêm khóa học cho môn này" → chuyển sang tab Danh mục, mở modal tạo khóa học với môn học đã chọn sẵn. Đây là điểm nối 2 nhánh, đúng tinh thần "phân tích chỉ số dẫn tới hành động" đã làm ở Tổng quan hệ thống (StaffDashboardPage).

## 4. Nhánh 2 — Danh mục (tab "Danh mục", màn quản lý gộp)

Bố cục 2 cột (`lg:grid-cols-[1.6fr_1fr]`, cùng nhịp tỉ lệ đã dùng ở `StaffDashboardPage`):

### Cột chính — Bảng khóa học (trung tâm)

- Toolbar: `SearchInput` (tên khóa học) + segmented trạng thái (Tất cả/Nháp/Đang mở/Đã kết thúc), giống `ClassesList` đã duyệt.
- **Chip lọc theo môn học** ngay trên bảng: bấm 1 môn ở panel bên phải sẽ lọc bảng theo môn đó, hiện chip "Đang lọc: {Tên môn} ✕" để xoá — đây là điểm gộp thông tin thật (không chỉ hiển thị cạnh nhau).
- Cột bảng: **Khóa học** (tên + chip môn học ngay dưới tên, tối đa 3 chip + "+N") · **Học phí** (`tabular-nums`, format `vi-VN`) · **Số buổi** (`tabular-nums`) · **Thời lượng** (ngày bắt đầu → kết thúc) · **Trạng thái** (`StatusBadge` + đổi nhanh, giữ hành vi hiện có) · **Thao tác** (nút "Sửa" mở modal — **mới**, vì hiện tại chưa có).
- Rỗng/lỗi/loading dùng lại `EmptyState`/`ErrorState`/`LoadingSkeleton`.

### Cột phụ — Panel Môn học (gọn bên cạnh)

- Header panel: tiêu đề "Môn học" + nút nhỏ "Thêm môn học" (secondary, không phải CTA chính của trang).
- Ô tìm nhanh theo tên/mã.
- Mỗi dòng: tên môn + mã (`font-mono`) + `StatusBadge` + **số khóa học thuộc môn** (badge số, tính từ `courses`) + nút "Sửa" (**mới**) — bấm vào dòng (ngoài nút Sửa) sẽ kích hoạt bộ lọc ở bảng khóa học bên trái.
- Nút lưu trữ/kích hoạt lại giữ nguyên hành vi hiện có.

### Primary CTA của trang

- `PageHeader` actions = **"Thêm khóa học"** (khóa học là trung tâm theo lựa chọn đã chốt); "Thêm môn học" chỉ là nút phụ trong panel — đúng rule "mỗi màn hình 1 CTA chính".

## 5. Việc mới phát sinh cần chủ dự án duyệt riêng (nằm ngoài phạm vi "chỉ sửa UI")

Vì 2 khoảng trống dưới đây được phát hiện khi đọc code và trực tiếp cần để màn "gộp thông tin chuyên nghiệp" có ý nghĩa (bảng có nút Sửa nhưng không sửa được thì vô dụng), đề xuất làm cùng đợt:

- [ ] Thêm chế độ sửa cho `CourseForm.tsx` (theo đúng pattern `ClassForm.tsx`: nhận `editingCourse`, `reset()` khi đổi, gọi `updateCourse` thay vì `createCourse`) — cần thêm hàm `updateCourse()` vào `services/firestore/courses.ts` (chưa có, chỉ có `createCourse`/`setCourseStatus`).
- [ ] Thêm chế độ sửa cho `SubjectForm.tsx` tương tự — cần thêm hàm `updateSubject()` vào `services/firestore/subjects.ts` (chưa có, chỉ có `createSubject`/`setSubjectStatus`).

Không đổi schema Firestore (chỉ thêm hàm update field đã có sẵn trong `SubjectDoc`/`CourseDoc`), không đổi rules.

## 6. Việc KHÔNG làm trong đợt này

- Không đổi Firestore schema/rules/route path.
- Không thêm biểu đồ liên quan Lớp học/Điểm danh vào Dashboard này (giữ đúng phạm vi Môn học & Khóa học, tránh gọi thêm `listClasses`/`listSessions` không cần thiết).
- Không xoá khóa học/môn học (chỉ có lưu trữ/kích hoạt lại, giữ nguyên logic an toàn dữ liệu hiện có).
- Không động vào `features/students/**` (đã khóa) hay `features/classes/**` (vừa duyệt xong đợt trước).

## 7. Rủi ro & lưu ý

- Chip lọc môn học trong bảng khóa học là state cục bộ (`useState`), không đẩy lên URL — nếu sau này cần chia sẻ link lọc thì làm riêng, không thuộc phạm vi này.
- `updateCourse`/`updateSubject` mới cần đảm bảo không đổi `subjectIds` theo cách phá vỡ tham chiếu ở `ClassDoc.subjectIds` (Lớp học tự chọn môn học riêng, không phụ thuộc `CourseDoc.subjectIds` — xem `ClassForm.tsx`) — không có rủi ro ràng buộc chéo.
- Biểu đồ "Khóa học theo môn học" cần xử lý trường hợp 0 môn học hoặc môn học không có khóa học nào (empty state cho chart, không hiện trục rỗng).

## 8. Tiêu chí duyệt demo

- [ ] Đúng token màu/spacing/radius/motion hiện có, nhất quán với demo Lớp học vừa duyệt.
- [ ] Tab chuyển giữa Dashboard/Danh mục mượt, không mất trạng thái lọc khi cần.
- [ ] Chip lọc môn học ở bảng khóa học hoạt động đúng khi bấm từ panel bên phải.
- [ ] 3 biểu đồ đọc được, có tooltip, không chỉ dùng màu làm tín hiệu duy nhất.
- [ ] Xác nhận phạm vi mục 5 (thêm sửa Khóa học/Môn học) — chủ dự án duyệt riêng nếu đồng ý mở rộng ngoài UI thuần túy.
- [ ] Xem được ở 375px và ≥1280px, không tràn ngang.
