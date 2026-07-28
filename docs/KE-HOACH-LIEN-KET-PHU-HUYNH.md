# Kế hoạch: Luồng phụ huynh tự khai báo & liên kết con

**Ngày lập:** 28/07/2026 · **Trạng thái:** chờ duyệt · **Người quyết:** Lợi

---

## 1. Mục tiêu

Trung tâm đã có sẵn dữ liệu học sinh / lớp học / buổi học. Việc còn thiếu là **nối tài khoản Gmail của phụ huynh vào hồ sơ con**, mà không bắt Admin nhập tay từng email.

Luồng đích:

```
Admin/Teacher gửi link edumatrix.id.vn
  → Phụ huynh đăng nhập Gmail (lần đầu)
  → Popup khai báo thông tin con
  → Vào danh sách chờ
  → Admin duyệt (1 batch ghi 3 doc)
  → Màn phụ huynh tự lật sang dashboard
  → Admin/Teacher đăng ký lớp cho con
```

### Ngoài phạm vi (cố ý)

- Không tự động duyệt bằng Rules — dữ liệu trẻ em, giữ 1 bước người thật kiểm tra.
- Không token hoá link mời — doc id = uid đã chặn spam ở mức đủ dùng.
- Không đụng luồng `invites/` hiện có — nó vẫn là đường chính cho Admin/Teacher.
- Không hiển thị biệt danh ở toàn bộ 22 file dùng `fullName`, chỉ 3 nơi có nhầm lẫn thật.

---

## 2. Ràng buộc đã kiểm chứng trong codebase

| # | Vị trí | Nội dung | Ảnh hưởng |
|---|---|---|---|
| R1 | `firestore.rules:540` | `users/{uid}` create bắt buộc `hasActiveInvite()` | Gmail lạ bị chặn → rơi vào `AccessDeniedPage`. Thêm nhánh mới, **không tháo rule** |
| R2 | `firestore.rules:673` | `students` create chỉ `isAdmin() \|\| isTeacher()` | Phụ huynh không ghi thẳng vào `students/` |
| R3 | `firestore.rules:555` | self-update whitelist thiếu `address/phone/facebookUrl` | Phụ huynh chưa tự điền liên hệ được |
| R4 | `firestore.rules:282` | `validStudentData` dùng `hasOnly([...])` | Thêm `nickname` phải sửa whitelist, nếu không **mọi ghi students đều fail** |
| R5 | `firestore.rules:694` | teacher-update `hasOnly(['fullName','dateOfBirth','staffNote','updatedAt'])` | Teacher muốn sửa biệt danh thì phải thêm vào đây |
| R6 | `students.ts:123` | `linkParentToStudent` sửa `users.studentIds` → chỉ Admin qua được Rules | **Duyệt là Admin-only**; Teacher vẫn ghi danh lớp bình thường |
| R7 | `AuthContext.tsx:55` | `onSnapshot` realtime trên `users/{uid}` | Duyệt xong màn phụ huynh **tự lật**, không cần login lại — miễn phí |
| R8 | `students.ts:37` | doc id = mã học sinh | Hồ sơ trùng không merge được → màn duyệt bắt buộc có nhánh "gán vào hồ sơ có sẵn" |

---

## 3. Bug phải sửa trước (độc lập, nhỏ)

`StudentForm.tsx:93-116` — ghi dở dang:

```ts
await createStudent({...});                           // ① đã commit
if (isAdmin && values.parentEmail) {
  const result = await linkParentToStudent(...);      // ② not_found nếu PH chưa login
  if (!result.linked) throw new Error(result.reason); // ③ ném lỗi, ① không rollback
}
```

**Hậu quả:** học sinh đã nằm trong DB, thông tin phụ huynh (tên/SĐT/địa chỉ/Facebook) mất trắng, UI báo lỗi, submit lại dính `student_code_exists`.

**Cách sửa (tối thiểu):** không `throw` nữa. Link thất bại → giữ nguyên học sinh đã tạo, đóng form, hiện cảnh báo mềm *"Đã tạo học sinh. Chưa liên kết được phụ huynh — email chưa có tài khoản. Gửi link đăng nhập cho phụ huynh để họ tự khai báo."* Nối thẳng vào tính năng mới, không cần cơ chế bù trừ.

---

## 4. Thiết kế dữ liệu

### 4.1 Collection mới `link_requests/{parentUid}`

**Doc id = uid** (không phải id ngẫu nhiên). Đổi lấy 3 thứ miễn phí: mỗi Gmail đúng 1 yêu cầu, submit 2 lần không đẻ 2 bản ghi, Admin biết ngay uid để ghi `users/{uid}` lúc duyệt.

```ts
export interface LinkRequestDoc {
  email: string;              // = token email, Rules ép khớp
  parentName: string;
  phone: string;
  address?: string;
  facebookUrl?: string;
  relationship: string;       // "Bố" | "Mẹ" | "Người giám hộ"
  children: {                 // 1 phụ huynh nhiều con → 1 doc duy nhất
    fullName: string;
    nickname?: string;        // để phân biệt khi trùng tên
    dateOfBirth: string;      // "YYYY-MM-DD"
    note?: string;            // "đang học lớp cô Lan" — giúp Admin đối chiếu
  }[];
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  reviewedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 4.2 Thêm `nickname` vào `StudentDoc`

Optional string. Mục đích duy nhất: phân biệt học sinh trùng tên ở màn duyệt và danh sách.

Hiển thị qua **một** helper dùng chung, không rải logic:

```ts
// src/utils/student.ts
export function studentLabel(s: { fullName: string; nickname?: string }): string {
  return s.nickname ? `${s.fullName} (${s.nickname})` : s.fullName;
}
```

Dùng ở đúng 3 nơi: màn duyệt, `StudentsList`, ô chọn học sinh khi ghi danh.

---

## 5. Các giai đoạn

### P0 — Thêm `nickname` (cần mở khoá students module)

| File | Thay đổi |
|---|---|
| `src/types/academic.ts` | `+ nickname?: string` vào `StudentDoc` |
| `firebase/firestore.rules` | thêm `'nickname'` vào `hasOnly` của `validStudentData` (**R4**) + `hasOnly` của teacher-update (**R5**) |
| `src/schemas/student.ts` | `+ nickname: z.string().trim().optional()` |
| `src/services/firestore/students.ts` | `createStudent` / `updateStudent` nhận `nickname` |
| `src/features/students/components/StudentForm.tsx` | thêm ô "Biệt danh / tên gọi khác" cạnh Họ tên |
| `src/utils/student.ts` *(mới)* | `studentLabel()` |
| `src/features/students/components/StudentsList.tsx` | dùng `studentLabel()` |

**Verify:** `npm run typecheck && npm run lint` sạch → tạo 1 học sinh có biệt danh, 1 không có, sửa tên học sinh cũ (không có `nickname`) vẫn ghi được. Bước cuối là bài test thật của R4.

---

### P1 — Sửa bug ghi dở (độc lập, làm được ngay)

`StudentForm.tsx:108-116` theo mục 3.

**Verify:** tạo học sinh + nhập email phụ huynh chưa tồn tại → học sinh được tạo, form đóng, hiện cảnh báo mềm, **không** có `throw`. Submit lại mã cũ vẫn báo `student_code_exists` như thiết kế.

---

### P2 — Rules + collection

`firebase/firestore.rules`, block mới:

```
match /link_requests/{uid} {
  allow read: if isStaff() || request.auth.uid == uid;

  allow create: if hasVerifiedEmail() &&
    request.auth.uid == uid &&
    !userExists() &&                                  // đã có tài khoản thì không cần xin
    request.resource.data.email == requesterEmail() &&
    request.resource.data.status == 'pending' &&
    request.resource.data.children is list &&
    request.resource.data.children.size() >= 1 &&
    request.resource.data.children.size() <= 5 &&
    request.resource.data.keys().hasOnly([
      'email','parentName','phone','address','facebookUrl','relationship',
      'children','status','createdAt','updatedAt'
    ]);
    // ponytail: không validate sâu từng phần tử children — Rules không làm gọn được,
    // và Admin đọc bằng mắt trước khi duyệt. Nâng lên nếu sau này tự động duyệt.

  allow update: if isAdmin() || (                      // Admin duyệt/từ chối
    request.auth.uid == uid &&                         // PH sửa & gửi lại sau khi bị từ chối
    resource.data.status != 'approved' &&
    request.resource.data.status == 'pending'
  );

  allow delete: if false;
}
```

Đồng thời nới **R3** — thêm `'phone','address','facebookUrl'` vào whitelist self-update `users/{uid}` để phụ huynh tự sửa liên hệ về sau.

`src/constants/collections.ts`: `+ LINK_REQUESTS: "link_requests"`.

**Verify:** cập nhật fixtures `npm run test:rules` — 4 ca: (a) PH chưa có tài khoản tạo được, (b) tạo hộ uid khác bị chặn, (c) tự đặt `status:'approved'` bị chặn, (d) Teacher duyệt bị chặn, Admin duyệt qua. *Lưu ý: emulator cần JDK 21+, sandbox chỉ có 11 → anh chạy trên máy thật.*

---

### P3 — Service `src/services/firestore/linkRequests.ts` (mới)

```ts
createLinkRequest(user, input)          // PH gửi/gửi lại
subscribeMyLinkRequest(uid, cb)         // PH theo dõi trạng thái realtime
listPendingLinkRequests()               // Admin
suggestMatches(declaredChild, students) // thuần, có self-check
approveLinkRequest(actor, req, decisions[])
rejectLinkRequest(actor, uid, reason)
```

`decisions[]` — mỗi con một quyết định, đúng 2 dạng:

```ts
type ChildDecision =
  | { mode: "existing"; studentId: string }
  | { mode: "new"; studentCode: string };   // Admin gõ mã lúc duyệt
```

`approveLinkRequest` = **1 `writeBatch` duy nhất**:

1. `set users/{parentUid}` — role `viewer`, status `active`, `studentIds` = mã các con, kèm phone/address/facebookUrl (Admin ghi được, R3 không chặn nhánh isAdmin)
2. mỗi con: `set students/{code}` (mode `new`) hoặc `update ... parentUids: arrayUnion(parentUid)` (mode `existing`)
3. `update link_requests/{uid}` → `approved`
4. `writeAuditLog(actor, "link_request_approved", ...)`

Hoặc thành công hết, hoặc fail hết — đúng thứ đang thiếu ở bug P1.

**Verify:** `suggestMatches` thuần → script tự chạy (`node scripts/check-suggest-matches.mjs`, chạy trong thư mục dự án vì `npm run test` hỏng ở sandbox), assert 3 ca: 2 học sinh trùng tên khác ngày sinh, trùng tên trùng ngày sinh khác biệt danh, không ai khớp → trả mảng rỗng.

---

### P4 — Màn phụ huynh

`src/features/auth/pages/AccessDeniedPage.tsx` — 3 trạng thái thay vì 1 màn lỗi:

| Điều kiện | Hiển thị |
|---|---|
| `no_invite` + chưa có link request | Form khai báo (thông tin PH + danh sách con, nút "Thêm con") |
| có request `pending` | "Đã gửi, đang chờ trung tâm duyệt" + tóm tắt đã khai |
| có request `rejected` | Lý do từ chối + nút sửa & gửi lại |
| `email_not_verified` / `error` | giữ nguyên như hiện tại |

Khi duyệt xong, `onSnapshot` `users/{uid}` (**R7**) tự bắn → app render dashboard, **không cần code chuyển màn**.

**Verify:** đăng nhập bằng 1 Gmail chưa từng dùng → thấy form, gửi → thấy màn chờ; F5 vẫn ở màn chờ (không tạo doc thứ 2 — đây là bài test của "doc id = uid").

---

### P5 — Màn Admin duyệt

Thêm **tab** vào `UsersAdminPage.tsx` (không tạo trang mới, không thêm mục sidebar).

Mỗi yêu cầu hiện: thông tin PH · từng con đã khai · **top 3 hồ sơ gợi ý** từ `suggestMatches` kèm mã HS / ngày sinh / biệt danh / lớp đang học · nút `Gán` từng dòng · nút `Tạo hồ sơ mới` (mở ô nhập mã HS) · nút `Từ chối` kèm lý do.

Nút **Duyệt** chỉ bật khi **mọi** con đã có quyết định — chặn duyệt nửa vời ngay ở UI.

**Verify:** duyệt 1 yêu cầu 2 con (1 gán hồ sơ cũ, 1 tạo mới) → `users` có đủ 2 mã trong `studentIds`, cả 2 `students` có `parentUids` chứa uid, request `approved`, audit log có bản ghi. Màn phụ huynh (mở tab khác) tự lật.

---

### P6 — Kiểm tra tổng thể

1. `npm run typecheck && npm run lint` sạch
2. `npm run test:rules` (máy thật, JDK 21+)
3. Chạy tay full luồng bằng 1 Gmail thật: gửi link → khai → duyệt → ghi danh lớp → phụ huynh thấy lịch học của con
4. Ca âm: Teacher đăng nhập vào tab duyệt → nút Duyệt phải bị ẩn/chặn (R6)

---

## 6. Tổng phạm vi

| Loại | Số lượng |
|---|---|
| File mới | 3 — `linkRequests.ts`, `utils/student.ts`, script self-check |
| File sửa | 9 |
| Collection mới | 1 |
| Rules block mới | 1 + 3 chỗ nới whitelist |
| Trang mới | 0 (tab trong trang có sẵn) |
| Mục sidebar mới | 0 |

---

## 7. Điểm cần Lợi quyết trước khi code

1. **Mở khoá `src/features/students/**`** cho P0 + P1? (phạm vi hẹp, như lần 18/07)
2. **Tiêu chí `suggestMatches`** — giữ mặc định cộng điểm (ngày sinh +3, tên +2, biệt danh +2, hiện khi ≥2), hay anh muốn khác?
3. **Số con tối đa / yêu cầu** — đang đặt 5, đủ chưa?
4. **Teacher có được duyệt không?** Mặc định *không* (theo R6). Muốn cho phép thì phải nới Rules `users.studentIds` — em khuyên giữ Admin-only.
