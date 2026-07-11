import { z } from "zod";

export const lessonPlanFormSchema = z.object({
  title: z.string().trim().min(1, "Nhap ten giao an"),
  classId: z.string().nullable().default(null),
  courseId: z.string().nullable().default(null),
  subjectId: z.string().nullable().default(null),
  sessionId: z.string().nullable().default(null),
  sections: z.array(z.object({ title: z.string().trim().min(1), content: z.string().trim() })).min(1),
  publicSummary: z.string().trim().default(""),
  status: z.enum(["draft", "published", "archived"]),
});
export type LessonPlanFormValues = z.infer<typeof lessonPlanFormSchema>;
