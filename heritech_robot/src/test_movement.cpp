#include "test_movement.h"
#include "config.h"
#include "motor_control.h"
#include "state_machine.h"
#include "node_manager.h"
#include <Arduino.h>

extern MotorControl motors;
extern StateMachine state;
extern NodeManager nodes;
extern bool nodeNotified;

static int _phase = 0;
static unsigned long _timer = 0;
static bool _firstMove = true;

#define TURN_MS   1000
#define MOVE_MS   5000

void testMovementInit() {
    _phase = 0;
    _timer = 0;
    _firstMove = true;
}

void testMovementHandle() {
    if (state.isStateChanged()) {
        if (_firstMove) {
            _firstMove = false;
            _phase = 2;
            _timer = millis();
            motors.move(BASE_SPEED, BASE_SPEED);
            Serial.println("[TEST] First move: straight");
        } else {
            _phase = 1;
            _timer = millis();
            motors.move(-BASE_SPEED, BASE_SPEED);
            Serial.println("[TEST] Turn left");
        }
    }

    if (_phase == 1) {
        if (millis() - _timer >= TURN_MS) {
            _phase = 2;
            _timer = millis();
            motors.move(BASE_SPEED, BASE_SPEED);
            Serial.println("[TEST] Turn done, moving straight");
        }
    } else if (_phase == 2) {
        if (millis() - _timer >= MOVE_MS) {
            motors.stop();
            _phase = 0;
            nodeNotified = false;
            state.setState(RobotState::AT_NODE);
            Serial.print("[TEST] Arrived at node ");
            Serial.println(nodes.getCurrentNode());
        }
    }
}
