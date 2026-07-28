# Gói hướng dẫn Meta App Reviewer — EduMatrix

Ngày kiểm tra: 28/07/2026
Ứng dụng Meta: `Edumatrix_VN`
App ID: `1028280243271801`

## 1. Trạng thái đã xác minh

- Website production: `https://edumatrix.id.vn/`
- Login: `https://edumatrix.id.vn/login`
- Privacy Policy: `https://edumatrix.id.vn/privacy`
- Data Deletion: `https://edumatrix.id.vn/data-deletion`
- Messenger Worker health: hoạt động.
- Utility production flag: `false`.
- Hồ sơ giữ 5 quyền:
  - `pages_show_list`
  - `pages_manage_metadata`
  - `pages_utility_messaging`
  - `pages_messaging`
  - `pages_read_engagement`

## 2. Thông tin cần chuẩn bị ngoài repository

Không ghi thông tin đăng nhập hoặc secret vào tài liệu này.

- Email Reviewer thật, còn sử dụng ít nhất 1 năm.
- Mật khẩu riêng chỉ dành cho Meta Reviewer.
- Vai trò EduMatrix đề xuất: `Teacher`.
- Một học sinh thử nghiệm, không dùng dữ liệu trẻ em thật.
- Một tài khoản Facebook thử nghiệm đã nhắn Fanpage.
- Một hội thoại trong cửa sổ phản hồi 24 giờ.
- Một Utility Template đã được Meta duyệt trước khi quay phần Utility.

## 3. Nội dung tiếng Anh để điền vào trường hướng dẫn truy cập

```text
EduMatrix is a web-based education center management system. Meta reviewers can
access the production application at:

https://edumatrix.id.vn/login

Sign in with the dedicated test account provided in the Test Account Credentials
field. The account does not require a paid subscription, OTP, or access to a
personal Google or Facebook account.

After signing in:
1. Select "Chat" from the left navigation.
2. Select the conversation named "Meta Review Test".
3. The conversation displays messages received by the connected Facebook Page
   "Luyện Chữ Đẹp Cô Chi" (Page ID: 100488521748588).
4. Enter a reply in the composer and press Enter. This demonstrates
   pages_messaging within the 24-hour response window.
5. Open the Facebook integration status to see the Page selected by the
   administrator. This demonstrates pages_show_list and the Page information
   used by pages_read_engagement.
6. The Page is subscribed to Messenger webhook events so inbound messages,
   delivery events, and read events can be processed. This demonstrates
   pages_manage_metadata.
7. For pages_utility_messaging, open a test conversation outside the 24-hour
   response window. Free-form input is unavailable. Select the approved Utility
   Template, review its fixed business parameters, and send it to the linked
   test recipient.

EduMatrix does not use Utility Messaging for advertising, promotions,
recruitment, discounts, or unsolicited bulk messaging.
```

## 4. Câu trả lời Facebook Login

Chọn `No` nếu Reviewer đăng nhập EduMatrix bằng Email/Password và EduMatrix
không dùng Facebook Login làm cơ chế đăng nhập website.

Việc kết nối Messenger Page là tích hợp quản trị Page, không đồng nghĩa với
Facebook Login của website.

## 5. Thông tin đăng nhập thử nghiệm

Điền trực tiếp trong Meta Dashboard, không commit:

```text
Login URL: https://edumatrix.id.vn/login
Email: [REVIEWER_EMAIL]
Password: [REVIEWER_PASSWORD]
Role: Teacher
OTP required: No
Paid subscription required: No
```

## 6. Điều kiện trước khi tải video

- Video không chứa Page Access Token, App Secret, Firebase Private Key hoặc
  header xác thực.
- Dữ liệu trong video là dữ liệu thử nghiệm.
- Tên nút và luồng trong video khớp bản production.
- Mỗi quyền xuất hiện rõ trong video và trong phần mô tả.
- Không quay luồng Utility cho tới khi có template được Meta duyệt và gửi thử
  thành công.

## 7. Điểm dừng bắt buộc

Không tự động:

- tích cam kết pháp lý;
- cung cấp credential không được chủ ứng dụng xác nhận;
- bật `UTILITY_MESSAGING_ENABLED=true`;
- bấm `Gửi đi xét duyệt`.
