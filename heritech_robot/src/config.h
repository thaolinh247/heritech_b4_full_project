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
#define I2C_CH_GESTURE         3

#define LINE_THRESHOLD         50
#define BASE_SPEED             40
#define MAX_SPEED              60
#define MIN_SPEED              10
#define PID_KP                 0.8
#define PID_KI                 0.02
#define PID_KD                 0.5

#define COLOR_RED_ID           9
#define COLOR_STABLE_COUNT     3

#define TOTAL_NODES            13

#define LOOP_DELAY_MS          20
#define PIR_ALARM_COOLDOWN_MS  3000
#define BUZZER_ALARM_MS        200

#define WARN_ACK_TIMEOUT_MS    10000  // Chờ ACK sau WARN:person (ms) — quá hạn tự chạy tiếp
#define SOS_HOLD_MS            2000   // Giữ switch >= 2s để kích hoạt SOS (tránh bấm nhầm)

#endif
