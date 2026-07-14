# Roadmap audit Rules, Roles, Spark và Client — 12/07/2026

Trạng thái phát hành: **NO-GO có điều kiện** cho production. Ứng dụng build được và các bộ test hiện có đều xanh, nhưng còn lỗi phân quyền/độ toàn vẹn P0-P1 chưa được test và khắc phục.

## Baseline đã hoàn thành

- TypeScript typecheck: PASS.
- ESLint: PASS, 0 warning.
- Unit test web: PASS 16/16.
- Firestore Rules emulator: PASS 71/71 trên 9 suite.
- Messenger Worker: PASS 11/11.
- Production build: PASS; cảnh báo chunk chính 1.011 MB (gzip 268 KB).
- `npm audit --omit=dev`: 0 vulnerability.
- Firebase Hosting có SPA rewrite về `index.html` và cache asset tĩnh.

Lưu ý: test xanh chỉ chứng minh các trường hợp đã viết. Nó chưa chứng minh ma trận quyền Teacher/ownership hoặc schema update an toàn.

## Lỗi phát sinh và việc phải làm

### P0 — Phân quyền Teacher quá rộng

- [x] Chốt ma trận quyền chính thức: Admin quản trị toàn hệ thống; Teacher chỉ thao tác dữ liệu của lớp/học sinh được phân công, đồng thời được quản trị và duyệt học phí; Viewer chỉ truy cập dữ liệu thuộc `studentIds` được Admin gán.
- [ ] Thêm `teacherUids`/`teacherId` làm nguồn ownership đáng tin cậy cho class/session/assignment và helper Rules `teachesClass(classId)`.
- [ ] Không dùng `isStaff()` để cấp CRUD toàn bộ `students`, `classes` và `enrollments`; Teacher phải được kiểm tra ownership lớp được phân công.
- [ ] Admin và Teacher được tạo/sửa học phí, duyệt hoặc từ chối thanh toán. Với Teacher, invoice/payment phải thuộc học sinh trong lớp được phân công; không được thao tác học phí của lớp khác.
- [ ] Chỉ Admin được sửa danh mục chung; Teacher nên read-only với subject/course nếu không có yêu cầu quản trị học vụ.
- [ ] Thêm negative Rules tests: Teacher A không đọc/sửa lớp, học sinh, điểm, attendance, assignment của Teacher B.

Bằng chứng: `firebase/firestore.rules` các dòng 38-39, 187-191, 202-208, 324-336 đang cấp quyền theo `isStaff()` mà không kiểm tra lớp được phân công.

### P0 — Rules update chưa bảo vệ schema và quan hệ

- [ ] Mỗi collection phải có `keys().hasOnly(...)` khi create và `diff().affectedKeys().hasOnly(...)` khi update.
- [ ] Khóa các field bất biến: `studentId`, `classId`, `courseId`, `assignmentId`, `sessionId`, `invoiceId`, `createdBy`, `createdAt`.
- [ ] Kiểm tra document liên quan tồn tại và cùng ownership khi tạo attendance, submission, score, payment.
- [ ] Với payment, bắt buộc `reportedBy == request.auth.uid`, số tiền/student/invoice khớp invoice, và payment ID xác định.
- [ ] Với staff grading, giới hạn field được sửa; không cho đổi chủ sở hữu submission.
- [ ] Thêm test giả mạo mọi immutable field và test cross-document mismatch.

Bằng chứng: update Rules tại các dòng 191, 208, 222, 233, 250, 273, 292, 300, 315, 326 và 336 chủ yếu chỉ kiểm tra role/status.

### P0 — Messenger Worker cho phép gửi tùy ý

- [ ] Không nhận `recipientPsid` trực tiếp từ client thông thường; resolve người nhận từ `studentId` và quan hệ phụ huynh trong Firestore.
- [ ] Teacher chỉ gửi cho học sinh thuộc lớp được phân công; đăng bài Page hoặc broadcast chỉ dành cho Admin.
- [ ] Thêm rate limit, idempotency key, giới hạn batch và audit log đáng tin cậy bằng service credential.
- [ ] Không trả chuỗi lỗi nội bộ thô cho client.
- [ ] Thêm test CORS origin sai, token hết hạn, Teacher gửi ngoài lớp, PSID tùy ý và retry Meta.

Bằng chứng: `workers/messenger/src/index.ts` dòng 15 chỉ kiểm tra staff và dòng 24 chấp nhận `recipientPsid` từ request.

### P1 — Hosting và App Check chưa đủ bằng chứng production

- [ ] Thêm header: Content-Security-Policy phù hợp Firebase/Google/Worker, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, và HSTS theo domain production.
- [ ] Tách cache: `index.html` dùng `no-cache`/`must-revalidate`; chỉ asset có hash dùng `public,max-age=31536000,immutable`.
- [ ] Xác minh Authorized Domains của Firebase Auth và OAuth redirect cho domain thật.
- [ ] Xác minh App Check đã đăng ký site và bật enforcement cho Firestore/Auth sau giai đoạn monitor; client init không đồng nghĩa enforcement.
- [ ] Deploy preview channel rồi kiểm tra deep-link, refresh, cache version cũ và rollback.

### P1 — Tính khả thi Firebase Spark

- [ ] Lập ngân sách đọc/ghi theo số lớp, học sinh và thao tác/ngày; đặt ngưỡng vận hành dưới 50.000 reads/ngày và 20.000 writes/ngày.
- [ ] Giảm listener/query fan-out; giữ pagination cursor và summary có kiểm soát.
- [ ] Viết cơ chế cảnh báo quota bên ngoài Firebase nếu Spark không đáp ứng alert cần thiết.
- [ ] Thiết kế export/backup thủ công định kỳ; managed backup/PITR/restore yêu cầu billing, không được đánh dấu đã hoàn thành trên Spark.
- [ ] Tài liệu hóa hành vi khi vượt quota: dịch vụ có thể bị ngắt thay vì tự mở rộng.
- [ ] Cloudflare Worker là hạ tầng riêng: xác nhận quota, secrets, domain, monitoring và điều khoản Meta; không coi nó là chức năng Firebase Spark.

Kết luận khả thi: phù hợp pilot/MVP quy mô nhỏ nếu giám sát quota chặt và Messenger tắt có chủ đích. Chưa đủ an toàn cho production nhiều lớp cho tới khi có số đo tải và phương án vượt quota/backup.

### P1 — Code chạy ở client

- [ ] Giữ nguyên nguyên tắc: Firebase web config được phép công khai, nhưng mọi quyết định quyền phải nằm trong Rules/Worker.
- [ ] Không đưa service account, Meta token hoặc bí mật vào biến `VITE_*`; mọi `VITE_*` được đóng gói vào trình duyệt.
- [ ] Thêm kiểm tra build fail sớm khi thiếu Firebase config bắt buộc.
- [ ] Xem xét atomic transaction cho các luồng tạo document + summary; `createAssignment` hiện có hai write rời nhau.
- [ ] Tối ưu bundle chính và đo thực tế trên mạng chậm; cảnh báo hiện tại không chặn deploy nhưng ảnh hưởng UX.

## Ma trận role mục tiêu

| Nghiệp vụ | Admin | Teacher | Phụ huynh/Học sinh |
|---|---|---|---|
| Người dùng, invite, khóa tài khoản | Toàn quyền | Không | Hồ sơ cá nhân giới hạn |
| Danh mục môn/khóa | CRUD | Đọc; sửa nếu được ủy quyền rõ | Đọc |
| Học sinh/lớp/ghi danh | Toàn quyền | Chỉ lớp được phân công | Chỉ học sinh liên kết |
| Buổi học/giáo án/điểm danh/bài tập/điểm | Toàn quyền | CRUD trong lớp được phân công | Đọc/nộp đúng học sinh liên kết |
| Học phí/thanh toán | Toàn quyền, duyệt | Quản trị và duyệt cho học sinh thuộc lớp được phân công | Xem/báo thanh toán của học sinh liên kết |
| Messenger | Quản trị/broadcast | Gửi trong lớp được phân công | Không gửi qua endpoint staff |
| Audit log/settings | Đọc/quản trị | Chỉ tạo log đúng actor | Không |

## Thứ tự triển khai

1. Bổ sung mô hình Teacher ownership theo ma trận quyền đã chốt.
2. Siết Rules theo từng collection, bao gồm quyền học phí theo lớp; viết test thất bại trước rồi sửa Rules/client.
3. Khóa Messenger Worker và test authorization.
4. Hoàn thiện Hosting headers, cache và App Check enforcement trên staging.
5. Chạy UAT ba role với hai Teacher khác nhau và ít nhất hai gia đình.
6. Đo quota/tải, kiểm tra backup/rollback và quyết định Go/No-Go.

## Gate phát hành

- [ ] Không còn lỗi P0/P1 mở.
- [ ] Rules tests có Teacher cross-class và immutable-field coverage.
- [ ] UAT Admin/Teacher/Viewer PASS trên staging và thiết bị thật.
- [ ] App Check enforcement, Authorized Domains, Hosting headers/cache đã xác minh trên response thật.
- [ ] Có quota budget, backup/export, rollback và người chịu trách nhiệm vận hành.
- [ ] Messenger production PASS hoặc feature flag tắt hoàn toàn.
