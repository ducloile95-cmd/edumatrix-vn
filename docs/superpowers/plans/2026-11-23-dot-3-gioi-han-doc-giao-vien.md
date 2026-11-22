# Đợt 3 — Giáo viên chỉ đọc dữ liệu lớp được phân công: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (chosen: Native). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rules chỉ cho giáo viên đọc dữ liệu gắn với lớp/học sinh được phân công (spec A3, Q4), không làm hỏng màn hình nào của giáo viên.

**Architecture:** Thay `isStaff() ||` ở các `allow read` gắn lớp/học sinh bằng `isAdmin() || <điều kiện phân công>`. Client đã truy vấn theo phân công cho giáo viên (`where classId ==` theo lớp của mình, `teacherIds array-contains`, `studentId ==` theo học sinh của mình) — rules chỉ cần khớp các dạng truy vấn đó. Ngoại lệ phải sửa client: trang Tài khoản (đang nghe toàn bộ `users`).

**Tech Stack:** Firestore Rules v2, `@firebase/rules-unit-testing`, React Query.

**Spec:** [docs/superpowers/specs/2026-11-22-sua-loi-sau-review-toan-du-an.md](../specs/2026-11-22-sua-loi-sau-review-toan-du-an.md) — A3 (Q4: giáo viên không xem lớp không được phân công).

## Global Constraints

- Danh mục dùng chung giữ `isStaff()`: `subjects`, `courses`, `billing_items`, `standard_lessons`, `lesson_plan_templates`, `course_curricula`, `course_curriculum_items`, `chat_tags`, `settings` (`payment`, `integrations`, `academic`).
- Điều kiện phân công dùng helper sẵn có: `isAssignedTeacherForClass(classId)`, `isAssignedTeacherForStudent(studentId)`, và `request.auth.uid in resource.data.teacherIds` cho `students`/`classes`.
- Giáo viên không cần đọc toàn bộ để kiểm tra phụ thuộc trước khi xoá nữa (Đợt 1: chỉ admin xoá) — các test "dependency preflight" của giáo viên đổi thành bị từ chối.
- `users`: giáo viên đọc chính mình, mọi tài khoản `admin`/`teacher` (danh bạ nhân sự), và phụ huynh có con thuộc lớp mình (kiểm tối đa 3 con đầu — `shortcut` ghi trong rules).
- `link_requests`, `messenger_delivery_events` (đọc), `session_interactions` (get): admin hoặc giáo viên phụ trách; `link_requests` chỉ admin + chủ.

## Review Focus

1. Mỗi hàm `list*` ở `src/services/firestore` mà giáo viên gọi phải có một test rules mô phỏng đúng dạng truy vấn đó (bộ lọc + orderBy) và đạt.
2. Truy vấn `documentId() in [...]` (users, student_summaries) — nếu rules không đánh giá được, đổi sang `getDoc` từng ID (cùng số lượt đọc).
3. Phụ huynh có nhiều con: giáo viên của con thứ 2/3 vẫn đọc được hồ sơ phụ huynh.
4. Trang Tài khoản của giáo viên: tab Nhân sự hiện admin/giáo viên; tab Phụ huynh chỉ hiện phụ huynh của học sinh mình.
5. Thông báo không có `studentId` (theo lớp) vẫn đọc được bởi giáo viên của lớp đó.

---

### Task 1: Rules — dữ liệu gắn lớp/học sinh

**Files:** Modify `firebase/firestore.rules` (các `allow read` liệt kê dưới); Create `firebase/tests/teacher-read-scope-rules.test.ts`; Modify `firebase/tests/teacher-scope-rules.test.ts` (test "dependency preflight"), `firebase/tests/query-scope-rules.test.ts` (truy vấn toàn cục của giáo viên) và các test khác đang khẳng định giáo viên đọc được dữ liệu lớp khác.

| Collection | Điều kiện giáo viên mới |
|---|---|
| students | `request.auth.uid in resource.data.teacherIds` |
| classes | `request.auth.uid in resource.data.teacherIds` |
| enrollments, sessions, session_student_reviews, attendance, attendance_summaries, assignments, submissions, scores, lesson_plan_public | `isAssignedTeacherForClass(resource.data.classId)` |
| lesson_plans | giữ nhánh lớp + `createdBy` (bỏ `isStaff()`), `createdBy` thêm `isActive()` (A7) |
| student_summaries | `isAssignedTeacherForStudent(studentId)` |
| invoices, payments, messenger_delivery_events | `isAssignedTeacherForStudent(resource.data.studentId)` |
| announcements | có `studentId` → `isAssignedTeacherForStudent`; không có → `isAssignedTeacherForClass(resource.data.classId)` |
| chat_threads | giữ nhánh giáo viên sẵn có (bỏ `isStaff()`) |
| session_interactions (get) | `canManageClass(get(sessions/{id}).classId)` |
| link_requests | `isAdmin()` hoặc chủ |

- [ ] Test (file mới, seed 2 giáo viên A/B, lớp c1/c2, học sinh s1/s2): với từng collection — giáo viên A đọc doc lớp mình ✓, doc lớp B ✗; mỗi dạng truy vấn client của giáo viên ✓; truy vấn không lọc ✗; admin truy vấn không lọc ✓. Chạy → FAIL ở các ca ✗.
- [ ] Sửa rules theo bảng; sửa các test cũ đang khẳng định hành vi cũ.
- [ ] `npm run test:rules` → PASS; commit `fix(rules): scope teacher reads to assigned classes and students`.

### Task 2: Users — rules + trang Tài khoản của giáo viên

**Files:** Modify `firebase/firestore.rules` (`match /users`); `src/services/firestore/users.ts` (thêm `listTeacherVisibleUsers`, `listUsersByIds` nếu cần); `src/features/users/pages/UsersAdminPage.tsx` (giáo viên không dùng `subscribeUsers`); Tests: rules test file của Task 1, `src/services/firestore/users.test.ts`.

**Interfaces — Produces:** `export async function listTeacherVisibleUsers(teacherUid: string): Promise<(UserDoc & { uid: string })[]>` — nhân sự (`role in ['admin','teacher']`) + phụ huynh của học sinh mình (qua `parentUids` của `listStudents()`), không trùng.

- [ ] Test rules: giáo viên đọc hồ sơ admin/giáo viên ✓; phụ huynh có con ở lớp mình (con thứ 1, 2, 3) ✓; phụ huynh khác ✗; truy vấn `users` không lọc ✗; `where role in ['admin','teacher']` ✓; `listUsersByIds` (dạng `documentId in`) cho phụ huynh lớp mình ✓.
- [ ] Test service: `listTeacherVisibleUsers` gộp nhân sự + phụ huynh từ `parentUids`, bỏ trùng.
- [ ] Code rules + service + trang (giáo viên: `useQuery(listTeacherVisibleUsers)`, admin: giữ `subscribeUsers`).
- [ ] `npm run test:rules`, `npx vitest run src --pool=threads --maxWorkers=1` → PASS; commit `fix(users): teachers see staff and their students' parents only`.

### Task 3: Tài liệu

- [ ] `AI-AGENTS-GUIDE-EDUMATRIX-VN.md`: sửa mẫu rules dùng `isStaff()` cho read thành `isAdmin() || <phân công>`; thêm một dòng quy tắc "giáo viên đọc theo phân công".
- [ ] commit `docs: teacher read scope`.
