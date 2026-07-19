export type ApiErrorCode = "ABORTED" | "TIMEOUT" | "INVALID_JSON" | `HTTP_${number}` | "NETWORK_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number | null,
    public readonly retryable: boolean,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestJsonOptions extends RequestInit {
  timeoutMs?: number;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function responseMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  }
  if (body && typeof body === "object" && "message" in body && typeof (body as { message?: unknown }).message === "string") {
    return (body as { message: string }).message;
  }
  return fallback;
}

export async function requestJson<T>(url: string, options: RequestJsonOptions = {}): Promise<T> {
  const { timeoutMs = 15_000, signal, ...init } = options;
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body: unknown;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new ApiError("INVALID_JSON", "Phản hồi API không phải JSON hợp lệ.", response.status, false);
      }
    }
    if (!response.ok) {
      throw new ApiError(
        `HTTP_${response.status}`,
        responseMessage(body, `API trả về HTTP ${response.status}.`),
        response.status,
        isRetryableStatus(response.status),
        body,
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError(timedOut ? "TIMEOUT" : "ABORTED", timedOut ? "Yêu cầu API đã hết thời gian chờ." : "Yêu cầu API đã bị hủy.", null, timedOut);
    }
    throw new ApiError("NETWORK_ERROR", "Không thể kết nối đến API.", null, true, error);
  } finally {
    globalThis.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abort);
  }
}
