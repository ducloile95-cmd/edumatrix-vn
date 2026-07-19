import { format } from "date-fns";
import type {
  LessonPlanActivity,
  LessonPlanDoc,
  LessonPlanObjectives,
  LessonPlanPreparation,
  LessonPlanSection,
  LessonPlanTemplateDoc,
  SessionDoc,
} from "@/types/academic";

const EMPTY_OBJECTIVES: LessonPlanObjectives = { knowledge: "", skills: "", attitude: "" };
const EMPTY_PREPARATION: LessonPlanPreparation = { teacher: "", student: "" };

/** 0=CN..6=T7, cung quy uoc voi DOW_LABEL trong TimetableGrid/MonthGrid/ClassForm. */
const DOW_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Nhan hien thi 1 buoi hoc dung chung cho form/danh sach/chi tiet giao an. */
export function formatSessionLabel(session: SessionDoc): string {
  const start = session.startAt.toDate();
  const end = session.endAt.toDate();
  return `${DOW_LABEL[start.getDay()]}, ${format(start, "dd/MM/yyyy")} · ${format(start, "HH:mm")}–${format(end, "HH:mm")}`;
}

function sectionsToActivities(sections: LessonPlanSection[]): LessonPlanActivity[] {
  return sections.map((section) => ({
    name: section.title,
    durationMinutes: 0,
    content: section.content,
    expectedOutcome: "",
  }));
}

type LessonPlanRawFields = "objectives" | "preparation" | "activities" | "homework" | "notesAfterTeaching" | "attachmentUrl" | "attachmentLabel" | "driveFileId" | "driveFileName" | "driveMimeType" | "driveWebViewLink" | "driveModifiedTime";
type LessonPlanRawDoc = Omit<LessonPlanDoc, LessonPlanRawFields> &
  Partial<Pick<LessonPlanDoc, LessonPlanRawFields>> & { sections?: LessonPlanSection[] };

/**
 * Chuan hoa giao an doc tu Firestore ve hinh moi.
 * Giao an cu chi co `sections` (truoc 16/07/2026) - anh xa moi section thanh 1 hoat dong.
 * Khong can script migrate rieng (Spark plan khong co Admin SDK) - lan luu tiep theo se ghi lai theo hinh moi.
 */
export function normalizeLessonPlan(raw: LessonPlanRawDoc): LessonPlanDoc {
  return {
    ...raw,
    objectives: raw.objectives ?? EMPTY_OBJECTIVES,
    preparation: raw.preparation ?? EMPTY_PREPARATION,
    activities: raw.activities ?? sectionsToActivities(raw.sections ?? []),
    homework: raw.homework ?? "",
    notesAfterTeaching: raw.notesAfterTeaching ?? "",
    attachmentUrl: raw.attachmentUrl ?? null,
    attachmentLabel: raw.attachmentLabel ?? "",
    driveFileId: raw.driveFileId ?? null,
    driveFileName: raw.driveFileName ?? null,
    driveMimeType: raw.driveMimeType ?? null,
    driveWebViewLink: raw.driveWebViewLink ?? null,
    driveModifiedTime: raw.driveModifiedTime ?? null,
  };
}

type LessonPlanTemplateRawFields = "objectives" | "preparation" | "activities" | "homework";
type LessonPlanTemplateRawDoc = Omit<LessonPlanTemplateDoc, LessonPlanTemplateRawFields> &
  Partial<Pick<LessonPlanTemplateDoc, LessonPlanTemplateRawFields>> & { sections?: LessonPlanSection[] };

/** Chuan hoa mau giao an cu (chi co `sections`) ve hinh moi - cung logic voi normalizeLessonPlan. */
export function normalizeLessonPlanTemplate(raw: LessonPlanTemplateRawDoc): LessonPlanTemplateDoc {
  return {
    ...raw,
    objectives: raw.objectives ?? EMPTY_OBJECTIVES,
    preparation: raw.preparation ?? EMPTY_PREPARATION,
    activities: raw.activities ?? sectionsToActivities(raw.sections ?? []),
    homework: raw.homework ?? "",
  };
}
