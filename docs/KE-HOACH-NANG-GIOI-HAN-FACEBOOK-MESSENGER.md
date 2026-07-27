# Kế hoạch tổng thể nâng giới hạn Facebook Messenger

## 1. Mục đích

Mở rộng EduMatrix để có thể gửi một số thông báo hợp lệ sau cửa sổ phản hồi 24 giờ của Facebook Messenger mà không phá vỡ luồng chat hiện tại, không lách chính sách Meta và không thay đổi gói Firebase.

Kế hoạch này ưu tiên **Utility Messages** của Meta cho các thông báo dịch vụ như nhắc học phí, xác nhận thanh toán, thay đổi lịch học và cập nhật tài khoản.

## 2. Các nguyên tắc không được vi phạm

1. Giữ nguyên Firebase Spark Plan; **không nâng Blaze**.
2. Không thêm Firebase Functions, Cloud Scheduler, Pub/Sub hoặc Firebase Extension.
3. Không tạo Worker mới nếu Worker hiện tại đáp ứng được.
4. Không đổi Callback URL hoặc làm gián đoạn webhook đang hoạt động.
5. Không xóa hoặc migration phá vỡ dữ liệu Firestore hiện có.
6. Không đưa Meta token, App Secret hoặc Firebase private key vào frontend.
7. Không dùng Utility Message cho quảng cáo, khuyến mại hoặc tuyển sinh.
8. Không tự động đổi Utility Message thành Message Tag khác khi Meta từ chối.
9. Không nâng Graph API version trước khi có kiểm thử tương thích.
10. Mọi tính năng mới phải có feature flag và có thể tắt mà không ảnh hưởng chat 24 giờ.

## 3. Hiện trạng hệ thống

### Kiến trúc đang chạy

```text
Phụ huynh Facebook
        |
        | Webhook
        v
Cloudflare Messenger Worker
        |
        | Firestore REST API
        v
Firebase Firestore (Spark)
        ^
        |
        | Firebase Client SDK
        |
EduMatrix Web Client
```

### Khả năng hiện tại

- Nhận tin nhắn từ Fanpage qua webhook.
- Liên kết PSID với phụ huynh và học sinh.
- Gửi tin tự do trong cửa sổ 24 giờ bằng `messaging_type: RESPONSE`.
- Có nhánh `MESSAGE_TAG` cũ.
- Phân quyền Admin và giáo viên theo phạm vi học sinh.
- Lưu thread, message và `message_outbox`.
- Chống webhook trùng theo Meta Message ID.
- Cache Firebase token/certificate.
- Log an toàn và có Cloudflare Version ID trong `/health`.

### Khoảng trống

- Chưa có quyền `page_utility_messaging`.
- Chưa có Utility Template được Meta phê duyệt.
- Worker chưa tạo payload `messaging_type: UTILITY`.
- Webhook chưa đăng ký `message_template_status_update`.
- Frontend chưa có giao diện chọn Utility Template.
- Chưa xác minh Utility Messages với Graph API `v22.0`.
- Chưa có quy trình phân loại nội dung Utility và nội dung marketing.

## 4. Kiến trúc mục tiêu

```text
Người dùng EduMatrix chọn gửi
              |
              v
      Kiểm tra cửa sổ 24 giờ
          /             \
       Còn hạn          Hết hạn
         |                 |
         v                 v
  RESPONSE tự do     Chọn Utility Template
         |                 |
         +--------+--------+
                  v
        Cloudflare Messenger Worker
                  |
       Xác thực + phân quyền + validate
                  |
                  v
             Meta Send API
                  |
                  v
      Lưu kết quả vào message_outbox
```

Luồng cũ không bị thay thế. Utility là một nhánh gửi mới, bị khóa mặc định cho đến khi quyền và template được xác nhận.

## 5. Hợp đồng API mục tiêu

### Tin trong 24 giờ

Giữ tương thích với request hiện tại:

```json
{
  "studentId": "student-id",
  "text": "Nội dung trả lời",
  "deliveryMode": "response"
}
```

Nếu frontend cũ chưa gửi `deliveryMode`, Worker tiếp tục hiểu là `response`.

### Tin ngoài 24 giờ

```json
{
  "studentId": "student-id",
  "deliveryMode": "utility",
  "templateKey": "tuition_payment_reminder",
  "parameters": {
    "studentName": "Nguyễn Văn A",
    "billingPeriod": "Tháng 8/2026",
    "amount": "2.000.000 ₫",
    "dueDate": "05/08/2026"
  }
}
```

Frontend không được truyền trực tiếp tên template Meta tùy ý. Worker ánh xạ `templateKey` nội bộ sang:

- tên template Meta đã duyệt;
- ngôn ngữ;
- danh sách tham số bắt buộc;
- nhóm nghiệp vụ;
- trạng thái bật/tắt.

### Payload gửi Meta

```json
{
  "recipient": {
    "id": "PAGE_SCOPED_ID"
  },
  "messaging_type": "UTILITY",
  "template": {
    "name": "edumatrix_tuition_payment_reminder_vi",
    "language": {
      "code": "vi"
    },
    "components": []
  }
}
```

Payload cuối cùng phải theo đúng schema được Meta chấp thuận tại thời điểm triển khai.

## 6. Danh mục thông báo đề xuất

| Nghiệp vụ | Utility đề xuất | Giai đoạn |
|---|---:|---|
| Nhắc học phí đến hạn | Có | Template pilot |
| Thanh toán học phí thành công | Có | Template pilot |
| Điều chỉnh lịch học: nghỉ học, học bù, học bổ sung | Có | Template pilot |
| Nhắc lịch học/sự kiện đã đăng ký | Có | Sau pilot |
| Cập nhật trạng thái tài khoản | Có | Sau pilot |
| Đánh giá buổi học | Cần Meta xác nhận | Template pilot có điều kiện |
| Xác nhận đăng ký học thành công | Có | Template pilot |
| Liên kết tài khoản phụ huynh thành công | Có | Admin/Hệ thống |
| Đánh giá khóa học | Chưa mặc định | Chỉ trong 24 giờ hoặc kênh khác |
| Thông báo tuyển sinh/khóa mới | Không | Marketing, không dùng Utility |
| Khuyến mại/ưu đãi | Không | Marketing, không dùng Utility |
| Thông báo tổng không phân loại | Không | Phải phân loại trước |

## 7. Lộ trình phát triển

## Giai đoạn 0 — Xác minh Meta trước khi viết code

### Công việc

1. Mở Meta App Dashboard của đúng App và Page.
2. Kiểm tra `pages_messaging` đang hoạt động.
3. Kiểm tra khả năng yêu cầu `page_utility_messaging`.
4. Xác minh Page và người nhận tại Việt Nam đủ điều kiện.
5. Xác minh điều khoản, hạn mức và chi phí hiện hành.
6. Kiểm tra Utility Messages hỗ trợ Graph API version nào.
7. Không thay đổi `META_GRAPH_VERSION` trong production ở giai đoạn này.

### Cổng nghiệm thu

- Nhìn thấy quyền `page_utility_messaging` hoặc quy trình xin quyền rõ ràng.
- Có tài liệu schema payload áp dụng cho phiên bản Graph sẽ dùng.
- Xác định rõ Utility Message có phát sinh phí hay hạn mức nào.
- Nếu không đạt, dừng kế hoạch Utility; luồng 24 giờ vẫn hoạt động bình thường.

## Giai đoạn 1 — Chuẩn bị quyền và sáu template pilot

### Công việc

1. Yêu cầu quyền `page_utility_messaging`.
2. Đăng ký webhook `message_template_status_update`.
3. Tạo sáu template tiếng Việt:
   - `tuition_payment_reminder`: nhắc học phí đến hạn;
   - `tuition_payment_confirmation`: xác nhận thanh toán học phí thành công;
   - `class_schedule_adjustment`: điều chỉnh lịch học do nghỉ học, học bù hoặc học bổ sung;
   - `lesson_feedback_request`: đề nghị phụ huynh đánh giá một buổi học cụ thể;
   - `enrollment_confirmation`: xác nhận đăng ký học thành công;
   - `parent_account_link_confirmation`: xác nhận liên kết tài khoản phụ huynh và hướng dẫn đăng nhập bằng email đã nhận lời mời.
4. Các template chỉ chứa thông tin giao dịch/dịch vụ, không chứa quảng cáo.
5. Template đánh giá buổi học phải được Meta xác nhận là Utility. Nếu bị từ chối hoặc được phân loại là marketing/engagement, không gửi ngoài 24 giờ; chỉ dùng `RESPONSE` trong 24 giờ hoặc chuyển sang thông báo trong EduMatrix/email.
6. Ghi lại:
   - tên template;
   - ngôn ngữ;
   - tham số;
   - trạng thái duyệt;
   - phiên bản nội dung.

### Cổng nghiệm thu

- Quyền đã được cấp.
- Template nhắc học phí, thanh toán thành công, điều chỉnh lịch học và đăng ký học thành công có trạng thái `APPROVED`.
- Template đánh giá buổi học chỉ được kích hoạt nếu có trạng thái `APPROVED` đúng nhóm Utility.
- Webhook nhận được cập nhật trạng thái template.
- Chưa thay đổi hành vi gửi tin của người dùng production.

## Giai đoạn 2 — Mở rộng Worker theo hướng tương thích ngược

### Thay đổi tối thiểu

1. Thêm `deliveryMode: "response" | "utility"` vào request.
2. Mặc định `response` khi field không tồn tại.
3. Thêm allowlist `templateKey` trong Worker.
4. Validate đúng và đủ parameters của từng template.
5. Tạo payload `UTILITY` riêng; không dùng chung builder với `RESPONSE`.
6. Admin và Teacher được dùng Utility theo phân quyền.
7. Teacher chỉ được gửi cho học sinh thuộc phạm vi đang phụ trách.
8. Teacher chỉ được dùng năm template nghiệp vụ học sinh đã được bật cho vai trò Teacher.
9. Template `parent_account_link_confirmation` chỉ dành cho Admin/Hệ thống; Teacher không được sử dụng.
10. Worker không tin dữ liệu lớp/học sinh do frontend truyền; phải kiểm tra lại phạm vi từ Firestore.
11. Giữ nguyên kiểm tra PSID, liên kết học sinh và phân quyền hiện tại.
12. Thêm feature flag công khai:

```text
UTILITY_MESSAGING_ENABLED = "false"
```

13. Không thêm secret mới nếu Meta không yêu cầu.
14. Không thêm Queue, KV, Durable Objects hoặc Firebase Functions.

### Dữ liệu ghi bổ sung

Các field dưới đây là tùy chọn trong `message_outbox`, không migration dữ liệu cũ:

```text
deliveryMode
templateKey
templateName
templateLanguage
templateParameters
templateVersion
metaErrorCode
```

Không ghi Page Access Token hoặc nội dung secret.

### Cổng nghiệm thu

- Request cũ vẫn gửi `RESPONSE` như trước.
- Feature flag tắt thì Worker từ chối Utility bằng mã rõ ràng.
- Template không thuộc allowlist bị chặn trước khi gọi Meta.
- Thiếu hoặc thừa tham số bị chặn.
- Teacher chỉ gửi Utility cho học sinh thuộc phạm vi.
- Teacher ngoài phạm vi bị chặn bằng `student_scope_denied`.
- Teacher không thể gọi template chưa được cấp cho vai trò Teacher.
- Teacher không thể gọi template liên kết tài khoản phụ huynh.
- Worker test và production dry-run đạt.

## Giai đoạn 3 — Giao diện EduMatrix

### Trải nghiệm đề xuất

#### Khi còn trong 24 giờ

- Giữ ô nhập tin nhắn tự do.
- Enter để gửi.
- Hiển thị thời điểm cửa sổ kết thúc.

#### Khi hết 24 giờ

- Khóa gửi văn bản tự do.
- Hiển thị hai lựa chọn:
  1. “Yêu cầu phụ huynh nhắn lại Fanpage”.
  2. “Gửi thông báo tiện ích” nếu feature flag, quyền và template sẵn sàng.
- Người dùng chọn loại thông báo, không nhập Message Tag tùy ý.
- Form chỉ hiển thị các tham số được template cho phép.
- Hiển thị bản xem trước trước khi gửi.

### Phân quyền giao diện

- Admin thấy toàn bộ Utility Template đang hoạt động.
- Teacher thấy Utility Template được cấp cho vai trò Teacher.
- Teacher chỉ chọn được học sinh thuộc lớp/phạm vi đang phụ trách.
- Backend luôn kiểm tra lại quyền, kể cả khi người dùng sửa request bằng DevTools.
- Template bị Meta thu hồi hoặc bị Admin tắt phải biến mất khỏi lựa chọn của cả Admin và Teacher.

### Mã lỗi thân thiện

```text
utility_disabled
utility_permission_missing
utility_template_not_approved
utility_template_not_allowed
utility_parameters_invalid
utility_content_not_allowed
meta_utility_rejected
```

### Cổng nghiệm thu

- Người dùng không thể gửi text tự do ngoài 24 giờ.
- Không thể chỉnh tên template Meta từ trình duyệt.
- Không thể gửi Utility có nội dung marketing.
- Giao diện cũ vẫn hoạt động khi feature flag tắt.

## Giai đoạn 4 — Webhook trạng thái template và audit

### Công việc

1. Nhận `message_template_status_update`.
2. Xác minh chữ ký webhook như sự kiện tin nhắn hiện tại.
3. Chỉ lưu dữ liệu cần thiết:
   - tên template;
   - trạng thái;
   - lý do từ chối rút gọn;
   - thời điểm cập nhật.
4. Không để webhook template thay đổi thread chat.
5. Không tự động bật template vừa được duyệt nếu chưa có cấu hình allowlist.

### Cổng nghiệm thu

- Webhook trùng không tạo bản ghi trùng.
- Template bị Meta thu hồi sẽ bị khóa gửi.
- Log không chứa token, nội dung private key hoặc toàn bộ PSID.

## Giai đoạn 5 — Kiểm thử

### Unit test Worker

- Request cũ mặc định thành `RESPONSE`.
- Response trong 24 giờ tạo payload đúng.
- Utility tạo payload đúng.
- Feature flag tắt chặn Utility.
- Template ngoài allowlist bị chặn.
- Template chưa duyệt bị chặn.
- Thiếu/thừa parameter bị chặn.
- Nội dung marketing không có đường đi qua Utility.
- Admin được dùng các Utility Template đã bật.
- Teacher được dùng template đã cấp cho học sinh thuộc phạm vi.
- Teacher bị chặn khi gửi cho học sinh ngoài phạm vi.
- Teacher bị chặn khi gọi template không được cấp cho vai trò Teacher.
- Token Meta không xuất hiện trong URL, response hoặc log.
- Lỗi Meta được ánh xạ sang mã công khai ổn định.

### Test frontend

- Còn 24 giờ hiển thị ô chat tự do.
- Hết 24 giờ khóa text tự do.
- Utility chỉ xuất hiện khi được bật.
- Preview hiển thị đúng dữ liệu.
- Không cho submit khi thiếu trường.
- Hiển thị lỗi tiếng Việt.

### Integration test

- Template pilot gửi thành công tới tài khoản test.
- Meta trả Message ID và Worker ghi đúng outbox.
- Template bị từ chối không gửi được.
- Webhook trạng thái template được lưu một lần.
- Firestore dữ liệu cũ vẫn đọc được.
- Tin inbound và `RESPONSE` hiện tại không hồi quy.

### Smoke test production

1. Phụ huynh test nhắn Fanpage.
2. Admin trả lời trong 24 giờ.
3. Hết cửa sổ test, Admin gửi template nhắc học phí.
4. Teacher gửi template điều chỉnh lịch học cho học sinh thuộc lớp.
5. Admin gửi template xác nhận thanh toán học phí.
6. Teacher gửi template xác nhận đăng ký học thành công.
7. Teacher gửi template đánh giá buổi học nếu template này được Meta duyệt Utility.
8. Xác nhận phụ huynh nhận đúng nội dung.
9. Kiểm tra `message_outbox`.
10. Kiểm tra Cloudflare log và `/health`.
11. Teacher thử gửi ngoài phạm vi và bị chặn.
12. Teacher thử gọi template không được cấp và bị chặn.

## Giai đoạn 6 — Triển khai có kiểm soát

### Bước triển khai

1. Ghi Version ID Worker hiện tại.
2. Commit code và chạy toàn bộ test.
3. Deploy Worker với `UTILITY_MESSAGING_ENABLED=false`.
4. Smoke test toàn bộ luồng 24 giờ.
5. Deploy frontend tương thích.
6. Bật Utility cho Admin và Teacher với năm template pilot; template nào chỉ được bật sau khi Meta duyệt, riêng template đánh giá phải được duyệt đúng Utility.
7. Theo dõi ít nhất một chu kỳ sử dụng thực tế.
8. Chỉ mở thêm template sau khi pilot đạt.
9. Theo dõi riêng tỷ lệ gửi lỗi và thao tác của Teacher trong audit log.

### Không bật hàng loạt ngay

- Không gửi thử cho toàn bộ phụ huynh.
- Không tạo nhiều template trước khi template pilot ổn định.
- Không bật gửi tự động trong phiên bản đầu.
- Không thêm lịch gửi nền trong phiên bản đầu.

## Giai đoạn 7 — Thu hồi Message Tag cũ

Chỉ thực hiện sau khi Utility pilot ổn định và Meta xác nhận cơ chế mới:

1. Ngừng hiển thị Message Tag cũ trên frontend.
2. Worker từ chối tag cũ bằng mã rõ ràng.
3. Giữ khả năng đọc `messageTag` trong lịch sử.
4. Không xóa dữ liệu outbox cũ.
5. Cập nhật tài liệu kết nối Meta.

Việc thu hồi phải là một commit riêng để có thể rollback độc lập.

## 8. Kế hoạch rollback

### Rollback nhanh

1. Đặt `UTILITY_MESSAGING_ENABLED=false`.
2. Xác minh gửi `RESPONSE` vẫn hoạt động.
3. Không xóa template hoặc dữ liệu outbox.

### Rollback Worker

1. Rollback về Version ID trước triển khai Utility.
2. Kiểm tra `/health`.
3. Smoke test webhook inbound.
4. Smoke test gửi trong 24 giờ.

### Rollback frontend

1. Ẩn lựa chọn Utility.
2. Giữ giao diện chat 24 giờ.
3. Không thay đổi dữ liệu Firestore.

### Điều kiện rollback bắt buộc

- Tin trong 24 giờ bị lỗi sau deploy.
- Webhook ngừng nhận tin.
- Utility gửi sai người hoặc sai template.
- Meta trả lỗi quyền hàng loạt.
- Template chứa nội dung không đúng chính sách.
- Log hoặc response xuất hiện token/secret.

## 9. Tiêu chí nghiệm thu cuối cùng

- Firebase vẫn ở Spark Plan.
- Không có Firebase Functions hoặc dịch vụ yêu cầu Blaze.
- Tin nhắn trong 24 giờ không hồi quy.
- Utility chỉ gửi từ template được duyệt và allowlist.
- Text tự do ngoài 24 giờ bị chặn.
- Admin gửi nhắc học phí thành công.
- Teacher gửi thông báo nghỉ học cho học sinh thuộc phạm vi thành công.
- Teacher gửi đánh giá buổi học thành công nếu Meta duyệt template Utility.
- Giáo viên ngoài phạm vi vẫn bị chặn.
- Giáo viên không dùng được template ngoài danh sách được cấp.
- Template marketing không thể đi qua Utility.
- Webhook template status hoạt động và chống trùng.
- Outbox phân biệt rõ `response` và `utility`.
- Token/secret không xuất hiện ở frontend, URL, response hoặc log.
- Toàn bộ Worker test, frontend test, typecheck và production build đạt.
- Có Version ID rollback đã kiểm tra.
- Có tài liệu thao tác no-code cho Admin.

## 10. Phạm vi không thực hiện

- Không nâng Firebase Blaze.
- Không thêm gửi tin tự động theo lịch trong phiên bản đầu.
- Không thêm marketing campaign.
- Không thêm Sponsored Messages trong phiên bản đầu.
- Không thêm chatbot AI tự gửi ngoài 24 giờ.
- Không thay đổi module đăng Fanpage.
- Không tái cấu trúc toàn bộ Worker.
- Không migration hoặc xóa dữ liệu chat hiện có.

## 11. Ước lượng theo đợt

| Đợt | Nội dung | Phụ thuộc |
|---|---|---|
| A | Xác minh quyền, chi phí, Graph version | Meta Dashboard |
| B | Xin quyền và duyệt sáu template pilot | Meta App Review |
| C | Worker Utility sau feature flag | Đợt A–B đạt |
| D | Frontend chọn template và preview | Worker local đạt |
| E | Webhook trạng thái và audit | Meta subscription |
| F | Test, pilot Admin, rollout | Template approved |
| G | Thu hồi Message Tag cũ | Pilot ổn định |

Không đặt ngày deploy cố định trước khi Meta cấp quyền và duyệt template.

## 12. Tài liệu tham chiếu

- Meta Messenger Platform – Utility Messages:  
  https://www.postman.com/meta/messenger-platform-api/folder/22794852-c68d7798-b7d9-42dc-825b-ad5b0dc2358d
- Meta Messenger Platform – ví dụ gửi Utility Template:  
  https://www.postman.com/meta/messenger-platform-api/request/22794852-31d80e54-aa3d-4c64-9e01-14925626797e
- Worker hiện tại: `workers/messenger/src/index.ts`
- Cấu hình Worker: `workers/messenger/wrangler.jsonc`
- Frontend Messenger adapter: `src/services/integrations/messenger.ts`

## 13. Quyết định đề xuất

Tiếp tục theo hướng **Utility Message tương thích ngược** với sáu template: “Nhắc học phí”, “Thanh toán học phí thành công”, “Điều chỉnh lịch học”, “Đánh giá buổi học”, “Xác nhận đăng ký học thành công” và “Liên kết tài khoản phụ huynh thành công”. Teacher chỉ gửi năm template nghiệp vụ cho học sinh thuộc phạm vi; template liên kết tài khoản chỉ dành cho Admin/Hệ thống.

Template đánh giá buổi học là hạng mục có điều kiện: chỉ bật ngoài 24 giờ khi Meta phê duyệt đúng nhóm Utility. Chưa viết code Utility cho đến khi hoàn thành Giai đoạn 0 và Giai đoạn 1. Đây là cổng an toàn để tránh xây dựng trên một quyền chưa được cấp hoặc một Graph API version chưa được xác nhận.
