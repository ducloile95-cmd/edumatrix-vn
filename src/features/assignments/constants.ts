import type { SubmissionStatus } from "@/types/academic";

// Nhãn/tone trạng thái bài nộp dùng chung (Viewer xem trạng thái bài của mình).
export const SUBMISSION_STATUS_TONE: Record<SubmissionStatus, "success" | "warning" | "danger" | "info" | "neutral"> = {
  submitted: "info",
  reviewing: "neutral",
  graded: "success",
  redo_required: "warning",
};

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: "Đã nộp",
  reviewing: "Đang chấm",
  graded: "Đã chấm",
  redo_required: "Cần làm lại",
};
