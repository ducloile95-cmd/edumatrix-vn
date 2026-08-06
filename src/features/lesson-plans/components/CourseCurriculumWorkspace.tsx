import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Check, Play, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataListPanel } from "@/components/ui/dataListLayout";
import { FilterSelect, FilterToolbar } from "@/components/ui/FilterToolbar";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/feedback/toastContext";
import { listCourses } from "@/services/firestore/courses";
import {
  listCourseCurricula,
  listCourseCurriculumItems,
  createCourseCurriculumDraft,
  updateCourseCurriculumItem,
  publishCourseCurriculum,
} from "@/services/firestore/courseCurricula";
import { listStandardLessons } from "@/services/firestore/standardLessons";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";
import { COLLECTIONS } from "@/constants/collections";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CourseCurriculumItemDoc } from "@/types/academic";

interface CurriculumItemRowProps {
  item: CourseCurriculumItemDoc & { id: string };
  idx: number;
  totalItemsCount: number;
  status: string;
  standardLessons: any[];
  selectedCourse: any;
  handleSwap: (idxA: number, idxB: number) => void;
  handleUpdateItem: (itemId: string, field: string, value: any) => void;
}

function CurriculumItemRow({
  item,
  idx,
  totalItemsCount,
  status,
  standardLessons,
  selectedCourse,
  handleSwap,
  handleUpdateItem,
}: CurriculumItemRowProps) {
  const [localTitle, setLocalTitle] = useState(item.title);
  const [localDuration, setLocalDuration] = useState(String(item.durationMinutes));

  useEffect(() => {
    setLocalTitle(item.title);
  }, [item.title]);

  useEffect(() => {
    setLocalDuration(String(item.durationMinutes));
  }, [item.durationMinutes]);

  const saveTitle = () => {
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== item.title) {
      handleUpdateItem(item.id, "title", trimmed);
    } else {
      setLocalTitle(item.title);
    }
  };

  const saveDuration = () => {
    const val = Number(localDuration);
    if (!isNaN(val) && val >= 1 && val !== item.durationMinutes) {
      handleUpdateItem(item.id, "durationMinutes", val);
    } else {
      setLocalDuration(String(item.durationMinutes));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-neutral-300 transition-colors">
      {/* Sequence controls */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <button
          onClick={() => handleSwap(idx, idx - 1)}
          disabled={idx === 0 || status !== "draft"}
          className="p-1 hover:bg-neutral-100 rounded disabled:opacity-30 transition-colors"
        >
          <ArrowUp className="h-3 w-3 text-neutral-500" />
        </button>
        <span className="text-[10px] font-bold text-neutral-600">Buổi {item.sequenceNumber}</span>
        <button
          onClick={() => handleSwap(idx, idx + 1)}
          disabled={idx === totalItemsCount - 1 || status !== "draft"}
          className="p-1 hover:bg-neutral-100 rounded disabled:opacity-30 transition-colors"
        >
          <ArrowDown className="h-3 w-3 text-neutral-500" />
        </button>
      </div>

      {/* Title and duration */}
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleKeyDown}
            disabled={status !== "draft"}
            className="flex-1 font-semibold text-neutral-800 border-b border-transparent hover:border-neutral-200 focus:border-primary-500 focus:outline-none bg-transparent py-0.5 text-xs transition-colors"
            placeholder="Tiêu đề buổi dạy"
          />
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              value={localDuration}
              onChange={(e) => setLocalDuration(e.target.value)}
              onBlur={saveDuration}
              onKeyDown={handleKeyDown}
              disabled={status !== "draft"}
              className="w-12 text-center text-xs font-semibold border-b border-transparent hover:border-neutral-200 focus:border-primary-500 focus:outline-none bg-transparent py-0.5"
            />
            <span className="text-[10px] text-neutral-400 font-medium">phút</span>
          </div>
        </div>

        {/* Standard lesson selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-neutral-500 shrink-0">Bài chuẩn:</span>
          <select
            value={item.standardLessonId || ""}
            onChange={(e) => handleUpdateItem(item.id, "standardLessonId", e.target.value || null)}
            disabled={status !== "draft"}
            className="flex-1 rounded-input border border-neutral-200 bg-white px-2 py-1 text-xs focus:border-primary-500 focus:outline-none font-medium"
          >
            <option value="">-- Chọn bài học chuẩn --</option>
            {standardLessons
              .filter((sl) => !selectedCourse?.subjectIds || selectedCourse.subjectIds.includes(sl.subjectId))
              .map((sl) => (
                <option key={sl.id} value={sl.id}>
                  {sl.title} ({sl.approvalStatus === "approved" ? "đã duyệt" : sl.approvalStatus === "pending" ? "chờ duyệt" : "nháp"})
                </option>
              ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function CourseCurriculumWorkspace() {
  const { firebaseUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  // Modal states for draft creation
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  // Publish confirmation modal state
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  // Queries
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const { data: curricula = [] } = useQuery({
    queryKey: ["curricula", selectedCourseId],
    queryFn: () => listCourseCurricula(selectedCourseId),
    enabled: !!selectedCourseId,
  });

  const activeCurriculum = curricula.find((c) => c.version === selectedVersion) || curricula[0];

  const { data: curriculumItems = [], refetch: refetchItems } = useQuery({
    queryKey: ["curriculum-items", selectedCourseId, activeCurriculum?.version],
    queryFn: () => listCourseCurriculumItems(selectedCourseId, activeCurriculum.version),
    enabled: !!selectedCourseId && !!activeCurriculum,
  });

  const { data: standardLessonsData } = useQuery({
    queryKey: ["standard-lessons-all"],
    queryFn: () => listStandardLessons({}, 100),
  });
  const standardLessons = standardLessonsData?.lessons || [];

  // Mutations
  const createDraftMutation = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      if (!selectedCourseId || !firebaseUser) return;
      return createCourseCurriculumDraft(selectedCourseId, title, firebaseUser.uid);
    },
    onSuccess: (newDocId) => {
      queryClient.invalidateQueries({ queryKey: ["curricula", selectedCourseId] });
      if (newDocId) {
        const verNum = parseInt(newDocId.split("_v")[1]);
        setSelectedVersion(verNum);
        showToast({
          title: "Đã tạo bản nháp",
          description: `Phiên bản nháp v${verNum} đã được tạo thành công!`,
          tone: "success",
        });
      }
      setDraftTitle("");
      setDraftModalOpen(false);
    },
    onError: (err: any) => {
      showToast({
        title: "Lỗi tạo bản nháp",
        description: err.message || "Không thể khởi tạo bản nháp mới.",
        tone: "error",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourseId || !activeCurriculum || !firebaseUser) return;
      await publishCourseCurriculum(selectedCourseId, activeCurriculum.version, firebaseUser.uid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curricula", selectedCourseId] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      showToast({
        title: "Xuất bản thành công",
        description: "Chương trình học đã được xuất bản và áp dụng thành công!",
        tone: "success",
      });
    },
    onError: (err: any) => {
      showToast({
        title: "Lỗi xuất bản",
        description: err.message || "Kiểm tra lại xem các buổi học đã được gán bài chuẩn chưa.",
        tone: "error",
      });
    },
  });

  // Reorder logic inside batch
  const handleSwap = async (idxA: number, idxB: number) => {
    if (idxA < 0 || idxA >= curriculumItems.length || idxB < 0 || idxB >= curriculumItems.length) return;
    const itemA = curriculumItems[idxA];
    const itemB = curriculumItems[idxB];

    const batch = writeBatch(db);
    batch.update(doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, itemA.id), {
      sequenceNumber: itemB.sequenceNumber,
    });
    batch.update(doc(db, COLLECTIONS.COURSE_CURRICULUM_ITEMS, itemB.id), {
      sequenceNumber: itemA.sequenceNumber,
    });

    // Update parent Header revision
    const curriculumId = `${selectedCourseId}_v${activeCurriculum.version}`;
    batch.update(doc(db, COLLECTIONS.COURSE_CURRICULA, curriculumId), {
      revision: (activeCurriculum.revision || 0) + 1,
    });

    await batch.commit();
    refetchItems();
  };

  const handleUpdateItem = async (itemId: string, field: string, value: any) => {
    await updateCourseCurriculumItem(itemId, { [field]: value });
    refetchItems();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50/50 p-6 min-h-0">
      {/* Header filter toolbar */}
      <FilterToolbar label="Bộ lọc chương trình khóa học" className="[&>div]:xl:grid-cols-[minmax(260px,1fr)_240px_auto] mb-4">
        <FilterSelect
          id="curriculum-course-filter"
          label="Khóa học"
          value={selectedCourseId}
          options={[
            { value: "", label: "Chọn khóa học" },
            ...courses.map((course) => ({ value: course.id, label: course.name })),
          ]}
          onChange={(val) => {
            setSelectedCourseId(val);
            setSelectedVersion(null);
          }}
        />

        {selectedCourseId && (
          <FilterSelect
            id="curriculum-version-filter"
            label="Phiên bản"
            value={activeCurriculum?.version ? String(activeCurriculum.version) : ""}
            options={curricula.map((c) => ({
              value: String(c.version),
              label: `v${c.version} - ${c.title} (${c.status === "published" ? "Đang áp dụng" : c.status})`,
            }))}
            onChange={(val) => setSelectedVersion(Number(val))}
          />
        )}

        {selectedCourseId && (
          <div className="flex items-end">
            <Button
              onClick={() => setDraftModalOpen(true)}
              variant="secondary"
              className="flex items-center gap-1.5 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Bản nháp mới
            </Button>
          </div>
        )}
      </FilterToolbar>

      {/* Main panel */}
      {!selectedCourseId ? (
        <div className="flex flex-col items-center justify-center p-12 text-neutral-500 border border-neutral-200 rounded-card bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <Play className="mb-4 h-12 w-12 text-primary-400 animate-pulse" />
          <p className="text-sm font-medium">Vui lòng chọn một khóa học để xem và thiết lập chương trình buổi học.</p>
        </div>
      ) : !activeCurriculum ? (
        <div className="flex flex-col items-center justify-center p-12 text-neutral-500 border border-neutral-200 rounded-card bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <AlertTriangle className="mb-4 h-12 w-12 text-yellow-500" />
          <p className="text-sm font-medium">Khóa học này chưa được cấu hình chương trình.</p>
          <Button
            onClick={() => setDraftModalOpen(true)}
            variant="primary"
            className="mt-4"
          >
            Cấu hình chương trình đầu tiên
          </Button>
        </div>
      ) : (
        <DataListPanel className="rounded-card border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] min-h-0">
          <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-5">
            <h2 className="text-base font-semibold text-neutral-900">Chi tiết chương trình khóa học</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Thiết lập danh sách các buổi học, căn chỉnh thứ tự và liên kết học liệu chuẩn
            </p>
          </div>

          <div className="flex-1 min-h-0 p-4 sm:p-5 grid grid-cols-1 gap-6 lg:grid-cols-3 bg-neutral-50/30">
            {/* Left panel: Version metadata */}
            <div className="flex flex-col rounded-card border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] h-fit">
              <h3 className="mb-4 text-sm font-bold text-neutral-800 border-b border-neutral-100 pb-2">Thông tin chương trình</h3>
              <div className="space-y-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Tiêu đề</span>
                  <span className="text-sm font-medium text-neutral-800">{activeCurriculum.title}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Số buổi học</span>
                    <span className="text-sm font-semibold text-neutral-800">{activeCurriculum.itemCount} buổi</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Tổng thời lượng</span>
                    <span className="text-sm font-semibold text-neutral-800">{activeCurriculum.totalDurationMinutes} phút</span>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">Trạng thái</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      activeCurriculum.status === "published"
                        ? "bg-[#EDF3EC] text-[#346538]" // Pale Green
                        : activeCurriculum.status === "draft"
                        ? "bg-[#FBF3DB] text-[#956400]" // Pale Yellow
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {activeCurriculum.status === "published" ? "Đang áp dụng" : activeCurriculum.status === "draft" ? "Bản nháp" : activeCurriculum.status}
                  </span>
                </div>

                {activeCurriculum.status === "draft" && (
                  <div className="pt-4 border-t border-neutral-100">
                    <Button
                      onClick={() => setPublishConfirmOpen(true)}
                      className="w-full flex items-center justify-center gap-2"
                      variant="primary"
                    >
                      <Check className="h-4 w-4" /> Xuất bản (Áp dụng)
                    </Button>
                    <p className="mt-2 text-[10px] leading-relaxed text-neutral-500 text-center">
                      Lưu ý: Tất cả các buổi học phải được gán bài học chuẩn trước khi xuất bản.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: Items sequence */}
            <div className="lg:col-span-2 flex flex-col rounded-card border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] min-h-0 h-full">
              <h3 className="shrink-0 mb-3 text-sm font-bold text-neutral-800 border-b border-neutral-100 pb-2">Danh sách buổi học</h3>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 [scrollbar-gutter:stable] min-h-0">
                {curriculumItems.map((item, idx) => (
                  <CurriculumItemRow
                    key={item.id}
                    item={item}
                    idx={idx}
                    totalItemsCount={curriculumItems.length}
                    status={activeCurriculum.status}
                    standardLessons={standardLessons}
                    selectedCourse={selectedCourse}
                    handleSwap={handleSwap}
                    handleUpdateItem={handleUpdateItem}
                  />
                ))}
              </div>
            </div>
          </div>
        </DataListPanel>
      )}

      {/* Modal tạo bản nháp mới */}
      <Modal
        open={draftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        size="sm"
        title="Tạo bản nháp chương trình mới"
        description="Bản nháp mới sẽ sao chép toàn bộ tiêu đề, thời lượng và liên kết bài học từ phiên bản gần nhất để chỉnh sửa."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-600">
              Tiêu đề bản nháp
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Ví dụ: Chương trình học Kỳ II - v2"
              className="min-h-touch w-full rounded-input border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-white font-medium"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDraftModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={!draftTitle.trim() || createDraftMutation.isPending}
              onClick={() => createDraftMutation.mutate({ title: draftTitle })}
            >
              {createDraftMutation.isPending ? "Đang tạo..." : "Tạo bản nháp"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Publish Modal */}
      <Modal
        open={publishConfirmOpen}
        onClose={() => setPublishConfirmOpen(false)}
        size="sm"
        title="Xác nhận xuất bản chương trình"
        description="Khi xuất bản, phiên bản này sẽ được áp dụng chính thức cho khóa học và các phiên bản cũ sẽ ngưng hoạt động. Bạn có chắc chắn không?"
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => setPublishConfirmOpen(false)}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setPublishConfirmOpen(false);
              publishMutation.mutate();
            }}
          >
            Xuất bản
          </Button>
        </div>
      </Modal>
    </div>
  );
}
