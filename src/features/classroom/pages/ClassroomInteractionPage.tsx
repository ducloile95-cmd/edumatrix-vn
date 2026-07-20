import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, format, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { BarChart3, BookOpen, BookOpenCheck, Check, ClipboardCheck, Clock3, Eye, GraduationCap, MapPin, MessageSquareText, Save, Send, Users } from "lucide-react";
import { AppShell } from "@/components/layouts/AppShell";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tab, Tabs } from "@/components/ui/Tabs";
import { classroomSessionPath, ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { LessonPlanDetail } from "@/features/lesson-plans/components/LessonPlanDetail";
import { getClass } from "@/services/firestore/classes";
import { getCourse } from "@/services/firestore/courses";
import {
  getSessionAttendanceEntries,
  getSessionInteraction,
  getSessionStudentReviews,
  saveClassroomDraft,
  type ClassroomStudentEntry,
} from "@/services/firestore/classroomInteractions";
import { getSession, listSessions, listSessionsByClass } from "@/services/firestore/sessions";
import { getLessonPlanBySession } from "@/services/firestore/lessonPlans";
import { listStudents } from "@/services/firestore/students";
import type { AttendanceStatus, PreviousHomeworkStatus } from "@/types/academic";

const ATTENDANCE_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "present", label: "Có mặt" },
  { value: "late", label: "Muộn" },
  { value: "absent", label: "Vắng" },
  { value: "excused", label: "Có phép" },
];

const HOMEWORK_OPTIONS: Array<{ value: PreviousHomeworkStatus; label: string }> = [
  { value: "done", label: "Đã làm" },
  { value: "partial", label: "Một phần" },
  { value: "not_done", label: "Chưa làm" },
  { value: "not_assigned", label: "Không giao" },
];

export default function ClassroomInteractionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <AppShell>{sessionId ? <ClassroomWorkspace sessionId={sessionId} /> : <SessionPicker />}</AppShell>;
}

function SessionPicker() {
  const sessions = useQuery({
    queryKey: ["classroom", "sessions"],
    queryFn: () => listSessions(subDays(new Date(), 14), addDays(new Date(), 30)),
  });

  if (sessions.isLoading) return <LoadingSkeleton rows={6} />;
  if (sessions.isError) return <ErrorState message="Không tải được danh sách buổi học." onRetry={() => sessions.refetch()} />;

  return (
    <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
      <div className="border-b border-neutral-100 p-5">
        <h1 className="text-xl font-bold text-neutral-900">Chọn buổi học</h1>
        <p className="mt-1 text-sm text-neutral-500">Các buổi gần đây và sắp tới thuộc lớp bạn được phân công.</p>
      </div>
      {sessions.data?.length ? (
        <ul className="divide-y divide-neutral-100">
          {sessions.data.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-input bg-primary-50 text-center text-xs font-bold text-primary-700">
                {format(session.startAt.toDate(), "dd/MM")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-neutral-900">{session.title}</p>
                <p className="mt-1 text-xs text-neutral-500">{format(session.startAt.toDate(), "EEEE, HH:mm", { locale: vi })} · {session.location || "Chưa có địa điểm"}</p>
              </div>
              <Link to={classroomSessionPath(session.id)} className="inline-flex min-h-touch items-center rounded-input bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700">
                Mở buổi học
              </Link>
            </li>
          ))}
        </ul>
      ) : <div className="p-6"><EmptyState title="Không có buổi học phù hợp" /></div>}
    </section>
  );
}

function ClassroomWorkspace({ sessionId }: { sessionId: string }) {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const [initializedSessionId, setInitializedSessionId] = useState("");
  const [draftExists, setDraftExists] = useState(false);
  const [entries, setEntries] = useState<Record<string, ClassroomStudentEntry>>({});
  const [taughtContent, setTaughtContent] = useState("");
  const [quickSummary, setQuickSummary] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [lessonPlanOpen, setLessonPlanOpen] = useState(false);
  const [activeView, setActiveView] = useState<"students" | "summary" | "parent">("students");
  const [previewStudentId, setPreviewStudentId] = useState("");
  const [courseSummaryOpen, setCourseSummaryOpen] = useState(false);

  const session = useQuery({ queryKey: ["session", sessionId], queryFn: () => getSession(sessionId) });
  const klass = useQuery({
    queryKey: ["class", session.data?.classId],
    queryFn: () => getClass(session.data?.classId ?? ""),
    enabled: !!session.data,
  });
  const students = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const course = useQuery({
    queryKey: ["course", klass.data?.courseId],
    queryFn: () => getCourse(klass.data!.courseId),
    enabled: !!klass.data?.courseId,
  });
  const courseSessions = useQuery({
    queryKey: ["sessions", "class", klass.data?.id, course.data?.startDate.toMillis(), course.data?.endDate.toMillis()],
    queryFn: () => listSessionsByClass(klass.data!.id, subDays(course.data!.startDate.toDate(), 1), addDays(course.data!.endDate.toDate(), 1), 200),
    enabled: !!klass.data && !!course.data,
  });
  const classStudents = useMemo(
    () => students.data?.filter((student) => klass.data?.studentIds.includes(student.id)) ?? [],
    [klass.data, students.data],
  );
  useEffect(() => {
    if (!previewStudentId && classStudents[0]) setPreviewStudentId(classStudents[0].id);
  }, [classStudents, previewStudentId]);
  const interaction = useQuery({
    queryKey: ["classroom-interaction", sessionId],
    queryFn: () => getSessionInteraction(sessionId),
  });
  const lessonPlan = useQuery({
    queryKey: ["lesson-plan", "session", sessionId, klass.data?.id],
    queryFn: () => getLessonPlanBySession(klass.data!.id, sessionId),
    enabled: !!klass.data,
  });
  const savedEntries = useQuery({
    queryKey: ["classroom-reviews", sessionId, classStudents.map((student) => student.id).join(",")],
    queryFn: async () => {
      const [reviews, attendance] = await Promise.all([
        getSessionStudentReviews(sessionId, klass.data!.id),
        getSessionAttendanceEntries(sessionId, klass.data!.id),
      ]);
      return { reviews, attendance };
    },
    enabled: !!klass.data && !students.isLoading,
  });

  useEffect(() => {
    if (initializedSessionId === sessionId || savedEntries.isLoading || interaction.isLoading || !klass.data) return;
    const reviewByStudent = new Map(savedEntries.data?.reviews.map((review) => [review.studentId, review]));
    const attendanceByStudent = new Map(savedEntries.data?.attendance.map((item) => [item.studentId, item]));
    setEntries(Object.fromEntries(classStudents.map((student) => {
      const review = reviewByStudent.get(student.id);
      const attendance = attendanceByStudent.get(student.id);
      return [student.id, {
        studentId: student.id,
        attendanceStatus: review?.attendanceStatus ?? attendance?.status ?? "present",
        previousHomeworkStatus: review?.previousHomeworkStatus ?? "not_assigned",
        individualComment: review?.individualComment ?? attendance?.note ?? "",
      }];
    })));
    setTaughtContent(interaction.data?.taughtContent ?? "");
    setQuickSummary(interaction.data?.quickSummary ?? "");
    setHomeworkText(interaction.data?.homeworkText ?? "");
    setDraftExists(Boolean(interaction.data));
    setInitializedSessionId(sessionId);
  }, [classStudents, initializedSessionId, interaction.data, interaction.isLoading, klass.data, savedEntries.data, savedEntries.isLoading, sessionId]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!session.data || !klass.data || !firebaseUser) throw new Error("CLASSROOM_CONTEXT_MISSING");
      return saveClassroomDraft({
        sessionId,
        classId: klass.data.id,
        courseId: klass.data.courseId,
        teacherId: firebaseUser.uid,
        taughtContent,
        quickSummary,
        homeworkText,
        entries: classStudents.map((student) => entries[student.id]).filter(Boolean),
        isNew: !draftExists,
      });
    },
    onSuccess: () => {
      setDraftExists(true);
      queryClient.invalidateQueries({ queryKey: ["classroom-interaction", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["classroom-reviews", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] });
    },
  });

  if (session.isLoading || klass.isLoading || students.isLoading || interaction.isLoading) return <LoadingSkeleton rows={7} />;
  if (session.isError || klass.isError || students.isError || interaction.isError) return <ErrorState message="Không tải được dữ liệu buổi học." onRetry={() => session.refetch()} />;
  if (!session.data || !klass.data) return <EmptyState title="Không tìm thấy buổi học" description="Buổi học không tồn tại hoặc bạn không có quyền truy cập." />;
  if (session.data.status === "cancelled") return <EmptyState title="Buổi học đã bị hủy" description="Không thể nhập dữ liệu cho buổi học đã hủy." />;

  const updateEntry = (studentId: string, changes: Partial<ClassroomStudentEntry>) => setEntries((current) => ({
    ...current,
    [studentId]: { ...current[studentId], studentId, attendanceStatus: current[studentId]?.attendanceStatus ?? "present", previousHomeworkStatus: current[studentId]?.previousHomeworkStatus ?? "not_assigned", individualComment: current[studentId]?.individualComment ?? "", ...changes },
  }));
  const setAll = (changes: Partial<ClassroomStudentEntry>) => setEntries((current) => Object.fromEntries(classStudents.map((student) => [student.id, { ...current[student.id], studentId: student.id, attendanceStatus: current[student.id]?.attendanceStatus ?? "present", previousHomeworkStatus: current[student.id]?.previousHomeworkStatus ?? "not_assigned", individualComment: current[student.id]?.individualComment ?? "", ...changes }])));

  const attendanceCount = (status: AttendanceStatus) => classStudents.filter((student) => entries[student.id]?.attendanceStatus === status).length;
  const homeworkDone = classStudents.filter((student) => entries[student.id]?.previousHomeworkStatus === "done").length;
  const attentionStudents = classStudents.filter((student) => {
    const entry = entries[student.id];
    return entry && (entry.attendanceStatus === "absent" || entry.attendanceStatus === "late" || entry.previousHomeworkStatus === "not_done" || entry.previousHomeworkStatus === "partial" || !!entry.individualComment);
  });
  const previewStudent = classStudents.find((student) => student.id === previewStudentId) ?? classStudents[0];
  const completedSessions = courseSessions.data?.filter((item) => item.status === "completed" || item.endAt.toDate() < new Date()).length ?? 0;
  const totalSessions = course.data?.totalSessions || klass.data.recurrence?.sessionCount || courseSessions.data?.length || 0;
  const remainingSessions = Math.max(totalSessions - completedSessions, 0);
  const courseProgress = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const daysToCourseEnd = course.data ? differenceInCalendarDays(course.data.endDate.toDate(), new Date()) : null;
  const showCourseSummary = !!course.data && (remainingSessions <= 2 || courseProgress >= 85 || (daysToCourseEnd !== null && daysToCourseEnd <= 14));

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-card border border-primary-200 bg-white shadow-[var(--shadow-1)]">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-xs font-bold text-primary-700">ĐANG NHẬP BẢN NHÁP</p><h1 className="mt-1 text-xl font-bold text-neutral-950">{klass.data.name} · {session.data.title}</h1><p className="mt-1 text-sm text-neutral-500">{format(session.data.startAt.toDate(), "EEEE, dd/MM/yyyy", { locale: vi })}</p></div>
          <div className="grid gap-2 text-xs text-neutral-600 sm:grid-cols-3"><span className="flex items-center gap-2"><Clock3 size={15} />{format(session.data.startAt.toDate(), "HH:mm")} - {format(session.data.endAt.toDate(), "HH:mm")}</span><span className="flex items-center gap-2"><MapPin size={15} />{session.data.location || "Chưa có địa điểm"}</span><span className="flex items-center gap-2"><Users size={15} />{classStudents.length} học sinh</span></div>
        </div>
      </section>

      <Tabs label="Nội dung tương tác lớp học" className="rounded-t-card border border-neutral-200 bg-white px-2">
        <Tab active={activeView === "students"} onClick={() => setActiveView("students")}><Users size={15} /> Học sinh</Tab>
        <Tab active={activeView === "summary"} onClick={() => setActiveView("summary")}><BarChart3 size={15} /> Tổng kết buổi học</Tab>
        <Tab active={activeView === "parent"} onClick={() => setActiveView("parent")}><Send size={15} /> Gửi thông báo</Tab>
      </Tabs>

      {activeView === "students" && <div className="grid gap-4 xl:grid-cols-[minmax(620px,1.4fr)_minmax(340px,.6fr)]">
        <section className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <div className="flex flex-col gap-4 border-b border-neutral-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-lg font-bold">Ghi nhận học sinh</h2><p className="mt-1 text-xs text-neutral-500">Mỗi học sinh có hai nhóm đánh giá độc lập. Trạng thái được tô màu theo mức độ cần chú ý.</p></div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" className="border-primary-200 bg-primary-50 text-primary-700" onClick={() => setAll({ attendanceStatus: "present" })} icon={<ClipboardCheck size={15} />}>Tất cả có mặt</Button>
              <Button size="sm" className="border-accent-100 bg-accent-50 text-accent-700" onClick={() => setAll({ previousHomeworkStatus: "done" })} icon={<BookOpenCheck size={15} />}>Tất cả đã làm</Button>
            </div>
          </div>
          {classStudents.length ? <ul className="space-y-3 bg-neutral-50/80 p-3 sm:p-4">{classStudents.map((student, index) => {
            const entry = entries[student.id];
            return <li key={student.id} className="overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(28,51,137,.04)]">
              <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-input bg-neutral-100 text-xs font-black tabular-nums text-neutral-500">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-bold text-neutral-950">{student.fullName}</p><p className="mt-0.5 text-xs text-neutral-500">{student.studentCode}</p></div>
                <div className="hidden items-center gap-2 text-2xs font-semibold text-neutral-500 sm:flex"><span>{ATTENDANCE_OPTIONS.find((item) => item.value === (entry?.attendanceStatus ?? "present"))?.label}</span><span className="text-neutral-300">•</span><span>{HOMEWORK_OPTIONS.find((item) => item.value === (entry?.previousHomeworkStatus ?? "not_assigned"))?.label}</span></div>
              </div>
              <div className="grid gap-3 p-3 md:grid-cols-2 sm:p-4">
                <OptionGroup kind="attendance" icon={<ClipboardCheck size={16} />} label="Chuyên cần" helper="Tình trạng tham gia buổi học" options={ATTENDANCE_OPTIONS} value={entry?.attendanceStatus ?? "present"} onChange={(value) => updateEntry(student.id, { attendanceStatus: value as AttendanceStatus })} />
                <OptionGroup kind="homework" icon={<BookOpenCheck size={16} />} label="Bài tập buổi trước" helper="Mức độ hoàn thành bài đã giao" options={HOMEWORK_OPTIONS} value={entry?.previousHomeworkStatus ?? "not_assigned"} onChange={(value) => updateEntry(student.id, { previousHomeworkStatus: value as PreviousHomeworkStatus })} />
                <label className="md:col-span-2">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-neutral-600"><MessageSquareText size={14} /> Nhận xét cá nhân <span className="font-normal text-neutral-400">(không bắt buộc)</span></span>
                  <input aria-label={`Nhận xét ${student.fullName}`} value={entry?.individualComment ?? ""} onChange={(event) => updateEntry(student.id, { individualComment: event.target.value })} placeholder="Chỉ nhập khi học sinh cần chú ý, ví dụ: nghỉ không phép hoặc chưa hoàn thành bài" className="min-h-10 w-full rounded-input border border-neutral-300 bg-neutral-50/60 px-3 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100" />
                </label>
              </div>
            </li>;
          })}</ul> : <div className="p-6"><EmptyState title="Lớp chưa có học sinh" /></div>}
        </section>

        <aside className="h-fit overflow-hidden rounded-card border border-neutral-200 bg-white shadow-[var(--shadow-1)]">
          <div className="border-b border-neutral-100 p-4"><h2 className="text-lg font-bold">Nhật ký buổi học</h2><p className="mt-1 text-xs text-neutral-500">Bản nháp chưa được gửi cho phụ huynh.</p></div>
          <div className="space-y-4 p-4">
            <section aria-labelledby="linked-lesson-plan-title" className="overflow-hidden rounded-card border border-primary-200 bg-primary-50/50">
              <div className="flex items-start gap-3 p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-input bg-primary-100 text-primary-700"><BookOpen size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p id="linked-lesson-plan-title" className="text-2xs font-black uppercase tracking-wide text-primary-700">Giáo án buổi học</p>
                  {lessonPlan.isLoading ? (
                    <p className="mt-1 text-sm text-neutral-500">Đang tải giáo án...</p>
                  ) : lessonPlan.isError ? (
                    <p className="mt-1 text-sm text-danger-700">Không tải được giáo án đã gắn.</p>
                  ) : lessonPlan.data ? (
                    <>
                      <p className="mt-1 truncate text-sm font-bold text-neutral-950">{lessonPlan.data.title}</p>
                      <p className="mt-1 text-xs text-neutral-500">{lessonPlan.data.activities.length} hoạt động · {lessonPlan.data.activities.reduce((total, activity) => total + activity.durationMinutes, 0)} phút</p>
                    </>
                  ) : (
                    <><p className="mt-1 text-sm font-bold text-neutral-800">Chưa gắn giáo án</p><p className="mt-0.5 text-xs text-neutral-500">Buổi học này chưa có giáo án liên kết.</p></>
                  )}
                </div>
              </div>
              <div className="border-t border-primary-100 bg-white/70 p-2.5">
                {lessonPlan.data ? (
                  <Button size="sm" className="w-full" onClick={() => setLessonPlanOpen(true)} icon={<Eye size={15} />}>Xem giáo án</Button>
                ) : (
                  <Link to={ROUTES.STAFF_LESSON_PLANS} className="flex min-h-9 items-center justify-center rounded-input text-xs font-bold text-primary-700 hover:bg-primary-50">Mở Module Giáo án</Link>
                )}
              </div>
            </section>
            <TextArea label="Nội dung đã dạy" value={taughtContent} onChange={setTaughtContent} placeholder="Các nội dung đã hoàn thành trong buổi học" />
            <TextArea label="Tổng kết nhanh" value={quickSummary} onChange={setQuickSummary} placeholder="Mức độ tiếp thu và nội dung cần ôn lại" />
            <TextArea label="Bài tập về nhà" value={homeworkText} onChange={setHomeworkText} placeholder="Nhập bài tập hoặc ghi rõ không có bài tập" />
          </div>
          <div className="border-t border-neutral-100 bg-neutral-50 p-4">
            <Button variant="primary" className="w-full" disabled={mutation.isPending || classStudents.length === 0} onClick={() => mutation.mutate()} icon={<Save size={16} />}>{mutation.isPending ? "Đang lưu..." : "Lưu bản nháp"}</Button>
            {mutation.isSuccess && <p className="mt-3 text-center text-xs font-semibold text-success-700">Đã lưu bản nháp và cập nhật chuyên cần.</p>}
            {mutation.isError && <p role="alert" className="mt-3 text-center text-xs font-semibold text-danger-700">Không lưu được dữ liệu. Vui lòng kiểm tra kết nối và thử lại.</p>}
          </div>
        </aside>
      </div>}

      {activeView === "summary" && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]">
            <div><h2 className="text-lg font-bold text-neutral-950">Tổng kết buổi học</h2><p className="mt-1 text-xs text-neutral-500">Dữ liệu được tổng hợp trực tiếp từ bản nháp trước khi phát hành.</p></div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric value={`${attendanceCount("present")}/${classStudents.length}`} label="Có mặt" />
              <Metric value={attendanceCount("late")} label="Đi muộn" />
              <Metric value={`${homeworkDone}/${classStudents.length}`} label="Hoàn thành bài" />
              <Metric value={attentionStudents.length} label="Cần lưu ý" />
            </div>
            <div className="mt-5 space-y-4 text-sm text-neutral-700">
              <SummaryBlock title="Nội dung đã dạy" value={taughtContent} empty="Chưa nhập nội dung đã dạy." />
              <SummaryBlock title="Đánh giá chung" value={quickSummary} empty="Chưa nhập tổng kết nhanh." />
              <SummaryBlock title="Bài tập về nhà" value={homeworkText} empty="Chưa nhập bài tập về nhà." />
            </div>
          </section>
          <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]">
            <h2 className="text-lg font-bold text-neutral-950">Học sinh cần chú ý</h2><p className="mt-1 text-xs text-neutral-500">Các trường hợp ngoại lệ được tách riêng để giáo viên kiểm tra.</p>
            {attentionStudents.length ? <ul className="mt-4 space-y-2">{attentionStudents.map((student) => { const entry = entries[student.id]; return <li key={student.id} className="rounded-input border border-warning-100 bg-warning-50 p-3"><p className="text-sm font-bold text-neutral-900">{student.fullName}</p><p className="mt-1 text-xs text-warning-800">{ATTENDANCE_OPTIONS.find((item) => item.value === entry.attendanceStatus)?.label} · {HOMEWORK_OPTIONS.find((item) => item.value === entry.previousHomeworkStatus)?.label}</p><p className="mt-2 text-sm text-neutral-700">{entry.individualComment || "Chưa có nhận xét riêng."}</p></li>; })}</ul> : <div className="mt-4"><EmptyState title="Không có học sinh cần chú ý" /></div>}
          </section>
        </div>
      )}

      {activeView === "parent" && (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-bold text-neutral-950">Xem trước thông báo</h2><p className="mt-1 text-xs text-neutral-500">Nội dung riêng theo từng học sinh, không hiển thị dữ liệu của cả lớp.</p></div><select aria-label="Chọn học sinh xem trước" value={previewStudent?.id ?? ""} onChange={(event) => setPreviewStudentId(event.target.value)} className="min-h-10 rounded-input border border-neutral-300 bg-white px-3 text-sm font-semibold">{classStudents.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}</select></div>
            {previewStudent ? <pre className="mt-5 whitespace-pre-wrap rounded-card border border-primary-100 bg-primary-50 p-4 font-sans text-sm leading-6 text-neutral-800"><strong>TỔNG KẾT BUỔI HỌC</strong>{`\n< Edumatrix - tin nhắn tự động >\n\nHọc sinh: ${previewStudent.fullName}\nLớp: ${klass.data.name}\nThời gian: ${format(session.data.startAt.toDate(), "HH:mm, dd/MM/yyyy")}\n\nChuyên cần: ${ATTENDANCE_OPTIONS.find((item) => item.value === entries[previewStudent.id]?.attendanceStatus)?.label ?? "Chưa cập nhật"}\nBài tập buổi trước: ${HOMEWORK_OPTIONS.find((item) => item.value === entries[previewStudent.id]?.previousHomeworkStatus)?.label ?? "Chưa cập nhật"}\nNhận xét của giáo viên: ${entries[previewStudent.id]?.individualComment || "Chưa có nhận xét cá nhân"}\n\nNội dung: ${taughtContent || "Chưa cập nhật"}\nTổng kết: ${quickSummary || "Chưa cập nhật"}\nBài tập về nhà: ${homeworkText || "Chưa cập nhật"}`}</pre> : <div className="mt-4"><EmptyState title="Chưa có học sinh để xem trước" /></div>}
          </section>
          <section className="rounded-card border border-neutral-200 bg-white p-5 shadow-[var(--shadow-1)]"><h2 className="text-lg font-bold text-neutral-950">Kênh phát hành</h2><p className="mt-1 text-xs text-neutral-500">Thông báo Edumatrix là nguồn chính; Messenger là kênh bổ sung.</p><div className="mt-4 space-y-3"><DeliveryRow label="Thông báo Edumatrix" detail={`${classStudents.length} phụ huynh theo hồ sơ học sinh`} status="Sẵn sàng" /><DeliveryRow label="Messenger" detail="Kiểm tra liên kết khi phát hành" status="Chờ kiểm tra" /><DeliveryRow label="Bài tập" detail={homeworkText ? "Có nội dung bài tập về nhà" : "Chưa nhập bài tập"} status={homeworkText ? "Sẵn sàng" : "Chưa đủ"} /></div><Button className="mt-5 w-full" variant="primary" disabled icon={<Send size={15} />}>Hoàn tất và phát hành</Button><p className="mt-2 text-center text-xs text-neutral-500">Luồng phát hành sẽ được kích hoạt ở giai đoạn tiếp theo.</p></section>
        </div>
      )}

      {showCourseSummary && <section className="flex flex-col gap-4 rounded-card border border-primary-200 bg-primary-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-input bg-white text-primary-700"><GraduationCap size={20} /></span><div><h2 className="font-bold text-neutral-950">Khóa học sắp kết thúc · Còn {remainingSessions} buổi</h2><p className="mt-1 text-sm text-neutral-600">Đã hoàn thành {completedSessions}/{totalSessions} buổi ({courseProgress}%). Có thể chuẩn bị bản nháp tổng kết khóa.</p></div></div><Button onClick={() => setCourseSummaryOpen(true)}>Xem bản nháp tổng kết khóa</Button></section>}

      <Modal open={lessonPlanOpen} onClose={() => setLessonPlanOpen(false)} size="lg" title="Giáo án buổi học">
        {lessonPlan.data && <LessonPlanDetail plan={lessonPlan.data} classLabel={klass.data.name} sessionLabel={`${format(session.data.startAt.toDate(), "dd/MM/yyyy, HH:mm")} · ${session.data.title}`} />}
      </Modal>
      <Modal open={courseSummaryOpen} onClose={() => setCourseSummaryOpen(false)} size="lg" title={`Bản nháp tổng kết khóa · ${klass.data.name}`} description="Giáo viên cần kiểm tra và duyệt trước khi phát hành.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric value={`${completedSessions}/${totalSessions}`} label="Buổi đã học" /><Metric value={`${courseProgress}%`} label="Tiến độ" /><Metric value={classStudents.length} label="Học sinh" /><Metric value={remainingSessions} label="Buổi còn lại" /></div>
        <div className="mt-5 rounded-card border border-neutral-200 bg-neutral-50 p-4"><h3 className="text-sm font-bold text-neutral-900">Nội dung cần hoàn thiện theo từng học sinh</h3><ul className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2"><li>• Tỷ lệ chuyên cần và số lần vắng/muộn</li><li>• Tỷ lệ hoàn thành bài tập</li><li>• Điểm trung bình và xu hướng</li><li>• Nhận xét và khuyến nghị khóa tiếp theo</li></ul></div>
        <div className="mt-5 flex justify-end"><Button onClick={() => setCourseSummaryOpen(false)}>Đóng</Button></div>
      </Modal>
    </div>
  );
}

const SELECTED_OPTION_CLASS: Record<string, string> = {
  present: "border-success-300 bg-success-50 text-success-700 ring-1 ring-success-100",
  done: "border-success-300 bg-success-50 text-success-700 ring-1 ring-success-100",
  late: "border-warning-300 bg-warning-50 text-warning-700 ring-1 ring-warning-100",
  partial: "border-warning-300 bg-warning-50 text-warning-700 ring-1 ring-warning-100",
  absent: "border-danger-300 bg-danger-50 text-danger-700 ring-1 ring-danger-100",
  not_done: "border-danger-300 bg-danger-50 text-danger-700 ring-1 ring-danger-100",
  excused: "border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-100",
  not_assigned: "border-neutral-300 bg-white text-neutral-700 ring-1 ring-neutral-200",
};

function OptionGroup({ kind, icon, label, helper, options, value, onChange }: { kind: "attendance" | "homework"; icon: ReactNode; label: string; helper: string; options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void }) {
  const tone = kind === "attendance" ? "border-primary-100 bg-primary-50/55" : "border-accent-100 bg-accent-50/55";
  const iconTone = kind === "attendance" ? "bg-primary-100 text-primary-700" : "bg-accent-100 text-accent-700";
  return <fieldset className={`rounded-card border p-3 ${tone}`}><legend className="sr-only">{label}</legend><div className="mb-3 flex items-center gap-2"><span className={`grid size-8 place-items-center rounded-input ${iconTone}`}>{icon}</span><div><p className="text-xs font-black text-neutral-800">{label}</p><p className="text-2xs text-neutral-500">{helper}</p></div></div><div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">{options.map((option) => { const selected = value === option.value; return <button key={option.value} type="button" aria-pressed={selected} onClick={() => onChange(option.value)} className={`relative min-h-10 rounded-input border px-2 text-xs font-bold transition active:scale-[.98] ${selected ? SELECTED_OPTION_CLASS[option.value] : "border-neutral-200 bg-white/80 text-neutral-500 hover:border-neutral-300 hover:bg-white"}`}>{selected && <Check size={12} className="absolute right-1.5 top-1.5" aria-hidden />}{option.label}</button>; })}</div></fieldset>;
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={2000} className="min-h-24 w-full resize-y rounded-input border border-neutral-300 p-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" /></label>;
}

function Metric({ value, label }: { value: ReactNode; label: string }) {
  return <div className="rounded-input border border-neutral-200 bg-neutral-50 p-3"><strong className="block text-xl font-black tabular-nums text-primary-700">{value}</strong><span className="mt-1 block text-xs font-semibold text-neutral-500">{label}</span></div>;
}

function SummaryBlock({ title, value, empty }: { title: string; value: string; empty: string }) {
  return <section><h3 className="text-xs font-black uppercase tracking-wide text-neutral-500">{title}</h3><p className={`mt-1 rounded-input border p-3 ${value ? "border-neutral-200 bg-neutral-50 text-neutral-800" : "border-dashed border-neutral-300 text-neutral-400"}`}>{value || empty}</p></section>;
}

function DeliveryRow({ label, detail, status }: { label: string; detail: string; status: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-input border border-neutral-200 p-3"><div><p className="text-sm font-bold text-neutral-900">{label}</p><p className="mt-0.5 text-xs text-neutral-500">{detail}</p></div><span className="shrink-0 text-xs font-bold text-primary-700">{status}</span></div>;
}
