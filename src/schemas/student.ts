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
  staffNote: z.string().trim().optional(),
  parentName: z.string().trim().optional(),
  parentAddress: z.string().trim().optional(),
  parentPhone: z.string().trim().optional(),
  parentEmail: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, "Email không hợp lệ"),
  parentFacebookUrl: z.string().trim().optional(),
  classId: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  const hasParentInfo = Boolean(
    value.parentName || value.parentAddress || value.parentPhone || value.parentFacebookUrl,
  );
  if (hasParentInfo && !value.parentEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Vui lòng nhập email liên kết khi có thông tin phụ huynh",
      path: ["parentEmail"],
    });
  }
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
