import { z } from "zod";

export const sessionFormSchema = z.object({
  classId: z.string().min(1, "Chon lop hoc"),
  title: z.string().trim().min(1, "Nhap ten buoi hoc"),
  startAt: z.string().min(1, "Chon thoi gian bat dau"),
  endAt: z.string().min(1, "Chon thoi gian ket thuc"),
  location: z.string().trim().default(""),
  note: z.string().trim().default(""),
  repeatCount: z.coerce.number().int().min(1).max(52).default(1),
  makeUpForSessionId: z.string().nullable().default(null),
}).refine((value) => new Date(value.endAt) > new Date(value.startAt), {
  message: "Thoi gian ket thuc phai sau bat dau",
  path: ["endAt"],
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
