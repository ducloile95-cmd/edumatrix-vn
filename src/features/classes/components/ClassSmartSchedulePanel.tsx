import type { Dispatch, SetStateAction } from "react";
import { format } from "date-fns";
import { generateRecurringSessions } from "@/utils/recurrence";

const DOW_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export interface RecurrenceFormState {
  startDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  sessionCount: number;
}

interface ClassSmartSchedulePanelProps {
  isEditing: boolean;
  isAdmin: boolean;
  useSmartSchedule: boolean;
  setUseSmartSchedule: Dispatch<SetStateAction<boolean>>;
  recurrence: RecurrenceFormState;
  setRecurrence: Dispatch<SetStateAction<RecurrenceFormState>>;
  toggleDay: (day: number) => void;
  recurrencePreview: ReturnType<typeof generateRecurringSessions> | null;
}

export function ClassSmartSchedulePanel({
  isEditing,
  isAdmin,
  useSmartSchedule,
  setUseSmartSchedule,
  recurrence,
  setRecurrence,
  toggleDay,
  recurrencePreview,
}: ClassSmartSchedulePanelProps) {
  return (
    <>
{!isEditing && isAdmin && (
        <div className="mt-4 rounded-card border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-primary-700">Lịch học thông minh</h3>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={useSmartSchedule}
                onChange={(event) => setUseSmartSchedule(event.target.checked)}
                className="size-4 rounded border-neutral-300"
              />
              Tự động sinh buổi học lặp theo tuần
            </label>
          </div>

          {useSmartSchedule && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="recurrence-start-date" className="mb-1 block text-sm font-medium text-neutral-700">
                  Bắt đầu tìm từ ngày<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input
                  id="recurrence-start-date"
                  type="date"
                  value={recurrence.startDate}
                  onChange={(event) => setRecurrence((prev) => ({ ...prev, startDate: event.target.value }))}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="recurrence-session-count" className="mb-1 block text-sm font-medium text-neutral-700">
                  Tổng số buổi<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input
                  id="recurrence-session-count"
                  type="number"
                  min={1}
                  step={1}
                  value={recurrence.sessionCount}
                  onChange={(event) => setRecurrence((prev) => ({ ...prev, sessionCount: Number(event.target.value) }))}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
                />
              </div>

              <div className="sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-neutral-700">
                  Các thứ trong tuần<span className="ml-0.5 text-danger-500">*</span>
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn thứ trong tuần">
                  {DOW_LABEL.map((label, day) => {
                    const checked = recurrence.daysOfWeek.includes(day);
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => toggleDay(day)}
                        className={`min-h-touch rounded-full border px-3.5 text-xs font-semibold transition ${
                          checked
                            ? "border-primary-500 bg-primary-500 text-white"
                            : "border-neutral-300 bg-white text-neutral-600 hover:border-primary-300"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="recurrence-start-time" className="mb-1 block text-sm font-medium text-neutral-700">
                  Giờ bắt đầu<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input
                  id="recurrence-start-time"
                  type="time"
                  value={recurrence.startTime}
                  onChange={(event) => setRecurrence((prev) => ({ ...prev, startTime: event.target.value }))}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="recurrence-end-time" className="mb-1 block text-sm font-medium text-neutral-700">
                  Giờ kết thúc<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input
                  id="recurrence-end-time"
                  type="time"
                  value={recurrence.endTime}
                  onChange={(event) => setRecurrence((prev) => ({ ...prev, endTime: event.target.value }))}
                  className="min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500"
                />
              </div>

              <div className="sm:col-span-2 rounded-input bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                {recurrencePreview ? (
                  <>
                    Buổi đầu:{" "}
                    <span className="font-medium text-neutral-900">
                      {format(recurrencePreview.sessions[0].startAt, "dd/MM/yyyy")}
                    </span>
                    {" · "}Bế giảng dự kiến:{" "}
                    <span className="font-medium text-neutral-900">
                      {format(recurrencePreview.endDate, "dd/MM/yyyy")}
                    </span>
                    {" · "}
                    {recurrencePreview.sessions.length} buổi
                  </>
                ) : (
                  "Điền đủ ngày bắt đầu, các thứ trong tuần, giờ học và tổng số buổi để xem trước lịch."
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
