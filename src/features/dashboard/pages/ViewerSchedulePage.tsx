import { useQueries } from "@tanstack/react-query";
import { addDays, format, subDays } from "date-fns";
import { ViewerShell } from "@/components/layouts/ViewerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getStudent } from "@/services/firestore/students";
import { listSessionsByClass } from "@/services/firestore/sessions";

export default function ViewerSchedulePage() {
  const { userDoc } = useAuth();
  const students = useQueries({ queries: (userDoc?.studentIds ?? []).map((id) => ({ queryKey: ["student", id], queryFn: () => getStudent(id) })) });
  const classIds = [...new Set(students.flatMap((query) => query.data?.currentClassIds ?? []))];
  const sessions = useQueries({ queries: classIds.map((id) => ({ queryKey: ["viewer-sessions", id], queryFn: () => listSessionsByClass(id, subDays(new Date(), 1), addDays(new Date(), 60)) })) });
  const items = sessions.flatMap((query) => query.data ?? []).sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
  return <ViewerShell><PageHeader title="Lịch học" description="Các buổi học sắp tới của học sinh." /><ul className="divide-y divide-neutral-100">{items.map((session) => <li key={session.id} className="py-3"><p className="text-sm font-medium">{session.title}</p><p className="text-xs text-neutral-500">{format(session.startAt.toDate(), "dd/MM/yyyy HH:mm")} · {session.location}</p></li>)}</ul></ViewerShell>;
}
