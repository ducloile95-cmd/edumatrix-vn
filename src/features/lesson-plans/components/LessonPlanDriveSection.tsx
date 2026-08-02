import type { RefObject } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Cloud, ExternalLink, FileUp, FolderOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isGoogleDriveConnected } from "@/services/integrations/googleDrive";
import type { LessonPlanFormValues } from "@/schemas/lessonPlan";
import type { LessonPlanDriveAttachment } from "@/types/academic";

const INPUT = "min-h-touch w-full rounded-input border border-neutral-300 px-3 text-sm focus:border-primary-500";
const LABEL = "mb-1 block text-sm font-medium text-neutral-700";
const SECTION_TITLE = "mb-3 text-xs font-bold uppercase tracking-wide text-primary-700";
const BLOCK = "rounded-card border border-neutral-200 bg-white p-4 shadow-[var(--shadow-1)]";

interface LessonPlanDriveSectionProps {
  driveAttachment: LessonPlanDriveAttachment | null;
  driveBusy: boolean;
  driveConfigured: boolean;
  driveFolderId: string;
  driveError: string | null;
  driveInputRef: RefObject<HTMLInputElement>;
  pickDriveFile: () => void;
  uploadDriveFile: (file: File) => void;
  register: UseFormRegister<LessonPlanFormValues>;
  errors: FieldErrors<LessonPlanFormValues>;
}

export function LessonPlanDriveSection({
  driveAttachment,
  driveBusy,
  driveConfigured,
  driveFolderId,
  driveError,
  driveInputRef,
  pickDriveFile,
  uploadDriveFile,
  register,
  errors,
}: LessonPlanDriveSectionProps) {
  return (
<div className={BLOCK}>
            <h3 className={SECTION_TITLE}>Tài liệu Google Drive</h3>
            <div className="rounded-card border border-primary-100 bg-white p-3 shadow-[var(--shadow-1)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-900"><Cloud size={18} className="text-primary-600" />Google Drive</div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-2xs font-bold ${isGoogleDriveConnected() ? "bg-success-50 text-success-700" : "bg-neutral-100 text-neutral-600"}`}>
                  <ShieldCheck size={12} />{isGoogleDriveConnected() ? "Đã kết nối" : "Sẵn sàng kết nối"}
                </span>
              </div>
              {driveAttachment ? (
                <div className="mt-3 rounded-input border border-neutral-200 bg-neutral-50 p-3">
                  <p className="truncate text-xs font-bold text-neutral-900">{driveAttachment.driveFileName}</p>
                  <p className="mt-1 truncate text-2xs text-neutral-500">{driveAttachment.driveMimeType}</p>
                </div>
              ) : <p className="mt-3 rounded-input border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-center text-xs text-neutral-500">Chưa chọn tệp cho giáo án.</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button type="button" size="sm" disabled={!driveConfigured || driveBusy} onClick={pickDriveFile} icon={<FolderOpen size={14} />}>Chọn từ Drive</Button>
                <Button type="button" size="sm" disabled={!driveConfigured || !driveFolderId || driveBusy} onClick={() => driveInputRef.current?.click()} icon={<FileUp size={14} />}>Tải tệp mới</Button>
                {driveAttachment && (
                  <a href={driveAttachment.driveWebViewLink} target="_blank" rel="noopener noreferrer" className="col-span-2 inline-flex min-h-9 items-center justify-center gap-2 rounded-input bg-primary-600 px-3 text-xs font-bold text-white hover:bg-primary-700">
                    Mở trực tiếp trên Drive <ExternalLink size={14} />
                  </a>
                )}
                <input ref={driveInputRef} type="file" className="sr-only" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) uploadDriveFile(file); }} />
              </div>
              {!driveConfigured && <p className="mt-2 text-xs text-warning-700">Google Drive chưa được cấu hình đầy đủ.</p>}
              {driveConfigured && !driveFolderId && <p className="mt-2 text-xs text-warning-700">Chưa có Folder ID; vẫn chọn được tệp nhưng chưa thể tải tệp mới.</p>}
              {driveError && <p role="alert" className="mt-2 text-xs font-semibold text-danger-700">{driveError}</p>}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-neutral-600">Dùng liên kết tài liệu khác</summary>
              <div className="mt-3 space-y-3">
                <div><label htmlFor="lp-attach-label" className={LABEL}>Tên hiển thị</label><input id="lp-attach-label" type="text" className={INPUT} {...register("attachmentLabel")} /></div>
                <div><label htmlFor="lp-attach-url" className={LABEL}>Liên kết HTTPS</label><input id="lp-attach-url" type="url" className={INPUT} {...register("attachmentUrl")} />{errors.attachmentUrl && <p role="alert" className="mt-1 text-xs text-danger-700">{errors.attachmentUrl.message}</p>}</div>
              </div>
            </details>
          </div>
  );
}
