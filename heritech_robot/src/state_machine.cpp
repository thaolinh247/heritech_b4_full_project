#include "state_machine.h"

StateMachine::StateMachine() {
    _currentState = RobotState::IDLE;
    _previousState = RobotState::IDLE;
}

RobotState StateMachine::getState() {
    return _currentState;
}

void StateMachine::setState(RobotState newState) {
    if (_currentState != newState) {
        _previousState = _currentState;
        _currentState = newState;
    }
}

const char* StateMachine::getStateName() {
    switch (_currentState) {
        case RobotState::IDLE:        return "IDLE";
        case RobotState::FOLLOW_LINE: return "FOLLOW_LINE";
        case RobotState::WAIT_CLEAR:   return "WAIT_CLEAR";
        case RobotState::AT_NODE:     return "AT_NODE";
        case RobotState::END:         return "END";
        default:                      return "UNKNOWN";
    }
}

bool StateMachine::isStateChanged() {
    bool changed = (_currentState != _previousState);
    if (changed) {
        _previousState = _currentState;
    }
    return changed;
}

void StateMachine::update() {
}
