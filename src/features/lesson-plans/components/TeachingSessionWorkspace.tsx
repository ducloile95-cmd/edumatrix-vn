import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, endOfDay, isToday, addDays, isAfter, isBefore } from "date-fns";
import { Calendar, AlertTriangle, Clock, PenTool } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataListPanel } from "@/components/ui/dataListLayout";
import { FilterSelect, FilterToolbar } from "@/components/ui/FilterToolbar";
import { useToast } from "@/components/feedback/toastContext";
import { listClasses } from "@/services/firestore/classes";
import { listSessionsByClass } from "@/services/firestore/sessions";
import { listLessonPlans } from "@/services/firestore/lessonPlans";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";

interface TeachingSessionWorkspaceProps {
  onEditLessonPlan: (plan: any) => void;
  onCreateLessonPlan: (session: any) => void;
}

export function TeachingSessionWorkspace({ onEditLessonPlan, onCreateLessonPlan }: TeachingSessionWorkspaceProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [diaryNote, setDiaryNote] = useState<string>("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Queries
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: listClasses,
  });

  const classIds = useMemo(() => classes.map((c) => c.id), [classes]);

  const { data: lessonPlans = [] } = useQuery({
    queryKey: ["lesson-plans"],
    queryFn: listLessonPlans,
  });

  // Fetch sessions for all classes combined
  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ["sessions-workspace", classIds],
    queryFn: async () => {
      const today = new Date();
      const fromDate = addDays(today, -30); // 30 days ago to check for needed notes
      const toDate = addDays(today, 14); // 14 days in the future
      const groups = await Promise.all(
        classIds.map((cid) => listSessionsByClass(cid, fromDate, toDate, 100))
      );
      return groups.flat().sort((a, b) => b.startAt.toMillis() - a.startAt.toMillis());
    },
    enabled: classIds.length > 0,
  });

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return allSessions.filter((s) => selectedClassId === "all" || s.classId === selectedClassId);
  }, [allSessions, selectedClassId]);

  // Timelines categorization
  const timelines = useMemo(() => {
    const today = startOfDay(new Date());
    const tonight = endOfDay(new Date());
    const sevenDaysFromNow = endOfDay(addDays(new Date(), 7));

    const todaySessions: any[] = [];
    const upcomingSessions: any[] = [];
    const needNotesSessions: any[] = [];

    filteredSessions.forEach((s) => {
      const start = s.startAt.toDate();
      const linkedPlan = lessonPlans.find((lp) => lp.sessionId === s.id || lp.id === s.lessonPlanId);

      if (isToday(start)) {
        todaySessions.push({ ...s, linkedPlan });
      } else if (isAfter(start, tonight) && isBefore(start, sevenDaysFromNow)) {
        upcomingSessions.push({ ...s, linkedPlan });
      } else if (isBefore(start, today) && (!linkedPlan || !linkedPlan.notesAfterTeaching)) {
        needNotesSessions.push({ ...s, linkedPlan });
      }
    });

    return {
      today: todaySessions,
      upcoming: upcomingSessions,
      needNotes: needNotesSessions,
    };
  }, [filteredSessions, lessonPlans]);

  // Mutation for post-teaching notes
  const saveDiaryMutation = useMutation({
    mutationFn: async ({ planId, notes }: { planId: string; notes: string }) => {
      await updateDoc(doc(db, COLLECTIONS.LESSON_PLANS, planId), {
        notesAfterTeaching: notes,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
      setEditingSessionId(null);
      setDiaryNote("");
      showToast({
        title: "Đã lưu nhật ký",
        description: "Ghi nhật ký giảng dạy thành công!",
        tone: "success",
      });
    },
  });

  return (
    <div className="flex flex-col h-full bg-neutral-50/50 p-6 min-h-0">
      {isLoading ? (
        <div className="text-center py-12 text-neutral-500">Đang tải lịch dạy...</div>
      ) : (
        <>
          <FilterToolbar label="Bộ lọc tiến độ giảng dạy" className="mb-4">
            <FilterSelect
              id="workspace-class-filter"
              label="Lớp học"
              value={selectedClassId}
              options={[
                { value: "all", label: "Tất cả lớp học" },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
              onChange={setSelectedClassId}
            />
          </FilterToolbar>

          <DataListPanel className="rounded-card border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] min-h-0">
            {/* Header of the panel containing list status */}
            <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-5">
              <h2 className="text-base font-semibold text-neutral-900">Tiến độ giảng dạy</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Quản lý phân phối chương trình, giáo án buổi dạy và ghi nhật ký dạy học
              </p>
            </div>

          {/* Panel Body: The 3 pipeline columns side by side */}
          <div className="flex-1 min-h-0 p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-50/30">
            {/* Column 1: Today */}
            <div className="flex flex-col h-full min-h-0 rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <h3 className="shrink-0 mb-3 flex items-center justify-between text-sm font-bold text-neutral-800 border-b border-neutral-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary-500" /> Hôm nay
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                  {timelines.today.length} buổi
                </span>
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 [scrollbar-gutter:stable] min-h-0">
                {timelines.today.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-neutral-400">
                    <p className="text-xs">Không có buổi học nào hôm nay.</p>
                  </div>
                ) : (
                  timelines.today.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      classLabel={classById.get(s.classId)?.name || "Lớp"}
                      onEditPlan={onEditLessonPlan}
                      onCreatePlan={onCreateLessonPlan}
                      onOpenDiary={(notes) => {
                        setEditingSessionId(s.id);
                        setDiaryNote(notes);
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Next 7 days */}
            <div className="flex flex-col h-full min-h-0 rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <h3 className="shrink-0 mb-3 flex items-center justify-between text-sm font-bold text-neutral-800 border-b border-neutral-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-green-500" /> 7 ngày tới
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                  {timelines.upcoming.length} buổi
                </span>
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 [scrollbar-gutter:stable] min-h-0">
                {timelines.upcoming.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-neutral-400">
                    <p className="text-xs">Không có lịch học trong 7 ngày tới.</p>
                  </div>
                ) : (
                  timelines.upcoming.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      classLabel={classById.get(s.classId)?.name || "Lớp"}
                      onEditPlan={onEditLessonPlan}
                      onCreatePlan={onCreateLessonPlan}
                      onOpenDiary={(notes) => {
                        setEditingSessionId(s.id);
                        setDiaryNote(notes);
                      }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Need notes */}
            <div className="flex flex-col h-full min-h-0 rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
              <h3 className="shrink-0 mb-3 flex items-center justify-between text-sm font-bold text-neutral-800 border-b border-neutral-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" /> Cần hoàn tất nhật ký
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                  {timelines.needNotes.length} buổi
                </span>
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 [scrollbar-gutter:stable] min-h-0">
                {timelines.needNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-neutral-400">
                    <p className="text-xs">Tất cả buổi dạy đã ghi nhật ký!</p>
                  </div>
                ) : (
                  timelines.needNotes.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      classLabel={classById.get(s.classId)?.name || "Lớp"}
                      onEditPlan={onEditLessonPlan}
                      onCreatePlan={onCreateLessonPlan}
                      onOpenDiary={(notes) => {
                        setEditingSessionId(s.id);
                        setDiaryNote(notes);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </DataListPanel>
        </>
      )}

      {/* Diary Modal */}
      {editingSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-card bg-white p-6 shadow-xl border border-neutral-200">
            <h3 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
              <PenTool className="text-primary-500 h-5 w-5" /> Ghi Nhật ký sau dạy
            </h3>
            <textarea
              value={diaryNote}
              onChange={(e) => setDiaryNote(e.target.value)}
              className="w-full min-h-32 rounded-input border border-neutral-300 p-3 text-sm focus:border-primary-500 focus:outline-none mb-4"
              placeholder="Nhập nội dung nhật ký, đánh giá mức độ tiếp thu của học sinh..."
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditingSessionId(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const s = allSessions.find((x) => x.id === editingSessionId);
                  const linkedPlan = lessonPlans.find((lp) => lp.sessionId === s?.id || lp.id === s?.lessonPlanId);
                  if (linkedPlan) {
                    saveDiaryMutation.mutate({ planId: linkedPlan.id, notes: diaryNote });
                  } else {
                    showToast({
                      title: "Không thể lưu nhật ký",
                      description: "Buổi học này chưa được cấu hình giáo án để lưu nhật ký!",
                      tone: "error",
                    });
                  }
                }}
              >
                Lưu lại
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionItem({
  session,
  classLabel,
  onEditPlan,
  onCreatePlan,
  onOpenDiary,
}: {
  session: any;
  classLabel: string;
  onEditPlan: (plan: any) => void;
  onCreatePlan: (session: any) => void;
  onOpenDiary: (notes: string) => void;
}) {
  const startStr = format(session.startAt.toDate(), "HH:mm");
  const endStr = format(session.endAt.toDate(), "HH:mm");
  const dateStr = format(session.startAt.toDate(), "dd/MM");

  // Washout pastels matching minimalist design specification
  const statusBadgeClass = session.linkedPlan
    ? session.linkedPlan.status === "published"
      ? "bg-[#EDF3EC] text-[#346538]" // Pale Green
      : "bg-[#FBF3DB] text-[#956400]" // Pale Yellow (draft)
    : "bg-[#FDEBEC] text-[#9F2F2D]"; // Pale Red (missing)

  const statusText = session.linkedPlan
    ? session.linkedPlan.status === "published"
      ? "Đã xuất bản"
      : "Bản nháp"
    : "Thiếu giáo án";

  return (
    <div className="rounded-card border border-neutral-200 bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-neutral-300 transition-colors">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
          {classLabel} · Buổi {session.sequenceNumber || "—"}
        </h4>
        <span className="text-[10px] font-mono font-semibold text-neutral-600 bg-[#F7F6F3] border border-neutral-200 px-1.5 py-0.5 rounded">
          {dateStr} · {startStr}-{endStr}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass}`}>
          {statusText}
        </span>

        <div className="flex gap-1.5">
          {session.linkedPlan ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => onEditPlan(session.linkedPlan)}>
                Sửa
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => onOpenDiary(session.linkedPlan.notesAfterTeaching || "")}
              >
                Nhật ký
              </Button>
            </>
          ) : (
            <Button size="sm" variant="primary" onClick={() => onCreatePlan(session)}>
              Soạn
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
