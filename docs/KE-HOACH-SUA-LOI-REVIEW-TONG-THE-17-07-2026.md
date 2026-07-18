# Kế hoạch: Khắc phục các vấn đề từ Báo cáo Rà soát Mã nguồn (17/07/2026)

Ngày: 17/07/2026
Nguồn: `docs/BAO-CAO-REVIEW-TONG-THE-DU-AN-17-07-2026.html` (33 vấn đề: 11 mức Cao, 13 mức Trung bình, 9 mức Thấp)
Phạm vi: chỉ liệt kê và lên phương án sửa — **chưa có dòng code nào được thay đổi**. Đây là tài liệu để duyệt trước khi triển khai từng đợt.

## 0. Nguyên tắc chung khi triển khai

- Sửa từng đợt một, chạy đủ `npm run typecheck && npm run lint && npm run test && npm run test:rules` sau mỗi đợt trước khi qua đợt tiếp theo.
- Đợt 1 và Đợt 2 nên làm trước tiên vì liên quan trực tiếp đến **tiền học phí**, **điểm số** và **rủi ro âm thầm** (lỗi xảy ra nhưng không ai biết).
- Đợt 3, Đợt 4 không gấp, có thể làm xen kẽ hoặc gộp vào các đợt nâng cấp module đang có sẵn.
- 4 mục được đánh dấu **[CẦN ADMIN QUYẾT ĐỊNH]** có ảnh hưởng đến nghiệp vụ, không tự ý chọn phương án khi triển khai.

---

## Đợt 1 — Tài chính & Dữ liệu (ưu tiên cao nhất)

Lý do làm trước: đây là những chỗ nếu sai sẽ ảnh hưởng trực tiếp đến tiền học phí thật hoặc điểm số thật của học sinh, và lỗi hiện đang **âm thầm** — không có cảnh báo nào cho người dùng.

### 1.1. Nhập điểm thủ công không giới hạn điểm

- **Vấn đề:** `saveClassScores` (`src/services/firestore/scores.ts`) chỉ kiểm tra `maxScore > 0`, không kiểm tra từng điểm nhập vào có nằm trong khoảng `0..maxScore`. Ô nhập điểm trên `ScoresPage` không nằm trong `<form>` chuẩn nên giới hạn hiển thị trên giao diện không thực sự chặn được gì.
- **Cách sửa:** Trong `saveClassScores`, trước khi ghi transaction, validate từng `entry.score`: `if (entry.score < 0 || entry.score > input.maxScore) throw new Error("SCORE_INVALID")` — dùng đúng mã lỗi mà `gradeSubmission` (`assignments.ts`) đã dùng cho cùng khái niệm, để `ScoresPage` xử lý lỗi nhất quán. Đồng thời bọc khu vực nhập điểm bằng `<form onSubmit>` thực sự thay vì `onClick` rời, để `min`/`max` trên `<input>` có tác dụng dự phòng.
- **File:** `src/services/firestore/scores.ts`, `src/features/scores/pages/ScoresPage.tsx`
- **Kiểm tra sau khi sửa:** Thử nhập điểm âm và điểm vượt `maxScore` trên giao diện → phải bị chặn/báo lỗi rõ ràng, không lưu được. Viết thêm test cho `saveClassScores` với điểm ngoài khoảng.

### 1.2. Luật bảo mật cho hóa đơn thiếu kiểm tra thông tin ngân hàng **[CẦN ADMIN QUYẾT ĐỊNH]**

- **Vấn đề:** `firestore.rules` (đoạn tạo `invoices`, dòng 676-681) chỉ kiểm tra `amount > 0`, không kiểm tra `bankBin`/`accountNumber`/`accountName`/`studentId`/`courseId`. Vì các trường này bị khóa cứng sau khi tạo, bất kỳ tài khoản **giáo viên** nào (không chỉ Admin) về lý thuyết có thể tạo hóa đơn với số tài khoản ngân hàng giả.
- **Cần Admin quyết định trước:** Giáo viên có thực sự cần quyền tự tạo hóa đơn không, hay chỉ Admin/Kế toán mới được tạo? Hai phương án:
  - **(A) Siết quyền:** đổi `allow create` của `invoices` từ `isStaff()` thành `isAdmin()`. Đơn giản, ít rủi ro, nhưng giáo viên mất khả năng tự lập hóa đơn nếu trước giờ vẫn dùng.
  - **(B) Giữ quyền, thêm kiểm tra:** giữ `isStaff()`, nhưng bắt buộc `bankBin`/`accountNumber`/`accountName` phải khớp với `get(/settings/payment).data` (nguồn thông tin ngân hàng chính thức), tương tự cách `validScoreSource` đối chiếu dữ liệu ở nơi khác.
- **File:** `firebase/firestore.rules` (dòng 676-681), test tương ứng trong `firebase/tests/`
- **Kiểm tra sau khi sửa:** Viết test giả lập một tài khoản giáo viên cố tạo hóa đơn với số tài khoản khác `settings/payment` (hoặc cố tạo hóa đơn nếu chọn phương án A) → phải bị `assertFails`.

### 1.3. Trang "Đóng học phí" của phụ huynh im lặng khi báo lỗi

- **Vấn đề:** `ViewerTuitionPage.tsx` không có trạng thái tải/lỗi, và khi mutation "Tôi đã chuyển khoản" bị từ chối (ví dụ hóa đơn đã được đánh dấu thanh toán), không có gì hiển thị cho phụ huynh biết — họ tưởng đã báo thành công.
- **Cách sửa:** Thêm `LoadingSkeleton`/`ErrorState`/`EmptyState` theo đúng khuôn mẫu đang dùng ở `InvoicesPage` (staff) và các trang Viewer khác. Hiển thị `report.isError` bằng một dòng thông báo lỗi rõ ràng ngay dưới nút bấm, kèm nút "Thử lại".
- **File:** `src/features/invoices/pages/ViewerTuitionPage.tsx`
- **Kiểm tra sau khi sửa:** Giả lập báo chuyển khoản cho hóa đơn đã `paid` → phải thấy thông báo lỗi trên giao diện, không phải im lặng.

### 1.4. Mã hóa đơn có thể trùng trong cùng tháng

- **Vấn đề:** `createInvoiceCode` (`src/utils/payment.ts`) ghép `HP-{studentId}-{yyyyMM}`, không có số phân biệt. Một học viên có 2 hóa đơn cùng tháng (học phí + phí học bù) sẽ có cùng nội dung chuyển khoản, gây khó đối soát ngân hàng.
- **Cách sửa:** Thêm hậu tố ngắn để phân biệt — ví dụ 4 ký tự cuối của Firestore document ID, hoặc số thứ tự đếm theo học viên+tháng (đọc trước khi ghi trong transaction). Ưu tiên phương án dùng document ID vì không cần đọc thêm dữ liệu trước khi ghi.
- **File:** `src/utils/payment.ts`, `src/services/firestore/invoices.ts`
- **Kiểm tra sau khi sửa:** Tạo 2 hóa đơn cho cùng học viên trong cùng tháng → mã hóa đơn/nội dung chuyển khoản phải khác nhau.

---

## Đợt 2 — Rủi ro âm thầm & Nhất quán quan trọng

### 2.1. File cấu hình Vite/Tailwind bị trùng

- **Vấn đề:** `vite.config.js` và `vite.config.ts` gần giống hệt nhau; Vite ưu tiên chạy bản `.js` (không được kiểm tra kiểu dữ liệu) dù `.ts` mới là bản được `tsconfig.node.json` theo dõi. Tương tự với `tailwind.config.js`/`.ts`/`.d.ts` (bản `.d.ts` rỗng).
- **Cách sửa:** Xóa hẳn `vite.config.js` và `tailwind.config.js` (bản `.js` là bản không kiểm soát được), giữ lại `vite.config.ts`/`tailwind.config.ts` làm nguồn duy nhất. Xóa `tailwind.config.d.ts` (file rỗng, không có tác dụng). Chạy thử `npm run dev` và `npm run build` để xác nhận Vite/Tailwind vẫn nạp đúng cấu hình sau khi xóa bản `.js`.
- **File:** `vite.config.js`, `tailwind.config.js`, `tailwind.config.d.ts`
- **Kiểm tra sau khi sửa:** `npm run dev`, `npm run build` chạy thành công, giao diện không đổi.

### 2.2. Bộ lọc "Thời gian" trong danh sách Học viên không hoạt động **[CẦN ADMIN QUYẾT ĐỊNH]**

- **Vấn đề:** `TimeRangeFilter.tsx` chỉ là giao diện trang trí — ngày tháng viết cứng, nút "Áp dụng" không lọc được gì.
- **Cần Admin quyết định:** Nhân viên có thực sự cần lọc học viên theo khoảng thời gian không (theo ngày sinh? ngày tạo hồ sơ? ngày nhập học)? Hai phương án:
  - **(A)** Làm cho bộ lọc hoạt động thật — cần biết muốn lọc theo trường ngày nào.
  - **(B)** Gỡ bỏ hẳn khỏi giao diện nếu không cần, tránh gây hiểu nhầm.
- **File:** `src/features/students/components/TimeRangeFilter.tsx`, `src/features/students/components/StudentsList.tsx`
- **Kiểm tra sau khi sửa:** Nếu chọn (A): lọc thử và xác nhận danh sách thay đổi đúng. Nếu chọn (B): xác nhận nút lọc không còn xuất hiện.

### 2.3. Giáo án có thể "Xuất bản" mà không gắn lớp học

- **Vấn đề:** Ô "Lớp học" trên `LessonPlanForm.tsx` có dấu `*` báo bắt buộc nhưng schema Zod (`classId: z.string().nullable().default(null)`) không thực sự bắt buộc — giáo án xuất bản thiếu lớp sẽ không hiện cho phụ huynh mà không ai được cảnh báo.
- **Cách sửa:** Thêm `.refine()` vào `lessonPlanFormSchema` bắt buộc `classId` khi `status === "published"` (hoặc bắt buộc luôn tùy nghiệp vụ), hiển thị lỗi tại vị trí `errors.classId` trong form (hiện đang không được render ở đâu cả), và chặn nút "Xuất bản" nếu thiếu lớp thay vì lưu thành công trong im lặng.
- **File:** `src/schemas/lessonPlan.ts`, `src/features/lesson-plans/components/LessonPlanForm.tsx`
- **Kiểm tra sau khi sửa:** Thử xuất bản giáo án không chọn lớp → phải bị chặn với thông báo lỗi rõ ràng.

### 2.4. Xử lý múi giờ không nhất quán trong Lịch học

- **Vấn đề:** `recurrence.ts`, `sessions.ts`, `FitWeekTimetable.tsx`, `TimetableGrid.tsx`, `MonthGrid.tsx` dùng các hàm `Date` thô (`.setHours()`, `.getDay()`...) chạy theo múi giờ máy tính cục bộ, thay vì cố định theo giờ Việt Nam như `usage.ts` đã làm đúng bằng `date-fns-tz`.
- **Cách sửa:** Thay các thao tác `Date` thô trong các file trên bằng `formatInTimeZone`/`zonedTimeToUtc` (`date-fns-tz`) với hằng số `TIME_ZONE = "Asia/Bangkok"` đã có sẵn trong `usage.ts` — nên tách hằng số này ra một nơi dùng chung (ví dụ `src/constants/time.ts`) rồi import lại ở cả 2 nơi.
- **File:** `src/utils/recurrence.ts`, `src/services/firestore/sessions.ts`, `src/features/sessions/components/{FitWeekTimetable.tsx,TimetableGrid.tsx,MonthGrid.tsx}`
- **Kiểm tra sau khi sửa:** Đổi múi giờ hệ điều hành máy test sang một múi giờ khác Việt Nam (ví dụ UTC hoặc US Pacific) → tạo lịch lặp lại và kéo-thả đổi giờ → ngày/giờ hiển thị phải không đổi so với khi máy đặt giờ Việt Nam.

### 2.5. Biểu mẫu tạo Bài tập bắt gõ tay mã kỹ thuật

- **Vấn đề:** `AssignmentsPage.tsx` yêu cầu gõ tay "Mã giáo án" và "Mã buổi học" (Firestore document ID) thay vì chọn từ danh sách — không ai không rành kỹ thuật biết mã đó là gì.
- **Cách sửa:** Thay 2 ô `<input>` tự do bằng 2 ô `<select>` lấy danh sách giáo án/buổi học theo lớp đã chọn trong form (giống cách chọn lớp/môn/khóa học ở nơi khác trong hệ thống).
- **File:** `src/features/assignments/pages/AssignmentsPage.tsx`
- **Kiểm tra sau khi sửa:** Tạo bài tập và gắn giáo án/buổi học bằng cách chọn từ danh sách xổ xuống, xác nhận lưu đúng ID tương ứng.

---

## Đợt 3 — Nhất quán & Dọn dẹp có ảnh hưởng chức năng

### 3.1. Bổ sung kiểm tra định dạng dữ liệu còn thiếu trong Firestore Rules

- **Vấn đề:** Các collection `assignments`, `submissions`, `announcements`, `payments` chỉ kiểm tra một vài trường khi ghi, không có `hasOnly`/`hasAll` đầy đủ như `validStudentData`/`validClassData`.
- **Cách sửa:** Viết thêm các hàm `validAssignmentData()`, `validSubmissionData()`, `validAnnouncementData()`, `validPaymentData()` theo đúng khuôn của các hàm `valid*Data` hiện có, áp dụng vào `allow create`/`allow update` tương ứng.
- **File:** `firebase/firestore.rules`
- **Kiểm tra sau khi sửa:** Viết test `assertFails` cho việc ghi thêm trường lạ/sai kiểu vào từng collection.

### 3.2. Đối chiếu chéo dữ liệu còn thiếu trong Rules

- **Vấn đề:** `submissions` không đối chiếu `assignmentId` → `classId` thực sự khớp nhau (dòng 619-621); `payments` không đối chiếu `invoiceId`/`amount` với hóa đơn gốc (dòng 693-698).
- **Cách sửa:** Thêm `get(/databases/$(database)/documents/assignments/$(assignmentId)).data.classId == classId` cho `submissions`, và `get(...).data.amount == request.resource.data.amount` cho `payments`, theo đúng mẫu `validScoreSource` đã làm.
- **File:** `firebase/firestore.rules` (dòng 619-621, 693-698)
- **Kiểm tra sau khi sửa:** Test giả lập nộp bài/báo thanh toán với dữ liệu không khớp → phải `assertFails`.

### 3.3. Làm mới dữ liệu mẫu trong test luật bảo mật

- **Vấn đề:** `immutable-rules.test.ts` và `phase5-rules.test.ts` vẫn dùng cấu trúc giáo án cũ (`sections: []`), trong khi schema thật đã đổi sang `objectives`/`preparation`/`activities`/... từ đợt nâng cấp 16/07 — test vẫn "chạy qua" nhưng không còn kiểm tra đúng thứ cần kiểm tra.
- **Cách sửa:** Cập nhật dữ liệu mẫu trong 2 file test theo đúng schema giáo án hiện tại.
- **File:** `firebase/tests/immutable-rules.test.ts`, `firebase/tests/phase5-rules.test.ts`
- **Kiểm tra sau khi sửa:** `npm run test:rules` (cần chạy thủ công — máy hiện tại thiếu JDK 21+ để chạy Firebase emulator, xem ghi chú bên dưới).

### 3.4. Thêm trạng thái tải/lỗi cho 2 màn hình Viewer còn thiếu

- **Vấn đề:** `ViewerAssignmentsPage.tsx` và `ViewerAnnouncementsPage.tsx` không có `LoadingSkeleton`/`ErrorState`, khác với phần còn lại của hệ thống.
- **Cách sửa:** Áp dụng đúng khuôn mẫu 3 trạng thái tải/lỗi/rỗng đang dùng ở `ViewerDashboardPage`/`ViewerSchedulePage`.
- **File:** `src/features/assignments/pages/ViewerAssignmentsPage.tsx`, `src/features/dashboard/pages/ViewerAnnouncementsPage.tsx`

### 3.5. Gom logic lấy "Thông báo" về một service dùng chung

- **Vấn đề:** Cùng một câu truy vấn thông báo được viết tay lặp lại ở 3 nơi (`Topbar.tsx`, `ViewerAnnouncementsPage.tsx`, `viewerDashboard.ts`), 2 trong số đó truy cập Firestore trực tiếp thay vì qua lớp service dùng chung.
- **Cách sửa:** Tạo `src/services/firestore/announcements.ts` với hàm `listAnnouncementsForStudent()` dùng kiểu dữ liệu thống nhất, thay thế cả 3 nơi gọi trực tiếp.
- **File:** `src/services/firestore/announcements.ts` (mới), `src/components/layouts/Topbar.tsx`, `src/features/dashboard/pages/ViewerAnnouncementsPage.tsx`, `src/services/firestore/viewerDashboard.ts`

### 3.6. Sửa kiểu dữ liệu bị ép sai trong Viewer Dashboard

- **Vấn đề:** `viewerDashboard.ts` ép toàn bộ dữ liệu về `Record<string, unknown>[]` (`as unknown as`), bỏ qua kiểm tra kiểu dữ liệu đã xây ở nơi khác.
- **Cách sửa:** Định nghĩa lại `ViewerDashboardData` dùng đúng kiểu gốc (`SessionDoc[]`, `LessonPlanDoc[]`...) thay vì ép về dạng chung chung; sửa `ViewerDashboardPage.tsx` đọc theo trường đã định kiểu thay vì index bằng chuỗi.
- **File:** `src/services/firestore/viewerDashboard.ts`, `src/features/dashboard/pages/ViewerDashboardPage.tsx`

### 3.7. Dọn code chết đã xác nhận không dùng ở đâu

- **Vấn đề:** 7 vị trí code chết đã xác nhận (grep toàn bộ `src/`, không có import nào trỏ tới):
  - `src/features/sessions/components/ClassScheduleList.tsx`
  - `src/features/users/pages/UsersPage.tsx` + `components/{InviteForm,InvitesList,UsersList,UserDetailModal}.tsx` (5 file)
  - `src/features/announcements/pages/StaffAnnouncementsPage.tsx`
  - Nhánh "edit mode" trong `src/features/students/components/StudentForm.tsx` (giữ phần "create", xóa phần "edit" không dùng)
  - `src/services/firebase/client.ts` (barrel không ai import)
  - `src/components/feedback/PermissionDenied.tsx`
- **Cách sửa:** Xóa hẳn các file/nhánh trên. Không cần thay thế vì đã có bản mới đang hoạt động thay thế từng cái.
- **Kiểm tra sau khi sửa:** `npm run typecheck && npm run lint && npm run build` không lỗi (xác nhận không có import ẩn nào bị bỏ sót).

### 3.8. Gom định dạng ngày tháng và tiền tệ về dùng chung

- **Vấn đề:** Định dạng `dd/MM/yyyy` viết tay lặp lại ở 8+ file; hàm `formatVnd()` đã có sẵn nhưng 2 màn hình vẫn tự viết lại.
- **Cách sửa:** Tạo `src/utils/date.ts` với các hàm định dạng ngày dùng chung, thay dần các chỗ viết tay khi có dịp sửa file đó (không bắt buộc làm một lần). Thay 2 chỗ dùng `formatVnd()` thay vì tự viết lại ở `ViewerTuitionPage.tsx`, `SettingsAdminPage.tsx`.
- **File:** `src/utils/date.ts` (mới), nhiều file rải rác

### 3.9. Tập trung tên query key của React Query

- **Vấn đề:** Tên nhóm dữ liệu cache (`["students"]`, `["classes"]`...) viết tay rải rác ở 28+ file, chỉ hoạt động đúng nhờ trùng tên theo thói quen.
- **Cách sửa:** Tạo `src/hooks/queryKeys.ts` làm factory tập trung, refactor dần theo từng module khi có dịp sửa (không cần đổi hết một lần, rủi ro cao nếu đổi đồng loạt).
- **File:** `src/hooks/queryKeys.ts` (mới)

### 3.10. Chuẩn hóa cách xử lý lỗi của `messenger/client.ts`

- **Vấn đề:** File viết một dòng dày đặc, ép kiểu `as {...}` không kiểm tra dữ liệu trả về, chỉ `throw` thay vì trả về kiểu `Result` như các service khác.
- **Cách sửa:** Viết lại theo đúng pattern `try/catch` + kiểu `Result` (`{ success: true, ... } | { success: false, reason: ... }`) đang dùng ở `students.ts`/`users.ts`.
- **File:** `src/services/messenger/client.ts`

---

## Đợt 4 — Vệ sinh kho mã nguồn (không ảnh hưởng chức năng, làm khi rảnh)

### 4.1. Gỡ file build tạm bị track nhầm trong git

- **Vấn đề:** `tsconfig.app.tsbuildinfo`, `tsconfig.node.tsbuildinfo` đang bị lưu trong git dù `.gitignore` đã có `*.tsbuildinfo`.
- **Cách sửa:** `git rm --cached tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo` rồi commit.

### 4.2. Luật `viewer_dashboards` không có tác dụng thực tế **[CẦN ADMIN QUYẾT ĐỊNH]**

- **Vấn đề:** Rules cho `viewer_dashboards` giả định có Admin SDK ghi dữ liệu, nhưng dự án không có Cloud Functions (gói Spark) nên không bao giờ dùng tới.
- **Cần Admin quyết định:** Giữ lại để dự phòng cho tương lai nếu nâng cấp lên gói Blaze và có Cloud Functions, hay xóa hẳn (khối rules + `getViewerDashboard()`/`buildViewerDashboard()` không dùng) để gọn kho mã nguồn?
- **File:** `firebase/firestore.rules` (dòng 719-725), `src/services/firestore/viewerDashboard.ts`

### 4.3. Sửa hằng số `settings/messenger` không khớp Rules

- **Vấn đề:** `SETTINGS_DOC.MESSENGER` khai báo trong `collections.ts` nhưng Rules chỉ chấp nhận `docId in ['general','integrations','payment']` — nếu sau này có tính năng dùng tới sẽ luôn bị từ chối ghi.
- **Cách sửa:** Thêm `'messenger'` vào danh sách `docId` hợp lệ trong Rules (không cần validate thêm gì khác, chỉ để không bị chặn nhầm khi có tính năng dùng tới).
- **File:** `firebase/firestore.rules` (dòng 366-370)

### 4.4. Xử lý thư mục tài liệu tham khảo cồng kềnh **[CẦN ADMIN QUYẾT ĐỊNH]**

- **Vấn đề:** Thư mục `Agents Instuctions/` chứa khoảng 910 file tài liệu tham khảo sao chép từ các dự án mã nguồn mở khác, không phải mã nguồn Edumatrix, làm phình to kho mã nguồn chính.
- **Cần Admin quyết định:** Có cần giữ các tài liệu này trong repo sản phẩm không? Nếu không, nên dọn theo hướng nào — xóa hẳn, hay chuyển sang một repo/thư mục riêng ngoài dự án?
- **File:** `Agents Instuctions/`

### 4.5. Lưu trữ tài liệu kế hoạch cũ

- **Vấn đề:** `docs/` có hơn 40 file kế hoạch/báo cáo tích lũy qua nhiều đợt nâng cấp, khó tìm tài liệu còn hiệu lực.
- **Cách sửa:** Tạo `docs/archive/` và chuyển các file kế hoạch đã hoàn thành + đã triển khai xong (ví dụ các file `KE-HOACH-*` của các module đã duyệt và lên production) vào đó, giữ `docs/` gốc chỉ còn tài liệu đang hiệu lực (README kỹ thuật, hướng dẫn vận hành, kế hoạch đang mở).
- **File:** `docs/`

---

## Ghi chú: giới hạn khi kiểm thử luật bảo mật

Các mục 1.2, 3.1, 3.2, 3.3 cần chạy `npm run test:rules` (bộ test dùng Firebase Emulator) để xác nhận. Môi trường sandbox hiện tại chỉ có JDK 11, trong khi emulator cần JDK 21+ — cần chạy bộ test này trên máy của Admin/lập trình viên sau khi sửa, không chạy được trong phiên làm việc này.

## Ghi chú tương thích Spark Plan & Client-side

Toàn bộ 24 hạng mục trong kế hoạch này đã được kiểm tra tương thích với gói Firebase Spark (miễn phí) và kiến trúc chỉ chạy phía client (không có Cloud Functions). Không có hạng mục nào cần Cloud Functions, Cloud Storage, hay dịch vụ trả phí nào khác — mọi thay đổi chỉ thuộc 2 loại: sửa Firestore Security Rules (tính năng gốc của gói miễn phí) hoặc sửa code React/TypeScript chạy trên trình duyệt.

Vài điểm cụ thể cần lưu ý khi triển khai:

- **Mục 1.4 (mã hóa đơn trùng):** chọn cách lấy hậu tố từ Firestore document ID thay vì bộ đếm tuần tự, để không cần đọc thêm dữ liệu trước khi ghi và không cần Cloud Function đảm bảo tính đúng khi 2 người tạo hóa đơn cùng lúc.
- **Mục 3.10 (`messenger/client.ts`):** chỉ sửa cách xử lý lỗi phía client, không đụng đến Cloudflare Worker — Worker này vốn đã được dùng thay Cloud Functions chính vì Spark không hỗ trợ Cloud Functions, kiến trúc giữ nguyên.
- **Mục 1.2 (phương án B) và 3.2:** thêm lệnh `get()` trong Firestore Rules để đối chiếu chéo dữ liệu (`submissions` ↔ `assignments`, `payments` ↔ `invoices`, hoặc `invoices` ↔ `settings/payment`). `get()` trong Rules không bị khóa ở gói Spark, nhưng mỗi lần gọi tính là **1 lượt đọc Firestore**, tính vào hạn mức 50.000 lượt đọc/ngày — tốn thêm mỗi khi có người nộp bài tập, báo chuyển khoản, hoặc tạo hóa đơn. Với quy mô một trường học, mức tăng này không đáng kể, nhưng cần lưu ý vì dự án vốn rất để ý tiết kiệm lượt đọc (xem `usage.ts`, cách chia nhỏ truy vấn theo nhóm 30 học viên ở module Điểm danh).
- **Mục 4.2 (`viewer_dashboards`):** là ví dụ ngược lại trong báo cáo gốc — luật này được viết cho một cơ chế ghi bằng Admin SDK không tồn tại trên Spark, nên vẫn giữ trong diện cần Admin quyết định giữ hay xóa (không sửa trong kế hoạch này).

## Tổng hợp theo mức độ ưu tiên

| Đợt | Số vấn đề | Có mục cần Admin quyết định? |
|---|---|---|
| Đợt 1 — Tài chính & Dữ liệu | 4 | Có (1.2) |
| Đợt 2 — Rủi ro âm thầm & Nhất quán quan trọng | 5 | Có (2.2) |
| Đợt 3 — Nhất quán & Dọn dẹp có ảnh hưởng chức năng | 10 | Không |
| Đợt 4 — Vệ sinh kho mã nguồn | 5 | Có (4.2, 4.4) |

Tổng cộng 24 hạng mục sửa (một số hạng mục nhỏ trong báo cáo gốc được gộp chung khi cách sửa giống nhau, ví dụ các file code chết ở mục 3.7).
