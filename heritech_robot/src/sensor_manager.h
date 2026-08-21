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
    uint8_t          _gestureRetryCount = 0;
    // Module PIR: idle = HIGH, co nguoi keo xuong LOW -> ACTIVE-LOW
    // (21/08 user quan sat: khong nguoi thi bao, co nguoi thi im = dung hanh vi
    //  active-low voi logic canh-len; neu dao lai thi gui lenh PIR_MODE:HIGH)
    bool             _pirActiveLow = true;
};

#endif
