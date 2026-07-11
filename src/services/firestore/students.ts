import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/services/firebase/client";
import { COLLECTIONS } from "@/constants/collections";
import { normalizeEmail } from "@/utils/email";
import type { StudentDoc, StudentStatus } from "@/types/academic";
import type { UserDoc } from "@/types/user";

export interface CreateStudentInput {
  studentCode: string;
  fullName: string;
  dateOfBirth: string;
}

export interface UpdateStudentInput {
  fullName: string;
  dateOfBirth: string;
}

/** ID = ma hoc sinh chuan hoa (A13) - khong query kiem tra ton tai truoc. */
function studentId(code: string): string {
  return code.trim().toUpperCase();
}

export async function createStudent(input: CreateStudentInput): Promise<void> {
  const id = studentId(input.studentCode);
  await setDoc(doc(db, COLLECTIONS.STUDENTS, id), {
    studentCode: id,
    fullName: input.fullName,
    dateOfBirth: input.dateOfBirth,
    parentUids: [],
    currentClassIds: [],
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateStudent(studentDocId: string, input: UpdateStudentInput): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.STUDENTS, studentDocId), {
    fullName: input.fullName,
    dateOfBirth: input.dateOfBirth,
    updatedAt: serverTimestamp(),
  });
}

export async function setStudentStatus(studentDocId: string, status: StudentStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.STUDENTS, studentDocId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Danh sach hoc sinh (<50 theo quy mo du an) - khong can pagination that su (A14). */
export async function listStudents(): Promise<(StudentDoc & { id: string })[]> {
  const q = query(collection(db, COLLECTIONS.STUDENTS), orderBy("fullName"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as StudentDoc) }));
}

export async function getStudent(studentId: string): Promise<(StudentDoc & { id: string }) | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
  return snapshot.exists() ? { id: snapshot.id, ...(snapshot.data() as StudentDoc) } : null;
}

export type LinkParentFailureReason = "not_found" | "not_viewer" | "error";
export type LinkParentResult = { linked: true } | { linked: false; reason: LinkParentFailureReason };

/**
 * Gan tai khoan Phu huynh da ton tai (da claim invite) vao hoc sinh - cap
 * nhat 2 chieu users/{uid}.studentIds va students/{id}.parentUids trong 1
 * batch de dam bao nhat quan (A5 buoc 3, Section 10.1).
 *
 * Luu y: Firestore Rules hien tai (Phase 2) chi cho phep Admin sua
 * users/{uid}.studentIds - Teacher goi ham nay se bi tu choi o buoc batch
 * commit (dung thiet ke, xem A11).
 */
export async function linkParentToStudent(
  studentDocId: string,
  parentEmail: string,
): Promise<LinkParentResult> {
  try {
    const email = normalizeEmail(parentEmail);
    const q = query(collection(db, COLLECTIONS.USERS), where("email", "==", email), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      return { linked: false, reason: "not_found" };
    }
    const userSnap = snap.docs[0];
    const user = userSnap.data() as UserDoc;
    if (user.role !== "viewer") {
      return { linked: false, reason: "not_viewer" };
    }

    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.USERS, userSnap.id), {
      studentIds: arrayUnion(studentDocId),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, COLLECTIONS.STUDENTS, studentDocId), {
      parentUids: arrayUnion(userSnap.id),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return { linked: true };
  } catch (err) {
    console.error("linkParentToStudent failed", err);
    return { linked: false, reason: "error" };
  }
}
