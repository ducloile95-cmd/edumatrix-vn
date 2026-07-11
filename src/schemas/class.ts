import { z } from "zod";

export const classFormSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên lớp"),
  courseId: z.string().min(1, "Vui lòng chọn khóa học"),
  subjectIds: z.array(z.string()).min(1, "Chọn ít nhất 1 môn học"),
  teacherIds: z.array(z.string()).default([]),
  scheduleText: z.string().trim().optional().default(""),
  location: z.string().trim().optional().default(""),
  status: z.enum(["active", "completed", "cancelled"]),
});

export type ClassFormValues = z.infer<typeof classFormSchema>;
