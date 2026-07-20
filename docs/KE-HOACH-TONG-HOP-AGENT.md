# Kế hoạch tính năng — Tổng hợp (tài liệu hướng dẫn Agent)

> Tài liệu tổng hợp ngày 20/07/2026, gộp 11 kế hoạch tính năng đang hoạt động của dự án Edumatrix VN (không gồm các kế hoạch đã chuyển `docs/archive/` trước đó) theo thứ tự thời gian. Đây là tài liệu Agent (Claude) tham chiếu khi tiếp tục công việc — mỗi mục giữ nguyên nội dung kế hoạch gốc, chỉ điều chỉnh cấp tiêu đề để lồng vào tài liệu chung. Trạng thái triển khai ghi trong từng kế hoạch là trạng thái **tại thời điểm viết kế hoạch đó** — đối chiếu code thực tế trước khi coi là còn đúng.

## Mục lục

1. [12/07/2026 — KH Nâng Cấp UI/UX](#1-12072026--kh-nâng-cấp-uiux)
2. [12/07/2026 — Kế hoạch thiết kế Frontend toàn hệ thống](#2-12072026--kế-hoạch-thiết-kế-frontend-toàn-hệ-thống)
3. [14/07/2026 — Kế hoạch cập nhật giao diện](#3-14072026--kế-hoạch-cập-nhật-giao-diện)
4. [14/07/2026 — Kế hoạch sửa và nâng cấp UI/UX toàn hệ thống (roadmap sống)](#4-14072026--kế-hoạch-sửa-và-nâng-cấp-uiux-toàn-hệ-thống-roadmap-sống)
5. [15/07/2026 — Kế hoạch nâng cấp Spark/client-side và Messenger](#5-15072026--kế-hoạch-nâng-cấp-sparkclient-side-và-messenger)
6. [15/07/2026 — Kế hoạch tối ưu Timetable không cần scroll](#6-15072026--kế-hoạch-tối-ưu-timetable-không-cần-scroll)
7. [16/07/2026 — Kế hoạch hợp nhất Module Bài tập và Điểm học tập](#7-16072026--kế-hoạch-hợp-nhất-module-bài-tập-và-điểm-học-tập)
8. [17/07/2026 — Kế hoạch nâng cấp module Cài đặt và Firebase Spark](#8-17072026--kế-hoạch-nâng-cấp-module-cài-đặt-và-firebase-spark)
9. [17/07/2026 — Kế hoạch nâng cấp module Người dùng](#9-17072026--kế-hoạch-nâng-cấp-module-người-dùng)
10. [17/07/2026 — Kế hoạch khắc phục vấn đề từ Báo cáo Rà soát Mã nguồn](#10-17072026--kế-hoạch-khắc-phục-vấn-đề-từ-báo-cáo-rà-soát-mã-nguồn)
11. [17/07/2026 — Kế hoạch thiết lập module Chat](#11-17072026--kế-hoạch-thiết-lập-module-chat)

---

## 1. 12/07/2026 — KH Nâng Cấp UI/UX

_Nguồn gốc: `KH-Nang-Cap-UI-UX-12-07.md` — file gốc đã chuyển vào `docs/archive/`._

### KH Nâng Cấp UI/UX — Edumatrix-vn (12/07/2026)

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

#### 1. Bối cảnh & hiện trạng codebase

- **Stack:** React 18 + Vite + TypeScript + Tailwind + react-router-dom v6, `lucide-react`, Firebase (Spark, client-only).
- **2 shell hiện tại:**
  - `AppShell` (Admin/Teacher) → `Sidebar` (11–12 mục) + `Topbar`.
  - `ViewerShell` (Phụ huynh/HS) → `BottomNavigation` (5 mục) + `Topbar`.
- **Form hiện tại:** render **inline** trên trang, luôn hiển thị phía trên danh sách (vd `StudentsPage` nhúng `<StudentForm>`); sửa bằng state `editing*`. **Chưa có** component Modal (`components/ui/` chỉ có Logo, Pagination, SearchInput, StatusBadge).
- **Bảng màu** trong `tailwind.config.ts` **đã chuẩn giáo dục** (primary blue = tin cậy, success green = tăng trưởng, neutral ấm = thân thiện) → **refine, không thay**.
- **Bug phát hiện:** font `"Be Vietnam Pro"` được khai báo nhưng **chưa hề được nạp** (không có `<link>` trong `index.html`, không có `@font-face`) → toàn app đang fallback về system-ui.

##### Ràng buộc gốc (bắt buộc tuân thủ)
- Firebase **Spark (free)** + **logic client-only**. Không Cloud Functions / Admin SDK.
- ⇒ Widget thời tiết dùng **Open-Meteo** (miễn phí, **không cần API key**, gọi thẳng từ client) — không phá vỡ ràng buộc.

---

#### 2. Các quyết định đã chốt

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

#### 3. Kế hoạch thực thi theo phase

> Nguyên tắc: mỗi bước là 1 diff nhỏ, kiểm chứng được; tái sử dụng tối đa; xoá cái thừa.

##### P1 — Font tiếng Việt *(làm trước — mọi màn hình phụ thuộc)*
- Self-host **Be Vietnam Pro** (400/500/600/700) vào `public/fonts/`.
- Khai báo `@font-face` với `font-display: swap` (tránh FOIT), preload weight 400 critical trong `index.html`.

##### P2 — Data điều hướng dùng chung
- Tạo `src/constants/navigation.ts`: danh sách mục **theo role** (rút từ `Sidebar.tsx` + `BottomNavigation.tsx` → 1 nguồn duy nhất).
- Cấu hình gợi ý:
  - **Admin (12):** Tổng quan · Môn học & Khóa học · Học sinh · Lớp học · Lịch học · Giáo án · Điểm danh · Bài tập · Điểm học tập · Học phí · Thông báo · Người dùng.
  - **Teacher (10):** Tổng quan · Lớp học · Lịch học · Giáo án · Điểm danh · Bài tập · Điểm học tập · Học sinh · Học phí · Thông báo.
  - **Viewer (5):** Tổng quan · Lịch học · Bài tập · Học phí · Thông báo.

##### P3 — 🔄 Sidebar nhóm gập/mở (accordion) + thu gọn/mở rộng, cho cả 3 role
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

##### P4 — Top bar + **dời khối tài khoản xuống chân sidebar**
- **Khối tài khoản chuyển từ góc phải top bar → footer sidebar** (user card: avatar + tên + role + chevron → dropdown Hồ sơ / Cài đặt / Đăng xuất). Khi sidebar thu gọn: chỉ hiện avatar.
- **Top bar còn lại:** Trái = (hamburger mobile) + Logo + **Tên phần mềm** + subtitle. Phải = **Đồng hồ real-time** (`date-fns` locale `vi`, `tabular-nums`) + **Widget thời tiết** (Open-Meteo, thành phố cố định) + **🔔 Chuông thông báo**.
- **Chuông thông báo** (cạnh ngày/thời tiết): badge số chưa đọc + dropdown panel (danh sách thông báo gần đây: icon + tiêu đề + thời gian, nút "Đánh dấu đã đọc" + "Xem tất cả"). Nối vào feature **Thông báo** sẵn có (`announcements`), không phải tính năng mới. `aria-live` cho số chưa đọc; đóng bằng Esc/click ngoài.
- Mobile: ngày giờ + thời tiết thu gọn; chuông giữ nguyên.

##### P4b — Áp cấu trúc theo bản mẫu (ia Academy) cho hiện tại & tương lai
Chuẩn hoá bố cục trang theo mẫu để các module cũ/mới đồng nhất:
- **Top bar tiện ích:** đồng hồ · thời tiết · chuông thông báo *(tài khoản đã ở chân sidebar)*.
- **Stat card** hàng đầu: 4 thẻ số liệu có icon + màu nhấn (như mẫu).
- **Khu biểu đồ:** bar chart + donut (dùng `recharts` sẵn có) cho trang Tổng quan — *tương lai*.
- **Bảng dữ liệu:** checkbox chọn nhiều + avatar + cột + hành động (Star Students).
- **Feed hoạt động:** panel "Cần xử lý / Hoạt động gần đây" bên phải.
- Mọi trang danh sách (hiện có + module mới Tài chính/Tương tác/Marketing) kế thừa khung này.

##### P5 — 🎨 Hệ thị giác: Gradient · Liquid glass · Shadow
- **Token gradient:** `--grad-primary` (135°, primary-500→700) cho logo/nút primary/active nav/avatar; `--grad-page` mesh dịu cho nền.
- **Liquid glass:** sidebar + top bar + modal + card nổi dùng `backdrop-filter: blur(14px) saturate(150%)` + nền `rgba(255,255,255,.72)` + viền sáng 1px + highlight trên.
- **Thang elevation:** `--shadow-1..4` (card → sidebar → dropdown → modal) + glow `--ring-primary`, thay các bóng rời rạc.
- **Fallback** `@supports not (backdrop-filter)` → nền đục; đảm bảo tương phản chữ ≥ 4.5:1 (a11y).
- Chuẩn hóa hover/active/disabled toàn hệ.

##### P6 — Chuyển cảnh mượt
- Chỉ animate `transform`/`opacity` (không animate width/height cho phần tử nặng); 150–300ms; `ease-out` vào / `ease-in` ra.
- Sidebar collapse: transition `width` mượt; stagger dòng danh sách 30–50ms; page-transition nhẹ khi đổi route.
- **Bắt buộc** `@media (prefers-reduced-motion: reduce)` tắt animation.

##### P7 — Form → Popup (Modal)
- `components/ui/Modal.tsx` — a11y: scrim 50%, `aria-modal`, focus-trap, **Esc để đóng**, trả focus về nút mở, khoá scroll nền, animation scale+fade (respect reduced-motion). Tái sử dụng cho cả xác nhận Xoá.
- **Pattern trang danh sách** (Students, Classes, Catalog, Users, LessonPlans, Sessions):
  - Header trang thêm **nút primary "＋ Thêm …"** → Modal chế độ *tạo*.
  - Mỗi dòng có cụm **Sửa · Xoá** → "Sửa" mở Modal *sửa* (dùng lại prop `editing*` sẵn có); "Xoá" mở Modal xác nhận.
  - Nhiều thao tác → gom `overflow menu`.
- Bỏ card bao ngoài trong mỗi `*Form` (Modal là container); nút Submit/Hủy thành **footer modal**; giữ nguyên validate/error/success đã có.
- Tách form inline của `LessonPlansPage` & `SessionsPage` thành `LessonPlanForm`/`SessionForm` rồi bọc Modal.
- **8 form cần chuyển:** `CourseForm`, `SubjectForm`, `ClassForm`, `StudentForm`, `LinkParentForm`, `InviteForm`, + 2 form inline (LessonPlans, Sessions).

##### P8 — Kiểm chứng
- `npm run dev` → kiểm 375px + desktop, tab order, `prefers-reduced-motion`, weather load, focus management.
- `npm run build` (typecheck) sạch. Xoá file/pattern thừa sau migrate.

---

#### 4. Tóm tắt thay đổi component

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

#### 5. Ghi chú về Demo

- File demo tĩnh: `edumatrix-ui-demo.html` (HTML/CSS/JS thuần, độc lập với app React) — dùng để **duyệt hướng thiết kế** trước khi code.
- Đã kiểm chứng chạy: sidebar thu gọn **74px** ↔ mở rộng **256px**, drawer mobile <900px, liquid glass (`backdrop-filter`), gradient active nav/nút, đồng hồ locale `vi`, thời tiết thật từ Open-Meteo (vd 27°C Hà Nội), font Be Vietnam Pro, popup form (scrim + Esc + auto-focus).
- Demo dùng Google Fonts CDN cho tiện; **bản production sẽ self-host** (P1).

---

#### 6. Ngoài phạm vi (thêm sau nếu cần)
- Dark mode.
- Đa ngôn ngữ / đổi thành phố thời tiết theo geolocation.
- Thay đổi logic mutation/schema/route (giữ nguyên đợt này).

---

## 2. 12/07/2026 — Kế hoạch thiết kế Frontend toàn hệ thống

_Nguồn gốc: `KE-HOACH-DESIGN-FRONTEND-TOAN-HE-THONG.md` — file gốc đã chuyển vào `docs/archive/`._

### Kế hoạch thiết kế Frontend toàn hệ thống Edumatrix-vn

Ngày: 12/07/2026
Phạm vi: Web app quản lý lớp học cho Admin, Giáo viên, Phụ huynh/Học sinh
Stack: React 18, TypeScript, Vite, Tailwind CSS, React Router, Firebase Web SDK

#### 1. Mục tiêu thiết kế

- Giảm thời gian tìm chức năng và thao tác lặp lại cho từng role.
- Tạo một ngôn ngữ giao diện thống nhất thay vì mỗi trang tự định nghĩa card, bảng, form và trạng thái.
- Ưu tiên rõ ràng dữ liệu giáo dục: lớp, lịch học, điểm danh, bài tập, điểm và học phí.
- Trải nghiệm tốt trên màn hình 375px, tablet và desktop; không yêu cầu dark mode trong đợt này.
- Giữ nguyên business logic, route, schema và ràng buộc Firebase Spark/client-only.
- Đảm bảo WCAG 2.2 AA ở các luồng chính: đăng nhập, tạo/sửa/xóa, lọc danh sách và xem dữ liệu.

#### 2. Design direction đã chọn

##### Tinh thần

**Calm academic dashboard**: tin cậy, sáng sủa, có chiều sâu nhẹ; không dùng phong cách “AI gradient” sặc sỡ. Bề mặt chính là warm-neutral, xanh dương là màu hành động, xanh lá/vàng/đỏ chỉ dùng cho trạng thái.

##### Hệ thị giác

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

##### Chuẩn chuyển động dùng một thời lượng duy nhất

- Toàn bộ hệ thống chỉ dùng một motion duration chuẩn: **220ms** (`--motion-duration: 220ms`). Không tạo nhiều nhóm thời gian 150/200/300ms cho các component khác nhau.
- Easing chuẩn: `ease-out` khi xuất hiện/đi vào và `ease-in` khi rời đi; nếu dùng một CSS transition shorthand thì vẫn giữ cùng 220ms.
- Chỉ animate `transform` và `opacity` cho page transition, hover, dropdown, modal, drawer và feedback; không animate trực tiếp `top/left/width/height` của layout nặng.
- `prefers-reduced-motion: reduce` chuyển motion duration về gần 0 và bỏ các hiệu ứng di chuyển, nhưng vẫn giữ thay đổi trạng thái/độ tương phản.

##### Hover và chuyển động con trỏ

- Button/chức năng có thể click phải có hover state nhìn thấy trong 220ms: đổi nhẹ nền hoặc border, nâng elevation và `translateY(-1px)` tối đa; khi nhấn dùng `scale(.98)` hoặc `translateY(1px)`.
- Card/action row có hover theo trục nhẹ (nâng 1–2px hoặc highlight viền), không làm thay đổi kích thước vùng click và không gây layout shift.
- Icon trong button được phép dịch 2–3px theo hướng hành động (ví dụ mũi tên tiến sang phải), chỉ dùng cho primary action; icon menu/điều hướng không lắc hoặc di chuyển liên tục.
- Không dùng hover-only để hiển thị thao tác quan trọng trên mobile; các action vẫn phải có menu/nút hiển thị.
- Không dùng hiệu ứng con trỏ kéo dài, parallax mạnh, nhấp nháy hoặc lặp vô hạn vì gây nhiễu và không thân thiện với reduced-motion.

##### Quy tắc vị trí tiêu đề trang

- Mỗi route chỉ có **một** `PageHeader`/tiêu đề cấp một; không lặp lại tên trang ở topbar và nội dung chính.
- Tiêu đề nằm trong vùng `main` ngay bên dưới topbar, cùng trục trái với bảng/card bên dưới; dùng container chung `max-width: 1440px` và gutter responsive của AppShell.
- Khoảng cách chuẩn từ đáy topbar tới tiêu đề: 32px desktop, 24px tablet, 20px mobile. Tiêu đề đứng trước toolbar/KPI/data surface, không bị đẩy vào giữa các card.
- Cấu trúc: breadcrumb (nếu có) → `h1` → mô tả ngắn/ngày hiện tại → primary action ở bên phải desktop; mobile xếp thành hai hàng và giữ action dễ chạm.
- `h1` dùng sentence case, `text-wrap: balance`, không để ngày tiếng Anh hoặc tiêu đề phụ trôi thành dòng độc lập ngoài vùng header. Ngày hiển thị locale `vi-VN` và chỉ xuất hiện một lần.
- Khi sidebar thu gọn/mở rộng, vị trí x/y của `PageHeader` vẫn giữ nguyên theo container nội dung; không căn tiêu đề theo mép viewport.

##### Quy tắc tương tác

- Mỗi màn hình có duy nhất một primary action rõ ràng.
- Hover, focus-visible, pressed, disabled và loading phải có trạng thái riêng.
- Chuyển cảnh 150–300ms, chỉ ưu tiên `transform`/`opacity`; tắt hoặc giảm khi `prefers-reduced-motion`.
- Không phụ thuộc hover cho hành động quan trọng; mobile phải có control hiển thị.
- Icon-only button luôn có `aria-label`; active route dùng `aria-current="page"`.

#### 3. Kiến trúc thông tin theo role

##### Admin

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

##### Giáo viên

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

##### Phụ huynh/Học sinh

1. Tổng quan
2. Lịch học
3. Bài tập
4. Học phí
5. Thông báo

Điều hướng dùng một data source theo role. Desktop dùng sidebar mở rộng/thu gọn; dưới 900px chuyển thành drawer có scrim, nút hamburger và focus management.

#### 4. Blueprint các màn hình

##### 4.1. Authentication

**Login**

- Bố cục hai vùng trên desktop: brand/context bên trái, card đăng nhập bên phải; mobile chỉ giữ form và brand mark.
- Nêu rõ “Đăng nhập bằng Google”, trạng thái đang xác thực và lỗi kết nối.
- Không dùng alert; lỗi nằm gần hành động và có hướng khắc phục.
- Có focus đầu vào/nút, skip link không cần thiết trên màn hình chỉ có form.

**Access denied / account disabled**

- Empty/error state có icon SVG, tiêu đề trực tiếp, lý do cụ thể, nút thử lại và nút đăng xuất.
- Luôn có đường thoát về login.

##### 4.2. Dashboard

**Staff dashboard**

- Header: lời chào + ngày hiện tại + một primary action theo quyền.
- Hàng KPI: lớp đang hoạt động, học sinh, buổi học hôm nay, khoản cần thu; số dùng tabular figures.
- Khu chính bất đối xứng: lịch hôm nay + việc cần xử lý; bên phải là thông báo gần đây.
- Loading dùng skeleton đúng hình khối; empty state có CTA đi tới module liên quan.

**Viewer dashboard**

- Ưu tiên “Hôm nay”: buổi học kế tiếp, bài tập sắp đến hạn, học phí còn thiếu.
- Một timeline dọc thay cho nhiều card nhỏ; mobile không yêu cầu scroll ngang.

##### 4.3. Catalog / classes / students / users

- Page header gồm breadcrumb, tiêu đề, mô tả ngắn và một primary “Thêm …”.
- Toolbar: search, filter, sort; trạng thái filter hiển thị bằng text/badge chứ không chỉ màu.
- Desktop: bảng có cột ưu tiên và cột action; mobile: mỗi dòng thành list row/card có disclosure.
- Form tạo/sửa mở Modal; form xóa mở Confirm Modal với tên đối tượng và cảnh báo rõ.
- Không render form inline phía trên danh sách.
- Empty state phân biệt “chưa có dữ liệu” và “không có kết quả theo bộ lọc”.

##### 4.4. Class detail / enrollment

- Breadcrumb quay lại danh sách lớp.
- Hero tóm tắt lớp: tên, môn, giáo viên, lịch, số học sinh.
- Tabs hoặc segmented control cho tổng quan, học sinh, lịch, điểm danh.
- Enrollment manager dùng side panel/modal có search và selection state; hiển thị số đã chọn.

##### 4.5. Sessions / lesson plans / attendance / assignments / scores

- Dùng pattern “context header → filter row → data surface”.
- Lịch học: chuyển đổi list/calendar ở desktop; mobile mặc định list theo ngày.
- Giáo án: danh sách theo lớp/môn, trạng thái draft/published rõ ràng; form dài chia nhóm field.
- Điểm danh: thao tác hàng loạt có confirmation, trạng thái present/late/absent có icon + nhãn.
- Bài tập: deadline và trạng thái nộp nổi bật; quá hạn không chỉ dùng màu đỏ.
- Điểm: bảng có sticky header, tooltip giải thích cột, tương phản không dựa vào màu đơn độc.

##### 4.6. Invoices / tuition / announcements

- Học phí: summary “đã thanh toán / còn lại / quá hạn”, format tiền Việt thống nhất.
- Hóa đơn có status badge + action menu; hành động phá hủy tách khỏi CTA chính.
- Thông báo: list theo thời gian, unread state rõ bằng chấm + font weight; có empty state thân thiện.

#### 5. Component system cần chuẩn hóa

##### Foundation

- `AppShell`, `Sidebar`, `Topbar`, `PageHeader`, `Breadcrumbs`.
- `Button` (primary, secondary, ghost, danger, loading).
- `IconButton`, `Input`, `Select`, `Textarea`, `DateInput`, `FieldError`.
- `Modal`, `ConfirmDialog`, `Drawer`, `DropdownMenu`, `Toast`.
- `Card`, `StatCard`, `DataTable`, `ListRow`, `StatusBadge`.
- `LoadingSkeleton`, `EmptyState`, `ErrorState`, `PermissionDenied`.

##### Component contract

- Props dùng semantic intent thay vì màu raw (`tone="danger"`, không `bg-red-500`).
- Mọi async action nhận `isLoading` và disable chống double-submit.
- Field component kết nối được React Hook Form và hiển thị error ngay dưới field.
- DataTable có slot cho mobile renderer, empty/loading/error và pagination.
- Modal quản lý focus, Esc, click scrim, khóa scroll và trả focus về trigger.

#### 6. Responsive spec

| Breakpoint | Hành vi |
|---|---|
| 375–639 | drawer; một cột; CTA full-width khi cần; list row thay bảng |
| 640–899 | drawer; grid 2 cột cho KPI/form ngắn; toolbar wrap |
| 900–1279 | sidebar; content max-width; bảng hiển thị cột ưu tiên |
| 1280–1439 | sidebar + layout 12 cột; dashboard bất đối xứng |
| 1440+ | max-width 1440px; tăng whitespace, không kéo dài đoạn văn |

Quy tắc bắt buộc: không horizontal scroll trên mobile, nội dung chính không bị che bởi fixed UI, modal không vượt `100dvh`, chữ body tối thiểu 16px trên mobile.

#### 7. Accessibility và quality gates

- Contrast text thường ≥4.5:1, large text ≥3:1; kiểm tra cả primary button và badge.
- Tab order theo thứ tự thị giác; focus ring luôn nhìn thấy.
- `label` liên kết đúng với field; lỗi dùng `role="alert"`/`aria-live` khi phù hợp.
- Heading đi tuần tự; bảng có header semantic; ảnh có alt có nghĩa.
- Không dùng màu là tín hiệu duy nhất; trạng thái có text/icon.
- Kiểm tra 375px, 768px, 1024px, 1440px; portrait và landscape.
- Kiểm tra keyboard-only, reduced motion, zoom 200% và dữ liệu dài.

#### 8. Lộ trình triển khai

##### P0 — Baseline và inventory

- Chụp baseline tất cả route, ghi lại lỗi layout/encoding/loading.
- Chốt token, z-index scale, typography và component naming.

##### P1 — Foundation

- Self-host Be Vietnam Pro, cập nhật metadata.
- Hoàn thiện `Button`, field controls, `Card`, `StatusBadge`, feedback states.
- Chuẩn hóa `AppShell`/`Topbar`/`Sidebar` và route active state.

##### P2 — Modal và form workflow

- Chuyển Course, Subject, Class, Student, Link Parent, Invite, Lesson Plan, Session sang modal.
- Thêm confirm destructive action, loading/submit/error/success state.

##### P3 — Data surfaces

- Chuẩn hóa search/filter/pagination/table/list responsive cho 6 nhóm CRUD.
- Tạo mobile row renderer và empty state theo ngữ cảnh.

##### P4 — Dashboard và insight

- Staff dashboard theo KPI + action queue + today schedule.
- Viewer dashboard theo today timeline + tuition/assignment priority.
- Chuẩn hóa chart accessibility, tooltip và fallback khi chưa có dữ liệu.

##### P5 — Polish và verification

- Áp dụng duy nhất `--motion-duration: 220ms` cho page transition, hover/pressed, dropdown, modal và drawer; loại bỏ các duration rời rạc.
- Thêm hover/pressed/focus motion cho button, action row và chức năng có thể click; kiểm tra không gây layout shift.
- Chuẩn hóa `PageHeader` để tiêu đề mọi route nằm cùng một vị trí dưới topbar, cùng trục với content container và chỉ hiển thị một lần.
- Motion, focus, reduced-motion, loading skeleton, error recovery.
- Kiểm tra visual regression thủ công trên 4 breakpoint.
- Chạy `npm run typecheck`, `npm test`, `npm run build`; rà soát không có raw hex trong feature components.

#### 9. Tiêu chí nghiệm thu

- Tất cả route chính dùng chung shell và navigation theo role.
- Tất cả form tạo/sửa/xóa thuộc phạm vi kế hoạch dùng modal hoặc drawer phù hợp.
- Không còn form inline gây đẩy danh sách xuống.
- Mỗi màn hình có loading, empty, error và permission state cần thiết.
- Tất cả thao tác async có phản hồi trong 100ms và trạng thái loading rõ.
- Không có lỗi typecheck/build/test; không có horizontal overflow ở 375px.
- Mọi transition UI dùng cùng một duration 220ms; hover/pressed/focus có phản hồi rõ nhưng không làm xô lệch layout.
- Mọi trang có một tiêu đề `h1` duy nhất, nằm đúng vùng `PageHeader` bên dưới topbar, cùng trục với nội dung và ngày hiển thị locale `vi-VN` tối đa một lần.
- Người dùng keyboard có thể đăng nhập, mở menu, mở modal, sửa dữ liệu và đóng modal mà không mất focus.

#### 10. Ngoài phạm vi đợt này

- Dark mode.
- Đa ngôn ngữ.
- Geolocation/thay đổi thành phố thời tiết.
- Thay đổi Firestore schema, security rules hoặc business logic.
- Native mobile app.

---

## 3. 14/07/2026 — Kế hoạch cập nhật giao diện

_Nguồn gốc: `ke-hoach-cap-nhat-giao-dien-14-07-2026.md` — file gốc đã chuyển vào `docs/archive/`._

### Kế hoạch cập nhật giao diện Edumatrix VN

Ngày lập: 14/07/2026

#### Design Read

Giao diện này là product UI cho hệ thống quản lý lớp học, phục vụ Admin, Giáo viên và Phụ huynh/Học sinh. Hướng thiết kế phù hợp là thao tác nhanh, mật độ thông tin vừa cao, chuyển cảnh mượt, ít trang trí, ưu tiên bảng dữ liệu rõ và popup nhập liệu ổn định.

Dial thiết kế:

- `DESIGN_VARIANCE: 4` vì đây là dashboard thao tác, cần nhất quán hơn là phá cách.
- `MOTION_INTENSITY: 5` vì yêu cầu tăng độ mượt nhưng vẫn phải tôn trọng `prefers-reduced-motion`.
- `VISUAL_DENSITY: 7` vì danh sách học sinh và bộ lọc cần đọc nhanh trong môi trường vận hành.

#### Chuẩn giao diện áp dụng khi triển khai

1. Màu sắc
   - Dùng đúng token trong `tailwind.config.ts`.
   - Primary: `#3366F0`, hover/active dùng `primary-600` và `primary-700`.
   - Success: `#16A34A`, dùng cho trạng thái `Đang học` và hành động xác nhận.
   - Danger: `#E4453A`, chỉ dùng cho lỗi hoặc thao tác nguy hiểm.
   - Neutral: dùng thang `neutral-50` đến `neutral-900`, không dùng thêm xám ngoài hệ.
   - Nền form và bảng ưu tiên `white`, `neutral-50`, border `neutral-200/300`.

2. Font chữ
   - Dùng thống nhất `Be Vietnam Pro` từ Tailwind `font-sans`.
   - Không trộn font khác trong UI chính, chỉ dùng mono cho mã kỹ thuật như `studentCode`, `parentUids`, `teacherIds`.

3. Cỡ chữ
   - Page title: `text-2xl` đến `text-[28px]`.
   - Section title: `text-xl`.
   - Body/table chính: `text-sm`.
   - Label, metadata, badge: `text-xs`.
   - Button: `text-sm` hoặc `text-xs` cho bảng dày dữ liệu.

4. Spacing và radius
   - Input/button dùng `rounded-input = 8px`, card dùng `rounded-card = 12px`, modal dùng `rounded-modal = 16px`.
   - Touch target tối thiểu `44px`.
   - Card/form dùng padding 12-20px theo mật độ dữ liệu.

5. Giải nghĩa module
   - Tất cả `PageHeader` ở 3 role hiển thị thống nhất: `Edumatrix-vn · Quản lý lớp học thông minh`.
   - Không dùng mô tả riêng dài cho từng module ở vùng header để tránh lệch bố cục giữa role.

#### Phạm vi A: Áp dụng cho 3 role tài khoản

1. Chuẩn hóa tất cả bộ lọc thời gian
   - Áp dụng một component chung `TimeFilter`.
   - UI mặc định là một nút compact dạng `01/07/2026 - 14/07/2026` có biểu tượng lịch và mũi tên mở.
   - Khi mở, hiển thị dialog `Thời gian báo cáo` với sidebar chọn nhanh: Hôm nay, Tuần này, Tuần trước, Tháng này, Tháng trước, 30 ngày qua.
   - Dialog có 2 input ngày, lịch 2 tháng, nút `Bỏ qua` và `Áp dụng`.
   - Áp dụng cho dashboard, lịch học, học phí, điểm danh, thông báo, bài tập, kết quả học tập.

2. Cập nhật hiệu ứng chuyển cảnh và tác vụ chuyển chức năng
   - Thêm transition page enter 280-360ms, easing `cubic-bezier(.2,.8,.2,1)`.
   - Sidebar/topbar hover dùng translate nhỏ, active scale 0.98.
   - Dropdown, modal, notification dùng fade + slide 160-220ms.
   - Tôn trọng `prefers-reduced-motion`, không animation cưỡng ép.

3. Loại bỏ opacity trong module thông báo
   - Bỏ nền `glass-panel`/`bg-white/xx` ở dropdown thông báo.
   - Dùng nền solid `#ffffff`, border rõ, shadow nhẹ.
   - Không làm mờ chữ, badge và trạng thái chưa đọc phải đủ tương phản.

4. Cập nhật Button tài khoản
   - Nút tài khoản mở dropdown.
   - Dropdown gồm:
     - Thông tin tài khoản: tên tài khoản, email, số điện thoại, ngày bắt đầu.
     - Đăng xuất.
     - Liên hệ hỗ trợ.
   - Dropdown đóng khi click ngoài, nhấn Escape, hoặc chọn hành động.

#### Phạm vi B: Áp dụng cho Admin và Giáo viên

1. Tạo bộ lọc tìm theo mã lớp
   - Gộp tìm tên học sinh, mã học sinh và mã lớp vào một ô tìm kiếm duy nhất.
   - Thứ tự bộ lọc trong module Học sinh: `Ô tìm kiếm`, `Trạng thái học`, `Thời gian lọc`.
   - Thêm bộ lọc trạng thái học gồm `Tất cả`, `Đang học`, `Đã nghỉ`.
   - Với Giáo viên, chỉ hiển thị lớp thuộc `teacherIds` hiện tại.

2. Sắp xếp lại danh sách học sinh thành 5 cột
   - Cột 1: Tên học sinh, mã học sinh.
   - Cột 2: Trạng thái, map `active` thành `Đang học`, `inactive` hoặc `deactive` thành `Đã nghỉ`.
   - Cột 3: Mã lớp, tên lớp học, khóa học.
   - Cột 4: Ngày bắt đầu, số buổi còn lại.
   - Cột 5: Button `Thông tin`.

3. Popup thông tin học sinh
   - Kích thước desktop khóa `970px x 650px`.
   - Không resize theo nội dung, phần thân có scroll nội bộ nếu dữ liệu dài.
   - Chia 2 vùng:
     - Vùng 1: `StudentDoc` và phụ huynh liên kết.
     - Vùng 2: lớp hiện tại, ghi danh, khóa học và dữ liệu tổng hợp liên quan.
   - Trường hiển thị theo dữ liệu hiện có:
     - `studentCode`, `fullName`, `dateOfBirth`, `status`, `parentUids`, `currentClassIds`, `teacherIds`, `createdAt`, `updatedAt`.
     - Thông tin phụ huynh lấy từ `UserDoc`: `email`, `displayName`, `role`, `studentIds`, `status`.
   - Không hiển thị số điện thoại/Facebook như field chính thức cho đến khi schema có các trường này.
   - Trạng thái học dùng một nút gạt mở/đóng: mở = `active`/Đang học, đóng = `inactive`/Đã nghỉ.
   - Bố cục tham chiếu ảnh mẫu nhưng dùng màu, border, margin và radius thống nhất với app hiện tại.
   - Popup thông tin tăng lên tối đa `1120px`, bỏ scroll nội bộ trên desktop để đọc hết nội dung trong một khung.

4. Bộ lọc trang
   - Thêm chọn số dòng/trang: `15`, `20`, `30`, `50`, `100`.
   - Phân trang client-side để giảm số row render và thao tác đọc trên UI.
   - Với Spark plan Firebase, tiếp tục giữ giới hạn đọc danh sách hiện tại; nếu dữ liệu tăng lớn cần nâng tiếp sang cursor pagination theo Firestore (`limit`, `startAfter`) để giảm read thực tế.

#### Thứ tự triển khai sau khi duyệt demo

1. Tạo component UI dùng chung:
   - `TimeFilter`
   - `AccountMenu`
   - `NotificationDropdown`
   - `StudentInfoDialog`

2. Cập nhật layout shell:
   - `src/components/layouts/Topbar.tsx`
   - Xóa opacity module thông báo.
   - Thêm dropdown tài khoản theo dữ liệu `useAuth`.

3. Cập nhật trang học sinh:
   - `src/features/students/components/StudentsList.tsx`
   - Bổ sung lọc mã lớp.
   - Chuyển danh sách sang bảng 5 cột.
   - Mở popup `Thông tin` thay cho chỉ `Sửa`.

4. Cập nhật dữ liệu cần hiển thị:
   - Join students với enrollments/classes/courses.
   - Bổ sung helper đọc lớp hiện tại và số buổi còn lại.
   - Với thông tin phụ huynh, dùng `parentUids` để resolve user profile.

5. Kiểm thử:
   - Typecheck.
   - Test lọc theo mã lớp.
   - Test phân quyền Admin/Giáo viên/Viewer.
   - Kiểm tra popup bằng bàn phím: focus trap, Escape, click outside.

#### Trạng thái triển khai hiện tại

- Đã bắt đầu triển khai module Học sinh trong app thật.
- Đã thêm `TimeRangeFilter` cho bộ lọc thời gian dạng compact + dialog.
- Đã cập nhật `StudentsList` thành bảng 5 cột với một ô tìm kiếm gộp tên/mã học sinh/mã lớp, trạng thái `Tất cả / Đang học / Đã nghỉ`, và chọn số dòng/trang.
- Đã thêm `StudentInfoDialog` hiển thị đúng dữ liệu `StudentDoc`, nút gạt trạng thái học, popup rộng hơn để không cần scroll nội bộ trên desktop.
- Đã cập nhật `PageHeader` để toàn bộ module dùng dòng giải nghĩa thống nhất `Edumatrix-vn · Quản lý lớp học thông minh`.
- Đã chuyển toàn bộ thanh bộ lọc học sinh lên vùng dưới dòng giải nghĩa module và nằm ngoài card `Danh sách học sinh`, đúng vị trí chỉ định.
- Đã thiết kế lại bảng học sinh theo 6 cột: tên/mã học sinh, trạng thái, lớp/khóa học, tiến độ, đánh giá và thao tác.
- Đã thêm thanh tiến độ đổi màu theo số buổi đã học và số buổi còn lại.
- Đã thêm biểu đồ tròn cho điểm danh, bài tập và đánh giá; đánh giá dùng thang `S`, `A`, `B`, `D` với màu trạng thái riêng.
- Đã gom thao tác `Thông tin` và `Liên kết` vào một popup, bổ sung sửa thông tin học sinh, sửa liên kết phụ huynh và gạt trạng thái áp dụng ngay.
- Đã đổi footer popup thông tin sang 2 nút chính: `Cập nhật` và `Hủy`, có thông báo thành công/thất bại sau khi cập nhật.
- Đã chuyển nút gạt trạng thái xuống footer popup theo vị trí chỉ định, bên trái nhóm nút `Cập nhật`/`Hủy`.
- Đã đổi `Ghi chú` thành ghi chú nội bộ của Giáo viên/Admin, lưu vào `StudentDoc.staffNote`, không dùng làm ghi chú hệ thống.
- Đã mở rộng `Thông tin phụ huynh` trong popup: tên phụ huynh, địa chỉ, số điện thoại, email liên kết và link Facebook liên kết; dữ liệu lưu vào các trường optional của `UserDoc`.
- Đã căn lại grid bảng học sinh để cột `Đánh giá` hiển thị 3 biểu đồ trên một hàng ở desktop và giảm nguy cơ đè trường giữa các cột.
- Đã căn lại giãn cách cột bảng theo mốc ổn định: `Tên học sinh` lấy mốc trái, các cột giữa có bề rộng cố định, `Tiến độ` bắt đầu từ mốc trái rõ ràng để không bị kéo lệch theo khoảng trống.
- Đã thiết kế lại popup `Thêm học sinh` thành form đầy đủ gồm 3 khối: `Thông tin cơ bản`, `Thông tin phụ huynh`, `Đăng ký lớp học`.
- Popup `Thêm học sinh` hiện hỗ trợ tạo hồ sơ học sinh, liên kết phụ huynh bằng email kèm thông tin phụ huynh, và ghi danh vào lớp ngay khi tạo.
- Đã cập nhật `Pagination` dùng chọn số dòng/trang và điều hướng đầu/trước/sau/cuối theo mẫu tham khảo.
- Đã đồng bộ demo HTML theo palette/font/cỡ chữ của phần mềm.

#### Rủi ro cần xử lý

- Data model `StudentDoc` hiện chưa chứa trực tiếp số điện thoại/email/Facebook phụ huynh. Cần lấy từ `users/{uid}` hoặc bổ sung profile phụ huynh.
- `ClassDoc` hiện chưa có mã lớp riêng trong type, cần xác nhận dùng document id hay thêm field `classCode`.
- Popup khóa 970x650 phù hợp desktop, nhưng nên có fallback responsive cho màn hình nhỏ để không vỡ layout.
- Một số file hiện có dấu hiệu mojibake tiếng Việt, nên kiểm tra encoding trước khi sửa trực tiếp.

#### Demo

Demo trước triển khai nằm tại:

`docs/edumatrix-ui-update-demo-14-07-2026.html`

---

## 4. 14/07/2026 — Kế hoạch sửa và nâng cấp UI/UX toàn hệ thống (roadmap sống)

_Nguồn gốc: `KE-HOACH-NANG-CAP-UI-UX-TOAN-HE-THONG-14-07-2026.md` — file gốc đã chuyển vào `docs/archive/`. **Lưu ý:** đây là roadmap tổng ('living plan') được cập nhật liên tục trong suốt dự án — nội dung dưới đây là bản chụp tại thời điểm gộp (20/07/2026)._

### Kế hoạch sửa và nâng cấp UI/UX toàn hệ thống Edumatrix-VN

Ngày lập: 14/07/2026 — Cập nhật lần cuối: 14/07/2026 (hoàn thành Phase 1-6)
Phạm vi: Admin, Giáo viên, Phụ huynh/Học sinh — toàn bộ route trong `src/features`.

#### 0. Vì sao tài liệu này tồn tại thay vì sửa file cũ

`docs/` hiện đã có 6 tài liệu UI/UX liên quan: `DESIGN-SYSTEM-v2.md`, `KE-HOACH-DESIGN-FRONTEND-TOAN-HE-THONG.md`, `UI-UX-FRONTEND-AUDIT-ROADMAP-12-07.md`, `KH-Nang-Cap-UI-UX-12-07.md` (đều 12/07), và `ke-hoach-cap-nhat-giao-dien-14-07-2026.md` (14/07, phạm vi module Học sinh). Các tài liệu này đã chốt token, rule và blueprint khá đầy đủ — không cần viết lại.

Việc còn thiếu là: **đối chiếu các rule đó với mã nguồn thật hôm nay**, vì một số điểm được ghi "đã chốt hướng xử lý" trong audit 12/07 nhưng khi kiểm tra code vẫn chưa sửa. Tài liệu này chỉ làm hai việc: (1) báo cáo trạng thái thật đã xác minh, (2) đưa ra lộ trình nhân rộng pattern đã làm tốt ở module Học sinh ra toàn hệ thống, gộp chung với việc thêm biểu đồ và accessibility đã bàn trước đó — vì làm tách rời từng mảng sẽ phải sửa lại module 2 lần.

Khuyến nghị: coi `DESIGN-SYSTEM-v2.md` + `KE-HOACH-DESIGN-FRONTEND-TOAN-HE-THONG.md` là **nguồn chuẩn token/rule duy nhất**; 2 file 12/07 còn lại chuyển thành lịch sử/tham khảo; `ke-hoach-cap-nhat-giao-dien-14-07-2026.md` là nhật ký triển khai module Học sinh; tài liệu này là roadmap thực thi toàn hệ thống hiện hành, cập nhật trực tiếp vào đây sau mỗi phase thay vì tạo file mới.

#### 1. Trạng thái xác minh thực tế (cập nhật sau khi hoàn thành Phase 1-6)

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

#### 2. Pattern chuẩn để nhân rộng (rút ra từ module Học sinh)

**Module Học sinh đã khóa — không chỉnh sửa thêm.** Module Học sinh chỉ đóng vai trò tài liệu tham chiếu; mọi công việc từ Phase 2 trở đi thao tác trên module đích, không động vào `features/students/`.

Module Học sinh gồm: thanh lọc gộp (tìm kiếm + trạng thái + `TimeRangeFilter`), bảng 6 cột với thanh tiến độ + 3 mini pie chart, popup chi tiết 2 vùng, `Pagination` chọn số dòng/trang.

Việc nhân rộng thực tế cho thấy: chỉ 5 module dạng "danh sách duyệt" (Lớp học, Danh mục, Người dùng) hợp pattern này; các module còn lại (Điểm danh, Học phí, Bài tập, Lịch học/buổi học, Giáo án) là workflow 1 phiên hoặc master-detail chấm bài — ép cùng pattern là sai, nên đổi hướng sang sửa lỗi thật (mất dấu, thiếu `StatusBadge`, thiếu chart, thiếu search) thay vì sao chép UI Học sinh.

#### 3. Lộ trình theo phase

##### Phase 1 — P0, sửa nợ kỹ thuật đang chặn — **HOÀN THÀNH**

- [x] Sửa `PageHeader` hiển thị đúng `description`.
- [x] `page-enter` đọc `var(--motion-duration)` thay vì hardcode 380ms.
- [x] Đổi nền dropdown thông báo trong `Topbar.tsx` từ `glass-panel` sang nền solid.

##### Phase 2 — P1, nhân rộng pattern module Học sinh — **HOÀN THÀNH**

- [x] Lớp học: bỏ `glass-panel` thừa ở `ClassesPage.tsx` (list con đã có search/filter/StatusBadge/Pagination).
- [x] Danh mục (Catalog): bỏ `glass-panel` thừa quanh `SubjectsList`/`CoursesList` (đã có search/pagination sẵn).
- [x] Người dùng (Users): bỏ `glass-panel` thừa quanh `InvitesList`/`UsersList`.
- [x] Lịch học (Sessions): sửa mất dấu toàn bộ (`STATUS_LABEL`, aria-label, option, message), bỏ `glass-panel` ở section chính.
- [x] Giáo án (LessonPlans): sửa mất dấu toàn bộ (default values, label, option, empty state), bỏ `glass-panel`.
- [x] Điểm danh, Học phí, Bài tập: sửa lỗi mất dấu tiếng Việt toàn bộ thân trang (phát hiện thật, không phải cosmetic).
- [x] Học phí: đổi trạng thái hóa đơn/thanh toán sang `StatusBadge`; **thêm search theo tên học sinh/mã hóa đơn + filter theo trạng thái** (chuyển từ `listInvoicesPage` cursor-phân trang sang `listInvoices()` — hàm đã có sẵn, tải gọn ≤300 bản ghi, phù hợp quy mô trung tâm nhỏ, cũng là dữ liệu nền cho chart Phase 3).
- [x] Điểm số: định dạng lại từ 2 dòng nén thành JSX rõ ràng.

##### Phase 3 — biểu đồ: **5/5 module xong**

| Module | Chart thêm | Trạng thái |
|---|---|---|
| Điểm số | Line tiến bộ + histogram phân phối điểm | [x] Xong |
| Tổng quan | Line xu hướng chuyên cần 14 ngày (tính từ `listSessions` + `listAttendanceSummariesBySessionIds` có sẵn) + bar ngang hóa đơn theo trạng thái (từ `listInvoices`) | [x] Xong |
| Điểm danh | Stacked bar theo tuần (present/late/absent/excused, gộp từ summary có sẵn theo tuần) + donut tổng hợp | [x] Xong |
| Học phí | Grouped bar dự kiến vs thực thu theo tháng + bar trạng thái hóa đơn | [x] Xong |
| Bài tập | Bar phễu Giao→Nộp→Chấm→Làm lại (dùng `listAssignmentSummaries()` có sẵn, chưa từng được gọi ở UI) + bar % nộp bài theo lớp | [x] Xong |

Nguyên tắc áp dụng cho mọi chart mới: tái dùng service/list function đã có (không thêm query Firestore mới tốn read trên Spark tier), tính toán bucket/nhóm ở client, đều có `aria-label` mô tả nội dung, tooltip, không dùng màu là tín hiệu duy nhất (kèm nhãn/legend).

##### Phase 4 — P2, responsive/mobile cho Viewer — **HOÀN THÀNH**

- [x] `ViewerTuitionPage`: thay dialog QR tự chế (thiếu Escape/click-ngoài/khóa scroll) bằng component `Modal` dùng chung — kế thừa toàn bộ hành vi đã chuẩn hoá (Escape, focus trap, khóa scroll, `max-h-[calc(100dvh-2rem)]`).
- [x] `ViewerAssignmentsPage`: sửa mất dấu tiếng Việt toàn bộ, định dạng lại từ file nén.
- [x] Sidebar mobile drawer: thêm xử lý phím Escape để đóng (trước đó chỉ đóng qua nút X hoặc click nền mờ).
- [x] Xác nhận 5 trang Viewer (Tổng quan, Lịch học, Bài tập, Học phí, Thông báo) ổn ở layout mobile-first (`grid` chỉ chia cột từ `md:` trở lên, không có phần tử tràn ngang).

##### Phase 5 — P2, accessibility diện rộng + hoàn thiện dữ liệu thật — **HOÀN THÀNH (trừ self-host font)**

- [x] Rà `aria-label` cho icon-only control ở Tổng quan/Người dùng/Danh mục/Lớp học/chi tiết lớp — không còn vi phạm (xem mục 1).
- [x] Kiểm tra contrast `StatusBadge` — PASS 4.5:1 cho cả 5 tone (xem mục 1).
- [x] Nối `useNotifications` với dữ liệu `ANNOUNCEMENTS` thật cho Viewer; Staff giữ rỗng có chủ đích (lý do ghi trong code + mục 1).
- [ ] Self-host font Be Vietnam Pro — **chặn bởi sandbox không có network**, cần chủ dự án tải file trên máy có mạng.

##### Phase 6 — QA & chốt

- [x] `npm run typecheck` — PASS, 0 lỗi (chạy lại sau mỗi phase).
- [x] `npm run lint` — PASS, chỉ còn 1 warning tiền tồn tại ở `Sidebar.tsx:197` (dependency `nodes` trong `useMemo`), không liên quan đến các thay đổi UI/UX, không thuộc phạm vi sửa.
- [ ] `npm run build` / `npm test` — **bị chặn bởi lỗi môi trường sandbox**: `Cannot find module '@rollup/rollup-linux-x64-gnu'` (bug tối ưu dependency của npm, xem npm/cli#4828), xảy ra ngay cả trên file chưa từng sửa. Phần `tsc --noEmit` (chạy trước trong cùng script) đã PASS trước khi gặp lỗi này. Không sửa `node_modules` trong sandbox vì đây là thư mục mount từ máy Windows thật của chủ dự án — cài binary Linux vào đó sẽ hỏng môi trường Windows. Cần chạy `npm run build`/`npm test` trên máy thật để xác nhận lần cuối.
- [ ] Kiểm tra thủ công 4 breakpoint (375/768/1024/1440), keyboard-only, `prefers-reduced-motion`, zoom 200% — cần làm trên máy thật/trình duyệt thật, ngoài khả năng của môi trường chỉnh sửa hiện tại.

#### 4. Ước lượng effort (đã thực hiện, để tham khảo cho lần sau)

| Phase | Nội dung | Thực tế |
|---|---|---|
| 1 | Sửa nợ kỹ thuật P0 | Xong trong 1 phiên |
| 2 | Nhân rộng pattern — 9 module (5 vận hành + Classes/Catalog/Users/Sessions/LessonPlans) | Xong trong 1 phiên, chia nhiều đợt ghi file |
| 3 | Biểu đồ 5 module | Xong, tái dùng 100% service function có sẵn, không thêm Firestore query mới |
| 4 | Responsive Viewer | Xong |
| 5 | Accessibility + dữ liệu thông báo thật | Xong, trừ self-host font (chặn bởi môi trường) |
| 6 | QA từng phase | typecheck/lint PASS; build/test cần chạy trên máy thật |

#### 5. Rủi ro

- Firebase Spark free tier: các chart mới đều tái dùng list function có sẵn (`listInvoices` ≤300, `listSessions` ≤300, `listAttendanceSummariesBySessionIds` theo chunk 30, `listAssignmentSummaries` ≤300) — không thêm read pattern mới, nhưng Tổng quan giờ gọi thêm `listSessions`/`listAttendanceSummariesBySessionIds`/`listInvoices` mỗi lần vào trang; nếu trang Tổng quan được mở rất nhiều lần/ngày, nên theo dõi read quota.
- `StudentDoc` chưa có field liên hệ phụ huynh trực tiếp — không đổi so với trước.
- Notification cho Staff vẫn chưa có: nếu sau này cần, phải thêm field người nhận (vd `teacherIds`) vào các loại announcement liên quan trước, không nên đoán trong `Topbar.tsx`.
- Rủi ro tài liệu chồng chéo: đã tránh bằng cách cập nhật trực tiếp file này thay vì tạo file mới.

#### 6. Ghi chú vận hành — lỗi cache khi ghi file

Trong suốt quá trình Phase 1-6, công cụ ghi file nhiều lần báo "thành công" nhưng `npm run typecheck` báo lỗi cú pháp (thiếu thẻ đóng) ở đúng file vừa sửa — kể cả với các sửa nhỏ 1-2 dòng (vd `attendance.ts`, `assignments.ts`, `sessions.ts`, `Sidebar.tsx`). Xác minh bằng cách đọc trực tiếp file (qua công cụ đọc file, không qua terminal) thì nội dung luôn đúng — nguyên nhân là lớp cache trung gian phục vụ terminal giữ bản cũ/cắt cụt một thời gian sau khi ghi, không phân biệt file lớn hay nhỏ. Cách xử lý nhất quán: đọc lại bằng công cụ đọc file để xác nhận nội dung thật đúng, sau đó ghi lại trực tiếp qua terminal (Python, UTF-8, newline `\n`) để đồng bộ cache, rồi mới chạy lệnh kiểm tra. Áp dụng cách này cho mọi file trong Phase 3-6 và không còn gặp lỗi giả sau khi đồng bộ.

---

## 5. 15/07/2026 — Kế hoạch nâng cấp Spark/client-side và Messenger

_Nguồn gốc: `KE-HOACH-NANG-CAP-SPARK-CLIENT-MESSENGER-15-07-2026.md` — file gốc đã chuyển vào `docs/archive/`._

### Kế hoạch nâng cấp Spark/client-side và phương án Messenger ngoài

Ngày cập nhật: 15/07/2026

Trạng thái hiện tại (cập nhật 18/07/2026 sau khi rà lại P1-P5): P1 đạt mục tiêu (có `h1` thật trên mỗi trang, lint/typecheck sạch) nhưng mô tả kỹ thuật cũ trong bảng lộ trình từng ghi sai component - đã sửa lại bên dưới; `npm test`/`npm run build`/`npm run test:rules` chưa xác nhận được trong sandbox (thiếu binary Rollup native và JDK 21+), cần chạy trên máy thật. P2 đạt phần lớn, còn một khoảng lệch nhỏ ở Staff dashboard - xem ghi chú trong bảng lộ trình. P3 đạt 85%: Worker production config đã local-ready, `ALLOWED_ORIGIN` production là `https://edumatrix-vn-576b1.web.app`, script `build:prod`/`deploy:prod` bắt buộc `--env production`; còn chờ phê duyệt Cloudflare dry-run/deploy vì thao tác đó gửi bundle/config ra bên ngoài. P4 đạt 45%: Worker/client đã hỗ trợ payload `MESSAGE_TAG` qua trường `tag`, nhưng Meta App Live, App Review, webhook production và gửi thử thật vẫn phải làm ngoài local. P5 đạt ~95% phạm vi local-ready: đã bổ sung nút "Nhắn mới" + chọn học sinh để bắt đầu hội thoại mới (không cần thread có sẵn), ô chọn tag RESPONSE/MESSAGE_TAG khi gửi, chỉ báo đang gửi/gửi thành công, lỗi thô từ Worker được dịch sang thông báo thân thiện, và cột Loại gửi trong Nhật ký gửi. P6 hoàn thành local-ready: fallback không API qua nút copy link mời liên kết (`m.me/<page>?ref=<uid>`) khi gửi báo `no_recipient`, và banner mở Trang Facebook khi Worker chưa cấu hình - chỉ còn thiếu Lợi điền `VITE_MESSENGER_PAGE_USERNAME` thật. P7 đã đối chiếu xong phần xác minh được từ code (checklist Go-live mục 8 và `messenger-api-setup.md` mục 12) - phần còn lại (App Review, deploy production thật, gửi thử tin thật) chỉ Lợi tự làm được từ máy có quyền truy cập Meta/Cloudflare.

Roadmap/diagram động để kiểm tra tiến trình: [roadmap-spark-client-messenger-diagram-15-07-2026.html](./roadmap-spark-client-messenger-diagram-15-07-2026.html)

#### 1. Kết luận điều kiện tiên quyết

| Điều kiện | Quyết định áp dụng |
|---|---|
| Firebase Spark plan | Core app chỉ dùng Firebase Hosting, Authentication, Firestore, App Check và Firestore Security Rules. |
| Code client-side | Luồng nghiệp vụ chính chạy trong React/Vite qua Firebase Web SDK. Không dùng Cloud Functions, Cloud Run, App Hosting backend, server secret hoặc Admin SDK trong core app. |
| Facebook Messenger | Không thể gọi trực tiếp từ browser một cách an toàn vì Meta Page Access Token/App Secret sẽ bị lộ. Messenger phải là nhánh tích hợp ngoài core Spark. |
| Kênh thông báo chính | `announcements` trong Firestore là kênh chính. Messenger chỉ là kênh bổ sung, có thể tắt mà không làm hỏng webapp. |

#### 2. Phương án kết nối Facebook/Messenger API

| Phương án | Mô tả | Phù hợp Spark/client-side? | Ưu điểm | Rủi ro/điều kiện | Khuyến nghị |
|---|---|---:|---|---|---|
| A. Cloudflare Worker ngoài Firebase | Frontend gửi Firebase ID token tới Worker; Worker giữ Meta token trong secret, kiểm tra quyền Staff, gọi Meta Graph API và ghi log. | Có điều kiện: core app vẫn Spark/client-side, Messenger là external integration. | Chi phí thấp, không cần Firebase Blaze, token không nằm trong browser, repo đã có `workers/messenger`. | Cần Cloudflare account, secret riêng, App Review của Meta, vận hành thêm một deployment ngoài Firebase. | Nên dùng nếu cần gửi Messenger tự động. |
| B. Vercel/Netlify Function ngoài Firebase | Tương tự Worker nhưng deploy bằng Vercel/Netlify serverless. | Có điều kiện. | Dễ triển khai nếu đã dùng nền tảng đó. | Có cold start, quota/chi phí riêng, vẫn là backend ngoài. | Phương án dự phòng, không ưu tiên khi đã có Worker. |
| C. VPS/server nhỏ | Tự chạy API proxy Messenger trên server riêng. | Có điều kiện. | Toàn quyền kiểm soát. | Tốn vận hành, bảo mật, SSL, update, monitoring. | Không nên cho quy mô nhỏ. |
| D. Không dùng API, chỉ mở link `m.me` | App hiển thị link Messenger/Page để Staff nhắn thủ công. | Có, thuần client-side. | Không cần token, không cần backend, an toàn nhất. | Không tự động gửi, không có log gửi tự động, phụ thuộc thao tác thủ công. | Dùng làm fallback hoặc MVP nếu muốn giữ 100% client-side. |
| E. Firebase Cloud Functions | Dùng function giữ Meta token và gọi Graph API. | Không phù hợp Spark. | Tích hợp Firebase tốt. | Cloud Functions không thuộc Spark theo bảng giá Firebase; cần Blaze. | Chỉ dùng nếu chấp nhận chuyển Blaze. |

#### 3. Kiến trúc khuyến nghị

```text
Core Spark/client-side
React/Vite frontend
  -> Firebase Auth
  -> Firestore Client SDK
  -> Firestore Security Rules
  -> Firebase Hosting

Messenger ngoài Firebase
React/Vite frontend
  -> Firebase ID token
  -> Cloudflare Worker
       -> verify Firebase ID token
       -> kiểm tra users/{uid}.role/status
       -> giữ Meta Page Access Token trong Worker Secret
       -> gọi Meta Graph API /me/messages
       -> ghi message_outbox
```

Nguyên tắc: Nếu Worker lỗi, hết quota, sai CORS hoặc Meta từ chối quyền, webapp vẫn phải chạy bình thường; chỉ chức năng gửi Messenger bị disabled hoặc báo lỗi cục bộ.

#### 4. Ranh giới bảo mật

| Ranh giới | Bắt buộc |
|---|---|
| Browser | Chỉ có Firebase public config và `VITE_MESSENGER_WORKER_URL`; không có Page Access Token, App Secret, service account JSON hoặc private key. |
| Worker | Giữ Meta token và Firebase service credentials bằng secret; không log secret; chỉ nhận request có Firebase ID token hợp lệ. |
| Firestore Rules | Vẫn là lớp bảo mật chính cho core app. Không dùng UI guard thay Rules. |
| Messenger recipient | Chỉ gửi tới PSID đã liên kết qua webhook/referral hoặc qua dữ liệu đã được xác thực. |
| Audit | Mỗi lần gửi cần ghi `message_outbox` với actor, loại tin, trạng thái, thời điểm và lỗi rút gọn nếu thất bại. |

#### 5. Lộ trình cập nhật kế hoạch

| Giai đoạn | Việc cần làm | Tiêu chí hoàn thành |
|---|---|---|
| P0 | Chốt core app không phụ thuộc Messenger. Ẩn hoặc disable Messenger nếu thiếu `VITE_MESSENGER_WORKER_URL`. | Deploy Spark vẫn dùng được toàn bộ quản lý lớp, học phí, thông báo nội bộ khi không có Worker. |
| P1 | Hoàn tất blocker production: có `h1` thật trên mỗi trang (thực tế render qua `Topbar.tsx`, không phải `PageHeader` như mô tả cũ - `PageHeader` không render `h1`, các prop `title`/`description`/`eyebrow` của nó khai báo nhưng không dùng; mục tiêu accessibility vẫn đạt, chỉ là mô tả kỹ thuật cũ sai), lint sạch, rules tests pass. | `npm run lint`, `npm run typecheck` pass (đã xác nhận trong sandbox 18/07); `npm test`, `npm run build`, `npm run test:rules` cần chạy trên máy thật (sandbox thiếu binary Rollup native và JDK 21+). |
| P2 | Hoàn tất tối ưu Spark quota/bundle: giảm đọc preview, giữ pagination/limit, tách Firestore khỏi đường tải ban đầu. | Auth/login không preload Firestore; Viewer dashboard preview dùng limit nhỏ hơn trang danh sách đầy đủ; build pass; full Firestore là async chunk có ngân sách 650 kB để giữ cache/realtime. **Ghi chú rà lại 18/07:** Staff dashboard (`staffDashboard.ts`) hiện dùng lại nguyên `listClasses()`/`listSessions()` với cùng limit (200/300) như trang danh sách đầy đủ, chưa có limit preview riêng nhỏ hơn như Viewer dashboard - lệch nhẹ so với tiêu chí, chưa sửa vì ngoài phạm vi P5. |
| P3 | Hoàn thiện Worker production config. | Local-ready: `check:prod-config`, Worker typecheck và Worker tests pass; `npm run build:prod`/`deploy:prod` dùng `--env production`. Còn cần Cloudflare dry-run/deploy được phê duyệt. |
| P4 | Hoàn thiện Meta setup. | Local-prep: Worker/client hỗ trợ `tag` cho `MESSAGE_TAG`, test payload pass. Còn cần Meta App Live, Page connected, webhook verified, quyền `pages_messaging` được duyệt nếu gửi cho người dùng thật. |
| P5 | Bổ sung UI trạng thái Messenger. | **Local-ready, cập nhật 18/07:** Staff thấy rõ Worker chưa cấu hình; có nút "Nhắn mới" trong tab Hội thoại mở picker chọn học sinh (tìm kiếm theo tên/mã, tự scope theo teacher/admin qua `listStudents()`) để bắt đầu hoặc tiếp tục hội thoại mà không cần thread có sẵn - `handleSend` phía Worker đã tự resolve PSID và tạo `chat_threads` từ `studentId`, không cần sửa Worker/Rules; sau khi gửi lần đầu thành công, danh sách hội thoại tự làm mới và tự chọn hội thoại vừa tạo. Có ô nhập tag tùy chọn (RESPONSE mặc định / MESSAGE_TAG khi nhập tag) ở cả hội thoại có sẵn lẫn hội thoại mới, kiểm tra định dạng `A-Z`/`_` phía client trước khi gửi. Có chỉ báo "Đang gửi..." và "Đã gửi thành công." Lỗi thô từ Worker (`no_recipient`, `invalid_message_tag`, `student_scope_denied`, `staff_required`, `missing_bearer_token`, `meta_...`) được dịch sang thông báo tiếng Việt qua `friendlyMessengerError()` thay vì hiện mã lỗi thô. Nhật ký gửi có thêm cột Loại gửi (RESPONSE/TAG · tên tag). Còn thiếu duy nhất: smoke test với Worker production thật, và xác minh tag cụ thể có được Meta App Review chấp nhận hay không (phụ thuộc P4). |
| P6 | Thêm fallback liên kết an toàn. | **Local-ready, cập nhật 19/07:** Staff yêu cầu Worker tạo nonce ngẫu nhiên dùng một lần, hạn 24 giờ; link `m.me/<page>?ref=<nonce>` không lộ Firebase UID. Webhook dùng atomic commit, từ chối nonce hết hạn/đã dùng và không ghi đè PSID đã liên kết tài khoản khác. Firestore Rules cấm mọi client truy cập nonce và reverse-index. Còn cần điền `VITE_MESSENGER_PAGE_USERNAME` thật khi có Page để tính năng hiện ra. |
| P7 | Kiểm thử go-live. | **Đối chiếu 18/07:** đã rà lại toàn bộ checklist Go-live (mục 8 dưới đây, và `docs/messenger-api-setup.md` mục 12) từng dòng với code/config thật, tick các mục xác minh được từ sandbox kèm bằng chứng cụ thể. Phần còn lại - App Meta chuyển Live/App Review, deploy Worker production thật, gửi thử 1 tin thật + kiểm tra `message_outbox` - đều cần thao tác trên Cloudflare/Meta dashboard thật, chỉ Lợi tự làm được từ máy có quyền truy cập. |

##### Chính sách P2 quota/bundle

- Giữ full Firestore SDK cho phần cần offline persistence/cache và realtime profile `users/{uid}`; không chuyển hàng loạt sang `firestore/lite` vì sẽ mất cache và có thể tăng read quota trên Spark.
- Firestore không được nằm trong preload ban đầu của login/auth. Build phải cho thấy `dist/index.html` không preload `firebase-firestore`.
- Query preview/dashboard phải có limit nhỏ hơn query trang chi tiết. Trang danh sách lớn phải dùng pagination hoặc page size cố định.
- Realtime listener chỉ dùng cho dữ liệu cần cập nhật tức thì; không dùng listener rộng trên collection lớn.
- Async chunk `firebase-firestore` có ngân sách 650 kB trong Vite. Nếu vượt ngân sách này thì quay lại tách route/query hoặc đánh giá lại `firestore/lite` theo từng module.

#### 6. Điều kiện Meta cần chuẩn bị

| Hạng mục | Ghi chú |
|---|---|
| Meta Developer App | Cần app liên kết với Facebook Page của trung tâm. |
| Page Access Token | Phải nằm trong secret của Worker, không nằm trong frontend. Nên dùng cơ chế token dài hạn/System User nếu đủ điều kiện Business. |
| App Secret | Chỉ dùng trong Worker để xác thực webhook signature. |
| Webhook | Dùng để nhận referral/linking event và lưu PSID vào `messenger_connections/{uid}`. |
| App Review | Gửi tin thật qua Page thường cần quyền phù hợp như `pages_messaging`; post bài cần quyền quản lý post/page tương ứng. |
| Chính sách nhắn tin | Tin Messenger chịu giới hạn chính sách Meta, ví dụ cửa sổ phản hồi tiêu chuẩn và tag hợp lệ cho một số loại tin. |

##### Chính sách P4 Messenger tag

- Mặc định Worker vẫn gửi `messaging_type: "RESPONSE"` để không đổi hành vi hiện tại.
- Khi frontend truyền `tag`, Worker gửi `messaging_type: "MESSAGE_TAG"` và thêm `tag` vào payload Meta; đồng thời ghi `messageTag` vào `message_outbox` để audit.
- Worker chỉ kiểm tra định dạng tag ở mức local (`A-Z` và `_`). Việc tag có được dùng cho nội dung cụ thể hay không phụ thuộc chính sách Meta/App Review và phải xác minh khi smoke test thật.
- Không đưa Page Access Token, App Secret hoặc service account vào browser; Messenger API tự động tiếp tục là nhánh ngoài Firebase Spark.

#### 7. Quyết định triển khai

| Câu hỏi | Quyết định |
|---|---|
| Có phương án kết nối Facebook API để chạy Messenger ngoài không? | Có. Phương án nên dùng là Cloudflare Worker ngoài Firebase. |
| Có giữ được Firebase Spark không? | Có, nếu coi Messenger là nhánh ngoài Firebase và core app không phụ thuộc Worker. |
| Có giữ được code client-side không? | Có cho core app. Không thể giữ 100% client-side cho Messenger API tự động vì cần bảo vệ secret. |
| Nếu muốn 100% client-side thì làm sao? | Chỉ dùng link `m.me`/copy nội dung để Staff gửi thủ công, không gọi Meta API từ app. |

#### 8. Go/No-Go checklist

**Ghi chú rà lại 18/07/2026:** các mục dưới đây đã được đối chiếu trực tiếp với code/config trong repo (không phải suy đoán). Mục nào chỉ xác nhận được bằng thao tác thật trên Cloudflare/Meta dashboard (deploy, App Review, gửi thử) thì giữ nguyên chưa tick - chỉ Lợi tự làm được từ máy thật.

- [x] Core app chạy được khi `VITE_MESSENGER_WORKER_URL` rỗng. (`configured` trong `ChatPage.tsx` gate toàn bộ UI Messenger; `.env`/`.env.local` hiện để trống và app chạy bình thường suốt các lần build/typecheck trong sandbox)
- [x] Không có token Meta hoặc service account trong source, bundle, `.env` commit. (`.env`/`.env.example` chỉ chứa Firebase public config; `.gitignore` chặn `.env`, `.env.local`, `.dev.vars*`; secret Worker chỉ đặt qua `wrangler secret put`, không xuất hiện trong repo)
- [ ] Worker production dùng đúng `--env production`. (local-ready: `workers/messenger/package.json` bắt buộc `--env production` trong cả `build:prod` và `deploy:prod` - script đã enforce sẵn; còn cần Lợi tự deploy thật để xác nhận)
- [x] `ALLOWED_ORIGIN` là Firebase Hosting production domain.
- [x] Firestore Rules cấm client ghi `messenger_connections`. (`firebase/firestore.rules` - `match /messenger_connections/{uid}` có `allow write: if false`)
- [x] Staff gửi tin phải qua Firebase ID token. (`sendMessenger`/`postToPage` trong `client.ts` luôn gắn `Authorization: Bearer <idToken>`; Worker `requireStaff()` xác thực token trước khi xử lý)
- [x] Viewer không có UI gửi tin từ Page. (`app/router.tsx` - `ROUTES.STAFF_CHAT` chỉ role admin/teacher; không route Viewer nào trỏ tới ChatPage/Composer/PostQueueList)
- [x] UI Staff disable gửi Fanpage/Messenger khi thiếu `VITE_MESSENGER_WORKER_URL`.
- [x] UI Staff hiển thị trạng thái Messenger trước/sau khi gửi.
- [x] Có fallback link `m.me` khi Worker chưa cấu hình. (mới hoàn thành 18/07 - P6: nút copy link mời phụ huynh liên kết khi gửi báo `no_recipient`, banner mở Trang Facebook khi Worker chưa cấu hình; cần biến `VITE_MESSENGER_PAGE_USERNAME` - hiện để trống, Lợi tự điền khi có Page thật, tính năng tự ẩn nếu chưa điền)
- [x] Worker/client hỗ trợ `tag` cho luồng Messenger ngoài cửa sổ phản hồi.
- [x] Có log thành công/thất bại trong `message_outbox`. (Worker `handleSend`/`handlePost` luôn ghi `message_outbox` với `status: sent|failed`, kể cả khi Meta từ chối)
- [x] Có hướng dẫn tắt Messenger mà không rollback toàn app. (`docs/messenger-api-setup.md` mục 6: để trống `VITE_MESSENGER_WORKER_URL` thì app vẫn chạy, chỉ Messenger tạm tắt)

---

## 6. 15/07/2026 — Kế hoạch tối ưu Timetable không cần scroll

_Nguồn gốc: `KE-HOACH-TOI-UU-TIMETABLE-KHONG-SCROLL-15-07-2026.md` — file gốc đã chuyển vào `docs/archive/`._

### Ke hoach toi uu Nhánh 1 - Timetable khong can scroll-down

Ngay lap: 15/07/2026

Pham vi: Nhánh 1 - Timetable trong module Lich hoc, route Staff `/app/sessions`. Demo tinh: `docs/edumatrix-timetable-noscroll-demo-15-07-2026.html`.

#### 1. Ket luan kha thi

Co the toi uu timetable de nhin du thong tin lop hoc ma khong can scroll-down, nhung khong nen giu nguyen time-grid 06:00-23:00 voi 17 hang cao 56px. Thiet ke hien tai tao chieu cao 952px, vuot vung nhin thong dung, nen bat buoc phai cuon noi bo.

Phuong an phu hop hon la them che do **Fit week** cho Nhánh 1:

- Van giu lich theo 7 ngay trong tuan.
- Bo truc gio dai 06:00-23:00 dang hang doc co dinh.
- Chia moi ngay thanh 3 khung: Sang, Chieu, Toi.
- Moi buoi hoc la mot card compact hien du thong tin can xem nhanh: lop, khoa/mon, gio, giao vien, phong, si so, trang thai.
- Buoi trung gio hien canh nhau trong cung khung, khong de len nhau.
- Khi can do chinh xac theo phut, van giu mode Time-grid hien tai nhu che do "Chinh xac".

#### 2. Ly do khong nen chi ep chieu cao time-grid

Neu ep 17 gio vao mot man hinh 720px, moi gio chi con khoang 42px. Mot buoi 60-90 phut chi co 40-63px, khong du de hien day du ten lop, giao vien, phong, mon hoc, trang thai va ghi chu ma van doc tot.

Neu tiep tuc nhoi tat ca vao block time-grid, UI se gap 3 loi:

- Chu bi cat hoac phai giam font qua nho.
- Cac buoi trung gio nhanh chong mat kha nang doc.
- Mobile gan nhu khong kha thi neu khong doi model hien thi.

#### 3. Phuong an de xuat

##### Mode mac dinh: Fit week

Dung cho man hinh quan tri hang ngay. Muc tieu la tra loi nhanh: hom nay co lop nao, gio nao, ai day, phong nao, trang thai nao.

Thanh phan:

- Header gon: dieu huong tuan, nut Hom nay, toggle Fit week / Time-grid / Thang.
- KPI mini mot dong: lop hom nay, lop dang hoat dong, lop moi sap toi.
- Bang 7 cot ngay.
- Moi cot ngay co 3 band: Sang, Chieu, Toi.
- Card lop hoc hien du thong tin trong 4 dong ngan:
  - Ten lop va trang thai.
  - Khoa hoc / mon hoc.
  - Gio hoc va giao vien.
  - Phong va si so.

##### Mode phu: Time-grid chinh xac

Giu lai grid 06:00-23:00 hien tai cho truong hop can xem vi tri thoi gian theo phut. Mode nay co the van can scroll noi bo, vi do la ban chat cua truc gio dai.

##### Mode Thang

Giu month grid hien tai: dem so buoi theo ngay, bam vao ngay de vao Fit day hoac Time-grid day.

#### 4. Dieu kien ap dung

Phuong an Fit week khong scroll hoat dong tot khi mat do lich moi ngay nam trong nguong van hanh thong thuong:

- 1-5 buoi moi ngay: hien du trong cot ngay.
- 6-8 buoi moi ngay: van hien du nhung can card compact hon.
- Tren 8 buoi moi ngay: can co canh bao "qua tai ngay" hoac chuyen rieng ngay do sang Fit day, vi bat ky UI khong scroll nao cung se phai danh doi kich thuoc chu hoac cat bot thong tin.

Voi trung tam lop hoc quy mo pilot/MVP, Fit week nen la mode mac dinh. Time-grid chi dung khi can do chinh xac lich theo truc gio.

#### 5. Ke hoach trien khai vao code React

1. Tao component moi `FitWeekTimetable.tsx` trong `src/features/sessions/components/`.
2. Reuse data da co trong `SessionsPage.tsx`: `listSessions()`, `listClasses()`, `TimetableSession`.
3. Them type view moi: `"fit-week"` hoac doi label view `"week"` thanh 2 bien the: `fit` va `grid`.
4. Tach helper nhom buoi hoc theo ngay va khung gio vao `timetableLayout.ts`.
5. Card click van mo `SessionDetailModal`, khong doi service `updateSession()`.
6. Them test unit cho helper nhom band/trung gio neu du an da co test cho utils.
7. Chi sau khi duyet demo moi thay doi code that.

#### 6. Tieu chi duyet demo

- Khong co scroll-down noi bo trong khu timetable o desktop 1280x720 tro len.
- Moi card lop hoc hien du: lop, mon/khoa, gio, giao vien, phong, si so, trang thai.
- Ngay co 2 buoi trung gio van doc duoc, khong de len nhau.
- Fit week khong lam mat mode Time-grid chinh xac hien tai.
- Mau sac, spacing, radius nhat quan voi `DESIGN-SYSTEM-v2.md` va cac demo UI da co.

---

## 7. 16/07/2026 — Kế hoạch hợp nhất Module Bài tập và Điểm học tập

_Nguồn gốc: `KE-HOACH-GOP-BAI-TAP-DIEM-HOC-TAP-16-07-2026.md` — file gốc đã chuyển vào `docs/archive/`._

### Kế hoạch hợp nhất Module Bài tập và Điểm học tập

Ngày: 16/07/2026  
Trạng thái: Bản đề xuất chờ duyệt, chưa triển khai production  
Demo: `docs/edumatrix-ui-learning-assessment-demo-16-07-2026.html`

#### 1. Kết luận đề xuất

Hợp nhất hai mục điều hướng thành **Bài tập & Điểm**, dùng một workspace với ba tab:

1. **Tổng quan**: việc cần xử lý, tiến độ nộp/chấm, kết quả theo lớp.
2. **Bài tập**: tạo bài, theo dõi bài nộp, chấm và yêu cầu làm lại.
3. **Sổ điểm**: xem toàn bộ đánh giá, gồm điểm sinh từ bài tập và điểm nhập trực tiếp cho quiz/giữa kỳ/cuối kỳ.

Không xóa collection hoặc route cũ trong lần đầu. Frontend hợp nhất trước, dữ liệu được nối bằng khóa tham chiếu rõ ràng và có lộ trình tương thích ngược.

#### 2. Giả định và tiêu chí thành công

##### Giả định

- Firebase tiếp tục ở Spark Plan, toàn bộ nghiệp vụ chạy từ client và Firestore Rules là lớp bảo vệ bắt buộc.
- `assignments`, `submissions`, `scores`, `student_summaries` đã có dữ liệu production nên không đổi tên collection.
- Bài tập có thể chấm điểm. Quiz/giữa kỳ/cuối kỳ vẫn có thể nhập điểm trực tiếp, không cần tạo bài nộp giả.
- Admin và Teacher chỉ thao tác trên lớp do mình quản lý. Viewer chỉ đọc dữ liệu của học sinh được liên kết.

##### Tiêu chí thành công

- Một điểm từ bài tập chỉ xuất hiện đúng một lần trong `scores`.
- Chấm lại bài cập nhật đúng bản ghi điểm cũ và đúng `student_summaries`, không tăng `scoreCount` lần hai.
- Không có trạng thái `submission.score` khác `score.score` sau khi thao tác đồng bộ thành công.
- Route cũ `/app/assignments` và `/app/scores` vẫn mở được trong giai đoạn chuyển tiếp.
- Rules từ chối điểm ngoài khoảng, sửa danh tính, sửa lớp, hoặc ghi dữ liệu ngoài phạm vi giáo viên.
- UI có loading, empty, error, success; dùng được ở 360px và bàn phím.

#### 3. Audit hiện trạng

| Lớp | Hiện trạng | Khoảng trống |
|---|---|---|
| Điều hướng | Hai mục Bài tập và Điểm học tập | Người dùng phải đổi ngữ cảnh dù cùng một chu trình đánh giá |
| Bài tập | `assignments` -> `submissions` -> `assignment_summaries` | Chấm bài chưa tạo/cập nhật `scores` |
| Điểm | `scores` -> `student_summaries` | Không biết điểm nào đến từ assignment/submission |
| Tổng hợp | Hai summary độc lập | Có thể lệch số liệu giữa tiến độ chấm và kết quả học tập |
| Rules | Đã giới hạn lớp, khoảng điểm và immutable fields cơ bản | Chưa validate liên kết assignment/submission/score và chưa khóa `source` |
| Client | `gradeSubmission()` và `saveClassScores()` là hai transaction riêng | Không có atomic write xuyên suốt chuỗi chấm bài -> sổ điểm |

Rủi ro chính: chỉ gộp giao diện sẽ che đi sự phân đôi dữ liệu, không giải quyết tính nhất quán.

#### 4. Mô hình dữ liệu tối thiểu

Giữ nguyên collection. Bổ sung field tùy chọn cho `scores`:

```ts
type ScoreSource = "manual" | "assignment";

interface ScoreDoc {
  // field hiện có giữ nguyên
  source: ScoreSource;
  assignmentId: string | null;
  submissionId: string | null;
}
```

Quy ước ID:

- Điểm bài tập: `scoreId = stableDocumentId(["assignment", assignmentId, studentId])`.
- Điểm nhập tay: giữ quy ước hiện có để tránh migration không cần thiết.
- `assessmentType = "assignment"` bắt buộc có `source = "assignment"`, `assignmentId`, `submissionId`.
- Các loại còn lại bắt buộc `source = "manual"` và hai khóa tham chiếu là `null`.

Không sao chép title/maxScore từ nhiều nguồn trong logic hiển thị nếu đã có `assignmentId`. `scores` vẫn giữ snapshot hiện tại để báo cáo lịch sử không đổi khi tên bài được sửa.

#### 5. Chuỗi ghi dữ liệu đề xuất

##### Chấm bài có điểm

1. Client đọc submission, assignment và score hiện tại.
2. Validate `0 <= score <= assignment.maxScore`, submission thuộc assignment, assignment thuộc lớp được quản lý.
3. Một transaction cập nhật:
   - `submissions/{assignmentId_studentId}`
   - `assignment_summaries/{assignmentId}`
   - `scores/{stableId}`
   - `student_summaries/{studentId}`
4. Nếu chấm lại, trừ percent cũ rồi cộng percent mới; không tăng `scoreCount`.
5. Nếu chọn `redo_required`, không tạo điểm mới. Nếu trước đó đã công bố điểm, cần quyết định nghiệp vụ ở mục 10.

##### Nhập điểm trực tiếp

Giữ `saveClassScores`, nhưng bổ sung `source: "manual"`, `assignmentId: null`, `submissionId: null` và validate score hữu hạn, không âm, không vượt maxScore.

##### Vì sao dùng transaction client

Spark Plan không dùng Cloud Functions. Transaction là lựa chọn nhỏ nhất để giữ bốn document nhất quán. Giới hạn mỗi học sinh một transaction giống cơ chế hiện có, tránh vượt giới hạn write và dễ retry.

#### 6. Firestore Rules cần siết

- `assignments`: validate `maxScore > 0`, `dueAt`, `submissionType`, field allowlist và class scope.
- `submissions`: khi staff chấm, validate `score == null` hoặc nằm trong khoảng của assignment liên kết; khóa `checkedBy` theo `request.auth.uid`.
- `scores`: validate `maxScore > 0`, số hữu hạn theo khả năng rules, `source` enum và cặp khóa tham chiếu.
- Điểm nguồn assignment phải khớp `classId`, `studentId`, `maxScore` của assignment/submission liên quan.
- Khóa immutable thêm: `source`, `assignmentId`, `submissionId`.
- `student_summaries` và `assignment_summaries`: giữ staff-only write, kiểm tra số đếm không âm.
- Không cấp quyền rộng kiểu `isStaff()` cho dữ liệu theo lớp nếu đã có thể dùng `canManageClass()`.

Test Rules bắt buộc:

- Teacher lớp A không chấm hoặc ghi điểm lớp B.
- Viewer không tự ghi điểm, không sửa score/comment khi nộp lại.
- Điểm vượt max, maxScore bằng 0, source sai cặp field đều bị từ chối.
- ID submission không đúng `{assignmentId}_{studentId}` bị từ chối.
- Sửa `assignmentId`, `submissionId`, `studentId`, `classId`, `createdBy` bị từ chối.
- Chấm hợp lệ tạo score nguồn assignment thành công.

#### 7. Thiết kế frontend

Design read: product UI giáo dục, tin cậy, thao tác hằng ngày, giữ design system Edumatrix hiện có.  
Dial: `DESIGN_VARIANCE 4`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 6`.

- Một màu nhấn `primary-500 #3366F0`; màu success/warning/danger chỉ mang nghĩa trạng thái.
- Giữ Be Vietnam Pro, radius 8px cho control và 12px cho panel.
- Không thêm thư viện UI mới. Tái sử dụng component hiện có và `lucide-react` đã cài.
- Desktop: sidebar danh sách đánh giá bên trái, vùng xử lý bên phải. Mobile: danh sách chuyển thành select/filter và nội dung một cột.
- Form tạo bài chuyển vào modal/drawer để không chiếm toàn bộ đầu trang.
- Sổ điểm dùng bảng có sticky header, filter lớp/loại/trạng thái và nút lưu rõ phạm vi.
- Chấm nhanh hỗ trợ Tab/Enter, lưu từng dòng hoặc lưu nhóm, luôn hiển thị số thay đổi chưa lưu.

Trạng thái cần có:

- Loading skeleton đúng hình bảng/danh sách.
- Empty theo ngữ cảnh: chưa có bài, chưa có bài nộp, chưa có điểm.
- Error inline, giữ nguyên dữ liệu đã nhập.
- Success xác nhận phạm vi đã lưu.
- Conflict khi submission thay đổi từ thiết bị khác: refetch và yêu cầu xác nhận lại.

#### 8. Route và tương thích

- Route chuẩn mới đề xuất: `/app/learning`.
- `/app/assignments` redirect tới `/app/learning?tab=assignments`.
- `/app/scores` redirect tới `/app/learning?tab=gradebook`.
- Sidebar chỉ hiển thị một mục **Bài tập & Điểm** sau khi rollout.
- Viewer giữ `/portal/assignments` trong phase đầu; kết quả điểm có thể bổ sung dưới chi tiết bài sau khi staff flow ổn định.

#### 9. Kế hoạch triển khai sau khi duyệt

1. **Khóa hợp đồng dữ liệu**  
   Verify: type, ID, state transition và quyết định redo được duyệt.
2. **Viết Rules tests trước**  
   Verify: test mới fail với rules hiện tại, bao phủ scope và immutable fields.
3. **Bổ sung rules và transaction đồng bộ**  
   Verify: Rules tests, unit tests idempotency và test chấm lại đều pass.
4. **Dựng `LearningPage` bằng component hiện có**  
   Verify: typecheck, build, keyboard, responsive, loading/empty/error.
5. **Thêm redirect và đổi navigation**  
   Verify: deep link cũ và back/forward browser hoạt động.
6. **Đối soát dữ liệu cũ phía client theo trang**  
   Verify: báo cáo số submission đã graded nhưng chưa có score; chưa tự động sửa production nếu chưa duyệt.
7. **Rollout hai bước**  
   Verify: bật workspace mới cho staff, theo dõi lỗi; chỉ ẩn hai mục cũ sau khi đối soát đạt 100%.

#### 10. Điểm cần duyệt

1. Khi bài đã có điểm rồi chuyển sang **Cần làm lại**, điểm cũ sẽ:
   - Khuyến nghị: giữ trong sổ điểm nhưng đánh dấu chưa công bố cho đến lần chấm mới.
   - Phương án đơn giản hơn: xóa khỏi phép tính trung bình ngay khi yêu cầu làm lại.
2. Có cho phép bài tập **không tính điểm** không? Nếu có, cần `gradingMode: "scored" | "feedback_only"` trên assignment.
3. Tên module cuối cùng: **Bài tập & Điểm** (khuyến nghị) hay **Đánh giá học tập**.

#### 11. Ngoài phạm vi bản demo

- Chưa sửa source production, Firestore Rules, navigation hoặc route.
- Chưa migration/backfill dữ liệu thật.
- Chưa thay đổi portal phụ huynh/học sinh.
- Chưa thêm Cloud Functions, Storage hoặc gói trả phí.


---

## 8. 17/07/2026 — Kế hoạch nâng cấp module Cài đặt và Firebase Spark

_Nguồn gốc: `KE-HOACH-DEMO-CAI-DAT-SPARK-17-07-2026.md` — file gốc đã chuyển vào `docs/archive/`._

### Kế hoạch nâng cấp module Cài đặt và theo dõi Firebase Spark

Ngày lập: 17/07/2026  
Phạm vi: Role Admin, bản demo để duyệt, chưa thay dữ liệu và Rules production.

#### 1. Kết luận kiểm kê

- Module Cài đặt hiện có 4 tab: thông tin trường, vai trò và phân quyền, thông báo, giao diện.
- `settings/{docId}` hiện chỉ cho Admin đọc và ghi. Đây là mặc định an toàn nhưng chưa có schema riêng cho tích hợp và thanh toán.
- Ma trận phân quyền hiện chỉ để xem, phản ánh 3 role cố định trong Rules. Chưa có custom role và không được phép tạo cảm giác rằng giao diện có thể sửa Rules động.
- Module Người dùng hiện đã có Tổng quan, Staff, Phụ huynh/Học sinh. Nhánh Vai trò và phân quyền phù hợp hơn khi đặt tại đây.
- Thông tin QR đang được sao chép vào từng hóa đơn. Đây là dữ liệu công khai theo nghiệp vụ, khác với token API hoặc OAuth secret.

#### 2. Kiến trúc thông tin đề xuất

##### Module Người dùng

1. Tổng quan
2. Tài khoản Staff
3. Phụ huynh/Học sinh
4. Vai trò và phân quyền

Nhánh phân quyền chỉ hiển thị ma trận role hệ thống và phạm vi dữ liệu. Nếu cần custom role, phải có pha thiết kế Rules riêng, không dùng cấu hình Firestore để vượt qua Rules đã deploy.

##### Module Cài đặt, Role Admin

1. Tổng quan hệ thống
   - Tình trạng Firebase Spark
   - Ước tính lượt đọc, ghi, xóa trong ứng dụng
   - Biểu đồ 7 ngày
   - Collection phát sinh nhiều thao tác
   - Cảnh báo ngưỡng
2. Hồ sơ trường học
3. Kết nối và API
   - Facebook Page
   - Google Drive
   - API công khai và webhook
4. Thanh toán và QR
5. Thông báo
6. Giao diện

#### 3. Nguyên tắc thiết kế

- Chế độ: redesign-preserve, giữ cobalt Edumatrix, neutral ấm và font Be Vietnam Pro.
- DESIGN_VARIANCE: 5/10. Lưới lệch nhẹ, phần theo dõi Spark rộng hơn phần cảnh báo.
- MOTION_INTENSITY: 3/10. Chỉ hover, focus và chuyển tab ngắn; tôn trọng reduced motion.
- VISUAL_DENSITY: 7/10. Nhiều dữ liệu nhưng giữ khoảng thở, số dùng tabular numerals.
- Một hệ bán kính: input 8px, card 12px, modal 16px.
- Không dùng gradient trong bảng hoặc nền nội dung. Cobalt chỉ làm accent, trạng thái dùng màu ngữ nghĩa.
- Desktop dùng điều hướng dọc trong module; mobile chuyển thành thanh tab ngang.

#### 4. Mô hình theo dõi Spark khả thi

##### Số liệu chính thức

Theo tài liệu Firebase cập nhật tháng 07/2026, quota Firestore miễn phí gồm 50.000 document reads/ngày, 20.000 writes/ngày, 20.000 deletes/ngày, 1 GiB lưu trữ và 10 GiB outbound/tháng. Quota ngày reset khoảng nửa đêm theo giờ Pacific.

Firebase và Google Cloud Console có usage dashboard. Số liệu được lấy mẫu mỗi phút và có thể mất tới 4 phút để hiển thị. Dashboard cũng chỉ là ước tính và có thể khác số billed.

##### Giới hạn client-side

Web SDK không có API an toàn để đọc tổng usage của project. Cloud Monitoring yêu cầu quyền IAM `monitoring.timeSeries.list`; không được nhúng access token hoặc service-account key vào frontend.

Vì vậy production có hai cấp:

- Cấp Spark client-only: đo thao tác do Edumatrix chủ động thực hiện qua một lớp `instrumentedFirestore`, lưu rollup theo ngày. Số liệu phải ghi nhãn “Ước tính trong ứng dụng”. Không đếm được Firebase Console, client cũ, index reads và một số thao tác nội bộ.
- Cấp đối soát: nút mở Firebase Console Usage. Đây là nguồn kiểm tra chính thức khả dụng trong điều kiện không có backend tin cậy.

Không quét toàn bộ collection để đếm document. Cách đó tự tạo thêm reads và đi ngược mục tiêu tiết kiệm Spark.

##### Chuỗi tính toán đề xuất

```text
Firestore service wrapper
  -> ghi nhận read/write/delete dự kiến trong bộ nhớ
  -> gộp theo uid + ngày + collection
  -> flush theo nhịp giới hạn
  -> usage_events/{uid_date_collection}
  -> Admin đọc tối đa 7 hoặc 30 ngày
  -> tổng hợp tại client bằng hàm thuần
  -> cảnh báo 60%, 80%, 95% quota
```

Rollup không cấp quyền và không được dùng cho billing. Client chỉ ghi document mang `uid` của chính mình; Admin được đọc. Mỗi update chỉ được tăng trong biên nhỏ để hạn chế làm sai số liệu.

#### 5. Dữ liệu Cài đặt và Rules

| Document | Nội dung | Đọc | Ghi |
| --- | --- | --- | --- |
| `settings/general` | Hồ sơ trường | Admin | Admin |
| `settings/integrations_public` | Page ID, Drive folder ID, trạng thái kết nối | Admin | Admin |
| `settings/payment` | Bank BIN, số tài khoản, tên tài khoản, mẫu nội dung | Admin | Admin |
| `public_settings/payment` | Projection tối thiểu dùng khi tạo hóa đơn | Active user theo nghiệp vụ | Admin |
| `usage_events/{uid_date_collection}` | Rollup ước tính | Admin hoặc chính chủ | Chính chủ, tăng có giới hạn |

Không lưu trong Firestore client-readable:

- Facebook access token
- Google OAuth refresh token
- Service-account JSON
- API secret hoặc webhook signing secret

Nếu yêu cầu kết nối thật Facebook hoặc Drive, cần một secure broker ở hạ tầng ngoài client. Spark không cho phép deploy Cloud Functions mới. Bản client-only chỉ lưu định danh công khai, trạng thái và đường dẫn chia sẻ đã cấp quyền sẵn.

#### 6. Thanh toán và QR

- Dùng `qrcode.react` hiện có, không thêm dependency.
- Cấu hình ngân hàng chỉ Admin sửa.
- Khi tạo hóa đơn, snapshot bank BIN, số tài khoản, tên tài khoản và nội dung thanh toán vào invoice để lịch sử không đổi khi Admin cập nhật cấu hình.
- Không coi QR là xác nhận thanh toán. Luồng `payments` hiện tại vẫn cần Staff đối soát.

#### 7. Lộ trình triển khai sau khi duyệt

##### Cấu trúc giao diện

- Chuyển `RolesPermissionsTab` sang feature Người dùng.
- Tạo Settings shell mới và 6 nhánh như mục 2.
- Giữ route `/app/settings` và `/app/users`; chỉ thay nội dung sau duyệt.

##### Logic và Rules

- Định nghĩa schema Zod cho từng settings document.
- Tách public projection thanh toán khỏi cấu hình Admin.
- Tạo wrapper đo usage và hàm tổng hợp thuần có unit test.
- Bổ sung Rules cho `usage_events` và `public_settings/payment`.
- Thêm emulator tests: Admin, Teacher, Viewer, người chưa đăng nhập, tăng vượt biên, giả uid, thay khóa bất biến.

##### Kiểm thử chấp nhận

- Admin truy cập đủ 6 nhánh, Teacher không truy cập cấu hình Admin.
- Không có secret trong bundle, localStorage, Firestore hoặc log.
- Dashboard luôn ghi rõ nguồn dữ liệu và thời điểm cập nhật.
- Tính tỷ lệ quota không chia cho 0, clamp trong 0-100%, dùng timezone rõ ràng.
- Không quét collection để tạo dashboard.
- Typecheck, lint, unit test, Rules emulator test và build đều đạt.

#### 8. Phạm vi bản demo

- Route riêng `/app/settings-demo`, chỉ Admin truy cập.
- Dữ liệu minh họa không đọc hoặc ghi Firestore.
- Có đủ Tổng quan Spark, Kết nối/API, Thanh toán/QR và preview nhánh Vai trò và phân quyền trong Người dùng.
- Module production và Rules production giữ nguyên cho đến khi được duyệt.

#### 9. Nguồn chính thức

- https://firebase.google.com/docs/firestore/quotas
- https://firebase.google.com/docs/firestore/monitor-usage
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans


---

## 9. 17/07/2026 — Kế hoạch nâng cấp module Người dùng

_Nguồn gốc: `KE-HOACH-DEMO-MODULE-NGUOI-DUNG-17-07-2026.md` — file gốc đã chuyển vào `docs/archive/`._

### Kế hoạch nâng cấp module Người dùng cho Admin

Ngày lập: 17/07/2026

Trạng thái: Đã được duyệt và triển khai vào module `/app/users` ngày 17/07/2026.

#### 1. Mục tiêu và tiêu chí nghiệm thu

- Admin có ba vùng làm việc rõ ràng: Tổng quan, Tài khoản Staff, Phụ huynh/Học sinh.
- Tài khoản Staff hiển thị đúng thứ tự cột được yêu cầu và có thao tác chỉnh sửa.
- Phụ huynh/Học sinh tách thành Đang hoạt động và Được mời.
- Chi tiết phụ huynh hiển thị toàn bộ học sinh được liên kết.
- Dashboard có số tài khoản hoạt động, tỷ lệ chấp nhận lời mời, sức khỏe tài khoản và biểu đồ kết hợp cột + đường.
- Bảng có chiều cao khóa theo viewport, thanh cuộn nằm bên trong bảng.
- Chỉ Admin truy cập được route và dữ liệu quản trị.
- Tương thích Firebase Spark, không dùng Cloud Functions hoặc backend riêng.

#### 2. Kiến trúc giao diện đề xuất

##### Tổng quan

- Bốn KPI: tài khoản hoạt động, lời mời đã chấp nhận, sức khỏe tài khoản, tần suất sử dụng.
- Biểu đồ kết hợp: cột là số tài khoản hoạt động; đường là tỷ lệ người dùng hoạt động trong ngày.
- Khối sức khỏe chia thành hoạt động tốt, ít sử dụng và đã khóa.
- Hai danh sách ngắn: tài khoản mới; Admin và Giáo viên.

##### Tài khoản Staff

Thứ tự cột:

1. Mã tài khoản
2. Tên tài khoản
3. Email đăng nhập
4. Vai trò
5. Trạng thái
6. Đăng ký lần đầu
7. Bắt đầu sử dụng
8. Thao tác

##### Phụ huynh/Học sinh

- Nhánh Đang hoạt động: mã, tên, email, lần sử dụng cuối, thao tác.
- Xem thông tin mở chi tiết tài khoản và danh sách học sinh được gắn.
- Nhánh Được mời: email, vai trò, học sinh liên kết, thời gian gửi, trạng thái.

##### Form mời tài khoản

- Email đăng nhập và vai trò luôn bắt buộc.
- Trường chọn học sinh chỉ xuất hiện với vai trò Phụ huynh/Học sinh.
- Hiển thị bước kiểm tra an toàn trước khi gửi.
- Trạng thái loading, lỗi, thành công và trùng email phải được xử lý khi triển khai thật.

#### 3. Định nghĩa dữ liệu để tránh số liệu sai

- Tài khoản hoạt động realtime: user có `status = active`, cập nhật bằng listener giới hạn ở màn hình Tổng quan.
- Đã chấp nhận lời mời: invite có `status = claimed` chia cho tổng invite hợp lệ.
- Đăng ký lần đầu: `invites.createdAt`.
- Bắt đầu sử dụng: `users.createdAt`, được tạo khi claim lời mời thành công.
- Mã tài khoản: hiển thị mã ổn định từ 6 ký tự đầu của UID, không tạo bộ đếm tuần tự trên client.
- Sức khỏe tài khoản: quy tắc minh bạch từ trạng thái, lần đăng nhập cuối và độ đầy đủ hồ sơ. Không dùng điểm suy đoán không giải thích.
- Tần suất sử dụng: tỷ lệ tài khoản có hoạt động theo ngày. Không gọi là thời lượng nếu chưa có dữ liệu phút sử dụng.

#### 4. Bổ sung schema tối thiểu sau khi duyệt

##### `invites/{normalizedEmail}`

- Bổ sung type cho `claimedAt?: Timestamp`, dữ liệu thực tế đã được luồng claim ghi.

##### `account_activity/{uid_yyyyMMdd}`

- `uid`, `dateKey`, `lastSeenAt`, `activeMinutes`, `updatedAt`.
- Mỗi tài khoản chỉ ghi document của chính mình.
- Gộp theo ngày để giảm số lượt đọc và ghi trên Spark.
- `activeMinutes` chỉ là chỉ số tham khảo vì code client-side không thể chống giả mạo tuyệt đối.

Không tạo collection này nếu Admin chỉ cần tỷ lệ đăng nhập theo `lastLoginAt`. Đây là phương án đơn giản và tiết kiệm nhất.

#### 5. Kiểm tra Rules và chuỗi logic

Hiện trạng đúng:

- Router khóa `/app/users` cho role Admin.
- `users`: Admin đọc toàn bộ; người dùng chỉ đọc hồ sơ của chính mình.
- `invites`: Admin quản lý; người được mời chỉ đọc invite đúng email đã xác minh.
- Claim invite bắt buộc role, studentIds và email khớp invite.
- Người dùng không thể tự đổi role, studentIds hoặc status.
- Không cho xóa user document.

Cần bổ sung khi triển khai activity:

- Admin được đọc toàn bộ `account_activity`.
- User chỉ được create/update document có `uid` bằng `request.auth.uid`.
- Khóa `uid` và `dateKey` sau khi tạo; chỉ cho phép các field đã định nghĩa.
- Có Rules test cho truy cập chéo UID, field lạ và role Teacher/Viewer.

#### 6. Lộ trình triển khai sau duyệt

1. Chốt giao diện và tên chỉ số từ demo.
2. Tách component Dashboard, StaffTable, FamilyTable, InviteForm.
3. Nâng type cho `claimedAt`, bổ sung query có limit và phân trang.
4. Chỉ thêm `account_activity` nếu duyệt chỉ số theo ngày.
5. Viết Rules và test Rules trước khi nối UI.
6. Kết nối React Query, listener chỉ bật ở tab Tổng quan và hủy khi rời tab.
7. Kiểm thử loading, empty, error, quyền Admin và thao tác khóa tài khoản.
8. Thay `/app/users` sau khi bản demo được duyệt.

#### 7. Điểm cần duyệt

- Duyệt cấu trúc ba tab và hai nhánh Phụ huynh/Học sinh.
- Duyệt cách định nghĩa tần suất sử dụng theo ngày thay cho thời lượng phiên.
- Duyệt mã tài khoản rút gọn từ UID.
- Duyệt form mời và khối chi tiết học sinh liên kết.

---

## 10. 17/07/2026 — Kế hoạch khắc phục vấn đề từ Báo cáo Rà soát Mã nguồn

_Nguồn gốc: `KE-HOACH-SUA-LOI-REVIEW-TONG-THE-17-07-2026.md` — file gốc đã chuyển vào `docs/archive/`._

### Kế hoạch: Khắc phục các vấn đề từ Báo cáo Rà soát Mã nguồn (17/07/2026)

Ngày: 17/07/2026
Nguồn: `docs/BAO-CAO-REVIEW-TONG-THE-DU-AN-17-07-2026.html` (33 vấn đề: 11 mức Cao, 13 mức Trung bình, 9 mức Thấp)
Phạm vi: chỉ liệt kê và lên phương án sửa — **chưa có dòng code nào được thay đổi**. Đây là tài liệu để duyệt trước khi triển khai từng đợt.

#### 0. Nguyên tắc chung khi triển khai

- Sửa từng đợt một, chạy đủ `npm run typecheck && npm run lint && npm run test && npm run test:rules` sau mỗi đợt trước khi qua đợt tiếp theo.
- Đợt 1 và Đợt 2 nên làm trước tiên vì liên quan trực tiếp đến **tiền học phí**, **điểm số** và **rủi ro âm thầm** (lỗi xảy ra nhưng không ai biết).
- Đợt 3, Đợt 4 không gấp, có thể làm xen kẽ hoặc gộp vào các đợt nâng cấp module đang có sẵn.
- 4 mục được đánh dấu **[CẦN ADMIN QUYẾT ĐỊNH]** có ảnh hưởng đến nghiệp vụ, không tự ý chọn phương án khi triển khai.

---

#### Đợt 1 — Tài chính & Dữ liệu (ưu tiên cao nhất)

Lý do làm trước: đây là những chỗ nếu sai sẽ ảnh hưởng trực tiếp đến tiền học phí thật hoặc điểm số thật của học sinh, và lỗi hiện đang **âm thầm** — không có cảnh báo nào cho người dùng.

##### 1.1. Nhập điểm thủ công không giới hạn điểm

- **Vấn đề:** `saveClassScores` (`src/services/firestore/scores.ts`) chỉ kiểm tra `maxScore > 0`, không kiểm tra từng điểm nhập vào có nằm trong khoảng `0..maxScore`. Ô nhập điểm trên `ScoresPage` không nằm trong `<form>` chuẩn nên giới hạn hiển thị trên giao diện không thực sự chặn được gì.
- **Cách sửa:** Trong `saveClassScores`, trước khi ghi transaction, validate từng `entry.score`: `if (entry.score < 0 || entry.score > input.maxScore) throw new Error("SCORE_INVALID")` — dùng đúng mã lỗi mà `gradeSubmission` (`assignments.ts`) đã dùng cho cùng khái niệm, để `ScoresPage` xử lý lỗi nhất quán. Đồng thời bọc khu vực nhập điểm bằng `<form onSubmit>` thực sự thay vì `onClick` rời, để `min`/`max` trên `<input>` có tác dụng dự phòng.
- **File:** `src/services/firestore/scores.ts`, `src/features/scores/pages/ScoresPage.tsx`
- **Kiểm tra sau khi sửa:** Thử nhập điểm âm và điểm vượt `maxScore` trên giao diện → phải bị chặn/báo lỗi rõ ràng, không lưu được. Viết thêm test cho `saveClassScores` với điểm ngoài khoảng.

##### 1.2. Luật bảo mật cho hóa đơn thiếu kiểm tra thông tin ngân hàng **[CẦN ADMIN QUYẾT ĐỊNH]**

- **Vấn đề:** `firestore.rules` (đoạn tạo `invoices`, dòng 676-681) chỉ kiểm tra `amount > 0`, không kiểm tra `bankBin`/`accountNumber`/`accountName`/`studentId`/`courseId`. Vì các trường này bị khóa cứng sau khi tạo, bất kỳ tài khoản **giáo viên** nào (không chỉ Admin) về lý thuyết có thể tạo hóa đơn với số tài khoản ngân hàng giả.
- **Cần Admin quyết định trước:** Giáo viên có thực sự cần quyền tự tạo hóa đơn không, hay chỉ Admin/Kế toán mới được tạo? Hai phương án:
  - **(A) Siết quyền:** đổi `allow create` của `invoices` từ `isStaff()` thành `isAdmin()`. Đơn giản, ít rủi ro, nhưng giáo viên mất khả năng tự lập hóa đơn nếu trước giờ vẫn dùng.
  - **(B) Giữ quyền, thêm kiểm tra:** giữ `isStaff()`, nhưng bắt buộc `bankBin`/`accountNumber`/`accountName` phải khớp với `get(/settings/payment).data` (nguồn thông tin ngân hàng chính thức), tương tự cách `validScoreSource` đối chiếu dữ liệu ở nơi khác.
- **File:** `firebase/firestore.rules` (dòng 676-681), test tương ứng trong `firebase/tests/`
- **Kiểm tra sau khi sửa:** Viết test giả lập một tài khoản giáo viên cố tạo hóa đơn với số tài khoản khác `settings/payment` (hoặc cố tạo hóa đơn nếu chọn phương án A) → phải bị `assertFails`.

##### 1.3. Trang "Đóng học phí" của phụ huynh im lặng khi báo lỗi

- **Vấn đề:** `ViewerTuitionPage.tsx` không có trạng thái tải/lỗi, và khi mutation "Tôi đã chuyển khoản" bị từ chối (ví dụ hóa đơn đã được đánh dấu thanh toán), không có gì hiển thị cho phụ huynh biết — họ tưởng đã báo thành công.
- **Cách sửa:** Thêm `LoadingSkeleton`/`ErrorState`/`EmptyState` theo đúng khuôn mẫu đang dùng ở `InvoicesPage` (staff) và các trang Viewer khác. Hiển thị `report.isError` bằng một dòng thông báo lỗi rõ ràng ngay dưới nút bấm, kèm nút "Thử lại".
- **File:** `src/features/invoices/pages/ViewerTuitionPage.tsx`
- **Kiểm tra sau khi sửa:** Giả lập báo chuyển khoản cho hóa đơn đã `paid` → phải thấy thông báo lỗi trên giao diện, không phải im lặng.

##### 1.4. Mã hóa đơn có thể trùng trong cùng tháng

- **Vấn đề:** `createInvoiceCode` (`src/utils/payment.ts`) ghép `HP-{studentId}-{yyyyMM}`, không có số phân biệt. Một học viên có 2 hóa đơn cùng tháng (học phí + phí học bù) sẽ có cùng nội dung chuyển khoản, gây khó đối soát ngân hàng.
- **Cách sửa:** Thêm hậu tố ngắn để phân biệt — ví dụ 4 ký tự cuối của Firestore document ID, hoặc số thứ tự đếm theo học viên+tháng (đọc trước khi ghi trong transaction). Ưu tiên phương án dùng document ID vì không cần đọc thêm dữ liệu trước khi ghi.
- **File:** `src/utils/payment.ts`, `src/services/firestore/invoices.ts`
- **Kiểm tra sau khi sửa:** Tạo 2 hóa đơn cho cùng học viên trong cùng tháng → mã hóa đơn/nội dung chuyển khoản phải khác nhau.

---

#### Đợt 2 — Rủi ro âm thầm & Nhất quán quan trọng

##### 2.1. File cấu hình Vite/Tailwind bị trùng

- **Vấn đề:** `vite.config.js` và `vite.config.ts` gần giống hệt nhau; Vite ưu tiên chạy bản `.js` (không được kiểm tra kiểu dữ liệu) dù `.ts` mới là bản được `tsconfig.node.json` theo dõi. Tương tự với `tailwind.config.js`/`.ts`/`.d.ts` (bản `.d.ts` rỗng).
- **Cách sửa:** Xóa hẳn `vite.config.js` và `tailwind.config.js` (bản `.js` là bản không kiểm soát được), giữ lại `vite.config.ts`/`tailwind.config.ts` làm nguồn duy nhất. Xóa `tailwind.config.d.ts` (file rỗng, không có tác dụng). Chạy thử `npm run dev` và `npm run build` để xác nhận Vite/Tailwind vẫn nạp đúng cấu hình sau khi xóa bản `.js`.
- **File:** `vite.config.js`, `tailwind.config.js`, `tailwind.config.d.ts`
- **Kiểm tra sau khi sửa:** `npm run dev`, `npm run build` chạy thành công, giao diện không đổi.

##### 2.2. Bộ lọc "Thời gian" trong danh sách Học viên không hoạt động **[CẦN ADMIN QUYẾT ĐỊNH]**

- **Vấn đề:** `TimeRangeFilter.tsx` chỉ là giao diện trang trí — ngày tháng viết cứng, nút "Áp dụng" không lọc được gì.
- **Cần Admin quyết định:** Nhân viên có thực sự cần lọc học viên theo khoảng thời gian không (theo ngày sinh? ngày tạo hồ sơ? ngày nhập học)? Hai phương án:
  - **(A)** Làm cho bộ lọc hoạt động thật — cần biết muốn lọc theo trường ngày nào.
  - **(B)** Gỡ bỏ hẳn khỏi giao diện nếu không cần, tránh gây hiểu nhầm.
- **File:** `src/features/students/components/TimeRangeFilter.tsx`, `src/features/students/components/StudentsList.tsx`
- **Kiểm tra sau khi sửa:** Nếu chọn (A): lọc thử và xác nhận danh sách thay đổi đúng. Nếu chọn (B): xác nhận nút lọc không còn xuất hiện.

##### 2.3. Giáo án có thể "Xuất bản" mà không gắn lớp học

- **Vấn đề:** Ô "Lớp học" trên `LessonPlanForm.tsx` có dấu `*` báo bắt buộc nhưng schema Zod (`classId: z.string().nullable().default(null)`) không thực sự bắt buộc — giáo án xuất bản thiếu lớp sẽ không hiện cho phụ huynh mà không ai được cảnh báo.
- **Cách sửa:** Thêm `.refine()` vào `lessonPlanFormSchema` bắt buộc `classId` khi `status === "published"` (hoặc bắt buộc luôn tùy nghiệp vụ), hiển thị lỗi tại vị trí `errors.classId` trong form (hiện đang không được render ở đâu cả), và chặn nút "Xuất bản" nếu thiếu lớp thay vì lưu thành công trong im lặng.
- **File:** `src/schemas/lessonPlan.ts`, `src/features/lesson-plans/components/LessonPlanForm.tsx`
- **Kiểm tra sau khi sửa:** Thử xuất bản giáo án không chọn lớp → phải bị chặn với thông báo lỗi rõ ràng.

##### 2.4. Xử lý múi giờ không nhất quán trong Lịch học

- **Vấn đề:** `recurrence.ts`, `sessions.ts`, `FitWeekTimetable.tsx`, `TimetableGrid.tsx`, `MonthGrid.tsx` dùng các hàm `Date` thô (`.setHours()`, `.getDay()`...) chạy theo múi giờ máy tính cục bộ, thay vì cố định theo giờ Việt Nam như `usage.ts` đã làm đúng bằng `date-fns-tz`.
- **Cách sửa:** Thay các thao tác `Date` thô trong các file trên bằng `formatInTimeZone`/`zonedTimeToUtc` (`date-fns-tz`) với hằng số `TIME_ZONE = "Asia/Bangkok"` đã có sẵn trong `usage.ts` — nên tách hằng số này ra một nơi dùng chung (ví dụ `src/constants/time.ts`) rồi import lại ở cả 2 nơi.
- **File:** `src/utils/recurrence.ts`, `src/services/firestore/sessions.ts`, `src/features/sessions/components/{FitWeekTimetable.tsx,TimetableGrid.tsx,MonthGrid.tsx}`
- **Kiểm tra sau khi sửa:** Đổi múi giờ hệ điều hành máy test sang một múi giờ khác Việt Nam (ví dụ UTC hoặc US Pacific) → tạo lịch lặp lại và kéo-thả đổi giờ → ngày/giờ hiển thị phải không đổi so với khi máy đặt giờ Việt Nam.

##### 2.5. Biểu mẫu tạo Bài tập bắt gõ tay mã kỹ thuật

- **Vấn đề:** `AssignmentsPage.tsx` yêu cầu gõ tay "Mã giáo án" và "Mã buổi học" (Firestore document ID) thay vì chọn từ danh sách — không ai không rành kỹ thuật biết mã đó là gì.
- **Cách sửa:** Thay 2 ô `<input>` tự do bằng 2 ô `<select>` lấy danh sách giáo án/buổi học theo lớp đã chọn trong form (giống cách chọn lớp/môn/khóa học ở nơi khác trong hệ thống).
- **File:** `src/features/assignments/pages/AssignmentsPage.tsx`
- **Kiểm tra sau khi sửa:** Tạo bài tập và gắn giáo án/buổi học bằng cách chọn từ danh sách xổ xuống, xác nhận lưu đúng ID tương ứng.

---

#### Đợt 3 — Nhất quán & Dọn dẹp có ảnh hưởng chức năng

##### 3.1. Bổ sung kiểm tra định dạng dữ liệu còn thiếu trong Firestore Rules

- **Vấn đề:** Các collection `assignments`, `submissions`, `announcements`, `payments` chỉ kiểm tra một vài trường khi ghi, không có `hasOnly`/`hasAll` đầy đủ như `validStudentData`/`validClassData`.
- **Cách sửa:** Viết thêm các hàm `validAssignmentData()`, `validSubmissionData()`, `validAnnouncementData()`, `validPaymentData()` theo đúng khuôn của các hàm `valid*Data` hiện có, áp dụng vào `allow create`/`allow update` tương ứng.
- **File:** `firebase/firestore.rules`
- **Kiểm tra sau khi sửa:** Viết test `assertFails` cho việc ghi thêm trường lạ/sai kiểu vào từng collection.

##### 3.2. Đối chiếu chéo dữ liệu còn thiếu trong Rules

- **Vấn đề:** `submissions` không đối chiếu `assignmentId` → `classId` thực sự khớp nhau (dòng 619-621); `payments` không đối chiếu `invoiceId`/`amount` với hóa đơn gốc (dòng 693-698).
- **Cách sửa:** Thêm `get(/databases/$(database)/documents/assignments/$(assignmentId)).data.classId == classId` cho `submissions`, và `get(...).data.amount == request.resource.data.amount` cho `payments`, theo đúng mẫu `validScoreSource` đã làm.
- **File:** `firebase/firestore.rules` (dòng 619-621, 693-698)
- **Kiểm tra sau khi sửa:** Test giả lập nộp bài/báo thanh toán với dữ liệu không khớp → phải `assertFails`.

##### 3.3. Làm mới dữ liệu mẫu trong test luật bảo mật

- **Vấn đề:** `immutable-rules.test.ts` và `phase5-rules.test.ts` vẫn dùng cấu trúc giáo án cũ (`sections: []`), trong khi schema thật đã đổi sang `objectives`/`preparation`/`activities`/... từ đợt nâng cấp 16/07 — test vẫn "chạy qua" nhưng không còn kiểm tra đúng thứ cần kiểm tra.
- **Cách sửa:** Cập nhật dữ liệu mẫu trong 2 file test theo đúng schema giáo án hiện tại.
- **File:** `firebase/tests/immutable-rules.test.ts`, `firebase/tests/phase5-rules.test.ts`
- **Kiểm tra sau khi sửa:** `npm run test:rules` (cần chạy thủ công — máy hiện tại thiếu JDK 21+ để chạy Firebase emulator, xem ghi chú bên dưới).

##### 3.4. Thêm trạng thái tải/lỗi cho 2 màn hình Viewer còn thiếu

- **Vấn đề:** `ViewerAssignmentsPage.tsx` và `ViewerAnnouncementsPage.tsx` không có `LoadingSkeleton`/`ErrorState`, khác với phần còn lại của hệ thống.
- **Cách sửa:** Áp dụng đúng khuôn mẫu 3 trạng thái tải/lỗi/rỗng đang dùng ở `ViewerDashboardPage`/`ViewerSchedulePage`.
- **File:** `src/features/assignments/pages/ViewerAssignmentsPage.tsx`, `src/features/dashboard/pages/ViewerAnnouncementsPage.tsx`

##### 3.5. Gom logic lấy "Thông báo" về một service dùng chung

- **Vấn đề:** Cùng một câu truy vấn thông báo được viết tay lặp lại ở 3 nơi (`Topbar.tsx`, `ViewerAnnouncementsPage.tsx`, `viewerDashboard.ts`), 2 trong số đó truy cập Firestore trực tiếp thay vì qua lớp service dùng chung.
- **Cách sửa:** Tạo `src/services/firestore/announcements.ts` với hàm `listAnnouncementsForStudent()` dùng kiểu dữ liệu thống nhất, thay thế cả 3 nơi gọi trực tiếp.
- **File:** `src/services/firestore/announcements.ts` (mới), `src/components/layouts/Topbar.tsx`, `src/features/dashboard/pages/ViewerAnnouncementsPage.tsx`, `src/services/firestore/viewerDashboard.ts`

##### 3.6. Sửa kiểu dữ liệu bị ép sai trong Viewer Dashboard

- **Vấn đề:** `viewerDashboard.ts` ép toàn bộ dữ liệu về `Record<string, unknown>[]` (`as unknown as`), bỏ qua kiểm tra kiểu dữ liệu đã xây ở nơi khác.
- **Cách sửa:** Định nghĩa lại `ViewerDashboardData` dùng đúng kiểu gốc (`SessionDoc[]`, `LessonPlanDoc[]`...) thay vì ép về dạng chung chung; sửa `ViewerDashboardPage.tsx` đọc theo trường đã định kiểu thay vì index bằng chuỗi.
- **File:** `src/services/firestore/viewerDashboard.ts`, `src/features/dashboard/pages/ViewerDashboardPage.tsx`

##### 3.7. Dọn code chết đã xác nhận không dùng ở đâu

- **Vấn đề:** 7 vị trí code chết đã xác nhận (grep toàn bộ `src/`, không có import nào trỏ tới):
  - `src/features/sessions/components/ClassScheduleList.tsx`
  - `src/features/users/pages/UsersPage.tsx` + `components/{InviteForm,InvitesList,UsersList,UserDetailModal}.tsx` (5 file)
  - `src/features/announcements/pages/StaffAnnouncementsPage.tsx`
  - Nhánh "edit mode" trong `src/features/students/components/StudentForm.tsx` (giữ phần "create", xóa phần "edit" không dùng)
  - `src/services/firebase/client.ts` (barrel không ai import)
  - `src/components/feedback/PermissionDenied.tsx`
- **Cách sửa:** Xóa hẳn các file/nhánh trên. Không cần thay thế vì đã có bản mới đang hoạt động thay thế từng cái.
- **Kiểm tra sau khi sửa:** `npm run typecheck && npm run lint && npm run build` không lỗi (xác nhận không có import ẩn nào bị bỏ sót).

##### 3.8. Gom định dạng ngày tháng và tiền tệ về dùng chung

- **Vấn đề:** Định dạng `dd/MM/yyyy` viết tay lặp lại ở 8+ file; hàm `formatVnd()` đã có sẵn nhưng 2 màn hình vẫn tự viết lại.
- **Cách sửa:** Tạo `src/utils/date.ts` với các hàm định dạng ngày dùng chung, thay dần các chỗ viết tay khi có dịp sửa file đó (không bắt buộc làm một lần). Thay 2 chỗ dùng `formatVnd()` thay vì tự viết lại ở `ViewerTuitionPage.tsx`, `SettingsAdminPage.tsx`.
- **File:** `src/utils/date.ts` (mới), nhiều file rải rác

##### 3.9. Tập trung tên query key của React Query

- **Vấn đề:** Tên nhóm dữ liệu cache (`["students"]`, `["classes"]`...) viết tay rải rác ở 28+ file, chỉ hoạt động đúng nhờ trùng tên theo thói quen.
- **Cách sửa:** Tạo `src/hooks/queryKeys.ts` làm factory tập trung, refactor dần theo từng module khi có dịp sửa (không cần đổi hết một lần, rủi ro cao nếu đổi đồng loạt).
- **File:** `src/hooks/queryKeys.ts` (mới)

##### 3.10. Chuẩn hóa cách xử lý lỗi của `messenger/client.ts`

- **Vấn đề:** File viết một dòng dày đặc, ép kiểu `as {...}` không kiểm tra dữ liệu trả về, chỉ `throw` thay vì trả về kiểu `Result` như các service khác.
- **Cách sửa:** Viết lại theo đúng pattern `try/catch` + kiểu `Result` (`{ success: true, ... } | { success: false, reason: ... }`) đang dùng ở `students.ts`/`users.ts`.
- **File:** `src/services/messenger/client.ts`

---

#### Đợt 4 — Vệ sinh kho mã nguồn (không ảnh hưởng chức năng, làm khi rảnh)

##### 4.1. Gỡ file build tạm bị track nhầm trong git

- **Vấn đề:** `tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo` đang bị lưu trong git dù `.gitignore` đã có `*.tsbuildinfo`.
- **Cách sửa:** `git rm --cached tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo` rồi commit.

##### 4.2. Luật `viewer_dashboards` không có tác dụng thực tế **[CẦN ADMIN QUYẾT ĐỊNH]**

- **Vấn đề:** Rules cho `viewer_dashboards` giả định có Admin SDK ghi dữ liệu, nhưng dự án không có Cloud Functions (gói Spark) nên không bao giờ dùng tới.
- **Cần Admin quyết định:** Giữ lại để dự phòng cho tương lai nếu nâng cấp lên gói Blaze và có Cloud Functions, hay xóa hẳn (khối rules + `getViewerDashboard()`/`buildViewerDashboard()` không dùng) để gọn kho mã nguồn?
- **File:** `firebase/firestore.rules` (dòng 719-725), `src/services/firestore/viewerDashboard.ts`

##### 4.3. Sửa hằng số `settings/messenger` không khớp Rules

- **Vấn đề:** `SETTINGS_DOC.MESSENGER` khai báo trong `collections.ts` nhưng Rules chỉ chấp nhận `docId in ['general','integrations','payment']` — nếu sau này có tính năng dùng tới sẽ luôn bị từ chối ghi.
- **Cách sửa:** Thêm `'messenger'` vào danh sách `docId` hợp lệ trong Rules (không cần validate thêm gì khác, chỉ để không bị chặn nhầm khi có tính năng dùng tới).
- **File:** `firebase/firestore.rules` (dòng 366-370)

##### 4.4. Xử lý thư mục tài liệu tham khảo cồng kềnh **[CẦN ADMIN QUYẾT ĐỊNH]**

- **Vấn đề:** Thư mục `Agents Instuctions/` chứa khoảng 910 file tài liệu tham khảo sao chép từ các dự án mã nguồn mở khác, không phải mã nguồn Edumatrix, làm phình to kho mã nguồn chính.
- **Cần Admin quyết định:** Có cần giữ các tài liệu này trong repo sản phẩm không? Nếu không, nên dọn theo hướng nào — xóa hẳn, hay chuyển sang một repo/thư mục riêng ngoài dự án?
- **File:** `Agents Instuctions/`

##### 4.5. Lưu trữ tài liệu kế hoạch cũ

- **Vấn đề:** `docs/` có hơn 40 file kế hoạch/báo cáo tích lũy qua nhiều đợt nâng cấp, khó tìm tài liệu còn hiệu lực.
- **Cách sửa:** Tạo `docs/archive/` và chuyển các file kế hoạch đã hoàn thành + đã triển khai xong (ví dụ các file `KE-HOACH-*` của các module đã duyệt và lên production) vào đó, giữ `docs/` gốc chỉ còn tài liệu đang hiệu lực (README kỹ thuật, hướng dẫn vận hành, kế hoạch đang mở).
- **File:** `docs/`

---

#### Ghi chú: giới hạn khi kiểm thử luật bảo mật

Các mục 1.2, 3.1, 3.2, 3.3 cần chạy `npm run test:rules` (bộ test dùng Firebase Emulator) để xác nhận. Môi trường sandbox hiện tại chỉ có JDK 11, trong khi emulator cần JDK 21+ — cần chạy bộ test này trên máy của Admin/lập trình viên sau khi sửa, không chạy được trong phiên làm việc này.

#### Ghi chú tương thích Spark Plan & Client-side

Toàn bộ 24 hạng mục trong kế hoạch này đã được kiểm tra tương thích với gói Firebase Spark (miễn phí) và kiến trúc chỉ chạy phía client (không có Cloud Functions). Không có hạng mục nào cần Cloud Functions, Cloud Storage, hay dịch vụ trả phí nào khác — mọi thay đổi chỉ thuộc 2 loại: sửa Firestore Security Rules (tính năng gốc của gói miễn phí) hoặc sửa code React/TypeScript chạy trên trình duyệt.

Vài điểm cụ thể cần lưu ý khi triển khai:

- **Mục 1.4 (mã hóa đơn trùng):** chọn cách lấy hậu tố từ Firestore document ID thay vì bộ đếm tuần tự, để không cần đọc thêm dữ liệu trước khi ghi và không cần Cloud Function đảm bảo tính đúng khi 2 người tạo hóa đơn cùng lúc.
- **Mục 3.10 (`messenger/client.ts`):** chỉ sửa cách xử lý lỗi phía client, không đụng đến Cloudflare Worker — Worker này vốn đã được dùng thay Cloud Functions chính vì Spark không hỗ trợ Cloud Functions, kiến trúc giữ nguyên.
- **Mục 1.2 (phương án B) và 3.2:** thêm lệnh `get()` trong Firestore Rules để đối chiếu chéo dữ liệu (`submissions` ↔ `assignments`, `payments` ↔ `invoices`, hoặc `invoices` ↔ `settings/payment`). `get()` trong Rules không bị khóa ở gói Spark, nhưng mỗi lần gọi tính là **1 lượt đọc Firestore**, tính vào hạn mức 50.000 lượt đọc/ngày — tốn thêm mỗi khi có người nộp bài tập, báo chuyển khoản, hoặc tạo hóa đơn. Với quy mô một trường học, mức tăng này không đáng kể, nhưng cần lưu ý vì dự án vốn rất để ý tiết kiệm lượt đọc (xem `usage.ts`, cách chia nhỏ truy vấn theo nhóm 30 học viên ở module Điểm danh).
- **Mục 4.2 (`viewer_dashboards`):** là ví dụ ngược lại trong báo cáo gốc — luật này được viết cho một cơ chế ghi bằng Admin SDK không tồn tại trên Spark, nên vẫn giữ trong diện cần Admin quyết định giữ hay xóa (không sửa trong kế hoạch này).

#### Tổng hợp theo mức độ ưu tiên

| Đợt | Số vấn đề | Có mục cần Admin quyết định? |
|---|---|---|
| Đợt 1 — Tài chính & Dữ liệu | 4 | Có (1.2) |
| Đợt 2 — Rủi ro âm thầm & Nhất quán quan trọng | 5 | Có (2.2) |
| Đợt 3 — Nhất quán & Dọn dẹp có ảnh hưởng chức năng | 10 | Không |
| Đợt 4 — Vệ sinh kho mã nguồn | 5 | Có (4.2, 4.4) |

Tổng cộng 24 hạng mục sửa (một số hạng mục nhỏ trong báo cáo gốc được gộp chung khi cách sửa giống nhau, ví dụ các file code chết ở mục 3.7).

---

## 11. 17/07/2026 — Kế hoạch thiết lập module Chat

_Nguồn gốc: `KE-HOACH-THIET-LAP-MODULE-CHAT-17-07-2026.md` — file gốc đã chuyển vào `docs/archive/`._

### Kế hoạch thiết lập module Chat

Ngày lập: 17/07/2026

#### 1. Kết luận audit hiện trạng

Module Staff tại `/app/announcements` hiện có hai chức năng:

1. Đăng nội dung và liên kết lên Facebook Page qua `POST /api/messenger/post`.
2. Chọn học sinh và gửi Messenger một chiều tới phụ huynh đã liên kết qua `POST /api/messenger/send`.

Hệ thống hiện chưa phải một module chat hoàn chỉnh:

- Chưa lưu tin nhắn đến từ webhook.
- Chưa có danh sách hội thoại hoặc lịch sử hội thoại.
- Chưa có trạng thái chưa đọc, đã đọc, đang gửi và gửi thất bại theo từng hội thoại.
- `message_outbox` chỉ là nhật ký gửi, giao diện chưa đọc collection này.
- Webhook hiện chỉ dùng referral để liên kết PSID với tài khoản.
- Worker hiện chỉ kiểm tra tài khoản là Staff, chưa kiểm tra giáo viên có được phân công với `studentId` hay không.
- Rules hiện cho mọi Staff đọc toàn bộ `message_outbox`, chưa giới hạn theo người gửi hoặc lớp được phân công.
- Staff không có notification feed trên chuông topbar. Viewer mới đọc `announcements` theo học sinh.
- Khi thiếu `VITE_MESSENGER_WORKER_URL`, toàn bộ thao tác Facebook và Messenger bị khóa.

Collection `announcements` hiện là kênh thông báo nội bộ, được sinh từ điểm danh, bài tập và thay đổi lịch. Đây không phải dữ liệu chat.

#### 2. Quyết định về tên và điều hướng

##### Staff

- Đổi nhãn `Thông báo` thành `Chat`.
- Đặt `Chat` trong phân hệ `Chức năng`, sau `Bài tập & Điểm`.
- Loại mục `Tương tác lớp học` đang bị khóa để tránh hai mục cùng ý nghĩa.
- Route chuẩn mới: `/app/chat`.
- Route cũ `/app/announcements` chỉ redirect tới `/app/chat` để giữ bookmark.

##### Phụ huynh và học sinh

- Giữ tên `Thông báo` tại `/portal/announcements`.
- Giữ chuông topbar là `Thông báo`.
- Không gọi hai bề mặt này là Chat vì người dùng chỉ đọc thông báo hệ thống, chưa đối thoại trong portal.

#### 3. Phạm vi sản phẩm đề xuất

##### Nhánh Hội thoại

- Danh sách hội thoại theo phụ huynh và học sinh.
- Tìm theo tên học sinh, mã học sinh, tên phụ huynh.
- Lọc: tất cả, chưa đọc, cần trả lời, gửi lỗi.
- Hiển thị tin đến và tin đi theo thứ tự thời gian.
- Composer gửi tin văn bản, đếm ký tự và khóa gửi khi chưa đủ điều kiện.
- Hiển thị rõ cửa sổ phản hồi Messenger và nguyên nhân không thể gửi.
- Thử gửi lại tin lỗi theo đúng idempotency key.

##### Nhánh Nhật ký gửi

- Đọc `message_outbox` theo trang, không tải toàn bộ collection.
- Lọc theo trạng thái, người gửi, học sinh và thời gian.
- Admin xem toàn bộ. Giáo viên chỉ xem tin của lớp được phân công hoặc do chính mình gửi.

##### Nhánh Đăng Fanpage

- Chỉ Admin được sử dụng.
- Giữ như một nhánh phụ trong giai đoạn đầu để không làm mất chức năng hiện có.
- Khi module Marketing được triển khai, chuyển chức năng này sang Marketing.

#### 4. Định hướng UI/UX

##### Desktop

Sử dụng chat shell ba vùng, không dùng dashboard card lặp lại:

- Cột trái 300 px: tìm kiếm, bộ lọc và danh sách hội thoại.
- Vùng giữa linh hoạt: header người nhận, timeline tin nhắn và composer cố định bên dưới.
- Cột phải 320 px: học sinh, lớp học, phụ huynh liên kết, trạng thái Messenger và tác vụ liên quan.

##### Tablet và mobile

- Danh sách hội thoại là màn đầu.
- Chọn hội thoại mở màn chi tiết, có nút quay lại rõ ràng.
- Thông tin học sinh và phụ huynh mở bằng bottom sheet.
- Composer bám đáy vùng nội dung, không bám trực tiếp viewport khi bàn phím mở.

##### Ngôn ngữ hình ảnh

- Giữ nền sáng, xanh Edumatrix là màu nhấn duy nhất.
- Tin đến dùng surface trung tính. Tin đi dùng primary tint nhẹ, không dùng gradient trong bong bóng chat.
- Bo góc theo token hiện tại: card, input và button có vai trò riêng nhưng nhất quán.
- Trạng thái online chỉ xuất hiện khi có dữ liệu thật. Không dùng chấm trang trí.
- Chuyển hội thoại và trạng thái gửi dùng opacity/transform 160-220 ms, có reduced-motion.

##### Trạng thái bắt buộc

- Loading: skeleton đúng hình danh sách và timeline.
- Empty: chưa có kết nối Messenger, chưa có hội thoại hoặc bộ lọc không có kết quả.
- Error: lỗi đọc Firestore, Worker chưa cấu hình, Meta từ chối, hết cửa sổ phản hồi.
- Offline: giữ nội dung đang soạn trong session storage, không tự gửi lại khi chưa có xác nhận.

#### 5. Mô hình dữ liệu đề xuất

##### `chat_threads/{threadId}`

- `channel: "messenger"`
- `studentId`
- `parentUid`
- `classId`
- `assignedTeacherIds`
- `lastMessagePreview`
- `lastMessageDirection`
- `lastMessageAt`
- `unreadStaffCount`
- `status: "open" | "resolved" | "blocked"`
- `createdAt`, `updatedAt`

Không lưu Page token hoặc App secret. Không đưa PSID vào document mà giáo viên có thể đọc.

##### `chat_threads/{threadId}/messages/{messageId}`

- `direction: "inbound" | "outbound"`
- `text`
- `actorUid`
- `status: "received" | "queued" | "sent" | "failed"`
- `metaMessageId`
- `errorCode`
- `createdAt`, `updatedAt`

Không lưu payload webhook đầy đủ. Chỉ giữ trường cần cho hiển thị, audit và thử lại.

#### 6. Chuỗi logic và bảo mật

```text
Phụ huynh gửi Messenger
  -> Meta Webhook
  -> Cloudflare Worker xác minh chữ ký
  -> resolve messenger_connections
  -> ghi chat_threads và inbound message
  -> client đang mở thread nhận snapshot

Staff gửi tin
  -> client gửi Firebase ID token tới Worker
  -> Worker xác minh active staff và phạm vi học sinh
  -> gọi Meta Send API
  -> ghi outbound message và trạng thái
  -> client cập nhật timeline
```

Quy tắc bắt buộc:

- Meta token, App secret và service-account key chỉ nằm trong Worker Secret.
- Client không được tự tạo tin inbound hoặc tự đổi trạng thái `sent`.
- Admin đọc mọi thread.
- Giáo viên chỉ đọc và gửi trong lớp được phân công.
- Viewer không đọc collection chat. Phụ huynh giao tiếp qua Messenger và xem thông báo nội bộ tại portal.
- Rules kiểm tra field allowlist, kiểu dữ liệu, immutable keys và quyền lớp học.
- Mỗi thay đổi Rules phải có Emulator test cho Admin, Teacher được gán, Teacher không được gán và Viewer.

#### 7. Giới hạn Firebase Spark

- Không dùng Firebase Cloud Functions.
- Frontend vẫn là client-side. Cloudflare Worker chỉ xử lý tích hợp chứa secret.
- Chỉ `onSnapshot` thread đang mở và tối đa 30 thread gần nhất.
- Mỗi lần tải tối đa 50 message, phân trang bằng cursor.
- Không listener toàn bộ `messages` hoặc toàn bộ `message_outbox`.
- Gộp cập nhật unread/thread summary trong cùng một Worker write flow.
- Không ghi presence hoặc typing indicator liên tục ở giai đoạn đầu.

#### 8. Các pha triển khai

##### Pha 1: IA và demo UI

- Tạo `/app/chat-demo` với dữ liệu trạng thái rõ là demo.
- Thiết kế đủ desktop, tablet, mobile, loading, empty và Worker chưa cấu hình.
- Không gửi Meta và không ghi Firestore.
- Duyệt bố cục trước khi thay route production.

##### Pha 2: Data model, Worker và Rules

- Bổ sung thread/message types và service đọc theo trang.
- Mở rộng webhook để ghi tin đến.
- Ghi tin đi và kết quả gửi vào timeline.
- Thêm Rules, indexes và emulator tests.
- Bổ sung idempotency cho thao tác thử lại.

##### Pha 3: Nối production

- Đổi navigation Staff thành Chat và chuyển vào Chức năng.
- Tạo route `/app/chat`, redirect route cũ.
- Nối hội thoại, composer, nhật ký và Admin Page post.
- Giữ Viewer Notifications và chuông topbar không đổi.

##### Pha 4: Kiểm thử go-live

- Unit test parser webhook và mapping lỗi.
- Worker tests cho inbound, outbound, quyền role và chữ ký sai.
- Rules tests cho ownership và class assignment.
- QA bàn phím, focus, mobile, reduced-motion và không cấu hình Worker.
- Smoke test một hội thoại Meta thật sau khi có Page, secret và quyền hợp lệ.

#### 9. Tiêu chí hoàn thành

- Không còn mục Staff tên `Thông báo` hoặc `Tương tác lớp học` trùng nghĩa.
- Chat nằm đúng phân hệ Chức năng cho Admin và Giáo viên.
- Viewer vẫn đọc được thông báo điểm danh, bài tập và lịch học.
- Hội thoại chỉ hiển thị dữ liệu thật, không có inbox giả.
- Giáo viên không đọc được thread ngoài lớp được phân công.
- Worker tắt không làm sập ứng dụng và nội dung đang soạn không bị mất.
- Không có token hoặc secret trong bundle, Firestore hoặc console log.
- Build, lint, unit tests, Worker tests và Rules tests đều đạt.

#### 10. Phạm vi chờ duyệt

Khuyến nghị duyệt Pha 1 trước. Demo sẽ tập trung vào chat hai chiều thật trong tương lai, nhưng chỉ dùng dữ liệu mẫu được gắn nhãn và không tác động hệ thống. Sau khi duyệt UI mới triển khai schema, Worker và Rules.
