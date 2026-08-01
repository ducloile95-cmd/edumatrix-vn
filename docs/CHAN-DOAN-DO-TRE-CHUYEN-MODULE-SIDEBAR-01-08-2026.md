# Chẩn đoán độ trễ khi chuyển module từ Sidebar

**Dự án:** Edumatrix VN
**Dự án tham chiếu:** `C:\Users\Admin\Desktop\Elinkgolf.LSC\firebase-live`
**Ngày kiểm tra:** 01/08/2026
**Phạm vi:** Điều hướng giữa các module trong Sidebar trên Staff, Admin, Giáo viên và portal Phụ huynh

## 1. Kết luận

Hiện tượng Edumatrix bị khựng vài giây khi chuyển module **không xuất phát từ thời lượng animation 400ms**. Độ trễ xảy ra trước hoặc trong lúc React chuẩn bị màn hình mới, chủ yếu do:

1. `Suspense` đang bọc toàn bộ cây route, nên khi chunk của trang chưa sẵn sàng, cả layout route có thể bị thay bằng fallback.
2. Các trang được tải bằng `React.lazy()` và chỉ bắt đầu prefetch khi hover/focus; một số route chưa được prefetch.
3. Prefetch hiện tại chỉ tải JavaScript, không tải trước dữ liệu Firestore.
4. Nhiều module khởi tạo từ 5 đến 8 truy vấn Firestore khi mount; một số truy vấn chạy nối tiếp do phụ thuộc dữ liệu trước đó.
5. Một số trang khóa toàn bộ nội dung ở trạng thái skeleton cho đến khi nhiều truy vấn cùng hoàn tất.

Elinkgolf tạo cảm giác tức thời vì các module đã nằm sẵn trong cùng một tài liệu HTML. Khi bấm Sidebar, hệ thống chỉ đổi class CSS để ẩn/hiện module rồi chạy animation.

## 2. Khác biệt kiến trúc

### 2.1. Elinkgolf

Trong `firebase-live/admin.html`, chuyển module được thực hiện bằng thao tác DOM trực tiếp:

```js
function nav(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  var pageEl = document.getElementById('pg-' + id);
  if (pageEl) pageEl.classList.add('active');
  if (el) el.classList.add('active');
}
```

CSS của trang:

```css
.page.active {
  display: block;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Biểu đồ được khởi tạo trễ 80ms sau khi chuyển module. Vì vậy, phản hồi điều hướng được ưu tiên trước công việc nặng.

### 2.2. Edumatrix

Luồng hiện tại:

```text
Bấm Sidebar
→ React Router đổi route
→ tải chunk JavaScript nếu chưa có trong cache
→ parse và mount component
→ khởi tạo các truy vấn Firestore
→ dựng bảng/biểu đồ
→ hiển thị dữ liệu hoàn chỉnh
```

Animation chuyển trang chỉ có thể tạo cảm giác mượt khi các bước tải code, truy vấn dữ liệu và render không chặn phản hồi ban đầu.

## 3. Các nguyên nhân đã xác nhận

### 3.1. `Suspense` bọc toàn bộ cây route

Tệp: `src/app/router.tsx`

```tsx
<BrowserRouter>
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* toàn bộ route */}
    </Routes>
  </Suspense>
</BrowserRouter>
```

Khi một page dùng `lazy()` chưa tải xong, boundary này có thể thay toàn bộ nội dung `<Routes>` bằng fallback. Điều đó làm mất lợi ích của layout route bền vững, dù `AppShell` đã được đặt ngoài các page con.

### 3.2. Fallback không hiển thị trong 150ms đầu

Tệp: `src/app/router.tsx`

```tsx
function RouteFallback() {
  const visible = useDelayedPending(true);
  if (!visible) return null;
  return <LoadingSkeleton rows={4} />;
}
```

Tệp: `src/hooks/useDelayedPending.ts`

```ts
export function useDelayedPending(pending: boolean, delay = 150)
```

Trong 150ms đầu, người dùng không nhận được phản hồi trực quan. Nếu chunk hoặc Firestore chậm hơn, cảm giác này chuyển thành đứng hình rồi mới xuất hiện skeleton.

### 3.3. Prefetch route chưa hoàn chỉnh

Tệp: `src/app/routePrefetch.ts`

Prefetch hiện chỉ chạy trên:

```tsx
onPointerEnter={() => prefetchRoute(item.to)}
onFocus={() => prefetchRoute(item.to)}
```

Các giới hạn:

- Chưa có `onPointerDown`.
- Trên thiết bị cảm ứng, `pointerenter` thường không tạo đủ thời gian tải trước khi điều hướng.
- Route Marketing chưa có trong `ROUTE_PREFETCH`.
- Prefetch chỉ gọi `import()`, không gọi `queryClient.prefetchQuery()`.
- Các route chi tiết không nằm trong bản đồ prefetch chung.

### 3.4. Kích thước bundle ảnh hưởng lần mở đầu tiên

Kết quả từ bản build hiện tại trong `dist/assets`:

| Nhóm | Kích thước gần đúng |
|---|---:|
| Firebase Firestore | 608 KB |
| Charts/Recharts | 444 KB |
| React vendor | 208 KB |
| Firebase Auth | 122 KB |
| Từng module lớn | 31–45 KB |

Khi chunk chưa có trong cache, trình duyệt phải tải, giải nén, parse và thực thi trước khi page có thể mount. Trên mạng chậm hoặc CPU yếu, quá trình này có thể kéo dài vài giây.

### 3.5. Số lượng truy vấn Firestore lớn khi mount

Các module có nhiều `useQuery()` trực tiếp:

| Module | Số query trực tiếp ghi nhận |
|---|---:|
| Dashboard Staff | 8 |
| Tương tác lớp học | 8 |
| Bài tập | 8 |
| Tài chính | 6 |
| Lịch học | 5 |
| Sổ điểm | 5 |
| Chi tiết lớp | 4 |
| Người dùng | 3 |

Module Học sinh còn chạy các query trong component con, gồm:

- Danh sách học sinh.
- Danh sách lớp.
- Danh sách khóa học.
- Điểm danh của nhóm học sinh đang hiển thị.
- Bài nộp của nhóm học sinh đang hiển thị.
- Tổng hợp điểm của nhóm học sinh đang hiển thị.

### 3.6. Có query waterfall

Trong `ClassroomInteractionPage.tsx`, dữ liệu được tải theo chuỗi phụ thuộc:

```text
session
└─ class
   ├─ course
   │  └─ course sessions
   ├─ lesson plan
   └─ saved entries
```

Trang đang trả về skeleton toàn màn hình khi một số query chính còn loading:

```tsx
if (
  session.isLoading ||
  klass.isLoading ||
  students.isLoading ||
  interaction.isLoading ||
  savedEntries.isLoading
) {
  return <LoadingSkeleton rows={7} />;
}
```

Vì vậy, thời gian hiển thị nội dung phụ thuộc vào truy vấn chậm nhất.

### 3.7. Cache dữ liệu chưa tối ưu cho điều hướng module

Tệp: `src/app/providers.tsx`

```ts
queries: {
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
}
```

Chưa cấu hình:

- `gcTime` phù hợp với phiên làm việc dài.
- `placeholderData` hoặc giữ dữ liệu cũ khi đổi module/bộ lọc.
- Prefetch dữ liệu theo ý định điều hướng.

Sau khi cache bị thu hồi hoặc dữ liệu hết thời gian fresh, quay lại module có thể phát sinh một đợt tải mới.

## 4. Những phần không phải nguyên nhân chính

### 4.1. Thời lượng animation

Token chuyển trang hiện là 400ms:

```css
--motion-slow: 400ms;
```

Không có animation chuyển trang nào kéo dài vài giây. Vì vậy, tăng hoặc giảm thời lượng CSS không giải quyết được thời gian chờ code và dữ liệu.

### 4.2. AppShell remount theo pathname

`AppShell` hiện dùng layout route với `<Outlet />`; Sidebar và Topbar không còn gắn `key={pathname}`. Phần này đã đúng về mặt kiến trúc.

Vấn đề còn lại là `Suspense` đang nằm phía ngoài cả layout route, nên khi lazy page suspend, shell vẫn có thể bị ảnh hưởng.

### 4.3. Hiệu ứng nền và blur

Các thuộc tính sau có thể làm giảm FPS, đặc biệt trên máy cấu hình thấp:

```css
background-attachment: fixed;
backdrop-filter: blur(14px) saturate(150%);
```

Đây là nguyên nhân phụ liên quan đến repaint/compositing, không phải nguyên nhân chính của độ trễ vài giây sau khi bấm Sidebar.

## 5. Dấu hiệu nhận biết nguyên nhân khi kiểm thử

| Hiện tượng | Nguyên nhân có khả năng cao |
|---|---|
| Lần đầu mở module chậm, lần sau nhanh | Lazy chunk và cache dữ liệu |
| Sidebar/Topbar biến mất hoặc nháy | `Suspense` đang thay toàn bộ cây route |
| Active item đổi ngay nhưng nội dung chờ lâu | Firestore query hoặc render dữ liệu |
| Sau vài phút quay lại module lại chậm | Cache React Query bị stale/garbage collected |
| Marketing chậm hơn các module khác | Thiếu route prefetch |
| Tương tác lớp học chậm nổi bật | Query waterfall và skeleton toàn trang |
| Cuộn hoặc animation giật nhưng dữ liệu đã có | Nền fixed, blur hoặc render bảng/biểu đồ |

## 6. Phương án xử lý đề xuất

### Ưu tiên 1 — Giữ shell và phản hồi điều hướng tức thời

- Đưa `Suspense` vào bên trong `AppShell` và `ViewerShell`, chỉ bao vùng `<Outlet />`.
- Không để lazy page làm Sidebar, Topbar và Bottom Navigation bị thay thế.
- Giữ nội dung cũ hoặc page frame ổn định trong lúc tải module mới.
- Hiển thị trạng thái pending ngay trên vùng nội dung hoặc thanh tiến trình nhỏ, không trả về `null` cho toàn route.

### Ưu tiên 2 — Tải trước JavaScript sớm hơn

- Bổ sung Marketing và các route còn thiếu vào `ROUTE_PREFETCH`.
- Prefetch trên `pointerdown` để hỗ trợ thiết bị cảm ứng.
- Sau khi đăng nhập và trình duyệt rảnh, preload các module quan trọng theo vai trò.
- Chỉ preload theo vai trò để tránh tải code không cần thiết.

### Ưu tiên 3 — Prefetch dữ liệu Firestore

- Tạo cấu hình query dùng chung cho từng module.
- Gọi `queryClient.prefetchQuery()` khi hover, focus hoặc pointerdown.
- Prefetch Dashboard, Học sinh, Lớp học, Lịch học và các module thường xuyên sử dụng.
- Dùng `staleTime` riêng theo loại dữ liệu thay vì một giá trị chung cho toàn hệ thống.

### Ưu tiên 4 — Không khóa toàn bộ trang bởi một query

- Render page frame và tiêu đề ngay lập tức.
- Tách skeleton theo từng panel.
- Cho phép dữ liệu chính hiển thị trước; biểu đồ, thống kê phụ và lịch sử tải sau.
- Không chờ tất cả query hoàn thành mới render toàn trang.

### Ưu tiên 5 — Giảm query waterfall và render nặng

- Chạy song song các truy vấn không phụ thuộc nhau.
- Tránh tải toàn bộ collection nếu màn hình chỉ cần một phần dữ liệu.
- Giới hạn số bản ghi và phân trang ở tầng Firestore.
- Trì hoãn mount biểu đồ đến sau khi nội dung chính đã hiển thị.
- Memo hóa các phép tổng hợp lớn và tránh sắp xếp/lọc lại toàn bộ danh sách trong mỗi render.

### Ưu tiên 6 — Tối ưu paint sau khi xử lý tải dữ liệu

- Đo Chrome Performance trước khi bỏ `background-attachment: fixed` hoặc giảm blur.
- Chỉ thay đổi các hiệu ứng này nếu profile xác nhận paint/composite là nút thắt.

## 7. Thứ tự triển khai an toàn

1. Di chuyển `Suspense` xuống vùng nội dung của shell.
2. Hoàn thiện route prefetch và bổ sung `pointerdown`.
3. Thêm prefetch dữ liệu cho 3–5 module chính.
4. Tách loading state của Dashboard, Học sinh và Tương tác lớp học theo panel.
5. Song song hóa hoặc gom các truy vấn phụ thuộc.
6. Đo lại Performance trước khi tối ưu hiệu ứng nền và blur.

## 8. Tiêu chí nghiệm thu

- Sidebar, Topbar và Bottom Navigation không remount hoặc biến mất khi đổi module.
- Active state trên Sidebar phản hồi ngay sau thao tác.
- Trên route đã prefetch, animation bắt đầu gần như tức thời.
- Không có khoảng trống `null` khi lazy chunk đang tải.
- Dữ liệu chính xuất hiện trước biểu đồ và dữ liệu phụ.
- Điều hướng thông thường đạt INP dưới 200ms khi CPU throttling 4×.
- Không có long task trên 50ms trong thao tác đổi module.
- Chuyển lại module đã mở không phát sinh skeleton toàn trang nếu dữ liệu còn trong cache.
- Kiểm tra đầy đủ Admin, Giáo viên và Phụ huynh trên desktop và mobile.

## 9. Trạng thái

Tài liệu này ghi nhận kết quả chẩn đoán. Chưa thực hiện thay đổi code trong phạm vi kiểm tra này.
