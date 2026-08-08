import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Check, Edit3, Archive, ArrowRight, CornerUpLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataListPanel } from "@/components/ui/dataListLayout";
import { FilterSelect, FilterToolbar } from "@/components/ui/FilterToolbar";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/feedback/toastContext";
import { listSubjects } from "@/services/firestore/subjects";
import {
  listStandardLessons,
  submitStandardLessonForApproval,
  approveStandardLesson,
  returnStandardLesson,
  archiveStandardLesson,
} from "@/services/firestore/standardLessons";
import type { StandardLessonApprovalStatus } from "@/types/academic";

interface StandardLessonLibraryProps {
  onEdit: (lesson: any) => void;
  onCreateNew: () => void;
}

export function StandardLessonLibrary({ onEdit, onCreateNew }: StandardLessonLibraryProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState<string>("");
  const [approvalStatus, setApprovalStatus] = useState<StandardLessonApprovalStatus | "">("");
  const [page] = useState(1);

  // Custom confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Queries
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: listSubjects,
  });

  const { data: lessonsResult, refetch } = useQuery({
    queryKey: ["standard-lessons", subjectId, approvalStatus, page],
    queryFn: () =>
      listStandardLessons(
        {
          subjectId: subjectId || undefined,
          approvalStatus: (approvalStatus as StandardLessonApprovalStatus) || undefined,
        },
        100
      ),
  });

  const lessons = lessonsResult?.lessons || [];

  // Mutations
  const submitMutation = useMutation({
    mutationFn: submitStandardLessonForApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-lessons"] });
      refetch();
      showToast({
        title: "Đã gửi phê duyệt",
        description: "Gửi phê duyệt bài học chuẩn thành công!",
        tone: "success",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: approveStandardLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-lessons"] });
      refetch();
      showToast({
        title: "Đã phê duyệt",
        description: "Phê duyệt bài học chuẩn thành công!",
        tone: "success",
      });
    },
  });

  const returnMutation = useMutation({
    mutationFn: returnStandardLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-lessons"] });
      refetch();
      showToast({
        title: "Đã trả về bản nháp",
        description: "Đã trả bài học chuẩn về trạng thái bản nháp.",
        tone: "info",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveStandardLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standard-lessons"] });
      refetch();
      showToast({
        title: "Đã lưu trữ",
        description: "Lưu trữ bài học chuẩn thành công!",
        tone: "info",
      });
    },
  });

  return (
    <div className="flex flex-col h-full bg-neutral-50/50 p-6 min-h-0">
      {/* Search and Filters */}
      <FilterToolbar label="Bộ lọc thư viện bài học chuẩn" className="[&>div]:xl:grid-cols-[minmax(260px,1fr)_240px_auto] mb-4">
        <FilterSelect
          id="library-subject-filter"
          label="Môn học"
          value={subjectId}
          options={[
            { value: "", label: "Tất cả môn học" },
            ...subjects.map((sub) => ({ value: sub.id, label: sub.name })),
          ]}
          onChange={setSubjectId}
        />

        <FilterSelect
          id="library-status-filter"
          label="Trạng thái phê duyệt"
          value={approvalStatus}
          options={[
            { value: "", label: "Tất cả trạng thái" },
            { value: "draft", label: "Bản nháp" },
            { value: "pending", label: "Chờ phê duyệt" },
            { value: "approved", label: "Đã phê duyệt" },
            { value: "archived", label: "Đã lưu trữ" },
          ]}
          onChange={(val) => setApprovalStatus(val as any)}
        />

        <div className="flex items-end">
          <Button onClick={onCreateNew} variant="primary" className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Soạn bài chuẩn
          </Button>
        </div>
      </FilterToolbar>

      {/* List container */}
      <DataListPanel className="rounded-card border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] min-h-0">
        <div className="shrink-0 border-b border-neutral-200 px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold text-neutral-900">Thư viện bài học chuẩn</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Danh sách các bài học mẫu dùng chung làm khung nội dung chuẩn cho các khóa học
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-neutral-50/30">
          {lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <Search className="mb-4 h-12 w-12 text-neutral-300" />
              <p className="text-sm font-medium">Không tìm thấy bài học chuẩn nào phù hợp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson) => {
                const subjectName = subjects.find((s) => s.id === lesson.subjectId)?.name || "Môn học khác";
                
                // Muted desaturated pastel status badges matching minimalist spec
                const badgeStyle = lesson.approvalStatus === "approved"
                  ? "bg-[#EDF3EC] text-[#346538]" // Pale Green
                  : lesson.approvalStatus === "pending"
                  ? "bg-[#FBF3DB] text-[#956400]" // Pale Yellow
                  : lesson.approvalStatus === "archived"
                  ? "bg-[#FDEBEC] text-[#9F2F2D]" // Pale Red
                  : "bg-neutral-100 text-neutral-600"; // Muted Gray for draft

                const statusLabel = lesson.approvalStatus === "approved"
                  ? "Đã duyệt"
                  : lesson.approvalStatus === "pending"
                  ? "Chờ duyệt"
                  : lesson.approvalStatus === "archived"
                  ? "Đã lưu trữ"
                  : "Bản nháp";

                return (
                  <div
                    key={lesson.id}
                    className="flex flex-col justify-between rounded-card border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-neutral-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                          {subjectName}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-neutral-900 mb-2 line-clamp-1">{lesson.title}</h4>
                      <p className="text-xs text-neutral-500 mb-4 line-clamp-3 leading-relaxed">
                        {lesson.objectives?.knowledge || "Chưa có mục tiêu kiến thức."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                      <div className="flex gap-1.5">
                        {lesson.approvalStatus === "draft" && (
                          <>
                            <Button onClick={() => onEdit(lesson)} variant="secondary" size="sm" className="p-1.5">
                              <Edit3 className="h-4 w-4 text-neutral-600" />
                            </Button>
                            <Button
                              onClick={() => {
                                setConfirmAction({
                                  title: "Gửi duyệt bài học chuẩn",
                                  description: "Bạn có chắc chắn muốn gửi duyệt bài học này?",
                                  onConfirm: () => submitMutation.mutate(lesson.id),
                                });
                              }}
                              variant="secondary"
                              size="sm"
                              className="p-1.5"
                              title="Gửi phê duyệt"
                            >
                              <ArrowRight className="h-4 w-4 text-primary-600" />
                            </Button>
                          </>
                        )}

                        {lesson.approvalStatus === "pending" && (
                          <>
                            <Button
                              onClick={() => {
                                setConfirmAction({
                                  title: "Phê duyệt bài học chuẩn",
                                  description: "Bạn có chắc chắn muốn phê duyệt bài học chuẩn này?",
                                  onConfirm: () => approveMutation.mutate(lesson.id),
                                });
                              }}
                              variant="secondary"
                              size="sm"
                              className="p-1.5"
                              title="Phê duyệt"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              onClick={() => {
                                setConfirmAction({
                                  title: "Trả lại bản nháp",
                                  description: "Bạn có chắc chắn muốn trả bài học chuẩn này về trạng thái bản nháp?",
                                  onConfirm: () => returnMutation.mutate(lesson.id),
                                });
                              }}
                              variant="secondary"
                              size="sm"
                              className="p-1.5"
                              title="Trả về nháp"
                            >
                              <CornerUpLeft className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}

                        {lesson.approvalStatus !== "archived" && (
                          <Button
                            onClick={() => {
                              setConfirmAction({
                                  title: "Lưu trữ bài học chuẩn",
                                  description: "Bạn có chắc chắn muốn lưu trữ bài học này?",
                                  onConfirm: () => archiveMutation.mutate(lesson.id),
                              });
                            }}
                            variant="secondary"
                            size="sm"
                            className="p-1.5"
                            title="Lưu trữ"
                          >
                            <Archive className="h-4 w-4 text-neutral-500" />
                          </Button>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">v{lesson.revision}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DataListPanel>

      {/* Confirmation Dialog */}
      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        size="sm"
        title={confirmAction?.title || "Xác nhận hành động"}
        description={confirmAction?.description || "Bạn có chắc chắn muốn thực hiện hành động này không?"}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (confirmAction) {
                confirmAction.onConfirm();
                setConfirmAction(null);
              }
            }}
          >
            Xác nhận
          </Button>
        </div>
      </Modal>
    </div>
  );
}
