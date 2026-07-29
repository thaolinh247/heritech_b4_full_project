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

const SYSTEM_PROMPT = `Bạn là Buddy, chú hổ nhỏ mascot thân thiện của Bảo tàng Lịch sử Quốc gia Việt Nam.
Bạn trả lời ngắn gọn (2-3 câu), thân thiện, bằng tiếng Việt.
Nếu câu hỏi không liên quan đến bảo tàng, hiện vật, hoặc lịch sử Việt Nam, hãy nói: "Mình chỉ biết về bảo tàng thôi nha! Bạn thử hỏi về hiện vật đang đứng trước mặt nhé."
Luôn giữ thái độ vui vẻ, dễ thương, phù hợp với du khách mọi lứa tuổi.`;

function buildAudioPrompt(artifactContext) {
  const contextParts = [];
  if (artifactContext?.name) contextParts.push(`Hiện vật: ${artifactContext.name}`);
  if (artifactContext?.description) contextParts.push(`Mô tả: ${artifactContext.description}`);
  if (artifactContext?.funFact) contextParts.push(`Fun fact: ${artifactContext.funFact}`);
  if (artifactContext?.section) contextParts.push(`Khu vực: ${artifactContext.section}`);

  const contextBlock = contextParts.length > 0
    ? `Thông tin hiện vật:\n${contextParts.join("\n")}\n\n`
    : "";

  return `${SYSTEM_PROMPT}\n\n${contextBlock}Khách vừa ghi âm câu hỏi bằng giọng nói. Hãy:\n1. Transcribe (chuyển thành văn bản) câu hỏi của khách. Nếu không nghe rõ hoặc không có câu hỏi, hãy ghi "không rõ".\n2. Trả lời câu hỏi đó. Nếu transcription là "không rõ", hãy nói: "Mình không nghe rõ bạn nói gì. Bạn thử nói lại nhé!"\n\nTrả về JSON chính xác với format:\n{"transcription": "văn bản câu hỏi của khách", "answer": "câu trả lời của bạn"}\n\nChỉ trả về JSON thuần, không thêm text nào khác.`;
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
  console.log(`[ask-buddy] Question: "${question}"`);

  if (!question) {
    return res.status(400).json({ answer: "Vui lòng nhập câu hỏi!" });
  }

  if (!GEMINI_API_KEY) {
    console.error("[ask-buddy] GEMINI_API_KEY not set!");
    return res.status(500).json({ answer: "Máy chủ chưa được cấu hình. Vui lòng thử lại!" });
  }

  const contextParts = [];
  if (artifactContext?.name) contextParts.push(`Hiện vật: ${artifactContext.name}`);
  if (artifactContext?.description) contextParts.push(`Mô tả: ${artifactContext.description}`);
  if (artifactContext?.funFact) contextParts.push(`Fun fact: ${artifactContext.funFact}`);
  if (artifactContext?.section) contextParts.push(`Khu vực: ${artifactContext.section}`);

  const fullPrompt = contextParts.length > 0
    ? `${SYSTEM_PROMPT}\n\nThông tin hiện vật:\n${contextParts.join("\n")}\n\nCâu hỏi của khách: ${question}`
    : `${SYSTEM_PROMPT}\n\nCâu hỏi của khách: ${question}`;

  try {
    const answer = await callGemini([{ text: fullPrompt }]);
    console.log(`[ask-buddy] Answer: "${answer.substring(0, 80)}..."`);
    res.json({ answer });
  } catch (error) {
    console.error("[ask-buddy] Gemini error:", error.message);
    res.status(500).json({ answer: "Xin lỗi, mình gặp sự cố. Bạn thử lại nhé!" });
  }
});

// Audio-based question
app.post("/api/ask-buddy-audio", async (req, res) => {
  const { audioBase64, mimeType, artifactContext } = req.body;
  console.log(`[ask-buddy-audio] Audio received, mimeType: ${mimeType}`);

  if (!audioBase64) {
    return res.status(400).json({ transcription: "", answer: "Không nhận được âm thanh. Bạn thử lại nhé!" });
  }

  // Validate audio size — base64 < 2KB ≈ < 1s recording, likely empty/noise
  if (audioBase64.length < 2000) {
    console.log(`[ask-buddy-audio] Audio too short (${audioBase64.length} bytes base64)`);
    return res.json({ transcription: "", answer: "Mình không nghe rõ bạn nói gì. Bạn thử nói lại nhé!" });
  }

  if (!GEMINI_API_KEY) {
    console.error("[ask-buddy-audio] GEMINI_API_KEY not set!");
    return res.status(500).json({ transcription: "", answer: "Máy chủ chưa được cấu hình. Vui lòng thử lại!" });
  }

  try {
    const parts = [
      {
        inlineData: {
          mimeType: mimeType || "audio/m4a",
          data: audioBase64,
        },
      },
      { text: buildAudioPrompt(artifactContext) },
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
    res.status(500).json({ transcription: "", answer: "Xin lỗi, mình không nghe rõ. Bạn thử lại nhé!" });
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
