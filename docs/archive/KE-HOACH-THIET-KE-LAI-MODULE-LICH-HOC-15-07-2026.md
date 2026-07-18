# Kế hoạch thiết kế lại Frontend — Module Lịch học

Ngày lập: 15/07/2026
Phạm vi: `src/features/sessions/**` (Staff, route `/app/sessions`), `src/features/dashboard/pages/ViewerSchedulePage.tsx` (Viewer, route `/portal/schedule`). Không đổi route path nào.
Nguồn chuẩn áp dụng: `DESIGN-SYSTEM-v2.md`; nhất quán với 2 đợt đã duyệt (Lớp học 15/07, Môn học & Khóa học 15/07): KPI đầu trang bằng `StatCard`, tái dùng service function có sẵn, không thêm loại truy vấn Firestore mới, tab trong cùng 1 route thay vì thêm route mới.
Quy trình: **Kế hoạch (tài liệu này) → Demo tĩnh (`edumatrix-ui-schedule-demo-15-07-2026.html`) → Chờ chủ dự án duyệt → mới đụng vào code thật.**

## 1. Quyết định đã chốt với chủ dự án

| Câu hỏi | Lựa chọn đã chọn |
|---|---|
| Khung giờ Timetable | **06:00 – 23:00** (17 giờ, phủ ca sáng/chiều/tối) |
| Vị trí Nhánh 2 "Danh sách lớp" | **Tab riêng cạnh Timetable**, trong cùng `/app/sessions` |
| Phạm vi áp dụng | **Cả Staff (`/app/sessions`) và Viewer (`/portal/schedule`)** |

## 2. Vì sao làm lại

`SessionsPage.tsx` hiện tại: danh sách buổi học dạng `<ul>` phẳng theo tuần/tháng, không có view Ngày, không có time-grid trực quan (không thấy được vị trí thời gian thực của từng buổi trên trục giờ), không có KPI, đổi lịch bằng `<input type="datetime-local">` rời rạc kém trực quan. `ViewerSchedulePage.tsx` cũng chỉ là `<ul>` phẳng không lọc theo ngày/tuần, không tách theo con khi phụ huynh có nhiều học sinh.

| Khoảng trống | Bằng chứng |
|---|---|
| Không xem được lịch dạng Ngày, chỉ Tuần/Tháng qua `<select>` | `SessionsPage.tsx` dòng 29, 68-70 |
| Không có time-grid, buổi học liệt kê tuyến tính không thấy trùng giờ | `SessionsPage.tsx` dòng 80-102 |
| Không có chỉ số tổng quan (KPI) nào | `SessionsPage.tsx` |
| Danh sách lớp không xuất hiện ở module này dù `ClassDoc` đã có `courseId`/`subjectIds` | Không có bảng lớp trong `SessionsPage.tsx` |
| Viewer không lọc được theo ngày/tuần hay theo con | `ViewerSchedulePage.tsx` dòng 15 |

## 3. Nhánh 1 — Timetable (tab "Lịch dạy")

**Bộ lọc Ngày/Tuần/Tháng** — segmented control 3 nút (giống pattern `STATUS_FILTERS` đã dùng ở `ClassesList`/`CoursesList`), thay cho `<select>` hiện tại. Điều hướng "Kỳ trước/Kỳ tiếp" + nút "Hôm nay".

**Time-grid trục giờ 06:00 → 23:00** (17 hàng giờ, mỗi hàng cao cố định):
- View **Tuần**: 7 cột ngày × time-grid dùng chung, cột "hôm nay" tô nhấn nhẹ.
- View **Ngày**: 1 cột phóng to, cùng khung giờ, đọc dễ hơn trên di động.
- View **Tháng**: lưới lịch tháng chuẩn (6 hàng × 7 cột), mỗi ô ngày hiện số buổi học dạng chip đếm (không nhồi time-grid vào ô tháng vì quá dày đặc — đúng khuyến nghị `responsive-chart`/`data-density` trong Design System v2); bấm vào 1 ngày → chuyển sang view Ngày của ngày đó.
- **Buổi học hiển thị chính xác vị trí thời gian**: mỗi buổi là 1 block định vị `top`/`height` theo % tính từ `(startAt - 06:00) / (23:00 - 06:00)`, không làm tròn giờ. 2+ buổi trùng giờ (VD buổi học bù) tự chia cột cạnh nhau trong cùng ô ngày, không đè lên nhau.
- Màu block theo `SessionStatus` (dùng lại tone của `StatusBadge`: scheduled=info, rescheduled=warning, completed=success, cancelled=danger — không chỉ dùng màu, luôn kèm nhãn chữ trong block).
- Bấm vào block → xem nhanh (tên lớp, khóa học, môn học, địa điểm, trạng thái) + link "Đổi lịch"/"Quản lý học sinh".

**Hàng KPI (3 thẻ, dùng lại `StatCard` đã tách khi làm Lớp học):**

1. **Số lớp hôm nay** — đếm số lớp (theo `classId` duy nhất) có buổi học rơi vào ngày hôm nay, từ `listSessions()` đã tải cho view hiện tại.
2. **Số lớp đang hoạt động** — đếm `classes` có `status === "active"`, từ `listClasses()` đã dùng sẵn ở `ClassForm`/`ClassesList`.
3. **Lớp mới sắp tới** — lớp có `createdAt` trong 30 ngày gần nhất **và** còn buổi học chưa diễn ra (dùng field `createdAt` sẵn có trên `ClassDoc`, không thêm field/schema mới).

Toàn bộ tính từ `listClasses()` + `listSessions()` — 2 hàm đã dùng sẵn trong chính `SessionsPage.tsx` hiện tại, cùng `queryKey` nên chia sẻ cache, không thêm loại truy vấn Firestore mới.

## 4. Nhánh 2 — Danh sách lớp học (tab "Danh sách lớp")

Bảng lớp học tái dùng `listClasses()` + `listCourses()` + `listSubjects()` + `listUsersByRole(TEACHER)` — đúng 4 hàm đã dùng ở `ClassesList.tsx`/`ClassForm.tsx`, cùng `queryKey` nên chia sẻ cache React Query.

Cột bảng: **Lớp học** · **Khóa học** · **Môn học** (chip, tái dùng pattern chip đã làm ở `CoursesList.tsx` bên Catalog) · **Giáo viên** · **Lịch học** (`scheduleText`) · **Buổi tiếp theo** (buổi `scheduled` gần nhất từ `listSessions`, nếu có tải) · **Trạng thái**.

Search + segmented lọc trạng thái giống `ClassesList.tsx` đã duyệt. Nút "Xem lịch" trên mỗi dòng → chuyển sang tab Timetable, tự lọc theo `classId` đó (điểm nối 2 nhánh, đúng tinh thần đã làm ở Catalog).

Không thêm nút Sửa lớp ở đây (đã có sẵn ở `/app/classes` — tránh trùng lặp chức năng, giữ đúng vai trò "Lịch học" là xem lịch, không phải nơi quản lý hồ sơ lớp).

## 5. Viewer (`/portal/schedule`) — áp dụng Nhánh 1 dạng rút gọn

- Cùng time-grid 06:00–23:00, nhưng chỉ bộ lọc **Ngày/Tuần** (bỏ Tháng — phụ huynh ít cần nhìn tổng quan cả tháng, giữ màn đơn giản).
- Không có nút "Tạo buổi học", không sửa được giờ (read-only) — đúng quyền Viewer hiện tại (không có mutation nào trong `ViewerSchedulePage.tsx` gốc).
- Nếu phụ huynh có nhiều con: thêm chip lọc theo tên học sinh, dữ liệu lấy từ `getStudent()` đã gọi sẵn trong trang (không thêm query mới).
- **Không** đưa Nhánh 2 (Danh sách lớp) vào Viewer — phụ huynh không cần màn quản lý danh sách lớp, chỉ cần xem lịch con mình học; giữ đúng nguyên tắc "mỗi màn hình một mục đích rõ ràng". Mục này nêu rõ trong demo để chủ dự án xác nhận cùng lúc duyệt.

## 6. Việc mới phát sinh cần xác nhận (không phải thêm Firestore schema)

- Định nghĩa "Lớp mới sắp tới" (mục 3.3) dùng field `createdAt` có sẵn — không cần hàm/service mới, nhưng là một **quy tắc nghiệp vụ mới** (ngưỡng 30 ngày) nên nêu ở đây để chủ dự án xác nhận ngưỡng thời gian có hợp lý không.
- Đổi giờ buổi học: giữ hành vi hiện có (chọn giờ mới → cập nhật `status: rescheduled` + thông báo), chỉ nâng cấp UI thao tác (bấm vào block mở panel chi tiết thay vì `<input datetime-local>` rời) — không đổi logic `updateSession()`.

## 7. Việc KHÔNG làm trong đợt này

- Không đổi Firestore schema/rules/route path.
- Không thêm kéo-thả (drag-and-drop) để đổi lịch — nâng cấp UX lớn, để đợt sau nếu được duyệt riêng.
- Không tăng `limit(300)` trong `listSessions()` — giữ đúng kỷ luật Spark free-tier đã thống nhất.
- Không động vào `features/students/**` (đã khóa), `features/classes/**`, `features/catalog/**` (đã duyệt/hoàn thành các đợt trước).
- Không thêm Nhánh 2 cho Viewer (xem mục 5).

## 8. Rủi ro & lưu ý

- Time-grid có thể có >2 buổi trùng giờ trong 1 ô ngày (nhiều lớp học bù cùng khung giờ khác phòng) — cần test với dữ liệu thật; demo minh họa trường hợp 2 buổi trùng, giải pháp chia cột sẽ cần điều chỉnh nếu thực tế có 3+ buổi trùng thường xuyên.
- `listSessions()` giới hạn `limit(300)` theo khoảng `from-to` — view Tháng tải nhiều buổi hơn view Tuần, cần theo dõi nếu trung tâm mở rộng quy mô.
- Time-grid 17 giờ khá cao (06:00–23:00) — demo dùng khung cuộn nội bộ cố định chiều cao (giống cách đã sửa cho 2 bảng Catalog), mặc định cuộn tới khung giờ chiều khi mở trang thay vì luôn bắt đầu từ 06:00.

## 9. Tiêu chí duyệt demo

- [ ] Đúng token màu/spacing/radius/motion hiện có, nhất quán với demo Lớp học & Catalog đã duyệt.
- [ ] Chuyển Ngày/Tuần/Tháng mượt, dữ liệu buổi học đúng vị trí giờ trên trục.
- [ ] Trường hợp 2 buổi trùng giờ hiển thị tách cột rõ ràng, không đè chữ lên nhau.
- [ ] Tab Danh sách lớp hiện đúng Khóa học + chip Môn học cho từng lớp.
- [ ] Nút "Xem lịch" ở Danh sách lớp chuyển đúng sang Timetable đã lọc theo lớp.
- [ ] Bản Viewer: read-only, có chip lọc theo con, không có Nhánh 2.
- [ ] Xác nhận ngưỡng "30 ngày" cho KPI "Lớp mới sắp tới" (mục 6) có hợp lý không.
- [ ] Xem được ở 375px và ≥1280px, không tràn ngang; contrast đạt WCAG AA cho các block trạng thái.
