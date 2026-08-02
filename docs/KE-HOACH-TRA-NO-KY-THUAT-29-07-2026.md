# Kế hoạch trả nợ kỹ thuật — 29/07/2026

> Nguồn: `docs/BAO-CAO-RA-SOAT-28-07-2026.md` + rà soát lại mã nguồn ngày 29/07.
> Trạng thái ngày 29/07: **Đợt 0, 1, 2, 3 đã triển khai xong và test xanh.** Trong Đợt 4, B2/B3/B6 cũng đã xong. Chỉ còn **B1** (chờ số read thật ~1 tuần) và **3.5** (thao tác của Lợi trên Meta Dashboard).

---

## 1. Giả định đã nêu rõ (đọc trước khi duyệt)

Kế hoạch này dựa trên 4 giả định. Nếu có cái nào sai, báo lại trước khi bắt đầu:

1. ~~`src/features/students/**` vẫn đang khoá.~~ **Đã giải quyết 29/07: Lợi mở khoá toàn bộ module.** Quy tắc "không sửa" từ 14/07 hết hiệu lực. Đợt 2 chạy được ngay; vẫn giữ nguyên tắc chỉ sửa đúng phạm vi ghi trong Đợt 2, không "tiện tay" sửa thêm.
2. **Hướng xử lý `viewer_dashboards` (B1) vẫn chưa được chốt** — nhưng phương án (3) **đã được duyệt làm ngay ở Đợt 1** (29/07). Lựa chọn giữa (1) và (2) vẫn tách riêng ở Đợt 4.
3. **Sandbox không chạy được `build` / `test` / `test:rules`.** `node_modules` build cho Windows; bộ test Rules cần JDK 21+ (sandbox có 11). Nghĩa là mọi bước "verify" có chữ *(Lợi chạy)* phải do anh chạy trên máy thật — em không tự đóng được.
4. **Không đổi schema dữ liệu production.** B2 (`attendance_summaries`) và B3 (enum điểm danh) theo khuyến nghị là **giữ code, sửa tài liệu** — không nằm trong phạm vi sửa code của kế hoạch này.

---

## 2. Nguyên tắc thực hiện

- Mỗi đợt là một commit độc lập, không đợt nào chặn đợt nào (trừ Đợt 0).
- Xong 1 đợt → báo cáo diff + kết quả kiểm tra → đợi duyệt mới sang đợt kế.
- Không "tiện tay" sửa code lân cận. Mọi dòng thay đổi phải truy được về đúng một mục trong kế hoạch này.

---

## 3. Các đợt

### Đợt 0 — Chặn ô nhiễm lịch sử Git (làm trước tiên, bắt buộc)

**Vì sao trước tiên:** hiện `git diff` đang có 200 file với **51.171 dòng thêm = 51.171 dòng xoá** — toàn bộ là lật LF → CRLF, không có nội dung thật nào. Nếu commit bất cứ đợt nào bên dưới trước khi xử lý việc này, thay đổi thật sẽ bị chôn trong diff 51 nghìn dòng và `git blame` của 200 file sẽ trỏ hết về commit đó.

| # | Việc | File |
|---|---|---|
| 0.1 | Thêm `.gitattributes` với `* text=auto eol=lf` | `.gitattributes` (mới) |
| 0.2 | Chạy `git add --renormalize .` để chuẩn hoá lại index | — |
| 0.3 | Thêm `.codex-tmp/` và `outputs/` vào `.gitignore` | `.gitignore` |

Ghi chú 0.3: `.codex-tmp/node_modules` hiện đang untracked dù `.gitignore` đã có `node_modules/` — vì nó là symlink, mà pattern có dấu `/` chỉ khớp thư mục thật.

**Verify:**
- `git diff --numstat | awk '$1==$2' | wc -l` → phải ra **0** (hiện là 200).
- `git status --short | grep '^??'` → không còn `.codex-tmp`.
- `git diff --stat` sau renormalize chỉ còn các file anh thật sự sửa.

---

### Đợt 1 — Ba mục sửa code, không đụng module đang khoá

#### 1.1 — B4: thêm Rules cho `messenger_template_status`

Worker ghi collection này qua service account (`workers/messenger/src/index.ts:1102`) nên ghi vẫn chạy, nhưng `firebase/firestore.rules` không có `match` nào cho nó → rơi vào deny mặc định cuối file. Màn hình Admin xem/bật/tắt template (Giai đoạn 6) sẽ nhận `permission-denied` ngay khi làm.

```
match /messenger_template_status/{templateId} {
  allow read: if isAdmin();
  allow write: if false;   // chỉ Worker qua service account
}
```

**Verify:** thêm case vào `firebase/tests/phase6-rules.test.ts` — Admin đọc được, Viewer/Teacher bị chặn, mọi client ghi đều bị chặn → `npm run test:rules` *(Lợi chạy — cần JDK 21+)*.

#### 1.2 — B1 phương án (3): bỏ `listCourses()` không lọc

`src/services/firestore/viewerDashboard.ts:62` đọc **toàn bộ** collection `courses`, trong khi nơi tiêu thụ duy nhất — `ViewerDashboardPage.tsx:117` — đã lọc lại đúng theo `courseIdSet` lấy từ lớp của học sinh:

```ts
const courseNames = data.courses.filter((course) => courseIdSet.has(course.id)).map((c) => c.name);
```

Nghĩa là đọc N khoá học rồi vứt gần hết. Thay bằng lấy đúng những khoá học đó:

```ts
const classes = (await Promise.all(classIds.map(getClass))).filter(Boolean);
const courseIds = [...new Set(classes.map((k) => k.courseId).filter(Boolean))];
const courses = (await Promise.all(courseIds.map(getCourse))).filter(Boolean);
```

Đánh đổi: thêm một vòng round-trip (phải có `classes` rồi mới biết `courseIds`), đổi lại số read giảm từ "toàn bộ courses" xuống 1–3 doc.

**Verify (tiêu chí mạnh — chứng minh được, không phải đoán):** vì `:117` đã lọc theo `courseIdSet`, tập `courseNames` hiển thị **phải giống hệt trước và sau**. Viết `viewerDashboard.test.ts` với service tầng dưới được mock: khẳng định `getCourse` chỉ được gọi đúng số `courseId` khác nhau của lớp, và mảng `courses` trả về khớp tập cũ sau khi lọc.

#### 1.3 — B5: xoá nhánh `"*"` khỏi `allowedOrigin()`

`workers/messenger/src/index.ts:122` và `:135` vẫn trả `"*"` nếu `ALLOWED_ORIGIN` được đặt là `*` — đúng sự cố P1 của báo cáo 24/07. Hiện có 2 lớp chặn (`wrangler.jsonc:28` đặt 2 origin HTTPS cụ thể, `check-production-config.mjs` chạy trước `deploy:prod`), nhưng ai deploy thẳng bằng `wrangler deploy --env production` là lọt.

Xoá hẳn nhánh. Không ai dùng nó, và xoá thì không thể tái diễn.

**Verify:** thêm case vào `workers/messenger/tests/worker.test.ts` — đặt `ALLOWED_ORIGIN="*"`, khẳng định header `access-control-allow-origin` **không** trả `*` → `cd workers/messenger && npm test` *(Lợi chạy)*.

**Cổng kiểm tra chung cho cả Đợt 1** *(Lợi chạy)*: `npm run lint && npm run typecheck && npm test && npm run build`.

---

### Đợt 2 — C1: `StudentForm` ghi dở dang *(đã mở khoá 29/07)*

`src/features/students/components/StudentForm.tsx` chạy 3 thao tác ghi độc lập trong một mutation, không có bước bù trừ:

```ts
93:  await createStudent({ ... });                          // ① đã vào Firestore
115: if (!result.linked) throw new Error(result.reason);    // ② ném lỗi → ① không rollback
120: if (!selectedClass) throw new Error("class_not_found");
121: await enrollStudent(...);                              // ③ ném lỗi → ① vẫn tồn tại
```

Hậu quả: học sinh đã nằm trong DB, thông tin phụ huynh mất trắng, submit lại dính `student_code_exists`.

**Nguyên nhân gốc, không phải triệu chứng:** báo cáo 28/07 chỉ mô tả khối phụ huynh (②). Khối ghi danh lớp (③) có **cùng lỗi, cùng nguyên nhân**. Sửa một khối là để nguyên nửa còn lại hỏng — nên sửa cả hai trong cùng một lần.

**Cách sửa:** ① đã thành công thì mutation không được `throw`. Thu lỗi của ② và ③ vào một danh sách cảnh báo mềm, trả về cùng kết quả thành công, hiển thị ở chỗ `mutation.isError` đang dùng (`:210-212`) dưới dạng cảnh báo thay vì lỗi đỏ. Học sinh đã tạo xong; phần liên kết phụ huynh / ghi danh lớp báo rõ là chưa xong để Admin làm lại bằng màn hình sửa.

**Verify:** test cho mutation — giả lập `linkParentToStudent` trả `{linked:false}` và `enrollStudent` ném lỗi, khẳng định (a) mutation vẫn `onSuccess`, (b) không có lời gọi tạo học sinh lần hai, (c) cả 2 cảnh báo đều xuất hiện. Sau đó smoke test tay: tạo học sinh với email phụ huynh sai định dạng → học sinh phải có trong danh sách, có cảnh báo, submit lại **không** dính `student_code_exists`.

---

### Đợt 3 — Tài liệu (không đụng một dòng code nào)

Rủi ro bằng 0, làm song song với bất kỳ đợt nào.

| # | Việc | File |
|---|---|---|
| 3.1 | Sửa dòng 3 "Chưa có dòng code nào được sửa" → "Đã hoàn thành 6/6 đợt (20/07)"; xoá mục "Câu hỏi cần trả lời trước khi bắt đầu" (đã trả lời rồi) | `docs/KE-HOACH-SUA-LOI-VA-NO-KY-THUAT-20-07-2026.md:3`, `:142-147` |
| 3.2 | Xoá dòng 138 về `access_token` qua query string — Worker đã gửi token trong header ở cả 5 lệnh gọi Meta | cùng file, `:138` |
| 3.3 | Tick các mục đã có bằng chứng (hiện 0/40); bỏ vế "dark mode" ở §5 vì dark mode đã bị vô hiệu hoá từ Đợt 6.8 | `docs/CHECKLIST-TRIEN-KHAI-PRODUCTION.md` |
| 3.4 | Chạy `npm run roadmap:update` cho P1-004 + P5-001, **hoặc** ghi rõ "ngừng sử dụng" ở đầu file và ở `upgrade-roadmap.html` | `docs/upgrade-roadmap-state.json` (đang kẹt ở `2026-07-14`) |
| 3.5 | Đổi URL Privacy Policy trong Meta App Dashboard sang trang EduMatrix đã có (`src/app/router.tsx:59-60`) — gỡ 1 trong 7 blocker App Review, không cần code | *(Lợi thao tác trên Meta)* |

**Verify:** `npm run check:mojibake` *(Lợi chạy)* + đọc lại: không còn chỗ nào trong `docs/` nói "chưa có" về thứ đã có trong code.

---

### Đợt 4 — Quyết định

| Mục | Nội dung | Trạng thái |
|---|---|---|
| B1 (1 vs 2) | Sau khi Đợt 1.2 chạy, xem số read thật trong Firebase Console 1 tuần rồi chọn: chấp nhận thực tế + sửa tài liệu, hay xây `viewer_dashboards/{uid}` thật | **CÒN MỞ** — chờ số liệu |
| B2, B3 | "Giữ code, sửa tài liệu" cho `attendance_summaries` và enum điểm danh | ✅ 29/07 — sửa `AI-AGENTS-GUIDE` và `ke-hoach…spark.md`, mỗi file 3 chỗ (enum, sơ đồ collection, §13.4), kèm dòng chỉ rõ nguồn sự thật là `academic.ts` + `firestore.rules` |
| B6 | Chốt phiên bản Node, ghi vào **một** chỗ duy nhất | ✅ 29/07 — thêm `.nvmrc` (= 22), `ci.yml` đọc qua `node-version-file` ở cả 2 job. Lưu ý: lý do gốc để tránh Node 24 đã hết hiệu lực — bản cài thực tế là `superstatic@10.0.0` với `engines: "20 \|\| 22 \|\| 24"`, không phải 9.2.0 như báo cáo 24/07 giả định. Đổi sang 24 chỉ là sửa 1 ký tự trong `.nvmrc` |
| Mới | Xác minh `page_utility_messaging` có thực sự được cấp — `handleMetaConnectCallback` (`index.ts:970-1008`) không đọc `granted_scopes`. Khi bật flag lên `true` mà gửi tin lỗi, sẽ không có gì trong log cho biết quyền có được cấp hay không |
| Mới | Khoá Admin SDK (`edumatrix-vn-576b1-…json`) đã sạch khỏi Git (không có trong `ls-files` lẫn `log --all`, đã có trong `.gitignore:23`). Chỉ cần xoay khoá **nếu** commit từng chứa nó đã được push |

---

## 4. Thứ tự đề xuất

```
Đợt 0  ──▶  Đợt 1 ──▶ Đợt 2 (sau khi mở khoá)
   │
   └──▶  Đợt 3 (song song, độc lập)

Đợt 4: sau khi Đợt 1 chạy thật ≥ 1 tuần
```

Đợt 0 phải xong trước mọi commit khác. Còn lại tự do.

---

## 5. Hai quyết định chặn — đã chốt 29/07

**Q1 — Mở khoá `src/features/students/`? → Lợi chọn: mở khoá TOÀN BỘ module.**
Quy tắc "đã oke rồi, không sửa nữa" từ 14/07 chính thức hết hiệu lực. Đợt 2 chạy được ngay. Lưu ý cho các lượt sau: module này giờ sửa được bình thường như mọi module khác, không cần xin phép từng lần.

**Q2 — Đợt 1.2 (`viewerDashboard`)? → Lợi chọn: làm luôn ở Đợt 1.**
Phương án (3) của B1 vào phạm vi Đợt 1. Không khoá vào hướng (1) hay (2) — chọn giữa hai hướng đó vẫn ở Đợt 4, sau khi có số read thật.
