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
    int8_t readColorID();
    bool isRedDetected();
    int readGesture();
    bool readPIR();
    bool readSwitch();
    bool isGestureReady();
    bool reinitGesture();

private:
    bool initGestureSensor();
    bool tryGestureOnChannel(int ch);

    MatrixLineTracer _lineTracer;
    MatrixColorV3    _colorSensor;
    MatrixGesture    _gestureSensor;
    bool             _gestureOK = false;
};

#endif
