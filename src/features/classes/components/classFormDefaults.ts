import { format } from "date-fns";
import type { ClassFormValues } from "@/schemas/class";
import type { RecurrenceFormState } from "@/features/classes/components/ClassSmartSchedulePanel";

export const DEFAULT_CLASS_FORM_VALUES: ClassFormValues = {
  name: "",
  courseId: "",
  subjectIds: [],
  teacherIds: [],
  scheduleText: "",
  location: "",
  status: "active",
};

export const DEFAULT_RECURRENCE: RecurrenceFormState = {
  startDate: format(new Date(), "yyyy-MM-dd"),
  daysOfWeek: [2, 4],
  startTime: "18:00",
  endTime: "19:30",
  sessionCount: 12,
};
