import { endOfDay, startOfDay } from "date-fns";
import type { SessionStatus } from "@/types/academic";

interface SessionTiming {
  startAt: Date;
  endAt: Date;
  status: SessionStatus;
}

export function isActionableTodaySession(session: SessionTiming, now: Date): boolean {
  return (
    session.startAt >= startOfDay(now) &&
    session.startAt <= endOfDay(now) &&
    session.endAt >= now &&
    session.status !== "cancelled" &&
    session.status !== "completed"
  );
}
