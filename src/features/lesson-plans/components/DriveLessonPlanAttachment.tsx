import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cloud, ExternalLink, FileUp, FolderOpen, Link2Off, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getIntegrationSettings } from "@/services/firestore/settings";
import { updateLessonPlanDriveAttachment } from "@/services/firestore/lessonPlans";
import {
  connectGoogleDrive,
  driveErrorMessage,
  getDriveFileMetadata,
  isGoogleDriveConfigured,
  isGoogleDriveConnected,
  mapDriveMetadata,
  openGoogleDrivePicker,
  uploadGoogleDriveFile,
} from "@/services/integrations/googleDrive";
import type { LessonPlanDoc, LessonPlanDriveAttachment } from "@/types/academic";

function attachmentFromPlan(plan: LessonPlanDoc): LessonPlanDriveAttachment | null {
  if (!plan.driveFileId || !plan.driveFileName || !plan.driveMimeType || !plan.driveWebViewLink || !plan.driveModifiedTime) return null;
  return {
    driveFileId: plan.driveFileId,
    driveFileName: plan.driveFileName,
    driveMimeType: plan.driveMimeType,
    driveWebViewLink: plan.driveWebViewLink,
    driveModifiedTime: plan.driveModifiedTime,
  };
}

export function DriveLessonPlanAttachment({ plan }: { plan: LessonPlanDoc & { id: string } }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const integrations = useQuery({ queryKey: ["settings", "integrations"], queryFn: getIntegrationSettings });
  const [attachment, setAttachment] = useState(() => attachmentFromPlan(plan));
  const [connected, setConnected] = useState(isGoogleDriveConnected());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const folderId = integrations.data?.driveFolderId?.trim() ?? "";
  const configured = isGoogleDriveConfigured();

  useEffect(() => setAttachment(attachmentFromPlan(plan)), [plan]);

  async function saveMetadata(metadata: LessonPlanDriveAttachment | null) {
    await updateLessonPlanDriveAttachment(plan.id, metadata);
    setAttachment(metadata);
    await queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
  }

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setConnected(isGoogleDriveConnected());
      setError(driveErrorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function ensureConnected() {
    await connectGoogleDrive();
    setConnected(true);
  }

  function connect() {
    void run("connect", ensureConnected);
  }

  function pickFile() {
    void run("pick", async () => {
      await ensureConnected();
      const metadata = await openGoogleDrivePicker(folderId || undefined);
      if (metadata) await saveMetadata(mapDriveMetadata(metadata));
    });
  }

  function uploadFile(file: File) {
    void run("upload", async () => {
      await ensureConnected();
      const metadata = await uploadGoogleDriveFile(file, folderId);
      await saveMetadata(mapDriveMetadata(metadata));
    });
  }

  function refreshFile() {
    if (!attachment) return;
    void run("refresh", async () => {
      await ensureConnected();
      const metadata = await getDriveFileMetadata(attachment.driveFileId);
      await saveMetadata(mapDriveMetadata(metadata));
    });
  }

  function unlinkFile() {
    void run("unlink", () => saveMetadata(null));
  }

  if (integrations.isLoading) return <div className="rounded-input border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">Đang tải cấu hình Google Drive...</div>;

  return (
    <section className="rounded-card border border-neutral-200 bg-white p-4 shadow-[var(--shadow-1)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-primary-50 text-primary-700 ring-1 ring-primary-100"><Cloud size={19} /></span>
          <div>
            <h4 className="text-sm font-bold text-neutral-900">Bản lưu Google Drive</h4>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Token chỉ tồn tại trong bộ nhớ của tab; liên kết Drive không xuất hiện ở trang phụ huynh.</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-bold ${connected ? "bg-success-50 text-success-700" : "bg-neutral-100 text-neutral-600"}`}><ShieldCheck size={13} />{connected ? "Đã kết nối" : "Chưa kết nối"}</span>
      </div>

      {!configured && <p role="alert" className="mt-4 rounded-input border border-warning-100 bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-800">Thiếu VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_PICKER_API_KEY hoặc VITE_GOOGLE_PICKER_APP_ID.</p>}
      {integrations.isError && <p role="alert" className="mt-4 rounded-input border border-danger-100 bg-danger-50 px-3 py-2 text-xs text-danger-700">Không đọc được cấu hình thư mục Drive.</p>}
      {configured && !folderId && <p role="alert" className="mt-4 rounded-input border border-warning-100 bg-warning-50 px-3 py-2 text-xs leading-5 text-warning-800">Admin chưa khai báo Google Drive folder ID trong Cài đặt → Kết nối và API. Vẫn có thể chọn tệp hiện có, nhưng chưa thể tải tệp mới.</p>}

      {attachment ? (
        <div className="mt-4 rounded-input border border-success-100 bg-success-50/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-neutral-900">{attachment.driveFileName}</p>
              <p className="mt-1 truncate text-xs text-neutral-500">{attachment.driveMimeType} · cập nhật {new Date(attachment.driveModifiedTime).toLocaleString("vi-VN")}</p>
            </div>
            <a href={attachment.driveWebViewLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-input bg-primary-600 px-3 text-xs font-bold text-white hover:bg-primary-700">Mở trên Drive <ExternalLink size={14} /></a>
          </div>
        </div>
      ) : <p className="mt-4 rounded-input border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-center text-sm text-neutral-500">Chưa gắn tệp Google Drive cho giáo án này.</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={!configured || busy !== null} onClick={connect} icon={<ShieldCheck size={15} />}>{busy === "connect" ? "Đang kết nối..." : "Kết nối Drive"}</Button>
        <Button type="button" size="sm" variant="secondary" disabled={!configured || busy !== null} onClick={pickFile} icon={<FolderOpen size={15} />}>{busy === "pick" ? "Đang mở..." : "Chọn tệp"}</Button>
        <Button type="button" size="sm" variant="secondary" disabled={!configured || !folderId || busy !== null} onClick={() => inputRef.current?.click()} icon={<FileUp size={15} />}>{busy === "upload" ? "Đang tải..." : "Tải tệp mới"}</Button>
        {attachment && <Button type="button" size="sm" variant="secondary" disabled={busy !== null} onClick={refreshFile} icon={<RefreshCw size={15} />}>Kiểm tra lại</Button>}
        {attachment && <Button type="button" size="sm" variant="danger" disabled={busy !== null} onClick={unlinkFile} icon={<Link2Off size={15} />}>Bỏ liên kết</Button>}
        <input ref={inputRef} type="file" className="sr-only" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) uploadFile(file); }} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-input border border-danger-100 bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700">{error}</p>}
    </section>
  );
}
