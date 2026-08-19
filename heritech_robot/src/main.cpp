// HeritageBuddy Robot — line follow -> red detect -> Node 1
// + PIR motion detection + Gesture + Switch (SOS)
// + Turn right 90° -> follow to left junction

#include <MatrixMiniR4.h>
#include "config.h"
#include "ble_handler.h"
#include "sensor_manager.h"
#include "motor_control.h"
#include "state_machine.h"

BLEHandler ble;
SensorManager sensors;
MotorControl motors;
StateMachine state;

bool nodeNotified = false;
uint8_t currentNodeId = NODE_ID_FIRST;

// ─── Forward declarations ─────────────────────
void checkButton();
void checkBLECommands();
void checkPIR();
void checkSwitch();
void checkGesture();
void retryGestureInit();
void handleFollowLine();
void handleAtNode();
void handleWaitClear();
void handleTurning();
void handleFollowToJunction();
void handlePaused();
void processNextSignal();
void pauseRobot();
void resumeFromPause();

// ─── LED ──────────────────────────────────────
void setLedStopped() { MiniR4.LED.setColor(1, 0, 0, 255); }
void setLedMoving()  { MiniR4.LED.setColor(1, 0, 255, 0); }
void setLedSos()     { MiniR4.LED.setColor(1, 255, 0, 0); }

// ─── PIR state ────────────────────────────────
unsigned long lastPIRWarn = 0;
unsigned long warnClearDeadline = 0;
unsigned long pirGraceUntil = 0;
unsigned long pirClearSince = 0;
unsigned long pirHighSince = 0;

// ─── Gesture pause state ──────────────────────
// Vuốt lên = DỪNG: robot tạm dừng hành trình và CHỈ đi tiếp khi nhận tín
// hiệu "đi tiếp" (cử chỉ vẫy/gạt tay, giọng nói, hoặc nút trên app).
RobotState stateBeforePause = RobotState::FOLLOW_LINE;

// ─── Sound ────────────────────────────────────
static unsigned long beepUntil = 0;
static int _soundStep = 0;
static unsigned long _soundAt = 0;

void playConnectSound() {
    MiniR4.Buzzer.NoTone();
    MiniR4.Buzzer.Tone(523, 150);
    _soundStep = 1;
    _soundAt = millis() + 150;
}

void playDisconnectSound() {
    MiniR4.Buzzer.NoTone();
    MiniR4.Buzzer.Tone(784, 150);
    _soundStep = -1;
    _soundAt = millis() + 150;
}

void updateSound() {
    if (_soundStep == 0) return;
    unsigned long now = millis();
    if (now < _soundAt) return;

    if (_soundStep > 0) {
        switch (_soundStep) {
            case 1: MiniR4.Buzzer.Tone(659, 150); _soundStep = 2; _soundAt = now + 150; break;
            case 2: MiniR4.Buzzer.Tone(784, 2000); _soundStep = 3; _soundAt = now + 2000; beepUntil = now + 2000; break;
            case 3: MiniR4.Buzzer.NoTone(); _soundStep = 0; beepUntil = 0; break;
        }
    } else {
        switch (_soundStep) {
            case -1: MiniR4.Buzzer.Tone(659, 150); _soundStep = -2; _soundAt = now + 150; break;
            case -2: MiniR4.Buzzer.Tone(523, 2000); _soundStep = -3; _soundAt = now + 2000; beepUntil = now + 2000; break;
            case -3: MiniR4.Buzzer.NoTone(); _soundStep = 0; beepUntil = 0; break;
        }
    }
}

// ─── Setup ────────────────────────────────────
void setup() {
    Serial.begin(9600);
    MiniR4.begin();
    setLedStopped();
    sensors.begin();
    ble.begin();
    MiniR4.PWR.setBattCell(2);
    motors.begin();
    state.setState(RobotState::IDLE);
    Serial.println("[System] HeritageBuddy ready");

    MiniR4.M1.setPPR_RPM(545, 200);
    MiniR4.M2.setPPR_RPM(545, 200);
    MiniR4.M1.setReverse(true);
    MiniR4.M2.setReverse(false);
    MiniR4.DriveDC.begin(1, 2, true, false);
    MiniR4.DriveDC.setMoveSyncPID(0.02, 0.00, 0.04);
}

// ─── Debug: in cảm biến mỗi 2s ───────────────
static unsigned long lastSensorDebug = 0;
void printSensorDebug() {
    if (millis() - lastSensorDebug < 2000) return;
    lastSensorDebug = millis();
    Serial.print("[SENSOR] err=");
    Serial.print(sensors.readLineError(), 2);
    Serial.print(" w=");
    Serial.print(sensors.readLineWidth());
    Serial.print(" color=");
    Serial.print(sensors.readColorID());
    Serial.print(" red=");
    Serial.print(sensors.isRedDetected() ? "YES" : "no");
    Serial.print(" pir=");
    Serial.print(sensors.readPIR() ? "HIGH" : "LOW");
    Serial.print(" gest=");
    Serial.print(sensors.isGestureReady() ? "OK" : "OFF");
    Serial.print("(");
    Serial.print(sensors.readGestureNonBlocking());
    Serial.print(")");
    Serial.print(" sw=");
    Serial.println(sensors.readSwitch() ? "PRESSED" : "off");
}

// ─── Loop ─────────────────────────────────────
void loop() {
    ble.update();
    updateSound();

    if (ble.wasConnected()) {
        if (ble.isConnected()) {
            setLedStopped();
            playConnectSound();
            Serial.println("[BLE] Connected");
        } else {
            playDisconnectSound();
            Serial.println("[BLE] Disconnected");
        }
    }

    if (beepUntil > 0 && millis() >= beepUntil) {
        MiniR4.Buzzer.NoTone();
        _soundStep = 0;
        beepUntil = 0;
    }

    if (!ble.isConnected()) {
        static unsigned long lastBlink = 0;
        unsigned long now = millis();
        if (now - lastBlink >= 500) {
            lastBlink = now;
            static bool ledOn = false;
            ledOn = !ledOn;
            MiniR4.LED.setColor(1, 0, 0, ledOn ? 255 : 0);
        }
        retryGestureInit();
        delay(LOOP_DELAY_MS);
        return;
    }

    checkButton();
    checkBLECommands();
    checkPIR();
    checkSwitch();
    checkGesture();
    printSensorDebug();

    switch (state.getState()) {
        case RobotState::IDLE:
            motors.stop();
            break;
        case RobotState::FOLLOW_LINE:
            handleFollowLine();
            break;
        case RobotState::WAIT_CLEAR:
            handleWaitClear();
            break;
        case RobotState::AT_NODE:
            handleAtNode();
            break;
        case RobotState::TURNING:
            handleTurning();
            break;
        case RobotState::FOLLOW_TO_JUNCTION:
            handleFollowToJunction();
            break;
        case RobotState::PAUSED:
            handlePaused();
            break;
    }

    delay(LOOP_DELAY_MS);
}

// ─── Robot button ─────────────────────────────
void checkButton() {
    static bool lastDown = false;
    static bool lastUp = false;

    bool down = MiniR4.BTN_DOWN.getState();
    if (down && !lastDown) {
        if (state.getState() == RobotState::IDLE) {
            nodeNotified = false;
            currentNodeId = NODE_ID_FIRST;
            state.setState(RobotState::FOLLOW_LINE);
            motors.setSpeed(BASE_SPEED);
            setLedMoving();
            MiniR4.Buzzer.Tone(400, 100);
            Serial.println("[BTN] DOWN -> START");
        }
    }
    lastDown = down;

    bool up = MiniR4.BTN_UP.getState();
    if (up && !lastUp) {
        motors.stop();
        state.setState(RobotState::IDLE);
        setLedStopped();
        MiniR4.Buzzer.Tone(200, 100);
        Serial.println("[BTN] UP -> STOP");
    }
    lastUp = up;
}

// ─── BLE commands ─────────────────────────────
void checkBLECommands() {
    if (!ble.hasReceivedMessage()) return;

    String cmd = ble.getReceivedMessage();
    cmd.trim();
    Serial.print("[BLE RX] ");
    Serial.println(cmd);

    if (cmd == "START") {
        nodeNotified = false;
        currentNodeId = NODE_ID_FIRST;
        state.setState(RobotState::FOLLOW_LINE);
        motors.setSpeed(BASE_SPEED);
        setLedMoving();
        Serial.println("[CMD] START -> FOLLOW_LINE");
    }
    else if (cmd == "STOP") {
        motors.stop();
        state.setState(RobotState::IDLE);
        setLedStopped();
        Serial.println("[CMD] STOP -> IDLE");
    }
    else if (cmd == "RESUME") {
        if (state.getState() == RobotState::PAUSED) {
            resumeFromPause();
        } else if (state.getState() == RobotState::IDLE) {
            state.setState(RobotState::FOLLOW_LINE);
            motors.setSpeed(BASE_SPEED);
            setLedMoving();
            ble.sendMessage("STATUS:resumed");
            Serial.println("[CMD] RESUME -> FOLLOW_LINE");
        }
    }
    else if (cmd == "SOS") {
        motors.stop();
        state.setState(RobotState::IDLE);
        setLedSos();
        MiniR4.Buzzer.Tone(600, 1000);
        ble.sendMessage("STATUS:sos");
        Serial.println("[CMD] SOS");
    }
    else if (cmd.startsWith("NODE_DONE:") || cmd == "NEXT_NODE" || cmd == "VOICE_NEXT") {
        if (state.getState() == RobotState::PAUSED) {
            // Đang tạm dừng do cử chỉ vuốt lên → tín hiệu "đi tiếp" này
            // sẽ TIẾP TỤC hành trình đang dở (không phải bắt chặng mới).
            resumeFromPause();
        } else {
            processNextSignal();
        }
    }
    else if (cmd == "VOICE_STOP") {
        motors.stop();
        state.setState(RobotState::IDLE);
        setLedStopped();
    }
    else if (cmd == "PIR_MODE:LOW") {
        sensors.setPIRMode(true);
        ble.sendMessage("STATUS:pir_mode:low");
    }
    else if (cmd == "PIR_MODE:HIGH") {
        sensors.setPIRMode(false);
        ble.sendMessage("STATUS:pir_mode:high");
    }
}

// ─── PIR (motion detection) ───────────────────
static unsigned long lastPirDebug = 0;
RobotState stateBeforePir = RobotState::FOLLOW_LINE;

void checkPIR() {
    bool pirRaw = sensors.readPIR();
    int pinRaw = digitalRead(PIN_PIR);

    // Debug PIR mỗi 2s — in TẤT CẢ để chẩn đoán
    if (millis() - lastPirDebug >= 2000) {
        lastPirDebug = millis();
        Serial.print("[PIR] pin=");
        Serial.print(pinRaw);
        Serial.print(" raw=");
        Serial.print(pirRaw ? "1" : "0");
        Serial.print(" mode=");
        Serial.print(sensors.isPIRActiveLow() ? "aLow" : "aHigh");
        Serial.print(" grace=");
        Serial.print(millis() < pirGraceUntil ? "BLOCK" : "ok");
        Serial.print(" warmup=");
        Serial.print(millis() < PIR_WARMUP_MS ? "YES" : "no");
        Serial.print(" st=");
        RobotState cur = state.getState();
        if (cur == RobotState::FOLLOW_LINE) Serial.print("FOLLOW");
        else if (cur == RobotState::FOLLOW_TO_JUNCTION) Serial.print("F2J");
        else if (cur == RobotState::WAIT_CLEAR) Serial.print("WAIT");
        else if (cur == RobotState::TURNING) Serial.print("TURN");
        else if (cur == RobotState::AT_NODE) Serial.print("NODE");
        else Serial.print("IDLE");
        Serial.print(" now=");
        Serial.println(millis());
    }

    if (millis() < PIR_WARMUP_MS) return;
    if (millis() < pirGraceUntil) return;
    if (state.getState() == RobotState::WAIT_CLEAR) return;

    if (!pirRaw) return;

    unsigned long now = millis();
    if (now - lastPIRWarn < PIR_ALARM_COOLDOWN_MS) return;
    lastPIRWarn = now;

    RobotState cur = state.getState();
    if (cur == RobotState::FOLLOW_LINE || cur == RobotState::FOLLOW_TO_JUNCTION) {
        stateBeforePir = cur;
        motors.stop();
        state.setState(RobotState::WAIT_CLEAR);
        warnClearDeadline = now + WARN_CLEAR_TIMEOUT_MS;
        pirClearSince = 0;
        setLedStopped();
        MiniR4.Buzzer.Tone(800, BUZZER_ALARM_MS);
        ble.sendMessage("WARN:person");
        Serial.println("[PIR] >>> STOP <<<");
    }
}

// ─── Switch (physical button on back) ─────────
void checkSwitch() {
    static bool lastState = sensors.readSwitch();
    static unsigned long lastStableMs = millis();
    static unsigned long pressStart = 0;
    static bool pressed = false;

    bool raw = sensors.readSwitch();

    if (raw != lastState) {
        if (millis() - lastStableMs >= SWITCH_DEBOUNCE_MS) {
            lastState = raw;
            lastStableMs = millis();

            if (lastState) {
                pressed = true;
                pressStart = millis();
            }
            else if (pressed) {
                pressed = false;
                if (millis() - pressStart >= SOS_HOLD_MS) {
                    motors.stop();
                    state.setState(RobotState::IDLE);
                    setLedSos();
                    MiniR4.Buzzer.Tone(600, 1000);
                    ble.sendMessage("STATUS:sos");
                    Serial.println("[SWITCH] Long press -> SOS");
                } else {
                    ble.sendMessage("SWITCH_PRESS");
                    Serial.println("[SWITCH] Pressed");
                }
            }
        }
    } else {
        lastStableMs = millis();
    }
}

// ─── Gesture (PAJ7620) ────────────────────────
void retryGestureInit() {
    static unsigned long lastReinit = 0;
    if (sensors.isGestureReady()) return;
    unsigned long now = millis();
    if (now - lastReinit < GESTURE_REINIT_INTERVAL_MS) return;
    lastReinit = now;
    if (sensors.reinitGesture()) {
        Serial.println("[GESTURE] sensor recovered");
    }
}

void checkGesture() {
    if (!sensors.isGestureReady()) {
        retryGestureInit();
        return;
    }

    int gesture = sensors.readGestureNonBlocking();
    if (gesture == 0) return;

    Serial.print("[GESTURE] detected=");
    Serial.println(gesture);

    // Cử chỉ "đi tiếp": vẫy tay (9/10/13) hoặc vuốt trái/phải (1/2)
    bool isGoGesture = (gesture == 1 || gesture == 2 || gesture == 9 || gesture == 10 || gesture == 13);

    // Vuốt lên (3) = DỪNG: robot tạm dừng hành trình ngay lập tức, chỉ đi
    // tiếp khi nhận tín hiệu "đi tiếp" (cử chỉ khác / giọng nói / nút app).
    if (gesture == 3) {
        pauseRobot();
        return;
    }

    if (state.getState() == RobotState::PAUSED) {
        // Đang dừng do vuốt lên → cử chỉ "đi tiếp" cho phép robot chạy tiếp
        if (isGoGesture) {
            resumeFromPause();
        }
        return;
    }

    if (isGoGesture) {
        if (gesture == 2) {
            ble.sendMessage("GESTURE:SWIPE_LEFT");
            Serial.println("[GESTURE] -> SWIPE_LEFT sent");
        } else {
            ble.sendMessage("GESTURE:SWIPE_RIGHT");
            Serial.println("[GESTURE] -> SWIPE_RIGHT sent");
        }
    }
}

// ─── Gesture pause (vuốt lên = dừng) ──────────
void pauseRobot() {
    RobotState cur = state.getState();
    if (cur != RobotState::FOLLOW_LINE &&
        cur != RobotState::FOLLOW_TO_JUNCTION &&
        cur != RobotState::TURNING) {
        // Không đang di chuyển → không cần dừng (đã đứng yên ở node/IDLE)
        return;
    }

    stateBeforePause = cur;
    motors.cancelTurn();     // hủy cú rẽ dở (nếu đang TURNING) để tránh quay tiếp
    motors.stop();
    state.setState(RobotState::PAUSED);
    setLedStopped();
    MiniR4.Buzzer.Tone(300, 150);
    ble.sendMessage("GESTURE:SWIPE_UP");
    Serial.println("[GESTURE] swipe up -> PAUSED");
}

void resumeFromPause() {
    if (state.getState() != RobotState::PAUSED) return;

    RobotState resumeTo = stateBeforePause;
    state.setState(resumeTo);
    if (resumeTo == RobotState::TURNING) {
        motors.startTurnRight90(); // tiếp tục cú rẽ dang dở từ đầu
    } else {
        motors.setSpeed(BASE_SPEED);
    }
    setLedMoving();
    ble.sendMessage("STATUS:resumed");
    Serial.println("[PAUSE] resumed from pause");
}

// ─── Node signal processing ───────────────────
void processNextSignal() {
    if (state.getState() != RobotState::AT_NODE) return;
    ble.sendMessage("NODE_COMPLETE:" + String(currentNodeId));
    state.setState(RobotState::TURNING);
    motors.startTurnRight90();
    setLedMoving();
    pirGraceUntil = millis() + PIR_GRACE_AFTER_LEAVE_MS;
    Serial.print("[NODE] TURNING right 90° from node ");
    Serial.println(currentNodeId);
}

// ─── FOLLOW_LINE ──────────────────────────────
void handleFollowLine() {
    static uint8_t redCount = 0;

    float error = sensors.readLineError();
    motors.followLine(error);

    if (sensors.isRedDetected()) {
        redCount++;
        if (redCount >= COLOR_STABLE_COUNT) {
            redCount = 0;
            motors.stop();
            state.setState(RobotState::AT_NODE);
            Serial.println("[RED] Red detected -> AT_NODE");
        }
    } else {
        redCount = 0;
    }
}

// ─── WAIT_CLEAR ───────────────────────────────
void handleWaitClear() {
    motors.stop();

    if (!sensors.readPIR()) {
        if (pirClearSince == 0) pirClearSince = millis();
        if (millis() - pirClearSince >= PIR_CLEAR_CONFIRM_MS) {
            state.setState(stateBeforePir);
            motors.setSpeed(BASE_SPEED);
            setLedMoving();
            ble.sendMessage("STATUS:auto_resumed");
            pirClearSince = 0;
            Serial.print("[PIR] Path clear -> resume to ");
            Serial.println(stateBeforePir == RobotState::FOLLOW_TO_JUNCTION ? "F2J" : "FOLLOW");
        }
    } else {
        pirClearSince = 0;
    }

    if (millis() >= warnClearDeadline) {
        state.setState(stateBeforePir);
        motors.setSpeed(BASE_SPEED);
        setLedMoving();
        ble.sendMessage("STATUS:auto_resumed");
        pirClearSince = 0;
        Serial.print("[PIR] Timeout -> resume to ");
        Serial.println(stateBeforePir == RobotState::FOLLOW_TO_JUNCTION ? "F2J" : "FOLLOW");
    }
}

// ─── PAUSED (dừng do vuốt lên) ────────────────
void handlePaused() {
    motors.stop();
    // Robot đứng yên trong khi chờ tín hiệu "đi tiếp". Không làm gì thêm —
    // việc tiếp tục do checkGesture()/checkBLECommands() quyết định.
}

// ─── AT_NODE ──────────────────────────────────
void handleAtNode() {
    motors.stop();

    if (!nodeNotified) {
        nodeNotified = true;
        ble.sendMessage("NODE_START:" + String(currentNodeId));
        MiniR4.Buzzer.Tone(880, NODE_ARRIVAL_BEEP_MS);
        beepUntil = millis() + NODE_ARRIVAL_BEEP_MS;
        Serial.print("[NODE] sent NODE_START:");
        Serial.println(currentNodeId);
    }
}

// ─── TURNING (quay phải 90°) ──────────────────
unsigned long turnPauseUntil = 0;

void handleTurning() {
    if (turnPauseUntil > 0) {
        if (millis() >= turnPauseUntil) {
            turnPauseUntil = 0;
            state.setState(RobotState::FOLLOW_TO_JUNCTION);
            motors.setSpeed(BASE_SPEED);
            setLedMoving();
            Serial.println("[TURN] pause done -> FOLLOW_TO_JUNCTION");
        }
        return;
    }

    if (motors.isTurnComplete()) {
        currentNodeId++;
        nodeNotified = false;
        motors.stop();
        turnPauseUntil = millis() + 2000;
        setLedStopped();
        Serial.print("[TURN] complete, pausing 2s (node ");
        Serial.print(currentNodeId);
        Serial.println(")");
    }
}

// ─── FOLLOW_TO_JUNCTION (đi theo line đến junction trái) ──
void handleFollowToJunction() {
    static uint8_t junctionFrames = 0;
    static unsigned long lastDebug = 0;

    float error = sensors.readLineError();
    uint8_t w = sensors.readLineWidth();
    motors.followLine(error);

    if (millis() - lastDebug >= 500) {
        lastDebug = millis();
        Serial.print("[F2J] err=");
        Serial.print(error, 2);
        Serial.print(" w=");
        Serial.println(w);
    }

    if (sensors.isLeftJunction()) {
        junctionFrames++;
        if (junctionFrames >= JUNCTION_CONFIRM_FRAMES) {
            junctionFrames = 0;
            motors.stop();
            state.setState(RobotState::AT_NODE);
            ble.sendMessage("JUNCTION_LEFT:" + String(currentNodeId));
            MiniR4.Buzzer.Tone(880, NODE_ARRIVAL_BEEP_MS);
            Serial.print("[JUNCTION] Left detected -> AT_NODE (node ");
            Serial.print(currentNodeId);
            Serial.println(")");
        }
    } else {
        junctionFrames = 0;
    }
}
