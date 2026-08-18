import Constants from "expo-constants";
import { Platform } from "react-native";
import type { ArtifactContext } from "./contextBuilder";
import { getLanguage, t } from "@/lib/i18n";
import type { Language } from "@/types/language";
import { useServerStore } from "@/store/server";

// ─── Timeout constants ──────────────────────

const LLM_TIMEOUT_MS = 15000;   // 15s cho LLM request (audio payload lớn)
const HEALTH_TIMEOUT_MS = 5000;  // 5s cho health check
const RETRY_COUNT = 1;           // Thử lại 1 lần trước khi chuyển URL

// ─── URL resolution ─────────────────────────

// Thứ tự ưu tiên URL server:
// 1. URL tuỳ chỉnh từ Settings (nếu user đã set → CHỈ thử URL này, bỏ qua tất cả khác)
// 2. hostUri từ Expo dev server (chỉ có trong Expo Go / dev build)
// 3. EXPO_PUBLIC_BACKEND_URL từ .env (hardcoded khi build APK)
// 4. localhost (chỉ thêm khi dev mode hoặc có adb reverse)
function resolveBackendUrls(): string[] {
  const urls = new Set<string>();

  // Ưu tiên cao nhất: URL tuỳ chỉnh từ Settings
  const customUrl = useServerStore.getState().customBackendUrl;
  if (customUrl) {
    urls.add(customUrl.replace(/\/+$/, ""));
    // Nếu user đã set URL tuỳ chỉnh → CHỈ dùng URL đó (không thử cái khác)
    // Tránh lãng phí thời gian timeout vào các URL vô ích
    return [...urls];
  }

  // Dev mode: Expo dev server hostUri
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) {
    urls.add(`http://${host}:3000`);
  }

  // APK standalone: URL cứng từ .env
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    urls.add(envUrl);
  }

  // USB debug: localhost chỉ có nghĩa khi dev mode (adb reverse)
  if (__DEV__ || Platform.OS === "web") {
    urls.add("http://localhost:3000");
  }

  return [...urls];
}

// ─── Fetch with timeout + retry ─────────────

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

// Thử 1 URL với retry (tối đa 1+RETRY_COUNT lần)
async function tryUrlWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      return await fetchWithTimeout(url, init, timeoutMs);
    } catch (err) {
      lastError = err;
      // Nếu là abort/timeout → worth retry, nếu là 4xx client error → skip
      if (err instanceof Error && err.name === "AbortError" && attempt < RETRY_COUNT) {
        continue;
      }
      // Network error hoặc server error → retry 1 lần
      if (attempt < RETRY_COUNT) continue;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

// Thử lần lượt từng URL, mỗi URL retry 1 lần
async function fetchWithFallback(
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const urls = resolveBackendUrls();
  let lastError: unknown = null;

  for (const baseUrl of urls) {
    try {
      return await tryUrlWithRetry(`${baseUrl}${path}`, init, timeoutMs);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(t("llm.connErr"));
}

// ─── Request types ──────────────────────────

// language được hàm tự điền qua getLanguage() — caller không cần truyền.
interface LLMRequest {
  question: string;
  artifactContext: ArtifactContext;
  language?: Language;
}

interface AudioLLMRequest {
  audioBase64: string;
  mimeType: string;
  artifactContext: ArtifactContext;
  language?: Language;
}

interface LLMResponse {
  answer: string;
  error?: string;
}

interface AudioLLMResponse extends LLMResponse {
  transcription?: string;
}

// ─── Public API ─────────────────────────────

export async function askBuddy(req: LLMRequest): Promise<LLMResponse> {
  try {
    const response = await fetchWithFallback(
      "/api/ask-buddy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, language: getLanguage() }),
      },
      LLM_TIMEOUT_MS,
    );

    if (!response.ok) {
      return {
        answer: t("llm.connectFailed"),
        error: `HTTP ${response.status}`,
      };
    }

    return response.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : t("llm.unknownError");
    return {
      answer: t("llm.networkErrorTemplate", { msg }),
      error: "Network error",
    };
  }
}

export async function askBuddyWithAudio(
  req: AudioLLMRequest,
): Promise<AudioLLMResponse> {
  try {
    const response = await fetchWithFallback(
      "/api/ask-buddy-audio",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, language: getLanguage() }),
      },
      LLM_TIMEOUT_MS,
    );

    if (!response.ok) {
      return {
        transcription: "",
        answer: t("llm.hearFailed"),
        error: `HTTP ${response.status}`,
      };
    }

    return response.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : t("llm.unknownError");
    return {
      transcription: "",
      answer: t("llm.networkErrorTemplate", { msg }),
      error: "Network error",
    };
  }
}

export async function checkServerHealth(): Promise<{
  ok: boolean;
  detail?: string;
}> {
  try {
    const res = await fetchWithFallback("/api/health", {}, HEALTH_TIMEOUT_MS);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data.hasApiKey)
      return { ok: false, detail: "Server missing GEMINI_API_KEY" };
    return { ok: true };
  } catch {
    return {
      ok: false,
      detail: `Cannot reach ${resolveBackendUrls().join(" / ")}`,
    };
  }
}
