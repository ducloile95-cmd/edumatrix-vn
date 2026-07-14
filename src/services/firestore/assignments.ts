import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/client";
import type { AssignmentDoc, AssignmentSummaryDoc, SubmissionDoc, SubmissionStatus } from "@/types/academic";

export async function createAssignment(
  input: Omit<AssignmentDoc, "createdAt" | "updatedAt">,
  totalStudents: number,
): Promise<void> {
  const ref = await addDoc(collection(db, COLLECTIONS.ASSIGNMENTS), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, COLLECTIONS.ASSIGNMENT_SUMMARIES, ref.id), {
    assignmentId: ref.id,
    totalStudents,
    submittedCount: 0,
    gradedCount: 0,
    redoCount: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function listAssignments(): Promise<(AssignmentDoc & { id: string })[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.ASSIGNMENTS), orderBy("dueAt", "desc"), limit(200)),
  );
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as AssignmentDoc) }));
}

export async function listAssignmentSummaries(): Promise<(AssignmentSummaryDoc & { id: string })[]> {
  const snap = await getDocs(query(collection(db, COLLECTIONS.ASSIGNMENT_SUMMARIES), limit(300)));
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as AssignmentSummaryDoc) }));
}

export async function listAssignmentsByClass(classId: string): Promise<(AssignmentDoc & { id: string })[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.ASSIGNMENTS),
      where("classId", "==", classId),
      where("status", "==", "published"),
      limit(100),
    ),
  );
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as AssignmentDoc) }));
}

export async function submitAssignment(
  assignment: AssignmentDoc & { id: string },
  studentId: string,
  input: { submissionUrl: string; submissionText: string; studentNote: string },
): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.SUBMISSIONS, `${assignment.id}_${studentId}`),
    {
      assignmentId: assignment.id,
      studentId,
      classId: assignment.classId,
      ...input,
      status: "submitted",
      score: null,
      teacherComment: "",
      checkedBy: null,
      submittedAt: serverTimestamp(),
      checkedAt: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listSubmissions(assignmentId: string): Promise<(SubmissionDoc & { id: string })[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.SUBMISSIONS), where("assignmentId", "==", assignmentId), limit(200)),
  );
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as SubmissionDoc) }));
}

export async function listSubmissionsByStudents(studentIds: string[]): Promise<(SubmissionDoc & { id: string })[]> {
  const uniqueIds = [...new Set(studentIds)].filter(Boolean);
  const chunks = uniqueIds.reduce<string[][]>((acc, studentId, index) => {
    if (index % 30 === 0) acc.push([]);
    acc[acc.length - 1].push(studentId);
    return acc;
  }, []);

  const groups = await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.SUBMISSIONS), where("studentId", "in", chunk), limit(300)),
      );
      return snap.docs.map((item) => ({ id: item.id, ...(item.data() as SubmissionDoc) }));
    }),
  );

  return groups.flat();
}

export async function gradeSubmission(
  id: string,
  assignmentId: string,
  input: { score: number | null; teacherComment: string; status: SubmissionStatus; checkedBy: string },
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const submissionRef = doc(db, COLLECTIONS.SUBMISSIONS, id);
    const summaryRef = doc(db, COLLECTIONS.ASSIGNMENT_SUMMARIES, assignmentId);
    const [submissionSnap, summarySnap] = await Promise.all([
      transaction.get(submissionRef),
      transaction.get(summaryRef),
    ]);

    if (!submissionSnap.exists()) throw new Error("SUBMISSION_NOT_FOUND");

    const previous = submissionSnap.data() as SubmissionDoc;
    const summary = summarySnap.data() as Partial<AssignmentSummaryDoc> | undefined;
    const wasGraded = previous.status === "graded";
    const wasRedo = previous.status === "redo_required";
    const isGraded = input.status === "graded";
    const isRedo = input.status === "redo_required";

    transaction.update(submissionRef, {
      ...input,
      checkedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(
      summaryRef,
      {
        assignmentId,
        totalStudents: summary?.totalStudents ?? 0,
        submittedCount: summary?.submittedCount ?? 0,
        gradedCount: Math.max(0, (summary?.gradedCount ?? 0) + Number(isGraded) - Number(wasGraded)),
        redoCount: Math.max(0, (summary?.redoCount ?? 0) + Number(isRedo) - Number(wasRedo)),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function remindMissing(assignment: AssignmentDoc & { id: string }, studentIds: string[]): Promise<void> {
  const submissions = await listSubmissions(assignment.id);
  const submitted = new Set(submissions.map((item) => item.studentId));
  const missing = studentIds.filter((id) => !submitted.has(id));

  for (let offset = 0; offset < missing.length; offset += 200) {
    const batch = writeBatch(db);
    missing.slice(offset, offset + 200).forEach((studentId) => {
      batch.set(
        doc(db, COLLECTIONS.ANNOUNCEMENTS, `assignment_${assignment.id}_${studentId}`),
        {
          type: "homework_reminder",
          assignmentId: assignment.id,
          classId: assignment.classId,
          studentId,
          title: "Bài tập chưa nộp",
          message: assignment.title,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
    await batch.commit();
  }
}
