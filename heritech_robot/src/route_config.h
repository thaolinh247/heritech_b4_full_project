#ifndef ROUTE_CONFIG_H
#define ROUTE_CONFIG_H

#include <Arduino.h>

// ─────────────────────────────────────────────────────────────
// Bảng NODE của tour theo lộ trình thật đã xác nhận:
// Entrance(xuất phát) -> Node1(History) -> Node2(Ceramics)
//   -> Node3(Artifacts) -> Node4(Special) -> Finish(kết thúc)
//
// KHÔNG đụng followLine()/PID/checkJunction() — chỉ là bảng dữ liệu +
// NodeManager quản lý vị trí hiện tại trong tour.
// ─────────────────────────────────────────────────────────────

enum NodeID : uint8_t {
    NODE_ENTRANCE   = 0,  // xuất phát — KHÔNG dò màu, robot đã đứng sẵn ở đây
    NODE_1_HISTORY  = 1,  // History Hall
    NODE_2_CERAMICS = 2,  // Ceramics Exhibit
    NODE_3_ARTIFACT = 3,  // Ancient Artifacts
    NODE_4_SPECIAL  = 4,  // Special Exhibition
    NODE_5_FINISH   = 5,  // điểm đỏ cuối cùng — KẾT THÚC tour (không mở node trong app)
};

struct RouteNode {
    uint8_t     nodeId;
    const char* name;
    bool        isStop;     // true = dừng hẳn + mở node trong app, chờ tín hiệu "đi tiếp"
    bool        isFinish;   // true = đây là điểm cuối -> gửi ALL_DONE, KHÔNG mở node, KHÔNG chờ next
};

// index này song song với mảng LEG trong maneuver_nav.h:
// ROUTE_NODES[i] là node ĐẾN SAU KHI hoàn thành ROUTE_LEGS[i]
static const RouteNode ROUTE_NODES[] = {
    { NODE_ENTRANCE,    "Entrance (xuất phát)",    false, false }, // 0: chưa chạy leg nào
    { NODE_1_HISTORY,   "History Hall",            true,  false }, // 1: mở Node 1
    { NODE_2_CERAMICS,  "Ceramics Exhibit",        true,  false }, // 2: mở Node 2
    { NODE_3_ARTIFACT,  "Ancient Artifacts",       true,  false }, // 3: mở Node 3
    { NODE_4_SPECIAL,   "Special Exhibition",      true,  false }, // 4: mở Node 4
    { NODE_5_FINISH,    "Finish (kết thúc tour)",  false, true  }, // 5: ALL_DONE
};
static const uint8_t ROUTE_NODES_LEN = sizeof(ROUTE_NODES) / sizeof(RouteNode);

// ─────────────────────────────────────────────────────────────
// NodeManager — chỉ quản lý VỊ TRÍ hiện tại (index), không tự ý di
// chuyển. Việc di chuyển do LegExecutor (maneuver_nav.h) đảm nhiệm, và
// LegExecutor chỉ được lệnh start() khi main.cpp nhận tín hiệu từ app.
// ─────────────────────────────────────────────────────────────
class NodeManager {
public:
    void begin() { _idx = 0; }
    void reset() { _idx = 0; }

    const RouteNode& current() const { return ROUTE_NODES[_idx]; }
    uint8_t index() const { return _idx; }
    bool isLast() const { return _idx >= ROUTE_NODES_LEN - 1; }

    // Gọi khi LegExecutor báo isDone() == true (vừa đọc được màu đỏ ổn định)
    void arrivedAtNext() {
        if (_idx < ROUTE_NODES_LEN - 1) _idx++;
    }

private:
    uint8_t _idx = 0;
};

#endif