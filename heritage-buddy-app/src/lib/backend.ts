// ─── Backend client dùng chung ─────────────────
// Tất cả request lên máy chủ (LLM, dashboard...) đi qua đây để dùng chung
// cơ chế fallback URL: IP LAN → localhost (hoạt động khi debug qua USB với
// `adb reverse tcp:3000 tcp:3000`).

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

const FALLBACK_BACKEND_URL =
  BACKEND_URL === "http://localhost:3000" ? null : "http://localhost:3000";

export const BASE_URLS = FALLBACK_BACKEND_URL
  ? [BACKEND_URL, FALLBACK_BACKEND_URL]
  : [BACKEND_URL];

export function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Thử lần lượt từng URL máy chủ (IP LAN → localhost qua adb reverse)
export async function fetchWithFallback(
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  let lastError: unknown = null;
  for (const baseUrl of BASE_URLS) {
    try {
      return await fetchWithTimeout(`${baseUrl}${path}`, init, timeoutMs);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Không thể kết nối đến máy chủ");
}
