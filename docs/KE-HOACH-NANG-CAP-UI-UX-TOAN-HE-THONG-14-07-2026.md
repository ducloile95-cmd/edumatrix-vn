# Kế hoạch sửa và nâng cấp UI/UX toàn hệ thống Edumatrix-VN

Ngày lập: 14/07/2026 — Cập nhật lần cuối: 14/07/2026 (hoàn thành Phase 1-6)
Phạm vi: Admin, Giáo viên, Phụ huynh/Học sinh — toàn bộ route trong `src/features`.

## 0. Vì sao tài liệu này tồn tại thay vì sửa file cũ

`docs/` hiện đã có 6 tài liệu UI/UX liên quan: `DESIGN-SYSTEM-v2.md`, `KE-HOACH-DESIGN-FRONTEND-TOAN-HE-THONG.md`, `UI-UX-FRONTEND-AUDIT-ROADMAP-12-07.md`, `KH-Nang-Cap-UI-UX-12-07.md` (đều 12/07), và `ke-hoach-cap-nhat-giao-dien-14-07-2026.md` (14/07, phạm vi module Học sinh). Các tài liệu này đã chốt token, rule và blueprint khá đầy đủ — không cần viết lại.

Việc còn thiếu là: **đối chiếu các rule đó với mã nguồn thật hôm nay**, vì một số điểm được ghi "đã chốt hướng xử lý" trong audit 12/07 nhưng khi kiểm tra code vẫn chưa sửa. Tài liệu này chỉ làm hai việc: (1) báo cáo trạng thái thật đã xác minh, (2) đưa ra lộ trình nhân rộng pattern đã làm tốt ở module Học sinh ra toàn hệ thống, gộp chung với việc thêm biểu đồ và accessibility đã bàn trước đó — vì làm tách rời từng mảng sẽ phải sửa lại module 2 lần.

Khuyến nghị: coi `DESIGN-SYSTEM-v2.md` + `KE-HOACH-DESIGN-FRONTEND-TOAN-HE-THONG.md` là **nguồn chuẩn token/rule duy nhất**; 2 file 12/07 còn lại chuyển thành lịch sử/tham khảo; `ke-hoach-cap-nhat-giao-dien-14-07-2026.md` là nhật ký triển khai module Học sinh; tài liệu này là roadmap thực thi toàn hệ thống hiện hành, cập nhật trực tiếp vào đây sau mỗi phase thay vì tạo file mới.

## 1. Trạng thái xác minh thực tế (cập nhật sau khi hoàn thành Phase 1-6)

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Module Học sinh (bảng, filter, popup, mini chart) | **Đã chốt, KHÓA** — chủ dự án xác nhận OK, không sửa thêm, chỉ dùng làm khuôn mẫu tham chiếu | `StudentsList.tsx`, `StudentInfoDialog.tsx`, `TimeRangeFilter.tsx`, `StudentsPage.tsx` — không động tới trong suốt Phase 1-6 |
| `page-enter` toàn hệ thống theo route | Đã có, áp dụng đúng mọi route qua `AppShell` | `AppShell.tsx`, `index.css` |
| `PageHeader` hiển thị `description` | **Đã sửa** — `description ?? APP_DESCRIPTION` | `components/ui/PageHeader.tsx` |
| Motion duration đồng nhất 220ms | **Đã sửa** — `page-enter` dùng `var(--motion-duration)` | `index.css` |
| Bỏ opacity/glass ở dropdown thông báo + card danh sách thừa | **Đã sửa** — `Topbar.tsx` dropdown, và các card bọc ngoài list ở Classes/Catalog/Users/Sessions/LessonPlans đổi từ `glass-panel` sang `bg-white border-neutral-200` | Từng file tương ứng |
| Notification thật | **Đã nối cho Viewer** — `useNotifications()` trong `Topbar.tsx` đọc `ANNOUNCEMENTS` theo `studentId` (cùng nguồn với `ViewerAnnouncementsPage`), sort/limit client-side để không cần composite index mới. Staff (Admin/Giáo viên) **cố tình giữ rỗng** vì `AttendanceDoc`/`AssignmentDoc`-derived announcements không có field người nhận là giáo viên — "Cần xử lý" ở Tổng quan đã phủ vai trò này cho Staff, đoán logic gán-giáo-viên sẽ là over-engineering | `Topbar.tsx` |
| Font Be Vietnam Pro self-host | **Chưa làm được — sandbox không có network để tải file .woff2** (`curl` tới fonts.googleapis.com trả về không kết nối được). Vẫn tải qua Google Fonts CDN, không phải lỗi code. Muốn self-host, chủ dự án cần tải 4 weight (400/500/600/700) qua google-webfonts-helper trên máy có mạng rồi đặt vào `public/fonts/` | `index.html` dòng 9-13 |
| Biểu đồ dữ liệu | **5/5 module xong**: Điểm số (line + histogram), Tổng quan (line xu hướng chuyên cần 14 ngày + bar hóa đơn theo trạng thái), Điểm danh (stacked bar theo tuần + donut), Học phí (grouped bar dự kiến/thực thu theo tháng + bar trạng thái), Bài tập (bar phễu Giao→Nộp→Chấm→Làm lại + bar % nộp theo lớp) | `ScoresPage.tsx`, `StaffDashboardPage.tsx`, `AttendancePage.tsx`, `InvoicesPage.tsx`, `AssignmentsPage.tsx` |
| `aria-label` trên icon-only control | **Đã rà lại toàn bộ** Tổng quan/Người dùng/Danh mục/Lớp học/chi tiết lớp/Ghi danh/Viewer Lịch học/Thông báo/Học phí — không tìm thấy nút icon-only thiếu nhãn (mọi nút đều có text hiển thị hoặc đã có `aria-label` sẵn). Phát hiện 12/07 có thể đã lỗi thời hoặc đã được sửa trong lúc làm Phase 1-2. Chart mới đều có `aria-label` mô tả nội dung | Đọc trực tiếp từng file, không còn phát hiện vi phạm |
| Contrast `StatusBadge` | **Đã kiểm tra, PASS 4.5:1** — tính contrast ratio WCAG cho cả 5 tone: success 5.16, warning 4.84, danger 5.91, info 5.57, neutral 6.89 (đều ≥4.5) | Tính bằng công thức luminance chuẩn WCAG trên giá trị hex trong `tailwind.config.ts` |
| Code hygiene | Toàn bộ file `*Page.tsx` từng bị nén 1-2 dòng đã được định dạng lại rõ ràng | Xem log Phase 2-3 bên dưới |
| Encoding / dấu tiếng Việt | Đã sửa hết ở tầng UI (Điểm danh, Học phí, Bài tập, Sessions, LessonPlans, Viewer Assignments) và tầng service (chuỗi ghi vào `ANNOUNCEMENTS` ở `attendance.ts`, `assignments.ts`, `sessions.ts` — trước đó mất dấu, hiển thị thật cho người dùng qua thông báo) | Đọc trực tiếp từng file |

## 2. Pattern chuẩn để nhân rộng (rút ra từ module Học sinh)

**Module Học sinh đã khóa — không chỉnh sửa thêm.** Module Học sinh chỉ đóng vai trò tài liệu tham chiếu; mọi công việc từ Phase 2 trở đi thao tác trên module đích, không động vào `features/students/`.

Module Học sinh gồm: thanh lọc gộp (tìm kiếm + trạng thái + `TimeRangeFilter`), bảng 6 cột với thanh tiến độ + 3 mini pie chart, popup chi tiết 2 vùng, `Pagination` chọn số dòng/trang.

Việc nhân rộng thực tế cho thấy: chỉ 5 module dạng "danh sách duyệt" (Lớp học, Danh mục, Người dùng) hợp pattern này; các module còn lại (Điểm danh, Học phí, Bài tập, Lịch học/buổi học, Giáo án) là workflow 1 phiên hoặc master-detail chấm bài — ép cùng pattern là sai, nên đổi hướng sang sửa lỗi thật (mất dấu, thiếu `StatusBadge`, thiếu chart, thiếu search) thay vì sao chép UI Học sinh.

## 3. Lộ trình theo phase

### Phase 1 — P0, sửa nợ kỹ thuật đang chặn — **HOÀN THÀNH**

- [x] Sửa `PageHeader` hiển thị đúng `description`.
- [x] `page-enter` đọc `var(--motion-duration)` thay vì hardcode 380ms.
- [x] Đổi nền dropdown thông báo trong `Topbar.tsx` từ `glass-panel` sang nền solid.

### Phase 2 — P1, nhân rộng pattern module Học sinh — **HOÀN THÀNH**

- [x] Lớp học: bỏ `glass-panel` thừa ở `ClassesPage.tsx` (list con đã có search/filter/StatusBadge/Pagination).
- [x] Danh mục (Catalog): bỏ `glass-panel` thừa quanh `SubjectsList`/`CoursesList` (đã có search/pagination sẵn).
- [x] Người dùng (Users): bỏ `glass-panel` thừa quanh `InvitesList`/`UsersList`.
- [x] Lịch học (Sessions): sửa mất dấu toàn bộ (`STATUS_LABEL`, aria-label, option, message), bỏ `glass-panel` ở section chính.
- [x] Giáo án (LessonPlans): sửa mất dấu toàn bộ (default values, label, option, empty state), bỏ `glass-panel`.
- [x] Điểm danh, Học phí, Bài tập: sửa lỗi mất dấu tiếng Việt toàn bộ thân trang (phát hiện thật, không phải cosmetic).
- [x] Học phí: đổi trạng thái hóa đơn/thanh toán sang `StatusBadge`; **thêm search theo tên học sinh/mã hóa đơn + filter theo trạng thái** (chuyển từ `listInvoicesPage` cursor-phân trang sang `listInvoices()` — hàm đã có sẵn, tải gọn ≤300 bản ghi, phù hợp quy mô trung tâm nhỏ, cũng là dữ liệu nền cho chart Phase 3).
- [x] Điểm số: định dạng lại từ 2 dòng nén thành JSX rõ ràng.

### Phase 3 — biểu đồ: **5/5 module xong**

| Module | Chart thêm | Trạng thái |
|---|---|---|
| Điểm số | Line tiến bộ + histogram phân phối điểm | [x] Xong |
| Tổng quan | Line xu hướng chuyên cần 14 ngày (tính từ `listSessions` + `listAttendanceSummariesBySessionIds` có sẵn) + bar ngang hóa đơn theo trạng thái (từ `listInvoices`) | [x] Xong |
| Điểm danh | Stacked bar theo tuần (present/late/absent/excused, gộp từ summary có sẵn theo tuần) + donut tổng hợp | [x] Xong |
| Học phí | Grouped bar dự kiến vs thực thu theo tháng + bar trạng thái hóa đơn | [x] Xong |
| Bài tập | Bar phễu Giao→Nộp→Chấm→Làm lại (dùng `listAssignmentSummaries()` có sẵn, chưa từng được gọi ở UI) + bar % nộp bài theo lớp | [x] Xong |

Nguyên tắc áp dụng cho mọi chart mới: tái dùng service/list function đã có (không thêm query Firestore mới tốn read trên Spark tier), tính toán bucket/nhóm ở client, đều có `aria-label` mô tả nội dung, tooltip, không dùng màu là tín hiệu duy nhất (kèm nhãn/legend).

### Phase 4 — P2, responsive/mobile cho Viewer — **HOÀN THÀNH**

- [x] `ViewerTuitionPage`: thay dialog QR tự chế (thiếu Escape/click-ngoài/khóa scroll) bằng component `Modal` dùng chung — kế thừa toàn bộ hành vi đã chuẩn hoá (Escape, focus trap, khóa scroll, `max-h-[calc(100dvh-2rem)]`).
- [x] `ViewerAssignmentsPage`: sửa mất dấu tiếng Việt toàn bộ, định dạng lại từ file nén.
- [x] Sidebar mobile drawer: thêm xử lý phím Escape để đóng (trước đó chỉ đóng qua nút X hoặc click nền mờ).
- [x] Xác nhận 5 trang Viewer (Tổng quan, Lịch học, Bài tập, Học phí, Thông báo) ổn ở layout mobile-first (`grid` chỉ chia cột từ `md:` trở lên, không có phần tử tràn ngang).

### Phase 5 — P2, accessibility diện rộng + hoàn thiện dữ liệu thật — **HOÀN THÀNH (trừ self-host font)**

- [x] Rà `aria-label` cho icon-only control ở Tổng quan/Người dùng/Danh mục/Lớp học/chi tiết lớp — không còn vi phạm (xem mục 1).
- [x] Kiểm tra contrast `StatusBadge` — PASS 4.5:1 cho cả 5 tone (xem mục 1).
- [x] Nối `useNotifications` với dữ liệu `ANNOUNCEMENTS` thật cho Viewer; Staff giữ rỗng có chủ đích (lý do ghi trong code + mục 1).
- [ ] Self-host font Be Vietnam Pro — **chặn bởi sandbox không có network**, cần chủ dự án tải file trên máy có mạng.

### Phase 6 — QA & chốt

- [x] `npm run typecheck` — PASS, 0 lỗi (chạy lại sau mỗi phase).
- [x] `npm run lint` — PASS, chỉ còn 1 warning tiền tồn tại ở `Sidebar.tsx:197` (dependency `nodes` trong `useMemo`), không liên quan đến các thay đổi UI/UX, không thuộc phạm vi sửa.
- [ ] `npm run build` / `npm test` — **bị chặn bởi lỗi môi trường sandbox**: `Cannot find module '@rollup/rollup-linux-x64-gnu'` (bug tối ưu dependency của npm, xem npm/cli#4828), xảy ra ngay cả trên file chưa từng sửa. Phần `tsc --noEmit` (chạy trước trong cùng script) đã PASS trước khi gặp lỗi này. Không sửa `node_modules` trong sandbox vì đây là thư mục mount từ máy Windows thật của chủ dự án — cài binary Linux vào đó sẽ hỏng môi trường Windows. Cần chạy `npm run build`/`npm test` trên máy thật để xác nhận lần cuối.
- [ ] Kiểm tra thủ công 4 breakpoint (375/768/1024/1440), keyboard-only, `prefers-reduced-motion`, zoom 200% — cần làm trên máy thật/trình duyệt thật, ngoài khả năng của môi trường chỉnh sửa hiện tại.

## 4. Ước lượng effort (đã thực hiện, để tham khảo cho lần sau)

| Phase | Nội dung | Thực tế |
|---|---|---|
| 1 | Sửa nợ kỹ thuật P0 | Xong trong 1 phiên |
| 2 | Nhân rộng pattern — 9 module (5 vận hành + Classes/Catalog/Users/Sessions/LessonPlans) | Xong trong 1 phiên, chia nhiều đợt ghi file |
| 3 | Biểu đồ 5 module | Xong, tái dùng 100% service function có sẵn, không thêm Firestore query mới |
| 4 | Responsive Viewer | Xong |
| 5 | Accessibility + dữ liệu thông báo thật | Xong, trừ self-host font (chặn bởi môi trường) |
| 6 | QA từng phase | typecheck/lint PASS; build/test cần chạy trên máy thật |

## 5. Rủi ro

- Firebase Spark free tier: các chart mới đều tái dùng list function có sẵn (`listInvoices` ≤300, `listSessions` ≤300, `listAttendanceSummariesBySessionIds` theo chunk 30, `listAssignmentSummaries` ≤300) — không thêm read pattern mới, nhưng Tổng quan giờ gọi thêm `listSessions`/`listAttendanceSummariesBySessionIds`/`listInvoices` mỗi lần vào trang; nếu trang Tổng quan được mở rất nhiều lần/ngày, nên theo dõi read quota.
- `StudentDoc` chưa có field liên hệ phụ huynh trực tiếp — không đổi so với trước.
- Notification cho Staff vẫn chưa có: nếu sau này cần, phải thêm field người nhận (vd `teacherIds`) vào các loại announcement liên quan trước, không nên đoán trong `Topbar.tsx`.
- Rủi ro tài liệu chồng chéo: đã tránh bằng cách cập nhật trực tiếp file này thay vì tạo file mới.

## 6. Ghi chú vận hành — lỗi cache khi ghi file

Trong suốt quá trình Phase 1-6, công cụ ghi file nhiều lần báo "thành công" nhưng `npm run typecheck` báo lỗi cú pháp (thiếu thẻ đóng) ở đúng file vừa sửa — kể cả với các sửa nhỏ 1-2 dòng (vd `attendance.ts`, `assignments.ts`, `sessions.ts`, `Sidebar.tsx`). Xác minh bằng cách đọc trực tiếp file (qua công cụ đọc file, không qua terminal) thì nội dung luôn đúng — nguyên nhân là lớp cache trung gian phục vụ terminal giữ bản cũ/cắt cụt một thời gian sau khi ghi, không phân biệt file lớn hay nhỏ. Cách xử lý nhất quán: đọc lại bằng công cụ đọc file để xác nhận nội dung thật đúng, sau đó ghi lại trực tiếp qua terminal (Python, UTF-8, newline `\n`) để đồng bộ cache, rồi mới chạy lệnh kiểm tra. Áp dụng cách này cho mọi file trong Phase 3-6 và không còn gặp lỗi giả sau khi đồng bộ.
