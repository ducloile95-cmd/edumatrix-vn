# Đợt 2b — Dashboard phụ huynh và trạng thái gửi tin tài chính: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen: Native). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Worker dựng `viewer_dashboard` chỉ đọc đúng số bản ghi hiển thị (mới nhất/sắp tới), không lộ dữ liệu chưa công bố; trang Hoá đơn chỉ hỏi trạng thái gửi tin cho các hoá đơn đang hiển thị.

**Architecture:** Worker dùng cùng truy vấn (bộ lọc + `orderBy` + `limit`) như nhánh client dự phòng trong `src/services/firestore/viewerDashboard.ts` — các composite index đã có trong `firebase/firestore.indexes.json`. Không đổi schema, không đổi rules.

**Tech Stack:** Cloudflare Worker (Firestore REST `runQuery`), Vitest, React Query.

**Spec:** [docs/superpowers/specs/2026-11-22-sua-loi-sau-review-toan-du-an.md](../specs/2026-11-22-sua-loi-sau-review-toan-du-an.md) — B2, B1 (gộp vì cùng hàm), E2. E3 không làm (xem cuối).

## Global Constraints

- Không thêm index mới: chỉ dùng các cặp đã có — sessions(classId, startAt), lesson_plan_public(classId, publishedAt desc), assignments(classId, status, dueAt), submissions(studentId, submittedAt desc), scores(studentId, createdAt desc), attendance(studentId, markedAt desc), invoices(studentId, dueAt), announcements(studentId, createdAt desc).
- Giới hạn giữ nguyên `DASHBOARD_LIMITS` của client: sessions 12/lớp (từ hôm qua đến +30 ngày), lesson plans 12/lớp, assignments 25/lớp (đã công bố), submissions 100/HS, scores 10/HS (bỏ `published === false`), attendance 50/HS, invoices 30/HS, announcements 10/HS (bỏ `resolvedAt`).
- `classes[].studentIds` trong `viewer_dashboard` thay bằng `[]` (giao diện viewer không dùng; không lộ ID học sinh khác).

## Review Focus

1. Lớp không có buổi trong khoảng → mảng rỗng, không lỗi.
2. Thứ tự `nextSessions` tăng dần theo `startAt` khi phụ huynh có nhiều lớp.
3. Điểm `published: false` và thông báo đã `resolvedAt` không xuất hiện.
4. Trang Hoá đơn ở tab khác "Danh sách" không gọi Worker.

---

### Task 1: Worker — truy vấn có giới hạn cho dashboard phụ huynh

**Files:** Modify `workers/messenger/src/index.ts` (`materializeViewerDashboard` ~1078); Test `workers/messenger/tests/worker.test.ts`.

**Interfaces — Produces:**
- `export function viewerDashboardQueries(classIds: string[], studentIds: string[], now: Date): Record<ViewerDashboardKey, Record<string, unknown>[]>` — structured query theo từng key.
- `export function viewerVisibleDashboard(parts: { classes: Record<string, unknown>[]; scores: Record<string, unknown>[]; announcements: Record<string, unknown>[] }): same shape` — áp quy tắc hiển thị viewer.

- [ ] Test: mỗi query có đúng `limit`, `orderBy`, bộ lọc (sessions có khoảng thời gian; assignments có `status == published`); `viewerVisibleDashboard` bỏ điểm chưa công bố, thông báo đã xử lý, xoá `studentIds` của lớp. Chạy → FAIL (chưa export).
- [ ] Code: thêm 2 hàm + `runStructuredQuery(sq, token, env)`; `materializeViewerDashboard` dùng chúng, sắp `nextSessions` theo `startAt`.
- [ ] `cd workers/messenger && npx vitest run` → PASS; commit `perf(worker): bounded, ordered viewer dashboard queries`.

### Task 2: Trang Hoá đơn — chỉ hỏi trạng thái gửi tin cho hoá đơn đang hiển thị

**Files:** Modify `src/features/invoices/pages/InvoicesPage.tsx` (~82-91, 139); Test `src/features/invoices/pages/InvoicesPage.test.tsx`.

- [ ] Test: ở tab Tổng quan, `getUtilityDeliveryStatus` không được gọi; chuyển sang tab "Danh sách công nợ" thì được gọi với ID của các hoá đơn đang lọc. Chạy → FAIL.
- [ ] Code: `utilityEntityIds` lấy từ `filteredInvoices` (+ payment đã xác nhận của chúng); `enabled` thêm `activeTab === "invoices"`.
- [ ] `npx vitest run src --pool=threads --maxWorkers=1` → PASS; commit `perf(invoices): fetch delivery status only for listed invoices`.

## Không làm

- **E3 (tổng quan điểm danh tính từ summaries):** danh sách "học sinh hay nghỉ" cần số buổi nghỉ/tổng buổi theo từng học sinh, `attendance_summaries` chỉ có theo buổi. Cần collection tổng hợp mới — để đợt sau nếu Usage cho thấy trang này tốn nhiều; hiện đã cache 10 phút.
