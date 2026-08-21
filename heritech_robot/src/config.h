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
// Line tracer LUON o I2C0 (A3) — khong di qua MUX
#define I2C_CH_COLOR           2
#define I2C_CH_GESTURE         3   // MUX ch3 = I2C4 port (matches MatrixMiniR4 example)

// ─── Motor ─────────────────────────────────────
#define LINE_THRESHOLD         50
#define BASE_SPEED             30
#define MAX_SPEED              45
#define MIN_SPEED              10

/*
 * PID bám line (ĐÃ COMMENT — luồng mới KHÔNG bám line nữa)
 *
 * #define LINE_ERROR_MAX         4.5f
 * #define LINE_DEADBAND          0.06f
 * #define PID_KP                 0.9
 * #define PID_KI                 0.01
 * #define MAX_CORRECTION         0.8f
 * #define CORRECTION_SIGN        1
 * #define STRAIGHT_TRIM          0.0f
 */

// ─── Màu sắc ───────────────────────────────────
#define COLOR_RED_ID           9
#define COLOR_STABLE_COUNT     3

// ─── PIR (cảm biến chuyển động) ────────────────
#define PIR_WARMUP_MS          10000   // PIR cần ~10s ổn định (60s quá lâu, robot chạy qua người)
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

// ─── Turn (quay phải 90° tại chỗ, đều 2 bánh) ──
#define TURN_SPEED             30      // toc do quay (0-100)
// Pivot turn: moi banh chi di NUA cung tron so voi turn 1-banh cu (415).
// Test 21/08: de 415 thi robot quay ~180° -> chinh xac can mot nua = ~208
#define TURN_90_DEGREES        208.0f  // encoder degrees (moi banh) cho 90° pivot turn
#define TURN_TIMEOUT_MS        5000    // qua lau van coi nhu turn xong (chong ket)

// ─── Di thang truoc khi quay ────────────────────
// Nhan tin hieu "di tiep" -> di thang them 5cm ROI moi quay phai 90°
#define PRE_TURN_DRIVE_CM      5.0f

// Junction (van dung boi sensor_manager.cpp — khong goi trong luong moi)
#define JUNCTION_LEFT_MIN      2
#define JUNCTION_RIGHT_MAX     1
#define JUNCTION_CONFIRM_FRAMES 3

/*
 * Line-lost recovery (ĐÃ COMMENT — không còn bám line)
 *
 * #define LINE_LOST_STOP_MS      300
 * #define LINE_LOST_FLIP_MS      600
 * #define SEARCH_SPEED           22
 */

// ─── Luồng di chuyển mới: đi thẳng → đỏ → quay 90° → đi 30cm ──
#define CRUISE_SPEED           20      // toc do di thang cham khi tim vach do (0-100)
#define POST_TURN_DRIVE_SPEED  20      // toc do di thang cham sau khi quay 90°
#define DRIVE_DISTANCE_CM      30.0f   // quang duong di thang sau khi quay xong
#define ENCODER_DEGREES_PER_CM 17.6f   // 360 / chu vi banh(cm). Banh ~65mm -> ~17.6. Calib neu di le
#define DRIVE_TIMEOUT_MS       8000    // qua lau chua du quang duong -> dung (phong ket)

/*
 * Hành trình nhiều node + bám line sau turn (ĐÃ COMMENT — luồng mới chỉ có 1 chặng)
 *
 * #define TOTAL_NODES            2
 * #define POST_TURN_FOLLOW_MS    3000
 * #define POST_TURN_SPEED        20
 */

// ─── Thời gian ─────────────────────────────────
#define LOOP_DELAY_MS          20

// ─── Node ──────────────────────────────────────
#define NODE_ID_FIRST          1
#define NODE_ARRIVAL_BEEP_MS   200

#endif
