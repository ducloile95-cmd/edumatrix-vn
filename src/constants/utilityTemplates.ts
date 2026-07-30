import { CalendarClock, CheckCheck, CreditCard, ShieldCheck, Star, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UtilityTemplateKey } from "@/services/integrations/messenger";

/**
 * Danh muc mau Utility dung chung cho frontend (modal danh muc + form gui).
 *
 * NGUON SU THAT cua `parameterKeys` la registry trong Worker:
 * `workers/messenger/src/index.ts` -> `UTILITY_TEMPLATES`. Frontend khong import
 * duoc tu do (khac package, khac runtime) nen phai khai lai o day, DUNG THU TU.
 *
 * Neu hai ben lech nhau, Worker chan bang `validUtilityParameters()` va tra ma
 * loi `utility_parameters_invalid` - nguoi dung thay thong bao ro rang chu khong
 * gui ra Meta mot payload sai. Do la luoi an toan cho ban khai lai nay.
 */
export interface UtilityTemplateDescriptor {
  key: UtilityTemplateKey;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Teacher co duoc gui mau nay khong - Worker kiem tra lai o server. */
  teacherAllowed: boolean;
  parameterKeys: string[];
}

export const UTILITY_TEMPLATES: UtilityTemplateDescriptor[] = [
  {
    key: "tuition_payment_reminder",
    label: "Nhắc học phí",
    description: "Nhắc kỳ học phí, số tiền và hạn thanh toán.",
    icon: CreditCard,
    teacherAllowed: true,
    parameterKeys: ["studentName", "billingPeriod", "amount", "dueDate"],
  },
  {
    key: "tuition_payment_confirmation",
    label: "Thanh toán học phí thành công",
    description: "Xác nhận khoản học phí đã được ghi nhận.",
    icon: CheckCheck,
    teacherAllowed: true,
    parameterKeys: ["studentName", "billingPeriod", "amount", "paymentDate", "paymentReference"],
  },
  {
    key: "class_schedule_adjustment",
    label: "Điều chỉnh lịch học",
    description: "Áp dụng cho nghỉ học, học bù hoặc học bổ sung.",
    icon: CalendarClock,
    teacherAllowed: true,
    parameterKeys: ["className", "studentName", "lessonDate", "lessonTime", "adjustmentNote"],
  },
  {
    key: "lesson_feedback_request",
    label: "Đánh giá buổi học",
    description: "Mời phụ huynh gửi đánh giá sau buổi học.",
    icon: Star,
    teacherAllowed: true,
    parameterKeys: ["className", "studentName", "teacherName"],
  },
  {
    key: "enrollment_confirmation",
    label: "Xác nhận đăng ký học",
    description: "Thông báo đăng ký khóa học và lớp học thành công.",
    icon: UserCheck,
    teacherAllowed: true,
    parameterKeys: ["studentName", "courseName", "centerName"],
  },
  {
    key: "parent_account_link_confirmation",
    label: "Liên kết tài khoản phụ huynh",
    description: "Mời phụ huynh đăng nhập bằng email đã đăng ký.",
    icon: ShieldCheck,
    teacherAllowed: false,
    parameterKeys: ["parentEmail", "studentName"],
  },
];

/** Nhan va kieu input cho tung tham so - ten tham so mang nghia duy nhat toan he. */
const UTILITY_PARAMETER_FIELDS: Record<string, { label: string; type: string }> = {
  adjustmentNote: { label: "Nội dung điều chỉnh", type: "text" },
  amount: { label: "Số tiền", type: "text" },
  billingPeriod: { label: "Kỳ học phí", type: "text" },
  centerName: { label: "Tên trung tâm", type: "text" },
  className: { label: "Lớp học", type: "text" },
  courseName: { label: "Khóa học", type: "text" },
  dueDate: { label: "Hạn thanh toán", type: "date" },
  lessonDate: { label: "Ngày học", type: "date" },
  lessonTime: { label: "Giờ học", type: "time" },
  parentEmail: { label: "Email phụ huynh", type: "email" },
  paymentDate: { label: "Ngày thanh toán", type: "date" },
  paymentReference: { label: "Mã giao dịch", type: "text" },
  studentName: { label: "Tên học sinh", type: "text" },
  teacherName: { label: "Giáo viên phụ trách", type: "text" },
};

export function utilityParameterField(key: string): { label: string; type: string } {
  return UTILITY_PARAMETER_FIELDS[key] ?? { label: key, type: "text" };
}
