# WRO 2026 B3 — Bám line, Rẽ trái/phải & Detect ngã rẽ

> Tổng hợp các khối code điều khiển robot di chuyển theo line, rẽ trái/phải và
> phát hiện ngã rẽ, trích nguyên văn từ dự án:
>
> - `C:\Users\thaol\Downloads\WRO 2026 B3\src\main.cpp` — logic chính
> - `C:\Users\thaol\Downloads\WRO 2026 B3\src\utils.cpp` — `turnByAngle`
> - `C:\Users\thaol\Downloads\WRO 2026 B3\include\utils.h` — cấu hình rẽ
>
> PlatformIO + Arduino, vi điều khiển Matrix Mini R4, line tracer 10 kênh
> (`MiniR4.I2C0.MXLineTracer`), IMU đọc yaw qua `MiniR4.Motion`.

---

## Bảng map vị trí

| Chức năng | File : dòng |
|---|---|
| Hằng số (motor, PID, junction, rẽ) | `src/main.cpp:8-59` |
| Điều khiển động cơ `setTankRaw` / `setTankSmoothed` | `src/main.cpp:232-245` |
| Tiến/lùi theo cm `driveForwardCm` / `driveStraightByCm` | `src/main.cpp:255-295` |
| Tính lỗi bám line `computeZoneFollowError` | `src/main.cpp:941` |
| PID `computePidCorrection` | `src/main.cpp:1061` |
| Bước bám line hoàn chỉnh `finishPidFollowStep` | `src/main.cpp:1163` |
| Bám cạnh trái `runPidFollowLeftEdgeStep` | `src/main.cpp:1188` |
| Bám cạnh phải `runPidFollowRightEdgeStep` | `src/main.cpp:1211` |
| Chọn mode `runPidLineFollowStep` | `src/main.cpp:1234` |
| Mất line `isLineLostBySensorRule` | `src/main.cpp:930` |
| Detect ngã rẽ trái `detectLeftEdgeJunctionTypeFromSensors` | `src/main.cpp:992` |
| Detect ngã rẽ phải `detectRightEdgeJunctionTypeFromSensors` | `src/main.cpp:999` |
| Cập nhật bộ đếm ngã rẽ `updateJunctionCounters` | `src/main.cpp:1092` |
| Đánh giá lý do dừng `evaluateStopReason` | `src/main.cpp:1147` |
| Rẽ theo góc IMU `RobotUtils::turnByAngle` | `src/utils.cpp:180` |
| Cấu hình rẽ `TurnConfig` / `TurnHardware` | `include/utils.h:183-225` |
| Hardware cho rẽ `turnMotors` / `readImuYaw` / `gTurnHw` | `src/main.cpp:508-529` |
| Rẽ góc vuông bằng line sensor `pt_can_vuong_goc` | `src/main.cpp:704` |
| Tìm line `ms_SeekRightLine` | `src/main.cpp:1730` |
| Đọc mosaic `ms_Mosaic_Reading` (xoay trái 90°) | `src/main.cpp:1782` |
| Nhiệm vụ mosaic `nv_Mosaic_Reading` (xoay trái/phải 90°) | `src/main.cpp:1950` |

---

## 1. Hằng số liên quan — `src/main.cpp:8-59`

```cpp
constexpr int MOTOR_MIN = -100;
constexpr int MOTOR_MAX = 100;
constexpr int BASE_SPEED = 46;
constexpr int MIN_BASE_SPEED = 24;
constexpr int MAX_CORRECTION = 72;
constexpr int MAX_MOTOR_STEP_PER_LOOP = 30;
constexpr uint8_t LINE_THRESHOLD = 30;
constexpr bool INVERT_LEFT = false;   // M3
constexpr bool INVERT_RIGHT = true;   // M4
constexpr uint32_t BTN_DEBOUNCE_MS = 120;
constexpr uint32_t LOOP_DT_MS = 3;
constexpr uint8_t JUNCTION_CONFIRM_FRAMES = 2;
constexpr uint32_t JUNCTION_REARM_MS = 140;
constexpr uint8_t EDGE_JUNCTION_MIN_WIDTH = 8;
constexpr uint8_t CUSTOM_JUNCTION_ACTIVE_THRESHOLD = 45;
constexpr uint8_t ZONE_FOLLOW_ACTIVE_THRESHOLD = 18;
constexpr uint8_t LINE_LOST_CONFIRM_FRAMES = 3;
constexpr uint8_t STOP_AT_LEFT_JUNCTION_COUNT = 2;
constexpr uint8_t STOP_AT_RIGHT_JUNCTION_COUNT = 2;
constexpr uint16_t SERVO_HOME_ANGLE = 0;
constexpr uint16_t SERVO_4_HOME_ANGLE = 90;
constexpr uint16_t BUZZER_LEFT_FREQUENCY = 700;
constexpr uint16_t BUZZER_RIGHT_FREQUENCY = 1000;
constexpr uint32_t BUZZER_JUNCTION_DURATION_MS = 35;
constexpr int      FORWARD_SPEED         = 40;    // tốc độ tiến thẳng
constexpr float    WHEEL_DIAMETER_CM     = 6.5f;  // HIỆU CHỈNH: đo đường kính bánh xe (cm)
constexpr float    FORWARD_PRE_TURN_CM   = 5.0f;  // tiến 5cm trước khi xoay
constexpr float    FORWARD_POST_TURN_CM  = 13.0f; // tiến 10cm sau khi xoay
constexpr uint8_t  SERVO_STEP_DEG         = 2;   // số độ mỗi bước (2° × 20ms ≈ 900ms/90°)
constexpr uint32_t SERVO_STEP_INTERVAL_MS = 20;  // thời gian chờ mỗi bước (ms)
constexpr char WIFI_AP_SSID[] = "WRO2026_B3";
constexpr char WIFI_AP_PASSWORD[] = "12345678";
constexpr uint16_t WEB_SERVER_PORT = 80;
constexpr size_t WEB_LOG_MAX_CHARS = 1800;
constexpr uint32_t WEB_UI_POLL_INTERVAL_MS = 1000;
constexpr int PT_ALIGN_FAST_BACKWARD_SPEED = -20;
constexpr int PT_ALIGN_SLOW_BACKWARD_SPEED = -18;
constexpr uint8_t PT_ALIGN_DARK_THRESHOLD = 65;
constexpr uint8_t PT_ALIGN_UNIFORM_THRESHOLD = 30;
constexpr uint32_t PT_ALIGN_STEP_TIMEOUT_MS = 1000;
constexpr uint32_t PT_ALIGN_MIN_MOVE_MS = 180;
constexpr uint8_t PT_ALIGN_STEP1_CONFIRM_FRAMES = 2;
constexpr uint8_t PT_ALIGN_STEP2_CONFIRM_FRAMES = 3;
constexpr uint32_t PT_ALIGN_LOG_INTERVAL_MS = 100;

constexpr float PID_KP = 18.0f;     // Giảm từ 26 để giảm overshoot và dao động
constexpr float PID_KI = 0.002f;     // Giảm từ 0.005 để tránh tích lũy nhiễu
constexpr float PID_KD = 2.0f;       // Tăng nhẹ để phản ứng nhanh hơn với thay đổi
constexpr float PID_INTEGRAL_LIMIT = 8.0f;   // Giảm để tránh integral windup
constexpr float ERROR_FILTER_ALPHA = 0.45f;  // Giảm để lọc mạnh hơn (0.65→0.45)
constexpr float ERROR_DEADBAND = 0.05f;    // Tăng để bỏ qua nhiễu nhỏ (0.03→0.05)
constexpr float DERIVATIVE_LIMIT = 15.0f;  // Giảm để tránh D bão hòa từ noise
```

### Struct trạng thái — `src/main.cpp:61-95`

```cpp
struct PidState {
  float integral = 0.0f;
  float prevError = 0.0f;
  float filteredError = 0.0f;
};

enum class FollowStopReason : uint8_t {
  None = 0,
  LineLost,
  LeftJunctionReached,
  RightJunctionReached,
};

enum class FollowPidMode : uint8_t {
  LeftEdge = 0,
  RightEdge = 1,
};

struct FollowPidConfig {
  uint8_t lineLostConfirmFrames = LINE_LOST_CONFIRM_FRAMES;
  uint8_t stopAtLeftJunctionCount = STOP_AT_LEFT_JUNCTION_COUNT;
  uint8_t stopAtRightJunctionCount = STOP_AT_RIGHT_JUNCTION_COUNT;
  uint32_t loopDtMs = LOOP_DT_MS;
  FollowPidMode mode = FollowPidMode::RightEdge;
};

struct FollowPidRuntime {
  uint8_t leftJunctionCount = 0;
  uint8_t rightJunctionCount = 0;
  uint8_t pendingJunctionType = 0;
  uint8_t pendingJunctionFrames = 0;
  uint32_t lastJunctionCountMs = 0;
  uint32_t junctionHoldUntilMs = 0;  // đóng băng followError=0 cho đến timestamp này
  bool junctionLatched = false;
};
```

---

## 2. Điều khiển động cơ — `src/main.cpp:223-249`

```cpp
int clampMotor(int value) {
  return constrain(value, MOTOR_MIN, MOTOR_MAX);
}

int limitMotorStep(int targetValue, int lastValue) {
  const int delta = constrain(targetValue - lastValue, -MAX_MOTOR_STEP_PER_LOOP, MAX_MOTOR_STEP_PER_LOOP);
  return clampMotor(lastValue + delta);
}

void setTankRaw(int left, int right) {
  const int leftOut = INVERT_LEFT ? -left : left;
  const int rightOut = INVERT_RIGHT ? -right : right;
  MiniR4.M3.setSpeed(clampMotor(leftOut));
  MiniR4.M4.setSpeed(clampMotor(rightOut));
  gLastLeftMotorCommand = clampMotor(left);
  gLastRightMotorCommand = clampMotor(right);
}

void setTankSmoothed(int left, int right) {
  const int limitedLeft = limitMotorStep(clampMotor(left), gLastLeftMotorCommand);
  const int limitedRight = limitMotorStep(clampMotor(right), gLastRightMotorCommand);
  setTankRaw(limitedLeft, limitedRight);
}

void stopRobot() {
  setTankRaw(0, 0);
}
```

---

## 3. Tiến / lùi theo quãng đường (encoder M3) — `src/main.cpp:251-295`

```cpp
// Di thang quang duong targetCm cm theo toc do co dau:
// - speed > 0: tien
// - speed < 0: lui
// Timeout 5s de tranh ket.
void driveForwardCm(int speed, float targetCm) {
  const int driveSpeed = clampMotor(speed);
  const float distanceCm = fabsf(targetCm);
  if (driveSpeed == 0 || distanceCm <= 0.0f) {
    stopRobot();
    return;
  }

  const float circumCm  = 3.14159f * WHEEL_DIAMETER_CM;
  const float targetDeg = (distanceCm / circumCm) * 360.0f;
  MiniR4.M3.resetCounter();
  setTankRaw(driveSpeed, driveSpeed);
  const uint32_t startMs = millis();
  while (true) {
    if (millis() - startMs > 5000) break;  // timeout 5s
    if (fabsf(static_cast<float>(MiniR4.M3.getDegrees())) >= targetDeg) break;
    delay(2);
  }
  setTankRaw(0, 0);
}

void driveStraightByCm(int speed, float targetCm) {
  const int driveSpeed = clampMotor(speed);
  const float distanceCm = fabsf(targetCm);
  if (driveSpeed == 0 || distanceCm <= 0.0f) {
    stopRobot();
    return;
  }

  const float circumCm  = 3.14159f * WHEEL_DIAMETER_CM;
  const float targetDeg = (distanceCm / circumCm) * 360.0f;
  MiniR4.M3.resetCounter();
  setTankRaw(driveSpeed, driveSpeed);
  const uint32_t startMs = millis();
  while (true) {
    if (millis() - startMs > 5000) break;  // timeout 5s
    if (fabsf(static_cast<float>(MiniR4.M3.getDegrees())) >= targetDeg) break;
    delay(2);
  }
  setTankRaw(0, 0);
}
```

---

## 4. PID bám line — `src/main.cpp`

### Tính lỗi bám (weighted centroid) — `:941`

```cpp
float computeZoneFollowError(const uint8_t sensors[10],
                            uint8_t startSensorId,
                            uint8_t endSensorId,
                            float targetSensorId) {
  float weightedSum = 0.0f;
  float totalWeight = 0.0f;

  for (uint8_t sensorId = startSensorId; sensorId <= endSensorId; ++sensorId) {
    const float lineIntensity = getLineIntensity(sensors[sensorId - 1]);
    if (lineIntensity > ZONE_FOLLOW_ACTIVE_THRESHOLD) {
      weightedSum += lineIntensity * sensorId;
      totalWeight += lineIntensity;
    }
  }

  if (totalWeight <= 0.0f) {
    return 0.0f;  // khong goi I2C: tra ve 0 de di thang, linelost se xu ly
  }

  const float position = weightedSum / totalWeight;
  return position - targetSensorId;
}
```

### PID controller — `:1061`

```cpp
// Ham PID
float computePidCorrection(float error, float dtSec) {
  float rawError = error;
  if (fabs(rawError) < ERROR_DEADBAND) {
    rawError = 0.0f;
  }

  gPid.filteredError += ERROR_FILTER_ALPHA * (rawError - gPid.filteredError);
  const float filteredError = gPid.filteredError;

  gPid.integral += rawError * dtSec;
  gPid.integral = constrain(gPid.integral, -PID_INTEGRAL_LIMIT, PID_INTEGRAL_LIMIT);

  float derivative = 0.0f;
  if (dtSec > 0.0001f) {
    derivative = (filteredError - gPid.prevError) / dtSec;
  }
  derivative = constrain(derivative, -DERIVATIVE_LIMIT, DERIVATIVE_LIMIT);

  gPid.prevError = filteredError;
  const float correction = PID_KP * rawError + PID_KI * gPid.integral + PID_KD * derivative;
  return constrain(correction, -MAX_CORRECTION, MAX_CORRECTION);
}
```

### Bước bám line hoàn chỉnh — `:1163`

```cpp
FollowStopReason finishPidFollowStep(const FollowPidConfig& cfg,
                                     FollowPidRuntime& runtime,
                                     const uint8_t sensors[10],
                                     float followError,
                                     uint8_t junctionType,
                                     float dtSec) {
  updateJunctionCounters(junctionType, runtime);

  const FollowStopReason reason = evaluateStopReason(cfg, runtime, sensors);
  if (reason != FollowStopReason::None) {
    stopRobot();
    return reason;
  }

  const float correction = computePidCorrection(followError, dtSec);
  const float turnDemand = fabs(followError);
  int base = BASE_SPEED - static_cast<int>(turnDemand * 4.2f);
  base = constrain(base, MIN_BASE_SPEED, BASE_SPEED);

  const int left = static_cast<int>(base + correction);
  const int right = static_cast<int>(base - correction);
  setTankRaw(left, right);
  return FollowStopReason::None;
}
```

### Bám cạnh trái — `:1188`

```cpp
FollowStopReason runPidFollowLeftEdgeStep(const FollowPidConfig& cfg,
                                          FollowPidRuntime& runtime,
                                          uint32_t nowMs,
                                          uint8_t stopEdgeCount = 0) {
  const float dtSec = computeDtSec(nowMs, gLastLoopMs, cfg.loopDtMs);
  gLastLoopMs = nowMs;

  uint8_t sensors[10] = {0};
  if (!readLineSensors(sensors)) {
    stopRobot();
    return FollowStopReason::LineLost;
  }

  // stopEdgeCount > 0: dung sau khi dem du so canh trai; = 0: chi dung khi mat line.
  FollowPidConfig localCfg = cfg;
  localCfg.stopAtLeftJunctionCount = stopEdgeCount;

  // LEFT_EDGE: kenh 1-5 bam line (target 3.0); kenh 1-4 nhan biet nga re trai.
  const float followError = computeZoneFollowError(sensors, 1, 5, 3.0f);
  const uint8_t junctionType = detectLeftEdgeJunctionTypeFromSensors(sensors);
  return finishPidFollowStep(localCfg, runtime, sensors, followError, junctionType, dtSec);
}
```

### Bám cạnh phải — `:1211`

```cpp
FollowStopReason runPidFollowRightEdgeStep(const FollowPidConfig& cfg,
                                           FollowPidRuntime& runtime,
                                           uint32_t nowMs,
                                           uint8_t stopEdgeCount = 0) {
  const float dtSec = computeDtSec(nowMs, gLastLoopMs, cfg.loopDtMs);
  gLastLoopMs = nowMs;

  uint8_t sensors[10] = {0};
  if (!readLineSensors(sensors)) {
    stopRobot();
    return FollowStopReason::LineLost;
  }

  // stopEdgeCount > 0: dung sau khi dem du so canh phai; = 0: chi dung khi mat line.
  FollowPidConfig localCfg = cfg;
  localCfg.stopAtRightJunctionCount = stopEdgeCount;

  // RIGHT_EDGE: kenh 1-6 bam line (target 3.5); kenh 8-10 + width>=8 nhan biet nga re phai.
  const float followError = computeZoneFollowError(sensors, 1, 6, 3.5f);
  const uint8_t junctionType = detectRightEdgeJunctionTypeFromSensors(sensors);
  return finishPidFollowStep(localCfg, runtime, sensors, followError, junctionType, dtSec);
}
```

### Chọn mode — `:1234`

```cpp
FollowStopReason runPidLineFollowStep(const FollowPidConfig& cfg, FollowPidRuntime& runtime, uint32_t nowMs, uint8_t stopEdgeCount = 0) {
  switch (cfg.mode) {
    case FollowPidMode::LeftEdge:
      return runPidFollowLeftEdgeStep(cfg, runtime, nowMs, stopEdgeCount);
    case FollowPidMode::RightEdge:
    default:
      return runPidFollowRightEdgeStep(cfg, runtime, nowMs, stopEdgeCount);
  }
}
```

---

## 5. Detect ngã rẽ — `src/main.cpp`

### Mất line — `:930`

```cpp
// Kiem tra mat line tu sensor array da doc — khong goi I2C them.
// Dung cung nguong voi thu vien (LINE_THRESHOLD=30 → intensity > 70)
// de dam bao nhat quan voi getLineWidth() cua hardware.
bool isLineLostBySensorRule(const uint8_t sensors[10]) {
  constexpr uint8_t kLostIntensityThreshold = 100u - LINE_THRESHOLD;  // = 70
  uint8_t activeCount = 0;
  for (uint8_t i = 0; i < 10; ++i) {
    if (getLineIntensity(sensors[i]) > kLostIntensityThreshold) {
      ++activeCount;
    }
  }
  return activeCount < 2;
}
```

### Đếm sensor active & tính bề rộng line — `:964-990`

```cpp
uint8_t countActiveSensorsInRange(const uint8_t sensors[10], uint8_t startSensorId, uint8_t endSensorId) {
  uint8_t activeCount = 0;
  for (uint8_t sensorId = startSensorId; sensorId <= endSensorId; ++sensorId) {
    if (getLineIntensity(sensors[sensorId - 1]) > CUSTOM_JUNCTION_ACTIVE_THRESHOLD) {
      ++activeCount;
    }
  }
  return activeCount;
}

// Tính line width từ sensor array dùng cùng ngưỡng CUSTOM_JUNCTION_ACTIVE_THRESHOLD.
// Không dùng getLineWidth() vì thư viện dùng LINE_THRESHOLD=30 còn countActiveSensorsInRange
// dùng CUSTOM_JUNCTION_ACTIVE_THRESHOLD=45 — hai ngưỡng khác nhau gây junctionType dao động
// 0↔2 mỗi frame → followError đổi dấu liên tục → rung lắc.
uint8_t computeLineWidthFromSensors(const uint8_t sensors[10]) {
  uint8_t count = 0;
  for (uint8_t i = 0; i < 10; ++i) {
    if (getLineIntensity(sensors[i]) > CUSTOM_JUNCTION_ACTIVE_THRESHOLD) {
      ++count;
    }
  }
  return count;
}

bool isEdgeJunctionWidth(uint8_t width) {
  return width >= EDGE_JUNCTION_MIN_WIDTH;
}
```

### Ngã rẽ trái — `:992`

```cpp
uint8_t detectLeftEdgeJunctionTypeFromSensors(const uint8_t sensors[10]) {
  // Two-gate: width>=8 blocks false positives from vibration noise,
  // AND channels 1-4 active >= 3 confirms the left edge line.
  if (!isEdgeJunctionWidth(computeLineWidthFromSensors(sensors))) return 0;
  return countActiveSensorsInRange(sensors, 1, 4) >= 3 ? 1 : 0;
}
```

### Ngã rẽ phải — `:999`

```cpp
uint8_t detectRightEdgeJunctionTypeFromSensors(const uint8_t sensors[10]) {
  // Gate 1: width >= 8 (chong false positive tu rung lac).
  if (!isEdgeJunctionWidth(computeLineWidthFromSensors(sensors))) return 0;
  // Gate 2: kenh 9 VA kenh 10 phai cung active → xac nhan canh phai ro rang.
  const bool ch9Active  = getLineIntensity(sensors[8]) > CUSTOM_JUNCTION_ACTIVE_THRESHOLD;
  const bool ch10Active = getLineIntensity(sensors[9]) > CUSTOM_JUNCTION_ACTIVE_THRESHOLD;
  return (ch9Active && ch10Active) ? 2 : 0;
}

uint8_t detectJunctionTypeForMode(const uint8_t sensors[10], FollowPidMode mode) {
  switch (mode) {
    case FollowPidMode::LeftEdge:
      return detectLeftEdgeJunctionTypeFromSensors(sensors);
    case FollowPidMode::RightEdge:
    default:
      return detectRightEdgeJunctionTypeFromSensors(sensors);
  }
}
```

### Cập nhật bộ đếm ngã rẽ — `:1092`

```cpp
void updateJunctionCounters(uint8_t junctionType, FollowPidRuntime& runtime) {
  const uint32_t now = millis();

  // 0/4: khong phat hien giao diem, chi mo latch lai sau khoang rearm.
  if (junctionType == 0 || junctionType == 4) {
    runtime.pendingJunctionType = 0;
    runtime.pendingJunctionFrames = 0;
    if (now - runtime.lastJunctionCountMs >= JUNCTION_REARM_MS) {
      runtime.junctionLatched = false;
    }
    return;
  }

  if (runtime.junctionLatched) {
    return;
  }

  // Xac nhan cung 1 loai giao diem qua nhieu frame de tranh nhiu.
  if (runtime.pendingJunctionType == junctionType) {
    if (runtime.pendingJunctionFrames < 255) {
      ++runtime.pendingJunctionFrames;
    }
  } else {
    runtime.pendingJunctionType = junctionType;
    runtime.pendingJunctionFrames = 1;
  }

  if (runtime.pendingJunctionFrames < JUNCTION_CONFIRM_FRAMES) {
    return;
  }

  runtime.junctionLatched = true;
  runtime.lastJunctionCountMs = now;
  runtime.pendingJunctionType = 0;
  runtime.pendingJunctionFrames = 0;

  if (junctionType != 1 && junctionType != 2) {
    return;
  }
  if (junctionType == 1) {
    if (runtime.leftJunctionCount < 255) {
      ++runtime.leftJunctionCount;
    }
    playJunctionTone(junctionType);
    printJunctionEvent(junctionType, runtime);
  }
  if (junctionType == 2) {
    if (runtime.rightJunctionCount < 255) {
      ++runtime.rightJunctionCount;
    }
    playJunctionTone(junctionType);
    printJunctionEvent(junctionType, runtime);
  }
}
```

### Đánh giá lý do dừng — `:1147`

```cpp
FollowStopReason evaluateStopReason(const FollowPidConfig& cfg,
                                    const FollowPidRuntime& runtime,
                                    const uint8_t sensors[10]) {
  if (isLineLostBySensorRule(sensors)) {
    return FollowStopReason::LineLost;
  }
  if (cfg.stopAtLeftJunctionCount > 0 && runtime.leftJunctionCount >= cfg.stopAtLeftJunctionCount) {
    return FollowStopReason::LeftJunctionReached;
  }
  if (cfg.stopAtRightJunctionCount > 0 && runtime.rightJunctionCount >= cfg.stopAtRightJunctionCount) {
    return FollowStopReason::RightJunctionReached;
  }

  return FollowStopReason::None;
}
```

---

## 6. Rẽ theo góc IMU — `src/utils.cpp:180` + `include/utils.h`

### Cấu hình & hardware — `include/utils.h:183-225`

```cpp
enum class TurnDirection : uint8_t {
  Left  = 0,
  Right = 1,
};

/**
 * Cấu hình xoay robot tại chỗ — tất cả tham số có thể hiệu chỉnh tại runtime.
 */
struct TurnConfig {
  TurnDirection direction    = TurnDirection::Right;
  float         targetDeg    = 90.0f;   ///< Góc cần xoay (luôn dương, độ)
  int           fullSpeed    = 40;      ///< % tốc độ khi xa đích
  int           slowSpeed    = 18;      ///< % tốc độ khi vào vùng giảm tốc
  float         decelZoneDeg = 20.0f;   ///< Bắt đầu giảm tốc khi còn bao nhiêu °
  float         toleranceDeg = 3.0f;    ///< Sai số chấp nhận → dừng
  uint32_t      timeoutMs    = 3000;    ///< Timeout an toàn tối đa (ms)
};

/**
 * Callbacks cung cấp tầng phần cứng cho turnByAngle.
 * Tách biệt hoàn toàn logic xoay khỏi hardware cụ thể.
 */
struct TurnHardware {
  void  (*setMotors)(int leftSpeed, int rightSpeed); ///< Điều khiển 2 bánh
  float (*readYawDeg)();                              ///< Đọc góc Yaw (°, có dấu, tính từ lúc reset)
  void  (*resetYaw)();                               ///< Reset bộ tích phân Yaw về 0
};
```

### Hàm xoay — `src/utils.cpp:180`

```cpp
void turnByAngle(const TurnConfig& cfg, const TurnHardware& hw) {
  hw.resetYaw();

  const uint32_t startMs = millis();

  while (true) {
    if (millis() - startMs >= cfg.timeoutMs) {
      break;  // timeout — dừng an toàn
    }

    const float turned    = fabsf(hw.readYawDeg());
    const float remaining = cfg.targetDeg - turned;

    if (remaining <= cfg.toleranceDeg) {
      break;  // đã đến góc mục tiêu
    }

    const int spd = (remaining <= cfg.decelZoneDeg) ? cfg.slowSpeed : cfg.fullSpeed;

    if (cfg.direction == TurnDirection::Right) {
      hw.setMotors( spd, -spd);  // bánh trái tiến, bánh phải lùi → xoay phải
    } else {
      hw.setMotors(-spd,  spd);  // bánh trái lùi, bánh phải tiến → xoay trái
    }
  }

  hw.setMotors(0, 0);  // dừng động cơ sau khi xoay xong
}
```

### Hardware callbacks — `src/main.cpp:508-529`

```cpp
// ── Hardware callbacks cho RobotUtils::turnByAngle ───────────────────────────
void turnMotors(int l, int r) { setTankRaw(l, r); }

float readImuYaw() {
  return static_cast<float>(MiniR4.Motion.getEuler(MiniR4Motion::AxisType::Roll));
}

void resetImuYaw() { MiniR4.Motion.resetIMUValues(); delay(100); }

// Singleton hardware descriptor — truyền vào turnByAngle mỗi lần gọi.
const RobotUtils::TurnHardware gTurnHw = { turnMotors, readImuYaw, resetImuYaw };
```

---

## 7. Rẽ góc vuông bằng line sensor — `pt_can_vuong_goc` `src/main.cpp:704`

Căn robot vuông góc với line bằng cách lui/xoay từng bánh, kiểm tra cụm cảm
biến line. Hướng `LuiTrai` (cảm biến trước) / `LuiPhai` (cảm biến sau).

```cpp
bool pt_can_vuong_goc(PtCanVuongGocDirection direction) {
  appendWebLog(String("PT_CAN_VUONG_GOC start dir=") + toPtCanVuongGocDirectionText(direction));

  const int slowForwardSpeed = abs(PT_ALIGN_SLOW_BACKWARD_SPEED)/2;

  auto areSensorsDark = [&](const uint8_t sensors[10], const uint8_t ids[], uint8_t idCount) {
    for (uint8_t i = 0; i < idCount; ++i) {
      if (!isSensorDark(sensors, ids[i], PT_ALIGN_DARK_THRESHOLD)) {
        return false;
      }
    }
    return true;
  };

  auto areSensorsNotDark = [&](const uint8_t sensors[10], const uint8_t ids[], uint8_t idCount) {
    for (uint8_t i = 0; i < idCount; ++i) {
      if (isSensorDark(sensors, ids[i], PT_ALIGN_DARK_THRESHOLD)) {
        return false;
      }
    }
    return true;
  };

auto areAllSensorsDark = [&](const uint8_t sensors[10]) {
    const PtAlignSensorStats stats = computePtAlignSensorStats(sensors);
    return stats.darkCount >= 10;
  };

  // Check if all sensors are on the line (all similar intensity -> all dark or all gray)
  auto areAllSensorsOnLine = [&](const uint8_t sensors[10]) {
    const PtAlignSensorStats stats = computePtAlignSensorStats(sensors);
    // All on line if: all dark OR all gray (not dark but all similar)
    const bool allDark = (stats.darkCount >= 10);
    const bool allGrayOnLine = (stats.lineActiveCount >= 10) && ((stats.maxIntensity - stats.minIntensity) <= PT_ALIGN_UNIFORM_THRESHOLD);
    return allDark || allGrayOnLine;
  };

  const uint8_t frontGroup[3] = {1, 2, 3};
  const uint8_t rearGroup[4] = {7, 8, 9, 10};

  const uint8_t* step1Group = (direction == PtCanVuongGocDirection::LuiTrai) ? frontGroup : rearGroup;
  const uint8_t step1Count = (direction == PtCanVuongGocDirection::LuiTrai) ? 3 : 4;
  const uint8_t* step3Group = (direction == PtCanVuongGocDirection::LuiTrai) ? rearGroup : frontGroup;
  const uint8_t step3Count = (direction == PtCanVuongGocDirection::LuiTrai) ? 4 : 3;

  // Step 1: lui 2 banh den khi cum sensor dau vao line den.
  {
    const uint32_t startedMs = millis();
    uint8_t reachedFrames = 0;

    while (millis() - startedMs < PT_ALIGN_STEP_TIMEOUT_MS) {
      handleWebControl();
      tickAllServoSteps();
      setTankRaw(PT_ALIGN_FAST_BACKWARD_SPEED, PT_ALIGN_FAST_BACKWARD_SPEED);

      uint8_t sensors[10] = {0};
      if (!readLineSensors(sensors)) {
        delay(2);
        continue;
      }

      const bool reached = areSensorsDark(sensors, step1Group, step1Count);
      const bool passedMinMoveTime = (millis() - startedMs) >= PT_ALIGN_MIN_MOVE_MS;
      if (reached) {
        if (reachedFrames < 255) {
          ++reachedFrames;
        }
      } else {
        reachedFrames = 0;
      }

      if (passedMinMoveTime && reachedFrames >= PT_ALIGN_STEP1_CONFIRM_FRAMES) {
        break;
      }

      delay(2);
    }

    stopRobot();
    if (millis() - startedMs >= PT_ALIGN_STEP_TIMEOUT_MS) {
      appendWebLog("PT_CAN_VUONG_GOC timeout step=1");
      return false;
    }
  }

  // Step 2: tien cham den khi cum sensor step1 roi khoi line den.
  {
    const uint32_t startedMs = millis();
    uint8_t reachedFrames = 0;

    while (millis() - startedMs < PT_ALIGN_STEP_TIMEOUT_MS) {
      handleWebControl();
      tickAllServoSteps();
      setTankRaw(slowForwardSpeed, slowForwardSpeed);

      uint8_t sensors[10] = {0};
      if (!readLineSensors(sensors)) {
        delay(2);
        continue;
      }

      const bool reached = areSensorsNotDark(sensors, step1Group, step1Count);
      const bool passedMinMoveTime = (millis() - startedMs) >= PT_ALIGN_MIN_MOVE_MS;
      if (reached) {
        if (reachedFrames < 255) {
          ++reachedFrames;
        }
      } else {
        reachedFrames = 0;
      }

      if (passedMinMoveTime && reachedFrames >= PT_ALIGN_STEP1_CONFIRM_FRAMES) {
        break;
      }

      delay(2);
    }

    stopRobot();
    if (millis() - startedMs >= PT_ALIGN_STEP_TIMEOUT_MS) {
      appendWebLog("PT_CAN_VUONG_GOC timeout step=2");
      return false;
    }
  }

// Step 3: xoay lui 1 banh den khi cum doi dien vao line den.
  // Kiem tra neu ca 10 kenh deu tren line (do xam bang nhau, deu mau den) thi dung lai.
  {
    const uint32_t startedMs = millis();
    uint8_t reachedFrames = 0;

    while (millis() - startedMs < PT_ALIGN_STEP_TIMEOUT_MS) {
      handleWebControl();
      tickAllServoSteps();

      if (direction == PtCanVuongGocDirection::LuiTrai) {
        setTankRaw(0, PT_ALIGN_SLOW_BACKWARD_SPEED);      // lui banh phai
      } else {
        setTankRaw(PT_ALIGN_SLOW_BACKWARD_SPEED, 0);      // lui banh trai
      }

      uint8_t sensors[10] = {0};
      if (!readLineSensors(sensors)) {
        delay(2);
        continue;
      }

      // Kiem tra neu ca 10 kenh deu tren line thi dung lai ngay
      const bool allOnLine = areAllSensorsOnLine(sensors);
      const bool reached = allOnLine || areSensorsDark(sensors, step3Group, step3Count);
      const bool passedMinMoveTime = (millis() - startedMs) >= PT_ALIGN_MIN_MOVE_MS;
      if (reached) {
        if (reachedFrames < 255) {
          ++reachedFrames;
        }
      } else {
        reachedFrames = 0;
      }

      if (passedMinMoveTime && reachedFrames >= PT_ALIGN_STEP2_CONFIRM_FRAMES) {
        break;
      }

      delay(2);
    }

    stopRobot();
    if (millis() - startedMs >= PT_ALIGN_STEP_TIMEOUT_MS) {
      appendWebLog("PT_CAN_VUONG_GOC timeout step=3");
      return false;
    }
  }

  // Step 4: xoay lui banh con lai den khi ca 10 kenh cung den.
  {
    const uint32_t startedMs = millis();
    uint8_t reachedFrames = 0;

    while (millis() - startedMs < PT_ALIGN_STEP_TIMEOUT_MS) {
      handleWebControl();
      tickAllServoSteps();

      // Xoay voi 1 banh (doi xung voi step 3)
      if (direction == PtCanVuongGocDirection::LuiTrai) {
        setTankRaw(PT_ALIGN_SLOW_BACKWARD_SPEED, 0);      // lui banh trai
      } else {
        setTankRaw(0, PT_ALIGN_SLOW_BACKWARD_SPEED);      // lui banh phai
      }

      uint8_t sensors[10] = {0};
      if (!readLineSensors(sensors)) {
        delay(1);
        continue;
      }

      const bool reached = areAllSensorsDark(sensors);
      const bool passedMinMoveTime = (millis() - startedMs) >= PT_ALIGN_MIN_MOVE_MS;
      if (reached) {
        if (reachedFrames < 255) {
          ++reachedFrames;
        }
      } else {
        reachedFrames = 0;
      }

      if (passedMinMoveTime && reachedFrames >= PT_ALIGN_STEP2_CONFIRM_FRAMES) {
        break;
      }

      delay(1);
    }

    stopRobot();
    if (millis() - startedMs >= PT_ALIGN_STEP_TIMEOUT_MS) {
      appendWebLog("PT_CAN_VUONG_GOC timeout step=4");
      return false;
    }
  }

  appendWebLog("PT_CAN_VUONG_GOC done");
  return true;
}
```

---

## 8. Quy trình rẽ trong nhiệm vụ

### Tìm line — `ms_SeekRightLine` `src/main.cpp:1730`

Quy trình: tiến 10cm → xoay trái 20° → tiến tới khi gặp line đen (width ≥ 2)
→ tiến thêm 12cm → xoay phải 20°.

```cpp
void ms_SeekRightLine() {
  RobotUtils::TurnConfig turnCfg;
  turnCfg.fullSpeed    = 40;
  turnCfg.slowSpeed    = 25;
  turnCfg.targetDeg    = 20.0f;
  turnCfg.decelZoneDeg = 10.0f;
  turnCfg.toleranceDeg = 3.0f;
  turnCfg.timeoutMs    = 3000;

  // ── Bước 1: tiến 15cm ────────────────────────────────────────────────────
  appendWebLog("SEEK_RIGHT: step1 fwd 10cm");
  driveForwardCm(FORWARD_SPEED, 10.0f);
  appendWebLog(String("SEEK_RIGHT: step1 done enc=") + MiniR4.M3.getDegrees());

  // ── Bước 2: xoay trái 20° ────────────────────────────────────────────────
  appendWebLog("SEEK_RIGHT: step2 turn left 30deg");
  turnCfg.direction = RobotUtils::TurnDirection::Left;
  RobotUtils::turnByAngle(turnCfg, gTurnHw);
  delay(150);
  appendWebLog("SEEK_RIGHT: step2 done");

  // ── Bước 3: tiến đến khi gặp line đen ────────────────────────────────────
  appendWebLog("SEEK_RIGHT: step3 fwd until line");
  setTankRaw(FORWARD_SPEED, FORWARD_SPEED);
  const uint32_t step3StartMs = millis();
  while (true) {
    if (millis() - step3StartMs > 8000UL) break;  // timeout 8s
    if (MiniR4.I2C0.MXLineTracer.getLineWidth() >= 2) break;
    delay(2);
  }
  setTankRaw(0, 0);
  appendWebLog(String("SEEK_RIGHT: step3 done w=")
               + MiniR4.I2C0.MXLineTracer.getLineWidth());

  // ── Bước 4: tiến thêm 12cm ─────────────────────────────────────────────────
  appendWebLog("SEEK_RIGHT: step4 fwd 12cm");
  driveForwardCm(FORWARD_SPEED, 12.0f);
  appendWebLog(String("SEEK_RIGHT: step4 done enc=") + MiniR4.M3.getDegrees());

  // ── Bước 5: xoay phải 20° ────────────────────────────────────────────────
  appendWebLog("SEEK_RIGHT: step5 turn right 20deg");
  turnCfg.direction = RobotUtils::TurnDirection::Right;
  RobotUtils::turnByAngle(turnCfg, gTurnHw);
  delay(150);
  appendWebLog("SEEK_RIGHT: step5 done (stop)");
}
```

### Đọc mosaic — `ms_Mosaic_Reading` `src/main.cpp:1782`

Bám cạnh phải đếm đủ 2 cạnh → tiến 5cm → **xoay trái 90°** → tiến 13cm.

```cpp
void ms_Mosaic_Reading() {
  // Bước 1: PID bám cạnh phải đến khi đủ 2 cạnh.
  gFollowCfg.mode = FollowPidMode::RightEdge;
  FollowStopReason reason = FollowStopReason::None;
  while (reason == FollowStopReason::None) {
    handleWebControl();
    //handleDumpBySerial();
    //processManualDumpRequest();
    tickAllServoSteps();
    const uint32_t now = millis();
    if (now - gLastLoopMs < gFollowCfg.loopDtMs) continue;
    gLastLoopMs = now;
    reason = runPidLineFollowStep(gFollowCfg, gFollowRt, now, STOP_AT_RIGHT_JUNCTION_COUNT);
  }

  gStopReason = reason;
  printPidStopSummary(reason, gFollowRt);
  appendWebLog(String("PID_STOP reason=") + toStopReasonText(reason) +
               " mode=" + toFollowModeText(gFollowCfg.mode) +
               " L=" + String(gFollowRt.leftJunctionCount) +
               " R=" + String(gFollowRt.rightJunctionCount));

  if (reason != FollowStopReason::RightJunctionReached) return;

  RobotUtils::TurnConfig turnCfg;
  turnCfg.direction    = RobotUtils::TurnDirection::Left;
  turnCfg.targetDeg    = 79.0f;  // 90° - ~16° quán tính đo được
  turnCfg.fullSpeed    = 40;
  turnCfg.slowSpeed    = 18;
  turnCfg.decelZoneDeg = 20.0f;
  turnCfg.toleranceDeg = 3.0f;
  turnCfg.timeoutMs    = 3000;

  // Bước 2: tiến 5cm trước khi xoay (encoder M3)
  appendWebLog(String("FWD_PRE_TURN ") + String(FORWARD_PRE_TURN_CM, 1) + "cm start");
  driveForwardCm(FORWARD_SPEED, FORWARD_PRE_TURN_CM);
  appendWebLog(String("FWD_PRE_TURN done enc=") + MiniR4.M3.getDegrees());

  // Bước 3: xoay trái 90°
  appendWebLog("TURN_LEFT 90deg start");
  RobotUtils::turnByAngle(turnCfg, gTurnHw);
  const float angleAtStop = static_cast<float>(MiniR4.Motion.getEuler(MiniR4Motion::AxisType::Roll));
  delay(300);
  const float angleSettled = static_cast<float>(MiniR4.Motion.getEuler(MiniR4Motion::AxisType::Roll));
  appendWebLog(String("TURN_DONE at_stop=") + String(angleAtStop, 1)
               + " settled=" + String(angleSettled, 1)
               + " overshoot=" + String(fabsf(angleSettled) - 90.0f, 1));
  appendWebLog("TURN_LEFT 90deg done");

  // Bước 4: tiến 13cm sau khi xoay (encoder M3)
  appendWebLog(String("FWD_POST_TURN ") + String(FORWARD_POST_TURN_CM, 1) + "cm start");
  driveForwardCm(FORWARD_SPEED, FORWARD_POST_TURN_CM);
  appendWebLog(String("FWD_POST_TURN done enc=") + MiniR4.M3.getDegrees());
}
```

### Nhiệm vụ mosaic tổng hợp — `nv_Mosaic_Reading` `src/main.cpp:1950`

Sau khi đọc xong mosaic: lùi 15cm → căn vuông góc (`pt_can_vuong_goc LuiTrai`)
→ tiến 5cm → **xoay trái 90°** → bám line phải tới khi laser < 500mm
→ **xoay phải 90°**.

```cpp
void nv_Mosaic_Reading() {
   //Robot sẽ chạy quy trình đọc mosaic khi nhận được yêu cầu từ web hoặc nút DOWN, không phụ thuộc vào gIsRunning để đảm bảo quá trình đọc mosaic không bị gián đoạn bởi các yếu tố khác.
    ms_RunToMosaic();
    //robot lùi 20cm để tránh chắn trước và chuẩn bị cho căn vuông góc với line tiếp theo.
    driveStraightByCm(-FORWARD_SPEED, 15.0f);
    appendWebLog("BTN_DOWN trigger PT_CAN_VUONG_GOC");
    pt_can_vuong_goc(PtCanVuongGocDirection::LuiTrai);
    //tiến lên 3cm để ra khỏi vị trí giao nhau hiện tại.
    driveStraightByCm(FORWARD_SPEED, 5.0f);
    //xoay trai 90° để chuẩn bị cho việc tìm line tiếp theo.
    RobotUtils::TurnConfig turnCfg;
    turnCfg.direction    = RobotUtils::TurnDirection::Left;
    turnCfg.targetDeg    = 79.0f;
    turnCfg.fullSpeed    = 40;
    turnCfg.slowSpeed    = 18;
    turnCfg.decelZoneDeg = 20.0f;
    turnCfg.toleranceDeg = 3.0f;
    turnCfg.timeoutMs    = 3000;
    appendWebLog("BTN_DOWN trigger TURN_LEFT_90");
    RobotUtils::turnByAngle(turnCfg, gTurnHw);
    //chay theo line phải cho đến khi cảm biến laser đo được khoảng cách dưới 15cm, tối đa 10s, yêu cầu phải ổn định trong 3 frame liên tiếp để đảm bảo đọc được mosaic ở vị trí mới.
    followLineUntilLaserBelow(FollowPidMode::RightEdge, 500, 10000, 3);
    //xoay phải 90° để chuẩn bị cho việc tìm line tiếp theo.
    turnCfg.direction = RobotUtils::TurnDirection::Right;
    appendWebLog("BTN_DOWN trigger TURN_RIGHT_90");
    RobotUtils::turnByAngle(turnCfg, gTurnHw);
    // lùi robot 2s để căn cạnh xa bàn
    //driveStraightByCm(FORWARD_SPEED, 8.0f);
}
```

---

## 9. Chú thích quan trọng

- **Góc 90° có bù quán tính**: `turnCfg.targetDeg = 79.0f` thay vì 90°, vì robot
  còn trôi quán tính ~16° sau khi cắt động cơ (đo thực nghiệm, `ms_Mosaic_Reading:1808`).
- **Ngã rẽ trái/phải phân biệt bằng cụm sensor**: trái = kênh 1–4, phải = kênh
  9+10, luôn kèm điều kiện bề rộng line `width ≥ 8` để chống false-positive do rung.
- **Hai ngưỡng khác nhau**: `LINE_THRESHOLD=30` (thư viện) vs
  `CUSTOM_JUNCTION_ACTIVE_THRESHOLD=45` (code tự tính) — phải dùng nhất quán
  trong `computeLineWidthFromSensors` để tránh junction dao động (`main.cpp:974-977`).
- **`loop()` hiện tại** (`main.cpp:2251-2263`) đang chạy chế độ test
  `followLineUntilLaserBelow` + `runtoMissionBlock`, chưa gọi các quy trình rẽ
  hoàn chỉnh như `nv_Mosaic_Reading`.
