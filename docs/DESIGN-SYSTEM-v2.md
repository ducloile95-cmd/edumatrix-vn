# Design System v2 — Edumatrix-vn (đồng bộ 3 role)

Mục tiêu: **1 hệ token + 1 shell** dùng chung cho Admin · Giáo viên · Phụ huynh/Học sinh; mỗi role chỉ khác **điều hướng + nội dung**. Giải quyết mất đồng bộ hiện tại và tối ưu hiển thị dữ liệu.

## 0. Vấn đề đang mất đồng bộ (phải chốt)
| Vấn đề | Hiện trạng | Chuẩn hoá |
|---|---|---|
| **Tiêu đề trùng** | Topbar hiện tiêu đề động **và** `PageHeader` render H1 → 2 H1/trang | **1 nguồn**: `PageHeader` giữ H1; **Topbar → breadcrumb** ngữ cảnh + tiện ích |
| **Bề rộng lệch** | `main` full-width nhưng `PageHeader` bó `max-w-[1370px]` | Bỏ cap trong PageHeader → theo `main` (full-width, cùng padding) |
| **Nút "Thêm" lặp class** | Chuỗi gradient dài lặp ở mỗi trang | Token `--btn-primary` + class dùng lại (hoặc component `Button`) |

## 1. Token 3 lớp (primitive → semantic → component)
```
Primitive:  --blue-600:#2348D6 ... (bảng màu tailwind hiện có)
Semantic:   --color-primary, --surface, --surface-glass, --text, --text-muted,
            --border, --success, --danger, --elev-1..4, --radius-*, --space-*, --motion-duration
Component:  --sidebar-bg, --topbar-bg, --card-bg, --nav-active-bg(grad),
            --btn-primary-bg(grad), --badge-*-bg, --table-header-bg, --modal-bg
```
- **Spacing scale** (4/8): `--space-1..8` = 4·8·12·16·24·32·48·64.
- **Radius**: input 10 · card 14 · modal 18 · pill 999.
- **Elevation**: `--elev-1` card · `--elev-2` sidebar/topbar · `--elev-3` dropdown · `--elev-4` modal.
- **Motion**: `--motion-duration` (đã có) — 1 nhịp chung; `prefers-reduced-motion` tắt.

## 2. Component specs (trạng thái)
| Component | Default | Hover | Active/Selected | Disabled |
|---|---|---|---|---|
| **Nav item** | text-muted | bg glass + text-primary | grad-primary + white + elev | opacity .5, "Sắp có" |
| **Button primary** | grad-primary + white + elev-ring | brightness +6% | scale .98 | opacity .5 |
| **Card (glass)** | surface-glass + border + elev-1 | elev-2 (nếu clickable) | — | — |
| **Table row** | transparent | bg glass-soft | ring/nền primary-50 | text-muted |
| **Input** | border-300 | border-400 | border-primary + ring | bg-100, text-400 |
| **Modal** | modal-bg + elev-4 + scrim 50% | — | — | — |

## 3. Layout khung (dùng chung 3 role)
```
┌ Sidebar (glass, accordion, thu gọn/mở, account ở chân) ┐┌ Topbar: breadcrumb ····· clock · weather · 🔔 ┐
│                                                        ││ PageHeader: H1 + mô tả ············· [nút chính] │
│  Nav theo role                                         ││ Nội dung full-width: KPI · chart · bảng · panel  │
└────────────────────────────────────────────────────────┘└───────────────────────────────────────────────────┘
```
- **Topbar**: `Breadcrumb (Nhánh › Trang)` bên trái · đồng hồ · thời tiết · chuông. (Bỏ tiêu đề lớn khỏi topbar.)
- **PageHeader**: H1 tiêu đề (nguồn duy nhất) + mô tả + vùng `actions` (nút chính). Full-width.
- **Nội dung**: khung chuẩn = hàng **KPI stat** → **chart/panel** → **bảng dữ liệu**.

## 4. Tối ưu hiển thị dữ liệu (bảng)
- Full-width; **header dính** (sticky) khi cuộn; **row hover**; **zebra** nhẹ tùy chọn.
- Cột chuẩn: chọn (checkbox) · thực thể (avatar+tên+phụ) · thuộc tính · **StatusBadge** · **cụm hành động** (Sửa/…); số liệu dùng `tabular-nums`.
- ≥ 50 dòng: cân nhắc virtualize; có ô **tìm kiếm** + phân trang (đã có `Pagination`).
- Empty/loading/error state nhất quán (đã có `EmptyState`/`LoadingSkeleton`/`ErrorState`).

## 5. Dashboard theo role (tối ưu nội dung)
| Role | Trọng tâm |
|---|---|
| **Admin** | 4 KPI (HS/Lớp/Điểm danh/Học phí) · **chart** (kết quả theo tháng, tỉ lệ khối) · bảng HS nổi bật · feed "Cần xử lý" |
| **Giáo viên** | Lớp hôm nay · **hàng đợi chấm bài** · điểm danh nhanh · thông báo lớp |
| **Phụ huynh/HS** | Thẻ học sinh · lịch học sắp tới · bài tập cần nộp · **trạng thái học phí** |

## 6. Việc còn tồn (sau khi chốt design-system)
- P7: form **Sessions** + **LessonPlans** → Modal; **Modal xác nhận Xoá**.
- Refactor tiêu đề theo mục 0 (Topbar → breadcrumb; PageHeader = H1 duy nhất; bỏ cap width).
- (Tuỳ chọn) `Button`/`StatusBadge`/`DataTable`, `Chart` (recharts sẵn có) dùng lại toàn hệ.
- P8 kiểm chứng cuối 3 role (cần đăng nhập).
