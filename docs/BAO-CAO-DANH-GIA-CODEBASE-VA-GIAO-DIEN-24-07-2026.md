## Báo cáo đánh giá codebase & giao diện — Edumatrix-VN
**Ngày:** 24/07/2026 · **Phạm vi:** Toàn bộ `src/`, `firebase/firestore.rules`, `workers/messenger`, cấu hình gốc · **Phương pháp:** Đọc trực tiếp mã nguồn (không chạy được `npm run dev`/test trong sandbox vì binary Windows), `tsc --noEmit`, `eslint`, đối chiếu rules ↔ client code, đối chiếu code ↔ `docs/DESIGN-SYSTEM-v2.md`.

Không có PR nào đang mở để review — đây là đánh giá tổng thể theo yêu cầu "kiểm thử lại codebase và giao diện", tập trung vào mã đã thay đổi trong ~8 commit gần nhất và các module chính.

---

### 🔴 NGHIÊM TRỌNG — xử lý ngay

**1. Service-account key thật bị commit vào git**
File `edumatrix-vn-576b1-firebase-adminsdk-fbsvc-9606e7b79a.json` (private key admin đầy đủ của project `edumatrix-vn-576b1`) đã được `git add` trong commit `5dc7779` ("Last update 24-07"), và **không có** trong `.gitignore`.

Tin tốt: nhánh `main` đang "ahead of origin 1 commit" — commit này **chưa push lên GitHub**, nên chưa lộ công khai.

Cần làm ngay:
- `git reset --soft HEAD~1` (hoặc `git rm --cached <file>` rồi amend) để bỏ file khỏi commit trước khi push.
- Thêm `*firebase-adminsdk*.json` và `*service-account*.json` vào `.gitignore`.
- Vì file đã tồn tại trên đĩa máy cục bộ (không chỉ trong git history), nên **rotate (thu hồi) key này trong Firebase Console → Project Settings → Service accounts** cho chắc, đề phòng key từng bị đồng bộ/backup ra ngoài git.

---

### 🟠 MỨC ĐỘ CAO — lỗi thật, ảnh hưởng chức năng

**2. KPI "Bài đang chờ chấm" / "Bài cần nhắc nộp" trên dashboard luôn sai**
`src/services/firestore/assignments.ts`: `createAssignment` khởi tạo `submittedCount: 0`, nhưng `submitAssignment` (dòng 94-116) chỉ ghi document `submissions/`, **không bao giờ tăng** `submittedCount` trong `assignment_summaries`. `gradeSubmission` chỉ giữ nguyên giá trị cũ.

Hậu quả tại `src/services/firestore/staffDashboard.ts`:
- Dòng 89: `ungraded = Σ max(0, submittedCount − gradedCount)` → luôn ra 0 → mục "Bài đang chờ chấm" không bao giờ hiện, kể cả khi có bài chưa chấm.
- Dòng 94: `missingSubmissions = Σ max(0, totalStudents − submittedCount)` → luôn bằng sĩ số → mục "Bài cần nhắc nộp" luôn báo toàn bộ học sinh chưa nộp, kể cả học sinh đã nộp.

Đáng chú ý: hàm `getDashboardLearning` (cùng file) lại tính tỷ lệ nộp bài đúng bằng cách đếm trực tiếp document `submissions/` — chứng tỏ có 2 cách tính song song, và nhánh dùng `assignment_summaries.submittedCount` là nhánh sai. Cần sửa `submitAssignment` để `increment(1)` vào `submittedCount` (giống cách `gradedCount` được tăng khi chấm bài).

**3. Race condition trong module Tương tác lớp học (mất dữ liệu vừa nhập)**
`src/features/classroom/pages/ClassroomInteractionPage.tsx`:
- Dòng 284, điều kiện loading gate: `session.isLoading || klass.isLoading || students.isLoading || interaction.isLoading` — **thiếu `savedEntries.isLoading`**.
- Nhưng effect "seed" dữ liệu đã lưu vào state (`entries`, `taughtContent`, `quickSummary`, `homeworkText`, dòng 157-176) lại phụ thuộc `savedEntries.isLoading`.

→ Có một khoảng thời gian màn hình đã render đầy đủ (qua được gate ở dòng 284) nhưng `savedEntries` (điểm danh/nhận xét đã lưu) vẫn đang tải, nên form hiển thị giá trị mặc định (toàn bộ "có mặt", "chưa giao bài", ghi chú trống) thay vì dữ liệu thật. Nếu giáo viên thao tác (tick điểm danh, gõ ghi chú) đúng lúc đó, effect seed chạy xong sẽ **ghi đè và làm mất thao tác đó** — xảy ra gần như mỗi lần mở một buổi học, không phải edge-case hiếm.
Cách sửa gọn: thêm `savedEntries.isLoading` vào điều kiện ở dòng 284.

**4. Nút "Môn học" / "Khóa học" trong menu "+Thêm" không hoạt động với giáo viên**
Menu "+Thêm" ở Topbar (`src/components/layouts/Topbar.tsx`, hiện cho cả admin lẫn giáo viên) có mục "Môn học" (`?create=subject`) và "Khóa học" (`?create=course`). Nhưng tại `src/features/catalog/pages/CatalogPage.tsx` dòng 104 & 112, cả hai `<Modal>` tạo mới đều bọc trong `{isAdmin && ...}`. Giáo viên bấm vào menu này chỉ được chuyển sang tab "Danh mục", modal không bao giờ mở — nút im lặng không làm gì. Lỗi có sẵn từ trước (không thuộc commit 23-07/24-07), nhưng nằm ngay trong menu vừa được sửa nên nên tiện thể ẩn 2 mục này khỏi menu khi role là giáo viên, hoặc mở modal cho cả giáo viên nếu đó là chủ đích sản phẩm.

---

### 🟡 MỨC ĐỘ TRUNG BÌNH — UI/UX

**5. Trùng thẻ `<h1>` trên 3 màn hình — đúng lỗi tài liệu thiết kế đã ghi là "đã sửa"**
`docs/DESIGN-SYSTEM-v2.md` mục 0 từng nêu vấn đề "Topbar hiện tiêu đề động và PageHeader render H1 → 2 H1/trang", hướng sửa là chỉ giữ 1 H1. Thực tế `PageHeader.tsx` đã được sửa đúng hướng (bỏ H1). Nhưng `Topbar.tsx:135` vẫn tự render `<h1>{title}</h1>`, và 3 nơi sau lại **tự thêm H1 riêng đè lên H1 của Topbar**:
- `StaffDashboardPage.tsx:46`
- `ClassDetailPage.tsx:79`
- `ClassroomInteractionPage.tsx:70` và `:313` (2 trạng thái khác nhau của cùng trang)

→ Mỗi trang này có 2 thẻ `<h1>`, sai ngữ nghĩa HTML/ảnh hưởng screen reader. Ngoài ra, tài liệu thiết kế mục 3 vẫn ghi hướng "bỏ tiêu đề lớn khỏi Topbar, dùng breadcrumb" — nhưng code lại làm ngược lại (giữ H1 ở Topbar, bỏ ở PageHeader). Tài liệu chưa cập nhật theo code thực tế, nên các trang mới thêm H1 con không có gì cảnh báo trùng lặp. Nên: (a) đổi 4 vị trí trên từ `<h1>` sang `<p>`/`<div>` cấp tiêu đề phụ, (b) cập nhật lại `DESIGN-SYSTEM-v2.md` cho khớp quyết định thực tế (Topbar giữ H1).

**6. Nút thu gọn Sidebar nhỏ hơn chuẩn cỡ chạm của chính dự án**
`Sidebar.tsx:254`, nút chevron thu gọn dùng `h-8 w-8` (32px), trong khi các nút icon khác cùng file/Topbar dùng `.icon-button` (44px, chuẩn `min-h-touch`) hoặc `size-9` (36px). Ảnh hưởng thấp vì chỉ hiện ở desktop, nhưng lệch chuẩn nội bộ — nên đổi sang `size-9` cho nhất quán.

---

### ✅ Đã kiểm tra kỹ, không phát hiện vấn đề

- **Luồng "giáo viên tự thêm học sinh"** (thay đổi chính của commit 23-07/24-07): `createStudent()` gửi đúng `teacherIds: [uid]`, `parentUids: []`, `currentClassIds: []`, `status: "active"` — khớp 100% với điều kiện `allow create` cho giáo viên trong `firestore.rules:673-683`. Form cũng ẩn đúng phần liên kết phụ huynh (chỉ admin thấy). Không có rủi ro bị Firestore từ chối ghi.
- **Firestore Rules** đối chiếu với toàn bộ client code trong `services/firestore/`: nhất quán, không tìm thấy lỗ hổng khai thác được. 3 điểm "quyền rộng" (giáo viên có thể ghi danh học sinh bất kỳ vào lớp mình dạy rồi sửa hồ sơ học sinh đó; giáo viên đọc được danh bạ phụ huynh mọi học sinh; điểm danh nháp học sinh đọc được trước khi "phát hành") đều có comment xác nhận là chủ đích thiết kế, không phải lỗi.
- **Luồng đăng nhập/vai trò** (`AuthContext`, `auth.ts`): role/status nằm trong `users/{uid}`, không client-writable, gắn với invite — không có đường lách.
- **Module Tương tác lớp học — publish/amend**: transition version, quyền staff-only cho bản nháp, học sinh/phụ huynh chỉ thấy bản đã publish — đúng thiết kế.
- **Cloudflare Worker Messenger**: xác minh chữ ký webhook Meta bằng HMAC-SHA256 compare hằng thời gian, có bật thật (không bị stub/tắt).
- **Rò rỉ secret khác**: quét toàn repo (kể cả lịch sử git thêm-file), chỉ tìm thấy đúng 1 file ở mục Nghiêm trọng. `.env`/`.env.example` chỉ chứa key public-by-design (Firebase Web API key, reCAPTCHA site key...). `workers/messenger/.dev.vars` chỉ là placeholder.
- **`npm run typecheck`** và **`npm run lint`** (`--max-warnings 0`): cả hai đều pass, 0 lỗi/cảnh báo.
- **Giao diện tổng thể**: hệ thống token (`rounded-card`/`rounded-input`, thang `--shadow-*`, `tabular-nums`, bảng màu primary/success/warning/danger) được áp dụng nhất quán ở layout, UI-kit, dashboard, biểu đồ. Không thấy màu hex cứng, không lạm dụng gradient/glassmorphism, không thiếu `aria-label` ở các icon-button đã kiểm tra.

---

### 📝 Ghi chú kỹ thuật (không phải bug)

- Toàn bộ `git status`/`git diff` trên working tree hiện báo ~50 file "modified" chỉ vì **line-ending lẫn CRLF/LF** (đã xác nhận `git diff -w` = 0 khác biệt thật). Không phải thay đổi nội dung. Nên cân nhắc thêm `.gitattributes` (`* text=auto eol=lf`) để tránh nhiễu diff và tránh commit nhầm sau này.
- Không có file `CLAUDE.md` áp dụng riêng cho project này (chỉ có bản mẫu trong thư mục vendor `Agents Instuctions/` và trong `node_modules`) — nên đánh giá này không áp dụng khung "CLAUDE.md compliance", tập trung vào bug thật + đối chiếu tài liệu thiết kế nội bộ của dự án.

---

### Việc cần làm, theo thứ tự ưu tiên

1. Gỡ file service-account key khỏi commit, thêm `.gitignore`, rotate key trên Firebase Console.
2. Sửa `submitAssignment` để tăng `submittedCount` — khôi phục đúng 2 KPI dashboard.
3. Thêm `savedEntries.isLoading` vào gate loading của `ClassroomInteractionPage.tsx` (dòng 284).
4. Ẩn "Môn học"/"Khóa học" khỏi menu "+Thêm" cho role giáo viên, hoặc mở quyền tạo cho giáo viên nếu đó là chủ đích.
5. Dọn trùng `<h1>` ở 3 trang, đồng bộ lại `DESIGN-SYSTEM-v2.md`.
6. Đổi nút thu gọn Sidebar sang `size-9`.
