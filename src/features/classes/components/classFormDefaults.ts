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
  startDate: "",
  daysOfWeek: [],
  startTime: "",
  endTime: "",
  sessionCount: 1,
};
