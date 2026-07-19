import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { sessionFormSchema, type SessionFormValues } from "@/schemas/session";
import type { CreateSessionsInput } from "@/services/firestore/sessions";
import type { ClassDoc, SessionDoc } from "@/types/academic";
import {
  generateRecurringSessions,
  SCHOOL_TIME_ZONE,
  schoolDateTimeToDate,
} from "@/utils/recurrence";

type ClassOption = ClassDoc & { id: string };
type SessionOption = SessionDoc & { id: string };

interface CreateSessionModalProps {
  open: boolean;
  classes: ClassOption[];
  cancelledSessions: SessionOption[];
  isPending: boolean;
  isError: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSessionsInput) => void;
}

const INPUT =
  "min-h-touch w-full rounded-input border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100";
const DOW_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function defaultValues(): SessionFormValues {
  return {
    scheduleMode: "single",
    classId: "",
    title: "Buổi học",
    startAt: "",
    endAt: "",
    recurrenceStartDate: formatInTimeZone(new Date(), SCHOOL_TIME_ZONE, "yyyy-MM-dd"),
    recurrenceDays: [],
    recurrenceStartTime: "19:45",
    recurrenceEndTime: "21:00",
    sessionCount: 1,
    location: "",
    note: "",
    makeUpForSessionId: "",
  };
}

function calendarDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="mt-1 text-xs text-danger-700">{message}</p>;
}

export function CreateSessionModal({
  open,
  classes,
  cancelledSessions,
  isPending,
  isError,
  onClose,
  onSubmit,
}: CreateSessionModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: defaultValues(),
  });

  const mode = watch("scheduleMode");
  const recurrenceStartDate = watch("recurrenceStartDate");
  const recurrenceDays = watch("recurrenceDays");
  const recurrenceStartTime = watch("recurrenceStartTime");
  const recurrenceEndTime = watch("recurrenceEndTime");
  const sessionCount = watch("sessionCount");

  useEffect(() => {
    if (!open) reset(defaultValues());
  }, [open, reset]);

  const recurrencePreview = useMemo(() => {
    if (
      mode !== "weekly"
      || !recurrenceStartDate
      || recurrenceDays.length === 0
      || !recurrenceStartTime
      || !recurrenceEndTime
      || recurrenceEndTime <= recurrenceStartTime
      || sessionCount < 1
      || sessionCount > 200
    ) return null;

    return generateRecurringSessions({
      startDate: calendarDate(recurrenceStartDate),
      daysOfWeek: recurrenceDays,
      startTime: recurrenceStartTime,
      endTime: recurrenceEndTime,
      sessionCount,
    });
  }, [mode, recurrenceDays, recurrenceEndTime, recurrenceStartDate, recurrenceStartTime, sessionCount]);

  function close() {
    if (isPending) return;
    reset(defaultValues());
    onClose();
  }

  function toggleDay(day: number) {
    const next = recurrenceDays.includes(day)
      ? recurrenceDays.filter((item) => item !== day)
      : [...recurrenceDays, day].sort((a, b) => a - b);
    setValue("recurrenceDays", next, { shouldDirty: true, shouldValidate: true });
  }

  function submit(values: SessionFormValues) {
    const occurrences = values.scheduleMode === "single"
      ? [{ startAt: schoolDateTimeToDate(values.startAt), endAt: schoolDateTimeToDate(values.endAt) }]
      : generateRecurringSessions({
          startDate: calendarDate(values.recurrenceStartDate),
          daysOfWeek: values.recurrenceDays,
          startTime: values.recurrenceStartTime,
          endTime: values.recurrenceEndTime,
          sessionCount: values.sessionCount,
        }).sessions;

    onSubmit({
      classId: values.classId,
      title: values.title,
      occurrences,
      location: values.location,
      note: values.note,
      makeUpForSessionId: values.scheduleMode === "single" && values.makeUpForSessionId
        ? values.makeUpForSessionId
        : null,
    });
  }

  const previewDates = recurrencePreview?.sessions.slice(0, 4) ?? [];

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Tạo lịch học"
      description="Tạo một buổi riêng lẻ hoặc lịch lặp nhiều ngày trong tuần."
      bodyClassName="overflow-y-auto bg-neutral-50"
    >
      <form onSubmit={handleSubmit(submit)} className="flex min-h-0 flex-col">
        <div className="space-y-5 p-4 sm:p-6">
          <section aria-labelledby="session-basic-heading">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays size={18} className="text-primary-600" aria-hidden="true" />
              <h3 id="session-basic-heading" className="text-sm font-bold text-neutral-900">Thông tin buổi học</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="session-classId" className="mb-1 block text-sm font-medium text-neutral-700">
                  Lớp học<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <select id="session-classId" {...register("classId")} className={INPUT}>
                  <option value="">Chọn lớp học</option>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <FieldError message={errors.classId?.message} />
              </div>
              <div>
                <label htmlFor="session-title" className="mb-1 block text-sm font-medium text-neutral-700">
                  Tên buổi học<span className="ml-0.5 text-danger-500">*</span>
                </label>
                <input id="session-title" {...register("title")} className={INPUT} />
                <FieldError message={errors.title?.message} />
              </div>
            </div>
          </section>

          <section aria-labelledby="session-time-heading" className="border-t border-neutral-200 pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock3 size={18} className="text-primary-600" aria-hidden="true" />
                <h3 id="session-time-heading" className="text-sm font-bold text-neutral-900">Thời gian và tần suất</h3>
              </div>
              <div className="grid grid-cols-2 rounded-input bg-neutral-200/70 p-1" role="group" aria-label="Kiểu lịch học">
                {([
                  ["single", "Một buổi"],
                  ["weekly", "Lặp hàng tuần"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => setValue("scheduleMode", value, { shouldValidate: true })}
                    className={`min-h-9 rounded-[7px] px-3 text-xs font-semibold transition ${
                      mode === value ? "bg-white text-primary-700 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "single" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="session-startAt" className="mb-1 block text-sm font-medium text-neutral-700">Bắt đầu<span className="ml-0.5 text-danger-500">*</span></label>
                  <input id="session-startAt" type="datetime-local" {...register("startAt")} className={INPUT} />
                  <FieldError message={errors.startAt?.message} />
                </div>
                <div>
                  <label htmlFor="session-endAt" className="mb-1 block text-sm font-medium text-neutral-700">Kết thúc<span className="ml-0.5 text-danger-500">*</span></label>
                  <input id="session-endAt" type="datetime-local" {...register("endAt")} className={INPUT} />
                  <FieldError message={errors.endAt?.message} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="session-makeup" className="mb-1 block text-sm font-medium text-neutral-700">Buổi gốc cần học bù</label>
                  <select id="session-makeup" {...register("makeUpForSessionId")} className={INPUT}>
                    <option value="">Không phải buổi học bù</option>
                    {cancelledSessions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} - {formatInTimeZone(item.startAt.toDate(), SCHOOL_TIME_ZONE, "dd/MM/yyyy HH:mm")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="recurrence-start-date" className="mb-1 block text-sm font-medium text-neutral-700">Bắt đầu tìm từ ngày<span className="ml-0.5 text-danger-500">*</span></label>
                    <input id="recurrence-start-date" type="date" {...register("recurrenceStartDate")} className={INPUT} />
                    <FieldError message={errors.recurrenceStartDate?.message} />
                  </div>
                  <div>
                    <label htmlFor="session-count" className="mb-1 block text-sm font-medium text-neutral-700">Tổng số buổi<span className="ml-0.5 text-danger-500">*</span></label>
                    <input id="session-count" type="number" min={1} max={200} {...register("sessionCount")} className={INPUT} />
                    <FieldError message={errors.sessionCount?.message} />
                  </div>
                </div>
                <div>
                  <span className="mb-1 block text-sm font-medium text-neutral-700">Các thứ trong tuần<span className="ml-0.5 text-danger-500">*</span></span>
                  <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Chọn các thứ trong tuần">
                    {DOW_LABELS.map((label, day) => {
                      const selected = recurrenceDays.includes(day);
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleDay(day)}
                          className={`min-h-touch rounded-input border text-xs font-bold transition ${
                            selected
                              ? "border-primary-500 bg-primary-500 text-white"
                              : "border-neutral-300 bg-white text-neutral-600 hover:border-primary-300 hover:text-primary-700"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError message={errors.recurrenceDays?.message} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="recurrence-start-time" className="mb-1 block text-sm font-medium text-neutral-700">Giờ bắt đầu<span className="ml-0.5 text-danger-500">*</span></label>
                    <input id="recurrence-start-time" type="time" {...register("recurrenceStartTime")} className={INPUT} />
                    <FieldError message={errors.recurrenceStartTime?.message} />
                  </div>
                  <div>
                    <label htmlFor="recurrence-end-time" className="mb-1 block text-sm font-medium text-neutral-700">Giờ kết thúc<span className="ml-0.5 text-danger-500">*</span></label>
                    <input id="recurrence-end-time" type="time" {...register("recurrenceEndTime")} className={INPUT} />
                    <FieldError message={errors.recurrenceEndTime?.message} />
                  </div>
                </div>

                <div className="rounded-input border border-primary-100 bg-primary-50/60 p-3" aria-live="polite">
                  {recurrencePreview ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-primary-700">Xem trước lịch</p>
                        <p className="mt-1 text-sm text-neutral-700">
                          {recurrencePreview.sessions.length} buổi, từ <strong>{formatInTimeZone(recurrencePreview.sessions[0].startAt, SCHOOL_TIME_ZONE, "dd/MM/yyyy")}</strong> đến <strong>{formatInTimeZone(recurrencePreview.endDate, SCHOOL_TIME_ZONE, "dd/MM/yyyy")}</strong>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {previewDates.map((item) => (
                          <span key={item.startAt.toISOString()} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-primary-100">
                            {formatInTimeZone(item.startAt, SCHOOL_TIME_ZONE, "dd/MM HH:mm")}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-600">Chọn đủ ngày, thứ, giờ học và tổng số buổi để xem trước lịch.</p>
                  )}
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="session-extra-heading" className="border-t border-neutral-200 pt-5">
            <div className="mb-3 flex items-center gap-2">
              <MapPin size={18} className="text-primary-600" aria-hidden="true" />
              <h3 id="session-extra-heading" className="text-sm font-bold text-neutral-900">Địa điểm và ghi chú</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="session-location" className="mb-1 block text-sm font-medium text-neutral-700">Địa điểm</label>
                <input id="session-location" placeholder="Phòng 201 hoặc Google Meet" {...register("location")} className={INPUT} />
              </div>
              <div>
                <label htmlFor="session-note" className="mb-1 block text-sm font-medium text-neutral-700">Ghi chú</label>
                <input id="session-note" placeholder="Nội dung cần lưu ý" {...register("note")} className={INPUT} />
              </div>
            </div>
          </section>

          {isError && <p role="alert" className="rounded-input border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">Không thể tạo lịch học. Vui lòng kiểm tra quyền truy cập và thử lại.</p>}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-3 sm:px-6">
          <p className="hidden text-xs text-neutral-500 sm:block">Giờ học được lưu theo múi giờ Việt Nam.</p>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={close} disabled={isPending}>Hủy</Button>
            <Button type="submit" variant="primary" disabled={isPending || classes.length === 0}>
              {isPending ? "Đang tạo..." : mode === "weekly" ? "Tạo lịch học" : "Tạo buổi học"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
