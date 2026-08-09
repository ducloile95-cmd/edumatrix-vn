// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { clearLessonPlanDraftsForUid, lessonPlanDraftKey, loadLessonPlanDraft, saveLessonPlanDraft } from "./lessonPlanDrafts";
import type { LessonPlanFormValues } from "@/schemas/lessonPlan";

const values = { title: "Draft title", classId: "class-1", sessionId: "session-1" } as LessonPlanFormValues;

describe("lesson plan draft privacy", () => {
  beforeEach(() => localStorage.clear());

  test("namespaces drafts by uid, class and session", () => {
    saveLessonPlanDraft("uid-1", "class-1", "session-1", values);
    expect(loadLessonPlanDraft("uid-1", "class-1", "session-1")?.title).toBe("Draft title");
    expect(loadLessonPlanDraft("uid-2", "class-1", "session-1")).toBeNull();
    expect(loadLessonPlanDraft("uid-1", "class-2", "session-1")).toBeNull();
  });

  test("deletes drafts older than seven days", () => {
    const key = lessonPlanDraftKey("uid-1", "class-1", "session-1");
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, values }));
    expect(loadLessonPlanDraft("uid-1", "class-1", "session-1")).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  test("clears only the previous user's drafts on logout", () => {
    saveLessonPlanDraft("uid-1", null, null, values);
    saveLessonPlanDraft("uid-2", null, null, values);
    clearLessonPlanDraftsForUid("uid-1");
    expect(loadLessonPlanDraft("uid-1", null, null)).toBeNull();
    expect(loadLessonPlanDraft("uid-2", null, null)).not.toBeNull();
  });

  test("ignores storage write failures", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(() => saveLessonPlanDraft("uid-1", null, null, values)).not.toThrow();
    spy.mockRestore();
  });
});
