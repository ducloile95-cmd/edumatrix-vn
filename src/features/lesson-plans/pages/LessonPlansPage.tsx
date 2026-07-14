import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Plus, Save, X } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { Button, IconButton } from "@/components/ui/Button";
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

const DEFAULT_VALUES: LessonPlanFormValues = { title: "", classId: null, courseId: null, subjectId: null, sessionId: null, sections: [{ title: "Mục tiêu", content: "" }, { title: "Nội dung", content: "" }], publicSummary: "", status: "draft" };
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
  const templateMutation = useMutation({ mutationFn: () => createLessonPlanTemplate(form.getValues("title") || "Mẫu giáo án", form.getValues("sections")), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-plan-templates"] }) });

  const openCreate = () => { setEditingId(null); form.reset(DEFAULT_VALUES); setOpen(true); };
  const edit = (plan: LessonPlanDoc & { id: string }) => { setEditingId(plan.id); form.reset({ title: plan.title, classId: plan.classId, courseId: plan.courseId, subjectId: plan.subjectId, sessionId: plan.sessionId, sections: plan.sections, publicSummary: plan.publicSummary, status: plan.status }); setOpen(true); };

  return (
    <AppShell>
      <PageHeader title="Giáo án" description="Soạn theo phần, lưu nháp, gắn lớp và xuất bản tóm tắt công khai."
        actions={(
          <Button variant="primary" onClick={openCreate} icon={<Plus size={18} />}>
            Tạo giáo án
          </Button>
        )} />

      <section className="rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3">Danh sách giáo án</h2>
        {plans.data?.length === 0 && <EmptyState title="Chưa có giáo án" />}
        <ul className="divide-y divide-neutral-100">{plans.data?.map((plan) => <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{plan.title}</p><p className="text-xs text-neutral-500">{plan.status} · {plan.sections.length} section</p></div><div className="flex gap-2"><IconButton title="Xem trước" aria-label="Xem trước" onClick={() => setPreview(plan)}><Eye size={17} /></IconButton><IconButton title="Sao chép" aria-label="Sao chép" onClick={() => copyMutation.mutate(plan.id)}><Copy size={17} /></IconButton><Button onClick={() => edit(plan)}>Sửa</Button></div></li>)}</ul>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editingId ? "Sửa giáo án" : "Tạo giáo án"} description="Soạn theo phần và gắn lớp/khóa học.">
        <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <div className="grid gap-3 md:grid-cols-2">
            <input aria-label="Tên giáo án" placeholder="Tên giáo án" {...form.register("title")} className={`${INPUT} md:col-span-2`} />
            <select aria-label="Trạng thái" {...form.register("status")} className={INPUT}><option value="draft">Bản nháp</option><option value="published">Công khai</option><option value="archived">Lưu trữ</option></select>
            <select aria-label="Mẫu giáo án" onChange={(event) => { const item = templates.data?.find((value) => value.id === event.target.value); if (item) form.setValue("sections", item.sections); }} className={INPUT}><option value="">Chọn mẫu</option>{templates.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select aria-label="Gắn lớp" {...form.register("classId")} className={INPUT}><option value="">Gắn lớp</option>{classes.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select aria-label="Gắn khóa học" {...form.register("courseId")} className={INPUT}><option value="">Gắn khóa học</option>{courses.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select aria-label="Gắn môn học" {...form.register("subjectId")} className={INPUT}><option value="">Gắn môn học</option>{subjects.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input aria-label="Mã buổi học" placeholder="Mã buổi học (tùy chọn)" {...form.register("sessionId")} className={INPUT} />
          </div>
          <div className="mt-4 space-y-3">
            {sections.fields.map((field, index) => <div key={field.id} className="grid gap-2 border-l-2 border-primary-200 pl-3 md:grid-cols-[220px_1fr_auto]"><input aria-label={`Tên section ${index + 1}`} {...form.register(`sections.${index}.title`)} className={INPUT} /><textarea aria-label={`Nội dung section ${index + 1}`} {...form.register(`sections.${index}.content`)} className="min-h-24 rounded-input border border-neutral-300 p-3 text-sm" /><IconButton title="Xóa section" aria-label="Xóa section" onClick={() => sections.remove(index)}><X size={17} /></IconButton></div>)}
          </div>
          <Button className="mt-3" onClick={() => sections.append({ title: "Section mới", content: "" })} icon={<Plus size={17} />}>
            Thêm section
          </Button>
          <textarea aria-label="Tóm tắt công khai" placeholder="Tóm tắt công khai cho phụ huynh/học sinh" {...form.register("publicSummary")} className="mt-3 min-h-20 w-full rounded-input border border-neutral-300 p-3 text-sm" />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button onClick={() => templateMutation.mutate()}>Lưu thành mẫu</Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending} icon={<Save size={17} />}>
              {editingId ? "Lưu thay đổi" : "Lưu giáo án"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} size="lg" title={preview?.title ?? "Giáo án"}>
        <p className="text-sm text-neutral-500">{preview?.publicSummary || "Chưa có tóm tắt công khai"}</p>
        {preview?.sections.map((section, index) => <section key={`${section.title}-${index}`} className="mt-4"><h3 className="font-semibold">{section.title}</h3><p className="whitespace-pre-wrap text-sm">{section.content}</p></section>)}
      </Modal>
    </AppShell>
  );
}
