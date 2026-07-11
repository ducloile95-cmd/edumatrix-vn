// Tạo tài khoản admin SẴN-SÀNG để test local trên Emulator: tài khoản Auth
// (email + mật khẩu) + hồ sơ users/{uid} role admin. Vì seed thẳng users/{uid}
// nên AuthContext không chạy claim -> KHÔNG cần xác minh email.
//
// Yêu cầu: đang chạy CẢ Auth emulator (9099) VÀ Firestore emulator (8090).
//          -> npm run emulators
// Dùng:    node scripts/seed-admin-account.mjs [email] [password]
//          projectId lấy từ FIREBASE_PROJECT_ID (mặc định demo-edumatrix,
//          phải KHỚP VITE_FIREBASE_PROJECT_ID của app).
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";

const email = (process.argv[2] ?? "admin@test.local").trim().toLowerCase();
const password = process.argv[3] ?? "Test@123456";
const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-edumatrix";

const app = initializeApp({ apiKey: "demo-key", projectId, authDomain: `${projectId}.firebaseapp.com` });
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

let uid;
try {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  uid = credential.user.uid;
} catch (error) {
  console.error(`❌ Không tạo được tài khoản Auth (đã chạy 'npm run emulators' chưa?): ${error?.code ?? error}`);
  process.exit(1);
}

const testEnv = await initializeTestEnvironment({ projectId, firestore: { host: "127.0.0.1", port: 8090 } });
await testEnv.withSecurityRulesDisabled(async (context) => {
  await setDoc(doc(context.firestore(), "users", uid), {
    email,
    displayName: "Admin Test",
    photoURL: null,
    role: "admin",
    studentIds: [],
    status: "active",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
});
await testEnv.cleanup();

console.log("✅ Tài khoản admin sẵn sàng đăng nhập:");
console.log(`   Email    : ${email}`);
console.log(`   Mật khẩu : ${password}`);
console.log(`   (uid ${uid} · project ${projectId})`);
process.exit(0);
