# Tóm tắt logic vận hành dự án Heritage Buddy (Robot + App)

## Tổng quan
Dự án **Heritage Buddy** là robot hướng dẫn viên bảo tàng kết hợp app mobile, dành cho người khuyết tật (khiếm thị, khiếm thính, khiếm ngôn). Robot tự động chạy theo line đen, dừng tại 13 điểm trưng bày (node) và tương tác với khách qua app.

---

## 1. Luồng hoạt động chính

```
App: Bắt đầu → Chọn chế độ (khiếm thị/thính/ngôn) → Map museum → Kết nối BLE → Gửi "START"
Robot: IDLE → FOLLOW_LINE (PID line following) → phát hiện vạch đỏ (Color Sensor) → AT_NODE → gửi BLE "NODE_START:<id>"
App: Nhận NODE_START → mở màn hình node → play video giới thiệu
Người dùng: Xem video / Hỏi Buddy (voice chat) / Vuốt tay (gesture) / Bấm "Hoàn thành node"
Robot: Nhận NODE_DONE / VOICE_NEXT / GESTURE → chạy tiếp node kế → lặp lại
Sau 13 node: Robot gửi "ALL_DONE" → App mở màn hình chúc mừng → Robot về END
```

**Cơ chế giao tiếp:** BLE (Nordic UART Service) — Robot gửi notify, App gửi write.

**State Machine robot:** `IDLE → FOLLOW_LINE → AT_NODE → (END)`. Luôn chạy kiểm tra PIR, gesture, switch song song.

---

## 2. Cảm biến + Code (thực tế sử dụng + tác dụng)

### a) Line Tracer (I2C) — `sensor_manager.cpp` + `motor_control.cpp`
- **Tác dụng:** Đọc độ lệch line đen so với tâm robot, đưa vào PID để bám line.
- **Code thực tế:**
  ```cpp
  // sensor_manager.cpp
  int readLineSensor() {
    MX_LINE.update();
    return MX_LINE.getOffset();  // độ lệch từ -X đến +X
  }

  // motor_control.cpp - PID line follow
  float error = readLineSensor();
  integral += error;
  float derivative = error - prevError;
  float correction = Kp*error + Ki*integral + Kd*derivative;
  leftSpeed = baseSpeed - correction;
  rightSpeed = baseSpeed + correction;
  ```
- Chỉ dùng `getOffset()` và PID correction — phần nhỏ nhưng cốt lõi.

### b) Color Sensor V3 (I2C) — `sensor_manager.cpp`
- **Tác dụng:** Nhận diện vạch đỏ (red marker) để biết robot đã đến node.
- **Code thực tế:**
  ```cpp
  bool isRedDetected() {
    MX_COLOR.update();
    if (MX_COLOR.getColorID() == COLOR_RED_ID) {
      stableCount++;
      if (stableCount >= 3) { stableCount = 0; return true; }
    } else { stableCount = 0; }
    return false;
  }
  ```
- Cần **3 lần đọc ổn định** liên tiếp để tránh nhiễu.

### c) Gesture Sensor (I2C) — `sensor_manager.cpp` + `main.cpp`
- **Tác dụng:** Nhận diện vuốt tay (phải/trái/lên/xuống) — hỗ trợ người khiếm ngôn.
- **Code thực tế:**
  ```cpp
  // main.cpp - checkGesture()
  void checkGesture() {
    uint8_t gesture = readGesture();
    if (gesture != GESTURE_NONE) {
      BLE.send("GESTURE:" + gestureToString(gesture));
      if (gesture == GESTURE_RIGHT && currentState == AT_NODE) {
        completeNode();  // vuốt phải → chuyển node
      }
    }
  }
  ```

### d) PIR Sensor (Digital, Pin D1) — `sensor_manager.cpp` + `main.cpp`
- **Tác dụng:** Phát hiện người đến gần → báo động + gửi "ALARM" lên app.
- **Code thực tế:**
  ```cpp
  bool readPIR() { return digitalRead(PIN_PIR); }

  // main.cpp
  if (readPIR() && millis() - lastPIRTime > 3000) {
    buzzer.beep(); BLE.send("ALARM");
    lastPIRTime = millis();
  }
  ```
- Có cooldown 3 giây để tránh spam.

### e) Miniature Switch (Digital, Pin D2) — `sensor_manager.cpp` + `main.cpp`
- **Tác dụng:** Nút vật lý sau lưng robot → bấm để mở mic trên app (dành cho người khiếm thị).
- **Code thực tế:**
  ```cpp
  if (readSwitch()) { BLE.send("SWITCH_PRESS"); }
  ```

---

## 3. Hệ thống AI LLM

### Kiến trúc
```
App Mobile → Backend Express (server/index.js) → Google Gemini 2.5 Flash API → Backend → App
```
App **KHÔNG bao giờ** gọi trực tiếp Gemini. Tất cả qua backend proxy để bảo vệ API key.

### Model: **Google Gemini 2.5 Flash**
- `maxOutputTokens: 1024`, `temperature: 0.7`
- Trả lời bằng tiếng Việt, 2-3 câu, giọng thân thiện như Buddy mascot.

### Backend endpoints

| Endpoint | Input | Output |
|---|---|---|
| `POST /api/ask-buddy` | `{question, artifactContext}` | `{answer}` |
| `POST /api/ask-buddy-audio` | `{audioBase64, mimeType, artifactContext}` | `{transcription, answer}` |
| `GET /api/health` | — | `{status, geminiConfigured}` |

### System Prompt
```
Bạn là Buddy, chú hổ nhỏ mascot thân thiện của Bảo tàng Lịch sử Quốc gia Việt Nam.
Bạn trả lời ngắn gọn (2-3 câu), thân thiện, bằng tiếng Việt.
Nếu câu hỏi không liên quan đến bảo tàng, hiện vật, hoặc lịch sử Việt Nam, hãy nói:
"Mình chỉ biết về bảo tàng thôi nha! Bạn thử hỏi về hiện vật đang đứng trước mặt nhé."
Luôn giữ thái độ vui vẻ, dễ thương, phù hợp với du khách mọi lứa tuổi.
```

### Luồng voice chat trong app
1. User bấm mic hoặc robot gửi `SWITCH_PRESS`
2. App dùng `expo-speech-recognition` (STT) — lắng nghe tiếng Việt `vi-VN`
3. Nếu phát hiện từ khóa điều hướng ("tiếp theo", "dừng") → gửi `VOICE_NEXT`/`VOICE_STOP` qua BLE (không gọi LLM)
4. Nếu không → gửi câu hỏi + context hiện vật lên backend → Gemini → trả lời
5. App show chat bubble + dùng `expo-speech` (TTS) đọc to câu trả lời
6. Sau khi đọc xong → auto lắng nghe lại
7. Timeout 20 giây nếu server không phản hồi
