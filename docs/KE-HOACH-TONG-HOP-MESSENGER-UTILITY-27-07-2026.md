# Kế hoạch tổng hợp nâng cấp EduMatrix Messenger và Utility Message

Ngày lập: 27/07/2026
Phạm vi: Chat EduMatrix, Cloudflare Messenger Worker, Meta Messenger API, Firestore và Utility Template
Nguyên tắc: giữ Firebase Spark, không thêm Firebase Functions, không làm gián đoạn webhook và luồng chat 24 giờ hiện tại.

## 0. Nhật ký triển khai

### Lần 1 — Khóa baseline và xác minh tài liệu, 27/07/2026

Đã hoàn thành:

- Git baseline: nhánh `main`, commit `cd8cff315888951930c4b7ef6f8d75f547da0eb8`.
- Worker production health trả `ok: true`.
- Worker production Version ID: `1c637404-b46a-4dc7-bd67-bc9773ffbe22`.
- Môi trường Worker xác nhận là `production`.
- Worker unit test: `33/33` đạt.
- Worker production config check và dry-run build: đạt.
- Production origin:
  - `https://edumatrix-vn-576b1.web.app`
  - `https://edumatrix.id.vn`
- Graph API version hiện cấu hình: `v22.0`.
- Chưa deploy hoặc thay đổi secret trong lần kiểm tra này.

Đã xác minh từ tài liệu Utility Messages chính thức của Meta:

- Việt Nam nằm trong danh sách quốc gia đang được hỗ trợ.
- App user cần cấp quyền `page_utility_messaging`.
- Cần Page ID, PSID người nhận và Page access token.
- Webhook cần đăng ký `message_template_status_update`.
- Utility không được chứa nội dung marketing.
- API gửi sử dụng endpoint `/PAGE_ID/messages` với `messaging_type: UTILITY` và template đã duyệt.
- Ví dụ tài liệu hiện tại sử dụng Graph API mới hơn `v22.0`; vì vậy chưa được phép tự nâng version trước khi kiểm thử tương thích.

Nguồn:

- [Meta Messenger Platform API – Utility Messages](https://www.postman.com/meta/messenger-platform-api/folder/22794852-c68d7798-b7d9-42dc-825b-ad5b0dc2358d)
- [Meta Messenger Platform API – Send a text-only template message](https://www.postman.com/meta/messenger-platform-api/request/22794852-488f1121-b473-4259-a936-44cddd0b636e)

Chưa hoàn thành vì cần thao tác trong Meta App Dashboard:

- xác nhận quyền `page_utility_messaging` của App đang ở trạng thái nào;
- xác nhận Page đã subscribe `message_template_status_update`;
- xác nhận giao diện tạo/clone template đang khả dụng cho đúng Page;
- xác nhận version Graph API mà App/Page hiện được phép dùng.

Kết luận cổng:

- **Giai đoạn 0: đạt phần baseline kỹ thuật.**
- **Giai đoạn 1: đạt phần nghiên cứu tài liệu, chưa đạt phần quyền của App.**
- Utility phải tiếp tục tắt; chưa triển khai payload Utility vào production.

### Lần 2 — Kiểm tra trực tiếp Meta App Dashboard, 27/07/2026

Ứng dụng đã kiểm tra:

- tên App: `Edumatrix_VN`;
- trạng thái App: đang hoạt động;
- đúng trường hợp sử dụng: Messenger from Meta.

Kết quả quyền:

- `pages_messaging`:
  - đã được thêm vào trường hợp sử dụng;
  - có 124 lượt gọi API;
  - trạng thái hiển thị `Sẵn sàng thử nghiệm`;
  - đang nằm trong hồ sơ App Review ở mục `Chưa gửi`.
- `pages_utility_messaging`:
  - đã được thêm vào trường hợp sử dụng;
  - có 0 lượt gọi API;
  - trạng thái hiển thị `Sẵn sàng thử nghiệm`;
  - đang nằm trong hồ sơ App Review ở mục `Chưa gửi`;
  - chưa có bằng chứng đã được phê duyệt cho người dùng live.

Kết quả webhook Page:

- Callback URL đang trỏ đúng Worker production:
  - `https://edumatrix-messenger-production.edumatrix-vn.workers.dev/webhook`
- Các trường sau đã đăng ký:
  - `messages`;
  - `message_deliveries`;
  - `message_reads`;
  - `messaging_postbacks`;
  - `messaging_referrals`;
  - `message_template_status_update`.
- Các trường trên đang đặt ở Graph API `v25.0`.

Phát hiện cần xử lý:

- Worker vẫn gọi Graph API `v22.0`, trong khi webhook Page hiện dùng `v25.0`.
- Không tự đổi Worker sang `v25.0` trước khi chạy compatibility test.
- Hồ sơ App Review hiện gom nhiều quyền không thuộc phạm vi Messenger; cần làm sạch hồ sơ trước khi gửi để giảm nguy cơ bị từ chối.
- `pages_utility_messaging` chưa được phép dùng production chỉ vì đang có trạng thái `Sẵn sàng thử nghiệm`.

Kết luận cổng sau kiểm tra:

- **Webhook Utility status: đạt.**
- **Quyền Utility thử nghiệm: có.**
- **Quyền Utility production: chưa đạt, hồ sơ chưa gửi.**
- **Bước tiếp theo: chuẩn bị và làm sạch hồ sơ App Review, tạo bằng chứng kiểm thử và chỉ gửi các quyền thật sự cần cho Messenger.**

## 1. Mục tiêu cuối

EduMatrix cần đạt bốn khả năng độc lập:

1. Phụ huynh chủ động nhắn Fanpage thì hội thoại xuất hiện trong EduMatrix.
2. Admin hoặc giáo viên trả lời được trong cửa sổ 24 giờ, đúng phạm vi được phân quyền.
3. Khi ngoài 24 giờ, hệ thống chỉ cho gửi mẫu Utility đã được Meta duyệt và đúng mục đích.
4. Mọi lần nhận, gửi, liên kết và thất bại đều có dữ liệu đối soát, nhưng không làm lộ token hoặc thông tin bí mật.

Luồng chat 24 giờ đang hoạt động là luồng chính. Utility Message là nhánh bổ sung có feature flag riêng, không thay thế luồng cũ.

## 2. Những gì đã hoàn thành

### 2.1. Hạ tầng và Worker production

- Cloudflare Worker production đã được tạo và có endpoint `/health`.
- Worker nhận webhook Meta và xác minh chữ ký HMAC bằng App Secret.
- CORS đã được giới hạn theo origin cấu hình.
- Page Access Token được gửi trong header khi Worker gọi Meta, không nằm trong URL.
- Có mã lỗi công khai ổn định để frontend không hiển thị trực tiếp dữ liệu nhạy cảm từ Meta.
- Worker có Version ID trong health/log để phục vụ rollback và đối chiếu bản deploy.
- Cấu hình production dùng Worker riêng, không còn phụ thuộc URL localhost.

Trạng thái: **đã có trong code và các commit Worker V2/gia cố Worker**.

### 2.2. Nhận tin nhắn và chống trùng

- Webhook đọc tin nhắn inbound từ Fanpage.
- Tin nhắn inbound được ghi vào Firestore và hiển thị theo thời gian thực.
- Có chống xử lý trùng theo Meta Message ID.
- Tài khoản Facebook chưa liên kết vẫn tạo hội thoại chờ liên kết.
- Worker lấy tên Facebook và avatar HTTPS khi Meta cho phép.
- Hội thoại lưu tên Facebook, avatar, tin gần nhất và trạng thái chưa đọc.

Trạng thái: **đã hoạt động thực tế; người dùng đã xác nhận nhận được tin Facebook**.

### 2.3. Liên kết phụ huynh với học sinh

- Có API tạo link mời liên kết Messenger.
- Link dùng nonce một lần, không đưa Firebase UID trực tiếp ra URL.
- Nonce có hạn sử dụng và không được dùng lại.
- Worker kiểm tra quan hệ phụ huynh–học sinh và phạm vi giáo viên trước khi tạo link.
- Không cho một PSID chiếm liên kết đã thuộc phụ huynh khác.
- Hội thoại chưa liên kết có giao diện chọn và ghép học sinh.

Trạng thái: **đã có trong Worker và frontend hiện tại**.

### 2.4. Gửi tin trong cửa sổ 24 giờ

- Frontend gọi Worker bằng Firebase ID token.
- Worker kiểm tra vai trò Admin/Teacher và phạm vi học sinh.
- Payload mặc định dùng `messaging_type: RESPONSE`.
- Có Enter để gửi và Shift + Enter để xuống dòng trong giao diện chat.
- Có trạng thái gửi, thất bại và thông báo lỗi tiếng Việt.
- Kết quả gửi được ghi vào `message_outbox`.
- Có allowlist Message Tag cũ gồm:
  - `ACCOUNT_UPDATE`
  - `CONFIRMED_EVENT_UPDATE`
  - `POST_PURCHASE_UPDATE`
- `HUMAN_AGENT` và tag tùy ý bị chặn.

Trạng thái: **đã có trong code; Message Tag cũ không được xem là giải pháp Utility tổng quát**.

### 2.5. Giao diện Chat V2

- Danh sách hội thoại chỉ ưu tiên tên tài khoản Facebook.
- Tin đến và tin đi được căn hai phía.
- Có avatar Facebook với fallback chữ viết tắt.
- Có panel thông tin phụ huynh/học sinh và trạng thái liên kết.
- Có tìm kiếm, lọc chưa đọc, nhật ký gửi và khu vực đăng Fanpage cho Admin.
- Có âm báo cho sự kiện mới theo cấu hình thông báo của người dùng.
- Có trạng thái rỗng, đang tải, lỗi và chưa cấu hình Worker.

Trạng thái: **đã triển khai trong module Chat thật**.

### 2.6. Utility Template demo

Trang `/app/chat-demo` hiện có sáu mẫu giao diện:

| Mã nội bộ | Tên mẫu | Vai trò dự kiến | Trạng thái hiện tại |
|---|---|---|---|
| `tuition_payment_reminder` | Nhắc học phí | Admin, Teacher theo phạm vi | Demo |
| `tuition_payment_confirmation` | Thanh toán học phí thành công | Admin, Teacher theo phạm vi | Demo |
| `class_schedule_adjustment` | Điều chỉnh lịch học | Admin, Teacher theo phạm vi | Demo |
| `lesson_feedback_request` | Đánh giá buổi học | Có điều kiện | Demo, cần Meta xác nhận |
| `enrollment_confirmation` | Đăng ký học thành công | Admin, Teacher theo phạm vi | Demo |
| `parent_account_link_confirmation` | Liên kết tài khoản phụ huynh thành công | Admin/Hệ thống | Demo |

Demo đã có:

- danh sách mẫu;
- form tham số riêng cho từng mẫu;
- bản xem trước tiếng Việt;
- hiển thị quyền Teacher hoặc Admin/Hệ thống;
- khóa mẫu đánh giá khi chưa đủ điều kiện;
- khóa mẫu liên kết tài khoản đối với Teacher;
- không ghi Firestore và không gọi Meta.

Trạng thái: **chỉ là demo UI trong working tree, chưa phải tính năng production**.

### 2.7. Kiểm chứng gần nhất

- `npm run typecheck`: đạt.
- `npm run build`: đạt.
- `git diff --check` cho phần demo và tài liệu: đạt.

## 3. Thay đổi đang dở, không được gộp nhầm

Working tree hiện còn các nhóm thay đổi chưa commit:

1. Utility Template demo và tài liệu kế hoạch.
2. Firestore index `message_outbox(actorUid, createdAt)`.
3. Truy vấn nhật ký gửi của Teacher theo `actorUid` và `createdAt`.
4. App Check site key trong `.env.real`.
5. Các thư mục tạm `.codex-tmp/` và `outputs/`.

Trước khi commit phải chia thành commit riêng theo mục đích. Không stage toàn bộ bằng `git add .`.

## 4. Khoảng trống trước khi Utility chạy thật

### 4.1. Phía Meta

- Chưa có bằng chứng trong repo rằng App đã được cấp `page_utility_messaging`.
- Chưa có danh sách template thực tế đã được Meta duyệt.
- Chưa xác nhận schema Utility chính thức cho Graph API version production.
- Chưa đăng ký hoặc kiểm chứng webhook `message_template_status_update`.
- Chưa xác nhận chi phí, hạn mức và phạm vi quốc gia áp dụng.

### 4.2. Phía Worker

- Worker hiện hỗ trợ `RESPONSE` và Message Tag cũ, chưa có nhánh Utility độc lập.
- Chưa có allowlist Utility Template phía server.
- Chưa validate bộ tham số riêng của từng Utility Template.
- Chưa có feature flag `UTILITY_MESSAGING_ENABLED`.
- Chưa lưu đầy đủ `templateKey`, phiên bản, ngôn ngữ và trạng thái Meta vào outbox.
- Chưa nhận và lưu trạng thái phê duyệt/thu hồi template.

### 4.3. Phía frontend

- Sáu mẫu vẫn nằm ở trang demo, chưa tích hợp vào `ChatPage`.
- Chưa tự chuyển giao diện theo thời hạn 24 giờ.
- Chưa lấy danh sách template khả dụng từ cấu hình server.
- Chưa có submit Utility thật.
- Chưa có màn hình Admin quản lý trạng thái template.

### 4.4. Kiểm thử và vận hành

- Chưa có unit test cho Utility payload.
- Chưa có test quyền Teacher theo từng template Utility.
- Chưa có UAT ngoài 24 giờ với tài khoản Meta test.
- Chưa có runbook bật/tắt Utility và rollback riêng.

## 5. Các giả định cần Meta xác nhận

Không viết code production dựa trên giả định sau:

1. Quyền `page_utility_messaging` tồn tại và được cấp cho đúng App/Page.
2. Meta chấp nhận đúng schema `messaging_type: UTILITY` cho Graph version đang dùng.
3. Sáu nội dung đề xuất được Meta phân loại là Utility.
4. `lesson_feedback_request` có thể bị Meta xem là engagement; nếu vậy phải giới hạn trong 24 giờ hoặc chuyển sang email/thông báo EduMatrix.
5. Template liên kết tài khoản chỉ được gửi sau một hành động tài khoản có thật, không dùng để mời chào chung.

Nếu một giả định không đạt, dừng đúng nhánh Utility liên quan; không thay bằng Message Tag tùy tiện.

## 6. Kế hoạch triển khai chi tiết

## Giai đoạn 0 — Chốt baseline và tách thay đổi

### Công việc

1. Ghi lại commit và Cloudflare Version ID đang chạy.
2. Chạy smoke test luồng inbound và `RESPONSE`.
3. Tách working tree thành:
   - commit Firestore outbox index;
   - commit Utility demo;
   - commit tài liệu;
   - không commit file tạm.
4. Kiểm tra `.env.real` không chứa secret; chỉ giữ biến public phù hợp.

### Nghiệm thu

- Biết chính xác phiên bản frontend và Worker production.
- Tin inbound và trả lời trong 24 giờ vẫn hoạt động.
- Mỗi commit chỉ có một mục đích.
- Có thể revert Utility demo mà không ảnh hưởng chat thật.

## Giai đoạn 1 — Xác minh khả năng Utility trên Meta

### Công việc

1. Kiểm tra đúng Meta App ID và Page ID.
2. Kiểm tra `pages_messaging`.
3. Tìm và yêu cầu `page_utility_messaging`.
4. Xác nhận Graph API version và schema từ tài liệu chính thức.
5. Xác nhận chi phí, hạn mức và quốc gia.
6. Đăng ký `message_template_status_update` nếu Meta yêu cầu.
7. Ghi kết quả vào bảng quyết định:
   - quyền;
   - schema;
   - version;
   - trạng thái webhook;
   - hạn mức/chi phí.

### Nghiệm thu

- Có ảnh hoặc log thể hiện quyền/trạng thái rõ ràng.
- Có schema payload chính thức áp dụng cho App.
- Nếu không đạt, Utility giữ tắt và kế hoạch dừng tại đây; chat 24 giờ không đổi.

## Giai đoạn 2 — Chuẩn hóa và xin duyệt template

### Công việc

1. Chốt nội dung tối thiểu, không quảng cáo.
2. Chốt tham số bắt buộc của từng mẫu.
3. Nộp lần lượt năm mẫu rõ tính giao dịch/dịch vụ.
4. Nộp `lesson_feedback_request` riêng để tránh ảnh hưởng nhóm còn lại.
5. Lưu tên Meta, ngôn ngữ, phiên bản nội dung và trạng thái.
6. Thiết lập quyền:
   - Teacher: chỉ mẫu được cấp và chỉ học sinh thuộc phạm vi;
   - Admin: toàn bộ mẫu đang bật;
   - `parent_account_link_confirmation`: chỉ Admin/Hệ thống.

### Nghiệm thu

- Ít nhất một mẫu có trạng thái `APPROVED` đúng nhóm Utility.
- Mỗi mẫu có hợp đồng tham số cố định.
- Mẫu bị từ chối không xuất hiện ở production.
- Không có nội dung tuyển sinh, khuyến mãi hoặc quảng cáo.

## Giai đoạn 3 — Hợp đồng API và cấu hình server

### Công việc

1. Giữ request cũ tương thích và mặc định `deliveryMode: "response"`.
2. Bổ sung request Utility:

```json
{
  "studentId": "student-id",
  "deliveryMode": "utility",
  "templateKey": "tuition_payment_reminder",
  "parameters": {}
}
```

3. Tạo registry template trong Worker gồm:
   - key nội bộ;
   - tên template Meta;
   - ngôn ngữ;
   - tham số bắt buộc;
   - vai trò được phép;
   - trạng thái bật/tắt;
   - phiên bản.
4. Frontend không được gửi tên template Meta tùy ý.
5. Thêm `UTILITY_MESSAGING_ENABLED=false`.
6. Không thêm Queue, KV, Durable Object hoặc Firebase Functions nếu chưa chứng minh cần thiết.

### Nghiệm thu

- Request cũ không đổi hành vi.
- Flag tắt trả mã `utility_disabled`.
- Key ngoài allowlist bị chặn trước khi gọi Meta.
- Thiếu/thừa tham số bị chặn.
- Teacher ngoài phạm vi bị `student_scope_denied`.
- Teacher không gọi được mẫu Admin/Hệ thống.

## Giai đoạn 4 — Triển khai Worker Utility

### Công việc

1. Tạo builder Utility riêng, không sửa builder `RESPONSE`.
2. Xác thực Firebase ID token như luồng cũ.
3. Đọc lại phạm vi từ Firestore; không tin dữ liệu lớp từ frontend.
4. Gọi Meta bằng Page Access Token trong header.
5. Ghi outbox bổ sung:
   - `deliveryMode`;
   - `templateKey`;
   - `templateName`;
   - `templateLanguage`;
   - `templateVersion`;
   - `metaMessageId`;
   - `metaErrorCode`;
   - `actorUid`;
   - thời gian.
6. Không ghi token, App Secret, private key hoặc toàn bộ PSID vào log.

### Nghiệm thu

- Unit test payload Utility đạt.
- Unit test quyền Admin/Teacher đạt.
- Meta lỗi được ánh xạ sang mã công khai ổn định.
- Outbox ghi được cả thành công và thất bại.
- Luồng inbound và `RESPONSE` không hồi quy.

## Giai đoạn 5 — Webhook trạng thái template

### Công việc

1. Nhận `message_template_status_update`.
2. Xác minh chữ ký giống webhook tin nhắn.
3. Chống trùng sự kiện.
4. Lưu trạng thái tối thiểu: template, trạng thái, lý do rút gọn, thời điểm.
5. Template bị thu hồi hoặc từ chối phải tự khóa gửi.
6. Không tự bật template mới duyệt nếu chưa được Admin cho phép.

### Nghiệm thu

- Một sự kiện lặp chỉ tạo một cập nhật.
- Template bị thu hồi biến mất khỏi danh sách gửi.
- Webhook template không sửa thread hoặc message chat.

## Giai đoạn 6 — Tích hợp frontend production

### Công việc

1. Tách component Utility demo thành component dùng lại; không sao chép nguyên trang demo.
2. Trong 24 giờ:
   - giữ ô chat tự do;
   - Enter gửi, Shift + Enter xuống dòng.
3. Ngoài 24 giờ:
   - khóa text tự do;
   - hiển thị “Gửi thông báo tiện ích” khi flag/quyền/template đều hợp lệ;
   - cho chọn template và điền đúng trường;
   - hiển thị preview;
   - xác nhận trước khi gửi.
4. Ẩn template theo vai trò và trạng thái Meta.
5. Hiển thị lỗi tiếng Việt theo mã Worker.
6. Tạo màn hình Admin chỉ để xem/bật/tắt template, không lưu secret.

### Nghiệm thu

- Không thể sửa tên template bằng DevTools để vượt allowlist.
- Teacher chỉ thấy mẫu được cấp.
- Teacher chỉ chọn được học sinh thuộc phạm vi.
- Mẫu liên kết tài khoản không xuất hiện cho Teacher.
- Khi flag tắt, ChatPage hoạt động như trước nâng cấp.

## Giai đoạn 7 — Hoàn thiện sáu luồng nghiệp vụ

### 7.1. Nhắc học phí

- Dữ liệu lấy từ hóa đơn/kỳ học phí, không nhập tay các trường có thể suy ra.
- Có tên trung tâm, học sinh, kỳ, số tiền, hạn và hướng dẫn đăng nhập.
- Không gửi nếu hóa đơn đã thanh toán.

### 7.2. Thanh toán học phí thành công

- Chỉ phát sinh sau trạng thái thanh toán hợp lệ.
- Có số tiền, kỳ, ngày và mã đối soát.
- Chống gửi lặp theo payment/invoice ID.

### 7.3. Điều chỉnh lịch học

- Hỗ trợ nghỉ học, học bù và học bổ sung.
- Có lớp, thời gian cũ/mới, lý do và ghi chú.
- Teacher chỉ gửi cho lớp đang phụ trách.

### 7.4. Đánh giá buổi học

- Chỉ bật nếu Meta duyệt Utility.
- Link đánh giá phải là domain EduMatrix cho phép.
- Nếu Meta không duyệt, dùng thông báo nội bộ/email hoặc gửi trong 24 giờ.

### 7.5. Xác nhận đăng ký học

- Chỉ gửi sau enrollment hợp lệ.
- Có khóa, lớp, ngày bắt đầu và lịch học.
- Chống gửi lại theo enrollment ID.

### 7.6. Liên kết tài khoản phụ huynh thành công

- Chỉ Admin/Hệ thống gửi sau khi liên kết thật sự hoàn tất.
- Email trong template lấy từ tài khoản/invite đã xác minh.
- Link đăng nhập lấy từ cấu hình public allowlist.
- Không đưa token mời, nonce hoặc dữ liệu bí mật vào nội dung.
- Nên ưu tiên gửi email xác nhận đồng thời; Messenger là kênh bổ sung.

### Nghiệm thu

- Mỗi nghiệp vụ có dữ liệu nguồn rõ ràng và idempotency key.
- Không có nút gửi khi dữ liệu nguồn chưa hợp lệ.
- Mỗi mẫu có ít nhất một test thành công và một test bị chặn.

## Giai đoạn 8 — UAT và triển khai có kiểm soát

### Công việc

1. Chạy:

```text
npm run typecheck
npm run lint
npm run test
npm run test:rules
npm run check:mojibake
npm run build
```

2. Chạy test Worker riêng.
3. Deploy Worker với flag Utility tắt.
4. Smoke test inbound và `RESPONSE`.
5. Deploy frontend tương thích.
6. Bật Utility cho một Admin và một Page test.
7. Gửi từng template tới tài khoản test.
8. Đối chiếu Meta Message ID, outbox, giao diện và Cloudflare log.
9. Sau UAT mới cấp mẫu phù hợp cho Teacher.

### Nghiệm thu

- Sáu lệnh kiểm tra ứng dụng đạt.
- Worker tests đạt.
- Inbound và chat 24 giờ không hồi quy.
- Utility gửi thật thành công với mẫu đã duyệt.
- Teacher ngoài phạm vi và template sai đều bị chặn.
- Không có token hoặc secret trong log/browser.

## Giai đoạn 9 — Rollout và giám sát

### Công việc

1. Bật theo thứ tự:
   - Admin test;
   - Admin production;
   - nhóm Teacher nhỏ;
   - toàn bộ Teacher được cấp quyền.
2. Theo dõi:
   - tỷ lệ gửi thành công;
   - lỗi theo template;
   - template bị từ chối/thu hồi;
   - số lần bị chặn do quyền;
   - độ trễ webhook.
3. Đặt ngưỡng dừng nếu lỗi tăng bất thường.

### Rollback

1. Đặt `UTILITY_MESSAGING_ENABLED=false`.
2. Không rollback toàn Worker nếu inbound và `RESPONSE` vẫn tốt.
3. Nếu Worker có lỗi chung, deploy lại Version ID ổn định đã ghi ở Giai đoạn 0.
4. Giữ nguyên dữ liệu outbox để đối soát.

### Nghiệm thu

- Tắt Utility không làm gián đoạn chat 24 giờ.
- Có người chịu trách nhiệm xem log và trạng thái Meta.
- Có checklist xử lý token hết hạn, template bị thu hồi và webhook lỗi.

## 7. Thứ tự ưu tiên thực tế

### P0 — Làm trước

1. Chốt baseline và tách working tree.
2. Xác minh quyền/schema Utility trên Meta.
3. Xin duyệt ít nhất một template.
4. Viết Worker registry, flag và test.
5. Bảo vệ quyền Teacher phía Worker.

### P1 — Sau khi P0 đạt

1. Webhook trạng thái template.
2. Tích hợp modal Utility vào ChatPage.
3. Outbox và màn hình Admin.
4. UAT một Page, một Admin và một Teacher.

### P2 — Sau khi chạy ổn định

1. Tự động điền dữ liệu từ hóa đơn, lịch học và enrollment.
2. Idempotency theo từng nghiệp vụ.
3. Dashboard theo dõi tỷ lệ gửi.
4. Mở rộng thêm template đã được Meta xác nhận.

## 8. Việc không làm trong đợt này

- Không nâng Firebase Blaze.
- Không thêm Firebase Functions.
- Không thay Firestore bằng hệ thống khác.
- Không dùng Utility để gửi quảng cáo/tuyển sinh/khuyến mãi.
- Không cho người dùng nhập Message Tag tùy ý.
- Không tự động gửi hàng loạt trước khi có phê duyệt và chống trùng.
- Không refactor toàn bộ ChatPage chỉ để tích hợp Utility.
- Không commit file tạm hoặc secret.

## 9. Định nghĩa hoàn thành

Nâng cấp chỉ được coi là hoàn thành khi đồng thời đạt:

- inbound Fanpage tiếp tục hoạt động;
- trả lời trong 24 giờ tiếp tục hoạt động;
- ít nhất một Utility Template được Meta duyệt và gửi thật thành công;
- sáu mẫu có trạng thái rõ ràng: bật, tắt, chờ duyệt hoặc bị từ chối;
- backend kiểm tra lại vai trò và phạm vi;
- Teacher không gửi được mẫu liên kết tài khoản;
- outbox đủ dữ liệu đối soát;
- toàn bộ test/build đạt;
- Utility có thể tắt độc lập mà không rollback hệ thống.

## 10. Bước tiếp theo đề xuất

Bước tiếp theo không phải viết thêm giao diện. Cần hoàn thành **Giai đoạn 0 và Giai đoạn 1**:

1. tách các thay đổi chưa commit;
2. ghi baseline production;
3. xác minh quyền và schema Utility trực tiếp trên Meta;
4. chọn một template đơn giản nhất để pilot: `tuition_payment_confirmation` hoặc `class_schedule_adjustment`.

Chỉ sau khi Meta trả trạng thái rõ ràng mới triển khai nhánh Utility thật trong Worker.
