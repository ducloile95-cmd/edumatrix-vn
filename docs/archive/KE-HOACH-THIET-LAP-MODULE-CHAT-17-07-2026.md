# Kế hoạch thiết lập module Chat

Ngày lập: 17/07/2026

## 1. Kết luận audit hiện trạng

Module Staff tại `/app/announcements` hiện có hai chức năng:

1. Đăng nội dung và liên kết lên Facebook Page qua `POST /api/messenger/post`.
2. Chọn học sinh và gửi Messenger một chiều tới phụ huynh đã liên kết qua `POST /api/messenger/send`.

Hệ thống hiện chưa phải một module chat hoàn chỉnh:

- Chưa lưu tin nhắn đến từ webhook.
- Chưa có danh sách hội thoại hoặc lịch sử hội thoại.
- Chưa có trạng thái chưa đọc, đã đọc, đang gửi và gửi thất bại theo từng hội thoại.
- `message_outbox` chỉ là nhật ký gửi, giao diện chưa đọc collection này.
- Webhook hiện chỉ dùng referral để liên kết PSID với tài khoản.
- Worker hiện chỉ kiểm tra tài khoản là Staff, chưa kiểm tra giáo viên có được phân công với `studentId` hay không.
- Rules hiện cho mọi Staff đọc toàn bộ `message_outbox`, chưa giới hạn theo người gửi hoặc lớp được phân công.
- Staff không có notification feed trên chuông topbar. Viewer mới đọc `announcements` theo học sinh.
- Khi thiếu `VITE_MESSENGER_WORKER_URL`, toàn bộ thao tác Facebook và Messenger bị khóa.

Collection `announcements` hiện là kênh thông báo nội bộ, được sinh từ điểm danh, bài tập và thay đổi lịch. Đây không phải dữ liệu chat.

## 2. Quyết định về tên và điều hướng

### Staff

- Đổi nhãn `Thông báo` thành `Chat`.
- Đặt `Chat` trong phân hệ `Chức năng`, sau `Bài tập & Điểm`.
- Loại mục `Tương tác lớp học` đang bị khóa để tránh hai mục cùng ý nghĩa.
- Route chuẩn mới: `/app/chat`.
- Route cũ `/app/announcements` chỉ redirect tới `/app/chat` để giữ bookmark.

### Phụ huynh và học sinh

- Giữ tên `Thông báo` tại `/portal/announcements`.
- Giữ chuông topbar là `Thông báo`.
- Không gọi hai bề mặt này là Chat vì người dùng chỉ đọc thông báo hệ thống, chưa đối thoại trong portal.

## 3. Phạm vi sản phẩm đề xuất

### Nhánh Hội thoại

- Danh sách hội thoại theo phụ huynh và học sinh.
- Tìm theo tên học sinh, mã học sinh, tên phụ huynh.
- Lọc: tất cả, chưa đọc, cần trả lời, gửi lỗi.
- Hiển thị tin đến và tin đi theo thứ tự thời gian.
- Composer gửi tin văn bản, đếm ký tự và khóa gửi khi chưa đủ điều kiện.
- Hiển thị rõ cửa sổ phản hồi Messenger và nguyên nhân không thể gửi.
- Thử gửi lại tin lỗi theo đúng idempotency key.

### Nhánh Nhật ký gửi

- Đọc `message_outbox` theo trang, không tải toàn bộ collection.
- Lọc theo trạng thái, người gửi, học sinh và thời gian.
- Admin xem toàn bộ. Giáo viên chỉ xem tin của lớp được phân công hoặc do chính mình gửi.

### Nhánh Đăng Fanpage

- Chỉ Admin được sử dụng.
- Giữ như một nhánh phụ trong giai đoạn đầu để không làm mất chức năng hiện có.
- Khi module Marketing được triển khai, chuyển chức năng này sang Marketing.

## 4. Định hướng UI/UX

### Desktop

Sử dụng chat shell ba vùng, không dùng dashboard card lặp lại:

- Cột trái 300 px: tìm kiếm, bộ lọc và danh sách hội thoại.
- Vùng giữa linh hoạt: header người nhận, timeline tin nhắn và composer cố định bên dưới.
- Cột phải 320 px: học sinh, lớp học, phụ huynh liên kết, trạng thái Messenger và tác vụ liên quan.

### Tablet và mobile

- Danh sách hội thoại là màn đầu.
- Chọn hội thoại mở màn chi tiết, có nút quay lại rõ ràng.
- Thông tin học sinh và phụ huynh mở bằng bottom sheet.
- Composer bám đáy vùng nội dung, không bám trực tiếp viewport khi bàn phím mở.

### Ngôn ngữ hình ảnh

- Giữ nền sáng, xanh Edumatrix là màu nhấn duy nhất.
- Tin đến dùng surface trung tính. Tin đi dùng primary tint nhẹ, không dùng gradient trong bong bóng chat.
- Bo góc theo token hiện tại: card, input và button có vai trò riêng nhưng nhất quán.
- Trạng thái online chỉ xuất hiện khi có dữ liệu thật. Không dùng chấm trang trí.
- Chuyển hội thoại và trạng thái gửi dùng opacity/transform 160-220 ms, có reduced-motion.

### Trạng thái bắt buộc

- Loading: skeleton đúng hình danh sách và timeline.
- Empty: chưa có kết nối Messenger, chưa có hội thoại hoặc bộ lọc không có kết quả.
- Error: lỗi đọc Firestore, Worker chưa cấu hình, Meta từ chối, hết cửa sổ phản hồi.
- Offline: giữ nội dung đang soạn trong session storage, không tự gửi lại khi chưa có xác nhận.

## 5. Mô hình dữ liệu đề xuất

### `chat_threads/{threadId}`

- `channel: "messenger"`
- `studentId`
- `parentUid`
- `classId`
- `assignedTeacherIds`
- `lastMessagePreview`
- `lastMessageDirection`
- `lastMessageAt`
- `unreadStaffCount`
- `status: "open" | "resolved" | "blocked"`
- `createdAt`, `updatedAt`

Không lưu Page token hoặc App secret. Không đưa PSID vào document mà giáo viên có thể đọc.

### `chat_threads/{threadId}/messages/{messageId}`

- `direction: "inbound" | "outbound"`
- `text`
- `actorUid`
- `status: "received" | "queued" | "sent" | "failed"`
- `metaMessageId`
- `errorCode`
- `createdAt`, `updatedAt`

Không lưu payload webhook đầy đủ. Chỉ giữ trường cần cho hiển thị, audit và thử lại.

## 6. Chuỗi logic và bảo mật

```text
Phụ huynh gửi Messenger
  -> Meta Webhook
  -> Cloudflare Worker xác minh chữ ký
  -> resolve messenger_connections
  -> ghi chat_threads và inbound message
  -> client đang mở thread nhận snapshot

Staff gửi tin
  -> client gửi Firebase ID token tới Worker
  -> Worker xác minh active staff và phạm vi học sinh
  -> gọi Meta Send API
  -> ghi outbound message và trạng thái
  -> client cập nhật timeline
```

Quy tắc bắt buộc:

- Meta token, App secret và service-account key chỉ nằm trong Worker Secret.
- Client không được tự tạo tin inbound hoặc tự đổi trạng thái `sent`.
- Admin đọc mọi thread.
- Giáo viên chỉ đọc và gửi trong lớp được phân công.
- Viewer không đọc collection chat. Phụ huynh giao tiếp qua Messenger và xem thông báo nội bộ tại portal.
- Rules kiểm tra field allowlist, kiểu dữ liệu, immutable keys và quyền lớp học.
- Mỗi thay đổi Rules phải có Emulator test cho Admin, Teacher được gán, Teacher không được gán và Viewer.

## 7. Giới hạn Firebase Spark

- Không dùng Firebase Cloud Functions.
- Frontend vẫn là client-side. Cloudflare Worker chỉ xử lý tích hợp chứa secret.
- Chỉ `onSnapshot` thread đang mở và tối đa 30 thread gần nhất.
- Mỗi lần tải tối đa 50 message, phân trang bằng cursor.
- Không listener toàn bộ `messages` hoặc toàn bộ `message_outbox`.
- Gộp cập nhật unread/thread summary trong cùng một Worker write flow.
- Không ghi presence hoặc typing indicator liên tục ở giai đoạn đầu.

## 8. Các pha triển khai

### Pha 1: IA và demo UI

- Tạo `/app/chat-demo` với dữ liệu trạng thái rõ là demo.
- Thiết kế đủ desktop, tablet, mobile, loading, empty và Worker chưa cấu hình.
- Không gửi Meta và không ghi Firestore.
- Duyệt bố cục trước khi thay route production.

### Pha 2: Data model, Worker và Rules

- Bổ sung thread/message types và service đọc theo trang.
- Mở rộng webhook để ghi tin đến.
- Ghi tin đi và kết quả gửi vào timeline.
- Thêm Rules, indexes và emulator tests.
- Bổ sung idempotency cho thao tác thử lại.

### Pha 3: Nối production

- Đổi navigation Staff thành Chat và chuyển vào Chức năng.
- Tạo route `/app/chat`, redirect route cũ.
- Nối hội thoại, composer, nhật ký và Admin Page post.
- Giữ Viewer Notifications và chuông topbar không đổi.

### Pha 4: Kiểm thử go-live

- Unit test parser webhook và mapping lỗi.
- Worker tests cho inbound, outbound, quyền role và chữ ký sai.
- Rules tests cho ownership và class assignment.
- QA bàn phím, focus, mobile, reduced-motion và không cấu hình Worker.
- Smoke test một hội thoại Meta thật sau khi có Page, secret và quyền hợp lệ.

## 9. Tiêu chí hoàn thành

- Không còn mục Staff tên `Thông báo` hoặc `Tương tác lớp học` trùng nghĩa.
- Chat nằm đúng phân hệ Chức năng cho Admin và Giáo viên.
- Viewer vẫn đọc được thông báo điểm danh, bài tập và lịch học.
- Hội thoại chỉ hiển thị dữ liệu thật, không có inbox giả.
- Giáo viên không đọc được thread ngoài lớp được phân công.
- Worker tắt không làm sập ứng dụng và nội dung đang soạn không bị mất.
- Không có token hoặc secret trong bundle, Firestore hoặc console log.
- Build, lint, unit tests, Worker tests và Rules tests đều đạt.

## 10. Phạm vi chờ duyệt

Khuyến nghị duyệt Pha 1 trước. Demo sẽ tập trung vào chat hai chiều thật trong tương lai, nhưng chỉ dùng dữ liệu mẫu được gắn nhãn và không tác động hệ thống. Sau khi duyệt UI mới triển khai schema, Worker và Rules.
