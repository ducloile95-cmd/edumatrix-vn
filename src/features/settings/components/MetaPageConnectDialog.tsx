import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Facebook, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  getMetaPageConnectionStatus,
  selectMetaPage,
  startMetaPageConnection,
  type MetaConnectSession,
  type MetaManagedPageSummary,
} from "@/services/integrations/messenger";

type Step = "intro" | "waiting" | "select" | "saving" | "done";

interface MetaPageConnectDialogProps {
  open: boolean;
  onClose: () => void;
  onConnected: (page: MetaManagedPageSummary) => void;
}

export function MetaPageConnectDialog({ open, onClose, onConnected }: MetaPageConnectDialogProps) {
  const [step, setStep] = useState<Step>("intro");
  const [session, setSession] = useState<MetaConnectSession | null>(null);
  const [pages, setPages] = useState<MetaManagedPageSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("intro");
    setSession(null);
    setPages([]);
    setSelectedId("");
    setError("");
  }, [open]);

  const selectedPage = useMemo(() => pages.find((page) => page.id === selectedId) ?? null, [pages, selectedId]);

  const refreshStatus = useCallback(async (currentSession: MetaConnectSession) => {
    try {
      const result = await getMetaPageConnectionStatus(currentSession.state);
      if (result.status === "failed") throw new Error(result.error || "Facebook chưa cấp quyền.");
      if (result.status === "ready") {
        setPages(result.pages);
        setSelectedId(result.pages.length === 1 ? result.pages[0].id : "");
        setStep("select");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không kiểm tra được trạng thái kết nối.");
    }
  }, []);

  useEffect(() => {
    if (!open || step !== "waiting" || !session) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "edumatrix-meta-connect" || event.data?.state !== session.state) return;
      void refreshStatus(session);
    };
    window.addEventListener("message", onMessage);
    const timer = window.setInterval(() => void refreshStatus(session), 2_500);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };
  }, [open, refreshStatus, session, step]);

  async function begin() {
    setError("");
    try {
      const nextSession = await startMetaPageConnection();
      const popup = window.open(nextSession.authorizationUrl, "edumatrix-meta-connect", "popup,width=620,height=760");
      if (!popup) throw new Error("Trình duyệt đang chặn cửa sổ Facebook. Hãy cho phép popup rồi thử lại.");
      setSession(nextSession);
      setStep("waiting");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể mở kết nối Facebook.");
    }
  }

  async function confirmPage() {
    if (!session || !selectedPage) return;
    setStep("saving");
    setError("");
    try {
      const result = await selectMetaPage(session.state, selectedPage.id);
      onConnected(result.page);
      setStep("done");
    } catch (reason) {
      setStep("select");
      setError(reason instanceof Error ? reason.message : "Không thể lưu Fanpage.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Kết nối Fanpage Facebook"
      description="Đăng nhập Facebook, cấp quyền cho EduMatrix và chọn đúng Trang cần quản lý."
    >
      <div className="grid gap-5 md:grid-cols-[180px_1fr]">
        <ol className="space-y-2" aria-label="Các bước kết nối">
          {[
            ["1", "Đăng nhập Facebook", ["intro", "waiting"].includes(step)],
            ["2", "Chọn Fanpage", step === "select"],
            ["3", "Hoàn tất", ["saving", "done"].includes(step)],
          ].map(([number, label, active]) => (
            <li key={String(number)} className={`flex items-center gap-2.5 rounded-input px-3 py-2.5 text-xs font-semibold ${active ? "bg-primary-50 text-primary-800" : "text-neutral-500"}`}>
              <span className={`flex size-6 items-center justify-center rounded-full text-2xs font-bold ${active ? "bg-primary-700 text-white" : "bg-neutral-100 text-neutral-500"}`}>{number}</span>
              {label}
            </li>
          ))}
        </ol>

        <section className="min-h-[300px] rounded-card border border-neutral-200 bg-white p-5">
          {step === "intro" && (
            <>
              <span className="flex size-12 items-center justify-center rounded-input bg-[#1877F2] text-white"><Facebook size={24} /></span>
              <h3 className="mt-4 text-base font-bold text-neutral-900">Tiếp tục bằng tài khoản Facebook</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-600">Facebook sẽ hỏi tài khoản nào được dùng và những Fanpage anh đang quản lý. EduMatrix không lưu mật khẩu Facebook.</p>
              <div className="mt-4 flex gap-2 rounded-input border border-success-100 bg-success-50 px-3 py-3 text-xs leading-5 text-success-800">
                <ShieldCheck className="mt-0.5 shrink-0" size={17} />
                Page Access Token được Worker mã hóa và lưu ở vùng riêng mà frontend không thể đọc.
              </div>
              <Button className="mt-5" variant="primary" onClick={() => void begin()} icon={<Facebook size={16} />}>Tiếp tục với Facebook</Button>
            </>
          )}

          {step === "waiting" && (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <LoaderCircle className="animate-spin text-primary-700" size={30} />
              <h3 className="mt-4 text-sm font-bold text-neutral-900">Đang chờ Facebook xác nhận</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">Hoàn tất hộp thoại Facebook vừa mở. Sau đó danh sách Fanpage sẽ tự xuất hiện tại đây.</p>
              <Button className="mt-4" size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={() => session && void refreshStatus(session)}>Kiểm tra lại</Button>
            </div>
          )}

          {step === "select" && (
            <>
              <h3 className="text-sm font-bold text-neutral-900">Chọn Fanpage sử dụng với EduMatrix</h3>
              <p className="mt-1 text-xs leading-5 text-neutral-500">Chỉ một Trang được dùng để nhận webhook và gửi Messenger tại một thời điểm.</p>
              <div className="mt-4 space-y-2">
                {pages.map((page) => (
                  <button
                    type="button"
                    key={page.id}
                    onClick={() => setSelectedId(page.id)}
                    className={`flex w-full items-center gap-3 rounded-input border p-3 text-left transition active:scale-[.99] ${selectedId === page.id ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100" : "border-neutral-200 hover:bg-neutral-50"}`}
                  >
                    {page.pictureUrl
                      ? <img src={page.pictureUrl} alt="" className="size-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                      : <span className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"><Facebook size={18} /></span>}
                    <span className="min-w-0 flex-1"><b className="block truncate text-sm text-neutral-900">{page.name}</b><span className="block text-xs text-neutral-500">Page ID: {page.id}</span></span>
                    {selectedId === page.id ? <Check className="text-primary-700" size={18} /> : <ChevronRight className="text-neutral-300" size={18} />}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-end"><Button variant="primary" disabled={!selectedPage} onClick={() => void confirmPage()}>Kết nối Fanpage</Button></div>
            </>
          )}

          {step === "saving" && <div className="flex min-h-[260px] items-center justify-center"><LoaderCircle className="animate-spin text-primary-700" size={30} /></div>}

          {step === "done" && (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success-50 text-success-700"><Check size={24} /></span>
              <h3 className="mt-4 text-base font-bold text-neutral-900">Kết nối thành công</h3>
              <p className="mt-2 text-sm text-neutral-500">{selectedPage?.name} đã sẵn sàng cho Messenger và Fanpage.</p>
              <Button className="mt-5" variant="primary" onClick={onClose}>Hoàn tất</Button>
            </div>
          )}

          {error && <p role="alert" className="mt-4 rounded-input border border-danger-100 bg-danger-50 px-3 py-2.5 text-xs font-semibold text-danger-700">{error}</p>}
        </section>
      </div>
    </Modal>
  );
}
