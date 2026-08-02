import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Filter,
  GraduationCap,
  Link2,
  MailPlus,
  Maximize2,
  MessageSquareText,
  Plus,
  ReceiptText,
  School,
  Search,
  SlidersHorizontal,
  UserCog,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ClassFormPopupDemo } from "@/features/demo/components/ClassFormPopupDemo";

type DemoSize = "compact" | "standard" | "wide" | "workspace" | "fullscreen";
type FieldType = "text" | "email" | "url" | "number" | "date" | "datetime-local" | "time" | "select" | "textarea" | "chips" | "file" | "checklist";

interface DemoField {
  label: string;
  type?: FieldType;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  readOnly?: boolean;
  wide?: boolean;
  options?: string[];
}

interface DemoSection {
  title: string;
  description?: string;
  fields: DemoField[];
}

interface PopupDemo {
  id: string;
  title: string;
  description: string;
  group: "Học vụ" | "Tài chính" | "Liên lạc" | "Quản trị";
  size: DemoSize;
  icon: LucideIcon;
  sections: DemoSection[];
  primaryAction: string;
  secondaryAction?: string;
}

const FIELD_CLASS = "min-h-11 w-full rounded-[10px] border border-neutral-300 bg-white px-3 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100";
const SIZE_LABELS: Record<DemoSize, string> = {
  compact: "720 px",
  standard: "1.080 px",
  wide: "1.440 px",
  workspace: "1.760 px",
  fullscreen: "1.920 × 980",
};
const APPROVED_DEMO_IDS = new Set(["lesson-plan", "class"]);

function getDemoSize(demo: PopupDemo): DemoSize {
  return APPROVED_DEMO_IDS.has(demo.id) ? demo.size : "workspace";
}

const POPUP_DEMOS: PopupDemo[] = [
  {
    id: "subject", title: "Tạo / sửa môn học", description: "Thông tin định danh môn học", group: "Học vụ", size: "standard", icon: BookOpenCheck, primaryAction: "Lưu môn học",
    sections: [{ title: "Thông tin môn học", fields: [
      { label: "Tên môn học", placeholder: "IELTS Speaking", required: true },
      { label: "Mã môn học", placeholder: "IELTS-SPK", required: true },
      { label: "Mô tả", type: "textarea", wide: true },
    ] }],
  },
  {
    id: "course", title: "Tạo / sửa khóa học", description: "Cấu hình học phí, thời lượng và nguồn lực", group: "Học vụ", size: "wide", icon: GraduationCap, primaryAction: "Lưu khóa học",
    sections: [
      { title: "Thông tin chung", fields: [
        { label: "Tên khóa học", placeholder: "IELTS Foundation", required: true },
        { label: "Trạng thái", type: "select", options: ["Nháp", "Đang mở", "Đã kết thúc"] },
        { label: "Môn học", type: "chips", wide: true, required: true },
        { label: "Giáo viên phụ trách", type: "chips", wide: true },
      ] },
      { title: "Học phí và thời gian", fields: [
        { label: "Học phí", type: "number", required: true }, { label: "Tổng số buổi", type: "number", required: true },
        { label: "Ngày bắt đầu", type: "date" }, { label: "Ngày kết thúc", type: "date" },
      ] },
    ],
  },
  {
    id: "class", title: "Tạo / sửa lớp học", description: "Form ngang cố định với lịch tháng tương tác", group: "Học vụ", size: "fullscreen", icon: School, primaryAction: "Lưu lớp học",
    sections: [
      { title: "Thông tin lớp", fields: [
        { label: "Tên lớp", placeholder: "HN53 Essentials", required: true },
        { label: "Khóa học", type: "select", options: ["Chọn khóa học", "IELTS Foundation"] },
        { label: "Trạng thái", type: "select", options: ["Đang hoạt động", "Đã kết thúc", "Đã hủy"] },
        { label: "Môn học", type: "chips", wide: true }, { label: "Giáo viên phụ trách", type: "chips", wide: true },
      ] },
      { title: "Vận hành", fields: [
        { label: "Lịch học", placeholder: "Thứ 4 và Thứ 6, 18:00–19:30", wide: true },
        { label: "Địa điểm", placeholder: "Zoom / Phòng 201", wide: true },
      ] },
    ],
  },
  {
    id: "student", title: "Thêm / sửa học sinh", description: "Hồ sơ học sinh, phụ huynh và lớp học", group: "Học vụ", size: "wide", icon: UserPlus, primaryAction: "Lưu học sinh",
    sections: [
      { title: "Thông tin học sinh", fields: [
        { label: "Mã học sinh", placeholder: "HS001", required: true }, { label: "Tên học sinh", placeholder: "Nguyễn Minh Anh", required: true },
        { label: "Biệt danh / tên gọi khác", placeholder: "Bi" }, { label: "Ngày sinh", type: "date" },
        { label: "Ghi chú giáo viên/Admin", type: "textarea", wide: true },
      ] },
      { title: "Thông tin phụ huynh", fields: [
        { label: "Tên phụ huynh" }, { label: "Số điện thoại" }, { label: "Email liên kết", type: "email" },
        { label: "Link Facebook liên kết", type: "url" }, { label: "Địa chỉ", wide: true },
      ] },
      { title: "Ghi danh", fields: [{ label: "Lớp học", type: "select", options: ["Chưa đăng ký lớp", "Anh B", "Toán A"], wide: true }] },
    ],
  },
  {
    id: "student-profile", title: "Hồ sơ học sinh chi tiết", description: "Chỉnh hồ sơ nhưng giữ nguyên dữ liệu liên kết", group: "Học vụ", size: "workspace", icon: UsersRound, primaryAction: "Lưu thay đổi",
    sections: [
      { title: "Thông tin học sinh", fields: [
        { label: "Mã học sinh", readOnly: true }, { label: "Họ tên", required: true }, { label: "Ngày sinh", type: "date" }, { label: "Ngày bắt đầu", type: "date", readOnly: true },
      ] },
      { title: "Phụ huynh liên kết", description: "UID phụ huynh vẫn được hiển thị và không bị lược bỏ.", fields: [
        { label: "UID phụ huynh", readOnly: true, wide: true }, { label: "Tên phụ huynh" }, { label: "Số điện thoại" },
        { label: "Email liên kết", type: "email" }, { label: "Link Facebook liên kết", type: "url" }, { label: "Địa chỉ", wide: true },
      ] },
      { title: "Học tập và ghi chú", fields: [
        { label: "Lớp học / Khóa học / Giáo viên", readOnly: true, wide: true }, { label: "Ghi chú giáo viên/Admin", type: "textarea", wide: true },
      ] },
    ],
  },
  {
    id: "session-create", title: "Tạo lịch học", description: "Tạo một buổi hoặc lịch lặp theo tuần", group: "Học vụ", size: "wide", icon: CalendarDays, primaryAction: "Tạo lịch học",
    sections: [
      { title: "Lớp và nội dung", fields: [
        { label: "Lớp học", type: "select", options: ["Chọn lớp học", "Anh B"], required: true }, { label: "Tên buổi học", required: true },
        { label: "Kiểu lịch học", type: "chips", options: ["Một buổi", "Lặp hàng tuần"], wide: true },
      ] },
      { title: "Thời gian", fields: [
        { label: "Bắt đầu", type: "datetime-local", required: true }, { label: "Kết thúc", type: "datetime-local", required: true },
        { label: "Buổi gốc cần học bù", type: "select", options: ["Không phải buổi học bù", "Buổi 12"] },
        { label: "Bắt đầu tìm từ ngày", type: "date" }, { label: "Tổng số buổi", type: "number" },
        { label: "Các thứ trong tuần", type: "chips", options: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], wide: true },
        { label: "Giờ bắt đầu", type: "time" }, { label: "Giờ kết thúc", type: "time" },
      ] },
      { title: "Bổ sung", fields: [{ label: "Địa điểm" }, { label: "Ghi chú" }] },
    ],
  },
  {
    id: "session-edit", title: "Cập nhật buổi học", description: "Đổi thời gian và trạng thái buổi học", group: "Học vụ", size: "standard", icon: Clock3, primaryAction: "Lưu thay đổi",
    sections: [{ title: "Thông tin buổi học", fields: [
      { label: "Thời gian bắt đầu", type: "datetime-local", required: true },
      { label: "Trạng thái", type: "select", options: ["Đã lên lịch", "Đã đổi lịch", "Đã hủy", "Đã học"] },
    ] }],
  },
  {
    id: "assignment", title: "Tạo bài tập", description: "Giao bài và liên kết giáo án / buổi học", group: "Học vụ", size: "wide", icon: FileText, primaryAction: "Tạo bài tập",
    sections: [{ title: "Nội dung bài tập", fields: [
      { label: "Tên bài tập", required: true }, { label: "Lớp học", type: "select", options: ["Chọn lớp", "Anh B"], required: true },
      { label: "Môn học", type: "select", options: ["Chọn môn", "Tiếng Anh"], required: true }, { label: "Hạn nộp", type: "datetime-local", required: true },
      { label: "Điểm tối đa", type: "number" }, { label: "Trạng thái", type: "select", options: ["Giao ngay", "Lưu nháp"] },
      { label: "Yêu cầu bài tập", type: "textarea", wide: true },
      { label: "Giáo án liên kết", type: "select", options: ["Không gắn giáo án", "Unit 5"] },
      { label: "Buổi học liên kết", type: "select", options: ["Không gắn buổi học", "Buổi 12"] },
    ] }],
  },
  {
    id: "leave", title: "Đăng ký nghỉ học", description: "Chọn đúng học sinh, lớp và buổi học", group: "Học vụ", size: "standard", icon: CalendarDays, primaryAction: "Đăng ký nghỉ",
    sections: [{ title: "Thông tin nghỉ học", fields: [
      { label: "Học sinh", type: "select", options: ["Chọn học sinh", "Nguyễn Minh Anh"], required: true },
      { label: "Lớp học", type: "select", options: ["Chọn lớp học", "Anh B"], required: true },
      { label: "Buổi học sắp tới", type: "select", options: ["Chọn buổi học", "Thứ 5, 18:00"], required: true },
      { label: "Trạng thái báo trước", type: "chips", options: ["Có phép", "Không phép"], wide: true },
      { label: "Lý do / ghi chú", type: "textarea", placeholder: "VD: Xin nghỉ vì ốm, có giấy bác sĩ", wide: true },
    ] }],
  },
  {
    id: "invoice", title: "Tạo hóa đơn học phí", description: "Phát hành khoản thu với thông tin ngân hàng", group: "Tài chính", size: "wide", icon: ReceiptText, primaryAction: "Phát hành hóa đơn",
    sections: [
      { title: "Khoản thu", fields: [
        { label: "Học sinh", type: "select", options: ["Chọn học sinh", "Nguyễn Minh Anh"], required: true },
        { label: "Lớp học", type: "select", options: ["Không gắn lớp, nhập tay", "Anh B"] }, { label: "Nội dung thu", required: true },
        { label: "Số buổi", type: "number", required: true }, { label: "Số tiền", type: "number", required: true }, { label: "Hạn thanh toán", type: "date", required: true },
      ] },
      { title: "Tài khoản nhận", fields: [
        { label: "Số tài khoản", readOnly: true, required: true }, { label: "Tên tài khoản", readOnly: true }, { label: "Mã ngân hàng", readOnly: true },
      ] },
    ],
  },
  {
    id: "payment", title: "Báo đã thanh toán", description: "Gửi mã giao dịch để Admin đối soát", group: "Tài chính", size: "compact", icon: CircleDollarSign, primaryAction: "Gửi xác nhận",
    sections: [{ title: "Thông tin thanh toán", fields: [{ label: "Mã giao dịch", placeholder: "Mã giao dịch (tùy chọn)", wide: true }] }],
  },
  {
    id: "message", title: "Tin nhắn mới", description: "Chọn người nhận, chủ đề và chính sách gửi", group: "Liên lạc", size: "workspace", icon: MessageSquareText, primaryAction: "Gửi tin nhắn",
    sections: [
      { title: "Người nhận", fields: [
        { label: "Tìm học sinh", placeholder: "Tìm tên hoặc mã học sinh" }, { label: "Học sinh", type: "select", options: ["Chọn học sinh", "Nguyễn Minh Anh · HS001"] },
      ] },
      { title: "Nội dung", fields: [
        { label: "Chủ đề", type: "select", options: ["Thông báo lớp học", "Nhắc học phí", "Kết quả học tập"] },
        { label: "Chính sách gửi", type: "select", options: ["Phản hồi trong cửa sổ 24 giờ", "Cập nhật tài khoản", "Mẫu tiện ích"] },
        { label: "Mẫu tiện ích", type: "select", options: ["Chọn mẫu", "Nhắc lịch học"] },
        { label: "Message Tag", placeholder: "ACCOUNT_UPDATE" },
        { label: "Nội dung tin nhắn", type: "textarea", placeholder: "Nhập nội dung tin nhắn...", wide: true },
        { label: "Liên kết Messenger phụ huynh", readOnly: true, wide: true },
      ] },
    ],
  },
  {
    id: "meta", title: "Kết nối Facebook Page", description: "Luồng chọn Page, xác thực và hoàn tất", group: "Liên lạc", size: "standard", icon: Link2, primaryAction: "Kết nối Page",
    sections: [
      { title: "Tài khoản Meta", fields: [{ label: "Trạng thái đăng nhập", readOnly: true }, { label: "Facebook Page", type: "select", options: ["Chọn Page", "EduMatrix Vietnam"], required: true }] },
      { title: "Quyền truy cập", description: "Giữ nguyên bước xác thực và kiểm tra quyền trước khi kết nối.", fields: [{ label: "Page ID", readOnly: true }, { label: "Webhook / quyền nhắn tin", readOnly: true }] },
    ],
  },
  {
    id: "invite", title: "Mời tài khoản", description: "Cấp vai trò và liên kết học sinh", group: "Quản trị", size: "wide", icon: MailPlus, primaryAction: "Gửi lời mời",
    sections: [
      { title: "Thông tin lời mời", fields: [
        { label: "Email đăng nhập", type: "email", placeholder: "nguoidung@gmail.com", required: true },
        { label: "Vai trò", type: "select", options: ["Phụ huynh/Học sinh", "Giáo viên", "Admin"], required: true },
        { label: "Học sinh được liên kết", type: "checklist", wide: true },
      ] },
      { title: "Kiểm tra trước khi gửi", description: "Chuẩn hóa email, giới hạn vai trò và yêu cầu xác minh.", fields: [] },
    ],
  },
  {
    id: "staff", title: "Chỉnh sửa tài khoản Staff", description: "Cập nhật tên, vai trò và trạng thái", group: "Quản trị", size: "standard", icon: UserCog, primaryAction: "Lưu thay đổi",
    sections: [{ title: "Thông tin tài khoản", fields: [
      { label: "Tên tài khoản", required: true }, { label: "Email đăng nhập", type: "email", readOnly: true, wide: true },
      { label: "Vai trò", type: "select", options: ["Admin", "Giáo viên"] }, { label: "Trạng thái", type: "select", options: ["Đang hoạt động", "Đã khóa"] },
    ] }],
  },
  {
    id: "time-filter", title: "Bộ lọc thời gian", description: "Popup tiện ích cho khoảng ngày tùy chọn", group: "Quản trị", size: "compact", icon: Filter, primaryAction: "Áp dụng",
    sections: [{ title: "Khoảng thời gian", fields: [
      { label: "Từ ngày", type: "date", required: true }, { label: "Đến ngày", type: "date", required: true },
      { label: "Khoảng nhanh", type: "chips", options: ["7 ngày", "30 ngày", "Tháng này"], wide: true },
    ] }],
  },
];

function DemoFieldControl({ field, fieldId }: { field: DemoField; fieldId: string }) {
  const common = { id: fieldId, className: FIELD_CLASS, disabled: field.readOnly, "aria-describedby": field.helper ? `${fieldId}-help` : undefined };
  if (field.type === "textarea") return <textarea {...common} rows={4} placeholder={field.placeholder} className={`${FIELD_CLASS} min-h-28 resize-y py-3`} />;
  if (field.type === "select") return <select {...common} defaultValue=""><option value="" disabled>Vui lòng chọn</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>;
  if (field.type === "chips") return <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-[10px] border border-neutral-200 bg-neutral-50 p-2" role="group" aria-label={field.label}>{(field.options ?? ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C"]).map((option, index) => <button key={option} type="button" className={`min-h-8 rounded-lg border px-3 text-xs font-semibold transition ${index === 0 ? "border-primary-200 bg-primary-50 text-primary-700" : "border-neutral-200 bg-white text-neutral-600 hover:border-primary-200"}`}>{option}</button>)}</div>;
  if (field.type === "checklist") return <div className="grid gap-2 rounded-[10px] border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-2">{["Nguyễn Minh Anh · HS001", "Trần Gia Hân · HS002", "Lê Minh Khang · HS003"].map((item, index) => <label key={item} className="flex min-h-10 items-center gap-3 rounded-lg bg-white px-3 text-sm text-neutral-700"><input type="checkbox" defaultChecked={index === 0} />{item}</label>)}</div>;
  if (field.type === "file") return <input {...common} type="file" />;
  return <input {...common} type={field.type ?? "text"} placeholder={field.placeholder} defaultValue={field.readOnly ? "Dữ liệu hiện tại được giữ nguyên" : undefined} />;
}

function StandardDemoForm({ demo, onClose }: { demo: PopupDemo; onClose: () => void }) {
  const formId = useId();
  const singleSection = demo.sections.length === 1;
  return (
    <form onSubmit={(event) => { event.preventDefault(); onClose(); }} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50/70 p-4 sm:p-6">
        <div className={`mx-auto flex w-full flex-col gap-4 xl:flex-row ${singleSection ? "max-w-[1280px]" : ""}`}>
          {demo.sections.map((section) => (
            <section key={section.title} className="min-w-0 flex-1 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-neutral-900">{section.title}</h3>
                {section.description && <p className="mt-1 text-xs leading-5 text-neutral-500">{section.description}</p>}
              </div>
              <div className={`grid gap-4 md:grid-cols-2 ${singleSection ? "xl:grid-cols-3" : ""}`}>
                {section.fields.map((field, index) => {
                  const fieldId = `${formId}-${index}-${field.label.replace(/\s+/g, "-")}`;
                  return (
                    <div key={`${field.label}-${index}`} className={field.wide ? "md:col-span-2" : undefined}>
                      <label htmlFor={fieldId} className="mb-1.5 block text-xs font-bold text-neutral-700">{field.label}{field.required && <span className="ml-0.5 text-danger-500">*</span>}</label>
                      <DemoFieldControl field={field} fieldId={fieldId} />
                      {field.helper && <p id={`${fieldId}-help`} className="mt-1.5 text-xs text-neutral-500">{field.helper}</p>}
                    </div>
                  );
                })}
                {section.fields.length === 0 && <div className="md:col-span-2 rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm leading-6 text-primary-800">Các bước kiểm tra nghiệp vụ hiện có vẫn được giữ nguyên trong giao diện triển khai.</div>}
              </div>
            </section>
          ))}
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <p className="text-xs text-neutral-500"><span className="font-bold text-neutral-700">Demo UI</span> · Không ghi dữ liệu thật</p>
        <div className="flex gap-2">
          {demo.secondaryAction && <Button type="button">{demo.secondaryAction}</Button>}
          <Button type="button" onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="primary">{demo.primaryAction}</Button>
        </div>
      </footer>
    </form>
  );
}

function LessonPlanDemo({ onClose }: { onClose: () => void }) {
  const section = (title: string, children: ReactNode) => <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><h3 className="mb-4 text-sm font-bold text-neutral-900">{title}</h3>{children}</section>;
  const field = (label: string, type: FieldType = "text") => <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}</span>{type === "textarea" ? <textarea rows={3} className={`${FIELD_CLASS} resize-y py-3`} /> : <input type={type} className={FIELD_CLASS} />}</label>;
  return (
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); onClose(); }} className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 bg-neutral-50/70 lg:grid-cols-[minmax(360px,400px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(380px,420px)_minmax(0,1fr)]">
        <div className="space-y-4 overflow-y-auto border-b border-neutral-200 p-4 sm:p-6 xl:border-b-0 xl:border-r">
          {section("Thông tin chung", <div className="grid gap-4 sm:grid-cols-2">{field("Tên giáo án")}<label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">Lớp học</span><select className={FIELD_CLASS}><option>-- Chọn lớp --</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">Trạng thái</span><select className={FIELD_CLASS}><option>Bản nháp</option><option>Xuất bản</option><option>Lưu trữ</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">Buổi học</span><select className={FIELD_CLASS}><option>-- Chọn buổi học --</option></select></label></div>)}
          {section("Mục tiêu bài học", <div className="space-y-4">{field("Kiến thức", "textarea")}{field("Kỹ năng", "textarea")}{field("Thái độ / Năng lực", "textarea")}</div>)}
          {section("Chuẩn bị", <div className="grid gap-4 sm:grid-cols-2">{field("Giáo viên", "textarea")}{field("Học sinh", "textarea")}</div>)}
          {section("Tài liệu đính kèm", <div className="space-y-4"><div className="flex flex-wrap gap-2"><Button size="sm">Chọn từ Drive</Button><Button size="sm">Tải tệp mới</Button></div>{field("Tên hiển thị")}{field("Liên kết HTTPS", "url")}</div>)}
        </div>
        <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
          {section("Thư viện mẫu", <div className="flex gap-3 overflow-x-auto pb-1">{["IELTS Reading", "Speaking Practice", "Ôn tập cuối kỳ"].map((item) => <button key={item} type="button" className="min-w-52 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-left text-sm font-semibold text-neutral-700 hover:border-primary-300">{item}<span className="mt-1 block text-xs font-normal text-neutral-500">3 hoạt động</span></button>)}</div>)}
          {section("Tiến trình hoạt động", <div className="space-y-3">{["Khởi động", "Nội dung chính", "Luyện tập"].map((item, index) => <article key={item} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]"><input aria-label={`Tên hoạt động ${index + 1}`} defaultValue={item} className={FIELD_CLASS} /><input aria-label={`Thời gian hoạt động ${index + 1}`} type="number" defaultValue={index === 1 ? 45 : 15} className={FIELD_CLASS} /><Button size="sm" variant="ghost">Xóa</Button></div><div className="mt-3 grid gap-3 sm:grid-cols-2">{field("Nội dung", "textarea")}{field("Kết quả mong đợi", "textarea")}</div></article>)}<Button icon={<Plus size={15} />}>Thêm hoạt động</Button></div>)}
          {section("Bài tập về nhà & ghi chú", <div className="grid gap-4 sm:grid-cols-2">{field("Bài tập về nhà", "textarea")}{field("Ghi chú sau buổi dạy", "textarea")}</div>)}
          {section("Tóm tắt công khai", field("Phụ huynh xem khi giáo án được xuất bản", "textarea"))}
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <p className="text-xs text-neutral-500"><strong className="text-neutral-700">Khung 1.920 × 980</strong> · co an toàn theo viewport nhỏ hơn</p>
        <div className="flex flex-wrap justify-end gap-2"><Button>Lưu thành mẫu</Button><Button onClick={onClose}>Hủy</Button><Button type="submit" variant="primary">Lưu giáo án</Button></div>
      </footer>
    </form>
  );
}

function DemoDialog({ demo, onClose }: { demo: PopupDemo | null; onClose: () => void }) {
  if (!demo) return null;
  const modalSize: Record<DemoSize, "sm" | "md" | "lg" | "xl" | "2xl"> = {
    compact: "sm", standard: "md", wide: "lg", workspace: "xl", fullscreen: "2xl",
  };
  const effectiveSize = getDemoSize(demo);
  return (
    <Modal open title={demo.title} description={`${demo.description} · ${SIZE_LABELS[effectiveSize]}`} size={modalSize[effectiveSize]} onClose={onClose} bodyClassName="flex flex-col p-0">
      {demo.id === "lesson-plan" ? <LessonPlanDemo onClose={onClose} /> : demo.id === "class" ? <ClassFormPopupDemo onClose={onClose} /> : <StandardDemoForm demo={demo} onClose={onClose} />}
    </Modal>
  );
}

const LESSON_PLAN_DEMO: PopupDemo = {
  id: "lesson-plan", title: "Thiết lập giáo án", description: "Không gian soạn thảo toàn màn hình", group: "Học vụ", size: "fullscreen", icon: Maximize2, sections: [], primaryAction: "Lưu giáo án", secondaryAction: "Lưu thành mẫu",
};

export default function FormPopupDemoPage() {
  const [active, setActive] = useState<PopupDemo | null>(null);
  const [query, setQuery] = useState("");
  const allDemos = useMemo(() => [LESSON_PLAN_DEMO, ...POPUP_DEMOS], []);
  const filtered = allDemos.filter((demo) => `${demo.title} ${demo.description} ${demo.group}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")));
  const fieldCount = allDemos.reduce((total, demo) => total + demo.sections.reduce((subtotal, section) => subtotal + section.fields.length, 0), 0);
  return (
    <main className="min-h-dvh bg-[#f4f5f7] text-neutral-900">
      <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <header className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-sm">
          <div className="grid gap-7 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-8">
            <div><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700"><SlidersHorizontal size={14} /> Demo trước triển khai</div><h1 className="max-w-4xl text-2xl font-black tracking-[-0.03em] text-neutral-950 sm:text-3xl lg:text-4xl">Hệ thống popup nhập liệu rộng, rõ và không mất thông tin</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">Giữ nguyên hai form đã duyệt là Giáo án và Tạo lớp học. Các popup còn lại dùng workspace ngang 1.760 px, tự xếp nhóm thông tin song song và co an toàn theo Web View.</p></div>
            <div className="grid grid-cols-3 gap-2 text-center"><Metric value={allDemos.length} label="Demo" /><Metric value={fieldCount} label="Trường" /><Metric value="2" label="Cỡ khung" /></div>
          </div>
          <div className="flex flex-col gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <label className="relative block w-full sm:max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><span className="sr-only">Tìm popup demo</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc nhóm popup..." className={`${FIELD_CLASS} pl-10`} /></label>
            <p className="text-xs font-semibold text-neutral-500">ESC để đóng · cuộn độc lập · không gọi API</p>
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="Danh sách popup demo">
          {filtered.map((demo) => {
            const Icon = demo.icon;
            const fields = demo.sections.reduce((total, section) => total + section.fields.length, 0);
            const effectiveSize = getDemoSize(demo);
            return <button key={demo.id} type="button" onClick={() => setActive(demo)} className="group flex min-h-48 flex-col rounded-[20px] border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-300"><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary-50 text-primary-700"><Icon size={21} /></span><span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[10px] font-bold text-neutral-600">{SIZE_LABELS[effectiveSize]}</span></div><div className="mt-5 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">{demo.group}</p><h2 className="mt-1 text-base font-bold text-neutral-950">{demo.title}</h2><p className="mt-1.5 line-clamp-2 text-sm leading-5 text-neutral-500">{demo.description}</p></div><div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs"><span className="font-semibold text-neutral-500">{fields ? `${fields} trường / thông tin` : "Workspace chuyên biệt"}</span><span className="flex items-center gap-1 font-bold text-primary-700">Mở demo <ChevronRight className="transition group-hover:translate-x-0.5" size={15} /></span></div></button>;
          })}
        </section>
        {filtered.length === 0 && <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">Không tìm thấy popup phù hợp.</div>}
      </div>
      <DemoDialog demo={active} onClose={() => setActive(null)} />
    </main>
  );
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return <div className="min-w-20 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3"><strong className="block text-xl font-black text-neutral-950">{value}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span></div>;
}
