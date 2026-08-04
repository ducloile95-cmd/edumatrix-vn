import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { CheckCircle2, Cloud, CreditCard, ExternalLink, Facebook, PlugZap, RefreshCw, Unplug } from "lucide-react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getIntegrationSettings, getPaymentSettings, updateIntegrationSettings, type IntegrationSettingsInput } from "@/services/firestore/settings";
import { connectGoogleDrive, disconnectGoogleDrive, driveErrorMessage, isGoogleDriveConfigured, isGoogleDriveConnected } from "@/services/integrations/googleDrive";
import { MetaPageConnectDialog } from "@/features/settings/components/MetaPageConnectDialog";

const EMPTY: IntegrationSettingsInput = { facebookPageId: "", driveFolderId: "", webhookUrl: "" };
const FIELD_CLASS = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

function IntegrationCard({ icon, title, description, configured, detail, children }: {
  icon: ReactNode;
  title: string;
  description: string;
  configured: boolean;
  detail: string;
  children?: ReactNode;
}) {
  return <article className="flex min-h-[240px] flex-col rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]"><div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-input bg-primary-50 text-primary-700 ring-1 ring-primary-100">{icon}</span><span className={`rounded-full px-2.5 py-1 text-2xs font-bold ${configured ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-800"}`}>{configured ? "Sẵn sàng" : "Cần cấu hình"}</span></div><h3 className="mt-5 text-base font-bold text-neutral-900">{title}</h3><p className="mt-1 text-sm leading-6 text-neutral-600">{description}</p><p className="mt-3 break-all rounded-input bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-500">{detail}</p>{children && <div className="mt-auto flex flex-wrap gap-2 pt-4">{children}</div>}</article>;
}

export function IntegrationsWorkspace() {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["settings", "integrations"], queryFn: getIntegrationSettings });
  const payment = useQuery({ queryKey: ["settings", "payment"], queryFn: getPaymentSettings });
  const [form, setForm] = useState(EMPTY);
  const [driveConnected, setDriveConnected] = useState(isGoogleDriveConnected());
  const [metaConnectOpen, setMetaConnectOpen] = useState(false);

  useEffect(() => {
    if (settings.data) setForm({
      facebookPageId: settings.data.facebookPageId ?? "",
      driveFolderId: settings.data.driveFolderId ?? "",
      webhookUrl: settings.data.webhookUrl ?? "",
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      if (form.webhookUrl && !form.webhookUrl.startsWith("https://")) throw new Error("Webhook phải dùng HTTPS");
      return updateIntegrationSettings(firebaseUser, {
        facebookPageId: form.facebookPageId.trim(),
        driveFolderId: form.driveFolderId.trim(),
        webhookUrl: form.webhookUrl.trim(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "integrations"] }),
  });
  const drive = useMutation({
    mutationFn: connectGoogleDrive,
    onSuccess: () => setDriveConnected(true),
    onError: () => setDriveConnected(isGoogleDriveConnected()),
  });

  if (settings.isLoading || payment.isLoading) return <LoadingSkeleton rows={6} />;
  if (settings.isError) return <ErrorState message="Không tải được cấu hình kết nối." onRetry={() => settings.refetch()} />;

  const drivePublicConfig = isGoogleDriveConfigured();
  const driveReady = drivePublicConfig && Boolean(form.driveFolderId.trim());
  const messengerWorker = (import.meta.env.VITE_MESSENGER_WORKER_URL ?? "").trim();
  const messengerReady = Boolean(messengerWorker && form.facebookPageId.trim());
  const utilityPermission = settings.data?.facebookUtilityMessagingPermission ?? "unknown";
  const utilityReconnectRequired = messengerReady && utilityPermission !== "granted";
  const paymentReady = Boolean(payment.data?.bankBin && payment.data?.accountNumber);

  return <div className="space-y-4">
    <header className="rounded-card border border-primary-100 bg-primary-50 p-5"><div className="flex items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-input bg-white text-primary-700 ring-1 ring-primary-100"><PlugZap size={20} /></span><h2 className="text-lg font-bold text-neutral-900">Trung tâm kết nối</h2></div></header>

    <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]" aria-label="Trạng thái tích hợp">
      <IntegrationCard icon={<Cloud size={19} />} title="Google Drive" description="Tải và chọn tệp giáo án từ Google Drive." configured={driveReady} detail={form.driveFolderId || "Chưa có folder ID"}>
        <Button size="sm" variant={driveConnected ? "secondary" : "primary"} disabled={!drivePublicConfig || drive.isPending} onClick={() => drive.mutate()}>{drive.isPending ? "Đang kết nối..." : driveConnected ? "Kết nối lại" : "Kết nối Drive"}</Button>
        {driveConnected && <Button size="sm" variant="secondary" icon={<Unplug size={14} />} onClick={() => { disconnectGoogleDrive(); setDriveConnected(false); }}>Ngắt phiên</Button>}
      </IntegrationCard>
      <IntegrationCard icon={<Facebook size={19} />} title="Facebook & Messenger" description="Kết nối Fanpage để dùng Messenger và đăng bài." configured={messengerReady} detail={`${settings.data?.facebookPageName ? `${settings.data.facebookPageName} · ${form.facebookPageId}` : form.facebookPageId ? `Page ID: ${form.facebookPageId}` : "Chưa kết nối Fanpage"}${messengerReady ? ` · Utility: ${utilityPermission === "granted" ? "Đã cấp quyền" : utilityPermission === "missing" ? "Thiếu quyền" : "Chưa kiểm tra"}` : ""}`}>
        <Button size="sm" variant={messengerReady ? "secondary" : "primary"} icon={messengerReady ? <RefreshCw size={14} /> : <Facebook size={14} />} onClick={() => setMetaConnectOpen(true)}>
          {utilityReconnectRequired ? "Kết nối lại Fanpage" : messengerReady ? "Đổi Fanpage" : "Kết nối Facebook"}
        </Button>
        {messengerWorker && <a href={messengerWorker} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-input border border-neutral-300 px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50">Mở Worker <ExternalLink size={14} /></a>}
      </IntegrationCard>
      <IntegrationCard icon={<CreditCard size={19} />} title="VietQR" description="Thiết lập thông tin nhận tiền cho hóa đơn." configured={paymentReady} detail={paymentReady ? `${payment.data?.bankName} · ${payment.data?.bankBin}` : "Chưa đủ thông tin nhận tiền"}>
        <Link to="?section=payment" className="inline-flex min-h-9 items-center rounded-input border border-neutral-300 px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50">Mở cấu hình thanh toán</Link>
      </IntegrationCard>
    </section>

    {utilityReconnectRequired && (
      <p role="alert" className="rounded-input border border-warning-200 bg-warning-50 px-4 py-3 text-sm font-semibold leading-6 text-warning-900">
        {utilityPermission === "missing"
          ? "Fanpage hiện tại chưa cấp quyền page_utility_messaging."
          : "Kết nối Fanpage này được tạo trước khi hệ thống kiểm tra quyền Utility Messaging."}{" "}
        Chọn “Kết nối lại Fanpage”, chấp thuận quyền Utility Messaging trên Facebook và chỉ bật tính năng sau khi trạng thái chuyển thành “Đã cấp quyền”.
      </p>
    )}

    {drive.isError && <p role="alert" className="rounded-input border border-danger-100 bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700">{driveErrorMessage(drive.error)}</p>}

    <section className="rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]"><div className="border-b border-neutral-100 px-5 py-4"><h2 className="text-sm font-bold text-neutral-900">Cấu hình công khai</h2></div><form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="grid gap-4 p-5 md:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">Facebook Page ID</span><div className="relative"><input value={form.facebookPageId} readOnly className={`${FIELD_CLASS} bg-neutral-50 pr-9 text-neutral-600`} /><CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-success-600" size={16} /></div><span className="mt-1.5 block text-xs leading-5 text-neutral-500">Được cập nhật tự động sau khi chọn Fanpage.</span></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">Google Drive folder ID</span><input value={form.driveFolderId} onChange={(event) => setForm((current) => ({ ...current, driveFolderId: event.target.value }))} className={FIELD_CLASS} /></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">Webhook callback URL</span><input type="url" value={form.webhookUrl} onChange={(event) => setForm((current) => ({ ...current, webhookUrl: event.target.value }))} className={FIELD_CLASS} /><span className="mt-1.5 block text-xs leading-5 text-neutral-500">Chỉ URL HTTPS, không chứa token trong query string.</span></label><div className="flex items-end"><Button type="submit" variant="primary" disabled={save.isPending}>{save.isPending ? "Đang lưu..." : "Lưu cấu hình"}</Button></div>{save.isError && <p role="alert" className="text-xs font-semibold text-danger-700 md:col-span-2">{save.error instanceof Error ? save.error.message : "Lưu thất bại"}</p>}{save.isSuccess && <p role="status" className="text-xs font-semibold text-success-700 md:col-span-2">Đã lưu cấu hình kết nối.</p>}</form></section>

    <MetaPageConnectDialog
      open={metaConnectOpen}
      onClose={() => setMetaConnectOpen(false)}
      onConnected={(page) => {
        setForm((current) => ({ ...current, facebookPageId: page.id }));
        void queryClient.invalidateQueries({ queryKey: ["settings", "integrations"] });
      }}
    />
  </div>;
}
