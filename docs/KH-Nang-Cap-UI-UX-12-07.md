# KH Nâng Cấp UI/UX — Edumatrix-vn (12/07/2026)

Kế hoạch nâng cấp giao diện cho cả **3 role**: Quản trị viên (Admin) · Giáo viên (Teacher) · Phụ huynh/Học sinh (Viewer).

**Trạng thái triển khai (12/07):**
- ✅ **P1 Font** — `index.html` nạp Be Vietnam Pro (CDN).
- ✅ **P2 Nav data** — `constants/navigation.ts` dạng cây nhóm theo role (kèm module tương lai `disabled`).
- ✅ **P3 Sidebar** — accordion nhóm (Nhánh 1-4) + thu gọn/mở rộng + flyout khi gọn + **thẻ tài khoản ở chân**.
- ✅ **P4 Topbar** — bỏ tài khoản; còn đồng hồ + thời tiết + **🔔 chuông thông báo** (dropdown, badge, empty-state, link).
- ✅ **P5 Thị giác** — glass/gradient/shadow tokens (`index.css`).
- ✅ **P6 Chuyển cảnh** — `page-enter` mượt hơn (340ms), `main` key theo route để replay mỗi lần đổi chức năng.
- ✅ **Tiêu đề động lên Topbar** — Topbar hiện tiêu đề chức năng theo route (`findPageTitle`); đã **gỡ H1 trùng ở 17 trang** + **bỏ dòng ngày tiếng Anh** ở Dashboard.
- ✅ **P7 (một phần)** — Modal a11y sẵn có; đã chuyển **5 form**: Students, Classes, Catalog (Môn học + Khóa học), Users — mỗi trang có nút "＋ Thêm/Tạo/Mời" mở Modal, form bỏ card/heading, đóng khi lưu xong.
- ✅ **Chốt tiêu đề (đồng bộ):** **tiêu đề module chỉ ở Topbar** (`findPageTitle`); `PageHeader` **bỏ H1** (chỉ còn mô tả + nút hành động) và **bỏ cap `max-w-[1370px]`** → hết trùng H1, khớp full-width.
- ✅ **Tối ưu font & khoảng cách:** heading `tracking` chặt hơn, body letter-spacing nhẹ; chuẩn hoá khoảng cách PageHeader/section.
- ✅ **P7 hoàn tất** — 8/8 form nhập liệu đã sang Modal: Students · Classes · Catalog(2) · Users · **Sessions** · **LessonPlans** (+ preview giáo án dùng `Modal` a11y). Modal xác nhận Xoá **bỏ (YAGNI)** — hiện không có hành động xoá dữ liệu thật; wire khi thêm tính năng xoá.
- ⏳ Còn lại: **P8** kiểm chứng cuối 3 role (cần đăng nhập).
- Typecheck + build: **xanh**.

---

## 1. Bối cảnh & hiện trạng codebase

- **Stack:** React 18 + Vite + TypeScript + Tailwind + react-router-dom v6, `lucide-react`, Firebase (Spark, client-only).
- **2 shell hiện tại:**
  - `AppShell` (Admin/Teacher) → `Sidebar` (11–12 mục) + `Topbar`.
  - `ViewerShell` (Phụ huynh/HS) → `BottomNavigation` (5 mục) + `Topbar`.
- **Form hiện tại:** render **inline** trên trang, luôn hiển thị phía trên danh sách (vd `StudentsPage` nhúng `<StudentForm>`); sửa bằng state `editing*`. **Chưa có** component Modal (`components/ui/` chỉ có Logo, Pagination, SearchInput, StatusBadge).
- **Bảng màu** trong `tailwind.config.ts` **đã chuẩn giáo dục** (primary blue = tin cậy, success green = tăng trưởng, neutral ấm = thân thiện) → **refine, không thay**.
- **Bug phát hiện:** font `"Be Vietnam Pro"` được khai báo nhưng **chưa hề được nạp** (không có `<link>` trong `index.html`, không có `@font-face`) → toàn app đang fallback về system-ui.

### Ràng buộc gốc (bắt buộc tuân thủ)
- Firebase **Spark (free)** + **logic client-only**. Không Cloud Functions / Admin SDK.
- ⇒ Widget thời tiết dùng **Open-Meteo** (miễn phí, **không cần API key**, gọi thẳng từ client) — không phá vỡ ràng buộc.

---

## 2. Các quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Điều hướng chính | **Sidebar thu gọn/mở rộng** cho cả 3 role *(pivot từ bottom bar)* |
| Cấu trúc sidebar | **Nhóm gập/mở (accordion) theo nhánh** cho Admin/Teacher; Viewer phẳng |
| Desktop nav | Sidebar rail: mở rộng ~256px ↔ thu gọn ~74px (hover → flyout khi gọn) |
| Mobile nav | Sidebar thành **drawer off-canvas** (hamburger + scrim) |
| Khối tài khoản | **Dời xuống footer sidebar** (rời khỏi top bar) |
| Top bar | Tên phần mềm + subtitle · đồng hồ real-time · thời tiết *(bỏ tài khoản)* |
| Module mới | Tương tác lớp học (Chat fanpage) + Marketing (API Facebook) — cần Cloudflare Worker, ngoài phạm vi UI |
| Thời tiết | **Thành phố cố định** (mặc định Hà Nội), nguồn Open-Meteo, cache localStorage ~30' |
| Thẩm mỹ | Thêm **Gradient · Liquid glass · Shadowing** (thang elevation nhất quán) |
| Form nhập liệu | **Toàn bộ chuyển sang Popup/Modal** + nút Thêm/Sửa/Xoá tương ứng |
| Màu | Giữ token hiện có, chỉ refine + thêm token gradient/glass/shadow |
| Font | Đồng bộ **Be Vietnam Pro** (self-host, chuẩn tiếng Việt) |
| Dark mode | **Ngoài phạm vi** đợt này (thêm sau nếu cần) |

**Cần xác nhận trước khi code:**
1. Thành phố mặc định cho thời tiết (Hà Nội hay khác?).
2. Font: **self-host** (khuyến nghị, chạy offline, hợp zero-cost) hay Google Fonts CDN?
3. Sidebar mặc định khi mở app: **mở rộng** (khuyến nghị) hay thu gọn? — nhớ trạng thái qua `localStorage`.

---

## 3. Kế hoạch thực thi theo phase

> Nguyên tắc: mỗi bước là 1 diff nhỏ, kiểm chứng được; tái sử dụng tối đa; xoá cái thừa.

### P1 — Font tiếng Việt *(làm trước — mọi màn hình phụ thuộc)*
- Self-host **Be Vietnam Pro** (400/500/600/700) vào `public/fonts/`.
- Khai báo `@font-face` với `font-display: swap` (tránh FOIT), preload weight 400 critical trong `index.html`.

### P2 — Data điều hướng dùng chung
- Tạo `src/constants/navigation.ts`: danh sách mục **theo role** (rút từ `Sidebar.tsx` + `BottomNavigation.tsx` → 1 nguồn duy nhất).
- Cấu hình gợi ý:
  - **Admin (12):** Tổng quan · Môn học & Khóa học · Học sinh · Lớp học · Lịch học · Giáo án · Điểm danh · Bài tập · Điểm học tập · Học phí · Thông báo · Người dùng.
  - **Teacher (10):** Tổng quan · Lớp học · Lịch học · Giáo án · Điểm danh · Bài tập · Điểm học tập · Học sinh · Học phí · Thông báo.
  - **Viewer (5):** Tổng quan · Lịch học · Bài tập · Học phí · Thông báo.

### P3 — 🔄 Sidebar nhóm gập/mở (accordion) + thu gọn/mở rộng, cho cả 3 role
- **Điều hướng theo nhánh (Admin/Teacher)** — mỗi nhánh là group gập/mở (chevron xổ xuống), lưu trạng thái mở `localStorage`; active item con dùng pill gradient + `aria-current`. Tham chiếu pattern mẫu (ảnh 2).
  - **Nhánh 1:** Tổng quan *(link đơn, không con)*
  - **Nhánh 2 — Quản lý lớp học:** Học sinh · Lớp học & Khóa học · Lịch học
  - **Nhánh 3 — Chức năng:** Giáo án · Điểm danh · Bài tập · Điểm học tập
  - **Nhánh 4 — Quản lý:** Tài chính · Tương tác lớp học (Chat fanpage) · Marketing (fanpage/đăng bài/API Facebook) · Người dùng · Thông báo
  - *Teacher:* bỏ "Người dùng" và "Marketing" (admin-only) trong Nhánh 4.
  - *Viewer (PH/HS):* giữ **phẳng 5 mục** (không nhóm).
- 2 trạng thái desktop: **mở rộng** (~256px, icon + nhãn + nhóm) ↔ **thu gọn** (~74px, chỉ icon nhóm; **hover → flyout** hiện danh sách con — bù cho việc mất nhãn). Nút toggle ở đầu sidebar.
- Mobile (<900px): **drawer off-canvas** + hamburger ở top bar + scrim.
- Gộp `AppShell`/`ViewerShell` về **1 shell dùng chung** nhận cấu hình nav theo role.
- **Xoá** `Sidebar.tsx` cũ, `BottomNavigation.tsx`.
- ⚠️ **Module mới cần backend riêng (ngoài UI):** "Tương tác lớp học" + "Marketing" phụ thuộc **Cloudflare Worker giấu Meta token + Facebook Graph API** (ngoại lệ server đã duyệt). Đợt này chỉ tạo ô điều hướng + trang placeholder.

### P4 — Top bar + **dời khối tài khoản xuống chân sidebar**
- **Khối tài khoản chuyển từ góc phải top bar → footer sidebar** (user card: avatar + tên + role + chevron → dropdown Hồ sơ / Cài đặt / Đăng xuất). Khi sidebar thu gọn: chỉ hiện avatar.
- **Top bar còn lại:** Trái = (hamburger mobile) + Logo + **Tên phần mềm** + subtitle. Phải = **Đồng hồ real-time** (`date-fns` locale `vi`, `tabular-nums`) + **Widget thời tiết** (Open-Meteo, thành phố cố định) + **🔔 Chuông thông báo**.
- **Chuông thông báo** (cạnh ngày/thời tiết): badge số chưa đọc + dropdown panel (danh sách thông báo gần đây: icon + tiêu đề + thời gian, nút "Đánh dấu đã đọc" + "Xem tất cả"). Nối vào feature **Thông báo** sẵn có (`announcements`), không phải tính năng mới. `aria-live` cho số chưa đọc; đóng bằng Esc/click ngoài.
- Mobile: ngày giờ + thời tiết thu gọn; chuông giữ nguyên.

### P4b — Áp cấu trúc theo bản mẫu (ia Academy) cho hiện tại & tương lai
Chuẩn hoá bố cục trang theo mẫu để các module cũ/mới đồng nhất:
- **Top bar tiện ích:** đồng hồ · thời tiết · chuông thông báo *(tài khoản đã ở chân sidebar)*.
- **Stat card** hàng đầu: 4 thẻ số liệu có icon + màu nhấn (như mẫu).
- **Khu biểu đồ:** bar chart + donut (dùng `recharts` sẵn có) cho trang Tổng quan — *tương lai*.
- **Bảng dữ liệu:** checkbox chọn nhiều + avatar + cột + hành động (Star Students).
- **Feed hoạt động:** panel "Cần xử lý / Hoạt động gần đây" bên phải.
- Mọi trang danh sách (hiện có + module mới Tài chính/Tương tác/Marketing) kế thừa khung này.

### P5 — 🎨 Hệ thị giác: Gradient · Liquid glass · Shadow
- **Token gradient:** `--grad-primary` (135°, primary-500→700) cho logo/nút primary/active nav/avatar; `--grad-page` mesh dịu cho nền.
- **Liquid glass:** sidebar + top bar + modal + card nổi dùng `backdrop-filter: blur(14px) saturate(150%)` + nền `rgba(255,255,255,.72)` + viền sáng 1px + highlight trên.
- **Thang elevation:** `--shadow-1..4` (card → sidebar → dropdown → modal) + glow `--ring-primary`, thay các bóng rời rạc.
- **Fallback** `@supports not (backdrop-filter)` → nền đục; đảm bảo tương phản chữ ≥ 4.5:1 (a11y).
- Chuẩn hóa hover/active/disabled toàn hệ.

### P6 — Chuyển cảnh mượt
- Chỉ animate `transform`/`opacity` (không animate width/height cho phần tử nặng); 150–300ms; `ease-out` vào / `ease-in` ra.
- Sidebar collapse: transition `width` mượt; stagger dòng danh sách 30–50ms; page-transition nhẹ khi đổi route.
- **Bắt buộc** `@media (prefers-reduced-motion: reduce)` tắt animation.

### P7 — Form → Popup (Modal)
- `components/ui/Modal.tsx` — a11y: scrim 50%, `aria-modal`, focus-trap, **Esc để đóng**, trả focus về nút mở, khoá scroll nền, animation scale+fade (respect reduced-motion). Tái sử dụng cho cả xác nhận Xoá.
- **Pattern trang danh sách** (Students, Classes, Catalog, Users, LessonPlans, Sessions):
  - Header trang thêm **nút primary "＋ Thêm …"** → Modal chế độ *tạo*.
  - Mỗi dòng có cụm **Sửa · Xoá** → "Sửa" mở Modal *sửa* (dùng lại prop `editing*` sẵn có); "Xoá" mở Modal xác nhận.
  - Nhiều thao tác → gom `overflow menu`.
- Bỏ card bao ngoài trong mỗi `*Form` (Modal là container); nút Submit/Hủy thành **footer modal**; giữ nguyên validate/error/success đã có.
- Tách form inline của `LessonPlansPage` & `SessionsPage` thành `LessonPlanForm`/`SessionForm` rồi bọc Modal.
- **8 form cần chuyển:** `CourseForm`, `SubjectForm`, `ClassForm`, `StudentForm`, `LinkParentForm`, `InviteForm`, + 2 form inline (LessonPlans, Sessions).

### P8 — Kiểm chứng
- `npm run dev` → kiểm 375px + desktop, tab order, `prefers-reduced-motion`, weather load, focus management.
- `npm run build` (typecheck) sạch. Xoá file/pattern thừa sau migrate.

---

## 4. Tóm tắt thay đổi component

| Việc | File |
|---|---|
| Nạp font | `index.html`, `index.css`, `public/fonts/` |
| Data nav | **mới** `src/constants/navigation.ts` |
| Shell dùng chung | sửa `AppShell.tsx`; **xoá** `Sidebar.tsx`, `BottomNavigation.tsx`, `ViewerShell.tsx` |
| Sidebar mới | **mới** `Sidebar` (collapsible glass) |
| Top bar | sửa `Topbar.tsx` (+ `useClock`, `WeatherWidget`, `useWeather`, dropdown tài khoản) |
| Token thị giác | `tailwind.config.ts` / `index.css` (gradient, glass, shadow) |
| Modal | **mới** `components/ui/Modal.tsx` |
| Form → popup | các trang & `*Form` trong `features/**` |

---

## 5. Ghi chú về Demo

- File demo tĩnh: `edumatrix-ui-demo.html` (HTML/CSS/JS thuần, độc lập với app React) — dùng để **duyệt hướng thiết kế** trước khi code.
- Đã kiểm chứng chạy: sidebar thu gọn **74px** ↔ mở rộng **256px**, drawer mobile <900px, liquid glass (`backdrop-filter`), gradient active nav/nút, đồng hồ locale `vi`, thời tiết thật từ Open-Meteo (vd 27°C Hà Nội), font Be Vietnam Pro, popup form (scrim + Esc + auto-focus).
- Demo dùng Google Fonts CDN cho tiện; **bản production sẽ self-host** (P1).

---

## 6. Ngoài phạm vi (thêm sau nếu cần)
- Dark mode.
- Đa ngôn ngữ / đổi thành phố thời tiết theo geolocation.
- Thay đổi logic mutation/schema/route (giữ nguyên đợt này).
