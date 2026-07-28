import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, format, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { BarChart3, Clock3, GraduationCap, MapPin, Send, Users } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tab, Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ClassroomSessionPicker as SessionPicker } from "@/features/classroom/components/ClassroomSessionPicker";
import { ClassroomStudentsView } from "@/features/classroom/components/ClassroomStudentsView";
import { ClassroomSummaryView } from "@/features/classroom/components/ClassroomSummaryView";
import { ClassroomParentView } from "@/features/classroom/components/ClassroomParentView";
import { Metric } from "@/features/classroom/components/ClassroomInteractionUi";
import { LessonPlanDetail } from "@/features/lesson-plans/components/LessonPlanDetail";
import { getClass } from "@/services/firestore/classes";
import { getCourse } from "@/services/firestore/courses";
import {
  classroomPublishBlockers,
  getSessionAttendanceEntries,
  getSessionInteraction,
  getSessionStudentReviews,
  publishClassroomInteraction,
  reopenClassroomInteraction,
  saveClassroomDraft,
  type ClassroomStudentEntry,
  type PublishStudentResult,
} from "@/services/firestore/classroomInteractions";
import { sendMessenger } from "@/services/integrations/messenger";
import { getSession, listSessionsByClass } from "@/services/firestore/sessions";
import { getLessonPlanBySession } from "@/services/firestore/lessonPlans";
import { listStudents } from "@/services/firestore/students";
import type { AttendanceStatus } from "@/types/academic";
export default function ClassroomInteractionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return sessionId ? <ClassroomWorkspace sessionId={sessionId} /> : <SessionPicker />;
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
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishStudentResult[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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

  const workflowStatus = interaction.data?.workflowStatus ?? "draft";
  const isPublished = workflowStatus === "published";
  const isAmended = workflowStatus === "amended";
  const entryList = classStudents.map((student) => entries[student.id]).filter(Boolean);
  const publishStudents = classStudents.map((student) => ({ id: student.id, fullName: student.fullName }));
  const blockers = classroomPublishBlockers({
    students: publishStudents,
    entries: entryList,
    taughtContent,
    quickSummary,
    homeworkText,
  });

  const buildDraftInput = () => {
    if (!session.data || !klass.data || !firebaseUser) throw new Error("CLASSROOM_CONTEXT_MISSING");
    return {
      sessionId,
      classId: klass.data.id,
      courseId: klass.data.courseId,
      teacherId: firebaseUser.uid,
      taughtContent,
      quickSummary,
      homeworkText,
      entries: entryList,
      isNew: !draftExists,
      workflowStatus: isAmended ? ("amended" as const) : ("draft" as const),
    };
  };

  const mutation = useMutation({
    mutationFn: () => saveClassroomDraft(buildDraftInput()),
    onSuccess: () => {
      setDraftExists(true);
      setLastSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ["classroom-interaction", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["classroom-reviews", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["attendance", sessionId] });
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      if (!session.data || !klass.data) throw new Error("CLASSROOM_CONTEXT_MISSING");
      // Luu ban nhap moi nhat truoc de noi dung interaction khop 100% voi noi dung gui di.
      await saveClassroomDraft(buildDraftInput());
      return publishClassroomInteraction({
        sessionId,
        classId: klass.data.id,
        className: klass.data.name,
        sessionStartAt: session.data.startAt.toDate(),
        taughtContent,
        quickSummary,
        homeworkText,
        students: publishStudents,
        entries: entryList,
        isRepublish: isAmended,
      });
    },
    onSuccess: (results) => {
      setPublishResults(results);
      setDraftExists(true);
      queryClient.invalidateQueries({ queryKey: ["classroom-interaction", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });

  const reopen = useMutation({
    mutationFn: () => reopenClassroomInteraction(sessionId),
    onSuccess: () => {
      setPublishResults([]);
      queryClient.invalidateQueries({ queryKey: ["classroom-interaction", sessionId] });
    },
  });

  const resend = useMutation({
    mutationFn: async () => {
      const updated: PublishStudentResult[] = [];
      for (const item of publishResults) {
        if (item.messenger === "sent") { updated.push(item); continue; }
        const result = await sendMessenger({ studentId: item.studentId, text: item.message, type: "session_summary" });
        updated.push({
          ...item,
          messenger: result.sent ? (result.status === "sent" ? "sent" : "failed") : "failed",
          detail: result.sent ? "" : result.message,
        });
      }
      return updated;
    },
    onSuccess: (updated) => setPublishResults(updated),
  });

  const mutationRef = useRef(mutation);
  useEffect(() => { mutationRef.current = mutation; });
  const autoSaveArmed = useRef("");
  useEffect(() => {
    if (initializedSessionId !== sessionId || isPublished || classStudents.length === 0) return;
    if (autoSaveArmed.current !== sessionId) {
      autoSaveArmed.current = sessionId;
      return;
    }
    const timer = setTimeout(() => {
      if (!mutationRef.current.isPending) mutationRef.current.mutate();
    }, 2500);
    return () => clearTimeout(timer);
  }, [entries, taughtContent, quickSummary, homeworkText, initializedSessionId, sessionId, isPublished, classStudents.length]);

  if (session.isLoading || klass.isLoading || students.isLoading || interaction.isLoading || savedEntries.isLoading) return <LoadingSkeleton rows={7} />;
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
          <div><p className={`text-xs font-bold ${isPublished ? "text-success-700" : isAmended ? "text-warning-700" : "text-primary-700"}`}>{isPublished ? "ĐÃ PHÁT HÀNH" : isAmended ? "ĐANG ĐÍNH CHÍNH" : "ĐANG NHẬP BẢN NHÁP"}</p><h2 className="mt-1 text-xl font-bold text-neutral-950">{klass.data.name} · {session.data.title}</h2><p className="mt-1 text-sm text-neutral-500">{format(session.data.startAt.toDate(), "EEEE, dd/MM/yyyy", { locale: vi })}</p></div>
          <div className="grid gap-2 text-xs text-neutral-600 sm:grid-cols-3"><span className="flex items-center gap-2"><Clock3 size={15} />{format(session.data.startAt.toDate(), "HH:mm")} - {format(session.data.endAt.toDate(), "HH:mm")}</span><span className="flex items-center gap-2"><MapPin size={15} />{session.data.location || "Chưa có địa điểm"}</span><span className="flex items-center gap-2"><Users size={15} />{classStudents.length} học sinh</span></div>
        </div>
      </section>

      <Tabs label="Nội dung tương tác lớp học" className="rounded-t-card border border-neutral-200 bg-white px-2">
        <Tab active={activeView === "students"} onClick={() => setActiveView("students")}><Users size={15} /> Học sinh</Tab>
        <Tab active={activeView === "summary"} onClick={() => setActiveView("summary")}><BarChart3 size={15} /> Tổng kết buổi học</Tab>
        <Tab active={activeView === "parent"} onClick={() => setActiveView("parent")}><Send size={15} /> Gửi thông báo</Tab>
      </Tabs>

      <ClassroomStudentsView
        active={activeView === "students"}
        classStudents={classStudents}
        entries={entries}
        homeworkText={homeworkText}
        isPublished={isPublished}
        lastSavedAt={lastSavedAt}
        lessonPlan={lessonPlan}
        mutation={mutation}
        quickSummary={quickSummary}
        setAll={setAll}
        setHomeworkText={setHomeworkText}
        setLessonPlanOpen={setLessonPlanOpen}
        setQuickSummary={setQuickSummary}
        setTaughtContent={setTaughtContent}
        taughtContent={taughtContent}
        updateEntry={updateEntry}
      />

      <ClassroomSummaryView
        active={activeView === "summary"}
        attendanceLate={attendanceCount("late")}
        attendancePresent={attendanceCount("present")}
        attentionStudents={attentionStudents}
        classStudents={classStudents}
        entries={entries}
        homeworkDone={homeworkDone}
        homeworkText={homeworkText}
        quickSummary={quickSummary}
        taughtContent={taughtContent}
      />

      <ClassroomParentView
        active={activeView === "parent"}
        blockers={blockers}
        className={klass.data.name}
        classStudents={classStudents}
        entries={entries}
        homeworkText={homeworkText}
        isAmended={isAmended}
        isPublished={isPublished}
        previewStudent={previewStudent}
        publish={publish}
        publishedAt={isPublished ? interaction.data!.updatedAt.toDate() : new Date()}
        publishResults={publishResults}
        quickSummary={quickSummary}
        reopen={reopen}
        resend={resend}
        sessionStartAt={session.data.startAt.toDate()}
        setPreviewStudentId={setPreviewStudentId}
        setPublishConfirmOpen={setPublishConfirmOpen}
        taughtContent={taughtContent}
      />

      {showCourseSummary && <section className="flex flex-col gap-4 rounded-card border border-primary-200 bg-primary-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-input bg-white text-primary-700"><GraduationCap size={20} /></span><div><h2 className="font-bold text-neutral-950">Khóa học sắp kết thúc · Còn {remainingSessions} buổi</h2><p className="mt-1 text-sm text-neutral-600">Đã hoàn thành {completedSessions}/{totalSessions} buổi ({courseProgress}%). Có thể chuẩn bị bản nháp tổng kết khóa.</p></div></div><Button onClick={() => setCourseSummaryOpen(true)}>Xem bản nháp tổng kết khóa</Button></section>}

      <Modal open={publishConfirmOpen} onClose={() => setPublishConfirmOpen(false)} title={isAmended ? "Xác nhận phát hành bản cập nhật" : "Xác nhận phát hành"} description="Gửi tổng kết cho phụ huynh và khóa buổi học. Bạn vẫn có thể mở lại để đính chính.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric value={`${attendanceCount("present")}/${classStudents.length}`} label="Có mặt" />
          <Metric value={attendanceCount("late")} label="Đi muộn" />
          <Metric value={`${homeworkDone}/${classStudents.length}`} label="Hoàn thành bài" />
          <Metric value={attentionStudents.length} label="Cần lưu ý" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPublishConfirmOpen(false)}>Hủy</Button>
          <Button variant="primary" icon={<Send size={15} />} onClick={() => { setPublishConfirmOpen(false); publish.mutate(); }}>Phát hành</Button>
        </div>
      </Modal>
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
