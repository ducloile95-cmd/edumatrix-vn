import { fromZonedTime } from "date-fns-tz";

/** Gio truong hoc, dung chung cho toan bo logic sinh lich - khong phu thuoc mui gio he thong cua trinh duyet/may chu. */
export const SCHOOL_TIME_ZONE = "Asia/Ho_Chi_Minh";

export interface RecurrenceInput {
  /** Moc bat dau tim buoi hoc - chi phan ngay duoc dung, gio lay tu startTime/endTime. */
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
  const datePart = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
  return schoolDateTimeToDate(`${datePart}T${time}`);
}

/** Chuyển giá trị từ input datetime-local thành đúng thời điểm theo giờ Việt Nam. */
export function schoolDateTimeToDate(value: string): Date {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  return fromZonedTime(new Date(year, month - 1, day, hours, minutes, 0, 0), SCHOOL_TIME_ZONE);
}

/**
 * Sinh danh sach buoi hoc lap theo tuan, bat dau tim tu startDate (inclusive).
 * Chi nhung ngay nam trong daysOfWeek moi duoc tao.
 */
export function generateRecurringSessions(input: RecurrenceInput): RecurrenceResult {
  const sessions: RecurrenceSession[] = [];
  const cursor = new Date(input.startDate);
  cursor.setHours(0, 0, 0, 0);

  while (sessions.length < input.sessionCount) {
    if (input.daysOfWeek.includes(cursor.getDay())) {
      sessions.push({ startAt: withTime(cursor, input.startTime), endAt: withTime(cursor, input.endTime) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { sessions, endDate: sessions[sessions.length - 1].startAt };
}
