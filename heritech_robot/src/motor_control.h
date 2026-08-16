#ifndef MOTOR_CONTROL_H
#define MOTOR_CONTROL_H

#include <Arduino.h>

class SensorManager; // forward declaration — chỉ dùng tham chiếu trong isLineCentered()

class MotorControl {
public:
    void begin();
    void setDrive(int16_t left, int16_t right); // Ghi 2 động cơ M3/M4 (khớp code team WRO)
    void move(int16_t leftPower, int16_t rightPower);
    void followLine(float error);
    void turnLeft90();                       // Xoay tại chỗ 90° sang trái (leg-based)
    void turnRight90();                      // Xoay tại chỗ 90° sang phải (leg-based)
    bool isLineCentered(SensorManager& sensors); // Line nằm giữa sensor? (thoát khỏi pha rẽ)
    void stop();
    void brake();
    void setSpeed(int16_t speed);

private:
    int16_t _baseSpeed;
    float _lastError;
    float _integral;
};

#endif
