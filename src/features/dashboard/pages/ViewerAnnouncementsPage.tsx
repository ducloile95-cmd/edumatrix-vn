import { useQueries } from "@tanstack/react-query";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";

export default function ViewerAnnouncementsPage() {
  const { userDoc } = useAuth();
  const groups = useQueries({ queries: (userDoc?.studentIds ?? []).map((studentId) => ({ queryKey: ["announcements", studentId], queryFn: async () => { const snap = await getDocs(query(collection(db, COLLECTIONS.ANNOUNCEMENTS), where("studentId", "==", studentId), limit(50))); return snap.docs.map((item) => ({ id: item.id, ...item.data() } as Record<string, unknown>)); } })) });
  const items = groups.flatMap((group) => group.data ?? []);
  return <ViewerShell><PageHeader title="Thông báo" description="Thông tin mới nhất từ giáo viên và nhà trường." />{items.length === 0 ? <p className="text-sm text-neutral-500">Chưa có thông báo mới.</p> : <ul className="divide-y divide-neutral-100">{items.map((item) => <li key={String(item.id)} className="py-3"><p className="text-sm font-medium">{String(item.title ?? "Thông báo")}</p><p className="text-xs text-neutral-500">{String(item.message ?? "")}</p></li>)}</ul>}</ViewerShell>;
}
