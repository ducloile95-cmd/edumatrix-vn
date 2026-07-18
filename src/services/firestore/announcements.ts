import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import type { AnnouncementDoc } from "@/types/academic";

/** Thong bao cua 1 hoc sinh, toi da `pageSize` ban ghi (khong sap xep). */
export async function listAnnouncementsByStudent(
  studentId: string,
  pageSize = 50,
): Promise<(AnnouncementDoc & { id: string })[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.ANNOUNCEMENTS), where("studentId", "==", studentId), limit(pageSize)),
  );
  return snap.docs.map((item) => ({ id: item.id, ...(item.data() as AnnouncementDoc) }));
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
