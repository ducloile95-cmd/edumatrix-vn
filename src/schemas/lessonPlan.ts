import { z } from "zod";

const objectivesSchema = z.object({
  knowledge: z.string().trim().default(""),
  skills: z.string().trim().default(""),
  attitude: z.string().trim().default(""),
});

const preparationSchema = z.object({
  teacher: z.string().trim().default(""),
  student: z.string().trim().default(""),
});

const activitySchema = z.object({
  name: z.string().trim().min(1, "Nhập tên hoạt động"),
  durationMinutes: z.coerce.number().int("Thời gian phải là số nguyên").nonnegative("Thời gian không được âm"),
  content: z.string().trim().default(""),
  expectedOutcome: z.string().trim().default(""),
});

export const lessonPlanFormSchema = z
  .object({
    title: z.string().trim().min(1, "Nhập tên giáo án"),
    classId: z.string().nullable().default(null),
    courseId: z.string().nullable().default(null),
    subjectId: z.string().nullable().default(null),
    sessionId: z.string().nullable().default(null),
    objectives: objectivesSchema,
    preparation: preparationSchema,
    activities: z.array(activitySchema).min(1, "Cần ít nhất 1 hoạt động"),
    homework: z.string().trim().default(""),
    notesAfterTeaching: z.string().trim().default(""),
    attachmentUrl: z.string().trim().nullable().default(null),
    attachmentLabel: z.string().trim().default(""),
    publicSummary: z.string().trim().default(""),
    status: z.enum(["draft", "published", "archived"]),
  })
  .refine((value) => !value.attachmentUrl || value.attachmentUrl.startsWith("https://"), {
    message: "Link phải bắt đầu bằng https://",
    path: ["attachmentUrl"],
  })
  .refine((value) => !!value.classId, {
    message: "Chọn lớp học trước khi lưu giáo án",
    path: ["classId"],
  });

export type LessonPlanFormValues = z.infer<typeof lessonPlanFormSchema>;
