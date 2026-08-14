import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT ?? 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

interface ArtifactContext {
  name: string;
  description: string;
  funFact: string;
  section: string;
}

type Language = "vi" | "en";

interface AskBuddyBody {
  question: string;
  artifactContext: ArtifactContext;
  language?: Language;
}

interface AskBuddyAudioBody {
  audioBase64: string;
  mimeType: string;
  artifactContext: ArtifactContext;
  language?: Language;
}

function buildSystemPrompt(ctx: ArtifactContext, language: Language): string {
  const answerLanguage = language === "en"
    ? "You answer briefly (2-3 sentences), friendly, in ENGLISH."
    : "Bạn trả lời ngắn gọn (2-3 câu), thân thiện, bằng tiếng Việt.";
  const notAboutMuseum = language === "en"
    ? "If the question is not about the museum, say: \"I only know about the museum!\""
    : "Nếu câu hỏi không liên quan đến bảo tàng, nói: \"Mình chỉ biết về bảo tàng thôi nha!\"";
  return [
    "Bạn là Buddy, chú hổ nhỏ mascot của bảo tàng Việt Nam.",
    answerLanguage,
    notAboutMuseum,
    `Hiện vật đang hiển thị: ${ctx.name}.`,
    `Thông tin: ${ctx.description}.`,
    ctx.funFact ? `Fun fact: ${ctx.funFact}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function callGemini(contents: Parameters<typeof ai.models.generateContent>[0]["contents"], systemInstruction: string) {
  return ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: 300,
      temperature: 0.7,
    },
  });
}

// ─── POST /api/ask-buddy ─────────────────────
// Text question → LLM answer

app.post("/api/ask-buddy", async (req, res) => {
  try {
    const { question, artifactContext, language } = req.body as AskBuddyBody;

    if (!question) {
      res.status(400).json({ error: "Missing question" });
      return;
    }

    // Ngôn ngữ do app chọn (vi/en) — mặc định vi. Prompt thay đổi theo ngôn ngữ
    // để AI trả lời đúng tiếng, tránh "trả lời tiếng Việt rồi app đọc giọng Anh".
    const lang: Language = language === "en" ? "en" : "vi";
    const systemPrompt = buildSystemPrompt(artifactContext, lang);
    const response = await callGemini(question, systemPrompt);

    res.json({ answer: response.text ?? "" });
  } catch (error) {
    console.error("[ask-buddy]", error);
    res.status(500).json({ error: "LLM request failed" });
  }
});

// ─── POST /api/ask-buddy-audio ───────────────
// Audio base64 → transcription (Gemini) + LLM answer

app.post("/api/ask-buddy-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType, artifactContext, language } = req.body as AskBuddyAudioBody;

    if (!audioBase64) {
      res.status(400).json({ error: "Missing audioBase64" });
      return;
    }

    const lang: Language = language === "en" ? "en" : "vi";
    const systemPrompt = buildSystemPrompt(artifactContext, lang);
    const audioInstruction = lang === "en"
      ? "Listen to this recording and answer the question in ENGLISH. If you cannot hear clearly, say 'I could not hear you clearly. Please try again!'"
      : "Hãy nghe đoạn ghi âm này và trả lời câu hỏi. Nếu không nghe rõ, hãy nói 'Mình không nghe rõ bạn nói gì. Bạn thử nói lại nhé!'";

    const response = await callGemini(
      [
        {
          role: "user",
          parts: [
            { inlineData: { data: audioBase64, mimeType: mimeType ?? "audio/m4a" } },
            { text: audioInstruction },
          ],
        },
      ],
      systemPrompt,
    );

    const answer = response.text ?? "";

    // Try to extract a transcription from the answer
    // Gemini doesn't return a separate transcription field, so we send the answer
    res.json({
      answer,
      transcription: "", // will be filled if we implement separate STT later
    });
  } catch (error) {
    console.error("[ask-buddy-audio]", error);
    res.status(500).json({ error: "Audio LLM request failed" });
  }
});

// ─── GET /api/health ──────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: GEMINI_API_KEY.length > 0,
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Heritage Buddy backend running on :${PORT}`);
  if (!GEMINI_API_KEY) {
    console.warn("[Server] WARNING: GEMINI_API_KEY is not set");
  }
});
