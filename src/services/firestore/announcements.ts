import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { AnnouncementDoc } from "@/types/academic";

/** Thong bao moi nhat cua 1 hoc sinh, bo qua cac ban ghi da giai quyet. */
export async function listAnnouncementsByStudent(
  studentId: string,
  pageSize = 50,
): Promise<(AnnouncementDoc & { id: string })[]> {
  const result: (AnnouncementDoc & { id: string })[] = [];
  let cursor: QueryDocumentSnapshot | null = null;
  const batchSize = Math.max(pageSize, 1);
  while (result.length < pageSize) {
    const snap: QuerySnapshot<DocumentData> = await getDocs(query(
      collection(db, COLLECTIONS.ANNOUNCEMENTS),
      where("studentId", "==", studentId),
      orderBy("createdAt", "desc"),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(batchSize),
    ));
    result.push(...snap.docs
      .map((item) => ({ id: item.id, ...(item.data() as AnnouncementDoc) }))
      .filter((item) => !item.resolvedAt));
    if (snap.docs.length < batchSize) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
  return result.slice(0, pageSize);
}

/** Gop thong bao cua nhieu hoc sinh (vd Phu huynh co nhieu con), moi nhat truoc. */
export async function listAnnouncementsByStudents(
  studentIds: string[],
  pageSizePerStudent = 50,
): Promise<(AnnouncementDoc & { id: string })[]> {
  const groups = await Promise.all(
    studentIds.map((studentId) => listAnnouncementsByStudent(studentId, pageSizePerStudent)),
  );
  return groups.flat().sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}
