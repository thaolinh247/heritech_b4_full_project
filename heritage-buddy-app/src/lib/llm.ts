import type { ArtifactContext } from "./contextBuilder";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

interface LLMRequest {
  question: string;
  artifactContext: ArtifactContext;
}

interface AudioLLMRequest {
  audioBase64: string;
  mimeType: string;
  artifactContext: ArtifactContext;
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

export async function askBuddy(req: LLMRequest): Promise<LLMResponse> {
  try {
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/api/ask-buddy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      },
      FETCH_TIMEOUT,
    );

    if (!response.ok) {
      return {
        answer: "Xin lỗi, mình gặp sự cố kết nối. Bạn thử lại nhé!",
        error: `HTTP ${response.status}`,
      };
    }

    return response.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return {
      answer: `Không thể kết nối đến máy chủ (${msg}). Bạn kiểm tra mạng và thử lại nhé!`,
      error: "Network error",
    };
  }
}

export async function askBuddyWithAudio(req: AudioLLMRequest): Promise<AudioLLMResponse> {
  try {
    const response = await fetchWithTimeout(
      `${BACKEND_URL}/api/ask-buddy-audio`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      },
      FETCH_TIMEOUT,
    );

    if (!response.ok) {
      return {
        transcription: "",
        answer: "Xin lỗi, mình không nghe rõ. Bạn thử lại nhé!",
        error: `HTTP ${response.status}`,
      };
    }

    return response.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return {
      transcription: "",
      answer: `Không thể kết nối đến máy chủ (${msg}). Bạn kiểm tra mạng và thử lại nhé!`,
      error: "Network error",
    };
  }
}

export async function checkServerHealth(): Promise<{ ok: boolean; detail?: string }> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/api/health`, {}, 5000);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data.hasApiKey) return { ok: false, detail: "Server missing GEMINI_API_KEY" };
    return { ok: true };
  } catch {
    return { ok: false, detail: `Cannot reach ${BACKEND_URL}` };
  }
}
