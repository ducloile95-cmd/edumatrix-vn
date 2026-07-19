import { z } from "zod";

export const sessionFormSchema = z.object({
  scheduleMode: z.enum(["single", "weekly"]),
  classId: z.string().min(1, "Chọn lớp học"),
  title: z.string().trim().min(1, "Nhập tên buổi học"),
  startAt: z.string().default(""),
  endAt: z.string().default(""),
  recurrenceStartDate: z.string().default(""),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).default([]),
  recurrenceStartTime: z.string().default(""),
  recurrenceEndTime: z.string().default(""),
  sessionCount: z.coerce.number().int().min(1, "Tối thiểu 1 buổi").max(200, "Tối đa 200 buổi").default(1),
  location: z.string().trim().default(""),
  note: z.string().trim().default(""),
  makeUpForSessionId: z.string().default(""),
}).superRefine((value, context) => {
  if (value.scheduleMode === "single") {
    if (!value.startAt) context.addIssue({ code: "custom", message: "Chọn thời gian bắt đầu", path: ["startAt"] });
    if (!value.endAt) context.addIssue({ code: "custom", message: "Chọn thời gian kết thúc", path: ["endAt"] });
    if (value.startAt && value.endAt && new Date(value.endAt) <= new Date(value.startAt)) {
      context.addIssue({ code: "custom", message: "Thời gian kết thúc phải sau bắt đầu", path: ["endAt"] });
    }
    return;
  }

  if (!value.recurrenceStartDate) context.addIssue({ code: "custom", message: "Chọn mốc bắt đầu", path: ["recurrenceStartDate"] });
  if (value.recurrenceDays.length === 0) context.addIssue({ code: "custom", message: "Chọn ít nhất một thứ", path: ["recurrenceDays"] });
  if (!value.recurrenceStartTime) context.addIssue({ code: "custom", message: "Chọn giờ bắt đầu", path: ["recurrenceStartTime"] });
  if (!value.recurrenceEndTime) context.addIssue({ code: "custom", message: "Chọn giờ kết thúc", path: ["recurrenceEndTime"] });
  if (value.recurrenceStartTime && value.recurrenceEndTime && value.recurrenceEndTime <= value.recurrenceStartTime) {
    context.addIssue({ code: "custom", message: "Giờ kết thúc phải sau giờ bắt đầu", path: ["recurrenceEndTime"] });
  }
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
