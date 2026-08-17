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
    float readLineError();
    uint8_t readLineWidth();
    uint8_t readJunctionType();
    bool readLineRaw(uint8_t out[10]);
    int8_t readColorID();
    bool isRedDetected();
    int readGesture();
    bool readPIR();
    bool readSwitch();
    bool isGestureReady();
    bool reinitGesture();
    void calibrateBegin();
    void calibrateEnd();
    void setPIRMode(bool activeLow);
    bool isPIRActiveLow();
    String scanI2CReport();

private:
    bool initGestureSensor();
    bool tryGestureOnWire(TwoWire* wire, uint8_t ch); // ch=255: không qua MUX (A3/Wire)
    void locateColorSensor();
    void selectMuxChannel(uint8_t ch);

    // Line tracer cắm ở cổng I2C0 (Port A3) — Wire TRỰC TIẾP không qua MUX
    // (giống code B3). Trỏ vào instance của chính thư viện MiniR4.
    MatrixLineTracer* _lineTracer;
    MatrixColorV3    _colorSensor;
    MatrixGesture    _gestureSensor;
    bool             _gestureOK = false;
    bool             _pirActiveLow = false; // module PIR báo mức LOW khi có người
};

#endif
