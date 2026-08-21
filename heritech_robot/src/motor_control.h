#ifndef MOTOR_CONTROL_H
#define MOTOR_CONTROL_H

#include <Arduino.h>

class MotorControl {
public:
    void begin();

    // Đi thẳng đều 2 bánh (KHÔNG bám line)
    void driveStraight(int16_t power);
    void stop();

    // Quay phải 90° tại chỗ — đều 2 bánh (trái tới, phải lùi), non-blocking
    void startTurnRight90();
    bool isTurnComplete();
    void cancelTurn();

    // Đi thẳng theo quãng đường (encoder), non-blocking
    void startDriveCM(float cm);
    bool isDriveComplete();
    void cancelDrive();

private:
    bool _turning;
    float _turnTargetDegrees;
    bool _driving;
    float _driveTargetDegrees;
};
#endif
