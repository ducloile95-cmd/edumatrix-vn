import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft, CalendarX, Check, CheckCheck, CircleAlert, Clock3, CreditCard, Facebook, FileWarning, Info,
  Link2, MessageCircle, MoreHorizontal, Paperclip, Search, Send, ShieldCheck, SlidersHorizontal, Star, WifiOff,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tab, Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/features/auth/hooks/useAuth";

type Section = "conversations" | "outbox" | "fanpage";
type Filter = "all" | "unread" | "attention";
type Message = { id: string; direction: "inbound" | "outbound"; text: string; time: string; status: "received" | "sent" | "failed" };
type Thread = { id: string; parentName: string; studentName: string; studentCode: string; className: string; preview: string; time: string; unread: number; attention?: boolean; connected: boolean };

const THREADS: Thread[] = [
  { id: "t1", parentName: "Chị Mai Anh", studentName: "Nguyễn Gia Minh", studentCode: "HS001", className: "Toán A", preview: "Cô cho em hỏi lịch học bù tuần này ạ?", time: "15:42", unread: 2, attention: true, connected: true },
  { id: "t2", parentName: "Anh Đức Long", studentName: "Trần Tuấn Anh", studentCode: "HS003", className: "Anh B", preview: "Vâng, gia đình đã nhận được thông báo.", time: "14:18", unread: 0, connected: true },
  { id: "t3", parentName: "Chị Thu Hà", studentName: "Lê Bảo Châu", studentCode: "HS004", className: "Toán C", preview: "Tin nhắn gần nhất gửi thất bại.", time: "Hôm qua", unread: 0, attention: true, connected: true },
  { id: "t4", parentName: "Anh Quốc Huy", studentName: "Phạm Đức Anh", studentCode: "HS005", className: "Toán A", preview: "Phụ huynh chưa liên kết Messenger.", time: "12/07", unread: 0, connected: false },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  t1: [
    { id: "m1", direction: "outbound", text: "Chào chị, em gửi lịch học tháng 7 của lớp Toán A.", time: "15:28", status: "sent" },
    { id: "m2", direction: "inbound", text: "Cảm ơn cô. Tuần này lớp có học bù buổi nghỉ thứ Ba không ạ?", time: "15:40", status: "received" },
    { id: "m3", direction: "inbound", text: "Cô cho em hỏi lịch học bù tuần này ạ?", time: "15:42", status: "received" },
  ],
  t2: [
    { id: "m4", direction: "outbound", text: "Nhà trường đã cập nhật kết quả bài kiểm tra tuần này.", time: "14:02", status: "sent" },
    { id: "m5", direction: "inbound", text: "Vâng, gia đình đã nhận được thông báo.", time: "14:18", status: "received" },
  ],
  t3: [{ id: "m6", direction: "outbound", text: "Chị kiểm tra giúp em thông báo học phí tháng 7.", time: "Hôm qua, 17:06", status: "failed" }],
  t4: [],
};

const OUTBOX = [
  ["MSG-260717-041", "Chị Mai Anh", "Nguyễn Gia Minh", "Giáo viên An", "15:28", "sent"],
  ["MSG-260716-038", "Chị Thu Hà", "Lê Bảo Châu", "Admin Local", "16/07, 17:06", "failed"],
  ["MSG-260716-032", "Anh Đức Long", "Trần Tuấn Anh", "Giáo viên Bình", "16/07, 14:02", "sent"],
] as const;

function initials(name: string) {
  return name.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function DemoBar({ onOpenTemplates }: { onOpenTemplates: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary-100 bg-primary-50 px-4 py-2.5 text-xs text-primary-800"><div className="flex items-center gap-2"><CircleAlert size={15} /><b>Bản demo UI</b><span className="hidden sm:inline">Dữ liệu minh họa, không ghi Firestore và không gửi Meta.</span></div><div className="flex items-center gap-2"><button type="button" onClick={onOpenTemplates} className="inline-flex min-h-8 items-center gap-1.5 rounded-input bg-primary-700 px-3 font-semibold text-white"><Star size={14} />Xem Utility Template</button><StatusBadge tone="warning">Chưa gọi Meta</StatusBadge></div></div>;
}

type UtilityTemplateKey = "tuition" | "paymentSuccess" | "scheduleAdjustment" | "feedback" | "enrollmentSuccess" | "accountLinkSuccess";

const UTILITY_TEMPLATES = [
  { key: "tuition" as const, name: "Nhắc học phí", code: "tuition_payment_reminder", icon: CreditCard, status: "Sẵn sàng xin duyệt", description: "Nhắc kỳ học phí và hạn thanh toán.", teacherAllowed: true },
  { key: "paymentSuccess" as const, name: "Thanh toán thành công", code: "tuition_payment_confirmation", icon: CheckCheck, status: "Sẵn sàng xin duyệt", description: "Xác nhận trung tâm đã nhận học phí.", teacherAllowed: true },
  { key: "scheduleAdjustment" as const, name: "Điều chỉnh lịch học", code: "class_schedule_adjustment", icon: CalendarX, status: "Sẵn sàng xin duyệt", description: "Áp dụng cho nghỉ học, học bù hoặc học bổ sung.", teacherAllowed: true },
  { key: "feedback" as const, name: "Đánh giá buổi học", code: "lesson_feedback_request", icon: Star, status: "Cần Meta xác nhận", description: "Mời phụ huynh đánh giá một buổi học cụ thể.", teacherAllowed: true },
  { key: "enrollmentSuccess" as const, name: "Đăng ký học thành công", code: "enrollment_confirmation", icon: ShieldCheck, status: "Sẵn sàng xin duyệt", description: "Xác nhận học sinh đã đăng ký khóa/lớp thành công.", teacherAllowed: true },
  { key: "accountLinkSuccess" as const, name: "Liên kết tài khoản thành công", code: "parent_account_link_confirmation", icon: Link2, status: "Admin / Hệ thống", description: "Mời phụ huynh đăng nhập EduMatrix bằng email đã đăng ký.", teacherAllowed: false },
];

function UtilityTemplateDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<UtilityTemplateKey>("tuition");
  const [sent, setSent] = useState(false);
  const [values, setValues] = useState({
    studentName: "Nguyễn Gia Minh",
    centerName: "Trung tâm EduMatrix",
    billingPeriod: "Tháng 8/2026",
    amount: "2.000.000 ₫",
    dueDate: "2026-08-05",
    paymentDate: "2026-07-27",
    paymentReference: "HP-HS001-082026",
    className: "Toán A",
    courseName: "Toán tư duy nâng cao",
    adjustmentType: "Nghỉ học",
    lessonDate: "2026-07-30",
    lessonTime: "18:00",
    reason: "Giáo viên tham gia tập huấn chuyên môn",
    makeupPlan: "Học bù lúc 18:00 ngày 02/08/2026",
    feedbackUrl: "https://edumatrix.vn/danh-gia/buoi-hoc",
    startDate: "2026-08-05",
    schedule: "Thứ Ba và Thứ Năm, 18:00–19:30",
    parentName: "Chị Mai Anh",
    parentEmail: "maianh@gmail.com",
    loginUrl: "https://edumatrix.id.vn",
  });
  const update = (key: keyof typeof values, value: string) => { setValues((current) => ({ ...current, [key]: value })); setSent(false); };
  const displayDate = (value: string) => value.split("-").reverse().join("/");
  const template = UTILITY_TEMPLATES.find((item) => item.key === selected) ?? UTILITY_TEMPLATES[0];
  const preview = selected === "tuition"
    ? `EduMatrix thông báo học phí ${values.billingPeriod} của học sinh ${values.studentName} tại ${values.centerName} là ${values.amount}. Hạn thanh toán: ${displayDate(values.dueDate)}. Truy cập edumatrix.id.vn và đăng nhập bằng Gmail đã đăng ký để tiến hành thanh toán. Nếu cha/mẹ đã thanh toán, vui lòng bỏ qua thông báo này.`
    : selected === "paymentSuccess"
      ? `EduMatrix xác nhận ${values.centerName} đã nhận thanh toán học phí ${values.billingPeriod} của học sinh ${values.studentName}, số tiền ${values.amount}, vào ngày ${displayDate(values.paymentDate)}. Mã giao dịch: ${values.paymentReference}. Cảm ơn cha/mẹ đã hoàn tất thanh toán.`
      : selected === "scheduleAdjustment"
        ? `EduMatrix thông báo điều chỉnh lịch học (${values.adjustmentType}) của lớp ${values.className} dành cho học sinh ${values.studentName}: ${values.lessonTime} ngày ${displayDate(values.lessonDate)}. Lý do: ${values.reason}. ${values.makeupPlan}.`
        : selected === "feedback"
          ? `EduMatrix mời cha/mẹ đánh giá buổi học ngày ${displayDate(values.lessonDate)} của học sinh ${values.studentName}. Phiếu đánh giá: ${values.feedbackUrl}`
          : selected === "enrollmentSuccess"
            ? `EduMatrix xác nhận học sinh ${values.studentName} đã đăng ký học thành công khóa ${values.courseName}, lớp ${values.className} tại ${values.centerName}. Ngày bắt đầu: ${displayDate(values.startDate)}. Lịch học: ${values.schedule}.`
            : `EduMatrix thông báo tài khoản phụ huynh ${values.parentName} đã được liên kết thành công với học sinh ${values.studentName} tại ${values.centerName}. Thư mời đăng nhập đã được gửi tới email ${values.parentEmail}. Vui lòng truy cập ${values.loginUrl} và đăng nhập bằng đúng tài khoản Gmail đã nhận lời mời để sử dụng hệ thống.`;
  const inputClass = "min-h-10 w-full rounded-input border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
  const field = (label: string, key: keyof typeof values, type = "text") => <label className="block"><span className="mb-1.5 block text-xs font-semibold text-neutral-700">{label}</span><input type={type} value={values[key]} onChange={(event) => update(key, event.target.value)} className={inputClass} /></label>;
  return <Modal open={open} onClose={onClose} title="Demo Utility Message" description="Mô phỏng giao diện Teacher gửi thông báo ngoài cửa sổ 24 giờ. Không gọi Meta API." size="lg">
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-2">
        <div className={`mb-3 rounded-input border p-3 text-xs ${template.teacherAllowed ? "border-success-100 bg-success-50 text-success-800" : "border-warning-200 bg-warning-50 text-warning-800"}`}><div className="flex items-center gap-2 font-bold"><ShieldCheck size={16} />{template.teacherAllowed ? "Quyền Teacher" : "Quyền Admin / Hệ thống"}</div><p className="mt-1 leading-5">{template.teacherAllowed ? "Được gửi cho học sinh thuộc lớp phụ trách. Backend vẫn kiểm tra lại phạm vi." : "Teacher không được gửi mẫu liên quan liên kết tài khoản phụ huynh."}</p></div>
        {UTILITY_TEMPLATES.map(({ key, name, code, icon: Icon, status, description }) => <button key={key} type="button" onClick={() => { setSelected(key); setSent(false); }} className={`w-full rounded-card border p-3 text-left transition ${selected === key ? "border-primary-300 bg-primary-50 shadow-sm" : "border-neutral-200 bg-white hover:border-neutral-300"}`}><div className="flex items-center gap-2"><span className={`flex size-9 items-center justify-center rounded-full ${selected === key ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-600"}`}><Icon size={17} /></span><div className="min-w-0"><p className="text-sm font-bold text-neutral-900">{name}</p><p className="truncate font-mono text-2xs text-neutral-400">{code}</p></div></div><p className="mt-2 text-xs leading-5 text-neutral-500">{description}</p><span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-2xs font-semibold ${key === "feedback" ? "bg-warning-50 text-warning-700" : "bg-success-50 text-success-700"}`}>{status}</span></button>)}
      </aside>
      <section className="min-w-0">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary-600">UTILITY · {template.teacherAllowed ? "Teacher" : "Admin / Hệ thống"}</p><h3 className="mt-1 text-lg font-bold text-neutral-900">{template.name}</h3><p className="mt-1 text-xs text-neutral-500">Người nhận: Chị Mai Anh · Phụ huynh của {values.studentName}</p></div><StatusBadge tone={selected === "feedback" || !template.teacherAllowed ? "warning" : "success"}>{template.status}</StatusBadge></header>
        {selected === "feedback" && <div className="mb-4 rounded-input border border-warning-200 bg-warning-50 p-3 text-xs leading-5 text-warning-800"><b>Lưu ý chính sách:</b> template này chỉ được gửi ngoài 24 giờ khi Meta phê duyệt đúng nhóm Utility. Nếu không, hệ thống sẽ giới hạn trong cửa sổ 24 giờ.</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          {field("Tên học sinh", "studentName")}
          {selected !== "feedback" && field("Trường / Trung tâm", "centerName")}
          {selected === "tuition" && <>{field("Kỳ học phí", "billingPeriod")}{field("Số tiền", "amount")}{field("Hạn thanh toán", "dueDate", "date")}</>}
          {selected === "paymentSuccess" && <>{field("Kỳ học phí", "billingPeriod")}{field("Số tiền", "amount")}{field("Ngày thanh toán", "paymentDate", "date")}{field("Mã giao dịch", "paymentReference")}</>}
          {selected === "scheduleAdjustment" && <><label className="block"><span className="mb-1.5 block text-xs font-semibold text-neutral-700">Loại điều chỉnh</span><select value={values.adjustmentType} onChange={(event) => update("adjustmentType", event.target.value)} className={inputClass}><option>Nghỉ học</option><option>Học bù</option><option>Học bổ sung</option></select></label>{field("Lớp học", "className")}{field("Ngày áp dụng", "lessonDate", "date")}{field("Giờ học", "lessonTime", "time")}{field("Lý do / Nội dung", "reason")}{field("Lịch thay thế / Ghi chú", "makeupPlan")}</>}
          {selected === "feedback" && <>{field("Ngày học", "lessonDate", "date")}{field("Link đánh giá", "feedbackUrl", "url")}</>}
          {selected === "enrollmentSuccess" && <>{field("Khóa học", "courseName")}{field("Lớp học", "className")}{field("Ngày bắt đầu", "startDate", "date")}{field("Lịch học", "schedule")}</>}
          {selected === "accountLinkSuccess" && <>{field("Tên phụ huynh", "parentName")}{field("Email nhận lời mời", "parentEmail", "email")}{field("Đường dẫn đăng nhập", "loginUrl", "url")}</>}
        </div>
        <div className="mt-5 rounded-card border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Xem trước tin nhắn</p><span className="rounded-full bg-neutral-100 px-2 py-1 text-2xs font-semibold text-neutral-500">Ngoài 24 giờ</span></div><div className="mt-4 flex justify-start"><div className="max-w-[88%] rounded-chat-bubble rounded-bl-chat-tail border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-800 shadow-sm">{preview}</div></div></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4"><p className="text-xs text-neutral-500">{sent ? <span className="font-semibold text-success-700">Đã mô phỏng gửi thành công. Không có dữ liệu được gửi ra ngoài.</span> : !template.teacherAllowed ? "Mẫu này do Admin/Hệ thống gửi sau khi liên kết tài khoản thành công." : "Kiểm tra nội dung trước khi gửi. Demo không ghi Firestore."}</p><div className="flex gap-2"><button type="button" onClick={onClose} className="min-h-10 rounded-input border border-neutral-300 px-4 text-sm font-semibold text-neutral-700">Đóng</button><button type="button" onClick={() => setSent(true)} disabled={selected === "feedback" || !template.teacherAllowed} className="inline-flex min-h-10 items-center gap-2 rounded-input bg-primary-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Send size={16} />Mô phỏng gửi</button></div></div>
      </section>
    </div>
  </Modal>;
}

function ThreadList({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const items = useMemo(() => THREADS.filter((thread) => {
    const text = `${thread.parentName} ${thread.studentName} ${thread.studentCode}`.toLocaleLowerCase("vi");
    return text.includes(search.toLocaleLowerCase("vi")) && (filter === "all" || (filter === "unread" ? thread.unread > 0 : thread.attention));
  }), [filter, search]);
  return <aside className="flex min-h-0 w-full flex-col border-r border-neutral-200 bg-white"><div className="border-b border-neutral-200 p-3"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} /><span className="sr-only">Tìm hội thoại</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên phụ huynh, học sinh..." className="min-h-touch w-full rounded-input border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" /></label><div className="mt-2 grid grid-cols-3 gap-1 rounded-input bg-neutral-100 p-1">{([['all', 'Tất cả'], ['unread', 'Chưa đọc'], ['attention', 'Cần xử lý']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-9 rounded-[7px] px-2 text-xs font-semibold ${filter === value ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500"}`}>{label}</button>)}</div></div><div className="min-h-0 flex-1 overflow-y-auto">{items.length ? items.map((thread) => <button key={thread.id} type="button" onClick={() => onSelect(thread.id)} className={`flex w-full gap-3 border-b border-neutral-100 px-3 py-3 text-left transition ${selected === thread.id ? "bg-primary-50" : "hover:bg-neutral-50"}`}><span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${thread.connected ? "bg-primary-100 text-primary-700" : "bg-neutral-100 text-neutral-500"}`}>{initials(thread.parentName)}</span><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><b className="truncate text-sm text-neutral-900">{thread.parentName}</b><span className="shrink-0 text-2xs text-neutral-400">{thread.time}</span></span><span className="mt-0.5 block truncate text-xs font-medium text-neutral-600">{thread.studentName} · {thread.className}</span><span className={`mt-1 block truncate text-xs ${thread.unread ? "font-semibold text-neutral-800" : "text-neutral-500"}`}>{thread.preview}</span></span>{thread.unread > 0 && <span className="mt-9 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-3xs font-bold text-white">{thread.unread}</span>}</button>) : <div className="px-5 py-12 text-center"><SlidersHorizontal className="mx-auto text-neutral-300" size={28} /><p className="mt-3 text-sm font-semibold text-neutral-700">Không có hội thoại phù hợp</p></div>}</div></aside>;
}

function Details({ thread }: { thread: Thread }) {
  return <div className="space-y-5 text-sm"><div className="text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700">{initials(thread.parentName)}</span><h3 className="mt-3 font-bold text-neutral-900">{thread.parentName}</h3><p className="mt-1 text-xs text-neutral-500">Phụ huynh của {thread.studentName}</p></div><dl className="space-y-3 border-t border-neutral-200 pt-4"><div><dt className="text-xs font-semibold text-neutral-400">Học sinh</dt><dd className="mt-1 font-semibold text-neutral-800">{thread.studentName} · {thread.studentCode}</dd></div><div><dt className="text-xs font-semibold text-neutral-400">Lớp học</dt><dd className="mt-1 font-semibold text-neutral-800">{thread.className}</dd></div><div><dt className="text-xs font-semibold text-neutral-400">Kết nối Messenger</dt><dd className="mt-1"><StatusBadge tone={thread.connected ? "success" : "warning"}>{thread.connected ? "Đã liên kết" : "Chưa liên kết"}</StatusBadge></dd></div><div><dt className="text-xs font-semibold text-neutral-400">Cửa sổ phản hồi</dt><dd className="mt-1 flex items-center gap-2 font-semibold text-success-700"><Clock3 size={14} />Còn 21 giờ 14 phút</dd></div></dl><div className="rounded-input border border-warning-100 bg-warning-50 p-3 text-xs leading-5 text-warning-800">Thời gian phản hồi chỉ là dữ liệu minh họa.</div></div>;
}

function Conversation({ thread, messages, onBack, onInfo, onSend }: { thread: Thread; messages: Message[]; onBack: () => void; onInfo: () => void; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); if (!draft.trim() || !thread.connected) return; onSend(draft.trim()); setDraft(""); };
  return <section className="flex min-h-0 w-full flex-col bg-neutral-50"><header className="flex min-h-[65px] items-center justify-between border-b border-neutral-200 bg-white px-3 sm:px-4"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={onBack} aria-label="Quay lại danh sách" className="icon-button flex lg:hidden"><ArrowLeft size={18} /></button><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{initials(thread.parentName)}</span><div className="min-w-0"><h2 className="truncate text-sm font-bold text-neutral-900">{thread.parentName}</h2><p className="truncate text-xs text-neutral-500">{thread.studentName} · {thread.className}</p></div></div><div className="flex"><button type="button" onClick={onInfo} className="icon-button flex xl:hidden" aria-label="Xem thông tin"><Info size={18} /></button><button type="button" className="icon-button flex" aria-label="Thêm thao tác"><MoreHorizontal size={19} /></button></div></header>{!thread.connected && <div className="flex gap-2 border-b border-warning-100 bg-warning-50 px-4 py-3 text-xs text-warning-800"><WifiOff className="shrink-0" size={16} />Phụ huynh chưa liên kết Messenger. Chức năng gửi đang bị khóa.</div>}<div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6"><div className="mx-auto max-w-3xl space-y-3"><p className="pb-2 text-center text-2xs font-semibold text-neutral-400">Hôm nay</p>{messages.length ? messages.map((message) => <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-chat-bubble px-3.5 py-2.5 text-sm leading-5 shadow-sm sm:max-w-[70%] ${message.direction === "outbound" ? "rounded-br-chat-tail bg-primary-600 text-white" : "rounded-bl-chat-tail border border-neutral-200 bg-white text-neutral-800"}`}><p>{message.text}</p><div className={`mt-1 flex items-center justify-end gap-1 text-3xs ${message.direction === "outbound" ? "text-primary-100" : "text-neutral-400"}`}><span>{message.time}</span>{message.status === "sent" && <CheckCheck size={12} />}{message.status === "failed" && <FileWarning size={12} />}</div></div></div>) : <div className="py-16 text-center"><MessageCircle className="mx-auto text-neutral-300" size={36} /><p className="mt-3 text-sm font-semibold text-neutral-700">Chưa có tin nhắn</p></div>}</div></div><form onSubmit={submit} className="border-t border-neutral-200 bg-white p-3 sm:p-4"><div className="mx-auto flex max-w-3xl items-end gap-2"><button type="button" className="icon-button mb-0.5 flex shrink-0" aria-label="Đính kèm tệp" disabled><Paperclip size={18} /></button><label className="min-w-0 flex-1"><span className="sr-only">Soạn tin nhắn</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={1} maxLength={2000} disabled={!thread.connected} placeholder={thread.connected ? "Nhập tin nhắn..." : "Chưa thể gửi tin nhắn"} className="max-h-28 min-h-touch w-full resize-none rounded-[12px] border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100" /></label><button type="submit" disabled={!draft.trim() || !thread.connected} aria-label="Gửi tin nhắn demo" className="motion-control mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-600 text-white shadow-[0_6px_16px_rgba(35,72,214,.22)] active:scale-[.97] disabled:opacity-40"><Send size={18} /></button></div><div className="mx-auto mt-1 flex max-w-3xl justify-between pl-12 text-3xs text-neutral-400"><span>Demo chỉ lưu trên màn hình.</span><span>{draft.length}/2000</span></div></form></section>;
}

function Conversations() {
  const [selected, setSelected] = useState(THREADS[0].id); const [mobileOpen, setMobileOpen] = useState(false); const [infoOpen, setInfoOpen] = useState(false); const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const thread = THREADS.find((item) => item.id === selected) ?? THREADS[0];
  const send = (text: string) => setMessages((current) => ({ ...current, [thread.id]: [...(current[thread.id] ?? []), { id: `demo-${Date.now()}`, direction: "outbound", text, time: "Bây giờ", status: "sent" }] }));
  return <><div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_300px]"><div className={`${mobileOpen ? "hidden" : "flex"} min-h-0 lg:flex`}><ThreadList selected={selected} onSelect={(id) => { setSelected(id); setMobileOpen(true); }} /></div><div className={`${mobileOpen ? "flex" : "hidden"} min-h-0 lg:flex`}><Conversation thread={thread} messages={messages[thread.id] ?? []} onBack={() => setMobileOpen(false)} onInfo={() => setInfoOpen(true)} onSend={send} /></div><aside className="hidden min-h-0 overflow-y-auto border-l border-neutral-200 bg-white p-5 xl:block"><Details thread={thread} /></aside></div><Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Thông tin hội thoại" size="sm"><Details thread={thread} /></Modal></>;
}

function Outbox() {
  return <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 p-3 sm:p-5"><div className="mx-auto max-w-6xl overflow-hidden rounded-card border border-neutral-200 bg-white"><div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4"><div><h2 className="text-sm font-bold text-neutral-900">Nhật ký gửi</h2><p className="mt-1 text-xs text-neutral-500">Đối soát các lần gửi Messenger gần nhất.</p></div><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-input border border-neutral-300 px-3 text-xs font-semibold"><SlidersHorizontal size={14} />Bộ lọc</button></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="bg-neutral-50 text-left text-xs font-bold text-neutral-500"><tr>{["Mã gửi", "Người nhận", "Học sinh", "Người gửi", "Thời gian", "Trạng thái"].map((head) => <th key={head} className="px-4 py-3 last:text-right">{head}</th>)}</tr></thead><tbody>{OUTBOX.map(([id, recipient, student, actor, time, status]) => <tr key={id} className="border-t border-neutral-100"><td className="px-4 py-3 font-mono text-xs">{id}</td><td className="px-4 py-3 font-semibold">{recipient}</td><td className="px-4 py-3 text-neutral-600">{student}</td><td className="px-4 py-3 text-neutral-600">{actor}</td><td className="px-4 py-3 text-neutral-500">{time}</td><td className="px-4 py-3 text-right"><StatusBadge tone={status === "sent" ? "success" : "danger"}>{status === "sent" ? "Đã gửi" : "Thất bại"}</StatusBadge></td></tr>)}</tbody></table></div></div></div>;
}

function Fanpage() {
  const [content, setContent] = useState(""); const [link, setLink] = useState(""); const [preview, setPreview] = useState(false);
  return <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 p-3 sm:p-5"><div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.15fr_.85fr]"><section className="rounded-card border border-neutral-200 bg-white"><header className="border-b border-neutral-200 px-5 py-4"><h2 className="flex items-center gap-2 text-sm font-bold"><Facebook size={18} className="text-primary-700" />Soạn bài Fanpage</h2><p className="mt-1 text-xs text-neutral-500">Chỉ Admin sử dụng. Demo không đăng lên Facebook.</p></header><form onSubmit={(event) => { event.preventDefault(); setPreview(true); }} className="space-y-4 p-5"><label className="block"><span className="mb-1.5 block text-xs font-bold">Nội dung</span><textarea value={content} onChange={(event) => { setContent(event.target.value); setPreview(false); }} rows={7} maxLength={5000} placeholder="Nhập nội dung bài đăng..." className="w-full rounded-input border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" /><span className="mt-1 block text-right text-xs text-neutral-400">{content.length}/5000</span></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Liên kết</span><div className="relative"><Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} /><input type="url" value={link} onChange={(event) => { setLink(event.target.value); setPreview(false); }} placeholder="https://..." className="min-h-touch w-full rounded-input border border-neutral-300 pl-9 pr-3 text-sm outline-none focus:border-primary-500" /></div></label><button type="submit" disabled={!content.trim()} className="motion-control inline-flex min-h-touch items-center gap-2 rounded-input bg-primary-600 px-4 text-sm font-semibold text-white active:scale-[.98] disabled:opacity-40"><Check size={16} />Xem trước</button></form></section><aside className="rounded-card border border-neutral-200 bg-white"><header className="border-b border-neutral-200 px-5 py-4"><h2 className="text-sm font-bold">Bản xem trước</h2><p className="mt-1 text-xs text-neutral-500">Nội dung chỉ hiển thị trong trình duyệt.</p></header><div className="p-5">{preview ? <div className="rounded-card border border-neutral-200 p-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">EM</span><div><b className="text-sm">EduMatrix Việt Nam</b><p className="text-xs text-neutral-400">Vừa xong · Demo</p></div></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6">{content}</p>{link && <p className="mt-3 truncate rounded-input bg-neutral-50 px-3 py-2 text-xs text-primary-700">{link}</p>}</div> : <div className="py-16 text-center"><Facebook className="mx-auto text-neutral-300" size={34} /><p className="mt-3 text-sm font-semibold">Chưa có bản xem trước</p></div>}</div></aside></div></div>;
}

export default function ChatDemoPage() {
  const { userDoc } = useAuth(); const [section, setSection] = useState<Section>("conversations"); const [utilityOpen, setUtilityOpen] = useState(false);
  const tabs = [{ value: "conversations" as const, label: "Hội thoại", icon: MessageCircle }, { value: "outbox" as const, label: "Nhật ký gửi", icon: Clock3 }, ...(userDoc?.role === "admin" ? [{ value: "fanpage" as const, label: "Đăng Fanpage", icon: Facebook }] : [])];
  return <><div className="flex h-[calc(100dvh-112px)] min-h-[620px] flex-col overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]"><DemoBar onOpenTemplates={() => setUtilityOpen(true)} /><Tabs label="Nhánh Chat demo" className="shrink-0 px-3">{tabs.map(({ value, label, icon: Icon }) => <Tab key={value} active={section === value} onClick={() => setSection(value)} className="min-h-[50px]"><Icon size={16} />{label}</Tab>)}</Tabs>{section === "conversations" && <Conversations />}{section === "outbox" && <Outbox />}{section === "fanpage" && <Fanpage />}</div><UtilityTemplateDemo open={utilityOpen} onClose={() => setUtilityOpen(false)} /></>;
}
