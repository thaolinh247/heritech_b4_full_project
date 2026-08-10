import type { ArtifactContext } from "./contextBuilder";
import { BASE_URLS, fetchWithFallback } from "./backend";

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

export async function askBuddy(req: LLMRequest): Promise<LLMResponse> {
  try {
    const response = await fetchWithFallback(
      "/api/ask-buddy",
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
    const response = await fetchWithFallback(
      "/api/ask-buddy-audio",
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
    const res = await fetchWithFallback("/api/health", {}, 5000);
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    if (!data.hasApiKey) return { ok: false, detail: "Server missing GEMINI_API_KEY" };
    return { ok: true };
  } catch {
    return { ok: false, detail: `Cannot reach ${BASE_URLS.join(" / ")}` };
  }
}
