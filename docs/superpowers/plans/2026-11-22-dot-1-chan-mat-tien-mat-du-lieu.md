# Đợt 1 — Chặn mất tiền và mất dữ liệu: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Không tài khoản giáo viên nào chuyển hướng được tiền học phí, duyệt thanh toán, hay xoá dữ liệu lõi/tài khoản admin — kể cả khi gọi Firestore trực tiếp.

**Architecture:** Sửa `firebase/firestore.rules` (chốt chặn thật) kèm test rules trên emulator; sau đó ẩn các nút tương ứng ở giao diện và thêm hộp xác nhận cho đối soát. Không đổi schema, không migrate dữ liệu.

**Tech Stack:** Firestore Security Rules v2, `@firebase/rules-unit-testing` + Vitest (`npm run test:rules`), React 19 + Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-22-sua-loi-sau-review-toan-du-an.md](../specs/2026-11-22-sua-loi-sau-review-toan-du-an.md) — mục A1, A2, D2, D3; quyết định Q1–Q3 (đã xác nhận 22/11/2026: dùng mặc định).

## Global Constraints

- Q1: giáo viên **được** tạo hoá đơn, chỉ cho lớp được phân công, có `sourceType` ∈ {`class`, `billing_item`}, giá lấy từ khoá học/billing item.
- Q2: **chỉ admin** chuyển thanh toán `reported → verified/rejected` và hoá đơn `pending → paid/rejected`.
- Q3: **chỉ admin** xoá `users`, `subjects`, `courses`, `students`, `classes`; không ai xoá được `users` có `role == 'admin'` qua client.
- Mọi hoá đơn tạo mới (kể cả admin) phải có `bankBin`, `accountNumber`, `accountName` bằng đúng `settings/payment`.
- Không đổi tên collection/trường; không thêm dependency.
- Mỗi task kết thúc bằng: `npm run test:rules` (rules) hoặc `npm test` + `npm run typecheck` (UI) đều đạt.
- Commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Batch tạo nhiều hoá đơn** (admin chọn cả lớp 25 học sinh): rules giới hạn số lời gọi `get/exists` mỗi request; thêm `get(settings/payment)` và `get(courses/...)` có thể vượt giới hạn → Task 2 có test batch 25 hoá đơn; nếu hỏng thì chia nhỏ batch ở client (bước dự phòng trong Task 2).
2. **Khoá học cũ không có `pricePerSession`**: client tính `round(tuitionFee / totalSessions)` (`InvoiceCreationForm.tsx:118-119`); rules phải tính giống hệt, nếu không admin không tạo được hoá đơn lớp → test trong Task 2.
3. **Chưa cấu hình `settings/payment`**: tạo hoá đơn phải bị từ chối (không được tạo hoá đơn có tài khoản rỗng) và UI báo rõ → test rules trong Task 2.
4. **Giáo viên vẫn mở trang Hoá đơn**: phải thấy nút "Tạo hóa đơn" nhưng không thấy tab "Đối soát" → test UI trong Task 5.
5. **Phụ huynh nộp lại chứng từ sau khi bị từ chối**: luồng viewer `rejected → pending` không được hỏng khi bỏ nhánh giáo viên → test `viewer retries rejected payment` sẵn có phải vẫn đạt (Task 3).

---

### Task 1: Rules — xoá dữ liệu lõi chỉ admin

**Files:**
- Modify: `firebase/firestore.rules:1006, 1134, 1153, 1208, 1279`
- Modify: `firebase/tests/academic-rules.test.ts:205-215, 275-276, 380-382, 491-492`
- Modify: `firebase/tests/security-rules.test.ts:289-297`

**Interfaces:** không có (chỉ rules).

- [ ] **Step 1: Sửa test cũ thành hành vi mới (test sẽ hỏng)**

`academic-rules.test.ts` — đổi tên test và các dòng teacher ở 4 chỗ:

```ts
  test("Chi Admin duoc xoa cung mon hoc", async () => {
    // ...giữ nguyên phần seed...
    await assertFails(deleteDoc(doc(asViewer(), "subjects", "TOEIC")));
    await assertFails(deleteDoc(doc(asTeacher(), "subjects", "TOEIC")));
    await assertSucceeds(deleteDoc(doc(asAdmin(), "subjects", "TOEIC")));
  });
```

Làm tương tự: dòng 276 (`courses/course_001`), 381 (`students/STUDENT_OWNED`; dòng 382 admin xoá `STUDENT_OTHER` giữ nguyên), 492 (`classes/class_001`): đổi `assertSucceeds(deleteDoc(doc(asTeacher(), ...)))` thành `assertFails(...)` và thêm ngay sau đó `await assertSucceeds(deleteDoc(doc(asAdmin(), <cùng collection>, <cùng id>)));`. Đổi tên các test "Staff duoc xoa..." thành "Chi Admin duoc xoa...".

`security-rules.test.ts:289-297`:

```ts
  test("Chi Admin duoc xoa cung tai khoan nguoi khac", async () => {
    await assertFails(deleteDoc(doc(asTeacher(), "users", VIEWER_UID)));
    await assertSucceeds(deleteDoc(doc(asAdmin(), "users", TEACHER_UID)));
  });

  test("Khong ai duoc xoa tai khoan Admin qua client", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", "admin_2"), { role: "admin", status: "active", studentIds: [] });
    });
    await assertFails(deleteDoc(doc(asAdmin(), "users", "admin_2")));
    await assertFails(deleteDoc(doc(asTeacher(), "users", ADMIN_UID)));
  });

  test("Staff khong duoc tu xoa tai khoan dang dang nhap", async () => {
    await assertFails(deleteDoc(doc(asAdmin(), "users", ADMIN_UID)));
    await assertFails(deleteDoc(doc(asTeacher(), "users", TEACHER_UID)));
  });
```

(Biến môi trường test trong file này tên gì — `testEnv` hay `env` — xem đầu file và dùng đúng tên.)

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npm run test:rules`
Expected: FAIL ở các test vừa sửa (teacher xoá vẫn thành công; xoá `admin_2` thành công).

- [ ] **Step 3: Sửa rules**

```
// users/{uid}, dòng 1006
      allow delete: if isAdmin() && request.auth.uid != uid && resource.data.role != 'admin';
```

Dòng 1134 (`subjects`), 1153 (`courses`), 1208 (`students`), 1279 (`classes`):

```
      allow delete: if isAdmin();
```

- [ ] **Step 4: Chạy lại** — `npm run test:rules` → PASS toàn bộ (225 test cũ + test mới).
- [ ] **Step 5: Commit**

```bash
git add firebase/firestore.rules firebase/tests/academic-rules.test.ts firebase/tests/security-rules.test.ts
git commit -m "fix(rules): restrict hard deletes to admin and protect admin accounts"
```

### Task 2: Rules — hoá đơn khớp tài khoản trung tâm và giá khoá học

**Files:**
- Modify: `firebase/firestore.rules` — thêm 2 hàm cạnh `validInvoiceData` (~dòng 922) và sửa `match /invoices/{invoiceId}` `allow create` (~dòng 1641-1647)
- Modify: `firebase/tests/phase9-rules.test.ts` (seed + test mới)
- Modify (nếu test hỏng do thiếu seed): `firebase/tests/security-rules.test.ts`, `firebase/tests/immutable-rules.test.ts`

**Interfaces:**
- Produces (rules): `matchesPaymentSettings(data) -> bool`, `coursePricePerSession(courseId) -> number`.

- [ ] **Step 1: Thêm seed và test hỏng** — trong `phase9-rules.test.ts`:

Ở `beforeEach`, trong `withSecurityRulesDisabled`, thêm:

```ts
    await setDoc(doc(db, "settings", "payment"), {
      bankBin: "970436", bankName: "Vietcombank", accountNumber: "123", accountName: "EDU",
      contentTemplate: "{invoiceCode}", vietQrTemplate: "compact2", updatedAt: Timestamp.now(),
    });
```

và đổi seed `courses/course-1` thành:

```ts
    await setDoc(doc(db, "courses", "course-1"), {
      subjectIds: ["subject-1"], teacherIds: ["teacher"], pricePerSession: 100000, tuitionFee: 1000000, totalSessions: 10,
    });
    await setDoc(doc(db, "courses", "course-legacy"), {
      subjectIds: ["subject-1"], teacherIds: ["teacher"], tuitionFee: 1000000, totalSessions: 3,
    });
    await setDoc(doc(db, "classes", "class-legacy"), { courseId: "course-legacy", subjectIds: ["subject-1"], studentIds: ["student-1"], teacherIds: ["teacher"], status: "active" });
```

Thêm fixture cạnh `billingItemInvoice`:

```ts
const classInvoice = {
  ...invoice,
  courseId: "course-1",
  title: "Hoc phi lop",
  amount: 300000,
  sourceType: "class",
  sourceId: "class-1",
  classId: "class-1",
  subjectId: null,
  billingItemId: null,
  itemNameSnapshot: "English Foundation",
  unitPriceSnapshot: 100000,
  quantity: 3,
};
```

Thêm `describe` mới:

```ts
describe("Invoice integrity (A1)", () => {
  const asTeacherDb = () => env.authenticatedContext("teacher").firestore();
  const asAdminDb = () => env.authenticatedContext("admin").firestore();

  test("teacher cannot create a manual invoice without sourceType", async () =>
    assertFails(setDoc(doc(asTeacherDb(), "invoices", "manual"), { ...invoice, classId: "class-1", createdBy: "teacher" })));

  test("teacher creates a class invoice priced from the course", async () =>
    assertSucceeds(setDoc(doc(asTeacherDb(), "invoices", "class-ok"), { ...classInvoice, createdBy: "teacher" })));

  test("nobody can set a custom unit price on a class invoice", async () =>
    assertFails(setDoc(doc(asAdminDb(), "invoices", "class-price"), {
      ...classInvoice, unitPriceSnapshot: 90000, amount: 270000,
    })));

  test("legacy course price falls back to round(tuitionFee / totalSessions)", async () =>
    assertSucceeds(setDoc(doc(asAdminDb(), "invoices", "class-legacy"), {
      ...classInvoice, courseId: "course-legacy", sourceId: "class-legacy", classId: "class-legacy",
      unitPriceSnapshot: 333333, amount: 999999,
    })));

  test("nobody can send payment to another bank account", async () => {
    await assertFails(setDoc(doc(asAdminDb(), "invoices", "bank-admin"), { ...invoice, accountNumber: "999" }));
    await assertFails(setDoc(doc(asTeacherDb(), "invoices", "bank-teacher"), { ...billingItemInvoice, accountName: "TEACHER", createdBy: "teacher" }));
  });

  test("invoice creation fails when payment settings are missing", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await deleteDoc(doc(ctx.firestore(), "settings", "payment")); });
    await assertFails(setDoc(doc(asAdminDb(), "invoices", "no-settings"), invoice));
  });

  test("admin creates 25 class invoices in one batch", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const ids = Array.from({ length: 25 }, (_, i) => `bulk-${i}`);
      await Promise.all(ids.map((id) => setDoc(doc(ctx.firestore(), "students", id), { studentCode: id, teacherIds: ["teacher"] })));
      await updateDoc(doc(ctx.firestore(), "classes", "class-1"), { studentIds: ["student-1", ...ids] });
    });
    const db = asAdminDb();
    const batch = writeBatch(db);
    Array.from({ length: 25 }, (_, i) => batch.set(doc(db, "invoices", `bulk-inv-${i}`), { ...classInvoice, studentId: `bulk-${i}` }));
    await assertSucceeds(batch.commit());
  });
});
```

Thêm `deleteDoc` vào dòng import `firebase/firestore` của file.

- [ ] **Step 2: Chạy, xác nhận hỏng**

Run: `npm run test:rules`
Expected: FAIL ở "nobody can set a custom unit price", "nobody can send payment to another bank account", "invoice creation fails when payment settings are missing", "teacher cannot create a manual invoice…" (test cũ "teacher cannot create an unscoped invoice" vẫn đạt).

- [ ] **Step 3: Sửa rules** — thêm ngay trên `function validInvoiceData(data)`:

```
    // Tien hoc phi chi duoc chuyen ve tai khoan trung tam dang cau hinh.
    function matchesPaymentSettings(data) {
      let payment = get(/databases/$(database)/documents/settings/payment).data;
      return data.bankBin == payment.bankBin &&
        data.accountNumber == payment.accountNumber &&
        data.accountName == payment.accountName;
    }

    // Khop InvoiceCreationForm: pricePerSession, neu khoa cu thi round(tuitionFee / totalSessions).
    function coursePricePerSession(courseId) {
      let course = get(/databases/$(database)/documents/courses/$(courseId)).data;
      return 'pricePerSession' in course ? course.pricePerSession : math.round(course.tuitionFee / course.totalSessions);
    }
```

Thay `allow create` của `match /invoices/{invoiceId}`:

```
      allow create: if (isAdmin() || (
          isTeacher() &&
          request.resource.data.get('sourceType', null) in ['class', 'billing_item'] &&
          request.resource.data.classId is string &&
          isAssignedTeacherForClass(request.resource.data.classId)
        )) &&
        request.resource.data.createdBy == request.auth.uid &&
        request.resource.data.status == 'unpaid' &&
        validInvoiceData(request.resource.data) &&
        matchesPaymentSettings(request.resource.data) &&
        (request.resource.data.get('sourceType', null) != 'class' ||
          request.resource.data.unitPriceSnapshot == coursePricePerSession(request.resource.data.courseId));
```

- [ ] **Step 4: Chạy lại** — `npm run test:rules`.
  - Nếu test khác (ví dụ `security-rules.test.ts` mục R3 dòng ~794, `immutable-rules.test.ts`) hỏng vì **tạo hoá đơn qua context đã xác thực** mà thiếu `settings/payment`/`pricePerSession`: thêm seed `settings/payment` khớp `bankBin/accountNumber/accountName` của fixture vào `beforeEach` của file đó. Không nới rules.
  - Nếu "admin creates 25 class invoices in one batch" hỏng với lỗi giới hạn số lời gọi truy cập: chuyển sang **bước dự phòng** dưới đây.
  - Expected cuối: PASS toàn bộ.
- [ ] **Step 4b (chỉ khi test batch hỏng): chia batch ở client** — `src/services/firestore/invoices.ts`, trong `createInvoices`, thay một `writeBatch` bằng các nhóm nhỏ:

```ts
// shortcut: moi request rules chi duoc ~20 lan get/exists; 5 hoa don/batch giu duoi gioi han. Tang khi Google noi han muc.
const INVOICES_PER_BATCH = 5;
for (let offset = 0; offset < inputs.length; offset += INVOICES_PER_BATCH) {
  const batch = writeBatch(db);
  inputs.slice(offset, offset + INVOICES_PER_BATCH).forEach((input) => { /* giữ nguyên thân forEach hiện tại */ });
  await batch.commit();
}
```

và đổi test batch thành 5 hoá đơn. Ghi rõ trong commit rằng tạo nhiều hoá đơn không còn nguyên tử toàn bộ (mỗi nhóm 5 là nguyên tử). Chạy `npx vitest run src/services/firestore/invoices.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add firebase/firestore.rules firebase/tests src/services/firestore/invoices.ts
git commit -m "fix(rules): pin invoice bank account and class price to center settings"
```

### Task 3: Rules — chỉ admin đối soát thanh toán

**Files:**
- Modify: `firebase/firestore.rules` — `match /invoices` `allow update` (~1648-1660), `match /payments` `allow update` (~1675)
- Modify: `firebase/tests/phase9-rules.test.ts:334-345`, `firebase/tests/security-rules.test.ts:643-650`

- [ ] **Step 1: Đổi test cũ thành hành vi mới**

`phase9-rules.test.ts:334`:

```ts
  test("assigned teacher cannot verify payments (admin only)", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "invoices", "invoice-1"), { status: "pending" });
    });
    const db = env.authenticatedContext("teacher").firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, "payments", "payment-1"), {
      status: "verified", verifiedBy: "teacher", verifiedAt: Timestamp.now(), updatedAt: Timestamp.now(),
    });
    batch.update(doc(db, "invoices", "invoice-1"), { status: "paid", updatedAt: Timestamp.now() });
    await assertFails(batch.commit());
  });
```

`security-rules.test.ts:643`: đổi tên thành `"Teacher khong duoc doi soat thanh toan"` và đổi `assertSucceeds(batch.commit())` thành `assertFails(batch.commit())`; nếu test có phần "lớp khác" phía sau vẫn giữ `assertFails`.

- [ ] **Step 2:** `npm run test:rules` → FAIL ở 2 test trên.
- [ ] **Step 3: Sửa rules**

Trong `match /invoices/{invoiceId}` `allow update`, xoá nguyên khối nhánh giáo viên:

```
        ) || (
          isAssignedTeacherForStudent(resource.data.studentId) &&
          resource.data.status == 'pending' &&
          request.resource.data.status in ['paid', 'rejected'] &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt'])
```

để còn `isAdmin() || ( ownsStudent(...) ... )`. Kết quả:

```
      ) && validInvoiceData(request.resource.data) && (
        isAdmin() || (
          ownsStudent(resource.data.studentId) && resource.data.status in ['unpaid', 'overdue', 'rejected'] &&
          request.resource.data.status == 'pending' &&
          request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt'])
        )
      );
```

Trong `match /payments/{paymentId}` `allow update`, đổi `((isAdmin() || isAssignedTeacherForStudent(resource.data.studentId)) &&` thành `(isAdmin() &&`.

- [ ] **Step 4:** `npm run test:rules` → PASS, kể cả `viewer retries rejected payment` và `staff verifies payment and its invoice atomically` (admin).
- [ ] **Step 5: Commit** — `git commit -am "fix(rules): restrict payment reconciliation to admin"`

### Task 4: Giao diện — chỉ admin thấy nút xoá; ẩn xoá trên tài khoản admin

**Files:**
- Create: `src/features/users/accountPermissions.ts`
- Test: `src/features/users/accountPermissions.test.ts`
- Modify: `src/features/users/pages/UsersAdminPage.tsx:140-152` (StaffTable, FamilyTable)
- Modify: `src/features/catalog/pages/CatalogPage.tsx:21`
- Modify: `src/features/classes/pages/ClassesPage.tsx:22`
- Modify: `src/features/students/components/StudentsList.tsx:391`

**Interfaces:**
- Produces: `export function canHardDeleteAccount(actorRole: UserRole | undefined, target: { uid: string; role: UserRole }, selfUid: string | undefined): boolean`

- [ ] **Step 1: Viết test hỏng** — `src/features/users/accountPermissions.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { canHardDeleteAccount } from "@/features/users/accountPermissions";

describe("canHardDeleteAccount", () => {
  test("only an admin may delete, never an admin account or self", () => {
    expect(canHardDeleteAccount("admin", { uid: "t1", role: "teacher" }, "a1")).toBe(true);
    expect(canHardDeleteAccount("admin", { uid: "v1", role: "viewer" }, "a1")).toBe(true);
    expect(canHardDeleteAccount("admin", { uid: "a2", role: "admin" }, "a1")).toBe(false);
    expect(canHardDeleteAccount("admin", { uid: "a1", role: "teacher" }, "a1")).toBe(false);
    expect(canHardDeleteAccount("teacher", { uid: "v1", role: "viewer" }, "t1")).toBe(false);
    expect(canHardDeleteAccount(undefined, { uid: "v1", role: "viewer" }, undefined)).toBe(false);
  });
});
```

- [ ] **Step 2:** `npx vitest run src/features/users/accountPermissions.test.ts` → FAIL (module không tồn tại).
- [ ] **Step 3: Viết hàm** — `src/features/users/accountPermissions.ts`:

```ts
import { USER_ROLES } from "@/constants/roles";
import type { UserRole } from "@/types/user";

/** Khop firestore.rules users delete: chi Admin, khong xoa chinh minh, khong xoa tai khoan Admin. */
export function canHardDeleteAccount(actorRole: UserRole | undefined, target: { uid: string; role: UserRole }, selfUid: string | undefined): boolean {
  return actorRole === USER_ROLES.ADMIN && target.uid !== selfUid && target.role !== USER_ROLES.ADMIN;
}
```

(Đường import `USER_ROLES`: dùng đúng đường mà `UsersAdminPage.tsx` đang import — kiểm tra đầu file.)

- [ ] **Step 4: Áp dụng ở giao diện**

`UsersAdminPage.tsx`:
- Thêm prop `actorRole: UserRole | undefined` cho `StaffTable` và `FamilyTable`; truyền `actorRole={role}` ở chỗ render (dòng 239).
- Trong `StaffTable`, bọc nút Xoá: `{canHardDeleteAccount(actorRole, user, selfUid) && <Button ... onClick={() => onDelete(user)}>Xóa</Button>}` và bỏ `disabled`/`title` tự xoá (không còn cần vì nút bị ẩn).
- Trong `FamilyTable`, bọc nút Xoá tương tự: `{canHardDeleteAccount(actorRole, user, undefined) && <Button ...>Xóa</Button>}`.

`CatalogPage.tsx:21`: `const canHardDelete = isAdmin;`
`ClassesPage.tsx:22`: `const canDeleteClasses = role === USER_ROLES.ADMIN;`
`StudentsList.tsx:391`: `canDelete={role === USER_ROLES.ADMIN}`

- [ ] **Step 5:** `npx vitest run src/features/users src/features/catalog src/features/classes src/features/students` → PASS; `npm run typecheck && npm run lint` → PASS.
- [ ] **Step 6: Kiểm tra tay trên emulator** (`npm run emulators` + `npm run seed:local:full` + `npm run dev` với `VITE_USE_EMULATORS=true`): đăng nhập giáo viên → trang Tài khoản, Danh mục, Lớp học, Học sinh **không có** nút xoá; đăng nhập admin → có nút xoá, trừ dòng tài khoản admin.
- [ ] **Step 7: Commit**

```bash
git add src/features/users src/features/catalog/pages/CatalogPage.tsx src/features/classes/pages/ClassesPage.tsx src/features/students/components/StudentsList.tsx
git commit -m "fix(ui): show hard-delete actions to admins only"
```

### Task 5: Giao diện — đối soát chỉ admin, có hộp xác nhận

**Files:**
- Modify: `src/features/invoices/pages/InvoicesPage.tsx:57, 121-125, 185, 244, 299-320`
- Test: `src/features/invoices/pages/InvoicesPage.test.tsx:254-264` + test mới

**Interfaces:**
- Consumes: `reconcilePayment(payment, status, uid)` (`src/services/firestore/invoices.ts:213`), `Modal` (`@/components/ui/Modal`: `open`, `title`, `description?`, `children`, `onClose`, `size?`).

- [ ] **Step 1: Sửa/viết test hỏng** — trong `InvoicesPage.test.tsx`, thay test dòng 254:

```tsx
  test("lets a teacher create invoices but not reconcile payments", async () => {
    authState.value = { firebaseUser: { uid: "teacher-1" }, role: "teacher" };
    renderWithQueryClient(<InvoicesPage />);

    await screen.findByRole("button", { name: "Tạo hóa đơn" });
    expect(screen.queryByRole("tab", { name: "Đối soát" })).toBeNull();
    expect(serviceMocks.getPaymentSettings).toHaveBeenCalledTimes(1);
  });

  test("asks an admin to confirm before verifying a payment", async () => {
    serviceMocks.listInvoices.mockResolvedValue([{ id: "invoice-1", invoiceCode: "HP-01", title: "Học phí", studentId: "student-1", amount: 300_000, status: "pending" }]);
    serviceMocks.listPayments.mockResolvedValue([{ id: "payment-1", invoiceId: "invoice-1", studentId: "student-1", amount: 300_000, status: "reported", transactionReference: "TX1", note: "" }]);
    serviceMocks.reconcilePayment.mockResolvedValue(undefined);
    renderWithQueryClient(<InvoicesPage />);

    fireEvent.click(await screen.findByRole("tab", { name: "Đối soát" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận" }));
    expect(serviceMocks.reconcilePayment).not.toHaveBeenCalled();
    expect(screen.getByText(/HP-01/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận đã nhận tiền" }));
    await waitFor(() => expect(serviceMocks.reconcilePayment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "payment-1" }), "verified", "admin-1",
    ));
  });
```

(Nếu `listPayments`/`listInvoices` trong test cần thêm trường để render — ví dụ `reportedAt` — bổ sung theo kiểu dữ liệu `PaymentDoc`/`InvoiceDoc` trong `src/types/academic.ts`.)

- [ ] **Step 2:** `npx vitest run src/features/invoices/pages/InvoicesPage.test.tsx` → FAIL (teacher vẫn thấy tab; bấm Xác nhận gọi service ngay).
- [ ] **Step 3: Sửa code** — `InvoicesPage.tsx`:

Sau dòng 57:

```tsx
  const canReconcile = role === USER_ROLES.ADMIN;
  const [confirming, setConfirming] = useState<{ payment: PaymentDoc & { id: string }; status: "verified" | "rejected" } | null>(null);
```

(Thêm `useState` vào import từ `react` và `PaymentDoc` vào import type nếu chưa có.)

Dòng 123: `if (!canReconcile) throw new Error("Tài khoản không có quyền đối soát thanh toán");`
Thêm `onSuccess: () => setConfirming(null),` vào `useMutation` của `reconcile` (giữ `onSuccess` sẵn có nếu có — gộp vào cùng hàm).
Dòng 185: `TABS.filter((tab) => canReconcile || tab.value !== "reconcile")`
Dòng 244 và 299: đổi `canManageFinance` thành `canReconcile` (chỉ ở hai chỗ liên quan đối soát; giữ `canManageFinance` cho tạo hoá đơn).
Dòng 313, thay hai nút:

```tsx
<div className="flex gap-2"><Button size="sm" variant="primary" disabled={reconcile.isPending} onClick={() => setConfirming({ payment, status: "verified" })}>Xác nhận</Button><Button size="sm" variant="danger" disabled={reconcile.isPending} onClick={() => setConfirming({ payment, status: "rejected" })}>Từ chối</Button></div>
```

Thêm ngay sau `</DataListPanel>` của khối đối soát:

```tsx
      {canReconcile && confirming && (() => {
        const invoice = invoiceById.get(confirming.payment.invoiceId);
        const verifying = confirming.status === "verified";
        return (
          <Modal open onClose={() => setConfirming(null)} size="sm"
            title={verifying ? "Xác nhận đã nhận tiền?" : "Từ chối giao dịch?"}
            description="Thao tác này không hoàn tác được.">
            <dl className="space-y-1 text-sm">
              <div><dt className="inline font-semibold">Học sinh: </dt><dd className="inline">{studentNameById.get(confirming.payment.studentId) ?? confirming.payment.studentId}</dd></div>
              <div><dt className="inline font-semibold">Hóa đơn: </dt><dd className="inline">{invoice?.invoiceCode ?? confirming.payment.invoiceId}</dd></div>
              <div><dt className="inline font-semibold">Số tiền: </dt><dd className="inline tabular-nums">{formatVnd(confirming.payment.amount)}</dd></div>
              <div><dt className="inline font-semibold">Mã GD: </dt><dd className="inline font-mono">{confirming.payment.transactionReference || "Chưa cung cấp"}</dd></div>
            </dl>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" disabled={reconcile.isPending} onClick={() => setConfirming(null)}>Hủy</Button>
              <Button variant={verifying ? "primary" : "danger"} loading={reconcile.isPending}
                onClick={() => reconcile.mutate({ payment: confirming.payment, status: confirming.status })}>
                {verifying ? "Xác nhận đã nhận tiền" : "Từ chối giao dịch"}
              </Button>
            </div>
          </Modal>
        );
      })()}
```

(Kiểm tra `Button` có prop `loading` — nếu không, dùng `disabled={reconcile.isPending}`.)

- [ ] **Step 4:** `npx vitest run src/features/invoices` → PASS; `npm run typecheck && npm run lint` → PASS.
- [ ] **Step 5: Kiểm tra tay trên emulator:** giáo viên không thấy tab "Đối soát"; admin bấm "Xác nhận" → hiện hộp có tên học sinh, mã hoá đơn, số tiền; "Hủy" đóng hộp, không đổi trạng thái; xác nhận → giao dịch rời hàng đợi.
- [ ] **Step 6: Commit** — `git commit -am "fix(invoices): admin-only reconciliation with confirmation dialog"`

### Task 6: Tài liệu, kiểm tra toàn bộ, triển khai

**Files:**
- Modify: `docs/operations-runbook.md`
- Modify: `CODE_REVIEW_ISSUES.md`

- [ ] **Step 1:** Thêm vào `docs/operations-runbook.md` mục "Xoá tài khoản Admin": *"Client không xoá được tài khoản có role admin (firestore.rules). Muốn gỡ một admin: vào Firebase Console → Firestore → users/{uid}, đổi `status` thành `disabled` hoặc xoá document; xoá tài khoản ở Authentication. Luôn giữ ít nhất 1 admin `active`."* và mục "Cấu hình thanh toán": *"Hoá đơn chỉ tạo được khi `settings/payment` đã cấu hình; đổi tài khoản ngân hàng không ảnh hưởng hoá đơn cũ."*
- [ ] **Step 2:** Trong `CODE_REVIEW_ISSUES.md`, mục 1 ghi: "Đã sửa ở rules (đợt 1, commit `<sha Task 1>`)".
- [ ] **Step 3: Kiểm tra toàn bộ**

```bash
npm run typecheck
npm test
npm run lint
npm run test:rules
```

Expected: tất cả exit 0.

- [ ] **Step 4: Kiểm tra quyền giáo viên hiện có trên production trước khi deploy:** Firebase Console → `settings/payment` đã tồn tại và đúng tài khoản trung tâm (nếu không, mọi lệnh tạo hoá đơn sẽ bị từ chối sau deploy).
- [ ] **Step 5: Deploy rules + hosting cùng lúc** (theo `docs/CHECKLIST-TRIEN-KHAI-PRODUCTION.md`):

```bash
npm run build
npx firebase deploy --only firestore:rules,hosting
```

- [ ] **Step 6: Commit tài liệu** — `git commit -am "docs: record wave 1 permission changes"`

## Đợt tiếp theo

- **Đợt 2:** [kế hoạch chi phí](2026-11-22-toi-uu-chi-phi-firestore.md) + spec B2, B5, E2, E3.
- **Đợt 3–5:** viết plan riêng sau khi đợt 1 được merge (A3 cần đối chiếu từng truy vấn client với rules mới).
