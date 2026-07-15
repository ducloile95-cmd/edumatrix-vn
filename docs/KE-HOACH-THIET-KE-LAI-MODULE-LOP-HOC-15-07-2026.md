# Kế hoạch thiết kế lại Frontend — Module Lớp học

Ngày lập: 15/07/2026
Phạm vi: `src/features/classes/**` — 3 màn: Danh sách lớp học, Form tạo/sửa lớp, Chi tiết lớp + Ghi danh học sinh.
Nguồn chuẩn áp dụng: `DESIGN-SYSTEM-v2.md` + `KE-HOACH-DESIGN-FRONTEND-TOAN-HE-THONG.md`. Tham chiếu trực quan (không chỉnh sửa): `features/students/**` — đã khóa, chỉ dùng làm mẫu.
Quy trình: **Kế hoạch (tài liệu này) → Demo tĩnh (`edumatrix-ui-classes-demo-15-07-2026.html`) → Chờ chủ dự án duyệt → mới đụng vào code thật.**

## 1. Vì sao làm lại module này

`KE-HOACH-NANG-CAP-UI-UX-TOAN-HE-THONG-14-07-2026.md` (Phase 2) mới chỉ bỏ `glass-panel` thừa ở `ClassesPage.tsx` — chưa nâng cấp thật sự. So với module Học sinh (đã khóa, dùng làm mẫu), module Lớp học hiện có 4 khoảng trống rõ:

| Khoảng trống hiện tại | Bằng chứng |
|---|---|
| Không có hàng KPI tổng quan ở đầu trang | `ClassesPage.tsx` chỉ có `PageHeader` + card bọc danh sách |
| Bảng danh sách là `<ul>` đơn giản, thiếu cột Giáo viên, tên Khóa học hiển thị dạng ẩn (chỉ suy ra qua click), không có header dính | `ClassesList.tsx` dòng 76-105 |
| Multi-select giáo viên/môn học dùng `<select multiple>` gốc trình duyệt — vi phạm rule §2 Touch & Interaction (target quá nhỏ, không thao tác tốt trên di động) | `ClassForm.tsx` dòng 150-198 |
| Trang chi tiết lớp không hiển thị tên khóa học/tên giáo viên (chỉ có ID ẩn), Enrollment Manager là `<select>` + list phẳng, xoá học sinh khỏi lớp không có xác nhận | `ClassDetailPage.tsx`, `EnrollmentManager.tsx` |

## 2. Mức độ áp dụng — đã chốt với chủ dự án: **Vừa phải**

KPI tổng ở đầu trang + bảng gọn nâng cấp theo Design System v2. **Không thêm loại truy vấn Firestore mới** (không tạo composite index mới, không thêm collection đọc mới). Được phép **tái dùng hàm service đã tồn tại** ở nơi mà module Lớp học hiện chưa gọi tới — đúng nguyên tắc Phase 3 đã áp dụng cho biểu đồ ("tái dùng service/list function đã có, không thêm query mới tốn read"). Cụ thể sẽ tái dùng:

| Hàm đã có sẵn | Hiện đang dùng ở | Sẽ gọi thêm ở | Chi phí read thêm |
|---|---|---|---|
| `listCourses()` | `ClassForm.tsx`, `StudentsList.tsx` | `ClassesList.tsx`, `ClassDetailPage.tsx` | Đã cache theo `queryKey: ["courses"]` (React Query, `staleTime` như Students) — nếu người dùng đã mở trang Học sinh/Danh mục trong phiên, gần như 0 read thêm |
| `listUsersByRole("teacher")` | `ClassForm.tsx` | `ClassesList.tsx`, `ClassDetailPage.tsx` | Cache theo `queryKey: ["users","teacher"]`, dùng chung giữa 3 màn |
| `listStudents()` | `EnrollmentManager.tsx`, `StudentsList.tsx` | Không đổi — chỉ đổi UI hiển thị | Không tăng |

Không gọi thêm `listSessions`/`listAttendanceSummaries`/`listInvoices` cho module này — vì Depth "Vừa phải" không cần mini-metric điểm danh/bài tập theo từng lớp như Học sinh; KPI chỉ tính từ dữ liệu `ClassDoc` đã có (`studentIds`, `status`, `scheduleText`, `teacherIds`) và từ `courses`/`teachers` đã tái dùng ở trên.

## 3. Màn 1 — Danh sách lớp học (`ClassesPage.tsx` + `ClassesList.tsx`)

**Hàng KPI** (4 thẻ `StatCard`, tách thành component dùng chung `components/ui/StatCard.tsx` — hiện `StatCard` chỉ định nghĩa cục bộ trong `StaffDashboardPage.tsx`, tách ra để dùng lại đúng tinh thần "component dùng chung" của Design System):

1. Tổng số lớp (tất cả trạng thái)
2. Lớp đang hoạt động
3. Tổng học sinh đang ghi danh (tổng `studentIds.length` của lớp `active`)
4. Lớp thiếu dữ liệu vận hành (chưa có lịch học hoặc chưa gán giáo viên) — chỉ số chất lượng dữ liệu, tone `warning`

**Toolbar lọc**: giữ `SearchInput` (tìm theo tên lớp) + đổi `<select>` trạng thái thành segmented control 4 nhánh (Tất cả/Đang hoạt động/Đã kết thúc/Đã hủy) giống `StudentsList.tsx` dòng 160-185 — nhất quán thao tác, target chạm lớn hơn.

**Bảng** (thay `<ul>` bằng bảng có header dính, cột `tabular-nums` cho số liệu, đúng §4 Design System v2):

| Lớp học | Khóa học | Giáo viên | Sĩ số | Lịch & địa điểm | Trạng thái | Thao tác |
|---|---|---|---|---|---|---|
| Tên lớp | Tên khóa (thay ID thô) | Tên giáo viên đầu tiên + "+N" nếu nhiều | `studentIds.length` tabular-nums | `scheduleText` · `location`, "Chưa có lịch" nếu rỗng | `StatusBadge` (giữ nguyên 3 tone hiện có) | Sửa · Quản lý học sinh |

Mobile (<640px): mỗi dòng gập thành card thay vì bảng cuộn ngang — đúng rule `layout & responsive`.

**Không đổi**: `Pagination`, `EmptyState`/`ErrorState`/`LoadingSkeleton`, logic filter, route `classDetailPath`.

## 4. Màn 2 — Form tạo/sửa lớp (`ClassForm.tsx`, trong `Modal` có sẵn)

- Giữ nguyên `Modal` bọc ngoài, `zodResolver`, luồng submit/mutation — không đổi schema, không đổi field.
- Nhóm field theo 3 khối có tiêu đề phụ nhỏ (rule `field-grouping`): "Thông tin lớp" (Tên lớp, Khóa học, Trạng thái) → "Phân công" (Môn học, Giáo viên) → "Lịch & địa điểm" (Lịch học, Địa điểm).
- **Đổi `<select multiple>` môn học/giáo viên → chip-toggle list** (nút bấm dạng pill, bấm để chọn/bỏ chọn, hiển thị số đã chọn ở trên, có ô tìm nhanh nếu danh sách dài): sửa lỗi thật vi phạm §2 Touch & Interaction (44px target) và §8 Forms, không phải đổi thẩm mỹ đơn thuần.
- Thêm dấu `*` ở nhãn field bắt buộc (Tên lớp, Khóa học, Môn học) theo rule `required-indicators`.
- Giữ nguyên vị trí thông báo lỗi dưới field, thông báo submit thành công/thất bại.

## 5. Màn 3 — Chi tiết lớp + Ghi danh (`ClassDetailPage.tsx`, `EnrollmentManager.tsx`)

**Hero card** (đúng blueprint §4.4 Design System — "tên, môn, giáo viên, lịch, số học sinh"): tên lớp + `StatusBadge`, tên khóa học, chip môn học, tên giáo viên phụ trách (tái dùng `listCourses`/`listUsersByRole` như mục 2), lịch học/địa điểm, sĩ số hiện tại.

**Enrollment Manager**:
- Thay `<select>` thêm học sinh bằng ô tìm kiếm (`SearchInput`, lọc client-side trên `listStudents()` đã có) + danh sách kết quả có checkbox, thay vì dropdown một lựa chọn mỗi lần.
- Danh sách học sinh đã ghi danh hiển thị dạng hàng có avatar chữ cái đầu (giống pattern `avatar` trong Students), tên, mã học sinh; nút "Rút khỏi lớp" mở **Confirm Modal** (dùng component `Modal` sẵn có, không tạo mới) nêu rõ tên học sinh — đúng rule `confirmation-dialogs` (hành động phá hủy phải xác nhận, hiện tại xóa thẳng không hỏi lại).
- Hiển thị "Đã ghi danh X học sinh" rõ ràng ở đầu khối.

## 6. Việc KHÔNG làm trong đợt này

- Không đổi Firestore schema, security rules, route path.
- Không thêm biểu đồ (attendance/homework theo lớp) — thuộc mức "Đầy đủ" đã không chọn.
- Không đổi `EnrollmentManager` sang server-side search (vẫn client-filter, đúng quy mô trung tâm nhỏ theo ghi chú A14 trong code).
- Không động vào `features/students/**` (đã khóa, chỉ tham chiếu).
- Không self-host font (việc tồn đọng riêng, không thuộc phạm vi module này).

## 7. Rủi ro & lưu ý

- Tách `StatCard` thành component dùng chung sẽ đổi import trong `StaffDashboardPage.tsx` — cần kiểm tra không phá layout dashboard hiện tại khi refactor.
- Chip-toggle cho môn học/giáo viên thay đổi hành vi thao tác so với `<select multiple>` cũ — cần giữ đúng field `subjectIds`/`teacherIds` không đổi kiểu dữ liệu (`string[]`), chỉ đổi UI input.
- Việc gọi thêm `listCourses`/`listUsersByRole` ở `ClassesList`/`ClassDetailPage` có thể phát sinh 1 lần read đầu phiên nếu người dùng vào thẳng trang Lớp học mà chưa từng mở trang khác — chấp nhận được vì cùng cấp độ với cách `StudentsList` đang làm.

## 8. Tiêu chí duyệt demo

- [ ] Đúng token màu/spacing/radius/motion hiện có (không tự chế màu mới).
- [ ] Không dùng emoji làm icon; dùng lại icon set Lucide/outline đã thấy trong app.
- [ ] KPI, bảng, form, hero, enrollment đều thể hiện đúng dữ liệu tiếng Việt có dấu.
- [ ] Contrast text ≥4.5:1, touch target ≥44px trên mọi control demo.
- [ ] Xem được ở 375px và ≥1280px, không tràn ngang.
- [ ] Chủ dự án xác nhận "duyệt" hoặc nêu điểm cần sửa trước khi đụng vào `.tsx` thật.
