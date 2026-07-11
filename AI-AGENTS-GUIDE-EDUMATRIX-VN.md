# AI AGENT PLAYBOOK — EDUMATRIX-VN

> Tài liệu chỉ dẫn triển khai dành cho Claude, Codex, Antigravity và các AI Coding Agents khác.  
> Đây là **nguồn yêu cầu ưu tiên cao nhất** của dự án quản lý lớp học nội bộ Edumatrix-vn.

**Phiên bản:** 1.0  
**Ngày cập nhật:** 11/07/2026  
**Múi giờ nghiệp vụ:** Asia/Bangkok (UTC+7)  
**Trạng thái:** Greenfield/MVP  
**Mục tiêu chi phí:** Vận hành trong Firebase Spark Plan, gần 0 đồng

---

# PHẦN A — CHỈ DẪN BẮT BUỘC CHO AI AGENT

## A1. Cách sử dụng tài liệu

AI Agent phải đọc toàn bộ tài liệu này trước khi:

- Khởi tạo source code.
- Đề xuất kiến trúc.
- Tạo collection Firestore.
- Viết Firebase Security Rules.
- Xây dựng giao diện.
- Tích hợp Facebook Messenger.
- Tạo chức năng học phí hoặc QR.
- Refactor cấu trúc dự án.
- Đánh giá bảo mật hoặc quota.

Có thể dùng nguyên file này làm project instructions cho AI Coding Agent.

### Thứ tự ưu tiên khi có xung đột

1. Yêu cầu mới nhất được người dùng xác nhận trực tiếp.
2. Các quy tắc bắt buộc trong **Phần A**.
3. Đặc tả dự án trong **Phần B**.
4. Tài liệu hiện có trong repository.
5. Code đang tồn tại.
6. Phán đoán kỹ thuật của Agent.

Nếu code hiện tại trái với quy tắc bảo mật hoặc mục tiêu Spark Plan, Agent phải sửa code thay vì tiếp tục nhân rộng thiết kế sai.

---

## A2. Vai trò của AI Agent

AI Agent đóng vai trò đồng thời là:

- Senior Product Engineer.
- Firebase Architect.
- Frontend Engineer.
- Security Reviewer.
- Business Analyst.
- UI/UX Implementer.
- QA Engineer.
- Technical Writer.

Agent không chỉ tạo giao diện. Agent phải đảm bảo:

- Đúng nghiệp vụ.
- Đúng phân quyền.
- Không lộ dữ liệu.
- Không vượt quota do thiết kế sai.
- Không đưa secret vào frontend.
- Có kiểm thử.
- Có trạng thái loading, error và empty.
- Có tài liệu thay đổi.

---

## A3. Mục tiêu sản phẩm

Xây dựng webapp quản lý lớp học nội bộ với:

- 01 Admin.
- 01 Giáo viên.
- Dưới 50 tài khoản Phụ huynh/Học sinh.
- Google Authentication.
- Firebase Firestore.
- Firebase Security Rules.
- Firebase Hosting.
- Firebase App Check.
- React/Vite.
- HTML5 semantic.
- CSS/Tailwind.
- TypeScript ưu tiên.
- Cloudflare Worker chỉ dành cho logic chứa secret.

Các module bắt buộc:

1. Người dùng và phân quyền.
2. Học sinh.
3. Môn học.
4. Khóa học.
5. Lớp học.
6. Lịch học và buổi học.
7. Giáo án.
8. Điểm danh.
9. Bài tập và bài nộp.
10. Chấm bài và nhận xét.
11. Điểm học tập.
12. Học phí.
13. QR chuyển khoản.
14. Thông báo nội bộ.
15. Facebook Messenger.
16. Dashboard Staff.
17. Portal Phụ huynh/Học sinh.
18. Audit log.
19. Xuất dữ liệu sao lưu.

---

## A4. Các ràng buộc không được vi phạm

### A4.1. Firebase Spark Plan

Agent phải thiết kế để hoạt động trong Spark Plan:

- Không phụ thuộc Firebase Cloud Functions.
- Không phụ thuộc Firebase Storage.
- Không giả định có backend Firebase trả phí.
- Không xây tính năng cần billing mà không đánh dấu rõ là nâng cấp ngoài MVP.
- Không tải toàn bộ collection nếu có thể query theo phạm vi.
- Không bật realtime listener trên toàn bộ ứng dụng.

### A4.2. Client-first nhưng không client-secret

Yêu cầu “backend code chạy ở client” được hiểu như sau:

**Được chạy trên client:**

- CRUD Firestore thông thường.
- Form validation.
- Tính toán giao diện.
- Tạo VietQR từ cấu hình công khai.
- Batch cập nhật nghiệp vụ.
- Cache.
- Tổng hợp nhỏ trong cùng thao tác người dùng.

**Không được chạy hoặc lưu trên client:**

- Facebook Page Access Token.
- Meta App Secret.
- Webhook Verify Token.
- Firebase service account.
- Khóa bí mật ngân hàng.
- Bất kỳ credential nào cho phép giả mạo server.
- Logic xác nhận webhook.
- Logic cần quyền quản trị vượt Security Rules.

Các tác vụ chứa secret phải dùng Cloudflare Worker hoặc backend bảo mật tương đương.

### A4.3. Security Rules là lớp bảo mật chính

Agent không được coi:

- Ẩn menu.
- Route Guard.
- Disabled button.
- Kiểm tra role trong React.

là bảo mật đầy đủ.

Mọi quyền đọc/ghi phải được kiểm tra bằng Firebase Security Rules.

### A4.4. Không dùng Firestore làm kho file

Không lưu:

- Base64 image.
- Audio.
- Video.
- PDF binary.
- File bài tập.

trong Firestore.

Bài tập và tài liệu dùng:

- Google Drive link.
- Google Docs link.
- YouTube unlisted.
- URL ngoài phù hợp.

### A4.5. Không hardcode dữ liệu nhạy cảm

Không hardcode:

- Số tài khoản ngân hàng trong nhiều component.
- Role string rải rác.
- Collection name rải rác.
- Secret.
- Quyền.
- Trạng thái nghiệp vụ.

Phải tập trung trong:

- Constants.
- Typed enums/unions.
- Settings documents.
- Environment variables phù hợp.

### A4.6. Không tự thay đổi phạm vi

Agent không tự thêm:

- Chat realtime.
- Video call.
- AI chấm bài.
- Hệ thống kế toán.
- Tự động trừ tiền.
- Firebase Storage.
- Cloud Functions.
- Multi-tenant phức tạp.

trừ khi người dùng yêu cầu.

---

## A5. Quy trình làm việc bắt buộc của Agent

### Bước 1 — Đọc và khảo sát

Trước khi sửa code:

1. Đọc file hướng dẫn này.
2. Đọc `README.md`, cấu trúc repository và package manifest.
3. Kiểm tra Firebase config, Rules và indexes hiện tại.
4. Tìm component/service/type có thể tái sử dụng.
5. Xác định phase hiện tại.
6. Liệt kê file sẽ thay đổi.

Không tạo một kiến trúc song song nếu repository đã có cấu trúc hợp lý.

### Bước 2 — Lập kế hoạch nhỏ

Mỗi task nên chia thành:

- Data model.
- Security Rules.
- Service/query.
- UI.
- Validation.
- Loading/error state.
- Test.
- Documentation.

Task lớn phải triển khai theo vertical slice, ví dụ:

```text
Create assignment
→ Rule
→ Form
→ Firestore service
→ Assignment list
→ Test
```

Không xây toàn bộ UI trước rồi mới nghĩ tới Rules.

### Bước 3 — Thực thi

Agent phải:

- Sửa trực tiếp trong phạm vi task.
- Giữ thay đổi nhỏ và dễ review.
- Không rewrite toàn bộ dự án nếu không cần.
- Không xóa code chưa hiểu.
- Dùng typed data.
- Xử lý lỗi.
- Hủy listener.
- Validate trước khi ghi.
- Dùng `serverTimestamp()` cho thời gian hệ thống.
- Dùng batch/transaction khi cần tính nhất quán.

### Bước 4 — Tự kiểm tra

Trước khi kết thúc task:

- Chạy lint.
- Chạy typecheck.
- Chạy test.
- Chạy build.
- Kiểm tra Rules/Emulator nếu có thay đổi dữ liệu.
- Kiểm tra mobile 360px nếu có UI.
- Kiểm tra role Viewer nếu có module mới.
- Kiểm tra quota pattern.
- Kiểm tra không có secret trong bundle.

### Bước 5 — Báo cáo

Agent phải cung cấp:

- Tóm tắt thay đổi.
- Danh sách file chính.
- Quyết định kỹ thuật quan trọng.
- Test đã chạy.
- Rủi ro hoặc phần chưa hoàn thành.
- Bước tiếp theo hợp lý.

Không tuyên bố “hoàn thành” nếu build hoặc test đang lỗi.

---

## A6. Quy tắc giao tiếp và ra quyết định

Agent nên:

- Tự xử lý các chi tiết kỹ thuật nhỏ theo tài liệu.
- Không hỏi lại thông tin đã có.
- Không hỏi xác nhận cho từng file.
- Chọn giải pháp đơn giản nhất đáp ứng đúng yêu cầu.
- Nêu rõ giả định khi yêu cầu thật sự thiếu.
- Ưu tiên hoàn thành một vertical slice chạy được.
- Không hứa làm sau hoặc chạy nền.

Khi có nhiều lựa chọn tương đương, ưu tiên:

1. Ít quota hơn.
2. Bảo mật hơn.
3. Ít dependency hơn.
4. Dễ bảo trì hơn.
5. Dễ dùng hơn.
6. Dễ mở rộng hơn.

---

## A7. Tiêu chuẩn source code

### A7.1. Ngôn ngữ

- TypeScript được ưu tiên.
- Không dùng `any` trừ khi có lý do rõ ràng.
- Dùng union type cho role/status.
- Dùng interface/type dùng chung cho Firestore document.
- Dùng Firestore converter nếu codebase phù hợp.

Ví dụ:

```typescript
export type UserRole = "admin" | "teacher" | "viewer";

export type AttendanceStatus =
  | "present"
  | "absent_excused"
  | "absent_unexcused"
  | "late"
  | "makeup"
  | "online";
```

### A7.2. Naming

- React component: `PascalCase`.
- Hook: `useSomething`.
- Function/variable: `camelCase`.
- Constant: `UPPER_SNAKE_CASE`.
- File component: thống nhất theo convention hiện tại.
- Firestore collection: `snake_case`.
- Document field: `camelCase`.
- Timestamp field: kết thúc bằng `At`.
- ID field: kết thúc bằng `Id` hoặc `Ids`.

### A7.3. Không trộn trách nhiệm

Component UI không nên trực tiếp chứa:

- Query phức tạp.
- Mapping quyền.
- Secret.
- Business logic dài.
- Chuỗi collection thủ công.

Tách thành:

```text
page/component
→ hook
→ service/repository
→ Firebase SDK
```

### A7.4. Validation

- Form dùng Zod hoặc schema validation tương đương.
- Rules cũng validate dữ liệu quan trọng.
- Không tin dữ liệu client dù form đã validate.
- Số tiền lưu bằng integer VND, không dùng float.
- Điểm phải kiểm tra giới hạn.
- URL bài nộp phải có định dạng URL hợp lệ.
- Email phải chuẩn hóa lowercase.

### A7.5. Date/time

- Lưu Firestore Timestamp.
- Dùng `serverTimestamp()` cho `createdAt`, `updatedAt`, `checkedAt`, `verifiedAt`.
- Hiển thị theo Asia/Bangkok.
- Không lưu ngày nghiệp vụ dưới dạng chuỗi nếu cần sắp xếp/query.
- Có thể lưu chuỗi `YYYY-MM-DD` cho ngày sinh nếu không cần timezone.

### A7.6. Error handling

Mỗi thao tác async phải có:

- Loading state.
- Success feedback.
- Error feedback có ý nghĩa.
- Không xóa dữ liệu form khi lỗi.
- Log kỹ thuật vừa đủ, không log token hoặc dữ liệu nhạy cảm.

### A7.7. Accessibility

- Semantic HTML.
- Label đúng input.
- Button thật.
- Focus state.
- `aria-label` cho icon-only button.
- Keyboard navigation.
- Không chỉ dùng màu để biểu thị trạng thái.
- Touch target tối thiểu 44×44px trên mobile.

---

## A8. Kiến trúc source code mục tiêu

```text
src/
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   ├── config/
│   └── guards/
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   ├── feedback/
│   └── layouts/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── users/
│   ├── students/
│   ├── subjects/
│   ├── courses/
│   ├── classes/
│   ├── sessions/
│   ├── lesson-plans/
│   ├── attendance/
│   ├── assignments/
│   ├── submissions/
│   ├── scores/
│   ├── invoices/
│   ├── payments/
│   ├── announcements/
│   └── messenger/
│
├── services/
│   ├── firebase/
│   ├── firestore/
│   └── messenger/
│
├── schemas/
├── hooks/
├── stores/
├── types/
├── constants/
├── utils/
└── styles/

firebase/
├── firestore.rules
├── firestore.indexes.json
└── firebase.json

workers/
└── messenger/
```

Mỗi feature có thể dùng:

```text
feature-name/
├── components/
├── pages/
├── hooks/
├── services/
├── schemas.ts
├── types.ts
└── index.ts
```

Agent phải thích nghi với repository hiện tại nếu cấu trúc đã được khởi tạo hợp lý.

---

## A9. Tech stack mặc định

```text
React
Vite
TypeScript
React Router
Tailwind CSS
Firebase Web SDK modular
React Hook Form
Zod
TanStack Query
Lucide Icons
Recharts
date-fns
```

Không thêm Redux, Zustand hoặc UI framework lớn nếu state hiện tại chưa cần.

Không thêm dependency chỉ để thực hiện một hàm nhỏ có thể viết rõ ràng trong vài dòng.

---

## A10. Môi trường và biến cấu hình

### Firebase public config

Firebase Web Config được phép xuất hiện trong frontend nhưng vẫn nên đặt trong env:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MEASUREMENT_ID=
```

Việc API key Firebase Web xuất hiện ở client không thay thế Security Rules.

### Worker secrets

Chỉ cấu hình trong môi trường Worker:

```env
META_PAGE_ACCESS_TOKEN=
META_APP_SECRET=
META_VERIFY_TOKEN=
FIREBASE_PROJECT_ID=
```

Không commit file `.env`, service account hoặc secret.

Phải có `.env.example` chỉ chứa tên biến và mô tả.

---

## A11. Quy tắc phân quyền

### Role

```typescript
type UserRole = "admin" | "teacher" | "viewer";
```

### Quyền nghiệp vụ

- Admin: toàn bộ nghiệp vụ và cấu hình.
- Teacher: toàn bộ nghiệp vụ chuyên môn.
- Viewer: xem dữ liệu học sinh liên kết và gửi bài/báo thanh toán.

Chỉ Admin được:

- Thay đổi role.
- Khóa/mở tài khoản.
- Sửa thông tin ngân hàng.
- Sửa tích hợp Messenger.
- Sửa thiết lập hệ thống.
- Xem toàn bộ audit log.

### Quy tắc ownership

Viewer chỉ được truy cập document có `studentId` nằm trong:

```text
users/{uid}.studentIds
```

Nếu document không có `studentId` trực tiếp, phải chứng minh quyền bằng liên kết an toàn khác hoặc dùng document denormalized phù hợp.

Không viết Rules dựa trên dữ liệu do Viewer có thể tự sửa.

---

## A12. Firestore data model bắt buộc

```text
users/{uid}
invites/{normalizedEmail}

students/{studentId}
subjects/{subjectId}
courses/{courseId}
classes/{classId}
enrollments/{classId_studentId}

lesson_plans/{lessonPlanId}
lesson_plan_templates/{templateId}
sessions/{sessionId}

attendance/{sessionId_studentId}
attendance_summaries/{classId_studentId}

assignments/{assignmentId}
assignment_summaries/{assignmentId}
submissions/{assignmentId_studentId}

scores/{scoreId}
student_summaries/{studentId}

invoices/{invoiceId}
payments/{paymentId}

announcements/{announcementId}
message_outbox/{messageId}
messenger_connections/{uid}

viewer_dashboards/{uid}
audit_logs/{logId}

settings/general
settings/payment
settings/messenger
```

Agent không đổi tên collection tùy tiện sau khi đã có production data.

---

## A13. Document ID và chống ghi trùng

Dùng deterministic ID:

```text
enrollment:          {classId}_{studentId}
attendance:          {sessionId}_{studentId}
attendance_summary:  {classId}_{studentId}
submission:          {assignmentId}_{studentId}
```

Dùng auto ID cho:

- Scores.
- Invoices.
- Payments.
- Announcements.
- Audit logs.
- Lesson plans, nếu không có yêu cầu ID nghiệp vụ.

Không query để “kiểm tra đã tồn tại chưa” nếu deterministic ID giải quyết được.

---

## A14. Quy tắc truy vấn và quota

### Bắt buộc

- Query theo `classId`, `studentId`, `subjectId`, `status` hoặc thời gian.
- Có `limit()`.
- Có pagination cho lịch sử.
- Chỉ tạo index khi cần.
- Hủy `onSnapshot()` khi unmount.
- Không dùng listener cho trang lịch sử.
- Không refetch dữ liệu danh mục liên tục.
- Không ghi Firestore theo từng phím gõ.
- Không cập nhật `updatedAt` nếu dữ liệu không đổi.
- Dùng batch cho các thay đổi liên quan.

### Realtime được phép

- Thông báo mới.
- Buổi học đang thao tác.
- Trạng thái gửi Messenger đang chờ.
- Tình huống thực sự cần đồng bộ tức thời.

### Realtime không nên dùng

- Danh sách giáo án.
- Lịch sử điểm.
- Lịch sử điểm danh.
- Danh sách hóa đơn cũ.
- Toàn bộ học sinh.
- Toàn bộ dashboard.

---

## A15. Dashboard denormalization

Viewer dashboard dùng document tổng hợp:

```text
viewer_dashboards/{uid}
```

Mục tiêu:

- Mở portal chỉ cần 1–2 reads.
- Chỉ query chi tiết khi mở module.
- Staff batch cập nhật summary khi thay đổi dữ liệu quan trọng.

Agent phải tránh:

- Nhét toàn bộ lịch sử vào dashboard.
- Tạo document vượt kích thước.
- Cập nhật dashboard cho người không liên quan.

---

## A16. Security Rules standards

### A16.1. Deny by default

Rules phải bắt đầu từ nguyên tắc:

```javascript
allow read, write: if false;
```

và mở quyền theo từng collection.

### A16.2. Không dùng rule quá rộng

Cấm production rule:

```javascript
allow read, write: if request.auth != null;
```

### A16.3. Field-level validation

Khi Viewer update, Agent phải giới hạn field được thay đổi bằng `diff()` hoặc kiểm tra tương đương.

Ví dụ định hướng:

```javascript
request.resource.data
  .diff(resource.data)
  .affectedKeys()
  .hasOnly([
    "submissionUrl",
    "submissionText",
    "studentNote",
    "status",
    "submittedAt",
    "updatedAt"
  ])
```

Viewer không được thay đổi:

- `studentId`
- `assignmentId`
- `score`
- `teacherComment`
- `checkedBy`
- `checkedAt`

### A16.4. Invite claim

Luồng claim invite phải đảm bảo:

- `request.auth.token.email` tồn tại.
- Email đã xác minh nếu provider hỗ trợ.
- Email lowercase khớp document invite.
- Role và `studentIds` lấy từ invite.
- Người dùng không tự chọn role.
- Invite không được claim nhiều lần trái phép.

Agent phải viết Emulator test cho luồng này trước khi coi authentication hoàn thành.

### A16.5. Settings

- Chỉ Admin đọc/ghi settings nhạy cảm.
- Viewer không đọc cấu hình Messenger.
- Thông tin ngân hàng công khai cho thanh toán nên đặt trong document chỉ chứa field cần hiển thị.
- Không lưu token Messenger trong Firestore client-readable.

---

## A17. App Check

Agent phải:

- Tích hợp Firebase App Check cho production.
- Dùng provider phù hợp web.
- Có cơ chế debug token cho local development.
- Không xem App Check là thay thế Security Rules.
- Tài liệu hóa cách bật enforcement sau khi kiểm thử.

---

## A18. Module giáo án

Agent phải hỗ trợ:

- Tạo.
- Sửa.
- Lưu nháp.
- Sao chép.
- Tạo từ mẫu.
- Gắn môn.
- Gắn khóa.
- Gắn lớp.
- Gắn từng buổi.
- Theo dõi đã dạy/chưa dạy.
- Tóm tắt công khai.
- Link tài liệu.
- Tạo bài tập từ giáo án.

### Editor

Editor dùng section:

```typescript
type LessonSectionType =
  | "warmup"
  | "lesson"
  | "practice"
  | "assessment"
  | "wrapup"
  | "custom";
```

Không ghi mỗi keystroke.

Ưu tiên:

1. React state.
2. Local draft.
3. Debounced autosave 15–30 giây nếu cần.
4. Manual save.

Hiển thị:

- Chưa lưu.
- Đang lưu.
- Đã lưu lúc...
- Lưu lỗi.

---

## A19. Module điểm danh

UX bắt buộc:

- Mặc định toàn bộ “Có mặt”.
- Giáo viên chỉ sửa ngoại lệ.
- Một màn hình.
- Batch write.
- Deterministic ID.
- Có cảnh báo ghi đè.
- Có thể ghi chú.
- Thông báo vắng/đi muộn tùy chọn.
- Mục tiêu dưới 1 phút/lớp.

Agent không ghi document cho từng học sinh ngay khi bấm status. Giữ local state rồi lưu một lần.

---

## A20. Module bài tập

Không dùng Firebase Storage.

Submission type:

```typescript
type SubmissionType = "link" | "text" | "confirmation";
```

Status:

```typescript
type SubmissionStatus =
  | "not_started"
  | "submitted"
  | "reviewing"
  | "graded"
  | "redo_required";
```

Viewer được:

- Gửi link.
- Gửi text.
- Ghi chú.
- Nộp lại khi policy cho phép.

Viewer không được:

- Chấm điểm.
- Sửa nhận xét.
- Đổi `studentId`.
- Đổi `assignmentId`.
- Tự đánh dấu `graded`.

---

## A21. Module điểm

- Hỗ trợ nhập theo lớp.
- Dùng bảng editable hợp lý.
- Validate `0 <= score <= maxScore`.
- Cho phép nhận xét.
- Hiển thị lịch sử và biểu đồ.
- Viewer chỉ đọc dữ liệu liên kết.
- Không tính trung bình bằng cách tải toàn bộ dữ liệu mỗi lần mở dashboard.
- Có thể cập nhật `student_summaries`.

---

## A22. Module học phí và QR

### Tiền

- Lưu integer VND.
- Không dùng số thập phân.
- Format ở UI.
- Invoice code phải dễ đối soát.

### QR

Tạo ở client từ:

- Bank BIN.
- Số tài khoản.
- Tên tài khoản.
- Số tiền.
- Nội dung chuyển khoản.

### Quyền

Viewer chỉ được:

- Xem invoice.
- Báo đã chuyển khoản.
- Nhập mã giao dịch/ghi chú.

Viewer không được:

- Đổi `amount`.
- Đổi `status` thành `paid`.
- Đổi thông tin ngân hàng.
- Xác minh payment.

Staff mới được xác nhận `paid`.

### MVP

- Đối soát thủ công.
- Không API ngân hàng.
- Không upload biên lai.
- Không giả định callback tự động.

---

## A23. Facebook Messenger

### Kiến trúc bắt buộc

```text
Client
→ Firebase ID Token
→ Cloudflare Worker
→ Verify token and role
→ Read secret
→ Meta API
```

### Worker phải làm

- Verify Firebase ID Token.
- Kiểm tra user active.
- Kiểm tra role Admin/Teacher.
- Validate recipient.
- Validate message type/content.
- Rate limit cơ bản.
- Không log token.
- Trả lỗi có cấu trúc.
- Ghi kết quả gửi phù hợp.
- Không retry vô hạn.

### Client phải làm

- Chọn đối tượng.
- Xem trước.
- Xác nhận gửi hàng loạt.
- Hiển thị trạng thái.
- Có phương án sao chép nội dung gửi thủ công.
- Luôn tạo thông báo nội bộ trước hoặc cùng lúc.

### Chính sách

Agent không được code theo giả định rằng mọi tin nhắn đều gửi được mọi lúc. Phải xử lý trạng thái bị Meta từ chối.

---

## A24. UI/UX rules

### Staff

Desktop-first nhưng responsive:

- Sidebar.
- Header.
- Filter.
- Table.
- Drawer để xem/chấm nhanh.
- Sticky form actions khi form dài.

### Viewer

Mobile-first:

- Dashboard card.
- Bottom navigation.
- Lịch tiếp theo ở đầu.
- Bài tập đến hạn.
- Điểm gần nhất.
- QR lớn.
- Từ ngữ đơn giản.

### Design states bắt buộc

Mọi list/page phải có:

- Loading skeleton.
- Empty state.
- Error state.
- Success feedback.
- Permission denied nếu cần.

### Không làm

- Modal lồng modal.
- Bảng quá rộng trên mobile mà không có giải pháp.
- Màu trạng thái không kèm chữ.
- Nút icon không có tooltip/aria-label.
- Form xóa dữ liệu sau lỗi.
- Tải lại toàn trang sau CRUD.

---

## A25. Component reuse

Ưu tiên component dùng chung:

```text
AppShell
Sidebar
Topbar
BottomNavigation
PageHeader
Breadcrumb

Button
IconButton
Input
Textarea
Select
Combobox
Checkbox
RadioGroup
DatePicker
TimePicker
SearchInput

Card
StatCard
StudentCard
SessionCard
AssignmentCard
InvoiceCard
LessonPlanCard

DataTable
MobileCardList
Pagination
FilterBar
StatusBadge

Modal
Drawer
ConfirmDialog
Toast
InlineAlert

EmptyState
ErrorState
LoadingSkeleton
PermissionDenied

FormSection
FormActions
AutosaveIndicator

ScoreChart
AttendanceChart
ProgressBar

QRPaymentCard
MessengerStatus
```

Agent không tạo ba component khác nhau chỉ khác tên nhưng cùng chức năng.

---

## A26. Audit log

Các thao tác nên ghi audit:

- Thay role.
- Khóa tài khoản.
- Sửa thông tin ngân hàng.
- Tạo/sửa/xóa mềm invoice.
- Xác nhận payment.
- Sửa điểm.
- Ghi đè attendance.
- Gửi Messenger hàng loạt.
- Hủy buổi học.

Audit log không chứa:

- Token.
- Full sensitive payload không cần thiết.
- Nội dung bí mật.

Audit log là hỗ trợ điều tra, không thay thế backup.

---

## A27. Backup

Vì Spark hạn chế backup nâng cao:

- Xây chức năng export JSON/CSV cho Admin.
- Export theo module.
- Không chạy export khổng lồ trên mỗi page load.
- Hướng dẫn Admin lưu lên Google Drive.
- Dùng soft delete.

Ưu tiên dữ liệu:

1. Users.
2. Students.
3. Classes/courses/enrollments.
4. Lesson plans.
5. Scores.
6. Attendance.
7. Invoices/payments.

---

## A28. Kiểm thử bắt buộc

### Unit

- Format tiền.
- Tính attendance rate.
- Validation điểm.
- Invoice code.
- Mapping status.
- Date formatting.
- Permission helper.

### Component

- Form validation.
- Loading/error/empty.
- Viewer không thấy action Staff.
- Staff action đúng trạng thái.

### Firestore Emulator

- Unauthenticated denied.
- Viewer không đọc học sinh khác.
- Viewer không đổi role.
- Viewer không đổi `studentIds`.
- Viewer không sửa score.
- Viewer không tự set invoice `paid`.
- Viewer không sửa teacher fields trong submission.
- Teacher không sửa system settings nếu policy cấm.
- Disabled user denied.
- Invite claim hợp lệ/không hợp lệ.
- Deterministic ID chống ghi trùng.

### E2E luồng chính

1. Admin mời parent.
2. Parent đăng nhập.
3. Admin tạo student/class.
4. Teacher tạo session và lesson plan.
5. Teacher điểm danh.
6. Teacher giao assignment.
7. Viewer nộp bài.
8. Teacher chấm.
9. Viewer xem điểm.
10. Teacher tạo invoice.
11. Viewer mở QR và báo chuyển.
12. Teacher xác nhận payment.
13. Staff tạo thông báo.
14. Worker gửi Messenger hoặc trả lỗi rõ ràng.

---

## A29. Definition of Done

Một feature chỉ hoàn thành khi:

- Có UI usable.
- Có validation.
- Có Firestore service/query.
- Có Rules phù hợp.
- Có loading/error/empty.
- Có role guard.
- Có mobile behavior.
- Có test quan trọng.
- Build thành công.
- Không có secret.
- Không có query tải dư.
- Tài liệu được cập nhật.

“UI đã hiển thị” không đồng nghĩa feature hoàn thành.

---

## A30. Phased delivery

Agent triển khai theo thứ tự:

```text
Phase 0  Requirements normalization
Phase 1  Foundation
Phase 2  Authentication + authorization
Phase 3  Students + subjects + courses + classes
Phase 4  Sessions + schedules
Phase 5  Lesson plans
Phase 6  Attendance
Phase 7  Assignments + submissions + grading
Phase 8  Scores
Phase 9  Tuition + QR
Phase 10 Viewer portal
Phase 11 Messenger
Phase 12 UX/performance
Phase 13 Testing + deployment
```

Không bắt đầu Messenger trước khi:

- Auth ổn định.
- Role Rules ổn định.
- Parent link ổn định.
- Notification nội bộ đã có.

---

## A31. Output contract cho mỗi task

Agent nên kết thúc bằng mẫu:

```markdown
## Đã thực hiện
- ...

## File chính
- `path/to/file`
- ...

## Quyết định kỹ thuật
- ...

## Kiểm thử
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Chưa hoàn thành / Rủi ro
- ...

## Bước tiếp theo
- ...
```

Không đưa log dài không cần thiết.

---

## A32. Git và thay đổi code

- Không commit secret.
- Không commit build artifact nếu repo không yêu cầu.
- Không sửa format toàn bộ repo trong một task nhỏ.
- Không đổi tên hàng loạt không liên quan.
- Mỗi commit nên có một mục đích.
- Giữ migration note nếu đổi schema.
- Nếu phải thay schema production, thêm chiến lược backward compatibility.

Commit message gợi ý:

```text
feat(attendance): add batch attendance flow
fix(rules): restrict viewer submission updates
refactor(lesson-plans): extract editor sections
test(rules): cover invoice payment permissions
docs(agent): update project implementation guide
```

---

## A33. Các lỗi thiết kế Agent phải tránh

1. Dùng `onSnapshot()` cho mọi trang.
2. Query toàn bộ collection rồi filter ở client.
3. Cho Viewer sửa document nguyên khối.
4. Tin role từ localStorage.
5. Đưa Facebook token vào `.env` frontend.
6. Cho Viewer tự tạo `users` với role tùy chọn.
7. Lưu file base64 trong Firestore.
8. Autosave mỗi keystroke.
9. Tạo document điểm danh trùng.
10. Dùng float cho tiền.
11. Không hủy listener.
12. Không có pagination.
13. Không có trạng thái lỗi.
14. Chỉ ẩn nút nhưng Rules vẫn mở.
15. Dùng client timestamp cho audit quan trọng.
16. Tự động xác nhận tiền chỉ dựa trên nút “Đã chuyển”.
17. Gửi Messenger như kênh duy nhất.
18. Tạo quá nhiều dependency.
19. Rewrite toàn bộ repo vì một feature.
20. Báo hoàn thành khi chưa build/test.

---

# PHẦN B — PROMPT MẪU CHO CLAUDE, CODEX VÀ CÁC AI AGENTS

## B1. Prompt khởi tạo dự án

```text
Đọc toàn bộ AI-AGENTS-GUIDE-EDUMATRIX-VN.md.

Khởi tạo Phase 1 cho webapp quản lý lớp học:
- React + Vite + TypeScript
- Tailwind CSS
- React Router
- Firebase Web SDK modular
- React Hook Form + Zod
- TanStack Query
- Firebase Hosting config
- Firestore Rules deny-by-default
- App shell responsive
- Login Google placeholder/config
- .env.example
- README hướng dẫn chạy

Không tích hợp Firebase Storage hoặc Cloud Functions.
Không hardcode secret.
Chạy lint, typecheck và build trước khi kết thúc.
```

## B2. Prompt xây Authentication

```text
Đọc AI-AGENTS-GUIDE-EDUMATRIX-VN.md và triển khai Phase 2.

Yêu cầu:
- Google sign-in
- Invite claim theo normalized email
- users/{uid}
- role admin/teacher/viewer
- disabled account
- route guards
- Firestore Security Rules
- Emulator tests cho invite claim và role escalation

Viewer không được tự chọn role hoặc studentIds.
Hoàn thành cả UI, service, rules và tests.
```

## B3. Prompt xây một module

```text
Đọc AI-AGENTS-GUIDE-EDUMATRIX-VN.md.

Triển khai module [TÊN MODULE] theo vertical slice:
1. Type/schema
2. Firestore service
3. Security Rules
4. Query/index
5. UI desktop/mobile
6. Loading/error/empty state
7. Permission behavior
8. Tests
9. Documentation

Không sửa module ngoài phạm vi nếu không cần.
Không tạo listener realtime nếu tài liệu không yêu cầu.
```

## B4. Prompt review Security Rules

```text
Audit toàn bộ Firestore Security Rules theo AI-AGENTS-GUIDE-EDUMATRIX-VN.md.

Tìm:
- quyền quá rộng
- privilege escalation
- cross-student data access
- mutable ownership fields
- viewer editing staff fields
- invoice status escalation
- invite claim abuse
- missing type/range validation
- query/rule mismatch

Sửa lỗi và bổ sung Emulator tests chứng minh từng quyền.
```

## B5. Prompt tối ưu quota

```text
Audit Firestore reads/writes của codebase theo AI-AGENTS-GUIDE-EDUMATRIX-VN.md.

Tìm:
- onSnapshot không cần thiết
- query không limit
- tải toàn collection
- refetch lặp
- autosave quá thường xuyên
- kiểm tra tồn tại bằng query thay vì deterministic ID
- dashboard đọc nhiều collection
- listener không unsubscribe

Đề xuất và triển khai tối ưu không làm thay đổi nghiệp vụ.
```

## B6. Prompt review UI/UX

```text
Review UI/UX toàn bộ webapp theo AI-AGENTS-GUIDE-EDUMATRIX-VN.md.

Kiểm tra:
- mobile 360px
- staff desktop workflow
- viewer mobile flow
- accessibility
- loading/error/empty
- touch target
- table trên mobile
- form mất dữ liệu
- số bước thao tác
- trạng thái màu có nhãn
- QR readability

Sửa các lỗi có tác động cao trước.
```

## B7. Prompt build Messenger Worker

```text
Đọc AI-AGENTS-GUIDE-EDUMATRIX-VN.md.

Triển khai Cloudflare Worker cho Messenger:
- nhận Firebase ID Token
- verify token
- kiểm tra active role admin/teacher
- validate payload
- đọc Meta token từ secret
- gọi Meta API
- structured error
- rate limit cơ bản
- không log token
- test mock
- tài liệu env/deploy

Không đưa Page Access Token hoặc App Secret vào frontend.
Portal notification vẫn là kênh chính.
```

## B8. Prompt kiểm thử release

```text
Thực hiện release audit theo AI-AGENTS-GUIDE-EDUMATRIX-VN.md.

Chạy:
- lint
- typecheck
- unit tests
- component tests
- Firestore Emulator tests
- build
- mobile viewport smoke test
- role smoke test
- secret scan
- query/listener review

Tạo báo cáo pass/fail và sửa lỗi blocking.
```

---

# PHẦN C — CHECKLIST KHỞI ĐỘNG NHANH CHO AGENT

## C1. Trước khi code

- [ ] Đã đọc toàn bộ tài liệu.
- [ ] Đã xác định phase.
- [ ] Đã khảo sát repository.
- [ ] Đã tìm code có thể tái sử dụng.
- [ ] Đã hiểu data ownership.
- [ ] Đã xác định Rules cần sửa.
- [ ] Đã xác định query/index.
- [ ] Đã xác định mobile UX.
- [ ] Không cần secret trong client.
- [ ] Không thêm dịch vụ ngoài phạm vi.

## C2. Trước khi ghi Firestore

- [ ] Schema đã typed.
- [ ] Form đã validate.
- [ ] Rules đã validate.
- [ ] Field ownership an toàn.
- [ ] Sử dụng server timestamp.
- [ ] Không ghi field thừa.
- [ ] Không ghi nếu dữ liệu không đổi.
- [ ] Có batch/transaction nếu cần.
- [ ] Có error state.
- [ ] Có audit nếu là thao tác nhạy cảm.

## C3. Trước khi tạo query

- [ ] Có filter phù hợp.
- [ ] Có limit.
- [ ] Có pagination nếu là lịch sử.
- [ ] Không filter collection lớn ở client.
- [ ] Không dùng realtime nếu không cần.
- [ ] Listener được unsubscribe.
- [ ] Index đã được xác định.
- [ ] Cache hợp lý.
- [ ] Không tạo N+1 reads.
- [ ] Dashboard dùng summary nếu phù hợp.

## C4. Trước khi hoàn thành

- [ ] Lint pass.
- [ ] Typecheck pass.
- [ ] Test pass.
- [ ] Build pass.
- [ ] Rules test pass.
- [ ] Mobile 360px pass.
- [ ] Viewer permission pass.
- [ ] Không có secret.
- [ ] Không có console error.
- [ ] Tài liệu được cập nhật.

---

# PHẦN D — ĐẶC TẢ DỰ ÁN ĐẦY ĐỦ

Phần dưới đây chứa toàn bộ kế hoạch nghiệp vụ, kiến trúc, dữ liệu, UI/UX, phase, kiểm thử và tiêu chí nghiệm thu. Khi có khác biệt nhỏ giữa phần này và Phần A, AI Agent ưu tiên Phần A vì Phần A là chỉ dẫn triển khai đã được chuẩn hóa.

---

# KẾ HOẠCH XÂY DỰNG HỆ THỐNG QUẢN LÝ LỚP HỌC NỘI BỘ

**Nền tảng:** Firebase Spark Plan  
**Quy mô:** 2 tài khoản Admin/Giáo viên và dưới 50 tài khoản Phụ huynh/Học sinh  
**Frontend:** HTML5, CSS, React/Vite và JavaScript/TypeScript chạy trên trình duyệt  
**Cập nhật:** 11/07/2026

---

## 1. Mục tiêu dự án

Xây dựng một webapp nội bộ phục vụ quản lý lớp học, vận hành với chi phí gần bằng 0 và nằm trong giới hạn Firebase Spark Plan.

Hệ thống cần đáp ứng:

- Đăng nhập bằng tài khoản Google thông qua Firebase Authentication.
- Phân quyền Admin, Giáo viên và Phụ huynh/Học sinh.
- Quản lý học sinh, lớp học, khóa học và lịch học.
- Soạn giáo án và gắn giáo án vào môn, khóa học, lớp hoặc từng buổi học.
- Điểm danh học sinh theo từng buổi.
- Giao bài tập, nhận bài, kiểm tra, chấm điểm và nhận xét.
- Quản lý điểm học tập và tiến độ học sinh.
- Quản lý học phí, công nợ và thanh toán bằng QR chuyển khoản.
- Gửi thông báo lịch học, lịch nghỉ, bài tập và học phí qua Facebook Messenger.
- Tối ưu lượt đọc, ghi và xóa Firestore.
- Giao diện dễ sử dụng trên máy tính, máy tính bảng và điện thoại.

---

## 2. Đánh giá tính khả thi

| Hạng mục | Mức khả thi | Ghi chú |
|---|---:|---|
| Google Authentication | Rất cao | Firebase hỗ trợ trực tiếp |
| Quản lý dưới 50 tài khoản Viewer | Rất cao | Quy mô nhỏ so với quota Spark |
| Quản lý lớp, điểm, giáo án, điểm danh | Rất cao | Phù hợp Firestore |
| Bài tập và chấm bài bằng link | Rất cao | Không cần Firebase Storage |
| Thanh toán bằng QR chuyển khoản | Rất cao | Sinh QR trên trình duyệt |
| Xác nhận học phí thủ công | Rất cao | Không cần API ngân hàng |
| Tự động xác nhận tiền vào | Trung bình | Cần webhook hoặc API ngân hàng |
| Gửi Messenger từ webapp | Khả thi có điều kiện | Cần lớp trung gian bảo vệ token |
| Toàn bộ bí mật đặt trong client | Không an toàn | Không được đặt Page Token/App Secret trong frontend |
| Duy trì chi phí 0 đồng | Cao | Nếu không vượt quota và không dùng dịch vụ trả phí |

### Kết luận

Hệ thống lõi phù hợp với Firebase Spark. Với số lượng người dùng hiện tại, quota Firestore đủ rộng nếu thiết kế truy vấn đúng.

Riêng Facebook Messenger và các tác vụ chứa token bí mật phải đi qua một lớp serverless nhỏ như Cloudflare Worker. CRUD nghiệp vụ vẫn thực hiện trực tiếp từ frontend tới Firestore và được kiểm soát bằng Firebase Security Rules.

---

## 3. Giới hạn kỹ thuật cần tuân thủ

### 3.1. Firestore Spark

Quota miễn phí hiện tại của Cloud Firestore Standard:

- 1 GiB dữ liệu lưu trữ.
- 50.000 document reads/ngày.
- 20.000 document writes/ngày.
- 20.000 document deletes/ngày.
- 10 GiB dữ liệu truyền ra mỗi tháng.

### 3.2. Firebase Hosting

- Miễn phí tối đa 10 GiB lưu trữ nội dung Hosting.
- Phù hợp để triển khai webapp React/Vite dạng tĩnh.

### 3.3. Cloud Storage

Cloud Storage for Firebase hiện yêu cầu dự án sử dụng Blaze Plan. Vì mục tiêu là Spark Plan:

- Không dùng Firebase Storage để upload bài tập hoặc biên lai.
- Dùng Google Drive link, Google Docs, YouTube unlisted hoặc đường dẫn tài liệu ngoài.
- Có thể bổ sung Storage sau khi chấp nhận chuyển sang Blaze.

### 3.4. Cloud Functions

Triển khai Cloud Functions yêu cầu Blaze Plan. Do đó:

- Không dùng Firebase Cloud Functions.
- Logic CRUD thông thường chạy trên frontend.
- Logic chứa secret chạy trên Cloudflare Worker.
- Logic thống kê nhỏ được cập nhật bằng Firestore `writeBatch()`.

### 3.5. Facebook Messenger

- Page Access Token và App Secret không được đưa vào frontend.
- Gửi tin nhắn thông thường chịu giới hạn cửa sổ nhắn tin tiêu chuẩn của Meta.
- Gửi ngoài cửa sổ tiêu chuẩn phải dùng loại tin nhắn, quyền và sự đồng ý phù hợp với chính sách Meta.
- Webapp phải coi thông báo nội bộ là kênh chính; Messenger là kênh bổ sung.

---

## 4. Kiến trúc tổng thể

```text
Người dùng
    │
    ▼
React/Vite Webapp
    ├── HTML5 Semantic
    ├── CSS/Tailwind
    ├── Firebase Authentication
    ├── Firestore Client SDK
    ├── Firebase App Check
    └── Firebase Hosting
            │
            ▼
Cloud Firestore
    ├── Dữ liệu người dùng
    ├── Lớp học và khóa học
    ├── Giáo án và buổi học
    ├── Điểm danh
    ├── Bài tập và bài nộp
    ├── Điểm số
    ├── Học phí
    ├── Thông báo
    └── Nhật ký thao tác

Admin/Giáo viên
    │
    ▼
Cloudflare Worker
    ├── Xác minh Firebase ID Token
    ├── Kiểm tra quyền người gửi
    ├── Giữ Page Access Token trong Secret
    └── Gọi Meta Messenger Send API
```

### Nguyên tắc kiến trúc

1. **Client-first:** nghiệp vụ CRUD thông thường chạy trực tiếp trên frontend.
2. **Rules-first:** Firestore Security Rules mới là lớp bảo mật thực sự.
3. **Không tin dữ liệu từ UI:** mọi quyền phải được kiểm tra lại trong Rules.
4. **Không chứa secret trong client:** token Facebook, App Secret và khóa API riêng tư phải nằm ngoài frontend.
5. **Đọc ít, ghi có kiểm soát:** dùng document tổng hợp cho dashboard.
6. **Không realtime toàn hệ thống:** chỉ bật listener ở màn hình thật sự cần.
7. **Không upload file vào Firebase Storage:** dùng liên kết Google Drive trong phiên bản Spark.

---

## 5. Phân quyền tài khoản

### 5.1. Admin

- Quản lý toàn bộ người dùng.
- Phân quyền và khóa/mở tài khoản.
- Quản lý học sinh, lớp, môn, khóa học.
- Quản lý giáo án, lịch học, điểm danh.
- Giao và chấm bài tập.
- Quản lý điểm học tập.
- Quản lý học phí và xác nhận thanh toán.
- Gửi thông báo.
- Cấu hình Facebook, ngân hàng và hệ thống.
- Xem nhật ký thao tác.
- Xuất dữ liệu sao lưu.

### 5.2. Giáo viên

Giáo viên có quyền ngang Admin trong hoạt động chuyên môn:

- Quản lý học sinh và lớp học.
- Quản lý khóa học, lịch học và buổi học.
- Soạn, sửa, sao chép và gắn giáo án.
- Điểm danh.
- Giao bài, kiểm tra, chấm điểm và nhận xét.
- Quản lý điểm học tập.
- Tạo hóa đơn và xác nhận học phí.
- Gửi thông báo cho phụ huynh.

**Khuyến nghị an toàn:** chỉ Admin được phép thay đổi role, cấu hình tích hợp, thông tin ngân hàng và thiết lập hệ thống.

### 5.3. Phụ huynh/Học sinh

Role chung: `viewer`.

Được phép:

- Xem tổng quan học tập.
- Xem lớp và khóa học đang tham gia.
- Xem lịch học, lịch nghỉ và học bù.
- Xem giáo án tóm tắt được công khai.
- Xem bài tập và trạng thái hoàn thành.
- Gửi link bài làm hoặc đánh dấu đã hoàn thành.
- Xem điểm và nhận xét.
- Xem lịch sử điểm danh.
- Xem hóa đơn và QR học phí.
- Bấm “Tôi đã chuyển khoản”.
- Xem thông báo.

Không được phép:

- Sửa điểm, giáo án, lịch học hoặc học phí.
- Xem dữ liệu của học sinh khác.
- Tự thay đổi role hoặc danh sách học sinh liên kết.
- Truy cập cấu hình hệ thống.
- Gửi tin Messenger từ quyền của trung tâm.

---

## 6. Ma trận quyền đề xuất

| Module | Admin | Giáo viên | Viewer |
|---|---:|---:|---:|
| Người dùng và role | CRUD | Xem | Không |
| Học sinh | CRUD | CRUD | Xem học sinh liên kết |
| Môn học | CRUD | CRUD | Xem |
| Khóa học | CRUD | CRUD | Xem khóa đang học |
| Lớp học | CRUD | CRUD | Xem lớp đang học |
| Lịch học | CRUD | CRUD | Xem |
| Giáo án | CRUD | CRUD | Xem bản công khai |
| Điểm danh | CRUD | CRUD | Xem |
| Bài tập | CRUD | CRUD | Xem/Nộp |
| Chấm bài | CRUD | CRUD | Xem kết quả |
| Điểm học tập | CRUD | CRUD | Xem |
| Hóa đơn | CRUD | CRUD | Xem |
| Xác nhận thanh toán | CRUD | CRUD | Báo đã chuyển |
| Thông báo | CRUD | CRUD | Xem |
| Messenger | Gửi | Gửi | Không |
| Cấu hình hệ thống | CRUD | Không | Không |
| Nhật ký thao tác | Xem | Xem giới hạn | Không |

---

## 7. Quy trình đăng nhập và cấp tài khoản

### 7.1. Quy trình đề xuất

1. Admin tạo lời mời bằng email Google.
2. Hệ thống tạo document trong `invites`.
3. Người dùng đăng nhập Google.
4. Frontend kiểm tra lời mời theo email đã xác thực.
5. Người dùng tạo hồ sơ `users/{uid}`.
6. Firestore Rules kiểm tra email và role phải khớp lời mời.
7. Người dùng được chuyển tới dashboard phù hợp.

### 7.2. Dữ liệu lời mời

```javascript
invites/{normalizedEmail}
{
  email: "parent@gmail.com",
  role: "viewer",
  studentIds: ["student_001"],
  status: "active",
  createdBy: "admin_uid",
  createdAt: Timestamp
}
```

### 7.3. Dữ liệu người dùng

```javascript
users/{uid}
{
  email: "parent@gmail.com",
  displayName: "Nguyễn Văn A",
  photoURL: "...",
  role: "admin" | "teacher" | "viewer",
  studentIds: ["student_001"],
  status: "active" | "disabled",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

## 8. Mô hình dữ liệu Firestore

```text
users/{uid}
invites/{email}

students/{studentId}
subjects/{subjectId}
courses/{courseId}
classes/{classId}
enrollments/{enrollmentId}

lesson_plans/{lessonPlanId}
lesson_plan_templates/{templateId}
sessions/{sessionId}

attendance/{attendanceId}
attendance_summaries/{summaryId}

assignments/{assignmentId}
assignment_summaries/{assignmentId}
submissions/{submissionId}

scores/{scoreId}
student_summaries/{studentId}

invoices/{invoiceId}
payments/{paymentId}

announcements/{announcementId}
message_outbox/{messageId}
messenger_connections/{uid}

viewer_dashboards/{uid}
audit_logs/{logId}
settings/general
settings/payment
settings/messenger
```

---

## 9. Quy ước document ID

Dùng ID xác định khi cần chống ghi trùng:

```text
attendance: {sessionId}_{studentId}
submission: {assignmentId}_{studentId}
enrollment: {classId}_{studentId}
attendance_summary: {classId}_{studentId}
```

Lợi ích:

- Không tạo hai bản điểm danh cho cùng một học sinh trong một buổi.
- Không tạo hai bài nộp cho cùng một bài tập.
- Có thể dùng `setDoc()` với `merge: true`.
- Dễ cập nhật và giảm truy vấn kiểm tra tồn tại.

---

## 10. Module học sinh, môn, khóa học và lớp

### 10.1. Học sinh

```javascript
students/{studentId}
{
  studentCode: "HS001",
  fullName: "Nguyễn Minh Anh",
  dateOfBirth: "2012-05-10",
  parentUids: ["parent_uid"],
  currentClassIds: ["class_001"],
  status: "active",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 10.2. Môn học

```javascript
subjects/{subjectId}
{
  name: "IELTS Speaking",
  code: "IELTS-SPK",
  description: "...",
  status: "active"
}
```

### 10.3. Khóa học

```javascript
courses/{courseId}
{
  name: "IELTS Foundation",
  subjectIds: ["ielts-speaking", "ielts-writing"],
  tuitionFee: 12000000,
  totalSessions: 44,
  startDate: Timestamp,
  endDate: Timestamp,
  status: "draft" | "active" | "completed"
}
```

### 10.4. Lớp học

```javascript
classes/{classId}
{
  name: "HN53 Essentials",
  courseId: "course_001",
  subjectIds: ["subject_001"],
  teacherIds: ["teacher_uid"],
  studentIds: ["student_001"],
  scheduleText: "Thứ 4 và Thứ 6",
  location: "Zoom",
  status: "active"
}
```

### 10.5. Ghi danh

```javascript
enrollments/{classId_studentId}
{
  classId: "class_001",
  courseId: "course_001",
  studentId: "student_001",
  status: "active",
  joinedAt: Timestamp
}
```

---

## 11. Module lịch học và buổi học

```javascript
sessions/{sessionId}
{
  classId: "class_001",
  subjectId: "subject_001",
  lessonPlanId: "lesson_plan_001",

  title: "Buổi 05 - Speaking Introduction",
  startTime: Timestamp,
  endTime: Timestamp,

  teacherId: "teacher_uid",
  locationType: "online" | "offline",
  meetingUrl: "...",
  room: "",

  status: "scheduled" | "completed" | "cancelled" | "rescheduled",
  teachingNote: "",
  completedAt: null,

  createdBy: "teacher_uid",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Chức năng

- Tạo buổi học riêng lẻ.
- Tạo hàng loạt theo lịch cố định.
- Đổi lịch.
- Hủy buổi.
- Tạo lịch học bù.
- Gắn giáo án.
- Điểm danh từ buổi học.
- Giao bài tập từ buổi học.
- Gửi thông báo sau khi đổi lịch.

---

## 12. Module soạn và quản lý giáo án

### 12.1. Chức năng

- Tạo giáo án mới.
- Tạo từ mẫu.
- Sao chép giáo án cũ.
- Lưu bản nháp tự động.
- Chỉnh sửa từng phần.
- Gắn giáo án với môn học.
- Gắn giáo án với khóa học.
- Gắn giáo án với một hoặc nhiều lớp.
- Chọn giáo án cho từng buổi học.
- Theo dõi giáo án đã dạy/chưa dạy.
- Xem trước giáo án.
- In hoặc xuất Markdown/PDF trong giai đoạn nâng cao.
- Hiển thị bản tóm tắt cho phụ huynh/học sinh.

### 12.2. Cấu trúc giáo án

```javascript
lesson_plans/{lessonPlanId}
{
  title: "Unit 1 - Introduction",
  subjectId: "subject_001",
  courseId: "course_001",

  classIds: ["class_001"],
  version: 1,

  objectives: [
    "Biết cách giới thiệu bản thân",
    "Sử dụng thì hiện tại đơn"
  ],

  sections: [
    {
      id: "section_01",
      type: "warmup",
      title: "Khởi động",
      durationMinutes: 10,
      content: "Câu hỏi giới thiệu bản thân"
    },
    {
      id: "section_02",
      type: "lesson",
      title: "Nội dung chính",
      durationMinutes: 45,
      content: "Từ vựng và cấu trúc câu"
    },
    {
      id: "section_03",
      type: "practice",
      title: "Luyện tập",
      durationMinutes: 30,
      content: "Thực hành theo cặp"
    }
  ],

  materials: [
    {
      name: "Cambridge Unit 1",
      url: "https://drive.google.com/..."
    }
  ],

  homeworkTemplateId: "template_001",
  publicSummary: "Học cách giới thiệu bản thân bằng tiếng Anh.",

  visibility: "teacher_only" | "summary_public",
  status: "draft" | "approved" | "active" | "archived",

  createdBy: "teacher_uid",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 12.3. Quy trình giáo án

```text
Bản nháp
→ Hoàn thiện
→ Được sử dụng
→ Gắn vào buổi học
→ Giáo viên đánh dấu đã dạy
→ Ghi nhận nội dung chưa hoàn thành
→ Sao chép/chỉnh sửa cho buổi tiếp theo
```

### 12.4. UI soạn giáo án

Màn hình gồm:

- Thông tin chung.
- Mục tiêu bài học.
- Danh sách section kéo thả.
- Thời lượng từng section.
- Nội dung giảng dạy.
- Tài liệu liên kết.
- Bài tập gợi ý.
- Bản tóm tắt công khai.
- Nút lưu nháp, xem trước và gắn vào lớp.

**Lưu ý quota:** không ghi Firestore sau mỗi phím gõ. Lưu nháp theo một trong các cách:

- Khi người dùng bấm Lưu.
- Debounce sau 15–30 giây có thay đổi.
- Khi rời section.
- Lưu tạm vào `localStorage` trước, sau đó đồng bộ khi người dùng bấm Lưu.

---

## 13. Module điểm danh

### 13.1. Trạng thái

```text
present              Có mặt
absent_excused       Vắng có phép
absent_unexcused     Vắng không phép
late                 Đi muộn
makeup               Học bù
online               Học online
```

### 13.2. Dữ liệu

```javascript
attendance/{sessionId_studentId}
{
  sessionId: "session_001",
  classId: "class_001",
  studentId: "student_001",

  status: "present",
  lateMinutes: 0,
  note: "",

  checkedBy: "teacher_uid",
  checkedAt: Timestamp
}
```

### 13.3. Quy trình điểm danh

1. Giáo viên mở buổi học.
2. Hệ thống tải danh sách học sinh của lớp.
3. Mặc định toàn bộ là “Có mặt”.
4. Giáo viên sửa các trường hợp ngoại lệ.
5. Hệ thống chỉ ghi những bản ghi đã thay đổi.
6. Lưu bằng `writeBatch()`.
7. Cập nhật `attendance_summaries`.
8. Tạo thông báo nếu học sinh vắng hoặc đi muộn.
9. Giáo viên chọn gửi Messenger nếu phù hợp.

### 13.4. Tổng hợp chuyên cần

```javascript
attendance_summaries/{classId_studentId}
{
  classId: "class_001",
  studentId: "student_001",

  totalSessions: 20,
  presentCount: 17,
  absentExcusedCount: 1,
  absentUnexcusedCount: 1,
  lateCount: 1,
  makeupCount: 0,

  attendanceRate: 85,
  updatedAt: Timestamp
}
```

### 13.5. UX mục tiêu

- Điểm danh cả lớp trên một màn hình.
- Mặc định “Có mặt” để giảm thao tác.
- Nút trạng thái đủ lớn cho thiết bị cảm ứng.
- Có nút “Đánh dấu tất cả có mặt”.
- Hiển thị cảnh báo trước khi ghi đè dữ liệu điểm danh cũ.
- Hoàn thành điểm danh một lớp trong dưới 1 phút.

---

## 14. Module bài tập, bài nộp và chấm bài

### 14.1. Quy trình

```text
Giáo viên tạo bài tập
→ Gắn vào lớp/buổi học/giáo án
→ Học sinh xem bài
→ Học sinh gửi link hoặc đánh dấu hoàn thành
→ Giáo viên kiểm tra
→ Chấm điểm và nhận xét
→ Yêu cầu làm lại hoặc hoàn tất
→ Phụ huynh xem kết quả
```

### 14.2. Dữ liệu bài tập

```javascript
assignments/{assignmentId}
{
  title: "Speaking Practice Unit 1",
  classId: "class_001",
  subjectId: "subject_001",
  sessionId: "session_001",
  lessonPlanId: "lesson_plan_001",

  description: "Thu âm phần giới thiệu bản thân",
  materialUrls: [
    "https://drive.google.com/..."
  ],

  dueDate: Timestamp,
  submissionType: "link" | "text" | "confirmation",
  maxScore: 10,

  status: "draft" | "published" | "closed",
  createdBy: "teacher_uid",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 14.3. Dữ liệu bài nộp

```javascript
submissions/{assignmentId_studentId}
{
  assignmentId: "assignment_001",
  studentId: "student_001",
  classId: "class_001",

  submissionUrl: "https://drive.google.com/...",
  submissionText: "",
  studentNote: "Em đã hoàn thành bài.",

  status: "not_started"
        | "submitted"
        | "reviewing"
        | "graded"
        | "redo_required",

  submittedAt: Timestamp,

  score: 8.5,
  teacherComment: "Phát âm tốt, cần cải thiện ngữ điệu.",
  checkedBy: "teacher_uid",
  checkedAt: Timestamp,
  updatedAt: Timestamp
}
```

### 14.4. Tổng hợp bài tập

```javascript
assignment_summaries/{assignmentId}
{
  assignmentId: "assignment_001",
  totalStudents: 20,
  submittedCount: 15,
  gradedCount: 10,
  lateCount: 3,
  updatedAt: Timestamp
}
```

### 14.5. Màn hình giáo viên

- Lọc theo lớp, môn và hạn nộp.
- Hiển thị số đã nộp/chưa nộp.
- Chấm nhanh ngay trong bảng hoặc drawer.
- Nhập điểm và nhận xét.
- Yêu cầu làm lại.
- Chuyển sang học sinh tiếp theo mà không đóng màn hình.
- Gửi thông báo cho nhóm chưa nộp.
- Gửi kết quả cho phụ huynh.

### 14.6. Hạn chế file upload

Vì không sử dụng Firebase Storage:

- Học sinh nộp bằng Google Drive link.
- Học sinh có thể nhập nội dung text.
- Bài đơn giản có thể dùng nút “Đã hoàn thành”.
- Giáo viên gắn tài liệu bằng link.

---

## 15. Module điểm học tập

```javascript
scores/{scoreId}
{
  studentId: "student_001",
  classId: "class_001",
  subjectId: "subject_001",

  assessmentName: "Monthly Test 01",
  assessmentType: "quiz" | "midterm" | "final" | "assignment",
  score: 8.5,
  maxScore: 10,

  teacherComment: "Cần cải thiện Task Response.",

  createdBy: "teacher_uid",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Chức năng

- Nhập điểm từng học sinh.
- Nhập nhanh theo lớp.
- Import CSV trong giai đoạn nâng cao.
- Xem lịch sử điểm.
- Biểu đồ tiến bộ.
- Nhận xét riêng.
- Lọc theo môn và kỳ kiểm tra.
- Hiển thị điểm gần nhất trên dashboard Viewer.

---

## 16. Module học phí và QR chuyển khoản

### 16.1. Dữ liệu hóa đơn

```javascript
invoices/{invoiceId}
{
  invoiceCode: "HP-HS001-202607",
  studentId: "student_001",
  courseId: "course_001",

  title: "Học phí tháng 07/2026",
  amount: 5000000,
  dueDate: Timestamp,

  paymentContent: "HP HS001 202607",
  status: "unpaid" | "pending" | "paid" | "overdue" | "rejected",

  createdBy: "teacher_uid",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 16.2. Dữ liệu thanh toán

```javascript
payments/{paymentId}
{
  invoiceId: "invoice_001",
  studentId: "student_001",

  amount: 5000000,
  transactionReference: "",
  parentNote: "Đã chuyển khoản lúc 10:20.",

  status: "reported" | "verified" | "rejected",
  reportedBy: "parent_uid",
  reportedAt: Timestamp,

  verifiedBy: "teacher_uid",
  verifiedAt: Timestamp
}
```

### 16.3. Quy trình QR

1. Giáo viên tạo hóa đơn.
2. Hệ thống tạo nội dung chuyển khoản duy nhất.
3. Frontend tạo mã VietQR gồm ngân hàng, số tài khoản, số tiền và nội dung.
4. Phụ huynh quét bằng ứng dụng ngân hàng.
5. Phụ huynh bấm “Tôi đã chuyển khoản”.
6. Hóa đơn chuyển sang `pending`.
7. Giáo viên kiểm tra sao kê.
8. Giáo viên xác nhận `paid` hoặc `rejected`.

### 16.4. Cấu hình ngân hàng

```javascript
settings/payment
{
  bankBin: "9704xx",
  accountNumber: "0123456789",
  accountName: "TRUNG TAM ...",
  bankName: "...",
  qrMode: "client_generated",
  updatedBy: "admin_uid",
  updatedAt: Timestamp
}
```

### 16.5. Phiên bản Spark đề xuất

- Tạo QR trên client.
- Đối soát thủ công.
- Không tự động lấy lịch sử giao dịch.
- Không lưu ảnh biên lai vào Firebase.
- Có thể cho phụ huynh nhập mã giao dịch hoặc ghi chú.

### 16.6. Nâng cấp sau này

Muốn xác nhận tiền tự động cần:

- API ngân hàng hoặc đơn vị trung gian.
- Webhook nhận giao dịch.
- Worker/backend xác minh chữ ký.
- Ghép nội dung chuyển khoản với `invoiceCode`.

---

## 17. Module thông báo nội bộ

```javascript
announcements/{announcementId}
{
  title: "Thông báo nghỉ học",
  content: "Lớp nghỉ ngày 15/07/2026.",

  type: "schedule" | "homework" | "attendance" | "payment" | "general",
  audienceType: "class" | "students" | "users",
  classId: "class_001",
  studentIds: [],
  userIds: [],

  publishAt: Timestamp,
  status: "draft" | "published" | "archived",

  createdBy: "teacher_uid",
  createdAt: Timestamp
}
```

### Chức năng

- Soạn thông báo.
- Chọn mẫu.
- Chọn lớp hoặc học sinh.
- Xem trước.
- Đăng trên webapp.
- Chọn gửi thêm qua Messenger.
- Theo dõi gửi thành công/thất bại.

---

## 18. Tích hợp Facebook Messenger

### 18.1. Kiến trúc an toàn

```text
Admin/Giáo viên
    │
    ├── Chọn người nhận
    ├── Soạn nội dung
    └── Gửi Firebase ID Token
            │
            ▼
Cloudflare Worker
    ├── Xác minh token
    ├── Đọc role người dùng
    ├── Kiểm tra quyền gửi
    ├── Lấy Page Access Token từ Secret
    ├── Gọi Meta Send API
    └── Trả kết quả
```

### 18.2. Không được đặt trong frontend

- Facebook Page Access Token.
- Meta App Secret.
- Webhook Verify Token.
- Firebase Service Account JSON.
- Khóa API ngân hàng riêng tư.

### 18.3. Liên kết tài khoản Messenger

```javascript
messenger_connections/{uid}
{
  firebaseUid: "parent_uid",
  studentIds: ["student_001"],
  facebookPsid: "page_scoped_user_id",
  consentStatus: "active",
  connectedAt: Timestamp,
  updatedAt: Timestamp
}
```

### 18.4. Hàng đợi gửi

```javascript
message_outbox/{messageId}
{
  type: "schedule" | "homework" | "attendance" | "payment",
  recipientUid: "parent_uid",
  facebookPsid: "...",

  content: "Lớp học được chuyển sang 19:00.",
  status: "pending" | "sent" | "failed",

  providerMessageId: "",
  errorCode: "",
  errorMessage: "",

  createdBy: "teacher_uid",
  createdAt: Timestamp,
  sentAt: Timestamp
}
```

### 18.5. Mẫu thông báo

- Nhắc lịch học.
- Đổi lịch.
- Nghỉ học.
- Học bù.
- Giao bài tập.
- Nhắc chưa nộp bài.
- Thông báo vắng học.
- Nhắc học phí.
- Xác nhận đã nhận học phí.

### 18.6. Lưu ý chính sách

- Phụ huynh phải chủ động tương tác hoặc đồng ý theo cơ chế Meta cho phép.
- Không coi Messenger là kênh đảm bảo 100%.
- Luôn hiển thị thông báo trong portal.
- Ghi log trạng thái gửi.
- Không tự retry vô hạn.
- Có nội dung dự phòng để giáo viên sao chép gửi thủ công.

---

## 19. Dashboard tối ưu lượt đọc

### 19.1. Document tổng hợp Viewer

```javascript
viewer_dashboards/{uid}
{
  studentCards: [
    {
      studentId: "student_001",
      fullName: "Nguyễn Minh Anh",
      classNames: ["HN53 Essentials"],
      nextSession: {},
      latestScores: [],
      pendingAssignments: [],
      attendanceRate: 95,
      unpaidInvoices: []
    }
  ],

  unreadAnnouncementCount: 2,
  updatedAt: Timestamp
}
```

### 19.2. Nguyên tắc

- Dashboard đọc một document tổng hợp trước.
- Chỉ đọc collection chi tiết khi mở trang con.
- Khi staff cập nhật dữ liệu quan trọng, batch đồng thời cập nhật dashboard.
- Dữ liệu dashboard chỉ chứa tóm tắt, không chứa toàn bộ lịch sử.

### 19.3. Cân bằng read/write

Document tổng hợp làm tăng một ít write nhưng giảm nhiều read từ Viewer. Với dưới 50 tài khoản, đây là đánh đổi hợp lý.

---

## 20. Security Rules

### 20.1. Nguyên tắc

- Mặc định từ chối toàn bộ.
- Chỉ cho phép khi đã đăng nhập.
- Role được đọc từ `users/{uid}`.
- Viewer chỉ đọc dữ liệu liên quan tới `studentIds`.
- Viewer không thể sửa role hoặc danh sách liên kết.
- Staff có quyền nghiệp vụ.
- Chỉ Admin được thay đổi role và settings.
- Validate kiểu dữ liệu và trường được phép cập nhật.

### 20.2. Hàm chung

```javascript
function signedIn() {
  return request.auth != null;
}

function currentUser() {
  return get(
    /databases/$(database)/documents/users/$(request.auth.uid)
  ).data;
}

function isActive() {
  return signedIn() && currentUser().status == "active";
}

function isAdmin() {
  return isActive() && currentUser().role == "admin";
}

function isTeacher() {
  return isActive() && currentUser().role == "teacher";
}

function isStaff() {
  return isAdmin() || isTeacher();
}

function ownsStudent(studentId) {
  return isActive()
    && currentUser().role == "viewer"
    && studentId in currentUser().studentIds;
}
```

### 20.3. Ví dụ điểm số

```javascript
match /scores/{scoreId} {
  allow create, update, delete: if isStaff();

  allow read: if isStaff()
    || ownsStudent(resource.data.studentId);
}
```

### 20.4. Ví dụ hóa đơn

```javascript
match /invoices/{invoiceId} {
  allow create, update, delete: if isStaff();

  allow read: if isStaff()
    || ownsStudent(resource.data.studentId);
}
```

### 20.5. Ví dụ bài nộp

```javascript
match /submissions/{submissionId} {
  allow read: if isStaff()
    || ownsStudent(resource.data.studentId);

  allow create: if ownsStudent(request.resource.data.studentId)
    && request.resource.data.status == "submitted";

  allow update: if isStaff()
    || (
      ownsStudent(resource.data.studentId)
      && request.resource.data.studentId == resource.data.studentId
      && request.resource.data.assignmentId == resource.data.assignmentId
      && request.resource.data.score == resource.data.score
      && request.resource.data.teacherComment == resource.data.teacherComment
    );
}
```

### 20.6. Ví dụ bảo vệ role

```javascript
match /users/{uid} {
  allow read: if isAdmin()
    || request.auth.uid == uid;

  allow update: if isAdmin()
    || (
      request.auth.uid == uid
      && request.resource.data.role == resource.data.role
      && request.resource.data.studentIds == resource.data.studentIds
      && request.resource.data.status == resource.data.status
    );
}
```

### 20.7. Lưu ý

Rules cần được kiểm thử bằng Firebase Emulator. Không triển khai production với Rules dạng:

```javascript
allow read, write: if request.auth != null;
```

---

## 21. Kế hoạch tối ưu quota Firestore

### 21.1. Truy vấn theo phạm vi

Luôn lọc theo:

- `classId`
- `studentId`
- `subjectId`
- `status`
- khoảng thời gian

Không tải toàn bộ collection.

### 21.2. Phân trang

```javascript
query(
  collection(db, "scores"),
  where("studentId", "==", studentId),
  orderBy("createdAt", "desc"),
  limit(20)
)
```

### 21.3. Hạn chế realtime

Chỉ dùng `onSnapshot()` cho:

- Thông báo mới.
- Buổi học đang thao tác.
- Trạng thái gửi Messenger khi staff đang chờ.

Dùng `getDocs()` cho:

- Lịch sử điểm.
- Lịch sử học phí.
- Lịch sử điểm danh.
- Thư viện giáo án.
- Danh sách bài tập cũ.

### 21.4. Hủy listener

```javascript
const unsubscribe = onSnapshot(queryRef, callback);

// Khi rời màn hình
unsubscribe();
```

### 21.5. Batch write

Dùng batch khi:

- Điểm danh cả lớp.
- Nhập điểm hàng loạt.
- Tạo bài tập và summary.
- Xác nhận học phí và cập nhật dashboard.
- Đổi lịch và tạo thông báo.

### 21.6. Không ghi theo từng phím

- Form chỉ cập nhật state/localStorage.
- Ghi Firestore khi bấm Lưu.
- Autosave phải có debounce.
- Không update timestamp liên tục khi người dùng đang nhập.

### 21.7. Soft delete

```javascript
{
  status: "archived",
  archivedAt: Timestamp,
  archivedBy: "uid"
}
```

Dùng soft delete cho:

- Học sinh.
- Lớp học.
- Giáo án.
- Khóa học.
- Bài tập.

### 21.8. Cache

- Cache danh mục ít thay đổi: môn học, lớp học, role.
- Có thể dùng TanStack Query hoặc store cục bộ.
- Không refetch khi dữ liệu vẫn còn mới.
- Dùng `localStorage` cho bản nháp, không lưu dữ liệu nhạy cảm quá mức.

### 21.9. Index

Chỉ tạo composite index khi Firestore yêu cầu. Các index dự kiến:

- `sessions`: classId + startTime
- `scores`: studentId + createdAt
- `assignments`: classId + dueDate
- `submissions`: assignmentId + status
- `invoices`: studentId + dueDate
- `attendance`: studentId + checkedAt
- `announcements`: audienceType + publishAt

---

## 22. Ước tính quota

### Kịch bản sử dụng tương đối cao

| Nhóm | Ước tính đọc/ngày |
|---|---:|
| 2 Staff × 600 reads | 1.200 |
| 50 Viewer × 30 reads | 1.500 |
| Rules, dashboard và thao tác phụ | 2.000–3.000 |
| **Tổng ước tính** | **4.700–5.700** |

So với 50.000 reads/ngày, hệ thống còn dư khoảng 88–90%.

| Hoạt động | Ước tính ghi/ngày |
|---|---:|
| Giáo án, lịch học, bài tập | 150 |
| Điểm danh | 150 |
| Điểm và chấm bài | 200 |
| Dashboard tổng hợp | 250 |
| Học phí, thông báo và log | 200 |
| **Tổng ước tính** | **950** |

So với 20.000 writes/ngày, hệ thống còn dư trên 95%.

Đây là ước tính thiết kế, cần theo dõi thực tế trong Firebase Console sau khi vận hành.

---

# PHẦN II — KẾ HOẠCH FRONTEND, HTML, CSS VÀ UI/UX

## 23. Công nghệ Frontend

### Stack đề xuất

```text
React
Vite
TypeScript hoặc JavaScript + JSDoc
Firebase Web SDK modular
React Router
Tailwind CSS
React Hook Form
Zod
TanStack Query
Lucide Icons
Recharts
date-fns
```

### Giải thích

- **HTML5:** cấu trúc semantic và accessibility.
- **CSS/Tailwind:** xây giao diện nhanh, đồng nhất.
- **React:** phù hợp hệ thống có nhiều màn hình và trạng thái.
- **Vite:** build nhanh, nhẹ và triển khai Hosting thuận tiện.
- **TypeScript:** giảm lỗi dữ liệu khi Vibe Code.
- **React Hook Form:** quản lý form hiệu quả.
- **Zod:** kiểm tra dữ liệu trước khi gửi Firestore.
- **TanStack Query:** cache dữ liệu và giảm refetch.
- **Recharts:** biểu đồ điểm và chuyên cần.

Nếu muốn giữ JavaScript thuần, có thể dùng React + JavaScript. Tuy nhiên TypeScript an toàn hơn cho hệ thống nhiều collection và role.

---

## 24. Cấu trúc thư mục

```text
src/
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   └── guards/
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   ├── feedback/
│   └── layouts/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── users/
│   ├── students/
│   ├── subjects/
│   ├── courses/
│   ├── classes/
│   ├── sessions/
│   ├── lesson-plans/
│   ├── attendance/
│   ├── assignments/
│   ├── submissions/
│   ├── scores/
│   ├── invoices/
│   ├── payments/
│   ├── announcements/
│   └── messenger/
│
├── services/
│   ├── firebase/
│   ├── firestore/
│   └── messenger/
│
├── schemas/
├── hooks/
├── stores/
├── types/
├── utils/
├── constants/
└── styles/
```

Mỗi feature:

```text
feature-name/
├── components/
├── pages/
├── hooks/
├── services/
├── schema.ts
├── types.ts
└── index.ts
```

---

## 25. Router theo role

### Route Staff

```text
/app/dashboard
/app/students
/app/subjects
/app/courses
/app/classes
/app/sessions
/app/lesson-plans
/app/attendance
/app/assignments
/app/submissions
/app/scores
/app/invoices
/app/announcements
/app/settings
```

### Route Viewer

```text
/portal/dashboard
/portal/schedule
/portal/lesson-plans
/portal/assignments
/portal/scores
/portal/attendance
/portal/courses
/portal/tuition
/portal/announcements
```

### Route Guard

- Chưa đăng nhập → `/login`
- Không có invite/profile → `/access-denied`
- Tài khoản bị khóa → `/account-disabled`
- Sai role → chuyển về dashboard đúng role
- Không chỉ ẩn menu; phải chặn route và Firestore Rules

---

## 26. HTML semantic và accessibility

Sử dụng:

```html
<header></header>
<nav aria-label="Điều hướng chính"></nav>
<main></main>
<section></section>
<article></article>
<form></form>
<label></label>
<button type="button"></button>
<table></table>
<footer></footer>
```

Yêu cầu:

- Một trang chỉ có một `h1`.
- Mọi input có label.
- Không dùng `div` giả làm button.
- Có focus state rõ ràng.
- Hỗ trợ bàn phím.
- Icon-only button phải có `aria-label`.
- Màu chữ đạt độ tương phản phù hợp.
- Error message liên kết đúng field.
- Loading state không làm layout nhảy mạnh.
- Form dài chia thành section rõ ràng.

---

## 27. Design System

### 27.1. Màu trạng thái

| Ý nghĩa | Sử dụng |
|---|---|
| Primary | Nút chính, link, active state |
| Success | Đã học, đã chấm, đã thanh toán |
| Warning | Sắp đến hạn, đi muộn, chờ xác nhận |
| Danger | Quá hạn, vắng không phép, lỗi |
| Info | Thông tin, lịch học |
| Neutral | Nền, viền, chữ phụ |

Không chỉ dùng màu để truyền đạt trạng thái; luôn có icon hoặc chữ đi kèm.

### 27.2. Spacing

```text
4px
8px
12px
16px
24px
32px
48px
64px
```

### 27.3. Border radius

```text
Input: 8px
Button: 8px
Card: 12px
Modal/Drawer: 16px
```

### 27.4. Typography

```text
H1: 28–32px
H2: 22–24px
H3: 18–20px
Body: 14–16px
Caption: 12–14px
```

### 27.5. Kích thước thao tác

- Nút trên mobile tối thiểu 44×44px.
- Khoảng cách giữa các thao tác nguy hiểm và thao tác thường phải đủ lớn.
- Nút chính chỉ nên có một trên mỗi vùng thao tác.

---

## 28. Layout Staff

### Desktop

- Sidebar cố định.
- Header có tìm kiếm, thông báo và tài khoản.
- Nội dung chính dạng max-width.
- Bảng dữ liệu đầy đủ.
- Filter nằm trên bảng.
- Form có thể dùng 2 cột.

### Tablet

- Sidebar thu gọn.
- Filter chuyển thành drawer.
- Bảng cho phép cuộn ngang.
- Form 1–2 cột tùy chiều rộng.

### Mobile

- Sidebar thành drawer.
- Bảng chuyển thành card khi phù hợp.
- Sticky action bar cho thao tác Lưu.
- Modal lớn chuyển thành full-screen drawer.
- Hạn chế nhập liệu dài trên màn hình nhỏ.

---

## 29. Layout Viewer

Ưu tiên mobile-first:

- Header đơn giản.
- Bottom navigation 4–5 mục chính.
- Dashboard dạng card.
- Lịch học tiếp theo xuất hiện đầu tiên.
- Bài tập sắp hết hạn có cảnh báo.
- QR học phí hiển thị lớn.
- Không hiển thị dữ liệu quản trị.
- Nội dung dùng từ ngữ dễ hiểu, không dùng thuật ngữ kỹ thuật.

Bottom navigation đề xuất:

```text
Tổng quan
Lịch học
Bài tập
Học phí
Thêm
```

---

## 30. Danh sách màn hình

### Authentication

- Đăng nhập Google.
- Đang xác minh tài khoản.
- Không có quyền.
- Tài khoản bị khóa.
- Lỗi kết nối.

### Staff Dashboard

- Lớp sắp diễn ra.
- Học sinh vắng gần đây.
- Bài tập chưa chấm.
- Hóa đơn chờ xác nhận.
- Giáo án cần chuẩn bị.
- Thao tác nhanh.

### Học sinh

- Danh sách.
- Tạo/sửa.
- Chi tiết.
- Lớp đang học.
- Điểm.
- Chuyên cần.
- Bài tập.
- Học phí.

### Lớp học

- Danh sách lớp.
- Chi tiết lớp.
- Danh sách học sinh.
- Lịch học.
- Tiến độ giáo án.
- Bài tập.
- Điểm danh.

### Giáo án

- Thư viện.
- Bộ lọc.
- Tạo mới.
- Chỉnh sửa.
- Xem trước.
- Sao chép.
- Gắn vào lớp/buổi.
- Lịch sử phiên bản cơ bản.

### Điểm danh

- Chọn lớp/buổi.
- Điểm danh nhanh.
- Xem lịch sử buổi học.
- Thống kê theo học sinh.
- Danh sách vắng nhiều.

### Bài tập

- Danh sách.
- Tạo/sửa.
- Chi tiết.
- Danh sách bài nộp.
- Chấm nhanh.
- Yêu cầu làm lại.
- Thống kê chưa nộp.

### Điểm

- Nhập điểm theo lớp.
- Danh sách điểm.
- Chi tiết học sinh.
- Biểu đồ tiến bộ.

### Học phí

- Danh sách hóa đơn.
- Tạo hóa đơn.
- Chi tiết.
- QR.
- Chờ xác nhận.
- Lịch sử thanh toán.
- Danh sách quá hạn.

### Thông báo

- Danh sách.
- Tạo thông báo.
- Chọn đối tượng.
- Xem trước.
- Gửi webapp.
- Gửi Messenger.
- Kết quả gửi.

### Viewer Portal

- Tổng quan.
- Lịch học.
- Giáo án tóm tắt.
- Bài tập.
- Điểm.
- Chuyên cần.
- Khóa học.
- Học phí.
- Thông báo.

---

## 31. Component dùng chung

```text
AppShell
Sidebar
Topbar
BottomNavigation
PageHeader
Breadcrumb

Button
IconButton
Input
Textarea
Select
Combobox
Checkbox
RadioGroup
DatePicker
TimePicker
SearchInput

Card
StatCard
StudentCard
SessionCard
AssignmentCard
InvoiceCard
LessonPlanCard

DataTable
MobileCardList
Pagination
FilterBar
StatusBadge

Modal
Drawer
ConfirmDialog
Toast
InlineAlert

EmptyState
ErrorState
LoadingSkeleton
PermissionDenied

FormSection
FormActions
AutosaveIndicator

ScoreChart
AttendanceChart
ProgressBar

QRPaymentCard
MessengerStatus
```

---

## 32. Nguyên tắc UI/UX

### 32.1. Một màn hình, một nhiệm vụ chính

Ví dụ màn hình điểm danh chỉ tập trung:

- Danh sách học sinh.
- Trạng thái điểm danh.
- Ghi chú.
- Lưu.

Không đưa biểu đồ phức tạp vào màn hình thao tác chính.

### 32.2. Giảm số lần nhấp

- Điểm danh từ lịch học.
- Gắn giáo án khi tạo buổi.
- Tạo bài tập từ giáo án.
- Chấm bài từ danh sách bài nộp.
- Gửi thông báo ngay sau đổi lịch.
- Mở QR từ card hóa đơn.

### 32.3. Tự động điền

Khi chọn lớp:

- Tự chọn khóa học.
- Tải danh sách học sinh.
- Gợi ý môn học.
- Gợi ý giáo án tiếp theo.
- Gợi ý giáo viên.
- Gợi ý mẫu thông báo.

### 32.4. Tránh mất dữ liệu

- Bản nháp giáo án lưu local.
- Cảnh báo khi rời trang chưa lưu.
- Vô hiệu hóa nút khi đang ghi.
- Chống double submit.
- Giữ dữ liệu form khi mạng lỗi.
- Hiển thị thời điểm lưu gần nhất.

### 32.5. Feedback rõ ràng

Không dùng:

```text
Có lỗi xảy ra.
```

Nên dùng:

```text
Không thể lưu điểm danh vì kết nối bị gián đoạn.
Dữ liệu trên màn hình vẫn được giữ. Hãy thử lưu lại.
```

### 32.6. Empty state có hướng dẫn

Ví dụ:

```text
Lớp này chưa có giáo án.
Tạo giáo án mới hoặc chọn một giáo án từ thư viện.
```

### 32.7. Xác nhận thao tác nguy hiểm

Cần confirm khi:

- Xóa/lưu trữ học sinh.
- Hủy buổi học.
- Ghi đè điểm danh.
- Đổi trạng thái hóa đơn đã thanh toán.
- Gửi tin nhắn hàng loạt.
- Thay đổi role.

---

## 33. Tối ưu hiệu suất Frontend

- Lazy-load từng route.
- Chia bundle theo feature.
- Chỉ import Firebase module cần dùng.
- Memo hóa component bảng lớn khi cần.
- Virtualize danh sách nếu số dòng tăng cao.
- Dùng skeleton thay spinner toàn trang.
- Không giữ listener ở route đã rời.
- Cache danh mục ít thay đổi.
- Debounce tìm kiếm.
- Không gọi query khi từ khóa quá ngắn.
- Resize và tối ưu logo/ảnh tĩnh trước khi deploy.
- Không lưu ảnh base64 trong Firestore.
- Dùng `serverTimestamp()` thay giờ máy người dùng.

---

# PHẦN III — LỘ TRÌNH XÂY DỰNG THEO PHASE

## Phase 0 — Chuẩn hóa yêu cầu

### Công việc

- Chốt role và ma trận quyền.
- Chốt danh sách dữ liệu học sinh.
- Chốt mẫu giáo án.
- Chốt trạng thái điểm danh.
- Chốt quy trình giao/chấm bài.
- Chốt loại điểm.
- Chốt quy trình học phí.
- Chốt mẫu thông báo.
- Chốt Fanpage và ngân hàng.

### Đầu ra

- Sơ đồ module.
- Ma trận quyền.
- Data dictionary.
- User flow.
- Danh sách màn hình.
- Quy ước mã.

### Tiêu chí hoàn thành

- Không còn trường dữ liệu quan trọng chưa xác định.
- Mỗi role có quyền rõ ràng.
- Có quy trình nghiệp vụ từ đầu đến cuối.

---

## Phase 1 — Khởi tạo nền tảng

### Công việc

- Tạo Firebase project Spark.
- Bật Google Authentication.
- Tạo Firestore.
- Khởi tạo Firebase Hosting.
- Bật App Check.
- Tạo repository Git.
- Cài React/Vite.
- Cài router, form, validation và CSS.
- Tạo biến môi trường public của Firebase.
- Tạo layout và Design System.

### Tiêu chí hoàn thành

- Webapp chạy local.
- Đăng nhập Google thành công.
- Deploy Hosting thành công.
- Không có secret riêng tư trong source code.

---

## Phase 2 — Authentication và phân quyền

### Công việc

- Tạo collection `invites`.
- Tạo `users`.
- Xây quy trình claim tài khoản.
- Xây route guard.
- Viết Rules cơ bản.
- Xây trang Access Denied.
- Xây khóa tài khoản.
- Kiểm thử Viewer không nâng quyền.

### Tiêu chí hoàn thành

- Người không được mời không truy cập được.
- Viewer không xem được dữ liệu học sinh khác.
- Teacher không sửa role.
- Admin quản lý được tài khoản.

---

## Phase 3 — Học sinh, môn, khóa học và lớp

### Công việc

- CRUD học sinh.
- CRUD môn học.
- CRUD khóa học.
- CRUD lớp học.
- Ghi danh học sinh.
- Liên kết phụ huynh.
- Filter, tìm kiếm và phân trang.

### Tiêu chí hoàn thành

- Tạo được lớp hoàn chỉnh.
- Gắn được học sinh và giáo viên.
- Viewer chỉ thấy dữ liệu được liên kết.

---

## Phase 4 — Lịch học và buổi học

### Công việc

- Tạo lịch học.
- Tạo nhiều buổi theo lịch.
- Đổi lịch/hủy/học bù.
- Trang lịch theo tuần/tháng.
- Chi tiết buổi học.
- Tạo thông báo từ thay đổi lịch.

### Tiêu chí hoàn thành

- Staff tạo và chỉnh lịch.
- Viewer thấy đúng lịch.
- Buổi hủy/đổi có trạng thái rõ ràng.

---

## Phase 5 — Giáo án

### Công việc

- CRUD giáo án.
- Mẫu giáo án.
- Editor theo section.
- Lưu nháp.
- Sao chép.
- Gắn môn/khóa/lớp/buổi.
- Xem trước.
- Tóm tắt công khai.

### Tiêu chí hoàn thành

- Tạo và gắn giáo án trong tối đa 3 bước chính.
- Không ghi Firestore theo từng phím.
- Viewer chỉ thấy phần công khai.

---

## Phase 6 — Điểm danh

### Công việc

- Tải danh sách lớp.
- Điểm danh nhanh.
- Batch write.
- Sửa điểm danh.
- Attendance summary.
- Thông báo vắng/đi muộn.

### Tiêu chí hoàn thành

- Điểm danh một lớp dưới 1 phút.
- Không ghi trùng.
- Phụ huynh xem được lịch sử.

---

## Phase 7 — Bài tập và chấm bài

### Công việc

- Tạo bài tập.
- Gắn giáo án/buổi học.
- Viewer xem và nộp link/text.
- Giáo viên chấm nhanh.
- Nhận xét.
- Yêu cầu làm lại.
- Assignment summary.
- Nhắc chưa nộp.

### Tiêu chí hoàn thành

- Giáo viên biết ngay ai chưa nộp.
- Viewer không sửa điểm/nhận xét.
- Không cần Firebase Storage.

---

## Phase 8 — Điểm học tập

### Công việc

- Nhập điểm theo lớp.
- Lịch sử điểm.
- Nhận xét.
- Biểu đồ tiến bộ.
- Dashboard summary.

### Tiêu chí hoàn thành

- Staff nhập nhanh.
- Viewer chỉ thấy điểm của mình.
- Dữ liệu có thể phân trang.

---

## Phase 9 — Học phí và QR

### Công việc

- Tạo hóa đơn.
- Tạo nội dung chuyển khoản.
- Sinh QR.
- Viewer báo đã chuyển.
- Staff đối soát.
- Xác nhận/reject.
- Hiển thị công nợ.

### Tiêu chí hoàn thành

- QR có đúng số tiền và nội dung.
- Viewer không tự chuyển hóa đơn thành `paid`.
- Có lịch sử xác nhận.

---

## Phase 10 — Portal phụ huynh/học sinh

### Công việc

- Dashboard một document.
- Lịch học.
- Giáo án tóm tắt.
- Bài tập.
- Điểm.
- Chuyên cần.
- Học phí.
- Thông báo.
- Mobile navigation.

### Tiêu chí hoàn thành

- Nội dung chính tải nhanh.
- Phụ huynh mở lịch trong một lần chạm.
- Mở QR trong tối đa hai lần chạm.

---

## Phase 11 — Messenger

### Công việc

- Tạo Cloudflare Worker.
- Xác minh Firebase ID Token.
- Lưu token bằng Worker Secret.
- Kết nối Meta App/Page.
- Webhook liên kết PSID.
- Gửi tin.
- Ghi trạng thái.
- Xử lý lỗi.
- Kiểm tra chính sách Meta.

### Tiêu chí hoàn thành

- Token không xuất hiện trong frontend.
- Chỉ Staff được gửi.
- Có log thành công/thất bại.
- Webapp vẫn hoạt động nếu Messenger lỗi.

---

## Phase 12 — Tối ưu UI/UX và hiệu suất

### Công việc

- Responsive.
- Accessibility.
- Loading/error/empty state.
- Cache.
- Pagination.
- Lazy loading.
- Tối ưu query.
- Kiểm tra điện thoại thật.
- Tối ưu quy trình giáo viên.

### Tiêu chí hoàn thành

- Không có layout vỡ ở 360px.
- Không có listener thừa.
- Form không mất dữ liệu khi lỗi mạng.
- Thao tác chính ít bước.

---

## Phase 13 — Kiểm thử và triển khai

### Công việc

- Unit test hàm tiện ích.
- Test Rules bằng Emulator.
- Test từng role.
- Test mạng chậm.
- Test double submit.
- Test lỗi Messenger.
- Test QR.
- Test dữ liệu lớn giả lập.
- Deploy Hosting.
- Thiết lập monitoring.
- Hướng dẫn sử dụng.

### Tiêu chí hoàn thành

- Không có lỗi phân quyền mức nghiêm trọng.
- Không có secret trong bundle.
- Tất cả luồng nghiệp vụ quan trọng hoạt động.
- Có quy trình sao lưu thủ công.

---

## 34. Kế hoạch kiểm thử Security Rules

Bắt buộc kiểm tra:

- Người chưa đăng nhập đọc dữ liệu.
- Viewer đọc học sinh không liên kết.
- Viewer sửa `studentIds`.
- Viewer sửa role.
- Viewer sửa điểm.
- Viewer sửa trạng thái invoice thành `paid`.
- Viewer chấm bài.
- Teacher sửa cấu hình tích hợp.
- Tài khoản disabled truy cập dữ liệu.
- Tạo submission cho học sinh khác.
- Ghi điểm danh ngoài lớp.
- Sửa trường không được phép.
- Query không đáp ứng rule.

---

## 35. Kiểm thử nghiệp vụ

### Giáo án

- Lưu nháp.
- Sao chép.
- Gắn nhiều lớp.
- Gắn vào buổi.
- Ẩn nội dung riêng.
- Rời trang khi chưa lưu.

### Điểm danh

- Mặc định có mặt.
- Sửa trạng thái.
- Ghi batch.
- Ghi đè.
- Buổi bị hủy.
- Học sinh mới thêm.

### Bài tập

- Nộp link.
- Nộp lại.
- Chấm điểm.
- Yêu cầu làm lại.
- Quá hạn.
- Viewer cố sửa điểm.

### Học phí

- QR đúng dữ liệu.
- Báo đã chuyển.
- Xác nhận.
- Reject.
- Quá hạn.
- Không cho Viewer tự xác nhận.

### Messenger

- Token hết hạn.
- PSID thiếu.
- Ngoài cửa sổ cho phép.
- API lỗi.
- Gửi trùng.
- Mạng chậm.
- Retry có giới hạn.

---

## 36. Sao lưu và phục hồi trên Spark

Vì các tính năng backup/PITR nâng cao yêu cầu billing:

- Tạo chức năng Admin xuất dữ liệu JSON/CSV.
- Xuất theo từng module.
- Lưu file backup vào máy hoặc Google Drive của Admin.
- Thực hiện định kỳ theo quy trình nội bộ.
- Audit log không thay thế backup.
- Soft delete giúp phục hồi lỗi thao tác thông thường.

Dữ liệu cần ưu tiên sao lưu:

1. Users và liên kết học sinh.
2. Students.
3. Classes, courses và enrollments.
4. Lesson plans.
5. Scores.
6. Attendance.
7. Invoices và payments.

---

## 37. Rủi ro và phương án xử lý

| Rủi ro | Mức độ | Phương án |
|---|---:|---|
| Lộ Page Access Token | Cao | Chỉ lưu trong Worker Secret |
| Rules sai | Cao | Emulator test và deny-by-default |
| Viewer xem nhầm học sinh | Cao | Kiểm tra `studentIds` trong Rules |
| Quá nhiều reads | Trung bình | Dashboard summary, cache, pagination |
| Autosave ghi quá nhiều | Trung bình | Debounce và local draft |
| Không có Firebase Storage | Trung bình | Nộp bằng Drive link |
| Messenger bị hạn chế | Trung bình | Portal là kênh chính |
| Dữ liệu bị xóa nhầm | Trung bình | Soft delete và export backup |
| Staff đổi dữ liệu đồng thời | Thấp | Transaction/batch, updatedAt |
| Phụ huynh báo chuyển khoản sai | Thấp | Staff đối soát trước khi `paid` |

---

## 38. Tiêu chí nghiệm thu toàn hệ thống

### Bảo mật

- Không có secret trong frontend.
- Rules từ chối mặc định.
- Viewer không truy cập chéo dữ liệu.
- Role không thể tự thay đổi.
- Staff action quan trọng có audit log.

### Nghiệp vụ

- Quản lý được học sinh, lớp, khóa học.
- Soạn và gắn giáo án.
- Điểm danh.
- Giao và chấm bài.
- Quản lý điểm.
- Tạo QR học phí.
- Xác nhận thanh toán.
- Gửi thông báo.

### UI/UX

- Giáo viên điểm danh dưới 1 phút.
- Gắn giáo án tối đa 3 bước chính.
- Chấm bài không cần mở nhiều trang.
- Phụ huynh xem lịch bằng một lần chạm.
- QR học phí mở tối đa hai lần chạm.
- Hoạt động tốt ở độ rộng 360px.
- Có loading, empty, error và success state.

### Hiệu suất

- Không tải toàn bộ collection.
- Có phân trang.
- Listener được hủy đúng lúc.
- Dashboard Viewer dùng dữ liệu tổng hợp.
- Không ghi khi dữ liệu không thay đổi.
- Không dùng Firebase Storage hoặc Functions trên Spark.

---

## 39. Thứ tự xây MVP khuyến nghị

1. Firebase project, Hosting và Google Auth.
2. Invite, user profile và Security Rules.
3. Học sinh, môn, khóa học và lớp.
4. Lịch học và buổi học.
5. Giáo án.
6. Điểm danh.
7. Bài tập và chấm bài.
8. Điểm học tập.
9. Portal Viewer.
10. Học phí và QR.
11. Thông báo nội bộ.
12. Messenger.
13. Audit, backup và tối ưu.

Không nên xây Messenger trước khi phân quyền và dữ liệu lớp học đã ổn định.

---

## 40. Khuyến nghị cuối cùng

Kiến trúc phù hợp nhất với mục tiêu chi phí 0 đồng:

```text
Firebase Spark
├── Authentication: Google
├── Firestore: dữ liệu nghiệp vụ
├── Security Rules: phân quyền
├── App Check: hạn chế truy cập giả
└── Hosting: triển khai webapp

Frontend
├── React + Vite
├── HTML5 semantic
├── Tailwind CSS
├── TypeScript/JavaScript
└── Firebase Client SDK

Ngoài Firebase
└── Cloudflare Worker cho Facebook Messenger
```

Ba nguyên tắc không được phá vỡ:

1. Không đưa secret vào client.
2. Không dùng giao diện để thay thế Security Rules.
3. Không tải hoặc realtime dữ liệu không cần thiết.

Với 2 tài khoản Staff và dưới 50 tài khoản Viewer, hệ thống có tính khả thi cao và đủ dư địa trong Spark Plan nếu tuân thủ thiết kế trên.

---

## 41. Tài liệu chính thức tham khảo

- [Firebase Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas)
- [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Firebase Hosting quotas and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
- [Cloud Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions)
- [Firebase Security Rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Meta Messenger Send API](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages)
- [Meta Messenger Send API reference](https://developers.facebook.com/documentation/business-messaging/messenger-platform/reference/send-api/)
