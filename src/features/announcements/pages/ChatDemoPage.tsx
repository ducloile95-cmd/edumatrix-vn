import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  Facebook,
  FileWarning,
  Info,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  UsersRound,
  WifiOff,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Filter = "all" | "unread" | "attention";
type Channel = "messenger" | "zalo";
type Message = {
  id: string;
  direction: "inbound" | "outbound";
  text: string;
  time: string;
  status: "received" | "sent" | "failed";
};
type Thread = {
  id: string;
  parentName: string;
  studentName: string;
  studentCode: string;
  className: string;
  preview: string;
  time: string;
  unread: number;
  attention?: boolean;
  connected: boolean;
  channel: Channel;
};

const THREADS: Thread[] = [
  { id: "t1", parentName: "Chị Mai Anh", studentName: "Nguyễn Gia Minh", studentCode: "HS001", className: "Toán A", preview: "Cô cho em hỏi lịch học bù tuần này ạ?", time: "15:42", unread: 2, attention: true, connected: true, channel: "messenger" },
  { id: "t2", parentName: "Anh Đức Long", studentName: "Trần Tuấn Anh", studentCode: "HS003", className: "Anh B", preview: "Vâng, gia đình đã nhận được thông báo.", time: "14:18", unread: 0, connected: true, channel: "messenger" },
  { id: "t3", parentName: "Chị Thu Hà", studentName: "Lê Bảo Châu", studentCode: "HS004", className: "Toán C", preview: "Tin nhắn gần nhất gửi thất bại.", time: "Hôm qua", unread: 0, attention: true, connected: true, channel: "messenger" },
  { id: "t4", parentName: "Anh Quốc Huy", studentName: "Phạm Đức Anh", studentCode: "HS005", className: "Toán A", preview: "Phụ huynh chưa liên kết kênh chat.", time: "12/07", unread: 0, connected: false, channel: "messenger" },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  t1: [
    { id: "m1", direction: "outbound", text: "Chào chị, em gửi lịch học tháng 8 của lớp Toán A.", time: "15:28", status: "sent" },
    { id: "m2", direction: "inbound", text: "Cảm ơn cô. Tuần này lớp có học bù buổi nghỉ thứ Ba không ạ?", time: "15:40", status: "received" },
    { id: "m3", direction: "inbound", text: "Cô cho em hỏi lịch học bù tuần này ạ?", time: "15:42", status: "received" },
  ],
  t2: [
    { id: "m4", direction: "outbound", text: "Nhà trường đã cập nhật kết quả bài kiểm tra tuần này.", time: "14:02", status: "sent" },
    { id: "m5", direction: "inbound", text: "Vâng, gia đình đã nhận được thông báo.", time: "14:18", status: "received" },
  ],
  t3: [{ id: "m6", direction: "outbound", text: "Chị kiểm tra giúp em thông báo học phí tháng 8.", time: "Hôm qua, 17:06", status: "failed" }],
  t4: [],
};

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "unread", label: "Chưa đọc" },
  { value: "attention", label: "Cần xử lý" },
];

function initials(name: string) {
  return name.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function DemoNotice() {
  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-900 sm:px-4">
      <div className="flex items-center gap-2">
        <Sparkles size={15} aria-hidden="true" />
        <strong>Bản xem trước giao diện Chat mới</strong>
        <span className="hidden md:inline">Dữ liệu minh họa, không đọc ghi Firestore và không gọi API bên thứ ba.</span>
      </div>
      <StatusBadge tone="success">Demo an toàn</StatusBadge>
    </div>
  );
}

function ChannelSwitcher({ channel, onChange }: { channel: Channel; onChange: (channel: Channel) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-neutral-100 p-1" aria-label="Chọn kênh chat">
      <button type="button" onClick={() => onChange("messenger")} aria-pressed={channel === "messenger"} className={`flex min-h-10 items-center justify-center gap-2 rounded-[8px] px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${channel === "messenger" ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>
        <Facebook size={15} aria-hidden="true" /> Messenger
      </button>
      <button type="button" onClick={() => onChange("zalo")} aria-pressed={channel === "zalo"} className={`flex min-h-10 items-center justify-center gap-2 rounded-[8px] px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${channel === "zalo" ? "bg-white text-primary-700 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}>
        <MessageCircle size={15} aria-hidden="true" /> Zalo OA
      </button>
    </div>
  );
}

function ThreadList({ selected, channel, onChannelChange, onSelect }: { selected: string; channel: Channel; onChannelChange: (channel: Channel) => void; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const items = useMemo(() => THREADS.filter((thread) => {
    const text = `${thread.parentName} ${thread.studentName} ${thread.studentCode}`.toLocaleLowerCase("vi");
    return channel === "messenger" && text.includes(search.toLocaleLowerCase("vi")) && (filter === "all" || (filter === "unread" ? thread.unread > 0 : thread.attention));
  }), [channel, filter, search]);

  return (
    <aside className="flex min-h-0 w-full flex-col border-r border-neutral-200 bg-white" aria-label="Danh sách hội thoại">
      <div className="space-y-3 border-b border-neutral-200 p-3">
        <ChannelSwitcher channel={channel} onChange={onChannelChange} />
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} aria-hidden="true" />
          <span className="sr-only">Tìm hội thoại</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm phụ huynh, học sinh" className="min-h-11 w-full rounded-[10px] border border-neutral-300 bg-neutral-50 pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
        </label>
        <div className="grid grid-cols-3 gap-1" aria-label="Lọc hội thoại">
          {FILTERS.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`min-h-9 rounded-[8px] px-1 text-[11px] font-bold transition-colors ${filter === item.value ? "bg-primary-50 text-primary-700" : "text-neutral-500 hover:bg-neutral-50"}`}>{item.label}</button>)}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {channel === "zalo" ? (
          <div className="m-3 rounded-[12px] border border-dashed border-primary-200 bg-primary-50/60 p-5 text-center">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-white text-primary-700 ring-1 ring-primary-100"><MessageCircle size={19} /></span>
            <h2 className="mt-3 text-sm font-bold text-neutral-900">Zalo OA đang ở bản định hướng</h2>
            <p className="mt-2 text-xs leading-5 text-neutral-600">Khi OpenAPI và webhook được cấu hình, hội thoại Zalo sẽ xuất hiện tại đây theo cùng một luồng xử lý.</p>
            <button type="button" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-[9px] border border-primary-200 bg-white px-3 text-xs font-bold text-primary-700"><Settings2 size={15} /> Xem phạm vi tích hợp</button>
          </div>
        ) : items.length ? items.map((thread) => (
          <button key={thread.id} type="button" onClick={() => onSelect(thread.id)} aria-current={selected === thread.id ? "true" : undefined} className={`group flex min-h-[88px] w-full gap-3 border-b border-neutral-100 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${selected === thread.id ? "bg-primary-50" : "hover:bg-neutral-50"}`}>
            <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${thread.connected ? "bg-primary-100 text-primary-700" : "bg-neutral-100 text-neutral-500"}`}>{initials(thread.parentName)}{thread.connected && <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-success-500" />}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-neutral-900">{thread.parentName}</strong><span className="shrink-0 text-[10px] text-neutral-400">{thread.time}</span></span>
              <span className="mt-0.5 block truncate text-xs font-medium text-neutral-600">{thread.studentName} · {thread.className}</span>
              <span className={`mt-1 block truncate text-xs ${thread.unread ? "font-semibold text-neutral-800" : "text-neutral-500"}`}>{thread.preview}</span>
            </span>
            <span className="flex w-5 shrink-0 flex-col items-center justify-end gap-1">{thread.unread > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">{thread.unread}</span>}{thread.attention && <CircleAlert size={14} className="text-warning-600" />}</span>
          </button>
        )) : (
          <div className="px-5 py-14 text-center"><SlidersHorizontal className="mx-auto text-neutral-300" size={28} /><p className="mt-3 text-sm font-semibold text-neutral-700">Không có hội thoại phù hợp</p><p className="mt-1 text-xs text-neutral-500">Thử đổi từ khóa hoặc bộ lọc.</p></div>
        )}
      </div>
    </aside>
  );
}

function ContactDetails({ thread }: { thread: Thread }) {
  return (
    <div className="space-y-5 text-sm">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700">{initials(thread.parentName)}</span>
        <h2 className="mt-3 font-bold text-neutral-900">{thread.parentName}</h2>
        <p className="mt-1 text-xs text-neutral-500">Phụ huynh của {thread.studentName}</p>
      </div>
      <dl className="space-y-4 border-t border-neutral-200 pt-4">
        <div><dt className="text-xs font-semibold text-neutral-400">Học sinh</dt><dd className="mt-1 font-semibold text-neutral-800">{thread.studentName} · {thread.studentCode}</dd></div>
        <div><dt className="text-xs font-semibold text-neutral-400">Lớp học</dt><dd className="mt-1 font-semibold text-neutral-800">{thread.className}</dd></div>
        <div><dt className="text-xs font-semibold text-neutral-400">Kênh hiện tại</dt><dd className="mt-1"><StatusBadge tone={thread.connected ? "success" : "warning"}>{thread.connected ? "Messenger đã liên kết" : "Chưa liên kết"}</StatusBadge></dd></div>
        <div><dt className="text-xs font-semibold text-neutral-400">Cửa sổ phản hồi</dt><dd className="mt-1 flex items-center gap-2 font-semibold text-success-700"><Clock3 size={14} /> Còn 21 giờ 14 phút</dd></div>
      </dl>
      <button type="button" className="flex min-h-11 w-full items-center justify-between rounded-[10px] border border-neutral-200 px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50"><span className="flex items-center gap-2"><UserRound size={16} /> Mở hồ sơ phụ huynh</span><ChevronRight size={15} /></button>
      <p className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-3 text-xs leading-5 text-neutral-500">Thông tin trong bản demo chỉ dùng để đánh giá bố cục và thao tác.</p>
    </div>
  );
}

function Conversation({ thread, messages, onBack, onInfo, onSend }: { thread: Thread; messages: Message[]; onBack: () => void; onInfo: () => void; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || !thread.connected) return;
    onSend(draft.trim());
    setDraft("");
  };
  return (
    <section className="flex min-h-0 min-w-0 w-full flex-col bg-[#f7f8fa]" aria-label={`Hội thoại với ${thread.parentName}`}>
      <header className="flex min-h-[65px] shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Quay lại danh sách" className="icon-button flex lg:hidden"><ArrowLeft size={18} /></button>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">{initials(thread.parentName)}</span>
          <div className="min-w-0"><h1 className="truncate text-sm font-bold text-neutral-900">{thread.parentName}</h1><p className="truncate text-xs text-neutral-500">{thread.studentName} · {thread.className}</p></div>
        </div>
        <div className="flex items-center gap-1"><StatusBadge tone="success">Messenger</StatusBadge><button type="button" onClick={onInfo} className="icon-button flex xl:hidden" aria-label="Xem thông tin"><Info size={18} /></button><button type="button" className="icon-button flex" aria-label="Thêm thao tác"><MoreHorizontal size={19} /></button></div>
      </header>
      {!thread.connected && <div className="flex gap-2 border-b border-warning-100 bg-warning-50 px-4 py-3 text-xs text-warning-800"><WifiOff className="shrink-0" size={16} />Phụ huynh chưa liên kết kênh chat. Chức năng gửi đang bị khóa.</div>}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-3">
          <p className="pb-2 text-center text-[10px] font-bold uppercase tracking-[.12em] text-neutral-400">Hôm nay</p>
          {messages.length ? messages.map((message) => (
            <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
              <div className={`min-w-0 max-w-[84%] break-words rounded-[15px] px-3.5 py-2.5 text-sm leading-5 shadow-sm sm:max-w-[70%] ${message.direction === "outbound" ? "rounded-br-[5px] bg-primary-600 text-white" : "rounded-bl-[5px] border border-neutral-200 bg-white text-neutral-800"}`}>
                <p>{message.text}</p>
                <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${message.direction === "outbound" ? "text-primary-100" : "text-neutral-400"}`}><span>{message.time}</span>{message.status === "sent" && <CheckCheck size={12} />}{message.status === "failed" && <FileWarning size={12} />}</div>
              </div>
            </div>
          )) : <div className="py-16 text-center"><MessageCircle className="mx-auto text-neutral-300" size={36} /><p className="mt-3 text-sm font-semibold text-neutral-700">Chưa có tin nhắn</p></div>}
        </div>
      </div>
      <form onSubmit={submit} className="shrink-0 border-t border-neutral-200 bg-white p-3 sm:p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <button type="button" className="icon-button mb-0.5 flex shrink-0" aria-label="Đính kèm tệp" disabled><Paperclip size={18} /></button>
          <label className="min-w-0 flex-1"><span className="sr-only">Soạn tin nhắn</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={1} maxLength={2000} disabled={!thread.connected} placeholder={thread.connected ? "Nhập tin nhắn" : "Chưa thể gửi tin nhắn"} className="max-h-28 min-h-11 w-full resize-none rounded-[12px] border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-100" /></label>
          <button type="submit" disabled={!draft.trim() || !thread.connected} aria-label="Gửi tin nhắn demo" className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-primary-600 text-white shadow-[0_6px_16px_rgba(35,72,214,.2)] transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40"><Send size={18} /></button>
        </div>
        <div className="mx-auto mt-1 flex max-w-3xl justify-between pl-12 text-[10px] text-neutral-400"><span>Chỉ hiển thị trên màn hình demo.</span><span>{draft.length}/2000</span></div>
      </form>
    </section>
  );
}

export default function ChatDemoPage() {
  const [channel, setChannel] = useState<Channel>("messenger");
  const [selected, setSelected] = useState(THREADS[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const thread = THREADS.find((item) => item.id === selected) ?? THREADS[0];
  const send = (text: string) => setMessages((current) => ({ ...current, [thread.id]: [...(current[thread.id] ?? []), { id: `demo-${Date.now()}`, direction: "outbound", text, time: "Bây giờ", status: "sent" }] }));

  return (
    <>
      <div className="flex h-[calc(100dvh-112px)] min-h-[620px] flex-col overflow-hidden rounded-[18px] border border-neutral-200 bg-white shadow-[0_22px_64px_-46px_rgba(15,23,42,.5)]">
        <DemoNotice />
        <div className="grid min-h-0 flex-1 lg:grid-cols-[310px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)_280px]">
          <div className={`${mobileOpen ? "hidden" : "flex"} min-h-0 min-w-0 lg:flex`}><ThreadList selected={selected} channel={channel} onChannelChange={(value) => { setChannel(value); if (value === "zalo") setScopeOpen(true); }} onSelect={(id) => { setSelected(id); setMobileOpen(true); }} /></div>
          <div className={`${mobileOpen ? "flex" : "hidden"} min-h-0 min-w-0 lg:flex`}>{channel === "messenger" ? <Conversation thread={thread} messages={messages[thread.id] ?? []} onBack={() => setMobileOpen(false)} onInfo={() => setInfoOpen(true)} onSend={send} /> : <section className="flex flex-1 items-center justify-center bg-neutral-50 p-6 text-center"><div className="max-w-sm"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-700"><MessageCircle size={22} /></span><h1 className="mt-4 text-lg font-bold text-neutral-900">Kênh Zalo OA chưa kết nối</h1><p className="mt-2 text-sm leading-6 text-neutral-600">Bản demo chỉ mô phỏng vị trí của kênh. Cần Zalo OA OpenAPI, webhook và cơ chế liên kết UID trước khi bật gửi nhận thật.</p><button type="button" onClick={() => setScopeOpen(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-primary-600 px-4 text-sm font-bold text-white"><Info size={16} /> Xem phương án</button></div></section>}</div>
          <aside className="hidden min-h-0 overflow-y-auto border-l border-neutral-200 bg-white p-5 xl:block"><ContactDetails thread={thread} /></aside>
        </div>
      </div>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Thông tin hội thoại" size="sm"><ContactDetails thread={thread} /></Modal>
      <Modal open={scopeOpen} onClose={() => setScopeOpen(false)} title="Phạm vi kết nối Zalo" size="sm">
        <div className="space-y-4 text-sm leading-6 text-neutral-600">
          <p className="rounded-[10px] border border-warning-200 bg-warning-50 p-3 font-semibold text-warning-900">Không tự động hóa tài khoản Zalo cá nhân bằng QR đăng nhập hoặc thư viện không chính thức.</p>
          <div className="space-y-3">
            <div className="flex gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700"><UsersRound size={16} /></span><p><strong className="block text-neutral-900">Kênh chính thức</strong>Zalo Official Account kết nối OpenAPI và webhook.</p></div>
            <div className="flex gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700"><MessageCircle size={16} /></span><p><strong className="block text-neutral-900">Dữ liệu thống nhất</strong>Chuẩn hóa hội thoại Zalo và Messenger về cùng cấu trúc thread, message và trạng thái.</p></div>
            <div className="flex gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700"><Clock3 size={16} /></span><p><strong className="block text-neutral-900">Điều kiện triển khai</strong>Có OA, ứng dụng được cấp quyền, callback HTTPS và chính sách gửi tin phù hợp.</p></div>
          </div>
        </div>
      </Modal>
    </>
  );
}
