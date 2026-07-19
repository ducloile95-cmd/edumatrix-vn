import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("@/services/firebase/authClient", () => ({
  auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue("firebase-id-token") } },
}));

import { createMessengerInviteLink, postToPage, sendMessenger } from "@/services/integrations/messenger";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Messenger integration adapter", () => {
  test("sends Firebase token only to configured Worker", async () => {
    vi.stubEnv("VITE_MESSENGER_WORKER_URL", "https://messenger.example.workers.dev/");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"out-1","status":"sent"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendMessenger({ text: "Xin chao", studentId: "student-1" })).resolves.toMatchObject({ sent: true, id: "out-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://messenger.example.workers.dev/api/messenger/send",
      expect.objectContaining({ headers: expect.objectContaining({ authorization: "Bearer firebase-id-token" }) }),
    );
  });

  test("does not retry a failed mutation and keeps Worker error code", async () => {
    vi.stubEnv("VITE_MESSENGER_WORKER_URL", "https://messenger.example.workers.dev");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"error":"student_scope_denied"}', { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(postToPage({ message: "Thong bao" })).resolves.toMatchObject({ posted: false, reason: "error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("reports missing Worker configuration without a network call", async () => {
    vi.stubEnv("VITE_MESSENGER_WORKER_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendMessenger({ text: "Xin chao" })).resolves.toMatchObject({ sent: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("builds invitation from a short-lived Worker nonce instead of exposing the UID", async () => {
    vi.stubEnv("VITE_MESSENGER_WORKER_URL", "https://messenger.example.workers.dev");
    vi.stubEnv("VITE_MESSENGER_PAGE_USERNAME", "edumatrix.vn");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"nonce":"abcdefghijklmnopqrstuv","expiresAt":"2026-07-20T00:00:00.000Z"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createMessengerInviteLink("parent-private-uid", "student-1")).resolves.toEqual({
      url: "https://m.me/edumatrix.vn?ref=abcdefghijklmnopqrstuv",
      expiresAt: "2026-07-20T00:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://messenger.example.workers.dev/api/messenger/referral",
      expect.objectContaining({ body: JSON.stringify({ parentUid: "parent-private-uid", studentId: "student-1" }) }),
    );
  });
});
