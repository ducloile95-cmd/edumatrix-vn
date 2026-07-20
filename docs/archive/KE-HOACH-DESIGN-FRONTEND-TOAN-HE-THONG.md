# Kế hoạch thiết kế Frontend toàn hệ thống Edumatrix-vn

Ngày: 12/07/2026
Phạm vi: Web app quản lý lớp học cho Admin, Giáo viên, Phụ huynh/Học sinh
Stack: React 18, TypeScript, Vite, Tailwind CSS, React Router, Firebase Web SDK

## 1. Mục tiêu thiết kế

- Giảm thời gian tìm chức năng và thao tác lặp lại cho từng role.
- Tạo một ngôn ngữ giao diện thống nhất thay vì mỗi trang tự định nghĩa card, bảng, form và trạng thái.
- Ưu tiên rõ ràng dữ liệu giáo dục: lớp, lịch học, điểm danh, bài tập, điểm và học phí.
- Trải nghiệm tốt trên màn hình 375px, tablet và desktop; không yêu cầu dark mode trong đợt này.
- Giữ nguyên business logic, route, schema và ràng buộc Firebase Spark/client-only.
- Đảm bảo WCAG 2.2 AA ở các luồng chính: đăng nhập, tạo/sửa/xóa, lọc danh sách và xem dữ liệu.

## 2. Design direction đã chọn

### Tinh thần

**Calm academic dashboard**: tin cậy, sáng sủa, có chiều sâu nhẹ; không dùng phong cách “AI gradient” sặc sỡ. Bề mặt chính là warm-neutral, xanh dương là màu hành động, xanh lá/vàng/đỏ chỉ dùng cho trạng thái.

### Hệ thị giác

| Hạng mục | Quy ước |
|---|---|
| Font | Be Vietnam Pro self-host, 400/500/600/700; số liệu dùng `tabular-nums` |
| Màu nền | `neutral-50` + page mesh rất nhẹ; bề mặt `neutral-0`/glass có fallback đục |
| Primary | `primary-500` cho CTA; `primary-700` cho chữ/link đậm; gradient chỉ cho active/brand |
| Trạng thái | success = hoàn tất, warning = cần chú ý, danger = lỗi/hành động phá hủy, info = thông tin |
| Radius | 8px input, 12px card, 16px modal; không bo pill cho mọi thành phần |
| Elevation | 4 cấp shadow token; modal/dropdown cao hơn card, không dùng shadow ngẫu nhiên |
| Icon | Lucide, stroke thống nhất 1.8–2px, 18–20px trong nav và 16–18px trong control |
| Spacing | nhịp 4/8px; section 24/32/48px; touch target tối thiểu 44px |

### Chuẩn chuyển động dùng một thời lượng duy nhất

- Toàn bộ hệ thống chỉ dùng một motion duration chuẩn: **220ms** (`--motion-duration: 220ms`). Không tạo nhiều nhóm thời gian 150/200/300ms cho các component khác nhau.
- Easing chuẩn: `ease-out` khi xuất hiện/đi vào và `ease-in` khi rời đi; nếu dùng một CSS transition shorthand thì vẫn giữ cùng 220ms.
- Chỉ animate `transform` và `opacity` cho page transition, hover, dropdown, modal, drawer và feedback; không animate trực tiếp `top/left/width/height` của layout nặng.
- `prefers-reduced-motion: reduce` chuyển motion duration về gần 0 và bỏ các hiệu ứng di chuyển, nhưng vẫn giữ thay đổi trạng thái/độ tương phản.

### Hover và chuyển động con trỏ

- Button/chức năng có thể click phải có hover state nhìn thấy trong 220ms: đổi nhẹ nền hoặc border, nâng elevation và `translateY(-1px)` tối đa; khi nhấn dùng `scale(.98)` hoặc `translateY(1px)`.
- Card/action row có hover theo trục nhẹ (nâng 1–2px hoặc highlight viền), không làm thay đổi kích thước vùng click và không gây layout shift.
- Icon trong button được phép dịch 2–3px theo hướng hành động (ví dụ mũi tên tiến sang phải), chỉ dùng cho primary action; icon menu/điều hướng không lắc hoặc di chuyển liên tục.
- Không dùng hover-only để hiển thị thao tác quan trọng trên mobile; các action vẫn phải có menu/nút hiển thị.
- Không dùng hiệu ứng con trỏ kéo dài, parallax mạnh, nhấp nháy hoặc lặp vô hạn vì gây nhiễu và không thân thiện với reduced-motion.

### Quy tắc vị trí tiêu đề trang

- Mỗi route chỉ có **một** `PageHeader`/tiêu đề cấp một; không lặp lại tên trang ở topbar và nội dung chính.
- Tiêu đề nằm trong vùng `main` ngay bên dưới topbar, cùng trục trái với bảng/card bên dưới; dùng container chung `max-width: 1440px` và gutter responsive của AppShell.
- Khoảng cách chuẩn từ đáy topbar tới tiêu đề: 32px desktop, 24px tablet, 20px mobile. Tiêu đề đứng trước toolbar/KPI/data surface, không bị đẩy vào giữa các card.
- Cấu trúc: breadcrumb (nếu có) → `h1` → mô tả ngắn/ngày hiện tại → primary action ở bên phải desktop; mobile xếp thành hai hàng và giữ action dễ chạm.
- `h1` dùng sentence case, `text-wrap: balance`, không để ngày tiếng Anh hoặc tiêu đề phụ trôi thành dòng độc lập ngoài vùng header. Ngày hiển thị locale `vi-VN` và chỉ xuất hiện một lần.
- Khi sidebar thu gọn/mở rộng, vị trí x/y của `PageHeader` vẫn giữ nguyên theo container nội dung; không căn tiêu đề theo mép viewport.

### Quy tắc tương tác

- Mỗi màn hình có duy nhất một primary action rõ ràng.
- Hover, focus-visible, pressed, disabled và loading phải có trạng thái riêng.
- Chuyển cảnh 150–300ms, chỉ ưu tiên `transform`/`opacity`; tắt hoặc giảm khi `prefers-reduced-motion`.
- Không phụ thuộc hover cho hành động quan trọng; mobile phải có control hiển thị.
- Icon-only button luôn có `aria-label`; active route dùng `aria-current="page"`.

## 3. Kiến trúc thông tin theo role

### Admin

1. Tổng quan
2. Môn học & khóa học
3. Học sinh
4. Lớp học
5. Lịch học
6. Giáo án
7. Điểm danh
8. Bài tập
9. Điểm học tập
10. Học phí
11. Thông báo
12. Người dùng

### Giáo viên

1. Tổng quan
2. Lớp học
3. Lịch học
4. Giáo án
5. Điểm danh
6. Bài tập
7. Điểm học tập
8. Học sinh
9. Học phí
10. Thông báo

### Phụ huynh/Học sinh

1. Tổng quan
2. Lịch học
3. Bài tập
4. Học phí
5. Thông báo

Điều hướng dùng một data source theo role. Desktop dùng sidebar mở rộng/thu gọn; dưới 900px chuyển thành drawer có scrim, nút hamburger và focus management.

## 4. Blueprint các màn hình

### 4.1. Authentication

**Login**

- Bố cục hai vùng trên desktop: brand/context bên trái, card đăng nhập bên phải; mobile chỉ giữ form và brand mark.
- Nêu rõ “Đăng nhập bằng Google”, trạng thái đang xác thực và lỗi kết nối.
- Không dùng alert; lỗi nằm gần hành động và có hướng khắc phục.
- Có focus đầu vào/nút, skip link không cần thiết trên màn hình chỉ có form.

**Access denied / account disabled**

- Empty/error state có icon SVG, tiêu đề trực tiếp, lý do cụ thể, nút thử lại và nút đăng xuất.
- Luôn có đường thoát về login.

### 4.2. Dashboard

**Staff dashboard**

- Header: lời chào + ngày hiện tại + một primary action theo quyền.
- Hàng KPI: lớp đang hoạt động, học sinh, buổi học hôm nay, khoản cần thu; số dùng tabular figures.
- Khu chính bất đối xứng: lịch hôm nay + việc cần xử lý; bên phải là thông báo gần đây.
- Loading dùng skeleton đúng hình khối; empty state có CTA đi tới module liên quan.

**Viewer dashboard**

- Ưu tiên “Hôm nay”: buổi học kế tiếp, bài tập sắp đến hạn, học phí còn thiếu.
- Một timeline dọc thay cho nhiều card nhỏ; mobile không yêu cầu scroll ngang.

### 4.3. Catalog / classes / students / users

- Page header gồm breadcrumb, tiêu đề, mô tả ngắn và một primary “Thêm …”.
- Toolbar: search, filter, sort; trạng thái filter hiển thị bằng text/badge chứ không chỉ màu.
- Desktop: bảng có cột ưu tiên và cột action; mobile: mỗi dòng thành list row/card có disclosure.
- Form tạo/sửa mở Modal; form xóa mở Confirm Modal với tên đối tượng và cảnh báo rõ.
- Không render form inline phía trên danh sách.
- Empty state phân biệt “chưa có dữ liệu” và “không có kết quả theo bộ lọc”.

### 4.4. Class detail / enrollment

- Breadcrumb quay lại danh sách lớp.
- Hero tóm tắt lớp: tên, môn, giáo viên, lịch, số học sinh.
- Tabs hoặc segmented control cho tổng quan, học sinh, lịch, điểm danh.
- Enrollment manager dùng side panel/modal có search và selection state; hiển thị số đã chọn.

### 4.5. Sessions / lesson plans / attendance / assignments / scores

- Dùng pattern “context header → filter row → data surface”.
- Lịch học: chuyển đổi list/calendar ở desktop; mobile mặc định list theo ngày.
- Giáo án: danh sách theo lớp/môn, trạng thái draft/published rõ ràng; form dài chia nhóm field.
- Điểm danh: thao tác hàng loạt có confirmation, trạng thái present/late/absent có icon + nhãn.
- Bài tập: deadline và trạng thái nộp nổi bật; quá hạn không chỉ dùng màu đỏ.
- Điểm: bảng có sticky header, tooltip giải thích cột, tương phản không dựa vào màu đơn độc.

### 4.6. Invoices / tuition / announcements

- Học phí: summary “đã thanh toán / còn lại / quá hạn”, format tiền Việt thống nhất.
- Hóa đơn có status badge + action menu; hành động phá hủy tách khỏi CTA chính.
- Thông báo: list theo thời gian, unread state rõ bằng chấm + font weight; có empty state thân thiện.

## 5. Component system cần chuẩn hóa

### Foundation

- `AppShell`, `Sidebar`, `Topbar`, `PageHeader`, `Breadcrumbs`.
- `Button` (primary, secondary, ghost, danger, loading).
- `IconButton`, `Input`, `Select`, `Textarea`, `DateInput`, `FieldError`.
- `Modal`, `ConfirmDialog`, `Drawer`, `DropdownMenu`, `Toast`.
- `Card`, `StatCard`, `DataTable`, `ListRow`, `StatusBadge`.
- `LoadingSkeleton`, `EmptyState`, `ErrorState`, `PermissionDenied`.

### Component contract

- Props dùng semantic intent thay vì màu raw (`tone="danger"`, không `bg-red-500`).
- Mọi async action nhận `isLoading` và disable chống double-submit.
- Field component kết nối được React Hook Form và hiển thị error ngay dưới field.
- DataTable có slot cho mobile renderer, empty/loading/error và pagination.
- Modal quản lý focus, Esc, click scrim, khóa scroll và trả focus về trigger.

## 6. Responsive spec

| Breakpoint | Hành vi |
|---|---|
| 375–639 | drawer; một cột; CTA full-width khi cần; list row thay bảng |
| 640–899 | drawer; grid 2 cột cho KPI/form ngắn; toolbar wrap |
| 900–1279 | sidebar; content max-width; bảng hiển thị cột ưu tiên |
| 1280–1439 | sidebar + layout 12 cột; dashboard bất đối xứng |
| 1440+ | max-width 1440px; tăng whitespace, không kéo dài đoạn văn |

Quy tắc bắt buộc: không horizontal scroll trên mobile, nội dung chính không bị che bởi fixed UI, modal không vượt `100dvh`, chữ body tối thiểu 16px trên mobile.

## 7. Accessibility và quality gates

- Contrast text thường ≥4.5:1, large text ≥3:1; kiểm tra cả primary button và badge.
- Tab order theo thứ tự thị giác; focus ring luôn nhìn thấy.
- `label` liên kết đúng với field; lỗi dùng `role="alert"`/`aria-live` khi phù hợp.
- Heading đi tuần tự; bảng có header semantic; ảnh có alt có nghĩa.
- Không dùng màu là tín hiệu duy nhất; trạng thái có text/icon.
- Kiểm tra 375px, 768px, 1024px, 1440px; portrait và landscape.
- Kiểm tra keyboard-only, reduced motion, zoom 200% và dữ liệu dài.

## 8. Lộ trình triển khai

### P0 — Baseline và inventory

- Chụp baseline tất cả route, ghi lại lỗi layout/encoding/loading.
- Chốt token, z-index scale, typography và component naming.

### P1 — Foundation

- Self-host Be Vietnam Pro, cập nhật metadata.
- Hoàn thiện `Button`, field controls, `Card`, `StatusBadge`, feedback states.
- Chuẩn hóa `AppShell`/`Topbar`/`Sidebar` và route active state.

### P2 — Modal và form workflow

- Chuyển Course, Subject, Class, Student, Link Parent, Invite, Lesson Plan, Session sang modal.
- Thêm confirm destructive action, loading/submit/error/success state.

### P3 — Data surfaces

- Chuẩn hóa search/filter/pagination/table/list responsive cho 6 nhóm CRUD.
- Tạo mobile row renderer và empty state theo ngữ cảnh.

### P4 — Dashboard và insight

- Staff dashboard theo KPI + action queue + today schedule.
- Viewer dashboard theo today timeline + tuition/assignment priority.
- Chuẩn hóa chart accessibility, tooltip và fallback khi chưa có dữ liệu.

### P5 — Polish và verification

- Áp dụng duy nhất `--motion-duration: 220ms` cho page transition, hover/pressed, dropdown, modal và drawer; loại bỏ các duration rời rạc.
- Thêm hover/pressed/focus motion cho button, action row và chức năng có thể click; kiểm tra không gây layout shift.
- Chuẩn hóa `PageHeader` để tiêu đề mọi route nằm cùng một vị trí dưới topbar, cùng trục với content container và chỉ hiển thị một lần.
- Motion, focus, reduced-motion, loading skeleton, error recovery.
- Kiểm tra visual regression thủ công trên 4 breakpoint.
- Chạy `npm run typecheck`, `npm test`, `npm run build`; rà soát không có raw hex trong feature components.

## 9. Tiêu chí nghiệm thu

- Tất cả route chính dùng chung shell và navigation theo role.
- Tất cả form tạo/sửa/xóa thuộc phạm vi kế hoạch dùng modal hoặc drawer phù hợp.
- Không còn form inline gây đẩy danh sách xuống.
- Mỗi màn hình có loading, empty, error và permission state cần thiết.
- Tất cả thao tác async có phản hồi trong 100ms và trạng thái loading rõ.
- Không có lỗi typecheck/build/test; không có horizontal overflow ở 375px.
- Mọi transition UI dùng cùng một duration 220ms; hover/pressed/focus có phản hồi rõ nhưng không làm xô lệch layout.
- Mọi trang có một tiêu đề `h1` duy nhất, nằm đúng vùng `PageHeader` bên dưới topbar, cùng trục với nội dung và ngày hiển thị locale `vi-VN` tối đa một lần.
- Người dùng keyboard có thể đăng nhập, mở menu, mở modal, sửa dữ liệu và đóng modal mà không mất focus.

## 10. Ngoài phạm vi đợt này

- Dark mode.
- Đa ngôn ngữ.
- Geolocation/thay đổi thành phố thời tiết.
- Thay đổi Firestore schema, security rules hoặc business logic.
- Native mobile app.
