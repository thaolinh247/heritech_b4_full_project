#ifndef NODE_MANAGER_H
#define NODE_MANAGER_H

#include <Arduino.h>
#include "config.h"

class NodeManager {
public:
    NodeManager();
    void reset();
    int getCurrentNode();
    int getTotalNodes();
    bool isLastNode();
    void nextNode();
    bool completeCurrentNode();
    bool allNodesCompleted();
    void setNode(int nodeId);

private:
    int _currentNode;
    bool _completed[TOTAL_NODES];
};

#endif
