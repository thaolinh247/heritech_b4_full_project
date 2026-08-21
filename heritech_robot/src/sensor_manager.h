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
    // Module PIR thực tế: idle = LOW, co nguoi = HIGH -> ACTIVE-HIGH
    // (xac nhan bang serial 21/08: pin chi dao H khi vuot tay, raw khop theo aHigh)
    bool             _pirActiveLow = false;
};

#endif
