# Edumatrix — Runbook vận hành tối thiểu

Tài liệu này là đầu ra Chặng 6. Nó không thay thế checklist Go/No-Go của Chặng 7.

## Nguyên tắc an toàn

- Không chạy `firebase deploy` trực tiếp từ working tree chưa có commit/tag.
- Không đưa Firebase service-account JSON, Meta token hoặc Worker secret vào repository.
- Mọi thay đổi Rules phải có kết quả Emulator test trước khi deploy.
- Spark cần được theo dõi reads/writes, số document và lỗi quota; khi có dấu hiệu vượt ngưỡng thì tắt luồng tổng hợp nặng trước khi thêm dữ liệu.
- Spark không hỗ trợ Firestore managed TTL deletes. Worker cron là nguồn canonical để xóa `messenger_conversation_tombstones` trạng thái `deleted` khi `expiresAt` đã quá 30 ngày; kiểm tra structured log `conversation_tombstone_cleanup_completed` sau mỗi release.

## Kiểm tra trước phát hành

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npx vitest run firebase/tests
npm run build
Push-Location workers/messenger
npm ci
npm test
npm audit --audit-level=high
Pop-Location
```

## Backup trên Spark

Spark không có scheduled export (đó là tính năng của Blaze + GCS bucket), và Firebase Console **không có** nút xuất collection. Dùng script:

```bash
npm run backup:export                          # xuất tất cả collection
npm run backup:export -- --only users,students # xuất một phần, tiết kiệm read
npm run backup:export -- --out D:\backup\edumatrix
```

Mặc định ghi vào `backups/firestore-<thời-điểm>Z/`, mỗi collection một file JSON, kèm `_manifest.json` ghi sẵn project ID, thời điểm, người chạy và số document từng collection.

Lưu ý khi chạy:

1. Mỗi document đọc ra tốn **1 read** trong hạn mức 50.000/ngày. Script in tổng số read ở cuối và cảnh báo nếu vượt 40% hạn mức — lần sau dùng `--only`.
2. `backups/` đã được gitignore. Bản xuất chứa dữ liệu cá nhân của trẻ em — lưu nơi có phân quyền và mã hóa, không đưa vào repository, không gửi qua chat.
3. Kiểm tra ngẫu nhiên vài document trong file JSON trước khi thực hiện thay đổi lớn.
4. Script cần file service account (`*firebase-adminsdk*.json`) ở thư mục gốc, hoặc chỉ đường dẫn bằng `--key`.

### Khôi phục

Định dạng xuất là **document wire format** của Firestore REST API, giữ nguyên kiểu dữ liệu (`timestampValue`, `referenceValue`, `mapValue`...), nên khôi phục là gửi ngược đúng khối `fields` đó:

```
PATCH https://firestore.googleapis.com/v1/projects/<projectId>/databases/(default)/documents/<collection>/<id>
body: { "fields": <khối fields lấy từ file JSON> }
```

Chưa có script khôi phục tự động, và đó là **cố ý**: một lệnh ghi đè hàng loạt lên production nguy hiểm hơn nhiều so với lợi ích của việc có sẵn nó. Khi thật sự cần khôi phục, viết đoạn script cho đúng phạm vi lần đó, chạy thử trên emulator trước.

Emulator dùng cho dữ liệu test có thể export/import bằng Firebase CLI; không coi dữ liệu emulator là backup production.

## Rollback Hosting

1. Dừng phát hành mới nếu smoke test lỗi.
2. Xác định release cuối cùng có smoke test PASS trong Firebase Hosting Console.
3. Roll back về release đó, sau đó kiểm tra login, route guard, Firestore read/write và App Check.
4. Ghi incident: thời gian, release, lỗi, dữ liệu bị ảnh hưởng và quyết định tiếp theo.

## Rollback Rules

1. Không sửa trực tiếp Rules trên Console nếu thay đổi chưa có trong repository.
2. Khôi phục commit Rules cuối cùng đã có 71/71 test PASS.
3. Chạy Emulator test, review diff, rồi mới deploy `firebase deploy --only firestore:rules`.

## Worker Messenger

- Production `ALLOWED_ORIGIN` phải là origin webapp thật, không phải localhost.
- Secrets chỉ được đặt bằng `wrangler secret put`.
- Nếu Meta lỗi hoặc hết quota, tắt feature Messenger ở UI và giữ webapp chính hoạt động.
- Kiểm tra `chat_threads/{threadId}/messages` và structured log Worker sau smoke test; `message_outbox` cũ đã bị xóa. Không coi test unit là bằng chứng gửi Meta thật.
- Xác nhận `GET /health.release` trả đúng SHA của commit phát hành trước khi mở frontend.
- Utility phải giữ fail-closed cho đến khi quyền `pages_utility_messaging`, webhook status và cả sáu template được đồng bộ live.

## R3 — Utility tự động trên Firebase Spark

- Client không ghi trực tiếp `messenger_delivery_jobs`. Mỗi nghiệp vụ ghi một intent bất biến vào `messenger_delivery_events` trong cùng transaction/batch; Worker cron xác minh trạng thái nghiệp vụ rồi fan-out thành job server-only cho từng phụ huynh active.
- Idempotency key của job là `eventType:entityId:version:parentUid`. Không sửa hoặc tạo job bằng Firebase Console trong quy trình thông thường.
- Trước khi deploy Rules R3, chạy `npm run migrate:r3-enrollments` để dry-run. Chỉ khi số lượng hợp lý mới chạy `npm run migrate:r3-enrollments -- --apply`; giữ nguyên thư mục backup mà script in ra để rollback có precondition.
- Thứ tự rollout: migration enrollment → indexes/Rules → Worker với `UTILITY_AUTOMATION_ENABLED=false` → frontend → xác minh template → Worker activation với flag `true`.
- Chỉ bật automation khi bốn template nghiệp vụ `lesson_feedback_request`, `tuition_payment_reminder`, `tuition_payment_confirmation`, `enrollment_confirmation` và template `parent_account_link_confirmation` đều đang `APPROVED`, đúng Page/ngôn ngữ và được Admin bật. `schedule_adjustment` không thuộc năm trigger R3.
- Cron xử lý event trước, job sau. Theo dõi `pending`, `processing`, `sent`, `failed`, `skipped`; `skipped:no_connection` là kết quả thật, không phải gửi thành công.
- Nếu job ở `processing` hết lease hoặc request Meta trả kết quả mơ hồ, Worker đặt `skipped:meta_delivery_outcome_unknown` và không tự gửi lại. Kiểm tra Inbox/Meta log thủ công; không retry mù vì có nguy cơ gửi trùng.
- Rollback nhanh nhất là đặt `UTILITY_AUTOMATION_ENABLED=false` và deploy Worker. Việc này dừng cron gửi mới nhưng giữ nguyên event/job để điều tra; chat 24 giờ và Utility thủ công không bị tắt.
