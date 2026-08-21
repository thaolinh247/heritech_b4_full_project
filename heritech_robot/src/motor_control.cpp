#include "motor_control.h"
#include "config.h"
#include <MatrixMiniR4.h>

void MotorControl::begin() {
    _turning = false;
    _driving = false;
}

// ─── Đi thẳng đều 2 bánh ──────────────────────
void MotorControl::driveStraight(int16_t power) {
    MiniR4.M1.setPower(power);
    MiniR4.M2.setPower(power);
}

void MotorControl::stop() {
    MiniR4.M1.setPower(0);
    MiniR4.M2.setPower(0);
}

// ─── Quay phải 90° tại chỗ (đều 2 bánh: trái tới, phải lùi) ──
void MotorControl::startTurnRight90() {
    _turning = true;
    _turnTargetDegrees = TURN_90_DEGREES;
    MiniR4.M1.resetCounter();
    MiniR4.M2.resetCounter();
    MiniR4.M1.setPower(TURN_SPEED);
    MiniR4.M2.setPower(-TURN_SPEED);
    Serial.print("[TURN] start target=");
    Serial.println(_turnTargetDegrees);
}

bool MotorControl::isTurnComplete() {
    if (!_turning) return true;
    // Trung bình góc tuyệt đối của 2 bánh (quay tại chỗ thì 2 bánh ngược dấu)
    float deg = (fabsf((float)MiniR4.M1.getDegrees()) +
                 fabsf((float)MiniR4.M2.getDegrees())) / 2.0f;
    if (deg >= _turnTargetDegrees) {
        Serial.print("[TURN] done at ");
        Serial.println(deg);
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

// ─── Đi thẳng theo quãng đường (encoder) ──────
void MotorControl::startDriveCM(float cm) {
    _driving = true;
    _driveTargetDegrees = cm * ENCODER_DEGREES_PER_CM;
    MiniR4.M1.resetCounter();
    MiniR4.M2.resetCounter();
    driveStraight(POST_TURN_DRIVE_SPEED);
    Serial.print("[DRIVE] start ");
    Serial.print(cm);
    Serial.print("cm target=");
    Serial.println(_driveTargetDegrees);
}

bool MotorControl::isDriveComplete() {
    if (!_driving) return true;
    float deg = (fabsf((float)MiniR4.M1.getDegrees()) +
                 fabsf((float)MiniR4.M2.getDegrees())) / 2.0f;
    if (deg >= _driveTargetDegrees) {
        Serial.print("[DRIVE] done at ");
        Serial.println(deg);
        stop();
        _driving = false;
        return true;
    }
    return false;
}

void MotorControl::cancelDrive() {
    stop();
    _driving = false;
}

/*
 * ══════════════════════════════════════════════════════════════
 * LOGIC CŨ — BÁM LINE PID (ĐÃ COMMENT, không dùng nữa)
 * Khôi phục khi cần quay lại luồng bám line.
 * ══════════════════════════════════════════════════════════════
 *
 * void MotorControl::begin() {
 *     _baseSpeed = BASE_SPEED;
 *     _lastError = 0;
 *     _integral = 0;
 * }
 *
 * void MotorControl::followLine(float error) {
 *     // Chuan hoa error +/-4.5 -> +/-1 de dau ra PID dung ty le voi toc do co so
 *     float normError = error / LINE_ERROR_MAX;
 *
 *     // Deadband: gan tam line thi xem nhu dang thang -> khong lai, het rung quanh tam
 *     if (fabsf(normError) < LINE_DEADBAND) {
 *         normError = 0;
 *         _integral = 0;
 *         _lastError = 0;
 *     } else {
 *         _integral += normError;
 *         _integral = constrain(_integral, -20, 20);
 *     }
 *
 *     float correction = normError * PID_KP * CORRECTION_SIGN + _integral * PID_KI + STRAIGHT_TRIM;
 *     correction = constrain(correction, -MAX_CORRECTION, MAX_CORRECTION);
 *
 *     int16_t leftPower  = _baseSpeed + (int16_t)(correction * _baseSpeed);
 *     int16_t rightPower = _baseSpeed - (int16_t)(correction * _baseSpeed);
 *
 *     leftPower  = constrain(leftPower,  -MAX_SPEED, MAX_SPEED);
 *     rightPower = constrain(rightPower, -MAX_SPEED, MAX_SPEED);
 *
 *     MiniR4.M1.setPower(leftPower);
 *     MiniR4.M2.setPower(rightPower);
 * }
 *
 * void MotorControl::setSpeed(int16_t speed) {
 *     _baseSpeed = constrain(speed, MIN_SPEED, MAX_SPEED);
 * }
 *
 * // Turn cu: chi dung M2 (banh phai), M1 de khong — KHONG deu 2 banh
 * void MotorControl::startTurnRight90() {
 *     _turning = true;
 *     _turnTargetDegrees = TURN_90_DEGREES;
 *     MiniR4.M1.resetCounter();
 *     MiniR4.M2.resetCounter();
 *     MiniR4.M1.setPower(0);
 *     MiniR4.M2.setPower(TURN_SPEED);
 * }
 *
 * bool MotorControl::isTurnComplete() {
 *     if (!_turning) return true;
 *     float degrees = fabsf((float)MiniR4.M2.getDegrees());
 *     if (degrees >= _turnTargetDegrees) {
 *         stop();
 *         _turning = false;
 *         return true;
 *     }
 *     return false;
 * }
 */
