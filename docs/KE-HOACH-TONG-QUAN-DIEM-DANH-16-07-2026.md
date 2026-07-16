# Kế hoạch: Tổng quan (Dashboard) cho Module Điểm danh

Ngày: 16/07/2026
Phạm vi: chỉ thêm màn **Tổng quan** cho Module Điểm danh. Luồng điểm danh theo buổi hiện có được giữ nguyên logic, chỉ chuyển thành tab thứ 2 (không viết lại).

## 0. Giả định (nêu rõ trước khi code — karpathy-guidelines)

1. **Không cần đổi Firestore Rules.** Tổng quan chỉ đọc dữ liệu (sessions, attendance, attendance_summaries) — các quyền `canManageClass()` đã đủ cho Admin/Teacher. Đây là module đầu tiên trong đợt nâng cấp này không cần Rules phase.
2. **"Buổi chưa điểm danh"** = buổi đã kết thúc (`endAt < now`), không bị hủy (`status != cancelled`), và chưa có doc trong `attendance_summaries` — cùng kiểu "gap KPI" đã dùng ở Module Giáo án (`listUpcomingSessionsWithoutLessonPlan`), nhưng nhìn **về quá khứ** thay vì tương lai. Cửa sổ mặc định: 14 ngày gần nhất (đủ dài để không bỏ sót, đủ ngắn để không tính buổi quá cũ).
3. **"Học sinh cần chú ý"** = học sinh có tỷ lệ **nghỉ không phép** (`absent`, không tính `late`/`excused` = "nghỉ có phép") ≥ 20% trên tổng buổi đã điểm danh trong 30 ngày gần nhất, tối thiểu 3 buổi đã điểm danh (tránh báo động giả với học sinh mới có 1 buổi vắng). Ngưỡng này tái dùng đúng logic phân loại đã có ở `StudentsList.tsx` (`buildAttendanceMetrics`), chỉ đổi hướng: ở đó tính % **có mặt** cho từng học sinh hiển thị trên trang, ở đây lọc ngược lại để tìm học sinh **đáng lo ngại** trên toàn hệ thống. Xem thêm mục 6 — "nghỉ có phép" giờ có thể đến từ việc staff chủ động đăng ký trước, không chỉ từ lúc điểm danh.
4. **Giữ nguyên 2 biểu đồ đã có** (cột chồng theo tuần + donut trạng thái) — chỉ di chuyển từ cuối trang cũ vào tab Tổng quan, không đổi thư viện (recharts) hay bảng màu (`present #16A34A / late #F59E0B / absent #E4453A / excused #0EA5E9` — đúng 4 màu đang dùng ở `AttendancePage.tsx` và `StaffDashboardPage.tsx`).
5. **Liên kết sâu (deep link) từ Tổng quan Staff Dashboard phải tiếp tục hoạt động.** `StaffDashboardPage.tsx` đang trỏ `${ROUTES.STAFF_ATTENDANCE}?session=<id>` khi bấm "Điểm danh" ở danh sách lớp hôm nay. Sau khi thêm tab, quy tắc: nếu URL có `?session=`, trang tự mở tab **"Điểm danh theo buổi"** với buổi đó được chọn sẵn; nếu không có, mặc định mở tab **"Tổng quan"**.
6. **Thiết kế dùng lại design system đã thiết lập trong dự án** (StatCard, PageHeader, tab pattern kiểu `CatalogPage`/`SessionsPage`, Be Vietnam Pro, primary-500 #3366F0) — không áp dụng bộ token chung chung của skill UI/UX (Geist, Bento, Framer Motion...) để giữ nhất quán với toàn bộ ứng dụng đã làm trong phiên này.
7. **Tab, không phải popup.** Khác với Module Giáo án (nơi Form nhập liệu được chuyển thành popup vì đó là 1 hành động soạn thảo đơn lẻ), ở đây "Tổng quan" và "Điểm danh theo buổi" là 2 màn hiển thị/luồng làm việc đầy đủ, ngang hàng nhau — giống mô hình tab của `CatalogPage` (Dashboard/Khóa học/Môn học) và `SessionsPage`, không phải mô hình danh sách + form nhập liệu.

## 1. Chuỗi logic DB → Rules → Frontend (khảo sát hiện trạng)

| Lớp | Hiện trạng | Đủ dùng cho Tổng quan? |
|---|---|---|
| DB | `attendance/{sessionId_studentId}`, `attendance_summaries/{sessionId}` (đã có `total/present/absent/late/excused`) | ✅ đủ, không cần field mới |
| Rules | `attendance`: read theo `canManageClass` hoặc `ownsStudent`; `attendance_summaries`: read theo `canManageClass` hoặc phụ huynh thuộc lớp | ✅ đủ — Tổng quan chỉ đọc, Admin/Teacher đã có quyền đọc toàn bộ lớp họ quản lý |
| Service | `listSessions`, `listSessionsByClass`, `listAttendanceSummariesBySessionIds`, `listAttendanceByStudents`, `listClasses`, `listStudents` — đều đã có, đủ nguyên liệu | ⚠️ thiếu 1 hàm tổng hợp gap + 1 hàm tổng hợp học sinh cần chú ý (mới) |
| Frontend | `AttendancePage.tsx` hiện là 1 trang phẳng: chọn buổi → điểm danh → 2 biểu đồ cuối trang. Không có KPI, không có cảnh báo buổi thiếu | ❌ cần thêm |

Không phát hiện lỗi/khoảng trống Rules như đợt Giáo án — module Điểm danh đã có validate status enum + `keepsImmutable` đầy đủ từ trước.

## 2. Các KPI / khối nội dung cho tab Tổng quan

1. **Tỷ lệ chuyên cần trung bình** (30 ngày) — `(present+late+excused) / total` trên toàn bộ `attendance_summaries` trong khoảng — StatCard tone `primary`.
2. **Buổi đã điểm danh** (30 ngày) — đếm `attendance_summaries` trong khoảng — tone `success`.
3. **Buổi chưa điểm danh** (14 ngày, xem giả định #2) — tone `warning`, có cảnh báo danh sách riêng bên dưới kèm nút "Điểm danh ngay".
4. **Học sinh nghỉ không phép nhiều** (xem giả định #3, đổi tên cho rõ nghĩa sau mục 6) — tone `danger`.

Bên dưới KPI:
- **Cảnh báo: Buổi học chưa điểm danh** — danh sách buổi + lớp + nút "Điểm danh ngay" → chuyển sang tab Điểm danh theo buổi, preselect session (giống hệt kiểu cảnh báo "buổi thiếu giáo án" ở Module Giáo án).
- **Nghỉ học đã đăng ký trước** (mới, xem mục 6) — danh sách buổi sắp tới đã có học sinh được đăng ký nghỉ (có phép/không phép), kèm lý do — để staff biết trước khi điểm danh thật.
- **Xu hướng chuyên cần theo tuần** — cột chồng (present/late/absent/excused), tái dùng nguyên logic `weeklyChart` hiện có trong `AttendancePage.tsx`.
- **Tổng hợp trạng thái** — donut, tái dùng nguyên logic `donutData` hiện có.
- **Theo lớp** — bảng/cột ngang tỷ lệ chuyên cần từng lớp (30 ngày) — mới, giúp phát hiện lớp có vấn đề.
- **Học sinh nghỉ không phép nhiều** — danh sách top học sinh nghỉ không phép nhiều, kèm % , số buổi, link hồ sơ học sinh.

## 3. Service cần thêm (`src/services/firestore/attendance.ts`)

- `listSessionsWithoutAttendance(days = 14)`: lấy sessions đã kết thúc trong N ngày qua (không hủy) qua `listSessions`, trừ đi các session đã có `attendance_summaries` (join phía client — không có server join, giống mọi module trước trên Spark plan).
- `getAttendanceOverview(days = 30)`: gộp 1 lần — tỷ lệ chuyên cần trung bình, số buổi đã điểm danh, danh sách theo lớp, danh sách học sinh nghỉ không phép nhiều — theo đúng pattern `getStaffDashboard()` đã có (1 hàm tổng hợp, Promise.all các query con, cache react-query 60s phía trang).
- `registerLeave(sessionId, classId, studentId, status, note, actorUid)` (mới — xem mục 6): ghi **1** attendance doc riêng lẻ (không phải cả roster như `saveAttendance`), dùng cho việc đăng ký nghỉ trước cho từng học sinh.
- `listUpcomingRegisteredLeaves(days = 14)` (mới — xem mục 6): liệt kê các attendance doc đã tồn tại cho session **chưa diễn ra** (`startAt > now`) — chính là danh sách "đã đăng ký nghỉ trước".

## 4. Frontend

- `AttendancePage.tsx`: thêm state `tab: "overview" | "mark"`. Nếu `searchParams.get("session")` tồn tại → mặc định `mark`; ngược lại `overview`. Tách nội dung điểm danh hiện tại (chọn buổi + roster + lưu) ra thành `AttendanceMarkPanel.tsx` (giữ nguyên logic, chỉ đổi tên file/tách component — không viết lại). Trong roster, đổi nhãn 2 lựa chọn cho rõ nghĩa: "Vắng" → "Vắng không phép", "Có phép" → "Vắng có phép" (không đổi giá trị enum `absent`/`excused` phía dưới, chỉ đổi nhãn hiển thị).
- `AttendanceOverview.tsx` (mới): 4 StatCard + cảnh báo buổi chưa điểm danh + panel "Nghỉ học đã đăng ký trước" + 2 biểu đồ (chuyển từ trang cũ sang) + bảng theo lớp + danh sách học sinh nghỉ không phép nhiều. Có nút "Đăng ký nghỉ học" ở góc phải `PageHeader`.
- `RegisterLeaveForm.tsx` (mới — xem mục 6): popup nhập liệu đơn (1 học sinh, 1 buổi, loại nghỉ, lý do) — theo đúng pattern popup single-action đã dùng cho Form giáo án, **không** làm thành tab.
- Dùng lại `StatCard`, `PageHeader`, `Modal`, `EmptyState`, `LoadingSkeleton`, `ErrorState` — không tạo component UI mới ngoài khối nghiệp vụ.

## 6. Chức năng mới: Đăng ký nghỉ học (nghỉ có phép / không phép)

**Cơ chế đã chốt với người dùng:** Staff (Admin/Teacher) có thể đăng ký nghỉ học cho 1 học sinh theo **2 điểm chạm**, không có luồng phụ huynh tự gửi đơn (Viewer app không đổi):

1. **Đăng ký trước** — khi học sinh báo nghỉ trước ngày học (qua điện thoại/Zalo...), staff mở popup "Đăng ký nghỉ học" (từ tab Tổng quan), chọn học sinh → buổi học sắp tới (lọc theo lớp học sinh đang học, tái dùng `listSessionsByClass`) → loại nghỉ (có phép/không phép) → lý do → lưu. Việc này chỉ ghi **1** attendance doc cho đúng học sinh đó, **không** đụng tới các bạn cùng lớp (khác với `saveAttendance` hiện tại luôn ghi cả roster).
2. **Ngay lúc điểm danh** — vẫn dùng đúng dropdown trạng thái đã có trong roster (`AttendanceMarkPanel`), chỉ đổi nhãn cho rõ "có phép/không phép" thay vì "vắng/có phép" như hiện tại.

**Vì sao không cần collection/Rules mới:** `attendance/{sessionId_studentId}` đã cho phép `create` bất kỳ lúc nào (Rules không kiểm tra buổi học đã diễn ra hay chưa — xem mục 1), và đã có sẵn field `note` để lưu lý do. Khi đến ngày học thật và staff mở roster để điểm danh, `AttendancePage` hiện đã tự nạp `existing` (attendance đã có) và seed vào state — nghĩa là học sinh đã đăng ký nghỉ trước sẽ **tự động hiện đúng trạng thái** khi mở roster, không cần thao tác gì thêm. Đây là lý do chọn tái dùng `attendance` thay vì tạo collection `leave_requests` riêng — ít bề mặt mới hơn, tận dụng đúng cơ chế đã kiểm chứng.

**Cập nhật Tổng quan:** thêm panel "Nghỉ học đã đăng ký trước" (buổi tương lai đã có học sinh đăng ký, kèm loại + lý do), đổi nhãn KPI/danh sách "học sinh cần chú ý" thành "học sinh nghỉ **không phép** nhiều" để không lẫn với nghỉ có phép đã đăng ký.

## 7. Demo

File: `docs/edumatrix-ui-attendance-overview-demo-16-07-2026.html` — tập trung vào tab **Tổng quan** (đúng phạm vi yêu cầu), có phác thảo tab "Điểm danh theo buổi" ở dạng thu gọn để thấy toàn cảnh 2 tab, cộng popup "Đăng ký nghỉ học" và panel "Nghỉ học đã đăng ký trước".
