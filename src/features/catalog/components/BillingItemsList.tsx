import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus } from "lucide-react";
import { DataListPanel, DATA_LIST_FOOTER, DATA_LIST_SCROLL } from "@/components/ui/dataListLayout";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { FilterField, FilterSelect } from "@/components/ui/FilterToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePagination } from "@/hooks/usePagination";
import { queryKeys } from "@/hooks/queryKeys";
import { listBillingItems, setBillingItemStatus } from "@/services/firestore/billingItems";
import { listCourses } from "@/services/firestore/courses";
import { listSubjects } from "@/services/firestore/subjects";
import type { BillingItemDoc, BillingItemStatus } from "@/types/academic";
import { formatVnd } from "@/utils/currency";

interface BillingItemsListProps {
  canManage: boolean;
  onAdd: () => void;
  onEdit: (item: BillingItemDoc & { id: string }) => void;
}

const STATUS_OPTIONS = [{ value: "all", label: "Tất cả trạng thái" }, { value: "active", label: "Đang dùng" }, { value: "archived", label: "Đã lưu trữ" }];

export function BillingItemsList({ canManage, onAdd, onEdit }: BillingItemsListProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BillingItemStatus | "all">("all");
  const client = useQueryClient();
  const items = useQuery({ queryKey: queryKeys.billingItems(), queryFn: listBillingItems });
  const courses = useQuery({ queryKey: queryKeys.courses(), queryFn: listCourses });
  const subjects = useQuery({ queryKey: queryKeys.subjects(), queryFn: listSubjects });
  const courseById = useMemo(() => new Map((courses.data ?? []).map((course) => [course.id, course.name])), [courses.data]);
  const subjectById = useMemo(() => new Map((subjects.data ?? []).map((subject) => [subject.id, subject.name])), [subjects.data]);
  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: BillingItemStatus }) => setBillingItemStatus(id, nextStatus),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.billingItems() }),
  });
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi");
    return (items.data ?? []).filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      const text = `${item.name} ${courseById.get(item.courseId) ?? ""} ${subjectById.get(item.subjectId) ?? ""}`.toLocaleLowerCase("vi");
      return !term || text.includes(term);
    });
  }, [courseById, items.data, search, status, subjectById]);
  const { page, pageItems, pageSize, setPage } = usePagination(filtered, 10);
  const hasRows = !items.isLoading && !items.isError && filtered.length > 0;

  return (
    <DataListPanel className="rounded-card border border-neutral-200 bg-white">
      <div className="shrink-0 border-b border-neutral-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-base font-bold text-neutral-900">Đồ dùng học tập</h2><p className="mt-1 text-sm text-neutral-500">Danh mục khoản thu gắn với khóa học và môn học.</p></div>
          {canManage && <button type="button" onClick={onAdd} className="inline-flex min-h-touch items-center gap-2 rounded-input bg-primary-500 px-4 text-sm font-bold text-white transition hover:bg-primary-600 active:scale-[.98]"><PackagePlus size={17} aria-hidden="true" />Thêm đồ dùng</button>}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(240px,1fr)_220px]">
          <FilterField label="Tìm kiếm" htmlFor="billing-item-search"><SearchInput id="billing-item-search" value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Tên đồ dùng, khóa học hoặc môn học" /></FilterField>
          <FilterSelect id="billing-item-status" label="Trạng thái" value={status} options={STATUS_OPTIONS} onChange={(value) => { setStatus(value as BillingItemStatus | "all"); setPage(1); }} />
        </div>
      </div>
      <div className={DATA_LIST_SCROLL}>
        {items.isLoading && <div className="p-5"><LoadingSkeleton rows={5} /></div>}
        {items.isError && <div className="p-5"><ErrorState message="Không tải được danh mục đồ dùng học tập." onRetry={() => items.refetch()} /></div>}
        {!items.isLoading && !items.isError && (items.data?.length ?? 0) === 0 && <div className="grid h-full place-items-center p-6"><EmptyState title="Chưa có đồ dùng học tập" description={canManage ? "Thêm đồ dùng để sử dụng khi tạo hóa đơn." : "Admin chưa thiết lập danh mục đồ dùng."} /></div>}
        {!items.isLoading && !items.isError && (items.data?.length ?? 0) > 0 && filtered.length === 0 && <div className="grid h-full place-items-center p-6"><EmptyState title="Không có đồ dùng phù hợp bộ lọc" /></div>}
        {hasRows && <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-neutral-50"><tr className="border-b border-neutral-200 text-left text-xs font-bold text-neutral-500"><th className="px-5 py-3">Đồ dùng</th><th className="px-4 py-3">Khóa học</th><th className="px-4 py-3">Môn học</th><th className="px-4 py-3 text-right">Đơn giá</th><th className="px-4 py-3">Trạng thái</th>{canManage && <th className="px-5 py-3 text-right">Thao tác</th>}</tr></thead>
          <tbody className="divide-y divide-neutral-100">{pageItems.map((item) => <tr key={item.id} className="transition hover:bg-neutral-50/80">
            <td className="px-5 py-4 font-bold text-neutral-900">{item.name}</td>
            <td className="px-4 py-4 text-neutral-700">{courseById.get(item.courseId) ?? item.courseId}</td>
            <td className="px-4 py-4 text-neutral-700">{subjectById.get(item.subjectId) ?? item.subjectId}</td>
            <td className="px-4 py-4 text-right font-bold tabular-nums text-neutral-900">{formatVnd(item.unitPrice)}</td>
            <td className="px-4 py-4"><StatusBadge tone={item.status === "active" ? "success" : "neutral"}>{item.status === "active" ? "Đang dùng" : "Đã lưu trữ"}</StatusBadge></td>
            {canManage && <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => onEdit(item)} className="min-h-9 rounded-input border border-neutral-300 px-3 text-xs font-bold text-neutral-700 transition hover:border-primary-300 hover:text-primary-700 active:scale-[.98]">Sửa</button><button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: item.id, nextStatus: item.status === "active" ? "archived" : "active" })} className="min-h-9 rounded-input border border-neutral-300 px-3 text-xs font-bold text-neutral-700 transition hover:border-primary-300 hover:text-primary-700 active:scale-[.98] disabled:opacity-50">{item.status === "active" ? "Lưu trữ" : "Kích hoạt"}</button></div></td>}
          </tr>)}</tbody>
        </table>}
      </div>
      {hasRows && <div className={DATA_LIST_FOOTER}><Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} itemLabel="đồ dùng" /></div>}
    </DataListPanel>
  );
}
