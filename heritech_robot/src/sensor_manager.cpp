#include "sensor_manager.h"
#include "config.h"

void SensorManager::begin() {
    Wire1.begin();
    Wire.begin();

    _lineTracer = &MiniR4.I2C0.MXLineTracer;
    _lineTracer->begin();
    _lineTracer->setThreshold(LINE_THRESHOLD);

    locateColorSensor();
    initGestureSensor();

    pinMode(PIN_PIR, _pirActiveLow ? INPUT_PULLUP : INPUT_PULLDOWN);
    pinMode(PIN_SWITCH, INPUT_PULLUP);

    Serial.print("[Sensor] PIR mode=");
    Serial.println(_pirActiveLow ? "activeLOW (idle HIGH -> no person)" : "activeHIGH");
    Serial.println("[Sensor] All sensors initialised");
}

static bool devicePresentOnSpot(TwoWire* wire, uint8_t ch, uint8_t addr) {
    if (ch != 255 && wire == &Wire1) {
        Wire1.beginTransmission(ADDR_PCA954X);
        Wire1.write(1 << ch);
        Wire1.endTransmission();
        delayMicroseconds(300);
    }
    wire->beginTransmission(addr);
    return wire->endTransmission() == 0;
}

void SensorManager::locateColorSensor() {
    if (devicePresentOnSpot(&Wire, 255, TCS34725_ADDRESS)) {
        _colorSensor._ch = 255;
        _colorSensor._pWire = &Wire;
        _colorSensor.begin();
        Serial.println("[Sensor] Color sensor @ A3/Wire");
        return;
    }
    if (devicePresentOnSpot(&Wire1, I2C_CH_COLOR, TCS34725_ADDRESS)) {
        _colorSensor._ch = I2C_CH_COLOR;
        _colorSensor._pWire = &Wire1;
        _colorSensor.begin();
        Serial.println("[Sensor] Color sensor @ MUX ch2");
        return;
    }
    for (int ch = 0; ch < 8; ch++) {
        if (ch == I2C_CH_COLOR) continue;
        if (devicePresentOnSpot(&Wire1, (uint8_t)ch, TCS34725_ADDRESS)) {
            _colorSensor._ch = (uint8_t)ch;
            _colorSensor._pWire = &Wire1;
            _colorSensor.begin();
            Serial.print("[Sensor] Color sensor @ MUX ch");
            Serial.println(ch);
            return;
        }
    }
    Serial.println("[Sensor] Color sensor NOT found");
}

bool SensorManager::tryGestureOnWire(TwoWire* wire, uint8_t ch) {
    if (ch == 255 && wire != &Wire) return false;
    if (!devicePresentOnSpot(wire, ch, PAJ7620_IIC_ADDR)) return false;
    _gestureSensor._ch = ch;
    _gestureSensor._pWire = wire;
    int result = _gestureSensor.begin();
    if (result == 0) {
        Serial.print("[Sensor] Gesture OK @ ");
        Serial.print(wire == &Wire ? "A3/Wire" : "MUX ch");
        if (wire != &Wire) Serial.print(ch);
        Serial.print(" (ch=");
        Serial.print(ch);
        Serial.println(")");
        _gestureOK = true;
        return true;
    }
    Serial.print("[Sensor] Gesture found but init failed @ ch");
    Serial.print(ch);
    Serial.print(" err=");
    Serial.println(result);
    return false;
}

bool SensorManager::initGestureSensor() {
    _gestureOK = false;
    if (tryGestureOnWire(&Wire1, I2C_CH_GESTURE)) return true;
    if (tryGestureOnWire(&Wire, 255)) return true;
    for (int ch = 0; ch < 8; ch++) {
        if (ch == I2C_CH_GESTURE) continue;
        if (tryGestureOnWire(&Wire1, (uint8_t)ch)) return true;
    }
    Serial.println("[Sensor] Gesture sensor NOT found");
    return false;
}

bool SensorManager::isGestureReady() { return _gestureOK; }

bool SensorManager::reinitGesture() {
    if (_gestureOK) return true;
    if (_gestureRetryCount >= GESTURE_MAX_RETRY) return false;
    _gestureRetryCount++;
    return initGestureSensor();
}

int SensorManager::readGesture() {
    if (!_gestureOK) return 0;
    return _gestureSensor.getGesture();
}

int SensorManager::readGestureNonBlocking() {
    if (!_gestureOK) return 0;

    // Select MUX channel if needed
    if (_gestureSensor._ch != 255) {
        _gestureSensor._pWire->beginTransmission(ADDR_PCA954X);
        _gestureSensor._pWire->write(1 << _gestureSensor._ch);
        _gestureSensor._pWire->endTransmission();
        delayMicroseconds(300);
    }

    TwoWire* wire = _gestureSensor._pWire;
    uint8_t addr = PAJ7620_IIC_ADDR;

    // Read flag_1 (0x44) first — same as library getGesture()
    wire->beginTransmission(addr);
    wire->write(PAJ7620_ADDR_GES_PS_DET_FLAG_1);
    wire->endTransmission();
    wire->requestFrom(addr, (uint8_t)1);
    if (!wire->available()) return 0;
    uint8_t flag1 = wire->read();

    // Wave detected (bit 0 of flag_1) — skip to avoid 1s block
    // Just return wave gesture code
    if (flag1 & 0x01) return 9;

    // Read flag_0 (0x43) — basic gestures
    wire->beginTransmission(addr);
    wire->write(PAJ7620_ADDR_GES_PS_DET_FLAG_0);
    wire->endTransmission();
    wire->requestFrom(addr, (uint8_t)1);
    if (!wire->available()) return 0;
    uint8_t flag0 = wire->read();

    // Map register bits to gesture values (matches library)
    if (flag0 & 0x01) return 1;   // Right
    if (flag0 & 0x02) return 2;   // Left
    if (flag0 & 0x04) return 3;   // Up
    if (flag0 & 0x08) return 4;   // Down
    if (flag0 & 0x10) return 5;   // Forward
    if (flag0 & 0x20) return 6;   // Backward
    if (flag0 & 0x40) return 7;   // Clockwise
    if (flag0 & 0x80) return 8;   // Anti-Clockwise

    return 0;
}

bool SensorManager::readPIR() {
    bool raw = digitalRead(PIN_PIR) == HIGH;
    return _pirActiveLow ? !raw : raw;
}

void SensorManager::setPIRMode(bool activeLow) {
    _pirActiveLow = activeLow;
    pinMode(PIN_PIR, activeLow ? INPUT_PULLUP : INPUT_PULLDOWN);
}

bool SensorManager::isPIRActiveLow() { return _pirActiveLow; }

bool SensorManager::readSwitch() {
    return digitalRead(PIN_SWITCH) == LOW;
}

float SensorManager::readLineError() {
    return _lineTracer->getError();
}

bool SensorManager::readLineRaw(uint8_t out[10]) {
    return _lineTracer->getAllSensors(out);
}

uint8_t SensorManager::readLineWidth() {
    return _lineTracer->getLineWidth();
}

int8_t SensorManager::readColorID() {
    return _colorSensor.getColorID();
}

bool SensorManager::isRedDetected() {
    return readColorID() == COLOR_RED_ID;
}

void SensorManager::calibrateBegin() {
    _lineTracer->startCalibration();
}

void SensorManager::calibrateEnd() {
    _lineTracer->endCalibration();
}

bool SensorManager::isLeftJunction() {
    uint8_t sensors[10] = {0};
    if (!_lineTracer->getAllSensors(sensors)) return false;

    // Line nam o 3 kenh ngoai cung TRAI (0,1,2)
    uint8_t leftActive = 0;
    for (uint8_t i = 0; i < 3; i++) {
        if (sensors[i] > (100 - LINE_THRESHOLD)) leftActive++;
    }
    if (leftActive < JUNCTION_LEFT_MIN) return false;

    // ... nhung 3 kenh ngoai cung PHAI (7,8,9) gan nhu sach
    // => line dang re sang trai, KHONG phai line thang dung rong
    uint8_t rightActive = 0;
    for (uint8_t i = 7; i < 10; i++) {
        if (sensors[i] > (100 - LINE_THRESHOLD)) rightActive++;
    }
    return rightActive <= JUNCTION_RIGHT_MAX;
}

bool SensorManager::isRightJunction() {
    uint8_t sensors[10] = {0};
    if (!_lineTracer->getAllSensors(sensors)) return false;

    // Line nam o 3 kenh ngoai cung PHAI (7,8,9)
    uint8_t rightActive = 0;
    for (uint8_t i = 7; i < 10; i++) {
        if (sensors[i] > (100 - LINE_THRESHOLD)) rightActive++;
    }
    if (rightActive < JUNCTION_LEFT_MIN) return false;

    // ... nhung 3 kenh ngoai cung TRAI (0,1,2) gan nhu sach
    uint8_t leftActive = 0;
    for (uint8_t i = 0; i < 3; i++) {
        if (sensors[i] > (100 - LINE_THRESHOLD)) leftActive++;
    }
    return leftActive <= JUNCTION_RIGHT_MAX;
}
