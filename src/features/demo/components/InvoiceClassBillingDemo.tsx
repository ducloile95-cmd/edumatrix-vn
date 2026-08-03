import { useMemo, useState } from "react";
import { BookOpenCheck, ReceiptText, School, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatVnd } from "@/utils/currency";

interface DemoStudent {
  id: string;
  name: string;
  code: string;
}

type BillingMode = "class" | "module";

interface DemoBillingGroup {
  id: string;
  name: string;
  subtitle: string;
  amount: number;
  pricing: "session" | "flat";
  students: DemoStudent[];
}

const DEMO_CLASSES: DemoBillingGroup[] = [
  {
    id: "ielts-a1",
    name: "IELTS Foundation A1",
    subtitle: "IELTS Foundation",
    amount: 280_000,
    pricing: "session",
    students: [
      { id: "hs001", name: "Nguyễn Minh Anh", code: "HS001" },
      { id: "hs014", name: "Trần Gia Hân", code: "HS014" },
      { id: "hs027", name: "Lê Minh Khang", code: "HS027" },
    ],
  },
  {
    id: "toeic-b1",
    name: "TOEIC Essentials B1",
    subtitle: "TOEIC Essentials",
    amount: 240_000,
    pricing: "session",
    students: [
      { id: "hs032", name: "Phạm Hoàng Nam", code: "HS032" },
      { id: "hs041", name: "Vũ Khánh Linh", code: "HS041" },
    ],
  },
  {
    id: "writing-c1",
    name: "Luyện viết học thuật C1",
    subtitle: "Academic Writing",
    amount: 320_000,
    pricing: "session",
    students: [],
  },
];

const DEMO_MODULES: DemoBillingGroup[] = [
  {
    id: "writing-foundation",
    name: "IELTS Writing Foundation",
    subtitle: "Học phần 8 buổi",
    amount: 2_400_000,
    pricing: "flat",
    students: [
      { id: "hs001", name: "Nguyễn Minh Anh", code: "HS001" },
      { id: "hs014", name: "Trần Gia Hân", code: "HS014" },
      { id: "hs032", name: "Phạm Hoàng Nam", code: "HS032" },
    ],
  },
  {
    id: "toeic-listening",
    name: "TOEIC Listening Intensive",
    subtitle: "Học phần 6 buổi",
    amount: 1_680_000,
    pricing: "flat",
    students: [
      { id: "hs027", name: "Lê Minh Khang", code: "HS027" },
      { id: "hs041", name: "Vũ Khánh Linh", code: "HS041" },
    ],
  },
];

const FIELD_CLASS = "min-h-11 w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500";
const PANEL_CLASS = "min-w-0 overflow-hidden rounded-card border border-neutral-200 bg-white";

export function InvoiceClassBillingDemo({ onClose }: { onClose: () => void }) {
  const [billingMode, setBillingMode] = useState<BillingMode>("class");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [sessionCount, setSessionCount] = useState(4);
  const [title, setTitle] = useState("Học phí tháng 08/2026");
  const [dueAt, setDueAt] = useState("2026-08-10");

  const billingGroups = billingMode === "class" ? DEMO_CLASSES : DEMO_MODULES;
  const selectedGroup = useMemo(
    () => billingGroups.find((item) => item.id === selectedGroupId),
    [billingGroups, selectedGroupId],
  );
  const selectedStudents = selectedGroup?.students.filter((student) => selectedStudentIds.includes(student.id)) ?? [];
  const amountPerStudent = selectedGroup
    ? selectedGroup.pricing === "session" ? selectedGroup.amount * sessionCount : selectedGroup.amount
    : 0;
  const batchTotal = amountPerStudent * selectedStudents.length;
  const allStudentsSelected = !!selectedGroup?.students.length && selectedStudentIds.length === selectedGroup.students.length;
  const modeLabel = billingMode === "class" ? "lớp" : "học phần";
  const selectionLabel = billingMode === "class" ? "lớp học" : "học phần";

  function changeBillingMode(mode: BillingMode) {
    setBillingMode(mode);
    setSelectedGroupId("");
    setSelectedStudentIds([]);
    setTitle(mode === "class" ? "Học phí tháng 08/2026" : "Học phí học phần tháng 08/2026");
  }

  function selectGroup(groupId: string) {
    setSelectedGroupId(groupId);
    setSelectedStudentIds([]);
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
  }

  function toggleAllStudents() {
    if (!selectedGroup) return;
    setSelectedStudentIds(allStudentsSelected ? [] : selectedGroup.students.map((student) => student.id));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (selectedStudents.length > 0) onClose();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50/70 p-4 sm:p-6">
        <div className="mx-auto mb-4 flex max-w-[1600px] flex-col gap-3 rounded-card border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-neutral-900">Loại hóa đơn</p><p className="mt-0.5 text-xs text-neutral-500">Chọn cách tính học phí trước khi chọn người học.</p></div>
          <div role="tablist" aria-label="Chọn loại hóa đơn" className="grid grid-cols-2 gap-1 rounded-input border border-neutral-200 bg-neutral-50 p-1">
            <button type="button" role="tab" aria-selected={billingMode === "class"} onClick={() => changeBillingMode("class")} className={`min-h-10 rounded-lg px-4 text-xs font-bold transition ${billingMode === "class" ? "bg-white text-primary-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}>Theo lớp học</button>
            <button type="button" role="tab" aria-selected={billingMode === "module"} onClick={() => changeBillingMode("module")} className={`min-h-10 rounded-lg px-4 text-xs font-bold transition ${billingMode === "module" ? "bg-white text-primary-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}>Hóa đơn học phần</button>
          </div>
        </div>
        <div className="mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[minmax(300px,.82fr)_minmax(360px,1fr)_minmax(300px,.78fr)] xl:items-start">
          <section className={PANEL_CLASS} aria-labelledby="invoice-demo-class-heading">
            <PanelHeader
              icon={billingMode === "class" ? <School size={17} aria-hidden="true" /> : <BookOpenCheck size={17} aria-hidden="true" />}
              id="invoice-demo-class-heading"
              title={billingMode === "class" ? "Chọn lớp lập học phí" : "Chọn học phần"}
              description={billingMode === "class" ? "Mở từ Lớp học, cột Thao tác." : "Mức thu trọn gói theo từng học phần."}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[300px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5" scope="col">{billingMode === "class" ? "Lớp học" : "Học phần"}</th>
                    <th className="px-4 py-2.5 text-right" scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {billingGroups.map((item) => {
                    const selected = item.id === selectedGroupId;
                    return (
                      <tr key={item.id} className={selected ? "bg-primary-50" : "hover:bg-neutral-50"}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-neutral-900">{item.name}</p>
                          <p className="mt-0.5 text-xs text-neutral-500">{item.students.length} học sinh - {formatVnd(item.amount)}{item.pricing === "session" ? "/buổi" : "/học phần"}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            aria-pressed={selected}
                            aria-label={`${selected ? `Đã chọn ${modeLabel}` : `Chọn ${modeLabel}`} ${item.name}`}
                            onClick={() => selectGroup(item.id)}
                            className={`min-h-9 whitespace-nowrap rounded-input border px-3 text-xs font-bold transition active:scale-[.98] ${selected ? "border-primary-600 bg-primary-600 text-white" : "border-neutral-300 bg-white text-primary-700 hover:border-primary-300 hover:bg-primary-50"}`}
                          >
                            {selected ? "Đã chọn" : billingMode === "class" ? "Chọn lớp" : "Chọn"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className={PANEL_CLASS} aria-labelledby="invoice-demo-student-heading">
            <PanelHeader
              icon={<UsersRound size={17} aria-hidden="true" />}
              id="invoice-demo-student-heading"
              title="Chọn học sinh"
              description={selectedGroup ? selectedGroup.name : `Danh sách hiển thị sau khi chọn ${selectionLabel}.`}
            />
            {!selectedGroup ? (
              <div className="grid min-h-56 place-items-center px-6 py-10 text-center">
                <div>{billingMode === "class" ? <School className="mx-auto text-neutral-300" size={30} aria-hidden="true" /> : <BookOpenCheck className="mx-auto text-neutral-300" size={30} aria-hidden="true" />}<p className="mt-3 text-sm font-bold text-neutral-700">Chưa chọn {selectionLabel}</p><p className="mt-1 text-xs leading-5 text-neutral-500">Chọn một {selectionLabel} ở bảng bên trái để xem học sinh.</p></div>
              </div>
            ) : selectedGroup.students.length === 0 ? (
              <div className="grid min-h-56 place-items-center px-6 py-10 text-center">
                <div><UsersRound className="mx-auto text-neutral-300" size={30} aria-hidden="true" /><p className="mt-3 text-sm font-bold text-neutral-700">Chưa có học sinh</p><p className="mt-1 text-xs leading-5 text-neutral-500">Ghi danh học sinh trước khi tạo hóa đơn.</p></div>
              </div>
            ) : (
              <fieldset>
                <legend className="sr-only">Danh sách học sinh của {selectedGroup.name}</legend>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-4 text-xs font-bold text-neutral-700">
                  <input type="checkbox" checked={allStudentsSelected} onChange={toggleAllStudents} className="size-4 accent-primary-600" />
                  Chọn tất cả ({selectedGroup.students.length})
                </label>
                <div className="divide-y divide-neutral-100">
                  {selectedGroup.students.map((student) => (
                    <label key={student.id} className="flex min-h-[58px] cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-primary-50/60">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="size-4 shrink-0 accent-primary-600"
                      />
                      <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-neutral-900">{student.name}</strong><span className="mt-0.5 block text-xs text-neutral-500">{student.code}</span></span>
                      <span className="text-xs font-semibold tabular-nums text-neutral-500">{formatVnd(amountPerStudent)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </section>

          <section className={PANEL_CLASS} aria-labelledby="invoice-demo-detail-heading">
            <PanelHeader
              icon={<ReceiptText size={17} aria-hidden="true" />}
              id="invoice-demo-detail-heading"
              title="Thông tin hóa đơn"
              description="Áp dụng cùng nội dung cho học sinh đã chọn."
            />
            <div className="grid gap-4 p-4">
              <Field label="Nội dung thu" htmlFor="invoice-demo-title">
                <input id="invoice-demo-title" required value={title} onChange={(event) => setTitle(event.target.value)} className={FIELD_CLASS} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                {billingMode === "class" ? <Field label="Số buổi" htmlFor="invoice-demo-sessions"><input id="invoice-demo-sessions" required type="number" min={1} value={sessionCount} onChange={(event) => setSessionCount(Math.max(1, Number(event.target.value)))} className={FIELD_CLASS} /></Field> : <Field label="Mức thu học phần" htmlFor="invoice-demo-module-fee"><input id="invoice-demo-module-fee" value={selectedGroup ? formatVnd(selectedGroup.amount) : "Chọn học phần"} readOnly className={`${FIELD_CLASS} bg-neutral-100`} /></Field>}
                <Field label="Hạn thanh toán" htmlFor="invoice-demo-due-date">
                  <input id="invoice-demo-due-date" required type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className={FIELD_CLASS} />
                </Field>
              </div>
              <div className="rounded-input border border-primary-100 bg-primary-50 p-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3 text-xs text-neutral-600"><span>{billingMode === "class" ? "Học phí mỗi học sinh" : "Học phí học phần / học sinh"}</span><strong className="tabular-nums text-neutral-900">{formatVnd(amountPerStudent)}</strong></div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-neutral-600"><span>Số học sinh đã chọn</span><strong className="tabular-nums text-neutral-900">{selectedStudents.length}</strong></div>
                <div className="mt-3 border-t border-primary-100 pt-3"><span className="block text-xs font-bold text-primary-700">Tổng giá trị dự kiến</span><strong className="mt-1 block text-2xl font-black tabular-nums text-primary-800">{formatVnd(batchTotal)}</strong></div>
              </div>
              <p className="text-xs leading-5 text-neutral-500">Mỗi học sinh sẽ nhận một hóa đơn riêng để theo dõi và đối soát độc lập.</p>
            </div>
          </section>
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p aria-live="polite" className="text-xs text-neutral-500"><strong className="text-neutral-700">Bản demo:</strong> {selectedStudents.length} học sinh đã chọn, chưa ghi dữ liệu thật.</p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button type="button" onClick={onClose}>Hủy</Button>
          <Button type="submit" variant="primary" disabled={!selectedStudents.length || !title || !dueAt}>
            Tạo {selectedStudents.length || ""} hóa đơn
          </Button>
        </div>
      </footer>
    </form>
  );
}

function PanelHeader({ description, icon, id, title }: { description: string; icon: React.ReactNode; id: string; title: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-input bg-primary-50 text-primary-700">{icon}</span>
      <div className="min-w-0"><h3 id={id} className="text-sm font-bold text-neutral-900">{title}</h3><p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p></div>
    </div>
  );
}

function Field({ children, htmlFor, label }: { children: React.ReactNode; htmlFor: string; label: string }) {
  return <div><label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-neutral-700">{label}<span className="ml-0.5 text-danger-500" aria-hidden="true">*</span><span className="sr-only"> (bắt buộc)</span></label>{children}</div>;
}
