import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSchoolSettings, updateSchoolSettings } from "@/services/firestore/settings";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { ErrorState } from "@/components/feedback/ErrorState";

const EMPTY_FORM = { name: "", schoolYear: "", address: "", phone: "", logoUrl: "" };
type FormState = typeof EMPTY_FORM;

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function Field({ label, value, onChange, placeholder, className }: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500 focus:outline-none"
      />
    </div>
  );
}

/** Tab "Thông tin trường học" - chi Admin (settings/general do isAdmin() ghi theo firestore.rules). */
export function SchoolInfoTab() {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings", "school"],
    queryFn: getSchoolSettings,
  });
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (data) {
      setForm({ name: data.name, schoolYear: data.schoolYear, address: data.address, phone: data.phone, logoUrl: data.logoUrl });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!firebaseUser) throw new Error("Chưa đăng nhập");
      return updateSchoolSettings(firebaseUser, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "school"] });
      setSavedAt(Date.now());
    },
  });

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (isError) return <ErrorState message="Không tải được thông tin trường học." onRetry={() => refetch()} />;

  function set<K extends keyof FormState>(key: K, value: string) {
    setSavedAt(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Tên trường" value={form.name} onChange={(v) => set("name", v)} />
      <Field label="Năm học" value={form.schoolYear} onChange={(v) => set("schoolYear", v)} placeholder="2026 - 2027" />
      <Field label="Địa chỉ" value={form.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
      <Field label="Số điện thoại liên hệ" value={form.phone} onChange={(v) => set("phone", v)} />
      <Field label="Đường dẫn logo" value={form.logoUrl} onChange={(v) => set("logoUrl", v)} placeholder="https://..." />

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
        {savedAt && <span className="text-xs text-success-700">Đã lưu.</span>}
        {mutation.isError && <span className="text-xs text-danger-700">Lưu thất bại, thử lại.</span>}
      </div>
    </form>
  );
}
