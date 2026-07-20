# Kế hoạch hợp nhất Module Bài tập và Điểm học tập

Ngày: 16/07/2026  
Trạng thái: Bản đề xuất chờ duyệt, chưa triển khai production  
Demo: `docs/edumatrix-ui-learning-assessment-demo-16-07-2026.html`

## 1. Kết luận đề xuất

Hợp nhất hai mục điều hướng thành **Bài tập & Điểm**, dùng một workspace với ba tab:

1. **Tổng quan**: việc cần xử lý, tiến độ nộp/chấm, kết quả theo lớp.
2. **Bài tập**: tạo bài, theo dõi bài nộp, chấm và yêu cầu làm lại.
3. **Sổ điểm**: xem toàn bộ đánh giá, gồm điểm sinh từ bài tập và điểm nhập trực tiếp cho quiz/giữa kỳ/cuối kỳ.

Không xóa collection hoặc route cũ trong lần đầu. Frontend hợp nhất trước, dữ liệu được nối bằng khóa tham chiếu rõ ràng và có lộ trình tương thích ngược.

## 2. Giả định và tiêu chí thành công

### Giả định

- Firebase tiếp tục ở Spark Plan, toàn bộ nghiệp vụ chạy từ client và Firestore Rules là lớp bảo vệ bắt buộc.
- `assignments`, `submissions`, `scores`, `student_summaries` đã có dữ liệu production nên không đổi tên collection.
- Bài tập có thể chấm điểm. Quiz/giữa kỳ/cuối kỳ vẫn có thể nhập điểm trực tiếp, không cần tạo bài nộp giả.
- Admin và Teacher chỉ thao tác trên lớp do mình quản lý. Viewer chỉ đọc dữ liệu của học sinh được liên kết.

### Tiêu chí thành công

- Một điểm từ bài tập chỉ xuất hiện đúng một lần trong `scores`.
- Chấm lại bài cập nhật đúng bản ghi điểm cũ và đúng `student_summaries`, không tăng `scoreCount` lần hai.
- Không có trạng thái `submission.score` khác `score.score` sau khi thao tác đồng bộ thành công.
- Route cũ `/app/assignments` và `/app/scores` vẫn mở được trong giai đoạn chuyển tiếp.
- Rules từ chối điểm ngoài khoảng, sửa danh tính, sửa lớp, hoặc ghi dữ liệu ngoài phạm vi giáo viên.
- UI có loading, empty, error, success; dùng được ở 360px và bàn phím.

## 3. Audit hiện trạng

| Lớp | Hiện trạng | Khoảng trống |
|---|---|---|
| Điều hướng | Hai mục Bài tập và Điểm học tập | Người dùng phải đổi ngữ cảnh dù cùng một chu trình đánh giá |
| Bài tập | `assignments` -> `submissions` -> `assignment_summaries` | Chấm bài chưa tạo/cập nhật `scores` |
| Điểm | `scores` -> `student_summaries` | Không biết điểm nào đến từ assignment/submission |
| Tổng hợp | Hai summary độc lập | Có thể lệch số liệu giữa tiến độ chấm và kết quả học tập |
| Rules | Đã giới hạn lớp, khoảng điểm và immutable fields cơ bản | Chưa validate liên kết assignment/submission/score và chưa khóa `source` |
| Client | `gradeSubmission()` và `saveClassScores()` là hai transaction riêng | Không có atomic write xuyên suốt chuỗi chấm bài -> sổ điểm |

Rủi ro chính: chỉ gộp giao diện sẽ che đi sự phân đôi dữ liệu, không giải quyết tính nhất quán.

## 4. Mô hình dữ liệu tối thiểu

Giữ nguyên collection. Bổ sung field tùy chọn cho `scores`:

```ts
type ScoreSource = "manual" | "assignment";

interface ScoreDoc {
  // field hiện có giữ nguyên
  source: ScoreSource;
  assignmentId: string | null;
  submissionId: string | null;
}
```

Quy ước ID:

- Điểm bài tập: `scoreId = stableDocumentId(["assignment", assignmentId, studentId])`.
- Điểm nhập tay: giữ quy ước hiện có để tránh migration không cần thiết.
- `assessmentType = "assignment"` bắt buộc có `source = "assignment"`, `assignmentId`, `submissionId`.
- Các loại còn lại bắt buộc `source = "manual"` và hai khóa tham chiếu là `null`.

Không sao chép title/maxScore từ nhiều nguồn trong logic hiển thị nếu đã có `assignmentId`. `scores` vẫn giữ snapshot hiện tại để báo cáo lịch sử không đổi khi tên bài được sửa.

## 5. Chuỗi ghi dữ liệu đề xuất

### Chấm bài có điểm

1. Client đọc submission, assignment và score hiện tại.
2. Validate `0 <= score <= assignment.maxScore`, submission thuộc assignment, assignment thuộc lớp được quản lý.
3. Một transaction cập nhật:
   - `submissions/{assignmentId_studentId}`
   - `assignment_summaries/{assignmentId}`
   - `scores/{stableId}`
   - `student_summaries/{studentId}`
4. Nếu chấm lại, trừ percent cũ rồi cộng percent mới; không tăng `scoreCount`.
5. Nếu chọn `redo_required`, không tạo điểm mới. Nếu trước đó đã công bố điểm, cần quyết định nghiệp vụ ở mục 10.

### Nhập điểm trực tiếp

Giữ `saveClassScores`, nhưng bổ sung `source: "manual"`, `assignmentId: null`, `submissionId: null` và validate score hữu hạn, không âm, không vượt maxScore.

### Vì sao dùng transaction client

Spark Plan không dùng Cloud Functions. Transaction là lựa chọn nhỏ nhất để giữ bốn document nhất quán. Giới hạn mỗi học sinh một transaction giống cơ chế hiện có, tránh vượt giới hạn write và dễ retry.

## 6. Firestore Rules cần siết

- `assignments`: validate `maxScore > 0`, `dueAt`, `submissionType`, field allowlist và class scope.
- `submissions`: khi staff chấm, validate `score == null` hoặc nằm trong khoảng của assignment liên kết; khóa `checkedBy` theo `request.auth.uid`.
- `scores`: validate `maxScore > 0`, số hữu hạn theo khả năng rules, `source` enum và cặp khóa tham chiếu.
- Điểm nguồn assignment phải khớp `classId`, `studentId`, `maxScore` của assignment/submission liên quan.
- Khóa immutable thêm: `source`, `assignmentId`, `submissionId`.
- `student_summaries` và `assignment_summaries`: giữ staff-only write, kiểm tra số đếm không âm.
- Không cấp quyền rộng kiểu `isStaff()` cho dữ liệu theo lớp nếu đã có thể dùng `canManageClass()`.

Test Rules bắt buộc:

- Teacher lớp A không chấm hoặc ghi điểm lớp B.
- Viewer không tự ghi điểm, không sửa score/comment khi nộp lại.
- Điểm vượt max, maxScore bằng 0, source sai cặp field đều bị từ chối.
- ID submission không đúng `{assignmentId}_{studentId}` bị từ chối.
- Sửa `assignmentId`, `submissionId`, `studentId`, `classId`, `createdBy` bị từ chối.
- Chấm hợp lệ tạo score nguồn assignment thành công.

## 7. Thiết kế frontend

Design read: product UI giáo dục, tin cậy, thao tác hằng ngày, giữ design system Edumatrix hiện có.  
Dial: `DESIGN_VARIANCE 4`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 6`.

- Một màu nhấn `primary-500 #3366F0`; màu success/warning/danger chỉ mang nghĩa trạng thái.
- Giữ Be Vietnam Pro, radius 8px cho control và 12px cho panel.
- Không thêm thư viện UI mới. Tái sử dụng component hiện có và `lucide-react` đã cài.
- Desktop: sidebar danh sách đánh giá bên trái, vùng xử lý bên phải. Mobile: danh sách chuyển thành select/filter và nội dung một cột.
- Form tạo bài chuyển vào modal/drawer để không chiếm toàn bộ đầu trang.
- Sổ điểm dùng bảng có sticky header, filter lớp/loại/trạng thái và nút lưu rõ phạm vi.
- Chấm nhanh hỗ trợ Tab/Enter, lưu từng dòng hoặc lưu nhóm, luôn hiển thị số thay đổi chưa lưu.

Trạng thái cần có:

- Loading skeleton đúng hình bảng/danh sách.
- Empty theo ngữ cảnh: chưa có bài, chưa có bài nộp, chưa có điểm.
- Error inline, giữ nguyên dữ liệu đã nhập.
- Success xác nhận phạm vi đã lưu.
- Conflict khi submission thay đổi từ thiết bị khác: refetch và yêu cầu xác nhận lại.

## 8. Route và tương thích

- Route chuẩn mới đề xuất: `/app/learning`.
- `/app/assignments` redirect tới `/app/learning?tab=assignments`.
- `/app/scores` redirect tới `/app/learning?tab=gradebook`.
- Sidebar chỉ hiển thị một mục **Bài tập & Điểm** sau khi rollout.
- Viewer giữ `/portal/assignments` trong phase đầu; kết quả điểm có thể bổ sung dưới chi tiết bài sau khi staff flow ổn định.

## 9. Kế hoạch triển khai sau khi duyệt

1. **Khóa hợp đồng dữ liệu**  
   Verify: type, ID, state transition và quyết định redo được duyệt.
2. **Viết Rules tests trước**  
   Verify: test mới fail với rules hiện tại, bao phủ scope và immutable fields.
3. **Bổ sung rules và transaction đồng bộ**  
   Verify: Rules tests, unit tests idempotency và test chấm lại đều pass.
4. **Dựng `LearningPage` bằng component hiện có**  
   Verify: typecheck, build, keyboard, responsive, loading/empty/error.
5. **Thêm redirect và đổi navigation**  
   Verify: deep link cũ và back/forward browser hoạt động.
6. **Đối soát dữ liệu cũ phía client theo trang**  
   Verify: báo cáo số submission đã graded nhưng chưa có score; chưa tự động sửa production nếu chưa duyệt.
7. **Rollout hai bước**  
   Verify: bật workspace mới cho staff, theo dõi lỗi; chỉ ẩn hai mục cũ sau khi đối soát đạt 100%.

## 10. Điểm cần duyệt

1. Khi bài đã có điểm rồi chuyển sang **Cần làm lại**, điểm cũ sẽ:
   - Khuyến nghị: giữ trong sổ điểm nhưng đánh dấu chưa công bố cho đến lần chấm mới.
   - Phương án đơn giản hơn: xóa khỏi phép tính trung bình ngay khi yêu cầu làm lại.
2. Có cho phép bài tập **không tính điểm** không? Nếu có, cần `gradingMode: "scored" | "feedback_only"` trên assignment.
3. Tên module cuối cùng: **Bài tập & Điểm** (khuyến nghị) hay **Đánh giá học tập**.

## 11. Ngoài phạm vi bản demo

- Chưa sửa source production, Firestore Rules, navigation hoặc route.
- Chưa migration/backfill dữ liệu thật.
- Chưa thay đổi portal phụ huynh/học sinh.
- Chưa thêm Cloud Functions, Storage hoặc gói trả phí.

