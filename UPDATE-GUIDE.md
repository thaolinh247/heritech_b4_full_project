# Hướng dẫn Update Firmware Robot & App

## Yêu cầu

| Công cụ | Cài đặt |
|---|---|
| Python 3.x | https://python.org |
| PlatformIO | `pip install platformio` |
| Node.js 18+ | https://nodejs.org |
| Expo CLI | `npm install -g expo-cli` |

---

## Robot Firmware

**Thư mục:** `heritech_robot/`

### Build

```powershell
cd heritech_robot
python -m platformio run
```

### Upload lên board

```powershell
python -m platformio run --target upload
```

### Xem log serial (debug)

```powershell
python -m platformio device monitor
```

### Cấu trúc file firmware

```
heritech_robot/src/
├── main.cpp              # Entry point, state machine, BLE
├── config.h              # Hằng số, pin, BLE UUIDs
├── ble_handler.h/.cpp    # Giao tiếp BLE (Nordic UART)
├── motor_control.h/.cpp  # Điều khiển DC motor + PID
├── sensor_manager.h/.cpp # Đọc cảm biến (line, màu, gesture, PIR, switch)
├── state_machine.h/.cpp  # IDLE → FOLLOW_LINE → AT_NODE → END
├── node_manager.h/.cpp   # Quản lý 13 node
└── test_movement.h/.cpp  # Chế độ chạy thử (time-based)
```

### Lưu ý

- Robot quảng bá BLE tên `"HeritageBuddy"`
- Test mode: đang chạy theo thời gian (đi thẳng 5s → rẽ trái 1s). Khi có line đen thật, sửa `handleFollowLine()` trong `main.cpp`: comment `testMovementHandle()` và uncomment phần line-following + color sensor
- Gesture sensor dùng Swipe Up (`0x04`)

---

## Mobile App

**Thư mục gốc:** `C:\heritech`

### Cài dependencies

```powershell
npx expo install
```

### Kiểm tra lỗi trước khi build

```powershell
npx tsc --noEmit
npx expo lint
```

### Build & chạy trên Android

```powershell
npx expo run:android
```

### Build & chạy trên iOS

```powershell
npx expo run:ios
```

### Prebuild (khi thay đổi native config)

```powershell
npx expo prebuild
npx expo run:android
```

> **Lưu ý:** App cần development build (không chạy được trên Expo Go) vì dùng `react-native-ble-plx`, `expo-speech-recognition`, `expo-audio`.

---

## Backend Server

**Thư mục:** `server/`

### Cài dependencies

```powershell
cd server
npm install
```

### Chạy (hot reload)

```powershell
npm run dev
```

Server chạy tại `http://localhost:3000`.

### API endpoints

| Endpoint | Mô tả |
|---|---|
| `POST /api/ask-buddy` | Text question → Gemini 2.5 Flash |
| `POST /api/ask-buddy-audio` | Audio → Gemini (STT + answer) |
| `GET /api/health` | Health check |

### Cấu hình

Tạo file `server/.env`:

```env
GEMINI_API_KEY=your_key_here
PORT=3000
```

Lấy API key tại: https://aistudio.google.com/apikey

---

## Luồng update thông thường

```
1. Sửa firmware (C++)    → python -m platformio run --target upload
2. Sửa app (TS/TSX)      → npx expo run:android
3. Sửa backend (TS)      → npm run dev (tự động reload)
4. Kiểm tra              → npx tsc --noEmit && npx expo lint
```

## Tài liệu liên quan

- `PLAN.md` — Kiến trúc tổng thể dự án
- `AGENTS.md` — Quy tắc code, tech stack
- `README.md` — Hướng dẫn khởi chạy cơ bản
