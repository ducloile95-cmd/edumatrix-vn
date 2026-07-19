export type AcademicRank = "S" | "A" | "B" | "D";

export interface RankThresholds {
  S: number;
  A: number;
  B: number;
  D: number;
}

export const DEFAULT_RANK_THRESHOLDS: RankThresholds = { S: 90, A: 80, B: 65, D: 0 };

export function isValidRankThresholds(value: RankThresholds): boolean {
  return value.S <= 100 && value.S > value.A && value.A > value.B && value.B > value.D && value.D === 0;
}

export function rankFromPercent(percent: number | null, thresholds: RankThresholds): AcademicRank | null {
  if (percent == null || !Number.isFinite(percent)) return null;
  if (percent >= thresholds.S) return "S";
  if (percent >= thresholds.A) return "A";
  if (percent >= thresholds.B) return "B";
  return "D";
}
