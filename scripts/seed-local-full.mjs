/** Seed toan trinh cho Auth + Firestore Emulator. Khong ket noi production.
 * Quy mo: 2 giao vien, 5 phu huynh, 10 hoc sinh, 3 lop, 2 mon hoc - du de test
 * het cac man hinh (lich hoc, giao an, diem danh, bai tap, diem so, hoc phi,
 * thong bao) ma khong can go tung the loai qua nhieu.
 */
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, Timestamp, writeBatch } from "firebase/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID ?? "demo-edumatrix";
const authUrl = "http://127.0.0.1:9099";
const firestoreUrl = "http://127.0.0.1:8090";
const password = "Test@123456";
const reset = process.argv.includes("--reset");

function day(offset, hour = 8, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + offset);
  return Timestamp.fromDate(date);
}

// ---------- Danh muc goc: 2 mon hoc, 2 khoa hoc, 3 lop (2 giao vien) ----------

const SUBJECTS = [
  { id: "TOAN", name: "Toán", description: "Toán tư duy" },
  { id: "ANH", name: "Tiếng Anh", description: "Tiếng Anh giao tiếp" },
];

const COURSES = {
  "course-toan-2026": { name: "Toán nền tảng 2026", subjectIds: ["TOAN"], tuitionFee: 1200000, totalSessions: 24, startDate: day(-30), endDate: day(90) },
  "course-anh-2026": { name: "Tiếng Anh thiếu niên 2026", subjectIds: ["ANH"], tuitionFee: 1500000, totalSessions: 24, startDate: day(-20), endDate: day(100) },
};

// slug dung de sinh id ngan gon cho session/lesson/assignment/score cua tung lop
const CLASSES = [
  { id: "class-toan-a", slug: "toan-a", name: "Toán A", subjectId: "TOAN", courseId: "course-toan-2026", teacherKey: "teacherA", scheduleText: "Thứ 3, 18:00", location: "Phòng 201" },
  { id: "class-toan-c", slug: "toan-c", name: "Toán C", subjectId: "TOAN", courseId: "course-toan-2026", teacherKey: "teacherA", scheduleText: "Thứ 4, 18:00", location: "Phòng 203" },
  { id: "class-anh-b", slug: "anh-b", name: "Anh B", subjectId: "ANH", courseId: "course-anh-2026", teacherKey: "teacherB", scheduleText: "Thứ 5, 18:00", location: "Phòng 202" },
];

// 10 hoc sinh - 4 o Toan A, 3 o Toan C, 3 o Anh B; viewerKey tro toi phu huynh so huu
const STUDENTS = [
  { id: "HS001", fullName: "Nguyễn Gia Minh", dob: "2014-05-12", classId: "class-toan-a", viewerKey: "viewerA" },
  { id: "HS002", fullName: "Nguyễn Hà My", dob: "2016-09-20", classId: "class-toan-a", viewerKey: "viewerA" },
  { id: "HS003", fullName: "Trần Tuấn Anh", dob: "2015-02-08", classId: "class-toan-a", viewerKey: "viewerB" },
  { id: "HS004", fullName: "Lê Bảo Châu", dob: "2014-11-30", classId: "class-toan-a", viewerKey: "viewerC" },
  { id: "HS005", fullName: "Phạm Đức Anh", dob: "2013-07-19", classId: "class-toan-c", viewerKey: "viewerD" },
  { id: "HS006", fullName: "Phạm Thảo Vy", dob: "2015-03-02", classId: "class-toan-c", viewerKey: "viewerD" },
  { id: "HS007", fullName: "Phạm Gia Bảo", dob: "2016-12-14", classId: "class-toan-c", viewerKey: "viewerD" },
  { id: "HS008", fullName: "Đỗ Minh Khuê", dob: "2014-08-25", classId: "class-anh-b", viewerKey: "viewerC" },
  { id: "HS009", fullName: "Vũ Nhật Nam", dob: "2015-06-05", classId: "class-anh-b", viewerKey: "viewerE" },
  { id: "HS010", fullName: "Vũ Hải Yến", dob: "2016-01-27", classId: "class-anh-b", viewerKey: "viewerE" },
];

const classById = (id) => CLASSES.find((c) => c.id === id);
const studentsOfClass = (classId) => STUDENTS.filter((s) => s.classId === classId);

// ---------- Tai khoan: 1 admin, 2 giao vien, 5 phu huynh (khop 10 hoc sinh) ----------

const TEACHERS = [
  { key: "teacherA", email: "teacher.a@test.local", name: "Giáo viên An" },
  { key: "teacherB", email: "teacher.b@test.local", name: "Giáo viên Bình" },
];

const VIEWERS = [
  { key: "viewerA", email: "parent.a@test.local", name: "Phụ huynh Minh" },
  { key: "viewerB", email: "parent.b@test.local", name: "Phụ huynh Lan" },
  { key: "viewerC", email: "parent.c@test.local", name: "Phụ huynh Hùng" },
  { key: "viewerD", email: "parent.d@test.local", name: "Phụ huynh Thảo" },
  { key: "viewerE", email: "parent.e@test.local", name: "Phụ huynh Quang" },
];

const accounts = [
  { key: "admin", email: "admin@test.local", name: "Admin Local", role: "admin", studentIds: [] },
  ...TEACHERS.map((t) => ({ ...t, role: "teacher", studentIds: [] })),
  ...VIEWERS.map((v) => ({ ...v, role: "viewer", studentIds: STUDENTS.filter((s) => s.viewerKey === v.key).map((s) => s.id) })),
];

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

  // ----- Tai khoan + loi moi (da claimed san) -----
  for (const account of accounts) {
    put("users", uid[account.key], { email: account.email, displayName: account.name, photoURL: null, role: account.role, studentIds: account.studentIds, status: "active", createdAt: now, updatedAt: now });
    put("invites", account.email, { email: account.email, role: account.role, studentIds: account.studentIds, status: "claimed", createdBy: uid.admin, createdAt: now, claimedAt: now });
  }

  // ----- Danh muc: mon hoc, khoa hoc -----
  for (const subject of SUBJECTS) {
    put("subjects", subject.id, { name: subject.name, code: subject.id, description: subject.description, status: "active", createdAt: now, updatedAt: now });
  }
  for (const [courseId, course] of Object.entries(COURSES)) {
    put("courses", courseId, { ...course, status: "active", createdAt: now, updatedAt: now });
  }

  // ----- Lop hoc (3 lop, 10 hoc sinh) -----
  for (const cls of CLASSES) {
    put("classes", cls.id, {
      name: cls.name,
      courseId: cls.courseId,
      subjectIds: [cls.subjectId],
      teacherIds: [uid[cls.teacherKey]],
      studentIds: studentsOfClass(cls.id).map((s) => s.id),
      scheduleText: cls.scheduleText,
      location: cls.location,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  // ----- Hoc sinh + ghi danh -----
  for (const s of STUDENTS) {
    const cls = classById(s.classId);
    put("students", s.id, {
      studentCode: s.id,
      fullName: s.fullName,
      dateOfBirth: s.dob,
      parentUids: [uid[s.viewerKey]],
      currentClassIds: [s.classId],
      teacherIds: [uid[cls.teacherKey]],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    put("enrollments", `${s.classId}_${s.id}`, { classId: s.classId, courseId: cls.courseId, studentId: s.id, status: "active", joinedAt: day(-25), endedAt: null });
  }

  // ----- Lich hoc: moi lop 1 buoi da xong (de diem danh) + 1 buoi sap toi -----
  const SESSIONS = CLASSES.flatMap((cls, i) => [
    { id: `session-${cls.slug}-past`, classId: cls.id, title: `Buổi học tuần trước - ${cls.name}`, startAt: day(-2 - i, 18), endAt: day(-2 - i, 19, 30), location: cls.location, status: "completed", note: "Buổi đã điểm danh" },
    { id: `session-${cls.slug}-next`, classId: cls.id, title: `Buổi học sắp tới - ${cls.name}`, startAt: day(1 + i, 18), endAt: day(1 + i, 19, 30), location: cls.location, status: "scheduled", note: "Chuẩn bị bài trước khi đến lớp" },
  ]);
  for (const sess of SESSIONS) {
    put("sessions", sess.id, { classId: sess.classId, title: sess.title, startAt: sess.startAt, endAt: sess.endAt, location: sess.location, status: sess.status, note: sess.note, makeUpForSessionId: null, createdAt: now, updatedAt: now });
  }
  const pastSessionOf = (classId) => SESSIONS.find((s) => s.classId === classId && s.status === "completed");
  const nextSessionOf = (classId) => SESSIONS.find((s) => s.classId === classId && s.status === "scheduled");

  // ----- Giao an: 1 ban published/lop, gan voi buoi hoc sap toi -----
  const LESSON_CONTENT = {
    "class-toan-a": { title: "Giáo án ôn tập phân số", summary: "Ôn tập cộng trừ phân số.", sections: [{ title: "Mục tiêu", content: "Hiểu mẫu số và tử số" }, { title: "Hoạt động", content: "Bài tập nhóm" }] },
    "class-toan-c": { title: "Giáo án hình học cơ bản", summary: "Nhận biết các hình cơ bản.", sections: [{ title: "Mục tiêu", content: "Phân biệt hình vuông, hình tròn, hình tam giác" }, { title: "Hoạt động", content: "Vẽ và tô màu hình" }] },
    "class-anh-b": { title: "Giáo án Daily routines", summary: "Luyện nói về thói quen hằng ngày.", sections: [{ title: "Mục tiêu", content: "Sử dụng thì hiện tại đơn" }, { title: "Hoạt động", content: "Speaking practice theo cặp" }] },
  };
  for (const cls of CLASSES) {
    const content = LESSON_CONTENT[cls.id];
    const lessonId = `lesson-${cls.slug}-01`;
    const nextSession = nextSessionOf(cls.id);
    put("lesson_plans", lessonId, { title: content.title, classId: cls.id, courseId: cls.courseId, subjectId: cls.subjectId, sessionId: nextSession.id, sections: content.sections, publicSummary: content.summary, status: "published", createdBy: uid[cls.teacherKey], createdAt: now, updatedAt: now });
    put("lesson_plan_public", lessonId, { title: content.title, classId: cls.id, sessionId: nextSession.id, publicSummary: content.summary, updatedAt: now });
  }
  put("lesson_plan_templates", "template-standard", { name: "Giáo án chuẩn", sections: [{ title: "Mục tiêu", content: "" }, { title: "Nội dung", content: "" }], createdAt: now, updatedAt: now });

  // ----- Diem danh cho buoi da xong cua tung lop (xoay vong trang thai) -----
  const ATTENDANCE_CYCLE = ["present", "present", "late", "absent", "excused"];
  const ATTENDANCE_NOTE = { late: "Trễ 10 phút", absent: "Nghỉ không phép", excused: "Có phép", present: "" };
  for (const [classIndex, cls] of CLASSES.entries()) {
    const pastSession = pastSessionOf(cls.id);
    const roster = studentsOfClass(cls.id);
    let present = 0, absent = 0, late = 0, excused = 0;
    roster.forEach((s, i) => {
      const status = ATTENDANCE_CYCLE[(i + classIndex) % ATTENDANCE_CYCLE.length];
      if (status === "present") present++; else if (status === "absent") absent++; else if (status === "late") late++; else excused++;
      put("attendance", `${pastSession.id}_${s.id}`, { sessionId: pastSession.id, classId: cls.id, studentId: s.id, status, note: ATTENDANCE_NOTE[status], markedBy: uid[cls.teacherKey], markedAt: pastSession.startAt, updatedAt: now });
    });
    put("attendance_summaries", pastSession.id, { sessionId: pastSession.id, classId: cls.id, total: roster.length, present, absent, late, excused, updatedAt: now });
  }

  // ----- Bai tap: 1 bai published/lop, 2 hoc sinh dau nop (1 da cham, 1 cho cham), con lai chua nop -----
  const ASSIGNMENT_CONTENT = {
    "class-toan-a": { title: "Bài tập phân số 01", description: "Hoàn thành bài 1 đến 5" },
    "class-toan-c": { title: "Bài tập nhận biết hình 01", description: "Vẽ 5 hình đã học" },
    "class-anh-b": { title: "Bài tập Daily routines 01", description: "Viết 5 câu về thói quen hằng ngày" },
  };
  const SCORE_CYCLE = [9, 7.5, 8, 6.5, 10];
  for (const [classIndex, cls] of CLASSES.entries()) {
    const content = ASSIGNMENT_CONTENT[cls.id];
    const assignmentId = `assignment-${cls.slug}-01`;
    const nextSession = nextSessionOf(cls.id);
    const lessonId = `lesson-${cls.slug}-01`;
    const roster = studentsOfClass(cls.id);
    put("assignments", assignmentId, { title: content.title, description: content.description, classId: cls.id, lessonPlanId: lessonId, sessionId: nextSession.id, dueAt: day(5, 20), submissionType: "text", maxScore: 10, status: "published", createdBy: uid[cls.teacherKey], createdAt: now, updatedAt: now });

    const submitters = roster.slice(0, Math.min(2, roster.length));
    let submittedCount = 0, gradedCount = 0;
    submitters.forEach((s, i) => {
      const graded = i === 0;
      submittedCount++;
      if (graded) gradedCount++;
      put("submissions", `${assignmentId}_${s.id}`, {
        assignmentId, studentId: s.id, classId: cls.id,
        submissionUrl: "",
        submissionText: graded ? "Bài làm đã hoàn thành, có giải thích chi tiết." : "Em nộp bài, chưa chắc chắn phần cuối.",
        studentNote: graded ? "Em đã hoàn thành" : "Em chưa chắc câu cuối",
        status: graded ? "graded" : "submitted",
        score: graded ? 9 : null,
        teacherComment: graded ? "Làm tốt" : "",
        checkedBy: graded ? uid[cls.teacherKey] : null,
        submittedAt: day(-1, 20),
        checkedAt: graded ? now : null,
        updatedAt: now,
      });
    });
    put("assignment_summaries", assignmentId, { assignmentId, totalStudents: roster.length, submittedCount, gradedCount, redoCount: 0, updatedAt: now });

    // ----- Diem quiz cho tat ca hoc sinh trong lop -----
    roster.forEach((s, i) => {
      const score = SCORE_CYCLE[(i + classIndex) % SCORE_CYCLE.length];
      put("scores", `score-${cls.slug}-${s.id}-quiz1`, { studentId: s.id, classId: cls.id, subjectId: cls.subjectId, assessmentName: `Quiz ${cls.name} 1`, assessmentType: "quiz", score, maxScore: 10, teacherComment: score >= 8 ? "Nắm bài tốt" : "Cần luyện thêm", createdBy: uid[cls.teacherKey], createdAt: now, updatedAt: now });
      put("student_summaries", s.id, { studentId: s.id, scoreCount: 1, averagePercent: Math.round((score / 10) * 1000) / 10, latestScore: score, latestMaxScore: 10, updatedAt: now });
    });
  }

  // ----- Hoc phi thang 07/2026: xoay vong 4 trang thai de test du kich ban -----
  const INVOICE_CYCLE = ["unpaid", "pending", "paid", "overdue"];
  const INVOICES = STUDENTS.map((s, i) => {
    const cls = classById(s.classId);
    const course = COURSES[cls.courseId];
    return { studentId: s.id, classId: cls.id, courseId: cls.courseId, amount: course.tuitionFee, status: INVOICE_CYCLE[i % INVOICE_CYCLE.length], teacherKey: cls.teacherKey, viewerKey: s.viewerKey };
  });
  for (const inv of INVOICES) {
    const invoiceId = `invoice-${inv.studentId}-202607`;
    put("invoices", invoiceId, {
      invoiceCode: `HP-${inv.studentId}-202607`,
      studentId: inv.studentId,
      courseId: inv.courseId,
      title: "Học phí tháng 07/2026",
      amount: inv.amount,
      dueAt: day(inv.status === "overdue" ? -3 : 10),
      paymentContent: `HP ${inv.studentId} 202607`,
      bankBin: "970436",
      accountNumber: "123456789",
      accountName: "TRUNG TAM EDUMATRIX",
      status: inv.status,
      createdBy: uid[inv.teacherKey],
      createdAt: now,
      updatedAt: now,
    });
    if (inv.status === "pending" || inv.status === "paid") {
      put("payments", `payment-${inv.studentId}-202607`, {
        invoiceId,
        studentId: inv.studentId,
        amount: inv.amount,
        transactionReference: `LOCAL-TX-${inv.studentId}`,
        note: inv.status === "paid" ? "Đã đối soát" : "Phụ huynh đã chuyển khoản, chờ xác nhận",
        status: inv.status === "paid" ? "verified" : "reported",
        reportedBy: uid[inv.viewerKey],
        verifiedBy: inv.status === "paid" ? uid[inv.teacherKey] : null,
        reportedAt: inv.status === "paid" ? day(-1) : now,
        verifiedAt: inv.status === "paid" ? now : null,
        updatedAt: now,
      });
    }
  }

  // ----- Thong bao mau (bai tap nhac + diem danh) -----
  const ANNOUNCEMENTS = [
    { id: "announcement-HS003-homework", type: "homework_reminder", assignmentId: "assignment-toan-a-01", classId: "class-toan-a", studentId: "HS003", title: "Nhắc bài tập", message: "Hoàn thành bài phân số trước hạn." },
    { id: "announcement-HS004-absent", type: "attendance", classId: "class-toan-a", studentId: "HS004", title: "Thông báo vắng học", message: "Học sinh vắng không phép buổi gần nhất." },
    { id: "announcement-HS009-homework", type: "homework_reminder", assignmentId: "assignment-anh-b-01", classId: "class-anh-b", studentId: "HS009", title: "Nhắc bài tập", message: "Hoàn thành bài Daily routines trước hạn." },
  ];
  for (const a of ANNOUNCEMENTS) put("announcements", a.id, { type: a.type, assignmentId: a.assignmentId ?? null, classId: a.classId, studentId: a.studentId, title: a.title, message: a.message, createdAt: now });

  // ----- Messenger: 1 vi du ket noi + 1 tin da gui -----
  put("messenger_connections", uid.viewerA, { facebookPsid: "LOCAL_PSID_PARENT_A", status: "active", connectedAt: now, updatedAt: now });
  put("message_outbox", "local-message-001", { type: "homework_reminder", studentId: "HS001", recipientPsid: "LOCAL_PSID_PARENT_A", content: "Nhắc hoàn thành bài phân số.", status: "sent", actorUid: uid.teacherA, createdAt: now });

  // ----- Cau hinh chung -----
  put("settings", "payment", { bankBin: "970436", accountNumber: "123456789", accountName: "TRUNG TAM EDUMATRIX", updatedAt: now });
  put("audit_logs", "local-seed-created", { action: "local_seed_created", actorUid: uid.admin, actorEmail: "admin@test.local", targetType: "system", targetId: projectId, meta: { source: "seed-local-full", teachers: TEACHERS.length, students: STUDENTS.length, classes: CLASSES.length, subjects: SUBJECTS.length }, createdAt: now });

  // ----- viewer_dashboards: cache doc (UI hien tai tu build lai tu raw data qua
  // buildViewerDashboard(), doc nay chi de danh cho backend/cache trong tuong lai) -----
  for (const v of VIEWERS) {
    const kids = STUDENTS.filter((s) => s.viewerKey === v.key);
    const kidIds = kids.map((s) => s.id);
    const byUniqueId = (items) => [...new Map(items.map((item) => [item.id, item])).values()];

    const nextSessions = byUniqueId(kids.map((s) => {
      const cls = classById(s.classId);
      const sess = nextSessionOf(s.classId);
      return { id: sess.id, classId: cls.id, title: sess.title, startAt: sess.startAt, location: cls.location };
    }));
    const lessonPlans = byUniqueId(kids.map((s) => {
      const cls = classById(s.classId);
      return { id: `lesson-${cls.slug}-01`, classId: cls.id, title: LESSON_CONTENT[cls.id].title, publicSummary: LESSON_CONTENT[cls.id].summary };
    }));
    const pendingAssignments = byUniqueId(kids
      .map((s) => classById(s.classId))
      .filter((cls, i, arr) => arr.findIndex((c) => c.id === cls.id) === i)
      .map((cls) => ({ id: `assignment-${cls.slug}-01`, classId: cls.id, title: ASSIGNMENT_CONTENT[cls.id].title, dueAt: day(5, 20) })));
    const latestScores = kids.map((s) => {
      const cls = classById(s.classId);
      return { id: `score-${cls.slug}-${s.id}-quiz1`, studentId: s.id, assessmentName: `Quiz ${cls.name} 1`, score: null, maxScore: 10 };
    });
    const attendance = kids.map((s) => {
      const pastSession = pastSessionOf(s.classId);
      return { id: `${pastSession.id}_${s.id}`, studentId: s.id, status: "recorded" };
    });
    const unpaidInvoices = INVOICES
      .filter((inv) => kidIds.includes(inv.studentId) && inv.status !== "paid")
      .map((inv) => ({ id: `invoice-${inv.studentId}-202607`, studentId: inv.studentId, title: "Học phí tháng 07/2026", amount: inv.amount, status: inv.status, dueAt: day(inv.status === "overdue" ? -3 : 10) }));
    const announcements = ANNOUNCEMENTS.filter((a) => kidIds.includes(a.studentId)).map((a) => ({ id: a.id, studentId: a.studentId, title: a.title, message: a.message }));

    put("viewer_dashboards", uid[v.key], { studentIds: kidIds, nextSessions, lessonPlans, pendingAssignments, latestScores, attendance, unpaidInvoices, announcements, updatedAt: now });
  }

  await batch.commit();
});
await env.cleanup();

console.log(`Seed local hoàn tất: ${projectId}${reset ? " (đã reset)" : ""}`);
console.log(`Mật khẩu chung: ${password}`);
console.log("--- Tài khoản ---");
for (const account of accounts) console.log(`${account.role.padEnd(7)} ${account.email.padEnd(20)} uid=${uid[account.key]}${account.studentIds.length ? `  con: ${account.studentIds.join(", ")}` : ""}`);
console.log("--- Lớp học ---");
for (const cls of CLASSES) console.log(`${cls.id.padEnd(14)} ${cls.name.padEnd(10)} GV=${cls.teacherKey}  HS: ${studentsOfClass(cls.id).map((s) => s.id).join(", ")}`);
console.log(`Tổng: ${TEACHERS.length} giáo viên, ${VIEWERS.length} phụ huynh, ${STUDENTS.length} học sinh, ${CLASSES.length} lớp, ${SUBJECTS.length} môn học.`);
