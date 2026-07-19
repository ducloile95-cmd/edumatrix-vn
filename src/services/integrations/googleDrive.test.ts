import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  getDriveFileMetadata,
  mapDriveMetadata,
  openGoogleDrivePicker,
  uploadGoogleDriveFile,
} from "@/services/integrations/googleDrive";

class MockDocsView implements GooglePickerDocsView {
  setIncludeFolders() { return this; }
  setSelectFolderEnabled() { return this; }
  setParent() { return this; }
}

class MockPickerBuilder implements GooglePickerBuilder {
  private callback: ((response: GooglePickerResponse) => void) | null = null;
  addView() { return this; }
  setAppId() { return this; }
  setDeveloperKey() { return this; }
  setOAuthToken() { return this; }
  setCallback(callback: (response: GooglePickerResponse) => void) { this.callback = callback; return this; }
  build() { return { setVisible: () => this.callback?.({ action: "cancel" }) }; }
}

beforeEach(() => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
  vi.stubEnv("VITE_GOOGLE_PICKER_API_KEY", "api-key");
  vi.stubEnv("VITE_GOOGLE_PICKER_APP_ID", "123456");
  vi.stubGlobal("window", {
    google: {
      accounts: { oauth2: {
        initTokenClient: (config: { callback: (response: GoogleOAuthTokenResponse) => void }) => ({
          requestAccessToken: () => config.callback({ access_token: "short-lived-token", expires_in: "3600" }),
        }),
        revoke: (_token: string, callback: () => void) => callback(),
      } },
      picker: {
        Action: { PICKED: "picked", CANCEL: "cancel" },
        ViewId: { DOCS: "docs" },
        DocsView: MockDocsView,
        PickerBuilder: MockPickerBuilder,
      },
    },
    gapi: { load: (_name: string, options: { callback: () => void }) => options.callback() },
  });
});

afterEach(() => {
  disconnectGoogleDrive();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Google Drive adapter", () => {
  test("maps stable metadata for Firestore", () => {
    expect(mapDriveMetadata({ id: "f1", name: "Giao an.pdf", mimeType: "application/pdf", webViewLink: "https://drive.google.com/f1", modifiedTime: "2026-07-19T00:00:00Z" })).toEqual({
      driveFileId: "f1",
      driveFileName: "Giao an.pdf",
      driveMimeType: "application/pdf",
      driveWebViewLink: "https://drive.google.com/f1",
      driveModifiedTime: "2026-07-19T00:00:00Z",
    });
  });

  test("rejects missing folder, oversized file and expired session before network", async () => {
    const small = new File(["lesson"], "lesson.txt", { type: "text/plain" });
    const large = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" });
    await expect(uploadGoogleDriveFile(small, "")).rejects.toMatchObject({ code: "FOLDER_REQUIRED" });
    await expect(uploadGoogleDriveFile(large, "folder-1")).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
    await expect(getDriveFileMetadata("file-1")).rejects.toMatchObject({ code: "TOKEN_EXPIRED", retryable: true });
  });

  test("maps permission and deleted-file API failures", async () => {
    await connectGoogleDrive();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response('{"error":{"message":"denied"}}', { status: 403 })));
    await expect(getDriveFileMetadata("private-file")).rejects.toMatchObject({ code: "TOKEN_EXPIRED", retryable: true });

    await connectGoogleDrive();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response('{"error":{"message":"missing"}}', { status: 404 })));
    await expect(getDriveFileMetadata("deleted-file")).rejects.toMatchObject({ code: "FILE_UNAVAILABLE" });
  });

  test("returns null when Picker is cancelled", async () => {
    await connectGoogleDrive();
    await expect(openGoogleDrivePicker("folder-1")).resolves.toBeNull();
  });

  test("uploads a small file with multipart metadata", async () => {
    await connectGoogleDrive();
    const response = { id: "f1", name: "lesson.txt", mimeType: "text/plain", webViewLink: "https://drive.google.com/f1", modifiedTime: "2026-07-19T00:00:00Z" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadGoogleDriveFile(new File(["lesson"], "lesson.txt", { type: "text/plain" }), "folder-1")).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("uploadType=multipart"), expect.objectContaining({ method: "POST" }));
  });
});
