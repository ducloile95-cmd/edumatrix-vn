import { ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DriveLessonPlanAttachment } from "@/features/lesson-plans/components/DriveLessonPlanAttachment";
import type { LessonPlanDoc, LessonPlanStatus } from "@/types/academic";

interface LessonPlanDetailProps {
  plan: LessonPlanDoc & { id: string };
  classLabel?: string | null;
  sessionLabel?: string | null;
}

const STATUS_TONE: Record<LessonPlanStatus, "success" | "neutral" | "warning"> = {
  draft: "warning",
  published: "success",
  archived: "neutral",
};
const STATUS_LABEL: Record<LessonPlanStatus, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};

/** In truc tiep noi dung giao an - bat class tren <body> de CSS @media print (index.css) an het phan con lai cua trang. */
function handlePrint() {
  const cleanup = () => {
    document.body.classList.remove("printing-lesson-plan");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  document.body.classList.add("printing-lesson-plan");
  window.print();
}

/** Module hien thi giao an dang tai lieu day du - dung lai duoc cho ca xem chi tiet va xem truoc truoc khi luu. */
export function LessonPlanDetail({ plan, classLabel, sessionLabel }: LessonPlanDetailProps) {
  const totalMinutes = plan.activities.reduce((sum, item) => sum + item.durationMinutes, 0);

  return (
    <div className="lesson-plan-print-area space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">{plan.title}</h3>
          {(classLabel || sessionLabel) && (
            <p className="mt-1 text-sm text-neutral-500">{[classLabel, sessionLabel].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <Button type="button" onClick={handlePrint} icon={<Printer size={16} />}>
          In giáo án
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-input border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Trạng thái</p>
          <p className="mt-1"><StatusBadge tone={STATUS_TONE[plan.status]}>{STATUS_LABEL[plan.status]}</StatusBadge></p>
        </div>
        <div className="rounded-input border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Số hoạt động</p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">{plan.activities.length} hoạt động</p>
        </div>
        <div className="rounded-input border border-neutral-200 bg-neutral-50 p-3 sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Tổng thời lượng</p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">{totalMinutes} phút</p>
        </div>
      </div>

      <section>
        <h4 className="mb-2 border-b border-neutral-200 pb-1.5 text-xs font-bold uppercase tracking-wide text-primary-700">Mục tiêu buổi học</h4>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-input bg-primary-50 p-3">
            <p className="text-[10px] font-bold uppercase text-primary-700">Kiến thức</p>
            <p className="mt-1 text-sm text-neutral-700">{plan.objectives.knowledge || "—"}</p>
          </div>
          <div className="rounded-input bg-primary-50 p-3">
            <p className="text-[10px] font-bold uppercase text-primary-700">Kỹ năng</p>
            <p className="mt-1 text-sm text-neutral-700">{plan.objectives.skills || "—"}</p>
          </div>
          <div className="rounded-input bg-primary-50 p-3">
            <p className="text-[10px] font-bold uppercase text-primary-700">Thái độ / Năng lực</p>
            <p className="mt-1 text-sm text-neutral-700">{plan.objectives.attitude || "—"}</p>
          </div>
        </div>
      </section>

      <section>
        <h4 className="mb-2 border-b border-neutral-200 pb-1.5 text-xs font-bold uppercase tracking-wide text-primary-700">Chuẩn bị</h4>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-input border border-neutral-200 p-3">
            <p className="text-[10px] font-bold uppercase text-neutral-500">Giáo viên</p>
            <p className="mt-1 text-sm text-neutral-700">{plan.preparation.teacher || "—"}</p>
          </div>
          <div className="rounded-input border border-neutral-200 p-3">
            <p className="text-[10px] font-bold uppercase text-neutral-500">Học sinh</p>
            <p className="mt-1 text-sm text-neutral-700">{plan.preparation.student || "—"}</p>
          </div>
        </div>
      </section>

      <section>
        <h4 className="mb-2 border-b border-neutral-200 pb-1.5 text-xs font-bold uppercase tracking-wide text-primary-700">Tiến trình buổi học</h4>
        <div className="space-y-2">
          {plan.activities.map((activity, index) => (
            <div key={`${activity.name}-${index}`} className="rounded-input border border-neutral-200 bg-neutral-50 p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-neutral-900">{index + 1}. {activity.name}</span>
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-700">{activity.durationMinutes} phút</span>
              </div>
              <div className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase text-neutral-500">Nội dung</p>
                  <p className="mt-0.5">{activity.content || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-neutral-500">Kết quả mong đợi</p>
                  <p className="mt-0.5">{activity.expectedOutcome || "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-2 border-b border-neutral-200 pb-1.5 text-xs font-bold uppercase tracking-wide text-primary-700">Bài tập về nhà</h4>
        <p className="rounded-input border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">{plan.homework || "Chưa có bài tập"}</p>
      </section>

      {plan.notesAfterTeaching && (
        <section>
          <h4 className="mb-2 border-b border-neutral-200 pb-1.5 text-xs font-bold uppercase tracking-wide text-primary-700">Ghi chú sau buổi dạy</h4>
          <p className="rounded-input border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">{plan.notesAfterTeaching}</p>
        </section>
      )}

      {plan.attachmentUrl && (
        <section>
          <h4 className="mb-2 border-b border-neutral-200 pb-1.5 text-xs font-bold uppercase tracking-wide text-primary-700">Tài liệu đính kèm</h4>
          <a
            href={plan.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-touch items-center gap-2 rounded-input border border-primary-300 bg-primary-50 px-3 text-sm font-semibold text-primary-700 hover:bg-primary-100"
          >
            {plan.attachmentLabel || "Xem tài liệu"} <ExternalLink size={14} />
          </a>
        </section>
      )}

      <DriveLessonPlanAttachment plan={plan} />

      <section>
        <h4 className="mb-2 border-b border-neutral-200 pb-1.5 text-xs font-bold uppercase tracking-wide text-primary-700">Tóm tắt công khai (phụ huynh xem)</h4>
        <p className="rounded-input border border-info-100 bg-info-50 p-3 text-sm text-neutral-700">{plan.publicSummary || "Chưa có tóm tắt công khai"}</p>
      </section>
    </div>
  );
}
