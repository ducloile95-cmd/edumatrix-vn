import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, Link2, Package } from "lucide-react";
import { billingItemFormSchema, type BillingItemFormValues } from "@/schemas/billingItem";
import { createBillingItem, updateBillingItem } from "@/services/firestore/billingItems";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { queryKeys } from "@/hooks/queryKeys";
import type { BillingItemDoc } from "@/types/academic";

interface BillingItemFormProps {
  editingItem?: (BillingItemDoc & { id: string }) | null;
  onDone?: () => void;
}

const defaults: BillingItemFormValues = {
  name: "",
  courseId: "",
  subjectId: "",
  unitPrice: 0,
  status: "active",
};

const inputClass = "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

export function BillingItemForm({ editingItem, onDone }: BillingItemFormProps) {
  const queryClient = useQueryClient();
  const courses = useQuery({ queryKey: queryKeys.courses(), queryFn: listCourses });
  const subjects = useQuery({ queryKey: queryKeys.subjects(), queryFn: listSubjects });
  const {
    control,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BillingItemFormValues>({ resolver: zodResolver(billingItemFormSchema), defaultValues: defaults });

  useEffect(() => {
    reset(editingItem ? {
      name: editingItem.name,
      courseId: editingItem.courseId,
      subjectId: editingItem.subjectId,
      unitPrice: editingItem.unitPrice,
      status: editingItem.status,
    } : defaults);
  }, [editingItem, reset]);

  const mutation = useMutation({
    mutationFn: (values: BillingItemFormValues) => editingItem
      ? updateBillingItem(editingItem.id, values)
      : createBillingItem(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.billingItems() });
      onDone?.();
    },
  });

  const selectedCourseId = watch("courseId");
  const selectedCourse = courses.data?.find((course) => course.id === selectedCourseId);
  const availableCourses = (courses.data ?? []).filter((course) => course.status === "active" || course.id === editingItem?.courseId);
  const availableSubjects = (subjects.data ?? []).filter((subject) =>
    (subject.status === "active" || subject.id === editingItem?.subjectId) &&
    selectedCourse?.subjectIds.includes(subject.id),
  );

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="grid gap-4">
      <section className="rounded-card border border-neutral-200 bg-white">
        <div className="flex items-start gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-input bg-primary-50 text-primary-700"><Package size={17} aria-hidden="true" /></span>
          <div><h3 className="text-sm font-bold text-neutral-900">Thông tin đồ dùng</h3><p className="mt-0.5 text-xs leading-5 text-neutral-500">Tên và đơn giá sẽ được lưu lại trên hóa đơn khi phát hành.</p></div>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label="Tên đồ dùng học tập" htmlFor="billing-item-name" error={errors.name?.message} className="sm:col-span-2">
            <input id="billing-item-name" className={inputClass} {...register("name")} />
          </Field>
          <Field label="Đơn giá (VNĐ)" htmlFor="billing-item-price" error={errors.unitPrice?.message}>
            <div className="relative"><CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} /><input id="billing-item-price" type="number" min={1} step={1} className={`${inputClass} pl-9`} {...register("unitPrice")} /></div>
          </Field>
          <Field label="Trạng thái" htmlFor="billing-item-status">
            <select id="billing-item-status" className={inputClass} {...register("status")}><option value="active">Đang dùng</option>{editingItem && <option value="archived">Đã lưu trữ</option>}</select>
          </Field>
        </div>
      </section>

      <section className="rounded-card border border-neutral-200 bg-white">
        <div className="flex items-start gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-input bg-primary-50 text-primary-700"><Link2 size={17} aria-hidden="true" /></span>
          <div><h3 className="text-sm font-bold text-neutral-900">Phạm vi áp dụng</h3><p className="mt-0.5 text-xs leading-5 text-neutral-500">Môn học phải thuộc khóa học đã chọn.</p></div>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Controller control={control} name="courseId" render={({ field }) => (
            <Field label="Khóa học" htmlFor="billing-item-course" error={errors.courseId?.message}>
              <select id="billing-item-course" className={inputClass} value={field.value} onChange={(event) => { field.onChange(event); setValue("subjectId", "", { shouldValidate: true }); }}>
                <option value="">-- Chọn khóa học --</option>
                {availableCourses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </Field>
          )} />
          <Field label="Môn học" htmlFor="billing-item-subject" error={errors.subjectId?.message}>
            <select id="billing-item-subject" className={inputClass} disabled={!selectedCourse} {...register("subjectId")}>
              <option value="">-- Chọn môn học --</option>
              {availableSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {mutation.isError && <p role="alert" className="rounded-input bg-danger-50 px-3 py-2 text-sm text-danger-700">Không thể lưu đồ dùng học tập. Vui lòng kiểm tra dữ liệu và thử lại.</p>}
      <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
        <button type="button" onClick={onDone} className="min-h-touch rounded-input border border-neutral-300 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 active:scale-[.98]">Hủy</button>
        <button type="submit" disabled={mutation.isPending} className="min-h-touch rounded-input bg-primary-500 px-5 text-sm font-bold text-white transition hover:bg-primary-600 active:scale-[.98] disabled:opacity-60">{mutation.isPending ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Thêm đồ dùng"}</button>
      </div>
    </form>
  );
}

function Field({ children, className = "", error, htmlFor, label }: { children: React.ReactNode; className?: string; error?: string; htmlFor: string; label: string }) {
  return <div className={className}><label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-neutral-700">{label}<span className="ml-0.5 text-danger-500" aria-hidden="true">*</span></label>{children}{error && <p role="alert" className="mt-1 text-xs text-danger-700">{error}</p>}</div>;
}
