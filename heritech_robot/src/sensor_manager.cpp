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
    initGestureSensor();

    pinMode(PIN_PIR, INPUT);
    pinMode(PIN_SWITCH, INPUT_PULLUP);

    Serial.println("[Sensor] All sensors initialised");
}

bool SensorManager::tryGestureOnChannel(int ch) {
    _gestureSensor._ch = ch;
    _gestureSensor._pWire = &Wire1;
    int result = _gestureSensor.begin();
    if (result == 0) {
        Serial.print("[Sensor] Gesture sensor OK on channel ");
        Serial.println(ch);
        _gestureOK = true;
        return true;
    }
    Serial.print("[Sensor] Gesture sensor init failed on channel ");
    Serial.print(ch);
    Serial.print(" (code ");
    Serial.print(result);
    Serial.println(")");
    return false;
}

bool SensorManager::initGestureSensor() {
    _gestureOK = false;

    // Thử kênh cấu hình trước; nếu thất bại, quét toàn bộ kênh MUX để tìm
    // sensor (tránh lỗi "cắm nhầm cổng → sensor im lặng vĩnh viễn").
    if (tryGestureOnChannel(I2C_CH_GESTURE)) return true;

    for (int ch = 0; ch < 8; ch++) {
        if (ch == I2C_CH_GESTURE) continue;
        if (tryGestureOnChannel(ch)) return true;
        delay(50);
    }

    Serial.println("[Sensor] Gesture sensor NOT found on any MUX channel");
    return false;
}

bool SensorManager::isGestureReady() {
    return _gestureOK;
}

bool SensorManager::reinitGesture() {
    if (_gestureOK) return true;
    Serial.println("[Sensor] Retrying gesture sensor init...");
    return initGestureSensor();
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
