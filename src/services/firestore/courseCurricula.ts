import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { CourseCurriculumDoc, CourseCurriculumItemDoc } from "@/types/academic";

export async function listCourseCurricula(courseId: string): Promise<(CourseCurriculumDoc & { id: string })[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.COURSE_CURRICULA),
      where("courseId", "==", courseId),
      orderBy("version", "desc"),
      limit(100)
    )
  );
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as CourseCurriculumDoc),
  }));
}

export async function getCourseCurriculum(courseId: string, version: number): Promise<(CourseCurriculumDoc & { id: string }) | null> {
  const docId = `${courseId}_v${version}`;
  const snap = await getDoc(doc(db, COLLECTIONS.COURSE_CURRICULA, docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as CourseCurriculumDoc) };
}

export async function createCourseCurriculumDraft(
  courseId: string,
  title: string,
  _actorUid: string
): Promise<string> {
  // 1. Tim version moi nhat hien tai
  const curriculaRef = collection(db, COLLECTIONS.COURSE_CURRICULA);
  const q = query(curriculaRef, where("courseId", "==", courseId), orderBy("version", "desc"), limit(1));
  const querySnap = await getDocs(q);
  
  let prevVersion = 0;
  if (!querySnap.empty) {
    prevVersion = querySnap.docs[0].data().version || 0;
  }
  const nextVersion = prevVersion + 1;

  // 2. Lay cac item cua version truoc neu co de copy
  const prevItems: CourseCurriculumItemDoc[] = [];
  if (prevVersion > 0) {
    const prevItemsQuery = query(
      collection(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS),
      where("courseId", "==", courseId),
      where("curriculumVersion", "==", prevVersion),
      orderBy("sequenceNumber", "asc")
    );
    const prevItemsSnap = await getDocs(prevItemsQuery);
    prevItemsSnap.forEach((d) => {
      prevItems.push(d.data() as CourseCurriculumItemDoc);
    });
  }

  return await runTransaction(db, async (transaction) => {
    // Lay thong tin khoa hoc de biet so buoi totalSessions va cac mon
    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
    const courseSnap = await transaction.get(courseRef);
    if (!courseSnap.exists()) {
      throw new Error("Khóa học không tồn tại.");
    }
    const courseData = courseSnap.data();
    const totalSessions = courseData.totalSessions || 0;

    const docId = `${courseId}_v${nextVersion}`;
    const newCurriculum: CourseCurriculumDoc = {
      courseId,
      version: nextVersion,
      title,
      itemIds: [],
      itemCount: totalSessions,
      totalDurationMinutes: 0,
      status: "draft",
      publishedBy: null,
      publishedAt: null,
      revision: 1,
      createdAt: Timestamp.now() as any,
      updatedAt: Timestamp.now() as any,
    };

    let totalDuration = 0;
    const itemIds: string[] = [];

    // Sao chep hoac tao moi tung item cho du so buoi
    for (let i = 1; i <= totalSessions; i++) {
      const sequenceNumberPadded = String(i).padStart(3, "0");
      const itemDocId = `${docId}_s${sequenceNumberPadded}`;
      itemIds.push(itemDocId);

      const prevItem = prevItems.find((pi) => pi.sequenceNumber === i);
      const itemTitle = prevItem?.title || `Buổi ${i}`;
      const standardLessonId = prevItem?.standardLessonId || null;
      const durationMinutes = prevItem?.durationMinutes !== undefined ? prevItem.durationMinutes : 90;
      totalDuration += durationMinutes;

      const newItem: CourseCurriculumItemDoc = {
        courseId,
        curriculumVersion: nextVersion,
        sequenceNumber: i,
        subjectId: prevItem?.subjectId || courseData.subjectIds?.[0] || "",
        title: itemTitle,
        standardLessonId,
        durationMinutes,
        status: "draft",
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      transaction.set(doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, itemDocId), newItem);
    }

    newCurriculum.itemIds = itemIds;
    newCurriculum.totalDurationMinutes = totalDuration;

    transaction.set(doc(db, COLLECTIONS.COURSE_CURRICULA, docId), {
      ...newCurriculum,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docId;
  });
}

export async function listCourseCurriculumItems(
  courseId: string,
  version: number
): Promise<(CourseCurriculumItemDoc & { id: string })[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS),
      where("courseId", "==", courseId),
      where("curriculumVersion", "==", version),
      orderBy("sequenceNumber", "asc")
    )
  );
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as CourseCurriculumItemDoc),
  }));
}

export async function updateCourseCurriculumItem(
  id: string,
  input: Partial<Pick<CourseCurriculumItemDoc, "title" | "standardLessonId" | "durationMinutes" | "subjectId" | "status">>
): Promise<void> {
  const itemRef = doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, id);
  await runTransaction(db, async (transaction) => {
    const itemSnap = await transaction.get(itemRef);
    if (!itemSnap.exists()) {
      throw new Error("Không tìm thấy dòng chương trình.");
    }
    const itemData = itemSnap.data() as CourseCurriculumItemDoc;

    // Cap nhat item
    transaction.update(itemRef, {
      ...input,
      updatedAt: serverTimestamp(),
    });

    // Neu thay doi durationMinutes, tinh toan lai tong durationMinutes trong Header
    if (input.durationMinutes !== undefined && input.durationMinutes !== itemData.durationMinutes) {
      const curriculumId = `${itemData.courseId}_v${itemData.curriculumVersion}`;
      const curriculumRef = doc(db, COLLECTIONS.COURSE_CURRICULA, curriculumId);
      const currSnap = await transaction.get(curriculumRef);
      if (currSnap.exists()) {
        const currData = currSnap.data() as CourseCurriculumDoc;
        const diff = input.durationMinutes - itemData.durationMinutes;
        transaction.update(curriculumRef, {
          totalDurationMinutes: (currData.totalDurationMinutes || 0) + diff,
          revision: (currData.revision || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      }
    }
  });
}

export async function publishCourseCurriculum(
  courseId: string,
  version: number,
  publishedBy: string
): Promise<void> {
  const curriculumId = `${courseId}_v${version}`;
  const curriculumRef = doc(db, COLLECTIONS.COURSE_CURRICULA, curriculumId);

  await runTransaction(db, async (transaction) => {
    const currSnap = await transaction.get(curriculumRef);
    if (!currSnap.exists()) {
      throw new Error("Không tìm thấy chương trình khóa.");
    }
    const currData = currSnap.data() as CourseCurriculumDoc;

    if (currData.status === "published") {
      throw new Error("Chương trình khóa đã được xuất bản.");
    }

    // 1. Lay danh sach items de kiem tra tinh dung dan
    const itemsSnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS),
        where("courseId", "==", courseId),
        where("curriculumVersion", "==", version),
        orderBy("sequenceNumber", "asc")
      )
    );
    const items = itemsSnapshot.docs.map((doc) => doc.data() as CourseCurriculumItemDoc);

    // Kiem tra sequence logic liên tục từ 1 đến N
    for (let i = 0; i < items.length; i++) {
      if (items[i].sequenceNumber !== i + 1) {
        throw new Error(`Thứ tự buổi học không liên tục hoặc bị trùng lặp ở Buổi ${items[i].sequenceNumber}.`);
      }
      if (!items[i].standardLessonId) {
        throw new Error(`Buổi học số ${items[i].sequenceNumber} chưa được gán bài học chuẩn.`);
      }
    }

    // 2. Mark version cu cua course nay tu published -> superseded
    const activeQuery = query(
      collection(db, COLLECTIONS.COURSE_CURRICULA),
      where("courseId", "==", courseId),
      where("status", "==", "published")
    );
    const activeSnap = await getDocs(activeQuery);
    for (const activeDoc of activeSnap.docs) {
      transaction.update(activeDoc.ref, {
        status: "superseded",
        updatedAt: serverTimestamp(),
      });
    }

    // 3. Mark version moi nay -> published
    transaction.update(curriculumRef, {
      status: "published",
      publishedBy,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 4. Update Course doc de activeCurriculumVersion moi nhat
    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
    transaction.update(courseRef, {
      activeCurriculumId: curriculumId,
      activeCurriculumVersion: version,
      updatedAt: serverTimestamp(),
    });
  });
}
