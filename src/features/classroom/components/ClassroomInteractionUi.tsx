import type { ReactNode } from "react";
import { Check } from "lucide-react";

const SELECTED_OPTION_CLASS: Record<string, string> = {
  present: "border-success-300 bg-success-50 text-success-700 ring-1 ring-success-100",
  done: "border-success-300 bg-success-50 text-success-700 ring-1 ring-success-100",
  late: "border-warning-300 bg-warning-50 text-warning-700 ring-1 ring-warning-100",
  partial: "border-warning-300 bg-warning-50 text-warning-700 ring-1 ring-warning-100",
  absent: "border-danger-300 bg-danger-50 text-danger-700 ring-1 ring-danger-100",
  not_done: "border-danger-300 bg-danger-50 text-danger-700 ring-1 ring-danger-100",
  excused: "border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-100",
  not_assigned: "border-neutral-300 bg-white text-neutral-700 ring-1 ring-neutral-200",
};

export function OptionGroup({ kind, icon, label, helper, options, value, disabled, onChange }: { kind: "attendance" | "homework"; icon: ReactNode; label: string; helper: string; options: Array<{ value: string; label: string }>; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const tone = kind === "attendance" ? "border-primary-100 bg-primary-50/55" : "border-accent-100 bg-accent-50/55";
  const iconTone = kind === "attendance" ? "bg-primary-100 text-primary-700" : "bg-accent-100 text-accent-700";
  return <fieldset className={`rounded-card border p-3 ${tone}`}><legend className="sr-only">{label}</legend><div className="mb-3 flex items-center gap-2"><span className={`grid size-8 place-items-center rounded-input ${iconTone}`}>{icon}</span><div><p className="text-xs font-black text-neutral-800">{label}</p><p className="text-2xs text-neutral-500">{helper}</p></div></div><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">{options.map((option) => { const selected = value === option.value; return <button key={option.value} type="button" aria-pressed={selected} disabled={disabled} onClick={() => onChange(option.value)} className={`relative min-h-10 rounded-input border px-2 text-xs font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 ${selected ? SELECTED_OPTION_CLASS[option.value] : "border-neutral-200 bg-white/80 text-neutral-500 hover:border-neutral-300 hover:bg-white"}`}>{selected && <Check size={12} className="absolute right-1.5 top-1.5" aria-hidden />}{option.label}</button>; })}</div></fieldset>;
}

export function TextArea({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; disabled?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}</span><textarea value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={2000} className="min-h-24 w-full resize-y rounded-input border border-neutral-300 p-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-70" /></label>;
}

export function Metric({ value, label }: { value: ReactNode; label: string }) {
  return <div className="rounded-input border border-neutral-200 bg-neutral-50 p-3"><strong className="block text-xl font-black tabular-nums text-primary-700">{value}</strong><span className="mt-1 block text-xs font-semibold text-neutral-500">{label}</span></div>;
}

export function SummaryBlock({ title, value, empty }: { title: string; value: string; empty: string }) {
  return <section><h3 className="text-xs font-black uppercase tracking-wide text-neutral-500">{title}</h3><p className={`mt-1 rounded-input border p-3 ${value ? "border-neutral-200 bg-neutral-50 text-neutral-800" : "border-dashed border-neutral-300 text-neutral-400"}`}>{value || empty}</p></section>;
}

export function DeliveryRow({ label, detail, status }: { label: string; detail: string; status: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-input border border-neutral-200 p-3"><div><p className="text-sm font-bold text-neutral-900">{label}</p><p className="mt-0.5 text-xs text-neutral-500">{detail}</p></div><span className="shrink-0 text-xs font-bold text-primary-700">{status}</span></div>;
}
