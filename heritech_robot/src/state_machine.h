#ifndef STATE_MACHINE_H
#define STATE_MACHINE_H

#include <Arduino.h>

enum class RobotState {
    IDLE,
    CRUISE_TO_RED,   // đi thẳng chậm (KHÔNG bám line) tới khi thấy vạch đỏ
    WAIT_CLEAR,
    AT_NODE,
    PRE_TURN_DRIVE,  // nhận "đi tiếp" → đi thẳng thêm PRE_TURN_DRIVE_CM rồi mới quay
    TURNING,
    DRIVE_CM,        // đi thẳng chậm đủ DRIVE_DISTANCE_CM rồi dừng hẳn
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
