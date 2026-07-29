/**
 * Goi y ho so hoc sinh khop voi thong tin phu huynh tu khai bao.
 * Thuan tuy, khong cham Firestore - de test duoc bang unit test binh thuong.
 */

export interface DeclaredChild {
  fullName: string;
  nickname?: string;
  dateOfBirth?: string;
}

export interface MatchCandidate {
  id: string;
  fullName: string;
  nickname?: string;
  dateOfBirth: string;
}

export interface MatchSuggestion<T extends MatchCandidate> {
  student: T;
  score: number;
  reasons: string[];
}

const SCORE = { dateOfBirth: 3, fullName: 2, nickname: 2 } as const;

/** Hien goi y tu 2 diem tro len: mot minh ngay sinh (3) du, mot minh ten (2) du. */
const MIN_SCORE = 2;
const MAX_SUGGESTIONS = 3;

/**
 * Chuan hoa ten de so sanh: bo dau, ha chu thuong, gop khoang trang.
 * Phu huynh rat hay go "Nguyen Minh Anh" trong khi ho so ghi "Nguyễn Minh Anh";
 * so sanh nguyen van se truot gan het cac ca that.
 */
export function normalizeName(value: string | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function suggestMatches<T extends MatchCandidate>(child: DeclaredChild, students: T[]): MatchSuggestion<T>[] {
  const childName = normalizeName(child.fullName);
  const childNickname = normalizeName(child.nickname);

  return students
    .map((student) => {
      const reasons: string[] = [];
      let score = 0;

      if (child.dateOfBirth && student.dateOfBirth === child.dateOfBirth) {
        score += SCORE.dateOfBirth;
        reasons.push("Trùng ngày sinh");
      }
      if (childName && normalizeName(student.fullName) === childName) {
        score += SCORE.fullName;
        reasons.push("Trùng họ tên");
      }
      if (childNickname && normalizeName(student.nickname) === childNickname) {
        score += SCORE.nickname;
        reasons.push("Trùng biệt danh");
      }

      return { student, score, reasons };
    })
    .filter((item) => item.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.student.fullName.localeCompare(b.student.fullName, "vi"))
    .slice(0, MAX_SUGGESTIONS);
}
