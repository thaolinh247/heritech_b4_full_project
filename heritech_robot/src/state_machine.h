#ifndef STATE_MACHINE_H
#define STATE_MACHINE_H

#include <Arduino.h>

enum class RobotState {
    IDLE,
    FOLLOW_LINE,
    WAIT_CLEAR,
    AT_NODE,
    TURNING,
    FOLLOW_TO_JUNCTION,
    PAUSED,
};

class StateMachine {
public:
    StateMachine();

    RobotState getState();
    void setState(RobotState newState);
    const char* getStateName();

    void update();
    bool isStateChanged();

private:
    RobotState _currentState;
    RobotState _previousState;
};

#endif
