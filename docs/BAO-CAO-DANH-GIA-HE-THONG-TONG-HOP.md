# Báo cáo đánh giá hệ thống — Tổng hợp

> Tài liệu tổng hợp ngày 20/07/2026, gộp 5 báo cáo audit/review độc lập của dự án Edumatrix VN theo thứ tự thời gian. Mỗi báo cáo giữ nguyên nội dung gốc (chỉ điều chỉnh cấp tiêu đề để lồng vào tài liệu chung); không chỉnh sửa lại kết luận hay dữ liệu của báo cáo gốc. Các báo cáo phản ánh trạng thái mã nguồn **tại thời điểm audit** — không phải trạng thái hiện tại; báo cáo mới nhất (mục 5, 19/07) là bản cập nhật gần nhất sau khi các phát hiện trước đó đã được xử lý.

## Mục lục

1. [16/07/2026 — Báo cáo Audit toàn diện](#1-16072026--báo-cáo-audit-toàn-diện)
2. [16/07/2026 — Báo cáo Review đóng (kỹ thuật)](#2-16072026--báo-cáo-review-đóng-kỹ-thuật)
3. [16/07/2026 — Báo cáo kiểm tra & đồng bộ giao diện Frontend](#3-16072026--báo-cáo-kiểm-tra--đồng-bộ-giao-diện-frontend)
4. [17/07/2026 — Báo cáo review tổng thể dự án](#4-17072026--báo-cáo-review-tổng-thể-dự-án)
5. [19/07/2026 — Báo cáo Audit mã nguồn Spark (sau sửa)](#5-19072026--báo-cáo-audit-mã-nguồn-spark-sau-sửa)

---

## 1. 16/07/2026 — Báo cáo Audit toàn diện

_Nguồn gốc: `BAO-CAO-AUDIT-TOAN-DIEN-16-07-2026.html` — bản HTML gốc đã chuyển vào `docs/Infographic/`._

Audit mã nguồn ngày 16/07/2026

### Nền tảng tốt. Vẫn còn điểm phải khóa.

Bản build và các bộ test hiện tại đều đạt. Báo cáo này tập trung vào lỗi
toàn vẹn dữ liệu, khoảng trống sản phẩm và rủi ro vận hành chưa được
compiler phát hiện.

**12**

phát hiện và khoảng trống cần theo dõi, trong đó có 4 hạng mục P1.

Cần xử lý trước mở rộng

Production build**Đạt**
ESLint**Đạt** Unit
test**18 / 18** Worker test**14 / 14**
Rules + encoding**Đạt**

Phát hiện đã đối chiếu

#### Lọc theo rủi ro và phân hệ

Mỗi mục liên kết trực tiếp tới nguồn bằng chứng. P1 cần xử lý trước khi
mở rộng dữ liệu hoặc đưa quy trình vào vận hành thật.

##### **[P1]** Hai file môi trường thật chưa được Git bỏ qua

`.env.real` và `.env.emulator` có khóa App Check debug nhưng đang hiện
là file untracked.

###### Tác động

Có thể commit nhầm cấu hình debug. App Check debug token cần được xem
như bí mật vận hành.

###### Bằng chứng

`.gitignore` chỉ bỏ qua `.env`, `.env.local` và `.env.*.local`. Lịch sử
Git chưa theo dõi hai file này.

###### Hướng xử lý

Bổ sung pattern ignore cụ thể, tách token debug khỏi môi trường thật và
xác định quy trình luân chuyển token.

[.gitignore](../.gitignore)[.env.example](../.env.example)

##### **[P1]** Lưu điểm cả lớp có thể hoàn thành một phần

Mỗi học sinh dùng một transaction riêng; ô trống còn bị chuyển thành
điểm 0.

###### Tác động

Mất mạng hoặc lỗi Rules ở giữa vòng lặp để lại một phần lớp đã lưu.
Thông báo lỗi hiện nói điểm nhập vẫn còn nhưng dữ liệu trước lỗi đã
được ghi.

###### Bằng chứng

`scores.ts:6` chạy transaction tuần tự. `ScoresPage.tsx:71` dùng
`Number("")`, kết quả là 0.

###### Hướng xử lý

Validation toàn bộ trước khi ghi, giữ trạng thái rỗng tách biệt và dùng
chiến lược batch có giới hạn hoặc báo cáo kết quả từng phần rõ ràng.

[scores.ts](../src/services/firestore/scores.ts)[ScoresPage.tsx](../src/features/scores/pages/ScoresPage.tsx)

##### **[P1]** Assignment và summary không được tạo nguyên tử

Hai lần ghi độc lập có thể để lại bài tập không có document tổng hợp.

###### Tác động

Nếu lần ghi summary thất bại sau khi assignment đã tạo, dashboard và
thống kê có thể thiếu dữ liệu trong khi bài tập vẫn hiển thị.

###### Bằng chứng

`assignments.ts:26` gọi `addDoc`, sau đó dòng 32 mới gọi `setDoc` cho
summary.

###### Hướng xử lý

Tạo trước ID client-side và ghi cả hai document trong cùng write batch,
kèm Rules test cho payload liên quan.

[assignments.ts](../src/services/firestore/assignments.ts)

##### **[P1]** Cảnh báo điểm danh có thể tồn tại sau khi trạng thái đã đổi

Luồng chỉ tạo cảnh báo cho vắng hoặc đi muộn, không thu hồi khi học sinh
chuyển sang có mặt hoặc có phép.

###### Tác động

Phụ huynh vẫn thấy cảnh báo cũ, gây hiểu nhầm và làm giảm độ tin cậy của
hệ thống.

###### Bằng chứng

`attendance.ts:33` và dòng 61 chỉ xử lý nhánh tạo. Rules hiện cấm xóa
announcement.

###### Hướng xử lý

Bổ sung trạng thái resolved có trường bất biến và Rules giới hạn, hoặc
tách lifecycle cảnh báo khỏi bản ghi notification hiển thị.

[attendance.ts](../src/services/firestore/attendance.ts)[firestore.rules](../firebase/firestore.rules)

##### **[P2]** Số thông báo chưa đọc không phản ánh hành vi người dùng

Mọi notification được coi là chưa đọc ở mọi lần mở ứng dụng.

###### Tác động

Badge không bao giờ giảm và không còn giá trị báo hiệu, đặc biệt với tài
khoản có nhiều học sinh.

###### Bằng chứng

`Topbar.tsx:48` ghi rõ chưa có read-tracking; dòng 89 lấy toàn bộ số
notification làm unread.

###### Hướng xử lý

Chọn mô hình `lastReadAt` theo người dùng hoặc receipt theo
notification, ưu tiên mô hình ít lượt đọc trên Spark.

[Topbar.tsx](../src/components/layouts/Topbar.tsx)

##### **[P2]** Cài đặt giao diện đang lưu lựa chọn chưa hoạt động

Dark mode và tiếng Anh có control nhưng chưa áp dụng lên ứng dụng.

###### Tác động

Người dùng hoàn thành thao tác và nhận thông báo đã lưu nhưng không thấy
kết quả thực tế.

###### Bằng chứng

`AppearanceTab.tsx:30` xác nhận chưa có theme provider hoặc i18n; dữ
liệu chỉ nằm trong localStorage.

###### Hướng xử lý

Triển khai đầy đủ theme token và i18n, hoặc tạm ẩn các control để tránh
tính năng giả.

[AppearanceTab.tsx](../src/features/settings/components/AppearanceTab.tsx)

##### **[P2]** Roadmap trạng thái không còn khớp mã nguồn

CI và Worker production config đã tồn tại nhưng vẫn được ghi là chưa
làm.

###### Tác động

Ưu tiên phát triển bị sai và người tiếp quản có thể làm lại công việc đã
hoàn thành.

###### Bằng chứng

`P1-004` và `P5-001` còn todo, trong khi package Worker có build:prod và
repo có workflow CI.

###### Hướng xử lý

Đối chiếu evidence rồi cập nhật roadmap bằng script, đồng thời thêm kiểm
tra tài liệu vào Definition of Done.

[upgrade-roadmap-state.json](upgrade-roadmap-state.json)[ci.yml](../.github/workflows/ci.yml)[Worker
package](../workers/messenger/package.json)

##### **[P2]** Cổng kiểm tra chưa phủ giao diện và Worker production build

Frontend chỉ có năm file unit test; chưa có component test hoặc E2E ba
vai trò.

###### Tác động

Build xanh không chứng minh các luồng Admin, Teacher, Viewer hoạt động
cùng nhau hoặc responsive không vỡ.

###### Bằng chứng

CI web chạy lint, typecheck, unit, Rules và build. Job Worker chỉ chạy
test và audit, chưa chạy `build:prod`.

###### Hướng xử lý

Thêm component test cho workflow dữ liệu, E2E trên emulator và
production dry-run cho Worker.

[ci.yml](../.github/workflows/ci.yml)[src](../src)

##### **[P2]** Cấu hình sinh tự động vẫn được track song song

Vite và Tailwind cùng có bản JS, TS, declaration và tsbuildinfo trong
Git.

###### Tác động

Vite có thể nạp bản JS thay vì nguồn TS. Hai bản hiện tương đương hành
vi nhưng dễ lệch sau lần sửa kế tiếp.

###### Bằng chứng

`git ls-files` trả về cả hai bộ config và hai file tsbuildinfo dù
.gitignore đã chặn file mới.

###### Hướng xử lý

Chọn file TS làm nguồn duy nhất, bỏ các artifact đã track và xác nhận
build trên máy sạch.

[vite.config.ts](../vite.config.ts)[tailwind.config.ts](../tailwind.config.ts)

##### **[P2]** Hai vendor chunk lớn chưa có ngân sách hồi quy

Firestore khoảng 623 kB và chart khoảng 432 kB trước gzip trong
production build.

###### Tác động

Thiết bị yếu hoặc mạng di động có thể tải và parse chậm dù route
splitting đã hoạt động.

###### Bằng chứng

Build hiện tại báo Firestore 622,85 kB và charts 432,11 kB. Ngưỡng
warning 650 kB chưa tạo release gate.

###### Hướng xử lý

Đo Lighthouse trên route thật, lazy load chart theo tab và thêm script
bundle budget trong CI.

[vite.config.ts](../vite.config.ts)[package.json](../package.json)

##### **[P3]** Một số component và service khó bảo trì

Các file UI lớn nhất có 430 đến 474 dòng; `scores.ts` bị nén thành dòng
rất dài.

###### Tác động

Khó review thay đổi nhỏ, khó viết test cô lập và dễ trộn validation,
query, state với rendering.

###### Bằng chứng

`ClassForm.tsx` 474 dòng, `StudentsList.tsx` 451 dòng,
`StudentInfoDialog.tsx` 430 dòng.

###### Hướng xử lý

Chỉ tách theo ranh giới nghiệp vụ thật: form sections, query hooks và
presentational panels. Không refactor hàng loạt.

[ClassForm.tsx](../src/features/classes/components/ClassForm.tsx)[scores.ts](../src/services/firestore/scores.ts)

##### **[P2]** Messenger mới sẵn sàng ở mức local

Worker test đạt nhưng luồng thật còn phụ thuộc Meta App Review, webhook
và production smoke test.

###### Tác động

Không thể coi gửi Messenger là kênh vận hành chính cho đến khi kiểm tra
một tin thật và đối chiếu outbox.

###### Bằng chứng

Tài liệu tích hợp còn các checklist Meta App Live, quyền
pages\_messaging, webhook production và smoke test chưa hoàn thành.

###### Hướng xử lý

Release core Spark trước. Chỉ bật URL Worker sau khi hoàn tất Meta, gửi
thử và xác nhận rollback bằng cách tắt cấu hình Worker.

[Kế hoạch
Messenger](KE-HOACH-NANG-CAP-SPARK-CLIENT-MESSENGER-15-07-2026.md)[Hướng
dẫn setup](messenger-api-setup.md)

Ràng buộc kiến trúc

#### Core đáp ứng Firebase Spark và client-side

Security Rules là lớp tin cậy. Firebase public config được phép nằm
trong client, nhưng debug token và secret tích hợp không được xuất hiện
trong bundle.

##### Trình duyệt

React, Vite, Firebase Web SDK, React Query và cache cục bộ. Không chứa
Meta token hoặc service account.

\>

##### Firebase Spark

Hosting, Authentication, Firestore, indexes, App Check và
deny-by-default Security Rules.

\>

##### Worker tùy chọn

Cloudflare Worker giữ Meta secret. Core quản lý lớp vẫn hoạt động khi
Worker không được cấu hình.

**Cloud Functions**Không sử dụng **Firebase Storage**Không dùng làm kho
file nghiệp vụ **Realtime listener**Chỉ dùng cho hồ sơ người dùng đăng
nhập **Messenger**Ngoài core, có thể tắt độc lập

Kế hoạch cần làm

#### Sáu giai đoạn có cổng nghiệm thu

Ưu tiên tính đúng của dữ liệu trước khi thêm tính năng. Mỗi giai đoạn
chỉ chuyển trạng thái khi có test và bằng chứng tương ứng.

##### Bảo mật cấu hình và toàn vẹn dữ liệu

Khóa bốn phát hiện P1 trước mọi mở rộng.

Ưu tiên đầu tiên

  - Ignore file môi trường và tách App Check debug token.
  - Validation điểm toàn lớp trước khi ghi, không biến ô trống thành 0.
  - Tạo assignment và summary trong cùng batch.
  - Thiết kế lifecycle resolved cho cảnh báo điểm danh.

##### Hoàn thiện bề mặt dữ liệu và vận hành

Biến các collection đã có thành workflow quản trị đầy đủ.

Sau P1

  - Notification read-state tối ưu lượt đọc.
  - Audit log UI chỉ dành cho Admin, có filter và pagination.
  - Import CSV có preview, validation, dry-run và batch write.
  - Backup, export và runbook trước thao tác dữ liệu lớn.

##### Chốt phạm vi Appearance

Không tiếp tục hiển thị control chỉ lưu mà không áp dụng.

Quyết định sản phẩm

  - Nếu triển khai: dùng semantic tokens, system preference và lưu lựa
    chọn.
  - Nếu chưa triển khai: ẩn dark mode và English khỏi Settings.
  - Không thêm i18n nửa vời theo từng trang.

##### Hiện đại hóa UI có kiểm soát

Giữ nhận diện xanh, route và luồng nghiệp vụ hiện tại.

Variance 6 / Motion 5

  - Chuẩn hóa form label, error gần trường, loading, empty và recovery.
  - Responsive thực tế tại 375, 768, 1024 và 1440px.
  - Motion 150 đến 280ms, chỉ dùng cho feedback và chuyển trạng thái.
  - Tách component lớn theo ranh giới nghiệp vụ, không rewrite toàn
    repo.

##### Mở rộng kiểm thử và release gate

Chứng minh luồng hoạt động, không chỉ chứng minh TypeScript hợp lệ.

Bắt buộc trên PR

  - Component test cho gradebook, attendance, assignment và payment.
  - E2E trên emulator cho Admin, Teacher và Viewer.
  - Bundle budget và Lighthouse cho các route chính.
  - Worker production dry-run, roadmap evidence và Definition of Done
    trong CI.

##### Bật Messenger sau cùng

Giữ notification nội bộ là đường vận hành an toàn.

Chờ bên ngoài

  - Meta App Live, App Review và webhook production.
  - Gửi thử một tin thật, kiểm tra message\_outbox và lỗi retry.
  - Diễn tập tắt Worker URL mà core app vẫn hoạt động.

**0 / 12 hạng mục hoàn thành**

  - **Khóa file môi trường khỏi Git**Ignore, tách debug token và kiểm
    tra lịch sử.P1
  - **Sửa lưu điểm cả lớp**Validation trước ghi, trạng thái rỗng và kết
    quả nguyên tử hoặc minh bạch.P1
  - **Batch assignment cùng summary**Không để lại document mồ côi.P1
  - **Giải quyết cảnh báo điểm danh cũ**Thêm lifecycle resolved và Rules
    test.P1
  - **Thêm notification read-state**Không coi tất cả thông báo là chưa
    đọc.PRODUCT
  - **Hoàn thiện Audit log UI**Admin filter theo actor, action và
    ngày.ADMIN
  - **Import CSV có preview**Validate và dry-run trước batch write.OPS
  - **Chốt Appearance**Làm thật hoặc tạm ẩn control.UX
  - **Audit responsive và form**Kiểm tra bốn breakpoint và WCAG AA.UI
  - **Thêm component test và E2E**Phủ ba vai trò bằng emulator.QA
  - **Thêm bundle budget và release gate**Không để vendor chunk tăng âm
    thầm.CI
  - **Smoke test Messenger production**Meta, webhook, outbox và
    rollback.EXTERNAL

Đề xuất phát triển

#### Ba quyết định tạo giá trị lớn nhất

Không mở rộng tính năng theo chiều ngang trước khi dữ liệu và vận hành
có thể đo lường, phục hồi và kiểm thử.

##### Ưu tiên độ tin cậy của hồ sơ học tập

Điểm, điểm danh và học phí là dữ liệu nhạy cảm. Mọi thao tác bulk cần
validation trước ghi, idempotency và thông báo kết quả không mơ hồ.

  - Audit trail có màn hình đọc.
  - Undo hoặc trạng thái resolved cho thao tác sửa sai.
  - Không báo thành công nếu chỉ hoàn thành một phần.

##### Thiết kế theo công việc hằng ngày

Dashboard nên ưu tiên việc cần xử lý thay vì tăng số lượng biểu đồ.

  - Chấm bài chưa xong.
  - Buổi học thiếu điểm danh.
  - Hóa đơn chờ xác nhận.
  - Thông báo gửi thất bại.

##### Tối ưu Spark bằng dữ liệu tổng hợp có kiểm soát

Tiếp tục dùng summary documents nhưng mọi cặp document liên quan phải
được ghi nguyên tử và có test chống lệch.

  - Giới hạn query rõ ràng.
  - Pagination theo cursor.
  - Không mở realtime listener tràn lan.

##### Đo trước khi thêm motion hoặc chart

UI hiện đại đến từ hierarchy, feedback và tốc độ. Motion chỉ phục vụ
trạng thái; chart chỉ xuất hiện khi hỗ trợ quyết định.

  - Lighthouse theo route.
  - Profiler cho màn hình danh sách lớn.
  - Reduced motion là đường chạy chính thức.

---

## 2. 16/07/2026 — Báo cáo Review đóng (kỹ thuật)

_Nguồn gốc: `BAO-CAO-REVIEW-DONG-16-07-2026.html` — bản HTML gốc đã chuyển vào `docs/Infographic/`._

Review kỹ thuật · 16.07.2026

### Đạt kiểm tra.  
Chưa nên bỏ qua.

Ba bản sửa đã được triển khai bằng Firebase Web SDK và Firestore Rules.
Toàn bộ cổng kiểm định đã đạt trên trạng thái cuối.

**03** phát hiện đã có bản sửa ● HOÀN TẤT KIỂM ĐỊNH

**1.057**dòng thêm **702**dòng xóa **114**test đạt **0**blocker còn lại

Phát hiện chính

#### Ba điểm cần hành động

Chọn mức độ để lọc. Bấm từng nhận xét để xem nguyên nhân, tác động và
hướng xử lý.

P1 / RUNTIME

##### Lưu lại điểm danh có thể làm thất bại toàn bộ batch

Xung đột giữa thao tác merge và quy tắc cấm cập nhật thông báo.

##### Nguyên nhân

Thông báo dùng ID cố định và được ghi bằng `merge: true`, trong khi
Firestore Rules chỉ cho phép tạo mới, không cho phép cập nhật.

##### Tác động

Khi cảnh báo đã tồn tại, lần lưu điểm danh tiếp theo bị từ chối; vì nằm
trong cùng batch, mọi thay đổi điểm danh của lần lưu đó đều thất bại.

##### Khuyến nghị

Dùng ID thông báo mới, hoặc cho phép cập nhật idempotent với danh sách
trường bị giới hạn chặt, hoặc bỏ qua việc ghi lại cảnh báo đã tồn tại.

##### Bằng chứng

`attendance.ts:30` đối chiếu với `firestore.rules:429–430`.

[Mở file nguồn →](../src/services/firestore/attendance.ts)

P1 / DATA

##### Tổng quan điểm danh có thể âm thầm thiếu dữ liệu

Giới hạn 500 bản ghi không đủ cho một chunk 30 buổi học.

##### Nguyên nhân

Mỗi truy vấn gom tối đa 30 session nhưng áp dụng `limit(500)` và không
phân trang.

##### Tác động

30 buổi × 20 học sinh đã tạo 600 bản ghi. Phần vượt giới hạn bị bỏ qua
mà giao diện không báo lỗi, làm sai tỷ lệ chuyên cần và danh sách rủi
ro.

##### Khuyến nghị

Phân trang đến khi hết dữ liệu, hoặc chia chunk dựa trên sĩ số dự kiến
để tổng số bản ghi không vượt giới hạn.

##### Bằng chứng

`attendance.ts:86–89`.

[Mở file nguồn →](../src/services/firestore/attendance.ts)

P2 / SECURITY

##### Nguồn của điểm có thể bị thay đổi sau khi tạo

Quy tắc update chưa tái kiểm tra tính toàn vẹn của liên kết bài tập.

##### Nguyên nhân

Rules chỉ kiểm tra `source` thuộc enum khi update, nhưng không khóa hoặc
tái kiểm tra `assignmentId`, `submissionId` và quy ước document ID.

##### Tác động

Người có quyền quản lý lớp có thể biến điểm thủ công thành điểm bài tập
hoặc gắn điểm với một submission không tương ứng.

##### Khuyến nghị

Đưa các trường nguồn vào danh sách bất biến, hoặc áp dụng lại đầy đủ hai
nhánh kiểm tra manual/assignment cho mọi update.

##### Bằng chứng

`firestore.rules:560–564`.

[Mở Firestore Rules →](../firebase/firestore.rules)

Bằng chứng kiểm tra

#### Các cổng đều đạt

Kết quả xanh xác nhận chất lượng cú pháp và các trường hợp đã được test;
chúng không phủ hết ba tình huống runtime ở trên.

✓**TypeScript**typecheck đạt
✓**ESLint**0 cảnh báo ✓**Unit
tests**17 / 17 đạt ✓**Rules
tests**92 / 92 đạt
✓**Production**build + mojibake đạt **Trạng
thái cuối 17:08 — 16/07/2026:** typecheck, full lint, 18/18 unit tests,
96/96 Firestore Rules tests, production build và mojibake đều đạt.
Blocker JSX tại Sidebar đã được phục hồi theo xác nhận của người dùng.

Điều kiện tiên quyết

#### Giữ đúng Spark Plan

Mọi hạng mục dưới đây được thiết kế cho Firebase Web SDK và code
client-side, không mở rộng sang hạ tầng trả phí.

**Biên kiến trúc bắt buộc**

Client thực hiện nghiệp vụ; Firestore Security Rules là lớp kiểm soát
tin cậy. Các bản sửa phải chạy được trên Firebase Spark Plan hiện tại.

  - Không dùng Cloud Functions hoặc Cloud Run.
  - Không dùng Admin SDK trong luồng vận hành.
  - Không yêu cầu server riêng hoặc secret phía client.
  - Không dùng Firebase Storage cho tệp đính kèm.
  - Không đưa ra giải pháp bắt buộc nâng cấp Blaze Plan.
  - Kiểm thử Rules bằng Firestore Emulator trước khi triển khai.

Roadmap hoàn tất

#### Bốn cổng đều đạt

Giai đoạn 1–4 đã hoàn thành với test hồi quy, Rules suite và production
build trên trạng thái cuối.

Giai đoạn

##### Khóa hành vi bằng test hồi quy

Tái hiện ba lỗi trước khi thay đổi code để tránh “sửa theo cảm giác”.

CỔNG: TEST ĐỎ ĐÚNG LÝ DO

###### Thực hiện

  - Test lưu lại điểm danh khi alert đã tồn tại.
  - Test truy vấn vượt 500 attendance records.
  - Rules test chống đổi nguồn và liên kết điểm.

###### Bằng chứng hoàn thành

Ba test mới thất bại trên code hiện tại và thông báo lỗi khớp đúng ba
phát hiện trong báo cáo.

Giai đoạn

##### Sửa hai lỗi P1 trong luồng điểm danh

Bảo đảm lưu lại an toàn và tổng quan không mất dữ liệu.

CỔNG: P1 XANH

###### Thực hiện

  - Tách ghi attendance khỏi rủi ro cập nhật alert.
  - Chọn chiến lược alert idempotent phù hợp Rules.
  - Phân trang attendance bằng cursor hoặc chunk an toàn.
  - Giữ số lượt đọc ở mức kiểm soát được trên Spark.

###### Không được làm

Không chuyển logic sang Cloud Functions; không nới quyền update
announcement một cách tổng quát; không giữ giới hạn cứng có thể cắt dữ
liệu.

###### Bằng chứng hoàn thành

Lưu lần hai thành công; toàn bộ dữ liệu \>500 được tổng hợp; test P1 và
test Rules đều đạt.

###### File dự kiến

`attendance.ts`, `firestore.rules` nếu chọn cập nhật idempotent, và bộ
test liên quan.

Giai đoạn

##### Siết toàn vẹn điểm số P2

Không cho thay đổi nguồn hoặc liên kết bài tập sau khi điểm được tạo.

CỔNG: RULES ỔN ĐỊNH

###### Thực hiện

  - Chọn trường provenance bất biến.
  - Giữ quyền cập nhật điểm, nhận xét và published đúng nghiệp vụ.
  - Kiểm tra cả manual và assignment score.

###### Bằng chứng hoàn thành

Update hợp lệ vẫn đạt; đổi `source`, `assignmentId`, `submissionId` hoặc
liên kết sai đều bị từ chối.

###### File dự kiến

`firestore.rules`, `phase8-rules.test.ts` và test immutable nếu cần.

###### Rủi ro cần duyệt

Nếu nghiệp vụ cần chuyển đổi nguồn điểm, phải chọn luồng tạo bản ghi mới
thay vì sửa provenance tại chỗ.

Giai đoạn

##### Kiểm định toàn bộ và bàn giao

Chứng minh bản sửa không phá các module đang hoạt động.

CỔNG: SẴN SÀNG TRIỂN KHAI

###### Chạy kiểm tra

  - Typecheck, lint, unit test và build.
  - Toàn bộ Firestore Rules tests.
  - Mojibake và kiểm tra giao diện điểm danh.
  - Smoke test vai trò Admin, Teacher, Viewer.

###### Bằng chứng hoàn thành

Tất cả cổng đạt, ba test hồi quy xanh, không có quyền truy cập ngoài dự
kiến và báo cáo được cập nhật trạng thái thực tế.

**Điểm dừng phê duyệt:** chưa chỉnh sửa code nghiệp vụ cho đến khi
roadmap này được duyệt.

Checklist triển khai

#### Theo dõi ngay trên báo cáo

Trạng thái được lưu cục bộ trong trình duyệt này. Việc đánh dấu không
làm thay đổi mã nguồn hoặc Firebase.

**0 / 10 hạng mục hoàn thành**  
Trạng thái tương tác lưu riêng trong trình
duyệt

  - **Duyệt roadmap và lựa chọn chiến lược
    announcement**Chốt ID mới hoặc update idempotent
    có giới hạn.DUYỆT
  - **Viết test lưu lại điểm danh**Alert đã tồn tại
    nhưng lần lưu thứ hai vẫn phải thành công.TEST
  - **Viết test dữ liệu điểm danh vượt 500**Xác minh
    không mất record và thống kê chính xác.TEST
  - **Viết Rules test cho provenance điểm**Chặn thay
    đổi source và liên kết assignment/submission.TEST
  - **Sửa luồng ghi cảnh báo điểm danh**Không để lỗi
    announcement làm rollback attendance.P1
  - **Phân trang truy vấn attendance**Không dùng
    giới hạn cứng làm điều kiện kết thúc.P1
  - **Siết Firestore Rules cho score update**Giữ
    provenance bất biến hoặc tái kiểm tra đầy đủ.P2
  - **Chạy toàn bộ 5 cổng tự động**Typecheck, lint,
    unit, Rules, build và mojibake.QA
  - **Smoke test ba vai trò**Admin, Teacher và
    Viewer trên Firestore Emulator.QA
  - **Cập nhật báo cáo theo bằng chứng cuối**Đổi
    trạng thái chỉ sau khi các cổng tương ứng đạt.BÀN GIAO

#### Checklist xử lý đề xuất

Ưu tiên sửa hai lỗi P1, bổ sung test hồi quy, sau đó siết tính toàn vẹn
của score update.

---

## 3. 16/07/2026 — Báo cáo kiểm tra & đồng bộ giao diện Frontend

_Nguồn gốc: `BAO-CAO-DONG-BO-GIAO-DIEN-FRONTEND-16-07-2026.md` — file gốc đã chuyển vào `docs/archive/`._

### Báo cáo kiểm tra & đồng bộ giao diện Frontend — 16/07/2026

Phạm vi: toàn bộ `src/` (React + Tailwind + Recharts), đối chiếu với token trong `tailwind.config.ts` và `src/index.css`. Đã sửa trực tiếp các mục đánh dấu **[Đã sửa]**; các mục còn lại là đề xuất, chưa đụng vào code vì cần bạn quyết định hoặc cần QA hình ảnh trước khi đổi.

#### 1. Cấu hình bị nhân bản, dễ lệch nhau [Đã sửa 1 phần]

`tailwind.config.{js,ts,d.ts}` và `vite.config.{js,ts,d.ts}` tồn tại song song. Nguyên nhân gốc: `tsconfig.node.json` bật `composite: true` cho 2 file `.ts` này mà không có `outDir`, nên mỗi lần có tiến trình chạy `tsc -b` (build theo project reference), TypeScript biên dịch `.ts` thành `.js`/`.d.ts` ngay cạnh file nguồn và các file này bị commit nhầm vào git.

Hậu quả thực tế: `vite.config.js` (bản mà Vite thực sự nạp, vì Vite ưu tiên `.js` trước `.ts`) đã bị sửa tay để thêm `chunkSizeWarningLimit: 650`, còn `vite.config.ts` (bản "nguồn" có type-check) thì không có — hai file chạy khác hành vi nhau mà không ai biết.

**Đã sửa**: thêm `"outDir": "./.tsc-out/node"` vào `tsconfig.node.json` để chặn tái phát; đồng bộ nội dung `vite.config.ts` với `vite.config.js` (đã có `chunkSizeWarningLimit`); thêm `.tsc-out/` và `*.tsbuildinfo` vào `.gitignore`.

**Chưa sửa được**: không xoá được `tailwind.config.js`, `tailwind.config.d.ts`, `vite.config.js`, `vite.config.d.ts` — sandbox của mình bị chặn quyền xoá file trên máy bạn. Bạn chạy giúp lệnh sau rồi commit:
```
rm tailwind.config.js tailwind.config.d.ts vite.config.js vite.config.d.ts tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo
```

#### 2. Nút bấm (Button) tự phá vỡ token bo góc [Đã sửa]

`src/components/ui/Button.tsx`: class nền (`base`) đặt `rounded-input` cho mọi variant, nhưng variant `primary` tự ghi đè `rounded-xl` — hai class bo góc cùng áp lên một phần tử, thắng-thua phụ thuộc thứ tự Tailwind sinh CSS chứ không phải thứ tự trong code, tức là bo góc của nút primary có thể đổi bất ngờ giữa các lần build. Đã bỏ `rounded-xl` dư thừa, để tất cả variant dùng chung `rounded-input` như thiết kế.

#### 3. Hai hệ nút icon song song, một hệ chết [Đã sửa]

Component `IconButton` xuất ra từ `Button.tsx` (bo góc `rounded-input`, viền `border-neutral-300`) không được import ở bất kỳ đâu trong codebase — hàng chết. Trong khi đó toàn bộ 8+ nơi cần nút icon (Sidebar, Topbar, Modal, InvoicesPage, StudentInfoDialog...) đều dùng class CSS toàn cục `.icon-button` (bo góc `rounded-xl`, nền kính mờ) định nghĩa ở `index.css`. Hai hệ khác bo góc, khác màu hover — nếu ai đó thật sự dùng `IconButton` sẽ ra giao diện lệch chuẩn ngay. Đã xoá `IconButton` chết, giữ `.icon-button` làm chuẩn duy nhất, đồng thời đổi bo góc của nó sang tên token (`rounded-card`, xem mục 5) cho nhất quán ngữ nghĩa dù giá trị pixel không đổi.

#### 4. Màu biểu đồ/trạng thái bị chép tay ở 5 nơi [Đã sửa]

`src/components/charts/chartTheme.ts` là nơi lẽ ra tập trung toàn bộ mã màu hex dùng cho Recharts/inline-style (nơi không dùng được class Tailwind), nhưng trước đây chỉ có `CHART_PRIMARY`. Do đó 5 file tự chép lại đúng các mã hex trong `tailwind.config.ts` mỗi khi cần màu success/warning/danger/info:

- `LearningOverview.tsx` — bảng `FUNNEL_KEYS`, gradient biểu đồ, trục, lưới đều hardcode hex, kể cả một màu `#CBD8FF` không khớp bất kỳ bậc màu nào trong palette (giữa `primary-100` và `primary-200`).
- `AttendanceOverview.tsx`, `CatalogDashboard.tsx` — `STATUS_COLOR` chép tay.
- `InvoicesPage.tsx` — `fill="#16A34A"` hardcode dù file đã import `CHART_PRIMARY` từ chartTheme cho các biểu đồ khác.
- `StudentsList.tsx` (`ScoreRing`) — cả bảng `{accent, bg}` 5 tông màu bị chép tay riêng, dùng cho `conic-gradient` inline.

Rủi ro: nếu sau này đổi một mã màu trong `tailwind.config.ts`, 5 nơi này lệch màu ngay mà không ai biết vì chúng không tham chiếu tới nguồn chung.

**Đã sửa**: mở rộng `chartTheme.ts` thêm `CHART_SUCCESS/WARNING/DANGER/INFO/NEUTRAL`, `CHART_PRIMARY_SOFTER`, và 2 bảng tra `CHART_TONE_ACCENT`/`CHART_TONE_BG`; chuyển cả 5 file trên sang import từ đây thay vì hardcode. Màu `#CBD8FF` lệch chuẩn đã được đưa về đúng `primary-200` (`#BFD3FE`, gần như không khác biệt bằng mắt). `LearningOverview.tsx` còn được dọn thêm: các chart trước đó không dùng `CHART_AXIS_TICK`/`CHART_GRID_COLOR` có sẵn mà tự set `fill`/`stroke` tay — nay dùng lại.

#### 5. Bo góc lệch chuẩn ở toàn bộ Sidebar + Topbar [Đã sửa]

Toàn hệ thống dùng 3 token ngữ nghĩa `rounded-input` (8px), `rounded-card` (12px), `rounded-modal` (16px) — StatCard, Modal, các trang feature đều theo đúng chuẩn này. Riêng khung điều hướng (`Sidebar.tsx`, `Topbar.tsx`) và `.icon-button` trong `index.css` lại dùng thang màu chung của Tailwind (`rounded-lg`, `rounded-xl`, `rounded-2xl`). Về mặt pixel, `rounded-lg` (8px) = `rounded-input`, `rounded-xl` (12px) = `rounded-card`, `rounded-2xl` (16px) = `rounded-modal` — nên hình ảnh không đổi, nhưng tên gọi trong code không nói lên hệ thống, khiến người sau dễ chọn nhầm giá trị khi thêm thành phần mới. Đã đổi toàn bộ 15 chỗ trong 2 file này (+ `.icon-button`) sang tên token ngữ nghĩa.

**Còn lại, chưa đổi** (rủi ro hình ảnh cần xác nhận trước): 12 chỗ dùng bo góc tuỳ ý không khớp token nào — `rounded-[7px]` (7 chỗ, chủ yếu góc trên của cột biểu đồ Recharts — có thể là chủ ý cho hiệu ứng "chip"), `rounded-[3px]`/`rounded-[6px]` (5 chỗ). Nên rà lại từng chỗ bằng mắt trước khi gộp vào token.

#### 6. Viền active-state hardcode màu, lặp ở 2 nơi [Đã sửa]

`Sidebar.tsx` và `AssignmentsPage.tsx` cùng dùng `shadow-[inset_3px_0_0_#3366F0]` để vẽ vạch xanh bên trái mục đang chọn — cùng một giá trị hex chép tay ở 2 nơi độc lập. Đã đổi sang `shadow-[inset_3px_0_0_theme(colors.primary.500)]`, tham chiếu thẳng token thay vì hex rời.

#### 7. Đề xuất còn mở (chưa áp dụng)

Những mục này ảnh hưởng diện rộng hoặc cần bạn xác nhận UX, nên chỉ liệt kê để cân nhắc, không tự sửa:

- **Component tái sử dụng thấp**: 45/– file dùng `<button>` thô, chỉ 19 file import component `Button`. Không phải tất cả sai (nhiều chỗ là tab/segment cần style riêng), nhưng đáng rà lại các nút hành động chính (submit, xác nhận, xoá) để dùng chung `Button` — nhất quán trạng thái `disabled`/`hover`/`focus` và dễ sửa 1 nơi khi đổi thiết kế.
- **11/22 trang không có breakpoint responsive nào** (`sm:`/`md:`/`lg:`) — gồm `StudentsPage`, `ClassesPage`, `AttendancePage`, `LearningPage`, `LessonPlansPage`. Đây là ứng dụng quản lý lớp học nhiều khả năng giáo viên/phụ huynh dùng trên điện thoại; nên có audit riêng cho mobile.
- **`docs/DESIGN-SYSTEM-v2.md`** (kế hoạch design-system nội bộ) ghi radius mục tiêu là `input 10 · card 14 · modal 18`, khác với giá trị đang chạy thật trong `tailwind.config.ts` (`8 · 12 · 16`). Không rõ tài liệu là bản nháp cũ hay là đích cần migrate tới — cần bạn chốt trước khi ai đó "sửa cho khớp doc" và vô tình đổi toàn hệ thống.
- **Accessibility**: phần này thực ra khá tốt — `StatusBadge` luôn đi kèm chữ chứ không chỉ dựa màu, `Modal` có focus-trap + `aria-modal` + khôi phục focus khi đóng, các nút icon đều có `aria-label`. Không có việc cần sửa gấp ở đây.

#### 8. Lưu ý về quá trình sửa

Trong lúc chỉnh `Sidebar.tsx`, một lệnh `sed` chạy qua sandbox đã làm file bị cắt cụt cuối file (mất đoạn đóng thẻ `</aside>` và `);}`). Mình đã phát hiện qua `git diff` và phục hồi lại đúng nguyên bản (chỉ khác đúng các chỗ đổi tên class đã liệt kê ở mục 5, 6). Đã đọc lại toàn bộ file để xác nhận lành. Dù vậy, bạn nên chạy `npm run dev` và lướt qua Sidebar một lượt trước khi commit, vì môi trường sandbox của mình gặp trục trặc đồng bộ file khi thao tác trực tiếp qua shell (không phải qua công cụ edit) — không loại trừ hoàn toàn khả năng còn sót vấn đề tương tự ở nơi khác dù mình đã rà lại từng file đã sửa.

---

## 4. 17/07/2026 — Báo cáo review tổng thể dự án

_Nguồn gốc: `BAO-CAO-REVIEW-TONG-THE-DU-AN-17-07-2026.html` — bản HTML gốc đã chuyển vào `docs/Infographic/`. Nội dung được trích xuất từ dữ liệu JS nhúng trong trang (bảng 13 khu vực, 65 phát hiện) và trình bày lại dạng văn bản._

### Sức khỏe mã nguồn dự án Edumatrix VN

Báo cáo rà soát mã nguồn toàn dự án — chỉ đọc, không chỉnh sửa mã nguồn trong quá trình rà soát.

| | |
|---|---|
| Ngày rà soát | 17/07/2026 |
| Phạm vi | Toàn bộ ứng dụng web |
| Quy mô | 156 file · ~11.500 dòng |
| Thay đổi mã nguồn | Không có (0) |

**Nền tảng vững, còn vài lỗ hổng cần vá sớm.** Phần khung kỹ thuật và luật bảo mật dữ liệu được xây khá kỷ luật. Vấn đề đáng chú ý nhất tập trung ở nơi liên quan trực tiếp đến **tiền học phí** và **điểm số học sinh** — nên xử lý trước tiên.

| Điểm hợp lý (điểm mạnh) | Vấn đề mức Cao | Vấn đề mức Trung bình | Vấn đề mức Thấp |
|---|---|---|---|
| 32 | 11 | 13 | 9 |

#### Nên xử lý trước tiên (6 vấn đề ảnh hưởng lớn nhất)

1. **[Bài tập & Điểm số]** Màn hình nhập điểm thủ công không giới hạn điểm nhập vào — giáo viên gõ nhầm có thể làm sai điểm trung bình của học sinh.
2. **[Bảo mật / Học phí]** Luật bảo mật cho phép tạo hóa đơn học phí mà không kiểm tra thông tin ngân hàng — rủi ro giả mạo số tài khoản nhận tiền.
3. **[Học phí / Hóa đơn]** Trang "Đóng học phí" của phụ huynh không báo lỗi khi việc báo chuyển khoản bị từ chối — phụ huynh tưởng đã báo thành công.
4. **[Kiến trúc]** File cấu hình Vite và Tailwind bị trùng — bản đang thực sự chạy lại là bản không được kiểm tra kỹ.
5. **[Học viên]** Bộ lọc "Thời gian" trong danh sách học viên chỉ mang tính trang trí, bấm vào không lọc được gì.
6. **[Giáo án]** Giáo án có thể được "Xuất bản" mà không gắn lớp học — phụ huynh sẽ không bao giờ thấy, và không ai được cảnh báo.

#### 13 khu vực đã kiểm tra

##### Kiến trúc & tổ chức mã nguồn — *Cần cải thiện*

Nền tảng kỹ thuật (cách tổ chức thư mục, kiểu dữ liệu, cách gọi dữ liệu) được xây khá kỷ luật — nhưng có vài file cấu hình bị trùng lặp, trong đó bản build thực tế lại dùng bản KHÔNG được kiểm tra lỗi, tiềm ẩn rủi ro.

Điểm mạnh:

- Toàn bộ 156 file mã nguồn không có một dòng nào dùng kiểu dữ liệu mập mờ ("any") — mức kỷ luật cao hiếm gặp, giảm mạnh nguy cơ lỗi ẩn.
- Cơ chế lấy dữ liệu (React Query) được dùng nhất quán ở 42 file, có cấu hình riêng để tiết kiệm lượt đọc dữ liệu — phù hợp gói Firebase miễn phí.
- Luồng đăng nhập/phân quyền tách lớp rõ ràng, có ghi chú đây chỉ là lớp bảo vệ giao diện — bảo mật thật nằm ở luật Firestore (đúng nguyên tắc).
- Tên các bảng dữ liệu được gom về một nơi duy nhất, không có chỗ nào viết tay tên bảng rải rác — tránh gõ sai.

Vấn đề:

- **[Cao]** Có 2 bản file cấu hình Vite gần giống hệt nhau. Hệ thống build thực tế lại ưu tiên chạy bản KHÔNG được kiểm tra kiểu dữ liệu, trong khi lập trình viên có xu hướng sửa bản còn lại — sửa nhầm chỗ, thay đổi sẽ không có tác dụng. *(`vite.config.js / vite.config.ts`)*
- **[Cao]** Tương tự với cấu hình giao diện Tailwind: có 2 bản song song, bản đang thực sự chạy không được kiểm soát chặt. *(`tailwind.config.js / tailwind.config.ts`)*
- **[Cao]** Trang tổng quan dành cho phụ huynh có đoạn code "ép" dữ liệu về dạng chung chung, bỏ qua toàn bộ kiểm tra kiểu dữ liệu — nếu sai tên trường, màn hình sẽ hiển thị trống thay vì báo lỗi. *(`viewerDashboard.ts`)*
- **[Trung bình]** Đoạn code lấy "Thông báo" được viết tay lặp lại ở 3 nơi khác nhau thay vì dùng chung một hàm — sửa một chỗ, dễ quên sửa 2 chỗ còn lại. *(`Topbar.tsx, ViewerAnnouncementsPage.tsx, viewerDashboard.ts`)*
- **[Trung bình]** 2 màn hình truy cập thẳng cơ sở dữ liệu thay vì đi qua lớp trung gian dùng chung như phần còn lại của hệ thống. *(`Topbar.tsx, ViewerAnnouncementsPage.tsx`)*
- **[Trung bình]** Định dạng ngày tháng được viết tay lặp lại ở hơn 8 file thay vì dùng chung một hàm. *(`nhiều file`)*
- **[Trung bình]** Tên các nhóm dữ liệu cache được gõ tay rải rác ở 28+ file thay vì quản lý tập trung — vẫn chạy đúng nhờ đặt tên khớp theo thói quen, dễ gãy khi đổi tên. *(`nhiều file`)*
- **[Thấp]** Đã có sẵn hàm định dạng tiền tệ dùng chung nhưng 2 màn hình vẫn tự viết lại logic tương tự. *(`currency.ts`)*
- **[Thấp]** Có 1 file dùng chung và 1 màn hình "Không có quyền truy cập" được tạo ra nhưng không nơi nào sử dụng — code chết. *(`client.ts, PermissionDenied.tsx`)*
- **[Thấp]** 2 file tạm do máy tự sinh ra đang bị lưu vào kho mã nguồn dù đã có quy tắc loại trừ — dấu hiệu quy tắc thêm sau nhưng chưa dọn file cũ. *(`.gitignore, *.tsbuildinfo`)*

##### Bảo mật & phân quyền dữ liệu — *Cần cải thiện*

Lớp bảo vệ dữ liệu quan trọng nhất, vì hệ thống dùng gói Firebase miễn phí, không có máy chủ riêng để kiểm tra lại. Khung phân quyền (ai xem gì, ai sửa gì) làm rất tốt, nhưng có một lỗ hổng đáng lo ở phần tạo hóa đơn học phí.

Điểm mạnh:

- Mặc định CHẶN mọi thứ không được khai báo rõ ràng — không có bảng dữ liệu nào bị bỏ sót, lộ ra ngoài.
- Tài khoản bị khóa (kể cả Admin) sẽ mất quyền ngay lập tức — đã có kiểm thử tự động xác nhận.
- Người dùng không thể tự phong mình làm Admin khi đăng ký — bắt buộc khớp với "lời mời" do Admin tạo trước, có kiểm thử xác nhận.
- Sau khi tạo tài khoản, người dùng không thể tự sửa vai trò/trạng thái của chính mình — chỉ Admin sửa được.
- Số liệu quan trọng (tiền hóa đơn, điểm số, điểm danh...) bị khóa cứng sau khi tạo — không ai sửa được số liệu cũ để gian lận, có kiểm thử riêng xác nhận.
- Giáo viên chỉ xem/sửa được dữ liệu đúng lớp mình phụ trách — có bộ kiểm thử riêng xác nhận không đụng được dữ liệu lớp của giáo viên khác.

Vấn đề:

- **[Cao]** Khi tạo HÓA ĐƠN học phí, hệ thống chỉ kiểm tra số tiền > 0, không kiểm tra thông tin số tài khoản ngân hàng nhận tiền. Vì thông tin ngân hàng bị khóa cứng sau khi tạo, một tài khoản giáo viên (không chỉ Admin) về lý thuyết có thể tạo hóa đơn với SỐ TÀI KHOẢN GIẢ, khiến phụ huynh chuyển khoản nhầm nơi — rủi ro gian lận tài chính thực sự, cần vá sớm. *(`firestore.rules dòng 676-681`)*
- **[Cao]** Một số bảng dữ liệu thêm ở giai đoạn sau (bài tập, bài nộp, thông báo, hóa đơn, thanh toán) không được kiểm tra đầy đủ định dạng khi ghi — khác với các bảng ra đời sớm được kiểm tra rất chặt. Mức bảo vệ không đồng đều giữa các module. *(`firestore.rules — assignments, submissions, announcements, invoices`)*
- **[Trung bình]** Phụ huynh có thể tự "nộp bài" gán vào một bài tập/lớp học bất kỳ mà không thực sự thuộc lớp đó, do thiếu bước đối chiếu chéo. *(`firestore.rules dòng 619-621`)*
- **[Trung bình]** Khi phụ huynh tự báo "đã chuyển khoản", hệ thống không đối chiếu số tiền báo có khớp hóa đơn gốc hay không — vẫn an toàn về lâu dài nhưng dễ khiến Admin duyệt nhầm nếu không để ý. *(`firestore.rules dòng 693-698`)*
- **[Trung bình]** Một số kịch bản kiểm thử tự động cho module Giáo án đang dùng dữ liệu mẫu theo cấu trúc CŨ (đã thay bằng cấu trúc mới hồi 16/07) — kiểm thử vẫn "chạy qua" nhưng không còn kiểm tra đúng thứ cần kiểm tra. *(`immutable-rules.test.ts, phase5-rules.test.ts`)*
- **[Thấp]** Có luật bảo mật viết cho một cơ chế ghi dữ liệu bằng máy chủ riêng — nhưng hệ thống này không có máy chủ riêng (gói miễn phí), nên luật đó không bao giờ có tác dụng thực tế. *(`firestore.rules dòng 719-725`)*
- **[Thấp]** Có một hằng số cấu hình không khớp với luật bảo mật tương ứng — nếu sau này có tính năng dùng đến, sẽ luôn bị từ chối ghi. *(`collections.ts, firestore.rules dòng 366-370`)*

##### Module Học viên — *Cần cải thiện*

Danh sách và hồ sơ học viên hoạt động tốt, hộp thoại thông tin học viên làm chuẩn về khả năng tiếp cận. Điểm trừ lớn nhất là một bộ lọc theo thời gian chỉ mang tính hình thức.

Điểm mạnh:

- Hộp thoại thông tin học viên làm đúng chuẩn: đóng bằng phím Escape, tự động focus — phù hợp người dùng thao tác bàn phím/trình đọc màn hình.
- Danh sách học viên chỉ tải dữ liệu điểm danh/điểm số của đúng những học viên đang hiển thị — không tải toàn bộ, tiết kiệm lượt đọc Firestore.

Vấn đề:

- **[Cao]** Bộ lọc "Thời gian lọc" trong danh sách học viên chỉ là giao diện trang trí — ngày tháng viết cứng sẵn, nút "Áp dụng" không lọc được gì. Nhân viên bấm vào sẽ tưởng đã lọc nhưng danh sách không đổi. *(`TimeRangeFilter.tsx`)*
- **[Thấp]** Có sẵn một biểu mẫu "sửa học viên" đầy đủ nhưng không được dùng ở đâu — nếu sau này vô tình bật lại, dữ liệu phụ huynh nhập có thể bị mất do form cũ không lưu đủ trường. *(`StudentForm.tsx`)*

##### Module Lớp học — *Tốt*

Không phát hiện lỗi chức năng nào. Đây là một trong những module được xử lý cẩn thận nhất.

Điểm mạnh:

- Khi thêm/xóa học viên khỏi lớp, hệ thống cập nhật đồng thời 3 nơi liên quan (lớp học, học viên, giáo viên) trong cùng một thao tác — tránh dữ liệu lệch nhau.
- Khi xóa một lớp học, hệ thống chỉ hủy các buổi SẮP TỚI và giữ nguyên lịch sử đã học — đúng nghiệp vụ, không mất dữ liệu quá khứ.

_Không phát hiện vấn đề nào ở module này._

##### Module Môn học & Khóa học — *Tốt*

Không phát hiện lỗi chức năng nào. Cách liên kết giữa Môn học và Khóa học được làm mượt và tiết kiệm tài nguyên.

Điểm mạnh:

- Bấm chọn một Môn học sẽ tự lọc ra đúng các Khóa học liên quan — thao tác qua lại giữa 2 danh sách mượt mà.
- Xử lý tốt các khóa học cũ tạo trước khi có trường "Giá theo buổi" — không lỗi hiển thị, không cần script sửa dữ liệu cũ.

_Không phát hiện vấn đề nào ở module này._

##### Module Lịch học / Thời khóa biểu — *Cần cải thiện*

Thuật toán xếp lịch không chồng chéo được làm rất tốt, nhưng cách xử lý MÚI GIỜ chưa nhất quán — có thể gây lệch giờ học nếu máy tính nhân viên đặt sai múi giờ.

Điểm mạnh:

- Thuật toán tự động xếp các buổi học trùng giờ vào cột riêng biệt (giống Google Calendar) được cài đúng và xử lý tốt các trường hợp biên.
- Tính năng kéo-thả đổi giờ học giữ nguyên đúng thời lượng buổi học và tự động chuyển trạng thái + gửi thông báo — đúng nghiệp vụ.

Vấn đề:

- **[Cao]** Phần lớn module Lịch học tính ngày giờ theo đồng hồ máy tính cục bộ của trình duyệt, thay vì cố định theo giờ Việt Nam như quy định — dù thư viện xử lý múi giờ đã có sẵn và dùng đúng ở nơi khác. Máy nhân viên đặt sai múi giờ hệ thống có thể làm sai ngày/giờ của buổi học lặp lại hoặc khi kéo-thả đổi giờ. *(`recurrence.ts, sessions.ts, FitWeekTimetable.tsx, TimetableGrid.tsx`)*
- **[Trung bình]** Có một file danh sách lớp học kiểu cũ (224 dòng) không còn dùng ở đâu — sót lại sau đợt gộp tính năng, nên dọn bỏ để tránh nhầm lẫn khi sửa code sau này. *(`ClassScheduleList.tsx`)*

##### Module Điểm danh — *Tốt*

Module được đánh giá chắc chắn nhất trong toàn bộ hệ thống — cả về đúng nghiệp vụ lẫn tiết kiệm tài nguyên.

Điểm mạnh:

- Xử lý thông minh cho các câu truy vấn lớn (chia nhỏ theo nhóm 30 học viên) để không vượt giới hạn của Firestore.
- Phân biệt đúng giữa "chưa điểm danh" và "đã đăng ký nghỉ học" — tránh báo nhầm buổi học thiếu điểm danh khi học sinh đã xin nghỉ.
- Toàn bộ điểm danh một buổi học được lưu trong một lần ghi duy nhất khi bấm Lưu, không ghi từng dòng khi tick chọn — tiết kiệm số lượt ghi dữ liệu.

_Không phát hiện vấn đề nào ở module này._

##### Module Giáo án — *Cần cải thiện*

Có điểm bất nhất giữa giao diện và luật kiểm tra dữ liệu: màn hình đánh dấu "Lớp học" là bắt buộc, nhưng thực ra cho phép bỏ trống — hậu quả là giáo án có thể "Xuất bản" mà không hiện cho phụ huynh, không ai được cảnh báo.

Điểm mạnh:

- Có kiểm tra chéo tổng thời lượng các hoạt động so với thời lượng thực tế buổi học, hiển thị rõ khớp/lệch — kiểm tra nghiệp vụ hữu ích, làm tốt.
- Màn hình xem chi tiết giáo án được tái sử dụng khéo léo cho cả xem và in ấn, không phải xây riêng 2 giao diện.

Vấn đề:

- **[Cao]** Ô "Lớp học" trên biểu mẫu giáo án có dấu (*) báo bắt buộc, nhưng hệ thống thực chất KHÔNG bắt buộc — giáo viên vẫn lưu được khi bỏ trống, không có dòng báo lỗi nào hiện ra. Nếu bấm "Xuất bản" mà quên chọn lớp, giáo án sẽ không hiển thị cho phụ huynh — và không ai được thông báo việc xuất bản đã "thất bại trong im lặng". *(`LessonPlanForm.tsx, schemas/lessonPlan.ts`)*

##### Module Bài tập & Điểm số — *Nghiêm trọng*

Vấn đề nghiêm trọng nhất tìm thấy trong toàn bộ đợt rà soát: màn hình nhập điểm thủ công của giáo viên không kiểm tra điểm nhập vào có nằm trong thang điểm hợp lệ hay không, có thể làm sai điểm trung bình của học sinh.

Điểm mạnh:

- Luồng chấm bài tập (khác với nhập điểm thủ công) xử lý đúng và cẩn thận trường hợp chấm lại, kể cả cập nhật lại điểm trung bình chính xác.

Vấn đề:

- **[Cao]** Màn hình "Bảng điểm" (nhập điểm thủ công) chỉ kiểm tra điểm tối đa phải lớn hơn 0, KHÔNG kiểm tra điểm giáo viên nhập có nằm trong khoảng 0 đến điểm tối đa hay không. Ô nhập điểm có giới hạn hiển thị trên giao diện nhưng không nằm trong một biểu mẫu chuẩn nên giới hạn đó không thực sự chặn — gõ nhầm "999" cho bài thang điểm 10 vẫn được lưu và tính vào điểm trung bình. Cùng nghiệp vụ này lại được kiểm tra đúng ở luồng chấm bài tập nhưng bị bỏ sót ở luồng nhập điểm thủ công. *(`services/firestore/scores.ts (saveClassScores)`)*
- **[Cao]** Biểu mẫu tạo Bài tập bắt giáo viên/nhân viên tự gõ tay MÃ giáo án và MÃ buổi học (chuỗi ký tự kỹ thuật trong cơ sở dữ liệu) thay vì chọn từ danh sách xổ xuống như mọi nơi khác. Không ai không rành kỹ thuật biết mã đó là gì — tính năng "gắn giáo án/buổi học vào bài tập" gần như không dùng được. *(`AssignmentsPage.tsx`)*
- **[Trung bình]** 2 màn hình dành cho phụ huynh (Bài tập, Thông báo) không hiển thị trạng thái "đang tải" hay "có lỗi" khi có sự cố — khác với phần còn lại của hệ thống vốn luôn có đủ 3 trạng thái tải/lỗi/rỗng. *(`ViewerAssignmentsPage.tsx, ViewerAnnouncementsPage.tsx`)*
- **[Trung bình]** Có một màn hình "Thông báo" kiểu cũ không còn được dùng (đã thay bằng màn hình Trò chuyện) — nếu vô tình dùng lại, cũng thiếu bước lưu lịch sử đăng bài như màn hình hiện tại. *(`StaffAnnouncementsPage.tsx`)*

##### Module Học phí / Hóa đơn — *Nghiêm trọng*

Có lỗ hổng bảo mật liên quan (xem mục Bảo mật) cộng thêm một lỗi giao diện khiến phụ huynh có thể "báo đã chuyển khoản" nhưng không hề biết nếu việc báo đó thất bại.

Điểm mạnh:

- Màn hình quản lý hóa đơn phía nhân viên đầy đủ trạng thái tải/lỗi/rỗng, và quan trọng hơn: các trường số tiền/tài khoản ngân hàng được khóa ở tầng bảo mật dữ liệu chứ không chỉ ở giao diện — đúng nguyên tắc bảo mật thật nằm ở tầng dữ liệu.

Vấn đề:

- **[Cao]** Trang "Đóng học phí" của phụ huynh không có trạng thái tải/lỗi, và khi phụ huynh bấm "Tôi đã chuyển khoản" mà việc ghi nhận bị từ chối (ví dụ hóa đơn đã được đánh dấu thanh toán trước đó), màn hình KHÔNG báo lỗi gì — phụ huynh sẽ tưởng đã báo thành công. *(`ViewerTuitionPage.tsx`)*
- **[Trung bình]** Mã hóa đơn (dùng làm nội dung chuyển khoản) chỉ ghép từ mã học viên + tháng/năm, không có số thứ tự phân biệt. Nếu một học viên có 2 hóa đơn trong cùng tháng, cả hai sẽ có CÙNG nội dung chuyển khoản — nhân viên đối soát ngân hàng không phân biệt được khoản nào là khoản nào. *(`utils/payment.ts (createInvoiceCode)`)*

##### Đăng nhập, Người dùng & Phân quyền — *Tốt*

Luồng đăng nhập và nhận lời mời tài khoản được làm cẩn thận, đúng thứ tự để tránh lộ nội dung trước khi xác thực xong. Điểm cần dọn dẹp là một module Người dùng phiên bản cũ bị bỏ quên.

Điểm mạnh:

- Màn hình được bảo vệ chỉ hiển thị nội dung sau khi đã xác nhận XONG cả trạng thái đăng nhập lẫn vai trò người dùng — không có tình trạng "lóe" nội dung nhạy cảm trước khi kiểm tra quyền xong, một lỗi rất dễ mắc nhưng đã xử lý đúng.
- Luồng nhận lời mời tài khoản mới an toàn trước tình huống bấm 2 lần liên tiếp, nhờ dùng một thao tác ghi gộp và cờ chặn ghi lại.

Vấn đề:

- **[Trung bình]** Có nguyên một bộ 5 file (trang + component con) của module Quản lý người dùng phiên bản CŨ không còn dùng ở đâu (đã thay bằng phiên bản mới) nhưng vẫn còn trong kho mã nguồn — dễ khiến người sửa code sau này nhầm sửa nhầm file. *(`UsersPage.tsx và 4 file liên quan`)*

##### Fanpage / Trò chuyện / Tin nhắn — *Tốt*

Không phát hiện rò rỉ thông tin bí mật nào trong mã nguồn — điểm rất đáng khen cho một tính năng tích hợp bên thứ ba. Việc đăng bài lên Fanpage được ghi lại đầy đủ lịch sử, kể cả khi thất bại.

Điểm mạnh:

- Không tìm thấy mật khẩu, khóa bí mật hay token nào bị viết cứng trong mã nguồn phía trình duyệt — đúng nguyên tắc bảo mật cho tích hợp Facebook/Messenger.
- Mỗi lần đăng bài lên Fanpage (kể cả thất bại) đều được lưu lịch sử với mã lỗi cụ thể — nhân viên luôn biết bài nào thành công, bài nào thất bại, không phải đoán.
- Mục Cài đặt giao diện trung thực thông báo tính năng nào "chưa hoàn thiện, sẽ có ở bản sau" thay vì giả vờ hoạt động — tránh gây hiểu nhầm.

Vấn đề:

- **[Thấp]** Có đoạn code kết nối trực tiếp cơ sở dữ liệu nằm trong màn hình dùng chung (đã liệt kê ở mục Kiến trúc) — ở đây nó liên quan đến hiển thị thông báo. *(`Topbar.tsx`)*

##### Vệ sinh kho mã nguồn & Quy trình kiểm thử — *Cần cải thiện*

Quy trình kiểm tra tự động trước khi gộp code khá đầy đủ. Tuy nhiên độ phủ kiểm thử tự động cho logic nghiệp vụ còn khá mỏng, và kho mã nguồn đang chứa nhiều tài liệu tham khảo không liên quan đến sản phẩm.

Điểm mạnh:

- Có quy trình kiểm tra tự động chạy trên mỗi lần đẩy code: kiểm tra kiểu dữ liệu, kiểm tra style, chạy test, chạy riêng bộ test luật bảo mật, và build thử — đầy đủ hơn nhiều dự án cùng quy mô.
- Bộ kiểm thử luật bảo mật khá dày dặn với 11 file kiểm thử theo từng giai đoạn/chủ đề, bao phủ tốt các tình huống phân quyền.

Vấn đề:

- **[Trung bình]** Chỉ có 6 file kiểm thử tự động cho logic nghiệp vụ (không tính luật bảo mật) trong khi có 156 file mã nguồn — độ phủ kiểm thử cho logic ứng dụng còn khá mỏng so với phần luật bảo mật. *(`src/**/*.test.ts`)*
- **[Thấp]** Một thư mục tài liệu tham khảo trong kho mã nguồn đang chứa khoảng 910 file — phần lớn sao chép nguyên vẹn từ các dự án mã nguồn mở khác (không phải mã nguồn của Edumatrix), làm phình to kho mã nguồn chính. *(`Agents Instuctions/`)*
- **[Thấp]** Thư mục tài liệu kế hoạch đang có hơn 40 file tích lũy qua nhiều đợt nâng cấp — lập kế hoạch trước khi code là thói quen tốt, nhưng nên gom các kế hoạch đã hoàn thành vào một thư mục lưu trữ riêng để dễ tìm tài liệu còn hiệu lực. *(`docs/`)*

#### Phương pháp thực hiện

Bốn kỹ sư AI (mô hình Claude) rà soát độc lập song song: (1) kiến trúc & tầng dữ liệu dùng chung, (2) luật bảo mật Firestore, (3) nhóm phân hệ Học viên/Lớp học/Môn học/Lịch học/Điểm danh/Giáo án, (4) nhóm phân hệ Thông báo/Bài tập/Đăng nhập/Học phí/Người dùng/Fanpage. Mỗi phát hiện chỉ được giữ lại khi đọc thấy trực tiếp trong mã nguồn thực tế, không suy đoán.

**Những gì KHÔNG được rà soát:** hiệu năng khi tải nặng (load test), giao diện trên từng trình duyệt/thiết bị thật, phong cách trình bày code (để lint tự động lo).

> Đây là báo cáo chỉ đọc — không có dòng mã nguồn nào bị chỉnh sửa trong quá trình rà soát. Mọi đề xuất cần được xác nhận và thực hiện riêng ở một phiên làm việc khác.
---

## 5. 19/07/2026 — Báo cáo Audit mã nguồn Spark (sau sửa)

_Nguồn gốc: `BAO-CAO-AUDIT-MA-NGUON-SPARK-19-07-2026.html` — bản HTML gốc đã chuyển vào `docs/Infographic/`. Đây là bản audit mới nhất, xác nhận trạng thái sau khi remediation các phát hiện ở mục 1-4 hoàn tất._

Audit sau sửa chữa · cập nhật 19/07/2026

### Mã nguồn đã sẵn sàng triển khai.

Toàn bộ hạng mục sửa code đã hoàn tất và kiểm thử xanh. Phát hành thật
còn cần cấu hình Firebase, Google và Meta trong Console.

A-

#### Local-ready, kiểm thử xanh

Không còn P0 hoặc P1 mở trong mã nguồn. Năm xác nhận production được giữ
riêng và chưa đánh dấu hoàn tất.

#### Kết luận điều hành

Giữ nguyên React, Vite, Firebase Auth, Firestore và Hosting. Messenger
tiếp tục qua Worker với nonce dùng một lần; Google Drive hoạt động phía
client với token chỉ giữ trong bộ nhớ.

**0**P0/P1 còn mở trong code **28/33**Roadmap hoàn tất bằng mã nguồn
**51/51**Frontend unit tests pass **18/18**Worker tests pass

#### Phát hiện và trạng thái xử lý

Nội dung chi tiết lưu lại bằng chứng tại thời điểm audit ban đầu. Nhãn
trạng thái cho biết kết quả sau khi remediation hoàn tất.

**28 hạng mục đã hoàn tất bằng thay đổi mã nguồn**

Năm mục còn lại cần quyền production thật: App Check enforcement, cảnh
báo Spark, Google Cloud, cấu hình Drive công khai và QA Admin có đăng
nhập.

[Mở checklist production](./CHECKLIST-TRIEN-KHAI-PRODUCTION.md)

##### **[P0]** Liên kết Messenger có thể bị chiếm

Ranh giới danh tính và dữ liệu phụ huynh · đã sửa bằng nonce 128 bit và
kiểm tra teacher scope Đã xử lý: frontend yêu cầu Worker tạo nonce 128
bit hạn 24 giờ; webhook tiêu thụ nonce bằng atomic commit, chặn tái sử
dụng, ghi đè PSID và giáo viên ngoài phạm vi phân công.

Frontend đưa Firebase UID trực tiếp vào tham số referral. Worker tin UID
nhận từ Meta rồi dùng service account ghi kết nối. Meta signature chỉ
chứng minh webhook đến từ Meta, không chứng minh người gửi sở hữu UID
đó.

###### Bằng chứng mã nguồn

  - [src/services/integrations/messenger.ts](../src/services/integrations/messenger.ts)
    chỉ tạo link từ nonce Worker trả về.
  - [workers/messenger/src/index.ts](../workers/messenger/src/index.ts)
    xác thực nonce, parent-student và teacher scope.

**Đề xuất nổi bật**Dùng nonce ngẫu nhiên 128 bit, hết hạn và chỉ tiêu
thụ một lần. Worker ánh xạ nonce sang UID rồi xóa hoặc đánh dấu đã
dùng.

##### **[P0]** Workspace từng không build được

Đã hoàn thiện notification\_reads, Rules và toàn bộ cổng kiểm thử Đã xử
lý: bổ sung collection constant, Security Rules, index và rules tests.
Lint, typecheck, 51 unit tests, Rules emulator và production build đều
pass.

`notifications.ts` dùng `COLLECTIONS.NOTIFICATION_READS` nhưng constant
chưa tồn tại. Sau khi thêm constant, Firestore vẫn từ chối vì chưa có
rule cho collection mới.

###### Bằng chứng mã nguồn

  - [src/services/firestore/notifications.ts:65](../src/services/firestore/notifications.ts#L65)
    và dòng 93 sử dụng constant thiếu.
  - [src/constants/collections.ts:5](../src/constants/collections.ts#L5)
    chưa khai báo collection.
  - [firebase/firestore.rules:833](../firebase/firestore.rules#L833)
    deny mặc định mọi collection chưa khai báo.

**Đề xuất nổi bật**Hoàn thiện cả constant, Security Rules, rules test và
query index trong cùng một thay đổi. Nếu tính năng chưa cần, gỡ code
notification mới để khôi phục build trước.

##### **[P1]** Query bài tập của Teacher từng không khớp Rules

Đã scope theo classId và có list-query emulator tests Đã xử lý:
assignments được query theo danh sách lớp giáo viên phụ trách; emulator
chứng minh Admin, Teacher và Viewer chỉ nhận đúng tập dữ liệu.

Rules chỉ cho Teacher đọc bài tập thuộc lớp được phân công, nhưng
`listAssignments()` query toàn bộ collection. Firestore đánh giá tập kết
quả tiềm năng và có thể từ chối toàn bộ query.

  - [src/services/firestore/assignments.ts:42](../src/services/firestore/assignments.ts#L42)
    query toàn bộ assignments.
  - [firebase/firestore.rules:667](../firebase/firestore.rules#L667)
    giới hạn quyền theo class.

**Đề xuất nổi bật**Lấy danh sách lớp được phân công rồi query
assignments theo từng `classId`. Dùng cùng pattern đang có trong
`listSessions()`.

##### **[P1]** Giáo án và submissions từng sai query scope

Đã đồng bộ điều kiện query với Security Rules Đã xử lý: giáo án và
submissions dùng class scope/createdBy phù hợp; query rules tests chạy
list query thật thay vì chỉ đọc document đơn.

`listLessonPlans()` tải toàn bộ giáo án trong khi Rules chỉ cho phép
giáo án do Teacher tạo hoặc thuộc lớp được phân công.
`listSubmissions()` chỉ lọc assignmentId dù quyền được xác định bởi
classId.

  - [src/services/firestore/lessonPlans.ts:53](../src/services/firestore/lessonPlans.ts#L53).
  - [src/services/firestore/assignments.ts:90](../src/services/firestore/assignments.ts#L90).
  - [firebase/firestore.rules:609](../firebase/firestore.rules#L609) và
    [dòng 680](../firebase/firestore.rules#L680).

**Đề xuất nổi bật**Thêm query theo classId hoặc createdBy. Bổ sung
emulator test cho list query thật, không chỉ document read.

##### **[P1]** Lưu điểm cả lớp từng có thể thành công một phần

Đã chuyển sang một transaction toàn lớp Đã xử lý: validate toàn bộ đầu
vào trước transaction, chặn studentId trùng, giới hạn 200 bản ghi và
commit score cùng summary trong một transaction.

Mỗi học sinh mở một transaction riêng. Nếu một entry ở giữa lỗi, những
entry trước đã commit. Hàm cũng chưa chặn studentId trùng và đang bị nén
thành một dòng rất khó review.

  - [src/services/firestore/scores.ts:6](../src/services/firestore/scores.ts#L6).
  - [src/services/firestore/scores.test.ts](../src/services/firestore/scores.test.ts#L1)
    thể hiện kỳ vọng transaction toàn lớp và validation.

**Đề xuất nổi bật**Validate toàn bộ input trước khi mở transaction, từ
chối student trùng, rồi đọc và ghi tất cả score cùng summary trong một
transaction.

##### **[P1]** Summary phía client từng thiếu xác thực Rules

Đã siết schema, range, totals và immutable fields Đã xử lý: attendance,
assignment và student summary có schema/range checks; totals và quan hệ
class-student được kiểm thử trên emulator.

Staff có thể ghi count tùy ý vào các summary. Rules chưa kiểm tra count
không âm, tổng trạng thái, quan hệ với document nguồn hoặc học sinh có
thuộc lớp hay không.

  - [attendance\_summaries tại dòng
    654](../firebase/firestore.rules#L654).
  - [assignment\_summaries tại dòng
    709](../firebase/firestore.rules#L709).
  - [student\_summaries tại dòng 734](../firebase/firestore.rules#L734).

**Đề xuất nổi bật**Thêm schema, range và immutable checks. Với summary
quan trọng, dùng transaction hoặc `getAfter()` để xác thực trạng thái
sau batch.

##### **[P1]** Các nghiệp vụ liên quan từng chưa atomic

Đã batch assignment, summary, lesson plan và announcement Đã xử lý: các
write không cần đọc dữ liệu hiện tại dùng batch; score và summary phụ
thuộc trạng thái hiện tại dùng transaction.

Tạo assignment và summary, cập nhật session và announcement, publish
lesson plan và public summary đều chạy thành các write độc lập.

  - [assignments.ts:22](../src/services/firestore/assignments.ts#L22).
  - [sessions.ts:78](../src/services/firestore/sessions.ts#L78).
  - [lessonPlans.ts:11](../src/services/firestore/lessonPlans.ts#L11).
  - [attendance.ts:47](../src/services/firestore/attendance.ts#L47).

**Đề xuất nổi bật**Tạo document reference trước rồi dùng write batch cho
các write không cần đọc. Chỉ dùng transaction khi kết quả phụ thuộc dữ
liệu hiện tại.

##### **[P2]** Audit log không phải bằng chứng đáng tin cậy

Bất biến nhưng vẫn do client tự khai báo

Rules chỉ khóa actorUid. Client vẫn tự chọn action, actorEmail,
targetId, meta và createdAt. Ghi log chạy sau thao tác chính và lỗi bị
bỏ qua.

  - [firebase/firestore.rules:464](../firebase/firestore.rules#L464).
  - [src/services/firestore/auditLog.ts:11](../src/services/firestore/auditLog.ts#L11).

**Đề xuất**Đổi cách gọi thành activity log nếu vẫn client-only. Chỉ dùng
log Worker hoặc backend cho sự kiện cần bằng chứng kiểm toán.

##### **[P2]** Telemetry từng tiêu tốn quota Spark

Đã xóa usage telemetry và giảm heartbeat còn một lần mỗi phiên Đã xử lý:
xóa usage\_events/account\_activity writes khỏi client, giữ lastLoginAt
một lần mỗi phiên và dùng Firebase Console làm nguồn quota.

Mỗi tab active ghi account activity sau mỗi 5 phút. Khoảng 200 người
dùng mở 8 giờ tạo gần 19.200 writes mỗi ngày, chưa tính nghiệp vụ.
Usage telemetry còn dùng transaction để ghi số read/write ước tính.

  - [AuthContext.tsx:120](../src/features/auth/context/AuthContext.tsx#L120).
  - [usage.ts:57](../src/services/firestore/usage.ts#L57).

**Đề xuất nổi bật**Bỏ usage telemetry tự ghi. Chỉ giữ lastLoginAt hoặc
heartbeat một lần mỗi phiên, vì Firebase Console mới là nguồn quota
chính thức.

##### **[P2]** Messenger không phải kiến trúc client-only

Cloudflare Worker là ngoại lệ cần thiết

Worker giữ Meta access token, app secret và Firebase private key. Đây là
server-side code, nhưng chuyển các secret này xuống client sẽ tạo lỗi
bảo mật nghiêm trọng.

**Đề xuất**Ghi rõ ngoại lệ kiến trúc: nghiệp vụ lõi client-side, tích
hợp Messenger chạy qua Worker. Nếu yêu cầu tuyệt đối không backend,
tắt module Messenger.

##### **[P2]** App Check cần enforcement trong Console

SDK đã khởi tạo nhưng chưa chứng minh enforcement

Code khởi tạo reCAPTCHA v3 đúng hướng. Tuy nhiên request chỉ bị bắt buộc
có App Check token sau khi bật enforcement trong Firebase Console.

  - [src/services/firebase/app.ts:30](../src/services/firebase/app.ts#L30).

**Đề xuất**Kiểm tra metrics trước, bật enforcement cho Firestore và
Authentication, rồi cân nhắc reCAPTCHA Enterprise cho integration mới.

##### **[P2]** Fan-out query có trần tăng trưởng thấp

Nhiều query theo từng lớp hoặc từng học sinh

Viewer dashboard và Teacher overview chạy nhiều query song song theo
classId hoặc studentId. Cách này hợp lý ở quy mô nhỏ nhưng số reads và
latency tăng tuyến tính theo số con, số lớp và số phiên.

**Đề xuất**Giữ mô hình hiện tại trên Spark. Chỉ tạo materialized view
khi đo được số query thực tế vượt ngưỡng, không thêm abstraction trước.

##### **[P1]** Google Drive đã hoàn tất ở mức code-ready

Đã có OAuth token-memory, Picker, upload, metadata và Rules; chờ Google
Cloud production Đã hoàn tất phần mã nguồn: Google Identity Services,
scope drive.file, Picker, multipart upload, files.get, metadata
Firestore và Rules bảo vệ liên kết riêng tư. Còn cấu hình Google Cloud
production.

Giao diện giáo án hiện cho phép kết nối Google, chọn tệp bằng Picker,
upload tệp mới vào thư mục quản lý, làm mới metadata, mở tệp và gỡ liên
kết. Access token không được lưu vào Firestore hoặc localStorage.

  - [googleDrive.ts](../src/services/integrations/googleDrive.ts) quản
    lý GIS token, Picker, upload và files.get.
  - [DriveLessonPlanAttachment.tsx](../src/features/lesson-plans/components/DriveLessonPlanAttachment.tsx)
    cung cấp đầy đủ trạng thái kết nối và lỗi.
  - [lessonPlans.ts](../src/services/firestore/lessonPlans.ts) lưu
    metadata Drive có cấu trúc.

**Bước production còn lại**Bật Drive API và Picker API, cấu hình OAuth
origins/API-key restrictions, điền ba biến public và lưu `driveFolderId`
trong workspace Tích hợp.

#### Những quyết định hợp lý

Các nền tảng này nên được giữ nguyên trong quá trình sửa lỗi. Không cần
viết lại kiến trúc.

##### Deny by default

Collection không khai báo bị từ chối, route guard được xem đúng là UX
chứ không phải bảo mật.

##### Ownership rõ ràng

Admin, Teacher và Viewer được phân tách theo lớp, học sinh và vai trò.

##### ID xác định

Enrollment, attendance, submission và payment dùng ID ổn định để hạn chế
ghi trùng.

##### Batch đúng chỗ

Enrollment, payment reconciliation và grading đã dùng batch hoặc
transaction cho bất biến liên quan.

##### Query có giới hạn

Phần lớn query có limit, dashboard Viewer đi theo student và class thay
vì tải toàn bộ collection.

##### Cache có chủ đích

React Query có staleTime, tắt refetch khi focus và Firestore bật offline
persistence.

##### Secret được tách đúng

Frontend chỉ chứa Firebase Web config công khai. Meta secret và service
account nằm trong Worker secrets.

##### App Check sẵn sàng

reCAPTCHA provider và debug token development được tách đúng môi trường.

##### Rules test có chiều sâu

Emulator tests bao phủ nâng quyền, immutable fields, payment, teacher
scope và ownership.

##### CI tách frontend và Worker

Lint, typecheck, test, rules, build và worker audit đã có luồng kiểm tra
riêng.

#### Mức phù hợp Firebase Spark

Auth, Firestore và Hosting phù hợp cho quy mô nhỏ nếu giảm write nền và
không dùng Firebase Storage.

##### Cloud Firestore miễn phí

  - Document reads  
    50.000/ngày
  - Document writes  
    20.000/ngày
  - Document deletes  
    20.000/ngày
  - Dữ liệu lưu trữ  
    1 GiB
  - Outbound transfer  
    10 GiB/tháng

##### Hosting và Authentication

  - Hosting storage  
    10 GB
  - Hosting transfer  
    10 GB/tháng
  - Password reset email  
    150/ngày
  - Verification email  
    1.000/ngày
  - App Check  
    Phù hợp

##### Firebase Storage không còn dùng được trên Spark

Từ 03/02/2026, Cloud Storage for Firebase yêu cầu Blaze. Repo hiện không
import Storage nên chưa bị ảnh hưởng. Mọi tính năng upload tệp trong
tương lai phải dùng dịch vụ khác hoặc nâng gói.

#### Tích hợp Google Drive cho giáo án

Phần mã nguồn đã triển khai xong theo mô hình client-side và Firebase
Spark. Mọi thao tác Drive đều do người dùng đã đăng nhập Google chủ động
thực hiện.

##### Luồng lưu giáo án

  - 1\. Kết nối  
    Google Identity Services cấp access token ngắn hạn
  - 2\. Chọn hoặc tải lên  
    Google Picker và Drive REST API
  - 3\. Đặt vị trí  
    `parents: [driveFolderId]`
  - 4\. Lưu Firestore  
    File ID, tên, MIME type, link và thời gian sửa
  - 5\. Gọi lại  
    Kiểm tra metadata rồi mở `webViewLink`

##### Dữ liệu cần lưu trong lesson plan

  - driveFileId  
    ID ổn định để gọi lại tệp
  - driveFileName  
    Tên hiển thị trong giao diện
  - driveMimeType  
    Phân biệt Docs, PDF và tệp tải lên
  - driveWebViewLink  
    Liên kết mở trong Google Drive
  - driveModifiedTime  
    Phát hiện metadata đã thay đổi

##### Nguyên tắc bảo mật bắt buộc

Dùng scope `drive.file` thay vì quyền đọc toàn bộ Drive. Không lưu
access token hoặc refresh token trong Firestore, localStorage hay source
code. Tệp nằm trong thư mục Drive do nhà trường quản lý và chỉ chia sẻ
cho đúng tài khoản nhân sự; không đưa liên kết riêng tư vào
`lesson_plan_public`.

##### Client-only làm được

Kết nối tài khoản khi bấm nútCÓ Chọn tệp Drive hiện cóCÓ Tải tệp mới vào
thư mụcCÓ Mở lại giáo án bằng file IDCÓ

##### Cần Worker hoặc backend

Đồng bộ nền khi không có người dùngKHÔNG Giữ quyền truy cập dài hạnKHÔNG
Tự động chia sẻ theo lịchKHÔNG Xử lý refresh token bí mậtKHÔNG

#### Frontend Admin sau cập nhật

Đã redesign theo hướng targeted evolution: giữ route, AppShell, màu
thương hiệu và thói quen điều hướng; nâng cấp thứ bậc thông tin, trạng
thái tích hợp và khả năng xử lý lỗi.

##### Giữ lại từ giao diện hiện tại

  - Khung ứng dụng  
    AppShell, Sidebar responsive và điều hướng theo vai trò
  - Hệ thống nền  
    Tailwind token, Button, Panel, PageHeader và StatusBadge
  - Quản lý dữ liệu  
    React Query cho loading, error, cache và mutation
  - Nhận diện  
    Màu primary hiện tại, logo và cấu trúc route
  - Biểu tượng  
    Giữ Lucide để không trộn hai icon family trong một lần nâng cấp

##### Thay đổi trải nghiệm Admin

  - Tổng quan  
    Công việc cần xử lý, trạng thái hệ thống và thao tác nhanh
  - Tích hợp  
    Một workspace riêng cho Drive, Messenger và VietQR
  - Điều hướng Settings  
    Đồng bộ section vào URL để mở đúng màn hình từ cảnh báo
  - Phản hồi thao tác  
    Đủ loading, empty, success, expired, denied và retry
  - Mobile  
    Một cột, hành động chính luôn rõ và không có bảng tràn ngang

##### Hướng thiết kế được chọn

Đây là product UI mật độ vừa, không phải landing page. Giữ hệ thống
Tailwind sẵn có thay vì cài thêm Fluent hoặc Carbon. Mục tiêu là giảm
rủi ro và tránh trộn design system. Thiết lập đề xuất: variance 4,
motion 3, density 6.

##### Workspace tích hợp

Trạng thái cấu hình từng adapterHOÀN TẤT Kết nối, ngắt và kết nối lại
DriveHOÀN TẤT Lỗi gần nhất và hướng xử lýHOÀN TẤT Không hiển thị token
hoặc secretBẮT BUỘC

##### Trạng thái giao diện bắt buộc

Chưa cấu hìnhCÓ CTA Đang kết nốiCÓ LOADING Cần cấp lại quyềnCÓ HƯỚNG DẪN
Lỗi hoặc mất quyền truy cậpCÓ RETRY

#### Nhánh kết nối API sau tái cấu trúc

Mỗi tích hợp đã có adapter riêng và dùng chung lớp fetch nhỏ cho
timeout, parse response và chuẩn hóa lỗi. Không thêm provider framework
hoặc factory không cần thiết.

##### Luồng dữ liệu đã triển khai

  - UI Admin  
    Chỉ hiển thị trạng thái và phát sinh ý định người dùng
  - React Query hook  
    Cache, loading, retry có kiểm soát và invalidate
  - Integration adapter  
    Drive, Messenger hoặc VietQR tự quản payload riêng
  - requestJson  
    Timeout, JSON, status code và ApiError thống nhất
  - Đích gọi  
    Drive và VietQR gọi trực tiếp; Messenger đi qua Worker

##### Ranh giới xác thực

  - Firebase ID token  
    Chỉ gửi đến Messenger Worker đã cấu hình
  - Drive access token  
    Chỉ giữ trong memory của phiên trình duyệt
  - Public config  
    Client ID, API key giới hạn origin và folder ID
  - Secret  
    Chỉ tồn tại trong Worker secret hoặc secure broker
  - Log  
    Chỉ ghi code lỗi và request ID, không ghi token hay payload nhạy cảm

##### Hợp đồng lỗi chung, payload riêng

Chuẩn hóa lỗi thành `code`, `message`, `status` và `retryable`. Không ép
mọi API dùng chung một interface nghiệp vụ. GET có thể retry một lần;
mutation không tự retry để tránh gửi trùng.

##### Cấu trúc tối thiểu

services/api/request.tsDÙNG CHUNG
services/integrations/googleDrive.tsTRỰC TIẾP
services/integrations/messenger.tsWORKER
services/integrations/vietQr.tsTRỰC TIẾP

##### Chính sách lỗi

401 hoặc token hết hạnKẾT NỐI LẠI 403 hoặc sai quyềnHƯỚNG DẪN QUYỀN 404
tệp đã xóaGỠ LIÊN KẾT 429 hoặc lỗi tạm thờiBACKOFF

#### Kết quả kiểm tra tự động

Kết quả được chạy lại trực tiếp trên workspace sau khi hoàn tất
remediation ngày 19/07/2026.

##### Frontend

ESLintPASS Mojibake checkPASS Unit tests51/51 TypecheckPASS Production
buildPASS Production dependency audit0 lỗi Git diff format checkPASS

##### Firebase và Worker

Rules emulatorPASS Worker tests18/18 Worker dependency audit0 lỗi
Tracked frontend secretsKhông có Default deny ruleCó App Check
initializationCó

**Cập nhật thực thi 19/07/2026:** checklist mặc định đã đồng bộ với mã
nguồn. Các mục cần quyền Console/production vẫn để trống cho đến khi có
bằng chứng triển khai; xem `CHECKLIST-TRIEN-KHAI-PRODUCTION.md`.

#### Roadmap và checklist triển khai

Đánh dấu công việc đã hoàn tất. Tiến độ được lưu trong localStorage của
trình duyệt này.

##### Đóng ranh giới tin cậy

Ưu tiên P0P0: 0/3 **Thay UID referral bằng
nonce**Nonce 128 bit, hết hạn, dùng một lần và không
ghi đè connection ngoài quy trình. **Thêm test chống chiếm liên
kết**Kiểm tra nonce sai, hết hạn, tái sử dụng và
ghi đè UID khác. **Hoàn thiện
notification\_reads**Constant, Rules, rules test,
index và unit test phải đi cùng nhau.

##### Khôi phục tính đúng đắn

Ưu tiên P1P1: 0/4 **Scope assignments theo
classId**Teacher chỉ query các lớp được phân
công. **Scope lesson plans và
submissions**Query phải chứng minh được cùng điều
kiện với Rules. **Thêm query rules
tests**Chạy list query thật cho Admin, Teacher và
Viewer. **Làm CI xanh hoàn toàn**Lint,
typecheck, unit, rules, worker và build đều pass.

##### Làm write nguyên tử

Ưu tiên P1P1: 0/4 **Transaction toàn bộ lần lưu
điểm**Validate trước, chặn trùng và không để
thành công một phần. **Batch assignment và
summary**Tạo document reference trước khi
commit. **Batch public summary và
announcement**Gộp các write liên quan nếu không cần
đọc dữ liệu hiện tại. **Siết schema summary trong
Rules**Range, immutable fields, total và quan hệ
class/student.

##### Bảo vệ ngân sách Spark

Ưu tiên P2P2: 0/4 **Bỏ usage telemetry tự ghi**Dùng
Firebase Console làm nguồn quota chính thức. **Giảm account
heartbeat**Chỉ ghi last login hoặc một lần mỗi
phiên. **Bật App Check enforcement**Theo dõi
metrics trước khi enforce Firestore và Authentication. **Thiết
lập ngưỡng vận hành**Cảnh báo nội bộ trước 70%
read, write và Hosting transfer quota.

##### Kết nối Google Drive

Ưu tiên P1P1: 0/6 **Cấu hình Google Cloud**Bật Drive
API và Picker API, cấu hình OAuth consent cùng authorized JavaScript
origins. **Khai báo cấu hình public**Thêm
Google client ID, Picker API key và driveFolderId; tuyệt đối không thêm
client secret. **Tạo token client trong bộ
nhớ**Xin scope drive.file từ thao tác bấm nút và
yêu cầu kết nối lại khi token hết hạn. **Tích hợp Picker và
upload**Cho phép chọn tệp hiện có hoặc tải tệp mới
vào thư mục giáo án. **Mở rộng schema và
Rules**Lưu metadata Drive có cấu trúc, giữ
attachmentUrl trong giai đoạn chuyển đổi và không công khai link riêng
tư. **Kiểm thử lỗi Drive**Bao phủ hủy đăng
nhập, token hết hạn, tệp bị xóa, sai quyền, upload lỗi và thư mục không
tồn tại.

##### Nâng cấp Frontend Admin

Ưu tiên P1P1: 0/6 **Chốt UI baseline**Ghi lại route,
token, component, breakpoint và hành vi cần giữ trước khi
redesign. **Sắp xếp lại Admin Overview**Ưu
tiên việc cần xử lý, trạng thái vận hành và thao tác thường
dùng. **Tạo workspace Tích hợp**Drive,
Messenger và VietQR có trạng thái, hành động và lỗi riêng. **Đồng
bộ Settings với URL**Cho phép deep-link đến
integrations và giữ tab khi tải lại trang. **Hoàn thiện trạng
thái UI**Loading, empty, success, expired, denied,
retry và keyboard focus. **QA desktop và
mobile**Kiểm tra 360, 768, 1024 và 1440 px, light
mode, dark mode cùng reduced motion.

##### Chuẩn hóa nhánh API

Ưu tiên P1P1: 0/6 **Tạo requestJson tối
thiểu**Timeout, AbortSignal, JSON parsing và
ApiError; không thêm axios. **Tạo Google Drive
adapter**Token, Picker, files.create, files.get và
metadata mapping. **Di chuyển API hiện
có**Đưa Messenger và VietQR vào integrations mà
không đổi payload nghiệp vụ. **Chuẩn hóa hợp đồng
lỗi**Code, message, status và retryable dùng nhất
quán trên UI. **Kiểm tra ranh giới
token**Firebase token đến Worker, Drive token ở
memory và không log dữ liệu nhạy cảm. **Kiểm thử failure
matrix**401, 403, 404, 429, timeout, invalid JSON,
abort và mutation không gửi trùng.

#### Tài liệu đối chiếu chính thức

Các giới hạn Spark, Security Rules và mô hình kết nối Google Drive được
đối chiếu với tài liệu chính thức hiện hành.

[**Cloud Firestore quotas**Free quota, storage, reads, writes và
transfer.](https://firebase.google.com/docs/firestore/quotas)
[**Securely query data**Rules are not filters và cách query phải khớp
Rules.](https://firebase.google.com/docs/firestore/security/rules-query)
[**Transactions and batched writes**Atomic writes, retry và giới hạn
document access trong
Rules.](https://firebase.google.com/docs/firestore/manage-data/transactions)
[**Firebase pricing plans**Khả năng và giới hạn của Spark so với
Blaze.](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
[**Firebase Hosting quotas**Storage, transfer và hành vi khi Spark vượt
quota.](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
[**Firebase Authentication limits**Email verification, password reset và
account limits.](https://firebase.google.com/docs/auth/limits) [**App
Check for Web**Provider, metrics, debug và
enforcement.](https://firebase.google.com/docs/app-check/web/recaptcha-provider)
[**Cloud Storage billing requirement**Blaze bắt buộc từ
03/02/2026.](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
[**Google Identity token model**Access token ngắn hạn cho ứng dụng web
client-side.](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
[**Google Drive scopes**Phạm vi drive.file và nguyên tắc xin quyền tối
thiểu.](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
[**Google Picker**Chọn và tải tệp Drive từ ứng dụng
web.](https://developers.google.com/workspace/drive/api/guides/picker)
[**Drive files.create**Media, multipart và resumable
upload.](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/create)

Báo cáo tạo từ audit trực tiếp workspace EduMatrix VN ngày 19/07/2026.
Phạm vi: Frontend Admin React/Vite, nhánh API, Google Drive, Firebase
Auth, Firestore Rules, Cloudflare Messenger Worker, tests, build và giới
hạn Spark.
