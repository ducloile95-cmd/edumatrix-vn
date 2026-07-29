# Mẫu Utility EduMatrix V2

Ngày cập nhật: 29/07/2026

## Quy ước chung

- Ngôn ngữ: Tiếng Việt (`vi`)
- Danh mục: `UTILITY`
- Tiêu đề dùng chung:

```text
💬 EduMatrix Thông Báo
```

- Phần kết dùng chung:

```text
Chi tiết truy cập 👇:
```

- Nút URL dùng chung:
  - Nhãn nút: `Edumatrix VN`
  - URL: `https://edumatrix.id.vn/`
- Không đưa URL dạng văn bản vào nội dung vì đã có nút URL.
- Biến chỉ chứa dữ liệu nghiệp vụ, không chứa lời quảng cáo hoặc nội dung tùy ý.

## 1. Liên kết tài khoản phụ huynh

Tên đề xuất: `edumatrix_parent_account_link_confirmation_v2_vi`

Biến:

1. Gmail phụ huynh đăng ký
2. Tên học sinh

```text
💬 EduMatrix Thông Báo

Tài khoản Phụ huynh: {{1}} đã được liên kết với học sinh {{2}}.

Vui lòng truy cập EduMatrix và đăng nhập bằng Gmail đã đăng ký để theo dõi tiến độ học tập của con.

Chi tiết truy cập 👇:
```

## 2. Xác nhận đăng ký học

Tên đề xuất: `edumatrix_enrollment_confirmation_v2_vi`

Biến:

1. Tên học sinh
2. Tên khóa học
3. Tên trường học

```text
💬 EduMatrix Thông Báo

Chào mừng học sinh {{1}} đã tham gia khóa học {{2}} tại {{3}}.

Phụ huynh vui lòng truy cập EduMatrix và đăng nhập bằng Gmail đã đăng ký để xem thông tin khóa học.

Chi tiết truy cập 👇:
```

## 3. Đánh giá buổi học

Tên đề xuất: `edumatrix_lesson_feedback_notice_v2_vi`

Biến:

1. Lớp học
2. Tên học sinh
3. Tên giáo viên

```text
💬 EduMatrix Thông Báo

Lớp {{1}} đã kết thúc. Học sinh {{2}} đã có đánh giá mới từ giáo viên {{3}}.

Phụ huynh vui lòng truy cập EduMatrix và đăng nhập bằng Gmail đã đăng ký để xem chi tiết.

Chi tiết truy cập 👇:
```

## 4. Điều chỉnh lịch học

Tên đề xuất: `edumatrix_class_schedule_adjustment_v2_vi`

Biến:

1. Lớp học
2. Tên học sinh
3. Ngày học mới
4. Giờ học mới
5. Nội dung điều chỉnh

```text
💬 EduMatrix Thông Báo

Lịch học của lớp {{1}} dành cho học sinh {{2}} đã được điều chỉnh sang ngày {{3}}, lúc {{4}}.

Nội dung điều chỉnh: {{5}}.

Phụ huynh vui lòng truy cập EduMatrix và đăng nhập bằng Gmail đã đăng ký để xem chi tiết.

Chi tiết truy cập 👇:
```

## 5. Thanh toán học phí thành công

Tên đề xuất: `edumatrix_tuition_payment_confirmation_v2_vi`

Biến:

1. Tên học sinh
2. Kỳ học phí
3. Số tiền
4. Ngày thanh toán
5. Mã giao dịch

```text
💬 EduMatrix Thông Báo

EduMatrix trân trọng xác nhận đã ghi nhận khoản học phí của học sinh {{1}} cho kỳ {{2}}.

Số tiền: {{3}}
Ngày thanh toán: {{4}}
Mã giao dịch: {{5}}

Cảm ơn Phụ huynh đã hoàn tất thanh toán.

Chi tiết truy cập 👇:
```

## 6. Nhắc học phí

Tên đề xuất: `edumatrix_tuition_payment_reminder_v2_vi`

Biến:

1. Tên học sinh
2. Kỳ học phí
3. Số tiền
4. Hạn thanh toán

```text
💬 EduMatrix Thông Báo

EduMatrix kính gửi Phụ huynh thông tin học phí của học sinh {{1}} cho kỳ {{2}}.

Số tiền: {{3}}
Hạn thanh toán: {{4}}

Phụ huynh vui lòng truy cập EduMatrix để tiến hành thanh toán học phí trực tuyến. Nếu đã thanh toán, vui lòng bỏ qua thông báo này.

Chi tiết truy cập 👇:
```

## Trình tự triển khai an toàn

1. Tạo sáu mẫu V2 trên Meta theo đúng nội dung và thứ tự biến trong tài liệu này.
2. Thêm nút URL `Edumatrix VN` trỏ tới `https://edumatrix.id.vn/` cho từng mẫu.
3. Chờ cả sáu mẫu có trạng thái `APPROVED`.
4. Cập nhật tên mẫu và ánh xạ biến trong Worker.
5. Kiểm thử payload cho từng mẫu.
6. Bật `UTILITY_MESSAGING_ENABLED=true`, triển khai production và gửi thử một tin.
7. Chỉ xóa mẫu cũ sau khi mẫu V2 đã gửi thành công trên production.
