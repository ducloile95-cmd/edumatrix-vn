import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Banknote, Bell, Building2, Cloud, Database, ExternalLink, Gauge, GraduationCap,
  LockKeyhole, Palette, Plug, QrCode, ShieldCheck, Trash2,
} from "lucide-react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { NotificationsTab } from "@/features/settings/components/NotificationsTab";
import { AppearanceTab } from "@/features/settings/components/AppearanceTab";
import { SchoolInfoTab } from "@/features/settings/components/SchoolInfoTab";
import { IntegrationsWorkspace } from "@/features/settings/components/IntegrationsWorkspace";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getAcademicSettings, getPaymentSettings, updateAcademicSettings, updatePaymentSettings,
  type AcademicSettingsInput, type PaymentSettingsInput,
} from "@/services/firestore/settings";
import { listVietQrBanks } from "@/services/integrations/vietQr";
import { buildVietQrImageUrl } from "@/utils/payment";
import { DEFAULT_RANK_THRESHOLDS, isValidRankThresholds } from "@/utils/ranking";

type Section = "overview" | "school" | "academic" | "integrations" | "payment" | "notifications" | "appearance";

const NAV_ITEMS = [
  { value: "overview" as const, label: "Tổng quan hệ thống", icon: Gauge },
  { value: "school" as const, label: "Hồ sơ trường học", icon: Building2 },
  { value: "academic" as const, label: "Xếp hạng học tập", icon: GraduationCap },
  { value: "integrations" as const, label: "Kết nối và API", icon: Plug },
  { value: "payment" as const, label: "Thanh toán và QR", icon: QrCode },
  { value: "notifications" as const, label: "Thông báo", icon: Bell },
  { value: "appearance" as const, label: "Giao diện", icon: Palette },
];

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

function QuotaCard({ icon: Icon, label, limit }: { icon: typeof Database; label: string; limit: string }) {
  return <div className="rounded-card border border-neutral-200 bg-neutral-50/70 p-4"><span className="flex size-9 items-center justify-center rounded-input bg-primary-50 text-primary-700 ring-1 ring-primary-100"><Icon size={18} /></span><p className="mt-4 text-xl font-bold tabular-nums text-neutral-900">{limit}</p><p className="mt-1 text-xs font-semibold text-neutral-700">{label}</p><p className="mt-3 text-xs leading-5 text-neutral-500">Hạn mức ngày của gói Spark. Mức đã dùng xem tại Firebase Console.</p></div>;
}

function SparkOverview() {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "_";
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/usage`;

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-card border border-success-100 bg-success-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-white text-success-700 ring-1 ring-success-100"><ShieldCheck size={19} /></span><div><p className="text-sm font-bold text-success-900">Không tạo telemetry phụ trong Firestore</p><p className="mt-0.5 text-xs leading-5 text-success-700">Edumatrix không tự ghi usage để đo chính nó. Firebase Console là nguồn số liệu chính thức.</p></div></div><a href={consoleUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-touch shrink-0 items-center justify-center gap-2 rounded-input border border-success-200 bg-white px-4 text-sm font-semibold text-success-800 hover:bg-success-100"><ExternalLink size={15} />Xem usage chính thức</a></div>
    <Panel title="Hạn mức Firebase Spark" description="Đối chiếu mức đã dùng và cảnh báo quota trực tiếp trong Firebase Console."><div className="grid gap-3 p-4 sm:grid-cols-3"><QuotaCard icon={Database} label="Document reads mỗi ngày" limit="50.000" /><QuotaCard icon={Cloud} label="Document writes mỗi ngày" limit="20.000" /><QuotaCard icon={Trash2} label="Document deletes mỗi ngày" limit="20.000" /></div></Panel>
    <Panel title="Nguyên tắc vận hành tiết kiệm" description="Các giới hạn kỹ thuật đang áp dụng cho client site."><ul className="grid gap-3 p-5 text-sm leading-6 text-neutral-600 md:grid-cols-2"><li className="rounded-input border border-neutral-200 bg-neutral-50 px-4 py-3"><strong className="block text-neutral-900">Một lần ghi hoạt động mỗi phiên</strong>Dùng lastLoginAt, không heartbeat định kỳ.</li><li className="rounded-input border border-neutral-200 bg-neutral-50 px-4 py-3"><strong className="block text-neutral-900">Query có phạm vi và giới hạn</strong>Giáo viên chỉ tải lớp được phân công.</li><li className="rounded-input border border-neutral-200 bg-neutral-50 px-4 py-3"><strong className="block text-neutral-900">Dữ liệu tổng hợp được kiểm soát</strong>Summary cập nhật atomic cùng dữ liệu nguồn.</li><li className="rounded-input border border-neutral-200 bg-neutral-50 px-4 py-3"><strong className="block text-neutral-900">Không quét collection để đếm</strong>Dùng count aggregation hoặc summary khi cần.</li></ul></Panel>
  </div>;
}

function IntegrationsSettings() {
  return <IntegrationsWorkspace />;
}

function AcademicSettings() {
  const { firebaseUser } = useAuth();
  const client = useQueryClient();
  const settings = useQuery({ queryKey: ["settings", "academic"], queryFn: getAcademicSettings });
  const [form, setForm] = useState<AcademicSettingsInput>({ rankThresholds: DEFAULT_RANK_THRESHOLDS });

  useEffect(() => {
    if (settings.data) setForm({ rankThresholds: settings.data.rankThresholds });
  }, [settings.data]);

  const valid = isValidRankThresholds(form.rankThresholds);
  const save = useMutation({
    mutationFn: () => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      if (!valid) throw new Error("Ngưỡng phải thỏa 100 ≥ S > A > B > D = 0");
      return updateAcademicSettings(firebaseUser, form);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["settings", "academic"] }),
  });

  if (settings.isLoading) return <LoadingSkeleton rows={4} />;
  if (settings.isError) return <ErrorState message="Không tải được cấu hình xếp hạng." onRetry={() => settings.refetch()} />;

  return <Panel title="Thang xếp hạng học tập" description="Một quy tắc dùng chung cho Dashboard Admin, Teacher và Parent."><form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">{(["S", "A", "B"] as const).map((rank) => <Field key={rank} label={`Hạng ${rank} từ (%)`}><input type="number" min={1} max={100} required value={form.rankThresholds[rank]} onChange={(event) => setForm((current) => ({ rankThresholds: { ...current.rankThresholds, [rank]: Number(event.target.value) } }))} className={FIELD_CLASS} /></Field>)}<Field label="Hạng D từ (%)"><input type="number" value={0} readOnly disabled className={`${FIELD_CLASS} bg-neutral-100`} /></Field><div className="sm:col-span-2 xl:col-span-4"><p className={`mb-3 text-xs ${valid ? "text-neutral-500" : "text-danger-700"}`}>Yêu cầu: 100 ≥ S &gt; A &gt; B &gt; D = 0.</p><Button type="submit" variant="primary" disabled={save.isPending || !valid} icon={<GraduationCap size={15} />}>Lưu thang xếp hạng</Button>{save.isError && <p className="mt-2 text-xs text-danger-700">{save.error instanceof Error ? save.error.message : "Lưu thất bại"}</p>}{save.isSuccess && <p className="mt-2 text-xs text-success-700">Đã lưu thang xếp hạng.</p>}</div></form></Panel>;
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
  if (section === "academic") return <AcademicSettings />;
  if (section === "integrations") return <IntegrationsSettings />;
  if (section === "payment") return <PaymentSettings />;
  if (section === "notifications") return <Panel title="Thiết lập thông báo"><div className="p-5"><NotificationsTab /></div></Panel>;
  return <Panel title="Giao diện hệ thống"><div className="p-5"><AppearanceTab /></div></Panel>;
}

export default function SettingsAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("section");
  const section: Section = NAV_ITEMS.some((item) => item.value === requested) ? requested as Section : "overview";
  const setSection = (value: Section) => setSearchParams(value === "overview" ? {} : { section: value });
  return <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]"><aside className="min-w-0 rounded-card border border-neutral-200 bg-white p-2 shadow-[var(--shadow-1)] lg:self-start"><div className="flex gap-1 overflow-x-auto lg:block lg:space-y-1" role="tablist" aria-label="Điều hướng Cài đặt">{NAV_ITEMS.map(({ value, label, icon: Icon }) => <button key={value} type="button" role="tab" aria-selected={section === value} onClick={() => setSection(value)} className={`flex min-h-touch shrink-0 items-center gap-2.5 rounded-input px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:w-full ${section === value ? "bg-primary-50 text-primary-700" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"}`}><Icon size={17} /><span>{label}</span></button>)}</div><div className="mt-2 hidden rounded-input bg-neutral-50 p-3 text-xs leading-5 text-neutral-500 lg:block"><LockKeyhole className="mb-2" size={16} />Chỉ Admin truy cập cấu hình hệ thống. Không lưu API secret ở trình duyệt.</div></aside><main className="min-w-0 motion-content-enter" key={section}><Content section={section} /></main></div>;
}
