interface GoogleOAuthTokenResponse {
  access_token?: string;
  expires_in?: string;
  error?: string;
  error_description?: string;
}

interface GoogleOAuthTokenClient {
  requestAccessToken(config?: { prompt?: string }): void;
}

interface GooglePickerDocument {
  id: string;
}

interface GooglePickerResponse {
  action: string;
  docs?: GooglePickerDocument[];
}

interface GooglePickerDocsView {
  setIncludeFolders(value: boolean): GooglePickerDocsView;
  setSelectFolderEnabled(value: boolean): GooglePickerDocsView;
  setParent(folderId: string): GooglePickerDocsView;
}

interface GooglePickerBuilder {
  addView(view: GooglePickerDocsView): GooglePickerBuilder;
  setAppId(appId: string): GooglePickerBuilder;
  setCallback(callback: (response: GooglePickerResponse) => void): GooglePickerBuilder;
  setDeveloperKey(apiKey: string): GooglePickerBuilder;
  setOAuthToken(token: string): GooglePickerBuilder;
  build(): { setVisible(value: boolean): void };
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string;
          scope: string;
          callback: (response: GoogleOAuthTokenResponse) => void;
          error_callback?: (error: { type?: string }) => void;
        }): GoogleOAuthTokenClient;
        revoke(token: string, callback: () => void): void;
      };
    };
    picker?: {
      Action: { PICKED: string; CANCEL: string };
      ViewId: { DOCS: string };
      DocsView: new (viewId: string) => GooglePickerDocsView;
      PickerBuilder: new () => GooglePickerBuilder;
    };
  };
  gapi?: {
    load(name: string, options: { callback: () => void; onerror: () => void }): void;
  };
}
