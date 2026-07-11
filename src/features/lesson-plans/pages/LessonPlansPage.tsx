import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Plus, Save, X } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { listClasses } from "@/services/firestore/classes";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import { createLessonPlan, createLessonPlanTemplate, copyLessonPlan, listLessonPlans, listLessonPlanTemplates, updateLessonPlan } from "@/services/firestore/lessonPlans";
import { lessonPlanFormSchema, type LessonPlanFormValues } from "@/schemas/lessonPlan";
import type { LessonPlanDoc } from "@/types/academic";

const DEFAULT_VALUES: LessonPlanFormValues = { title: "", classId: null, courseId: null, subjectId: null, sessionId: null, sections: [{ title: "Muc tieu", content: "" }, { title: "Noi dung", content: "" }], publicSummary: "", status: "draft" };

export default function LessonPlansPage() {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
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
    onSuccess: () => { setEditingId(null); form.reset(DEFAULT_VALUES); queryClient.invalidateQueries({ queryKey: ["lesson-plans"] }); },
  });
  const copyMutation = useMutation({ mutationFn: (id: string) => copyLessonPlan(id, firebaseUser?.uid ?? "unknown"), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-plans"] }) });
  const templateMutation = useMutation({ mutationFn: () => createLessonPlanTemplate(form.getValues("title") || "Mau giao an", form.getValues("sections")), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-plan-templates"] }) });

  const edit = (plan: LessonPlanDoc & { id: string }) => { setEditingId(plan.id); form.reset({ title: plan.title, classId: plan.classId, courseId: plan.courseId, subjectId: plan.subjectId, sessionId: plan.sessionId, sections: plan.sections, publicSummary: plan.publicSummary, status: plan.status }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <AppShell>
      <h1>Giao an</h1><p className="mt-1 text-sm text-neutral-500">Soan theo section, luu nhap, gan lop va xuat ban tom tat cong khai.</p>
      <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))} className="mt-5 border-y border-neutral-200 py-5">
        <div className="grid gap-3 md:grid-cols-4">
          <input aria-label="Ten giao an" placeholder="Ten giao an" {...form.register("title")} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm md:col-span-2" />
          <select aria-label="Trang thai" {...form.register("status")} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm"><option value="draft">Ban nhap</option><option value="published">Cong khai</option><option value="archived">Luu tru</option></select>
          <select aria-label="Mau giao an" onChange={(event) => { const item = templates.data?.find((value) => value.id === event.target.value); if (item) form.setValue("sections", item.sections); }} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm"><option value="">Chon mau</option>{templates.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select aria-label="Gan lop" {...form.register("classId")} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm"><option value="">Gan lop</option>{classes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select aria-label="Gan khoa hoc" {...form.register("courseId")} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm"><option value="">Gan khoa hoc</option>{courses.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select aria-label="Gan mon hoc" {...form.register("subjectId")} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm"><option value="">Gan mon hoc</option>{subjects.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <input aria-label="Ma buoi hoc" placeholder="Ma buoi hoc (tuy chon)" {...form.register("sessionId")} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm" />
        </div>
        <div className="mt-4 space-y-3">
          {sections.fields.map((field, index) => <div key={field.id} className="grid gap-2 border-l-2 border-primary-200 pl-3 md:grid-cols-[220px_1fr_auto]"><input aria-label={`Ten section ${index + 1}`} {...form.register(`sections.${index}.title`)} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm" /><textarea aria-label={`Noi dung section ${index + 1}`} {...form.register(`sections.${index}.content`)} className="min-h-24 rounded-input border border-neutral-300 p-3 text-sm" /><button type="button" title="Xoa section" aria-label="Xoa section" onClick={() => sections.remove(index)} className="flex size-10 items-center justify-center rounded-input border border-neutral-300"><X size={17} /></button></div>)}
        </div>
        <button type="button" onClick={() => sections.append({ title: "Section moi", content: "" })} className="mt-3 inline-flex min-h-touch items-center gap-2 rounded-input border border-neutral-300 px-3 text-sm"><Plus size={17} />Them section</button>
        <textarea aria-label="Tom tat cong khai" placeholder="Tom tat cong khai cho phu huynh/hoc sinh" {...form.register("publicSummary")} className="mt-3 min-h-20 w-full rounded-input border border-neutral-300 p-3 text-sm" />
        <div className="mt-3 flex flex-wrap gap-2"><button disabled={saveMutation.isPending} className="inline-flex min-h-touch items-center gap-2 rounded-input bg-primary-500 px-5 text-sm font-medium text-white"><Save size={17} />{editingId ? "Luu thay doi" : "Luu giao an"}</button><button type="button" onClick={() => templateMutation.mutate()} className="min-h-touch rounded-input border border-neutral-300 px-4 text-sm">Luu thanh mau</button></div>
      </form>
      <section className="mt-5"><h2 className="mb-3">Danh sach giao an</h2>{plans.data?.length === 0 && <EmptyState title="Chua co giao an" />}<ul className="divide-y divide-neutral-100">{plans.data?.map((plan) => <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{plan.title}</p><p className="text-xs text-neutral-500">{plan.status} · {plan.sections.length} section</p></div><div className="flex gap-2"><button title="Xem truoc" aria-label="Xem truoc" onClick={() => setPreview(plan)} className="flex size-10 items-center justify-center rounded-input border border-neutral-300"><Eye size={17} /></button><button title="Sao chep" aria-label="Sao chep" onClick={() => copyMutation.mutate(plan.id)} className="flex size-10 items-center justify-center rounded-input border border-neutral-300"><Copy size={17} /></button><button onClick={() => edit(plan)} className="min-h-touch rounded-input border border-neutral-300 px-3 text-sm">Sua</button></div></li>)}</ul></section>
      {preview && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-neutral-900/50 p-4"><div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-modal bg-white p-5"><div className="flex justify-between"><h2>{preview.title}</h2><button title="Dong" aria-label="Dong" onClick={() => setPreview(null)}><X /></button></div><p className="mt-2 text-sm text-neutral-500">{preview.publicSummary || "Chua co tom tat cong khai"}</p>{preview.sections.map((section, index) => <section key={`${section.title}-${index}`} className="mt-4"><h3 className="font-semibold">{section.title}</h3><p className="whitespace-pre-wrap text-sm">{section.content}</p></section>)}</div></div>}
    </AppShell>
  );
}
