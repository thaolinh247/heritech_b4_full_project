# PLAN: AI LLM Real-Time Voice Chat — Heritage Buddy

> **Trạng thái:** Draft — chờ review
> **Ngày tạo:** 2026-07-24
> **Phiên bản:** 1.0

---

## Tổng quan

Triển khai chức năng **"Hey Buddy"** — trợ lý giọng nói AI cho bảo tàng. Khi visitor ở màn hình hiện vật (node), nhấn nút mic sẽ mở màn hình chat. Visitor nói câu hỏi, hệ thống STT → LLM → TTS, hiển thị cả text và phát giọng nói trả lời.

## Nền tảng kỹ thuật

| Layer | Chi tiết |
|---|---|
| Framework | React Native Expo SDK 57 |
| Platform chính | Android native build (development build) |
| Robot | MATRIX Mini R4 — WiFi/WebSocket |
| LLM | Gemini 2.5 Flash free-tier (qua backend proxy) |
| STT | `expo-speech-recognition` (cần development build) |
| TTS | `expo-speech` |
| State | Zustand |
| Styling | NativeWind v5 + Tailwind CSS v4 |

## Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────┐
│                   React Native App                        │
│                                                           │
│  [node/[id].tsx]  ──(nhấn mic)──→  [chat/[nodeId].tsx]  │
│                                          │                │
│                           expo-speech-recognition         │
│                           (STT vi-VN, continuous)         │
│                                          │                │
│                           contextBuilder → lib/llm.ts     │
│                                          │                │
│                           Backend proxy → Gemini 2.5 Flash│
│                                          │                │
│                           expo-speech (TTS tiếng Việt)    │
│                                          │                │
│                           ChatBubble (text) + voice       │
│                                                           │
│  [WebSocket] ←→ MATRIX Mini R4 (telemetry + gesture)     │
└──────────────────────────────────────────────────────────┘
```

---

## Flow điều hướng

```
index.tsx (welcome)
  → selection.tsx (chọn chế độ)
    → museum-map.tsx (bản đồ)
      → node/[id].tsx (xem video hiện vật)
        → chat/[nodeId].tsx (voice chat với Buddy)  ← MỚI
          → quay lại node/[id].tsx
```

## Flow voice chat

```
1. User ở node/[id].tsx, nhấn nút mic 🎙️
2. Navigate → chat/[nodeId].tsx
3. Screen mount → auto-start listening (STT continuous)
4. User nói câu hỏi → STT transcript hiện trên bubble (user, phải)
5. setState("thinking") → TypingIndicator hiện
6. Gọi backend proxy → Gemini Flash trả lời
7. Bubble buddy hiện (trái) + TTS bắt đầu đọc
8. TTS onDone → setState("idle") → sẵn sàng câu tiếp
9. Nhấn ← → quay lại node screen, dừng TTS + STT
```

---

## Danh sách packages mới

| # | Package | Purpose | Cài đặt |
|---|---|---|---|
| 1 | `expo-speech-recognition` | STT tiếng Việt + wake word | `npx expo install expo-speech-recognition` |
| 2 | `expo-speech` | TTS đọc câu trả lời | `npx expo install expo-speech` |
| 3 | `expo-audio` | (Tùy chọn) narration audio playback | `npx expo install expo-audio` |

> **Lưu ý:** `expo-speech-recognition` cần development build (không Expo Go). `expo-speech` hoạt động trên Expo Go.

---

## Cấu trúc file mới

```
src/
├── types/
│   ├── voice-assistant.ts          # ChatMessage, VoiceAssistantState
│   └── robot.ts                    # RobotTelemetry, GestureCommand, RobotMessage
│
├── store/
│   ├── voice-assistant.ts          # Zustand: chat history + state machine
│   └── robot.ts                    # Zustand: robot connection + telemetry
│
├── lib/
│   ├── speech.ts                   # Wrapper expo-speech-recognition (STT)
│   ├── tts.ts                      # Wrapper expo-speech (TTS playback)
│   ├── llm.ts                      # Gọi backend proxy → Gemini Flash
│   ├── contextBuilder.ts           # Xây context payload từ MapNode
│   └── robotConnection.ts          # WebSocket client singleton
│
├── hooks/
│   ├── use-voice-assistant.ts      # Hook: state machine + chat logic
│   └── use-robot.ts                # Hook: WebSocket robot connection
│
├── components/
│   └── chat/
│       ├── ChatBubble.tsx           # Bubble tin nhắn (user / buddy)
│       ├── MicButton.tsx            # Nút mic lớn (animation)
│       ├── TypingIndicator.tsx      # "Buddy đang suy nghĩ..."
│       └── ChatHeader.tsx           # Header: tên hiện vật + nút ←
│
├── app/
│   ├── node/[id].tsx               # SỬA: thêm nút mic → navigate
│   └── chat/[nodeId].tsx           # MỚI: screen chat voice assistant
│
└── .env                            # SỬA: thêm EXPO_PUBLIC_GEMINI_KEY (optional)
```

**Tổng:** 12 files mới + 1 file sửa + 1 file sửa env

---

## Chi tiết từng Stage

---

### STAGE 1: Setup Packages + Types + Stores

**Mục tiêu:** Cài packages, định nghĩa types, tạo Zustand stores.

**Thời gian:** 1 session

#### 1.1 Cài packages

```bash
npx expo install expo-speech-recognition expo-speech expo-audio
```

Sau khi cài, thêm config plugin vào `app.json`:

```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-splash-screen",
      "expo-video",
      "expo-speech-recognition",
      ["expo-audio", { "microphonePermission": "Cho phép Heritage Buddy truy cập micro." }]
    ]
  }
}
```

Chạy `npx expo prebuild` để sinh native code.

#### 1.2 Tạo `src/types/voice-assistant.ts`

```typescript
export type VoiceAssistantState =
  | "idle"          // Chờ user nhập
  | "listening"     // Đang nghe user nói
  | "thinking"      // Đang gọi LLM
  | "speaking"      // Đang TTS đọc câu trả lời
  | "error";        // Lỗi

export interface ChatMessage {
  id: string;
  role: "user" | "buddy";
  text: string;
  timestamp: number;
  isSpeaking?: boolean;
}
```

#### 1.3 Tạo `src/types/robot.ts`

```typescript
export type GestureCommand = "continue" | "stop" | "wave" | null;

export interface RobotTelemetry {
  currentStop: number;
  distanceToVisitor: number;
  obstacleDetected: boolean;
  gesture: GestureCommand;
  batteryLevel: number;
}

export interface RobotMessage {
  type: "telemetry" | "gesture" | "command" | "heartbeat" | "pong";
  payload: Partial<RobotTelemetry>;
}

export interface RobotCommand {
  type: "command";
  action: "continue" | "stop" | "next_node" | "set_speed";
  value?: number;
}
```

#### 1.4 Tạo `src/store/voice-assistant.ts`

```typescript
import { create } from "zustand";
import type { ChatMessage, VoiceAssistantState } from "@/types/voice-assistant";

interface VoiceAssistantStore {
  state: VoiceAssistantState;
  messages: ChatMessage[];
  currentNodeId: string | null;

  addMessage: (msg: ChatMessage) => void;
  setState: (state: VoiceAssistantState) => void;
  setCurrentNode: (nodeId: string) => void;
  clearChat: () => void;
}

export const useVoiceAssistantStore = create<VoiceAssistantStore>((set) => ({
  state: "idle",
  messages: [],
  currentNodeId: null,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setState: (state) => set({ state }),
  setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),
  clearChat: () => set({ messages: [], state: "idle", currentNodeId: null }),
}));
```

#### 1.5 Tạo `src/store/robot.ts`

```typescript
import { create } from "zustand";
import type { GestureCommand, RobotTelemetry } from "@/types/robot";

interface RobotStore {
  isConnected: boolean;
  telemetry: RobotTelemetry | null;
  lastGesture: GestureCommand;

  setConnected: (connected: boolean) => void;
  updateTelemetry: (data: Partial<RobotTelemetry>) => void;
  setGesture: (gesture: GestureCommand) => void;
}

export const useRobotStore = create<RobotStore>((set) => ({
  isConnected: false,
  telemetry: null,
  lastGesture: null,

  setConnected: (isConnected) => set({ isConnected }),
  updateTelemetry: (data) =>
    set((s) => ({
      telemetry: s.telemetry ? { ...s.telemetry, ...data } : null,
    })),
  setGesture: (gesture) => set({ lastGesture: gesture }),
}));
```

#### Deliverable Stage 1
- [ ] 3 packages installed + config plugin trong app.json
- [ ] `types/voice-assistant.ts` — `VoiceAssistantState`, `ChatMessage`
- [ ] `types/robot.ts` — `RobotTelemetry`, `GestureCommand`, `RobotMessage`, `RobotCommand`
- [ ] `store/voice-assistant.ts` — Zustand store với actions
- [ ] `store/robot.ts` — Zustand store với actions
- [ ] `npx expo prebuild` thành công
- [ ] `npx tsc --noEmit` không lỗi

---

### STAGE 2: STT + TTS Libraries

**Mục tiêu:** Viết wrapper cho speech recognition và text-to-speech, test standalone.

**Thời gian:** 1-2 sessions

#### 2.1 Tạo `src/lib/speech.ts`

```typescript
import {
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";

const VIETNAMESE_CONFIG = {
  lang: "vi-VN",
  continuous: true,
  interimResults: true,
  contextualStrings: ["Hey Buddy", "Buddy", "buddy"],
  iosVoiceProcessingEnabled: true,
  addsPunctuation: true,
};

export async function requestMicPermission(): Promise<boolean> {
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
}

export function startListening() {
  ExpoSpeechRecognitionModule.start(VIETNAMESE_CONFIG);
}

export function stopListening() {
  ExpoSpeechRecognitionModule.stop();
}

export function detectWakeWord(transcript: string): boolean {
  const normalized = transcript.toLowerCase().trim();
  return /hey\s*buddy|buddy|hey\s*buddi/.test(normalized);
}
```

#### 2.2 Tạo `src/lib/tts.ts`

```typescript
import * as Speech from "expo-speech";

interface SpeakOptions {
  text: string;
  language?: string;
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: (error: string) => void;
  onBoundary?: (event: { charIndex: number; charLength: number }) => void;
}

export function speak({
  text,
  language = "vi-VN",
  rate = 0.85,
  pitch = 1.0,
  onDone,
  onError,
  onBoundary,
}: SpeakOptions) {
  Speech.speak(text, {
    language,
    rate,
    pitch,
    onDone,
    onError: (err) => onError?.(String(err)),
    onBoundary,
  });
}

export async function stopSpeaking() {
  await Speech.stop();
}

export async function isCurrentlySpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
```

#### 2.3 Test standalone

Tạo file test tạm (hoặc test trong component tạm) để xác nhận:
- [ ] Mic permission được request
- [ ] STT nhận diện tiếng Việt và hiện transcript
- [ ] TTS đọc text tiếng Việt
- [ ] `stopSpeaking()` dừng TTS
- [ ] `iosVoiceProcessingEnabled` không gây crash

#### Deliverable Stage 2
- [ ] `lib/speech.ts` — STT wrapper hoạt động
- [ ] `lib/tts.ts` — TTS wrapper hoạt động
- [ ] STT test nhận diện tiếng Việt thành công
- [ ] TTS test đọc tiếng Việt thành công
- [ ] Không có audio conflict giữa STT và TTS

---

### STAGE 3: LLM Backend + Context Builder

**Mục tiêu:** Viết backend proxy gọi Gemini Flash, viết client lib và context builder.

**Thời gian:** 1-2 sessions

#### 3.1 Backend Proxy (Node.js / Express)

Tạo server riêng (có thể là Vercel Serverless hoặc Express local):

```typescript
// File: server/index.ts (hoặc serverless function)
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/ask-buddy", async (req, res) => {
  const { question, artifactContext } = req.body;

  const systemInstruction = `Bạn là Buddy, chú hổ nhỏ mascot của bảo tàng Việt Nam.
Bạn trả lời ngắn gọn (2-3 câu), thân thiện, bằng tiếng Việt.
Nếu câu hỏi không liên quan đến bảo tàng, nói: "Mình chỉ biết về bảo tàng thôi nha!"
Hiện vật đang hiển thị: ${artifactContext.name}.
Thông tin: ${artifactContext.description}.
Fun fact: ${artifactContext.funFact}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: question,
      config: {
        systemInstruction,
        maxOutputTokens: 200,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    res.json({ answer: response.text });
  } catch (error) {
    res.status(500).json({ error: "LLM request failed" });
  }
});

app.listen(3000, () => console.log("Backend running on :3000"));
```

#### 3.2 Tạo `src/lib/contextBuilder.ts`

```typescript
import type { MapNode } from "@/types/museum-map";

interface ArtifactContext {
  name: string;
  description: string;
  funFact: string;
  section: string;
}

export function buildArtifactContext(node: MapNode | null): ArtifactContext {
  if (!node) {
    return {
      name: "Bảo tàng",
      description: "Bảo tàng lịch sử",
      funFact: "",
      section: "",
    };
  }

  return {
    name: node.title,
    description: "",
    funFact: "",
    section: node.sectionId,
  };
}
```

#### 3.3 Tạo `src/lib/llm.ts`

```typescript
import type { ArtifactContext } from "./contextBuilder";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LLMRequest {
  question: string;
  artifactContext: ArtifactContext;
}

interface LLMResponse {
  answer: string;
  error?: string;
}

export async function askBuddy(req: LLMRequest): Promise<LLMResponse> {
  const response = await fetch(`${BACKEND_URL}/api/ask-buddy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`);
  }

  return response.json();
}
```

#### 3.4 Cập nhật `.env`

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
EXPO_PUBLIC_ROBOT_WS_URL=ws://192.168.1.100:8080
```

#### Deliverable Stage 3
- [ ] Backend proxy chạy locally, trả về answer từ Gemini Flash
- [ ] `lib/contextBuilder.ts` — build context từ MapNode
- [ ] `lib/llm.ts` — gọi backend, nhận answer
- [ ] Test: gửi câu hỏi → nhận answer trong < 2s
- [ ] Xử lý lỗi: backend down → trả error message

---

### STAGE 4: Chat UI Components

**Mục tiêu:** Xây 4 UI components cho chat screen.

**Thời gian:** 1-2 sessions

#### 4.1 Tạo `src/components/chat/ChatBubble.tsx`

```typescript
interface ChatBubbleProps {
  message: ChatMessage;
}
```

- **User bubble:** màu jade (`#2E8B7E`), căn phải, bo tròn trái trên
- **Buddy bubble:** màu cream (`#FDF3E7`), căn trái, bo tròn phải trên, có mascot icon
- **Buddy speaking:** viền cam (`#E8935E`), icon 🔊
- Font: Helvetica-Bold, size ≥ 18px
- Max width: 80% screen
- Accessible: role="text" cho screen reader

#### 4.2 Tạo `src/components/chat/MicButton.tsx`

```typescript
interface MicButtonProps {
  state: VoiceAssistantState;
  onPress: () => void;
}
```

- **Idle:** nút tròn 64dp, icon mic 🎙️, nền cam (`#E8935E`)
- **Listening:** pulse animation (repeated scale 1.0→1.15), nền đỏ/coral
- **Thinking:** spinner, nền cam mờ
- **Speaking:** icon 🔊, nền jade
- **Error:** icon ⚠️, nền coral
- Accessible: accessibilityLabel thay đổi theo state

#### 4.3 Tạo `src/components/chat/TypingIndicator.tsx`

- Hiển thị 3 dot nhấp nháy (animation)
- Text: "Buddy đang suy nghĩ..."
- Mascot: `mascotThinking` nhỏ

#### 4.4 Tạo `src/components/chat/ChatHeader.tsx`

```typescript
interface ChatHeaderProps {
  title: string;
  onBack: () => void;
}
```

- Nút ← (back)
- Title: tên hiện vật (Helvetica-Bold, 18px)
- Nền cream, shadow nhẹ

#### Deliverable Stage 4
- [ ] `ChatBubble.tsx` — bubble user/buddy, đúng màu sắc, font size
- [ ] `MicButton.tsx` — nút mic 64dp, animation theo state
- [ ] `TypingIndicator.tsx` — 3 dots animation + text
- [ ] `ChatHeader.tsx` — header với back button + title
- [ ] Tất cả components dùng `@/tw` wrappers + NativeWind className
- [ ] Font size ≥ 18px cho accessibility
- [ ] Touch target ≥ 48x48dp

---

### STAGE 5: Chat Screen + Voice Assistant Hook

**Mục tiêu:** Tạo screen chat hoàn chỉnh và hook điều phối state machine.

**Thời gian:** 2 sessions

#### 5.1 Tạo `src/hooks/use-voice-assistant.ts`

```typescript
import { useEffect, useRef, useCallback } from "react";
import { useVoiceAssistantStore } from "@/store/voice-assistant";
import { startListening, stopListening } from "@/lib/speech";
import { speak, stopSpeaking } from "@/lib/tts";
import { askBuddy } from "@/lib/llm";
import { buildArtifactContext } from "@/lib/contextBuilder";
import type { MapNode } from "@/types/museum-map";
import type { ChatMessage } from "@/types/voice-assistant";

export function useVoiceAssistant(node: MapNode | null) {
  const {
    state, messages, addMessage, setState, setCurrentNode, clearChat
  } = useVoiceAssistantStore();
  const scrollRef = useRef<ScrollView | null>(null);
  const inputLockRef = useRef(false);

  useEffect(() => {
    if (node) setCurrentNode(node.id);
    return () => { stopListening(); stopSpeaking(); clearChat(); };
  }, [node]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const toggleListening = useCallback(async () => {
    if (state === "listening") {
      stopListening();
      setState("idle");
    } else {
      if (state === "speaking") await stopSpeaking();
      await startListening();
      setState("listening");
    }
  }, [state]);

  // STT result handler via useSpeechRecognitionEvent
  // LLM call → addMessage → TTS speak → onDone → idle

  return { state, messages, scrollRef, toggleListening };
}
```

#### 5.2 Tạo `src/app/chat/[nodeId].tsx`

Screen layout:
```
┌─────────────────────────────┐
│ ←  Trống đồng Đông Sơn     │  ← ChatHeader
├─────────────────────────────┤
│                             │
│  [Bubble user]              │  ← ScrollView
│  [Bubble buddy]             │
│  [TypingIndicator]          │
│                             │
├─────────────────────────────┤
│     [  🎙️  ]                │  ← MicButton
│   Nhấn để nói              │  ← state label
└─────────────────────────────┘
```

#### Deliverable Stage 5
- [ ] `use-voice-assistant.ts` — hook hoạt động hoàn chỉnh
- [ ] `chat/[nodeId].tsx` — screen chat hiển thị đúng
- [ ] State machine: idle → listening → thinking → speaking → idle
- [ ] Chat auto-scroll khi có message mới
- [ ] TTS onDone → auto restart listening
- [ ] Cleanup khi thoát screen: stop TTS + STT + clear chat
- [ ] Input lock: không xử lý 2 câu hỏi cùng lúc

---

### STAGE 6: Tích hợp vào Node Screen

**Mục tiêu:** Thêm nút mic vào `node/[id].tsx`, navigate sang chat.

**Thời gian:** 0.5 session

#### 6.1 Sửa `src/app/node/[id].tsx`

Thêm floating mic button ở góc dưới bên phải:

```tsx
<Pressable
  onPress={() => router.push(`/chat/${node.id}`)}
  className="absolute bottom-24 right-5 w-16 h-16 rounded-full items-center justify-center z-10"
  style={{
    backgroundColor: "#E8935E",
    shadowColor: "#E8935E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  }}
  accessibilityLabel="Mở trợ lý giọng nói Buddy"
  accessibilityRole="button"
>
  <Text style={{ fontSize: 24 }}>🎙️</Text>
</Pressable>
```

#### Deliverable Stage 6
- [ ] Nút mic hiện trên `node/[id].tsx`
- [ ] Nhấn mic → navigate(`/chat/${node.id}`)
- [ ] Nút mic có shadow + elevation
- [ ] Touch target ≥ 48x48dp (64dp ✓)
- [ ] accessibilityLabel đúng

---

### STAGE 7: Robot Connection (WiFi/WebSocket)

**Mục tiêu:** Kết nối WebSocket với MATRIX Mini R4, nhận telemetry + gesture.

**Thời gian:** 1-2 sessions

#### 7.1 Tạo `src/lib/robotConnection.ts`

WebSocket singleton với:
- Auto-reconnect (exponential backoff 1s → 30s max)
- Heartbeat mỗi 30s
- JSON message protocol (`type` + `payload`)
- AppState handling (disconnect khi backgrounded)

#### 7.2 Tạo `src/hooks/use-robot.ts`

Hook đọc telemetry + gesture từ WebSocket, cập nhật Zustand store.

#### 7.3 Tích hợp gesture (tùy chọn)

Gesture "wave" → trigger listening trong chat screen.

#### Deliverable Stage 7
- [ ] `lib/robotConnection.ts` — WebSocket singleton, auto-reconnect
- [ ] `hooks/use-robot.ts` — hook đọc telemetry + gesture
- [ ] Heartbeat mỗi 30s
- [ ] Exponential backoff khi mất kết nối
- [ ] Gesture "wave" → trigger listening (tùy chọn)
- [ ] Graceful disconnect khi app backgrounded

---

## Rủi ro & Giải pháp

| # | Rủi ro | Mức độ | Giải pháp |
|---|---|---|---|
| 1 | Audio conflict: STT + TTS cùng lúc | Cao | `iosVoiceProcessingEnabled: true`, `stopSpeaking()` trước khi `startListening()` |
| 2 | Android 12 không hỗ trợ continuous STT | Trung bình | Kiểm tra phiên bản Android, fallback tap-to-speak |
| 3 | Gemini free-tier rate limit 10 RPM | Thấp | Queue đơn giản + fallback message "Mình đang bận" |
| 4 | expo-speech-recognition cần development build | Cao | Phải chạy `npx expo prebuild` trước khi test |
| 5 | WiFi mất giữa chừng | Trung bình | STT/TTS on-device vẫn hoạt động, chỉ LLM cần mạng |
| 6 | Gesture + voice đồng thời | Thấp | `inputLockRef` flag — bất kỳ input nào trigger trước sẽ xử lý, bỏ input kia |
| 7 | MapNode chưa có description/funFact | Thấp | `contextBuilder.ts` trả context cơ bản từ title + section, cập nhật sau |

---

## Kiểm tra hoàn thành

Sau khi hoàn tất tất cả 7 stages:

```bash
npx tsc --noEmit          # TypeScript không lỗi
npx expo lint              # ESLint pass
npx expo prebuild          # Native build thành công
npx expo run:android       # Chạy trên device/simulator
```

**Manual test checklist:**
- [ ] Mở node screen → thấy nút mic 🎙️
- [ ] Nhấn mic → navigate sang chat screen
- [ ] Chat screen hiện header tên hiện vật + bubble trống
- [ ] Nút mic chuyển sang chế độ "listening" (pulse animation)
- [ ] Nói câu hỏi → transcript hiện trên bubble user
- [ ] TypingIndicator hiện khi đang gọi LLM
- [ ] Bubble buddy hiện + TTS đọc câu trả lời
- [ ] Sau khi TTS xong → tự động listening lại
- [ ] Nhấn ← → quay lại node screen, TTS + STT dừng
- [ ] Nếu backend down → hiện error message
- [ ] Touch target ≥ 48x48dp trên tất cả buttons
- [ ] Font size ≥ 18px trên tất cả text
