import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { CourseCurriculumDoc, CourseCurriculumItemDoc, StandardLessonDoc } from "@/types/academic";
import { decodeCourseCurriculumDoc, decodeCourseCurriculumItemDoc } from "@/services/firestore/decoders";
import { listAllQueryDocuments } from "@/services/firestore/pagination";

export async function listCourseCurricula(courseId: string): Promise<(CourseCurriculumDoc & { id: string })[]> {
  const documents = await listAllQueryDocuments(
    COLLECTIONS.COURSE_CURRICULA,
    [where("courseId", "==", courseId), orderBy("version", "desc")],
    100,
  );
  return documents.map((item) => ({
    id: item.id,
    ...decodeCourseCurriculumDoc(item.data(), `${COLLECTIONS.COURSE_CURRICULA}/${item.id}`),
  }));
}

export async function getCourseCurriculum(courseId: string, version: number): Promise<(CourseCurriculumDoc & { id: string }) | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.COURSE_CURRICULA, `${courseId}_v${version}`));
  return snapshot.exists() ? {
    id: snapshot.id,
    ...decodeCourseCurriculumDoc(snapshot.data(), `${COLLECTIONS.COURSE_CURRICULA}/${snapshot.id}`),
  } : null;
}

export async function createCourseCurriculumDraft(courseId: string, title: string, _actorUid: string): Promise<string> {
  return runTransaction(db, async (transaction) => {
    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
    const courseSnap = await transaction.get(courseRef);
    if (!courseSnap.exists()) throw new Error("Khóa học không tồn tại.");
    const courseData = courseSnap.data();
    const totalSessions = Number(courseData.totalSessions) || 0;
    if (totalSessions < 1 || totalSessions > 200) throw new Error("COURSE_SESSION_LIMIT");

    const previousVersion = Math.max(
      Number(courseData.curriculumVersionCounter) || 0,
      Number(courseData.activeCurriculumVersion) || 0,
    );
    const nextVersion = previousVersion + 1;
    const curriculumId = `${courseId}_v${nextVersion}`;
    const curriculumRef = doc(db, COLLECTIONS.COURSE_CURRICULA, curriculumId);
    const [curriculumSnap, previousItemSnaps] = await Promise.all([
      transaction.get(curriculumRef),
      previousVersion > 0 ? Promise.all(Array.from({ length: totalSessions }, (_, index) => transaction.get(doc(
        db,
        COLLECTIONS.COURSE_CURRICULUM_ITEMS,
        `${courseId}_v${previousVersion}_s${String(index + 1).padStart(3, "0")}`,
      )))) : Promise.resolve([]),
    ]);
    if (curriculumSnap.exists()) throw new Error("CURRICULUM_VERSION_COUNTER_STALE");
    const previousItems = new Map(previousItemSnaps.filter((item) => item.exists()).map((item) => {
      const data = item.data() as CourseCurriculumItemDoc;
      return [data.sequenceNumber, data] as const;
    }));

    const itemIds: string[] = [];
    let totalDurationMinutes = 0;
    for (let sequenceNumber = 1; sequenceNumber <= totalSessions; sequenceNumber += 1) {
      const itemId = `${curriculumId}_s${String(sequenceNumber).padStart(3, "0")}`;
      const previous = previousItems.get(sequenceNumber);
      const durationMinutes = previous?.durationMinutes ?? 90;
      itemIds.push(itemId);
      totalDurationMinutes += durationMinutes;
      transaction.set(doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, itemId), {
        courseId,
        curriculumVersion: nextVersion,
        sequenceNumber,
        subjectId: previous?.subjectId || courseData.subjectIds?.[0] || "",
        title: previous?.title || `Buổi ${sequenceNumber}`,
        standardLessonId: previous?.standardLessonId ?? null,
        durationMinutes,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    transaction.set(curriculumRef, {
      courseId,
      version: nextVersion,
      title,
      itemIds,
      itemCount: totalSessions,
      totalDurationMinutes,
      status: "draft",
      publishedBy: null,
      publishedAt: null,
      revision: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(courseRef, { curriculumVersionCounter: nextVersion, updatedAt: serverTimestamp() });
    return curriculumId;
  });
}

export async function listCourseCurriculumItems(courseId: string, version: number): Promise<(CourseCurriculumItemDoc & { id: string })[]> {
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS),
    where("courseId", "==", courseId),
    where("curriculumVersion", "==", version),
    orderBy("sequenceNumber", "asc"),
  ));
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...decodeCourseCurriculumItemDoc(item.data(), `${COLLECTIONS.COURSE_CURRICULUM_ITEMS}/${item.id}`),
  }));
}

export async function updateCourseCurriculumItem(
  id: string,
  input: Partial<Pick<CourseCurriculumItemDoc, "title" | "standardLessonId" | "durationMinutes" | "subjectId" | "status">>,
): Promise<void> {
  const itemRef = doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, id);
  await runTransaction(db, async (transaction) => {
    const itemSnap = await transaction.get(itemRef);
    if (!itemSnap.exists()) throw new Error("Không tìm thấy dòng chương trình.");
    const itemData = itemSnap.data() as CourseCurriculumItemDoc;
    const curriculumRef = doc(db, COLLECTIONS.COURSE_CURRICULA, `${itemData.courseId}_v${itemData.curriculumVersion}`);
    const curriculumSnap = await transaction.get(curriculumRef);
    if (!curriculumSnap.exists()) throw new Error("CURRICULUM_NOT_FOUND");
    const curriculum = curriculumSnap.data() as CourseCurriculumDoc;
    if (curriculum.status !== "draft") throw new Error("CURRICULUM_NOT_EDITABLE");
    if (input.standardLessonId) {
      const standardLessonSnap = await transaction.get(doc(db, COLLECTIONS.STANDARD_LESSONS, input.standardLessonId));
      if (!standardLessonSnap.exists()) throw new Error("STANDARD_LESSON_NOT_FOUND");
      const standardLesson = standardLessonSnap.data() as StandardLessonDoc;
      if (standardLesson.approvalStatus !== "approved") throw new Error("STANDARD_LESSON_NOT_APPROVED");
      if (standardLesson.subjectId !== (input.subjectId ?? itemData.subjectId)) throw new Error("STANDARD_LESSON_SUBJECT_MISMATCH");
    }
    let curriculumUpdate: { ref: DocumentReference; total: number; revision: number } | null = null;
    if (input.durationMinutes !== undefined && input.durationMinutes !== itemData.durationMinutes) {
      curriculumUpdate = {
        ref: curriculumRef,
        total: curriculum.totalDurationMinutes + input.durationMinutes - itemData.durationMinutes,
        revision: curriculum.revision + 1,
      };
    }
    transaction.update(itemRef, { ...input, updatedAt: serverTimestamp() });
    if (curriculumUpdate) transaction.update(curriculumUpdate.ref, {
      totalDurationMinutes: curriculumUpdate.total,
      revision: curriculumUpdate.revision,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function swapCourseCurriculumItems(firstId: string, secondId: string): Promise<void> {
  if (firstId === secondId) return;
  await runTransaction(db, async (transaction) => {
    const firstRef = doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, firstId);
    const secondRef = doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, secondId);
    const [firstSnap, secondSnap] = await Promise.all([
      transaction.get(firstRef),
      transaction.get(secondRef),
    ]);
    if (!firstSnap.exists() || !secondSnap.exists()) throw new Error("CURRICULUM_ITEM_NOT_FOUND");
    const first = firstSnap.data() as CourseCurriculumItemDoc;
    const second = secondSnap.data() as CourseCurriculumItemDoc;
    if (first.courseId !== second.courseId || first.curriculumVersion !== second.curriculumVersion) {
      throw new Error("CURRICULUM_ITEM_CONTEXT_MISMATCH");
    }
    const curriculumRef = doc(db, COLLECTIONS.COURSE_CURRICULA, `${first.courseId}_v${first.curriculumVersion}`);
    const curriculumSnap = await transaction.get(curriculumRef);
    if (!curriculumSnap.exists()) throw new Error("CURRICULUM_NOT_FOUND");
    const curriculum = curriculumSnap.data() as CourseCurriculumDoc;
    if (curriculum.status !== "draft") throw new Error("CURRICULUM_NOT_EDITABLE");

    const content = (item: CourseCurriculumItemDoc) => ({
      subjectId: item.subjectId,
      title: item.title,
      standardLessonId: item.standardLessonId,
      durationMinutes: item.durationMinutes,
      status: item.status,
      updatedAt: serverTimestamp(),
    });
    transaction.update(firstRef, content(second));
    transaction.update(secondRef, content(first));
    transaction.update(curriculumRef, {
      revision: curriculum.revision + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function publishCourseCurriculum(courseId: string, version: number, publishedBy: string): Promise<void> {
  const curriculumId = `${courseId}_v${version}`;
  const curriculumRef = doc(db, COLLECTIONS.COURSE_CURRICULA, curriculumId);
  await runTransaction(db, async (transaction) => {
    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
    const [curriculumSnap, courseSnap] = await Promise.all([
      transaction.get(curriculumRef),
      transaction.get(courseRef),
    ]);
    if (!curriculumSnap.exists() || !courseSnap.exists()) throw new Error("Không tìm thấy chương trình khóa.");
    const curriculum = curriculumSnap.data() as CourseCurriculumDoc;
    if (curriculum.status !== "draft") throw new Error("CURRICULUM_NOT_PUBLISHABLE");
    if (curriculum.courseId !== courseId || curriculum.version !== version || curriculum.itemIds.length !== curriculum.itemCount) {
      throw new Error("CURRICULUM_INVALID");
    }

    const itemSnaps = await Promise.all(curriculum.itemIds.map((id) => transaction.get(doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, id))));
    const course = courseSnap.data();
    const activeId = course.activeCurriculumId as string | null | undefined;
    const activeRef = activeId && activeId !== curriculumId ? doc(db, COLLECTIONS.COURSE_CURRICULA, activeId) : null;
    const activeSnap = activeRef ? await transaction.get(activeRef) : null;
    itemSnaps.forEach((itemSnap, index) => {
      if (!itemSnap.exists()) throw new Error("CURRICULUM_SEQUENCE_INVALID");
      const item = itemSnap.data() as CourseCurriculumItemDoc;
      if (item.courseId !== courseId || item.curriculumVersion !== version || item.sequenceNumber !== index + 1) {
        throw new Error("CURRICULUM_SEQUENCE_INVALID");
      }
      if (!item.standardLessonId) throw new Error(`Buổi học số ${item.sequenceNumber} chưa được gán bài học chuẩn.`);
    });

    const standardLessonIds = [...new Set(itemSnaps.map((itemSnap) =>
      (itemSnap.data() as CourseCurriculumItemDoc).standardLessonId as string))];
    const standardLessonSnaps = await Promise.all(
      standardLessonIds.map((lessonId) => transaction.get(doc(db, COLLECTIONS.STANDARD_LESSONS, lessonId))),
    );
    const standardLessonById = new Map(standardLessonSnaps.map((lessonSnap) => [lessonSnap.id, lessonSnap]));
    itemSnaps.forEach((itemSnap) => {
      const item = itemSnap.data() as CourseCurriculumItemDoc;
      const lessonSnap = standardLessonById.get(item.standardLessonId as string);
      if (!lessonSnap?.exists()) throw new Error("STANDARD_LESSON_NOT_FOUND");
      const lesson = lessonSnap.data() as StandardLessonDoc;
      if (lesson.approvalStatus !== "approved") throw new Error("STANDARD_LESSON_NOT_APPROVED");
      if (lesson.subjectId !== item.subjectId) throw new Error("STANDARD_LESSON_SUBJECT_MISMATCH");
    });

    if (activeRef && activeSnap?.exists()) transaction.update(activeRef, { status: "superseded", updatedAt: serverTimestamp() });
    transaction.update(curriculumRef, {
      status: "published",
      publishedBy,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(courseRef, {
      activeCurriculumId: curriculumId,
      activeCurriculumVersion: version,
      curriculumVersionCounter: Math.max(Number(course.curriculumVersionCounter) || 0, version),
      updatedAt: serverTimestamp(),
    });
  });
}
