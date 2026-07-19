import { ApiError, requestJson } from "@/services/api/request";
import type { LessonPlanDriveAttachment } from "@/types/academic";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_FIELDS = "id,name,mimeType,webViewLink,modifiedTime,trashed";
const MAX_MULTIPART_BYTES = 5 * 1024 * 1024;

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
  trashed?: boolean;
}

export function mapDriveMetadata(metadata: DriveFileMetadata): LessonPlanDriveAttachment {
  return {
    driveFileId: metadata.id,
    driveFileName: metadata.name,
    driveMimeType: metadata.mimeType,
    driveWebViewLink: metadata.webViewLink,
    driveModifiedTime: metadata.modifiedTime,
  };
}

export type DriveErrorCode =
  | "NOT_CONFIGURED"
  | "AUTH_CANCELLED"
  | "TOKEN_EXPIRED"
  | "FOLDER_REQUIRED"
  | "FILE_TOO_LARGE"
  | "FILE_UNAVAILABLE"
  | "SCRIPT_LOAD_FAILED";

export class DriveError extends Error {
  constructor(public readonly code: DriveErrorCode, message: string, public readonly retryable = false) {
    super(message);
    this.name = "DriveError";
  }
}

interface DriveConfig {
  clientId: string;
  apiKey: string;
  appId: string;
}

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
const scriptPromises = new Map<string, Promise<void>>();

function driveConfig(): DriveConfig {
  return {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
    apiKey: import.meta.env.VITE_GOOGLE_PICKER_API_KEY ?? "",
    appId: import.meta.env.VITE_GOOGLE_PICKER_APP_ID ?? "",
  };
}

export function isGoogleDriveConfigured(): boolean {
  const config = driveConfig();
  return Boolean(config.clientId && config.apiKey && config.appId);
}

export function isGoogleDriveConnected(): boolean {
  return Boolean(accessToken && Date.now() < accessTokenExpiresAt);
}

function loadScript(src: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve();
  const pending = scriptPromises.get(src);
  if (pending) return pending;
  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    const script = existing ?? document.createElement("script");
    const onLoad = () => ready() ? resolve() : reject(new DriveError("SCRIPT_LOAD_FAILED", "Thư viện Google không khởi tạo được.", true));
    const onError = () => reject(new DriveError("SCRIPT_LOAD_FAILED", "Không tải được thư viện Google.", true));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    scriptPromises.delete(src);
    throw error;
  });
  scriptPromises.set(src, promise);
  return promise;
}

async function loadIdentityServices(): Promise<void> {
  await loadScript("https://accounts.google.com/gsi/client", () => Boolean(window.google?.accounts?.oauth2));
}

async function loadPicker(): Promise<void> {
  await loadScript("https://apis.google.com/js/api.js", () => Boolean(window.gapi));
  if (window.google?.picker) return;
  await new Promise<void>((resolve, reject) => {
    window.gapi?.load("picker", { callback: resolve, onerror: () => reject(new DriveError("SCRIPT_LOAD_FAILED", "Không tải được Google Picker.", true)) });
  });
}

function requireConfig(): DriveConfig {
  const config = driveConfig();
  if (!config.clientId || !config.apiKey || !config.appId) {
    throw new DriveError("NOT_CONFIGURED", "Google Drive chưa được cấu hình Client ID, API key và App ID.");
  }
  return config;
}

export async function connectGoogleDrive(): Promise<void> {
  if (isGoogleDriveConnected()) return;
  const config = requireConfig();
  await loadIdentityServices();
  await new Promise<void>((resolve, reject) => {
    const oauth = window.google?.accounts.oauth2;
    if (!oauth) {
      reject(new DriveError("SCRIPT_LOAD_FAILED", "Google Identity Services chưa sẵn sàng.", true));
      return;
    }
    const client = oauth.initTokenClient({
      client_id: config.clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (!response.access_token) {
          reject(new DriveError("AUTH_CANCELLED", response.error_description || "Bạn chưa cấp quyền Google Drive."));
          return;
        }
        accessToken = response.access_token;
        const lifetimeSeconds = Number(response.expires_in) || 3600;
        accessTokenExpiresAt = Date.now() + Math.max(0, lifetimeSeconds - 60) * 1000;
        resolve();
      },
      error_callback: () => reject(new DriveError("AUTH_CANCELLED", "Cửa sổ kết nối Google Drive đã đóng.")),
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

export function disconnectGoogleDrive(): void {
  const token = accessToken;
  accessToken = null;
  accessTokenExpiresAt = 0;
  if (token && window.google?.accounts.oauth2) window.google.accounts.oauth2.revoke(token, () => undefined);
}

function currentToken(): string {
  if (!isGoogleDriveConnected() || !accessToken) {
    accessToken = null;
    throw new DriveError("TOKEN_EXPIRED", "Phiên Google Drive đã hết hạn. Hãy kết nối lại.", true);
  }
  return accessToken;
}

function normalizeDriveFailure(error: unknown): never {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    accessToken = null;
    accessTokenExpiresAt = 0;
    throw new DriveError("TOKEN_EXPIRED", error.status === 403 ? "Tài khoản không có quyền truy cập tệp hoặc thư mục Drive." : "Phiên Google Drive đã hết hạn.", true);
  }
  if (error instanceof ApiError && error.status === 404) {
    throw new DriveError("FILE_UNAVAILABLE", "Tệp hoặc thư mục Drive không còn tồn tại.");
  }
  throw error;
}

export async function getDriveFileMetadata(fileId: string): Promise<DriveFileMetadata> {
  try {
    const metadata = await requestJson<DriveFileMetadata>(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(DRIVE_FIELDS)}`,
      { headers: { Authorization: `Bearer ${currentToken()}` } },
    );
    if (metadata.trashed) throw new DriveError("FILE_UNAVAILABLE", "Tệp Google Drive đã nằm trong thùng rác.");
    return metadata;
  } catch (error) {
    return normalizeDriveFailure(error);
  }
}

export async function openGoogleDrivePicker(folderId?: string): Promise<DriveFileMetadata | null> {
  const config = requireConfig();
  const token = currentToken();
  await loadPicker();
  const pickerApi = window.google?.picker;
  if (!pickerApi) throw new DriveError("SCRIPT_LOAD_FAILED", "Google Picker chưa sẵn sàng.", true);
  const fileId = await new Promise<string | null>((resolve) => {
    let view = new pickerApi.DocsView(pickerApi.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false);
    if (folderId) view = view.setParent(folderId);
    const builder = new pickerApi.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(config.apiKey)
      .setAppId(config.appId)
      .setCallback((response) => {
        if (response.action === pickerApi.Action.PICKED) resolve(response.docs?.[0]?.id ?? null);
        else if (response.action === pickerApi.Action.CANCEL) resolve(null);
      });
    builder.build().setVisible(true);
  });
  return fileId ? getDriveFileMetadata(fileId) : null;
}

export async function uploadGoogleDriveFile(file: File, folderId: string): Promise<DriveFileMetadata> {
  if (!folderId.trim()) throw new DriveError("FOLDER_REQUIRED", "Chưa cấu hình thư mục Google Drive cho giáo án.");
  if (file.size > MAX_MULTIPART_BYTES) throw new DriveError("FILE_TOO_LARGE", "Tệp tải lên tối đa 5 MB.");
  const boundary = `edumatrix_${crypto.randomUUID()}`;
  const metadata = {
    name: file.name,
    parents: [folderId.trim()],
    appProperties: { edumatrixType: "lesson-plan" },
  };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    file,
    `\r\n--${boundary}--`,
  ], { type: `multipart/related; boundary=${boundary}` });
  try {
    return await requestJson<DriveFileMetadata>(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent(DRIVE_FIELDS)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken()}`, "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
        timeoutMs: 45_000,
      },
    );
  } catch (error) {
    return normalizeDriveFailure(error);
  }
}

export function driveErrorMessage(error: unknown): string {
  if (error instanceof DriveError || error instanceof ApiError) return error.message;
  return "Không thể hoàn tất thao tác Google Drive.";
}
