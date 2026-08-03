import { useMemo, useState } from "react";
import { BookOpenCheck, ReceiptText, School, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ClassDoc, CourseDoc, StudentDoc } from "@/types/academic";
import { formatVnd } from "@/utils/currency";
import { studentLabel } from "@/utils/student";

type BillingMode = "class" | "module";

export interface InvoiceCreationValues {
  studentIds: string[];
  courseId: string;
  title: string;
  amount: number;
  dueAt: Date;
}

interface InvoiceCreationFormProps {
  students: Array<StudentDoc & { id: string }>;
  classes: Array<ClassDoc & { id: string }>;
  courses: Array<CourseDoc & { id: string }>;
  bankBin: string;
  accountNumber: string;
  accountName: string;
  isPending: boolean;
  isError: boolean;
  onCancel: () => void;
  onSubmit: (values: InvoiceCreationValues) => void;
}

const FIELD_CLASS = "min-h-11 w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500";
const PANEL_CLASS = "min-w-0 overflow-hidden rounded-card border border-neutral-200 bg-white";

export function InvoiceCreationForm({
  students,
  classes,
  courses,
  bankBin,
  accountNumber,
  accountName,
  isPending,
  isError,
  onCancel,
  onSubmit,
}: InvoiceCreationFormProps) {
  const [billingMode, setBillingMode] = useState<BillingMode>("class");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [sessionCount, setSessionCount] = useState(1);
  const [title, setTitle] = useState("Học phí");
  const [dueAt, setDueAt] = useState("");

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const selectedClass = billingMode === "class" ? classes.find((item) => item.id === selectedTargetId) : undefined;
  const selectedCourse = billingMode === "module"
    ? courses.find((item) => item.id === selectedTargetId)
    : selectedClass ? courseById.get(selectedClass.courseId) : undefined;
  const eligibleStudentIds = useMemo(() => {
    if (billingMode === "class") return selectedClass?.studentIds ?? [];
    if (!selectedCourse) return [];
    return [...new Set(classes.filter((item) => item.courseId === selectedCourse.id).flatMap((item) => item.studentIds))];
  }, [billingMode, classes, selectedClass, selectedCourse]);
  const eligibleStudents = eligibleStudentIds.map((id) => studentById.get(id)).filter((student): student is StudentDoc & { id: string } => !!student);
  const selectedStudents = eligibleStudents.filter((student) => selectedStudentIds.includes(student.id));
  const unitPrice = selectedCourse
    ? selectedCourse.pricePerSession ?? Math.round(selectedCourse.tuitionFee / selectedCourse.totalSessions)
    : 0;
  const amountPerStudent = selectedCourse
    ? billingMode === "class" ? unitPrice * sessionCount : selectedCourse.tuitionFee
    : 0;
  const allSelected = eligibleStudents.length > 0 && selectedStudentIds.length === eligibleStudents.length;
  const targetLabel = billingMode === "class" ? "lớp học" : "học phần";
  const canSubmit = selectedStudents.length > 0 && amountPerStudent > 0 && title.trim() !== "" && dueAt !== "" && accountNumber !== "";

  function changeBillingMode(mode: BillingMode) {
    setBillingMode(mode);
    setSelectedTargetId("");
    setSelectedStudentIds([]);
    setTitle(mode === "class" ? "Học phí" : "Học phí học phần");
  }

  function selectTarget(targetId: string) {
    setSelectedTargetId(targetId);
    setSelectedStudentIds([]);
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  }

  function toggleAllStudents() {
    setSelectedStudentIds(allSelected ? [] : eligibleStudents.map((student) => student.id));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit || !selectedCourse || isPending) return;
        onSubmit({
          studentIds: selectedStudents.map((student) => student.id),
          courseId: selectedCourse.id,
          title: title.trim(),
          amount: amountPerStudent,
          dueAt: new Date(`${dueAt}T00:00:00`),
        });
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50/70 p-4 sm:p-6">
        <div className="mx-auto mb-4 flex max-w-[1600px] flex-col gap-3 rounded-card border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-neutral-900">Loại hóa đơn</p><p className="mt-0.5 text-xs text-neutral-500">Chọn cách tính học phí trước khi chọn người học.</p></div>
          <div role="tablist" aria-label="Chọn loại hóa đơn" className="grid grid-cols-2 gap-1 rounded-input border border-neutral-200 bg-neutral-50 p-1">
            <ModeTab active={billingMode === "class"} onClick={() => changeBillingMode("class")}>Theo lớp học</ModeTab>
            <ModeTab active={billingMode === "module"} onClick={() => changeBillingMode("module")}>Hóa đơn học phần</ModeTab>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[minmax(300px,.82fr)_minmax(360px,1fr)_minmax(300px,.78fr)] xl:items-start">
          <section className={PANEL_CLASS} aria-labelledby="invoice-target-heading">
            <PanelHeader
              icon={billingMode === "class" ? <School size={17} /> : <BookOpenCheck size={17} />}
              id="invoice-target-heading"
              title={billingMode === "class" ? "Chọn lớp lập học phí" : "Chọn học phần"}
              description={billingMode === "class" ? "Học phí được tính theo số buổi." : "Mức thu trọn gói của học phần."}
            />
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[300px] text-left text-sm">
                <thead className="sticky top-0 border-b border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-500"><tr><th className="px-4 py-2.5">{billingMode === "class" ? "Lớp học" : "Học phần"}</th><th className="px-4 py-2.5 text-right">Thao tác</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {(billingMode === "class" ? classes : courses).map((item) => {
                    const selected = item.id === selectedTargetId;
                    const course = billingMode === "class" ? courseById.get((item as ClassDoc).courseId) : item as CourseDoc & { id: string };
                    const studentCount = billingMode === "class"
                      ? (item as ClassDoc).studentIds.length
                      : new Set(classes.filter((klass) => klass.courseId === item.id).flatMap((klass) => klass.studentIds)).size;
                    const amount = course ? billingMode === "class"
                      ? course.pricePerSession ?? Math.round(course.tuitionFee / course.totalSessions)
                      : course.tuitionFee : 0;
                    return (
                      <tr key={item.id} className={selected ? "bg-primary-50" : "hover:bg-neutral-50"}>
                        <td className="px-4 py-3"><p className="font-bold text-neutral-900">{item.name}</p><p className="mt-0.5 text-xs text-neutral-500">{studentCount} học sinh · {formatVnd(amount)}{billingMode === "class" ? "/buổi" : "/học phần"}</p></td>
                        <td className="px-4 py-3 text-right"><button type="button" aria-pressed={selected} aria-label={`${selected ? "Đã chọn" : "Chọn"} ${targetLabel} ${item.name}`} onClick={() => selectTarget(item.id)} className={`min-h-9 rounded-input border px-3 text-xs font-bold transition ${selected ? "border-primary-600 bg-primary-600 text-white" : "border-neutral-300 bg-white text-primary-700 hover:border-primary-300 hover:bg-primary-50"}`}>{selected ? "Đã chọn" : billingMode === "class" ? "Chọn lớp" : "Chọn"}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className={PANEL_CLASS} aria-labelledby="invoice-students-heading">
            <PanelHeader icon={<UsersRound size={17} />} id="invoice-students-heading" title="Chọn học sinh" description={selectedCourse?.name ?? `Danh sách hiển thị sau khi chọn ${targetLabel}.`} />
            {!selectedCourse ? <EmptySelection icon={billingMode === "class" ? <School size={30} /> : <BookOpenCheck size={30} />} title={`Chưa chọn ${targetLabel}`} description={`Chọn một ${targetLabel} ở bảng bên trái để xem học sinh.`} /> : eligibleStudents.length === 0 ? <EmptySelection icon={<UsersRound size={30} />} title="Chưa có học sinh" description="Ghi danh học sinh vào lớp thuộc nội dung này trước khi tạo hóa đơn." /> : (
              <fieldset><legend className="sr-only">Danh sách học sinh của {selectedCourse.name}</legend>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 text-xs font-bold text-neutral-700"><input type="checkbox" checked={allSelected} onChange={toggleAllStudents} className="size-4 accent-primary-600" />Chọn tất cả ({eligibleStudents.length})</label>
                <div className="max-h-[365px] divide-y divide-neutral-100 overflow-y-auto">{eligibleStudents.map((student) => <label key={student.id} className="flex min-h-[58px] cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-primary-50/60"><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} className="size-4 shrink-0 accent-primary-600" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-neutral-900">{studentLabel(student)}</strong><span className="mt-0.5 block text-xs text-neutral-500">{student.studentCode}</span></span><span className="text-xs font-semibold tabular-nums text-neutral-500">{formatVnd(amountPerStudent)}</span></label>)}</div>
              </fieldset>
            )}
          </section>

          <section className={PANEL_CLASS} aria-labelledby="invoice-details-heading">
            <PanelHeader icon={<ReceiptText size={17} />} id="invoice-details-heading" title="Thông tin hóa đơn" description="Áp dụng cùng nội dung cho học sinh đã chọn." />
            <div className="grid gap-4 p-4">
              <Field label="Nội dung thu" htmlFor="invoice-title"><input id="invoice-title" required value={title} onChange={(event) => setTitle(event.target.value)} className={FIELD_CLASS} /></Field>
              <div className="grid grid-cols-2 gap-3">
                {billingMode === "class" ? <Field label="Số buổi" htmlFor="invoice-sessions"><input id="invoice-sessions" required type="number" min={1} step={1} value={sessionCount} onChange={(event) => setSessionCount(Math.max(1, Number(event.target.value)))} className={FIELD_CLASS} /></Field> : <Field label="Mức thu học phần" htmlFor="invoice-module-fee"><input id="invoice-module-fee" value={selectedCourse ? formatVnd(selectedCourse.tuitionFee) : "Chọn học phần"} readOnly className={`${FIELD_CLASS} bg-neutral-100`} /></Field>}
                <Field label="Hạn thanh toán" htmlFor="invoice-due-at"><input id="invoice-due-at" required type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className={FIELD_CLASS} /></Field>
              </div>
              <div className="rounded-input border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600"><p className="font-bold text-neutral-800">Tài khoản nhận: {accountNumber || "Chưa cấu hình"}</p><p className="mt-1">{accountName} · Mã ngân hàng {bankBin}</p></div>
              <div className="rounded-input border border-primary-100 bg-primary-50 p-3" aria-live="polite"><SummaryRow label="Học phí mỗi học sinh" value={formatVnd(amountPerStudent)} /><SummaryRow label="Số học sinh đã chọn" value={String(selectedStudents.length)} /><div className="mt-3 border-t border-primary-100 pt-3"><span className="block text-xs font-bold text-primary-700">Tổng giá trị dự kiến</span><strong className="mt-1 block text-2xl font-black tabular-nums text-primary-800">{formatVnd(amountPerStudent * selectedStudents.length)}</strong></div></div>
              <p className="text-xs leading-5 text-neutral-500">Mỗi học sinh nhận một hóa đơn riêng để theo dõi và đối soát độc lập.</p>
            </div>
          </section>
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><p aria-live="polite" className="text-xs text-neutral-500">{selectedStudents.length} học sinh đã chọn.</p>{isError && <p role="alert" className="mt-1 text-xs font-semibold text-danger-700">Không thể tạo hóa đơn. Dữ liệu vẫn được giữ lại.</p>}</div>
        <div className="grid grid-cols-2 gap-2 sm:flex"><Button type="button" onClick={onCancel}>Hủy</Button><Button type="submit" variant="primary" disabled={!canSubmit || isPending}>{isPending ? "Đang tạo..." : `Tạo ${selectedStudents.length || ""} hóa đơn`}</Button></div>
      </footer>
    </form>
  );
}

function ModeTab({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`min-h-10 rounded-lg px-4 text-xs font-bold transition ${active ? "bg-white text-primary-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}>{children}</button>;
}

function PanelHeader({ description, icon, id, title }: { description: string; icon: React.ReactNode; id: string; title: string }) {
  return <div className="flex items-start gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3"><span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-input bg-primary-50 text-primary-700">{icon}</span><div className="min-w-0"><h3 id={id} className="text-sm font-bold text-neutral-900">{title}</h3><p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p></div></div>;
}

function EmptySelection({ description, icon, title }: { description: string; icon: React.ReactNode; title: string }) {
  return <div className="grid min-h-56 place-items-center px-6 py-10 text-center"><div><span aria-hidden="true" className="mx-auto grid place-items-center text-neutral-300">{icon}</span><p className="mt-3 text-sm font-bold text-neutral-700">{title}</p><p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p></div></div>;
}

function Field({ children, htmlFor, label }: { children: React.ReactNode; htmlFor: string; label: string }) {
  return <div><label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-neutral-700">{label}<span className="ml-0.5 text-danger-500" aria-hidden="true">*</span></label>{children}</div>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 text-xs text-neutral-600"><span>{label}</span><strong className="tabular-nums text-neutral-900">{value}</strong></div>;
}
