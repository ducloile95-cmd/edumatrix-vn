import { fromZonedTime } from "date-fns-tz";

/** Gio truong hoc, dung chung cho toan bo logic sinh lich - khong phu thuoc mui gio he thong cua trinh duyet/may chu. */
export const SCHOOL_TIME_ZONE = "Asia/Ho_Chi_Minh";

export interface RecurrenceInput {
  /** Ngay khai giang - chi phan ngay duoc dung, gio lay tu startTime/endTime. */
  startDate: Date;
  /** 0=CN..6=T7. Phai co it nhat 1 phan tu (kiem tra o schema, khong kiem o day). */
  daysOfWeek: number[];
  /** "HH:mm" 24h. */
  startTime: string;
  /** "HH:mm" 24h. */
  endTime: string;
  /** >= 1 (kiem tra o schema, khong kiem o day). */
  sessionCount: number;
}

export interface RecurrenceSession {
  startAt: Date;
  endAt: Date;
}

export interface RecurrenceResult {
  sessions: RecurrenceSession[];
  /** Ngay cua buoi cuoi cung = ngay be giang. */
  endDate: Date;
}

/**
 * Ghep ngay cua `date` (theo lich duong da co) voi gio "HH:mm" - gio nay luon duoc hieu
 * la gio Viet Nam (SCHOOL_TIME_ZONE), khong phai gio he thong cua trinh duyet/may chu.
 * Tranh sai lech buoi hoc neu thiet bi tao lich dang dat mui gio khac Viet Nam.
 */
function withTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const wallClock = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
  return fromZonedTime(wallClock, SCHOOL_TIME_ZONE);
}

/**
 * Sinh danh sach buoi hoc lap theo tuan. Buoi #1 luon co dinh = startDate,
 * bat ke thu cua startDate co khop daysOfWeek hay khong. Cac buoi tiep theo
 * di tung ngay tu hom sau startDate, lay dung ngay roi vao daysOfWeek, cho
 * toi khi du sessionCount buoi.
 */
export function generateRecurringSessions(input: RecurrenceInput): RecurrenceResult {
  const sessions: RecurrenceSession[] = [];
  const cursor = new Date(input.startDate);
  cursor.setHours(0, 0, 0, 0);

  sessions.push({ startAt: withTime(cursor, input.startTime), endAt: withTime(cursor, input.endTime) });
  cursor.setDate(cursor.getDate() + 1);

  while (sessions.length < input.sessionCount) {
    if (input.daysOfWeek.includes(cursor.getDay())) {
      sessions.push({ startAt: withTime(cursor, input.startTime), endAt: withTime(cursor, input.endTime) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { sessions, endDate: sessions[sessions.length - 1].startAt };
}
