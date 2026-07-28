import type { AttendanceDoc, StudentDoc, SubmissionDoc } from "@/types/academic";

export type GradeLetter = "S" | "A" | "B" | "D";
export type MetricValue = number | null;

export interface StudentScoreSummary {
  id: string;
  scoreCount: number;
  averagePercent: number;
  latestScore: number;
  latestMaxScore: number;
}

interface CountMetric {
  percent: MetricValue;
  total: number;
}

const TOTAL_SESSIONS_FALLBACK = 24;

export function buildAttendanceMetrics(items: (AttendanceDoc & { id: string })[]): Map<string, CountMetric> {
  const map = new Map<string, { counted: number; total: number }>();
  items.forEach((item) => {
    const current = map.get(item.studentId) ?? { counted: 0, total: 0 };
    const counted = item.status === "present" || item.status === "late" || item.status === "excused";
    map.set(item.studentId, { counted: current.counted + Number(counted), total: current.total + 1 });
  });
  return toPercentMap(map);
}

export function buildHomeworkMetrics(items: (SubmissionDoc & { id: string })[]): Map<string, CountMetric> {
  const map = new Map<string, { counted: number; total: number }>();
  items.forEach((item) => {
    const current = map.get(item.studentId) ?? { counted: 0, total: 0 };
    const counted = item.status === "submitted" || item.status === "reviewing" || item.status === "graded";
    map.set(item.studentId, { counted: current.counted + Number(counted), total: current.total + 1 });
  });
  return toPercentMap(map);
}

function toPercentMap(source: Map<string, { counted: number; total: number }>): Map<string, CountMetric> {
  return new Map(
    [...source.entries()].map(([studentId, value]) => [
      studentId,
      { percent: value.total ? Math.round((value.counted / value.total) * 100) : null, total: value.total },
    ]),
  );
}

export function getAssessmentPercent(summary?: StudentScoreSummary): MetricValue {
  if (!summary || summary.scoreCount === 0) return null;
  return Math.round(summary.averagePercent);
}

export function getGradeLetter(percent: number): GradeLetter {
  if (percent >= 95) return "S";
  if (percent >= 85) return "A";
  if (percent >= 70) return "B";
  return "D";
}

export function getLearningProgress(student: StudentDoc, attendance: CountMetric, totalSessions = TOTAL_SESSIONS_FALLBACK) {
  const plannedSessions = Math.max(1, totalSessions);
  const completed = attendance.total;
  const remaining = Math.max(0, plannedSessions - completed);
  const percent = Math.min(100, Math.round((completed / plannedSessions) * 100));
  return {
    completed,
    percent,
    remaining,
    startDate: formatDateOnly(student.createdAt),
    tone: percent >= 70 ? "success" : percent >= 40 ? "warning" : "danger",
  };
}


function formatDateOnly(value: StudentDoc["createdAt"]): string {
  return value?.toDate ? value.toDate().toLocaleDateString("vi-VN") : "--";
}
