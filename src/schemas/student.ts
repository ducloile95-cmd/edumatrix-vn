import { z } from "zod";

/** Ma hoc sinh dung lam document ID (A13) nen chuan hoa uppercase o schema. */
export const studentFormSchema = z.object({
  studentCode: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã học sinh")
    .transform((v) => v.toUpperCase()),
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên"),
  dateOfBirth: z.string().min(1, "Vui lòng chọn ngày sinh"),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

export const linkParentFormSchema = z.object({
  parentEmail: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email phụ huynh")
    .email("Email không hợp lệ"),
});

export type LinkParentFormValues = z.infer<typeof linkParentFormSchema>;
