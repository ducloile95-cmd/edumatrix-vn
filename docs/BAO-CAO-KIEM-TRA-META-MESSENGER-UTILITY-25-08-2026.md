# Báo cáo kiểm tra Meta Messenger Utility và Worker production

**Dự án:** EduMatrix VN  
**Ngày tổng hợp:** 25/08/2026  
**Phạm vi:** Meta Messenger API, Utility Message, liên kết phụ huynh - học sinh, nhận xét sau buổi học, học phí, đăng ký/liên kết phụ huynh và trạng thái đồng bộ Cloudflare Worker production.

---

## 1. Kết luận điều hành

Hệ thống đã có nền tảng gửi Messenger theo đúng liên kết học sinh - phụ huynh và đã có registry sáu mẫu Utility. Tuy nhiên, tại thời điểm kiểm tra:

1. Giáo viên phát hành nhận xét sau buổi học có làm hệ thống tự động gọi Messenger, nhưng tin được gửi ở chế độ `RESPONSE`, không phải Utility.
2. Staff tạo học phí không làm phát sinh tin nhắn Messenger hoặc Utility.
3. Phụ huynh đăng ký/gửi yêu cầu liên kết và Admin duyệt liên kết thành công không làm phát sinh Utility.
4. Sáu mẫu Utility chỉ có thể được chọn để gửi thủ công trong module Chat khi tính năng được bật.
5. Utility đang bị tắt ở cả frontend và Worker production config.
6. Worker có nhận và lưu webhook trạng thái template, nhưng trạng thái `APPROVED` đã lưu chưa được dùng để tự động khóa/mở từng mẫu khi gửi.
7. Test Worker và các test frontend/service liên quan đều đạt, nhưng điều đó chỉ xác nhận mã nguồn hiện tại; không chứng minh production đã chạy cùng commit.
8. Worker production canonical vẫn chạy release `e5ba6ea667f1`, trong khi mã nguồn hiện tại là `cf8a1842b385`. Lịch sử Cloudflare không có deployment mới sau 11/08/2026.

### Trạng thái nhanh

| Nội dung | Trạng thái | Kết luận |
|---|---:|---|
| Worker production phản hồi `/health` | Đạt | HTTP 200 |
| Test Worker | Đạt | 55/55 test |
| Test frontend/service | Đạt | 282/282 test tại lần audit |
| Production dry-run build | Đạt | Có thể tạo bundle deploy |
| Production khớp HEAD hiện tại | Không đạt | `e5ba6ea667f1` khác `cf8a1842b385` |
| Utility frontend | Tắt | `VITE_UTILITY_MESSAGING_ENABLED=false` |
| Utility Worker production config | Tắt | `UTILITY_MESSAGING_ENABLED=false` |
| Tự động Utility sau nhận xét | Chưa có | Đang gửi `RESPONSE` |
| Tự động Utility khi tạo học phí | Chưa có | Chỉ ghi Firestore |
| Tự động Utility khi liên kết phụ huynh | Chưa có | Chỉ cập nhật Firestore và audit log |
| Đối chiếu template `APPROVED` lúc gửi | Chưa đầy đủ | Webhook chỉ lưu trạng thái |

---

## 2. Phạm vi và tiêu chí kiểm tra

Một nghiệp vụ chỉ được kết luận là **tự động gửi Utility thành công về mặt thiết kế** khi có đủ các mắt xích sau:

1. Hành động nghiệp vụ gọi trực tiếp hoặc gián tiếp hàm gửi Messenger.
2. Payload có `deliveryMode: "utility"`.
3. Payload sử dụng `templateKey` thuộc allowlist phía Worker.
4. Các tham số template được tạo từ dữ liệu nghiệp vụ, đúng tên và đúng thứ tự.
5. `studentId` được resolve sang đúng `parentUids`.
6. Phụ huynh có `messenger_connections/{parentUid}` đang hoạt động và có PSID.
7. Worker và frontend đều bật Utility.
8. Fanpage có quyền Utility hợp lệ.
9. Template tương ứng có trạng thái Meta `APPROVED` và đang được hệ thống cho phép gửi.
10. Meta Send API trả về `message_id` hoặc kết quả gửi thành công.

Báo cáo phân biệt ba trạng thái thường dễ bị nhầm:

- **Có mã nguồn:** chức năng đã được viết trong repository.
- **Test đạt:** test tự động hoặc dry-run chạy thành công trên mã nguồn đang kiểm tra.
- **Đã hoạt động production:** endpoint production đang chạy đúng commit/cấu hình và đã được smoke test trên Meta thật.

---

## 3. Kiến trúc gửi Messenger hiện tại

Luồng gửi theo học sinh:

```text
Hành động Staff/Teacher
        |
        v
sendMessenger({ studentId, ... })
        |
        v
POST /api/messenger/send
        |
        v
Worker xác thực Firebase và quyền Staff
        |
        v
students/{studentId}.parentUids
        |
        v
messenger_connections/{parentUid}
        |
        v
facebookPsid + status = active
        |
        v
Meta /{PAGE_ID}/messages
```

Các vị trí chính:

- Client Messenger: `src/services/integrations/messenger.ts`.
- Worker xử lý gửi: `workers/messenger/src/index.ts`, hàm `handleSend()`.
- Resolve người nhận: `workers/messenger/src/index.ts`, hàm `resolveRecipients()`.
- Registry Utility phía Worker: `workers/messenger/src/index.ts`, hằng `UTILITY_TEMPLATES`.
- Registry hiển thị phía frontend: `src/constants/utilityTemplates.ts`.

### Điều kiện xác định đúng người nhận

Worker đọc `students/{studentId}.parentUids`, sau đó đọc từng `messenger_connections/{parentUid}`. Một kết nối được đưa vào danh sách nhận khi:

- Có `facebookPsid`.
- `messenger_connections.status === "active"`.

Nếu học sinh có nhiều phụ huynh đều có kết nối active, hệ thống gửi tới tất cả các phụ huynh đó. Đây là gửi tới **tất cả tài khoản Messenger đã liên kết**, không phải chọn một phụ huynh duy nhất.

### Điểm cần gia cố trong mapping

1. `resolveRecipients()` lấy PSID từ `messenger_connections` nhưng chưa kiểm tra chéo rằng `messenger_psid_links/{psid}` có cùng `uid` và còn `active`.
2. Khi Admin liên kết một hội thoại chưa xác định thủ công, Worker lấy `parentUids[0]`. Với học sinh có nhiều phụ huynh, lựa chọn này có thể không phản ánh đúng người đang sở hữu PSID.
3. URL Facebook hoặc email phụ huynh không thể thay thế PSID. Phụ huynh phải hoàn thành referral/nhắn Fanpage để hình thành kết nối Messenger.

---

## 4. Kiểm tra nhận xét sau mỗi buổi học

### Hành động được kiểm tra

Giáo viên phụ trách hoàn thiện nội dung buổi học và bấm phát hành/gửi nhận xét.

### Hành vi mã nguồn

Sau khi transaction phát hành tổng kết và cập nhật buổi học thành `completed`, service lặp qua danh sách học sinh và gọi:

```ts
sendMessenger({
  studentId: student.id,
  text: message,
  type: "session_summary",
});
```

Vị trí: `src/services/firestore/classroomInteractions.ts`, khu vực dòng 322-332.

Nút gửi lại tại màn hình lớp học sử dụng cùng dạng payload, tại `src/features/classroom/pages/ClassroomInteractionPage.tsx`, khu vực dòng 200-210.

### Kết luận

- **Có tự động gọi Messenger:** Có.
- **Có tự động gửi Utility:** Không.
- **Lý do:** payload không có `deliveryMode: "utility"`, `templateKey` và `parameters`.
- Worker mặc định `deliveryMode` thành `response` và tạo `messaging_type: "RESPONSE"`.
- Tin này phụ thuộc cửa sổ phản hồi Messenger; nếu không còn điều kiện gửi response, Meta có thể từ chối.
- Template `lesson_feedback_request` hiện không được gọi từ luồng phát hành nhận xét.

### Lưu ý giao dịch

Transaction Firestore phát hành nhận xét hoàn tất trước khi vòng lặp gửi Messenger bắt đầu. Do đó có thể xảy ra trạng thái:

- Tổng kết đã được lưu và hiển thị trong cổng phụ huynh.
- Một hoặc nhiều tin Messenger gửi thất bại/skipped.

Giao diện có lưu kết quả theo từng học sinh và cho phép gửi lại, nhưng gửi lại vẫn là `RESPONSE`.

---

## 5. Kiểm tra Staff tạo học phí

### Hành động được kiểm tra

Staff/Admin tạo một hoặc nhiều hóa đơn học phí cho học sinh.

### Hành vi mã nguồn

`createInvoices()` tạo invoice code, nội dung chuyển khoản, hạn thanh toán và ghi batch vào Firestore. Sau `batch.commit()` không có lời gọi `sendMessenger()`.

Vị trí:

- `src/services/firestore/invoices.ts`, hàm `createInvoices()`.
- `src/features/invoices/pages/InvoicesPage.tsx`, mutation tạo hóa đơn.

### Kết luận

- **Tự động tạo hóa đơn:** Có.
- **Tự động gửi Messenger:** Không.
- **Tự động gửi Utility `tuition_payment_reminder`:** Không.
- **Đảm bảo gửi đúng phụ huynh:** Chưa áp dụng vì không có bước gửi.

### Thanh toán học phí

Luồng đối soát hoặc ghi nhận thanh toán hiện không gọi Utility `tuition_payment_confirmation`. Template đã tồn tại trong registry nhưng chỉ được gửi thủ công từ Chat nếu Utility được bật.

---

## 6. Kiểm tra đăng ký và liên kết phụ huynh

### 6.1. Phụ huynh gửi yêu cầu liên kết

`createLinkRequest()` ghi `link_requests/{uid}` với trạng thái `pending`. Không có lời gọi Messenger.

Vị trí: `src/services/firestore/linkRequests.ts`, hàm `createLinkRequest()`.

Kết luận: **Không tự động gửi Utility sau khi phụ huynh gửi đăng ký/yêu cầu liên kết.**

### 6.2. Admin duyệt liên kết thành công

`approveLinkRequest()` thực hiện transaction:

1. Kiểm tra yêu cầu vẫn `pending`.
2. Tạo hoặc cập nhật user phụ huynh.
3. Ghi `studentIds` vào user phụ huynh.
4. Ghi UID phụ huynh vào `students/{id}.parentUids`.
5. Chuyển yêu cầu thành `approved`.
6. Sau transaction, ghi audit log.

Không có lời gọi `sendMessenger()`.

Kết luận: **Không tự động gửi Utility `parent_account_link_confirmation`.**

### 6.3. Điều kiện kỹ thuật bổ sung

Ngay cả khi muốn gửi tự động sau khi Admin duyệt, phụ huynh chỉ nhận được nếu trước đó đã có PSID hợp lệ. Việc tài khoản EduMatrix đã liên kết với học sinh không đồng nghĩa tài khoản Facebook đã liên kết Messenger.

Cần phân biệt:

```text
Liên kết dữ liệu EduMatrix:
users/{uid}.studentIds <-> students/{id}.parentUids

Liên kết Messenger:
messenger_connections/{uid}.facebookPsid
```

Muốn gửi Meta phải có cả hai lớp liên kết.

---

## 7. Đối chiếu toàn bộ Utility Template trong mã nguồn

Worker hiện khai báo sáu template:

| Template key | Tên Meta trong Worker | Tham số | Teacher được phép | Tự động theo nghiệp vụ |
|---|---|---|---:|---:|
| `tuition_payment_reminder` | `edumatrix_tuition_payment_reminder_v2_vi` | Học sinh, kỳ phí, số tiền, hạn thanh toán | Có | Không |
| `tuition_payment_confirmation` | `edumatrix_tuition_payment_confirmation_v2_vi` | Học sinh, kỳ phí, số tiền, ngày và mã thanh toán | Có | Không |
| `class_schedule_adjustment` | `edumatrix_class_schedule_adjustment_v2_vi` | Lớp, học sinh, ngày, giờ, nội dung điều chỉnh | Có | Không |
| `lesson_feedback_request` | `edumatrix_lesson_feedback_notice_v2_vi` | Lớp, học sinh, giáo viên | Có | Không |
| `enrollment_confirmation` | `edumatrix_enrollment_confirmation_v2_vi` | Học sinh, khóa học, trung tâm | Có | Không |
| `parent_account_link_confirmation` | `edumatrix_parent_account_link_confirmation_v2_vi` | Email phụ huynh, học sinh | Không | Không |

### Cơ chế gửi thủ công

Module Chat có chế độ Utility cho phép chọn học sinh, template và điền tham số. Frontend gửi:

```ts
{
  studentId,
  deliveryMode: "utility",
  templateKey,
  parameters,
}
```

Worker thực hiện:

- Chặn khi `UTILITY_MESSAGING_ENABLED !== "true"`.
- Chặn template ngoài registry.
- Kiểm tra đủ và đúng tập tham số.
- Chặn Teacher dùng template không được phép.
- Kiểm tra `settings/integrations.facebookUtilityMessagingPermission === "granted"`.
- Resolve PSID theo `studentId`.
- Gọi Meta Send API với `messaging_type: "UTILITY"`.

### Khoảng trống trạng thái phê duyệt

Webhook nhận `message_template_status_update` và ghi trạng thái vào collection `messenger_template_status`. Tuy nhiên, `handleSend()` chưa đọc collection này trước khi gửi.

Hệ quả:

- Tên lỗi `utility_template_not_approved` hiện chủ yếu có nghĩa là template key không nằm trong registry.
- Registry cứng không chứng minh template trên Meta đang `APPROVED`.
- Template bị Meta thu hồi/rejected không được tự động ẩn hoặc khóa chỉ dựa trên webhook đã lưu.
- Chưa có màn Admin đối chiếu trạng thái Meta của từng template với registry đang dùng.

Theo tài liệu Messenger Platform API của Meta, Utility Message cần sử dụng template theo tên/ngôn ngữ/tham số và `messaging_type: UTILITY`; quá trình tạo template trả về trạng thái xét duyệt. Tham khảo:

- <https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api>
- <https://www.postman.com/meta/messenger-platform-api/request/22794852-488f1121-b473-4259-a936-44cddd0b636e>

---

## 8. Ma trận hành động theo vai trò

### 8.1. Phụ huynh

| Hành động | Kết quả nội bộ | Messenger tự động | Utility tự động |
|---|---|---:|---:|
| Đăng ký/gửi yêu cầu liên kết | Tạo `link_request` pending | Không | Không |
| Theo dõi yêu cầu được duyệt | UI tự cập nhật qua snapshot | Không | Không |
| Báo đã thanh toán | Tạo/cập nhật dữ liệu thanh toán | Không | Không |
| Nhắn Fanpage qua referral | Tạo liên kết PSID và nhận inbound | Không có auto-reply Utility | Không |
| Xem nhận xét/học phí trong portal | Đọc dữ liệu Firestore | Không | Không |

### 8.2. Giáo viên

| Hành động | Messenger tự động | Loại gửi | Ghi chú |
|---|---:|---|---|
| Phát hành nhận xét buổi học | Có | `RESPONSE` | Không phải Utility |
| Gửi lại nhận xét thất bại | Có, khi bấm gửi lại | `RESPONSE` | Không chuyển sang Utility |
| Gửi Chat thủ công | Có | `RESPONSE` hoặc tag hợp lệ | Theo cửa sổ/chính sách Meta |
| Chọn Utility thủ công trong Chat | Chỉ khi được bật | `UTILITY` | Server giới hạn quyền template |
| Điều chỉnh lịch | Không tự động | Không có | Template tồn tại nhưng chưa nối nghiệp vụ |
| Xác nhận ghi danh | Không tự động | Không có | Template tồn tại nhưng chưa nối nghiệp vụ |

### 8.3. Admin/Staff

| Hành động | Messenger tự động | Utility tự động | Ghi chú |
|---|---:|---:|---|
| Tạo học phí | Không | Không | Chỉ tạo hóa đơn |
| Xác nhận thanh toán | Không | Không | Chưa gọi template confirmation |
| Duyệt liên kết phụ huynh | Không | Không | Chỉ cập nhật user/student/audit |
| Liên kết hội thoại Messenger thủ công | Không gửi xác nhận | Không | Tạo connection/thread |
| Gửi Utility từ Chat | Có thể gửi thủ công | Có, nếu bật | Production hiện đang tắt |

---

## 9. Trạng thái Worker production

### 9.1. Endpoint canonical

```text
https://edumatrix-messenger-production.ducloile99.workers.dev
```

Kết quả `/health` kiểm tra lại ngày 25/08/2026:

```json
{
  "ok": true,
  "service": "messenger-worker",
  "version": "a56098d1-4f02-4a17-9e5e-2b4d6c8f3a6d",
  "release": "e5ba6ea667f1",
  "environment": "production"
}
```

Đã gọi lại với query chống cache và header `cache-control: no-cache`; release trả về không thay đổi.

### 9.2. Đối chiếu mã nguồn

| Nguồn | Commit/release |
|---|---|
| Git HEAD trong workspace | `cf8a1842b3852a011bd87264a90dcb275c337255` |
| Worker production `/health` | `e5ba6ea667f1` |
| Cloudflare version production | `a56098d1-4f02-4a17-9e5e-2b4d6c8f3a6d` |

Kết luận: **Worker production chưa khớp HEAD hiện tại.**

### 9.3. Lịch sử deployment Cloudflare

Deployment production gần nhất được `wrangler deployments list --env production` trả về:

```text
Created UTC: 2026-08-11T10:31:08.497Z
Created Việt Nam: 11/08/2026 17:31
Version: a56098d1-4f02-4a17-9e5e-2b4d6c8f3a6d
```

Không có deployment mới trong chiều 24/08 hoặc tại lần kiểm tra ngày 25/08 trên Worker/environment canonical này.

Nếu đã deploy thành công ở nơi khác, cần đối chiếu lại:

- Tên Worker.
- Cloudflare account.
- Environment (`production` hay mặc định).
- URL được frontend dùng.
- Release SHA được nhúng trong `/health`.

### 9.4. Trạng thái Git remote

Workspace ở nhánh `main` và đang ahead `origin/main` 5 commit tại lần kiểm tra. Nghĩa là mã nguồn hiện tại cũng chưa được phản ánh đầy đủ trên `origin/main`.

---

## 10. Cấu hình production đã kiểm tra

Kết quả script `check:prod-config`:

```text
worker=https://edumatrix-messenger-production.ducloile99.workers.dev
origin=https://edumatrix-vn-576b1.web.app,https://edumatrix.id.vn
graph=v25.0
page=100488521748588
utility=false
```

Các cờ hiện tại:

```text
.env.real:
VITE_UTILITY_MESSAGING_ENABLED=false

workers/messenger/wrangler.jsonc production:
UTILITY_MESSAGING_ENABLED=false
```

Đây là trạng thái an toàn khi chưa xác nhận đầy đủ quyền Utility và template `APPROVED`. Dù Fanpage/Messenger thông thường đã kết nối, Utility vẫn bị từ chối ở hai lớp:

1. Frontend khóa lựa chọn Utility.
2. Worker trả `utility_disabled` nếu nhận payload Utility.

---

## 11. Kết quả kiểm thử

### Worker

Lệnh:

```bash
cd workers/messenger
npm test
```

Kết quả:

```text
Test Files: 1 passed
Tests: 55 passed
```

Các nhóm đã được test gồm:

- `/health`.
- Xác thực webhook challenge và signature.
- Yêu cầu authentication cho endpoint gửi.
- CORS production.
- Utility payload và thứ tự tham số.
- Chặn tham số thiếu/thừa/rỗng.
- Quyền Utility OAuth.
- Webhook trạng thái template.
- Không đưa token Meta vào URL.

### Production dry-run

Lệnh:

```bash
cd workers/messenger
npm run build:prod
```

Kết quả: thành công, bundle khoảng 124 KiB trước gzip và khoảng 27 KiB sau gzip.

Dry-run không tạo deployment production.

### Frontend/service

Trong lần audit tổng thể trước khi lập báo cáo:

```text
Test Files: 74 passed
Tests: 282 passed
```

Các test liên quan trực tiếp gồm Messenger client, Classroom Interaction, Invoice, Link Request, Chat Utility UI và Meta Page Connect.

### Giới hạn kiểm thử

Chưa thực hiện trong báo cáo này:

- Gửi Utility thật đến tài khoản Facebook test.
- Đọc trực tiếp danh sách template trong Meta Dashboard.
- Xác nhận từng template đang `APPROVED` trên production.
- Test ngoài cửa sổ Messenger 24 giờ.
- Test nhiều phụ huynh cùng liên kết một học sinh trên tài khoản Meta thật.

---

## 12. Các khoảng trống cần xử lý trước khi bật tự động Utility

### P0 - Bắt buộc

1. Đồng bộ và deploy đúng Worker production canonical.
2. Xác nhận `/health.release` khớp commit dự kiến.
3. Push hoặc lưu vết commit release trên remote để có thể truy xuất nguồn deploy.
4. Xác nhận Fanpage có quyền Utility hợp lệ trong môi trường live.
5. Lấy danh sách sáu template thực tế trên Meta và xác nhận tên, ngôn ngữ, tham số, trạng thái `APPROVED`.
6. Không bật flag chỉ dựa trên việc test unit đạt.

### P1 - Tính đúng nghiệp vụ

1. Nối `lesson_feedback_request` hoặc một template tổng kết phù hợp vào hành động phát hành nhận xét, nếu nội dung được Meta duyệt đúng use case.
2. Nối `tuition_payment_reminder` vào sự kiện phát hành hóa đơn.
3. Nối `tuition_payment_confirmation` vào trạng thái thanh toán đã xác minh, không gửi khi mới báo thanh toán.
4. Nối `enrollment_confirmation` vào trạng thái ghi danh thực sự hoàn tất.
5. Nối `parent_account_link_confirmation` vào trạng thái liên kết thành công, nhưng chỉ gửi khi đã có Messenger connection.
6. Bảo đảm idempotency để thao tác lặp lại không gửi trùng Utility.

### P1 - Trạng thái template

1. Khi gửi, đọc hoặc cache trạng thái `messenger_template_status`.
2. Chỉ cho phép template có trạng thái `APPROVED` và đúng Page/language.
3. Tự khóa template khi webhook báo rejected, paused hoặc revoked.
4. Không tự động bật template mới chỉ vì nhận webhook `APPROVED`; cần cấu hình Admin cho phép.
5. Hiển thị trạng thái từng template trong màn Admin.

### P1 - Người nhận

1. Kiểm tra chéo `messenger_connections` và `messenger_psid_links` trước khi gửi.
2. Với học sinh có nhiều phụ huynh, xác định rõ gửi tất cả hay chọn người nhận chính.
3. Khi liên kết hội thoại thủ công, không mặc định `parentUids[0]`; Admin phải chọn đúng phụ huynh.
4. Ghi log rõ `studentId`, `parentUid`, template key, template name, Meta message ID và trạng thái.

### P2 - Vận hành

1. Thêm smoke test read-only cho `/health` sau deploy.
2. Thêm smoke test có kiểm soát đến tài khoản Meta test.
3. Đối chiếu Cloudflare version, Git SHA và frontend release trong checklist triển khai.
4. Cảnh báo khi frontend và Worker có cờ Utility không khớp.

---

## 13. Tiêu chí nghiệm thu đề xuất

### Sau khi Giáo viên gửi nhận xét

- Transaction nhận xét thành công.
- Mỗi học sinh chỉ tạo tối đa một outbox event cho mỗi version nhận xét.
- Hệ thống chọn đúng template đã được duyệt.
- Chỉ gửi đến các phụ huynh có connection active.
- Gửi trùng thao tác không tạo tin trùng.
- UI hiển thị sent/failed/skipped theo từng học sinh/phụ huynh.

### Sau khi Staff tạo học phí

- Invoice được commit thành công trước khi tạo sự kiện gửi.
- Số tiền, kỳ phí và hạn thanh toán khớp invoice snapshot.
- Template reminder đúng trạng thái `APPROVED`.
- Mỗi invoice/phụ huynh chỉ gửi một lần theo idempotency key.
- Không gửi nếu invoice bị rollback hoặc không tạo thành công.

### Sau khi xác nhận thanh toán

- Chỉ gửi sau trạng thái `verified`.
- Thông tin số tiền, ngày và mã giao dịch lấy từ bản ghi đã xác minh.
- Reject/reconcile lại không gửi confirmation sai hoặc trùng.

### Sau khi liên kết phụ huynh

- Quan hệ user-student đã commit thành công.
- Messenger connection tồn tại và thuộc đúng parent UID.
- Template liên kết được duyệt và được Admin bật.
- Không gửi nếu phụ huynh chưa tạo PSID; UI hướng dẫn hoàn tất referral thay vì báo gửi thành công giả.

### Production

- `/health.release` bằng Git SHA phát hành.
- Cloudflare deployment mới xuất hiện đúng environment production.
- `check:prod-config` đạt.
- Unit/integration test đạt.
- Smoke test Meta test account đạt.
- Template status trên Meta và Firestore khớp nhau.

---

## 14. Kết luận cuối cùng

Hệ thống hiện có Worker Messenger hoạt động, cơ chế resolve phụ huynh theo PSID, UI gửi Utility thủ công và sáu template được khai báo trong mã nguồn. Tuy nhiên, các hành động nghiệp vụ chính chưa được nối với Utility tự động.

Việc test đạt không đồng nghĩa production đã đồng bộ hoặc Utility đã hoạt động. Tại lần kiểm tra ngày 25/08/2026, production canonical vẫn chạy release cũ `e5ba6ea667f1`, các cờ Utility vẫn tắt, và chưa có bằng chứng từ hệ thống rằng từng template Meta hiện đang `APPROVED` và được kiểm tra trước khi gửi.

Vì vậy, trạng thái chính xác là:

> **Messenger nền tảng: có và Worker đang online. Utility thủ công: đã có mã nhưng đang tắt. Utility tự động theo nhận xét, học phí và liên kết phụ huynh: chưa triển khai. Worker production: chưa đồng bộ với HEAD hiện tại.**

