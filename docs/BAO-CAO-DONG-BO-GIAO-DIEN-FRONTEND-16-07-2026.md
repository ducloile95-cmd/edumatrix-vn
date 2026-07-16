# Báo cáo kiểm tra & đồng bộ giao diện Frontend — 16/07/2026

Phạm vi: toàn bộ `src/` (React + Tailwind + Recharts), đối chiếu với token trong `tailwind.config.ts` và `src/index.css`. Đã sửa trực tiếp các mục đánh dấu **[Đã sửa]**; các mục còn lại là đề xuất, chưa đụng vào code vì cần bạn quyết định hoặc cần QA hình ảnh trước khi đổi.

## 1. Cấu hình bị nhân bản, dễ lệch nhau [Đã sửa 1 phần]

`tailwind.config.{js,ts,d.ts}` và `vite.config.{js,ts,d.ts}` tồn tại song song. Nguyên nhân gốc: `tsconfig.node.json` bật `composite: true` cho 2 file `.ts` này mà không có `outDir`, nên mỗi lần có tiến trình chạy `tsc -b` (build theo project reference), TypeScript biên dịch `.ts` thành `.js`/`.d.ts` ngay cạnh file nguồn và các file này bị commit nhầm vào git.

Hậu quả thực tế: `vite.config.js` (bản mà Vite thực sự nạp, vì Vite ưu tiên `.js` trước `.ts`) đã bị sửa tay để thêm `chunkSizeWarningLimit: 650`, còn `vite.config.ts` (bản "nguồn" có type-check) thì không có — hai file chạy khác hành vi nhau mà không ai biết.

**Đã sửa**: thêm `"outDir": "./.tsc-out/node"` vào `tsconfig.node.json` để chặn tái phát; đồng bộ nội dung `vite.config.ts` với `vite.config.js` (đã có `chunkSizeWarningLimit`); thêm `.tsc-out/` và `*.tsbuildinfo` vào `.gitignore`.

**Chưa sửa được**: không xoá được `tailwind.config.js`, `tailwind.config.d.ts`, `vite.config.js`, `vite.config.d.ts` — sandbox của mình bị chặn quyền xoá file trên máy bạn. Bạn chạy giúp lệnh sau rồi commit:
```
rm tailwind.config.js tailwind.config.d.ts vite.config.js vite.config.d.ts tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo
```

## 2. Nút bấm (Button) tự phá vỡ token bo góc [Đã sửa]

`src/components/ui/Button.tsx`: class nền (`base`) đặt `rounded-input` cho mọi variant, nhưng variant `primary` tự ghi đè `rounded-xl` — hai class bo góc cùng áp lên một phần tử, thắng-thua phụ thuộc thứ tự Tailwind sinh CSS chứ không phải thứ tự trong code, tức là bo góc của nút primary có thể đổi bất ngờ giữa các lần build. Đã bỏ `rounded-xl` dư thừa, để tất cả variant dùng chung `rounded-input` như thiết kế.

## 3. Hai hệ nút icon song song, một hệ chết [Đã sửa]

Component `IconButton` xuất ra từ `Button.tsx` (bo góc `rounded-input`, viền `border-neutral-300`) không được import ở bất kỳ đâu trong codebase — hàng chết. Trong khi đó toàn bộ 8+ nơi cần nút icon (Sidebar, Topbar, Modal, InvoicesPage, StudentInfoDialog...) đều dùng class CSS toàn cục `.icon-button` (bo góc `rounded-xl`, nền kính mờ) định nghĩa ở `index.css`. Hai hệ khác bo góc, khác màu hover — nếu ai đó thật sự dùng `IconButton` sẽ ra giao diện lệch chuẩn ngay. Đã xoá `IconButton` chết, giữ `.icon-button` làm chuẩn duy nhất, đồng thời đổi bo góc của nó sang tên token (`rounded-card`, xem mục 5) cho nhất quán ngữ nghĩa dù giá trị pixel không đổi.

## 4. Màu biểu đồ/trạng thái bị chép tay ở 5 nơi [Đã sửa]

`src/components/charts/chartTheme.ts` là nơi lẽ ra tập trung toàn bộ mã màu hex dùng cho Recharts/inline-style (nơi không dùng được class Tailwind), nhưng trước đây chỉ có `CHART_PRIMARY`. Do đó 5 file tự chép lại đúng các mã hex trong `tailwind.config.ts` mỗi khi cần màu success/warning/danger/info:

- `LearningOverview.tsx` — bảng `FUNNEL_KEYS`, gradient biểu đồ, trục, lưới đều hardcode hex, kể cả một màu `#CBD8FF` không khớp bất kỳ bậc màu nào trong palette (giữa `primary-100` và `primary-200`).
- `AttendanceOverview.tsx`, `CatalogDashboard.tsx` — `STATUS_COLOR` chép tay.
- `InvoicesPage.tsx` — `fill="#16A34A"` hardcode dù file đã import `CHART_PRIMARY` từ chartTheme cho các biểu đồ khác.
- `StudentsList.tsx` (`ScoreRing`) — cả bảng `{accent, bg}` 5 tông màu bị chép tay riêng, dùng cho `conic-gradient` inline.

Rủi ro: nếu sau này đổi một mã màu trong `tailwind.config.ts`, 5 nơi này lệch màu ngay mà không ai biết vì chúng không tham chiếu tới nguồn chung.

**Đã sửa**: mở rộng `chartTheme.ts` thêm `CHART_SUCCESS/WARNING/DANGER/INFO/NEUTRAL`, `CHART_PRIMARY_SOFTER`, và 2 bảng tra `CHART_TONE_ACCENT`/`CHART_TONE_BG`; chuyển cả 5 file trên sang import từ đây thay vì hardcode. Màu `#CBD8FF` lệch chuẩn đã được đưa về đúng `primary-200` (`#BFD3FE`, gần như không khác biệt bằng mắt). `LearningOverview.tsx` còn được dọn thêm: các chart trước đó không dùng `CHART_AXIS_TICK`/`CHART_GRID_COLOR` có sẵn mà tự set `fill`/`stroke` tay — nay dùng lại.

## 5. Bo góc lệch chuẩn ở toàn bộ Sidebar + Topbar [Đã sửa]

Toàn hệ thống dùng 3 token ngữ nghĩa `rounded-input` (8px), `rounded-card` (12px), `rounded-modal` (16px) — StatCard, Modal, các trang feature đều theo đúng chuẩn này. Riêng khung điều hướng (`Sidebar.tsx`, `Topbar.tsx`) và `.icon-button` trong `index.css` lại dùng thang màu chung của Tailwind (`rounded-lg`, `rounded-xl`, `rounded-2xl`). Về mặt pixel, `rounded-lg` (8px) = `rounded-input`, `rounded-xl` (12px) = `rounded-card`, `rounded-2xl` (16px) = `rounded-modal` — nên hình ảnh không đổi, nhưng tên gọi trong code không nói lên hệ thống, khiến người sau dễ chọn nhầm giá trị khi thêm thành phần mới. Đã đổi toàn bộ 15 chỗ trong 2 file này (+ `.icon-button`) sang tên token ngữ nghĩa.

**Còn lại, chưa đổi** (rủi ro hình ảnh cần xác nhận trước): 12 chỗ dùng bo góc tuỳ ý không khớp token nào — `rounded-[7px]` (7 chỗ, chủ yếu góc trên của cột biểu đồ Recharts — có thể là chủ ý cho hiệu ứng "chip"), `rounded-[3px]`/`rounded-[6px]` (5 chỗ). Nên rà lại từng chỗ bằng mắt trước khi gộp vào token.

## 6. Viền active-state hardcode màu, lặp ở 2 nơi [Đã sửa]

`Sidebar.tsx` và `AssignmentsPage.tsx` cùng dùng `shadow-[inset_3px_0_0_#3366F0]` để vẽ vạch xanh bên trái mục đang chọn — cùng một giá trị hex chép tay ở 2 nơi độc lập. Đã đổi sang `shadow-[inset_3px_0_0_theme(colors.primary.500)]`, tham chiếu thẳng token thay vì hex rời.

## 7. Đề xuất còn mở (chưa áp dụng)

Những mục này ảnh hưởng diện rộng hoặc cần bạn xác nhận UX, nên chỉ liệt kê để cân nhắc, không tự sửa:

- **Component tái sử dụng thấp**: 45/– file dùng `<button>` thô, chỉ 19 file import component `Button`. Không phải tất cả sai (nhiều chỗ là tab/segment cần style riêng), nhưng đáng rà lại các nút hành động chính (submit, xác nhận, xoá) để dùng chung `Button` — nhất quán trạng thái `disabled`/`hover`/`focus` và dễ sửa 1 nơi khi đổi thiết kế.
- **11/22 trang không có breakpoint responsive nào** (`sm:`/`md:`/`lg:`) — gồm `StudentsPage`, `ClassesPage`, `AttendancePage`, `LearningPage`, `LessonPlansPage`. Đây là ứng dụng quản lý lớp học nhiều khả năng giáo viên/phụ huynh dùng trên điện thoại; nên có audit riêng cho mobile.
- **`docs/DESIGN-SYSTEM-v2.md`** (kế hoạch design-system nội bộ) ghi radius mục tiêu là `input 10 · card 14 · modal 18`, khác với giá trị đang chạy thật trong `tailwind.config.ts` (`8 · 12 · 16`). Không rõ tài liệu là bản nháp cũ hay là đích cần migrate tới — cần bạn chốt trước khi ai đó "sửa cho khớp doc" và vô tình đổi toàn hệ thống.
- **Accessibility**: phần này thực ra khá tốt — `StatusBadge` luôn đi kèm chữ chứ không chỉ dựa màu, `Modal` có focus-trap + `aria-modal` + khôi phục focus khi đóng, các nút icon đều có `aria-label`. Không có việc cần sửa gấp ở đây.

## 8. Lưu ý về quá trình sửa

Trong lúc chỉnh `Sidebar.tsx`, một lệnh `sed` chạy qua sandbox đã làm file bị cắt cụt cuối file (mất đoạn đóng thẻ `</aside>` và `);}`). Mình đã phát hiện qua `git diff` và phục hồi lại đúng nguyên bản (chỉ khác đúng các chỗ đổi tên class đã liệt kê ở mục 5, 6). Đã đọc lại toàn bộ file để xác nhận lành. Dù vậy, bạn nên chạy `npm run dev` và lướt qua Sidebar một lượt trước khi commit, vì môi trường sandbox của mình gặp trục trặc đồng bộ file khi thao tác trực tiếp qua shell (không phải qua công cụ edit) — không loại trừ hoàn toàn khả năng còn sót vấn đề tương tự ở nơi khác dù mình đã rà lại từng file đã sửa.
