import { z } from "zod";
import { USER_ROLES } from "@/constants/roles";

/**
 * Schema tao loi moi (Admin). Email se duoc chuan hoa lowercase o service
 * layer truoc khi ghi Firestore (A7.4). studentIds nhap dang chuoi cach nhau
 * boi dau phay trong form, parse thanh mang o schema.
 */
export const inviteFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.VIEWER], {
    errorMap: () => ({ message: "Vui lòng chọn vai trò" }),
  }),
  studentIdsText: z.string().optional().default(""),
});

export type InviteFormValues = z.infer<typeof inviteFormSchema>;

export function parseStudentIds(text: string | undefined): string[] {
  if (!text) return [];
  return Array.from(
    new Set(
      text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}
