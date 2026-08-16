#ifndef MANEUVER_NAV_H
#define MANEUVER_NAV_H

#include "config.h"
#include "sensor_manager.h"
#include "motor_control.h"
#include <math.h>

// ─────────────────────────────────────────────────────────────
// Điều hướng theo CHUỖI THAO TÁC RỜI RẠC tại mỗi ngã ba (không phải bám
// line liên tục tự cua theo hình line). 5 chặng dưới đây đã được xác
// nhận đầy đủ theo mô tả thực tế.
//
// NGUYÊN TẮC BẮT BUỘC: robot dừng HẲN tại mỗi node (Node1..Node4) và
// CHỈ bắt đầu chặng lùi-ra khi main.cpp nhận được tín hiệu "đi tiếp"
// (NODE_DONE / VOICE_NEXT / NEXT_NODE) từ app. Không có timeout, không tự
// động rời node.
//
// KHÔNG đụng followLine()/PID hiện có — chỉ THÊM method mới trong
// MotorControl (turnLeft90/turnRight90/isLineCentered) và module điều
// phối riêng dùng lại followLine() cho các đoạn đi thẳng.
// ─────────────────────────────────────────────────────────────

enum ManeuverType : uint8_t {
    M_FWD_TO_JUNCTION,   // đi thẳng (bám line PID) đến khi gặp đúng loại ngã ba mong đợi
    M_TURN_LEFT,         // xoay tại chỗ 90° sang trái
    M_TURN_RIGHT,        // xoay tại chỗ 90° sang phải
    M_FWD_TO_RED,        // đi thẳng đến khi đọc màu đỏ ổn định -> tới node
    M_BACK_TO_JUNCTION,  // lùi (đi lùi) đến khi gặp lại ngã ba mong đợi
};

struct Maneuver {
    ManeuverType type;
    uint8_t juncTypeExpected; // 1=Left 2=Right 3=T/Cross(cả trái+phải), 0=bất kỳ 1/2/3
};

struct Leg {
    const Maneuver* steps;
    uint8_t          count;
};

// ===== LEG 1: Entrance -> Node1 (History Hall) =====
static const Maneuver LEG1_STEPS[] = {
    { M_FWD_TO_JUNCTION, 0 },
    { M_TURN_LEFT,       0 },
    { M_FWD_TO_JUNCTION, 0 },
    { M_TURN_LEFT,       0 },
    { M_FWD_TO_JUNCTION, 2 }, // ngã rẽ phải
    { M_TURN_RIGHT,      0 },
    { M_FWD_TO_RED,      0 },
};

// ===== LEG 2: Node1 (History) -> Node2 (Ceramics) =====
static const Maneuver LEG2_STEPS[] = {
    { M_BACK_TO_JUNCTION, 2 }, // lùi tới ngã rẽ phải
    { M_TURN_RIGHT,       0 },
    { M_FWD_TO_JUNCTION,  1 }, // ngã rẽ trái
    { M_TURN_LEFT,        0 },
    { M_FWD_TO_RED,       0 },
};

// ===== LEG 3: Node2 (Ceramics) -> Node3 (Ancient Artifacts) =====
static const Maneuver LEG3_STEPS[] = {
    { M_BACK_TO_JUNCTION, 3 }, // lùi tới ngã ba (T)
    { M_TURN_RIGHT,       0 },
    { M_FWD_TO_JUNCTION,  1 }, // ngã rẽ trái
    { M_TURN_LEFT,        0 },
    { M_FWD_TO_RED,       0 },
};

// ===== LEG 4: Node3 (Artifacts) -> Node4 (Special Exhibition) =====
static const Maneuver LEG4_STEPS[] = {
    { M_BACK_TO_JUNCTION, 1 }, // lùi tới ngã rẽ trái
    { M_TURN_LEFT,        0 },
    { M_FWD_TO_JUNCTION,  1 }, // ngã rẽ trái
    { M_TURN_LEFT,        0 },
    { M_FWD_TO_JUNCTION,  1 }, // ngã rẽ trái
    { M_TURN_LEFT,        0 },
    { M_FWD_TO_RED,       0 },
};

// ===== LEG 5: Node4 (Special) -> Finish (kết thúc tour) =====
static const Maneuver LEG5_STEPS[] = {
    { M_BACK_TO_JUNCTION, 3 }, // lùi tới ngã ba (trái+phải)
    { M_TURN_RIGHT,       0 },
    { M_FWD_TO_JUNCTION,  2 }, // ngã rẽ phải
    { M_TURN_RIGHT,       0 },
    { M_FWD_TO_JUNCTION,  2 }, // ngã rẽ phải
    { M_TURN_RIGHT,       0 },
    { M_FWD_TO_JUNCTION,  1 }, // ngã rẽ trái
    { M_TURN_LEFT,        0 },
    { M_FWD_TO_RED,       0 }, // -> đỏ cuối cùng = Finish
};

// index khớp ROUTE_NODES trong route_config.h: ROUTE_LEGS[i] là chặng
// ĐI TỚI ROUTE_NODES[i]. index 0 để trống (Entrance = vị trí xuất phát).
static const Leg ROUTE_LEGS[] = {
    { nullptr,     0 },                                     // 0: tại Entrance
    { LEG1_STEPS,  sizeof(LEG1_STEPS)/sizeof(Maneuver) },   // 1: -> Node1 History
    { LEG2_STEPS,  sizeof(LEG2_STEPS)/sizeof(Maneuver) },   // 2: -> Node2 Ceramics
    { LEG3_STEPS,  sizeof(LEG3_STEPS)/sizeof(Maneuver) },   // 3: -> Node3 Artifacts
    { LEG4_STEPS,  sizeof(LEG4_STEPS)/sizeof(Maneuver) },   // 4: -> Node4 Special
    { LEG5_STEPS,  sizeof(LEG5_STEPS)/sizeof(Maneuver) },   // 5: -> Finish
};
static const uint8_t ROUTE_LEGS_LEN = sizeof(ROUTE_LEGS) / sizeof(Leg);

// ─────────────────────────────────────────────────────────────
// LegExecutor — chạy 1 leg theo từng bước, non-blocking.
// CHỈ được gọi start() bởi main.cpp, và main.cpp CHỈ gọi start() khi:
//   (a) robot vừa bấm START tại Entrance (leg 1), hoặc
//   (b) app vừa gửi tín hiệu "đi tiếp" tại 1 node (leg kế tiếp).
// LegExecutor không tự ý bắt đầu chặng mới sau khi isDone() = true.
//
// Kết quả leg: DONE (đến đúng đích), FAILED (kẹt — rẽ quá lâu không thấy
// line) — main.cpp quyết định theo result (FAILED → về IDLE để khắc phục).
// ─────────────────────────────────────────────────────────────
enum class LegResult : uint8_t {
    RUNNING,
    DONE,
    FAILED,
};

class LegExecutor {
public:
    void start(uint8_t legIndex) {
        _leg = legIndex;
        _step = 0;
        _confirmCount = 0;
        _stepStartMs = millis();
        _started = true;
        _result = (legIndex == 0 || legIndex >= ROUTE_LEGS_LEN)
                      ? LegResult::DONE
                      : LegResult::RUNNING;
    }

    bool isStarted() const { return _started; }
    bool isDone() const { return _result != LegResult::RUNNING; }
    LegResult result() const { return _result; }
    uint8_t leg() const { return _leg; }
    uint8_t step() const { return _step; }

    void update(SensorManager& sensors, MotorControl& motors) {
        if (_result != LegResult::RUNNING) return;
        const Leg& leg = ROUTE_LEGS[_leg];
        if (_step >= leg.count) { motors.stop(); _result = LegResult::DONE; return; }

        const Maneuver& mv = leg.steps[_step];
        switch (mv.type) {
        case M_FWD_TO_JUNCTION:
            motors.followLine(sensors.readLineError());
            if (junctionMatches(sensors, mv.juncTypeExpected)) advanceStep(motors);
            break;
        case M_BACK_TO_JUNCTION:
            motors.move(-BASE_SPEED, -BASE_SPEED); // lùi thẳng
            if (junctionMatches(sensors, mv.juncTypeExpected)) advanceStep(motors);
            break;
        case M_TURN_LEFT:
            motors.turnLeft90();
            if (motors.isLineCentered(sensors)) advanceStep(motors);
            else if (turnTimedOut()) failStep(motors);
            break;
        case M_TURN_RIGHT:
            motors.turnRight90();
            if (motors.isLineCentered(sensors)) advanceStep(motors);
            else if (turnTimedOut()) failStep(motors);
            break;
        case M_FWD_TO_RED:
            motors.followLine(sensors.readLineError());
            if (sensors.isRedDetected()) {
                if (++_confirmCount >= COLOR_STABLE_COUNT) advanceStep(motors);
            } else {
                _confirmCount = 0;
            }
            break;
        }
    }

private:
    bool junctionMatches(SensorManager& sensors, uint8_t expected) {
        uint8_t j = sensors.readJunctionType(); // 0=None 1=Left 2=Right 3=T/Cross 4=Unknown
        bool isJunc = (expected == 0) ? (j == 1 || j == 2 || j == 3) : (j == expected);
        if (!isJunc) { _confirmCount = 0; return false; }
        return (++_confirmCount >= JUNCTION_CONFIRM_FRAMES);
    }

    bool turnTimedOut() const {
        return millis() - _stepStartMs >= TURN_TIMEOUT_MS;
    }

    void advanceStep(MotorControl& motors) {
        motors.stop();
        _confirmCount = 0;
        _step++;
        _stepStartMs = millis();
        if (_step >= ROUTE_LEGS[_leg].count) {
            _result = LegResult::DONE;
            motors.stop();
        }
    }

    void failStep(MotorControl& motors) {
        motors.stop();
        _result = LegResult::FAILED;
        Serial.println("[LEG] step FAILED (turn timeout, no line found)");
    }

    uint8_t  _leg = 0, _step = 0;
    uint16_t _confirmCount = 0;
    unsigned long _stepStartMs = 0;
    bool     _started = false;
    LegResult _result = LegResult::DONE;
};

#endif