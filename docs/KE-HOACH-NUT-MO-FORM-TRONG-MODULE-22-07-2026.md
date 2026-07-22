# Kế hoạch: Sửa delay mở form + Bổ sung nút mở form ngay trong từng module

> **✅ TRẠNG THÁI: ĐÃ TRIỂN KHAI XONG (22/07) — 4 nút đã thêm, typecheck + lint toàn dự án sạch.** Nguồn: Lợi báo lỗi "bấm Thêm Lớp học/Học sinh bị delay không hiện form popup" + yêu cầu bổ sung nút mở form cho tất cả chức năng có form popup, đặt ngay trong module đó.
>
> **Kết quả:** `StudentsPage.tsx` (PageHeader + nút "Thêm học sinh", chỉ Admin), `ClassesPage.tsx` (PageHeader + nút "Tạo lớp học", Admin+GV, reset editingClass), `CoursesList.tsx` + `CatalogPage.tsx` (prop `onAdd` + nút "Thêm khóa học" ở header, sửa chữ empty-state), `LessonPlanList.tsx` (nút cố định "Soạn giáo án mới" ở header). Không đụng Topbar/lazy-load/Modal. Lợi tự bấm thử 4 nút trên máy thật để nghiệm thu form mở tức thì.

## 1. Nguyên nhân delay (đã xác minh trực tiếp trên mã nguồn)

Delay **không phải** lỗi của bản thân Modal. Cơ chế hiện tại:

- Nút "Thêm" là **một dropdown toàn cục ở Topbar** (`Topbar.tsx:103-110`), mỗi mục dùng `navigate("<route>?create=<loại>")`.
- Khi bấm (ví dụ "Lớp học"), trình duyệt phải: đổi route → **lazy-load** component trang (`router.tsx` dùng `lazy()`) → trang mount → đọc `?create=class` trong `useState` initializer → mới `setOpen(true)`.
- Nếu đang ở trang khác, toàn bộ chuỗi navigation + lazy-load này chính là độ trễ nhìn thấy trước khi popup hiện.

Các trang đã có sẵn nút mở form **ngay trong trang** (gọi thẳng `setOpen(true)`, không navigate) thì mở tức thì — đó là lý do Buổi học/Hóa đơn/Người dùng không bị delay, còn Lớp học/Học sinh thì có.

**Kết luận:** cách sửa đúng và tối thiểu là bổ sung nút mở form ngay trong các module còn thiếu — đúng như Lợi yêu cầu. Không đụng Topbar dropdown (giữ làm lối tắt xuyên module), không đổi cơ chế Modal.

## 2. Khảo sát toàn bộ module có form popup nhập liệu

| Module | Form popup | Nút mở form NGAY trong trang? | Cần thêm? |
|---|---|---|---|
| Học sinh | Thêm học sinh | ❌ Không — chỉ mở qua Topbar `?create=student` | ✅ **THÊM** |
| Lớp học | Tạo lớp học | ❌ Không — chỉ mở qua Topbar `?create=class` | ✅ **THÊM** |
| Khóa học | Thêm khóa học | ❌ Không — `CoursesList` không có nút (empty-state ghi "Thêm khóa học ở nút phía trên" nhưng nút đó không tồn tại); chỉ mở qua Topbar hoặc từ Tổng quan | ✅ **THÊM** |
| Giáo án | Soạn giáo án mới | ⚠️ Chỉ có nút "Soạn ngay" xuất hiện **có điều kiện** (khi có buổi thiếu giáo án) + empty-state; header danh sách không có nút cố định | ✅ **THÊM** (nút cố định) |
| Môn học | Thêm môn học | ✅ Có — `SubjectsList` prop `onAdd` | — |
| Buổi học | Tạo buổi học | ✅ Có — `PageHeader` nút "Tạo buổi học" | — |
| Hóa đơn | Tạo hóa đơn | ✅ Có — `PageHeader` nút "Tạo hóa đơn" | — |
| Người dùng | Mời tài khoản | ✅ Có — `PageHeader` nút "Mời tài khoản" | — |
| Thông báo/Chat | Nhắn mới | ✅ Có — nút "Nhắn mới" trong tab Hội thoại | — |

## 3. Danh sách nút sẽ thêm (chờ Lợi duyệt)

Đúng **4 nút**, đặt chính xác trong module tương ứng, chỉ mở form tức thì bằng state có sẵn (không tạo state/mutation/route mới):

| # | Module | Nhãn nút | Vị trí đặt | Quyền hiển thị | Hành động khi bấm |
|---|---|---|---|---|---|
| 1 | Học sinh | ＋ Thêm học sinh | `StudentsPage` — `PageHeader actions` (thêm PageHeader vào trang, hiện trang chưa có) | Chỉ Admin (`canCreateStudent`, đã có sẵn) | `setOpen(true)` |
| 2 | Lớp học | ＋ Tạo lớp học | `ClassesPage` — `PageHeader actions` | Admin + Giáo viên (`canManageClasses`, đã có sẵn) | `setEditingClass(null); setOpen(true)` |
| 3 | Khóa học | ＋ Thêm khóa học | `CoursesList` — header danh sách (song song `SubjectsList` đã có `onAdd`) | Như hiện tại của trang Danh mục | Gọi `openCreateCourse()` (đã có sẵn trong `CatalogPage`, truyền xuống qua prop `onAdd` mới) |
| 4 | Giáo án | ＋ Soạn giáo án mới | `LessonPlanList` — header danh sách (cố định, luôn hiện) | Như hiện tại | Gọi `onCreateNew` (đã có sẵn, chỉ thêm nút cố định thay vì chỉ hiện có điều kiện) |

## 4. Chuẩn thiết kế (đồng bộ, không chế mới)

Tất cả 4 nút dùng **đúng mẫu đã có** của Buổi học/Hóa đơn/Người dùng:

- Component `Button` dùng chung, `variant="primary"`, `icon={<Plus size={17} />}` (Lucide, đúng hệ icon dự án).
- Với Học sinh & Lớp học: bọc trong `PageHeader actions=...` — đúng khuôn 3 trang đã dùng, `PageHeader` chỉ render `actions` nên không phát sinh tiêu đề trùng (tiêu đề module đã ở Topbar).
- Với Khóa học & Giáo án: đặt nút ở góc phải header của panel danh sách, cùng dòng tiêu đề "Danh sách khóa học"/"Danh sách giáo án".
- Không thêm màu/hiệu ứng mới; giữ nguyên spacing token hiện có.

## 5. Ngoài phạm vi (cố ý không làm)

- **Không đụng Topbar dropdown** — vẫn là lối tắt xuyên module hữu ích; xóa nó là mở rộng phạm vi không cần thiết. Sau khi có nút trong trang, người dùng đang ở đúng module sẽ không còn phải qua Topbar nên hết delay.
- **Không đổi cơ chế lazy-load route** — lazy-load là tối ưu tải trang đúng đắn cho Spark/client-only, không nên bỏ.
- **Không gộp/tạo component nút mới** — 4 nút là các lời gọi `Button` đơn lẻ, không cần trừu tượng hoá.
- Sửa câu empty-state "Thêm khóa học ở nút phía trên" của `CoursesList` cho khớp thực tế sau khi thêm nút (sửa chữ, không phải thêm tính năng).

## 6. Các bước thực hiện (sau khi Lợi duyệt) — mỗi bước có verify

1. `StudentsPage`: thêm `PageHeader` + nút → verify: `npm run typecheck` + `lint`.
2. `ClassesPage`: thêm `PageHeader` + nút (reset `editingClass`) → verify: typecheck + lint.
3. `CatalogPage` + `CoursesList`: thêm prop `onAdd`, truyền `openCreateCourse`, render nút ở header; sửa chữ empty-state → verify: typecheck + lint.
4. `LessonPlanList`: thêm nút cố định ở header gọi `onCreateNew` → verify: typecheck + lint.
5. Verify cuối toàn dự án: `npm run typecheck` + `npm run lint` (build/test không chạy được trong sandbox — Lợi tự bấm thử 4 nút trên máy thật để nghiệm thu form mở tức thì).

## 7. Tiêu chí thành công (verifiable)

- Đang đứng ở mỗi module trong 4 module trên, bấm nút → form popup mở **tức thì**, không đổi URL, không lazy-load lại trang.
- Quyền hiển thị đúng: nút Thêm học sinh chỉ hiện với Admin; nút Tạo lớp học hiện với Admin + Giáo viên.
- typecheck + lint toàn dự án sạch.
- Không thay đổi hành vi Topbar dropdown và các nút đã có (Buổi học/Hóa đơn/Người dùng/Môn học/Chat).
