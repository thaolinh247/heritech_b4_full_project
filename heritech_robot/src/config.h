#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ─── BLE ───────────────────────────────────────
#define BLE_DEVICE_NAME        "HeritageBuddy"
#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define TX_CHAR_UUID           "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"
#define RX_CHAR_UUID           "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

// ─── Cảm biến vật lý ──────────────────────────
#define PIN_PIR                3
#define PIN_SWITCH             5

// ─── I2C / MUX ────────────────────────────────
#define MUX_ADDRESS            0x70
#define I2C_CH_LINE            0
#define I2C_CH_COLOR           2
#define I2C_CH_GESTURE         3   // MUX ch3 = I2C4 port (matches MatrixMiniR4 example)

// ─── Motor & PID ───────────────────────────────
#define LINE_THRESHOLD         50
#define BASE_SPEED             30
#define MAX_SPEED              45
#define MIN_SPEED              10
#define PID_KP                 0.8
#define PID_KI                 0.02
#define PID_KD                 0.5

// ─── Màu sắc ───────────────────────────────────
#define COLOR_RED_ID           9
#define COLOR_STABLE_COUNT     3

// ─── PIR (cảm biến chuyển động) ────────────────
#define PIR_WARMUP_MS          10000   // PIR cần ~10s ổn định (60s quá lâu, robot chạy qua người)
#define PIR_DEBOUNCE_MS        400     // Chỉ tin HIGH liên tục >= 400ms
#define PIR_ALARM_COOLDOWN_MS  3000    // Chống báo liên tục
#define PIR_CLEAR_CONFIRM_MS   2000    // Đường thoáng khi PIR im lặng 2s
#define PIR_GRACE_AFTER_LEAVE_MS 2000  // Bỏ qua PIR 2s khi vừa rời node (turn + pause)
#define WARN_CLEAR_TIMEOUT_MS  10000   // Tối đa chờ đường thoáng
#define BUZZER_ALARM_MS        200

// ─── Switch (công tắc vật lý) ──────────────────
#define SWITCH_DEBOUNCE_MS     40
#define SOS_HOLD_MS            10000   // Giữ >= 10s → SOS

// ─── Gesture (cảm biến cử chỉ) ─────────────────
#define GESTURE_REINIT_INTERVAL_MS 2000
#define GESTURE_MAX_RETRY      20

// ─── Turn & Junction ────────────────────────────
#define TURN_SPEED             30      // toc do quay (0-100)
#define TURN_90_DEGREES        415.0f  // encoder degrees cho 90° pivot turn (calibrate if needed)
#define JUNCTION_WIDTH_MIN     6       // line width toi thieu de xac nhan junction
#define JUNCTION_LEFT_MIN      3       // so kenh trai toi thieu de xac nhan junction trai
#define JUNCTION_CONFIRM_FRAMES 3      // so frame xac nhan junction lien tiep

// ─── Thời gian ─────────────────────────────────
#define LOOP_DELAY_MS          20

// ─── Node ──────────────────────────────────────
#define NODE_ID_FIRST          1
#define NODE_ARRIVAL_BEEP_MS   200

#endif
