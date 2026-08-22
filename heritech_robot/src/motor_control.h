#ifndef MOTOR_CONTROL_H
#define MOTOR_CONTROL_H

#include <Arduino.h>

class MotorControl {
public:
    void begin();

    // Đi thẳng đều 2 bánh (KHÔNG bám line)
    void driveStraight(int16_t power);
    void stop();

    // Quay phải 90° tại chỗ — đều 2 bánh, non-blocking.
    // Encoder điều khiển chính (giảm tốc gần đích), IMU hiệu chỉnh sau khi dừng.
    void startTurnRight90();
    bool isTurnComplete();   // gọi mỗi vòng loop
    void cancelTurn();

    // Đi thẳng theo quãng đường (encoder), non-blocking
    void startDriveCM(float cm);
    bool isDriveComplete();
    void cancelDrive();

private:
    // Các pha của cú quay: SPIN → SETTLE → (CREEP_START → CREEP_RUN → REST)×N
    static const uint8_t TP_SPIN = 0;
    static const uint8_t TP_SETTLE = 1;
    static const uint8_t TP_CREEP_START = 2;
    static const uint8_t TP_CREEP_RUN = 3;
    static const uint8_t TP_REST = 4;

    void spinRight(int16_t power);   // + = quay phải, - = quay trái
    float readTurnAngle();           // góc quay theo trục IMU đã chọn
    float readEncoderDegrees();      // trung bình |độ| 2 bánh

    bool _turning;
    float _turnTargetDegrees;
    bool _driving;
    float _driveTargetDegrees;

    uint8_t _turnPhase;
    unsigned long _phaseAt;
    unsigned long _lastTurnDebug;
    uint8_t _correctRound;
    bool _imuSeenMove;   // IMU có phản hồi trong lúc quay không
    float _yawStart;     // góc IMU tại lúc bắt đầu quay (để tính DELTA)
};
#endif
