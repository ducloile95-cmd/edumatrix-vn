# Edumatrix-vn

Webapp quản lý lớp học nội bộ (Admin/Giáo viên + Phụ huynh-Học sinh), chạy trên Firebase Spark Plan (gần 0 đồng). Chi tiết nghiệp vụ đầy đủ xem `AI-AGENTS-GUIDE-EDUMATRIX-VN.md`.

## Stack

React 18 + Vite + TypeScript · Tailwind CSS · React Router · Firebase Web SDK modular (Auth + Firestore + App Check) · React Hook Form + Zod · TanStack Query.

## Chạy local

```bash
npm install
cp .env.example .env   # điền config Firebase (xem bước bên dưới)
npm run dev
```

Kiểm tra trước khi commit:

```bash
npm run lint
npm run typecheck
npm run build
```

### Seed dữ liệu toàn trình trên Emulator

Mở Emulator trong terminal thứ nhất, sau đó seed ở terminal thứ hai:

```bash
npm run emulators
npm run seed:local:full -- --reset
npm run dev
```

`--reset` chỉ xóa dữ liệu của Auth/Firestore Emulator tại `127.0.0.1`; bỏ cờ này để upsert lại dataset có ID cố định. Mật khẩu chung là `Test@123456`:

- `admin@test.local`
- `teacher.a@test.local` — phụ trách `class-toan-a`
- `teacher.b@test.local` — phụ trách `class-anh-b`
- `parent.a@test.local` — liên kết `HS001`, `HS002`
- `parent.b@test.local` — liên kết `HS003`

Dataset bao phủ danh mục, lớp/ghi danh, lịch học, giáo án, điểm danh, bài tập/nộp bài, điểm, dashboard phụ huynh, học phí/thanh toán, thông báo và Messenger outbox.

## Emulator test cho Firestore Security Rules

Bắt buộc chạy trước khi coi Authentication/phân quyền là hoàn thành (A16.4, A28):

```bash
npm install                # cài @firebase/rules-unit-testing (đã có trong devDependencies)
npm run test:rules         # tự bật Firestore Emulator rồi chạy firebase/tests/security-rules.test.ts
```

Test bao phủ: unauthenticated bị chặn, claim invite hợp lệ/không hợp lệ (role hoặc studentIds không khớp invite), invite đã claimed không claim lại được, Viewer không tự đổi role/studentIds/status, Admin khóa được tài khoản người khác, tài khoản Admin bị khóa thì mất quyền admin.

## Bước 1 — Tạo Firebase project (làm thủ công trong Firebase Console)

1. Vào https://console.firebase.google.com → **Add project** → đặt tên (vd `edumatrix-vn`) → tắt Google Analytics nếu không cần → **Create project**.
2. **Build → Authentication → Get started** → tab Sign-in method → bật **Google**.
3. **Build → Firestore Database → Create database** → chọn **Production mode** → chọn region gần Việt Nam (vd `asia-southeast1`).
4. **Build → App Check** → Register app với **reCAPTCHA v3** (tạo site key tại https://www.google.com/recaptcha/admin nếu chưa có) → ghi lại site key.
5. **Project settings (⚙️) → General → Your apps → Add app → Web (</>)** → đặt tên app → **Register app**. Copy toàn bộ object `firebaseConfig`.
6. **Project settings → Service accounts**: không cần làm gì ở bước này (Spark không dùng Cloud Functions/service account ở client).
7. Dán các giá trị vừa copy vào file `.env` (dựa theo `.env.example`):
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `storageBucket` → `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`
   - `measurementId` → `VITE_FIREBASE_MEASUREMENT_ID` (nếu có)
   - reCAPTCHA site key → `VITE_APPCHECK_SITE_KEY`
8. Cập nhật `projectId` thật vào `.firebaserc` (thay `YOUR_FIREBASE_PROJECT_ID`).
9. Cài Firebase CLI nếu chưa có: `npm install -g firebase-tools`, sau đó `firebase login` và `firebase deploy --only firestore:rules,hosting`.

App Check debug token cho local dev: chạy `npm run dev`, mở Console trình duyệt sẽ thấy dòng log token do Firebase in ra — copy vào `VITE_APPCHECK_DEBUG_TOKEN` trong `.env`, rồi thêm token đó vào danh sách debug token trong Firebase Console (App Check → Apps → ⋮ → Manage debug tokens).

## Bước 2 — Deploy Hosting

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

## Cấu trúc thư mục

```text
src/
├── app/            # router, providers, guards
├── components/     # layout + feedback + ui dùng chung
├── features/
│   ├── auth/       # login, claim-invite tự động, access denied/disabled
│   ├── dashboard/
│   └── users/      # UI Admin: mời tài khoản, danh sách, khóa/mở
├── services/
│   ├── firebase/
│   └── firestore/  # invites.ts, users.ts, auditLog.ts
├── schemas/        # Zod (invite.ts...)
├── constants/       # roles, collections, routes
└── types/
firebase/
├── firestore.rules       # deny-by-default
├── firestore.indexes.json
└── tests/                # Emulator test (vitest + rules-unit-testing)
```

## Luồng mời & claim tài khoản (Phase 2)

1. Admin vào `/app/users` (chỉ Admin thấy mục "Người dùng" trên sidebar) → điền email Google + vai trò + mã học sinh (nếu là Phụ huynh) → tạo lời mời (`invites/{email}`, ID = email chuẩn hoá lowercase).
2. Người được mời đăng nhập Google. Nếu chưa có hồ sơ `users/{uid}`, app tự động kiểm tra `invites/{email}` và tạo hồ sơ nếu lời mời còn `active` — role/studentIds luôn lấy từ invite, người dùng không tự chọn được (`src/features/auth/context/AuthContext.tsx`, `src/services/firestore/users.ts`).
3. Không có lời mời hợp lệ → chuyển tới `/access-denied` kèm lý do cụ thể (chưa xác minh email / chưa được mời / lỗi kết nối).
4. Admin khóa/mở tài khoản trực tiếp ở `/app/users` (không tự khóa được chính mình).

### Tạo admin đầu tiên (bootstrap — làm 1 lần cho mỗi môi trường)

Hệ thống là bài toán con-gà-quả-trứng: tạo lời mời cần quyền Admin, mà thành Admin lại cần lời mời. Vì vậy **admin đầu tiên phải được tạo thủ công trong Firestore** (Firebase Console và Admin SDK bỏ qua Security Rules, nên thao tác này hợp lệ dù Rules cấm client tự tạo lời mời).

**Cách khuyến nghị — tạo lời mời admin rồi đăng nhập Google để claim:**

1. Firebase Console → **Firestore Database** → tạo document trong collection `invites` với **Document ID = email của bạn viết thường** (đúng `normalizeEmail` = trim + lowercase, KHÔNG bỏ dấu chấm Gmail). Ví dụ ID: `admin@gmail.com`.
2. Điền các field (khớp `InviteDoc`):

   | Field | Kiểu | Giá trị |
   |---|---|---|
   | `email` | string | (đúng email = Document ID) |
   | `role` | string | `admin` |
   | `studentIds` | array | (rỗng) |
   | `status` | string | `active` |
   | `createdBy` | string | `manual-bootstrap` |
   | `createdAt` | timestamp | (thời điểm hiện tại) |

3. Đăng nhập app bằng **đúng Google account** đó. `AuthContext` tự chạy `attemptClaimInvite` → tạo `users/{uid}` với `role: admin` → lời mời chuyển `claimed`.
4. Từ đây, admin mời mọi người khác qua UI `/app/users` — không cần thao tác thủ công nữa.

**Điều kiện:** đã bật Google sign-in trong Firebase Auth; email đã verified (tài khoản Google mặc định verified).

> Nếu claim trượt: kiểm tra Document ID có đúng email viết thường không, `status` có phải `active` không, và bạn có đăng nhập đúng account đó không.

### Test local bằng Firebase Emulator (không cần project thật)

App tự trỏ sang emulator khi bật cờ `VITE_USE_EMULATORS`. Toàn bộ chạy offline, không đụng dữ liệu production.

1. **`.env`** (hoặc `.env.local`) cho chế độ emulator:
   ```
   VITE_USE_EMULATORS=true
   VITE_FIREBASE_PROJECT_ID=demo-edumatrix
   VITE_FIREBASE_API_KEY=demo            # các VITE_FIREBASE_* khác để giá trị giả
   VITE_APPCHECK_SITE_KEY=               # để trống (App Check không áp dụng cho emulator)
   ```
2. **Terminal 1** — bật emulator (Auth 9099 + Firestore 8090, kèm Emulator UI):
   ```
   npm run emulators
   ```
3. **Terminal 2** — seed admin đầu tiên (emulator đang chạy):
   ```
   npm run seed:admin -- admin@test.local
   ```
4. **Terminal 3** — chạy app: `npm run dev`, mở app → **Đăng nhập Google** → trong trang Auth emulator, thêm tài khoản mới với email `admin@test.local` (email tự verified) → `AuthContext` tự claim → vào với quyền admin.

> Dữ liệu emulator nằm trong RAM, mất khi tắt — chạy lại `npm run seed:admin` mỗi phiên (hoặc dùng `firebase emulators:start --import/--export-on-exit` để giữ). `projectId` trong lệnh seed phải khớp `VITE_FIREBASE_PROJECT_ID` (mặc định `demo-edumatrix`).

## Trạng thái Phase

**Phase 1 (Foundation):** xong.

**Phase 2 (Auth + phân quyền):** xong phần lõi — invite/claim, route guard, Rules siết theo invite, UI Admin quản lý người dùng, Emulator test. Còn thiếu: chạy thực tế `npm run test:rules` để xác nhận pass trên máy bạn, và audit log UI xem lại lịch sử (hiện chỉ ghi, chưa có màn hình đọc).

Các collection nghiệp vụ khác (students, classes, sessions, attendance, assignments, scores, invoices...) chưa có Rules mở — mặc định bị chặn (`allow read, write: if false`) cho đến khi từng module được triển khai theo đúng vertical slice (xem `AI-AGENTS-GUIDE-EDUMATRIX-VN.md` mục A30).

## Design tokens (bảng màu hệ thống)

Xem `tailwind.config.ts`. Tóm tắt: `primary` (xanh dương tin cậy #3366F0), `success` (xanh lá #16A34A), `warning` (vàng hổ phách #F59E0B), `danger` (đỏ ấm #E4453A), `info` (xanh da trời #0EA5E9), `neutral` (xám ấm), `accent` (cam #FF8A3D — dùng thưa cho điểm nhấn/huy hiệu). Font chữ: Be Vietnam Pro.
