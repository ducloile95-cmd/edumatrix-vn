import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  decodeFirestoreValue,
  loadExportCollection,
  parseFlag,
} from "./firestore-export-data.mjs";

const COLLECTIONS = [
  "users", "students", "subjects", "courses", "classes", "enrollments",
  "sessions", "course_curricula", "course_curriculum_items", "standard_lessons",
  "lesson_plans", "chat_tags",
  "attendance", "attendance_summaries", "session_interactions",
  "session_student_reviews", "announcements", "chat_threads",
  "billing_items", "invoices", "payments", "assignments", "submissions",
  "assignment_summaries", "scores", "student_score_summaries",
  "lesson_plan_public", "lesson_plan_templates", "invites", "link_requests",
  "imvites",
];

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

function gmailMailbox(email) {
  if (typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  const [local, domain] = normalized.split("@");
  return domain === "gmail.com" && local ? `${local.replaceAll(".", "")}@gmail.com` : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasDuplicates(value) {
  return Array.isArray(value) && new Set(value).size !== value.length;
}

export function auditCollections(collections) {
  const byId = Object.fromEntries(COLLECTIONS.map((name) => [
    name,
    new Map((collections[name] ?? []).map((document) => [document.id, document])),
  ]));
  const issues = [];
  const add = (code, collection, documentId, detail = "") => {
    issues.push({ code, collection, documentId, detail });
  };

  for (const user of collections.users ?? []) {
    if (!Array.isArray(user.studentIds)) add("USER_STUDENT_IDS_INVALID_TYPE", "users", user.id);
    if (hasDuplicates(user.studentIds)) add("USER_STUDENT_IDS_DUPLICATE", "users", user.id);
    if (typeof user.email !== "string" || !EMAIL_PATTERN.test(user.email)) add("USER_EMAIL_INVALID", "users", user.id, user.email ?? "");
    if (user.role !== "viewer" && asArray(user.studentIds).length > 0) add("STAFF_HAS_STUDENT_LINKS", "users", user.id);
    for (const studentId of asArray(user.studentIds)) {
      const student = byId.students.get(studentId);
      if (!student) add("USER_STUDENT_MISSING", "users", user.id, studentId);
      else if (user.role === "viewer" && !asArray(student.parentUids).includes(user.id)) {
        add("USER_STUDENT_REVERSE_MISSING", "users", user.id, studentId);
      }
    }
  }

  const usersByEmail = new Map((collections.users ?? [])
    .filter((user) => typeof user.email === "string")
    .map((user) => [user.email.trim().toLowerCase(), user]));
  const usersByGmailMailbox = new Map((collections.users ?? [])
    .map((user) => [gmailMailbox(user.email), user])
    .filter(([mailbox]) => mailbox));
  for (const invite of collections.invites ?? []) {
    const validShape = typeof invite.email === "string" && EMAIL_PATTERN.test(invite.email) &&
      invite.id === invite.email && ["admin", "teacher", "viewer"].includes(invite.role) &&
      Array.isArray(invite.studentIds) && ["active", "claimed", "revoked"].includes(invite.status) &&
      typeof invite.createdBy === "string" && typeof invite.createdAt === "string";
    if (!validShape) add("INVITE_SCHEMA_INVALID", "invites", invite.id);
    if (invite.status === "active" && usersByEmail.has(invite.id)) {
      add("ACTIVE_INVITE_FOR_EXISTING_USER", "invites", invite.id, usersByEmail.get(invite.id).id);
    } else if (invite.status === "active" && gmailMailbox(invite.id) && usersByGmailMailbox.has(gmailMailbox(invite.id))) {
      add("ACTIVE_INVITE_FOR_GMAIL_ALIAS", "invites", invite.id, usersByGmailMailbox.get(gmailMailbox(invite.id)).id);
    }
  }
  for (const invite of collections.imvites ?? []) {
    add("LEGACY_IMVITES_DOCUMENT", "imvites", invite.id);
  }

  for (const course of collections.courses ?? []) {
    if (!Number.isInteger(course.classRevision) || course.classRevision < 0) {
      add("COURSE_CLASS_REVISION_MISSING", "courses", course.id);
    }
    if (asArray(course.subjectIds).length === 0) add("COURSE_SUBJECT_REQUIRED", "courses", course.id);
    if (hasDuplicates(course.subjectIds)) add("COURSE_SUBJECT_DUPLICATE", "courses", course.id);
    if (hasDuplicates(course.teacherIds)) add("COURSE_TEACHER_DUPLICATE", "courses", course.id);
    for (const subjectId of asArray(course.subjectIds)) {
      const subject = byId.subjects.get(subjectId);
      if (!subject) add("COURSE_SUBJECT_MISSING", "courses", course.id, subjectId);
      else if (subject.status !== "active" && course.status === "active") add("ACTIVE_COURSE_SUBJECT_ARCHIVED", "courses", course.id, subjectId);
    }
    for (const teacherId of asArray(course.teacherIds)) {
      const teacher = byId.users.get(teacherId);
      if (!teacher) add("COURSE_TEACHER_MISSING", "courses", course.id, teacherId);
      else if (teacher.role !== "teacher") add("COURSE_TEACHER_ROLE_INVALID", "courses", course.id, teacherId);
      else if (teacher.status !== "active" && course.status === "active") add("ACTIVE_COURSE_TEACHER_INACTIVE", "courses", course.id, teacherId);
    }
    if (course.activeCurriculumId) {
      const active = byId.course_curricula.get(course.activeCurriculumId);
      if (!active) add("COURSE_ACTIVE_CURRICULUM_MISSING", "courses", course.id, course.activeCurriculumId);
      else if (active.courseId !== course.id || active.version !== course.activeCurriculumVersion || active.status !== "published") {
        add("COURSE_ACTIVE_CURRICULUM_INVALID", "courses", course.id, course.activeCurriculumId);
      }
    }
  }

  for (const klass of collections.classes ?? []) {
    const course = byId.courses.get(klass.courseId);
    if (asArray(klass.subjectIds).length === 0) add("CLASS_SUBJECT_REQUIRED", "classes", klass.id);
    if (hasDuplicates(klass.subjectIds)) add("CLASS_SUBJECT_DUPLICATE", "classes", klass.id);
    if (hasDuplicates(klass.teacherIds)) add("CLASS_TEACHER_DUPLICATE", "classes", klass.id);
    if (hasDuplicates(klass.studentIds)) add("CLASS_STUDENT_DUPLICATE", "classes", klass.id);
    if (!course) add("CLASS_COURSE_MISSING", "classes", klass.id, klass.courseId);
    else if (klass.status === "active" && course.status !== "active") add("ACTIVE_CLASS_COURSE_INACTIVE", "classes", klass.id, klass.courseId);
    for (const subjectId of asArray(klass.subjectIds)) {
      if (!byId.subjects.has(subjectId)) add("CLASS_SUBJECT_MISSING", "classes", klass.id, subjectId);
      if (course && !asArray(course.subjectIds).includes(subjectId)) {
        add("CLASS_SUBJECT_NOT_IN_COURSE", "classes", klass.id, subjectId);
      }
    }
    for (const studentId of asArray(klass.studentIds)) {
      const student = byId.students.get(studentId);
      if (!student) add("CLASS_STUDENT_MISSING", "classes", klass.id, studentId);
      else if (!asArray(student.currentClassIds).includes(klass.id)) {
        add("CLASS_STUDENT_REVERSE_MISSING", "classes", klass.id, studentId);
      }
    }
    for (const teacherId of asArray(klass.teacherIds)) {
      const teacher = byId.users.get(teacherId);
      if (!teacher) add("CLASS_TEACHER_MISSING", "classes", klass.id, teacherId);
      else if (teacher.role !== "teacher") add("CLASS_TEACHER_ROLE_INVALID", "classes", klass.id, teacherId);
      else if (klass.status === "active" && teacher.status !== "active") add("ACTIVE_CLASS_TEACHER_INACTIVE", "classes", klass.id, teacherId);
      if (course && !asArray(course.teacherIds).includes(teacherId)) {
        add("CLASS_TEACHER_NOT_IN_COURSE", "classes", klass.id, teacherId);
      }
    }
    const sessionCount = (collections.sessions ?? []).filter(
      (session) => session.classId === klass.id && !session.makeUpForSessionId,
    ).length;
    if (course && klass.status === "active" && sessionCount !== course.totalSessions) {
      add("CLASS_COURSE_SESSION_MISMATCH", "classes", klass.id, `${sessionCount}/${course.totalSessions}`);
    }
    if (klass.curriculumId) {
      const curriculum = byId.course_curricula.get(klass.curriculumId);
      if (!curriculum || curriculum.courseId !== klass.courseId || curriculum.version !== klass.curriculumVersion) {
        add("CLASS_CURRICULUM_POINTER_INVALID", "classes", klass.id, klass.curriculumId);
      }
    }
  }

  for (const student of collections.students ?? []) {
    if (hasDuplicates(student.currentClassIds)) add("STUDENT_CLASS_DUPLICATE", "students", student.id);
    if (hasDuplicates(student.parentUids)) add("STUDENT_PARENT_DUPLICATE", "students", student.id);
    if (hasDuplicates(student.teacherIds)) add("STUDENT_TEACHER_DUPLICATE", "students", student.id);
    if (student.status === "inactive" && (asArray(student.currentClassIds).length || asArray(student.teacherIds).length)) {
      add("INACTIVE_STUDENT_HAS_ACTIVE_RELATIONS", "students", student.id);
    }
    for (const classId of asArray(student.currentClassIds)) {
      const klass = byId.classes.get(classId);
      if (!klass) add("STUDENT_CLASS_MISSING", "students", student.id, classId);
      else if (!asArray(klass.studentIds).includes(student.id)) {
        add("STUDENT_CLASS_REVERSE_MISSING", "students", student.id, classId);
      }
    }
    for (const parentUid of asArray(student.parentUids)) {
      const parent = byId.users.get(parentUid);
      if (!parent) add("STUDENT_PARENT_MISSING", "students", student.id, parentUid);
      else if (parent.role !== "viewer") add("STUDENT_PARENT_ROLE_INVALID", "students", student.id, parentUid);
      else if (!asArray(parent.studentIds).includes(student.id)) {
        add("STUDENT_PARENT_REVERSE_MISSING", "students", student.id, parentUid);
      }
    }
  }

  for (const enrollment of collections.enrollments ?? []) {
    const klass = byId.classes.get(enrollment.classId);
    const student = byId.students.get(enrollment.studentId);
    if (!klass) add("ENROLLMENT_CLASS_MISSING", "enrollments", enrollment.id, enrollment.classId);
    if (!student) add("ENROLLMENT_STUDENT_MISSING", "enrollments", enrollment.id, enrollment.studentId);
    if (klass && enrollment.courseId !== klass.courseId) {
      add("ENROLLMENT_COURSE_MISMATCH", "enrollments", enrollment.id);
    }
    if (enrollment.status === "active" && klass && !asArray(klass.studentIds).includes(enrollment.studentId)) {
      add("ACTIVE_ENROLLMENT_CLASS_LINK_MISSING", "enrollments", enrollment.id);
    }
    if (enrollment.status === "active" && student && !asArray(student.currentClassIds).includes(enrollment.classId)) {
      add("ACTIVE_ENROLLMENT_STUDENT_LINK_MISSING", "enrollments", enrollment.id);
    }
    if (enrollment.status === "active" && klass?.status !== "active") add("ACTIVE_ENROLLMENT_CLASS_INACTIVE", "enrollments", enrollment.id);
    if (enrollment.status === "active" && student?.status !== "active") add("ACTIVE_ENROLLMENT_STUDENT_INACTIVE", "enrollments", enrollment.id);
  }

  for (const session of collections.sessions ?? []) {
    if (!byId.classes.has(session.classId) && session.status !== "cancelled") {
      add("SESSION_CLASS_MISSING", "sessions", session.id, session.classId);
    }
    if (session.makeUpForSessionId && !byId.sessions.has(session.makeUpForSessionId)) {
      add("SESSION_MAKEUP_TARGET_MISSING", "sessions", session.id, session.makeUpForSessionId);
    }
    const klass = byId.classes.get(session.classId);
    if (klass?.status === "cancelled" && session.status !== "cancelled") {
      add("CANCELLED_CLASS_SESSION_ACTIVE", "sessions", session.id, session.classId);
    }
    if (klass?.curriculumVersion && session.curriculumVersion != null && session.curriculumVersion !== klass.curriculumVersion) {
      add("SESSION_CURRICULUM_VERSION_MISMATCH", "sessions", session.id, session.classId);
    }
    if (session.curriculumItemId) {
      const item = byId.course_curriculum_items.get(session.curriculumItemId);
      if (!item) add("SESSION_CURRICULUM_ITEM_MISSING", "sessions", session.id, session.curriculumItemId);
      else if (item.courseId !== klass?.courseId || item.curriculumVersion !== session.curriculumVersion || item.sequenceNumber !== session.sequenceNumber) {
        add("SESSION_CURRICULUM_ITEM_MISMATCH", "sessions", session.id, session.curriculumItemId);
      }
    }
    if (session.lessonPlanId) {
      const plan = byId.lesson_plans.get(session.lessonPlanId);
      if (!plan) add("SESSION_LESSON_PLAN_MISSING", "sessions", session.id, session.lessonPlanId);
      else if (plan.sessionId !== session.id) add("SESSION_LESSON_PLAN_REVERSE_MISMATCH", "sessions", session.id, session.lessonPlanId);
    }
  }

  for (const plan of collections.lesson_plans ?? []) {
    if (plan.sessionId) {
      const session = byId.sessions.get(plan.sessionId);
      if (!session) add("LESSON_PLAN_SESSION_MISSING", "lesson_plans", plan.id, plan.sessionId);
      else if (session.lessonPlanId !== plan.id) add("LESSON_PLAN_SESSION_REVERSE_MISMATCH", "lesson_plans", plan.id, plan.sessionId);
      if (session && plan.classId !== session.classId) add("LESSON_PLAN_SESSION_CLASS_MISMATCH", "lesson_plans", plan.id, plan.sessionId);
    }
  }

  const referenceChecks = [
    ["attendance", "classId", "classes"], ["attendance", "sessionId", "sessions"],
    ["attendance", "studentId", "students"], ["attendance_summaries", "classId", "classes"],
    ["attendance_summaries", "sessionId", "sessions"], ["session_interactions", "classId", "classes"],
    ["session_interactions", "sessionId", "sessions"], ["session_student_reviews", "classId", "classes"],
    ["session_student_reviews", "sessionId", "sessions"], ["session_student_reviews", "studentId", "students"],
  ];
  for (const [source, field, target] of referenceChecks) {
    for (const document of collections[source] ?? []) {
      if (document[field] && !byId[target].has(document[field])) {
        add(`${source.toUpperCase()}_${field.toUpperCase()}_MISSING`, source, document.id, document[field]);
      }
    }
  }

  for (const curriculum of collections.course_curricula ?? []) {
    if (!byId.courses.has(curriculum.courseId)) {
      add("CURRICULUM_COURSE_MISSING", "course_curricula", curriculum.id, curriculum.courseId);
    }
    if (curriculum.id !== `${curriculum.courseId}_v${curriculum.version}`) {
      add("CURRICULUM_ID_INVALID", "course_curricula", curriculum.id);
    }
    if (asArray(curriculum.itemIds).length !== curriculum.itemCount) {
      add("CURRICULUM_ITEM_COUNT_MISMATCH", "course_curricula", curriculum.id);
    }
    for (const itemId of asArray(curriculum.itemIds)) {
      if (!byId.course_curriculum_items.has(itemId)) add("CURRICULUM_ITEM_MISSING", "course_curricula", curriculum.id, itemId);
    }
    const course = byId.courses.get(curriculum.courseId);
    if (curriculum.status === "published" && course?.activeCurriculumId !== curriculum.id) {
      add("PUBLISHED_CURRICULUM_NOT_ACTIVE", "course_curricula", curriculum.id, curriculum.courseId);
    }
  }

  for (const item of collections.course_curriculum_items ?? []) {
    const expectedId = `${item.courseId}_v${item.curriculumVersion}_s${String(item.sequenceNumber).padStart(3, "0")}`;
    if (item.id !== expectedId) add("CURRICULUM_ITEM_ID_INVALID", "course_curriculum_items", item.id);
    if (!byId.subjects.has(item.subjectId)) add("CURRICULUM_ITEM_SUBJECT_MISSING", "course_curriculum_items", item.id, item.subjectId);
    if (item.standardLessonId && !byId.standard_lessons.has(item.standardLessonId)) {
      add("CURRICULUM_ITEM_STANDARD_LESSON_MISSING", "course_curriculum_items", item.id, item.standardLessonId);
    } else if (item.standardLessonId) {
      const lesson = byId.standard_lessons.get(item.standardLessonId);
      if (lesson.approvalStatus !== "approved") add("CURRICULUM_ITEM_STANDARD_LESSON_NOT_APPROVED", "course_curriculum_items", item.id, item.standardLessonId);
      if (lesson.subjectId !== item.subjectId) add("CURRICULUM_ITEM_STANDARD_LESSON_SUBJECT_MISMATCH", "course_curriculum_items", item.id, item.standardLessonId);
    }
  }

  for (const lesson of collections.standard_lessons ?? []) {
    if (!byId.subjects.has(lesson.subjectId)) add("STANDARD_LESSON_SUBJECT_MISSING", "standard_lessons", lesson.id, lesson.subjectId);
  }

  for (const billingItem of collections.billing_items ?? []) {
    const course = byId.courses.get(billingItem.courseId);
    if (!course) add("BILLING_ITEM_COURSE_MISSING", "billing_items", billingItem.id, billingItem.courseId);
    if (!byId.subjects.has(billingItem.subjectId)) add("BILLING_ITEM_SUBJECT_MISSING", "billing_items", billingItem.id, billingItem.subjectId);
    if (course && !asArray(course.subjectIds).includes(billingItem.subjectId)) {
      add("BILLING_ITEM_SUBJECT_NOT_IN_COURSE", "billing_items", billingItem.id, billingItem.subjectId);
    }
  }

  for (const invoice of collections.invoices ?? []) {
    if (!byId.students.has(invoice.studentId)) add("INVOICE_STUDENT_MISSING", "invoices", invoice.id, invoice.studentId);
    if (invoice.courseId && !byId.courses.has(invoice.courseId)) add("INVOICE_COURSE_MISSING", "invoices", invoice.id, invoice.courseId);
    if (invoice.classId && !byId.classes.has(invoice.classId)) add("INVOICE_CLASS_MISSING", "invoices", invoice.id, invoice.classId);
    if (invoice.billingItemId && !byId.billing_items.has(invoice.billingItemId)) add("INVOICE_BILLING_ITEM_MISSING", "invoices", invoice.id, invoice.billingItemId);
    if (Number.isFinite(invoice.unitPriceSnapshot) && Number.isFinite(invoice.quantity) && invoice.amount !== invoice.unitPriceSnapshot * invoice.quantity) {
      add("INVOICE_AMOUNT_MISMATCH", "invoices", invoice.id);
    }
  }

  for (const payment of collections.payments ?? []) {
    const invoice = byId.invoices.get(payment.invoiceId);
    if (!invoice) add("PAYMENT_INVOICE_MISSING", "payments", payment.id, payment.invoiceId);
    if (!byId.students.has(payment.studentId)) add("PAYMENT_STUDENT_MISSING", "payments", payment.id, payment.studentId);
    if (invoice && (invoice.studentId !== payment.studentId || invoice.amount !== payment.amount)) add("PAYMENT_INVOICE_MISMATCH", "payments", payment.id);
    if (invoice && payment.status === "reported" && invoice.status !== "pending") add("REPORTED_PAYMENT_INVOICE_NOT_PENDING", "payments", payment.id);
    if (invoice && payment.status === "verified" && invoice.status !== "paid") add("VERIFIED_PAYMENT_INVOICE_NOT_PAID", "payments", payment.id);
  }

  for (const assignment of collections.assignments ?? []) {
    const klass = byId.classes.get(assignment.classId);
    if (!klass) add("ASSIGNMENT_CLASS_MISSING", "assignments", assignment.id, assignment.classId);
    if (klass && assignment.subjectId && !asArray(klass.subjectIds).includes(assignment.subjectId)) {
      add("ASSIGNMENT_SUBJECT_NOT_IN_CLASS", "assignments", assignment.id, assignment.subjectId);
    }
  }

  for (const submission of collections.submissions ?? []) {
    const assignment = byId.assignments.get(submission.assignmentId);
    if (!assignment) add("SUBMISSION_ASSIGNMENT_MISSING", "submissions", submission.id, submission.assignmentId);
    if (!byId.students.has(submission.studentId)) add("SUBMISSION_STUDENT_MISSING", "submissions", submission.id, submission.studentId);
    if (assignment && (submission.classId !== assignment.classId || submission.courseId !== assignment.courseId)) {
      add("SUBMISSION_ASSIGNMENT_CONTEXT_MISMATCH", "submissions", submission.id);
    }
  }

  for (const score of collections.scores ?? []) {
    if (!byId.students.has(score.studentId)) add("SCORE_STUDENT_MISSING", "scores", score.id, score.studentId);
    if (!byId.classes.has(score.classId)) add("SCORE_CLASS_MISSING", "scores", score.id, score.classId);
    if (score.assignmentId && !byId.assignments.has(score.assignmentId)) add("SCORE_ASSIGNMENT_MISSING", "scores", score.id, score.assignmentId);
    if (score.submissionId && !byId.submissions.has(score.submissionId)) add("SCORE_SUBMISSION_MISSING", "scores", score.id, score.submissionId);
  }

  for (const thread of collections.chat_threads ?? []) {
    const student = thread.studentId ? byId.students.get(thread.studentId) : null;
    if (thread.linkStatus === "linked" && !student) add("CHAT_THREAD_STUDENT_MISSING", "chat_threads", thread.id, thread.studentId);
    if (thread.classId && !byId.classes.has(thread.classId)) add("CHAT_THREAD_CLASS_MISSING", "chat_threads", thread.id, thread.classId);
    if (student) {
      const cached = [...asArray(thread.assignedTeacherIds)].sort();
      const current = [...asArray(student.teacherIds)].sort();
      if (JSON.stringify(cached) !== JSON.stringify(current)) add("CHAT_THREAD_TEACHER_CACHE_STALE", "chat_threads", thread.id);
      if (thread.classId && !asArray(student.currentClassIds).includes(thread.classId)) add("CHAT_THREAD_CLASS_STALE", "chat_threads", thread.id, thread.classId);
    }
    for (const tagId of asArray(thread.tagIds)) {
      if (!byId.chat_tags.has(tagId)) add("CHAT_THREAD_TAG_MISSING", "chat_threads", thread.id, tagId);
    }
  }

  for (const announcement of collections.announcements ?? []) {
    if (announcement.type === "schedule_change" && !announcement.studentId && !announcement.resolvedAt) {
      add("SCHEDULE_CHANGE_WITHOUT_RECIPIENT", "announcements", announcement.id);
    }
    if (announcement.classId && !byId.classes.has(announcement.classId) && !announcement.resolvedAt) {
      add("ANNOUNCEMENT_CLASS_MISSING", "announcements", announcement.id, announcement.classId);
    }
    if (announcement.studentId && !byId.students.has(announcement.studentId)) {
      add("ANNOUNCEMENT_STUDENT_MISSING", "announcements", announcement.id, announcement.studentId);
    }
  }

  return issues.sort((left, right) => left.code.localeCompare(right.code) || left.documentId.localeCompare(right.documentId));
}

function selfCheck() {
  const decoded = decodeFirestoreValue({ arrayValue: { values: [{ stringValue: "A" }, { integerValue: "2" }] } });
  if (JSON.stringify(decoded) !== '["A",2]') throw new Error("SELF-CHECK FAIL: decode array");
  const issues = auditCollections({ users: [{ id: "u", studentIds: "bad" }] });
  if (!issues.some((issue) => issue.code === "USER_STUDENT_IDS_INVALID_TYPE")) throw new Error("SELF-CHECK FAIL: audit invalid user");
  const identityCodes = auditCollections({
    users: [
      { id: "staff", email: "broken@example.co,", role: "admin", studentIds: ["student-1"] },
      { id: "viewer", email: "viewer@example.com", role: "viewer", studentIds: [] },
      { id: "gmail-viewer", email: "viewer@gmail.com", role: "viewer", studentIds: [] },
    ],
    invites: [
      { id: "viewer@example.com", email: "viewer@example.com", role: "viewer", studentIds: [], status: "active", createdBy: "staff", createdAt: new Date().toISOString() },
      { id: "empty" },
      { id: "view.er@gmail.com", email: "view.er@gmail.com", role: "viewer", studentIds: [], status: "active", createdBy: "staff", createdAt: new Date().toISOString() },
    ],
    imvites: [{ id: "legacy" }],
  }).map((issue) => issue.code);
  for (const expected of ["USER_EMAIL_INVALID", "STAFF_HAS_STUDENT_LINKS", "ACTIVE_INVITE_FOR_EXISTING_USER", "ACTIVE_INVITE_FOR_GMAIL_ALIAS", "INVITE_SCHEMA_INVALID", "LEGACY_IMVITES_DOCUMENT"]) {
    if (!identityCodes.includes(expected)) throw new Error(`SELF-CHECK FAIL: missing ${expected}`);
  }
  const falsePositiveCodes = auditCollections({
    courses: [{ id: "course-1", classRevision: 0, subjectIds: ["subject-1"], teacherIds: [], totalSessions: 1, status: "active" }],
    subjects: [{ id: "subject-1", status: "active" }],
    classes: [{ id: "class-1", courseId: "course-1", subjectIds: ["subject-1"], teacherIds: [], studentIds: [], status: "active" }],
    sessions: [
      { id: "session-1", classId: "class-1", makeUpForSessionId: null },
      { id: "make-up-1", classId: "class-1", makeUpForSessionId: "session-1" },
    ],
    assignments: [{ id: "assignment-1", classId: "class-1", subjectId: "subject-1" }],
  }).map((issue) => issue.code);
  if (falsePositiveCodes.includes("CLASS_COURSE_SESSION_MISMATCH") || falsePositiveCodes.includes("ASSIGNMENT_SUBJECT_NOT_IN_CLASS")) {
    throw new Error("SELF-CHECK FAIL: valid assignment or make-up session flagged");
  }
  console.log("Self-check OK.");
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-check")) return selfCheck();
  const input = parseFlag(argv, "--input");
  if (!input) throw new Error("Thieu --input <thu-muc-backup>.");
  const inputDir = path.resolve(input);
  if (!fs.existsSync(inputDir)) throw new Error(`Khong tim thay thu muc backup: ${inputDir}`);
  const collections = Object.fromEntries(COLLECTIONS.map((name) => [name, loadExportCollection(inputDir, name)]));
  const issues = auditCollections(collections);
  const counts = Object.fromEntries(
    [...new Set(issues.map((issue) => issue.code))].map((code) => [code, issues.filter((issue) => issue.code === code).length]),
  );
  console.log(JSON.stringify({ input: inputDir, issueCount: issues.length, counts, issues }, null, 2));
  if (issues.length && !argv.includes("--report-only")) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
