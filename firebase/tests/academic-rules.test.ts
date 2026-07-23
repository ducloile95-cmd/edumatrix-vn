import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";

/**
 * Emulator test cho Firestore Security Rules cua subjects/students/courses/
 * classes/enrollments (Phase 3, A16, A28). Chay bang: npm run test:rules.
 */

const PROJECT_ID = "edumatrix-vn-rules-test-academic";
let testEnv: RulesTestEnvironment;

const ADMIN_UID = "admin-uid";
const ADMIN_EMAIL = "admin@edumatrix.vn";
const TEACHER_UID = "teacher-uid";
const TEACHER_EMAIL = "teacher@edumatrix.vn";
const VIEWER_UID = "viewer-uid";
const VIEWER_EMAIL = "parent@gmail.com";
const OTHER_VIEWER_UID = "viewer-uid-2";
const OTHER_VIEWER_EMAIL = "other-parent@gmail.com";

const STUDENT_OWNED = "HS001";
const STUDENT_OTHER = "HS002";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
      host: "localhost",
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8090),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", ADMIN_UID), {
      email: ADMIN_EMAIL,
      displayName: "Admin",
      photoURL: null,
      role: "admin",
      studentIds: [],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "users", TEACHER_UID), {
      email: TEACHER_EMAIL,
      displayName: "Teacher",
      photoURL: null,
      role: "teacher",
      studentIds: [],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "users", VIEWER_UID), {
      email: VIEWER_EMAIL,
      displayName: "Parent",
      photoURL: null,
      role: "viewer",
      studentIds: [STUDENT_OWNED],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "users", OTHER_VIEWER_UID), {
      email: OTHER_VIEWER_EMAIL,
      displayName: "Other Parent",
      photoURL: null,
      role: "viewer",
      studentIds: [STUDENT_OTHER],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "students", STUDENT_OWNED), {
      studentCode: STUDENT_OWNED,
      fullName: "Học sinh A",
      dateOfBirth: "2012-01-01",
      parentUids: [VIEWER_UID],
      currentClassIds: [],
      teacherIds: [TEACHER_UID],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "students", STUDENT_OTHER), {
      studentCode: STUDENT_OTHER,
      fullName: "Học sinh B",
      dateOfBirth: "2012-02-02",
      parentUids: [OTHER_VIEWER_UID],
      currentClassIds: [],
      teacherIds: [],
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(db, "courses", "course_001"), {
      name: "Khóa học kiểm thử",
      subjectIds: ["IELTS"],
      teacherIds: [TEACHER_UID],
      pricePerSession: 62500,
      tuitionFee: 1500000,
      totalSessions: 24,
      startDate: Timestamp.fromDate(new Date("2026-01-01T00:00:00")),
      endDate: Timestamp.fromDate(new Date("2026-03-01T00:00:00")),
      status: "active",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
});

function asAdmin() {
  return testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL, email_verified: true }).firestore();
}
function asTeacher() {
  return testEnv.authenticatedContext(TEACHER_UID, { email: TEACHER_EMAIL, email_verified: true }).firestore();
}
function asViewer() {
  return testEnv.authenticatedContext(VIEWER_UID, { email: VIEWER_EMAIL, email_verified: true }).firestore();
}
function asUnauthenticated() {
  return testEnv.unauthenticatedContext().firestore();
}

describe("subjects", () => {
  test("unauthenticated khong doc duoc", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "subjects", "TOEIC"), {
        name: "TOEIC",
        code: "TOEIC",
        description: "",
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    await assertFails(getDoc(doc(asUnauthenticated(), "subjects", "TOEIC")));
  });

  test("Admin tao duoc mon hoc", async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(), "subjects", "TOEIC"), {
        name: "TOEIC",
        code: "TOEIC",
        description: "",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("Viewer khong tao duoc mon hoc", async () => {
    await assertFails(
      setDoc(doc(asViewer(), "subjects", "TOEIC"), {
        name: "TOEIC",
        code: "TOEIC",
        description: "",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("Viewer active van doc duoc danh muc mon hoc (khong nhay cam)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "subjects", "TOEIC"), {
        name: "TOEIC",
        code: "TOEIC",
        description: "",
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    await assertSucceeds(getDoc(doc(asViewer(), "subjects", "TOEIC")));
  });
});

describe("courses", () => {
  const validCourse = {
    name: "IELTS Foundation",
    subjectIds: ["IELTS"],
    teacherIds: [TEACHER_UID],
    pricePerSession: 62500,
    tuitionFee: 1500000,
    totalSessions: 24,
    startDate: Timestamp.fromDate(new Date("2026-01-01T00:00:00")),
    endDate: Timestamp.fromDate(new Date("2026-03-01T00:00:00")),
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  test("Admin tao duoc khoa hoc hop le", async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), "courses", "course_new"), validCourse));
  });

  test("Rules chan khoa hoc co hoc phi am", async () => {
    await assertFails(setDoc(doc(asAdmin(), "courses", "course_bad_fee"), { ...validCourse, tuitionFee: -1 }));
  });

  test("Rules chan khoa hoc khong gan mon hoc", async () => {
    await assertFails(setDoc(doc(asAdmin(), "courses", "course_no_subject"), { ...validCourse, subjectIds: [] }));
  });

  test("Rules chan khoa hoc co ngay ket thuc truoc ngay bat dau", async () => {
    await assertFails(
      setDoc(doc(asAdmin(), "courses", "course_bad_dates"), {
        ...validCourse,
        startDate: Timestamp.fromDate(new Date("2026-03-01T00:00:00")),
        endDate: Timestamp.fromDate(new Date("2026-01-01T00:00:00")),
      }),
    );
  });
});

describe("students - ownership", () => {
  test("Admin va Teacher doc duoc danh ba hoc sinh de ghi danh", async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), "students", STUDENT_OWNED)));
    await assertSucceeds(getDoc(doc(asTeacher(), "students", STUDENT_OWNED)));
    await assertSucceeds(getDoc(doc(asTeacher(), "students", STUDENT_OTHER)));
  });

  test("Viewer doc duoc hoc sinh cua minh", async () => {
    await assertSucceeds(getDoc(doc(asViewer(), "students", STUDENT_OWNED)));
  });

  test("Viewer khong doc duoc hoc sinh khac", async () => {
    await assertFails(getDoc(doc(asViewer(), "students", STUDENT_OTHER)));
  });

  test("Viewer khong tao/sua duoc hoc sinh", async () => {
    await assertFails(
      updateDoc(doc(asViewer(), "students", STUDENT_OWNED), { fullName: "Đổi tên" }),
    );
  });

  test("Teacher sua duoc ho so hoc sinh duoc gan", async () => {
    await assertSucceeds(
      updateDoc(doc(asTeacher(), "students", STUDENT_OWNED), {
        fullName: "Tên mới",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(asTeacher(), "students", STUDENT_OTHER), {
        fullName: "Khong duoc sua",
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe("classes - ownership qua studentIds", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "classes", "class_001"), {
        name: "Lớp A",
        courseId: "course_001",
        subjectIds: [],
        teacherIds: [TEACHER_UID],
        studentIds: [STUDENT_OWNED],
        scheduleText: "",
        location: "",
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  });

  test("Viewer doc duoc lop co hoc sinh cua minh", async () => {
    await assertSucceeds(getDoc(doc(asViewer(), "classes", "class_001")));
  });

  test("Viewer khac (khong co hoc sinh trong lop) khong doc duoc", async () => {
    const otherViewer = testEnv
      .authenticatedContext(OTHER_VIEWER_UID, { email: OTHER_VIEWER_EMAIL, email_verified: true })
      .firestore();
    await assertFails(getDoc(doc(otherViewer, "classes", "class_001")));
  });

  test("Teacher tao duoc lop moi", async () => {
    await assertSucceeds(
      setDoc(doc(asTeacher(), "classes", "class_002"), {
        name: "Lớp B",
        courseId: "course_001",
        subjectIds: [],
        teacherIds: [TEACHER_UID],
        studentIds: [],
        scheduleText: "",
        location: "",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("Teacher khong tao duoc lop co san hoc sinh", async () => {
    await assertFails(
      setDoc(doc(asTeacher(), "classes", "class_004"), {
        name: "Class with student",
        courseId: "course_001",
        subjectIds: [],
        teacherIds: [TEACHER_UID],
        studentIds: [STUDENT_OTHER],
        scheduleText: "",
        location: "",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("Teacher them duoc mot hoc sinh vao lop phu trach", async () => {
    await assertSucceeds(
      updateDoc(doc(asTeacher(), "classes", "class_001"), {
        studentIds: [STUDENT_OWNED, STUDENT_OTHER],
        updatedAt: serverTimestamp(),
      }),
    );
  });

  test("Viewer khong tao duoc lop", async () => {
    await assertFails(
      setDoc(doc(asViewer(), "classes", "class_003"), {
        name: "Lớp C",
        courseId: "course_001",
        subjectIds: [],
        teacherIds: [],
        studentIds: [],
        scheduleText: "",
        location: "",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe("enrollments", () => {
  test("Admin tao enrollment dung ID xac dinh thi thanh cong", async () => {
    await assertSucceeds(
      setDoc(doc(asAdmin(), "enrollments", `class_001_${STUDENT_OWNED}`), {
        classId: "class_001",
        courseId: "course_001",
        studentId: STUDENT_OWNED,
        status: "active",
        joinedAt: serverTimestamp(),
        endedAt: null,
      }),
    );
  });

  test("Admin tao enrollment sai ID (khong khop classId_studentId) thi bi tu choi", async () => {
    await assertFails(
      setDoc(doc(asAdmin(), "enrollments", "sai-id"), {
        classId: "class_001",
        courseId: "course_001",
        studentId: STUDENT_OWNED,
        status: "active",
        joinedAt: serverTimestamp(),
        endedAt: null,
      }),
    );
  });

  test("Viewer khong tao duoc enrollment", async () => {
    await assertFails(
      setDoc(doc(asViewer(), "enrollments", `class_001_${STUDENT_OWNED}`), {
        classId: "class_001",
        courseId: "course_001",
        studentId: STUDENT_OWNED,
        status: "active",
        joinedAt: serverTimestamp(),
        endedAt: null,
      }),
    );
  });

  test("Viewer doc duoc enrollment cua hoc sinh minh so huu", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "enrollments", `class_001_${STUDENT_OWNED}`), {
        classId: "class_001",
        courseId: "course_001",
        studentId: STUDENT_OWNED,
        status: "active",
        joinedAt: Timestamp.now(),
        endedAt: null,
      });
    });
    await assertSucceeds(getDoc(doc(asViewer(), "enrollments", `class_001_${STUDENT_OWNED}`)));
  });

  test("Viewer khong doc duoc enrollment cua hoc sinh khac", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "enrollments", `class_001_${STUDENT_OTHER}`), {
        classId: "class_001",
        courseId: "course_001",
        studentId: STUDENT_OTHER,
        status: "active",
        joinedAt: Timestamp.now(),
        endedAt: null,
      });
    });
    await assertFails(getDoc(doc(asViewer(), "enrollments", `class_001_${STUDENT_OTHER}`)));
  });
});
