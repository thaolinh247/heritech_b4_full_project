#include "sensor_manager.h"
#include "config.h"

void SensorManager::begin() {
    Wire1.begin();

    _lineTracer._ch = I2C_CH_LINE;
    _lineTracer._pWire = &Wire1;
    _lineTracer.begin();
    _lineTracer.setThreshold(LINE_THRESHOLD);

    _colorSensor._ch = I2C_CH_COLOR;
    _colorSensor._pWire = &Wire1;
    _colorSensor.begin();

    _gestureSensor._ch = I2C_CH_GESTURE;
    _gestureSensor._pWire = &Wire1;
    _gestureSensor.begin();

    pinMode(PIN_PIR, INPUT);
    pinMode(PIN_SWITCH, INPUT_PULLUP);

    Serial.println("[Sensor] All sensors initialised");
}

float SensorManager::readLineError() {
    return _lineTracer.getError();
}

uint8_t SensorManager::readLineWidth() {
    return _lineTracer.getLineWidth();
}

uint8_t SensorManager::readJunctionType() {
    return _lineTracer.getJunctionType();
}

int8_t SensorManager::readColorID() {
    return _colorSensor.getColorID();
}

bool SensorManager::isRedDetected() {
    return readColorID() == COLOR_RED_ID;
}

int SensorManager::readGesture() {
    return _gestureSensor.getGesture();
}

bool SensorManager::readPIR() {
    return digitalRead(PIN_PIR) == HIGH;
}

bool SensorManager::readSwitch() {
    return digitalRead(PIN_SWITCH) == LOW;
}
