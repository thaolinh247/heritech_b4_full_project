#ifndef MOTOR_CONTROL_H
#define MOTOR_CONTROL_H

#include <Arduino.h>

class MotorControl {
public:
    void begin();
    void move(int16_t leftPower, int16_t rightPower);
    void followLine(float error);
    void stop();
    void brake();
    void setSpeed(int16_t speed);

    void setupEncoder(uint16_t ppr, uint16_t maxRPM);
    bool moveDistance(int16_t speed, float cm);
    bool isDistanceReached();

private:
    int16_t _baseSpeed;
    float _lastError;
    float _integral;
    int32_t _targetDegrees;
};

#endif
