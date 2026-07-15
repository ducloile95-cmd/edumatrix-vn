/**
 * Tinh vi tri hien thi cac buoi hoc tren time-grid (06:00-23:00).
 * Thuat toan chia cot khi trung gio (kieu Google Calendar): gom cac buoi
 * trung gio thanh 1 "cluster", trong cluster gan cot theo greedy - buoi nao
 * bat dau sau khi 1 cot da ket thuc thi dung lai cot do, khong thi mo cot moi.
 */
export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 23;
export const GRID_TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR;
export const HOUR_HEIGHT_PX = 34;
export const GRID_HEIGHT_PX = GRID_TOTAL_HOURS * HOUR_HEIGHT_PX;

export interface TimetableLayoutInput {
  startAt: Date;
  endAt: Date;
}

export interface TimetableLayoutResult {
  col: number;
  colCount: number;
  topPx: number;
  heightPx: number;
}

function minutesSinceGridStart(date: Date): number {
  return (date.getHours() - GRID_START_HOUR) * 60 + date.getMinutes();
}

function clampMinutes(minutes: number): number {
  return Math.min(Math.max(minutes, 0), GRID_TOTAL_HOURS * 60);
}

export function layoutDaySessions<T extends TimetableLayoutInput>(
  items: T[],
): (T & TimetableLayoutResult)[] {
  const sorted = [...items].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const clusters: T[][] = [];
  let current: T[] = [];
  let clusterEnd = -Infinity;
  for (const item of sorted) {
    if (current.length === 0 || item.startAt.getTime() < clusterEnd) {
      current.push(item);
      clusterEnd = Math.max(clusterEnd, item.endAt.getTime());
    } else {
      clusters.push(current);
      current = [item];
      clusterEnd = item.endAt.getTime();
    }
  }
  if (current.length > 0) clusters.push(current);

  const result: (T & TimetableLayoutResult)[] = [];
  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const colByIndex: number[] = [];
    cluster.forEach((item, index) => {
      let placedCol = -1;
      for (let c = 0; c < columnEnds.length; c += 1) {
        if (item.startAt.getTime() >= columnEnds[c]) {
          columnEnds[c] = item.endAt.getTime();
          placedCol = c;
          break;
        }
      }
      if (placedCol === -1) {
        columnEnds.push(item.endAt.getTime());
        placedCol = columnEnds.length - 1;
      }
      colByIndex[index] = placedCol;
    });
    const colCount = columnEnds.length;
    cluster.forEach((item, index) => {
      const startMinutes = clampMinutes(minutesSinceGridStart(item.startAt));
      const endMinutes = clampMinutes(minutesSinceGridStart(item.endAt));
      const visibleMinutes = endMinutes - startMinutes;
      if (visibleMinutes <= 0) return;
      const top = (startMinutes / 60) * HOUR_HEIGHT_PX;
      const maxHeight = GRID_HEIGHT_PX - top;
      const height = Math.min(maxHeight, Math.max(22, (visibleMinutes / 60) * HOUR_HEIGHT_PX - 2));
      result.push({ ...item, col: colByIndex[index], colCount, topPx: top, heightPx: height });
    });
  }
  return result;
}

export function hourLabels(): string[] {
  const labels: string[] = [];
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h += 1) {
    labels.push(`${String(h).padStart(2, "0")}:00`);
  }
  return labels;
}
