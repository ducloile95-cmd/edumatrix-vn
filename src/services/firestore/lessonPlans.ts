import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { listClasses } from "@/services/firestore/classes";
import { normalizeLessonPlan, normalizeLessonPlanTemplate } from "@/utils/lessonPlan";
import type { LessonPlanDoc, LessonPlanDriveAttachment, LessonPlanTemplateDoc, SessionDoc } from "@/types/academic";
import type { LessonPlanFormValues } from "@/schemas/lessonPlan";

function nullable(value: string | null): string | null { return value || null; }

export async function createLessonPlan(input: LessonPlanFormValues, actorUid: string): Promise<void> {
  const ref = doc(collection(db, COLLECTIONS.LESSON_PLANS));
  const batch = writeBatch(db);
  batch.set(ref, {
    ...input,
    classId: nullable(input.classId),
    courseId: nullable(input.courseId),
    subjectId: nullable(input.subjectId),
    sessionId: nullable(input.sessionId),
    attachmentUrl: nullable(input.attachmentUrl),
    createdBy: actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  if (input.status === "published" && input.classId) {
    batch.set(doc(db, COLLECTIONS.LESSON_PLAN_PUBLIC, ref.id), publicSummary(ref.id, input));
  }
  await batch.commit();
}

export async function updateLessonPlan(id: string, input: LessonPlanFormValues): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, COLLECTIONS.LESSON_PLANS, id), {
    ...input,
    classId: nullable(input.classId),
    courseId: nullable(input.courseId),
    subjectId: nullable(input.subjectId),
    sessionId: nullable(input.sessionId),
    attachmentUrl: nullable(input.attachmentUrl),
    updatedAt: serverTimestamp(),
  });
  const summaryRef = doc(db, COLLECTIONS.LESSON_PLAN_PUBLIC, id);
  if (input.status === "published" && input.classId) batch.set(summaryRef, publicSummary(id, input));
  else batch.delete(summaryRef);
  await batch.commit();
}

export async function updateLessonPlanDriveAttachment(id: string, metadata: LessonPlanDriveAttachment | null): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.LESSON_PLANS, id), {
    driveFileId: metadata?.driveFileId ?? null,
    driveFileName: metadata?.driveFileName ?? null,
    driveMimeType: metadata?.driveMimeType ?? null,
    driveWebViewLink: metadata?.driveWebViewLink ?? null,
    driveModifiedTime: metadata?.driveModifiedTime ?? null,
    updatedAt: serverTimestamp(),
  });
}

function publicSummary(id: string, input: LessonPlanFormValues) {
  return {
    lessonPlanId: id,
    title: input.title,
    classId: input.classId,
    courseId: nullable(input.courseId),
    subjectId: nullable(input.subjectId),
    sessionId: nullable(input.sessionId),
    publicSummary: input.publicSummary,
    publishedAt: serverTimestamp(),
  };
}

export async function listLessonPlans(): Promise<(LessonPlanDoc & { id: string })[]> {
  const currentUser = await getCurrentUserDoc();
  if (!currentUser || (!isAdminUser(currentUser) && !isTeacherUser(currentUser))) return [];

  if (isAdminUser(currentUser)) {
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.LESSON_PLANS), orderBy("updatedAt", "desc"), limit(200)));
    return snapshot.docs.map((item) => ({ id: item.id, ...normalizeLessonPlan(item.data() as LessonPlanDoc) }));
  }

  const classes = await listClasses();
  const snapshots = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.LESSON_PLANS), where("createdBy", "==", currentUser.uid), limit(200))),
    ...classes.map((klass) => getDocs(
      query(collection(db, COLLECTIONS.LESSON_PLANS), where("classId", "==", klass.id), limit(200)),
    )),
  ]);
  const plans = new Map<string, LessonPlanDoc & { id: string }>();
  snapshots.forEach((snapshot) => snapshot.docs.forEach((item) => {
    plans.set(item.id, { id: item.id, ...normalizeLessonPlan(item.data() as LessonPlanDoc) });
  }));
  return [...plans.values()].sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
}

export async function copyLessonPlan(id: string, actorUid: string): Promise<void> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.LESSON_PLANS, id));
  if (!snapshot.exists()) throw new Error("Lesson plan not found");
  const source = normalizeLessonPlan(snapshot.data() as LessonPlanDoc);
  await addDoc(collection(db, COLLECTIONS.LESSON_PLANS), {
    ...source,
    title: `${source.title} (ban sao)`,
    status: "draft",
    driveFileId: null,
    driveFileName: null,
    driveMimeType: null,
    driveWebViewLink: null,
    driveModifiedTime: null,
    createdBy: actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listLessonPlanTemplates(): Promise<(LessonPlanTemplateDoc & { id: string })[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.LESSON_PLAN_TEMPLATES), orderBy("name"), limit(100)));
  return snapshot.docs.map((item) => ({ id: item.id, ...normalizeLessonPlanTemplate(item.data() as LessonPlanTemplateDoc) }));
}

export async function createLessonPlanTemplate(
  name: string,
  template: Pick<LessonPlanFormValues, "objectives" | "preparation" | "activities" | "homework">,
): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.LESSON_PLAN_TEMPLATES), {
    name,
    ...template,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listPublicLessonPlansByClass(classId: string, pageSize = 100): Promise<Record<string, unknown>[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.LESSON_PLAN_PUBLIC), where("classId", "==", classId), limit(pageSize)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

/** Buoi hoc sap toi (trong `days` ngay) cua cac lop da cho, chua co giao an nao gan sessionId tuong ung. */
export async function listUpcomingSessionsWithoutLessonPlan(
  classIds: string[],
  days = 7,
): Promise<(SessionDoc & { id: string })[]> {
  const now = new Date();
  const to = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const [sessionGroups, plans] = await Promise.all([
    Promise.all(classIds.map((classId) => listSessionsByClass(classId, now, to, 50))),
    listLessonPlans(),
  ]);
  const sessionIdsWithPlan = new Set(plans.map((plan) => plan.sessionId).filter((id): id is string => !!id));
  return sessionGroups
    .flat()
    .filter((session) => !sessionIdsWithPlan.has(session.id))
    .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
}
