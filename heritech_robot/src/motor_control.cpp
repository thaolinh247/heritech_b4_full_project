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

// ─────────────────────────────────────────────────────────────
// Động cơ kéo của robot nằm ở cổng M3 (trái) / M4 (phải) — KHỚP
// code team WRO 2026 B3 (`C:\Users\thaol\Downloads\WRO 2026 B3\src\main.cpp`
// hàm `setTankRaw`): `INVERT_LEFT=false` (ghi thẳng), `INVERT_RIGHT=true`
// (nghịch dấu). Trước đây ghi `MiniR4.M1/M2.setPower()` — cổng M1/M2
// KHÔNG nối dây động cơ → robot nhận START nhưng không di chuyển.
// MatrixMotor::setSpeed() nhận -100..100, không cần khởi tạo trước.
// ─────────────────────────────────────────────────────────────
void MotorControl::setDrive(int16_t left, int16_t right) {
    MiniR4.M3.setSpeed(left);   // bánh trái — INVERT_LEFT = false
    MiniR4.M4.setSpeed(-right); // bánh phải — INVERT_RIGHT = true
}

void MotorControl::move(int16_t leftPower, int16_t rightPower) {
    setDrive(leftPower, rightPower);
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

    setDrive(leftPower, rightPower);
}

void MotorControl::turnLeft90() {
    setDrive(-TURN_SPEED, TURN_SPEED); // bánh trái lùi, bánh phải tiến → xoay trái
}

void MotorControl::turnRight90() {
    setDrive(TURN_SPEED, -TURN_SPEED); // bánh trái tiến, bánh phải lùi → xoay phải
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
    setDrive(0, 0);
    _integral = 0;
    _lastError = 0;
}

void MotorControl::brake() {
    MiniR4.M3.setBrake(true);
    MiniR4.M4.setBrake(true);
    _integral = 0;
    _lastError = 0;
}

void MotorControl::setSpeed(int16_t speed) {
    _baseSpeed = constrain(speed, MIN_SPEED, MAX_SPEED);
}
