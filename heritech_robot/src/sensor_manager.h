#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include <Wire.h>
#include <MatrixMiniR4.h>
#include "Modules/Sensors/MiniR4_MXLineTracer.h"
#include "Modules/Sensors/MiniR4_MXColorV3.h"
#include "Modules/Sensors/MiniR4_MXGesture.h"

class SensorManager {
public:
    void begin();

    // Line tracer
    float readLineError();
    uint8_t readLineWidth();
    bool readLineRaw(uint8_t out[10]);
    void calibrateBegin();
    void calibrateEnd();

    // Color sensor
    int8_t readColorID();
    bool isRedDetected();

    // PIR (motion)
    bool readPIR();
    void setPIRMode(bool activeLow);
    bool isPIRActiveLow();

    // Switch (physical button)
    bool readSwitch();

    // Gesture (PAJ7620)
    int readGesture();
    int readGestureNonBlocking();
    bool isGestureReady();
    bool reinitGesture();

    // Debug: ket qua doc flag gan nhat (f0/f1 = 0xFF khi I2C khong phan hoi)
    bool gestureLastReadOK() { return _gestLastReadOK; }
    uint8_t gestureLastFlag0() { return _gestFlag0; }
    uint8_t gestureLastFlag1() { return _gestFlag1; }

    // Junction detection
    bool isLeftJunction();
    bool isRightJunction();

private:
    bool initGestureSensor();
    bool tryGestureOnWire(TwoWire* wire, uint8_t ch);
    void locateColorSensor();

    MatrixLineTracer* _lineTracer;
    MatrixColorV3    _colorSensor;
    MatrixGesture    _gestureSensor;
    bool             _gestureOK = false;
    uint16_t         _gestFailCount = 0;   // so lan doc I2C lien tiep that bai
    bool             _gestLastReadOK = false;
    uint8_t          _gestFlag0 = 0;
    uint8_t          _gestFlag1 = 0;
    // Module PIR: idle = LOW, co nguoi = HIGH -> ACTIVE-HIGH
    // (chot boi 2 lan test 21/08: aLow lam robot im lap hoan toan vi raw keo=1
    //  vinh vien; aHigh thi cac dot H vai giay khop chinh xac theo tay)
    bool             _pirActiveLow = false;
};

#endif
