import "dotenv/config";
import express from "express";
import cors from "cors";
import os from "os";
import { GoogleGenAI } from "@google/genai";

// ─── Validate API key on startup ─────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
if (!GEMINI_API_KEY) {
  console.error("[Server] FATAL: GEMINI_API_KEY is not set in .env");
  console.error("[Server] Get one at https://aistudio.google.com/apikey");
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ─── Types ──────────────────────────────────

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

// ─── Prompt builders ────────────────────────

function buildSystemPrompt(ctx: ArtifactContext, language: Language): string {
  const answerLanguage = language === "en"
    ? "You answer briefly (2-3 sentences), friendly, in ENGLISH."
    : "Bạn trả lời ngắn gọn (2-3 câu), thân thiện, bằng tiếng Việt.";
  const notAboutMuseum = language === "en"
    ? 'If the question is not about the museum, say: "I only know about the museum!"'
    : 'Nếu câu hỏi không liên quan đến bảo tàng, nói: "Mình chỉ biết về bảo tàng thôi nha!"';
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

function buildAudioInstruction(language: Language): string {
  return language === "en"
    ? `Transcribe the visitor's question into text, then answer it.
If you cannot hear clearly or there is no question, write "unclear" for transcription.

Return ONLY a JSON object with exactly these two fields:
{"transcription": "the visitor's question text", "answer": "your answer"}

No markdown, no code blocks, just the raw JSON.`
    : `Hãy chuyển đoạn ghi âm thành văn bản (transcription), sau đó trả lời câu hỏi.
Nếu không nghe rõ hoặc không có câu hỏi, ghi "không rõ" cho transcription.

Trả về ĐÚNG JSON với hai trường:
{"transcription": "văn bản câu hỏi của khách", "answer": "câu trả lời của bạn"}

Chỉ trả về JSON thuần, không thêm text nào khác.`;
}

// ─── Gemini call ────────────────────────────

async function callGemini(
  contents: Parameters<typeof ai.models.generateContent>[0]["contents"],
  systemInstruction: string,
) {
  return ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  });
}

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

function parseJSONResponse(raw: string): { transcription?: string; answer?: string } | null {
  const stripped = stripMarkdownCodeBlock(raw);
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    const clean = match[0].replace(/[\u0000-\u001F\u007F]/g, " ");
    try {
      return JSON.parse(clean);
    } catch {
      return null;
    }
  }
}

// ─── POST /api/ask-buddy ────────────────────

app.post("/api/ask-buddy", async (req, res) => {
  try {
    const { question, artifactContext, language } = req.body as AskBuddyBody;

    if (!question) {
      res.status(400).json({ answer: "Vui lòng nhập câu hỏi!" });
      return;
    }

    const lang: Language = language === "en" ? "en" : "vi";
    const systemPrompt = buildSystemPrompt(artifactContext, lang);
    const response = await callGemini(question, systemPrompt);

    res.json({ answer: response.text ?? "" });
  } catch (error) {
    console.error("[ask-buddy]", error);
    res.status(500).json({
      answer: "Xin lỗi, mình gặp sự cố. Bạn thử lại nhé!",
      error: "LLM request failed",
    });
  }
});

// ─── POST /api/ask-buddy-audio ──────────────

app.post("/api/ask-buddy-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType, artifactContext, language } = req.body as AskBuddyAudioBody;

    if (!audioBase64) {
      res.status(400).json({ transcription: "", answer: "Không nhận được âm thanh." });
      return;
    }

    // base64 < 2KB ≈ < 1s recording → rỗng / noise
    if (audioBase64.length < 2000) {
      res.json({ transcription: "", answer: "Mình không nghe rõ bạn nói gì. Bạn thử nói lại nhé!" });
      return;
    }

    const lang: Language = language === "en" ? "en" : "vi";
    const systemPrompt = buildSystemPrompt(artifactContext, lang);
    const audioInstruction = buildAudioInstruction(lang);

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

    const raw = response.text ?? "";
    let transcription = "";
    let answer = raw;

    const parsed = parseJSONResponse(raw);
    if (parsed) {
      transcription = parsed.transcription || "";
      answer = parsed.answer || raw;
    } else {
      // Fallback: regex extraction
      const tMatch = raw.match(/"transcription"\s*:\s*"([^"]*)"/);
      const aMatch = raw.match(/"answer"\s*:\s*"([^"]*)"/);
      if (tMatch) transcription = tMatch[1];
      if (aMatch) answer = aMatch[1];
    }

    res.json({ transcription, answer });
  } catch (error) {
    console.error("[ask-buddy-audio]", error);
    res.status(500).json({
      transcription: "",
      answer: "Xin lỗi, mình không nghe rõ. Bạn thử lại nhé!",
      error: "Audio LLM request failed",
    });
  }
});

// ─── GET /api/health ────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: GEMINI_API_KEY.length > 0,
    keyPrefix: GEMINI_API_KEY.substring(0, 6),
  });
});

// ─── Global error handler ───────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Server] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled rejection:", reason);
});

// ─── Start ──────────────────────────────────

function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

app.listen(PORT, "0.0.0.0", () => {
  const ips = getLocalIPs();
  console.log(`\n  Heritage Buddy backend running\n`);
  console.log(`  Local:   http://localhost:${PORT}`);
  ips.forEach((ip) => {
    console.log(`  Network: http://${ip}:${PORT}`);
  });
  console.log(`\n  GEMINI_API_KEY: loaded (${GEMINI_API_KEY.substring(0, 6)}...)`);
  console.log(`  Set EXPO_PUBLIC_BACKEND_URL=http://<IP>:${PORT} in .env\n`);
});
