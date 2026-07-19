import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { COLLECTIONS } from "@/constants/collections";
import { db } from "@/services/firebase/firestoreClient";

export interface ViewerNotification {
  id: string;
  title: string;
  message: string;
  createdAt?: Timestamp;
  isRead: boolean;
}

type AnnouncementData = {
  title?: string;
  message?: string;
  createdAt?: Timestamp;
};

const PER_STUDENT_LIMIT = 50;
const TOTAL_LIMIT = 200;
const READ_BATCH_LIMIT = 10;

function readId(uid: string, announcementId: string): string {
  return `${uid}_${announcementId}`;
}

export async function listViewerNotifications(
  uid: string,
  studentIds: string[],
): Promise<ViewerNotification[]> {
  if (!uid || studentIds.length === 0) return [];

  const groups = await Promise.all(
    [...new Set(studentIds)].map(async (studentId) => {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.ANNOUNCEMENTS),
          where("studentId", "==", studentId),
          limit(PER_STUDENT_LIMIT),
        ),
      );
      return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as AnnouncementData) }));
    }),
  );

  const unique = [...new Map(groups.flat().map((item) => [item.id, item])).values()]
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
    .slice(0, TOTAL_LIMIT);
  const readAnnouncementIds = new Set<string>();

  for (let offset = 0; offset < unique.length; offset += 30) {
    const announcementIds = unique.slice(offset, offset + 30).map((item) => item.id);
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.NOTIFICATION_READS),
        where("uid", "==", uid),
        where("announcementId", "in", announcementIds),
      ),
    );
    snapshot.docs.forEach((item) => {
      const data = item.data() as { announcementId?: string };
      if (data.announcementId) readAnnouncementIds.add(data.announcementId);
    });
  }

  return unique.map((item) => ({
    id: item.id,
    title: item.title ?? "Thông báo",
    message: item.message ?? "",
    createdAt: item.createdAt,
    isRead: readAnnouncementIds.has(item.id),
  }));
}

export async function markNotificationsRead(uid: string, announcementIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(announcementIds)].filter(Boolean);
  if (!uid || uniqueIds.length === 0) return;

  for (let offset = 0; offset < uniqueIds.length; offset += READ_BATCH_LIMIT) {
    const batch = writeBatch(db);
    uniqueIds.slice(offset, offset + READ_BATCH_LIMIT).forEach((announcementId) => {
      batch.set(
        doc(db, COLLECTIONS.NOTIFICATION_READS, readId(uid, announcementId)),
        { uid, announcementId, readAt: serverTimestamp() },
        { merge: true },
      );
    });
    await batch.commit();
  }
}
