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
import { db } from "@/services/firebase/firestoreClient";
import { getCurrentUserDoc, isTeacherUser } from "@/services/firestore/authz";
import { listClasses } from "@/services/firestore/classes";
import { assignmentScoreId } from "@/utils/idempotency";
import type { AssignmentDoc, AssignmentSummaryDoc, ScoreDoc, SubmissionDoc, SubmissionStatus } from "@/types/academic";

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

export async function listAssignmentsByClass(classId: string, pageSize = 100): Promise<(AssignmentDoc & { id: string })[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.ASSIGNMENTS),
      where("classId", "==", classId),
      where("status", "==", "published"),
      limit(pageSize),
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

export async function listSubmissionsByStudents(studentIds: string[], pageSize = 300): Promise<(SubmissionDoc & { id: string })[]> {
  const uniqueIds = [...new Set(studentIds)].filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const currentUser = await getCurrentUserDoc();
  if (isTeacherUser(currentUser)) {
    const studentSet = new Set(uniqueIds);
    const classes = await listClasses();
    const groups = await Promise.all(
      classes.map(async (klass) => {
        const snap = await getDocs(
          query(collection(db, COLLECTIONS.SUBMISSIONS), where("classId", "==", klass.id), limit(pageSize)),
        );
        return snap.docs
          .map((item) => ({ id: item.id, ...(item.data() as SubmissionDoc) }))
          .filter((item) => studentSet.has(item.studentId));
      }),
    );
    return groups.flat();
  }

  const chunks = uniqueIds.reduce<string[][]>((acc, studentId, index) => {
    if (index % 30 === 0) acc.push([]);
    acc[acc.length - 1].push(studentId);
    return acc;
  }, []);

  const groups = await Promise.all(
    chunks.map(async (chunk) => {
      const snap = await getDocs(
        query(collection(db, COLLECTIONS.SUBMISSIONS), where("studentId", "in", chunk), limit(pageSize)),
      );
      return snap.docs.map((item) => ({ id: item.id, ...(item.data() as SubmissionDoc) }));
    }),
  );

  return groups.flat();
}

export async function gradeSubmission(
  id: string,
  assignment: AssignmentDoc & { id: string },
  input: { score: number | null; teacherComment: string; status: SubmissionStatus; checkedBy: string },
): Promise<void> {
  if (input.status === "graded" && (input.score == null || input.score < 0 || input.score > assignment.maxScore)) {
    throw new Error("SCORE_INVALID");
  }
  await runTransaction(db, async (transaction) => {
    const submissionRef = doc(db, COLLECTIONS.SUBMISSIONS, id);
    const summaryRef = doc(db, COLLECTIONS.ASSIGNMENT_SUMMARIES, assignment.id);
    const [submissionSnap, summarySnap] = await Promise.all([
      transaction.get(submissionRef),
      transaction.get(summaryRef),
    ]);

    if (!submissionSnap.exists()) throw new Error("SUBMISSION_NOT_FOUND");

    const previous = submissionSnap.data() as SubmissionDoc;
    if (previous.assignmentId !== assignment.id || previous.classId !== assignment.classId) throw new Error("SUBMISSION_MISMATCH");
    const scoreRef = doc(db, COLLECTIONS.SCORES, assignmentScoreId(assignment.id, previous.studentId));
    const studentSummaryRef = doc(db, COLLECTIONS.STUDENT_SUMMARIES, previous.studentId);
    const [scoreSnap, studentSummarySnap] = await Promise.all([
      transaction.get(scoreRef),
      transaction.get(studentSummaryRef),
    ]);
    const summary = summarySnap.data() as Partial<AssignmentSummaryDoc> | undefined;
    const currentScore = scoreSnap.exists() ? scoreSnap.data() as ScoreDoc : undefined;
    const wasGraded = previous.status === "graded";
    const wasRedo = previous.status === "redo_required";
    const isGraded = input.status === "graded";
    const isRedo = input.status === "redo_required";
    const resolvedScore = isGraded ? input.score : previous.score;
    const currentPublished = currentScore ? currentScore.published !== false : false;
    const nextPublished = isGraded;
    const studentSummary = studentSummarySnap.data() as { scoreCount?: number; averagePercent?: number; totalPercent?: number } | undefined;
    const oldCount = studentSummary?.scoreCount ?? 0;
    const oldTotal = studentSummary?.totalPercent ?? ((studentSummary?.averagePercent ?? 0) * oldCount);
    const oldPercent = currentScore && currentPublished ? currentScore.score / currentScore.maxScore * 100 : 0;
    const nextPercent = resolvedScore != null && nextPublished ? resolvedScore / assignment.maxScore * 100 : 0;
    const count = Math.max(0, oldCount - Number(currentPublished) + Number(nextPublished));
    const total = Math.max(0, oldTotal - oldPercent + nextPercent);

    transaction.update(submissionRef, {
      ...input,
      score: resolvedScore,
      checkedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(
      summaryRef,
      {
        assignmentId: assignment.id,
        totalStudents: summary?.totalStudents ?? 0,
        submittedCount: summary?.submittedCount ?? 0,
        gradedCount: Math.max(0, (summary?.gradedCount ?? 0) + Number(isGraded) - Number(wasGraded)),
        redoCount: Math.max(0, (summary?.redoCount ?? 0) + Number(isRedo) - Number(wasRedo)),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    if (resolvedScore != null) {
      transaction.set(scoreRef, {
        studentId: previous.studentId,
        classId: assignment.classId,
        subjectId: assignment.subjectId ?? "",
        assessmentName: assignment.title,
        assessmentType: "assignment",
        score: resolvedScore,
        maxScore: assignment.maxScore,
        teacherComment: input.teacherComment,
        source: "assignment",
        assignmentId: assignment.id,
        submissionId: id,
        published: nextPublished,
        createdBy: currentScore?.createdBy ?? input.checkedBy,
        createdAt: currentScore?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      transaction.set(studentSummaryRef, {
        studentId: previous.studentId,
        scoreCount: count,
        totalPercent: total,
        averagePercent: count ? total / count : 0,
        latestScore: resolvedScore,
        latestMaxScore: assignment.maxScore,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
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
