# Kế hoạch nâng cấp hoàn chỉnh Module Giáo án - 05/08/2026

## 0. Nguồn sự thật và phạm vi

Đây là kế hoạch nguồn sự thật duy nhất cho việc nâng cấp Module Giáo án. Tài liệu hợp nhất nghiệp vụ, mô hình dữ liệu, Firestore Security Rules, query phía client, migration, thiết kế frontend, kiểm thử, rollout và rollback.

Tài liệu thay thế định hướng Module Giáo án trong:

- `docs/archive/KE-HOACH-NANG-CAP-GIAO-AN-16-07-2026.md`
- Phần Giáo án trong các kế hoạch UI/UX tổng thể trước ngày 05/08/2026.
- `docs/KE-HOACH-THIET-KE-LAI-FRONTEND-MODULE-GIAO-AN-05-08-2026.md` nếu đường dẫn này còn xuất hiện trong lịch sử Git hoặc trao đổi cũ.

Phạm vi bao gồm code client React/Vite và Firebase Spark Plan. Tài liệu chưa triển khai code chức năng.

### 0.1 Kết luận nghiệp vụ đã chốt

Module không tiếp tục coi mọi `lesson_plans` là cùng một loại. Mô hình mục tiêu có bốn khái niệm:

1. `Mẫu giáo án`: bố cục và hoạt động mặc định.
2. `Bài học chuẩn`: nội dung tái sử dụng theo môn học.
3. `Chương trình khóa`: danh sách có version từ Buổi 1 đến Buổi N.
4. `Giáo án buổi dạy`: bản áp dụng cho một lớp và một session cụ thể, có nhật ký sau dạy.

Luồng chuẩn:

```text
Môn học
-> Bài học chuẩn đã duyệt
-> Chương trình khóa có thứ tự và version
-> Lớp khóa vào một version chương trình
-> Session ánh xạ đến một dòng chương trình
-> Giáo án buổi dạy kế thừa và có thể điều chỉnh
-> Nhật ký sau dạy và tóm tắt công khai
```

Không tự động áp dụng mọi bài của một môn cho mọi khóa. Khóa học phải chủ động chọn bài và sắp thứ tự.

### 0.2 Kiến trúc triển khai đã chốt

| Tầng | Nguồn sự thật | Mục đích |
|---|---|---|
| Danh mục | `subjects`, `courses` | Môn và thông tin khóa |
| Nội dung chuẩn | `standard_lessons`, `lesson_plan_templates` | Bài học được duyệt và mẫu bố cục |
| Chương trình | `course_curricula`, `course_curriculum_items` | Version và thứ tự Buổi 1 đến Buổi N |
| Vận hành lớp | `classes`, `sessions` | Snapshot version và lịch thực tế |
| Buổi dạy | `lesson_plans` | Bản theo session, readiness và notes sau dạy |
| Công khai | `lesson_plan_public` | Chỉ tóm tắt được phép cho Viewer |

`lesson_plans` hiện tại được giữ để bảo toàn reference từ assignment và public summary. Không đổi ID document cũ.

### 0.3 Ba workspace frontend

Giữ route và nhãn điều hướng `Giáo án`, bên trong có:

1. `Chương trình khóa`
2. `Thư viện bài học`
3. `Buổi dạy`

`Mẫu giáo án` là chức năng phụ trong Thư viện và Editor, không là workspace cấp cao.

### 0.4 Thứ tự triển khai bắt buộc

```text
Chốt contract và quyền
-> Types, schemas, Rules, indexes
-> Read-only chương trình khóa
-> Ghi và xuất bản curriculum version
-> Thư viện bài học chuẩn
-> Editor hai mode
-> Ánh xạ class/session
-> Migration dữ liệu cũ
-> Hardening, rollout, rollback
```

Không làm Editor mới trước khi data contract, role matrix và versioning được duyệt.

### 0.5 Điều kiện thành công cấp module

- Admin quản lý được chính xác Buổi 1 đến Buổi N của mỗi khóa.
- Giáo viên mở session và nhận đúng bài thuộc version của lớp.
- Giáo viên điều chỉnh bản buổi dạy mà không thay đổi bài chuẩn hoặc lớp khác.
- Khóa nhiều môn không còn tự lấy `subjectIds[0]`.
- Không collection scan, không query trong từng row, không ghi Firestore theo keystroke.
- Dữ liệu cũ tiếp tục đọc được và có migration resumable.
- Viewer chỉ đọc tóm tắt công khai, không đọc nội dung nội bộ hoặc metadata Drive.
- Toàn bộ UI đáp ứng mobile, keyboard, reduced motion và WCAG AA.

### 0.6 Design Read

Đây là redesign có bảo toàn của một workspace nghiệp vụ dành cho Admin và Giáo viên, dùng ngôn ngữ tin cậy, gọn, rõ trạng thái và thao tác nhanh, tiếp tục dựa trên design system Tailwind hiện tại của Edumatrix.

### 0.7 Ba thông số thiết kế

| Thông số | Mức | Lý do |
|---|---:|---|
| `DESIGN_VARIANCE` | 4/10 | Giữ bố cục quen thuộc, có phân cấp rõ nhưng không trình diễn |
| `MOTION_INTENSITY` | 2/10 | Chỉ dùng motion để phản hồi thao tác và chuyển trạng thái |
| `VISUAL_DENSITY` | 7/10 | Workspace có nhiều dữ liệu nhưng vẫn phải đọc nhanh trên laptop nhỏ |

### 0.8 Chế độ redesign

Chọn `Redesign - Preserve`:

- Giữ route `/app/lesson-plans`.
- Giữ nhãn điều hướng `Giáo án`.
- Giữ `AppShell`, `Topbar`, Sidebar và Bottom Navigation.
- Giữ màu primary blue, semantic success/warning/danger và neutral ấm.
- Giữ font `Be Vietnam Pro`.
- Giữ Tailwind 3.4 và thư viện icon Lucide vì đây là hệ thống đang dùng thống nhất.
- Không thêm Fluent, Carbon, Material, shadcn, Motion hoặc GSAP chỉ cho module này.

Skill `design-taste-frontend` không chuyên cho dashboard và form nhiều bước. Vì vậy kế hoạch chỉ áp dụng phần audit-first, bảo toàn hệ thống, token, accessibility, responsive, trạng thái giao diện, hiệu năng và pre-flight. Không áp dụng hero, landing-page motion, bento trang trí hoặc hình ảnh marketing.

## 1. Ràng buộc hệ thống không được vi phạm

### 1.1 Firebase Spark Plan

- Không Cloud Functions cho join, đồng bộ hay xử lý nền.
- Không Firebase Storage. Tài liệu dùng link chia sẻ hoặc metadata Google Drive như hiện tại.
- Không phụ thuộc Admin SDK trong luồng vận hành frontend.
- Security Rules là lớp phân quyền cuối cùng. Không coi việc ẩn nút trên UI là phân quyền.
- Query phải có phạm vi theo `courseId`, `classId`, `subjectId`, `sessionId`, trạng thái hoặc khoảng thời gian.
- Không đọc toàn bộ collection để dựng một màn hình rồi lọc ở client.
- Không query theo từng dòng trong bảng. Dữ liệu liên quan phải được gom theo context hoặc tải theo lô.
- Mọi thao tác ghi nhiều document phải nằm trong giới hạn batch của Firestore và có phương án xử lý lỗi toàn phần.

### 1.2 Client Site

- Ứng dụng tiếp tục là React + Vite + React Router.
- React Query quản lý server state và invalidation.
- React Hook Form + Zod quản lý form và validation.
- Không giả định có SSR, server action hoặc API backend riêng.
- Không lưu token, quyền hạn hoặc dữ liệu nhạy cảm vào local storage.
- Local storage chỉ được dùng cho bản nháp khôi phục chưa gửi, có namespace theo người dùng và có nút xóa rõ ràng.

### 1.3 Tiêu chí chung của Edumatrix

- Một H1 duy nhất do Topbar quản lý.
- Touch target tối thiểu 44px.
- Spacing theo nhịp 4/8px.
- Dùng `Button`, `Modal`, `Tabs`, `StatusBadge`, `Pagination`, `DataListPanel`, `LoadingSkeleton`, `EmptyState` và `ErrorState` hiện có.
- Mỗi màn hình có một CTA chính theo context.
- Loading, empty, error, permission-denied và success là trạng thái bắt buộc.
- Tôn trọng `prefers-reduced-motion`.
- Không dùng card cho mọi khối. Card chỉ dùng khi cần nhóm hoặc elevation thực sự.

## 2. Audit hiện trạng

### 2.1 Thành phần cần giữ

- Danh sách có tìm kiếm, lọc trạng thái, lọc lớp và phân trang.
- Cảnh báo buổi học sắp tới chưa có giáo án.
- Xem chi tiết, sao chép và sửa giáo án.
- Form hoạt động theo thời lượng và cảnh báo tổng phút.
- Mẫu giáo án dạng thẻ có thể áp dụng vào form.
- Link hoặc metadata Google Drive.
- Tóm tắt công khai riêng cho phụ huynh/học sinh.
- Modal hiện tại đã có portal, Escape, focus trap, khóa scroll, restore focus và mobile bottom sheet.

### 2.2 Thành phần phải thiết kế lại

- Màn hình đang coi mọi giáo án là cùng một loại dù có giáo án chuẩn, bản của lớp và bản của buổi.
- Người dùng phải chọn lớp trước, sau đó hệ thống tự lấy khóa và môn đầu tiên. Luồng này không đúng khi khóa có nhiều môn.
- Không có workspace quản lý Buổi 1 đến Buổi N của khóa học.
- Bốn KPI ngang hàng chiếm diện tích nhưng chưa giúp quyết định việc cần làm tiếp theo.
- Cảnh báo thiếu giáo án mở form trắng, chưa truyền sẵn lớp và buổi được chọn.
- Bảng chỉ hiển thị `Đã gắn buổi học`, chưa hiển thị buổi số mấy, nội dung chuẩn nào và mức sẵn sàng.
- Form lớn nằm trong modal hai cột nhưng trộn thông tin chuẩn, nội dung buổi dạy, ghi chú sau dạy và quyền xuất bản.
- `Lưu thành mẫu` đứng cạnh `Lưu giáo án`, dễ khiến người dùng nhầm mẫu bố cục với bài học chuẩn.
- Chưa có bảo vệ khi đóng form đang có thay đổi chưa lưu.
- Chưa có UI rõ cho trạng thái mất mạng, dữ liệu đã thay đổi ở thiết bị khác hoặc Firestore từ chối do quyền.

### 2.3 Bằng chứng từ codebase hiện tại

| Vấn đề | Nguồn code hiện tại | Hệ quả |
|---|---|---|
| `LessonPlanDoc` chứa đồng thời class, course, subject, session và notes sau dạy | `src/types/academic.ts` | Trộn nội dung chuẩn với bản vận hành |
| Form bắt buộc `classId` dù type cho phép null | `src/schemas/lessonPlan.ts` | Không tạo được bài chuẩn độc lập bằng UI hiện tại |
| Chọn lớp tự gán `courseId` và `subjectIds[0]` | `src/features/lesson-plans/components/LessonPlanForm.tsx` | Sai nghiệp vụ với khóa nhiều môn |
| Session không có sequence, curriculum item hoặc lesson plan link | `src/types/academic.ts`, `src/services/firestore/classes.ts` | Không biết Buổi 1 đến Buổi N học gì |
| Lấy giáo án theo session bằng `limit(1)` | `src/services/firestore/lessonPlans.ts` | Không bảo đảm duy nhất và kết quả có thể không xác định |
| KPI thiếu giáo án đối chiếu mọi plan có sessionId | `src/services/firestore/lessonPlans.ts` | Nháp hoặc lưu trữ vẫn có thể bị tính là đã chuẩn bị |
| Rules chỉ kiểm tra ID là string/null | `firebase/firestore.rules` | Chưa kiểm tra quan hệ subject-course-class-session |
| Rules khóa bất biến classId khi update | `firebase/firestore.rules` | UI cho đổi lớp nhưng lần lưu có thể bị từ chối |
| Template thiếu owner, scope, subject và status | `src/types/academic.ts` | Không phân biệt mẫu cá nhân và dùng chung |

Kế hoạch nâng cấp phải xử lý các điểm trên bằng contract dữ liệu và Rules trước, không chỉ thay label hoặc bố cục frontend.

## 3. Chuẩn hóa thuật ngữ hiển thị

| Thuật ngữ UI | Ý nghĩa | Không dùng để chỉ |
|---|---|---|
| Mẫu giáo án | Bố cục hoạt động, thời lượng và các trường mặc định | Nội dung Buổi 1, Buổi 2 của một khóa |
| Bài học chuẩn | Nội dung có thể tái sử dụng, gắn với một môn học | Nhật ký đã dạy của một lớp |
| Chương trình khóa | Danh sách bài học có thứ tự Buổi 1 đến Buổi N | Lịch ngày giờ của một lớp |
| Giáo án buổi dạy | Bản áp dụng cho một lớp và một session cụ thể | Bài chuẩn dùng chung cho mọi lớp |
| Nhật ký sau dạy | Nội dung thực tế, phần chưa hoàn thành và ghi chú | Nội dung chuẩn của bài học |

Nguyên tắc quan trọng: môn học phân loại bài học chuẩn. Khóa học chủ động chọn bài và sắp thứ tự. Không tự động đẩy mọi bài của một môn vào mọi khóa thuộc môn đó.

## 4. Kiến trúc thông tin mục tiêu

Giữ một mục điều hướng `Giáo án`. Bên trong dùng ba tab cấp cao:

1. `Chương trình khóa`
2. `Thư viện bài học`
3. `Buổi dạy`

`Mẫu giáo án` là chức năng phụ trong Thư viện bài học và Editor. Không tạo tab cấp cao thứ tư để tránh người dùng coi mẫu là một loại nội dung giảng dạy ngang hàng.

### 4.1 Mặc định theo vai trò

| Vai trò | Tab mặc định | Khả năng chính |
|---|---|---|
| Admin | Chương trình khóa | Tạo, duyệt, xuất bản và quản lý phiên bản chương trình |
| Giáo viên | Buổi dạy | Chuẩn bị buổi sắp tới, ghi nhật ký và đề xuất bài học chuẩn |
| Viewer | Không vào workspace staff | Chỉ xem tóm tắt công khai qua portal hiện có |

Tab có thể bị ẩn theo quyền nhưng route và cấu trúc dữ liệu không thay đổi theo vai trò.

## 5. Thiết kế từng workspace

### 5.1 Chương trình khóa

Mục tiêu: trả lời ngay ba câu hỏi:

- Khóa này có bao nhiêu buổi?
- Mỗi buổi học gì?
- Chương trình đã đủ và có thể xuất bản chưa?

#### Bố cục desktop

```text
[Tabs]
[Bộ chọn khóa] [Phiên bản] [Trạng thái]                  [Xuất bản]

[20/20 buổi] [18 bài đã duyệt] [2 bài còn thiếu] [90 phút mặc định]

┌ Danh sách Buổi 1 đến Buổi 20 ───────┬ Chi tiết bài đang chọn ┐
│ 01  Làm quen và đầu vào       Sẵn sàng│ Môn học                │
│ 02  Introducing Yourself     Sẵn sàng│ Mục tiêu                │
│ 03  Family and Friends       Còn thiếu│ Thời lượng              │
│ ...                                  │ Tài liệu và thao tác     │
└──────────────────────────────────────┴─────────────────────────┘
```

#### Quy tắc UX

- Danh sách buổi là master list, panel phải là detail. Không mở modal mới cho mỗi lần xem.
- Hiển thị `Buổi 01`, tiêu đề, môn, thời lượng, trạng thái và lỗi cần xử lý.
- Chọn dòng không thay đổi route và không gây cuộn toàn trang.
- Có thao tác `Chọn bài`, `Tạo bài`, `Thay bài`, `Bỏ liên kết` theo quyền.
- Sắp xếp dùng kéo thả nếu triển khai, nhưng bắt buộc có nút `Đưa lên` và `Đưa xuống` cho bàn phím và mobile.
- Không cho xuất bản khi thứ tự thiếu, trùng hoặc số dòng khác `totalSessions`.
- Nút xuất bản mở dialog xác nhận, nêu rõ số lớp bị ảnh hưởng và nguyên tắc phiên bản.
- Khi đổi khóa, reset item đang chọn và hủy query không còn liên quan.

#### Mobile

- Bộ chọn khóa nằm đầu trang và sticky trong vùng content.
- Danh sách thành các row toàn chiều rộng, không dùng table ngang.
- Chi tiết mở thành route-state panel hoặc full-height sheet.
- Không dùng hai vùng cuộn lồng nhau.

### 5.2 Thư viện bài học

Mục tiêu: tìm, đánh giá và tái sử dụng nội dung chuẩn theo môn.

#### Thanh công cụ

- Tìm theo tiêu đề.
- Lọc môn học.
- Lọc trạng thái duyệt.
- Lọc người tạo nếu Admin.
- Lọc thời lượng hoặc loại bài chỉ khi dữ liệu thực tế có trường tương ứng.
- CTA chính: `Tạo bài học`.
- Hành động phụ: `Quản lý mẫu`.

#### Danh sách desktop

Các cột tối thiểu:

- Bài học.
- Môn học.
- Thời lượng.
- Số khóa đang sử dụng.
- Trạng thái.
- Cập nhật.
- Hành động.

Không hiển thị lớp hoặc session trong danh sách bài học chuẩn.

#### Chi tiết

- Xem mục tiêu, chuẩn bị, tiến trình, tài liệu và bài tập.
- Hiển thị khóa đang sử dụng bài.
- `Sao chép` tạo bản nháp mới.
- Giáo viên có thể gửi duyệt. Admin có thể duyệt hoặc trả lại kèm lý do.
- Không sửa trực tiếp bài đã được khóa vào phiên bản chương trình đang hoạt động. Tạo revision mới.

### 5.3 Buổi dạy

Mục tiêu: giúp giáo viên ưu tiên đúng buổi cần chuẩn bị và hoàn tất nhật ký sau dạy.

#### Nhóm hiển thị

1. `Hôm nay`
2. `7 ngày tới`
3. `Cần hoàn tất sau dạy`

Mỗi row hiển thị:

- Ngày giờ.
- Lớp.
- Buổi số trong chương trình.
- Bài học dự kiến.
- Trạng thái `Chưa chuẩn bị`, `Bản nháp`, `Sẵn sàng`, `Đã dạy`, `Cần bổ sung nhật ký`.
- Một hành động chính phù hợp trạng thái, ví dụ `Soạn`, `Tiếp tục`, `Mở giáo án`, `Hoàn tất nhật ký`.

Không dùng bốn nút icon ngang nhau cho mọi trạng thái. Hành động chính có label rõ; hành động phụ nằm trong menu.

Khi người dùng bấm cảnh báo thiếu giáo án, Editor phải nhận sẵn `classId`, `sessionId`, `courseId`, `subjectId`, `curriculumItemId` và bài học chuẩn nếu có.

## 6. Editor giáo án

### 6.1 Phân loại editor

Editor có hai mode rõ ràng:

- `Bài học chuẩn`: không có lớp, session hoặc ghi chú sau dạy.
- `Giáo án buổi dạy`: có lớp, session, nguồn bài chuẩn và nhật ký sau dạy.

Không dùng một form với mọi trường nullable rồi để người dùng tự hiểu phạm vi.

### 6.2 Cấu trúc desktop

Tiếp tục dùng Modal `size="2xl"` để bảo toàn luồng và route hiện tại. Bên trong:

```text
┌ Header: tên editor, trạng thái, dấu thay đổi chưa lưu ─────────────┐
├ Context: Môn > Khóa > Buổi số > Lớp > Ngày giờ                    ┤
├───────────────┬────────────────────────────────────────────────────┤
│ Điều hướng    │ Nội dung phần đang soạn                           │
│ Thông tin     │                                                    │
│ Mục tiêu      │ Form có label, helper, error                       │
│ Chuẩn bị      │                                                    │
│ Hoạt động     │ Hoạt động và tổng thời lượng                       │
│ Tài liệu      │                                                    │
│ Công khai     │                                                    │
│ Sau dạy       │ Chỉ có ở mode buổi dạy                            │
├───────────────┴────────────────────────────────────────────────────┤
│ Kiểm tra: 85/90 phút, 1 lỗi                    [Hủy] [Lưu nháp]   │
└────────────────────────────────────────────────────────────────────┘
```

#### Quy tắc editor

- Context phải được xác định trước nội dung. Không tự lấy `subjectIds[0]`.
- Nếu mở từ session, context được điền sẵn và chỉ những trường hợp được phép mới có thể đổi.
- Thư viện mẫu mở bằng picker có tìm kiếm, thời lượng và preview. Không chiếm một khối ngang cố định trong editor.
- `Lưu thành mẫu` nằm trong menu phụ của phần hoạt động, không nằm cạnh CTA lưu giáo án.
- Mỗi hoạt động có tên, phút, nội dung và kết quả mong đợi.
- Tổng thời lượng luôn visible. Chênh lệch là warning; trường hợp khóa quy định bắt buộc mới là blocking error.
- Nút thêm hoạt động nằm sau danh sách, không nhân bản CTA ở đầu và cuối.
- Validation summary ở footer liên kết focus đến trường lỗi đầu tiên.
- Khi đóng lúc dirty, mở dialog `Bỏ thay đổi chưa lưu?`.
- Khôi phục bản nháp local phải cho người dùng chọn `Khôi phục` hoặc `Xóa bản nháp`.
- Không ghi Firestore theo từng keystroke. Lưu local có debounce; ghi Firestore khi người dùng chủ động lưu.
- Nút lưu disabled trong lúc mutation và chống double-submit.
- Lỗi Rules phải được dịch thành thông báo quyền cụ thể, không chỉ `Không thể lưu`.

### 6.3 Mobile editor

- Một cột duy nhất.
- Điều hướng phần dùng select hoặc thanh tab cuộn ngang có ARIA tabs.
- Footer action sticky phía dưới safe area.
- Hoạt động hiển thị dạng accordion, chỉ mở một hoạt động khi màn hình nhỏ.
- Không mở picker hoặc detail thành modal nằm trên modal. Dùng sheet thay thế nội dung cùng tầng.

## 7. Trạng thái và ngôn ngữ giao diện

### 7.1 Trạng thái nghiệp vụ mục tiêu

Không dùng một trường `published` cho cả duyệt chuyên môn, công khai với phụ huynh và sẵn sàng giảng dạy.

| Đối tượng | Trạng thái đề xuất |
|---|---|
| Bài học chuẩn | Nháp, Chờ duyệt, Đã duyệt, Lưu trữ |
| Chương trình khóa | Nháp, Đã xuất bản, Ngừng áp dụng |
| Giáo án buổi dạy | Chưa chuẩn bị, Nháp, Sẵn sàng, Đã dạy |
| Hiển thị phụ huynh | Nội bộ, Công khai tóm tắt |

Trong giai đoạn tương thích dữ liệu cũ, frontend có adapter chuyển trạng thái cũ sang label mới. Không phân tán logic ánh xạ ở nhiều component.

### 7.2 Nguyên tắc copy

- Dùng câu ngắn, động từ cụ thể.
- Không dùng `Xuất bản` nếu hành động thực tế chỉ công khai tóm tắt cho phụ huynh.
- Không dùng `Giáo án đã xuất bản` để thay cho `Sẵn sàng giảng dạy`.
- Cảnh báo phải nói rõ đối tượng và cách sửa.
- Nút tối đa ba từ nếu có thể.

Ví dụ:

- `Buổi 03 chưa có bài học. Chọn một bài từ thư viện để hoàn tất chương trình.`
- `Giáo án có 85 phút, ngắn hơn thời lượng buổi học 5 phút.`
- `Anh/chị không còn quyền sửa lớp này. Tải lại dữ liệu hoặc liên hệ Admin.`

## 8. Mô hình dữ liệu mục tiêu

Thiết kế chính xác về nghiệp vụ cần bổ sung lớp dữ liệu. UI không được mô phỏng các quan hệ chỉ bằng label.

### 8.1 Thực thể tối thiểu

#### Bài học chuẩn

```ts
interface StandardLessonDoc {
  title: string;
  subjectId: string;
  durationMinutes: number;
  objectives: LessonPlanObjectives;
  preparation: LessonPlanPreparation;
  activities: LessonPlanActivity[];
  homework: string;
  approvalStatus: "draft" | "pending" | "approved" | "archived";
  revision: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Dòng chương trình khóa

```ts
interface CourseCurriculumItemDoc {
  courseId: string;
  curriculumVersion: number;
  sequenceNumber: number;
  subjectId: string;
  title: string;
  standardLessonId: string | null;
  durationMinutes: number;
  status: "draft" | "ready";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Bổ sung cho session

```ts
interface SessionCurriculumLink {
  sequenceNumber: number | null;
  curriculumVersion: number | null;
  curriculumItemId: string | null;
}
```

#### Giáo án buổi dạy

Giữ `lesson_plans` cho bản theo lớp/session và bổ sung:

```ts
interface SessionLessonPlanLink {
  sourceStandardLessonId: string | null;
  curriculumItemId: string | null;
  readinessStatus: "draft" | "ready" | "taught";
}
```

`notesAfterTeaching` chỉ có ý nghĩa ở bản theo session.

### 8.2 Bất biến cần kiểm tra ở schema, service và Rules

- `sequenceNumber` là số nguyên dương.
- Trong một `courseId + curriculumVersion`, thứ tự không trùng.
- Khi xuất bản, thứ tự liên tục từ 1 đến `course.totalSessions`.
- `subjectId` của curriculum item thuộc `course.subjectIds`.
- Session, class và course phải khớp quan hệ.
- Một session chỉ có một giáo án buổi dạy đang hiệu lực.
- Buổi bù giữ `curriculumItemId` của buổi gốc.
- Buổi hủy không tự tăng tiến độ chương trình.
- Thay đổi chương trình đã xuất bản tạo version mới, không sửa lịch sử lớp đang học.

## 9. Chiến lược query phù hợp Spark Plan

### 9.1 Nguyên tắc

- Tab Chương trình khóa chỉ query curriculum của khóa đang chọn.
- Tab Thư viện bài học phân trang theo môn và trạng thái, không tải toàn bộ.
- Tab Buổi dạy query session theo lớp được phân công và khoảng thời gian ngắn.
- Chỉ tải detail bài học khi row được chọn hoặc editor mở.
- Query key phải chứa đầy đủ context: loại dữ liệu, role, course, class, subject, status, range và page cursor.
- Không dùng `listLessonPlans()` toàn bộ collection để tính cảnh báo.

### 9.2 Query dự kiến

```text
course_curriculum_items: courseId + curriculumVersion + sequenceNumber
standard_lessons: subjectId + approvalStatus + updatedAt
sessions: classId + startAt
lesson_plans: classId + sessionId
lesson_plans: sourceStandardLessonId + updatedAt
```

Các composite index cần được định nghĩa trước khi nối UI. Error thiếu index phải có log kỹ thuật, không hiển thị link Firebase Console cho người dùng cuối.

### 9.3 Ngân sách đọc ban đầu

- Chương trình khóa: một query header/course và một query danh sách curriculum đang chọn.
- Thư viện bài học: một query page hiện tại, các danh mục dùng cache sẵn có.
- Buổi dạy: query theo khoảng thời gian và lớp được phân công, sau đó tải giáo án theo lô hoặc document ID xác định.
- Không quá một query bổ sung khi chọn một item để xem detail.

## 10. Component plan

### 10.1 Giữ và tái sử dụng

- `Button`
- `Modal`
- `Tabs` và `Tab`
- `StatusBadge`
- `SearchInput`
- `FilterField` và `FilterSelect`
- `Pagination`
- `DataListPanel`
- `LoadingSkeleton`
- `EmptyState`
- `ErrorState`
- `CollapsibleSection`

### 10.2 Component mới theo ranh giới nghiệp vụ

```text
LessonPlansPage
├─ LessonPlanWorkspaceTabs
├─ CourseCurriculumWorkspace
│  ├─ CurriculumContextBar
│  ├─ CurriculumSummary
│  ├─ CurriculumSessionList
│  └─ CurriculumItemDetail
├─ StandardLessonLibrary
│  ├─ StandardLessonFilters
│  ├─ StandardLessonList
│  └─ StandardLessonDetail
├─ TeachingSessionWorkspace
│  ├─ TeachingSessionGroup
│  └─ TeachingSessionRow
└─ LessonEditorModal
   ├─ LessonEditorContext
   ├─ LessonEditorNavigation
   ├─ LessonObjectivesSection
   ├─ LessonPreparationSection
   ├─ LessonActivitiesSection
   ├─ LessonMaterialsSection
   ├─ LessonVisibilitySection
   ├─ PostTeachingNotesSection
   └─ LessonEditorFooter
```

Không tạo abstraction chung nếu chỉ có một nơi sử dụng. Các section hiện có được giữ lại khi ranh giới props vẫn phù hợp.

## 11. Visual specification

### 11.1 Màu và typography

- Dùng nguyên palette trong `tailwind.config.ts`.
- Primary blue chỉ dùng cho CTA, focus và trạng thái selected.
- Success, warning, danger chỉ dùng với nghĩa semantic.
- Không thêm gradient, glow hoặc màu accent mới cho module.
- Tiêu đề section dùng `text-base` hoặc `text-lg`; không dùng display typography.
- Số buổi và thời lượng dùng `tabular-nums`.

### 11.2 Shape và elevation

- Input 8px.
- Card 12px.
- Modal 16px.
- Pill chỉ dùng cho badge hoặc control có bản chất pill.
- Shadow chỉ dùng cho modal, dropdown, sticky footer hoặc row đang kéo.
- Panel dữ liệu dùng border và spacing thay vì card lồng card.

### 11.3 Motion

- Tab indicator: token hiện có, chỉ transform và opacity.
- Chọn curriculum item: đổi nền và focus, không animate layout toàn danh sách.
- Thêm hoặc xóa hoạt động: animation 150-200ms, tôn trọng reduced motion.
- Save success: cập nhật status và toast, không dùng confetti hoặc animation trang trí.
- Không thêm perpetual animation, scroll hijack, parallax hoặc magnetic effect.

## 12. Accessibility

- Tabs dùng Arrow Left/Right, Home, End và roving tab index.
- Master list dùng button hoặc row có semantics rõ, không dùng `div` click.
- Mọi icon-only button có `aria-label` và tooltip/title phù hợp.
- Drag reorder có nút thay thế cho bàn phím.
- Validation error liên kết bằng `aria-describedby`.
- Summary lỗi dùng `role="alert"` khi submit thất bại.
- Mutation dài dùng `aria-busy` và trạng thái text.
- Thay đổi tổng thời lượng dùng `aria-live="polite"`, không thông báo mỗi keystroke.
- Khi mở detail trên mobile, focus chuyển vào heading; khi đóng trả về row nguồn.
- Không dùng màu đơn độc để phân biệt trạng thái.
- Kiểm tra contrast WCAG AA cho label, placeholder, helper, badge và button.

## 13. Responsive matrix

| Viewport | Chương trình khóa | Thư viện | Buổi dạy | Editor |
|---|---|---|---|---|
| 375px | List một cột, detail sheet | Card rows | Nhóm theo ngày | Một cột, footer sticky |
| 768px | List một cột rộng | Table rút gọn | Hai cột nếu đủ | Một cột, section nav |
| 1024px | Master 5/12, detail 7/12 | Table đầy đủ | List đầy đủ | Rail nhỏ + editor |
| 1440px | Master 7/12, detail 5/12 | Table + side detail | List + context | Rail + editor rộng |

Không dùng horizontal table làm UI chính ở 375px. Không đặt fixed height nếu có thể làm mất nội dung khi font size hệ thống tăng.

## 14. Luồng lỗi và trạng thái biên

### 14.1 Loading

- Skeleton khớp đúng workspace đang mở.
- Khi đổi filter, giữ dữ liệu cũ nếu còn hợp lệ và hiển thị pending nhẹ.
- Không thay toàn bộ trang bằng spinner.

### 14.2 Empty

- Chưa có chương trình: CTA `Tạo khung 20 buổi` cho Admin.
- Dòng chương trình chưa có bài: CTA `Chọn bài`.
- Thư viện trống: CTA `Tạo bài học`.
- Giáo viên không có buổi sắp tới: thông báo trung tính, không hiển thị CTA sai quyền.

### 14.3 Error

- Network: giữ dữ liệu cache và cho thử lại.
- Permission: nói rõ không có quyền và không tiếp tục retry tự động.
- Validation: hiển thị tại field và summary.
- Conflict/version: yêu cầu tải bản mới trước khi ghi đè.
- Missing reference: hiển thị `Bài học đã bị lưu trữ` thay vì để trống hoặc crash.

### 14.4 Unsaved changes

- Dirty indicator trong header editor.
- Chặn đóng modal, đổi tab workspace hoặc đổi route nếu có thay đổi chưa lưu.
- Cho phép lưu nháp, bỏ thay đổi hoặc tiếp tục soạn.

## 15. Phân kỳ triển khai

### Phase 0 - Chốt hợp đồng nghiệp vụ

1. Chốt thuật ngữ và status.
2. Chốt quyền Admin/Giáo viên.
3. Chốt data model và quy tắc version.
4. Chốt cách xử lý lớp đang học khi chương trình khóa đổi.

Điều kiện hoàn tất: có bảng trạng thái và ma trận quyền được duyệt.

### Phase 1 - Nền dữ liệu và read-only UI

1. Bổ sung type, schema, Rules và index.
2. Viết service query theo context.
3. Dựng ba workspace ở chế độ đọc.
4. Giữ adapter hiển thị dữ liệu giáo án cũ.

Điều kiện hoàn tất: Admin xem được Buổi 1 đến Buổi N; Giáo viên xem được buổi sắp tới mà không đọc toàn collection.

### Phase 2 - Chương trình khóa

1. Tạo, chọn và thay bài cho từng buổi.
2. Reorder có hỗ trợ bàn phím.
3. Kiểm tra đủ `totalSessions`.
4. Xuất bản version chương trình.

Điều kiện hoàn tất: khóa 20 buổi không thể xuất bản nếu thiếu hoặc trùng thứ tự.

### Phase 3 - Thư viện và Editor

1. Tách mode bài học chuẩn và buổi dạy.
2. Tích hợp template picker.
3. Thêm local draft recovery và unsaved guard.
4. Hoàn thiện Drive, public summary và duration validation.

Điều kiện hoàn tất: người dùng luôn biết mình đang sửa bài chuẩn hay bản của một buổi cụ thể.

### Phase 4 - Ánh xạ lớp và session

1. Khi tạo lớp, ánh xạ session với curriculum item.
2. Mở từ lịch hoặc cảnh báo với context đã điền sẵn.
3. Xử lý buổi hủy, đổi lịch và học bù.
4. Tách ghi chú sau dạy khỏi nội dung chuẩn.

Điều kiện hoàn tất: Buổi 03 của lớp luôn truy ra đúng Buổi 03 của version chương trình mà lớp đang học.

### Phase 5 - Hardening

1. Rules tests cho quan hệ course, class, session và lesson.
2. Component tests cho tab, filter, editor, unsaved guard và role.
3. Kiểm tra query count bằng emulator.
4. Kiểm tra responsive, keyboard và reduced motion.
5. Chạy typecheck, lint, unit tests, rules tests và build.

## 16. Tiêu chí nghiệm thu nghiệp vụ

1. Admin tạo được chương trình khóa 20 buổi và nhìn thấy rõ buổi còn thiếu.
2. Mỗi dòng chương trình có đúng một thứ tự, một môn hợp lệ và tối đa một bài chuẩn đang chọn.
3. Giáo viên mở Buổi 05 của lớp và thấy đúng bài của Buổi 05 trong version khóa của lớp.
4. Giáo viên điều chỉnh bản của lớp mà không làm đổi bài chuẩn hoặc lớp khác.
5. Ghi chú sau dạy không xuất hiện trong bài học chuẩn.
6. Buổi bù dùng lại nội dung của buổi gốc.
7. Bản nháp hoặc lưu trữ không được tính là giáo án sẵn sàng.
8. Phụ huynh chỉ đọc tóm tắt công khai, không nhận metadata Drive riêng tư.
9. Giáo viên không xuất bản chương trình toàn khóa nếu không có quyền.
10. Chương trình đã xuất bản được bảo toàn bằng version.

## 17. Tiêu chí nghiệm thu frontend

1. Route và nhãn điều hướng hiện tại không đổi.
2. Topbar là H1 duy nhất.
3. Mỗi workspace chỉ có một CTA chính.
4. 375px không có cuộn ngang toàn trang.
5. Mọi control chính có touch target tối thiểu 44px.
6. Tab, dialog, picker và reorder thao tác được bằng bàn phím.
7. Loading, empty, error, permission và dirty states đều có UI.
8. Không có modal lồng modal.
9. Không có ghi Firestore theo từng keystroke.
10. Không thêm dependency UI hoặc motion mới.
11. Không có query Firestore từ mỗi row.
12. `prefers-reduced-motion` loại bỏ chuyển động không thiết yếu.
13. Contrast button, form và status đạt WCAG AA.
14. INP mục tiêu dưới 200ms, không có layout shift đáng kể khi đổi tab hoặc loading.

## 18. Test matrix bắt buộc

### Unit và component

- Schema chặn thứ tự trùng, subject ngoài course và duration âm.
- Tab mặc định đúng theo role.
- Cảnh báo thiếu bài truyền đúng context vào editor.
- Template không ghi đè context môn, khóa, lớp hoặc session.
- Dirty guard hoạt động khi đóng, đổi tab và đổi route.
- Duration warning cập nhật đúng.
- Giáo viên không thấy action vượt quyền.

### Rules

- Giáo viên chỉ đọc chương trình liên quan lớp được phân công.
- Giáo viên tạo draft bài học nhưng không tự duyệt.
- Admin xuất bản chương trình hợp lệ.
- Không thể gắn subject không thuộc course.
- Không thể đổi class/session của giáo án sang phạm vi không được quản lý.
- Viewer không đọc nội dung nội bộ hoặc metadata Drive.

### E2E thủ công

1. Admin tạo khóa 20 buổi, gắn 18 bài, xác nhận không thể xuất bản.
2. Gắn đủ hai bài còn lại và xuất bản version 1.
3. Tạo lớp và kiểm tra 20 session được ánh xạ đúng thứ tự.
4. Giáo viên mở buổi sắp tới, soạn bản điều chỉnh và lưu nháp.
5. Reload trình duyệt, khôi phục local draft rồi lưu Firestore.
6. Đánh dấu sẵn sàng và kiểm tra cảnh báo thiếu giáo án biến mất.
7. Hoàn thành session và ghi nhật ký sau dạy.
8. Tạo buổi bù và xác nhận dùng đúng curriculum item của buổi gốc.

### Lệnh kiểm tra

```text
npm run typecheck
npm run lint
npm test
npm run test:rules
npm run build
```

## 19. Ngoài phạm vi vòng đầu

- Cộng tác realtime nhiều con trỏ.
- AI tự sinh toàn bộ giáo án.
- Xuất DOCX/PDF bằng backend.
- Firebase Storage.
- Workflow nhiều cấp duyệt phức tạp hơn Admin/Giáo viên.
- Analytics chuyên sâu theo curriculum.
- Thay đổi route, shell, font hoặc brand palette toàn hệ thống.

## 20. Rủi ro và quyết định cần duyệt trước khi code

| Rủi ro | Ảnh hưởng | Cách xử lý đề xuất |
|---|---|---|
| Dữ liệu cũ trộn bài chuẩn và buổi dạy | Không thể phân loại chính xác tự động | Adapter đọc cũ, phân loại khi người dùng mở và lưu lại |
| Một khóa có nhiều môn | Lấy môn đầu tiên gây sai dữ liệu | Bắt buộc chọn subject cho từng curriculum item |
| Sửa chương trình đang chạy | Làm thay đổi lịch sử lớp | Khóa version đang dùng, tạo version mới |
| Query theo mọi lớp của giáo viên | Nhiều reads và N+1 | Tab theo time range, course hoặc class context |
| Autosave Firestore | Tăng writes, xung đột và khó kiểm soát | Local draft debounce, Firestore explicit save |
| Reorder bằng drag | Kém accessibility và ghi nhiều document | Có nút lên/xuống, lưu thay đổi theo batch |
| Modal editor quá dày trên mobile | Nested scroll và mất context | Một cột, section nav, sticky footer, không modal lồng modal |

Quyết định khuyến nghị:

1. Chấp nhận mô hình ba workspace.
2. Giữ `Giáo án` làm tên module để không thay đổi thói quen điều hướng.
3. Giữ `lesson_plans` cho bản theo session; tạo thực thể riêng cho bài học chuẩn và chương trình khóa.
4. Chọn explicit Firestore save kết hợp local draft recovery.
5. Triển khai read-only program view trước khi viết editor mới.

## 21. Ma trận quyền chi tiết

Quyền dưới đây là hợp đồng nghiệp vụ mục tiêu. UI, service và Firestore Rules phải dùng cùng một ma trận.

| Hành động | Admin | Giáo viên | Viewer |
|---|---|---|---|
| Xem mọi chương trình khóa | Có | Không | Không |
| Xem chương trình của lớp được phân công | Có | Có | Không |
| Tạo/sửa chương trình khóa nháp | Có | Không | Không |
| Xuất bản hoặc ngừng áp dụng chương trình | Có | Không | Không |
| Tạo bài học chuẩn nháp | Có | Có | Không |
| Sửa bài học chuẩn của mình khi còn nháp | Có | Có | Không |
| Sửa bài đã duyệt | Có, bằng revision mới | Không, tạo revision đề xuất | Không |
| Gửi bài học chờ duyệt | Có | Có | Không |
| Duyệt hoặc trả bài | Có | Không | Không |
| Tạo/sửa giáo án buổi dạy | Có | Có, nếu thuộc lớp được phân công | Không |
| Đánh dấu sẵn sàng/đã dạy | Có | Có, nếu thuộc lớp được phân công | Không |
| Công khai tóm tắt | Có | Có, nếu thuộc lớp được phân công | Chỉ đọc |
| Tạo mẫu cá nhân | Có | Có | Không |
| Tạo/sửa mẫu dùng chung | Có | Không | Không |
| Xem audit log | Có | Không | Không |

Nếu một Giáo viên bị gỡ khỏi lớp trong lúc đang mở Editor, lần lưu tiếp theo phải bị Rules từ chối. UI giữ nội dung local để người dùng sao chép, không tự thử ghi sang lớp khác.

## 22. Sơ đồ chuyển trạng thái

### 22.1 Bài học chuẩn

```text
Nháp -> Chờ duyệt -> Đã duyệt -> Lưu trữ
  ^         |
  |         v
  +----- Trả lại
```

Quy tắc:

- Chỉ bản `Đã duyệt` được dùng khi xuất bản chương trình khóa.
- `Trả lại` đưa bài về Nháp và bắt buộc có lý do.
- Bài đã duyệt đang được dùng không bị sửa tại chỗ. Tạo revision mới.
- Lưu trữ không xóa liên kết lịch sử.

### 22.2 Chương trình khóa

```text
Nháp -> Đã xuất bản -> Được thay thế
                       |
                       v
                   Lưu trữ
```

- Mỗi khóa chỉ có một version đang hoạt động.
- `Được thay thế` là trạng thái tự sinh khi version mới được xuất bản.
- Lớp đã khóa vào version cũ tiếp tục dùng version cũ.

### 22.3 Giáo án buổi dạy

```text
Chưa chuẩn bị (derived) -> Nháp -> Sẵn sàng -> Đã dạy
                             ^         |
                             +---------+
```

- `Chưa chuẩn bị` là trạng thái suy ra khi session chưa có `lessonPlanId`, không lưu thành document rỗng.
- Có thể đưa `Sẵn sàng` về `Nháp` trước khi session hoàn thành.
- Sau khi `Đã dạy`, nội dung giảng dạy bị khóa; chỉ phần nhật ký được chỉnh theo quyền và phải ghi audit.

### 22.4 Hiển thị phụ huynh

`visibility` độc lập với các workflow trên:

```text
internal | summary_public
```

Không suy ra `summary_public` chỉ vì bài đã được duyệt hoặc giáo án đã sẵn sàng.

## 23. URL state và deep link

Giữ route gốc nhưng đưa context có thể chia sẻ vào query string.

```text
/app/lesson-plans?workspace=curriculum&courseId=course_001&version=2&item=item_005
/app/lesson-plans?workspace=library&subjectId=english&status=approved&page=1
/app/lesson-plans?workspace=teaching&range=7d&classId=class_001
/app/lesson-plans?workspace=teaching&editor=session&sessionId=session_001
/app/lesson-plans?workspace=library&editor=standard&id=lesson_001
```

Quy tắc:

- Query string chỉ lưu định danh, filter, tab và page. Không lưu nội dung form.
- Giá trị URL không hợp lệ được bỏ qua và thay bằng mặc định theo role.
- Nếu người dùng không có quyền với ID trong URL, hiển thị permission state và xóa context bị cấm khỏi UI.
- Nút Back đóng Editor hoặc detail trước khi rời module.
- Link `?create=lesson-plan` cũ tiếp tục hoạt động trong giai đoạn chuyển tiếp và được ánh xạ sang Editor giáo án buổi dạy.
- Filter có debounce nhưng cập nhật URL bằng replace, không tạo một history entry cho mỗi ký tự.

## 24. Versioning, liên kết và quản trị mẫu

### 24.1 Header chương trình khóa

Thêm thực thể header làm nguồn sự thật cho trạng thái và thứ tự:

```ts
interface CourseCurriculumDoc {
  courseId: string;
  version: number;
  title: string;
  itemIds: string[];
  itemCount: number;
  totalDurationMinutes: number;
  status: "draft" | "published" | "superseded" | "archived";
  publishedBy: string | null;
  publishedAt: Timestamp | null;
  revision: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

`itemIds` là thứ tự chính thức. `sequenceNumber` trên item là dữ liệu denormalized để query và hiển thị, service phải giữ hai phía đồng bộ trong cùng batch.

### 24.2 Bổ sung cho course và class

```ts
interface CourseCurriculumState {
  activeCurriculumId: string | null;
  activeCurriculumVersion: number | null;
}

interface ClassCurriculumSnapshot {
  curriculumId: string | null;
  curriculumVersion: number | null;
}
```

Class giữ snapshot version tại thời điểm bắt đầu áp dụng. Không đọc `course.activeCurriculumVersion` để thay đổi ngầm lớp đang học.

### 24.3 Bổ sung đầy đủ cho session

```ts
interface SessionCurriculumState {
  sequenceNumber: number | null;
  curriculumVersion: number | null;
  curriculumItemId: string | null;
  lessonPlanId: string | null;
}
```

`session.lessonPlanId` là liên kết một giáo án đang hiệu lực cho session, tránh query `limit(1)` khi có thể tồn tại document trùng `sessionId`. Tạo giáo án và cập nhật session phải nằm trong cùng batch.

### 24.4 Quản trị mẫu giáo án

Bổ sung metadata tối thiểu cho `lesson_plan_templates`:

```ts
interface LessonPlanTemplateGovernance {
  ownerUid: string;
  scope: "personal" | "shared";
  subjectId: string | null;
  durationMinutes: number | null;
  status: "active" | "archived";
}
```

- Giáo viên chỉ sửa mẫu cá nhân của mình.
- Mẫu shared do Admin quản lý.
- Archive thay cho delete để không làm hỏng bản nháp local đang tham chiếu.

### 24.5 Quy ước ID

- `standard_lessons`: auto ID vì có nhiều revision và không có mã nghiệp vụ tự nhiên.
- `course_curricula`: `${courseId}_v${version}`.
- `course_curriculum_items`: `${curriculumId}_s${sequenceNumberPadded}` khi tạo mới.
- `lesson_plans`: giữ auto ID để tương thích assignment và public summary hiện có.
- `lesson_plan_public`: tiếp tục dùng cùng `lessonPlanId`.
- Không đổi ID document cũ trong migration.

## 25. Giới hạn field và kích thước document

Rules và Zod phải áp cùng giới hạn. Các mức dưới đây là mặc định đề xuất trước khi code.

| Field | Giới hạn đề xuất |
|---|---:|
| Tiêu đề bài học/mẫu | 1-160 ký tự |
| Tên hoạt động | 1-120 ký tự |
| Số hoạt động | 1-30 |
| Thời lượng một hoạt động | 0-480 phút |
| Tổng thời lượng bài | 1-600 phút |
| Mỗi ô mục tiêu/chuẩn bị | 2.000 ký tự |
| Nội dung/kết quả một hoạt động | 5.000 ký tự |
| Bài tập hoặc ghi chú sau dạy | 10.000 ký tự |
| Tóm tắt công khai | 1.000 ký tự |
| Attachment label | 300 ký tự |
| Drive file ID | 200 ký tự |
| URL | Bắt đầu bằng `https://`, tối đa 2.000 ký tự |
| Số buổi một khóa | 1-200 |

Không lưu binary, base64 hoặc HTML không kiểm soát vào document. Editor hiển thị cảnh báo khi document ước tính vượt 700KB và chặn trước giới hạn 1MiB của Firestore.

## 26. Index và phân trang dự kiến

### 26.1 Composite indexes

Danh sách cuối cùng phải được xác nhận bằng query code trước khi thêm vào `firebase/firestore.indexes.json`.

| Collection | Fields |
|---|---|
| `course_curricula` | `courseId ASC, version DESC` |
| `course_curriculum_items` | `courseId ASC, curriculumVersion ASC, sequenceNumber ASC` |
| `standard_lessons` | `subjectId ASC, approvalStatus ASC, updatedAt DESC` |
| `standard_lessons` | `createdBy ASC, approvalStatus ASC, updatedAt DESC` |
| `sessions` | `classId ASC, startAt ASC` (đã có) |
| `lesson_plans` | `classId ASC, sessionId ASC` |

### 26.2 Phân trang

- Thư viện mặc định 25 bài/trang, tối đa 50.
- Dùng cursor `startAfter`, không tải 200 bản ghi rồi chia trang ở client.
- Chương trình khóa tối đa 200 dòng có thể tải một lần vì đã có context một khóa, nhưng chỉ tải detail bài chuẩn khi chọn.
- Buổi dạy mặc định 7 ngày, cho phép 1, 7 hoặc 30 ngày. Không có chế độ `Tất cả`.
- Search tiêu đề phía client chỉ áp dụng trong page đã tải nếu chưa có search service. UI phải ghi rõ phạm vi hoặc chỉ bật khi dataset phù hợp.

## 27. Xử lý đồng thời và xung đột

Vì ứng dụng là client-only, không được giả định chỉ có một Admin hoặc Giáo viên đang sửa.

- Mỗi document có `revision` tăng dần.
- Editor ghi nhớ `revision` lúc mở.
- Lưu dùng transaction: chỉ ghi nếu revision hiện tại khớp revision đã mở.
- Nếu không khớp, không tự ghi đè. Hiển thị `Dữ liệu đã được cập nhật ở nơi khác` với hai lựa chọn `Tải bản mới` và `Sao chép nội dung đang soạn`.
- Publish curriculum dùng transaction hoặc batch có preflight đọc lại header revision.
- Reorder chỉ áp dụng cho curriculum draft.
- Không cho hai thao tác publish chạy song song bằng cách kiểm tra `activeCurriculumVersion` trong transaction.
- Local draft chứa `baseRevision`; khi restore phải cảnh báo nếu server revision đã thay đổi.

Firestore Rules không thể tự đếm toàn bộ item trong collection để chứng minh chuỗi 1 đến N liên tục. Vì vậy:

- Header `itemIds` là nguồn thứ tự nguyên tử.
- Rules kiểm tra kiểu, kích thước list, role và tính bất biến có thể kiểm tra.
- Service kiểm tra quan hệ từng item trước publish.
- Rules tests xác nhận các bất biến có thể cưỡng chế.
- UI không tuyên bố `Đã xuất bản` trước khi batch/transaction hoàn tất.

## 28. Kế hoạch migration dữ liệu cũ

### 28.1 Phân loại an toàn

Không tự động đổi nghĩa document cũ nếu không đủ bằng chứng.

| Dữ liệu cũ | Phân loại đề xuất |
|---|---|
| Có `sessionId` | Giáo án buổi dạy legacy |
| Có `classId`, không có `sessionId` | Giáo án lớp legacy, cần Admin gắn buổi hoặc chuyển thành bài chuẩn |
| Không có `classId`, có `subjectId` | Ứng viên bài học chuẩn, cần xác nhận |
| Không đủ subject/course/class/session | Hàng chờ phân loại thủ công |

### 28.2 Trình tự migration

1. Export backup bằng script hiện có trước khi migrate.
2. Chạy report read-only: số lượng từng nhóm, reference từ assignment và public summary.
3. Bổ sung adapter đọc legacy để hệ thống tiếp tục hiển thị.
4. Tạo curriculum draft từ course và session hiện có.
5. Với mỗi lớp cũ, sắp session gốc theo `startAt`; buổi bù kế thừa sequence của buổi gốc; buổi hủy giữ sequence nhưng không tính đã dạy.
6. Admin xem preview và duyệt mapping trước khi ghi.
7. Ghi theo batch tối đa 400 operations để chừa biên an toàn dưới giới hạn 500.
8. Lưu checkpoint migration để có thể tiếp tục sau lỗi mạng.
9. Không xóa field hoặc collection legacy trong cùng release.
10. Chỉ dọn adapter sau ít nhất một chu kỳ backup và khi report không còn reference chưa migrate.

### 28.3 Tương thích ngược

- `lessonPlanId` trong assignment tiếp tục trỏ ID cũ.
- `lesson_plan_public` giữ ID và contract hiện có trong giai đoạn chuyển tiếp.
- Link `?create=lesson-plan` vẫn mở được.
- Giáo án legacy có badge `Dữ liệu cũ` và hành động `Chuẩn hóa` cho Admin.
- Giáo viên vẫn xem được bản được phân công nhưng không tự đổi loại dữ liệu.

## 29. Archive, xóa và khôi phục

- Không hard delete bài học, curriculum, template hoặc lesson plan trong vòng đầu.
- Archive yêu cầu dialog xác nhận và hiển thị số nơi đang sử dụng.
- Không archive bài chuẩn đang thuộc curriculum published nếu chưa có revision thay thế.
- Không archive curriculum version đang được một class active sử dụng.
- Khôi phục chỉ áp dụng cho bài hoặc template archived chưa bị thay thế bằng chính sách khác.
- Giáo án buổi dạy đã dạy được giữ làm lịch sử, không archive từ UI thông thường.
- Mọi thao tác approve, publish, archive, restore và sửa sau dạy phải tạo audit log best-effort.

Bổ sung `AuditAction` dự kiến:

```text
standard_lesson_submitted
standard_lesson_approved
standard_lesson_returned
course_curriculum_published
course_curriculum_archived
lesson_plan_marked_ready
lesson_plan_post_teaching_adjusted
lesson_plan_template_archived
```

Audit log không thay thế transaction nghiệp vụ. Lỗi ghi audit được log kỹ thuật theo cơ chế hiện có nhưng không rollback dữ liệu đã lưu thành công.

## 30. Query keys và cache contract

Mở rộng factory hiện có, không viết array key rải rác trong component.

```ts
queryKeys.courseCurricula(courseId)
queryKeys.courseCurriculum(courseId, version)
queryKeys.courseCurriculumItems(courseId, version)
queryKeys.standardLessons(filters, cursor)
queryKeys.standardLesson(id)
queryKeys.teachingSessions(classIds, from, to)
queryKeys.sessionLessonPlan(sessionId)
queryKeys.lessonPlanTemplates(scope, subjectId, durationMinutes)
```

Invalidation tối thiểu:

- Lưu bài chuẩn: invalidate detail và page chứa bài; không invalidate toàn module.
- Publish curriculum: invalidate header khóa, curriculum versions và class creation data.
- Lưu giáo án buổi: invalidate session detail, teaching queue, staff dashboard gap và public summary nếu visibility thay đổi.
- Archive template: invalidate template picker, không invalidate lesson plan list.

## 31. Bản nháp local

Quy ước key:

```text
edumatrix:lesson-draft:{uid}:{editorMode}:{entityIdOrNew}:{contextId}
```

Payload tối thiểu:

```ts
interface LocalLessonDraft {
  schemaVersion: 1;
  baseRevision: number | null;
  savedAtIso: string;
  context: {
    subjectId: string | null;
    courseId: string | null;
    classId: string | null;
    sessionId: string | null;
  };
  values: LessonEditorFormValues;
}
```

- Debounce local save 800-1.500ms sau thay đổi.
- Xóa local draft sau khi Firestore save thành công và cache đã cập nhật.
- Không đồng bộ draft local giữa tài khoản.
- Khi logout, xóa draft hoặc giữ theo lựa chọn chính sách sản phẩm; mặc định đề xuất xóa để tránh lộ dữ liệu trên máy dùng chung.
- Draft quá 30 ngày được đề nghị xóa.

## 32. File impact dự kiến

### Sửa

- `src/types/academic.ts`
- `src/constants/collections.ts`
- `src/hooks/queryKeys.ts`
- `src/services/firestore/lessonPlans.ts`
- `src/services/firestore/classes.ts`
- `src/services/firestore/sessions.ts`
- `src/types/audit.ts`
- `firebase/firestore.rules`
- `firebase/firestore.indexes.json`
- `src/features/lesson-plans/pages/LessonPlansPage.tsx`
- Các component Lesson Plan hiện có khi còn phù hợp.

### Tạo mới theo nhu cầu thực tế

- Schema cho bài chuẩn và curriculum.
- Service `courseCurricula.ts` và `standardLessons.ts` nếu lessonPlans service trở nên quá nhiều trách nhiệm.
- Ba workspace và các component nghiệp vụ ở Mục 10.
- Tests tương ứng trong `src` và `firebase/tests`.
- Script/report migration read-only hoặc màn hình Admin migration nếu được duyệt.

Không đổi `AppShell`, route slug, palette, font hoặc shared component API nếu không có lỗi thực tế buộc phải đổi.

## 33. Rollout và rollback

### Rollout

1. Deploy Rules/index tương thích ngược trước.
2. Deploy type/service và adapter legacy dưới feature flag.
3. Bật read-only Chương trình khóa cho Admin.
4. Chạy migration preview và đối chiếu dữ liệu.
5. Bật ghi curriculum cho Admin.
6. Bật Editor mới cho nhóm thử nghiệm.
7. Bật Buổi dạy cho toàn bộ Giáo viên.
8. Gỡ UI cũ sau khi tiêu chí migration đạt.

Feature flag có thể dùng settings document hiện có, ví dụ `lessonPlansV2Enabled`, nhưng Rules không được phụ thuộc vào feature flag UI.

### Rollback

- Tắt feature flag để quay lại UI cũ.
- Không xóa dữ liệu collection mới khi rollback.
- Adapter cũ tiếp tục đọc `lesson_plans` hiện tại.
- Rules mới phải tiếp tục cho phép contract cũ trong giai đoạn rollback đã định trước.
- Nếu publish curriculum lỗi giữa chừng, transaction/header không được chuyển sang `published`.

## 34. Chỉ số sau triển khai

Không dùng số liệu giả trong UI. Các chỉ số dưới đây lấy từ dữ liệu thực tế hoặc audit log:

- Tỷ lệ session 7 ngày tới có giáo án sẵn sàng.
- Số curriculum published đủ 100% item.
- Thời gian trung vị từ mở session đến lưu giáo án nháp đầu tiên.
- Tỷ lệ bài chuẩn được tái sử dụng ở từ hai khóa trở lên.
- Số lần save thất bại do permission hoặc conflict.
- Số local draft được khôi phục.
- Reads trung bình khi mở từng workspace trong Emulator.

Không bổ sung analytics bên thứ ba trong vòng đầu. Ưu tiên audit log và đo bằng emulator/devtools.

## 35. Pre-flight trước khi bắt đầu code

- [ ] Đã duyệt ba workspace và tên gọi.
- [ ] Đã duyệt ma trận quyền.
- [ ] Đã duyệt state machine và định nghĩa `Sẵn sàng`.
- [ ] Đã duyệt version snapshot cho class.
- [ ] Đã duyệt `session.lessonPlanId` làm liên kết chính.
- [ ] Đã duyệt giới hạn field.
- [ ] Đã xác nhận index từ query code dự kiến.
- [ ] Đã export backup và có report legacy.
- [ ] Đã quyết định chính sách local draft khi logout.
- [ ] Đã có wireframe desktop 1024/1440 và mobile 375.
- [ ] Đã kiểm tra một H1, một CTA, focus order và touch target.
- [ ] Đã xác định loading, empty, error, permission, conflict và dirty state.
- [ ] Đã xác định feature flag, rollout và rollback.
- [ ] Không thêm dependency mới nếu component hiện có đáp ứng.

## 36. Definition of Done cho toàn bộ kế hoạch

Kế hoạch chỉ được coi là hoàn tất triển khai khi:

1. Nghiệp vụ Buổi 1 đến Buổi N hoạt động với course nhiều môn.
2. UI phân biệt rõ bài chuẩn, chương trình khóa, giáo án buổi dạy và mẫu.
3. Admin và Giáo viên chỉ thấy và làm được đúng quyền.
4. Không có collection scan hoặc query trong từng row.
5. Không có ghi Firestore theo keystroke.
6. Dữ liệu legacy vẫn đọc được và có đường chuẩn hóa.
7. Publish, version, học bù, hủy buổi và notes sau dạy có test.
8. Mobile 375px, keyboard, reduced motion và contrast đạt tiêu chí.
9. Rules, index, typecheck, lint, unit tests và build đều qua.
10. Có phương án rollback không mất dữ liệu.
