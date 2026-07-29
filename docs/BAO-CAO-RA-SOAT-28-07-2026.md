# Báo cáo rà soát tài liệu kỹ thuật vs mã nguồn — 28/07/2026

> Phạm vi: đối chiếu toàn bộ tài liệu trong `docs/`, `AI-AGENTS-GUIDE-EDUMATRIX-VN.md` và `ke-hoach-he-thong-quan-ly-lop-hoc-firebase-spark.md` với mã nguồn thực tế trong `src/`, `firebase/` và `workers/messenger/`.
>
> **Giới hạn của báo cáo này:** không chạy được `npm run lint / typecheck / test / test:rules / build` trong phiên làm việc (môi trường sandbox Linux không khởi động). Toàn bộ kết luận dưới đây đến từ **đọc mã nguồn tĩnh**, mỗi mục đều có đường dẫn file và số dòng để anh tự kiểm chứng. Con số test (82/82, 137/137, 37/37) trong báo cáo này là **trích lại từ tài liệu 27/07**, chưa được xác minh lại.

---

## 1. Tóm tắt điều hành

| Nhóm phát hiện | Số mục | Mức độ |
|---|---:|---|
| A. Tài liệu nói "chưa có" nhưng code đã có (doc lỗi thời) | 6 | Trung bình — gây làm lại việc đã xong |
| B. Tài liệu quy định X nhưng code làm Y (nợ thiết kế thật) | 7 | Cao — 2 mục chạm trực tiếp mục tiêu Spark |
| C. Bug đã ghi trong tài liệu nhưng chưa sửa | 1 (+1 mở rộng) | Trung bình — mất dữ liệu form |
| D. Việc còn dở đã xác minh là còn dở thật | 8 | Theo kế hoạch |

**Kết luận chính:** vấn đề lớn nhất của dự án hiện tại **không phải là code sai**, mà là **tài liệu đã trôi khỏi thực tế**. Cụ thể:

1. `docs/upgrade-roadmap-state.json` — nguồn trạng thái được cả `roadmap:update` lẫn `upgrade-roadmap.html` đọc — dừng ở `14/07/2026`, trong khi công việc thật đã chạy tới 27–28/07. Mọi thứ hiển thị trên roadmap HTML hiện đang sai.
2. Hai tài liệu ưu tiên cao nhất (`AI-AGENTS-GUIDE` §A15 và kế hoạch gốc §19) quy định một cơ chế giảm read cho Viewer (`viewer_dashboards`) **chưa từng được triển khai**, và mục này đã bị treo "cần Admin quyết định" từ 17/07 tới nay.
3. Tài liệu Messenger 27/07 **tự mâu thuẫn với chính nó**: mục 0 (Lần 3) ghi đã xong 6 hạng mục, mục 4.2 vẫn liệt kê đúng 6 hạng mục đó là "Chưa có".

---

## 2. Nhóm A — Tài liệu nói "chưa có" nhưng code đã có

Đây là nhóm nguy hiểm âm thầm: đọc tài liệu rồi bắt tay làm sẽ **làm lại việc đã hoàn thành**.

### A1. Messenger Utility — mục 4.2 mâu thuẫn với mục 0 trong cùng file

`docs/KE-HOACH-TONG-HOP-MESSENGER-UTILITY-27-07-2026.md` mục **4.2 "Phía Worker"** liệt kê 6 việc "Chưa":

| Tài liệu nói "Chưa" | Thực tế trong code |
|---|---|
| Chưa có feature flag `UTILITY_MESSAGING_ENABLED` | Có — `workers/messenger/src/index.ts:13, 755`; `wrangler.jsonc:14, 29` |
| Chưa có allowlist Utility Template phía server | Có — registry template trong Worker (mô tả tại mục 0, Lần 3) |
| Chưa validate tham số riêng từng template | Có — mục 0 ghi rõ "chặn tham số thừa, giá trị rỗng hoặc quá dài" |
| Chưa lưu `templateKey`/phiên bản/ngôn ngữ vào outbox | Có — 7 field outbox mới liệt kê ở mục 0 |
| Chưa nhận và lưu trạng thái phê duyệt template | Có — `index.ts:293` (2 tên field webhook), `index.ts:1102` ghi `messenger_template_status` |
| Chưa có nhánh Utility độc lập | Có — mục 0 ghi builder Utility riêng |

**Xử lý:** viết lại mục 4.2 cho khớp mục 0, hoặc xoá hẳn mục 4.2 và trỏ về nhật ký triển khai. Giữ nguyên như hiện tại là bẫy cho lượt làm việc sau.

### A2. Trang Privacy Policy — đã có, tài liệu vẫn ghi là blocker

Cùng file trên, mục 0 (Lần 5) liệt kê blocker #2: *"Codebase chưa có trang Privacy Policy công khai dành cho EduMatrix"*.

Thực tế đã có và đã vào router:

- `src/features/legal/pages/PrivacyPolicyPage.tsx`
- `src/features/legal/pages/DataDeletionPage.tsx`
- `src/app/router.tsx:15-16` (lazy import), `:59-60` (route công khai, ngoài `RequireAuth`)

**Xử lý:** gạch blocker #2. Blocker #1 (URL Privacy Policy khai trong Meta đang trỏ `quancandaltom.vn`) **vẫn còn** — chỉ cần đổi URL sang trang EduMatrix đã có.

### A3. `upgrade-roadmap-state.json` dừng ở 14/07

`lastUpdatedAt: "2026-07-14T04:49:51.664Z"`, task cuối có evidence là `P3-001`. Hệ quả:

- `P5-001 "Cấu hình CI cho lint typecheck test build"` = `todo`, nhưng `.github/workflows/ci.yml` **đã tồn tại** với đủ 6 cổng (`lint`, `typecheck`, `test`, `test:rules`, `build`) cộng một job riêng cho worker.
- `P1-004 "Chốt worker production deploy config"` = `todo`, nhưng `workers/messenger/package.json:7,11` đã có `build:prod` và `deploy:prod` với `--env production`, kèm `check:prod-config` (`scripts/check-production-config.mjs`) chặn origin localhost/placeholder. Worker cũng đã deploy production ngày 27/07.

**Xử lý:** chạy `npm run roadmap:update` để cập nhật P1-004 và P5-001 thành `done`, và bổ sung các phase phát sinh sau 14/07 (Classroom Interaction, Chat V2, Messenger Utility, Legal pages). Nếu không định duy trì file này nữa thì nên ghi rõ "ngừng sử dụng" ở đầu file và ở `upgrade-roadmap.html`, tránh người sau tin nhầm.

### A4. Kế hoạch sửa lỗi 20/07 — tiêu đề mâu thuẫn với thân bài

`docs/KE-HOACH-SUA-LOI-VA-NO-KY-THUAT-20-07-2026.md:3` ghi:

> *"Trạng thái: Đã chốt phạm vi (20/07), chờ duyệt Đợt 1 để bắt đầu. … **Chưa có dòng code nào được sửa.**"*

Nhưng cả 6 đợt bên dưới đều đánh `✅ HOÀN THÀNH (20/07)`, và mục 142–147 vẫn còn "Câu hỏi cần Lợi trả lời **trước khi bắt đầu**" — dù các câu hỏi đó đã được trả lời và ghi ở mục "Quyết định đã chốt" ngay phía trên.

**Xử lý:** sửa dòng 3 thành "Đã hoàn thành 6/6 đợt (20/07)", xoá mục "Câu hỏi cần trả lời trước khi bắt đầu".

### A5. Ghi chú "ngoài phạm vi" về Meta access token đã lỗi thời

Cùng file, dòng 138 ghi là việc chưa làm: *"`access_token` Meta truyền qua query string thay vì header"*.

Thực tế Worker gửi token trong header ở **mọi** lệnh gọi Meta:

- `index.ts:645` (lấy profile), `:725` (gửi tin), `:866` (upload ảnh), `:876` (đăng feed), `:994` (đọc danh sách Page)

Tài liệu 27/07 mục 2.1 cũng đã xác nhận điều này. **Xử lý:** xoá dòng 138.

### A6. Checklist production 19/07 chưa phản ánh việc đã làm

`docs/CHECKLIST-TRIEN-KHAI-PRODUCTION.md` còn **0/40 mục được tick**, trong khi tới 27/07 đã có: Worker deploy production, webhook Page verified với 6 field, CORS giới hạn 2 origin HTTPS, Google OAuth/Picker khai báo xong.

**Xử lý:** tick các mục đã có bằng chứng, giữ nguyên các mục chưa smoke test thật (đúng tinh thần "code-ready ≠ đã triển khai" ghi ở đầu file).

---

## 3. Nhóm B — Tài liệu quy định X nhưng code làm Y

Đây là nợ thiết kế thật, không phải lỗi tài liệu.

### B1. `viewer_dashboards` chưa từng được triển khai — **ưu tiên cao nhất**

**Tài liệu quy định (2 nguồn ưu tiên cao nhất):**

- `AI-AGENTS-GUIDE-EDUMATRIX-VN.md` §A15: *"Viewer dashboard dùng document tổng hợp `viewer_dashboards/{uid}` … Mở portal chỉ cần 1–2 reads."*
- `ke-hoach-he-thong-quan-ly-lop-hoc-firebase-spark.md` §19 + §38 (tiêu chí nghiệm thu hiệu suất): *"Dashboard Viewer dùng dữ liệu tổng hợp."*

**Thực tế** (`src/services/firestore/viewerDashboard.ts:55-107`): `buildViewerDashboard()` dựng dashboard bằng cách đọc trực tiếp từ ~11 nhóm truy vấn, có fan-out theo số lớp và số học sinh:

```
getStudent            × N học sinh
getClass              × M lớp
listCourses()         ← đọc TOÀN BỘ collection courses, không lọc
listSessionsByClass   × M   (≤12 doc/lớp)
listPublicLessonPlans × M   (≤12 doc/lớp)
listAssignmentsByClass× M   (≤25 doc/lớp)
listSubmissionsByStudents   (≤100 doc)
listScoresByStudent   × N   (≤10 doc)
listAttendanceByStudents    (≤50 doc)
listInvoicesByStudents      (≤30 doc)
listAnnouncementsByStudents (≤10 doc/học sinh)
```

Với 1 phụ huynh / 1 con / 1 lớp, một lần mở dashboard có thể tốn **trên 200 document reads** — so với ngân sách 30 reads/Viewer/ngày ghi trong kế hoạch gốc §22.

Không có `VIEWER_DASHBOARDS` trong `src/constants/collections.ts`, cũng không có `match /viewer_dashboards/` trong `firebase/firestore.rules`. Script seed còn ghi chú thẳng: *"UI hien tai tu build lai tu raw data"* (`scripts/seed-local-full.mjs:308`).

**Lịch sử:** mục này từng được nêu ngày 17/07 (`docs/archive/KE-HOACH-SUA-LOI-REVIEW-TONG-THE-17-07-2026.md` §4.2) và bị đánh dấu **[CẦN ADMIN QUYẾT ĐỊNH]** — treo từ đó đến nay, không có quyết định nào được ghi lại.

> **Cần anh quyết định.** Có ba hướng, không có hướng nào sai tuyệt đối:
>
> 1. **Chấp nhận thực tế, sửa tài liệu.** Với dưới 50 Viewer, ~200 reads/lần mở vẫn nằm trong 50.000/ngày nếu mỗi phụ huynh mở vài lần. Rẻ nhất, và loại bỏ một lớp dữ liệu phải giữ đồng bộ.
> 2. **Làm đúng tài liệu.** Viết `viewer_dashboards/{uid}` và cập nhật nó trong cùng `writeBatch` với các thao tác Staff. Đúng thiết kế gốc, nhưng trên Spark (không có Cloud Functions) mọi việc cập nhật phải do client Staff làm — dashboard sẽ cũ nếu Staff không thao tác.
> 3. **Vá điểm đau rẻ nhất trước:** bỏ `listCourses()` không lọc (dòng 62) và giới hạn theo `courseId` của lớp. Một dòng, giảm read tuyến tính theo số khóa học của trung tâm.
>
> Khuyến nghị: làm (3) ngay, rồi chọn giữa (1) và (2) sau khi xem số read thật trong Firebase Console một tuần.

### B2. `attendance_summaries` — khoá và schema khác hoàn toàn tài liệu

| | Tài liệu (`ke-hoach…` §13.4, `AI-AGENTS-GUIDE`) | Code thực tế |
|---|---|---|
| Doc ID | `{classId}_{studentId}` | `{sessionId}` — `attendance.ts:90`, `firestore.rules:922` |
| Ngữ nghĩa | Tích luỹ **theo học sinh** | Thống kê **theo buổi học** |
| Field | `totalSessions`, `presentCount`, `absentExcusedCount`, `absentUnexcusedCount`, `lateCount`, `makeupCount`, `attendanceRate` | `sessionId`, `classId`, `total`, `present`, `absent`, `late`, `excused` |

Đây không phải đổi tên field — là **hai mô hình dữ liệu khác nhau**. Hệ quả trực tiếp: không thể tính `attendanceRate` của một học sinh mà không đọc lại toàn bộ `attendance` thô. Đây chính là lý do B1 phải fan-out.

Bản thân bảng tổng hợp theo buổi vẫn hữu ích (Staff Dashboard đang dùng, theo `P3-001`), nên khuyến nghị **giữ code, sửa tài liệu**, và nếu cần `attendanceRate` cho Viewer thì thêm một collection riêng chứ đừng đổi khoá collection đang có production data.

### B3. Trạng thái điểm danh: tài liệu 6 giá trị, code 4

- Tài liệu §13.1: `present`, `absent_excused`, `absent_unexcused`, `late`, `makeup`, `online`
- Code: `src/types/academic.ts:151` → `"present" | "absent" | "late" | "excused"`; `firestore.rules:915, 917` cũng chốt đúng 4 giá trị này.

`absent_excused`/`absent_unexcused` bị gộp thành `absent` + `excused`; `makeup` và `online` không tồn tại (buổi học bù được xử lý ở tầng `sessions` qua `makeUpForSessionId` — `CreateSessionModal.tsx:229-230`, là cách làm hợp lý hơn).

**Khuyến nghị:** giữ code, sửa tài liệu. Đổi enum trên dữ liệu production đắt hơn nhiều so với lợi ích.

### B4. `messenger_template_status` chưa có Firestore Rules

Worker ghi vào collection này (`index.ts:1102`) qua service account REST — đường này **bỏ qua** Security Rules nên ghi vẫn chạy. Nhưng trong `firebase/firestore.rules` **không có** `match /messenger_template_status/`, nên nó rơi vào `match /{document=**}` deny mặc định ở cuối file (dòng 1141).

Hệ quả: **frontend không đọc được**. Kế hoạch Giai đoạn 6 có hạng mục *"Tạo màn hình Admin chỉ để xem/bật/tắt template"* — màn hình đó sẽ nhận `permission-denied` ngay khi làm.

**Xử lý (nhỏ, làm trước khi bắt đầu Giai đoạn 6):** thêm rule read-only cho Admin, không cho client ghi:

```
match /messenger_template_status/{templateId} {
  allow read: if isAdmin();
  allow write: if false;   // chỉ Worker qua service account
}
```

### B5. `allowedOrigin()` vẫn còn nhánh `"*"`

`workers/messenger/src/index.ts:122` và `:135` vẫn trả `"*"` nếu `ALLOWED_ORIGIN` được đặt là `*`. Đây chính là sự cố P1 ghi trong báo cáo 24/07.

Hiện đã có hai lớp chặn: `wrangler.jsonc:28` đặt 2 origin HTTPS cụ thể, và `check-production-config.mjs` chạy trước mỗi `deploy:prod`. Rủi ro còn lại là ai đó deploy bằng `wrangler deploy --env production` trực tiếp, bỏ qua npm script.

**Khuyến nghị:** cân nhắc bỏ hẳn nhánh `"*"` khỏi code. Không còn ai dùng nó, và xoá thì không thể tái diễn.

### B6. CI ghim Node 20, báo cáo khuyến nghị Node 22

`.github/workflows/ci.yml:18, 36` dùng `node-version: 20`. Báo cáo 24/07 §3 khuyến nghị Node 22 LTS (do `superstatic@9.2.0` chỉ khai báo hỗ trợ Node 18/20/22, còn máy anh đang chạy Node 24). Node 20 vẫn hợp lệ, nhưng khác với khuyến nghị đã ghi — nên chốt một con số rồi ghi vào một chỗ duy nhất.

### B7. Checklist yêu cầu test dark mode, nhưng dark mode đã bị tắt

`CHECKLIST-TRIEN-KHAI-PRODUCTION.md` §5: *"Kiểm tra light/dark mode"*. Nhưng Đợt 6.8 (20/07) đã *"Vô hiệu hoá lựa chọn Tối/Theo hệ thống, gắn nhãn Sắp ra mắt"*. **Xử lý:** bỏ vế "dark mode" khỏi checklist.

---

## 4. Nhóm C — Bug đã ghi trong tài liệu nhưng chưa sửa

### C1. `StudentForm` commit dở dang khi liên kết phụ huynh thất bại

Đã mô tả chính xác trong `docs/KE-HOACH-LIEN-KET-PHU-HUYNH.md` §3 (lập hôm nay, 28/07, trạng thái *chờ duyệt*). Xác nhận bug vẫn còn nguyên trong code:

`src/features/students/components/StudentForm.tsx`:

```ts
93:  await createStudent({ ... });                    // ① đã ghi vào Firestore
...
108:  if (isAdmin && values.parentEmail) {
109:    const result = await linkParentToStudent(...);
115:    if (!result.linked) throw new Error(result.reason);   // ② ném lỗi, ① không rollback
116:  }
```

Hậu quả đúng như tài liệu mô tả: học sinh đã nằm trong DB, thông tin phụ huynh mất trắng, submit lại dính `student_code_exists`.

**Bổ sung ngoài tài liệu:** ngay bên dưới, khối ghi danh lớp có **cùng lỗi**:

```ts
118:  if (values.classId) {
120:    if (!selectedClass) throw new Error("class_not_found");
121:    await enrollStudent(values.classId, selectedClass.courseId, studentId);   // ném lỗi → ① vẫn tồn tại
122:  }
```

Nếu `enrollStudent` thất bại (ví dụ transaction đụng Rules), kết quả y hệt. Khi sửa theo phương án "không throw, hiện cảnh báo mềm" trong kế hoạch, nên áp cho **cả hai** khối chứ không chỉ khối phụ huynh — cùng một nguyên nhân gốc: form đang chạy 3 thao tác ghi độc lập trong một mutation mà không có bước bù trừ.

---

## 5. Nhóm D — Việc còn dở, đã xác minh là còn dở thật

| Mục | Nguồn | Xác minh trong code | Trạng thái |
|---|---|---|---|
| Màn hình Audit log cho Admin | `roadmap-state` P3-002 | Chỉ có `src/services/firestore/auditLog.ts`, không có page/route nào | Còn dở thật |
| Import học sinh/lớp từ CSV | `roadmap-state` P3-003 | Không tìm thấy code CSV/import trong `src/features` | Còn dở thật |
| Thông báo & Messenger campaign (templates, rate limit, outbox monitor) | `roadmap-state` P4-001 | — | Còn dở |
| Backup/export dữ liệu + runbook | `roadmap-state` P4-002, kế hoạch gốc §36 | Không có script export | Còn dở |
| Definition of Done | `roadmap-state` P5-002 | — | Còn dở |
| Meta App Review | KH Messenger 27/07, Lần 5 | 8 blocker, **trừ #2 đã xong** (xem A2) → còn 7: URL privacy policy trong Meta, khai báo Website platform, video 5 quyền, tài khoản reviewer, App Tester, template được duyệt, checkbox cam kết | Còn dở, phụ thuộc thao tác của anh trên Meta |
| Utility Messaging chạy thật | KH Messenger 27/07 §4.3, §4.4 | Flag `false` ở cả 2 env; 6 mẫu vẫn ở `/app/chat-demo`, và trang này chỉ tồn tại khi `import.meta.env.DEV` (`router.tsx:35-37, 91-93`) → production không có | Còn dở, đúng kế hoạch |
| Luồng phụ huynh tự khai báo & liên kết con | `KE-HOACH-LIEN-KET-PHU-HUYNH.md` (28/07) | Chưa có `link_requests` trong `collections.ts` hay `firestore.rules`; chưa có `nickname` trong `StudentDoc` | Chờ anh duyệt |

---

## 6. Đề xuất thứ tự xử lý

### Ưu tiên 1 — Rẻ, làm ngay, chặn hiểu nhầm cho lượt sau (ước tính 1 buổi)

1. Sửa 6 mục nhóm A (thuần tài liệu, không đụng code).
2. Chạy `npm run roadmap:update` cho P1-004 và P5-001, hoặc khai tử `upgrade-roadmap-state.json` một cách rõ ràng.
3. Đổi URL Privacy Policy trong Meta App Dashboard sang trang EduMatrix đã có sẵn — gỡ 1 trong 7 blocker App Review mà không cần viết code.

### Ưu tiên 2 — Sửa code, phạm vi nhỏ và độc lập

4. **C1** — bỏ `throw` ở `StudentForm.tsx:115` và `:120`, thay bằng cảnh báo mềm. Áp cho cả hai khối.
5. **B4** — thêm rule `messenger_template_status` (5 dòng), làm trước khi bắt đầu Giai đoạn 6 Messenger.
6. **B1 phương án (3)** — bỏ `listCourses()` không lọc ở `viewerDashboard.ts:62`.
7. **B5** — cân nhắc xoá nhánh `"*"` trong `allowedOrigin()`.

### Ưu tiên 3 — Cần anh quyết định trước khi ai đó code

8. **B1** — chọn hướng cho `viewer_dashboards` (xem 3 lựa chọn ở mục B1). Mục này treo đã 11 ngày.
9. **B2, B3** — xác nhận "giữ code, sửa tài liệu" cho `attendance_summaries` và enum trạng thái điểm danh.
10. Duyệt hoặc chỉnh `KE-HOACH-LIEN-KET-PHU-HUYNH.md`.

---

## 7. Việc anh cần tự chạy để đóng báo cáo này

Do em không chạy được lệnh trong phiên này, các cổng kiểm tra sau chưa có kết quả mới:

```
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run check:mojibake
npm run build
cd workers/messenger && npm test && npm run build:prod
```

Nếu có mục nào FAIL, báo lại — phần lớn phát hiện trong báo cáo này là sai lệch tài liệu nên không ảnh hưởng kết quả build, nhưng cần số liệu thật để thay cho con số trích lại từ 27/07.
