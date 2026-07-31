# Kế hoạch rà soát và thiết kế lại Điểm danh theo buổi

Ngày lập: 31/07/2026  
Phạm vi: Module Điểm danh, nhánh Điểm danh theo buổi  
Vai trò: Admin và Teacher  
Trạng thái: Chờ duyệt, chưa tích hợp vào ứng dụng

## 1. Mục tiêu

- Bảo đảm luồng chọn buổi, tải danh sách lớp, ghi trạng thái, tổng hợp và thông báo hoạt động đúng cho Admin và Teacher.
- Làm rõ quan hệ giữa Điểm danh, Lịch học, Lớp học, Học viên, Tương tác lớp học, Thông báo và Dashboard.
- Giảm thao tác lặp khi điểm danh trên desktop và điện thoại.
- Không đổi route, collection, giá trị enum hoặc cấu trúc điều hướng nếu chưa được duyệt.

## 2. Tiêu chí nghiệm thu

1. Teacher chỉ nhìn thấy và chỉnh sửa các buổi thuộc lớp được phân công.
2. Admin có thể xem toàn bộ, lọc theo lớp và biết rõ khi đang điều chỉnh dữ liệu đã lưu.
3. Mỗi bản ghi điểm danh phải khớp `sessionId`, `classId` và học sinh thuộc roster của lớp.
4. Tóm tắt điểm danh luôn khớp số bản ghi hiện tại và không bị ghi đè sai từ module Tương tác lớp học.
5. Sửa từ vắng/đi muộn sang có mặt/có phép không để lại thông báo cảnh báo cũ.
6. Đăng ký nghỉ cho học sinh học nhiều lớp phải chọn đúng lớp, không tự lấy `currentClassIds[0]`.
7. Thay đổi chưa lưu được hiển thị rõ, không bị mất do refetch hoặc đổi buổi.
8. Có loading, empty, error, success và đường phục hồi; thao tác bàn phím và mobile đạt yêu cầu.

## 3. Bản đồ kết nối hiện tại

```text
AttendancePage
  ├─ AttendanceOverview
  │   └─ getAttendanceOverview
  │       ├─ sessions
  │       ├─ classes
  │       ├─ students
  │       ├─ attendance
  │       └─ attendance_summaries
  ├─ AttendanceMarkPanel
  │   ├─ sessions -> class -> course
  │   ├─ class.studentIds -> students
  │   ├─ attendance theo session
  │   ├─ lịch sử attendance theo student
  │   └─ saveAttendance -> attendance + announcements + attendance_summaries
  └─ RegisterLeaveForm
      └─ student -> class -> future sessions -> registerLeave

ClassroomInteractionPage
  └─ saveClassroomDraft
      ├─ session_interactions
      ├─ session_student_reviews
      ├─ attendance
      └─ attendance_summaries
```

## 4. Phát hiện cần xử lý

### P0 - Tính toàn vẹn dữ liệu chưa được Rules ràng buộc đủ

`attendance` hiện kiểm tra quyền trên `classId` do client gửi nhưng chưa xác nhận:

- session thực sự thuộc class đó;
- student thực sự thuộc roster của class;
- summary có cùng class với session.

Hệ quả: client có quyền trên một lớp có thể tạo dữ liệu mang `sessionId` hoặc `studentId` không thuộc lớp đó. Đây là vấn đề tính toàn vẹn, không chỉ là UI.

Đề xuất:

- bổ sung helper Rules xác minh session-class và student-roster;
- thêm emulator tests cho đúng/sai session, class, student;
- service kiểm tra đầu vào trước khi batch để trả lỗi dễ hiểu.

### P0 - Hai module cùng ghi attendance nhưng không cùng quy tắc thông báo

`saveAttendance` ghi cảnh báo cho vắng/đi muộn. `saveClassroomDraft` cũng ghi `attendance` và `attendance_summaries` nhưng không đồng bộ cảnh báo tương ứng.

Hệ quả:

- cùng một trạng thái có thể tạo kết quả thông báo khác nhau tùy màn hình được dùng;
- bản nháp Tương tác lớp học có thể ghi đè điểm danh đã lưu;
- `attendance_summaries` có hai nguồn ghi độc lập.

Đề xuất:

- tạo một service miền dùng chung cho upsert attendance và rebuild summary;
- quy định nguồn dữ liệu ưu tiên và thời điểm Tương tác lớp học được phép cập nhật;
- thêm test liên module cho hai thứ tự thao tác.

### P1 - Cảnh báo cũ không được thu hồi khi đổi trạng thái

Khi bản ghi đổi từ `absent`/`late` sang `present`/`excused`, document `announcements/attendance_{sessionId}_{studentId}` vẫn còn. Rules hiện không cho xóa.

Đề xuất:

- dùng trạng thái vòng đời cho announcement như `active`/`resolved`, hoặc cho phép xóa có kiểm soát;
- chỉ hiển thị cảnh báo đang còn hiệu lực;
- test cả các chuyển trạng thái.

### P1 - Truy vấn chi tiết theo buổi của Teacher thiếu bằng chứng scope

`listAttendanceBySession(sessionId)` chỉ lọc `sessionId`, trong khi quyền Teacher được xác định qua `classId`. Các truy vấn danh sách khác đã chủ động thêm `classId == ...`.

Đề xuất:

- đổi API thành `listAttendanceBySession(sessionId, classId)`;
- query đồng thời theo `classId` và `sessionId`;
- bổ sung emulator test cho query của Teacher, không chỉ test `getDoc`/`updateDoc`.

### P1 - Đăng ký nghỉ chọn sai lớp với học sinh học nhiều lớp

Form đang dùng `selectedStudent.currentClassIds[0]`. Người dùng không thể chọn lớp khi học sinh thuộc nhiều lớp.

Đề xuất:

- thứ tự chọn: học sinh -> lớp đang học -> buổi sắp tới;
- chỉ tự chọn lớp nếu đúng một lựa chọn;
- xóa session đã chọn khi student hoặc class thay đổi.

### P1 - Có thể mất thay đổi chưa lưu

Effect dựng lại `entries` khi dữ liệu attendance hoặc roster refetch. Không có dirty guard khi đổi session/tab hoặc dữ liệu nền cập nhật.

Đề xuất:

- lưu `baselineEntries` và `draftEntries` riêng;
- cảnh báo xác nhận trước khi đổi buổi nếu draft bẩn;
- sau save thành công mới cập nhật baseline;
- tránh refetch ghi đè draft đang chỉnh.

### P2 - Mặc định toàn bộ là có mặt có rủi ro thao tác

Khi chưa có dữ liệu, mọi học sinh được khởi tạo `present`. Một lần bấm lưu có thể xác nhận cả lớp dù người dùng chưa rà soát.

Đề xuất:

- dùng trạng thái UI `unmarked` trước khi lưu lần đầu, không thêm enum Firestore;
- nút “Tất cả có mặt” là bulk action có feedback và Undo;
- chỉ bật lưu khi mọi học sinh đã được xác nhận.

### P2 - Hiệu năng và tải dữ liệu

- Tải sessions trong khoảng 360 ngày cho selector.
- Tải toàn bộ students và courses rồi lọc client.
- Lịch sử của mọi học sinh được tải ngay cả khi chưa cần.

Đề xuất:

- ưu tiên “Hôm nay”, “Chưa hoàn tất”, “Gần đây”; tải thêm theo nhu cầu;
- dùng class roster làm nguồn học sinh, không tải danh mục rộng;
- lịch sử chuyên cần tải theo lớp/batch và cache theo class.

### P2 - Định nghĩa tỷ lệ chuyên cần chưa thống nhất

Màn hình theo buổi tính mọi trạng thái trừ `absent` là đã tham gia; Overview cũng cộng `excused` vào “chuyên cần”. Dashboard có nơi chỉ tính `present`.

Đề xuất cần duyệt nghiệp vụ:

- Chuyên cần tham gia: `(present + late) / (total - excused)`; hoặc
- Tuân thủ: `(present + late + excused) / total`.

UI nên ghi rõ công thức, không dùng cùng nhãn cho hai chỉ số khác nhau.

## 5. Hướng thiết kế đề xuất

Design read: giao diện tác nghiệp giáo dục cho Admin và Teacher, ưu tiên tốc độ, rõ trạng thái và độ tin cậy; giữ hệ màu Edumatrix và React/Tailwind hiện có.

Thiết lập:

- Design variance: 4/10
- Motion intensity: 3/10
- Visual density: 8/10
- Theme: light
- Accent: primary blue hiện tại
- Status colors: xanh lá, vàng, xanh dương và đỏ chỉ dùng theo nghĩa trạng thái
- Radius: input 8px, card 12px, modal 16px

### Cấu trúc desktop

1. Cột buổi học: Hôm nay, Cần hoàn tất, Gần đây.
2. Header ngữ cảnh: lớp, thời gian, phòng, giáo viên, trạng thái buổi.
3. Thanh tiến độ: đã xác nhận / tổng số; số có mặt, muộn, có phép, vắng.
4. Toolbar: tìm kiếm, lọc trạng thái, bulk “Tất cả có mặt”.
5. Roster: học sinh, 4 trạng thái, tín hiệu chuyên cần, ghi chú.
6. Thanh lưu sticky chỉ xuất hiện khi có thay đổi.

### Khác biệt theo vai trò

Teacher:

- mặc định vào buổi gần nhất của lớp được phân công;
- không thấy lớp ngoài phạm vi;
- CTA “Lưu điểm danh”;
- tập trung thao tác nhanh trên điện thoại.

Admin:

- lọc toàn bộ lớp/giáo viên;
- hiển thị người điểm danh và thời điểm cập nhật;
- khi sửa dữ liệu đã lưu, có nhãn “Điều chỉnh quản trị”;
- CTA “Lưu điều chỉnh”, ghi audit log ở giai đoạn tích hợp.

### Mobile

- danh sách buổi chuyển thành select ở đầu trang;
- mỗi học sinh là một khối gọn, status là lưới 2x2;
- thanh lưu nằm trên bottom navigation;
- tối thiểu 44px cho mọi touch target;
- không có vùng cuộn ngang.

## 6. Kế hoạch triển khai sau khi duyệt

### Giai đoạn A - Khóa logic và test

1. Thống nhất công thức chuyên cần và quyền Admin sửa điểm danh.
2. Viết emulator tests cho session-class-student và Teacher list query.
3. Viết unit/integration tests cho stale announcement, multi-class leave và xung đột Classroom Interaction.

### Giai đoạn B - Sửa service và Rules

1. Tạo API truy vấn theo `sessionId + classId`.
2. Gom logic ghi attendance/summary dùng chung.
3. Thêm vòng đời cảnh báo.
4. Bổ sung validation Rules và index nếu emulator báo cần.

### Giai đoạn C - Tích hợp UI đã duyệt

1. Tách `SessionPicker`, `AttendanceToolbar`, `AttendanceRoster`, `AttendanceSaveBar`.
2. Thêm dirty state, confirm đổi buổi, Undo bulk action.
3. Áp dụng biến thể Admin/Teacher theo role hiện tại.
4. Giữ nguyên route `/attendance` và tab hiện có.

### Giai đoạn D - Xác minh

1. Unit tests và component tests cho loading/empty/error/success.
2. Rules emulator cho Admin, assigned Teacher, unassigned Teacher.
3. Kiểm tra 375, 768, 1024 và 1440px.
4. Kiểm tra bàn phím, focus, contrast và reduced motion.
5. Chạy typecheck, test, build và mojibake check.

## 7. Ngoài phạm vi vòng duyệt

- Không thay đổi Firestore Rules.
- Không sửa service production.
- Không thay component React hiện tại.
- Không đổi route hoặc navigation.
- Không gửi thông báo thật.
- Demo chỉ dùng dữ liệu mẫu trong trình duyệt.

