import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { getCurrentUserDoc, isAdminUser, isTeacherUser } from "@/services/firestore/authz";
import { listClasses } from "@/services/firestore/classes";
import { listAllQueryDocuments, listQueryDocumentsPage } from "@/services/firestore/pagination";
import { normalizeLessonPlan, normalizeLessonPlanTemplate } from "@/utils/lessonPlan";
import type { LessonPlanDoc, LessonPlanDriveAttachment, LessonPlanTemplateDoc, SessionDoc } from "@/types/academic";
import type { LessonPlanFormValues } from "@/schemas/lessonPlan";

function nullable(value: string | null): string | null { return value || null; }

function driveFields(metadata?: LessonPlanDriveAttachment | null) {
  return {
    driveFileId: metadata?.driveFileId ?? null,
    driveFileName: metadata?.driveFileName ?? null,
    driveMimeType: metadata?.driveMimeType ?? null,
    driveWebViewLink: metadata?.driveWebViewLink ?? null,
    driveModifiedTime: metadata?.driveModifiedTime ?? null,
  };
}

export async function createLessonPlan(input: LessonPlanFormValues, actorUid: string, driveAttachment?: LessonPlanDriveAttachment | null): Promise<string> {
  const ref = doc(collection(db, COLLECTIONS.LESSON_PLANS));
  await runTransaction(db, async (transaction) => {
    const sessionRef = input.sessionId ? doc(db, COLLECTIONS.SESSIONS, input.sessionId) : null;
    const sessionSnap = sessionRef ? await transaction.get(sessionRef) : null;
    if (sessionRef && !sessionSnap?.exists()) throw new Error("SESSION_NOT_FOUND");
    if (sessionSnap?.exists()) {
      const session = sessionSnap.data() as SessionDoc;
      if (session.classId !== input.classId) throw new Error("LESSON_PLAN_SESSION_MISMATCH");
      if (session.lessonPlanId) throw new Error("SESSION_ALREADY_HAS_LESSON_PLAN");
    }

    transaction.set(ref, {
      ...input,
      classId: nullable(input.classId),
      courseId: nullable(input.courseId),
      subjectId: nullable(input.subjectId),
      sessionId: nullable(input.sessionId),
      attachmentUrl: nullable(input.attachmentUrl),
      ...driveFields(driveAttachment),
      createdBy: actorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (input.status === "published" && input.classId) {
      transaction.set(doc(db, COLLECTIONS.LESSON_PLAN_PUBLIC, ref.id), publicSummary(ref.id, input));
    }
    if (sessionRef) transaction.update(sessionRef, {
      lessonPlanId: ref.id,
      updatedAt: serverTimestamp(),
    });
  });
  return ref.id;
}

export async function updateLessonPlan(id: string, input: LessonPlanFormValues, driveAttachment?: LessonPlanDriveAttachment | null): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const planRef = doc(db, COLLECTIONS.LESSON_PLANS, id);
    const planSnap = await transaction.get(planRef);
    if (!planSnap.exists()) throw new Error("LESSON_PLAN_NOT_FOUND");
    const current = planSnap.data() as LessonPlanDoc;
    const sessionIds = [...new Set([current.sessionId, input.sessionId].filter((value): value is string => !!value))];
    const sessionSnaps = await Promise.all(sessionIds.map((sessionId) => transaction.get(doc(db, COLLECTIONS.SESSIONS, sessionId))));
    const sessionById = new Map(sessionSnaps.map((snapshot) => [snapshot.id, snapshot]));
    const nextSessionSnap = input.sessionId ? sessionById.get(input.sessionId) : null;
    if (input.sessionId && !nextSessionSnap?.exists()) throw new Error("SESSION_NOT_FOUND");
    if (nextSessionSnap?.exists()) {
      const session = nextSessionSnap.data() as SessionDoc;
      if (session.classId !== input.classId) throw new Error("LESSON_PLAN_SESSION_MISMATCH");
      if (session.lessonPlanId && session.lessonPlanId !== id) throw new Error("SESSION_ALREADY_HAS_LESSON_PLAN");
    }

    transaction.update(planRef, {
      ...input,
      classId: nullable(input.classId),
      courseId: nullable(input.courseId),
      subjectId: nullable(input.subjectId),
      sessionId: nullable(input.sessionId),
      attachmentUrl: nullable(input.attachmentUrl),
      ...(driveAttachment === undefined ? {} : driveFields(driveAttachment)),
      updatedAt: serverTimestamp(),
    });
    const summaryRef = doc(db, COLLECTIONS.LESSON_PLAN_PUBLIC, id);
    if (input.status === "published" && input.classId) transaction.set(summaryRef, publicSummary(id, input));
    else transaction.delete(summaryRef);
    if (current.sessionId && current.sessionId !== input.sessionId) {
      const previousSession = sessionById.get(current.sessionId);
      if (previousSession?.exists() && (previousSession.data() as SessionDoc).lessonPlanId === id) {
        transaction.update(previousSession.ref, { lessonPlanId: null, updatedAt: serverTimestamp() });
      }
    }
    if (input.sessionId) transaction.update(doc(db, COLLECTIONS.SESSIONS, input.sessionId), {
      lessonPlanId: id,
      updatedAt: serverTimestamp(),
    });
  });
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
    const documents = await listAllQueryDocuments(
      COLLECTIONS.LESSON_PLANS,
      [orderBy("updatedAt", "desc")],
      200,
    );
    return documents.map((item) => ({ id: item.id, ...normalizeLessonPlan(item.data() as LessonPlanDoc) }));
  }

  const classes = await listClasses();
  const groups = await Promise.all([
    listAllQueryDocuments(
      COLLECTIONS.LESSON_PLANS,
      [where("createdBy", "==", currentUser.uid)],
      200,
    ),
    ...classes.map((klass) => listAllQueryDocuments(
      COLLECTIONS.LESSON_PLANS,
      [where("classId", "==", klass.id)],
      200,
    )),
  ]);
  const plans = new Map<string, LessonPlanDoc & { id: string }>();
  groups.forEach((documents) => documents.forEach((item) => {
    plans.set(item.id, { id: item.id, ...normalizeLessonPlan(item.data() as LessonPlanDoc) });
  }));
  return [...plans.values()].sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
}

export async function getLessonPlanBySession(
  classId: string,
  sessionId: string,
): Promise<(LessonPlanDoc & { id: string }) | null> {
  const sessionSnap = await getDoc(doc(db, COLLECTIONS.SESSIONS, sessionId));
  if (sessionSnap.exists()) {
    const sessionData = sessionSnap.data() as SessionDoc;
    if (sessionData.lessonPlanId) {
      const planSnap = await getDoc(doc(db, COLLECTIONS.LESSON_PLANS, sessionData.lessonPlanId));
      if (planSnap.exists()) {
        return { id: planSnap.id, ...normalizeLessonPlan(planSnap.data() as LessonPlanDoc) };
      }
    }
  }
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.LESSON_PLANS),
    where("classId", "==", classId),
    where("sessionId", "==", sessionId),
    limit(1),
  ));
  const item = snapshot.docs[0];
  return item ? { id: item.id, ...normalizeLessonPlan(item.data() as LessonPlanDoc) } : null;
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
  const documents = await listAllQueryDocuments(
    COLLECTIONS.LESSON_PLAN_TEMPLATES,
    [orderBy("name")],
    100,
  );
  return documents.map((item) => ({ id: item.id, ...normalizeLessonPlanTemplate(item.data() as LessonPlanTemplateDoc) }));
}

export async function createLessonPlanTemplate(
  name: string,
  template: Pick<LessonPlanFormValues, "objectives" | "preparation" | "activities" | "homework">,
  ownerUid: string,
): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.LESSON_PLAN_TEMPLATES), {
    name,
    ...template,
    // Rules (A4): mau moi phai ghi chu so huu = nguoi tao.
    ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listPublicLessonPlansByClass(classId: string, pageSize = 100): Promise<Record<string, unknown>[]> {
  const documents = await listAllQueryDocuments(
    COLLECTIONS.LESSON_PLAN_PUBLIC,
    [where("classId", "==", classId)],
    pageSize,
  );
  return documents.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listPublicLessonPlanPreviewByClass(classId: string, maxResults: number): Promise<Record<string, unknown>[]> {
  const documents = await listQueryDocumentsPage(
    COLLECTIONS.LESSON_PLAN_PUBLIC,
    [where("classId", "==", classId), orderBy("publishedAt", "desc")],
    maxResults,
  );
  return documents.map((item) => ({ id: item.id, ...item.data() }));
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
