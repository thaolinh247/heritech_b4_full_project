#include "motor_control.h"
#include "config.h"
#include <MatrixMiniR4.h>

void MotorControl::begin() {
    _baseSpeed = BASE_SPEED;
    _lastError = 0;
    _integral = 0;
}

void MotorControl::move(int16_t leftPower, int16_t rightPower) {
    MiniR4.M1.setPower(leftPower);
    MiniR4.M2.setPower(rightPower);
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
