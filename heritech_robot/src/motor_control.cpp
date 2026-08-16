#include "motor_control.h"
#include "config.h"
#include "sensor_manager.h"
#include <MatrixMiniR4.h>
#include <math.h>

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

void MotorControl::turnLeft90() {
    MiniR4.M1.setPower(-TURN_SPEED);
    MiniR4.M2.setPower(TURN_SPEED);
}

void MotorControl::turnRight90() {
    MiniR4.M1.setPower(TURN_SPEED);
    MiniR4.M2.setPower(-TURN_SPEED);
}

// Thoát khỏi pha rẽ khi line đã nằm giữa sensor (|err| nhỏ + bề rộng line hợp lý).
// LegExecutor gọi liên tục trong lúc xoay — khi đúng → advanceStep() dừng robot.
bool MotorControl::isLineCentered(SensorManager& sensors) {
    float err = sensors.readLineError();
    uint8_t w = sensors.readLineWidth();
    return (fabs(err) < LINE_CENTER_ERR_TOL) &&
           (w >= LINE_CENTER_WIDTH_MIN && w <= LINE_CENTER_WIDTH_MAX);
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
