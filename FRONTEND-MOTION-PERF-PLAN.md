# Kế hoạch nâng cấp chuyển cảnh & FPS — Edumatrix VN

Stack thực tế: React 18 + Vite 6 + React Router 6.26 + Tailwind 3.4 + TanStack Query 5 + Recharts + Firestore.
Không có framer-motion / GSAP trong `package.json` — toàn bộ motion hiện tại là CSS keyframes trong `src/index.css`.

**Nguyên tắc: không thêm dependency nào. Mọi thứ dưới đây làm được bằng CSS + API native + React Router có sẵn.**

---

## Phần 1 — Chẩn đoán: vì sao chuyển tab sidebar bị khựng

Xếp theo mức độ ảnh hưởng thực tế, không theo thứ tự phát hiện.

### 1.1 [NGHIÊM TRỌNG] AppShell nằm bên trong từng page

`AppShell` được import ở **18 page** (`StaffDashboardPage`, `StudentsPage`, `ClassesPage`, `SessionsPage`…), còn `router.tsx` render thẳng `<StaffDashboardPage />`.

Hệ quả mỗi lần bấm 1 mục sidebar:

- `Sidebar` unmount → remount: đọc lại `localStorage` 2 lần, dựng lại `Set` closedGroups, chạy lại `filterNavigation`, gắn lại 2 `document.addEventListener`.
- `SidebarClockWeather` remount → `setInterval(1000)` bị huỷ và tạo lại, `useWeather` chạy lại effect (may là có cache localStorage 30 phút, nếu không sẽ `fetch` open-meteo mỗi lần đổi tab).
- `Topbar` remount toàn bộ.
- Toàn bộ DOM sidebar (~40-60 node) bị xoá và dựng lại → 1 lần layout + paint toàn cột trái.

Đây là nguyên nhân số một. Sidebar về mặt hình ảnh "đứng yên" nên người dùng không thấy nó bị dựng lại — chỉ cảm nhận được độ khựng.

### 1.2 [NGHIÊM TRỌNG] `key={pathname}` trên `<main>`

```tsx
// AppShell.tsx:22
<main key={pathname} id="main-content" className="route-enter ...">
```

`key` đổi ⇒ React **huỷ toàn bộ cây con và dựng lại**, không reconcile. Cộng với `React.lazy` chưa resolve ⇒ Suspense fallback ⇒ cây bị dựng 2 lần cho 1 lần điều hướng.

### 1.3 [CAO] Khoảng chết 150ms trước khi có phản hồi

`RouteFallback` dùng `useDelayedPending(true, 150)`. Trong 150ms đầu sau khi click: **không có gì thay đổi trên màn hình**. Page cũ đã bị `key` xoá, skeleton chưa hiện. Đây chính là cảm giác "khựng" mà người dùng mô tả — không phải drop frame, mà là *độ trễ phản hồi*.

Chưa có prefetch chunk nào: `import()` của page chỉ bắt đầu sau khi click.

### 1.4 [CAO] `background-attachment: fixed` + 2 radial-gradient trên `<body>`

```css
/* index.css:15, 30-31 */
--grad-page: radial-gradient(...), radial-gradient(...), #fafaf9;
body { background: var(--grad-page); background-attachment: fixed; }
```

`background-attachment: fixed` buộc trình duyệt repaint gradient theo viewport ở **mỗi frame scroll**, và không thể promote lên compositor layer. Trên trang có bảng dài (StudentsPage, SessionsPage) đây là nguồn drop-frame chính khi cuộn. Kết hợp thêm `.glass-panel` (`backdrop-filter: blur(14px) saturate(150%)`) thì mỗi frame phải blur lại vùng phía sau.

### 1.5 [TRUNG BÌNH] Animation áp lên **mọi** dòng bảng

```css
/* index.css:94 */
main tbody > tr { animation: row-enter var(--motion-fast) var(--ease-enter) both; }
```

Selector không giới hạn số dòng. Bảng 200 học sinh ⇒ 200 animation chạy đồng thời khi mount. `both` giữ fill-mode nên style vẫn dính sau khi xong.

### 1.6 [TRUNG BÌNH] Sidebar animate `width` — thuộc tính layout

```tsx
// Sidebar.tsx:241
className="... transition-[transform,width] ... lg:w-[76px] / lg:w-[244px]"
```

`width` không chạy được trên compositor. Mỗi frame của animation collapse ⇒ reflow toàn bộ cây con sidebar **và** vùng main bên cạnh (do `lg:flex`). 200ms × 60fps = 12 lần full reflow.

### 1.7 [THẤP] Các điểm còn lại

- `html { scroll-behavior: smooth }` — mỗi lần đổi route/anchor kích hoạt animation cuộn không cần thiết.
- Hai thư viện icon cùng lúc: `lucide-react` **và** `@phosphor-icons/react`. Chỉ `lucide-react` đang được dùng thực tế trong layout.
- `gcTime` mặc định 5 phút: quay lại tab cũ sau 5 phút ⇒ mất cache ⇒ loading lại từ đầu.
- Dashboard 8 `useQuery`, ClassroomInteraction 9 `useQuery` — bắn song song lúc mount, không `placeholderData`, nên mỗi lần vào là skeleton trắng.
- `chunkSizeWarningLimit: 650` với `manualChunks` khá tốt rồi — phần này **không cần đụng**.

---

## Phần 2 — Kế hoạch nâng cấp

5 giai đoạn, xếp theo tỉ lệ *hiệu quả / công sức*. Có thể dừng sau Phase 2 và đã hết khựng.

### Phase 0 — Đo trước khi sửa (30 phút)

Không sửa gì. Ghi lại số liệu để so sánh.

1. Chrome DevTools → Performance → tick "Screenshots", CPU throttle **4x slowdown**.
2. Record: đăng nhập → click 5 mục sidebar liên tiếp → cuộn StudentsPage.
3. Ghi lại 4 con số:
   - **INP** khi click sidebar (mục tiêu < 200ms, hiện tại dự kiến 400–700ms)
   - Số **long task** > 50ms mỗi lần điều hướng
   - **FPS trung bình** khi cuộn bảng dài
   - Thời gian từ click → pixel đầu tiên đổi

Lưu screenshot flame chart vào `docs/perf/before/`.

### Phase 1 — Layout route: sửa gốc, diff nhỏ nhất (2–3 giờ)

Đây là thay đổi **quan trọng nhất**. Sidebar và Topbar sẽ không bao giờ unmount khi đổi tab.

**1.1** Đổi `AppShell` sang dùng `<Outlet/>`, bỏ `key={pathname}`:

```tsx
// AppShell.tsx
import { Outlet } from "react-router-dom";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(...);
  // bỏ useLocation, bỏ prop children

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar ... />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main id="main-content" className="w-full flex-1 px-3 py-3 sm:px-4 lg:px-5 lg:py-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

**1.2** Bọc các staff route bằng layout route trong `router.tsx`:

```tsx
<Route element={<RequireAuth><RequireRole roles={STAFF_ROLES}><AppShell /></RequireRole></RequireAuth>}>
  <Route path={ROUTES.STAFF_DASHBOARD} element={<StaffDashboardPage />} />
  <Route path={ROUTES.STAFF_STUDENTS} element={<StudentsPage />} />
  ...
</Route>
```

Lợi ích phụ: `RequireAuth` / `RequireRole` cũng thôi remount, và mỗi route bớt được 2 lớp component. Route riêng của Admin (`STAFF_USERS`) giữ `RequireRole` lồng bên trong.

**1.3** Xoá `import { AppShell }` và bỏ wrapper `<AppShell>` trong 18 page. Đây là phần tốn thời gian nhất nhưng thuần cơ học.

**1.4** Làm tương tự cho `ViewerShell`.

**Kỳ vọng:** đây một mình đã xoá bỏ ~70% cảm giác khựng.

### Phase 2 — Engine chuyển cảnh (2–3 giờ)

Không dùng framer-motion. Dùng **View Transitions API** native — Chrome/Edge 111+, Safari 18+, có degrade sạch trên Firefox.

**2.1** Prefetch chunk khi có ý định click (rẻ nhất, hiệu quả nhất):

```tsx
// Sidebar.tsx — trong component Leaf
const prefetch = () => ROUTE_PREFETCH[item.to]?.();

<NavLink to={item.to} onPointerEnter={prefetch} onFocus={prefetch} ... />
```

với một map nhỏ trong `router.tsx`:

```tsx
export const ROUTE_PREFETCH: Record<string, () => void> = {
  [ROUTES.STAFF_STUDENTS]: () => void import("@/features/students/pages/StudentsPage"),
  ...
};
```

Chuột di đến mục menu là chunk đã tải xong trước khi ngón tay bấm. Xoá luôn phần lớn thời gian chờ Suspense.

**2.2** Bật view transition trên NavLink (React Router 6.26):

```tsx
<NavLink to={item.to} unstable_viewTransition ... />
```

**2.3** Định nghĩa chuyển cảnh trong `index.css`, dùng đúng token motion đang có:

```css
@view-transition { navigation: auto; }

::view-transition-old(root) {
  animation: content-exit var(--motion-fast) var(--ease-exit) both;
}
::view-transition-new(root) {
  animation: content-enter var(--motion-standard) var(--ease-enter) both;
}

/* Sidebar + Topbar không tham gia chuyển cảnh — giữ chúng đứng yên tuyệt đối */
aside, header { view-transition-name: none; }

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
}
```

**2.4** Bọc điều hướng trong `startTransition` để React giữ page cũ hiển thị trong lúc chunk đang tải, thay vì chớp sang skeleton:

Đổi `RouteFallback` từ delay 150ms → hiển thị ngay nhưng chỉ khi thực sự cần (sau Phase 2.1 gần như không bao giờ chạy đến).

**2.5** Đánh dấu vùng nội dung để trình duyệt biết phạm vi transition:

```tsx
<main id="main-content" style={{ viewTransitionName: "page" }}>
```

**Kết quả:** sidebar tuyệt đối tĩnh, chỉ vùng nội dung fade-slide 200ms, mượt như app native. Zero dependency mới.

### Phase 3 — Ngân sách paint & composite (1–2 giờ)

**3.1** Bỏ `background-attachment: fixed`, chuyển gradient sang layer cố định riêng:

```css
body { background: #fafaf9; }           /* nền phẳng, repaint gần như miễn phí */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--grad-page);
  pointer-events: none;
}
```

Layer riêng ⇒ trình duyệt promote lên compositor ⇒ cuộn không repaint gradient nữa.

**3.2** Giới hạn animation dòng bảng còn 12 dòng đầu:

```css
main tbody > tr:nth-child(-n+12) { animation: row-enter var(--motion-fast) var(--ease-enter) both; }
```

Các dòng còn lại nằm dưới màn hình, không ai thấy animation của chúng.

**3.3** Bật `content-visibility` cho các section nặng (Recharts, bảng dài):

```css
.perf-section { content-visibility: auto; contain-intrinsic-size: auto 400px; }
```

Áp cho `ChartPanel` và các panel dashboard. Trình duyệt bỏ qua layout/paint cho phần ngoài viewport — đây là đòn hiệu quả nhất cho StaffDashboardPage.

**3.4** Sidebar collapse: animate `grid-template-columns` trên container thay vì `width` trên `<aside>`, hoặc chấp nhận `transition-none` cho width và chỉ fade nội dung. Cách rẻ nhất: bỏ `width` khỏi transition, giữ lại `transform` cho drawer mobile.

**3.5** Bỏ `scroll-behavior: smooth` trên `html`, chuyển sang chỉ áp khi cần (`.smooth-scroll`).

**3.6** Audit `.glass-panel`: chỉ giữ `backdrop-filter` ở Topbar/Modal (phần tử tĩnh, số lượng ít). Không dùng trong container có scroll.

### Phase 4 — Dữ liệu: giữ nội dung cũ thay vì skeleton trắng (1–2 giờ)

**4.1** `providers.tsx` — tăng `gcTime` để quay lại tab cũ là có ngay:

```ts
queries: { staleTime: 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false, retry: 1 }
```

**4.2** Với các query có filter (dashboard theo khoảng thời gian, danh sách có phân trang), thêm `placeholderData: keepPreviousData` — đổi filter sẽ giữ bảng cũ mờ đi thay vì nháy trắng.

**4.3** Prefetch dữ liệu dashboard cùng lúc với prefetch chunk ở Phase 2.1 (`queryClient.prefetchQuery` trong `onPointerEnter`) — tuỳ chọn, chỉ làm nếu Phase 1–3 chưa đủ.

### Phase 5 — Kiểm chứng (1 giờ)

Bắt buộc. Lười không có nghĩa là bỏ kiểm chứng.

1. Chạy lại đúng kịch bản Phase 0, cùng mức throttle 4x. So sánh 4 chỉ số.
2. Mục tiêu nghiệm thu:
   - INP click sidebar **< 200ms** (từ 400–700ms)
   - **0 long task > 50ms** khi đổi tab
   - **≥ 55 FPS** khi cuộn StudentsPage 200 dòng
   - Sidebar **không** hiện trong React DevTools Profiler khi đổi route
3. `npm run typecheck && npm run lint && npm run test`
4. Kiểm tra `prefers-reduced-motion` vẫn tắt được toàn bộ chuyển cảnh.

---

## Tóm tắt công sức

| Phase | Nội dung | Thời gian | Tác động |
|---|---|---|---|
| 0 | Đo baseline | 0.5h | — |
| 1 | Layout route (bỏ AppShell khỏi page) | 2–3h | **~70% độ khựng** |
| 2 | Prefetch + View Transitions | 2–3h | ~20% + cảm giác cao cấp |
| 3 | Paint budget (gradient, content-visibility) | 1–2h | FPS cuộn |
| 4 | Query cache & placeholderData | 1–2h | Bớt skeleton trắng |
| 5 | Kiểm chứng | 1h | — |

**Tổng: 8–12 giờ. Dependency mới: 0.**

---

## Những gì cố tình KHÔNG làm

- **Không thêm framer-motion.** ~40KB gzip cho thứ mà View Transitions API làm miễn phí. Thêm khi cần shared-element transition thật sự (ví dụ card học sinh mở thành trang chi tiết).
- **Không thêm thư viện virtualization.** `content-visibility: auto` giải quyết được ở quy mô hiện tại. Thêm `@tanstack/react-virtual` khi bảng vượt 500 dòng.
- **Không đụng `manualChunks`.** Cấu hình hiện tại đã tách hợp lý.
- **Không redesign giao diện.** Kế hoạch này chỉ nói về chuyển cảnh và FPS — bảng màu, typography, layout giữ nguyên.
- **Không gỡ `@phosphor-icons/react` ngay.** Dọn khi rảnh, không ảnh hưởng FPS runtime.
