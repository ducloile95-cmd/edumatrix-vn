# Kế hoạch nâng cấp giao diện Mobile cho 3 Role

**Dự án:** Edumatrix VN  
**Ngày tổng hợp:** 29/07/2026  
**Phạm vi:** Admin, Teacher, Viewer (Phụ huynh/Học sinh)  
**Trạng thái:** Sẵn sàng triển khai theo phase

## 1. Mục tiêu

Nâng cấp trải nghiệm trên màn hình 320–767px để mỗi vai trò hoàn thành tác vụ quan trọng bằng một tay, không phải thu phóng hoặc kéo ngang, đồng thời giữ nguyên trải nghiệm desktop, route, dữ liệu và phân quyền hiện tại.

Các kết quả cần đạt:

- Điều hướng chính luôn dễ tiếp cận và phù hợp với công việc của từng role.
- Topbar không cắt tiêu đề hoặc dồn quá nhiều hành động trên màn hình hẹp.
- Danh sách và bảng dữ liệu có cách trình bày mobile riêng, ưu tiên thông tin và hành động chính.
- Form, modal, bộ lọc, tab và trạng thái phản hồi dễ dùng bằng cảm ứng.
- Đạt yêu cầu accessibility cơ bản: target chạm, focus, nhãn, tương phản, reduced motion.
- Không tạo shell riêng cho từng role và không nhân đôi logic nghiệp vụ.

## 2. Nguyên tắc triển khai

### 2.1. Nguyên tắc kỹ thuật

- Thay đổi nhỏ, theo từng lát cắt có thể kiểm thử; không viết lại toàn bộ frontend.
- Tái sử dụng React, Tailwind và bộ component nội bộ hiện có.
- Không cài hoặc chuyển đổi hàng loạt sang thư viện UI mới trong phase đầu. Chỉ áp dụng các pattern accessibility tương đương Radix/shadcn khi cần.
- Giữ một `AppShell`; sự khác biệt giữa role được truyền bằng cấu hình điều hướng và quyền hiện có.
- Không thay đổi Firestore schema, Security Rules, API, route hoặc nghiệp vụ.
- Mỗi phase phải có tiêu chí nghiệm thu định lượng và phương án quay lui độc lập.

### 2.2. Breakpoint thống nhất

- Mobile: `320–767px`
- Tablet: `768–1023px`
- Desktop: `>=1024px`

Thiết kế bắt đầu từ 390px, sau đó kiểm tra ngược ở 320px và mở rộng lên 768px. Không dùng kích thước chữ dưới 12px cho dữ liệu quan trọng; nội dung chính ưu tiên 14–16px.

## 3. Tổng hợp hiện trạng

### Điểm tốt đang có

- Route đã lazy-load theo trang; dashboard staff chỉ tải chart khi cần.
- `AppShell` dùng chung cho Admin và Teacher; Viewer kế thừa shell và bổ sung bottom navigation.
- Sidebar đã sinh từ cấu hình role, phù hợp để mở rộng sang mobile navigation theo cấu hình.
- Nhiều component đã có responsive grid, loading, empty state, error state và reduced motion.
- Viewer đã có bottom navigation 5 mục, là nền tảng tốt cho cả ba role.

### Vấn đề ưu tiên cao

1. **Topbar mobile bị quá tải.** Hamburger, tiêu đề, Refresh, Add, Chat và Bell cùng xuất hiện; tiêu đề trang bị cắt ở 390px.
2. **Admin và Teacher phụ thuộc vào drawer.** Tác vụ thường dùng cần nhiều bước hơn Viewer do chưa có bottom navigation theo role.
3. **Bảng desktop được giữ nguyên trên mobile.** Các trang Học sinh, Lớp học, Người dùng, Tài chính, Giáo án và phần phân tích dashboard dùng bảng rộng 560–1120px; người dùng phải kéo ngang và khó đối chiếu.
4. **Dashboard staff dài và dày.** Sáu KPI, bộ lọc, lịch, hàng đợi, tab, bảng và biểu đồ nối tiếp nhau; thứ tự chưa phản ánh đủ ưu tiên riêng của Admin và Teacher.
5. **Một số target chạm nhỏ.** Điển hình là nút hiện mật khẩu và liên kết ở trang đăng nhập; các icon action cần chuẩn hóa tối thiểu 44×44px.
6. **Modal và bộ lọc chưa có hành vi mobile nhất quán.** Nội dung dài dễ chiếm toàn màn hình nhưng hành động chưa chắc được giữ cố định ở vùng ngón tay cái.

## 4. Kiến trúc trải nghiệm Mobile đề xuất

### 4.1. Shell dùng chung

Không tạo ba shell độc lập. Mở rộng shell hiện tại bằng bốn khối dùng chung:

1. **Responsive Topbar**
   - Mobile chỉ giữ: menu/back, tiêu đề một dòng và Bell/More.
   - Ẩn Refresh, Add và Chat khỏi topbar dưới `sm`; chuyển chúng vào vùng hành động theo ngữ cảnh hoặc navigation.
   - Tất cả icon button đạt tối thiểu 44×44px.
   - Trang con có thể dùng nút Back thay hamburger khi luồng cần ngữ cảnh.

2. **Role-aware Bottom Navigation**
   - Hiển thị dưới `md`, tối đa 5 mục.
   - Nhận cấu hình từ role thay vì hard-code Viewer.
   - Có nhãn chữ, trạng thái active rõ ràng, `aria-current="page"` và padding `env(safe-area-inset-bottom)`.
   - Các route phụ vẫn nằm trong drawer “Khác”, tránh nhồi toàn bộ menu xuống đáy.

3. **Mobile Page Actions**
   - Hành động chính của trang đặt gần tiêu đề nội dung hoặc sticky ở cuối viewport khi cần.
   - Chỉ có một primary action nổi bật tại một thời điểm.
   - Add/Refresh/Filter là hành động theo ngữ cảnh, không phải hành động toàn cục.

4. **Mobile More Drawer**
   - Chứa route cấp hai, tài khoản, cài đặt, đăng xuất và các hành động ít dùng.
   - Dùng lại dữ liệu từ `NAVIGATION_BY_ROLE`, không duy trì danh sách thứ hai bằng tay.

### 4.2. Điều hướng theo role

| Role | 5 mục bottom navigation | Nội dung “Khác” |
|---|---|---|
| Admin | Tổng quan · Học sinh · Lớp học · Tài chính · Khác | Lịch học, Khóa học, Tương tác, Giáo án, Điểm danh, Bài tập & Điểm, Chat, Marketing, Người dùng, Cài đặt |
| Teacher | Tổng quan · Lịch dạy · Điểm danh · Lớp học · Khác | Học sinh, Tương tác lớp học, Giáo án, Bài tập & Điểm, Chat, Tài chính, Cài đặt |
| Viewer | Tổng quan · Lịch học · Bài tập · Học phí · Thông báo | Tài khoản, chuyển học sinh, trợ giúp, đăng xuất |

Ghi chú: “Thêm mới” không nằm cố định trong navigation vì đối tượng cần thêm thay đổi theo trang. Nó là primary action theo ngữ cảnh của Admin/Teacher.

### 4.3. Primitive responsive dùng chung

- `ResponsiveDataView`: table ở `md+`, card list ở mobile; dùng cùng dữ liệu và callback.
- `MobileFilterSheet`: nút “Bộ lọc” hiển thị số filter đang áp dụng; sheet có Áp dụng/Xóa lọc sticky.
- `MobileActionBar`: vùng action cuối màn hình, có safe-area và chỉ dùng cho tác vụ cần hoàn thành liên tục.
- `Modal`: ở mobile chuyển sang bottom sheet/full-height hợp lý; header và footer sticky, body cuộn độc lập.
- `SegmentedControl/Tabs`: cuộn ngang có nhãn rõ; item tối thiểu 44px, không thu chữ xuống quá nhỏ.
- `DataCard`: nhãn–giá trị theo thứ tự ưu tiên, status badge và menu action; không sao chép toàn bộ cột của bảng.

## 5. Trải nghiệm ưu tiên theo từng Role

### 5.1. Admin

**Mục tiêu:** nắm tình trạng vận hành và xử lý ngoại lệ nhanh.

Dashboard mobile theo thứ tự:

1. Lời chào ngắn + phạm vi dữ liệu.
2. Ba KPI chính: lớp hôm nay, học sinh active, việc cần xử lý.
3. “Ưu tiên hôm nay”: phê duyệt/liên kết chờ, vắng–muộn, hóa đơn quá hạn, thiếu giáo án.
4. Lịch hôm nay với CTA “Mở”.
5. Chất lượng học tập dạng tóm tắt; biểu đồ chi tiết mở theo nhu cầu.
6. Tài chính và trạng thái hệ thống ở tab/accordion, không tải toàn bộ ngay.

Các màn hình trọng điểm:

- **Học sinh/Người dùng:** card gồm tên, mã, lớp/liên kết, trạng thái và menu; search sticky, filter trong sheet.
- **Lớp học:** card gồm lịch gần nhất, giáo viên, sĩ số, trạng thái; CTA “Xem lớp”.
- **Tài chính:** tổng thu/chưa thu/quá hạn trước; hóa đơn thành card có số tiền, hạn, trạng thái và action.
- **Marketing/Cài đặt:** giữ cấu trúc hiện có nhưng tab chuyển thành thanh cuộn hoặc select khi quá dài.

### 5.2. Teacher

**Mục tiêu:** vào lớp, điểm danh, chấm bài và phản hồi với ít bước nhất.

Dashboard mobile theo thứ tự:

1. Buổi dạy kế tiếp + CTA “Mở buổi học”.
2. Ba KPI: buổi hôm nay, bài chờ chấm, việc cần xử lý.
3. Danh sách lịch dạy trong ngày.
4. Hàng đợi: điểm danh chưa hoàn tất, bài chờ chấm, thiếu giáo án.
5. Chất lượng lớp phụ trách; danh sách học sinh cần chú ý.

Các màn hình trọng điểm:

- **Điểm danh:** mỗi học sinh là một hàng/card; trạng thái là segmented buttons Có mặt/Vắng/Muộn/Có phép; thanh Lưu sticky; xác nhận rõ khi rời trang còn thay đổi.
- **Tương tác lớp học:** session picker dạng card; hành động bắt đầu/kết thúc buổi học luôn rõ; trạng thái kết nối có live region.
- **Bài tập & Điểm:** filter theo lớp trong sheet; bài chờ chấm đứng trước; ô nhập điểm đủ lớn và tránh bàn phím che action.
- **Giáo án:** form chia section; action Lưu/Gửi duyệt sticky; lỗi hiển thị cạnh trường và có summary ở đầu.
- **Chat:** danh sách hội thoại và nội dung chuyển thành hai màn hình/pane; composer luôn nằm trên bàn phím và safe-area.

### 5.3. Viewer

**Mục tiêu:** biết ngay lịch, bài cần nộp, học phí và thông báo liên quan đến học sinh đang chọn.

Dashboard mobile theo thứ tự:

1. Student switcher dễ chạm, giữ lựa chọn xuyên trang.
2. Buổi học kế tiếp.
3. Bài tập gần hạn/chưa nộp.
4. Trạng thái học phí.
5. Thông báo gần đây.
6. Chuyên cần và tiến trình điểm dạng tóm tắt; chart là nội dung bổ sung.

Các màn hình trọng điểm:

- **Lịch học:** timeline theo ngày; đổi tuần bằng nút 44px, có “Hôm nay”.
- **Bài tập:** card có hạn nộp, trạng thái, môn/lớp và CTA; filter trạng thái dạng chips.
- **Học phí:** số tiền và hạn thanh toán nổi bật; lịch sử/chi tiết mở bằng disclosure.
- **Thông báo:** trạng thái đã đọc, nhóm theo ngày, target toàn hàng; không chỉ dựa vào màu để báo chưa đọc.

## 6. Lộ trình triển khai

### Phase 0 — Baseline và hợp đồng responsive

**Mục tiêu:** khóa phạm vi và thiết lập bằng chứng trước khi sửa.

- Lập ma trận trang × role × viewport: 320, 390, 768 và 1440px.
- Chụp baseline các trang: Login, Dashboard, Students, Classes, Attendance, Learning, Invoices, Viewer pages.
- Ghi nhận horizontal overflow, target dưới 44px, title bị cắt và lỗi console.
- Bổ sung checklist manual vào tài liệu QA hiện có.

**Nghiệm thu:** có baseline đầy đủ cho ba tài khoản role; không thay đổi sản phẩm.

### Phase 1 — Mobile shell và điều hướng

**File trọng tâm:**

- `src/components/layouts/Topbar.tsx`
- `src/components/layouts/BottomNavigation.tsx`
- `src/components/layouts/AppShell.tsx`
- `src/components/layouts/ViewerShell.tsx`
- `src/constants/navigation.ts`

**Thực hiện:**

- Biến `BottomNavigation` thành role-aware và đưa vào shell chung.
- Giữ `ViewerShell` tương thích hoặc thu gọn thành cấu hình, không nhân đôi padding.
- Giảm action topbar mobile; bổ sung overflow menu.
- Thêm safe-area và khoảng đệm nội dung dưới bottom navigation.
- Chuẩn hóa active state, focus, aria-label và target chạm.

**Nghiệm thu:**

- Không cắt tiêu đề ở 320px.
- Mỗi role vào được 5 tác vụ chính trong một lần chạm.
- Không có route trái quyền.
- Desktop sidebar/topbar không đổi hành vi.

### Phase 2 — Primitive mobile dùng chung

**File trọng tâm:**

- `src/components/ui/Modal.tsx`
- `src/components/ui/PageHeader.tsx`
- Tạo mới tối thiểu trong `src/components/ui/`: `ResponsiveDataView`, `MobileFilterSheet`, `MobileActionBar` nếu chứng minh được tái sử dụng từ hai màn hình trở lên.

**Thực hiện:**

- Chuẩn hóa modal thành bottom sheet trên mobile.
- Chuẩn hóa page header và vùng action.
- Xây card/table adapter, filter sheet và sticky action.
- Bổ sung focus trap/return focus, Escape, nhãn và live feedback cần thiết.

**Nghiệm thu:** demo được trên hai trang thật; không tạo abstraction chỉ dùng một chỗ.

### Phase 3 — Admin mobile

**Ưu tiên triển khai:** Dashboard → Students → Classes → Invoices → Users → Catalog/Marketing/Settings.

- Sắp lại dashboard theo hàng đợi ưu tiên.
- Chuyển các bảng rộng sang card list dưới `md`.
- Đưa filter vào sheet; giữ search và primary action dễ tiếp cận.
- Mỗi card chỉ hiển thị 3–5 thuộc tính cần quyết định; chi tiết mở theo disclosure/trang chi tiết.

**Nghiệm thu:** Admin hoàn thành “tìm học sinh”, “mở lớp”, “xem hóa đơn quá hạn” và “xử lý việc chờ” ở 390px mà không kéo ngang.

### Phase 4 — Teacher mobile

**Ưu tiên triển khai:** Dashboard → Sessions/Attendance → Classroom → Learning → Lesson Plans → Chat.

- Đặt “buổi dạy kế tiếp” và “điểm danh” lên trước.
- Tối ưu danh sách học sinh cho thao tác lặp bằng một tay.
- Sticky save có trạng thái đang lưu/thành công/lỗi.
- Tối ưu form khi bàn phím ảo mở và cảnh báo thay đổi chưa lưu.

**Nghiệm thu:** Teacher mở buổi học, điểm danh một lớp, nhập/chấm điểm và lưu giáo án ở 390px mà không mất dữ liệu hoặc bị bàn phím che action.

### Phase 5 — Viewer mobile

**Ưu tiên triển khai:** Dashboard → Schedule → Assignments → Tuition → Announcements.

- Giữ bottom navigation quen thuộc, chuẩn hóa cùng shell mới.
- Rút dashboard về các việc “sắp diễn ra/cần làm/cần trả/cần đọc”.
- Timeline lịch, assignment cards, invoice cards và unread state rõ ràng.
- Student switcher dùng chung và giữ ngữ cảnh.

**Nghiệm thu:** Viewer đổi học sinh và tìm được buổi học kế tiếp, bài gần hạn, khoản cần đóng và thông báo mới trong tối đa hai lần chạm từ dashboard.

### Phase 6 — Accessibility, hiệu năng và regression

- Kiểm tra keyboard, focus order, focus visible và screen-reader labels.
- Kiểm tra WCAG AA cho text/status; trạng thái không phụ thuộc riêng vào màu.
- Target tương tác tối thiểu 44×44px; khoảng cách giữa action đủ tránh chạm nhầm.
- Kiểm tra zoom 200%, reduced motion, safe-area và bàn phím ảo.
- Không render chart nặng khi phần tương ứng chưa mở; mobile ưu tiên summary.
- Chạy lint, typecheck, build, unit tests, rules tests và smoke test theo role.

**Nghiệm thu:** không horizontal body overflow ở 320px; không lỗi console; toàn bộ quality gate hiện tại tiếp tục pass.

## 7. Ma trận kiểm thử bắt buộc

| Nhóm | Kiểm tra |
|---|---|
| Viewport | 320×568, 390×844, 768×1024, 1440×900 |
| Thiết bị | iOS Safari, Android Chrome; desktop Chrome làm regression |
| Điều hướng | Active state, browser back, deep link, route guard, drawer, bottom nav |
| Cảm ứng | Target 44px, sticky action, scroll, bàn phím ảo, safe-area |
| Dữ liệu | Loading, empty, partial, lỗi, tên/nội dung rất dài |
| Accessibility | Tab order, focus return, aria-label, live region, contrast, reduced motion |
| Nghiệp vụ | Một happy path và một error path cho mỗi tác vụ trọng điểm theo role |

## 8. Tiêu chí hoàn thành toàn dự án

- Ba role có mobile navigation riêng nhưng cùng dùng một nguồn cấu hình và một shell.
- Không có nội dung chính hoặc bảng bắt buộc phải kéo ngang ở 320px; ngoại lệ duy nhất là dữ liệu có bản chất timeline/matrix và phải có vùng cuộn được gắn nhãn.
- Không có primary control dưới 44×44px.
- Không cắt tiêu đề hoặc che action bởi bottom bar/bàn phím.
- Tất cả trạng thái loading, empty, error, success và unsaved changes đều có phản hồi rõ.
- Desktop không bị regression về bố cục hoặc luồng nghiệp vụ.
- Lint, typecheck, build và toàn bộ test suite pass.
- Có ảnh before/after cho các trang trọng điểm của từng role.

## 9. Ngoài phạm vi

- Không thay đổi backend, Firestore schema, Security Rules hoặc phân quyền.
- Không đổi URL/route hay cấu trúc dữ liệu.
- Không redesign toàn bộ desktop.
- Không triển khai dark mode trong đợt này.
- Không cài thêm design system hoặc animation framework nếu chưa có nhu cầu được chứng minh.

## 10. Thứ tự bắt đầu khuyến nghị

Bắt đầu bằng **Phase 1 — Mobile shell và điều hướng**, sau đó làm một vertical slice ở **Teacher Attendance** để kiểm chứng `ResponsiveDataView`, filter sheet và sticky action. Khi pattern này ổn định mới nhân rộng sang Admin và Viewer. Cách này cho phản hồi thực tế sớm, giới hạn phạm vi thay đổi và tránh tạo component tổng quát trước khi có đủ hai use case.
