# Phương án nâng cấp Motion & UI/UX toàn hệ thống — 01/08/2026

## 1. Mục tiêu

Nâng chất lượng cảm nhận khi người dùng chuyển module, đổi tab, mở/đóng popup và chờ dữ liệu mà không làm tăng độ phức tạp của codebase hoặc ảnh hưởng logic nghiệp vụ.

Mục tiêu nghiệm thu:

- Phản hồi thị giác bắt đầu trong 100ms sau thao tác.
- Motion giao diện nằm trong 150–300ms; thao tác đóng nhanh hơn thao tác mở.
- Sidebar, Topbar và điều hướng mobile không biến mất khi lazy route đang tải.
- Không có màn hình trắng khi chuyển module; fallback giữ đúng cấu trúc trang.
- Animation chỉ dùng `transform` và `opacity` ở các vùng chạy thường xuyên.
- Popup hỗ trợ Escape, focus trap, trả focus về điểm mở, khóa cuộn nền và cô lập nội dung nền.
- Tab hỗ trợ bàn phím Left/Right/Home/End.
- Toàn bộ motion tôn trọng `prefers-reduced-motion`.
- Typecheck, lint và test hiện có đều qua.

## 2. Hiện trạng đã xác nhận

Hệ thống đang dùng React 18, React Router 6.30, Tailwind 3.4 và Lucide. Không có Framer Motion hoặc GSAP.

Những nền móng tốt đã có:

- `AppShell`/`ViewerShell` là layout route nên Sidebar và Topbar không remount khi đổi module.
- Sidebar và Bottom Navigation prefetch route khi hover/focus.
- React Router View Transitions đã được bật trên các liên kết điều hướng chính.
- Có motion token tập trung trong `src/index.css`.
- `Modal` đã có portal, Escape, focus trap, trả focus và khóa scroll.
- Có skeleton, toast, empty state và error state dùng chung.

Khoảng trống cần xử lý:

- `Suspense` cấp router có thể thay toàn bộ shell bằng fallback nếu lazy chunk chưa sẵn sàng.
- Nền dùng `background-attachment: fixed`, gây repaint không cần thiết khi cuộn.
- Chuyển route chưa chuyển focus vào vùng nội dung mới cho người dùng bàn phím/screen reader.
- Modal đóng và mở cùng 300ms; thao tác đóng tạo cảm giác chậm.
- Fallback route hiện chỉ là các dòng skeleton chung, không giữ hình dáng trang.
- Tab chưa có điều hướng bàn phím theo ARIA Tabs pattern.
- Cache query mặc định bị thu gom sớm, làm người dùng quay lại module dễ gặp loading lại.

## 3. Nguyên tắc thiết kế

### 3.1 Nhịp motion

| Loại | Thời lượng | Mục đích |
|---|---:|---|
| Press/focus | 150ms | Xác nhận thao tác tức thời |
| Exit/đóng | 200ms | Rời nhanh, không cản thao tác kế tiếp |
| Tab/content | 200–250ms | Duy trì continuity trong cùng ngữ cảnh |
| Modal mở | 300ms | Làm rõ lớp giao diện mới |
| Tiến trình dài | 600–1200ms | Chỉ dùng khi hệ thống thực sự đang tải |

Easing vào dùng ease-out, easing ra dùng ease-in. Không dùng animation tuyến tính ngoài spinner/progress.

### 3.2 Motion có nguyên nhân

- Chuyển module: crossfade + dịch nhẹ vùng nội dung; shell đứng yên.
- Đổi tab: nội dung vào nhẹ và indicator mở từ tâm.
- Mở popup: scrim fade, panel scale rất nhẹ từ nguồn gần nhất.
- Đóng popup: rút ngắn thời lượng và giảm biên độ dịch chuyển.
- Tải route: progress bar + skeleton đúng cấu trúc; không chạy animation trang trí khi đã tải xong.
- Hover/press: chỉ áp dụng cho phần tử thực sự tương tác; không làm mọi card tự chuyển động.

### 3.3 UI/UX toàn hệ thống

- Giữ bảng màu giáo dục hiện tại: primary blue, semantic success/warning/danger và neutral ấm.
- Giữ `Be Vietnam Pro` để đảm bảo dấu tiếng Việt và tính nhất quán thương hiệu.
- Một màn hình chỉ có một CTA chính; hành động phá hủy tách khỏi CTA chính.
- Dùng spacing theo nhịp 4/8px, touch target tối thiểu 44px.
- Card chỉ dùng khi cần phân nhóm hoặc elevation; bảng dữ liệu ưu tiên đường phân cách và khoảng trắng.
- Loading, empty, error và success là bốn trạng thái bắt buộc của module có dữ liệu.

## 4. Kiến trúc triển khai

### Phase A — Route và tải trang

1. Đặt `Suspense` bên trong `AppShell` quanh `Outlet`.
2. Dùng `RouteLoadingState` mô phỏng header, KPI và bảng thay vì màn hình trắng.
3. Khi pathname đổi, đóng menu mobile và chuyển focus vào `main` mà không cuộn trang.
4. Giữ prefetch + View Transitions hiện tại; không thêm thư viện motion.

### Phase B — Popup và thao tác

1. Chuẩn hóa modal mở 300ms, đóng 200ms.
2. Giảm scale từ 0.90 xuống 0.97 để tránh cảm giác “phóng to” quá mức.
3. Cô lập `#root` bằng `inert` trong lúc popup mở.
4. Giữ focus trap, Escape, restore focus và mobile bottom sheet.
5. Bổ sung trạng thái `loading` cho Button dùng chung để ngăn double-submit.

### Phase C — Tab, panel và dữ liệu

1. Tabs hỗ trợ Arrow Left/Right, Home và End.
2. Indicator tab animate bằng `transform/opacity`.
3. Chart panel dùng `content-visibility: auto` để bỏ qua layout/paint ngoài viewport.
4. Query cache giữ 30 phút để quay lại module không phải tải lại không cần thiết.

### Phase D — Paint và accessibility

1. Loại `background-attachment: fixed`; đưa gradient sang layer cố định riêng.
2. Không dùng smooth scroll toàn cục.
3. Giữ reduced-motion toàn cục và tắt View Transition khi người dùng yêu cầu.
4. Giữ focus ring rõ, touch action nhanh và trạng thái disabled có semantic HTML.

## 5. Phạm vi không thực hiện

- Không thêm Framer Motion, GSAP hoặc thư viện animation mới.
- Không viết lại từng module hoặc thay đổi luồng nghiệp vụ.
- Không thay bảng màu/font chỉ để chạy theo gợi ý tự động.
- Không thêm perpetual animation vào dashboard; animation liên tục chỉ dành cho loading/status thực.
- Không animate `width`, `height`, `top`, `left` ở các tương tác thường xuyên.

## 6. Kịch bản kiểm chứng

1. Chuyển liên tiếp 5 module bằng sidebar và bottom navigation.
2. Giả lập mạng chậm, xác nhận shell còn nguyên và route skeleton xuất hiện.
3. Mở/đóng modal bằng click, backdrop và Escape; kiểm tra focus quay lại nút mở.
4. Dùng Tab/Shift+Tab trong modal; dùng phím mũi tên trong tabs.
5. Bật `prefers-reduced-motion: reduce` và xác nhận không còn chuyển động đáng kể.
6. Kiểm tra viewport 375, 768, 1024 và 1440px.
7. Chạy `npm run typecheck`, `npm run lint`, `npm test` và `npm run build`.

## 7. Chỉ số theo dõi sau triển khai

- INP khi bấm điều hướng: dưới 200ms.
- Không có long task trên 50ms chỉ do animation.
- FPS cuộn bảng dài: mục tiêu từ 55 FPS trên cấu hình test 4× CPU slowdown.
- Không remount Sidebar/Topbar khi đổi route.
- Không có layout shift do loading fallback hoặc motion.
