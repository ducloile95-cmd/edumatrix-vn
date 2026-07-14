import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Plus, Save, X } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { createLessonPlan, createLessonPlanTemplate, copyLessonPlan, listLessonPlans, listLessonPlanTemplates, updateLessonPlan } from "@/services/firestore/lessonPlans";
import { lessonPlanFormSchema, type LessonPlanFormValues } from "@/schemas/lessonPlan";
import type { LessonPlanDoc } from "@/types/academic";

const DEFAULT_VALUES: LessonPlanFormValues = { title: "", classId: null, courseId: null, subjectId: null, sessionId: null, sections: [{ title: "Muc tieu", content: "" }, { title: "Noi dung", content: "" }], publicSummary: "", status: "draft" };
const ADD_BTN = "inline-flex min-h-touch items-center gap-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(35,72,214,.25)] transition active:scale-[.98]";
const INPUT = "min-h-touch rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500";

export default function LessonPlansPage() {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<(LessonPlanDoc & { id: string }) | null>(null);
  const plans = useQuery({ queryKey: ["lesson-plans"], queryFn: listLessonPlans });
  const templates = useQuery({ queryKey: ["lesson-plan-templates"], queryFn: listLessonPlanTemplates });
  const classes = useQuery({ queryKey: ["classes"], queryFn: listClasses });
  const courses = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: listSubjects });
  const form = useForm<LessonPlanFormValues>({ resolver: zodResolver(lessonPlanFormSchema), defaultValues: DEFAULT_VALUES });
  const sections = useFieldArray({ control: form.control, name: "sections" });
  const saveMutation = useMutation({
    mutationFn: (values: LessonPlanFormValues) => editingId ? updateLessonPlan(editingId, values) : createLessonPlan(values, firebaseUser?.uid ?? "unknown"),
    onSuccess: () => { setEditingId(null); form.reset(DEFAULT_VALUES); queryClient.invalidateQueries({ queryKey: ["lesson-plans"] }); setOpen(false); },
  });
  const copyMutation = useMutation({ mutationFn: (id: string) => copyLessonPlan(id, firebaseUser?.uid ?? "unknown"), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-plans"] }) });
  const templateMutation = useMutation({ mutationFn: () => createLessonPlanTemplate(form.getValues("title") || "Mau giao an", form.getValues("sections")), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-plan-templates"] }) });

  const openCreate = () => { setEditingId(null); form.reset(DEFAULT_VALUES); setOpen(true); };
  const edit = (plan: LessonPlanDoc & { id: string }) => { setEditingId(plan.id); form.reset({ title: plan.title, classId: plan.classId, courseId: plan.courseId, subjectId: plan.subjectId, sessionId: plan.sessionId, sections: plan.sections, publicSummary: plan.publicSummary, status: plan.status }); setOpen(true); };

  return (
    <AppShell>
      <PageHeader title="Giáo án" description="Soạn theo phần, lưu nháp, gắn lớp và xuất bản tóm tắt công khai."
        actions={<button type="button" onClick={openCreate} className={ADD_BTN}><Plus size={18} />Tạo giáo án</button>} />

      <section className="glass-panel rounded-2xl border border-white/70 p-4 sm:p-5">
        <h2 className="mb-3">Danh sach giao an</h2>
        {plans.data?.length === 0 && <EmptyState title="Chua co giao an" />}
        <ul className="divide-y divide-neutral-100">{plans.data?.map((plan) => <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{plan.title}</p><p className="text-xs text-neutral-500">{plan.status} · {plan.sections.length} section</p></div><div className="flex gap-2"><button title="Xem truoc" aria-label="Xem truoc" onClick={() => setPreview(plan)} className="flex size-10 items-center justify-center rounded-input border border-neutral-300"><Eye size={17} /></button><button title="Sao chep" aria-label="Sao chep" onClick={() => copyMutation.mutate(plan.id)} className="flex size-10 items-center justify-center rounded-input border border-neutral-300"><Copy size={17} /></button><button onClick={() => edit(plan)} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm">Sua</button></div></li>)}</ul>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editingId ? "Sửa giáo án" : "Tạo giáo án"} description="Soạn theo phần và gắn lớp/khóa học.">
        <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <div className="grid gap-3 md:grid-cols-2">
            <input aria-label="Ten giao an" placeholder="Ten giao an" {...form.register("title")} className={`${INPUT} md:col-span-2`} />
            <select aria-label="Trang thai" {...form.register("status")} className={INPUT}><option value="draft">Ban nhap</option><option value="published">Cong khai</option><option value="archived">Luu tru</option></select>
            <select aria-label="Mau giao an" onChange={(event) => { const item = templates.data?.find((value) => value.id === event.target.value); if (item) form.setValue("sections", item.sections); }} className={INPUT}><option value="">Chon mau</option>{templates.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select aria-label="Gan lop" {...form.register("classId")} className={INPUT}><option value="">Gan lop</option>{classes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select aria-label="Gan khoa hoc" {...form.register("courseId")} className={INPUT}><option value="">Gan khoa hoc</option>{courses.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select aria-label="Gan mon hoc" {...form.register("subjectId")} className={INPUT}><option value="">Gan mon hoc</option>{subjects.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input aria-label="Ma buoi hoc" placeholder="Ma buoi hoc (tuy chon)" {...form.register("sessionId")} className={INPUT} />
          </div>
          <div className="mt-4 space-y-3">
            {sections.fields.map((field, index) => <div key={field.id} className="grid gap-2 border-l-2 border-primary-200 pl-3 md:grid-cols-[220px_1fr_auto]"><input aria-label={`Ten section ${index + 1}`} {...form.register(`sections.${index}.title`)} className={INPUT} /><textarea aria-label={`Noi dung section ${index + 1}`} {...form.register(`sections.${index}.content`)} className="min-h-24 rounded-input border border-neutral-300 p-3 text-sm" /><button type="button" title="Xoa section" aria-label="Xoa section" onClick={() => sections.remove(index)} className="flex size-10 items-center justify-center rounded-input border border-neutral-300"><X size={17} /></button></div>)}
          </div>
          <button type="button" onClick={() => sections.append({ title: "Section moi", content: "" })} className="mt-3 inline-flex min-h-touch items-center gap-2 rounded-input border border-neutral-300 px-3 text-sm"><Plus size={17} />Them section</button>
          <textarea aria-label="Tom tat cong khai" placeholder="Tom tat cong khai cho phu huynh/hoc sinh" {...form.register("publicSummary")} className="mt-3 min-h-20 w-full rounded-input border border-neutral-300 p-3 text-sm" />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => templateMutation.mutate()} className="min-h-touch rounded-input border border-neutral-300 px-4 text-sm hover:bg-neutral-50">Luu thanh mau</button>
            <button type="submit" disabled={saveMutation.isPending} className={ADD_BTN}><Save size={17} />{editingId ? "Luu thay doi" : "Luu giao an"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} size="lg" title={preview?.title ?? "Giáo án"}>
        <p className="text-sm text-neutral-500">{preview?.publicSummary || "Chua co tom tat cong khai"}</p>
        {preview?.sections.map((section, index) => <section key={`${section.title}-${index}`} className="mt-4"><h3 className="font-semibold">{section.title}</h3><p className="whitespace-pre-wrap text-sm">{section.content}</p></section>)}
      </Modal>
    </AppShell>
  );
}
