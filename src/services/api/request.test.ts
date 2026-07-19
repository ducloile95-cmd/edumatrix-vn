import { afterEach, describe, expect, test, vi } from "vitest";
import { requestJson } from "@/services/api/request";

afterEach(() => vi.unstubAllGlobals());

describe("requestJson", () => {
  test("returns parsed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 })));
    await expect(requestJson<{ ok: boolean }>("https://api.example.test")).resolves.toEqual({ ok: true });
  });

  test("normalizes HTTP and invalid JSON failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response('{"error":{"message":"quota"}}', { status: 429 }))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 })));
    await expect(requestJson("https://api.example.test")).rejects.toMatchObject({ code: "HTTP_429", status: 429, retryable: true, message: "quota" });
    await expect(requestJson("https://api.example.test")).rejects.toMatchObject({ code: "INVALID_JSON", retryable: false });
  });

  test.each([
    [401, false],
    [403, false],
    [404, false],
    [429, true],
  ])("normalizes HTTP %i with retry policy", async (status, retryable) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"message":"failed"}', { status })));
    await expect(requestJson("https://api.example.test")).rejects.toMatchObject({ code: `HTTP_${status}`, status, retryable });
  });

  test("distinguishes timeout and caller abort", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })));
    const timeoutPromise = requestJson("https://api.example.test", { timeoutMs: 20 });
    const timeoutAssertion = expect(timeoutPromise).rejects.toMatchObject({ code: "TIMEOUT", retryable: true });
    await vi.advanceTimersByTimeAsync(20);
    await timeoutAssertion;

    const controller = new AbortController();
    const abortPromise = requestJson("https://api.example.test", { signal: controller.signal, timeoutMs: 1000 });
    const abortAssertion = expect(abortPromise).rejects.toMatchObject({ code: "ABORTED", retryable: false });
    controller.abort();
    await abortAssertion;
    vi.useRealTimers();
  });
});
