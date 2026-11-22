# Đợt 4 — Đúng nghiệp vụ hoá đơn, điểm danh, trang lớp học: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (chosen: Native). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Không tính tiền trùng; "Quá hạn" hiển thị đúng; buổi đã điểm danh đủ không bị báo thiếu khi lớp thêm học sinh; trang lớp học không ghi đè dữ liệu khi tải lỗi.

**Architecture:** Sửa tại chỗ trong service/trang hiện có; một helper thuần cho trạng thái hiệu lực của hoá đơn; một trường tuỳ chọn mới `expectedTotal` trên `attendance_summaries`; trạng thái hoá đơn mới `void`.

**Tech Stack:** React 19, TanStack Query, Firestore Rules, Vitest, date-fns-tz.

**Spec:** [docs/superpowers/specs/2026-11-22-sua-loi-sau-review-toan-du-an.md](../specs/2026-11-22-sua-loi-sau-review-toan-du-an.md) — C1, C2, C3, D4 (B1 đã làm ở Đợt 2b). Q5: hoá đơn `rejected` vẫn là khoản nợ; huỷ hẳn = `void` (chỉ admin).

## Global Constraints

- Không ghi `overdue` xuống Firestore; tính khi hiển thị theo ngày Việt Nam (`Asia/Ho_Chi_Minh`), hạn thanh toán tính hết ngày.
- `void`: chỉ admin chuyển `unpaid | rejected | overdue → void`; không tính vào công nợ, không cho phụ huynh nộp chứng từ.
- ID hoá đơn theo lớp: `stableDocumentId(["class", classId, studentId, String(billedBefore), String(quantity)])` (`src/utils/idempotency.ts`). Tạo trùng ID bị rules chặn sẵn (cập nhật không được đổi `createdAt`).
- `expectedTotal` tuỳ chọn, `int >= 0`; dữ liệu cũ không có trường này vẫn hợp lệ.

## Review Focus

1. Hoá đơn `rejected` 8 buổi + đã học 10 buổi → chỉ tính 2 buổi mới.
2. Hai lần bấm tạo cùng đầu vào → lần hai lỗi, không có hoá đơn thứ hai.
3. Hạn hôm nay → chưa quá hạn; hạn hôm qua → quá hạn; đã trả / chờ xác nhận / `void` → không quá hạn.
4. `registerLeave` giữ `expectedTotal` đã có.
5. Trang lớp học: lỗi tải nhận xét đã lưu → không hiện form, không lưu được; "Thử lại" tải lại mọi query lỗi.

---

### Task 1: Trạng thái hiệu lực "Quá hạn" (C2)

**Files:** Create `src/features/invoices/invoiceStatus.ts` (+ `.test.ts`); Modify `InvoicesPage.tsx` (bộ lọc, đếm, badge), `ViewerTuitionPage.tsx` (badge, dòng hạn).

**Produces:** `export function effectiveInvoiceStatus(invoice: Pick<InvoiceDoc, "status" | "dueAt">, now?: Date): InvoiceStatus`.

- [ ] Test các ca ở Review Focus #3 → FAIL; code; áp dụng ở 2 trang; test PASS; commit `fix(invoices): show overdue from the due date`.

### Task 2: Không tính tiền trùng + trạng thái `void` (C1)

**Files:** `src/types/academic.ts` (`InvoiceStatus` + `void`), `src/features/invoices/constants.ts` (nhãn "Đã huỷ", tone neutral), `InvoiceCreationForm.tsx:117` (đếm mọi trạng thái trừ `void`), `src/services/firestore/invoices.ts` (ID tất định cho hoá đơn lớp; `voidInvoice(invoiceId)`), `InvoicesPage.tsx` (nút "Huỷ hoá đơn" cho admin + xác nhận; công nợ loại `void` thay vì `rejected`), `src/utils/dashboardMetrics.ts` (như trên), `firebase/firestore.rules` (`void` trong danh sách trạng thái); tests: `InvoicesPage.test.tsx`, `invoices.test.ts`, `phase9-rules.test.ts`, `dashboardMetrics` test nếu có.

- [ ] Tests: đếm buổi với hoá đơn rejected (UI); ID tất định giống nhau cho cùng đầu vào (service); rules: admin `unpaid → void` ✓, giáo viên ✗, phụ huynh nộp chứng từ cho `void` ✗; công nợ không tính `void`, có tính `rejected`. → FAIL.
- [ ] Code; PASS; commit `fix(invoices): never bill sessions twice; admin can void an invoice`.

### Task 3: `expectedTotal` cho tổng hợp điểm danh (C3)

**Files:** `src/types/academic.ts` (`AttendanceSummaryDoc.expectedTotal?`), `src/services/firestore/attendance.ts` (`saveAttendance`, `registerLeave`, `listSessionsWithoutAttendance`), `src/services/firestore/classroomInteractions.ts:160`, `firebase/firestore.rules` (`validAttendanceSummary`); tests `attendance.test.ts`, rules test.

- [ ] Tests: lớp thêm học sinh sau buổi điểm danh đủ → không báo thiếu; `registerLeave` giữ `expectedTotal`; rules chấp nhận `expectedTotal` int, từ chối chuỗi. → FAIL; code; PASS; commit `fix(attendance): compare gaps with the roster size at marking time`.

### Task 4: Trang lớp học không ghi đè khi tải lỗi (D4)

**Files:** `src/features/classroom/pages/ClassroomInteractionPage.tsx:109-134, 257`; test `ClassroomInteractionPage.test.tsx`.

- [ ] Test: `getSessionStudentReviews` lỗi → hiện thông báo lỗi, không có nút lưu; bấm "Thử lại" gọi lại query đó. → FAIL; code (effect khởi tạo chỉ chạy khi các query đều `isSuccess`; khối lỗi gồm `savedEntries`, `lessonPlan`; retry gọi `refetch` cho mọi query lỗi); PASS; commit `fix(classroom): never initialise the form from a failed load`.
