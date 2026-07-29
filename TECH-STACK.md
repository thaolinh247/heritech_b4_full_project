# Heritage Buddy — Tổng hợp Thuật ngữ, Kỹ thuật & Công nghệ

> Dự án **Heritage Buddy (Heritech)** — Robot hướng dẫn bảo tàng + Ứng dụng đồng hành cho người khuyết tật.  
> WRO 2026 Future Innovators — "Robots Meet Culture"

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Ngôn ngữ lập trình](#2-ngôn-ngữ-lập-trình)
3. [Mobile App — React Native / Expo](#3-mobile-app--react-native--expo)
4. [Backend Server — Node.js / Express](#4-backend-server--nodejs--express)
5. [Robot — Arduino / PlatformIO](#5-robot--arduino--platformio)
6. [Cơ sở dữ liệu](#6-cơ-sở-dữ-liệu)
7. [Công cụ phát triển](#7-công-cụ-phát-triển)
8. [Kiến trúc & Mẫu thiết kế](#8-kiến-trúc--mẫu-thiết-kế)
9. [Từ điển thuật ngữ chuyên ngành](#9-từ-điển-thuật-ngữ-chuyên-ngành)

---

## 1. Tổng quan hệ thống

```
┌─────────────────────────┐         BLE (Nordic UART)           ┌──────────────────────────────┐
│   Robot (Arduino R4)    │◄─────────────────────────────────►│   Mobile App (Expo RN)       │
│   State Machine:        │      ┌──────────────────────────┐ │   Screens (expo-router):     │
│   IDLE → FOLLOW_LINE    │      │  useRobotConnection     │ │   index, selection,          │
│   → AT_NODE → END       │      │  (React Hook)           │ │   museum-map, node/[id],     │
│   Sensors:              │      │  scanAndConnect()        │ │   chat/[nodeId], celebration │
│   Line tracer, Color,   │      │  sendCommand()           │ │   Zustand Stores:            │
│   Gesture, PIR, Switch  │      │  onMessage()             │ │   robot, voice-assistant,    │
│   Actuators:            │      └──────────┬───────────────┘ │   map-progress, accessibility│
│   DC Motors, Buzzer,    │                 │                  └──────────┬───────────────────┘
│   OLED, LED             │                 ▼                             │ HTTP
└─────────────────────────┘      ┌──────────────────────┐                │
                                 │  useRobotConnection   │                ▼
                                 │  (React Hook)         │     ┌──────────────────────────┐
                                 │  - Auto-connect       │     │  Backend (Express)        │
                                 │  - Parse BLE msgs     │     │  Gemini 2.5 Flash API     │
                                 │  - Update Zustand     │     │  POST /api/ask-buddy      │
                                 └──────────────────────┘     │  POST /api/ask-buddy-audio │
                                                               └──────────────────────────┘
```

---

## 2. Ngôn ngữ lập trình

| Ngôn ngữ | Nơi sử dụng | Ghi chú |
|----------|-------------|---------|
| **TypeScript** | Ứng dụng mobile (`src/`) | Strict mode, path aliases `@/*` |
| **JavaScript (Node.js)** | Backend server (`server/`), cấu hình build | CommonJS |
| **C++** | Firmware robot (`heritech_robot/src/`) | Arduino framework |
| **CSS** | Styling | Tailwind CSS v4 qua NativeWind |
| **JSON** | Cấu hình (`package.json`, `app.json`, `tsconfig.json`) | — |
| **Markdown** | Tài liệu, kế hoạch | — |

---

## 3. Mobile App — React Native / Expo

### Core Framework

| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **Expo** | SDK 57 | Managed workflow, build & deploy |
| **React Native** | 0.86.0 | UI framework chính |
| **expo-router** | ~57.0.7 | File-based routing (`src/app/`) |
| **TypeScript** | ~6.0 | Strict mode type checking |

### UI & Styling

| Công nghệ | Mục đích |
|-----------|----------|
| **NativeWind v5** | Tailwind CSS cho React Native |
| **Tailwind CSS v4** | Design system utility classes |
| **clsx + tailwind-merge** | Merge class names không xung đột |
| **react-native-reanimated** | Animation hiệu năng cao (UI thread) |
| **react-native-gesture-handler** | Gesture handling |
| **react-native-safe-area-context** | Safe area insets |
| **react-native-screens** | Native screen optimization |
| **expo-image** | Tối ưu hóa hình ảnh |
| **expo-video** | Phát video |
| **expo-symbols** | SF Symbols integration |
| **expo-glass-effect** | Hiệu ứng kính mờ (glassmorphism) |
| **expo-ui** | UI component library của Expo |
| **react-native-svg** | Vẽ vector SVG |

### State Management

| Công nghệ | Mục đích |
|-----------|----------|
| **Zustand** | State management nhẹ, không boilerplate |
| **@react-native-async-storage/async-storage** | Persist settings local |

### Audio & Voice

| Công nghệ | Mục đích |
|-----------|----------|
| **expo-audio** | Phát audio (narration, âm thanh) |
| **expo-speech** | Text-to-Speech (TTS) — đọc văn bản thành giọng nói |
| **expo-speech-recognition** | Speech-to-Text (STT) — nhận dạng giọng nói |
| **expo-speech** | TTS tích hợp sẵn của Expo |

### Kết nối Robot

| Công nghệ | Mục đích |
|-----------|----------|
| **react-native-ble-plx** | Bluetooth Low Energy (BLE) giao tiếp với robot |

### Caching & Files

| Công nghệ | Mục đích |
|-----------|----------|
| **expo-file-system** | Đọc/ghi file |
| **expo-font** | Load font tùy chỉnh (Helvetica, OpenDyslexic) |

### Tính năng đặc biệt

| Tính năng | Kỹ thuật |
|-----------|----------|
| **Expo New Architecture** | Fabric (native UI) + TurboModules |
| **React Compiler** | Experimental flag ON — tự động memo hóa |
| **Typed Routes** | Type-safe navigation với `expo-router/typed-routes` |
| **Worklets** | `react-native-worklets` — chạy code JS trên UI thread |

---

## 4. Backend Server — Node.js / Express

| Công nghệ | Mục đích |
|-----------|----------|
| **Node.js** | Runtime |
| **Express** | Web framework |
| **cors** | Cross-Origin Resource Sharing |
| **dotenv** | Quản lý biến môi trường |
| **Google Gemini 2.5 Flash** | LLM model xử lý câu hỏi về hiện vật |

### API Endpoints

| Endpoint | Phương thức | Mô tả |
|----------|------------|-------|
| `/api/ask-buddy` | POST | Gửi câu hỏi text → Gemini → trả lời text |
| `/api/ask-buddy-audio` | POST | Gửi audio base64 → Gemini (transcribe + answer) → trả lời |
| `/api/health` | GET | Kiểm tra server health |

---

## 5. Robot — Arduino / PlatformIO

### Hardware Platform

| Thành phần | Chi tiết |
|------------|----------|
| **Board** | Arduino Uno R4 WiFi (Renesas RA4M1) |
| **Framework** | Arduino |
| **IDE/Build** | PlatformIO (`renesas-ra` platform) |

### Library

| Thư viện | Mục đích |
|----------|----------|
| **ArduinoBLE** | Giao tiếp BLE |
| **MatrixMiniR4** | Hardware abstraction: motor, sensor, I2C, OLED, buzzer, LED |

### Cảm biến (Sensors)

| Cảm biến | Giao tiếp | Mục đích |
|----------|-----------|----------|
| **Line Tracer** | I2C (10 kênh, qua multiplexer `0x70`) | Dò line đen trên sàn |
| **Color Sensor V3** | I2C | Phát hiện vạch đỏ (color ID 9) — đánh dấu node |
| **Gesture Sensor** | I2C | Nhận diện cử chỉ tay (swipe: phải/trái/lên/xuống) |
| **PIR Sensor** | Digital (GPIO) | Phát hiện người — cooldown 3 giây |
| **Miniature Switch** | Digital (GPIO) | Nút bấm vật lý — kích hoạt voice chat trên app |

### Actuators

| Thiết bị | Điều khiển | Mục đích |
|----------|-----------|----------|
| **DC Motors** | PWM | Di chuyển robot, PID line following |
| **Buzzer** | Digital | Âm thanh báo hiệu |
| **OLED** | I2C | Hiển thị thông tin trên robot |
| **LED** | Digital | Đèn báo trạng thái |

### BLE Communication

| Thành phần | UUID |
|------------|------|
| **Nordic UART Service (NUS)** | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` |
| **TX Characteristic** (Robot → App, Notify) | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` |
| **RX Characteristic** (App → Robot, Write) | `6E400002-B5A3-F393-E0A9-E50E24DCCA9E` |

### BLE Message Protocol

| Message | Hướng | Mô tả |
|---------|-------|-------|
| `START` | App → Robot | Bắt đầu di chuyển |
| `STOP` | App → Robot | Dừng lại |
| `NODE_DONE:<id>` | App → Robot | Xác nhận hoàn thành node |
| `RESET` | App → Robot | Reset về IDLE |
| `NODE_START:<id>` | Robot → App | Đã đến node thứ N |
| `ALARM` | Robot → App | Báo động |
| `SWITCH_PRESS` | Robot → App | Nút vật lý được nhấn |
| `GESTURE:<direction>` | Robot → App | Cử chỉ tay (phải/trái...) |

### Robot State Machine

```
IDLE ──► FOLLOW_LINE ──► AT_NODE ──► END
         (PID control)    (chờ 3 tín hiệu)

3 tín hiệu hoàn thành node:
1. App button (NODE_DONE)
2. Voice command (VOICE_NEXT)
3. Gesture swipe right (GESTURE:SWIPE_RIGHT)
```

---

## 6. Cơ sở dữ liệu

**Không sử dụng database.** Toàn bộ nội dung bảo tàng (13 node hiện vật) hardcode trong `src/data/museum-map.ts`.  
State persistence chỉ dùng **AsyncStorage** cho cài đặt accessibility.  
Ứng dụng không có tài khoản người dùng — sử dụng ẩn danh.

---

## 7. Công cụ phát triển

### Build & Dev

| Công cụ | Mục đích |
|---------|----------|
| **PlatformIO** | Build firmware Arduino (`pio run`, `pio run --target upload`) |
| **Expo CLI** | Dev/build mobile app (`npx expo start`) |
| **Metro Bundler** | JavaScript bundler cho React Native |
| **PostCSS** | Xử lý CSS với `@tailwindcss/postcss` |
| **ESLint** | Linting (`eslint-config-expo` flat config) |
| **Jest** | Unit testing (`@testing-library/react-native`) |
| **TypeScript Compiler** | Type checking (`npx tsc --noEmit`) |
| **Expo Doctor** | Diagnostic (`npx expo-doctor`) |

### Version Control

| Công cụ | Quy ước |
|---------|---------|
| **Git** | Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `style:` |

---

## 8. Kiến trúc & Mẫu thiết kế

### Kiến trúc tổng thể

| Pattern | Mô tả |
|---------|-------|
| **Client-Server** | Mobile App (client) ↔ Backend (server) qua HTTP |
| **BLE Client-Server** | Mobile App (central/GATT client) ↔ Robot (peripheral/GATT server) |
| **Singleton** | Kết nối BLE dùng singleton pattern (`bleManager`) |

### App Architecture

| Pattern | Chi tiết |
|---------|----------|
| **File-based Routing** | expo-router mapping `src/app/` → screens |
| **Feature-based Structure** | Components, hooks, stores, types chia theo tính năng |
| **State Management** | Zustand stores (robot, voice-assistant, map-progress, accessibility) |
| **Custom Hooks** | Single responsibility: `useRobotConnection`, `useVoiceAssistant`, `useGestureNavigation`, `useMapProgress` |
| **Service Layer** | `src/lib/` — bluetooth, speech, tts, llm, contextBuilder |

### Design Pattern

| Pattern | Nơi áp dụng |
|---------|-------------|
| **State Machine** | Robot firmware (IDLE → FOLLOW_LINE → AT_NODE → END) |
| **Observer** | BLE notifications — robot gửi event, app lắng nghe |
| **Hook Pattern** | React hooks đóng gói logic nghiệp vụ |
| **Proxy Pattern** | Backend đóng vai trò proxy giữa app và Gemini API |
| **Debounce** | Color sensor debounce (3 readings ổn định) |
| **Cooldown** | PIR sensor cooldown 3 giây chống spam |

---

## 9. Từ điển thuật ngữ chuyên ngành

### Công nghệ & Kỹ thuật

| Thuật ngữ | Giải thích |
|-----------|------------|
| **PID Line Following** | Bộ điều khiển Proportional-Integral-Derivative — giữ robot bám line đen. Thông số: Kp=0.8, Ki=0.02, Kd=0.5 |
| **BLE (Bluetooth Low Energy)** | Chuẩn giao tiếp không dây năng lượng thấp giữa robot và app |
| **Nordic UART Service (NUS)** | Profile BLE phổ biến cho giao tiếp kiểu UART hai chiều |
| **GATT** | Generic Attribute Profile — giao thức BLE cho phép đọc/ghi/notify characteristics |
| **I2C** | Inter-Integrated Circuit — bus giao tiếp nối tiếp cho cảm biến (line tracer, color, gesture, OLED) |
| **PWM** | Pulse Width Modulation — điều khiển tốc độ động cơ DC |
| **Expo New Architecture** | Fabric (native UI renderer) + TurboModules (native modules mới) |
| **React Compiler** | Công cụ tự động memo hóa components (experimental) |
| **Fabric** | Native UI rendering architecture của React Native mới |
| **TurboModules** | Hệ thống native modules mới của React Native |
| **Worklet** | Code JavaScript chạy trên UI thread (không qua bridge) |
| **Typed Routes** | Type-safe navigation — kiểm tra kiểu params tại compile time |
| **NativeWind** | Tailwind CSS cho React Native — biến utility classes thành StyleSheet |
| **Glassmorphism** | Hiệu ứng kính mờ (blur + transparency) với `expo-glass-effect` |
| **Wake Word Detection** | Phát hiện từ khóa "Hey Buddy" để kích hoạt voice assistant |
| **STT/TTS Conflict Prevention** | Kỹ thuật tránh xung đột: `stopSpeaking()` trước `startListening()`, `iosVoiceProcessingEnabled` |
| **Exponential Backoff** | Chiến lược retry kết nối BLE với thời gian tăng dần khi thất bại |
| **AbortController** | Web API hủy request — dùng cho 20-second LLM timeout |
| **Input Lock** | `inputLockRef` — ngăn người dùng gửi câu hỏi mới khi đang xử lý |
| **Context Builder** | Xây dựng context payload từ dữ liệu `MapNode` gửi lên LLM |
| **Gemini Audio Input** | Gửi base64 audio trực tiếp đến Gemini API (transcribe + answer 1 bước) |
| **JSON Response Parsing** | Parse response JSON từ Gemini — strip markdown code block, fallback regex |
| **Adaptive Font Scaling** | Hỗ trợ phóng to chữ 200% không vỡ layout |
| **Touch Target Minimum** | Kích thước tối thiểu 48x48dp cho tất cả nút bấm |
| **Multi-Channel Feedback** | Mỗi trạng thái được truyền đạt qua ít nhất 2 kênh (mascot + text, icon + màu sắc) |

### Robot Hardware

| Thuật ngữ | Giải thích |
|-----------|------------|
| **Line Tracer (10 kênh)** | Cảm biến dò line 10 kênh qua I2C multiplexer |
| **Color Sensor V3** | Cảm biến màu — phát hiện vạch đỏ (color ID 9) đánh dấu node |
| **Gesture Sensor** | Cảm biến cử chỉ — swipe phải/trái/lên/xuống (hex: 0x01 phải, 0x02 trái...) |
| **PIR (Passive Infrared)** | Cảm biến hồng ngoại thụ động — phát hiện người |
| **Multiplexer 0x70** | I2C multiplexer cho phép nhiều cảm biến dùng chung bus I2C1 |
| **Miniature Switch** | Nút bấm nhỏ — input vật lý cho người dùng |

### Accessibility (Khả năng tiếp cận)

| Thuật ngữ | Giải thích |
|-----------|------------|
| **Chế độ `khiemthi`** | Dành cho người khiếm thị — focus vào TTS + voice assistant |
| **Chế độ `diec`** | Dành cho người khiếm thính — focus vào text + hình ảnh + mascot |
| **Chế độ `cam`** | Dành cho người câm — focus vào gesture + nút bấm |
| **OpenDyslexic Font** | Font chữ thân thiện với người khó đọc (dyslexia) |
| **Helvetica Font** | Font chữ chính của dự án (Regular, Bold, Italic, BoldItalic) |

### Domain-Specific

| Thuật ngữ | Giải thích |
|-----------|------------|
| **Node** | Một điểm dừng của robot trước một hiện vật trong bảo tàng (tổng cộng 13 node) |
| **Mascot (Buddy)** | Linh vật hổ con chibi với 6 trạng thái cảm xúc (default, happy, listening, thinking, confused, idle) |
| **Narration** | Giọng đọc tự động mô tả hiện vật khi robot đến node |
| **Voice Chat** | Tính năng hỏi đáp bằng giọng nói với Gemini LLM về hiện vật |
