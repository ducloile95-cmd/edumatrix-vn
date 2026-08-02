# Hồ sơ chuẩn bị xét duyệt Meta Messenger Utility

Ngày chuẩn bị: 27/07/2026
Ứng dụng: `Edumatrix_VN`

## 1. Trạng thái hiện tại

- Ứng dụng đang hoạt động.
- Callback webhook production đã cấu hình:
  `https://edumatrix-messenger-production.edumatrix-vn.workers.dev/webhook`
- Các webhook Messenger cần thiết đã được đăng ký, gồm tin nhắn, trạng thái giao/đọc,
  postback, referral và trạng thái template.
- `pages_messaging` và `page_utility_messaging` đang ở trạng thái sẵn sàng thử nghiệm,
  nhưng hồ sơ App Review vẫn chưa gửi.
- Worker đã có nhánh Utility được bảo vệ bằng feature flag. Production mặc định
  `UTILITY_MESSAGING_ENABLED=false`.

## 2. Quyền đề nghị giữ trong hồ sơ Messenger

Chỉ giữ các quyền có thể giải thích trực tiếp bằng luồng EduMatrix:

1. `pages_messaging`
   - Nhận tin nhắn phụ huynh gửi tới Fanpage.
   - Cho Admin/Teacher được phân quyền trả lời trong EduMatrix.
2. `page_utility_messaging`
   - Gửi template Utility đã được Meta duyệt khi ngoài cửa sổ phản hồi 24 giờ.
3. `pages_manage_metadata`
   - Đăng ký và vận hành webhook của Page.
4. `pages_read_engagement`
   - Đọc thông tin Page cần thiết cho luồng kết nối và đối soát.
5. `pages_show_list`
   - Cho quản trị viên chọn đúng Page mà họ quản lý khi kết nối.

Các quyền Ads, WhatsApp, Marketing API hoặc quyền không xuất hiện trong video kiểm thử
Messenger cần được gỡ khỏi **hồ sơ xét duyệt lần này**. Việc này không đồng nghĩa xóa
sản phẩm hay cấu hình đang dùng khỏi ứng dụng.

## 3. Mô tả trường hợp sử dụng để gửi Meta

EduMatrix là hệ thống quản lý trung tâm giáo dục. Phụ huynh chủ động nhắn tin tới
Fanpage của trung tâm. Webhook chuyển tin nhắn vào module Chat để nhân viên hoặc giáo
viên có quyền trả lời và theo dõi hội thoại.

Khi cửa sổ phản hồi 24 giờ đã hết, EduMatrix không cho nhập nội dung tự do. Hệ thống
chỉ cho chọn một template Utility đã được Meta phê duyệt, điền các tham số nghiệp vụ
cố định và gửi cho đúng phụ huynh đã liên kết với học sinh.

Các mục đích dự kiến:

- nhắc một khoản học phí đang đến hạn;
- xác nhận khoản học phí đã thanh toán;
- thông báo điều chỉnh lịch học;
- xác nhận đăng ký học;
- xác nhận liên kết tài khoản phụ huynh;
- yêu cầu đánh giá buổi học, chỉ sử dụng nếu Meta chấp thuận đúng nhóm Utility.

Không sử dụng Utility để tuyển sinh, quảng cáo, giảm giá hoặc gửi hàng loạt.

## 4. Kịch bản video kiểm thử

Quay một video liền mạch, có lời hoặc chú thích tiếng Anh:

1. Đăng nhập EduMatrix bằng tài khoản reviewer/Admin.
2. Mở `Chat`.
3. Từ tài khoản Facebook test, gửi tin nhắn mới tới Fanpage.
4. Chứng minh tin nhắn xuất hiện trong EduMatrix.
5. Mở hội thoại và trả lời trong cửa sổ 24 giờ.
6. Mở một hội thoại test đã ngoài 24 giờ.
7. Chứng minh ô nhập tự do bị khóa.
8. Chọn một template Utility đã được duyệt.
9. Điền các tham số bắt buộc và xem trước nội dung.
10. Gửi template và chứng minh tài khoản Facebook test nhận được.
11. Mở nhật ký gửi để chứng minh trạng thái gửi được đối soát.
12. Minh họa Teacher chỉ nhìn thấy học sinh và template thuộc phạm vi được cấp.

Không để token, App Secret, private key, email riêng tư hoặc DevTools chứa header xác
thực xuất hiện trong video.

## 5. Tài khoản và dữ liệu reviewer

Chuẩn bị riêng trước khi gửi:

- URL đăng nhập production;
- tài khoản reviewer không yêu cầu OTP cá nhân;
- mật khẩu tạm dành riêng cho reviewer;
- một học sinh test;
- một phụ huynh/Facebook test đã liên kết;
- một hội thoại trong 24 giờ;
- một hội thoại hoặc dữ liệu test ngoài 24 giờ;
- hướng dẫn ngắn để tới module Chat.

Không ghi thông tin đăng nhập reviewer vào repository này.

## 6. Template pilot

Ưu tiên gửi và kiểm thử theo thứ tự:

1. `class_schedule_adjustment`
2. `tuition_payment_confirmation`
3. `tuition_payment_reminder`
4. `enrollment_confirmation`
5. `parent_account_link_confirmation`
6. `lesson_feedback_request` — nộp riêng vì có nguy cơ bị xem là tương tác/engagement.

Mỗi template cần lưu lại:

- tên template chính xác trên Meta;
- ngôn ngữ;
- trạng thái;
- danh sách tham số theo đúng thứ tự;
- ngày nộp/duyệt;
- lý do từ chối nếu có.

## 7. Cổng an toàn trước khi bật production

Chỉ đổi `UTILITY_MESSAGING_ENABLED=true` sau khi đồng thời đạt:

- quyền Utility được Meta phê duyệt cho môi trường live;
- ít nhất một template có trạng thái `APPROVED`;
- tên và thứ tự tham số trong Worker khớp Meta;
- UAT thành công với Page và tài khoản test;
- inbound và trả lời 24 giờ không hồi quy;
- có phương án đặt lại flag về `false` ngay khi cần.

## 8. Các thao tác cần chủ ứng dụng xác nhận

Trước khi thao tác trên Meta Dashboard cần xác nhận riêng:

1. Cho phép gỡ các quyền không liên quan khỏi hồ sơ App Review đang ở trạng thái
   `Chưa gửi`.
2. Cho phép tạo/nộp từng Utility Template.
3. Cho phép bấm `Gửi xét duyệt` cho hồ sơ App Review.

Không thực hiện ba thao tác trên chỉ dựa vào tài liệu kế hoạch.
