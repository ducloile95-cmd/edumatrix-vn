# Đề án tối ưu UI Popup, Button và Spacing

Ngày lập: 03/08/2026  
Chế độ: redesign - preserve

## 1. Mục tiêu

- Tăng độ rõ ràng của form nhập liệu mà không đổi field, thứ tự field, validation, API hay route.
- Chuẩn hóa Button qua một component dùng chung, giữ touch target tối thiểu 44px.
- Dùng nhịp spacing 4/8px và giảm các khoảng cách tùy ý.
- Giữ màu xanh Edumatrix, font Be Vietnam Pro và hệ semantic hiện tại.

## 2. Audit hiện trạng

- Nền tảng tốt: Modal đã có portal, Escape, focus trap, trả focus và khóa scroll nền.
- Button đã tập trung qua `src/components/ui/Button.tsx`, nhưng CTA dùng gradient và bóng khá đậm.
- Trang demo đã mô tả đúng phần lớn field nghiệp vụ, nhưng chỉ có một cỡ workspace cho popup thông thường.
- Spacing chủ yếu đúng nhịp 4px, còn lẫn `rounded-2xl`, `rounded-[20px]`, `p-5`, `p-6` theo từng màn hình.
- Hai workspace Giáo án và Lớp học đã được duyệt, không thuộc phạm vi thay bố cục.

## 3. Ba mẫu popup chuẩn

| Mẫu | Chiều ngang tối đa | Trường hợp dùng | Cách tổ chức |
|---|---:|---|---|
| Tập trung | 1.080px | 3-6 field, một nhiệm vụ chính | Một luồng đọc dọc, tối đa hai cột field |
| Cân bằng | 1.440px | 2 nhóm dữ liệu liên quan | Hai vùng song song, tự về một cột dưới 1024px |
| Workspace ngang | 1.760px | Nhiều nhóm hoặc dữ liệu cần đối chiếu | Các section song song, cuộn nội dung độc lập |

Quy tắc chung:

- Label nằm trên input, helper và lỗi nằm dưới input.
- Footer hành động cố định trong Modal, một CTA chính mỗi form.
- Mobile dùng bottom sheet toàn chiều ngang; desktop không vượt viewport trừ padding an toàn.
- Demo dùng field và tên collection từ codebase hiện tại nhưng không ghi Firestore.

## 4. Button chuẩn

| Variant | Mục đích | Trình bày |
|---|---|---|
| Primary | Hoàn tất tác vụ chính | Xanh thương hiệu phẳng, chữ trắng |
| Secondary | Hủy hoặc tác vụ trung tính | Nền trắng, viền neutral |
| Danger | Xóa hoặc từ chối | Đỏ semantic phẳng, chữ trắng |
| Ghost | Hành động cấp thấp | Nền trong, hover neutral |

Mọi variant giữ nguyên API, trạng thái loading, disabled, icon và focus ring hiện có. Nhãn không xuống dòng trên desktop.

## 5. Spacing và shape

- Nhịp cơ sở: 4, 8, 12, 16, 24, 32px.
- Input và Button: radius 8px.
- Card: radius 12px.
- Modal: radius 16px trên desktop, bo đỉnh trên mobile.
- Khoảng field trong cùng nhóm: 12-16px.
- Khoảng giữa các nhóm: 16-24px.
- Padding Modal: 16px mobile, 24px desktop.
- Không dùng bóng lớn cho control; elevation chỉ dành cho Modal và overlay.

## 6. Lộ trình tổng thể

### Giai đoạn A: nền tảng an toàn

- Chốt Button, Modal, Input và spacing token.
- Thêm visual regression cho bốn Button variant và ba cỡ popup.
- Nghiệm thu ở 375, 768, 1024, 1440 và 1920px.

### Giai đoạn B: áp dụng theo module

- Nhóm form ngắn: Môn học, Buổi học, Bộ lọc.
- Nhóm form trung bình: Khóa học, Bài tập, Hóa đơn, Tài khoản.
- Nhóm workspace: Học sinh, Messenger, Giáo án, Lớp học.
- Mỗi module giữ nguyên schema, validation và mutation đang dùng.

### Giai đoạn C: kiểm chứng ba vai trò

- Admin: ưu tiên mật độ và thao tác hàng loạt.
- Giáo viên: ưu tiên lịch, điểm danh và nhập nhanh.
- Phụ huynh/Học sinh: ưu tiên một hành động rõ trên mobile.
- Kiểm tra keyboard, zoom 200%, reduced motion và tương phản WCAG AA.

## 7. Điều kiện nghiệm thu

- Không đổi route, tên field, thứ tự field, query key, Firestore collection hoặc rule.
- Không phát sinh scroll ngang ở viewport từ 320px.
- Không có CTA chính bị xuống dòng ở desktop.
- Typecheck, lint, unit test, rules test và build đạt.
