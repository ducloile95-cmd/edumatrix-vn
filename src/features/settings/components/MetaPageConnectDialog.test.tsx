// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MetaPageConnectDialog } from "@/features/settings/components/MetaPageConnectDialog";

const integrationMocks = vi.hoisted(() => ({
  getStatus: vi.fn(),
  selectPage: vi.fn(),
  startConnection: vi.fn(),
}));

vi.mock("@/components/ui/Modal", () => ({
  Modal: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock("@/services/integrations/messenger", () => ({
  getMetaPageConnectionStatus: integrationMocks.getStatus,
  selectMetaPage: integrationMocks.selectPage,
  startMetaPageConnection: integrationMocks.startConnection,
}));

describe("MetaPageConnectDialog polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    integrationMocks.startConnection.mockResolvedValue({
      state: "meta-state-1",
      authorizationUrl: "https://facebook.example/authorize",
      expiresAt: "2026-07-28T10:00:00.000Z",
    });
    integrationMocks.getStatus.mockResolvedValue({
      status: "pending",
      pages: [],
      error: null,
    });
    vi.spyOn(window, "open").mockReturnValue({} as Window);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("polls the active session and removes its timer and message listener on unmount", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <MetaPageConnectDialog
        open
        onClose={vi.fn()}
        onConnected={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Tiếp tục với Facebook" }),
      );
      await Promise.resolve();
    });

    expect(window.open).toHaveBeenCalledWith(
      "https://facebook.example/authorize",
      "edumatrix-meta-connect",
      "popup,width=620,height=760",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_500);
    });
    expect(integrationMocks.getStatus).toHaveBeenCalledTimes(1);
    expect(integrationMocks.getStatus).toHaveBeenLastCalledWith("meta-state-1");

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "edumatrix-meta-connect",
            state: "meta-state-1",
          },
        }),
      );
      await Promise.resolve();
    });
    expect(integrationMocks.getStatus).toHaveBeenCalledTimes(2);

    const messageListener = addEventListener.mock.calls.find(
      ([eventName]) => eventName === "message",
    )?.[1];
    expect(messageListener).toBeTypeOf("function");

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      "message",
      messageListener,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(integrationMocks.getStatus).toHaveBeenCalledTimes(2);
  });

  test("selects the only authorized page and completes the connection", async () => {
    vi.useRealTimers();
    const page = {
      id: "page-1",
      name: "EduMatrix",
      pictureUrl: null,
      utilityMessagingPermission: "granted",
    };
    integrationMocks.getStatus.mockResolvedValue({
      status: "ready",
      pages: [page],
      error: null,
    });
    integrationMocks.selectPage.mockResolvedValue({ page });
    const onConnected = vi.fn();

    render(
      <MetaPageConnectDialog
        open
        onClose={vi.fn()}
        onConnected={onConnected}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Tiếp tục với Facebook" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Kiểm tra lại" }),
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Kết nối Fanpage" }),
    );

    await waitFor(() => {
      expect(integrationMocks.selectPage).toHaveBeenCalledWith(
        "meta-state-1",
        "page-1",
      );
      expect(onConnected).toHaveBeenCalledWith(page);
    });
  });

  test("shows Facebook permission failures returned by the status endpoint", async () => {
    vi.useRealTimers();
    integrationMocks.getStatus.mockResolvedValue({
      status: "failed",
      pages: [],
      error: "Facebook từ chối quyền quản lý Trang.",
    });

    render(
      <MetaPageConnectDialog
        open
        onClose={vi.fn()}
        onConnected={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Tiếp tục với Facebook" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Kiểm tra lại" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Facebook từ chối quyền quản lý Trang.",
    );
  });

  test("warns when the reconnected page is still missing Utility Messaging permission", async () => {
    vi.useRealTimers();
    integrationMocks.getStatus.mockResolvedValue({
      status: "ready",
      pages: [{
        id: "page-1",
        name: "EduMatrix",
        pictureUrl: null,
        utilityMessagingPermission: "missing",
      }],
      error: null,
    });

    render(
      <MetaPageConnectDialog
        open
        onClose={vi.fn()}
        onConnected={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục với Facebook" }));
    fireEvent.click(await screen.findByRole("button", { name: "Kiểm tra lại" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "không bật Utility Messaging",
    );
  });
});
