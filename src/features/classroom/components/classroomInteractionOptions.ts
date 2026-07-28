import {
  CLASSROOM_ATTENDANCE_LABEL,
  CLASSROOM_HOMEWORK_LABEL,
} from "@/services/firestore/classroomInteractions";
import type { AttendanceStatus, PreviousHomeworkStatus } from "@/types/academic";

export const ATTENDANCE_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "present", label: CLASSROOM_ATTENDANCE_LABEL.present },
  { value: "late", label: CLASSROOM_ATTENDANCE_LABEL.late },
  { value: "absent", label: CLASSROOM_ATTENDANCE_LABEL.absent },
  { value: "excused", label: CLASSROOM_ATTENDANCE_LABEL.excused },
];

export const HOMEWORK_OPTIONS: Array<{ value: PreviousHomeworkStatus; label: string }> = [
  { value: "done", label: CLASSROOM_HOMEWORK_LABEL.done },
  { value: "partial", label: CLASSROOM_HOMEWORK_LABEL.partial },
  { value: "not_done", label: CLASSROOM_HOMEWORK_LABEL.not_done },
  { value: "not_assigned", label: CLASSROOM_HOMEWORK_LABEL.not_assigned },
];
