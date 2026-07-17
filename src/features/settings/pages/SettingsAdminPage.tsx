import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";
import {
  Activity, AlertTriangle, Banknote, Bell, Building2, Cloud, Database, ExternalLink,
  Facebook, Gauge, HardDrive, LockKeyhole, Palette, Plug, QrCode, RefreshCw,
  ShieldCheck, Trash2, Webhook,
} from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartPanel } from "@/components/charts/ChartPanel";
import { CHART_AXIS_TICK, CHART_GRID_COLOR, CHART_TOOLTIP_STYLE } from "@/components/charts/chartTheme";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { NotificationsTab } from "@/features/settings/components/NotificationsTab";
import { AppearanceTab } from "@/features/settings/components/AppearanceTab";
import { SchoolInfoTab } from "@/features/settings/components/SchoolInfoTab";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getIntegrationSettings, getPaymentSettings, updateIntegrationSettings, updatePaymentSettings,
  type IntegrationSettingsInput, type PaymentSettingsInput,
} from "@/services/firestore/settings";
import { listFirestoreUsage, summarizeUsage } from "@/services/firestore/usage";
import { listVietQrBanks } from "@/services/vietqr";
import { buildVietQrImageUrl } from "@/utils/payment";

type Section = "overview" | "school" | "integrations" | "payment" | "notifications" | "appearance";

const NAV_ITEMS = [
  { value: "overview" as const, label: "Tổng quan hệ thống", icon: Gauge },
  { value: "school" as const, label: "Hồ sơ trường học", icon: Building2 },
  { value: "integrations" as const, label: "Kết nối và API", icon: Plug },
  { value: "payment" as const, label: "Thanh toán và QR", icon: QrCode },
  { value: "notifications" as const, label: "Thông báo", icon: Bell },
  { value: "appearance" as const, label: "Giao diện", icon: Palette },
];

const EMPTY_INTEGRATIONS: IntegrationSettingsInput = { facebookPageId: "", driveFolderId: "", webhookUrl: "" };
const EMPTY_PAYMENT: PaymentSettingsInput = {
  bankBin: "970436", bankName: "Vietcombank", accountNumber: "", accountName: "EDUMATRIX VIET NAM",
  contentTemplate: "{invoiceCode} {studentCode}", vietQrTemplate: "compact2",
};
const FIELD_CLASS = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4"><div><h2 className="text-sm font-bold text-neutral-900">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>}</div>{action}</div>{children}</section>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs leading-5 text-neutral-500">{hint}</span>}</label>;
}

function QuotaCard({ icon: Icon, label, value, limit }: { icon: typeof Database; label: string; value: number; limit: number }) {
  const percent = Math.min(100, Math.round((value / limit) * 1000) / 10);
  return <div className="rounded-card border border-neutral-200 bg-neutral-50/70 p-4"><div className="flex items-start justify-between gap-3"><span className="flex size-9 items-center justify-center rounded-input bg-primary-50 text-primary-700 ring-1 ring-primary-100"><Icon size={18} /></span><span className="text-xs font-bold tabular-nums text-neutral-500">{percent}%</span></div><p className="mt-4 text-xl font-bold tabular-nums text-neutral-900">{value.toLocaleString("vi-VN")} <span className="text-sm font-medium text-neutral-400">/ {limit.toLocaleString("vi-VN")}</span></p><p className="mt-1 text-xs font-semibold text-neutral-700">{label}</p><div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-200"><div className={`h-full rounded-full ${percent >= 80 ? "bg-danger-500" : percent >= 60 ? "bg-warning-500" : "bg-primary-500"}`} style={{ width: `${Math.max(percent, 1)}%` }} /></div></div>;
}

function SparkOverview() {
  const usage = useQuery({ queryKey: ["firestore-usage", 7], queryFn: () => listFirestoreUsage(7), refetchInterval: 60_000 });
  const todayKey = formatInTimeZone(new Date(), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
  const today = useMemo(() => summarizeUsage((usage.data ?? []).filter((item) => item.dateKey === todayKey)), [usage.data, todayKey]);
  const chartData = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = subDays(new Date(), 6 - index);
    const key = formatInTimeZone(date, "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
    const summary = summarizeUsage((usage.data ?? []).filter((item) => item.dateKey === key));
    return { day: formatInTimeZone(date, "Asia/Ho_Chi_Minh", "dd/MM"), reads: summary.reads, writes: summary.writes };
  }), [usage.data]);
  const maxPercent = Math.max(today.reads / 500, today.writes / 200, today.deletes / 200);

  if (usage.isLoading) return <LoadingSkeleton rows={5} />;
  if (usage.isError) return <ErrorState message="Không tải được usage ước tính." onRetry={() => usage.refetch()} />;

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-card border border-primary-100 bg-primary-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-white text-primary-700 ring-1 ring-primary-100"><Activity size={19} /></span><div><p className="text-sm font-bold text-primary-900">Ước tính trong ứng dụng</p><p className="mt-0.5 text-xs leading-5 text-primary-700">Chỉ gồm thao tác Edumatrix đã instrument. Firebase Console là nguồn đối soát chính thức.</p></div></div><StatusBadge tone="info">Làm mới mỗi 60 giây</StatusBadge></div>
    <Panel title="Tình trạng Firebase Spark" description="Quota ngày: 50.000 reads, 20.000 writes và 20.000 deletes." action={<Button size="sm" onClick={() => usage.refetch()} icon={<RefreshCw size={14} />}>Làm mới</Button>}>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4"><QuotaCard icon={Database} label="Lượt đọc hôm nay" value={today.reads} limit={50_000} /><QuotaCard icon={Cloud} label="Lượt ghi hôm nay" value={today.writes} limit={20_000} /><QuotaCard icon={Trash2} label="Lượt xóa hôm nay" value={today.deletes} limit={20_000} /><div className="rounded-card border border-neutral-200 bg-neutral-50/70 p-4"><span className="flex size-9 items-center justify-center rounded-input bg-info-50 text-info-700 ring-1 ring-info-100"><HardDrive size={18} /></span><p className="mt-4 text-xl font-bold tabular-nums text-neutral-900">{today.latencyMs || 0} ms</p><p className="mt-1 text-xs font-semibold text-neutral-700">Độ trễ phía client</p><p className="mt-3 text-xs leading-5 text-neutral-500">Trung bình mẫu gần nhất, không phải backend latency chính thức.</p></div></div>
    </Panel>
    <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]"><ChartPanel title="Xu hướng 7 ngày" description="Cột là reads, đường là writes do Edumatrix ghi nhận." className="min-h-[350px]"><div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}><CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} strokeDasharray="3 5" /><XAxis dataKey="day" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} /><YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} /><Tooltip contentStyle={CHART_TOOLTIP_STYLE} /><Bar dataKey="reads" fill="#3366F0" radius={[7, 7, 2, 2]} barSize={22} /><Line type="monotone" dataKey="writes" stroke="#16A34A" strokeWidth={3} dot={{ r: 3, fill: "#16A34A", strokeWidth: 0 }} /></ComposedChart></ResponsiveContainer></div></ChartPanel><Panel title="Cảnh báo Spark" description="Ngưỡng cảnh báo ở 60%, 80% và 95%."><div className="p-5"><div className={`rounded-card border p-4 ${maxPercent >= 60 ? "border-warning-100 bg-warning-50" : "border-success-100 bg-success-50"}`}><div className="flex gap-3">{maxPercent >= 60 ? <AlertTriangle className="text-warning-700" size={19} /> : <ShieldCheck className="text-success-700" size={19} />}<div><p className="text-sm font-bold text-neutral-900">{maxPercent >= 60 ? "Cần kiểm tra usage" : "Trong vùng an toàn"}</p><p className="mt-1 text-xs leading-5 text-neutral-600">{usage.data?.length ? "Đánh giá từ rollup hiện có." : "Chưa có rollup usage. Số liệu sẽ xuất hiện sau khi hệ thống phát sinh thao tác."}</p></div></div></div><a href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "_"}/firestore/databases/-default-/usage`} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-input border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><ExternalLink size={15} />Mở Firebase Console</a></div></Panel></div>
    <Panel title="Collection phát sinh thao tác" description="Không quét collection để đếm document."><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-neutral-50 text-left text-xs font-bold text-neutral-500"><tr><th className="px-5 py-3">Collection</th><th className="px-4 py-3">Thao tác</th><th className="px-5 py-3 text-right">Tình trạng</th></tr></thead><tbody>{today.byCollection.length ? today.byCollection.slice(0, 8).map((item) => <tr key={item.collectionId} className="border-t border-neutral-100"><td className="px-5 py-3 font-mono text-xs text-neutral-700">{item.collectionId}</td><td className="px-4 py-3 font-semibold tabular-nums">{item.operations.toLocaleString("vi-VN")}</td><td className="px-5 py-3 text-right"><StatusBadge tone="success">Bình thường</StatusBadge></td></tr>) : <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-neutral-500">Chưa có dữ liệu usage hôm nay.</td></tr>}</tbody></table></div></Panel>
  </div>;
}

function IntegrationsSettings() {
  const { firebaseUser } = useAuth();
  const client = useQueryClient();
  const settings = useQuery({ queryKey: ["settings", "integrations"], queryFn: getIntegrationSettings });
  const [form, setForm] = useState(EMPTY_INTEGRATIONS);
  useEffect(() => { if (settings.data) setForm({
    facebookPageId: settings.data.facebookPageId ?? "",
    driveFolderId: settings.data.driveFolderId ?? "",
    webhookUrl: settings.data.webhookUrl ?? "",
  }); }, [settings.data]);
  const save = useMutation({ mutationFn: () => { if (!firebaseUser) throw new Error("Chưa đăng nhập"); if (form.webhookUrl && !form.webhookUrl.startsWith("https://")) throw new Error("Webhook phải dùng HTTPS"); return updateIntegrationSettings(firebaseUser, form); }, onSuccess: () => client.invalidateQueries({ queryKey: ["settings", "integrations"] }) });
  if (settings.isLoading) return <LoadingSkeleton rows={4} />;
  if (settings.isError) return <ErrorState message="Không tải được cấu hình kết nối." onRetry={() => settings.refetch()} />;
  return <div className="space-y-4"><div className="rounded-card border border-warning-100 bg-warning-50 p-4"><div className="flex gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-warning-700" size={18} /><div><p className="text-sm font-bold text-warning-900">Không lưu secret trong frontend</p><p className="mt-1 text-xs leading-5 text-warning-700">Chỉ lưu định danh công khai. Access token, refresh token và signing secret cần secure broker.</p></div></div></div><div className="grid gap-4 xl:grid-cols-3">{[[Facebook,"Facebook Page",form.facebookPageId],[HardDrive,"Google Drive",form.driveFolderId],[Webhook,"Webhook HTTPS",form.webhookUrl]].map(([Icon,title,value]) => { const CardIcon = Icon as typeof Facebook; return <article key={String(title)} className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]"><span className="flex size-10 items-center justify-center rounded-input bg-primary-50 text-primary-700"><CardIcon size={19} /></span><h3 className="mt-4 text-sm font-bold text-neutral-900">{String(title)}</h3><p className="mt-1 truncate text-xs text-neutral-500">{String(value) || "Chưa cấu hình"}</p></article>; })}</div><Panel title="Cấu hình công khai" description="Các trường an toàn để lưu trong settings/integrations."><form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="grid gap-4 p-5 md:grid-cols-2"><Field label="Facebook Page ID"><input value={form.facebookPageId} onChange={(event) => setForm((current) => ({ ...current, facebookPageId: event.target.value }))} className={FIELD_CLASS} /></Field><Field label="Google Drive folder ID"><input value={form.driveFolderId} onChange={(event) => setForm((current) => ({ ...current, driveFolderId: event.target.value }))} className={FIELD_CLASS} /></Field><Field label="Webhook callback URL" hint="Chỉ URL HTTPS, không chứa token trong query string."><input type="url" value={form.webhookUrl} onChange={(event) => setForm((current) => ({ ...current, webhookUrl: event.target.value }))} className={FIELD_CLASS} /></Field><div className="flex items-end"><Button type="submit" variant="primary" disabled={save.isPending}>Lưu cấu hình</Button></div>{save.isError && <p className="text-xs text-danger-700 md:col-span-2">{save.error instanceof Error ? save.error.message : "Lưu thất bại"}</p>}{save.isSuccess && <p className="text-xs text-success-700 md:col-span-2">Đã lưu cấu hình.</p>}</form></Panel></div>;
}

function PaymentSettings() {
  const { firebaseUser } = useAuth();
  const client = useQueryClient();
  const settings = useQuery({ queryKey: ["settings", "payment"], queryFn: getPaymentSettings });
  const banks = useQuery({ queryKey: ["vietqr", "banks"], queryFn: listVietQrBanks, staleTime: 24 * 60 * 60 * 1000 });
  const [form, setForm] = useState(EMPTY_PAYMENT);
  useEffect(() => { if (settings.data) setForm({
    bankBin: settings.data.bankBin ?? EMPTY_PAYMENT.bankBin,
    bankName: settings.data.bankName ?? EMPTY_PAYMENT.bankName,
    accountNumber: settings.data.accountNumber ?? "",
    accountName: settings.data.accountName ?? EMPTY_PAYMENT.accountName,
    contentTemplate: settings.data.contentTemplate ?? EMPTY_PAYMENT.contentTemplate,
    vietQrTemplate: settings.data.vietQrTemplate ?? EMPTY_PAYMENT.vietQrTemplate,
  }); }, [settings.data]);
  const valid = /^\d{6}$/.test(form.bankBin) && /^[A-Za-z0-9]{6,19}$/.test(form.accountNumber) && form.accountName.trim().length >= 5;
  const previewUrl = valid ? buildVietQrImageUrl({ bankBin: form.bankBin, accountNumber: form.accountNumber, accountName: form.accountName, amount: 1_250_000, content: form.contentTemplate.replace("{invoiceCode}", "HP HS001 202607").replace("{studentCode}", "HS001"), template: form.vietQrTemplate }) : "";
  const save = useMutation({ mutationFn: () => { if (!firebaseUser) throw new Error("Chưa đăng nhập"); if (!valid) throw new Error("Kiểm tra BIN, số tài khoản và tên tài khoản"); return updatePaymentSettings(firebaseUser, form); }, onSuccess: () => client.invalidateQueries({ queryKey: ["settings", "payment"] }) });
  if (settings.isLoading) return <LoadingSkeleton rows={4} />;
  if (settings.isError) return <ErrorState message="Không tải được cấu hình thanh toán." onRetry={() => settings.refetch()} />;
  return <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]"><Panel title="Thiết lập VietQR" description="Thông tin được snapshot vào hóa đơn tại thời điểm tạo."><form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="grid gap-4 p-5 md:grid-cols-2"><Field label="Ngân hàng"><select value={form.bankBin} onChange={(event) => { const bank = banks.data?.find((item) => item.bin === event.target.value); setForm((current) => ({ ...current, bankBin: event.target.value, bankName: bank?.shortName ?? current.bankName })); }} className={FIELD_CLASS}><option value={form.bankBin}>{form.bankName || form.bankBin}</option>{banks.data?.filter((bank) => bank.bin !== form.bankBin).map((bank) => <option key={bank.bin} value={bank.bin}>{bank.shortName} - {bank.bin}</option>)}</select>{banks.isError && <span className="mt-1 block text-xs text-warning-700">Không tải được danh sách VietQR, vẫn dùng ngân hàng đã lưu.</span>}</Field><Field label="Số tài khoản"><input required pattern="[A-Za-z0-9]{6,19}" value={form.accountNumber} onChange={(event) => setForm((current) => ({ ...current, accountNumber: event.target.value.replace(/\s/g, "") }))} className={FIELD_CLASS} /></Field><Field label="Tên tài khoản"><input required minLength={5} maxLength={50} value={form.accountName} onChange={(event) => setForm((current) => ({ ...current, accountName: event.target.value.toUpperCase() }))} className={FIELD_CLASS} /></Field><Field label="Mẫu nội dung chuyển khoản"><input maxLength={50} value={form.contentTemplate} onChange={(event) => setForm((current) => ({ ...current, contentTemplate: event.target.value }))} className={FIELD_CLASS} /></Field><Field label="Template VietQR" hint="Dùng compact2 hoặc template riêng từ my.vietqr.io."><input value={form.vietQrTemplate} onChange={(event) => setForm((current) => ({ ...current, vietQrTemplate: event.target.value }))} className={FIELD_CLASS} /></Field><div className="flex items-end"><Button type="submit" variant="primary" disabled={save.isPending} icon={<Banknote size={15} />}>Lưu cấu hình</Button></div>{save.isError && <p className="text-xs text-danger-700 md:col-span-2">{save.error instanceof Error ? save.error.message : "Lưu thất bại"}</p>}{save.isSuccess && <p className="text-xs text-success-700 md:col-span-2">Đã lưu cấu hình VietQR.</p>}</form></Panel><Panel title="Xem trước VietQR" description="Ảnh được tạo trực tiếp từ img.vietqr.io."><div className="flex min-h-[330px] flex-col items-center justify-center p-5">{previewUrl ? <img src={previewUrl} width={240} height={284} className="max-h-[284px] w-auto rounded-card object-contain" alt="Xem trước VietQR thanh toán" /> : <div className="text-center text-sm text-neutral-500"><QrCode className="mx-auto mb-3" size={36} />Nhập đủ thông tin để xem QR.</div>}<p className="mt-3 text-xs leading-5 text-neutral-500">VietQR không xác nhận giao dịch. Thanh toán vẫn cần đối soát.</p></div></Panel></div>;
}

function Content({ section }: { section: Section }) {
  if (section === "overview") return <SparkOverview />;
  if (section === "school") return <Panel title="Hồ sơ trường học" description="Thông tin nhận diện và liên hệ dùng trong toàn hệ thống."><div className="p-5"><SchoolInfoTab /></div></Panel>;
  if (section === "integrations") return <IntegrationsSettings />;
  if (section === "payment") return <PaymentSettings />;
  if (section === "notifications") return <Panel title="Thiết lập thông báo"><div className="p-5"><NotificationsTab /></div></Panel>;
  return <Panel title="Giao diện hệ thống"><div className="p-5"><AppearanceTab /></div></Panel>;
}

export default function SettingsAdminPage() {
  const [section, setSection] = useState<Section>("overview");
  return <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]"><aside className="min-w-0 rounded-card border border-neutral-200 bg-white p-2 shadow-[var(--shadow-1)] lg:self-start"><div className="flex gap-1 overflow-x-auto lg:block lg:space-y-1" role="tablist" aria-label="Điều hướng Cài đặt">{NAV_ITEMS.map(({ value, label, icon: Icon }) => <button key={value} type="button" role="tab" aria-selected={section === value} onClick={() => setSection(value)} className={`flex min-h-touch shrink-0 items-center gap-2.5 rounded-input px-3 text-left text-sm font-semibold transition lg:w-full ${section === value ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"}`}><Icon size={17} /><span>{label}</span></button>)}</div><div className="mt-2 hidden rounded-input bg-neutral-50 p-3 text-xs leading-5 text-neutral-500 lg:block"><LockKeyhole className="mb-2" size={16} />Chỉ Admin truy cập cấu hình hệ thống. Không lưu API secret ở trình duyệt.</div></aside><main className="min-w-0 motion-content-enter" key={section}><Content section={section} /></main></div>;
}
