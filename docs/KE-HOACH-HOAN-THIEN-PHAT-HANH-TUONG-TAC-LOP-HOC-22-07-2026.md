# Kế hoạch: Hoàn thiện luồng phát hành + Tự động lưu nháp — Module Tương tác lớp học

> **✅ TRẠNG THÁI: ĐÃ TRIỂN KHAI XONG (22/07) — Phần A + B + C, typecheck + lint toàn dự án sạch.** Chi tiết verify và các việc Lợi cần tự làm trên máy thật: xem cuối tài liệu.
>
> _Trạng thái gốc khi lập kế hoạch: Đã lập kế hoạch (22/07), chờ duyệt._ Lợi đã chọn: **luồng phát hành đầy đủ** (thông báo Edumatrix + Messenger + khóa buổi học), **giữ song song** nút Lưu thủ công và auto-save, **duyệt toàn bộ kế hoạch rồi triển khai 1 lần** (không chia đợt). Nguồn gốc: 2 phát hiện từ `docs/Infographic/BAO-CAO-KIEM-THU-CHUYEN-SAU-22-07-2026.html` (kiểm thử 22/07). Chưa có dòng code nào được sửa.
>
> **Cập nhật (22/07, sau khi Lợi hỏi có phương án tối ưu hơn cho 4 giả định/rủi ro không):** đã rà lại cả 4 mục dưới góc độ Spark Plan + client-side, thấy 3 mục có cách làm tốt hơn mà **không cần rời khỏi Spark/client-only** — đã gộp thẳng vào thiết kế bên dưới (không tốn thêm quota Firestore). Mục còn lại (luồng "đính chính" sau khi phát hành) là một bổ sung phạm vi thật (không phải tối ưu miễn phí) — xem Phần C, đang chờ Lợi quyết có gộp vào đợt này không.

## Nguyên tắc thực hiện

- Chỉ chạm đúng phạm vi 2 lỗi dưới đây — không refactor lan sang phần khác của module, không thêm tính năng ngoài yêu cầu.
- Không đụng `features/students/**` (module đã khoá).
- Tái dùng hạ tầng đã có (`sendMessenger()`, mẫu `updateSession()` tạo announcement, mẫu doc ID chống trùng của `attendance_alert`) thay vì dựng cơ chế hàng đợi/queue mới — dữ liệu cho thấy quy mô lớp học (≤20 học sinh/lớp) không cần hạ tầng bất đồng bộ phức tạp.
- Verify bằng `npm run typecheck` + `npm run lint` sau khi hoàn tất (build/test/dev không chạy được trong sandbox). Phần đụng Firestore Rules cần Lợi tự chạy `npm run test:rules` trên máy thật (sandbox thiếu JDK 21+).
- Không sửa `docs/KE-HOACH-TONG-HOP-AGENT.md` (tài liệu gộp lịch sử, không phải nơi thêm kế hoạch mới).

---

## Bối cảnh kỹ thuật đã xác minh trực tiếp trên mã nguồn

- `ClassroomWorkflowStatus` (`types/academic.ts:183`) đã định nghĩa `"draft" | "ready" | "published" | "amended"` — **schema đã tính trước cho luồng phát hành**, nhưng `saveClassroomDraft()` luôn ghi cứng `workflowStatus: "draft", version: 1`.
- Rules `validSessionInteraction` (`firestore.rules:99-115`) hiện **ép cứng** `data.workflowStatus == 'draft' && data.version == 1` cho cả `create` lẫn `update` — nghĩa là **không thể** ghi `workflowStatus: "published"` qua client ở trạng thái hiện tại, dù có sửa code frontend. Đây là lý do gốc của nút bị khoá.
- Đã có sẵn hàm `sendMessenger({ studentId, text, type, tag })` (`services/integrations/messenger.ts`, đang dùng thật ở `ChatPage.tsx`) — tự tra `studentId` → PSID phụ huynh qua Worker, tự xử lý "chưa liên kết" (`no_recipient`), tự ghi `message_outbox`. **Không cần sửa Worker.**
- Đã có mẫu tạo announcement kèm batch khi đổi trạng thái session (`updateSession()` trong `sessions.ts:79-104`, dùng cho `cancelled`/`rescheduled`) — sẽ theo đúng mẫu này cho thông báo tổng kết buổi học.
- `validAnnouncementData` (`firestore.rules:426-436`) giới hạn `type in ['attendance_alert', 'schedule_change', 'homework_reminder']` — cần thêm 1 giá trị mới.
- `ViewerAnnouncementsPage.tsx` không rẽ nhánh theo `type` cụ thể (render chung title/message) — không cần sửa giao diện Phụ huynh để hiển thị thông báo mới.
- Nội dung xem trước phụ huynh đã có sẵn dạng template (`ClassroomInteractionPage.tsx`, khối `<pre>` ở tab "Gửi thông báo") — sẽ tách thành 1 hàm dùng chung để nội dung phát hành khớp 100% với nội dung đã xem trước, tránh lệch giữa bản xem trước và bản gửi thật.

---

## Phần A — Hoàn thiện luồng "Hoàn tất và phát hành"

### Thiết kế

**1. Firestore Rules (`firebase/firestore.rules`)**
- Thêm 1 nhánh `allow update` mới cho `session_interactions` (giữ nguyên nhánh cũ cho sửa nháp, không đụng `validSessionInteraction`) cho phép đúng 1 chuyển trạng thái: `resource.data.workflowStatus == 'draft'` → `request.resource.data.workflowStatus == 'published'`, các trường định danh khác giữ nguyên (`keepsImmutable`), `version` tăng đúng 1. Sau khi `published`, không nhánh `allow update` nào còn khớp → tài liệu tự khoá, đúng yêu cầu "lưu phiên bản bất biến" mà không cần thêm cơ chế versioning riêng.
- `validAnnouncementData`: thêm `'session_summary'` vào danh sách `type in [...]`.
- Không đụng Rules `sessions/{sessionId}` — nhánh Teacher cập nhật `status: 'completed'` đã được phép sẵn qua `canManageClass` + `validSessionData`.

**2. Service (`src/services/firestore/classroomInteractions.ts`)**
- Thêm hàm `formatSessionSummaryMessage(...)`: tách logic dựng nội dung tin nhắn từ khối `<pre>` hiện có trong trang, dùng chung cho announcement, Messenger, và bản xem trước (1 nguồn sự thật duy nhất).
- Thêm hàm `publishClassroomInteraction(input)`:
  1. `batch.update` `session_interactions/{sessionId}`: `workflowStatus: "published"`, `version: increment(1)`.
  2. Với mỗi học sinh: `batch.set` `announcements/{sessionId}_{studentId}` (ID cố định chống phát hành trùng, theo đúng mẫu `attendance_${id}`), `type: "session_summary"`.
  3. `batch.update` `sessions/{sessionId}`: `status: "completed"` (gộp vào cùng batch, tái dùng field đã có sẵn trong `SessionStatus`).
  4. Commit batch trước (đảm bảo dữ liệu Edumatrix đã chốt).
  5. Sau khi batch thành công: gọi `sendMessenger()` tuần tự cho từng học sinh (không phải hàng đợi nền — quy mô nhỏ nên gọi trực tiếp), thu lại kết quả từng học sinh (`sent`/`failed`/`no_recipient`) để hiển thị theo đúng yêu cầu "hiển thị kết quả từng kênh, không gộp thành một trạng thái".

**3. Giao diện (`src/features/classroom/pages/ClassroomInteractionPage.tsx`)**
- Điều kiện bật nút: tính `canPublish` ở client từ `entries`/`taughtContent`/`quickSummary`/`homeworkText` theo đúng danh sách điều kiện đã mô tả trong kế hoạch gốc (mọi học sinh có `attendanceStatus`; mọi học sinh có `previousHomeworkStatus` hoặc đã "Không giao"; có `taughtContent`; có `quickSummary`; có `homeworkText`; học sinh thuộc `attentionStudents` có `individualComment`). **Kiểm tra này chỉ ở client** (xem mục Giả định/rủi ro bên dưới) — không đẩy vào Rules.
- **Tối ưu (miễn phí, không tốn quota):** hàm `publishClassroomInteraction()` tự kiểm tra lại đúng điều kiện `canPublish` ngay trước khi ghi (ném lỗi nếu thiếu), không chỉ dựa vào nút bị disable trên UI — che luôn trường hợp bug UI vô tình bật nhầm nút, mà không cần thêm bất kỳ Firestore read/write nào.
- Bấm nút → hiện màn hình kiểm tra cuối (dùng `Modal` sẵn có) tóm tắt số liệu + danh sách kênh sẽ gửi → xác nhận → gọi `publishClassroomInteraction()`.
- Sau khi publish: hiện kết quả theo từng kênh (Edumatrix: luôn thành công cùng batch; Messenger: liệt kê học sinh gửi thành công / thất bại / chưa liên kết) — tái dùng `DeliveryRow` đã có sẵn trong trang, chỉ đổi từ dữ liệu tĩnh sang dữ liệu thật.
- **Tối ưu cho trường hợp gửi Messenger dở dang (đóng tab giữa chừng hoặc mạng lỗi):** vì kết quả từng học sinh đã có sẵn trong bộ nhớ ngay sau vòng lặp `sendMessenger()`, thêm nút "Gửi lại cho học sinh còn thiếu" ngay trên danh sách kết quả — bấm lại chỉ gọi `sendMessenger()` cho đúng những học sinh `failed`/chưa gửi, không đụng lại Edumatrix/session (đã khoá ổn định từ đầu). Không cần lưu thêm field nào vào Firestore để làm việc này — nếu giáo viên đóng tab hẳn giữa chừng, có thể mở lại buổi học đã "Đã phát hành" và dùng màn hình Chat 1:1 sẵn có (`ChatPage.tsx`, cũng dùng `sendMessenger()`) để gửi bù thủ công cho học sinh còn thiếu — không cần xây thêm cơ chế "hàng đợi bền" (persisted queue) tốn thêm Rules + field cho một tình huống hiếm ở quy mô ≤20 học sinh/lớp.
- Khi `session_interactions.workflowStatus === "published"`: khoá toàn bộ input nhập liệu (readonly), ẩn nút Lưu nháp/Hoàn tất, hiện nhãn "Đã phát hành lúc ...".

### Các bước thực hiện

1. Sửa `firestore.rules` (2 thay đổi trên) → verify: đọc lại rule, đối chiếu cú pháp với nhánh tương tự đã có (`payments`/`submissions` status transition).
2. Thêm test Rules âm/dương cho transition mới vào `firebase/tests/` (theo đúng mẫu `phase*-rules.test.ts` đã có) → verify: typecheck file test.
3. Thêm `formatSessionSummaryMessage()` + `publishClassroomInteraction()` vào `classroomInteractions.ts` → verify: `npm run typecheck`.
4. Nối `ClassroomInteractionPage.tsx`: tính `canPublish`, modal xác nhận, mutation publish, khoá form sau khi published → verify: `npm run typecheck` + `npm run lint`.
5. Cập nhật `AnnouncementType`/type liên quan trong `types/academic.ts` cho `'session_summary'` nếu có enum TypeScript tương ứng → verify: `npm run typecheck`.
6. Chạy lại toàn bộ `npm run typecheck` + `npm run lint` cho cả dự án lần cuối.

---

## Phần B — Tự động lưu nháp (debounce)

### Thiết kế

- Giữ nguyên nút "Lưu bản nháp" thủ công (theo lựa chọn của Lợi).
- Thêm `useEffect` debounce trong `ClassroomWorkspace` (`ClassroomInteractionPage.tsx`): theo dõi `entries`, `taughtContent`, `quickSummary`, `homeworkText`; sau 2.5 giây không có thay đổi mới → tự gọi `mutation.mutate()` (hàm lưu nháp đã có sẵn, không tạo mutation mới).
- Điều kiện chặn auto-save chạy sai lúc: chỉ bật sau khi `initializedSessionId === sessionId` (đã nạp xong dữ liệu ban đầu — tránh auto-save đè dữ liệu rỗng lên bản đã lưu ngay khi trang vừa mở), và tắt hẳn khi `draftExists && interaction.data?.workflowStatus === "published"` (buổi học đã phát hành, không còn nháp để lưu).
- Trạng thái hiển thị: thay dòng "Đã lưu bản nháp..." tĩnh hiện tại bằng badge nhỏ cạnh nút Lưu — "Đang lưu tự động..." / "Đã lưu lúc HH:mm" — dùng lại đúng `mutation.isPending`/`mutation.isSuccess` đã có, không thêm state mới ngoài thời điểm lưu gần nhất.
- Không tạo debounce util mới nếu dự án đã có sẵn (sẽ kiểm tra `src/utils/` trước khi viết) — dùng `setTimeout`/`clearTimeout` thủ công trong `useEffect` nếu chưa có, vì đây là chỗ dùng duy nhất, không cần trừu tượng hoá thành hook riêng.

### Các bước thực hiện

1. Kiểm tra `src/utils/` xem có debounce helper sẵn chưa → quyết định tái dùng hoặc viết `setTimeout` cục bộ.
2. Thêm `useEffect` debounce + điều kiện chặn vào `ClassroomWorkspace` → verify: `npm run typecheck`.
3. Đổi phần hiển thị trạng thái lưu (badge thời điểm lưu gần nhất) → verify: `npm run lint`.
4. Rà lại không phát sinh vòng lặp gọi lưu vô hạn (do `onSuccess` của mutation gọi `invalidateQueries` → `savedEntries`/`interaction` refetch → có thể set lại state → có thể kích hoạt lại debounce): đảm bảo debounce chỉ theo dõi state do người dùng gõ, không theo dõi state được set lại từ dữ liệu server sau khi lưu.

---

## Giả định & rủi ro — đã rà lại theo hướng tối ưu cho Spark + client-side (22/07)

1. **Kiểm tra điều kiện đủ để phát hành chỉ nằm ở client, không ở Rules — vẫn là lựa chọn đúng, đã siết thêm.** Rules Firestore không thể duyệt qua toàn bộ danh sách học sinh của lớp trong lúc xác thực 1 request (giới hạn 10 `get()`/request, lớp có thể >10 học sinh) — nên kiểm tra đầy đủ ở tầng Rules **không khả thi trong Spark** trừ khi đổi kiến trúc (Cloud Function, ngoài phạm vi client-only). Phương án tối ưu vẫn là kiểm tra ở client, nhưng nay đã siết thêm 1 lớp: `publishClassroomInteraction()` tự kiểm tra lại điều kiện ngay trước khi ghi (không chỉ dựa vào nút disable) — miễn phí, không tốn Firestore read/write nào thêm. Rủi ro còn lại (ai đó ghi thẳng qua API bỏ qua UI) chỉ giới hạn ở giáo viên/admin đã xác thực của đúng lớp đó — hậu quả tối đa là dữ liệu thiếu, không phải lộ thông tin.
2. **Gửi Messenger tuần tự trực tiếp khi bấm nút, không dùng hàng đợi nền — vẫn là lựa chọn tối ưu, đã bổ sung lối thoát cho trường hợp dở dang.** Xây hàng đợi bền (chạy nền kể cả khi đóng tab) cần thêm hạ tầng phía Worker + field trạng thái theo dõi trong Firestore — chi phí không tương xứng với quy mô ≤20 học sinh/lớp và tần suất phát hành (1 lần/buổi học/lớp). Tối ưu hơn: nút "Gửi lại cho học sinh còn thiếu" ngay trong màn hình kết quả (dùng kết quả đã có sẵn trong bộ nhớ, không lưu thêm gì), cộng với việc màn hình Chat 1:1 sẵn có đã là lối thoát thủ công nếu giáo viên đóng tab hẳn giữa chừng — đủ để không cần xây hàng đợi bền.
3. **Trạng thái `"ready"` trong `ClassroomWorkflowStatus` — cố tình không dùng, đây chính là lựa chọn tối ưu cho Spark.** "Sẵn sàng phát hành" là dữ liệu suy ra được (derived) từ `entries`/nội dung đã nhập — tính lại ở client mỗi lần render không tốn gì. Nếu lưu `"ready"` thành trạng thái riêng trên Firestore, mỗi lần đủ/thiếu điều kiện lại phải ghi thêm 1 lượt `update` để đồng bộ — tốn thêm quota ghi (write) cho một giá trị có thể tính lại miễn phí. Giữ nguyên: không dùng "ready", chuyển thẳng `draft` → `published`.
4. **Không có luồng sửa sau khi phát hành ("đính chính") — đây là rủi ro thật duy nhất KHÔNG có cách tối ưu miễn phí, phải đánh đổi phạm vi.** Xem Phần C bên dưới — đã thiết kế theo hướng tận dụng tối đa những gì đã có (dùng đúng field/enum đã tồn tại sẵn, tái dùng 100% hàm phát hành), nhưng vẫn là thêm phạm vi thật (thêm 2 nhánh Rules + 1 nút mới), không phải "tối ưu không tốn gì" như 3 mục trên. Cần Lợi quyết định có gộp vào đợt này không.

---

## Phần C — Đính chính sau khi phát hành (tuỳ chọn, khuyến nghị gộp vào vì tận dụng đúng thiết kế đã có sẵn)

### Vì sao đề xuất thêm

`ClassroomWorkflowStatus` đã có sẵn giá trị `"amended"` trong type từ trước — tức người thiết kế dữ liệu ban đầu đã tính trước tình huống này, chỉ chưa có ai nối luồng. Nếu không có đường sửa, một buổi học phát hành nhầm (sai chính tả, nhầm điểm danh) sẽ **kẹt vĩnh viễn** — phụ huynh đã nhận thông báo sai và giáo viên không có cách nào tự sửa, chỉ Admin can thiệp tay qua Console (chậm, dễ thao tác nhầm trực tiếp trên dữ liệu thật).

### Thiết kế (tái dùng gần như 100% Phần A, không thêm hạ tầng)

- Rules: mở rộng đúng 1 điều kiện đã viết ở Phần A — thay vì `resource.data.workflowStatus == 'draft'`, cho phép `resource.data.workflowStatus in ['draft', 'amended']` ở nhánh chuyển sang `'published'`. Thêm 1 nhánh nhỏ riêng cho `published` → `amended` (chỉ đổi `workflowStatus`, `version`, `updatedAt`; mọi field khác giữ nguyên; chủ thể vẫn là `canManageClass` — cùng quyền với sửa nháp, không cần vai trò mới).
- Service: thêm hàm `reopenClassroomInteraction(sessionId)` (chỉ đổi `workflowStatus: "amended"`) và **tái dùng nguyên `publishClassroomInteraction()`** đã viết ở Phần A cho lần phát hành lại — nghĩa là đính chính cũng tự động gửi lại thông báo Edumatrix + Messenger (đánh dấu "Bản cập nhật" trong nội dung), không cần viết thêm luồng gửi riêng.
- Giao diện: khi `workflowStatus === "published"`, thêm 1 nút phụ "Mở lại để đính chính" (rõ ràng, có xác nhận vì sẽ gửi lại thông báo cho phụ huynh) bên cạnh nhãn "Đã phát hành lúc...". Bấm vào → mở khoá form → sửa → phát hành lại như bình thường.
- Không thêm trạng thái buổi học mới ở `sessions/{sessionId}.status` — vẫn giữ `"completed"` suốt, chỉ `session_interactions.workflowStatus` dao động giữa `published`/`amended`.

### Chi phí thêm so với Phần A

- +2 nhánh Rules nhỏ (mở rộng 1 điều kiện có sẵn + 1 nhánh reopen) → cần thêm test Rules tương ứng.
- +1 hàm service ngắn (`reopenClassroomInteraction`) + 1 nút UI.
- Không thêm collection, không thêm field mới, không thêm Worker — vẫn 100% Spark + client-side, không phát sinh quota đáng kể (đính chính là thao tác hiếm, không phải luồng chạy thường xuyên).

---

## Kết quả triển khai (22/07)

| Hạng mục | File | Trạng thái |
|---|---|---|
| Rules: 3 nhánh update mới (publish / reopen / sửa khi amended) + type `session_summary` + update announcement theo doc ID `{sessionId}_{studentId}` | `firebase/firestore.rules` | ✅ |
| Test Rules: 3 test mới (publish đúng version & khóa nội dung; khóa sau publish → reopen → sửa → republish; announcement ghi đè cùng ID) | `firebase/tests/teacher-scope-rules.test.ts` | ✅ (typecheck OK, cần chạy emulator trên máy thật) |
| Type: thêm `"session_summary"` vào `AnnouncementType` | `src/types/academic.ts` | ✅ |
| Service: `formatSessionSummaryMessage` (1 nguồn sự thật cho preview/announcement/Messenger), `classroomPublishBlockers` (dùng chung UI + kiểm tra kép), `publishClassroomInteraction` (batch nguyên tử → gửi Messenger tuần tự, trả kết quả từng học sinh), `reopenClassroomInteraction`; `saveClassroomDraft` hỗ trợ chế độ `amended` (chỉ ghi nội dung) | `src/services/firestore/classroomInteractions.ts` | ✅ |
| UI: nút phát hành thật (bật theo blockers, hiện danh sách điều kiện thiếu), modal xác nhận, lưu nháp mới nhất ngay trước khi phát hành, kết quả Messenger từng học sinh + nút "Gửi lại cho học sinh còn thiếu", khóa toàn bộ form khi published, nút "Mở lại để đính chính", auto-save debounce 2.5s song song nút Lưu thủ công, badge "Đã lưu lúc HH:mm:ss", header đổi trạng thái (Đang nhập/Đã phát hành/Đang đính chính) | `src/features/classroom/pages/ClassroomInteractionPage.tsx` | ✅ |
| Verify: `npm run typecheck` + `npm run lint` toàn dự án + typecheck file test | — | ✅ 0 lỗi |

Ghi chú kỹ thuật trong lúc triển khai (đúng theo kế hoạch, có 1 bổ sung nhỏ): phát hiện khi làm Phần C rằng sau khi reopen (`version > 1`), nhánh Rules cũ (`validSessionInteraction` ép `version == 1`) không cho sửa nội dung nữa — đã thêm nhánh thứ 4 "sửa nội dung khi đang amended" (chỉ cho đổi 3 field nội dung + `updatedAt`, giữ nguyên giới hạn 2000 ký tự). Đây là hệ quả tất yếu của thiết kế đã duyệt, không phải mở rộng phạm vi.

## Việc Lợi cần làm sau khi duyệt/triển khai

- Chạy `npm run test:rules` trên máy thật (JDK 21+) để xác nhận rule transition mới không phá test cũ và test âm/dương mới đều PASS.
- Thử phát hành 1 buổi học thật với ít nhất 1 học sinh có phụ huynh đã liên kết Messenger và 1 học sinh chưa liên kết — xác nhận kết quả từng kênh hiển thị đúng (thành công/thất bại/chưa liên kết), và thử nút "Gửi lại cho học sinh còn thiếu".
- Kiểm tra thông báo mới xuất hiện đúng trong màn hình Thông báo của tài khoản Phụ huynh.
- Xác nhận sau khi phát hành, mở lại buổi học ở tài khoản Giáo viên thấy đúng trạng thái khoá (không sửa được nữa).
- Nếu gộp Phần C: thử "Mở lại để đính chính" → sửa → phát hành lại → xác nhận phụ huynh nhận được bản cập nhật, không tạo trùng thông báo cũ.

---

## Quyết định đã chốt (22/07)

**Gộp Phần C vào đợt triển khai này.** Lợi xác nhận: tận dụng đúng trạng thái `"amended"` đã có sẵn trong schema, tái dùng gần 100% code Phần A, đổi lại tránh được rủi ro phát hành nhầm bị kẹt vĩnh viễn. Phạm vi triển khai đợt này = Phần A + Phần B + Phần C, làm 1 lần theo đúng lựa chọn "duyệt toàn bộ rồi triển khai 1 lần" đã chốt ở đầu tài liệu.
