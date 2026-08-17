#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

#define BLE_DEVICE_NAME        "HeritageBuddy"
#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define TX_CHAR_UUID           "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"
#define RX_CHAR_UUID           "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

#define PIN_PIR                3
#define PIN_SWITCH             5

#define MUX_ADDRESS            0x70
#define I2C_CH_LINE            0
#define I2C_CH_COLOR           2
// Cổng vật lý ↔ kênh MUX (xem MatrixMiniR4.h): I2C1=0, I2C2=1, I2C3=2, I2C4=3
#define I2C_CH_GESTURE         1   // Cổng I2C2

#define LINE_THRESHOLD         50
#define BASE_SPEED             30
#define MAX_SPEED              45
#define MIN_SPEED              10
#define PID_KP                 0.8
#define PID_KI                 0.02
#define PID_KD                 0.5

#define COLOR_RED_ID           9
#define COLOR_STABLE_COUNT     3

// ─── Ngã ba & WARN:turn_* (mục B2) ───────────
// Type 1 (trái) / 2 (phải) phải ổn định liên tục bấy nhiêu lần đọc liên tiếp
// mới tính là ngã ba thật (chống nhiễu) — cùng mô hình COLOR_STABLE_COUNT.
#define JUNCTION_CONFIRM_FRAMES 3
// Sau khi gửi WARN:turn_*, chặn gửi lại cho tới khi junctionType về 0/4
// VÀ qua tối thiểu bấy nhiêu ms — robot rẽ qua ngã ba chỉ báo đúng 1 lần,
// kể cả khi type nhấp nháy 1-0-1-0 trong lúc rẽ.
#define JUNCTION_REARM_MS     500
// Bước M_FWD_TO_JUNCTION / M_BACK_TO_JUNCTION: hết hạn này mà CHƯA xác nhận
// đúng loại ngã ba mong đợi — nhưng ĐÃ thấy ngã ba loại bất kỳ (1/2/3) trong
// bước — thì tự mở khóa để bước rẽ kế tiếp chạy theo kế hoạch. Chống kịch bản
// type 1↔2 lệch (sensor gắn ngược/track lệch): robot báo rẽ nhưng kẹt cứng
// không bao giờ xoay.
#define FWD_JUNC_TIMEOUT_MS  8000
// Bước xoay 90° (M_TURN_LEFT/RIGHT): chạm TURN_TIMEOUT_MS mà line chưa về
// giữa sensor → xoay LẠI từ đầu tối đa bấy nhiêu lần trước khi bỏ cuộc
// (line bị đứt/quá rộng ở ngã ba, xoay lại lần 2 thường chụp được line).
#define TURN_RETRY_MAX         2

// ─── Hiệu chỉnh Line Tracer (BTN_UP) ────────
// Giữ BTN_UP >= CALIB_HOLD_MS khi robot IDLE → bắt đầu quét calibration;
// sensor ghi min/max ánh sáng hiện trường trong CALIB_SWEEP_MS rồi tự kết thúc.
#define CALIB_HOLD_MS         2000
#define CALIB_SWEEP_MS        2000

// ─── Điều hướng leg-based (PLAN-MOVEMENT-FINAL) ─────────
// Xoay tại chỗ 90° ở ngã ba: nhanh/vừa, PID không liên quan.
#define TURN_SPEED              28
// Thoát khỏi pha rẽ khi line nằm giữa sensor: |err| < tol && w trong khoảng này.
#define LINE_CENTER_ERR_TOL     0.8f
#define LINE_CENTER_WIDTH_MIN   2
#define LINE_CENTER_WIDTH_MAX   4
// Rẽ quá lâu mà không thấy line (line đứt quãng/quá rộng) → FAILED về IDLE,
// không xoay vô hạn.
#define TURN_TIMEOUT_MS         4000

// Mỗi bước thao tác phải chạy tối thiểu bấy nhiêu ms trước khi được phép
// "xác nhận" (junction/đỏ/line-centered). Chống kịch bản: robot đứng ngay
// tại ngã ba/đỏ lúc bắt đầu → cảm biến đọc đúng type TỨC THÌ → bỏ qua bước
// (không rẽ/lùi), chuỗi bước nhảy liên tiếp → robot tưởng như không chạy.
#define STEP_MIN_MS             500

#define LOOP_DELAY_MS          20
#define PIR_ALARM_COOLDOWN_MS  3000
#define BUZZER_ALARM_MS        200

#define WARN_CLEAR_TIMEOUT_MS 10000  // An toàn: tối đa chờ đường thoáng (ms) — quá hạn vẫn tự chạy tiếp
#define PIR_CLEAR_CONFIRM_MS  2000   // Đường "thoáng" khi PIR im lặng liên tục bấy nhiêu ms → tự đi tiếp
#define SOS_HOLD_MS            10000  // Giữ switch >= 10s để kích hoạt SOS (tránh nhầm với nhấn nhanh để hỏi câu hỏi)
#define SWITCH_DEBOUNCE_MS     40     // Lọc nhiễu phím công tắc vật lý

// Khoảng thời gian (ms) sau khi robot rời node mà PIR được "bỏ qua" để phát hiện người.
// Tránh kịch bản: khách đứng trước robot vẫy tay điều khiển → PIR bắt chuyển động ngay sau
// đó → robot vừa chạy đi đã dừng lại vì WARN:person, gesture tưởng như "không ăn".
#define PIR_GRACE_AFTER_LEAVE_MS 4000

// ─── Tour TỰ ĐỘNG (demo) ─────────────────────
// Robot dừng tại node bao lâu (ms) trước khi TỰ đi tiếp chặng kế tiếp — mở
// node theo đúng thứ tự (lần đỏ thứ 1 → node 1, lần 2 → node 2...) mà không
// cần chạm app. Nhấn "Tiếp tục" trên app vẫn chạy NGAY (không chờ hết hạn).
// Finish: tự gửi ALL_DONE + kết thúc tour.
#define AUTO_NODE_DWELL_MS    15000
// Còi NHỎ báo "đã tới điểm dừng" — kêu khi đọc màu đỏ ổn định (ms).
#define NODE_ARRIVAL_BEEP_MS  200

// PIR cần thời gian ổn định sau khi bật nguồn (~30-60s): trong lúc này module tự phát
// vài xung HIGH giả (không có người/vật) → bỏ qua để tránh WARN:person lúc khởi động.
#define PIR_WARMUP_MS         60000

// Chỉ tin PIR khi HIGH liên tục bấy nhiêu ms — lọc xung nhiễu ngắn / cạnh giật
// (người đi thật thường làm PIR HIGH vài giây nên ngưỡng này không ảnh hưởng).
#define PIR_DEBOUNCE_MS       400

// Chu kỳ thử khởi tạo lại cảm biến cử chỉ khi chưa sẵn sàng (PAJ7620 mất vài giây
// để ổn định sau khi cấp nguồn, hoặc cắm muộn).
#define GESTURE_REINIT_INTERVAL_MS 2000

#endif
