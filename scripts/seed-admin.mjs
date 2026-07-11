// Seed lời mời admin vào Firestore Emulator để test local (bootstrap admin đầu tiên).
// Yêu cầu: Firestore Emulator đang chạy (port 8090). Bypass Security Rules.
//
// Dùng:  node scripts/seed-admin.mjs <email> [projectId]
//   projectId mặc định "demo-edumatrix" — phải KHỚP VITE_FIREBASE_PROJECT_ID của app.
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";

const email = (process.argv[2] ?? "").trim().toLowerCase();
const projectId = process.argv[3] ?? process.env.FIREBASE_PROJECT_ID ?? "demo-edumatrix";

if (!email) {
  console.error("Thiếu email.  Dùng: node scripts/seed-admin.mjs <email> [projectId]");
  process.exit(1);
}

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { host: "127.0.0.1", port: 8090 },
});

await testEnv.withSecurityRulesDisabled(async (context) => {
  await setDoc(doc(context.firestore(), "invites", email), {
    email,
    role: "admin",
    studentIds: [],
    status: "active",
    createdBy: "seed-admin-script",
    createdAt: Timestamp.now(),
  });
});

await testEnv.cleanup();
console.log(`✅ Đã seed lời mời admin cho "${email}" (project ${projectId}).`);
console.log("   Đăng nhập app bằng đúng email này qua Auth emulator để claim quyền admin.");
