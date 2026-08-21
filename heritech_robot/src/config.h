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
#define PIR_WARMUP_MS          3000    // PIR can ~3s on dinh sau khi khoi dong
// Chong bao loan: phai thay "co nguoi" DU TRUYEN LIEN TUC bao nhieu ms moi tinh
#define PIR_CONFIRM_MS         250
// Phat hien nguoi -> bao app (WARN:person) + dung CO DINH 5s roi tu di tiep
#define PIR_PAUSE_MS           5000
#define PIR_GRACE_AFTER_LEAVE_MS 2000  // Bo qua PIR 2s khi vua roi node/turn
#define BUZZER_ALARM_MS        200

// ─── Switch (công tắc vật lý) ──────────────────
#define SWITCH_DEBOUNCE_MS     40
#define SOS_HOLD_MS            10000   // Giữ >= 10s → SOS

// ─── Gesture (cảm biến cử chỉ) ─────────────────
#define GESTURE_REINIT_INTERVAL_MS 2000
#define GESTURE_MAX_RETRY      20

// ─── Turn (quay phải 90° tại chỗ, đều 2 bánh) ──
// 3 giai đoạn: quay nhanh → còn ≤30° giảm tốc → dừng, chờ quán tính,
// rồi bò hiệu chỉnh theo IMU (thiếu thì bò tới, lố thì bò lui, tối đa 4 lượt)
#define TURN_FULL_SPEED        28      // toc do quay nhanh ban dau (0-100)
#define TURN_SLOW_SPEED        12      // toc do cham khi gan dich
#define TURN_90_DEGREES        216.0f  // encoder degrees (moi banh) cho 90° pivot turn
#define TURN_DECEL_ZONE_DEG    30.0f   // con <=30° (theo encoder) thi giam xuong slow speed
#define TURN_TOLERANCE_DEG     3.5f    // sai so chap nhan (theo IMU)
#define TURN_SETTLE_MS         250     // dung xe -> cho quan tinh on dinh roi moi do lai
#define TURN_CREEP_SPEED       7       // toc do bo hieu chinh
#define TURN_CREEP_MS          500     // moi luat bo toi da 500ms
#define TURN_CREEP_SETTLE_MS   200     // nghi giua cac luat bo
#define TURN_CORRECT_MAX_ROUNDS 4      // toi da 4 luat hieu chinh
#define TURN_TIMEOUT_MS        12000   // phong ket (gom ca thoi gian hieu chinh)
// Hieu chinh IMU sau khi quay (cho quan tinh + bo bu goc): 1 = bat, 0 = tat.
// Tat -> quay du target encoder la tien luon sang chặng 30cm, khong dung nghi.
#define TURN_IMU_CORRECT       0
// Tru doc IMU de do goc quay: 3=Roll, 4=Pitch, 5=Yaw (board nam thang -> Yaw).
// Xem debug [TURN] ax=... : tru nao tang dan khi quay thi dung tru nay.
#define TURN_IMU_AXIS          5

// ─── Di thang truoc khi quay ────────────────────
// Thay vach do -> mo node -> DUNG CHO tin hieu "di tiep" -> di thang 8cm -> quay
#define PRE_TURN_DRIVE_CM      6.0f

// ─── Di thang thang hang ────────────────────────
// Dung setSpeed (PID cua lower MCU) de 2 banh deu toc do tuyet doi -> khong lac.
// DRIVE_TRIM: bu neu van con lech. Robot lech PHAI -> tang (+, banh phai nhanh hon),
// lech TRAI -> giam am. Buoc 1 hoac 2.
#define DRIVE_TRIM             0

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
#define CRUISE_SPEED           15      // toc do di thang cham khi tim vach do (0-100)
#define POST_TURN_DRIVE_SPEED  15      // toc do di thang cham sau khi quay 90°
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
