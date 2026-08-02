import { useEffect, useRef, useState } from "react";
import {
  Accessibility,
  Activity,
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  CircleGauge,
  Layers3,
  LoaderCircle,
  Monitor,
  MousePointer2,
  Pause,
  PanelTopOpen,
  Play,
  RefreshCw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tab, Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useToast } from "@/components/feedback/toastContext";

type DemoTab = "motion" | "interaction" | "feedback";
type FeedbackState = "ready" | "loading" | "success" | "empty" | "error";
type DemoMotionMode = "full" | "reduced";

const MOTION_SPECS = [
  { label: "Phản hồi", value: "150ms", hint: "Hover · Press · Focus" },
  { label: "Nội dung", value: "250ms", hint: "Tab · Route · Filter" },
  { label: "Lớp phủ", value: "300ms", hint: "Modal · Drawer · Toast" },
];

const STUDENTS = [
  { id: "hs-142", name: "Nguyễn Minh Khôi", progress: 84, status: "Đúng tiến độ" },
  { id: "hs-087", name: "Trần Gia Hân", progress: 71, status: "Cần theo dõi" },
  { id: "hs-219", name: "Lê Hoàng Nam", progress: 92, status: "Vượt mục tiêu" },
];

const systemPrefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="max-w-2xl">
      <p className="text-2xs font-bold uppercase tracking-[0.16em] text-primary-600">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-neutral-950 sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
    </header>
  );
}

function MotionPreview() {
  return (
    <div className="motion-demo-stage relative min-h-[290px] overflow-hidden rounded-[24px] border border-white/10 bg-neutral-900 p-5 text-white shadow-[var(--shadow-3)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.18em] text-primary-300">Live transition</p>
          <p className="mt-1 text-sm font-semibold text-white">Điều hướng giữ nguyên ngữ cảnh</p>
        </div>
        <span className="motion-demo-live inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-2xs font-semibold text-neutral-200">
          <span className="size-1.5 rounded-full bg-success-300" />60 FPS
        </span>
      </div>

      <div className="mt-8 grid grid-cols-[48px_minmax(0,1fr)] gap-4">
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[.04] p-2">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className={`block h-9 rounded-xl ${item === 1 ? "bg-primary-500" : "bg-white/[.06]"}`} />
          ))}
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] p-4">
          <div className="motion-demo-scan absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="relative space-y-3">
            <div className="h-3 w-28 rounded-full bg-white/75" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 rounded-xl bg-primary-400/20 ring-1 ring-inset ring-primary-300/20" />
              <div className="h-16 rounded-xl bg-success-300/10 ring-1 ring-inset ring-success-300/20" />
            </div>
            <div className="space-y-2 rounded-xl bg-neutral-950/35 p-3">
              {[82, 64, 74].map((width) => <div key={width} className="h-2 rounded-full bg-white/15" style={{ width: `${width}%` }} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-2xs text-neutral-400">
        <CircleGauge size={14} aria-hidden="true" />Chỉ transform và opacity trên compositor
      </div>
    </div>
  );
}

function MotionLab({ paused, onTogglePaused }: { paused: boolean; onTogglePaused: () => void }) {
  const [activeCard, setActiveCard] = useState(0);
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading eyebrow="01 · Motion language" title="Một nhịp chuyển động cho toàn hệ thống" description="Mỗi hiệu ứng đều giải thích quan hệ nguyên nhân–kết quả và có thể bị ngắt ngay khi người dùng thao tác tiếp." />
        <button type="button" role="switch" aria-checked={!paused} onClick={onTogglePaused} className="motion-control inline-flex min-h-touch shrink-0 items-center gap-3 self-start rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 shadow-[var(--shadow-1)]">
          <span className={`relative h-6 w-11 rounded-full transition-colors ${paused ? "bg-neutral-200" : "bg-primary-500"}`}>
            <span className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${paused ? "translate-x-1" : "translate-x-6"}`} />
          </span>
          {paused ? "Motion đang tạm dừng" : "Motion đang hoạt động"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="motion-demo-stagger rounded-[24px] border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)] sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-neutral-900">Spatial continuity</p>
              <p className="mt-1 text-xs text-neutral-500">Chọn một module để xem indicator và nội dung phối hợp.</p>
            </div>
            <StatusBadge tone="success">Có thể tương tác</StatusBadge>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {["Tổng quan", "Lớp học", "Điểm danh"].map((label, index) => (
              <button key={label} type="button" onClick={() => setActiveCard(index)} className={`motion-control relative min-h-touch overflow-hidden rounded-xl border px-4 py-3 text-left text-sm font-semibold ${activeCard === index ? "border-primary-200 bg-primary-50 text-primary-800" : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-white"}`}>
                {label}
                {activeCard === index && <span className="motion-tab-indicator absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary-500" />}
              </button>
            ))}
          </div>
          <div key={activeCard} className="motion-content-enter mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-100 text-primary-700"><Layers3 size={18} /></span>
              <div><p className="text-sm font-bold text-neutral-900">{["Tổng quan vận hành", "Danh sách lớp học", "Điểm danh hôm nay"][activeCard]}</p><p className="text-xs text-neutral-500">Nội dung mới vào 250ms, vùng điều hướng đứng yên.</p></div>
            </div>
            <div className="mt-5 grid grid-cols-[1fr_.55fr] gap-3">
              <div className="h-20 rounded-xl bg-white ring-1 ring-neutral-200" />
              <div className="h-20 rounded-xl bg-primary-100/60 ring-1 ring-primary-100" />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-neutral-200 bg-neutral-50 p-5 sm:p-7">
          <p className="text-sm font-bold text-neutral-900">Motion tokens</p>
          <div className="mt-5 divide-y divide-neutral-200">
            {MOTION_SPECS.map((spec, index) => (
              <div key={spec.label} className="motion-demo-token flex items-center justify-between gap-4 py-4" style={{ animationDelay: `${index * 60}ms` }}>
                <div><p className="text-sm font-semibold text-neutral-800">{spec.label}</p><p className="text-xs text-neutral-500">{spec.hint}</p></div>
                <span className="font-mono text-sm font-bold tabular-nums text-primary-700">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InteractionLab({ autoPlay = false }: { autoPlay?: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [students, setStudents] = useState(STUDENTS);
  const { showToast } = useToast();

  const reorder = () => setStudents((current) => [...current.slice(1), current[0]]);

  useEffect(() => {
    if (!autoPlay) return;
    setModalOpen(true);
    const timer = window.setTimeout(() => setModalOpen(false), 1100);
    return () => window.clearTimeout(timer);
  }, [autoPlay]);

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="02 · Interaction lab" title="Phản hồi rõ cho từng thao tác" description="Press state xuất hiện tức thời, panel giữ quan hệ không gian và mọi tương tác đều dùng được bằng bàn phím." />
      <div className="grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
        <section className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)] sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-neutral-900">Popup & action</p><p className="mt-1 text-xs leading-5 text-neutral-500">Scale nhẹ trên desktop, bottom sheet trên mobile.</p></div><PanelTopOpen size={19} className="text-primary-600" /></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Button variant="primary" icon={<WandSparkles size={16} />} onClick={() => setModalOpen(true)}>Mở popup</Button>
            <Button icon={<BellRing size={16} />} onClick={() => showToast({ tone: "success", title: "Đã lưu thay đổi", description: "Toast tự đóng sau 3,2 giây và không chiếm focus." })}>Hiện toast</Button>
          </div>
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="motion-control mt-6 flex min-h-touch w-full items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-left text-sm font-semibold text-neutral-800">
            Chi tiết chuyển động
            <ChevronDown size={17} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <div className={`grid transition-[grid-template-rows] duration-fast ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden"><p className="px-4 pt-3 text-xs leading-5 text-neutral-500">Modal khóa scroll, cô lập nền bằng inert, giữ focus bên trong và trả focus về nút mở khi đóng.</p></div>
          </div>
        </section>

        <section className="rounded-[24px] border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)] sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-neutral-900">Danh sách có thay đổi trạng thái</p><p className="mt-1 text-xs text-neutral-500">Stagger ngắn, không làm chậm danh sách dài.</p></div><Button size="sm" icon={<RefreshCw size={15} />} onClick={reorder}>Đổi thứ tự</Button></div>
          <div key={students[0].id} className="motion-demo-list mt-5 space-y-2">
            {students.map((student, index) => (
              <div key={student.id} className="motion-demo-list-item grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3" style={{ animationDelay: `${index * 45}ms` }}>
                <span className="grid size-9 place-items-center rounded-lg bg-white text-xs font-bold text-primary-700 ring-1 ring-neutral-200">{student.name.split(" ").slice(-1)[0]?.charAt(0)}</span>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900">{student.name}</p><p className="text-xs text-neutral-500">{student.status}</p></div>
                <span className="font-mono text-xs font-bold tabular-nums text-neutral-700">{student.progress}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tạo thông báo lớp học" description="Demo vòng đời đầy đủ của một popup thao tác." size="sm">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setModalOpen(false); showToast({ tone: "success", title: "Đã tạo thông báo", description: "Phụ huynh sẽ nhận thông báo theo lịch gửi." }); }}>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-neutral-800">Tiêu đề</span><input required defaultValue="Nhắc lịch học bù" className="min-h-touch w-full px-3" /><span className="mt-1.5 block text-xs text-neutral-500">Nội dung ngắn, mô tả đúng hành động cần thực hiện.</span></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-neutral-800">Nội dung</span><textarea required rows={4} defaultValue="Lớp sẽ học bù vào 18:30 thứ Bảy tuần này." className="w-full px-3 py-2" /></label>
          <div className="flex justify-end gap-2 pt-2"><Button onClick={() => setModalOpen(false)}>Hủy</Button><Button type="submit" variant="primary" icon={<Check size={16} />}>Tạo thông báo</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function FeedbackLab({ autoPlay = false }: { autoPlay?: boolean }) {
  const [state, setState] = useState<FeedbackState>("ready");

  useEffect(() => {
    if (autoPlay) setState("loading");
  }, [autoPlay]);

  useEffect(() => {
    if (state !== "loading") return;
    const timer = window.setTimeout(() => setState("success"), 1400);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="03 · System feedback" title="Không để người dùng phải đoán" description="Loading giữ cấu trúc, thành công xác nhận kết quả, empty state hướng dẫn bước tiếp theo và lỗi luôn có đường phục hồi." />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn trạng thái phản hồi">
        {(["ready", "loading", "success", "empty", "error"] as FeedbackState[]).map((item) => (
          <button key={item} type="button" onClick={() => setState(item)} className={`motion-control min-h-touch rounded-full border px-4 text-xs font-bold ${state === item ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200 bg-white text-neutral-600"}`}>
            {{ ready: "Sẵn sàng", loading: "Đang tải", success: "Thành công", empty: "Trống", error: "Lỗi" }[item]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <section className="min-h-[330px] rounded-[24px] border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)] sm:p-7">
          <div className="flex items-center justify-between"><div><p className="text-sm font-bold text-neutral-900">Kết quả đồng bộ</p><p className="mt-1 text-xs text-neutral-500">Khu vực phản hồi giữ nguyên kích thước giữa các trạng thái.</p></div>{state === "loading" && <LoaderCircle className="animate-spin text-primary-600" size={19} />}</div>
          <div key={state} className="motion-content-enter mt-6">
            {state === "ready" && <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-primary-700 shadow-[var(--shadow-1)]"><Play size={20} /></span><p className="mt-4 text-sm font-bold text-neutral-900">Sẵn sàng chạy mô phỏng</p><p className="mt-1 text-xs text-neutral-500">Chọn “Đang tải” để xem toàn bộ chu kỳ.</p></div></div>}
            {state === "loading" && <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="h-20 rounded-xl border border-neutral-200 bg-neutral-50 p-4"><LoadingSkeleton rows={2} /></div><div className="h-20 rounded-xl border border-neutral-200 bg-neutral-50 p-4"><LoadingSkeleton rows={2} /></div></div><div className="rounded-xl border border-neutral-200 p-4"><LoadingSkeleton rows={6} /></div></div>}
            {state === "success" && <div className="grid min-h-[220px] place-items-center rounded-2xl border border-success-100 bg-success-50 text-center"><div><span className="motion-demo-success mx-auto grid size-12 place-items-center rounded-full bg-success-500 text-white"><Check size={22} /></span><p className="mt-4 text-sm font-bold text-success-900">Đồng bộ hoàn tất</p><p className="mt-1 text-xs text-success-700">12 lớp và 286 học sinh đã được cập nhật.</p></div></div>}
            {state === "empty" && <EmptyState title="Chưa có dữ liệu trong khoảng này" description="Thay đổi bộ lọc hoặc tạo buổi học đầu tiên để bắt đầu." action={<Button className="mt-3" variant="primary">Tạo buổi học</Button>} />}
            {state === "error" && <ErrorState message="Kết nối bị gián đoạn. Dữ liệu trên màn hình vẫn được giữ nguyên." onRetry={() => setState("loading")} />}
          </div>
        </section>

        <aside className="rounded-[24px] border border-neutral-200 bg-neutral-900 p-5 text-white shadow-[var(--shadow-2)] sm:p-7">
          <p className="text-2xs font-bold uppercase tracking-[0.16em] text-primary-300">Checklist</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Tiêu chuẩn nghiệm thu</h3>
          <ul className="mt-6 space-y-4">
            {["Phản hồi dưới 100ms", "Không layout shift", "Có reduced motion", "Focus không bị thất lạc", "Loading có ngữ cảnh"].map((item, index) => (
              <li key={item} className="motion-demo-check flex items-center gap-3 text-sm text-neutral-200" style={{ animationDelay: `${index * 65}ms` }}><span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-300/15 text-success-300"><Check size={13} /></span>{item}</li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default function MotionDemoPage() {
  const [tab, setTab] = useState<DemoTab>("motion");
  const [paused, setPaused] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [motionMode, setMotionMode] = useState<DemoMotionMode>(() => systemPrefersReducedMotion() ? "reduced" : "full");
  const [systemReduced, setSystemReduced] = useState(systemPrefersReducedMotion);
  const [autoTour, setAutoTour] = useState(false);
  const tourTimers = useRef<number[]>([]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.demoMotion = motionMode;
    return () => { delete document.documentElement.dataset.demoMotion; };
  }, [motionMode]);

  useEffect(() => () => tourTimers.current.forEach(window.clearTimeout), []);

  const replay = () => {
    setAutoTour(false);
    tourTimers.current.forEach(window.clearTimeout);
    tourTimers.current = [];
    setReplayKey((value) => value + 1);
  };

  const toggleAutoTour = () => {
    tourTimers.current.forEach(window.clearTimeout);
    tourTimers.current = [];
    if (autoTour) {
      setAutoTour(false);
      return;
    }
    setPaused(false);
    setAutoTour(true);
    setTab("motion");
    setReplayKey((value) => value + 1);
    tourTimers.current = [
      window.setTimeout(() => setTab("interaction"), 1900),
      window.setTimeout(() => setTab("feedback"), 4100),
      window.setTimeout(() => setAutoTour(false), 6500),
    ];
  };

  return (
    <div data-motion-mode={motionMode} data-auto-tour={autoTour} className={`motion-demo mx-auto min-h-[100dvh] max-w-[1400px] px-4 py-4 pb-16 sm:px-6 sm:py-6 ${paused ? "motion-demo-paused" : ""}`}>
      <section aria-label="Điều khiển bản demo" className="relative mb-4 flex flex-col gap-4 overflow-hidden rounded-[20px] border border-neutral-200 bg-neutral-950 p-4 text-white shadow-[var(--shadow-2)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-500/20 text-primary-200"><Activity size={19} /></span>
          <div className="min-w-0"><p className="text-sm font-bold">Motion control center</p><p className="mt-0.5 text-xs text-neutral-400">Replay từng cảnh hoặc chạy tour 6,5 giây.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-2xs font-bold ${systemReduced ? "border-warning-300/30 bg-warning-300/10 text-warning-200" : "border-success-300/25 bg-success-300/10 text-success-200"}`}><Monitor size={14} />Hệ điều hành: {systemReduced ? "Reduced motion" : "Normal motion"}</span>
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1" role="group" aria-label="Chế độ chuyển động demo">
            <button type="button" aria-pressed={motionMode === "full"} onClick={() => setMotionMode("full")} className={`min-h-9 rounded-full px-3 text-xs font-bold transition-colors ${motionMode === "full" ? "bg-white text-neutral-950" : "text-neutral-300 hover:text-white"}`}>Normal</button>
            <button type="button" aria-pressed={motionMode === "reduced"} onClick={() => setMotionMode("reduced")} className={`min-h-9 rounded-full px-3 text-xs font-bold transition-colors ${motionMode === "reduced" ? "bg-white text-neutral-950" : "text-neutral-300 hover:text-white"}`}><Accessibility className="mr-1.5 inline" size={14} />Reduced</button>
          </div>
          <Button size="sm" icon={<RefreshCw size={15} />} onClick={replay}>Replay cảnh</Button>
          <Button size="sm" variant="primary" icon={autoTour ? <Pause size={15} /> : <Play size={15} />} onClick={toggleAutoTour}>{autoTour ? "Dừng Auto Tour" : "Chạy Auto Tour"}</Button>
        </div>
        {autoTour && <span className="motion-demo-tour-progress absolute inset-x-0 bottom-0 h-1 origin-left bg-primary-400" aria-hidden="true" />}
      </section>

      <section key={`hero-${replayKey}`} className="grid items-center gap-7 overflow-hidden rounded-[28px] border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)] sm:p-8 lg:grid-cols-[.92fr_1.08fr] lg:p-10">
        <div className="motion-demo-hero-copy">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-2xs font-bold uppercase tracking-[0.12em] text-primary-700"><Sparkles size={14} />Edumatrix Motion System</div>
          <h1 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.035em] text-neutral-950 sm:text-4xl lg:text-[44px] lg:leading-[1.08]">Animation rõ nguyên nhân, mượt trong từng thao tác.</h1>
          <p className="mt-4 max-w-[60ch] text-sm leading-6 text-neutral-600 sm:text-base">Bản demo chuẩn để duyệt cảm giác chuyển động trước khi áp dụng sâu vào các module nghiệp vụ.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button variant="primary" icon={<MousePointer2 size={16} />} onClick={() => document.getElementById("motion-lab")?.scrollIntoView({ block: "start" })}>Bắt đầu trải nghiệm</Button><span className="inline-flex min-h-touch items-center gap-2 rounded-input px-2 text-xs font-semibold text-neutral-500"><Activity size={16} className="text-success-600" />CSS native · Zero dependency</span></div>
        </div>
        <MotionPreview />
      </section>

      <div id="motion-lab" className="mt-8 scroll-mt-24">
        <Tabs label="Các nhóm animation" className="sticky top-16 z-10 -mx-3 bg-neutral-50/90 px-3 backdrop-blur sm:mx-0 sm:rounded-t-card sm:border-x sm:border-t sm:border-neutral-200 sm:bg-white/90">
          <Tab active={tab === "motion"} onClick={() => setTab("motion")}><CircleGauge size={16} />Motion system</Tab>
          <Tab active={tab === "interaction"} onClick={() => setTab("interaction")}><MousePointer2 size={16} />Tương tác</Tab>
          <Tab active={tab === "feedback"} onClick={() => setTab("feedback")}><BellRing size={16} />Phản hồi hệ thống</Tab>
        </Tabs>
      </div>

      <div key={`${tab}-${replayKey}`} className="motion-content-enter mt-8">
        {tab === "motion" && <MotionLab paused={paused} onTogglePaused={() => setPaused((value) => !value)} />}
        {tab === "interaction" && <InteractionLab autoPlay={autoTour} />}
        {tab === "feedback" && <FeedbackLab autoPlay={autoTour} />}
      </div>

      <footer className="mt-12 flex flex-col gap-4 border-t border-neutral-200 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between"><span>Demo dùng chung token với giao diện thật.</span><span className="inline-flex items-center gap-2 font-semibold text-neutral-700">Sẵn sàng áp dụng <ArrowRight size={14} /></span></footer>
    </div>
  );
}
