/** Seed toan trinh cho Auth + Firestore Emulator. Khong ket noi production. */
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, Timestamp, writeBatch } from "firebase/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-edumatrix";
const authUrl = "http://127.0.0.1:9099";
const firestoreUrl = "http://127.0.0.1:8090";
const password = "Test@123456";
const reset = process.argv.includes("--reset");
const accounts = [
  { key: "admin", email: "admin@test.local", name: "Admin Local", role: "admin", studentIds: [] },
  { key: "teacherA", email: "teacher.a@test.local", name: "Giáo viên An", role: "teacher", studentIds: [] },
  { key: "teacherB", email: "teacher.b@test.local", name: "Giáo viên Bình", role: "teacher", studentIds: [] },
  { key: "viewerA", email: "parent.a@test.local", name: "Phụ huynh Minh", role: "viewer", studentIds: ["HS001", "HS002"] },
  { key: "viewerB", email: "parent.b@test.local", name: "Phụ huynh Lan", role: "viewer", studentIds: ["HS003"] },
];

function day(offset, hour = 8, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + offset);
  return Timestamp.fromDate(date);
}

async function resetEmulators() {
  for (const url of [
    `${authUrl}/emulator/v1/projects/${projectId}/accounts`,
    `${firestoreUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
  ]) {
    const response = await fetch(url, { method: "DELETE" });
    if (!response.ok) throw new Error(`Không reset được emulator: ${url} (${response.status})`);
  }
}

async function ensureAccount(auth, account) {
  try {
    return (await createUserWithEmailAndPassword(auth, account.email, password)).user.uid;
  } catch (error) {
    if (error?.code !== "auth/email-already-in-use") throw error;
    return (await signInWithEmailAndPassword(auth, account.email, password)).user.uid;
  }
}

if (reset) await resetEmulators();
const app = initializeApp({ apiKey: "demo-key", projectId, authDomain: `${projectId}.firebaseapp.com` });
const auth = getAuth(app);
connectAuthEmulator(auth, authUrl, { disableWarnings: true });
const uid = {};
for (const account of accounts) uid[account.key] = await ensureAccount(auth, account);

const env = await initializeTestEnvironment({ projectId, firestore: { host: "127.0.0.1", port: 8090 } });
await env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  const batch = writeBatch(db);
  const now = Timestamp.now();
  const put = (collection, id, data) => batch.set(doc(db, collection, id), data);

  for (const account of accounts) {
    put("users", uid[account.key], { email: account.email, displayName: account.name, photoURL: null, role: account.role, studentIds: account.studentIds, status: "active", createdAt: now, updatedAt: now });
    put("invites", account.email, { email: account.email, role: account.role, studentIds: account.studentIds, status: "claimed", createdBy: uid.admin, createdAt: now, claimedAt: now });
  }

  put("subjects", "TOAN", { name: "Toán", code: "TOAN", description: "Toán tư duy", status: "active", createdAt: now, updatedAt: now });
  put("subjects", "ANH", { name: "Tiếng Anh", code: "ANH", description: "Tiếng Anh giao tiếp", status: "active", createdAt: now, updatedAt: now });
  put("courses", "course-toan-2026", { name: "Toán nền tảng 2026", subjectIds: ["TOAN"], tuitionFee: 1200000, totalSessions: 24, startDate: day(-30), endDate: day(90), status: "active", createdAt: now, updatedAt: now });
  put("courses", "course-anh-2026", { name: "Tiếng Anh thiếu niên 2026", subjectIds: ["ANH"], tuitionFee: 1500000, totalSessions: 24, startDate: day(-20), endDate: day(100), status: "active", createdAt: now, updatedAt: now });
  put("classes", "class-toan-a", { name: "Toán A", courseId: "course-toan-2026", subjectIds: ["TOAN"], teacherIds: [uid.teacherA], studentIds: ["HS001", "HS002"], scheduleText: "Thứ 3, 18:00", location: "Phòng 201", status: "active", createdAt: now, updatedAt: now });
  put("classes", "class-anh-b", { name: "Anh B", courseId: "course-anh-2026", subjectIds: ["ANH"], teacherIds: [uid.teacherB], studentIds: ["HS003"], scheduleText: "Thứ 5, 18:00", location: "Phòng 202", status: "active", createdAt: now, updatedAt: now });
  put("students", "HS001", { studentCode: "HS001", fullName: "Nguyễn Gia Minh", dateOfBirth: "2014-05-12", parentUids: [uid.viewerA], currentClassIds: ["class-toan-a"], status: "active", createdAt: now, updatedAt: now });
  put("students", "HS002", { studentCode: "HS002", fullName: "Nguyễn Hà My", dateOfBirth: "2016-09-20", parentUids: [uid.viewerA], currentClassIds: ["class-toan-a"], status: "active", createdAt: now, updatedAt: now });
  put("students", "HS003", { studentCode: "HS003", fullName: "Trần Tuấn Anh", dateOfBirth: "2015-02-08", parentUids: [uid.viewerB], currentClassIds: ["class-anh-b"], status: "active", createdAt: now, updatedAt: now });

  for (const [classId, courseId, studentId] of [["class-toan-a", "course-toan-2026", "HS001"], ["class-toan-a", "course-toan-2026", "HS002"], ["class-anh-b", "course-anh-2026", "HS003"]]) {
    put("enrollments", `${classId}_${studentId}`, { classId, courseId, studentId, status: "active", joinedAt: day(-25), endedAt: null });
  }

  put("sessions", "session-toan-past", { classId: "class-toan-a", title: "Phân số cơ bản", startAt: day(-2, 18), endAt: day(-2, 19, 30), location: "Phòng 201", status: "completed", note: "Buổi đã điểm danh", makeUpForSessionId: null, createdAt: now, updatedAt: now });
  put("sessions", "session-toan-next", { classId: "class-toan-a", title: "Cộng trừ phân số", startAt: day(1, 18), endAt: day(1, 19, 30), location: "Phòng 201", status: "scheduled", note: "Mang theo vở bài tập", makeUpForSessionId: null, createdAt: now, updatedAt: now });
  put("sessions", "session-anh-next", { classId: "class-anh-b", title: "Daily routines", startAt: day(2, 18), endAt: day(2, 19, 30), location: "Phòng 202", status: "scheduled", note: "Speaking practice", makeUpForSessionId: null, createdAt: now, updatedAt: now });
  put("lesson_plans", "lesson-toan-01", { title: "Giáo án phân số", classId: "class-toan-a", courseId: "course-toan-2026", subjectId: "TOAN", sessionId: "session-toan-next", sections: [{ title: "Mục tiêu", content: "Hiểu mẫu số và tử số" }, { title: "Hoạt động", content: "Bài tập nhóm" }], publicSummary: "Ôn tập cộng trừ phân số.", status: "published", createdBy: uid.teacherA, createdAt: now, updatedAt: now });
  put("lesson_plan_public", "lesson-toan-01", { title: "Giáo án phân số", classId: "class-toan-a", sessionId: "session-toan-next", publicSummary: "Ôn tập cộng trừ phân số.", updatedAt: now });
  put("lesson_plan_templates", "template-standard", { name: "Giáo án chuẩn", sections: [{ title: "Mục tiêu", content: "" }, { title: "Nội dung", content: "" }], createdAt: now, updatedAt: now });
  put("attendance", "session-toan-past_HS001", { sessionId: "session-toan-past", classId: "class-toan-a", studentId: "HS001", status: "present", note: "", markedBy: uid.teacherA, markedAt: day(-2, 18), updatedAt: now });
  put("attendance", "session-toan-past_HS002", { sessionId: "session-toan-past", classId: "class-toan-a", studentId: "HS002", status: "late", note: "Trễ 10 phút", markedBy: uid.teacherA, markedAt: day(-2, 18), updatedAt: now });
  put("attendance_summaries", "session-toan-past", { sessionId: "session-toan-past", classId: "class-toan-a", total: 2, present: 1, absent: 0, late: 1, excused: 0, updatedAt: now });

  put("assignments", "assignment-fraction-01", { title: "Bài tập phân số 01", description: "Hoàn thành bài 1 đến 5", classId: "class-toan-a", lessonPlanId: "lesson-toan-01", sessionId: "session-toan-next", dueAt: day(5, 20), submissionType: "text", maxScore: 10, status: "published", createdBy: uid.teacherA, createdAt: now, updatedAt: now });
  put("assignment_summaries", "assignment-fraction-01", { assignmentId: "assignment-fraction-01", totalStudents: 2, submittedCount: 1, gradedCount: 1, redoCount: 0, updatedAt: now });
  put("submissions", "assignment-fraction-01_HS001", { assignmentId: "assignment-fraction-01", studentId: "HS001", classId: "class-toan-a", submissionUrl: "", submissionText: "1/2 + 1/4 = 3/4", studentNote: "Em đã hoàn thành", status: "graded", score: 9, teacherComment: "Làm tốt", checkedBy: uid.teacherA, submittedAt: day(-1, 20), checkedAt: now, updatedAt: now });
  put("scores", "score-toan-HS001-quiz1", { studentId: "HS001", classId: "class-toan-a", subjectId: "TOAN", assessmentName: "Quiz phân số 1", assessmentType: "quiz", score: 9, maxScore: 10, teacherComment: "Nắm bài tốt", createdBy: uid.teacherA, createdAt: now, updatedAt: now });
  put("scores", "score-toan-HS002-quiz1", { studentId: "HS002", classId: "class-toan-a", subjectId: "TOAN", assessmentName: "Quiz phân số 1", assessmentType: "quiz", score: 7.5, maxScore: 10, teacherComment: "Cần luyện thêm", createdBy: uid.teacherA, createdAt: now, updatedAt: now });
  put("student_summaries", "HS001", { studentId: "HS001", scoreCount: 1, totalPercent: 90, averagePercent: 90, latestScore: 9, latestMaxScore: 10, updatedAt: now });
  put("student_summaries", "HS002", { studentId: "HS002", scoreCount: 1, totalPercent: 75, averagePercent: 75, latestScore: 7.5, latestMaxScore: 10, updatedAt: now });

  const invoice = (studentId, courseId, amount, status, creator, dueOffset = 7) => ({ invoiceCode: `HP-${studentId}-202607`, studentId, courseId, title: "Học phí tháng 07/2026", amount, dueAt: day(dueOffset), paymentContent: `HP ${studentId} 202607`, bankBin: "970436", accountNumber: "123456789", accountName: "TRUNG TAM EDUMATRIX", status, createdBy: creator, createdAt: now, updatedAt: now });
  put("invoices", "invoice-HS001-202607", invoice("HS001", "course-toan-2026", 1200000, "pending", uid.teacherA));
  put("invoices", "invoice-HS002-202607", invoice("HS002", "course-toan-2026", 1200000, "paid", uid.teacherA));
  put("invoices", "invoice-HS003-202607", invoice("HS003", "course-anh-2026", 1500000, "unpaid", uid.teacherB, 10));
  put("payments", "payment-HS001-202607", { invoiceId: "invoice-HS001-202607", studentId: "HS001", amount: 1200000, transactionReference: "LOCAL-TX-001", note: "Phụ huynh đã chuyển khoản", status: "reported", reportedBy: uid.viewerA, verifiedBy: null, reportedAt: now, verifiedAt: null, updatedAt: now });
  put("payments", "payment-HS002-202607", { invoiceId: "invoice-HS002-202607", studentId: "HS002", amount: 1200000, transactionReference: "LOCAL-TX-002", note: "Đã đối soát", status: "verified", reportedBy: uid.viewerA, verifiedBy: uid.teacherA, reportedAt: day(-1), verifiedAt: now, updatedAt: now });
  put("announcements", "announcement-HS001-homework", { type: "homework_reminder", assignmentId: "assignment-fraction-01", classId: "class-toan-a", studentId: "HS001", title: "Nhắc bài tập", message: "Hoàn thành bài phân số trước hạn.", createdAt: now });
  put("announcements", "announcement-HS002-late", { type: "attendance", classId: "class-toan-a", studentId: "HS002", title: "Thông báo đi học trễ", message: "Học sinh đi trễ 10 phút ở buổi gần nhất.", createdAt: now });
  put("messenger_connections", uid.viewerA, { facebookPsid: "LOCAL_PSID_PARENT_A", status: "active", connectedAt: now, updatedAt: now });
  put("message_outbox", "local-message-001", { type: "homework_reminder", studentId: "HS001", recipientPsid: "LOCAL_PSID_PARENT_A", content: "Nhắc hoàn thành bài phân số.", status: "sent", actorUid: uid.teacherA, createdAt: now });
  put("viewer_dashboards", uid.viewerA, {
    studentIds: ["HS001", "HS002"],
    nextSessions: [{ id: "session-toan-next", classId: "class-toan-a", title: "Cộng trừ phân số", startAt: day(1, 18), location: "Phòng 201" }],
    lessonPlans: [{ id: "lesson-toan-01", classId: "class-toan-a", title: "Giáo án phân số", publicSummary: "Ôn tập cộng trừ phân số." }],
    pendingAssignments: [{ id: "assignment-fraction-01", classId: "class-toan-a", title: "Bài tập phân số 01", dueAt: day(5, 20) }],
    latestScores: [{ id: "score-toan-HS001-quiz1", studentId: "HS001", assessmentName: "Quiz phân số 1", score: 9, maxScore: 10 }],
    attendance: [{ id: "session-toan-past_HS002", studentId: "HS002", status: "late", note: "Trễ 10 phút" }],
    unpaidInvoices: [{ id: "invoice-HS001-202607", studentId: "HS001", title: "Học phí tháng 07/2026", amount: 1200000, status: "pending", dueAt: day(7) }],
    announcements: [{ id: "announcement-HS001-homework", studentId: "HS001", title: "Nhắc bài tập", message: "Hoàn thành bài phân số trước hạn." }],
    updatedAt: now,
  });
  put("viewer_dashboards", uid.viewerB, {
    studentIds: ["HS003"],
    nextSessions: [{ id: "session-anh-next", classId: "class-anh-b", title: "Daily routines", startAt: day(2, 18), location: "Phòng 202" }],
    lessonPlans: [], pendingAssignments: [], latestScores: [], attendance: [],
    unpaidInvoices: [{ id: "invoice-HS003-202607", studentId: "HS003", title: "Học phí tháng 07/2026", amount: 1500000, status: "unpaid", dueAt: day(10) }],
    announcements: [], updatedAt: now,
  });
  put("settings", "payment", { bankBin: "970436", accountNumber: "123456789", accountName: "TRUNG TAM EDUMATRIX", updatedAt: now });
  put("audit_logs", "local-seed-created", { action: "local_seed_created", actorUid: uid.admin, actorEmail: "admin@test.local", targetType: "system", targetId: projectId, meta: { source: "seed-local-full" }, createdAt: now });
  await batch.commit();
});
await env.cleanup();

console.log(`Seed local hoàn tất: ${projectId}${reset ? " (đã reset)" : ""}`);
console.log(`Mật khẩu chung: ${password}`);
for (const account of accounts) console.log(`${account.role.padEnd(7)} ${account.email.padEnd(26)} uid=${uid[account.key]}`);
console.log("teacher.a -> class-toan-a; teacher.b -> class-anh-b");
console.log("Học phí: HS001 pending; HS002 paid; HS003 unpaid");
