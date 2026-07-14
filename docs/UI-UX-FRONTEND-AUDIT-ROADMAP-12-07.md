# Audit và roadmap UI/UX Frontend Edumatrix-vn

Ngày kiểm tra: 12/07/2026
Phạm vi: HTML, React frontend, Tailwind/CSS và rule trình bày của Admin, Giáo viên, Phụ huynh/Học sinh.
Design read: **redesign một dashboard giáo dục trust-first**, dùng ngôn ngữ học thuật bình tĩnh, rõ dữ liệu, thiên về system UI có kiểm soát thay vì landing-page effect.

## 1. Kết quả kiểm tra hiện tại

### P0: cần sửa trước khi chốt visual system

| Mức | Phát hiện | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|
| P0 | `Topbar` đang render tiêu đề route bằng `h1`, trong khi nhiều page render thêm `h1`/heading đầu trang; screenshot cho thấy title bị chia khỏi vùng nội dung cần đọc | Sai hierarchy, có thể có nhiều H1 và vị trí tiêu đề không ổn định | Topbar chỉ giữ brand bằng `div/p`; tạo `PageHeader` duy nhất trong `main`, căn cùng trục với data surface ngay dưới topbar |
| P0 | Motion không đồng nhất: `.page-enter` 340ms, sidebar/group 200–300ms, một số control không có pressed state | Cảm giác mỗi component thuộc một hệ khác nhau; khó đoán khi thao tác nhanh | Chỉ dùng `--motion-duration: 220ms`, easing và reduced-motion token chung |
| P0 | Viewer dashboard còn chuỗi không dấu như `Dang tai`, `Lam moi`, `Chua co du lieu`; error state chỉ là `<p>` | Chất lượng copy không nhất quán giữa 3 role, thiếu affordance và recovery | Chuẩn hóa copy tiếng Việt; dùng `LoadingSkeleton`, `EmptyState`, `ErrorState` và nút thử lại chung |
| P0 | Một số page chỉ có paragraph/h2 nhưng không có `PageHeader` và primary action nhất quán | Người dùng khó biết đang ở đâu và hành động chính là gì | Mỗi route có một header contract: breadcrumb tùy chọn, H1, mô tả, một CTA |

### P1: consistency và interaction

| Mức | Phát hiện | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|
| P1 | Glass effect dùng cho sidebar, topbar, dropdown và nhiều card; card `border + glass + shadow` lặp dày | Hierarchy bị phẳng, giao diện dễ thành “glassmorphism mặc định” | Chỉ giữ glass cho shell/overlay; data card dùng surface đặc hoặc spacing/divide-y |
| P1 | Dashboard staff có 4 StatCard ngang hàng và action row dùng dot màu; màu đang gánh quá nhiều ngữ nghĩa | Giống template dashboard, khó quét trên mobile, color-only state | Dùng KPI cluster gọn hơn; action có icon + nhãn trạng thái + focus/hover; màu chỉ hỗ trợ |
| P1 | Sidebar có nhóm accordion, flyout khi collapsed và mục “Sắp có”; nhiều tầng tương tác | Tăng cognitive load, dễ mất context trên mobile | Giữ 3 nhóm tối đa; flyout phải keyboard accessible; disabled module gom cuối hoặc đưa vào roadmap |
| P1 | `transition-[grid-template-rows]` và width sidebar vẫn animate layout property | Có thể gây reflow và cảm giác nặng | Dùng opacity/transform cho flyout; sidebar width chỉ đổi ở shell với duration token, không animate item layout |
| P1 | Weather/clock có dữ liệu async nhưng chưa có fallback copy/error rõ | Header nhảy trạng thái hoặc trống khó hiểu | Reserve width, hiển thị `Đang cập nhật`/`Không khả dụng`, cache 30 phút |
| P1 | Notification hook hiện là stub luôn trả `[]` | Bell tạo kỳ vọng nhưng không bao giờ có unread | Gắn data model hoặc ẩn badge/notification affordance cho tới khi có nguồn thật |

### P2: polish và accessibility

- Nhiều form/page còn class button lặp inline; tạo `Button`/`IconButton` semantic để kiểm tra contrast, loading và disabled một lần.
- Các status badge, dot và màu tone cần text/icon bổ sung để không phụ thuộc màu.
- Kiểm tra mọi `min-h-touch`, focus-visible, aria-expanded, aria-current và focus trap trên drawer/modal.
- `body background-attachment: fixed` cần kiểm tra trên mobile vì có thể gây giật/tiêu thụ GPU; nếu không cần thì bỏ ở breakpoint nhỏ.
- `index.html` vẫn dùng Google Fonts CDN dù kế hoạch trước chốt self-host; chuyển sang `@font-face` production và preload weight 400.
- Các file feature thay đổi nhiều cần snapshot visual theo role trước khi refactor để tránh phá hành vi nghiệp vụ.

## 2. Quyết định thiết kế hợp nhất

### Dials

- `DESIGN_VARIANCE: 5`: dashboard cần rõ ràng, chỉ bất đối xứng nhẹ ở dashboard staff.
- `MOTION_INTENSITY: 4`: feedback và continuity có chủ đích, không cinematic decoration.
- `VISUAL_DENSITY: 5`: dữ liệu vừa phải; ưu tiên scan nhanh hơn trang trí.

### Rule cốt lõi

1. Một theme sáng nhất quán; không dùng gradient xanh/tím dày đặc.
2. Một accent primary xanh dương; success/warning/danger chỉ là semantic state.
3. Một radius scale: input 8px, card 12px, modal 16px, button không pill trừ badge.
4. Một motion duration: `220ms`; reduced motion tắt transform/animation.
5. Một H1 trong mỗi route; title nằm trong `main` dưới topbar, không nằm trong topbar.
6. Một primary CTA mỗi màn hình; action phụ dùng text link/ghost/menu.
7. Mobile-first: không horizontal scroll; table chuyển row/card; drawer không khóa back gesture.
8. Mọi async surface có loading, empty, error và recovery.

## 3. Blueprint theo role

### Admin

- Dashboard: KPI ưu tiên + hàng đợi việc cần xử lý + cảnh báo quyền hệ thống.
- Quản lý lớp học: Catalog, học sinh, lớp, lịch dùng cùng PageHeader, toolbar và DataTable.
- Chức năng: Giáo án, điểm danh, bài tập, điểm dùng cùng filter context và action hierarchy.
- Quản lý: Người dùng, tài chính, thông báo; destructive action có ConfirmDialog.

### Giáo viên

- Dashboard rút gọn theo “hôm nay”, lớp sắp dạy, bài cần chấm và điểm danh.
- Ẩn mục quản trị không liên quan; giữ tài chính ở mức cần biết.
- Thao tác ghi nhận nhanh phải dùng touch target 44px và feedback trong 100ms.

### Phụ huynh/Học sinh

- Dashboard theo timeline: buổi học kế tiếp, bài sắp hạn, điểm mới, học phí.
- Điều hướng tối đa 5 mục; title và CTA vẫn nằm trong PageHeader của main.
- Empty state hướng dẫn hành động tiếp theo, không chỉ “chưa có dữ liệu”.

## 4. Kế hoạch thực thi hợp nhất

### Phase A — Audit baseline

- Chụp 3 role ở 375/768/1024/1440px.
- Lập inventory H1, PageHeader, button, modal, loading/empty/error và motion duration.
- Chốt token CSS, z-index và component contract.

### Phase B — Shell và typography

- Tách brand khỏi route title trong Topbar.
- Tạo `PageHeader` dùng chung, locale `vi-VN`, breadcrumb và CTA.
- Self-host Be Vietnam Pro; kiểm tra fallback và CLS.
- Đồng nhất sidebar groups, active state, drawer và keyboard flyout.

### Phase C — Interaction system

- Áp dụng `--motion-duration: 220ms` cho transition, hover, pressed, modal, drawer.
- Chuẩn hóa Button, IconButton, StatusBadge, DropdownMenu, Toast.
- Bổ sung pointer hover nhẹ, pressed scale `.98`, focus ring; không animate layout nặng.

### Phase D — Data surfaces và forms

- Chuyển toàn bộ form tạo/sửa/xóa sang Modal/Drawer theo kế hoạch trước.
- Chuẩn hóa search/filter/table/list và mobile row.
- Hoàn thiện loading skeleton, empty state, error recovery và confirm destructive action.

### Phase E — Dashboard và role polish

- Staff dashboard: giảm cảm giác 4 card bằng KPI rail + action queue có priority.
- Viewer dashboard: timeline và copy tiếng Việt hoàn chỉnh.
- Kiểm tra quyền hiển thị nav/module theo Admin, Teacher, Viewer.

### Phase F — QA và release gate

- Keyboard-only, screen reader labels, zoom 200%, reduced-motion.
- Visual regression thủ công ở 4 breakpoint.
- `npm run typecheck`, `npm test`, `npm run build`.
- Không còn duplicate H1, raw color trong feature component, stub notification không có affordance thật, hoặc title lệch trục.

## 5. Artefacts

- Demo UI tĩnh: `docs/edumatrix-ui-demo.html`.
- Roadmap và diagram triển khai: `docs/edumatrix-ui-roadmap.html`.
- Sơ đồ logic hệ thống hiện có: `docs/edumatrix-system-logic-diagram.html`.
- Kế hoạch chi tiết trước đó: `docs/KE-HOACH-DESIGN-FRONTEND-TOAN-HE-THONG.md`.
