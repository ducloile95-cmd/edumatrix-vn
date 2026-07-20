# Kế hoạch nâng cấp Module Tương tác lớp học

Ngày lập: 20/07/2026  
Phạm vi: Role Teacher, Role Admin giám sát, Role Viewer nhận thông tin  
Trạng thái: Kế hoạch đề xuất, chưa triển khai mã nguồn

## 1. Mục tiêu

Tạo một workspace theo từng buổi học để giáo viên thực hiện liên tục các công việc:

1. Mở đúng buổi học theo lịch được phân công.
2. Ghi nhận chuyên cần và tình trạng bài tập buổi trước.
3. Viết tổng kết nhanh, nội dung đã dạy và bài tập về nhà.
4. Phát hành thông tin riêng theo từng học sinh.
5. Tạo thông báo trong Edumatrix và gửi Messenger theo cơ chế độc lập.
6. Chuẩn bị tổng kết khóa khi khóa học gần kết thúc.

Demo UI/UX: [edumatrix-ui-classroom-interaction-demo-20-07-2026.html](./Infographic/edumatrix-ui-classroom-interaction-demo-20-07-2026.html)

## 2. Quyết định UI/UX

### 2.1 Vị trí Module

- Sidebar Role Teacher: đặt `Tương tác lớp học` ở đầu nhóm `Chức năng`.
- Dashboard giáo viên: tại `Lịch giảng dạy hôm nay`, dùng hành động `Mở buổi học`, `Tiếp tục` hoặc `Hoàn tất tổng kết` theo trạng thái.
- Lịch học: menu của từng session có hành động `Tương tác lớp học`.
- Chi tiết lớp: bổ sung tab `Nhật ký buổi học` và `Tổng kết khóa`.

Sidebar giúp khám phá chức năng. Dashboard và Lịch học là điểm vào chính vì đã có sẵn `sessionId`, tránh bắt giáo viên chọn lớp và buổi học lần nữa.

### 2.2 Mô hình màn hình

Một trang theo `sessionId`, không dùng wizard nhiều trang:

- Header buổi học: lớp, môn, giờ, địa điểm, buổi thứ bao nhiêu, trạng thái.
- Tiến trình bốn bước: Chuẩn bị, Ghi nhận lớp, Tổng kết, Phát hành.
- Tab `Học sinh`: chuyên cần, bài tập, thao tác hàng loạt.
- Tab `Tổng kết buổi học`: nội dung, nhận xét chung, ngoại lệ cá nhân.
- Tab `Xem trước phụ huynh`: kiểm tra nội dung và kênh phát hành.
- Thanh hành động cố định: lưu nháp và hoàn tất phát hành.

### 2.3 Ngôn ngữ thiết kế

- Targeted evolution, giữ design system Edumatrix hiện tại.
- `DESIGN_VARIANCE: 3`, ưu tiên ổn định và dễ học.
- `MOTION_INTENSITY: 2`, chỉ chuyển trạng thái và phản hồi thao tác.
- `VISUAL_DENSITY: 7`, tối ưu nhập liệu cả lớp.
- Giữ Be Vietnam Pro, primary blue, neutral ấm, radius input 8px, card 12px, modal 16px.
- Không thay đổi logo, nhãn điều hướng hiện hữu hoặc hệ icon Lucide của dự án.

## 3. Luồng nghiệp vụ

### 3.1 Trước và trong buổi học

1. Giáo viên mở session từ Dashboard hoặc Lịch học.
2. Hệ thống xác minh session thuộc lớp giáo viên được phân công.
3. Nạp danh sách học sinh, giáo án đã gắn và bản nháp nếu có.
4. Mặc định hỗ trợ `Tất cả có mặt` và `Tất cả đã làm bài`.
5. Giáo viên chỉ chỉnh học sinh vắng, muộn, làm một phần hoặc chưa làm.
6. Nội dung được tự lưu theo nhịp debounce và có nút lưu chủ động.

### 3.2 Kết thúc buổi học

Điều kiện cho phép phát hành:

- Tất cả học sinh có trạng thái chuyên cần.
- Tất cả học sinh có trạng thái bài tập hoặc `Không giao`.
- Có nội dung đã dạy.
- Có tổng kết nhanh.
- Có bài tập về nhà hoặc xác nhận `Không có bài tập`.
- Học sinh thuộc trường hợp ngoại lệ có nhận xét cá nhân hoặc xác nhận không cần nhận xét.

Khi giáo viên chọn `Hoàn tất và phát hành`:

1. Hiển thị màn hình kiểm tra cuối.
2. Lưu phiên bản bất biến của tổng kết buổi học.
3. Tạo thông báo riêng cho từng học sinh.
4. Cập nhật session sang trạng thái hoàn tất.
5. Đưa tác vụ Messenger vào hàng đợi nếu phụ huynh đã liên kết.
6. Hiển thị kết quả từng kênh, không gộp thành một trạng thái thành công duy nhất.

## 4. Dữ liệu đề xuất

### 4.1 `session_interactions/{sessionId}`

| Trường | Ý nghĩa |
|---|---|
| `sessionId`, `classId`, `courseId` | Liên kết nghiệp vụ |
| `teacherId` | Giáo viên thực hiện |
| `workflowStatus` | `draft`, `ready`, `published`, `amended` |
| `lessonPlanId` | Giáo án liên kết |
| `taughtContent` | Nội dung đã dạy |
| `quickSummary` | Tổng kết nhanh |
| `homeworkText` | Bài tập về nhà |
| `assignmentId` | Assignment được tạo, nếu có |
| `publishedAt`, `publishedBy` | Thông tin phát hành |
| `version` | Phiên bản chỉnh sửa |
| `createdAt`, `updatedAt` | Audit thời gian |

### 4.2 `session_student_reviews/{sessionId_studentId}`

| Trường | Ý nghĩa |
|---|---|
| `sessionId`, `classId`, `studentId` | Khóa liên kết |
| `attendanceStatus` | Dùng cùng quy ước Attendance hiện tại |
| `previousHomeworkStatus` | `done`, `partial`, `not_done`, `not_assigned` |
| `individualComment` | Nhận xét riêng |
| `notificationId` | Thông báo đã sinh |
| `publishedVersion` | Phiên bản đã gửi phụ huynh |
| `updatedAt`, `updatedBy` | Audit |

### 4.3 `course_student_summaries/{courseId_studentId}`

- Chỉ số tổng hợp chuyên cần, bài tập và điểm.
- Điểm mạnh, nội dung cần cải thiện, đề xuất học tiếp.
- Trạng thái `draft`, `ready`, `published`, `amended`.
- Snapshot dữ liệu nguồn tại thời điểm phát hành.

### 4.4 Tái sử dụng collection hiện có

- `sessions`: trạng thái lịch học và liên kết session.
- `attendance`: dữ liệu chuyên cần chuẩn.
- `assignments`: bài tập về nhà có theo dõi nộp bài.
- `announcements`: thông báo Role Viewer theo `studentId`.
- `message_outbox`: nhật ký gửi Messenger.
- `audit_logs`: lịch sử hoàn tất và sửa sau phát hành.

Không dùng Messenger làm nguồn dữ liệu chính. Thông báo Edumatrix phải được tạo thành công trước khi xử lý kênh Messenger.

## 5. Phân quyền và bảo mật

- Teacher chỉ đọc và ghi session của lớp có UID trong `teacherIds`.
- Teacher không được thao tác session đã hủy.
- Viewer chỉ đọc thông báo có `studentId` thuộc học sinh liên kết với UID.
- Admin đọc được toàn bộ, có quyền mở lại bản phát hành theo quy trình audit.
- Sửa sau phát hành bắt buộc lý do, tăng version và tạo thông báo cập nhật mới.
- Không cho client ghi `messenger_connections`.
- Messenger tiếp tục đi qua Cloudflare Worker với Firebase ID token.
- Không gửi nội dung của cả lớp hoặc học sinh khác cho phụ huynh.

## 6. Messenger và thông báo

### 6.1 Nguyên tắc giao dịch

Kết quả tách thành ba trạng thái:

1. `interactionSaved`: tổng kết buổi học đã lưu.
2. `notificationCreated`: thông báo Edumatrix đã tạo.
3. `messengerQueued` hoặc `messengerFailed`: trạng thái kênh ngoài.

Không rollback dữ liệu lớp học khi Messenger thất bại.

### 6.2 Chống gửi trùng

- Dùng idempotency key theo `sessionId_studentId_version_channel`.
- Nút phát hành bị khóa trong khi xử lý.
- Mỗi lần sửa sau phát hành tạo version mới.
- Gửi lại chỉ áp dụng cho người nhận thất bại và ghi audit.

### 6.3 Ràng buộc vận hành

- Phải kiểm tra chính sách Meta và message tag tại thời điểm triển khai production.
- Phụ huynh chưa liên kết Messenger vẫn nhận thông báo trong Edumatrix.
- UI hiển thị rõ số người nhận Edumatrix, số đã liên kết Messenger và số thất bại.

## 7. Tổng kết khóa học

### 7.1 Điều kiện tạo nháp

Tạo đề xuất khi có ít nhất một điều kiện:

- Còn tối đa 2 buổi.
- Hoàn thành từ 85% tổng số buổi.
- Còn tối đa 14 ngày đến ngày kết thúc.

Hệ thống chỉ tạo bản nháp và giao tác vụ cho giáo viên, không tự phát hành.

### 7.2 Nội dung theo học sinh

- Tổng số buổi, tỷ lệ chuyên cần, số lần vắng và muộn.
- Tỷ lệ hoàn thành bài tập.
- Điểm trung bình và xu hướng.
- Điểm mạnh, nội dung cần cải thiện.
- Nhận xét cuối khóa và khuyến nghị khóa tiếp theo.

### 7.3 Nội dung theo lớp

- Tiến độ chương trình và số buổi đã hoàn tất.
- Chuyên cần, bài tập và điểm trung bình chung.
- Học sinh cần chăm sóc tiếp.
- Báo cáo lớp chỉ dành cho Teacher và Admin.

## 8. Kế hoạch triển khai

### Giai đoạn 1: Nền tảng workspace

- Route và điều hướng theo `sessionId`.
- Dữ liệu `session_interactions` và `session_student_reviews`.
- Chuyên cần, bài tập cũ, tổng kết và bài tập về nhà.
- Lưu nháp, tự lưu, khôi phục khi tải lại.
- Firestore Rules và test phân quyền Teacher.

Điều kiện hoàn thành: giáo viên có thể hoàn tất một buổi mà chưa cần Messenger.

### Giai đoạn 2: Phát hành phụ huynh

- Preview riêng theo học sinh.
- Sinh `announcements` theo `studentId`.
- Portal Viewer hiển thị loại thông báo `session_summary`.
- Trạng thái đã đọc và trang chi tiết.
- Kiểm thử không rò dữ liệu giữa học sinh.

### Giai đoạn 3: Messenger

- Hàng đợi gửi theo từng phụ huynh.
- Idempotency key và retry có kiểm soát.
- Hiển thị đã gửi, thất bại, chưa liên kết.
- Kiểm thử Worker và smoke test production theo chính sách Meta hiện hành.

### Giai đoạn 4: Tổng kết khóa

- Bộ phát hiện khóa gần kết thúc.
- Dữ liệu tổng hợp tiết kiệm lượt đọc Firestore.
- Workspace duyệt và phát hành theo học sinh.
- Báo cáo lớp cho Teacher/Admin.

### Giai đoạn 5: Tối ưu vận hành

- Mẫu nhận xét nhanh.
- Nhắc buổi chưa tổng kết trên Dashboard.
- Hỗ trợ offline ngắn hạn và xử lý xung đột bản nháp.
- Chỉ số thời gian hoàn tất và tỷ lệ gửi thành công.

## 9. Kiểm thử bắt buộc

### Nghiệp vụ

- Buổi chưa bắt đầu, đang diễn ra, đã kết thúc, bị hủy.
- Học sinh mới vào lớp hoặc rời lớp giữa khóa.
- Lớp không có giáo án hoặc không giao bài tập.
- Sửa sau phát hành và gửi lại phiên bản mới.

### Phân quyền

- Teacher khác lớp bị từ chối đọc và ghi.
- Viewer không đọc được thông báo của học sinh khác.
- Client không ghi được kết nối Messenger hoặc outbox đặc quyền.

### Độ tin cậy

- Double click phát hành không tạo dữ liệu trùng.
- Mất mạng trong lúc tự lưu.
- Edumatrix thành công nhưng Messenger thất bại.
- Một phụ huynh có nhiều con và một học sinh có nhiều phụ huynh.

### UI/UX

- Desktop 1440px, laptop 1024px, tablet 768px, mobile 360px.
- Điều hướng bàn phím, focus visible, label input và contrast WCAG AA.
- Reduced motion.
- Loading, empty, error, partial success và read-only published state.

## 10. Tiêu chí nghiệm thu

- Từ Dashboard mở đúng session trong tối đa hai thao tác.
- Giáo viên có thể xử lý lớp 20 học sinh chủ yếu bằng thao tác hàng loạt.
- Bản nháp không mất khi tải lại hoặc kết nối gián đoạn ngắn.
- Không phát hành khi thiếu dữ liệu bắt buộc.
- Phụ huynh chỉ thấy thông tin của con mình.
- Messenger lỗi không làm mất thông báo Edumatrix.
- Không tạo bản ghi hoặc tin nhắn trùng khi thao tác lặp.
- Tổng kết khóa luôn cần giáo viên duyệt trước khi phát hành.
- Mọi thay đổi sau phát hành có version, lý do và audit log.

## 11. Hạng mục không thực hiện trong tài liệu này

- Không sửa route, component React hoặc Firestore Rules.
- Không thay đổi schema production.
- Không deploy Firebase hoặc Cloudflare Worker.
- Không gửi Messenger thật.

Demo HTML chỉ dùng để duyệt hướng UI/UX và luồng thao tác trước khi chốt backlog triển khai.
