# Kế hoạch nâng cấp module Người dùng cho Admin

Ngày lập: 17/07/2026

Trạng thái: Đã được duyệt và triển khai vào module `/app/users` ngày 17/07/2026.

## 1. Mục tiêu và tiêu chí nghiệm thu

- Admin có ba vùng làm việc rõ ràng: Tổng quan, Tài khoản Staff, Phụ huynh/Học sinh.
- Tài khoản Staff hiển thị đúng thứ tự cột được yêu cầu và có thao tác chỉnh sửa.
- Phụ huynh/Học sinh tách thành Đang hoạt động và Được mời.
- Chi tiết phụ huynh hiển thị toàn bộ học sinh được liên kết.
- Dashboard có số tài khoản hoạt động, tỷ lệ chấp nhận lời mời, sức khỏe tài khoản và biểu đồ kết hợp cột + đường.
- Bảng có chiều cao khóa theo viewport, thanh cuộn nằm bên trong bảng.
- Chỉ Admin truy cập được route và dữ liệu quản trị.
- Tương thích Firebase Spark, không dùng Cloud Functions hoặc backend riêng.

## 2. Kiến trúc giao diện đề xuất

### Tổng quan

- Bốn KPI: tài khoản hoạt động, lời mời đã chấp nhận, sức khỏe tài khoản, tần suất sử dụng.
- Biểu đồ kết hợp: cột là số tài khoản hoạt động; đường là tỷ lệ người dùng hoạt động trong ngày.
- Khối sức khỏe chia thành hoạt động tốt, ít sử dụng và đã khóa.
- Hai danh sách ngắn: tài khoản mới; Admin và Giáo viên.

### Tài khoản Staff

Thứ tự cột:

1. Mã tài khoản
2. Tên tài khoản
3. Email đăng nhập
4. Vai trò
5. Trạng thái
6. Đăng ký lần đầu
7. Bắt đầu sử dụng
8. Thao tác

### Phụ huynh/Học sinh

- Nhánh Đang hoạt động: mã, tên, email, lần sử dụng cuối, thao tác.
- Xem thông tin mở chi tiết tài khoản và danh sách học sinh được gắn.
- Nhánh Được mời: email, vai trò, học sinh liên kết, thời gian gửi, trạng thái.

### Form mời tài khoản

- Email đăng nhập và vai trò luôn bắt buộc.
- Trường chọn học sinh chỉ xuất hiện với vai trò Phụ huynh/Học sinh.
- Hiển thị bước kiểm tra an toàn trước khi gửi.
- Trạng thái loading, lỗi, thành công và trùng email phải được xử lý khi triển khai thật.

## 3. Định nghĩa dữ liệu để tránh số liệu sai

- Tài khoản hoạt động realtime: user có `status = active`, cập nhật bằng listener giới hạn ở màn hình Tổng quan.
- Đã chấp nhận lời mời: invite có `status = claimed` chia cho tổng invite hợp lệ.
- Đăng ký lần đầu: `invites.createdAt`.
- Bắt đầu sử dụng: `users.createdAt`, được tạo khi claim lời mời thành công.
- Mã tài khoản: hiển thị mã ổn định từ 6 ký tự đầu của UID, không tạo bộ đếm tuần tự trên client.
- Sức khỏe tài khoản: quy tắc minh bạch từ trạng thái, lần đăng nhập cuối và độ đầy đủ hồ sơ. Không dùng điểm suy đoán không giải thích.
- Tần suất sử dụng: tỷ lệ tài khoản có hoạt động theo ngày. Không gọi là thời lượng nếu chưa có dữ liệu phút sử dụng.

## 4. Bổ sung schema tối thiểu sau khi duyệt

### `invites/{normalizedEmail}`

- Bổ sung type cho `claimedAt?: Timestamp`, dữ liệu thực tế đã được luồng claim ghi.

### `account_activity/{uid_yyyyMMdd}`

- `uid`, `dateKey`, `lastSeenAt`, `activeMinutes`, `updatedAt`.
- Mỗi tài khoản chỉ ghi document của chính mình.
- Gộp theo ngày để giảm số lượt đọc và ghi trên Spark.
- `activeMinutes` chỉ là chỉ số tham khảo vì code client-side không thể chống giả mạo tuyệt đối.

Không tạo collection này nếu Admin chỉ cần tỷ lệ đăng nhập theo `lastLoginAt`. Đây là phương án đơn giản và tiết kiệm nhất.

## 5. Kiểm tra Rules và chuỗi logic

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

## 6. Lộ trình triển khai sau duyệt

1. Chốt giao diện và tên chỉ số từ demo.
2. Tách component Dashboard, StaffTable, FamilyTable, InviteForm.
3. Nâng type cho `claimedAt`, bổ sung query có limit và phân trang.
4. Chỉ thêm `account_activity` nếu duyệt chỉ số theo ngày.
5. Viết Rules và test Rules trước khi nối UI.
6. Kết nối React Query, listener chỉ bật ở tab Tổng quan và hủy khi rời tab.
7. Kiểm thử loading, empty, error, quyền Admin và thao tác khóa tài khoản.
8. Thay `/app/users` sau khi bản demo được duyệt.

## 7. Điểm cần duyệt

- Duyệt cấu trúc ba tab và hai nhánh Phụ huynh/Học sinh.
- Duyệt cách định nghĩa tần suất sử dụng theo ngày thay cho thời lượng phiên.
- Duyệt mã tài khoản rút gọn từ UID.
- Duyệt form mời và khối chi tiết học sinh liên kết.
