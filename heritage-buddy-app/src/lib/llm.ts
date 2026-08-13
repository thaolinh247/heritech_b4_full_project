import Constants from "expo-constants";
import type { ArtifactContext } from "./contextBuilder";
import { getLanguage, t } from "@/lib/i18n";
import type { Language } from "@/types/language";

// Lấy IP máy chạy server tự động từ Expo dev server (hostUri) → không bao giờ bị IP cũ
// dù DHCP có đổi. Thứ tự ưu tiên: hostUri (luôn đúng) → EXPO_PUBLIC_BACKEND_URL → localhost.
function getBackendUrls(): string[] {
  const urls = new Set<string>();

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) {
    urls.add(`http://${host}:3000`);
  }

  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    urls.add(envUrl);
  }

  // USB debug: localhost chạy được nhờ "adb reverse tcp:3000 tcp:3000"
  urls.add("http://localhost:3000");

  return [...urls];
}

const BASE_URLS = getBackendUrls();

interface LLMRequest {
  question: string;
  artifactContext: ArtifactContext;
  language: Language;
}

interface AudioLLMRequest {
  audioBase64: string;
  mimeType: string;
  artifactContext: ArtifactContext;
  language: Language;
}

interface LLMResponse {
  answer: string;
  error?: string;
}

interface AudioLLMResponse extends LLMResponse {
  transcription?: string;
}

const FETCH_TIMEOUT = 20000;

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Thử lần lượt từng URL máy chủ (IP LAN → localhost qua adb reverse)
async function fetchWithFallback(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  let lastError: unknown = null;
  for (const baseUrl of BASE_URLS) {
    try {
      return await fetchWithTimeout(`${baseUrl}${path}`, init, timeoutMs);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(t("llm.connErr"));
}

export async function askBuddy(req: LLMRequest): Promise<LLMResponse> {
  try {
    const response = await fetchWithFallback(
      "/api/ask-buddy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, language: getLanguage() }),
      },
      FETCH_TIMEOUT,
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

export async function askBuddyWithAudio(req: AudioLLMRequest): Promise<AudioLLMResponse> {
  try {
    const response = await fetchWithFallback(
      "/api/ask-buddy-audio",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, language: getLanguage() }),
      },
      FETCH_TIMEOUT,
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

export async function checkServerHealth(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const res = await fetchWithFallback("/api/health", {}, 5000);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data.hasApiKey) return { ok: false, detail: "Server missing GEMINI_API_KEY" };
    return { ok: true };
  } catch {
    return { ok: false, detail: `Cannot reach ${BASE_URLS.join(" / ")}` };
  }
}
