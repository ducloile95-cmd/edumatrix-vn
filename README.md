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
├── components/     # layout + feedback dùng chung
├── features/       # auth, dashboard (mở rộng dần theo Phase 3+)
├── services/firebase/
├── constants/       # roles, collections, routes
└── types/
firebase/
├── firestore.rules       # deny-by-default
└── firestore.indexes.json
```

## Trạng thái Phase

Đã xong: **Phase 1 (Foundation)**. Auth/Rules cơ bản cho `users` + `invites` đã có trong `firebase/firestore.rules`, nhưng luồng claim-invite đầy đủ + Emulator test thuộc **Phase 2** — chưa triển khai.

Các collection nghiệp vụ khác (students, classes, sessions, attendance, assignments, scores, invoices...) chưa có Rules mở — mặc định bị chặn (`allow read, write: if false`) cho đến khi từng module được triển khai theo đúng vertical slice (xem `AI-AGENTS-GUIDE-EDUMATRIX-VN.md` mục A30).

## Design tokens (bảng màu hệ thống)

Xem `tailwind.config.ts`. Tóm tắt: `primary` (xanh dương tin cậy #3366F0), `success` (xanh lá #16A34A), `warning` (vàng hổ phách #F59E0B), `danger` (đỏ ấm #E4453A), `info` (xanh da trời #0EA5E9), `neutral` (xám ấm), `accent` (cam #FF8A3D — dùng thưa cho điểm nhấn/huy hiệu). Font chữ: Be Vietnam Pro.
