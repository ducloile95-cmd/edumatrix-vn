import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadExportCollection, parseFlag } from "./firestore-export-data.mjs";

const COLLECTIONS = [
  "users", "students", "courses", "classes", "enrollments", "sessions",
  "announcements", "attendance", "attendance_summaries", "session_interactions",
  "session_student_reviews", "chat_threads",
];

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function unique(values) {
  return [...new Set(values)];
}

export function buildRepairPlan(collections) {
  const students = new Map(collections.students.map((item) => [item.id, item]));
  const classes = new Map(collections.classes.map((item) => [item.id, item]));
  const operations = [];
  const manual = [];
  const manualKeys = new Set();
  const addManual = (entry) => {
    const key = `${entry.collection}/${entry.id}`;
    if (manualKeys.has(key)) return;
    manualKeys.add(key);
    manual.push(entry);
  };

  for (const user of collections.users) {
    if (Array.isArray(user.studentIds)) continue;
    const normalized = typeof user.studentIds === "string" && students.has(user.studentIds)
      ? [user.studentIds]
      : [];
    operations.push({
      collection: "users",
      id: user.id,
      reason: "Normalize studentIds to string array",
      before: { studentIds: user.studentIds ?? null },
      after: { studentIds: normalized },
    });
  }

  for (const course of collections.courses) {
    if (Number.isInteger(course.classRevision) && course.classRevision >= 0) continue;
    operations.push({
      collection: "courses",
      id: course.id,
      reason: "Initialize the class revision used to prevent course/class TOCTOU races",
      before: { classRevision: course.classRevision ?? null },
      after: { classRevision: 1 },
    });
  }

  for (const student of collections.students) {
    const currentClassIds = unique(Array.isArray(student.currentClassIds) ? student.currentClassIds : [])
      .filter((classId) => classes.has(classId));
    const teacherIds = unique(currentClassIds.flatMap((classId) => {
      const klass = classes.get(classId);
      return Array.isArray(klass?.teacherIds) ? klass.teacherIds : [];
    })).sort();
    const oldClassIds = Array.isArray(student.currentClassIds) ? student.currentClassIds : [];
    const oldTeacherIds = Array.isArray(student.teacherIds) ? [...student.teacherIds].sort() : [];
    if (!arraysEqual(oldClassIds, currentClassIds) || !arraysEqual(oldTeacherIds, teacherIds)) {
      operations.push({
        collection: "students",
        id: student.id,
        reason: "Remove missing class references and derive teachers from remaining classes",
        before: { currentClassIds: oldClassIds, teacherIds: oldTeacherIds },
        after: { currentClassIds, teacherIds },
      });
    }
  }

  for (const session of collections.sessions) {
    if (classes.has(session.classId) || session.status === "cancelled") continue;
    operations.push({
      collection: "sessions",
      id: session.id,
      reason: "Cancel an active session whose class no longer exists",
      before: { status: session.status },
      after: { status: "cancelled" },
    });
  }

  for (const announcement of collections.announcements) {
    const lacksRecipient = announcement.type === "schedule_change" && !announcement.studentId;
    const lacksClass = announcement.classId && !classes.has(announcement.classId);
    if ((!lacksRecipient && !lacksClass) || announcement.resolvedAt) continue;
    operations.push({
      collection: "announcements",
      id: announcement.id,
      reason: lacksRecipient
        ? "Resolve a legacy schedule announcement without a student recipient"
        : "Resolve an announcement whose class no longer exists",
      before: { resolvedAt: announcement.resolvedAt ?? null },
      after: { resolvedAt: "SERVER_TIMESTAMP" },
    });
  }

  for (const thread of collections.chat_threads) {
    if (!thread.studentId) continue;
    const student = students.get(thread.studentId);
    if (!student) continue;
    const currentClassIds = unique(Array.isArray(student.currentClassIds) ? student.currentClassIds : []);
    const currentClass = currentClassIds.map((classId) => classes.get(classId)).find(Boolean) ?? null;
    const assignedTeacherIds = unique(Array.isArray(student.teacherIds) ? student.teacherIds : []).sort();
    const beforeTeachers = unique(Array.isArray(thread.assignedTeacherIds) ? thread.assignedTeacherIds : []).sort();
    const next = {
      studentName: student.fullName ?? thread.studentName ?? "",
      classId: currentClass?.id ?? "",
      className: currentClass?.name ?? "Chưa xếp lớp",
      assignedTeacherIds,
    };
    const before = {
      studentName: thread.studentName ?? "",
      classId: thread.classId ?? null,
      className: thread.className ?? null,
      assignedTeacherIds: beforeTeachers,
    };
    if (!equalRepairFields(before, next)) {
      operations.push({
        collection: "chat_threads",
        id: thread.id,
        reason: "Refresh denormalized student, class, and teacher context",
        before,
        after: next,
      });
    }
  }

  for (const enrollment of collections.enrollments) {
    if (!classes.has(enrollment.classId) || !students.has(enrollment.studentId)) {
      addManual({
        collection: "enrollments",
        id: enrollment.id,
        reason: "Orphan enrollment needs an explicit archive/delete decision",
        classId: enrollment.classId,
        studentId: enrollment.studentId,
      });
    }
  }

  for (const klass of collections.classes) {
    const course = collections.courses.find((item) => item.id === klass.courseId);
    if (!course || klass.status !== "active") continue;
    const count = collections.sessions.filter((session) => session.classId === klass.id).length;
    if (count !== course.totalSessions) {
      addManual({
        collection: "classes",
        id: klass.id,
        reason: "Session count differs from course; choose whether to generate or cancel sessions",
        actualSessionCount: count,
        expectedSessionCount: course.totalSessions,
      });
    }
  }

  const requireExistingRelations = [
    ["attendance", ["classId", "sessionId", "studentId"]],
    ["attendance_summaries", ["classId", "sessionId"]],
    ["session_interactions", ["classId", "sessionId"]],
    ["session_student_reviews", ["classId", "sessionId", "studentId"]],
  ];
  const relationMaps = {
    classId: classes,
    sessionId: new Map(collections.sessions.map((item) => [item.id, item])),
    studentId: students,
  };
  for (const [collectionName, fields] of requireExistingRelations) {
    for (const document of collections[collectionName]) {
      const missing = fields.filter((field) => document[field] && !relationMaps[field].has(document[field]));
      if (!missing.length) continue;
      addManual({
        collection: collectionName,
        id: document.id,
        reason: `Historical record references missing ${missing.join(", ")}; choose retain or archive policy`,
      });
    }
  }

  return { generatedAt: new Date().toISOString(), mode: "DRY_RUN_ONLY", operations, manual };
}

function equalRepairFields(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function selfCheck() {
  const collections = Object.fromEntries(COLLECTIONS.map((name) => [name, []]));
  collections.students.push({
    id: "student-1", fullName: "Student", currentClassIds: ["class-1"], teacherIds: ["teacher-1"], parentUids: [],
  });
  collections.classes.push({ id: "class-1", name: "Class", courseId: "course-1", teacherIds: ["teacher-1"] });
  collections.courses.push({ id: "course-1", totalSessions: 0 });
  collections.chat_threads.push({
    id: "thread-1", studentId: "student-1", studentName: "Old", classId: "missing", className: "Old class", assignedTeacherIds: [],
  });
  const plan = buildRepairPlan(collections);
  const chat = plan.operations.find((operation) => operation.collection === "chat_threads");
  if (!chat || chat.after.classId !== "class-1" || chat.after.assignedTeacherIds[0] !== "teacher-1") {
    throw new Error("SELF-CHECK FAIL: chat context repair");
  }
  console.log("Self-check OK.");
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-check")) return selfCheck();
  const input = parseFlag(argv, "--input");
  const output = parseFlag(argv, "--out");
  if (!input) throw new Error("Usage: npm run repair:plan -- --input <backup-dir> [--out <plan.json>]");
  const resolvedInput = path.resolve(input);
  const collections = Object.fromEntries(COLLECTIONS.map((name) => [name, loadExportCollection(resolvedInput, name)]));
  const plan = buildRepairPlan(collections);
  const json = `${JSON.stringify(plan, null, 2)}\n`;
  if (output) {
    const resolvedOutput = path.resolve(output);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
    fs.writeFileSync(resolvedOutput, json, { flag: "wx" });
    console.log(`Repair plan written: ${resolvedOutput}`);
  }
  console.log(`Safe operations: ${plan.operations.length}`);
  console.log(`Manual decisions: ${plan.manual.length}`);
  if (!output) console.log(json);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
