import { useId } from "react";
import { UserRound } from "lucide-react";
import { studentLabel } from "@/utils/student";

type ViewerStudent = {
  id: string;
  fullName: string;
  nickname?: string;
};

export function ViewerStudentSwitcher({
  onSelect,
  selectedStudentId,
  students,
}: {
  onSelect: (studentId: string) => void;
  selectedStudentId: string;
  students: ViewerStudent[];
}) {
  const selectId = useId();
  if (students.length <= 1) return null;

  return (
    <section aria-label="Chọn học sinh">
      <label
        htmlFor={selectId}
        className="grid min-h-touch grid-cols-[auto_1fr] items-center gap-x-3 rounded-card border border-primary-200 bg-primary-50 px-3 py-2 md:hidden"
      >
        <span className="row-span-2 grid size-9 place-items-center rounded-full bg-white text-primary-700">
          <UserRound size={18} aria-hidden="true" />
        </span>
        <span className="text-2xs font-semibold text-primary-700">Đang xem thông tin của</span>
        <select
          id={selectId}
          value={selectedStudentId}
          onChange={(event) => onSelect(event.target.value)}
          className="min-h-touch min-w-0 appearance-none bg-transparent pr-7 text-sm font-bold text-neutral-900 focus-visible:outline-none"
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {studentLabel(student)}
            </option>
          ))}
        </select>
      </label>

      <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
        {students.map((student) => (
          <button
            key={student.id}
            type="button"
            onClick={() => onSelect(student.id)}
            aria-pressed={selectedStudentId === student.id}
            className={`motion-control min-h-touch shrink-0 rounded-input border px-4 text-sm font-semibold active:scale-[.98] ${
              selectedStudentId === student.id
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-primary-300"
            }`}
          >
            {studentLabel(student)}
          </button>
        ))}
      </div>
    </section>
  );
}
