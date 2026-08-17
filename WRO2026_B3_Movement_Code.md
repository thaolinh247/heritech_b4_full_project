# WRO 2026 B3 — TOÀN BỘ CODE & LỘ TRÌNH DI CHUYỂN (mục B plan-ver2)

> **⚠️ CẬP NHẬT 16/08:** file này mô tả chế độ "bám line liên tục + đỏ=node" (round 1 mục B). Từ `PLAN-MOVEMENT-FINAL.md` + commit tiếp theo, robot chuyển sang **điều hướng leg-based** (rẽ 90° tại ngã ba, 5 chặng, dừng hẳn mỗi node) — code mới nằm ở `heritech_robot/src/route_config.h` + `maneuver_nav.h`. File này vẫn giữ làm tài liệu tham chiếu PID/thư viện và lộ trình test calibration (Bước 1–2).
> **Ngày cập nhật:** 2026-08-16 (đóng băng tính năng 17/08)
> **Trạng thái:** B2 (ngã ba → WARN:turn_l/r) + calibration đã code xong, build PlatformIO sạch (RAM 47.9%, Flash 46.9%).
> **Mục đích file:** tổng hợp TOÀN BỘ mã lệnh liên quan di chuyển (bám line, node, ngã ba, calibration) để đọc kiểm tra, kèm lộ trình thực test trên tuyến.
> **Nguyên tắc mục B:** B1 "không sửa logic", B2 là phần điều chỉnh duy nhất cho phép, B3 chỉ kiểm tra lại.

---

## 1. Tổng quan kiến trúc di chuyển

```
[Line Tracer 10CH] ──getError() (centroid) + PID──► [MotorControl] ──► M1 (trái) / M2 (phải)
       │                                                  
       ├── getJunctionType() (1=Left, 2=Right) ──► checkJunction() ──► BLE "WARN:turn_l/r" (chỉ báo, không dừng)
       └── readLineWidth() / readJunctionType() ──► [LINE] debug log mỗi 2s (B1 quan sát)

> ⚠️ 16/08: robot đã chuyển sang **leg-based** (xem `PLAN-MOVEMENT-FINAL.md` + `maneuver_nav.h`),
> `handleFollowLine()` không còn PID+đỏ. Động cơ kéo của robot HERITECH nằm ở cổng
> **M1 (trái) / M2 (phải)** — điều hướng bằng `MiniR4.M1/M2.setPower()` trực tiếp
> (đã verify với team: KHÔNG phải M3/M4 như robot WRO 2026 B3 tham khảo).

[Color Sensor] ──readColorID()==9 đỏ ổn định 3 lần──► AT_NODE ──► BLE "NODE_START:<id>" ──► app mở node
[PIR] ──► WARN:person ──► dừng (FOLLOW_LINE) ──► WAIT_CLEAR ──► đường thoáng/timeout 10s ──► auto resume
```

- **Định vị:** Line Tracer + Color Sensor (chính thức, giữ nguyên V1–V3).
- **Đấu nối (cổng vật lý ↔ kênh MUX, xem `MatrixMiniR4.h`):**

| Cảm biến | Cổng | Kênh MUX | Wire |
|---|---|---|---|
| Line Tracer 10CH | I2C1 | 0 | Wire1 |
| Color Sensor V3 | I2C3 | 2 | Wire1 |
| Gesture PAJ7620 | I2C2 | 1 | Wire1 |

---

## 2. TOÀN BỘ CODE DI CHUYỂN

### 2.1 `src/config.h` — hằng số di chuyển

```cpp
#define MUX_ADDRESS            0x70
#define I2C_CH_LINE            0        // Cổng I2C1
#define I2C_CH_COLOR           2        // Cổng I2C3
// Cổng vật lý ↔ kênh MUX (xem MatrixMiniR4.h): I2C1=0, I2C2=1, I2C3=2, I2C4=3
#define I2C_CH_GESTURE         1        // Cổng I2C2

#define LINE_THRESHOLD         50       // Ngưỡng đen/trắng (calibration ghi đè min/max trong sensor)
#define BASE_SPEED             40       // Tốc độ cơ bản khi chạy
#define MAX_SPEED              60       // Clamp tốc độ tối đa
#define MIN_SPEED              10       // Clamp tốc độ tối thiểu
#define PID_KP                 0.8      // P: phản ứng độ lệch
#define PID_KI                 0.02     // I: bù sai số tích lũy (integral clamp ±50)
#define PID_KD                 0.5      // D: giảm dao động

#define COLOR_RED_ID           9        // Màu đỏ = tới node
#define COLOR_STABLE_COUNT     3        // Đọc đỏ ổn định 3 lần liên tiếp mới tin

// ─── Ngã ba & WARN:turn_* (mục B2) ───────────
#define JUNCTION_CONFIRM_FRAMES 3       // Type 1/2 ổn định ≥3 lần đọc liên tiếp (~60ms) mới tin
#define JUNCTION_REARM_MS     500       // Sau khi gửi, chặn tối thiểu 500ms + cần type về 0/4

// ─── Hiệu chỉnh Line Tracer (BTN_UP) ────────
#define CALIB_HOLD_MS         2000      // Giữ BTN_UP ≥2s (khi IDLE) để bắt đầu
#define CALIB_SWEEP_MS        2000      // Quét robot qua line trong 2s rồi tự kết thúc

#define LOOP_DELAY_MS          20       // Chu kỳ vòng lặp chính (50Hz)
#define PIR_ALARM_COOLDOWN_MS  3000     // Chống báo WARN:person liên tục
#define WARN_CLEAR_TIMEOUT_MS 10000     // An toàn: tối đa chờ đường thoáng (ms)
#define PIR_CLEAR_CONFIRM_MS  2000      // Đường "thoáng" khi PIR im lặng liên tục bấy nhiêu ms
#define SOS_HOLD_MS            10000    // Giữ switch >= 10s để kích hoạt SOS
#define SWITCH_DEBOUNCE_MS     40       // Lọc nhiễu phím switch
#define PIR_GRACE_AFTER_LEAVE_MS 4000   // Bỏ qua PIR trong lúc rời node
#define PIR_WARMUP_MS         60000     // Bỏ qua PIR 60s đầu sau bật nguồn (PIR ổn định)
#define PIR_DEBOUNCE_MS       400       // PIR phải HIGH liên tục ≥400ms mới tin
#define GESTURE_REINIT_INTERVAL_MS 2000 // Chu kỳ thử khởi tạo lại gesture sensor
```

> Lưu ý: `PIN_PIR = 3` (INPUT_PULLDOWN), `PIN_SWITCH = 5` (INPUT_PULLUP).

### 2.2 `src/sensor_manager.h` — phần di chuyển

```cpp
class SensorManager {
public:
    void begin();
    float readLineError();          // getError() thư viện — lỗi centroid (±4.5)
    uint8_t readLineWidth();        // getLineWidth() thư viện — số kênh thấy line (1..10)
    uint8_t readJunctionType();     // getJunctionType() thư viện — 0=None,1=Left,2=Right,3=T/Cross,4=Unknown
    int8_t readColorID();           // getColorID() — màu hiện tại
    bool isRedDetected();           // readColorID() == COLOR_RED_ID
    int readGesture();
    bool readPIR();
    bool readSwitch();
    bool isGestureReady();
    bool reinitGesture();
    void calibrateBegin();          // startCalibration() thư viện — bắt đầu quét min/max
    void calibrateEnd();            // endCalibration() thư viện — kết thúc, sensor tự chuẩn hóa
};
```

Khởi tạo (`begin()`):

```cpp
void SensorManager::begin() {
    Wire1.begin();

    _lineTracer._ch = I2C_CH_LINE;      // kênh MUX 0
    _lineTracer._pWire = &Wire1;
    _lineTracer.begin();
    _lineTracer.setThreshold(LINE_THRESHOLD);   // 50

    _colorSensor._ch = I2C_CH_COLOR;    // kênh MUX 2
    _colorSensor._pWire = &Wire1;
    _colorSensor.begin();

    _gestureSensor._ch = I2C_CH_GESTURE;
    _gestureSensor._pWire = &Wire1;
    initGestureSensor();

    pinMode(PIN_PIR, INPUT_PULLDOWN);   // dây hở → đọc LOW, không báo nhầm
    pinMode(PIN_SWITCH, INPUT_PULLUP);
}
```

### 2.3 `src/motor_control.h` + `src/motor_control.cpp` — TOÀN BỘ

```cpp
// motor_control.h
class MotorControl {
public:
    void begin();
    void move(int16_t leftPower, int16_t rightPower);
    void followLine(float error);       // PID bám line
    void stop();
    void brake();
    void setSpeed(int16_t speed);
private:
    int16_t _baseSpeed;
    float _lastError;
    float _integral;
};
```

```cpp
// motor_control.cpp
#include "motor_control.h"
#include "config.h"
#include <MatrixMiniR4.h>

void MotorControl::begin() {
    _baseSpeed = BASE_SPEED;
    _lastError = 0;
    _integral = 0;
}

void MotorControl::move(int16_t leftPower, int16_t rightPower) {
    MiniR4.M1.setPower(leftPower);  // M1 = bánh trái (setReverse(false) trong setup)
    MiniR4.M2.setPower(rightPower); // M2 = bánh phải (setReverse(true) trong setup)
}

void MotorControl::followLine(float error) {
    _integral += error;
    _integral = constrain(_integral, -50, 50);

    float derivative = error - _lastError;
    _lastError = error;

    float correction = error * PID_KP + _integral * PID_KI + derivative * PID_KD;
    correction = constrain(correction, -_baseSpeed, _baseSpeed);

    int16_t leftPower  = _baseSpeed + correction;
    int16_t rightPower = _baseSpeed - correction;

    leftPower  = constrain(leftPower,  -MAX_SPEED, MAX_SPEED);
    rightPower = constrain(rightPower, -MAX_SPEED, MAX_SPEED);

    MiniR4.M1.setPower(leftPower);
    MiniR4.M2.setPower(rightPower);
}

void MotorControl::stop() {
    MiniR4.M1.setPower(0);
    MiniR4.M2.setPower(0);
    _integral = 0;
    _lastError = 0;
}

void MotorControl::brake() {
    MiniR4.M1.setBrake(true);
    MiniR4.M2.setBrake(true);
    _integral = 0;
    _lastError = 0;
}

void MotorControl::setSpeed(int16_t speed) {
    _baseSpeed = constrain(speed, MIN_SPEED, MAX_SPEED);
}
```

### 2.4 `src/main.cpp` — globals di chuyển

```cpp
unsigned long lastPIRWarn = 0;        // Lần cuối gửi WARN:person (chống gửi liên tục)
unsigned long warnClearDeadline = 0; // Hạn chót chờ đường thoáng sau WARN:person (WAIT_CLEAR)
unsigned long pirGraceUntil = 0;      // Bỏ qua PIR đến thời điểm này (sau khi rời node)
unsigned long pirClearSince = 0;      // PIR bắt đầu im lặng liên tục (xác nhận đường thoáng)
unsigned long pirHighSince = 0;       // PIR bắt đầu HIGH liên tục (debounce trước khi WARN)
int redStableCount = 0;               // Đọc màu đỏ ổn định liên tiếp (xác nhận tới node)
bool nodeNotified = false;            // Đã gửi NODE_START chưa? (tránh gửi trùng)
int junctionPendingType = 0;          // Type ngã ba đang chờ xác nhận (1=trái, 2=phải)
int junctionPendingFrames = 0;        // Số lần đọc liên tiếp cùng type ngã ba
bool junctionLatched = false;         // Đã gửi WARN:turn_* cho ngã ba này — chờ rearm
unsigned long junctionLatchUntil = 0; // Chặn gửi lại cho tới thời điểm này (rearm)
```

Cấu hình motor trong `setup()` (động cơ ở M1/M2 — bánh trái/phải):

```cpp
MiniR4.M1.setPPR_RPM(545, 200);   // encoder PPR + RPM max (cho setSpeed/rotateFor)
MiniR4.M2.setPPR_RPM(545, 200);
MiniR4.M1.setReverse(false);      // M1 ghi thuận
MiniR4.M2.setReverse(true);       // M2 đảo chiều (dây lắp ngược)
MiniR4.DriveDC.begin(1, 2, false, true);  // chốt 2 motor kéo = M1/M2
MiniR4.DriveDC.setMoveSyncPID(0.02, 0.00, 0.04);
```

> ⚠️ 16/08: từng có bước điều tra sai hướng chuyển sang M3/M4 (theo code robot
> WRO 2026 B3 dùng `M3/M4.setSpeed()`), nhưng robot HERITECH đấu dây động cơ
> ở **M1/M2 → đã revert**. M3/M4 trên robot heritech là cổng KHÔNG dùng cho kéo.

### 2.5 `main.cpp` — checkButton() (gồm calibration BTN_UP)

```cpp
void checkButton()
{
    static bool lastState = false;
    bool current = MiniR4.BTN_DOWN.getState();

    if (current && !lastState)                        // Nhấn → dừng
    {
        motors.stop();
        state.setState(RobotState::IDLE);
        MiniR4.LED.setColor(1, 255, 0, 0);
        MiniR4.Buzzer.Tone(200, 100);
        Serial.println("[BTN] DOWN -> STOP");
    }
    if (!current && lastState)                        // Nhả → xuất phát nếu IDLE
    {
        if (state.getState() == RobotState::IDLE)
        {
            nodes.reset();
            redStableCount = 0;
            nodeNotified = false;
            state.setState(RobotState::FOLLOW_LINE);
            motors.setSpeed(BASE_SPEED);
            MiniR4.LED.setColor(1, 0, 255, 0);
            MiniR4.Buzzer.Tone(400, 100);
            delay(50);
            MiniR4.Buzzer.NoTone();
            Serial.println("[BTN] UP -> START");
        }
    }
    lastState = current;

    // ── Hiệu chỉnh Line Tracer qua BTN_UP (non-blocking state machine) ──
    static bool calibHolding = false;
    static unsigned long calibHoldStart = 0;
    static bool calibActive = false;
    static unsigned long calibUntil = 0;

    bool btnUp = MiniR4.BTN_UP.getState();

    if (btnUp)
    {
        if (!calibHolding)
        {
            calibHolding = true;
            calibHoldStart = millis();
        }
        // Giữ đủ lâu + robot đang IDLE → bắt đầu quét calibration
        if (!calibActive && state.getState() == RobotState::IDLE &&
            millis() - calibHoldStart >= CALIB_HOLD_MS)
        {
            calibActive = true;
            calibUntil = millis() + CALIB_SWEEP_MS;
            MiniR4.Buzzer.Tone(1000, 100); // Bíp báo BẮT ĐẦU
            sensors.calibrateBegin();
            Serial.println("[CALIB] START - sweep robot over line for 2s");
        }
    }
    else
    {
        calibHolding = false;
    }

    // Hết cửa sổ quét → kết thúc (không cần nhả nút)
    if (calibActive && millis() >= calibUntil)
    {
        calibActive = false;
        sensors.calibrateEnd();
        MiniR4.Buzzer.Tone(1500, 150); // Bíp báo XONG
        Serial.println("[CALIB] DONE");
    }
}
```

### 2.6 `main.cpp` — handleFollowLine() (PID + node + [LINE] debug)

```cpp
void handleFollowLine()
{
    if (state.isStateChanged())
    {
        Serial.println("[STATE] FOLLOW_LINE");
    }

    // Debug quan sát mỗi 2s (phục vụ B1/B2) — KHÔNG đổi hành vi
    static unsigned long lastLineDebug = 0;
    if (millis() - lastLineDebug >= 2000)
    {
        lastLineDebug = millis();
        Serial.print("[LINE] err=");
        Serial.print(sensors.readLineError(), 2);
        Serial.print(" w=");
        Serial.print(sensors.readLineWidth());
        Serial.print(" junc=");
        Serial.println(sensors.readJunctionType());
    }

    float lineError = sensors.readLineError();
    motors.followLine(lineError);

    if (sensors.isRedDetected())
    {
        redStableCount++;
        if (redStableCount >= COLOR_STABLE_COUNT)
        {
            motors.stop();
            nodeNotified = false;
            state.setState(RobotState::AT_NODE);
            Serial.println("[STATE] Red detected -> AT_NODE");
        }
    }
    else
    {
        redStableCount = 0;
    }
}
```

### 2.7 `main.cpp` — checkJunction() (B2 — MỚI)

```cpp
void checkJunction()
{
    if (state.getState() != RobotState::FOLLOW_LINE)
        return; // Chỉ báo khi robot đang chạy giữa các node

    int juncType = sensors.readJunctionType(); // 0=None, 1=Left, 2=Right, 3=T/Cross, 4=Unknown

    // Không phải ngã ba trái/phải → xóa bộ đếm chờ; về 0/4 → mở khóa latch
    if (juncType != 1 && juncType != 2)
    {
        junctionPendingType = 0;
        junctionPendingFrames = 0;
        if ((juncType == 0 || juncType == 4) && millis() >= junctionLatchUntil)
        {
            junctionLatched = false;
        }
        return;
    }

    if (junctionLatched)
        return; // Đã báo ngã ba này rồi — chờ rearm

    // Xác nhận cùng type qua nhiều lần đọc liên tiếp (chống nhiễu 1 lần đọc)
    if (junctionPendingType == juncType)
    {
        if (junctionPendingFrames < 255)
            junctionPendingFrames++;
    }
    else
    {
        junctionPendingType = juncType;
        junctionPendingFrames = 1;
    }

    if (junctionPendingFrames < JUNCTION_CONFIRM_FRAMES)
        return;

    // Đạt đủ số lần đọc ổn định → gửi đúng 1 lần
    junctionLatched = true;
    junctionPendingType = 0;
    junctionPendingFrames = 0;
    junctionLatchUntil = millis() + JUNCTION_REARM_MS;

    if (juncType == 1)
    {
        ble.sendMessage("WARN:turn_l");
        Serial.println("[JUNC] WARN:turn_l (LEFT)");
    }
    else
    {
        ble.sendMessage("WARN:turn_r");
        Serial.println("[JUNC] WARN:turn_r (RIGHT)");
    }
}
```

Gọi trong `loop()` (sau `checkGesture()`):

```cpp
checkBLECommands();
checkPIR();
checkSwitch();
checkGesture();
checkJunction();    // Ngã ba → WARN:turn_l/r (chỉ báo, không dừng)
```

Máy trạng thái trong `loop()`:

```cpp
switch (state.getState())
{
case RobotState::IDLE:        handleIdle();        break;
case RobotState::FOLLOW_LINE: handleFollowLine();  break;
case RobotState::WAIT_CLEAR:  handleWaitClear();   break;
case RobotState::AT_NODE:     handleAtNode();      break;
case RobotState::END:         handleEnd();         break;
}
```

### 2.8 `main.cpp` — handler không dừng chạy khi gặp người (WAIT_CLEAR / auto-resume)

```cpp
void handleWaitClear()
{
    motors.stop(); // Luôn đứng yên khi chờ đường thoáng

    // Đường thoáng = PIR im lặng liên tục trong PIR_CLEAR_CONFIRM_MS
    if (!sensors.readPIR())
    {
        if (pirClearSince == 0)
            pirClearSince = millis();
        if (millis() - pirClearSince >= PIR_CLEAR_CONFIRM_MS)
        {
            resumeAfterWarn();
            Serial.println("[STATE] Path clear -> auto resume");
        }
    }
    else
    {
        pirClearSince = 0;
    }

    // An toàn: hết hạn tối đa mà PIR vẫn báo liên tục → vẫn tự đi tiếp
    if (millis() >= warnClearDeadline)
    {
        resumeAfterWarn();
        Serial.println("[STATE] WARN timeout -> auto resume");
    }
}

void resumeAfterWarn()
{
    state.setState(RobotState::FOLLOW_LINE);
    motors.setSpeed(BASE_SPEED);
    MiniR4.LED.setColor(1, 0, 255, 0);
    ble.sendMessage("STATUS:auto_resumed");
    pirGraceUntil = millis() + PIR_GRACE_AFTER_LEAVE_MS; // Bỏ qua PIR một lát để kịp rời người
    pirClearSince = 0;
}
```

### 2.9 `main.cpp` — handleAtNode() (mở node cho app)

```cpp
void handleAtNode()
{
    if (state.isStateChanged())
    {
        Serial.println("[STATE] AT_NODE");
    }

    motors.stop(); // Dừng robot

    if (!nodeNotified)
    {
        ble.sendMessage("NODE_START:" + String(nodes.getCurrentNode()));
        nodeNotified = true;
        Serial.print("[NODE] Started: ");
        Serial.println(nodes.getCurrentNode());
    }
}
```

Tham chiếu thêm (ngoài phạm vi tóm tắt này):
- `ble_handler.h/.cpp` — gửi/nhận BLE
- `node_manager.h/.cpp` — 13 node, `completeCurrentNode()/nextNode()`
- `state_machine.h/.cpp` — trạng thái IDLE/FOLLOW_LINE/WAIT_CLEAR/AT_NODE/END

---

## 3. Giao thức BLE liên quan di chuyển (robot → app)

| Tín hiệu | Gửi khi | Mục đích |
|---|---|---|
| `NODE_START:<id>` | Tới node (đỏ ổn định 3 lần) | App tự mở màn hình node |
| `NODE_COMPLETE:<id>` | App báo `NODE_DONE`/`VOICE_NEXT` | Cập nhật bản đồ |
| `WARN:turn_l` / `WARN:turn_r` | Đang FOLLOW_LINE, ngã ba ổn định | Toast + TTS "đang rẽ trái/phải" (KHÔNG dừng) |
| `WARN:person` | PIR phát hiện người | Banner + TTS + dừng chờ đường thoáng (FOLLOW_LINE) |
| `STATUS:auto_resumed` | Hết chờ → tự chạy tiếp | Toast xác nhận |
| `ALL_DONE` | Xong node cuối | Kết thúc tour |

App đã hỗ trợ sẵn toàn bộ — không cần sửa app.

---

## 4. LỘ TRÌNH SỬ DỤNG & THỰC TEST

### Bước 0 — Chuẩn bị
1. Nạp firmware: `pio run -t upload` (PlatformIO, board uno_r4_wifi).
2. Mở Serial Monitor 9600: bật nguồn → thấy `[System] HeritageBuddy ready`, `[Sensor] All sensors initialised`.
3. Kiểm tra gesture init OK trên kênh 1: `[Sensor] Gesture sensor OK on channel 1` (nếu chưa thấy, chờ vài giây — firmware tự retry mỗi 2s).
4. Kết nối app ("HeritageBuddy") → LED xanh lá + `[BLE] Connected`.

### Bước 1 — Calibration Line Tracer (LÀM MỖI LẦN ĐỔI ĐỊA ĐIỂM/ÁNH SÁNG)
1. Robot ở trạng thái IDLE (chưa xuất phát), đặt trên sàn tại vị trí có line đen.
2. **Giữ BTN_UP** (nút trên robot) → sau 2s nghe **bíp 1 tiếng** kèm log `[CALIB] START`.
3. Trong 2 giây: **đẩy/nhấc robot lướt qua line đen và nền trắng** (quét cả hai vùng) — nhẹ nhàng.
4. Nghe **bíp 2 tiếng** + log `[CALIB] DONE` → sensor đã ghi min/max ánh sáng ngay tại hiện trường.
5. Gợi ý: làm 1 lần, quan sát `[LINE] w=` khi chạy thử — nếu `w` về 0 khi đang trên line tức ánh sáng thay đổi → calib lại.

### Bước 2 — Test bàn (robot đứng yên, không chạy)
| Test | Cách làm | Kỳ vọng |
|---|---|---|
| PIR | Vẫy tay trước PIR | Sau warm-up 60s: `[PIR] WARN:person` 1 lần/cooldown 3s; app banner + TTS |
| PIR giả lúc boot | Bật nguồn, không có người | **KHÔNG** xuất hiện WARN:person (fix mới) |
| Gesture | Vẫy tay trước sensor (cắm I2C2) | `[GESTURE] raw=9/10/13` → app nhận, chỉ hoạt động khi AT_NODE |
| Switch ngắn | Bấm nhả nhanh | `SWITCH_PRESS` → app mở "Hỏi Buddy" |
| Switch dài | Giữ ≥10s | `STATUS:sos` + LED đỏ + còi |

### Bước 3 — Test tuyến thật TỪNG PHẦN (mỗi phần 2–3 lần)
**3a. Bám line cơ bản (B1):**
1. Đặt robot trước line thẳng dài, nhả BTN_DOWN để xuất phát (hoặc app START).
2. Quan sát log `[LINE]` mỗi 2s: `err` dao động nhỏ (±1.5), `w` ổn định (2–4 khi line mảnh), robot chạy thẳng không rung lắc.
3. Nếu lắc mạnh / mất line liên tục → ghi log, thử calib lại; **KHÔNG đổi PID nếu V3 đã chạy ổn** (B1 cấm sửa).

**3b. Ngã ba → WARN:turn (B2 — test lõi):**
1. Chạy hướng tới ngã ba trái: app phải nhận đúng **1 lần** `WARN:turn_l` (toast + TTS "rẽ trái"), robot KHÔNG dừng.
2. Lặp lại với ngã ba phải → `WARN:turn_r` đúng 1 lần.
3. Tiêu chí "không báo trùng": tại mỗi ngã ba, Serial chỉ có **1 dòng `[JUNC]`**; app chỉ 1 toast.
4. Nếu báo trùng/sai → **hiệu chỉnh (chỉ được phép):**
   - Tăng `JUNCTION_CONFIRM_FRAMES` (3 → 5) nếu nhiễu 1-lần-đọc.
   - Tăng `JUNCTION_REARM_MS` (500 → 800) nếu type nhấp nháy 1-0-1-0.
   - Nếu library `getJunctionType()` vẫn nhiễu → **Phase 2 dự phòng**: chuyển sang phát hiện tự viết theo `WRO2026_B3_LineFollowing_Turns.md` §5 (width≥8 + kênh 1–4 trái / kênh 9&10 phải; cần thêm `SensorManager::readRawSensors()`). Xác nhận với tôi trước khi chuyển.

**3c. Node (Color Sensor):** ra tới cụm đỏ → `[STATE] Red detected -> AT_NODE` + `NODE_START:<id>` + app tự mở node. Đếm đủ 3 lần đọc ổn định.

**3d. PIR giữa đường (tích hợp di chuyển):** đang chạy → người bước vào → dừng + `WARN:person` → người đi khỏi → ≥2s im → `STATUS:auto_resumed` → chạy tiếp; vẫy liên tục → 10s timeout → vẫn tự chạy tiếp.

### Bước 4 — Tour đầy đủ + đo số liệu (GATE 1)
1. Chạy 1 tour 13 node hoàn chỉnh, ghi nhật ký Serial đầy đủ.
2. Đo (10 lần/lượt, lập bảng):

| Chỉ tiêu | Target | Đo bằng |
|---|---|---|
| `WARN:person` → banner + TTS trên app | <1s | Log app (timestamps) |
| Auto-resume end-to-end | <3s | Log app + firmware |
| `WARN:turn_*` → toast + TTS | <1s | Log app |
| SOS → robot dừng + `STATUS:sos` | <2s | Log firmware |
| Độ chính xác nhận diện node | giữ V3 (3 lần đọc ổn định) | Thống kê tour |
| Ngã ba → đúng 1 lần báo, không trùng | 100% | Đếm `[JUNC]` vs số ngã ba thực tế |

3. GATE 1 đạt khi: bám line ổn định + ngã ba báo đúng + node đúng + vòng PIR tự-resume hoạt động trên tuyến thật.

---

## 5. Bảng hiệu chỉnh (chỉ được phép đụng ở vùng này)

| Tham số | Giá trị mặc định | Khi nào chỉnh | Hướng |
|---|---|---|---|
| `LINE_THRESHOLD` | 50 | Bám line nhiễu, Log w sai | Nhỏ hơn nếu sàn tối; lớn hơn nếu sàn sáng — hoặc dùng calibration |
| `JUNCTION_CONFIRM_FRAMES` | 3 | Ngã ba báo nhầm thỉnh thoảng | Tăng lên 5 |
| `JUNCTION_REARM_MS` | 500 | Cùng ngã ba báo 2 lần | Tăng lên 800 |
| `BASE_SPEED` | 40 | Chạy chậm/quá nhanh theo yêu cầu | 35–50 |
| PID Kp/Ki/Kd | 0.8/0.02/0.5 | **KHÔNG đổi trừ khi V3 từng điều chỉnh** | Chỉ chỉnh có log + đồng ý team |
| `PIR_CLEAR_CONFIRM_MS` | 2000 | Tự resume quá nhanh/chậm | 1000–3000 |

> Nghiêm cấm đổi logic bám line (`followLine`, PID) — B1 yêu cầu giữ nguyên V3; mọi thay đổi ngoài bảng phải hỏi lại trước.

---

## 6. Troubleshooting nhanh

| Hiện tượng | Nguyên nhân | Xử lý |
|---|---|---|
| `[LINE] err` luôn ≈ ±4.5 hoặc `w=0` khi trên line | Calibration sai / ánh sáng đổi | Calib lại (Bước 1), kiểm tra dây line tracer I2C1 |
| `[JUNC]` không bao giờ ra hoặc báo sai | Ngưỡng thư viện lệch | Calib lại; nếu còn → Phase 2 custom |
| Ngã ba báo 2 lần | Rearm quá nhanh so với tốc độ rẽ | Tăng `JUNCTION_REARM_MS` |
| Robot bám line lắc mạnh | Rung cơ khí, tốc độ cao, threshold sai | Giảm BASE_SPEED, calib lại |
| Robot dừng liên tục vì WARN:person | PIR bắt chuyển động riêng (khách vẫy tay điều khiển) | Đã có `PIR_GRACE_AFTER_LEAVE_MS` 4s — kiểm tra log `[PIR] raw:` |
| BLE mất → robot đứng | `motors.stop()` an toàn khi mất kết nối | App auto-reconnect 3s; bấm RESUME nếu `STATUS:resumed` |

---

*Tham chiếu: `plan-ver2.md` (mục B) · `WRO2026_B3_LineFollowing_Turns.md` (code V3 cũ — bám cạnh, rẽ IMU) · `HUONG_DAN_MATRIX_LINE_TRACER_10CH.md` (API Line Tracer 10CH) · `TEST-INTERACTION.md` (test 5.x)*