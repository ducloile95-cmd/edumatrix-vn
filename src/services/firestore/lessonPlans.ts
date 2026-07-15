import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { LessonPlanDoc, LessonPlanTemplateDoc } from "@/types/academic";
import type { LessonPlanFormValues } from "@/schemas/lessonPlan";

function nullable(value: string | null): string | null { return value || null; }

export async function createLessonPlan(input: LessonPlanFormValues, actorUid: string): Promise<void> {
  const ref = await addDoc(collection(db, COLLECTIONS.LESSON_PLANS), { ...input, classId: nullable(input.classId), courseId: nullable(input.courseId), subjectId: nullable(input.subjectId), sessionId: nullable(input.sessionId), createdBy: actorUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  if (input.status === "published" && input.classId) await publishSummary(ref.id, input);
}
export async function updateLessonPlan(id: string, input: LessonPlanFormValues): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.LESSON_PLANS, id), { ...input, classId: nullable(input.classId), courseId: nullable(input.courseId), subjectId: nullable(input.subjectId), sessionId: nullable(input.sessionId), updatedAt: serverTimestamp() });
  if (input.status === "published" && input.classId) await publishSummary(id, input);
  else await deleteDoc(doc(db, COLLECTIONS.LESSON_PLAN_PUBLIC, id));
}

async function publishSummary(id: string, input: LessonPlanFormValues): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.LESSON_PLAN_PUBLIC, id), { lessonPlanId: id, title: input.title, classId: input.classId, courseId: nullable(input.courseId), subjectId: nullable(input.subjectId), sessionId: nullable(input.sessionId), publicSummary: input.publicSummary, publishedAt: serverTimestamp() });
}
export async function listLessonPlans(): Promise<(LessonPlanDoc & { id: string })[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.LESSON_PLANS), orderBy("updatedAt", "desc"), limit(200)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as LessonPlanDoc) }));
}
export async function copyLessonPlan(id: string, actorUid: string): Promise<void> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.LESSON_PLANS, id));
  if (!snapshot.exists()) throw new Error("Lesson plan not found");
  const source = snapshot.data() as LessonPlanDoc;
  await addDoc(collection(db, COLLECTIONS.LESSON_PLANS), { ...source, title: `${source.title} (ban sao)`, status: "draft", createdBy: actorUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function listLessonPlanTemplates(): Promise<(LessonPlanTemplateDoc & { id: string })[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.LESSON_PLAN_TEMPLATES), orderBy("name"), limit(100)));
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as LessonPlanTemplateDoc) }));
}
export async function createLessonPlanTemplate(name: string, sections: LessonPlanFormValues["sections"]): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.LESSON_PLAN_TEMPLATES), { name, sections, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function listPublicLessonPlansByClass(classId:string,pageSize=100):Promise<Record<string,unknown>[]>{const snapshot=await getDocs(query(collection(db,COLLECTIONS.LESSON_PLAN_PUBLIC),where("classId","==",classId),limit(pageSize)));return snapshot.docs.map(item=>({id:item.id,...item.data()}));}
