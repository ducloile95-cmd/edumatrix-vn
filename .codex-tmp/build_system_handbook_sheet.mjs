import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/system-handbook-edumatrix";
await fs.mkdir(outputDir, { recursive: true });

const wb = Workbook.create();
const C = {
  navy: "#12324A", blue: "#0B6E99", cyan: "#DFF3FA", green: "#E8F6EE",
  amber: "#FFF2CC", red: "#FCE8E6", line: "#D8E3E8", text: "#18313F", muted: "#5D7480",
};

function makeSheet(name, headers, rows, widths, tableName) {
  const s = wb.worksheets.add(name);
  const cols = headers.length;
  const endCol = String.fromCharCode(64 + cols);
  s.getRange(`A1:${endCol}1`).values = [headers];
  if (rows.length) s.getRange(`A2:${endCol}${rows.length + 1}`).values = rows;
  s.getRange(`A1:${endCol}1`).format = {
    fill: C.navy, font: { bold: true, color: "#FFFFFF" },
    verticalAlignment: "center", wrapText: true, rowHeight: 34,
  };
  if (rows.length) {
    s.getRange(`A2:${endCol}${rows.length + 1}`).format = {
      font: { color: C.text, size: 10 }, verticalAlignment: "top", wrapText: true,
      borders: { insideHorizontal: { style: "thin", color: C.line } }, rowHeight: 48,
    };
    s.tables.add(`A1:${endCol}${rows.length + 1}`, true, tableName);
  }
  widths.forEach((w, i) => s.getRange(`${String.fromCharCode(65 + i)}:${String.fromCharCode(65 + i)}`).format.columnWidth = w);
  s.freezePanes.freezeRows(1);
  s.showGridLines = false;
  return s;
}

const architectureRows = [
  ["Người dùng", "Admin / Giáo viên / Phụ huynh", "Trình duyệt", "Sử dụng giao diện theo vai trò", "HTTPS", "Không giữ secret phía client"],
  ["Frontend", "React 18 + Vite + TypeScript", "Firebase Hosting", "SPA, routing, biểu mẫu, dashboard", "Firebase Web SDK", "Build ra thư mục dist"],
  ["Xác thực", "Firebase Authentication", "Firebase", "Email/mật khẩu và Google sign-in", "ID token", "Domain phải nằm trong Authorized domains"],
  ["Dữ liệu", "Cloud Firestore", "Firebase", "Dữ liệu nghiệp vụ, realtime query", "Firestore SDK", "Security Rules deny-by-default"],
  ["Bảo vệ client", "Firebase App Check + reCAPTCHA v3", "Firebase / Google", "Xác minh request đến từ ứng dụng hợp lệ", "App Check token", "Theo dõi Metrics trước khi Enforce"],
  ["Backend bí mật", "Cloudflare Messenger Worker", "Cloudflare Workers", "Giữ Meta secrets, xác minh Firebase token, gọi Graph API", "REST/JSON", "CORS giới hạn theo ALLOWED_ORIGIN"],
  ["Tin nhắn", "Meta Messenger Platform", "Meta", "Webhook, liên kết PSID, gửi tin và đăng Fanpage", "Graph API", "Tuân thủ cửa sổ nhắn tin và Message Tag"],
  ["Tài liệu", "Google Drive API + Picker", "Google Cloud", "Chọn và gắn tài liệu giáo án", "OAuth 2.0", "API key giới hạn theo referrer"],
  ["Thanh toán", "VietQR", "API công khai", "Danh sách ngân hàng và QR chuyển khoản", "HTTPS", "Không chứa thông tin đăng nhập ngân hàng"],
  ["Thời tiết", "Open-Meteo", "API công khai", "Hiển thị thời tiết dashboard", "HTTPS", "Theo dõi điều khoản khi tăng lưu lượng"],
];
const architecture = makeSheet("Kiến trúc hệ thống",
  ["Lớp", "Thành phần", "Nơi chạy", "Trách nhiệm", "Kết nối", "Nguyên tắc bảo mật"],
  architectureRows, [18, 30, 23, 42, 22, 48], "ArchitectureTable");
architecture.getRange(`A2:A${architectureRows.length + 1}`).format.font = { bold: true, color: C.blue };

const folderRows = [
  ["src/app", "Router, providers, guards và điều phối ứng dụng", "router.tsx, RequireAuth, RequireRole", "Frontend"],
  ["src/components", "Layout, feedback và UI dùng chung", "Sidebar, Topbar, Modal, Button", "Frontend"],
  ["src/features", "Module nghiệp vụ theo vertical slice", "students, classes, attendance, invoices…", "Frontend"],
  ["src/services/firebase", "Khởi tạo Firebase Auth, Firestore, App Check", "app.ts, authClient.ts", "Hạ tầng"],
  ["src/services/firestore", "Các repository đọc/ghi Firestore", "students.ts, classes.ts, invoices.ts…", "Dữ liệu"],
  ["src/services/integrations", "Kết nối Google Drive, Messenger, VietQR", "googleDrive.ts, messenger.ts, vietQr.ts", "Tích hợp"],
  ["src/schemas", "Kiểm tra dữ liệu biểu mẫu bằng Zod", "student.ts, session.ts, lessonPlan.ts", "Validation"],
  ["src/constants", "Routes, collections, roles và navigation", "routes.ts, collections.ts, roles.ts", "Cấu hình code"],
  ["src/types", "Kiểu TypeScript dùng chung", "user.ts, academic.ts, settings.ts", "Mô hình dữ liệu"],
  ["firebase", "Rules, indexes và tests cho Firestore", "firestore.rules, firestore.indexes.json", "Firebase"],
  ["workers/messenger", "Cloudflare Worker chứa logic và secrets Meta", "src/index.ts, wrangler.jsonc", "Backend"],
  ["scripts", "Seed admin, seed local, kiểm tra dữ liệu", "seed-admin.mjs, seed-local-full.mjs", "Công cụ"],
  ["public", "Tài nguyên tĩnh không qua bundler", "icons, assets", "Frontend"],
  ["dist", "Kết quả build production", "index.html, assets", "Không chỉnh sửa trực tiếp"],
  [".env.real", "Biến frontend dùng khi npm run build", "VITE_*", "Không chứa server secrets"],
  ["firebase.json", "Hosting, rewrites, headers, emulators", "public=dist", "Cấu hình deploy"],
  [".firebaserc", "Project Firebase mặc định", "edumatrix-vn-576b1", "Cấu hình deploy"],
];
const folders = makeSheet("Cấu trúc thư mục",
  ["Đường dẫn", "Vai trò", "Ví dụ", "Phạm vi"],
  folderRows, [27, 50, 42, 28], "FolderStructureTable");
folders.getRange(`A2:A${folderRows.length + 1}`).format.font = { bold: true, color: C.blue };

const moduleRows = [
  ["Tổng quan", "/app/dashboard", "Admin, Giáo viên", "Theo dõi việc cần chú ý, lịch sắp tới và tiến độ", "Kiểm tra dashboard mỗi đầu ngày"],
  ["Học sinh", "/app/students", "Admin, Giáo viên", "Hồ sơ học sinh và thông tin phụ huynh", "Tạo hồ sơ trước khi ghi danh"],
  ["Lớp học", "/app/classes", "Admin, Giáo viên", "Tạo lớp, gắn môn/khóa, giáo viên và học sinh", "Tạo danh mục trước, sau đó tạo lớp"],
  ["Môn & Khóa học", "/app/catalog", "Admin, Giáo viên", "Danh mục học thuật và học phí", "Dùng làm dữ liệu nền cho lớp"],
  ["Lịch học", "/app/sessions", "Admin, Giáo viên", "Tạo buổi học đơn lẻ hoặc lặp", "Kiểm tra trùng lịch trước khi lưu"],
  ["Tương tác lớp", "/app/classroom", "Admin, Giáo viên", "Chuyên cần, bài tập và tổng kết từng buổi", "Mở đúng session trước khi ghi nhận"],
  ["Giáo án", "/app/lesson-plans", "Admin, Giáo viên", "Soạn, lưu nháp, gắn Drive và xuất bản", "Không công khai metadata Drive riêng tư"],
  ["Điểm danh", "/app/attendance", "Admin, Giáo viên", "Điểm danh nhanh theo lớp", "Lưu cả lớp trong một lần"],
  ["Bài tập & Điểm", "/app/learning", "Admin, Giáo viên", "Giao bài, nhận bài, chấm điểm và nhận xét", "Theo dõi hạn nộp và trạng thái"],
  ["Tài chính", "/app/invoices", "Admin, Giáo viên", "Hóa đơn, công nợ, thanh toán và VietQR", "Đối soát trước khi xác nhận đã thu"],
  ["Marketing", "/app/marketing", "Admin", "Soạn và đăng nội dung Fanpage", "Kiểm tra quyền Page và ảnh trước khi đăng"],
  ["Chat", "/app/chat", "Admin, Giáo viên", "Messenger với phụ huynh và nhật ký gửi", "Chỉ gửi tới phụ huynh đã liên kết"],
  ["Người dùng", "/app/users", "Admin", "Mời, phân vai trò, khóa/mở tài khoản", "Không tự khóa tài khoản admin đang dùng"],
  ["Cài đặt", "/app/settings", "Admin, Giáo viên hạn chế", "Trường học, tích hợp, thanh toán, giao diện", "Chỉ Admin sửa cấu hình tích hợp"],
  ["Cổng phụ huynh", "/portal/*", "Phụ huynh", "Lịch, bài tập, học phí và thông báo", "Chỉ thấy studentIds được cấp trong invite"],
];
const modules = makeSheet("Module & sử dụng",
  ["Module", "Route", "Vai trò", "Mục đích", "Cách dùng khuyến nghị"],
  moduleRows, [24, 23, 23, 50, 52], "ModuleGuideTable");
modules.getRange(`A2:A${moduleRows.length + 1}`).format.font = { bold: true, color: C.blue };

const roleRows = [
  ["Admin", "Toàn hệ thống", "Quản trị người dùng, marketing, tích hợp; toàn bộ module giáo vụ", "Không được tự khóa chính mình; mọi thay đổi nhạy cảm cần audit", "users/{uid}.role = admin"],
  ["Giáo viên", "Lớp được phân công", "Quản lý học sinh/lớp, lịch, giáo án, điểm danh, bài tập, điểm, chat", "Không quản trị user hoặc marketing cấp hệ thống", "users/{uid}.role = teacher"],
  ["Phụ huynh / Viewer", "Các studentIds được mời", "Xem lịch, bài tập, học phí, thông báo", "Không được sửa role, status hoặc studentIds", "users/{uid}.role = viewer"],
  ["Chưa đăng nhập", "Không có", "Chỉ truy cập trang đăng nhập", "Mọi dữ liệu Firestore phải bị chặn", "request.auth == null"],
  ["Tài khoản disabled", "Không có", "Chuyển tới /account-disabled", "Không được tiếp tục truy cập dữ liệu", "users/{uid}.status = disabled"],
];
const roles = makeSheet("Vai trò & quyền",
  ["Vai trò", "Phạm vi dữ liệu", "Chức năng chính", "Giới hạn", "Điều kiện"],
  roleRows, [25, 35, 55, 55, 38], "RolesTable");
roles.getRange(`A2:A${roleRows.length + 1}`).format.font = { bold: true, color: C.blue };

const collectionGroups = [
  ["Nhận dạng", "users", "Hồ sơ người dùng, role, status, studentIds", "UID Firebase Auth", "Nhạy cảm"],
  ["Nhận dạng", "invites", "Lời mời và claim tài khoản", "Email chuẩn hóa lowercase", "Nhạy cảm"],
  ["Học thuật", "students", "Hồ sơ học sinh", "Mã hệ thống", "Nhạy cảm"],
  ["Học thuật", "subjects / courses", "Môn học và khóa học", "ID danh mục", "Nội bộ"],
  ["Học thuật", "classes / enrollments", "Lớp và ghi danh", "ID lớp / liên kết", "Nội bộ"],
  ["Buổi học", "sessions", "Lịch và buổi học", "Session ID", "Nội bộ"],
  ["Buổi học", "session_interactions", "Tương tác và tổng kết buổi", "Session ID", "Nhạy cảm"],
  ["Giáo án", "lesson_plans", "Giáo án riêng và metadata Drive", "Lesson plan ID", "Nhạy cảm"],
  ["Giáo án", "lesson_plan_public", "Tóm tắt giáo án được xuất bản", "Lesson plan ID", "Công khai có kiểm soát"],
  ["Chuyên cần", "attendance / attendance_summaries", "Điểm danh và tổng hợp", "Session / Student", "Nhạy cảm"],
  ["Học tập", "assignments / submissions", "Bài tập và bài nộp", "Assignment / Student", "Nhạy cảm"],
  ["Học tập", "scores / student_summaries", "Điểm và tổng hợp tiến bộ", "Student / Course", "Nhạy cảm"],
  ["Tài chính", "invoices / payments", "Công nợ và thanh toán", "Invoice ID", "Rất nhạy cảm"],
  ["Thông báo", "announcements / notification_reads", "Thông báo và trạng thái đọc", "Announcement / User", "Nội bộ"],
  ["Messenger", "message_outbox / messenger_connections", "Hàng gửi và liên kết phụ huynh", "Message / UID", "Rất nhạy cảm"],
  ["Messenger", "chat_threads / fanpage_posts", "Hội thoại và bài đăng Fanpage", "Thread / Post", "Nhạy cảm"],
  ["Quản trị", "audit_logs", "Nhật ký hành động quan trọng", "Auto ID", "Chỉ Admin"],
  ["Cấu hình", "settings/*", "general, academic, payment, integrations, messenger", "Document cố định", "Chỉ Admin sửa"],
];
const collections = makeSheet("Cấu trúc dữ liệu",
  ["Nhóm", "Collection / Document", "Mục đích", "Khóa chính", "Mức nhạy cảm"],
  collectionGroups, [22, 40, 55, 30, 24], "DataStructureTable");
collections.getRange(`A2:A${collectionGroups.length + 1}`).format.font = { bold: true, color: C.blue };
collections.getRange(`E2:E${collectionGroups.length + 1}`).conditionalFormats.add("containsText", {
  text: "Rất nhạy cảm", format: { fill: C.red, font: { bold: true, color: "#9B2C2C" } },
});

const envRows = [
  ["Frontend", "VITE_FIREBASE_API_KEY", "Firebase web config", ".env.real", "Công khai", "Có"],
  ["Frontend", "VITE_FIREBASE_AUTH_DOMAIN", "Firebase Auth domain", ".env.real", "Công khai", "Có"],
  ["Frontend", "VITE_FIREBASE_PROJECT_ID", "Firebase project ID", ".env.real", "Công khai", "Có"],
  ["Frontend", "VITE_FIREBASE_STORAGE_BUCKET", "Firebase web config", ".env.real", "Công khai", "Có"],
  ["Frontend", "VITE_FIREBASE_MESSAGING_SENDER_ID", "Firebase web config", ".env.real", "Công khai", "Có"],
  ["Frontend", "VITE_FIREBASE_APP_ID", "Firebase Web App ID", ".env.real", "Công khai", "Có"],
  ["Frontend", "VITE_APPCHECK_SITE_KEY", "reCAPTCHA v3 site key", ".env.real", "Công khai", "Cần bật"],
  ["Frontend", "VITE_MESSENGER_WORKER_URL", "Worker endpoint", ".env.real", "Công khai", "Có"],
  ["Frontend", "VITE_MESSENGER_PAGE_USERNAME", "Tên Fanpage dùng tạo link", ".env.real", "Công khai", "Có"],
  ["Frontend", "VITE_GOOGLE_CLIENT_ID", "Google OAuth web client", ".env.real", "Công khai", "Có"],
  ["Frontend", "VITE_GOOGLE_PICKER_API_KEY", "Google Picker browser key", ".env.real", "Công khai nhưng phải restrict", "Có"],
  ["Frontend", "VITE_GOOGLE_PICKER_APP_ID", "Google Cloud project number", ".env.real", "Công khai", "Có"],
  ["Local", "VITE_USE_EMULATORS", "Chuyển Auth/Firestore sang emulator", ".env.local", "Chỉ dùng local", "Tùy chọn"],
  ["Local", "VITE_APPCHECK_DEBUG_TOKEN", "Debug App Check local", ".env.local", "Không đưa production", "Tùy chọn"],
  ["Worker secret", "META_PAGE_ACCESS_TOKEN", "Gọi Meta Graph API", "Cloudflare secret", "Bí mật", "Bắt buộc"],
  ["Worker secret", "META_APP_SECRET", "Xác minh chữ ký Meta", "Cloudflare secret", "Bí mật", "Bắt buộc"],
  ["Worker secret", "META_WEBHOOK_VERIFY_TOKEN", "Xác minh webhook", "Cloudflare secret", "Bí mật", "Bắt buộc"],
  ["Worker secret", "FIREBASE_CLIENT_EMAIL", "Service account Worker", "Cloudflare secret", "Bí mật", "Bắt buộc"],
  ["Worker secret", "FIREBASE_PRIVATE_KEY", "Ký JWT service account", "Cloudflare secret", "Tuyệt mật", "Bắt buộc"],
];
const env = makeSheet("Biến môi trường",
  ["Phạm vi", "Tên biến", "Mục đích", "Nơi lưu", "Phân loại", "Trạng thái"],
  envRows, [20, 40, 50, 30, 32, 20], "EnvironmentTable");
env.getRange(`B2:B${envRows.length + 1}`).format.font = { bold: true, color: C.blue };
env.getRange(`E2:E${envRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Bí mật", format: { fill: C.red, font: { bold: true, color: "#9B2C2C" } },
});
env.getRange(`E2:E${envRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Tuyệt mật", format: { fill: C.red, font: { bold: true, color: "#9B2C2C" } },
});

const deployRows = [
  [1, "Chuẩn bị máy", "Cài Node.js 20+, Git và Firebase CLI", "node --version; npx firebase-tools --version", "Chưa làm", "Kỹ thuật"],
  [2, "Cài dependencies", "Chạy npm ci tại thư mục gốc", "npm ci", "Chưa làm", "Kỹ thuật"],
  [3, "Cấu hình frontend", "Kiểm tra .env.real và domain production", "Không có server secret trong VITE_*", "Chưa làm", "Kỹ thuật"],
  [4, "Kiểm tra chất lượng", "Chạy lint, typecheck, unit test, rules test", "Tất cả lệnh exit code 0", "Chưa làm", "Kỹ thuật"],
  [5, "Build frontend", "Build bằng mode real", "npm run build", "Chưa làm", "Kỹ thuật"],
  [6, "Deploy Firestore", "Deploy rules và indexes khi có thay đổi", "npx firebase-tools deploy --only firestore", "Chưa làm", "Kỹ thuật"],
  [7, "Deploy Hosting", "Đưa dist lên Firebase Hosting", "npx firebase-tools deploy --only hosting", "Chưa làm", "Kỹ thuật"],
  [8, "Worker secrets", "Kiểm tra 5 Cloudflare secrets production", "Không in secret ra terminal/log", "Chưa làm", "Kỹ thuật"],
  [9, "Deploy Worker", "Deploy môi trường production", "cd workers/messenger; npx wrangler deploy --env production", "Chưa làm", "Kỹ thuật"],
  [10, "Kiểm tra domain", "DNS, SSL, Auth authorized domain, OAuth, API referrer, CORS", "https://edumatrix.id.vn trả 200", "Chưa làm", "Kỹ thuật"],
  [11, "Smoke test", "Đăng nhập, Firestore, Drive Picker, Messenger, VietQR", "Không có lỗi Console/CORS", "Chưa làm", "Nghiệp vụ"],
  [12, "App Check", "Theo dõi Metrics rồi mới bật Enforcement", "Verified requests ổn định", "Chưa làm", "Admin"],
  [13, "Bàn giao", "Ghi phiên bản, ngày deploy và người thực hiện", "Có biên bản thay đổi", "Chưa làm", "Quản lý"],
];
const deploy = makeSheet("Checklist triển khai",
  ["Bước", "Giai đoạn", "Công việc", "Tiêu chí hoàn thành", "Trạng thái", "Phụ trách"],
  deployRows, [10, 25, 60, 55, 22, 20], "DeploymentChecklistTable");
deploy.getRange(`E2:E${deployRows.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["Chưa làm", "Đang làm", "Hoàn thành", "Bị chặn"] },
};
deploy.getRange(`E2:E${deployRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Hoàn thành", format: { fill: C.green, font: { bold: true, color: "#18734B" } },
});
deploy.getRange(`E2:E${deployRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Bị chặn", format: { fill: C.red, font: { bold: true, color: "#9B2C2C" } },
});

const opsRows = [
  ["Mỗi lần thay đổi", "npm run lint", "Không có lỗi ESLint", "Developer", "Trước commit"],
  ["Mỗi lần thay đổi", "npm run typecheck", "Không có lỗi TypeScript", "Developer", "Trước commit"],
  ["Mỗi lần thay đổi", "npm test", "Unit tests pass", "Developer", "Trước commit"],
  ["Khi sửa Rules", "npm run test:rules", "Rules tests pass", "Developer", "Bắt buộc trước deploy"],
  ["Trước production", "npm run build", "Build mode real thành công", "Developer", "Bắt buộc"],
  ["Sau deploy", "Smoke test domain production", "Login, dữ liệu và tích hợp hoạt động", "Admin/Kỹ thuật", "Trong 15 phút"],
  ["Hàng ngày", "Firebase Usage + Worker logs", "Không tăng lỗi bất thường", "Admin", "Đầu hoặc cuối ngày"],
  ["Hàng tuần", "App Check Metrics", "Tỷ lệ verified ổn định", "Admin", "Trước Enforcement"],
  ["Hàng tuần", "Audit logs và tài khoản", "Không có user hoặc thao tác bất thường", "Admin", "Bảo mật"],
  ["Hàng tháng", "Dependencies và npm audit", "Không có lỗ hổng high/critical chưa xử lý", "Kỹ thuật", "Có kế hoạch cập nhật"],
  ["Khi đổi domain", "Chạy Checklist tên miền", "Hosting/Auth/OAuth/API key/CORS/reCAPTCHA đủ", "Kỹ thuật", "Trước mở traffic"],
  ["Khi có sự cố", "Ghi lại thời điểm, phiên bản, lỗi và cách khôi phục", "Có nhật ký sự cố", "Kỹ thuật", "Không xóa log trước khi điều tra"],
];
const ops = makeSheet("Kiểm thử & vận hành",
  ["Thời điểm", "Kiểm tra", "Tiêu chí", "Người thực hiện", "Ghi chú"],
  opsRows, [24, 40, 50, 26, 45], "OperationsTable");

const incidentRows = [
  ["Site Not Found", "Firebase CDN hoặc custom domain chưa hoàn tất/cache cũ", "Kiểm tra Hosting domain ACTIVE; thử query cache-bust; deploy lại Hosting", "Không đổi DNS liên tục khi Firebase đang cấp SSL"],
  ["auth/unauthorized-domain", "Domain chưa có trong Firebase Auth", "Authentication → Settings → Authorized domains", "Chỉ nhập hostname"],
  ["origin_mismatch", "Google OAuth chưa có JavaScript origin", "Thêm https://edumatrix.id.vn vào OAuth Client", "Không thêm dấu / cuối"],
  ["API_KEY_HTTP_REFERRER_BLOCKED", "Picker API key thiếu website referrer", "Thêm domain và wildcard vào API key", "Giữ API restriction cho Drive + Picker"],
  ["Lỗi CORS Worker", "ALLOWED_ORIGIN thiếu domain hoặc Worker chưa deploy", "Kiểm tra preflight và deploy --env production", "Giữ cả domain cũ nếu còn dùng"],
  ["App Check 403", "Site key/domain sai hoặc Enforcement bật quá sớm", "Tắt Enforcement tạm thời; kiểm tra Metrics và reCAPTCHA domain", "Không đưa debug token lên production"],
  ["permission-denied Firestore", "Rules chặn role/query hoặc thiếu index", "Đọc lỗi Console, kiểm tra role/status/studentIds và Rules", "Không nới Rules thành allow true"],
  ["Google Drive Picker không mở", "OAuth, API key, API chưa bật hoặc popup bị chặn", "Kiểm tra Credentials và Enabled APIs", "Thử cửa sổ ẩn danh"],
  ["Messenger gửi thất bại", "Token Page, liên kết PSID, cửa sổ 24h hoặc Meta policy", "Xem Worker logs và mã lỗi công khai", "Không log Page Access Token"],
  ["Build sai cấu hình", ".env.real thiếu/sai giá trị", "Kiểm tra build mode real và biến VITE_*", "Xóa dist và build lại nếu cần"],
  ["Dữ liệu production bị ảnh hưởng khi test", "VITE_USE_EMULATORS chưa bật", "Dừng app, bật emulator và dùng demo-edumatrix", "Không chạy seed --reset vào project thật"],
];
const incidents = makeSheet("Xử lý sự cố",
  ["Triệu chứng", "Nguyên nhân thường gặp", "Cách xử lý", "Không nên làm"],
  incidentRows, [35, 55, 65, 50], "IncidentGuideTable");
incidents.getRange(`A2:A${incidentRows.length + 1}`).format.font = { bold: true, color: C.blue };

const summary = wb.worksheets.add("Tổng quan");
summary.mergeCells("A1:F2");
summary.getRange("A1").values = [["EDUMATRIX — SỔ TAY CẤU TRÚC & TRIỂN KHAI"]];
summary.getRange("A1:F2").format = {
  fill: C.navy, font: { bold: true, color: "#FFFFFF", size: 19 },
  verticalAlignment: "center",
};
summary.mergeCells("A3:F3");
summary.getRange("A3").values = [["Tài liệu bàn giao: kiến trúc, hướng dẫn sử dụng, dữ liệu, cấu hình, triển khai và vận hành"]];
summary.getRange("A3:F3").format = { fill: C.cyan, font: { italic: true, color: C.muted }, rowHeight: 28 };
summary.getRange("A5:F5").values = [["Kiến trúc", "Module", "Nhóm dữ liệu", "Biến môi trường", "Bước deploy", "Tình huống sự cố"]];
summary.getRange("A5:F5").format = { fill: C.blue, font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", rowHeight: 30 };
summary.getRange("A6").formulas = [[`=COUNTA('Kiến trúc hệ thống'!A2:A${architectureRows.length + 1})`]];
summary.getRange("B6").formulas = [[`=COUNTA('Module & sử dụng'!A2:A${moduleRows.length + 1})`]];
summary.getRange("C6").formulas = [[`=COUNTA('Cấu trúc dữ liệu'!A2:A${collectionGroups.length + 1})`]];
summary.getRange("D6").formulas = [[`=COUNTA('Biến môi trường'!A2:A${envRows.length + 1})`]];
summary.getRange("E6").formulas = [[`=COUNTA('Checklist triển khai'!A2:A${deployRows.length + 1})`]];
summary.getRange("F6").formulas = [[`=COUNTA('Xử lý sự cố'!A2:A${incidentRows.length + 1})`]];
summary.getRange("A6:F6").format = {
  font: { bold: true, color: C.blue, size: 18 }, horizontalAlignment: "center",
  rowHeight: 38, borders: { preset: "outside", style: "thin", color: C.line },
};
summary.mergeCells("A9:F9");
summary.getRange("A9").values = [["THỨ TỰ ĐỌC KHUYẾN NGHỊ"]];
summary.getRange("A9:F9").format = { fill: C.blue, font: { bold: true, color: "#FFFFFF" }, rowHeight: 28 };
const readOrder = [
  ["1", "Kiến trúc hệ thống", "Hiểu các thành phần và ranh giới bảo mật."],
  ["2", "Module & sử dụng", "Hiểu chức năng theo vai trò người dùng."],
  ["3", "Cấu trúc dữ liệu + Biến môi trường", "Hiểu dữ liệu, cấu hình và secrets."],
  ["4", "Checklist triển khai", "Dùng trực tiếp mỗi lần phát hành production."],
  ["5", "Kiểm thử & vận hành + Xử lý sự cố", "Theo dõi sau deploy và khôi phục khi lỗi."],
];
summary.getRange("A10:C14").values = readOrder;
summary.getRange("A10:A14").format = { fill: C.cyan, font: { bold: true, color: C.blue }, horizontalAlignment: "center" };
summary.getRange("B10:B14").format.font = { bold: true, color: C.text };
summary.getRange("A10:C14").format = { wrapText: true, rowHeight: 35, borders: { insideHorizontal: { style: "thin", color: C.line } } };
summary.mergeCells("A17:F18");
summary.getRange("A17").values = [["Nguyên tắc cốt lõi: frontend chỉ chứa khóa công khai; mọi secret chạy trong Cloudflare Worker; Firestore Rules deny-by-default; luôn test Rules và build trước khi deploy; theo dõi App Check Metrics trước khi bật Enforcement."]];
summary.getRange("A17:F18").format = {
  fill: C.amber, font: { bold: true, color: "#704A00" }, wrapText: true,
  verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: "#E4C45E" },
};
summary.getRange("A:F").format.columnWidth = 25;
summary.getRange("C:C").format.columnWidth = 55;
summary.showGridLines = false;

const renderTargets = [
  ["Tổng quan", "A1:F18"], ["Kiến trúc hệ thống", `A1:F${architectureRows.length + 1}`],
  ["Cấu trúc thư mục", `A1:D${folderRows.length + 1}`], ["Module & sử dụng", `A1:E${moduleRows.length + 1}`],
  ["Vai trò & quyền", `A1:E${roleRows.length + 1}`], ["Cấu trúc dữ liệu", `A1:E${collectionGroups.length + 1}`],
  ["Biến môi trường", `A1:F${envRows.length + 1}`], ["Checklist triển khai", `A1:F${deployRows.length + 1}`],
  ["Kiểm thử & vận hành", `A1:E${opsRows.length + 1}`], ["Xử lý sự cố", `A1:D${incidentRows.length + 1}`],
];
for (let i = 0; i < renderTargets.length; i++) {
  const [sheetName, range] = renderTargets[i];
  const p = await wb.render({ sheetName, range, scale: i === 0 ? 1.3 : 0.85, format: "png" });
  await fs.writeFile(`${outputDir}/preview-${String(i + 1).padStart(2, "0")}.png`, new Uint8Array(await p.arrayBuffer()));
}

console.log((await wb.inspect({
  kind: "table", range: "Tổng quan!A1:F18", include: "values,formulas",
  tableMaxRows: 20, tableMaxCols: 8,
})).ndjson);
console.log((await wb.inspect({
  kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 200 }, summary: "final formula error scan",
})).ndjson);

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(`${outputDir}/Edumatrix_So_tay_Cau_truc_Huong_dan_Trien_khai.xlsx`);
