const CURATED_ENGLISH: Record<string, string> = {
  "Tổng quan": "Overview",
  "Quản lý lớp học": "Class management",
  "Học sinh": "Students",
  "Lớp học": "Classes",
  "Lịch học": "Schedule",
  "Lịch dạy": "Teaching schedule",
  "Môn học & Khóa học": "Subjects & Courses",
  "Môn học": "Subjects",
  "Khóa học": "Courses",
  "Chức năng": "Features",
  "Tương tác lớp học": "Classroom",
  "Giáo án": "Lesson plans",
  "Điểm danh": "Attendance",
  "Bài tập & Điểm": "Assignments & Grades",
  "Bài tập": "Assignments",
  "Học phí": "Tuition",
  "Tài chính": "Finance",
  "Cài đặt": "Settings",
  "Quản lý": "Management",
  "Người dùng": "Users",
  "Thông báo": "Notifications",
  "Giao diện": "Theme",
  "Ngôn ngữ": "Language",
  "Buổi học": "Sessions",
  "Thông tin tài khoản": "Account preferences",
  "Tùy chỉnh trải nghiệm trên toàn hệ thống": "Customize your experience across the system",
  "Toàn hệ thống": "System-wide",
  "Áp dụng ngay": "Apply now",
  "Đăng xuất": "Sign out",
  "Tài khoản": "Account",
  "Sáng": "Light",
  "Tối": "Dark",
  "Khác": "More",
  "Thêm": "Add",
  "Tìm kiếm...": "Search...",
  "Sắp có": "Coming soon",
  "Thứ Hai": "Monday",
  "Thứ Ba": "Tuesday",
  "Thứ Tư": "Wednesday",
  "Thứ Năm": "Thursday",
  "Thứ Sáu": "Friday",
  "Thứ Bảy": "Saturday",
  "Chủ Nhật": "Sunday",
  "tháng 1": "January",
  "tháng 2": "February",
  "tháng 3": "March",
  "tháng 4": "April",
  "tháng 5": "May",
  "tháng 6": "June",
  "tháng 7": "July",
  "tháng 8": "August",
  "tháng 9": "September",
  "tháng 10": "October",
  "tháng 11": "November",
  "tháng 12": "December",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Chi thay cum tu dung rieng (khong dinh chu/so lien truoc hoac lien sau): tranh "Thứ Hai" trong "Thứ Hailey".
function buildPattern(dictionary: Record<string, string>): RegExp {
  const alternatives = Object.keys(dictionary)
    .filter((source) => source.length >= 2)
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, "gu");
}

let dictionary: Record<string, string> = CURATED_ENGLISH;
let pattern = buildPattern(dictionary);
let loading: Promise<void> | null = null;

/** Tu dien day du (~180 KB) chi tai khi nguoi dung chon tieng Anh, khong nam trong chunk chinh. */
export function loadEnglishDictionary(): Promise<void> {
  loading ??= import("@/features/preferences/en.generated.json").then((module) => {
    dictionary = { ...(module.default as Record<string, string>), ...CURATED_ENGLISH };
    pattern = buildPattern(dictionary);
  });
  return loading;
}

export function translateToEnglish(value: string): string {
  const trimmed = value.trim();
  const exact = dictionary[trimmed];
  if (exact) return value.replace(trimmed, exact);
  return value.replace(pattern, (source) => dictionary[source] ?? source);
}
