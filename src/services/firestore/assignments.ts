import {
  collection,
  doc,
  getDoc,
  orderBy,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { listClasses } from "@/services/firestore/classes";
import { assignmentScoreId } from "@/utils/idempotency";
import { listAllQueryDocuments } from "@/services/firestore/pagination";
import type { AssignmentDoc, AssignmentSummaryDoc, ClassDoc, ScoreDoc, SubmissionDoc, SubmissionStatus } from "@/types/academic";

async function listAllPages<T>(
  collectionName: string,
  constraints: Parameters<typeof listAllQueryDocuments>[1],
  pageSize: number,
): Promise<Array<T & { id: string }>> {
  const documents = await listAllQueryDocuments(collectionName, constraints, pageSize);
  return documents.map((item) => ({ id: item.id, ...(item.data() as T) }));
}

export async function createAssignment(
  input: Omit<AssignmentDoc, "createdAt" | "updatedAt">,
): Promise<void> {
  const ref = doc(collection(db, COLLECTIONS.ASSIGNMENTS));
  await runTransaction(db, async (transaction) => {
    const classSnap = await transaction.get(doc(db, COLLECTIONS.CLASSES, input.classId));
    if (!classSnap.exists()) throw new Error("CLASS_NOT_FOUND");
    const klass = classSnap.data() as ClassDoc;
    if (input.subjectId && !klass.subjectIds.includes(input.subjectId)) throw new Error("SUBJECT_NOT_IN_CLASS");
    transaction.set(ref, {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(doc(db, COLLECTIONS.ASSIGNMENT_SUMMARIES, ref.id), {
      assignmentId: ref.id,
      totalStudents: klass.studentIds.length,
      submittedCount: 0,
      gradedCount: 0,
      redoCount: 0,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function listAssignments(): Promise<(AssignmentDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (!currentUser || (!isAdminUser(currentUser) && !isTeacherUser(currentUser))) return [];

  if (isAdminUser(currentUser)) {
    return listAllPages<AssignmentDoc>(
      COLLECTIONS.ASSIGNMENTS,
      [orderBy("dueAt", "desc")],
      200,
    );
  }

  const classes = await listClasses();
  const groups = await Promise.all(classes.map((klass) => listAllPages<AssignmentDoc>(
    COLLECTIONS.ASSIGNMENTS,
    [where("classId", "==", klass.id)],
    200,
  )));
  return groups.flat().sort((a, b) => b.dueAt.toMillis() - a.dueAt.toMillis());
}

export async function listAssignmentSummaries(): Promise<(AssignmentSummaryDoc & { id: string })[]> {
  return listAllPages<AssignmentSummaryDoc>(
    COLLECTIONS.ASSIGNMENT_SUMMARIES,
    [],
    300,
  );
}

export async function listAssignmentSummariesByIds(
  assignmentIds: string[],
): Promise<(AssignmentSummaryDoc & { id: string })[]> {
  const uniqueIds = [...new Set(assignmentIds)].filter(Boolean);
  const snapshots = await Promise.all(
    uniqueIds.map((assignmentId) => getDoc(doc(db, COLLECTIONS.ASSIGNMENT_SUMMARIES, assignmentId))),
  );
  return snapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => ({ id: snapshot.id, ...(snapshot.data() as AssignmentSummaryDoc) }));
}

export async function listAssignmentsByClass(classId: string, pageSize = 100): Promise<(AssignmentDoc & { id: string })[]> {
  return listAllPages<AssignmentDoc>(
    COLLECTIONS.ASSIGNMENTS,
    [where("classId", "==", classId), where("status", "==", "published")],
    pageSize,
  );
}

export async function listSubmissions(assignmentId: string, classId: string): Promise<(SubmissionDoc & { id: string })[]> {
  return listAllPages<SubmissionDoc>(
    COLLECTIONS.SUBMISSIONS,
    [
      where("assignmentId", "==", assignmentId),
      where("classId", "==", classId),
    ],
    200,
  );
}

export async function listSubmissionsByStudents(studentIds: string[], pageSize = 300): Promise<(SubmissionDoc & { id: string })[]> {
  const uniqueIds = [...new Set(studentIds)].filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const currentUser = await getCurrentUserDoc();
  const chunks = uniqueIds.reduce<string[][]>((acc, studentId, index) => {
    if (index % 30 === 0) acc.push([]);
    acc[acc.length - 1].push(studentId);
    return acc;
  }, []);

  if (isTeacherUser(currentUser)) {
    // Giu classId == de Rules chung minh duoc canManageClass (1 get/lop);
    // them studentId in de loc tai server thay vi tai ve toan bo bai nop cua lop.
    const classes = await listClasses();
    const groups = await Promise.all(classes.flatMap((klass) => chunks.map((chunk) => (
      listAllPages<SubmissionDoc>(
        COLLECTIONS.SUBMISSIONS,
        [where("classId", "==", klass.id), where("studentId", "in", chunk)],
        pageSize,
      )
    ))));
    return groups.flat();
  }

  const groups = await Promise.all(chunks.map((chunk) => listAllPages<SubmissionDoc>(
    COLLECTIONS.SUBMISSIONS,
    [where("studentId", "in", chunk)],
    pageSize,
  )));

  return groups.flat();
}

export async function gradeSubmission(
  id: string,
  assignment: AssignmentDoc & { id: string },
  input: { score: number | null; teacherComment: string; status: SubmissionStatus; checkedBy: string },
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const submissionRef = doc(db, COLLECTIONS.SUBMISSIONS, id);
    const summaryRef = doc(db, COLLECTIONS.ASSIGNMENT_SUMMARIES, assignment.id);
    const assignmentRef = doc(db, COLLECTIONS.ASSIGNMENTS, assignment.id);
    const [assignmentSnap, submissionSnap, summarySnap] = await Promise.all([
      transaction.get(assignmentRef),
      transaction.get(submissionRef),
      transaction.get(summaryRef),
    ]);

    if (!assignmentSnap.exists()) throw new Error("ASSIGNMENT_NOT_FOUND");
    if (!submissionSnap.exists()) throw new Error("SUBMISSION_NOT_FOUND");
    const currentAssignment = assignmentSnap.data() as AssignmentDoc;
    if (input.status === "graded" && (input.score == null || input.score < 0 || input.score > currentAssignment.maxScore)) {
      throw new Error("SCORE_INVALID");
    }
    const previous = submissionSnap.data() as SubmissionDoc;
    if (previous.assignmentId !== assignment.id || previous.classId !== currentAssignment.classId) throw new Error("SUBMISSION_MISMATCH");
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
    const nextPercent = resolvedScore != null && nextPublished ? resolvedScore / currentAssignment.maxScore * 100 : 0;
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
        classId: currentAssignment.classId,
        subjectId: currentAssignment.subjectId ?? "",
        assessmentName: currentAssignment.title,
        assessmentType: "assignment",
        score: resolvedScore,
        maxScore: currentAssignment.maxScore,
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
        latestMaxScore: currentAssignment.maxScore,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  });
}

export async function remindMissing(assignment: AssignmentDoc & { id: string }, studentIds: string[]): Promise<void> {
  const submissions = await listSubmissions(assignment.id, assignment.classId);
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
