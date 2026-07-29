#include <MatrixMiniR4.h>
#include "config.h"
#include "ble_handler.h"
#include "sensor_manager.h"
#include "motor_control.h"
#include "state_machine.h"
#include "node_manager.h"

BLEHandler      ble;
SensorManager   sensors;
MotorControl    motors;
StateMachine    state;
NodeManager     nodes;

unsigned long lastPIRAlarm = 0;
int redStableCount = 0;
bool nodeNotified = false;

void checkButton();
void checkBLECommands();
void checkPIR();
void checkSwitch();
void checkGesture();
void handleIdle();
void handleFollowLine();
void handleAtNode();
void handleEnd();

unsigned long beepUntil = 0;

void playConnectSound() {
    MiniR4.Buzzer.NoTone();
    MiniR4.Buzzer.Tone(523, 150);  // C5
    delay(150);
    MiniR4.Buzzer.Tone(659, 150);  // E5
    delay(150);
    MiniR4.Buzzer.Tone(784, 2000); // G5 for 2s
    beepUntil = millis() + 2000;
}

void playDisconnectSound() {
    MiniR4.Buzzer.NoTone();
    MiniR4.Buzzer.Tone(784, 150);  // G5
    delay(150);
    MiniR4.Buzzer.Tone(659, 150);  // E5
    delay(150);
    MiniR4.Buzzer.Tone(523, 2000); // C5 for 2s
    beepUntil = millis() + 2000;
}

void setup() {
    Serial.begin(115200);
    while (!Serial);

    MiniR4.begin();
    MiniR4.LED.setColor(1, 0, 0, 255);

    ble.begin();
    sensors.begin();
    motors.begin();
    state.setState(RobotState::IDLE);

    Serial.println("[System] HeritageBuddy ready");
}

void loop() {
    ble.update();

    // Connection state change → sound
    if (ble.wasConnected()) {
        if (ble.isConnected()) {
            MiniR4.LED.setColor(1, 0, 255, 0);
            playConnectSound();
            Serial.println("[BLE] Connected");
        } else {
            MiniR4.LED.setColor(1, 255, 0, 0);
            playDisconnectSound();
            Serial.println("[BLE] Disconnected");
        }
    }

    // Keep buzzer on for 2s duration
    if (beepUntil > 0 && millis() >= beepUntil) {
        MiniR4.Buzzer.NoTone();
        beepUntil = 0;
    }

    checkButton();

    if (!ble.isConnected()) {
        static unsigned long lastBlink = 0;
        unsigned long now = millis();
        if (now - lastBlink >= 500) {
            lastBlink = now;
            static bool ledOn = false;
            ledOn = !ledOn;
            MiniR4.LED.setColor(1, 0, 0, ledOn ? 255 : 0);
        }
        delay(LOOP_DELAY_MS);
        return;
    }

    checkBLECommands();
    checkPIR();
    checkSwitch();
    checkGesture();

    switch (state.getState()) {
        case RobotState::IDLE:
            handleIdle();
            break;
        case RobotState::FOLLOW_LINE:
            handleFollowLine();
            break;
        case RobotState::AT_NODE:
            handleAtNode();
            break;
        case RobotState::END:
            handleEnd();
            break;
    }

    delay(LOOP_DELAY_MS);
}

// --- Button --------------------------------------

void checkButton() {
    static bool lastState = false;
    bool current = MiniR4.BTN_DOWN.getState();

    // Pressed (DOWN): stop robot
    if (current && !lastState) {
        motors.stop();
        state.setState(RobotState::IDLE);
        MiniR4.LED.setColor(1, 255, 0, 0);
        MiniR4.Buzzer.Tone(200, 100);
        Serial.println("[BTN] DOWN -> STOP");
    }
    // Released (UP): start robot if IDLE
    if (!current && lastState) {
        if (state.getState() == RobotState::IDLE) {
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
}

// --- BLE --------------------------------------

void checkBLECommands() {
    if (!ble.hasReceivedMessage()) return;

    String cmd = ble.getReceivedMessage();
    cmd.trim();
    Serial.print("[BLE RX] "); Serial.println(cmd);

    if (cmd == "START") {
        nodes.reset();
        redStableCount = 0;
        nodeNotified = false;
        state.setState(RobotState::FOLLOW_LINE);
        motors.setSpeed(BASE_SPEED);
        Serial.println("[CMD] START -> FOLLOW_LINE");
    }
    else if (cmd == "STOP") {
        motors.stop();
        state.setState(RobotState::IDLE);
        Serial.println("[CMD] STOP -> IDLE");
    }
    else if (cmd.startsWith("NODE_DONE:")) {
        int nodeId = cmd.substring(10).toInt();
        nodes.completeCurrentNode();
        if (nodes.isLastNode() || nodes.allNodesCompleted()) {
            state.setState(RobotState::END);
            ble.sendMessage("ALL_DONE");
            Serial.println("[CMD] NODE_DONE -> ALL_DONE -> END");
        } else {
            ble.sendMessage("NODE_COMPLETE:" + String(nodeId));
            motors.setSpeed(BASE_SPEED);
            state.setState(RobotState::FOLLOW_LINE);
            Serial.println("[CMD] NODE_DONE -> FOLLOW_LINE");
        }
    }
    else if (cmd == "NEXT_NODE") {
        nodes.nextNode();
        motors.setSpeed(BASE_SPEED);
        state.setState(RobotState::FOLLOW_LINE);
        Serial.println("[CMD] NEXT_NODE -> FOLLOW_LINE");
    }
    else if (cmd == "VOICE_NEXT") {
        if (state.getState() == RobotState::AT_NODE) {
            nodes.completeCurrentNode();
            if (nodes.isLastNode() || nodes.allNodesCompleted()) {
                state.setState(RobotState::END);
                ble.sendMessage("ALL_DONE");
            } else {
                nodes.nextNode();
                motors.setSpeed(BASE_SPEED);
                state.setState(RobotState::FOLLOW_LINE);
                ble.sendMessage("NODE_COMPLETE:" + String(nodes.getCurrentNode()));
            }
        }
        Serial.println("[CMD] VOICE_NEXT");
    }
    else if (cmd == "VOICE_STOP") {
        motors.stop();
        state.setState(RobotState::IDLE);
        Serial.println("[CMD] VOICE_STOP -> IDLE");
    }
}

// --- PIR --------------------------------------

void checkPIR() {
    if (!sensors.readPIR()) return;

    unsigned long now = millis();
    if (now - lastPIRAlarm < PIR_ALARM_COOLDOWN_MS) return;
    lastPIRAlarm = now;

    MiniR4.Buzzer.Tone(800, BUZZER_ALARM_MS);
    ble.sendMessage("ALARM");
    Serial.println("[PIR] Alarm");
}

// --- Switch ----------------------------------

void checkSwitch() {
    static bool lastSwitchState = HIGH;
    bool current = sensors.readSwitch();

    if (lastSwitchState == HIGH && current == LOW) {
        ble.sendMessage("SWITCH_PRESS");
        Serial.println("[SWITCH] Pressed");
    }
    lastSwitchState = current;
}

// --- Gesture ---------------------------------

void checkGesture() {
    int gesture = sensors.readGesture();
    if (gesture == 0) return;

    if (gesture == 0x04) {
        // Swipe Up → next node
        ble.sendMessage("GESTURE:SWIPE_UP");
        if (state.getState() == RobotState::AT_NODE) {
            nodes.completeCurrentNode();
            if (nodes.isLastNode()) {
                state.setState(RobotState::END);
                ble.sendMessage("ALL_DONE");
            } else {
                nodes.nextNode();
                motors.setSpeed(BASE_SPEED);
                state.setState(RobotState::FOLLOW_LINE);
                ble.sendMessage("NODE_COMPLETE:" + String(nodes.getCurrentNode()));
            }
        }
        Serial.println("[GESTURE] Swipe Up → Next node");
    }
}

// --- IDLE -------------------------------------

void handleIdle() {
    motors.stop();
}

// --- FOLLOW_LINE -----------------------------

void handleFollowLine() {
    if (state.isStateChanged()) {
        Serial.println("[STATE] FOLLOW_LINE");
    }

    float lineError = sensors.readLineError();
    motors.followLine(lineError);

    if (sensors.isRedDetected()) {
        redStableCount++;
        if (redStableCount >= COLOR_STABLE_COUNT) {
            motors.stop();
            nodeNotified = false;
            state.setState(RobotState::AT_NODE);
            Serial.println("[STATE] Red detected -> AT_NODE");
        }
    } else {
        redStableCount = 0;
    }
}

// --- AT_NODE ----------------------------------

void handleAtNode() {
    if (state.isStateChanged()) {
        Serial.println("[STATE] AT_NODE");
    }

    motors.stop();

    if (!nodeNotified) {
        ble.sendMessage("NODE_START:" + String(nodes.getCurrentNode()));
        nodeNotified = true;
        Serial.print("[NODE] Started: "); Serial.println(nodes.getCurrentNode());
    }
}

// --- END --------------------------------------

void handleEnd() {
    if (state.isStateChanged()) {
        motors.stop();
        ble.sendMessage("ALL_DONE");
        MiniR4.LED.setColor(1, 0, 255, 0);
        MiniR4.Buzzer.Tone(1000, 300);
        delay(150);
        MiniR4.Buzzer.Tone(1500, 300);
        Serial.println("[STATE] END - All nodes completed");
    }
}
