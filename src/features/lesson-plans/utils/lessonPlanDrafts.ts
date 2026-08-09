import type { LessonPlanFormValues } from "@/schemas/lessonPlan";

const PREFIX = "edumatrix.lesson-plan-draft:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function lessonPlanDraftKey(uid: string, classId?: string | null, sessionId?: string | null): string {
  return `${PREFIX}${uid}:${classId || "new"}:${sessionId || "none"}`;
}

export function saveLessonPlanDraft(uid: string, classId: string | null | undefined, sessionId: string | null | undefined, values: LessonPlanFormValues): void {
  if (!uid) return;
  try {
    localStorage.setItem(lessonPlanDraftKey(uid, classId, sessionId), JSON.stringify({ savedAt: Date.now(), values }));
  } catch {
    // Autosave is best-effort when storage is blocked or full.
  }
}

export function loadLessonPlanDraft(uid: string, classId?: string | null, sessionId?: string | null): LessonPlanFormValues | null {
  if (!uid) return null;
  const key = lessonPlanDraftKey(uid, classId, sessionId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: unknown; values?: unknown };
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > MAX_AGE_MS || !parsed.values || typeof parsed.values !== "object") {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.values as LessonPlanFormValues;
  } catch {
    return null;
  }
}

export function removeLessonPlanDraft(uid: string, classId?: string | null, sessionId?: string | null): void {
  if (!uid) return;
  try { localStorage.removeItem(lessonPlanDraftKey(uid, classId, sessionId)); } catch { /* storage unavailable */ }
}

export function clearLessonPlanDraftsForUid(uid: string): void {
  if (!uid) return;
  const prefix = `${PREFIX}${uid}:`;
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Logout must still complete when storage is unavailable.
  }
}
