import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/api-links-edumatrix";
await fs.mkdir(outputDir, { recursive: true });

const wb = Workbook.create();
const summary = wb.worksheets.add("Tổng quan");
const api = wb.worksheets.add("Danh sách API");
const domain = wb.worksheets.add("Checklist tên miền");

const navy = "#12324A";
const blue = "#0B6E99";
const paleBlue = "#EAF5FA";
const paleGreen = "#EAF7F0";
const paleAmber = "#FFF4D6";
const line = "#D7E2E8";
const text = "#18313F";
const muted = "#5D7480";

const rows = [
  ["Firebase", "Firebase Console – dự án Edumatrix", "Quản trị tổng thể dự án Firebase", "https://console.firebase.google.com/project/edumatrix-vn-576b1/overview", "edumatrix-vn-576b1", "Đang dùng", "Chọn đúng project trước khi thay đổi cấu hình.", "https://firebase.google.com/docs"],
  ["Firebase Hosting", "Custom domains", "Tên miền, DNS và chứng chỉ SSL", "https://console.firebase.google.com/project/edumatrix-vn-576b1/hosting/main", "edumatrix.id.vn", "Đã cấu hình", "Theo dõi trạng thái HOST_ACTIVE và CERT_ACTIVE.", "https://firebase.google.com/docs/hosting/custom-domain"],
  ["Firebase Authentication", "Authorized domains", "Cho phép đăng nhập từ domain production", "https://console.firebase.google.com/project/edumatrix-vn-576b1/authentication/settings", "edumatrix.id.vn", "Đã cấu hình", "Chỉ nhập hostname, không nhập https:// hoặc đường dẫn.", "https://firebase.google.com/docs/auth/web/google-signin"],
  ["Cloud Firestore", "Firestore Database", "Dữ liệu nghiệp vụ của hệ thống", "https://console.firebase.google.com/project/edumatrix-vn-576b1/firestore", "(default)", "Đang dùng", "Quản lý dữ liệu, indexes và theo dõi sử dụng.", "https://firebase.google.com/docs/firestore"],
  ["Cloud Firestore", "Security Rules", "Phân quyền và kiểm tra dữ liệu", "https://console.firebase.google.com/project/edumatrix-vn-576b1/firestore/rules", "firebase/firestore.rules", "Đang dùng", "Ưu tiên deploy rules từ source code để tránh lệch cấu hình.", "https://firebase.google.com/docs/firestore/security/get-started"],
  ["Firebase App Check", "App Check", "Bảo vệ request Firebase từ frontend", "https://console.firebase.google.com/project/edumatrix-vn-576b1/appcheck", "Web app 1:87387037612:web:a989627388655e1c8aa409", "Chờ bật production", "Điền VITE_APPCHECK_SITE_KEY, deploy, theo dõi Metrics rồi mới Enforce.", "https://firebase.google.com/docs/app-check/web/recaptcha-provider"],
  ["Google reCAPTCHA", "reCAPTCHA Admin Console", "Quản lý reCAPTCHA v3 site key và domain", "https://www.google.com/recaptcha/admin", "edumatrix.id.vn", "Cần xác nhận", "Không đưa Secret key vào frontend; chỉ Site key được dùng trong .env.real.", "https://developers.google.com/recaptcha/docs/v3"],
  ["Google Cloud", "Credentials", "Quản lý OAuth Client và API key", "https://console.cloud.google.com/apis/credentials?project=598498866434", "Project number 598498866434", "Đã cấu hình", "Kiểm tra đúng Google Cloud project trước khi sửa.", "https://cloud.google.com/docs/authentication/api-keys"],
  ["Google OAuth", "OAuth 2.0 Client ID", "Cấp quyền Google Drive cho người dùng", "https://console.cloud.google.com/apis/credentials?project=598498866434", "Authorized JavaScript origin: https://edumatrix.id.vn", "Cần xác nhận thực tế", "Thử đăng nhập Google và mở Google Drive Picker trên domain production.", "https://developers.google.com/identity/oauth2/web/guides/overview"],
  ["Google APIs", "Enabled APIs & services", "Bật Google Drive API và Google Picker API", "https://console.cloud.google.com/apis/dashboard?project=598498866434", "drive.googleapis.com; picker.googleapis.com", "Đã cấu hình", "Không tắt hai API này khi dọn project.", "https://console.cloud.google.com/apis/library"],
  ["Google API Key", "EduMatrix Production Picker Key", "Giới hạn API key theo website", "https://console.cloud.google.com/apis/credentials?project=598498866434", "https://edumatrix.id.vn; https://edumatrix.id.vn/*", "Đã cấu hình", "Giữ cả Firebase domains và localhost phục vụ phát triển.", "https://cloud.google.com/docs/authentication/api-keys"],
  ["Cloudflare", "Workers & Pages", "Quản trị Messenger Worker production", "https://dash.cloudflare.com/", "edumatrix-messenger-production", "Đã cấu hình", "ALLOWED_ORIGIN phải chứa domain Firebase cũ và edumatrix.id.vn.", "https://developers.cloudflare.com/workers/"],
  ["Meta", "Meta for Developers – Apps", "Quản lý Messenger Platform, Page token và webhook", "https://developers.facebook.com/apps/", "Webhook Worker: /webhook", "Đang dùng", "Không lưu Page Access Token hoặc App Secret trong frontend.", "https://developers.facebook.com/docs/messenger-platform/"],
  ["VietQR", "VietQR API", "Danh sách ngân hàng và tạo mã QR thanh toán", "https://api.vietqr.io/", "api.vietqr.io; img.vietqr.io", "Đang dùng", "API công khai; không cần thêm domain vào allowlist hiện tại.", "https://www.vietqr.io/danh-sach-api"],
  ["Open-Meteo", "Weather Forecast API", "Dữ liệu thời tiết trên dashboard", "https://open-meteo.com/en/docs", "api.open-meteo.com/v1/forecast", "Đang dùng", "API công khai; theo dõi điều khoản sử dụng nếu tăng lưu lượng.", "https://open-meteo.com/en/docs"],
];

api.getRange("A1:H1").values = [[
  "Nhóm", "Trang cấu hình", "Mục đích", "Đường link", "Giá trị / phạm vi", "Trạng thái", "Lưu ý vận hành", "Tài liệu chính thức"
]];
api.getRange(`A2:H${rows.length + 1}`).values = rows;
api.getRange("A1:H1").format = {
  fill: navy,
  font: { bold: true, color: "#FFFFFF" },
  rowHeight: 32,
  verticalAlignment: "center",
};
api.getRange(`A2:H${rows.length + 1}`).format = {
  font: { color: text, size: 10 },
  verticalAlignment: "top",
  wrapText: true,
  borders: { insideHorizontal: { style: "thin", color: line } },
};
api.getRange(`A2:A${rows.length + 1}`).format.font = { bold: true, color: blue };
api.getRange(`D2:D${rows.length + 1}`).format.font = { color: blue, underline: true };
api.getRange(`H2:H${rows.length + 1}`).format.font = { color: blue, underline: true };
api.getRange(`F2:F${rows.length + 1}`).dataValidation = {
  rule: { type: "list", values: ["Đã cấu hình", "Đang dùng", "Cần xác nhận", "Cần xác nhận thực tế", "Chờ bật production", "Chưa cấu hình"] }
};
api.getRange(`F2:F${rows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Đã cấu hình", format: { fill: paleGreen, font: { color: "#18734B", bold: true } }
});
api.getRange(`F2:F${rows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Cần", format: { fill: paleAmber, font: { color: "#8A5A00", bold: true } }
});
api.getRange(`F2:F${rows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Chờ", format: { fill: paleAmber, font: { color: "#8A5A00", bold: true } }
});
api.freezePanes.freezeRows(1);
api.freezePanes.freezeColumns(2);
api.showGridLines = false;
api.getRange("A:A").format.columnWidth = 18;
api.getRange("B:B").format.columnWidth = 27;
api.getRange("C:C").format.columnWidth = 34;
api.getRange("D:D").format.columnWidth = 54;
api.getRange("E:E").format.columnWidth = 43;
api.getRange("F:F").format.columnWidth = 22;
api.getRange("G:G").format.columnWidth = 48;
api.getRange("H:H").format.columnWidth = 48;
api.getRange(`A2:H${rows.length + 1}`).format.rowHeight = 52;
api.tables.add(`A1:H${rows.length + 1}`, true, "ApiLinksTable");

const domainRows = [
  ["Firebase Hosting", "Custom domain", "edumatrix.id.vn", "Đã cấu hình", "Firebase Console → Hosting"],
  ["Firebase Authentication", "Authorized domain", "edumatrix.id.vn", "Đã cấu hình", "Firebase Console → Authentication → Settings"],
  ["Google OAuth", "Authorized JavaScript origin", "https://edumatrix.id.vn", "Cần xác nhận thực tế", "Google Cloud → Credentials → OAuth Client"],
  ["Google Picker API key", "Website restriction", "https://edumatrix.id.vn", "Đã cấu hình", "Google Cloud → Credentials → API key"],
  ["Google Picker API key", "Website restriction wildcard", "https://edumatrix.id.vn/*", "Đã cấu hình", "Google Cloud → Credentials → API key"],
  ["Cloudflare Worker", "ALLOWED_ORIGIN", "https://edumatrix-vn-576b1.web.app,https://edumatrix.id.vn", "Đã cấu hình", "workers/messenger/wrangler.jsonc"],
  ["reCAPTCHA v3", "Allowed domain", "edumatrix.id.vn", "Cần xác nhận", "reCAPTCHA Admin Console → Settings"],
  ["Firebase App Check", "Frontend site key", "VITE_APPCHECK_SITE_KEY=<site key>", "Chờ bật production", ".env.real"],
];
domain.getRange("A1:E1").values = [["Dịch vụ", "Trường cấu hình", "Giá trị cần có", "Trạng thái", "Vị trí"]];
domain.getRange(`A2:E${domainRows.length + 1}`).values = domainRows;
domain.getRange("A1:E1").format = { fill: navy, font: { bold: true, color: "#FFFFFF" }, rowHeight: 32 };
domain.getRange(`A2:E${domainRows.length + 1}`).format = {
  font: { color: text, size: 10 },
  wrapText: true,
  verticalAlignment: "top",
  borders: { insideHorizontal: { style: "thin", color: line } },
  rowHeight: 46,
};
domain.getRange(`D2:D${domainRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Đã cấu hình", format: { fill: paleGreen, font: { color: "#18734B", bold: true } }
});
domain.getRange(`D2:D${domainRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Cần", format: { fill: paleAmber, font: { color: "#8A5A00", bold: true } }
});
domain.getRange(`D2:D${domainRows.length + 1}`).conditionalFormats.add("containsText", {
  text: "Chờ", format: { fill: paleAmber, font: { color: "#8A5A00", bold: true } }
});
domain.freezePanes.freezeRows(1);
domain.showGridLines = false;
domain.getRange("A:A").format.columnWidth = 27;
domain.getRange("B:B").format.columnWidth = 31;
domain.getRange("C:C").format.columnWidth = 62;
domain.getRange("D:D").format.columnWidth = 23;
domain.getRange("E:E").format.columnWidth = 47;
domain.tables.add(`A1:E${domainRows.length + 1}`, true, "DomainChecklistTable");

summary.mergeCells("A1:F2");
summary.getRange("A1").values = [["EDUMATRIX — DANH MỤC CÀI ĐẶT API"]];
summary.getRange("A1:F2").format = {
  fill: navy,
  font: { bold: true, color: "#FFFFFF", size: 20 },
  horizontalAlignment: "left",
  verticalAlignment: "center",
};
summary.mergeCells("A3:F3");
summary.getRange("A3").values = [["Tổng hợp đường dẫn quản trị, tài liệu chính thức và checklist khi thay đổi tên miền"]];
summary.getRange("A3:F3").format = { fill: paleBlue, font: { color: muted, italic: true }, rowHeight: 30 };

summary.getRange("A5:B5").values = [["Tổng tích hợp", "Đã cấu hình"]];
summary.getRange("D5:E5").values = [["Cần xác nhận", "Chờ bật production"]];
summary.getRange("A6").formulas = [[`=COUNTA('Danh sách API'!A2:A${rows.length + 1})`]];
summary.getRange("B6").formulas = [[`=COUNTIF('Danh sách API'!F2:F${rows.length + 1},"Đã cấu hình")`]];
summary.getRange("D6").formulas = [[`=COUNTIF('Danh sách API'!F2:F${rows.length + 1},"Cần xác nhận")+COUNTIF('Danh sách API'!F2:F${rows.length + 1},"Cần xác nhận thực tế")`]];
summary.getRange("E6").formulas = [[`=COUNTIF('Danh sách API'!F2:F${rows.length + 1},"Chờ bật production")`]];
for (const r of ["A5:B6", "D5:E6"]) {
  summary.getRange(r).format = {
    fill: "#FFFFFF",
    font: { color: text, bold: true },
    borders: { preset: "outside", style: "thin", color: line },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
}
summary.getRange("A5:B5").format.fill = paleBlue;
summary.getRange("D5:E5").format.fill = paleAmber;
summary.getRange("A6:B6").format = { font: { bold: true, color: blue, size: 18 }, rowHeight: 36, horizontalAlignment: "center" };
summary.getRange("D6:E6").format = { font: { bold: true, color: "#8A5A00", size: 18 }, rowHeight: 36, horizontalAlignment: "center" };

summary.getRange("A9:F9").values = [["QUY TRÌNH KHI THÊM TÊN MIỀN MỚI", "", "", "", "", ""]];
summary.mergeCells("A9:F9");
summary.getRange("A9:F9").format = { fill: blue, font: { bold: true, color: "#FFFFFF" }, rowHeight: 28 };
const steps = [
  ["1", "Firebase Hosting", "Thêm custom domain, hoàn tất DNS và SSL."],
  ["2", "Firebase Authentication", "Thêm hostname vào Authorized domains."],
  ["3", "Google OAuth + Picker API key", "Thêm JavaScript origin và HTTP referrer."],
  ["4", "Cloudflare Worker", "Thêm origin vào ALLOWED_ORIGIN rồi deploy production."],
  ["5", "reCAPTCHA + App Check", "Thêm domain, điền site key, deploy và theo dõi Metrics trước khi Enforce."],
];
summary.getRange("A10:C14").values = steps;
summary.getRange("A10:A14").format = { fill: paleBlue, font: { bold: true, color: blue }, horizontalAlignment: "center" };
summary.getRange("B10:B14").format.font = { bold: true, color: text };
summary.getRange("A10:C14").format.wrapText = true;
summary.getRange("A10:C14").format.rowHeight = 34;
summary.getRange("A10:C14").format.borders = { insideHorizontal: { style: "thin", color: line } };

summary.mergeCells("A17:F18");
summary.getRange("A17").values = [["Bảo mật: Site key và Firebase Web API key là khóa công khai. Secret key, Page Access Token, App Secret và service-account private key tuyệt đối không đưa vào frontend hoặc bảng tính này."]];
summary.getRange("A17:F18").format = {
  fill: paleAmber,
  font: { color: "#704A00", bold: true },
  wrapText: true,
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: "#E7C96A" },
};
summary.showGridLines = false;
summary.getRange("A:A").format.columnWidth = 9;
summary.getRange("B:B").format.columnWidth = 26;
summary.getRange("C:C").format.columnWidth = 55;
summary.getRange("D:F").format.columnWidth = 20;

const preview1 = await wb.render({ sheetName: "Tổng quan", autoCrop: "all", scale: 1.4, format: "png" });
await fs.writeFile(`${outputDir}/preview-summary.png`, new Uint8Array(await preview1.arrayBuffer()));
const preview2 = await wb.render({ sheetName: "Danh sách API", range: `A1:H${rows.length + 1}`, scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/preview-api.png`, new Uint8Array(await preview2.arrayBuffer()));
const preview3 = await wb.render({ sheetName: "Checklist tên miền", range: `A1:E${domainRows.length + 1}`, scale: 1.2, format: "png" });
await fs.writeFile(`${outputDir}/preview-domain.png`, new Uint8Array(await preview3.arrayBuffer()));

console.log((await wb.inspect({ kind: "table", range: "Tổng quan!A1:F18", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 8 })).ndjson);
console.log((await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula errors" })).ndjson);

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(`${outputDir}/Edumatrix_Danh_muc_API_va_Link_cai_dat.xlsx`);
