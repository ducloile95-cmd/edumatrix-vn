import { z } from "zod";

export const billingItemFormSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên đồ dùng học tập"),
  courseId: z.string().min(1, "Vui lòng chọn khóa học"),
  subjectId: z.string().min(1, "Vui lòng chọn môn học"),
  unitPrice: z.coerce.number().int("Đơn giá phải là số nguyên").positive("Đơn giá phải lớn hơn 0"),
  status: z.enum(["active", "archived"]),
});

export type BillingItemFormValues = z.infer<typeof billingItemFormSchema>;
