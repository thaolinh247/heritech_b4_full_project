# PLAN DỰ ÁN: HERITECH ROBOT + HERITAGE BUDDY APP

> **Ngày tạo:** 2026-07-27
> **Trạng thái:** Đang thực hiện — Stage 1-4 hoàn tất, Stage 5 đang test
>
> **Cập nhật 2026-07-30:** backend Gemini đã được cấu hình, context cho từng artifact đã được bổ sung, và môi trường local đã chuyển về localhost:3000.

---

## 1. MÔ TẢ CƠ BẢN VỀ YÊU CẦU SẢN PHẨM

### 1.1 Tổng quan

Dự án **Heritage Buddy** là robot thông minh dùng bộ kit **Matrix Mini R4** hỗ trợ người khuyết tật di chuyển theo bản đồ tương tác tại bảo tàng. Robot tự động di chuyển theo đường kẻ đen, dừng lại tại các trạm (node) được đánh dấu bằng màu đỏ, chờ tương tác với người dùng thông qua ứng dụng di động trên smartphone.

### 1.2 Mục tiêu

- Robot tự động di chuyển theo line đen, dừng tại trạm màu đỏ
- App trên điện thoại điều khiển robot qua **Bluetooth Low Energy (BLE)**
- Người dùng tương tác với robot qua 3 kênh: **App (button/voice)**, **Gesture Sensor**, **Miniature Switch**
- Hệ thống hỗ trợ 13 trạm (node) trên cùng 1 bản đồ bảo tàng

### 1.3 Đối tượng sử dụng

- Người khuyết tật thị giác (khiếm thị)
- Người khuyết tật thính giác (khiếm thính)
- Người khuyết tật ngôn ngữ (khiếm ngôn)

### 1.4 Nền tảng kỹ thuật

| Layer | Chi tiết |
|---|---|
| Robot | MATRIX Mini R4 — Arduino R4 WiFi |
| App | React Native Expo SDK 57 |
| Kết nối | **Bluetooth Low Energy (BLE)** |
| LLM | Gemini 2.5 Flash (qua backend proxy) |
| STT | expo-speech-recognition |
| TTS | expo-speech |
| State | Zustand |
| Styling | NativeWind v5 + Tailwind CSS v4 |

---

## 2. CẤU TRÚC DỰ ÁN

```
heritage_robot/                  ← Robot firmware (Arduino C++)
├── platformio.ini
├── src/
│   ├── main.cpp
│   ├── config.h
│   ├── ble_handler.h/.cpp
│   ├── motor_control.h/.cpp
│   ├── sensor_manager.h/.cpp
│   ├── state_machine.h/.cpp
│   └── node_manager.h/.cpp
└── lib/
    └── MatrixMiniR4/            ← Library có sẵn

heritage-buddy-app/              ← Mobile app (React Native Expo)
├── src/
│   ├── app/                     ← Screens (expo-router)
│   ├── components/              ← UI components
│   ├── hooks/                   ← Custom React hooks
│   ├── lib/                     ← Service helpers
│   ├── store/                   ← Zustand stores
│   ├── types/                   ← TypeScript types
│   └── data/                    ← Hardcoded content
├── server/                      ← Backend proxy (LLM)
└── assets/                      ← Images, fonts, sounds
```

---

## 3. CẤU HÌNH PHẦN CỨNG ROBOT

### 3.1 Bảng mapping linh kiện

| Linh kiện | Kết nối | Port | Ghi chú |
|---|---|---|---|
| Motor bánh 1 (M1) | PWM/DC | M1 | Điều khiển bánh trái |
| Motor bánh 2 (M2) | PWM/DC | M2 | Điều khiển bánh phải |
| Gesture Sensor | I2C | I2C4 (`MiniR4.I2C3.MXGesture`) | Nhận diện cử chỉ |
| Line Tracer | I2C | I2C1 (`MiniR4.I2C0.MXLineTracer`) | Theo dõi đường đen |
| PIR Sensor | Digital | D1 (`MiniR4.D1`) | Phát hiện chuyển động |
| Color Sensor | I2C | I2C3 (`MiniR4.I2C2.MXColorV3`) | Nhận diện màu sắc |
| Miniature Switch | Digital | D2 (`MiniR4.D2`) | Nút bấm vật lý |
| Buzzer | Built-in | Pin 6 | Âm thanh cảnh báo |

### 3.2 Mapping từ MatrixMiniR4.h

```cpp
// Motor
MiniR4.M1                  // DC Motor 1 (bánh trái)
MiniR4.M2                  // DC Motor 2 (bánh phải)
MiniR4.DriveDC             // Drive 2 motor đồng thời

// I2C Sensors (qua Wire1, multiplexer address 0x70)
MiniR4.I2C0.MXLineTracer   // Line Tracer (I2C1)
MiniR4.I2C2.MXColorV3      // Color Sensor V3 (I2C3)
MiniR4.I2C3.MXGesture      // Gesture Sensor (I2C4)

// Digital
MiniR4.D1                  // PIR Sensor (Digital 1)
MiniR4.D2                  // Miniature Switch (Digital 2)

// Built-in
MiniR4.Buzzer              // Buzzer (Pin 6)
MiniR4.LED                 // RGB LED
```

---

## 4. GIAO THỨC KẾT NỐI BLUETOOTH (BLE)

### 4.1 Tổng quan

Tất cả tín hiệu giữa Robot ↔ App đều truyền qua **Bluetooth Low Energy (BLE)** bằng thư viện `ArduinoBLE` (robot) và `expo-bluetooth` (app).

```
┌─────────────────┐     BLE      ┌─────────────────┐
│     ROBOT       │◄────────────►│       APP       │
│  (Arduino R4    │  UART Service│  (React Native  │
│   WiFi + BLE)   │              │   Expo)         │
└─────────────────┘              └─────────────────┘
```

### 4.2 BLE Service & Characteristics (Nordic UART Service)

MATRIX Mini R4 hỗ trợ **Nordic UART Service (NUS)** mặc định — tiêu chuẩn industry cho giao tiếp BLE UART-like.

```
Service UUID: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
├── TX Characteristic (Robot → App): "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"
│   └── Notify: robot gửi dữ liệu realtime
└── RX Characteristic (App → Robot): "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
    └── Write: app gửi lệnh điều khiển
```

### 4.3 Giao thức tin nhắn (text-based)

#### Robot → App

| Command | Mô tả | Khi nào gửi |
|---|---|---|
| `NODE_START:<id>` | Đã đến node, mở node | Color sensor đọc màu đỏ |
| `NODE_COMPLETE:<id>` | Robot xác nhận node xong | Robot tiếp tục di chuyển |
| `ALL_DONE` | Hết tất cả node | Node cuối hoàn thành |
| `ALARM` | PIR phát hiện người | PIR sensor active |
| `SWITCH_PRESS` | Switch vật lý bấm | User bấm switch |

#### App → Robot

| Command | Mô tả | Khi nào gửi |
|---|---|---|
| `START` | Xuất phát bắt đầu | User bấm "Xuất phát" trên app |
| `STOP` | Dừng robot | App gửi lệnh dừng |
| `NODE_DONE:<id>` | Hoàn thành node | User bấm "Hoàn thành node" |
| `NEXT_NODE` | Chuyển node tiếp theo | Robot tiếp tục di chuyển |
| `VOICE_NEXT` | Voice: tiếp theo | User nói "tiếp theo" |
| `VOICE_STOP` | Voice: dừng | User nói "dừng" |

---

## 5. CƠ CHẾ HOẠT ĐỘNG (STATE MACHINE)

### 5.1 Robot State Machine

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
  ┌─────────┐  START   ┌──────────────┐  RED_FOUND  ┌────┴─────┐
  │  IDLE   │────────►│ FOLLOW_LINE  │────────────►│ AT_NODE  │
  │(chờ BLE)│         │(di chuyển    │             │(đợi 3    │
  └─────────┘         │ theo line)   │             │ tín hiệu) │
                    ▲  └──────────────┘             └────┬─────┘
                    │                                     │
                    │         ┌───────────────┐           │
                    │         │  PIR_CHECK    │           │
                    │         │(buzzer cảnh   │           │
                    │         │ báo nếu có    │           │
                    │         │ người đi qua) │           │
                    │         └───────┬───────┘           │
                    │                 │                   │
                    │    ┌────────────┴────────────┐      │
                    │    │    NEXT_NODE_SIGNAL      │      │
                    │    │ 1. App: NODE_DONE        │      │
                    │    │ 2. Voice: VOICE_NEXT     │◄─────┘
                    │    │ 3. Gesture: SWIPE RIGHT  │
                    │    └────────────┬─────────────┘
                    │                 │
                    │    ┌────────────┴────────────┐
                    └────┤    ALL_DONE → END        │
                         │(hết node → STOP)        │
                         └─────────────────────────┘
```

### 5.2 3 tín hiệu kết thúc node

1. **App Button**: User bấm "Hoàn thành node" trong app → `NODE_DONE`
2. **Voice Chat**: User nói "tiếp theo" / "dừng" trong voice chat → `VOICE_NEXT` / `VOICE_STOP`
3. **Gesture Sensor**: Cử chỉ **Swipe Right** (gesture `eGestureRight = 0x01`) → Robot tiếp tục

### 5.3 PIR Sensor

- Nếu PIR phát hiện có người đi qua → Robot phát âm thanh cảnh báo nhỏ qua `MiniR4.Buzzer`
- Gửi tin nhắn `ALARM` tới app để app hiển thị thông báo

### 5.4 Miniature Switch

- Bấm 1 lần → gửi tin nhắn `SWITCH_PRESS` tới app
- App nhận → tự động bấm button mic mở voice chat

---

## 6. CHI TIẾT THAY ĐỔI TỪNG FOLDER

### 6.1 Folder `heritage_robot/` (Robot Firmware)

#### Files hiện tại:
```
heritage_robot/
├── platformio.ini          ← SỬA: thêm thư viện
├── src/
│   └── main.cpp            ← VIẾT LẠI: toàn bộ code
└── lib/
    └── MatrixMiniR4/       ← GIỮ NGUYÊN
```

#### Chi tiết thay đổi:

**`platformio.ini`** — Thêm ArduinoBLE:
```ini
[env:unor4wifi]
platform = renesas-ra
board = uno_r4_wifi
framework = arduino
monitor_speed = 115200
lib_deps =
    mathertel/OneButton@^2.0.3
    adafruit/Adafruit SSD1306@^2.5.7
    adafruit/Adafruit GFX Library@^1.11.5
    bblanchon/ArduinoJson@^7.0.0
    knolleary/PubSubClient@^2.8
    arduino-libraries/ArduinoBLE@^1.3.6
```

**`src/main.cpp`** — Viết lại hoàn toàn:
```cpp
#include <MatrixMiniR4.h>
#include <ArduinoBLE.h>

// BLE Service & Characteristics (Nordic UART Service)
BLEService robotService("6E400001-B5A3-F393-E0A9-E50E24DCCA9E");
BLECharacteristic txChar("6E400003-B5A3-F393-E0A9-E50E24DCCA9E",
                          BLERead | BLENotify, 20);
BLECharacteristic rxChar("6E400002-B5A3-F393-E0A9-E50E24DCCA9E",
                          BLEWrite, 20);

// State Machine
enum RobotState { IDLE, FOLLOW_LINE, AT_NODE, END };
RobotState currentState = IDLE;

// Node management
int currentNode = 0;
int totalNodes = 13;

void setup() {
    Serial.begin(115200);
    MiniR4.begin();

    // Init BLE
    BLE.begin();
    BLE.setLocalName("HeritageBuddy");
    BLE.setAdvertisedService(robotService);
    robotService.addCharacteristic(txChar);
    robotService.addCharacteristic(rxChar);
    BLE.addService(robotService);
    BLE.advertise();

    // Init Sensors
    MiniR4.I2C0.MXLineTracer.begin();
    MiniR4.I2C2.MXColorV3.begin();
    MiniR4.I2C3.MXGesture.begin();

    // Digital Inputs
    pinMode(1, INPUT);  // PIR
    pinMode(2, INPUT);  // Switch

    // LED indicator
    MiniR4.LED.begin();
    MiniR4.LED.setColor(0, 0, 255); // Blue = ready
}

void loop() {
    BLEDevice central = BLE.central();
    if (central) {
        while (central.connected()) {
            handleBLEInput();
            switch (currentState) {
                case IDLE:        handleIdle(); break;
                case FOLLOW_LINE: handleFollowLine(); break;
                case AT_NODE:     handleAtNode(); break;
                case END:         handleEnd(); break;
            }
            checkPIR();
            checkGesture();
            checkSwitch();
            delay(50);
        }
    }
}
```

**Cấu trúc file mới (`src/`):**

```
src/
├── main.cpp              ← Main entry + setup/loop
├── config.h              ← Constants, pin definitions, BLE UUIDs
├── ble_handler.h/.cpp    ← Xử lý BLE communication
├── motor_control.h/.cpp  ← Điều khiển motor + line following (PID)
├── sensor_manager.h/.cpp ← Đọc tất cả cảm biến
├── state_machine.h/.cpp  ← Quản lý trạng thái robot
└── node_manager.h/.cpp   ← Quản lý node logic
```

---

### 6.2 Folder `heritage-buddy-app/` (Mobile App)

#### Files hiện tại:
```
heritage-buddy-app/src/
├── app/
│   ├── _layout.tsx                 ← GIỮ
│   ├── index.tsx                   ← GIỮ (welcome)
│   ├── selection.tsx               ← GIỮ (chọn chế độ)
│   ├── museum-map.tsx              ← SỬA (thêm BLE + nút xuất phát)
│   ├── node/[id].tsx               ← SỬA (thêm "Hoàn thành" + BLE)
│   ├── chat/[nodeId].tsx           ← SỬA (voice → BLE)
│   └── celebration.tsx             ← SỬA (gửi STOP robot)
├── types/
│   ├── robot.ts                    ← SỬA (BLE commands)
│   ├── museum-map.ts               ← GIỮ
│   ├── voice-assistant.ts          ← GIỮ
│   └── accessibility.ts            ← GIỮ
├── store/
│   ├── robot.ts                    ← SỬA (thêm BLE state)
│   ├── map-progress.ts             ← GIỮ
│   ├── voice-assistant.ts          ← GIỮ
│   └── accessibility.ts            ← GIỮ
├── lib/
│   ├── bluetooth.ts                ← MỚI (BLE service)
│   ├── speech.ts                   ← GIỮ
│   ├── tts.ts                      ← GIỮ
│   ├── llm.ts                      ← GIỮ
│   ├── contextBuilder.ts           ← GIỮ
│   └── voice-recorder.ts           ← GIỮ
├── hooks/
│   ├── use-robot-connection.ts     ← MỚI (BLE connection hook)
│   ├── use-voice-assistant.ts      ← SỬA (tích hợp BLE)
│   ├── use-gesture-navigation.ts   ← SỬA (nhận gesture từ BLE)
│   └── use-map-progress.ts         ← GIỮ
├── components/
│   ├── chat/                       ← GIỮ
│   └── map/                        ← GIỮ
└── data/
    └── museum-map.ts               ← GIỮ
```

#### Chi tiết thay đổi từng file:

---

##### 6.2.1 `src/types/robot.ts` — SỬA

**Hiện tại:** Dùng WebSocket JSON messages
**Mới:** Đổi sang BLE text-based commands

```typescript
// Robot → App commands
export type RobotToAppCommand =
  | "NODE_START:<id>"
  | "NODE_COMPLETE:<id>"
  | "ALL_DONE"
  | "ALARM"
  | "SWITCH_PRESS";

// App → Robot commands
export type AppToRobotCommand =
  | "START"
  | "STOP"
  | "NODE_DONE:<id>"
  | "NEXT_NODE"
  | "VOICE_NEXT"
  | "VOICE_STOP";

// BLE connection status
export type BLEConnectionStatus =
  | "disconnected"
  | "scanning"
  | "connecting"
  | "connected";

// Gesture types (từ Gesture Sensor)
export type GestureType =
  | "right"       // Swipe Right → đi tiếp
  | "left"        // Swipe Left → quay lại
  | "up"          // Swipe Up
  | "down"        // Swipe Down
  | "forward"     // Push forward
  | "backward"    // Pull back
  | "clockwise"   // Xoay phải
  | "anticlockwise" // Xoay trái
  | "wave"        // Vẫy tay
  | null;

// Robot telemetry (từ robot gửi về)
export interface RobotTelemetry {
  currentStop: number;
  batteryLevel: number;
  isMoving: boolean;
  gesture: GestureType;
  pirDetected: boolean;
}
```

---

##### 6.2.2 `src/store/robot.ts` — SỬA

**Thêm:**
- `connectionStatus: BLEConnectionStatus`
- `currentBLEDevice: string | null`
- `robotMessageQueue: string[]`
- Actions: `setConnectionStatus`, `addRobotMessage`, `processRobotMessage`

```typescript
interface RobotStore {
  // BLE connection
  connectionStatus: BLEConnectionStatus;
  currentBLEDevice: string | null;
  isConnected: boolean;

  // Robot state
  currentStop: number;
  isMoving: boolean;
  pirDetected: boolean;

  // Gesture
  lastGesture: GestureType;

  // Message queue
  robotMessageQueue: string[];

  // Actions
  setConnectionStatus: (status: BLEConnectionStatus) => void;
  setCurrentDevice: (device: string | null) => void;
  setConnected: (connected: boolean) => void;
  setCurrentStop: (stop: number) => void;
  setIsMoving: (moving: boolean) => void;
  setPirDetected: (detected: boolean) => void;
  setGesture: (gesture: GestureType) => void;
  addRobotMessage: (msg: string) => void;
  clearMessages: () => void;
}
```

---

##### 6.2.3 `src/lib/bluetooth.ts` — MỚI

BLE Service singleton với:
- Quét thiết bị tên "HeritageBuddy"
- Kết nối, lắng nghe notify từ TX Characteristic
- Gửi lệnh qua RX Characteristic
- Auto-reconnect khi mất kết nối
- AppState handling (disconnect khi backgrounded)

```typescript
// BLE UUIDs (Nordic UART Service)
const SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const TX_CHAR_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const RX_CHAR_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
const DEVICE_NAME = "HeritageBuddy";

// Functions
export async function scanAndConnect(): Promise<boolean>;
export async function sendCommand(cmd: string): Promise<void>;
export function onMessage(callback: (msg: string) => void): () => void;
export async function disconnect(): Promise<void>;
export function isConnected(): boolean;
```

---

##### 6.2.4 `src/hooks/use-robot-connection.ts` — MỚI

Hook quản lý toàn bộ kết nối BLE:

```typescript
export function useRobotConnection() {
  // Auto-connect khi app mount (hoặc manual trigger)
  // Listen for robot messages via BLE notify
  // Parse robot → App commands (NODE_START, ALARM, etc.)
  // Update Zustand store
  // Handle disconnect → auto reconnect
  // AppState handling (disconnect khi backgrounded)

  return {
    isConnected,
    connectionStatus,
    connect,          // Trigger scan + connect
    disconnect,
    sendCommand,      // Gửi lệnh tới robot
    lastMessage,      // Tin nhắn cuối từ robot
  };
}
```

**Xử lý tin nhắn từ robot:**

```typescript
function processRobotMessage(msg: string) {
  if (msg.startsWith("NODE_START:")) {
    const nodeId = msg.split(":")[1];
    // → Mở node screen tương ứng
    router.push(`/node/${nodeId}`);
  }
  else if (msg.startsWith("NODE_COMPLETE:")) {
    const nodeId = msg.split(":")[1];
    // → Đánh dấu node hoàn thành
    completeNode(nodeId);
  }
  else if (msg === "ALL_DONE") {
    // → Chuyển sang celebration screen
    router.replace("/celebration");
  }
  else if (msg === "ALARM") {
    // → Hiển thị alert + vibrate
    Vibration.vibrate();
    Alert.alert("Cảnh báo", "Phát hiện người đi qua!");
  }
  else if (msg === "SWITCH_PRESS") {
    // → Tự động mở mic voice chat
    toggleListening();
  }
}
```

---

##### 6.2.5 `src/hooks/use-voice-assistant.ts` — SỬA

**Thay đổi:**
- `navigateToNextNode()` → gọi `sendCommand("VOICE_NEXT")` thay vì `router.replace`
- Nhận `NODE_START` từ BLE → tự động mở node mới

```typescript
// CŨ:
const navigateToNextNode = useCallback(() => {
  const next = MUSEUM_NODES.find((n) => n.order === current.order + 1);
  completeNode(current.id);
  if (next) router.replace(`/node/${next.id}`);
}, []);

// MỚI:
const navigateToNextNode = useCallback(() => {
  const next = MUSEUM_NODES.find((n) => n.order === current.order + 1);
  completeNode(current.id);
  sendCommand("VOICE_NEXT");  // Gửi BLE command
  if (next) router.replace(`/node/${next.id}`);
}, [sendCommand]);
```

---

##### 6.2.6 `src/hooks/use-gesture-navigation.ts` — SỬA

**Thay đổi:** Nhận gesture từ BLE thay vì từ store

```typescript
// CŨ:
useEffect(() => {
  if (!lastGesture || !currentNodeId) return;
  // Xử lý gesture
}, [lastGesture]);

// MỚI:
useEffect(() => {
  // Lắng nghe gesture từ BLE
  const unsubscribe = onRobotMessage((msg) => {
    if (msg.startsWith("GESTURE:")) {
      const gesture = msg.split(":")[1];
      if (gesture === "right") {  // Swipe Right = đi tiếp
        completeNode(currentNodeId);
        sendCommand("NEXT_NODE");
        router.replace(`/node/${nextNodeId}`);
      }
    }
  });
  return unsubscribe;
}, [currentNodeId]);
```

---

##### 6.2.7 `src/app/museum-map.tsx` — SỬA

**Thay đổi:**
- Thêm trạng thái kết nối BLE (hiển thị icon bluetooth)
- Nút **"Xuất phát"** → gửi `START` qua BLE
- Hiển thị progress realtime từ robot

**UI mới:**
```
┌─────────────────────────────────┐
│ ←  Bản đồ bảo tàng     [1/13]  │
├─────────────────────────────────┤
│                                 │
│  [Map với 13 nodes]             │
│                                 │
├─────────────────────────────────┤
│ 🤖 Đã kết nối robot    [●]     │
│ [      Xuất phát       ]       │
└─────────────────────────────────┘
```

---

##### 6.2.8 `src/app/node/[id].tsx` — SỬA

**Thay đổi:**
- Nút **"Hoàn thành node"** → gửi `NODE_DONE` qua BLE
- Nút **"Tiếp theo (Gesture)"** → mô phỏng gesture (cho testing)
- Khi node cuối → gửi `ALL_DONE` → chuyển celebration

**UI mới:**
```
┌─────────────────────────────────┐
│ ←  [Video player]              │
├─────────────────────────────────┤
│ Tên hiện vật                    │
│ Mô tả                          │
├─────────────────────────────────┤
│ [🎙️ Hỏi Buddy]                 │
│ [     Hoàn thành node     ]    │ ← MỚI
│ [   Tiếp theo (Gesture)   ]    │ ← MỚI (testing)
└─────────────────────────────────┘
```

---

##### 6.2.9 `src/app/chat/[nodeId].tsx` — SỬA

**Thay đổi:**
- Khi voice nhận "tiếp theo" / "dừng" → gửi `VOICE_NEXT` / `VOICE_STOP` qua BLE
- Thêm nút **"Hoàn thành"** dưới chat

---

##### 6.2.10 `src/app/celebration.tsx` — SỬA

**Thay đổi:**
- Khi mount screen → gửi `STOP` qua BLE để robot dừng

---

## 7. DANH SÁCH FILE CẦN TẠO/SỬA

| # | File | Hành động | Mô tả | Trạng thái |
|---|---|---|---|---|
| 1 | `heritage_robot/platformio.ini` | SỬA | Đảm bảo đủ thư viện BLE | ✅ Hoàn tất |
| 2 | `heritage_robot/src/main.cpp` | VIẾT LẠI | Toàn bộ logic robot | ✅ Hoàn tất (+ test mode) |
| 3 | `heritage_robot/src/config.h` | TẠO MỚI | Constants, pin definitions | ✅ Hoàn tất |
| 4 | `heritage_robot/src/ble_handler.h/.cpp` | TẠO MỚI | BLE communication | ✅ Hoàn tất |
| 5 | `heritage_robot/src/motor_control.h/.cpp` | TẠO MỚI | Motor + line following | ✅ Hoàn tất |
| 6 | `heritage_robot/src/sensor_manager.h/.cpp` | TẠO MỚI | Đọc cảm biến | ✅ Hoàn tất |
| 7 | `heritage_robot/src/state_machine.h/.cpp` | TẠO MỚI | State machine | ✅ Hoàn tất |
| 8 | `heritage_robot/src/node_manager.h/.cpp` | TẠO MỚI | Node logic | ✅ Hoàn tất |
| 9 | `heritage-buddy-app/src/types/robot.ts` | SỬA | BLE commands | ✅ Hoàn tất |
| 10 | `heritage-buddy-app/src/store/robot.ts` | SỬA | BLE state | ✅ Hoàn tất |
| 11 | `heritage-buddy-app/src/lib/bluetooth.ts` | TẠO MỚI | BLE service | ✅ Hoàn tất |
| 12 | `heritage-buddy-app/src/hooks/use-robot-connection.ts` | TẠO MỚI | BLE hook + auto-navigate NODE_START | ✅ Hoàn tất |
| 13 | `heritage-buddy-app/src/hooks/use-voice-assistant.ts` | SỬA | Voice → BLE | ✅ Hoàn tất |
| 14 | `heritage-buddy-app/src/hooks/use-gesture-navigation.ts` | SỬA | Gesture từ BLE, navigate về map | ✅ Hoàn tất |
| 15 | `heritage-buddy-app/src/app/museum-map.tsx` | SỬA | BLE + nút xuất phát | ✅ Hoàn tất |
| 16 | `heritage-buddy-app/src/app/node/[id].tsx` | SỬA | "Hoàn thành" + BLE | ✅ Hoàn tất |
| 17 | `heritage-buddy-app/src/app/chat/[nodeId].tsx` | SỬA | Voice → BLE | ✅ Hoàn tất |
| 18 | `heritage-buddy-app/src/app/celebration.tsx` | SỬA | Gửi STOP | ✅ Hoàn tất |

**Tổng:** 7 files tạo mới + 9 files sửa + 2 files giữ nguyên  
**✅ Tất cả 18 files đã hoàn tất.**

---

## 8. THỨ TỰ THỰC HIỆN

### Stage 1: Robot Firmware (heritage_robot/) ✅ Hoàn tất
1. ✅ Viết `config.h` — constants, pin definitions
2. ✅ Viết `ble_handler.h/.cpp` — BLE communication
3. ✅ Viết `sensor_manager.h/.cpp` — đọc cảm biến
4. ✅ Viết `motor_control.h/.cpp` — điều khiển motor + line following
5. ✅ Viết `state_machine.h/.cpp` — quản lý trạng thái
6. ✅ Viết `node_manager.h/.cpp` — quản lý node
7. ✅ Viết lại `main.cpp` — tích hợp tất cả

### Stage 2: App Types + Stores (heritage-buddy-app/) ✅ Hoàn tất
1. ✅ Sửa `types/robot.ts` — BLE commands
2. ✅ Sửa `store/robot.ts` — BLE state
3. ✅ Tạo `lib/bluetooth.ts` — BLE service
4. ✅ Tạo `hooks/use-robot-connection.ts` — BLE hook

### Stage 3: App Screens (heritage-buddy-app/) ✅ Hoàn tất
1. ✅ Sửa `app/museum-map.tsx` — BLE + nút xuất phát
2. ✅ Sửa `app/node/[id].tsx` — "Hoàn thành" + BLE signals
3. ✅ Sửa `app/chat/[nodeId].tsx` — Voice → BLE
4. ✅ Sửa `app/celebration.tsx` — Gửi STOP

### Stage 4: App Hooks (heritage-buddy-app/) ✅ Hoàn tất
1. ✅ Sửa `hooks/use-voice-assistant.ts` — tích hợp BLE
2. ✅ Sửa `hooks/use-gesture-navigation.ts` — gesture từ BLE, navigate về map

### Stage 5: Testing & Debug 🔄 Đang thực hiện
1. 🔄 Test kết nối BLE robot ↔ app
2. 🔄 Test luồng hoạt động hoàn chỉnh (bao gồm test mode)
3. 🔄 Test voice commands → BLE
4. 🔄 Test gesture → BLE (→ map → auto-move → auto-open node)
5. 🔄 Test PIR alarm
6. 🔄 Test switch press
7. 🔄 Test function `handleTestMovement()` — di chuyển mô phỏng 2 node

---

## 9. RỦI RO & GIẢI PHÁP

| # | Rủi ro | Mức độ | Giải pháp |
|---|---|---|---|
| 1 | BLE không ổn định trên Android 12+ | Cao | Dùng `expo-bluetooth` hoặc `react-native-ble-plx`, test trên nhiều device |
| 2 | Audio conflict: STT + TTS cùng lúc | Cao | `iosVoiceProcessingEnabled: true`, `stopSpeaking()` trước khi `startListening()` |
| 3 | Robot mất kết nối giữa chừng | Trung bình | Auto-reconnect, graceful degradation |
| 4 | Gesture sensor không nhận diện đúng | Thấp | Calibration, test nhiều tư thế |
| 5 | Color sensor nhầm màu | Thấp | Set threshold, calibration với môi trường thực |
| 6 | Line tracer mất line | Trung bình | PID tuning, fallback search pattern |

---

## 10. KIỂM TRA HOÀN THÀNH

### Robot
```bash
# Build firmware
pio run

# Upload to board
pio run --target upload

# Monitor serial
pio device monitor
```

### App
```bash
npx tsc --noEmit          # TypeScript không lỗi
npx expo lint              # ESLint pass
npx expo prebuild          # Native build thành công
npx expo run:android       # Chạy trên device
```

### Manual Test Checklist
- [ ] Robot kết nối BLE với app
- [ ] App hiển thị trạng thái "Đã kết nối"
- [ ] Nút "Xuất phát" gửi lệnh START
- [ ] Robot di chuyển theo line đen
- [ ] Robot dừng khi Color sensor đọc màu đỏ
- [ ] App hiển thị node tương ứng
- [ ] Nút "Hoàn thành node" gửi NODE_DONE
- [ ] Robot tiếp tục di chuyển
- [ ] Voice "tiếp theo" gửi VOICE_NEXT
- [ ] Gesture swipe right gửi NEXT_NODE
- [ ] PIR alarm hiển thị trên app
- [ ] Switch press mở mic voice chat
- [ ] Node cuối → ALL_DONE → celebration screen
- [ ] Robot dừng khi app gửi STOP

---

## 11. KHÁC BIỆT GIỮA DỰ ÁN THỰC TẾ VÀ PLAN

### 11.1 Gesture Sensor — Loại cử chỉ khác

| Mục | Plan gốc | Thực tế |
|-----|----------|---------|
| Gesture để đi tiếp | Swipe Right (`eGestureRight = 0x01`) | Swipe Up (`0x04`) |
| Lý do | Theo spec Matrix Mini R4 | Swipe Up hoạt động ổn định hơn trong test, `0x04` là giá trị đo được từ gesture sensor |

### 11.2 Luồng Gesture → Navigation khác

**Plan gốc:**
```
Gesture → app nhận → completeNode() → VOICE_NEXT → navigate đến /node/:next
```

**Thực tế:**
```
Gesture → app nhận → completeNode() → VOICE_NEXT → navigate đến /museum-map
  → robot tự động chạy (FOLLOW_LINE)
  → robot đến node → gửi NODE_START:<index>
  → app auto-navigate đến /node/:id
```

**Lý do:** UX tốt hơn — người dùng thấy robot di chuyển trên bản đồ, không bị "teleport" đến node tiếp theo.

### 11.3 Định dạng NODE_START

| Mục | Plan gốc | Thực tế |
|-----|----------|---------|
| Format | `NODE_START:<string-id>` (vd: `ancient-01`) | `NODE_START:<numeric-index>` (vd: `NODE_START:0`) |
| App xử lý | Parse `nodeId` string trực tiếp | Parse số → map qua `MUSEUM_NODES[index]` → lấy `id` string |

### 11.4 Test Mode (không có trong plan)

- **Function mới:** `handleTestMovement()` trong `main.cpp`
- **Mục đích:** Mô phỏng di chuyển khi chưa có line tracer + color sensor
- **Luồng test:**
  1. Move straight 5s → NODE_START:0 (node 1)
  2. Chờ gesture/VOICE_NEXT/NODE_DONE
  3. Turn left 1s → move straight 5s → NODE_START:1 (node 2)
- **Code line-following + color-sensor:** Đã comment để chuyển sang test mode

### 11.5 Auto-navigate khi nhận NODE_START

**Mới so với plan:**
- `use-robot-connection.ts` tự động gọi `router.replace()` khi nhận `NODE_START`
- Plan gốc chỉ định xử lý `NODE_START` trong hook nhưng không nói rõ auto-navigate
- Thực tế: khi robot đến node, app tự mở node screen — không cần user nhấn gì

### 11.6 Robot Gesture Handler

**Plan gốc:** Gesture sensor gửi `GESTURE:SWIPE_RIGHT` → robot tự chuyển state `AT_NODE → FOLLOW_LINE`

**Thực tế:** Gesture sensor gửi `GESTURE:SWIPE_UP` → app nhận → app gửi `VOICE_NEXT` → robot chuyển state

**Lý do:** App cần biết gesture đã xảy ra (để navigate về map). Nếu robot tự chuyển state, app không kịp phản ứng.

### 11.7 NODE_DONE Handler — Bug tiềm ẩn

**Plan gốc:** `NODE_DONE` hoàn thành node hiện tại và chuyển sang node tiếp theo

**Thực tế:** `NODE_DONE` handler gọi `completeCurrentNode()` nhưng **không** gọi `nextNode()`. Kết quả:
- Giá trị `nodes.getCurrentNode()` không thay đổi
- Khi vào `AT_NODE` lần tiếp theo, `handleAtNode()` gửi `NODE_START:X` với index cũ

**Các handler khác (VOICE_NEXT, GESTURE) gọi đúng `nextNode()`.**

### 11.8 Expo SDK Version

| Mục | Plan gốc | Thực tế |
|-----|----------|---------|
| Expo SDK | SDK 57 | SDK 54 |
| React Native | RN 0.81.x (SDK 57 spec) | RN 0.81.5 |

Project thực tế được khởi tạo với Expo SDK 54, không nâng cấp lên 57.

### 11.9 Video Playback

**Plan gốc:** Không đề cập cụ thể cách phát media tại node

**Thực tế:** Dùng `expo-video` với `useVideoPlayer` + `VideoView`, hỗ trợ native controls và auto-play

### 11.10 State Machine — Không có PIR_CHECK state riêng

**Plan gốc:** Có `PIR_CHECK` state riêng trong sơ đồ state machine

**Thực tế:** PIR alarm được xử lý bên ngoài state machine (trong `loop()`, gọi `checkPIR()` song song với state handler). Không có `PIR_CHECK` state riêng.

### 11.11 Thư viện BLE

| Mục | Plan gốc | Thực tế |
|-----|----------|---------|
| BLE Android | `expo-bluetooth` | `react-native-ble-plx` |
| Lý do | Plan dự kiến dùng expo-native | `ble-plx` là thư viện BLE phổ biến và ổn định nhất cho RN |

### 11.12 Gesture Types (type định nghĩa)

**Plan gốc:** 10 loại gesture (`right`, `left`, `up`, `down`, `forward`, `backward`, `clockwise`, `anticlockwise`, `wave`, `null`)

**Thực tế:** Chỉ dùng 4 loại (`swipe_right`, `swipe_left`, `swipe_up`, `swipe_down`, `null`). Các loại khác không cần thiết cho WRO 2026.

### 11.13 Tổng kết khác biệt

| # | Khác biệt | Ảnh hưởng |
|---|-----------|------------|
| 1 | Swipe Up (0x04) thay vì Swipe Right (0x01) | Cần calibrate gesture sensor với giá trị đúng |
| 2 | Gesture → map (không phải → node trực tiếp) | UX tốt hơn, cần auto-navigate trên app |
| 3 | Node index numeric trong BLE message | App phải map index → ID string |
| 4 | Test mode thay thế line-following + color sensor | Chạy test được ngay không cần line đen + màu đỏ |
| 5 | Auto-navigate NODE_START | Không cần user nhấn gì khi robot đến node |
| 6 | Gesture → app → VOICE_NEXT (2 bước) | App biết gesture xảy ra để navigate |
| 7 | NODE_DONE không gọi nextNode() | Bug tiềm ẩn — cần sửa khi dùng NODE_DONE |
| 8 | Expo SDK 54 | Một số API có thể khác SDK 57 |
| 9 | expo-video cho media | Phát video mượt, native controls |
| 10 | PIR xử lý ngoài state machine | Đơn giản hơn, không ảnh hưởng logic chính |
| 11 | react-native-ble-plx | Cần permissions Android 12+ |
| 12 | Gesture type đơn giản hơn | Đủ dùng cho WRO 2026 |
