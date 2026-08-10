import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Facebook,
  FileWarning,
  Info,
  MessageCircle,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Filter = "all" | "unread" | "attention";
type TagColor = "red" | "pink" | "amber" | "green" | "blue";
type ConversationTag = { label: string; color: TagColor };
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
  phone: string;
  email: string;
  studentName: string;
  studentCode: string;
  className: string;
  preview: string;
  time: string;
  unread: number;
  attention?: boolean;
  connected: boolean;
};

const THREADS: Thread[] = [
  { id: "t1", parentName: "Chị Mai Anh", phone: "090 315 2684", email: "maianh.ph@gmail.com", studentName: "Nguyễn Gia Minh", studentCode: "HS001", className: "Toán A", preview: "Cô cho em hỏi lịch học bù tuần này ạ?", time: "15:42", unread: 2, attention: true, connected: true },
  { id: "t2", parentName: "Anh Đức Long", phone: "098 642 1175", email: "duclong.ph@gmail.com", studentName: "Trần Tuấn Anh", studentCode: "HS003", className: "Anh B", preview: "Vâng, gia đình đã nhận được thông báo.", time: "14:18", unread: 0, connected: true },
  { id: "t3", parentName: "Chị Thu Hà", phone: "091 784 3620", email: "thuha.ph@gmail.com", studentName: "Lê Bảo Châu", studentCode: "HS004", className: "Toán C", preview: "Tin nhắn gần nhất gửi thất bại.", time: "Hôm qua", unread: 0, attention: true, connected: true },
  { id: "t4", parentName: "Anh Quốc Huy", phone: "093 526 9041", email: "quochuy.ph@gmail.com", studentName: "Phạm Đức Anh", studentCode: "HS005", className: "Toán A", preview: "Phụ huynh chưa liên kết Messenger.", time: "12/07", unread: 0, connected: false },
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

const TAG_COLORS: Array<{ value: TagColor; label: string; swatch: string }> = [
  { value: "red", label: "đỏ", swatch: "bg-[#ef3340]" },
  { value: "pink", label: "hồng", swatch: "bg-[#e83eae]" },
  { value: "amber", label: "cam", swatch: "bg-[#f59e0b]" },
  { value: "green", label: "xanh lá", swatch: "bg-[#16a34a]" },
  { value: "blue", label: "xanh dương", swatch: "bg-[#3569e8]" },
];

const TAG_STYLES: Record<TagColor, string> = {
  red: "bg-[#ef3340] text-white",
  pink: "bg-[#e83eae] text-white",
  amber: "bg-[#f59e0b] text-neutral-900",
  green: "bg-[#16a34a] text-white",
  blue: "bg-[#3569e8] text-white",
};

const TAG_DOT_STYLES: Record<TagColor, string> = {
  red: "bg-[#ef3340]",
  pink: "bg-[#e83eae]",
  amber: "bg-[#f59e0b]",
  green: "bg-[#16a34a]",
  blue: "bg-[#3569e8]",
};

function initials(name: string) {
  return name.split(" ").slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function ThreadList({ selected, tags, onSelect }: { selected: string; tags: Record<string, ConversationTag[]>; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const items = useMemo(() => THREADS.filter((thread) => {
    const text = thread.parentName.toLocaleLowerCase("vi");
    return text.includes(search.toLocaleLowerCase("vi")) && (filter === "all" || (filter === "unread" ? thread.unread > 0 : thread.attention));
  }), [filter, search]);

  return (
    <aside className="flex min-h-0 w-full flex-col border-r border-neutral-200 bg-neutral-0" aria-label="Danh sách hội thoại">
      <div className="border-b border-neutral-200 px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold leading-7 tracking-[-.015em] text-neutral-900">Đoạn chat</h1>
          </div>
          <span className="flex size-9 items-center justify-center rounded-card bg-primary-50 text-primary-700" title="Messenger">
            <Facebook size={17} aria-hidden="true" />
          </span>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={17} aria-hidden="true" />
          <span className="sr-only">Tìm hội thoại</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm phụ huynh" className="min-h-11 w-full rounded-card border border-neutral-300 bg-neutral-50 pl-10 pr-3 text-sm text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:bg-neutral-0 focus:ring-2 focus:ring-primary-100" />
        </label>
        <div className="mt-3 flex gap-1.5 overflow-x-auto" aria-label="Lọc hội thoại">
          {FILTERS.map((item) => (
            <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={`min-h-9 shrink-0 rounded-card px-3 text-xs font-semibold transition-colors active:scale-[.98] ${filter === item.value ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {items.length ? items.map((thread) => (
          <button key={thread.id} type="button" onClick={() => onSelect(thread.id)} aria-current={selected === thread.id ? "true" : undefined} className={`flex min-h-[76px] w-full gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${selected === thread.id ? "bg-primary-50" : "hover:bg-neutral-50"}`}>
            <span className={`relative flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${thread.connected ? "bg-primary-100 text-primary-700" : "bg-neutral-100 text-neutral-500"}`}>
              {initials(thread.parentName)}
              {thread.connected && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-neutral-0 bg-success-500" aria-label="Đã kết nối" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <strong className="truncate text-sm font-semibold leading-5 text-neutral-900">{thread.parentName}</strong>
                <span className="shrink-0 text-2xs text-neutral-400">{thread.time}</span>
              </span>
              <span className={`mt-1 block truncate text-xs leading-5 ${thread.unread ? "font-semibold text-neutral-800" : "text-neutral-500"}`}>{thread.preview}</span>
              {!!tags[thread.id]?.length && (
                <span className="mt-1.5 flex flex-wrap gap-1" aria-label={`Tag của ${thread.parentName}`}>
                  {tags[thread.id].slice(0, 2).map((tag) => <span key={tag.label} className={`rounded px-1.5 py-0.5 text-3xs font-semibold leading-4 ${TAG_STYLES[tag.color]}`}>{tag.label}</span>)}
                  {tags[thread.id].length > 2 && <span className="px-1 py-0.5 text-3xs font-semibold text-neutral-500">+{tags[thread.id].length - 2}</span>}
                </span>
              )}
            </span>
            <span className="flex w-5 shrink-0 flex-col items-center justify-end gap-1.5">
              {thread.unread > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-primary-600 text-2xs font-bold text-white">{thread.unread}</span>}
              {thread.attention && <AlertTriangle size={15} className="text-warning-700" aria-label="Cần xử lý" />}
            </span>
          </button>
        )) : (
          <div className="px-6 py-16 text-center">
            <SlidersHorizontal className="mx-auto text-neutral-300" size={30} />
            <p className="mt-4 text-sm font-semibold text-neutral-700">Không có hội thoại phù hợp</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Thử đổi từ khóa hoặc bộ lọc.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function ContactDetails({ thread, tags, onRemoveTag, onManageTags }: { thread: Thread; tags: ConversationTag[]; onRemoveTag: (label: string) => void; onManageTags: () => void }) {
  return (
    <div className="text-sm">
      <div className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-100 text-base font-semibold text-primary-700">{initials(thread.parentName)}</span>
        <h2 className="mt-3 truncate text-base font-semibold leading-6 text-neutral-900">{thread.parentName}</h2>
      </div>
      <section className="mt-6 border-t border-neutral-200 pt-4">
        <h3 className="text-sm font-semibold text-neutral-900">Thông tin phụ huynh</h3>
        <dl className="mt-3 space-y-3">
          <div><dt className="text-xs font-medium text-neutral-500">Số điện thoại</dt><dd className="mt-1 font-semibold leading-5 text-neutral-800">{thread.phone}</dd></div>
          <div><dt className="text-xs font-medium text-neutral-500">Email</dt><dd className="mt-1 break-all font-semibold leading-5 text-neutral-800">{thread.email}</dd></div>
        </dl>
      </section>
      <section className="mt-5 border-t border-neutral-200 pt-4">
        <h3 className="text-sm font-semibold text-neutral-900">Học sinh đã đăng ký</h3>
        <dl className="mt-3 space-y-3">
          <div><dt className="text-xs font-medium text-neutral-500">Tên con</dt><dd className="mt-1 font-semibold leading-5 text-neutral-800">{thread.studentName}</dd></div>
          <div><dt className="text-xs font-medium text-neutral-500">Mã học sinh</dt><dd className="mt-1 font-semibold leading-5 text-neutral-800">{thread.studentCode}</dd></div>
          <div><dt className="text-xs font-medium text-neutral-500">Lớp học</dt><dd className="mt-1 font-semibold leading-5 text-neutral-800">{thread.className}</dd></div>
        </dl>
      </section>
      <section className="mt-5 border-t border-neutral-200 pt-4">
        <h3 className="text-sm font-semibold text-neutral-900">Tag hội thoại</h3>
        {tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button key={tag.label} type="button" onClick={() => onRemoveTag(tag.label)} aria-label={`Xóa tag ${tag.label}`} className={`flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-opacity hover:opacity-85 ${TAG_STYLES[tag.color]}`}>
                {tag.label}<X size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : <p className="mt-2 text-xs leading-5 text-neutral-500">Chưa có tag.</p>}
        <p className="mt-2 text-xs leading-5 text-neutral-500">Gắn tag nhanh tại thanh phía trên ô nhập tin nhắn.</p>
        <button type="button" onClick={onManageTags} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-card border border-neutral-300 bg-neutral-0 px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-[.99]"><SlidersHorizontal size={15} />Quản lý tag mẫu</button>
      </section>
      <section className="mt-5 border-t border-neutral-200 pt-4">
        <h3 className="text-sm font-semibold text-neutral-900">Kết nối</h3>
        <dl className="mt-3 space-y-3">
          <div><dt className="text-xs font-medium text-neutral-500">Messenger</dt><dd className="mt-1.5"><StatusBadge tone={thread.connected ? "success" : "warning"}>{thread.connected ? "Đã liên kết" : "Chưa liên kết"}</StatusBadge></dd></div>
          <div><dt className="text-xs font-medium text-neutral-500">Cửa sổ phản hồi</dt><dd className="mt-1 flex items-center gap-2 font-semibold text-success-700"><Clock3 size={15} /> Còn 21 giờ 14 phút</dd></div>
        </dl>
      </section>
    </div>
  );
}

function TagManager({ open, tags, onClose, onAdd, onRemove }: { open: boolean; tags: ConversationTag[]; onClose: () => void; onAdd: (tag: ConversationTag) => void; onRemove: (label: string) => void }) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagColor, setTagColor] = useState<TagColor>("blue");
  const filteredTags = tags.filter((tag) => tag.label.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const saveTag = (event: FormEvent) => {
    event.preventDefault();
    if (!tagInput.trim()) return;
    onAdd({ label: tagInput.trim(), color: tagColor });
    setTagInput("");
    setCreating(false);
  };

  return (
    <>
      <Modal open={open && !creating} onClose={onClose} title="Quản lý tag hội thoại" size="md">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} /><span className="sr-only">Tìm tag mẫu</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tag mẫu" className="min-h-11 w-full rounded-card border border-neutral-300 bg-neutral-0 pl-10 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100" /></label>
          <button type="button" onClick={() => setCreating(true)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-card bg-primary-600 px-3.5 text-sm font-semibold text-white transition hover:bg-primary-700 active:scale-[.98]"><Plus size={17} />Thêm tag</button>
        </div>
        <div className="mt-4 overflow-hidden rounded-card border border-neutral-200">
          <div className="grid grid-cols-[minmax(0,1fr)_56px] bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-600"><span>Tag hội thoại</span><span className="text-center">Xóa</span></div>
          {filteredTags.length ? <div className="divide-y divide-neutral-200">{filteredTags.map((tag) => (
            <div key={tag.label} className="grid min-h-12 grid-cols-[minmax(0,1fr)_56px] items-center px-4 py-2">
              <span className="flex items-center gap-2 text-sm font-medium text-neutral-700"><span className={`size-2 rounded-full ${TAG_DOT_STYLES[tag.color]}`} />{tag.label}</span>
              <button type="button" onClick={() => onRemove(tag.label)} aria-label={`Xóa tag mẫu ${tag.label}`} className="mx-auto flex size-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-danger-50 hover:text-danger-700"><Trash2 size={16} /></button>
            </div>
          ))}</div> : <p className="px-4 py-8 text-center text-sm text-neutral-500">Không tìm thấy tag phù hợp.</p>}
        </div>
      </Modal>
      <Modal open={open && creating} onClose={() => setCreating(false)} title="Thêm tag mẫu" size="sm">
        <form onSubmit={saveTag}>
          <label className="block text-sm font-medium text-neutral-700">Tên tag<input value={tagInput} onChange={(event) => setTagInput(event.target.value)} maxLength={24} autoFocus placeholder="Nhập tên tag" className="mt-2 min-h-11 w-full rounded-card border border-neutral-300 bg-neutral-0 px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100" /></label>
          <fieldset className="mt-5"><legend className="text-sm font-medium text-neutral-700">Màu tag</legend><div className="mt-2 flex gap-1">{TAG_COLORS.map((color) => (
            <button key={color.value} type="button" onClick={() => setTagColor(color.value)} aria-label={`Chọn màu ${color.label}`} aria-pressed={tagColor === color.value} className={`flex size-10 items-center justify-center rounded-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${tagColor === color.value ? "bg-neutral-100 ring-1 ring-neutral-300" : "hover:bg-neutral-100"}`}><span className={`size-6 rounded-md ${color.swatch}`} /></button>
          ))}</div></fieldset>
          <div className="mt-5 border-t border-neutral-200 pt-4"><span className="text-xs font-medium text-neutral-500">Xem trước</span><div className="mt-2"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TAG_STYLES[tagColor]}`}>{tagInput.trim() || "Tên tag"}</span></div></div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setCreating(false)} className="min-h-10 rounded-card border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Hủy</button><button type="submit" disabled={!tagInput.trim()} className="min-h-10 rounded-card bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 active:scale-[.98] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400">Lưu tag</button></div>
        </form>
      </Modal>
    </>
  );
}

function Conversation({ thread, messages, tagCatalog, tags, onBack, onInfo, onSend, onToggleTag, onManageTags }: { thread: Thread; messages: Message[]; tagCatalog: ConversationTag[]; tags: ConversationTag[]; onBack: () => void; onInfo: () => void; onSend: (text: string) => void; onToggleTag: (tag: ConversationTag) => void; onManageTags: () => void }) {
  const [draft, setDraft] = useState("");
  const sendDraft = () => {
    if (!draft.trim() || !thread.connected) return;
    onSend(draft.trim());
    setDraft("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    sendDraft();
  };
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    sendDraft();
  };
  return (
    <section className="flex min-h-0 min-w-0 w-full flex-col bg-neutral-0" aria-label={`Hội thoại với ${thread.parentName}`}>
      <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-0 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Quay lại danh sách" className="icon-button flex lg:hidden"><ArrowLeft size={19} /></button>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">{initials(thread.parentName)}</span>
          <h1 className="truncate text-base font-semibold leading-6 text-neutral-900">{thread.parentName}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge tone={thread.connected ? "success" : "warning"}>{thread.connected ? "Đã kết nối" : "Chưa liên kết"}</StatusBadge>
          <button type="button" onClick={onInfo} className="icon-button flex xl:hidden" aria-label="Xem thông tin"><Info size={19} /></button>
        </div>
      </header>
      {!thread.connected && <div className="flex gap-2.5 border-b border-warning-100 bg-warning-50 px-4 py-3 text-xs leading-5 text-warning-900 sm:px-5"><WifiOff className="mt-0.5 shrink-0" size={16} />Phụ huynh chưa liên kết Messenger. Chức năng gửi đang bị khóa.</div>}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="w-full">
          <p className="mb-4 text-center text-xs font-medium text-neutral-400">Hôm nay</p>
          {messages.length ? messages.map((message, index) => {
            const inbound = message.direction === "inbound";
            const groupedWithPrevious = messages[index - 1]?.direction === message.direction;
            const showAvatar = inbound && messages[index + 1]?.direction !== "inbound";
            return (
              <div key={message.id} className={`${index === 0 ? "" : groupedWithPrevious ? "mt-0.5" : "mt-3"} flex items-end ${inbound ? "justify-start gap-2" : "justify-end"}`}>
                {inbound && (
                  <span aria-label={showAvatar ? `Ảnh đại diện ${thread.parentName}` : undefined} aria-hidden={!showAvatar} className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-4xs font-semibold text-primary-700 ${showAvatar ? "" : "invisible"}`}>
                    {initials(thread.parentName)}
                  </span>
                )}
                <div className={`flex min-w-0 max-w-[80%] flex-col sm:max-w-[70%] ${inbound ? "items-start" : "items-end"}`}>
                  <div title={`Gửi lúc ${message.time}`} className={`break-words rounded-[18px] px-3.5 py-2.5 text-sm leading-5 ${inbound ? "bg-neutral-100 text-neutral-800" : "bg-primary-600 text-white"}`}>
                    <p>{message.text}</p>
                    <span className="sr-only">Gửi lúc {message.time}</span>
                  </div>
                  {message.status === "failed" && <span className="mt-1 flex items-center gap-1 text-2xs text-danger-700"><FileWarning size={12} /> Gửi thất bại</span>}
                </div>
              </div>
            );
          }) : <div className="py-20 text-center"><MessageCircle className="mx-auto text-neutral-300" size={38} /><p className="mt-4 text-sm font-semibold text-neutral-700">Chưa có tin nhắn</p><p className="mt-1 text-xs leading-5 text-neutral-500">Hãy bắt đầu cuộc trò chuyện với phụ huynh.</p></div>}
        </div>
      </div>
      <div className="shrink-0 border-t border-neutral-100 bg-neutral-0 px-4 pt-2" aria-label="Tag mẫu trên Composer">
          <div className="mx-auto flex max-w-[760px] items-center gap-1.5 overflow-x-auto pb-0.5">
            {tagCatalog.map((tag) => {
              const selected = tags.some((item) => item.label === tag.label);
              return <button key={tag.label} type="button" onClick={() => onToggleTag(tag)} aria-pressed={selected} aria-label={`${selected ? "Bỏ" : "Gắn"} tag ${tag.label}`} className={`flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition active:scale-[.97] ${selected ? `${TAG_STYLES[tag.color]} border-transparent` : "border-neutral-300 bg-neutral-0 text-neutral-600 hover:bg-neutral-50"}`}>
                {!selected && <span className={`size-2 rounded-full ${TAG_DOT_STYLES[tag.color]}`} aria-hidden="true" />}
                {tag.label}
              </button>;
            })}
            <button type="button" onClick={onManageTags} aria-label="Quản lý tag mẫu" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-neutral-0 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-800"><SlidersHorizontal size={14} /></button>
          </div>
        </div>
      <form onSubmit={submit} className="shrink-0 bg-neutral-0 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <div className="mx-auto flex max-w-[760px] items-end gap-2">
          <label className="min-w-0 flex-1 rounded-[20px] bg-neutral-100 px-4"><span className="sr-only">Soạn tin nhắn</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} aria-describedby="chat-composer-help" rows={1} maxLength={2000} disabled={!thread.connected} placeholder={thread.connected ? "Aa" : "Chưa thể gửi tin nhắn"} className="max-h-28 min-h-11 w-full resize-none overflow-y-auto bg-transparent py-2.5 text-sm leading-6 text-neutral-800 outline-none [field-sizing:content] placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed" /></label>
          <button type="submit" disabled={!draft.trim() || !thread.connected} aria-label="Gửi tin nhắn demo" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-transparent text-primary-600 transition-colors hover:bg-primary-50 active:scale-[.97] disabled:cursor-not-allowed disabled:text-neutral-300"><Send size={20} /></button>
        </div>
        <span id="chat-composer-help" className="sr-only">Nhấn Enter để gửi. Nhấn Shift và Enter để xuống dòng.</span>
      </form>
    </section>
  );
}

export default function ChatDemoPage() {
  const [selected, setSelected] = useState(THREADS[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [tagCatalog, setTagCatalog] = useState<ConversationTag[]>([
    { label: "Đặt trước", color: "blue" },
    { label: "Khách lẻ", color: "pink" },
    { label: "Chưa mua", color: "red" },
    { label: "Đã mua", color: "green" },
    { label: "Khách hàng mới", color: "amber" },
  ]);
  const [tags, setTags] = useState<Record<string, ConversationTag[]>>({
    t1: [{ label: "Chưa mua", color: "red" }, { label: "Khách lẻ", color: "pink" }],
    t3: [{ label: "Khách hàng mới", color: "amber" }],
  });
  const thread = THREADS.find((item) => item.id === selected) ?? THREADS[0];
  const openTagManager = () => { setInfoOpen(false); setTagManagerOpen(true); };
  const send = (text: string) => setMessages((current) => ({ ...current, [thread.id]: [...(current[thread.id] ?? []), { id: `demo-${Date.now()}`, direction: "outbound", text, time: "Bây giờ", status: "sent" }] }));
  const toggleTag = (tag: ConversationTag) => setTags((current) => {
    const threadTags = current[thread.id] ?? [];
    const exists = threadTags.some((item) => item.label === tag.label);
    return { ...current, [thread.id]: exists ? threadTags.filter((item) => item.label !== tag.label) : [tag, ...threadTags] };
  });
  const removeTag = (label: string) => setTags((current) => ({ ...current, [thread.id]: (current[thread.id] ?? []).filter((item) => item.label !== label) }));
  const addCatalogTag = (tag: ConversationTag) => setTagCatalog((current) => current.some((item) => item.label.toLocaleLowerCase("vi") === tag.label.toLocaleLowerCase("vi")) ? current : [...current, tag]);
  const removeCatalogTag = (label: string) => {
    setTagCatalog((current) => current.filter((item) => item.label !== label));
    setTags((current) => Object.fromEntries(Object.entries(current).map(([id, threadTags]) => [id, threadTags.filter((item) => item.label !== label)])));
  };

  return (
    <>
      <div className="grid h-[calc(100dvh-112px)] min-h-[620px] overflow-hidden border border-neutral-200 bg-neutral-0 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_288px]">
          <div className={`${mobileOpen ? "hidden" : "flex"} min-h-0 min-w-0 lg:flex`}><ThreadList selected={selected} tags={tags} onSelect={(id) => { setSelected(id); setMobileOpen(true); }} /></div>
          <div className={`${mobileOpen ? "flex" : "hidden"} min-h-0 min-w-0 lg:flex`}><Conversation thread={thread} messages={messages[thread.id] ?? []} tagCatalog={tagCatalog} tags={tags[thread.id] ?? []} onBack={() => setMobileOpen(false)} onInfo={() => setInfoOpen(true)} onSend={send} onToggleTag={toggleTag} onManageTags={openTagManager} /></div>
          <aside className="hidden min-h-0 overflow-y-auto border-l border-neutral-200 bg-neutral-0 p-5 xl:block"><ContactDetails thread={thread} tags={tags[thread.id] ?? []} onRemoveTag={removeTag} onManageTags={openTagManager} /></aside>
      </div>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Thông tin hội thoại" size="sm"><ContactDetails thread={thread} tags={tags[thread.id] ?? []} onRemoveTag={removeTag} onManageTags={openTagManager} /></Modal>
      <TagManager open={tagManagerOpen} tags={tagCatalog} onClose={() => setTagManagerOpen(false)} onAdd={addCatalogTag} onRemove={removeCatalogTag} />
    </>
  );
}
