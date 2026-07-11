# Edumatrix — Runbook vận hành tối thiểu

Tài liệu này là đầu ra Chặng 6. Nó không thay thế checklist Go/No-Go của Chặng 7.

## Nguyên tắc an toàn

- Không chạy `firebase deploy` trực tiếp từ working tree chưa có commit/tag.
- Không đưa Firebase service-account JSON, Meta token hoặc Worker secret vào repository.
- Mọi thay đổi Rules phải có kết quả Emulator test trước khi deploy.
- Spark cần được theo dõi reads/writes, số document và lỗi quota; khi có dấu hiệu vượt ngưỡng thì tắt luồng tổng hợp nặng trước khi thêm dữ liệu.

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

## Backup thủ công trên Spark

Spark không có quy trình backup tự động của ứng dụng này. Trước một thay đổi dữ liệu lớn:

1. Vào Firebase Console → Firestore → Data và xuất các collection nghiệp vụ quan trọng theo quy trình nội bộ.
2. Ghi lại thời điểm, project ID, người thực hiện và phạm vi collection.
3. Lưu bản xuất ngoài repository, trong nơi có phân quyền và mã hóa.
4. Kiểm tra ngẫu nhiên một vài document trước khi thay đổi.

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
- Kiểm tra `message_outbox` sau smoke test; không coi test unit là bằng chứng gửi Meta thật.
