import { z } from "zod";

/** pricePerSession/totalSessions la so nguyen VND, khong dung float (A7.4). */
export const courseFormSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên khóa học"),
  subjectIds: z.array(z.string()).min(1, "Chọn ít nhất 1 môn học"),
  pricePerSession: z.coerce.number().int("Học phí/buổi phải là số nguyên").nonnegative("Học phí/buổi không được âm"),
  totalSessions: z.coerce.number().int("Số buổi phải là số nguyên").positive("Số buổi phải lớn hơn 0"),
  startDate: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
  endDate: z.string().min(1, "Vui lòng chọn ngày kết thúc"),
  status: z.enum(["draft", "active", "completed"]),
}).refine((value) => new Date(value.endDate) >= new Date(value.startDate), {
  message: "Ngay ket thuc phai sau hoac bang ngay bat dau",
  path: ["endDate"],
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;
