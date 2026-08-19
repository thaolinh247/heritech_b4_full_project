#ifndef MOTOR_CONTROL_H
#define MOTOR_CONTROL_H

#include <Arduino.h>

class MotorControl {
public:
    void begin();
    void followLine(float error);
    void stop();
    void setSpeed(int16_t speed);

    // Non-blocking turn
    void startTurnRight90();
    bool isTurnComplete();
    void cancelTurn();

private:
    int16_t _baseSpeed;
    float _lastError;
    float _integral;
    bool _turning;
    float _turnTargetDegrees;
};

#endif
