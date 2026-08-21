#include "motor_control.h"
#include "config.h"
#include <MatrixMiniR4.h>

void MotorControl::begin() {
    _turning = false;
    _driving = false;
}

// ─── Đi thẳng đều 2 bánh ──────────────────────
// Dùng setSpeed (PID tốc độ của lower MCU) thay vì setPower: 2 bánh được
// giữ đồng đều tuyệt đối về tốc độ → robot đi thẳng nhất có thể.
void MotorControl::driveStraight(int16_t power) {
    MiniR4.M1.setSpeed(power + DRIVE_TRIM);   // bánh phải
    MiniR4.M2.setSpeed(power);                // bánh trái
}

void MotorControl::stop() {
    MiniR4.M1.setPower(0);
    MiniR4.M2.setPower(0);
}

// ─── Quay phải 90° tại chỗ (đều 2 bánh) ──────
// Dây lắp thực tế: M2 = bánh TRÁI, M1 = bánh PHẢI.
// Quay phải = bánh trái tới + bánh phải lùi  =>  M2(+), M1(-)
//
// Kỹ thuật chống lố góc (tham khảo turnToAngle/turnByAngle):
//   1. Còn ≤ TURN_DECEL_ZONE_DEG thì giảm từ full xuống slow speed
//   2. Đủ target (encoder) → cắt motor, chờ TURN_SETTLE_MS cho quán tính ổn định
//   3. Đo lại góc bằng IMU: thiếu → bò tới, lố → bò lui (speed 7,
//      tối đa 4 lượt × 500ms) tới khi sai số ≤ TURN_TOLERANCE_DEG
// IMU chỉ dùng để HIỆU CHỈNH — nếu IMU không phản hồi (_imuSeenMove == false)
// thì bỏ qua hiệu chỉnh, kết quả theo encoder thuần (an toàn).
void MotorControl::startTurnRight90() {
    _turning = true;
    _turnTargetDegrees = TURN_90_DEGREES;
    _turnPhase = TP_SPIN;
    _correctRound = 0;
    _imuSeenMove = false;
    _lastTurnDebug = 0;
    MiniR4.M1.resetCounter();
    MiniR4.M2.resetCounter();
    MiniR4.Motion.resetIMUValues();   // góc quay bắt đầu từ 0
    spinRight(TURN_FULL_SPEED);
    Serial.print("[TURN] start target=");
    Serial.println(_turnTargetDegrees);
}

bool MotorControl::isTurnComplete() {
    if (!_turning) return true;
    float yaw = fabsf(readTurnAngle());

    switch (_turnPhase) {
        case TP_SPIN: {
            if (yaw > 1.0f) _imuSeenMove = true;

            float encDeg = readEncoderDegrees();

            unsigned long now = millis();
            if (now - _lastTurnDebug >= 300) {
                _lastTurnDebug = now;
                Serial.print("[TURN] enc=");
                Serial.print(encDeg);
                Serial.print(" ax r/p/y=");
                Serial.print(MiniR4.Motion.getEuler(MiniR4Motion::AxisType::Roll), 1);
                Serial.print("/");
                Serial.print(MiniR4.Motion.getEuler(MiniR4Motion::AxisType::Pitch), 1);
                Serial.print("/");
                Serial.println(MiniR4.Motion.getEuler(MiniR4Motion::AxisType::Yaw), 1);
            }

            // Gần đích → giảm tốc chống lố do quán tính
            if (_turnTargetDegrees - encDeg <= TURN_DECEL_ZONE_DEG) {
                spinRight(TURN_SLOW_SPEED);
            }
            if (encDeg >= _turnTargetDegrees) {
                stop();
#if TURN_IMU_CORRECT
                _phaseAt = millis();
                _turnPhase = TP_SETTLE;
                Serial.print("[TURN] spin done enc=");
                Serial.print(encDeg);
                Serial.print(" imu=");
                Serial.println(yaw);
#else
                // Tat hieu chinh: du target -> xong ngay, chặng sau chay lien
                _turning = false;
                Serial.print("[TURN] done enc=");
                Serial.println(encDeg);
                return true;
#endif
            }
            break;
        }

        case TP_SETTLE:
            // Chờ quán tính ổn định rồi mới đo lại để hiệu chỉnh
            if (millis() - _phaseAt >= TURN_SETTLE_MS) {
                _turnPhase = TP_CREEP_START;
            }
            break;

        case TP_CREEP_START: {
            float err = _turnTargetDegrees - yaw;   // >0 thiếu, <0 lố
            if (!_imuSeenMove || fabsf(err) <= TURN_TOLERANCE_DEG ||
                _correctRound >= TURN_CORRECT_MAX_ROUNDS) {
                stop();
                _turning = false;
                Serial.print("[TURN] final imu=");
                Serial.print(yaw);
                Serial.print(" rounds=");
                Serial.println(_correctRound);
                return true;
            }
            spinRight(err > 0 ? TURN_CREEP_SPEED : -TURN_CREEP_SPEED);
            _phaseAt = millis();
            _turnPhase = TP_CREEP_RUN;
            break;
        }

        case TP_CREEP_RUN: {
            float err = _turnTargetDegrees - yaw;
            if (fabsf(err) <= TURN_TOLERANCE_DEG) {
                stop();
                _turning = false;
                Serial.print("[TURN] final imu=");
                Serial.print(yaw);
                Serial.print(" rounds=");
                Serial.println(_correctRound + 1);
                return true;
            }
            if (millis() - _phaseAt >= TURN_CREEP_MS) {
                stop();
                _phaseAt = millis();
                _turnPhase = TP_REST;
            }
            break;
        }

        case TP_REST:
            if (millis() - _phaseAt >= TURN_CREEP_SETTLE_MS) {
                _correctRound++;
                _turnPhase = TP_CREEP_START;
            }
            break;
    }

    return false;
}

void MotorControl::cancelTurn() {
    stop();
    _turning = false;
}

void MotorControl::spinRight(int16_t power) {
    MiniR4.M1.setPower(-power);   // bánh phải
    MiniR4.M2.setPower(power);    // bánh trái
}

float MotorControl::readTurnAngle() {
    switch (TURN_IMU_AXIS) {
        case 3:  return (float)MiniR4.Motion.getEuler(MiniR4Motion::AxisType::Roll);
        case 4:  return (float)MiniR4.Motion.getEuler(MiniR4Motion::AxisType::Pitch);
        default: return (float)MiniR4.Motion.getEuler(MiniR4Motion::AxisType::Yaw);
    }
}

float MotorControl::readEncoderDegrees() {
    return (fabsf((float)MiniR4.M1.getDegrees()) +
            fabsf((float)MiniR4.M2.getDegrees())) / 2.0f;
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
