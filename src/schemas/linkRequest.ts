import { z } from "zod";

/** Toi da 5 con moi yeu cau - khop gioi han da chot trong firestore.rules. */
export const MAX_DECLARED_CHILDREN = 5;

export const RELATIONSHIPS = ["Bố", "Mẹ", "Người giám hộ"] as const;

export const declaredChildSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập tên con"),
  nickname: z.string().trim().optional(),
  dateOfBirth: z.string().min(1, "Vui lòng chọn ngày sinh"),
  note: z.string().trim().optional(),
});

export const linkRequestSchema = z.object({
  parentName: z.string().trim().min(1, "Vui lòng nhập họ tên phụ huynh"),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại")
    .refine((value) => /^[0-9\s.+-]{8,15}$/.test(value), "Số điện thoại không hợp lệ"),
  relationship: z.enum(RELATIONSHIPS),
  children: z
    .array(declaredChildSchema)
    .min(1, "Cần khai báo ít nhất một con")
    .max(MAX_DECLARED_CHILDREN, `Tối đa ${MAX_DECLARED_CHILDREN} con mỗi lần gửi`),
});

export type LinkRequestFormValues = z.infer<typeof linkRequestSchema>;
