import { z } from "zod";

/** Ma mon hoc dung lam document ID (A13) nen chuan hoa uppercase o schema. */
export const subjectFormSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên môn học"),
  code: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã môn học")
    .transform((v) => v.toUpperCase()),
  description: z.string().trim().optional().default(""),
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;
