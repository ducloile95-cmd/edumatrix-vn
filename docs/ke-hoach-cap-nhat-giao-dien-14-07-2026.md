# Kế hoạch cập nhật giao diện Edumatrix VN

Ngày lập: 14/07/2026

## Design Read

Giao diện này là product UI cho hệ thống quản lý lớp học, phục vụ Admin, Giáo viên và Phụ huynh/Học sinh. Hướng thiết kế phù hợp là thao tác nhanh, mật độ thông tin vừa cao, chuyển cảnh mượt, ít trang trí, ưu tiên bảng dữ liệu rõ và popup nhập liệu ổn định.

Dial thiết kế:

- `DESIGN_VARIANCE: 4` vì đây là dashboard thao tác, cần nhất quán hơn là phá cách.
- `MOTION_INTENSITY: 5` vì yêu cầu tăng độ mượt nhưng vẫn phải tôn trọng `prefers-reduced-motion`.
- `VISUAL_DENSITY: 7` vì danh sách học sinh và bộ lọc cần đọc nhanh trong môi trường vận hành.

## Chuẩn giao diện áp dụng khi triển khai

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

## Phạm vi A: Áp dụng cho 3 role tài khoản

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

## Phạm vi B: Áp dụng cho Admin và Giáo viên

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

## Thứ tự triển khai sau khi duyệt demo

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

## Trạng thái triển khai hiện tại

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

## Rủi ro cần xử lý

- Data model `StudentDoc` hiện chưa chứa trực tiếp số điện thoại/email/Facebook phụ huynh. Cần lấy từ `users/{uid}` hoặc bổ sung profile phụ huynh.
- `ClassDoc` hiện chưa có mã lớp riêng trong type, cần xác nhận dùng document id hay thêm field `classCode`.
- Popup khóa 970x650 phù hợp desktop, nhưng nên có fallback responsive cho màn hình nhỏ để không vỡ layout.
- Một số file hiện có dấu hiệu mojibake tiếng Việt, nên kiểm tra encoding trước khi sửa trực tiếp.

## Demo

Demo trước triển khai nằm tại:

`docs/edumatrix-ui-update-demo-14-07-2026.html`
