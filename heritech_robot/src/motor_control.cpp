#include "motor_control.h"
#include "config.h"
#include "sensor_manager.h"
#include <MatrixMiniR4.h>

void MotorControl::begin() {
    _baseSpeed = BASE_SPEED;
    _lastError = 0;
    _integral = 0;
}

void MotorControl::followLine(float error) {
    // Chuan hoa error +/-4.5 -> +/-1 de dau ra PID dung ty le voi toc do co so
    float normError = error / LINE_ERROR_MAX;

    // Deadband: gan tam line thi xem nhu dang thang -> khong lai, het rung quanh tam
    if (fabsf(normError) < LINE_DEADBAND) {
        normError = 0;
        _integral = 0;
        _lastError = 0;
    } else {
        _integral += normError;
        _integral = constrain(_integral, -20, 20);
    }

    float correction = normError * PID_KP + _integral * PID_KI;
    correction = constrain(correction, -MAX_CORRECTION, MAX_CORRECTION);

    int16_t leftPower  = _baseSpeed + (int16_t)(correction * _baseSpeed);
    int16_t rightPower = _baseSpeed - (int16_t)(correction * _baseSpeed);

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

void MotorControl::setSpeed(int16_t speed) {
    _baseSpeed = constrain(speed, MIN_SPEED, MAX_SPEED);
}

void MotorControl::startTurnRight90() {
    _turning = true;
    _turnTargetDegrees = TURN_90_DEGREES;
    MiniR4.M1.resetCounter();
    MiniR4.M2.resetCounter();
    MiniR4.M1.setPower(0);
    MiniR4.M2.setPower(TURN_SPEED);
    Serial.print("[TURN] start target=");
    Serial.println(_turnTargetDegrees);
}

bool MotorControl::isTurnComplete() {
    if (!_turning) return true;
    float degrees = fabsf((float)MiniR4.M2.getDegrees());
    if (degrees >= _turnTargetDegrees) {
        Serial.print("[TURN] done at ");
        Serial.print(degrees);
        Serial.print(" / ");
        Serial.println(_turnTargetDegrees);
        stop();
        _turning = false;
        return true;
    }
    return false;
}

void MotorControl::cancelTurn() {
    stop();
    _turning = false;
}
