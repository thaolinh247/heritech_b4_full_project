#include "node_manager.h"
#include "config.h"

NodeManager::NodeManager() {
    reset();
}

void NodeManager::reset() {
    _currentNode = 0;
    for (int i = 0; i < TOTAL_NODES; i++) {
        _completed[i] = false;
    }
}

int NodeManager::getCurrentNode() {
    return _currentNode;
}

int NodeManager::getTotalNodes() {
    return TOTAL_NODES;
}

bool NodeManager::isLastNode() {
    return _currentNode >= TOTAL_NODES - 1;
}

void NodeManager::nextNode() {
    if (_currentNode < TOTAL_NODES - 1) {
        _currentNode++;
    }
}

bool NodeManager::completeCurrentNode() {
    if (_currentNode >= 0 && _currentNode < TOTAL_NODES) {
        _completed[_currentNode] = true;
        return true;
    }
    return false;
}

bool NodeManager::allNodesCompleted() {
    for (int i = 0; i < TOTAL_NODES; i++) {
        if (!_completed[i]) return false;
    }
    return true;
}

void NodeManager::setNode(int nodeId) {
    if (nodeId >= 0 && nodeId < TOTAL_NODES) {
        _currentNode = nodeId;
    }
}
