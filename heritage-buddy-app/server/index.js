/* global __dirname */
const express = require("express");
const cors = require("cors");
const os = require("os");
const path = require("path");

// Load .env from server directory
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  // dotenv not installed - rely on system env vars
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-flash-latest";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!GEMINI_API_KEY,
    keyPrefix: GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 6) : "none",
  });
});

const PROMPTS = {
  vi: {
    system: `Bạn là Buddy, chú hổ nhỏ mascot thân thiện của Bảo tàng Lịch sử Quốc gia Việt Nam.
Bạn trả lời ngắn gọn (2-3 câu), thân thiện, bằng tiếng Việt.
Nếu câu hỏi không liên quan đến bảo tàng, hiện vật, hoặc lịch sử Việt Nam, hãy nói: "Mình chỉ biết về bảo tàng thôi nha! Bạn thử hỏi về hiện vật đang đứng trước mặt nhé."
Luôn giữ thái độ vui vẻ, dễ thương, phù hợp với du khách mọi lứa tuổi.`,
    contextLabels: {
      artifact: "Hiện vật",
      description: "Mô tả",
      funFact: "Fun fact",
      section: "Khu vực",
    },
    contextTitle: "Thông tin hiện vật",
    questionLabel: "Câu hỏi của khách",
    audioInstruction: `Khách vừa ghi âm câu hỏi bằng giọng nói. Hãy:
1. Transcribe (chuyển thành văn bản) câu hỏi của khách. Nếu không nghe rõ hoặc không có câu hỏi, hãy ghi "không rõ".
2. Trả lời câu hỏi đó. Nếu transcription là "không rõ", hãy nói: "Mình không nghe rõ bạn nói gì. Bạn thử nói lại nhé!"

Trả về JSON chính xác với format:
{"transcription": "văn bản câu hỏi của khách", "answer": "câu trả lời của bạn"}

Chỉ trả về JSON thuần, không thêm text nào khác.`,
  },
  en: {
    system: `You are Buddy, the friendly little tiger mascot of the Vietnam National Museum of History.
Answer briefly (2-3 sentences), in a friendly way, in English.
If the question is not about the museum, the artifacts, or Vietnamese history, say: "I only know about the museum! Try asking about the artifact in front of you."
Always keep a cheerful, cute attitude suitable for visitors of all ages.`,
    contextLabels: {
      artifact: "Artifact",
      description: "Description",
      funFact: "Fun fact",
      section: "Section",
    },
    contextTitle: "Artifact information",
    questionLabel: "Visitor's question",
    audioInstruction: `The visitor just recorded a spoken question. Please:
1. Transcribe the visitor's question into text. If you can't hear it clearly or there is no question, write "unclear".
2. Answer that question. If the transcription is "unclear", say: "I couldn't hear you clearly. Please try again!"

Return exactly the JSON format:
{"transcription": "the visitor's question text", "answer": "your answer"}

Only return plain JSON, nothing else.`,
  },
};

const ERROR_STRINGS = {
  vi: {
    noQuestion: "Vui lòng nhập câu hỏi!",
    notConfigured: "Máy chủ chưa được cấu hình. Vui lòng thử lại!",
    genericError: "Xin lỗi, mình gặp sự cố. Bạn thử lại nhé!",
    noAudio: "Không nhận được âm thanh. Bạn thử lại nhé!",
    audioTooShort: "Mình không nghe rõ bạn nói gì. Bạn thử nói lại nhé!",
    geminiError: "Xin lỗi, mình không nghe rõ. Bạn thử lại nhé!",
  },
  en: {
    noQuestion: "Please enter your question!",
    notConfigured: "The server is not configured yet. Please try again!",
    genericError: "Sorry, something went wrong. Please try again!",
    noAudio: "No audio received. Please try again!",
    audioTooShort: "I couldn't hear you clearly. Please try again!",
    geminiError: "Sorry, I couldn't hear you. Please try again!",
  },
};

// Mặc định VI khi client không gửi `language` (tương thích ngược).
function getLanguage(req) {
  return req.body?.language === "en" ? "en" : "vi";
}

function buildContextBlock(artifactContext, lang) {
  const p = PROMPTS[lang];
  const parts = [];
  if (artifactContext?.name) parts.push(`${p.contextLabels.artifact}: ${artifactContext.name}`);
  if (artifactContext?.description) parts.push(`${p.contextLabels.description}: ${artifactContext.description}`);
  if (artifactContext?.funFact) parts.push(`${p.contextLabels.funFact}: ${artifactContext.funFact}`);
  if (artifactContext?.section) parts.push(`${p.contextLabels.section}: ${artifactContext.section}`);
  if (parts.length === 0) return "";
  return `${p.contextTitle}:\n${parts.join("\n")}\n\n`;
}

function buildAudioPrompt(artifactContext, lang) {
  const p = PROMPTS[lang];
  return `${p.system}\n\n${buildContextBlock(artifactContext, lang)}${p.audioInstruction}`;
}

function stripMarkdownCodeBlock(text) {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

function parseJSONResponse(raw) {
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

async function callGemini(parts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("Gemini API error:", JSON.stringify(data));
    throw new Error(data.error?.message || "LLM request failed");
  }
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) throw new Error("Empty LLM response");
  return answer.trim();
}

// Text-based question
app.post("/api/ask-buddy", async (req, res) => {
  const { question, artifactContext } = req.body;
  const language = getLanguage(req);
  const s = ERROR_STRINGS[language];
  console.log(`[ask-buddy] Question: "${question}" (lang: ${language})`);

  if (!question) {
    return res.status(400).json({ answer: s.noQuestion });
  }

  if (!GEMINI_API_KEY) {
    console.error("[ask-buddy] GEMINI_API_KEY not set!");
    return res.status(500).json({ answer: s.notConfigured });
  }

  const contextBlock = buildContextBlock(artifactContext, language);
  const fullPrompt =
    `${PROMPTS[language].system}\n\n${contextBlock}${PROMPTS[language].questionLabel}: ${question}`;

  try {
    const answer = await callGemini([{ text: fullPrompt }]);
    console.log(`[ask-buddy] Answer: "${answer.substring(0, 80)}..."`);
    res.json({ answer });
  } catch (error) {
    console.error("[ask-buddy] Gemini error:", error.message);
    res.status(500).json({ answer: s.genericError });
  }
});

// Audio-based question
app.post("/api/ask-buddy-audio", async (req, res) => {
  const { audioBase64, mimeType, artifactContext } = req.body;
  const language = getLanguage(req);
  const s = ERROR_STRINGS[language];
  console.log(`[ask-buddy-audio] Audio received, mimeType: ${mimeType} (lang: ${language})`);

  if (!audioBase64) {
    return res.status(400).json({ transcription: "", answer: s.noAudio });
  }

  // Validate audio size — base64 < 2KB ≈ < 1s recording, likely empty/noise
  if (audioBase64.length < 2000) {
    console.log(`[ask-buddy-audio] Audio too short (${audioBase64.length} bytes base64)`);
    return res.json({ transcription: "", answer: s.audioTooShort });
  }

  if (!GEMINI_API_KEY) {
    console.error("[ask-buddy-audio] GEMINI_API_KEY not set!");
    return res.status(500).json({ transcription: "", answer: s.notConfigured });
  }

  try {
    const parts = [
      {
        inlineData: {
          mimeType: mimeType || "audio/m4a",
          data: audioBase64,
        },
      },
      { text: buildAudioPrompt(artifactContext, language) },
    ];

    const raw = await callGemini(parts);
    console.log(`[ask-buddy-audio] Raw response: "${raw.substring(0, 120)}..."`);

    let transcription = "";
    let answer = raw;

    const parsed = parseJSONResponse(raw);
    if (parsed) {
      transcription = parsed.transcription || "";
      answer = parsed.answer || raw;
      console.log(`[ask-buddy-audio] Parsed OK — transcription: "${transcription.substring(0, 60)}", answer: "${answer.substring(0, 60)}"`);
    } else {
      console.log(`[ask-buddy-audio] JSON parse failed, raw: "${raw.substring(0, 200)}"`);
      // Fallback: try to extract fields with regex
      const tMatch = raw.match(/"transcription"\s*:\s*"([^"]*)"/);
      const aMatch = raw.match(/"answer"\s*:\s*"([^"]*)"/);
      if (tMatch) transcription = tMatch[1];
      if (aMatch) answer = aMatch[1];
      console.log(`[ask-buddy-audio] Fallback — transcription: "${transcription.substring(0, 60)}", answer: "${answer.substring(0, 60)}"`);
    }

    res.json({ transcription, answer });
  } catch (error) {
    console.error("[ask-buddy-audio] Gemini error:", error.message);
    res.status(500).json({ transcription: "", answer: s.geminiError });
  }
});

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  const ips = getLocalIPs();
  console.log(`\n  Heritage Buddy backend running\n`);
  console.log(`  Local:   http://localhost:${PORT}`);
  ips.forEach((ip) => {
    console.log(`  Network: http://${ip}:${PORT}`);
  });
  console.log(`\n  GEMINI_API_KEY: ${GEMINI_API_KEY ? "loaded" : "MISSING!"}`);
  console.log(`  Set EXPO_PUBLIC_BACKEND_URL=http://<IP>:${PORT} in .env\n`);
});
