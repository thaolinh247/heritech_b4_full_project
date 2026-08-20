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

// ─── Motor & PID ───────────────────────────────
#define LINE_THRESHOLD         50
#define BASE_SPEED             30
#define MAX_SPEED              45
#define MIN_SPEED              10
// getError() tra ve day +/-4.5 (weighted average cua 10 kenh)
#define LINE_ERROR_MAX         4.5f
#define LINE_DEADBAND          0.06f   // |error| nho hon 6% (chuan +/-1) -> giu thang, het rung
#define PID_KP                 0.9     // he so ti le (bo he so D: doc nhieu moi 20ms lam rung robot)
#define PID_KI                 0.01
#define MAX_CORRECTION         0.8f    // chenh lech toi da giua 2 banh = 80% base (tranh quat goc)

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

// ─── Turn & Junction ────────────────────────────
#define TURN_SPEED             30      // toc do quay (0-100)
#define TURN_90_DEGREES        418.0f  // encoder degrees cho 90° pivot turn
#define TURN_TIMEOUT_MS        5000    // qua lau van coi nhu turn xong (chong ket)
#define TURN_PAUSE_AFTER_MS    2000    // dung yen 2s sau turn truoc khi bam line tiep
#define JUNCTION_LEFT_MIN      2       // so kenh (trong 3 kenh ngoai cung) toi thieu de coi la junction
#define JUNCTION_RIGHT_MAX     1       // so kenh ngoai cung phai toi da con line (phai gan nhu sach)
#define JUNCTION_CONFIRM_FRAMES 3      // so frame xac nhan junction lien tiep

// ─── Line lost / recovery ───────────────────────
#define LINE_LOST_STOP_MS      300     // mat line du 300ms moi bat dau quay tim
#define LINE_LOST_FLIP_MS      600     // doi chieu quay tim moi 600ms
#define SEARCH_SPEED           22      // toc do quay tim line (0-100)

// ─── Hành trình ──────────────────────────────────
// Node 1 = vach do dau tien, Node 2 = junction trai dau tien, ...
// Robot chi tiep tuc khi nhan tin hieu "di tiep" (BLE NODE_DONE / NEXT_NODE / VOICE_NEXT / gesture)
#define TOTAL_NODES            2

// ─── Sau khi quay 90° ───────────────────────────
// Quay xong -> bam line cham POST_TURN_SPEED trong POST_TURN_FOLLOW_MS -> dung han
#define POST_TURN_FOLLOW_MS     5000    // thoi gian bam line sau turn
#define POST_TURN_SPEED         20      // toc do cham sau turn (0-100)

// ─── Thời gian ─────────────────────────────────
#define LOOP_DELAY_MS          20

// ─── Node ──────────────────────────────────────
#define NODE_ID_FIRST          1
#define NODE_ARRIVAL_BEEP_MS   200

#endif
