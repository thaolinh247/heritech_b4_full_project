#include "sensor_manager.h"
#include "config.h"

void SensorManager::begin() {
    Wire1.begin(); // bus I2C1-4 (qua MUX), dùng cho gesture/color
    Wire.begin();  // bus I2C0 (Port A3) — line tracer cắm trực tiếp ở đây

    // Line tracer: I2C0 (Port A3) — Wire trực tiếp, KHÔNG qua MUX.
    // Bằng chứng thực tế: đọc qua Wire1+MUX ch0 → getAllSensors() trả
    // NO_RESPONSE và robot chạy thẳng không bám line.
    _lineTracer = &MiniR4.I2C0.MXLineTracer;
    _lineTracer->begin();
    _lineTracer->setThreshold(LINE_THRESHOLD);

    _colorSensor._ch = I2C_CH_COLOR;
    _colorSensor._pWire = &Wire1;
    _colorSensor.begin();

    _gestureSensor._ch = I2C_CH_GESTURE;
    _gestureSensor._pWire = &Wire1;
    initGestureSensor();

    // INPUT_PULLDOWN: nếu dây tín hiệu PIR bị đứt/hở, chân sẽ đọc LOW thay vì
    // nổi HIGH — tránh WARN:person giả liên tục khi không có người.
    // (Module báo mức LOW khi có người? gửi lệnh PIR_MODE:LOW để đảo.)
    pinMode(PIN_PIR, INPUT_PULLDOWN);
    pinMode(PIN_SWITCH, INPUT_PULLUP);

    Serial.println("[Sensor] All sensors initialised");
    Serial.println(scanI2CReport());
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
    return _lineTracer->getError();
}

bool SensorManager::readLineRaw(uint8_t out[10]) {
    return _lineTracer->getAllSensors(out);
}

uint8_t SensorManager::readLineWidth() {
    return _lineTracer->getLineWidth();
}

uint8_t SensorManager::readJunctionType() {
    return _lineTracer->getJunctionType();
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
    bool raw = digitalRead(PIN_PIR) == HIGH;
    return _pirActiveLow ? !raw : raw;
}

void SensorManager::setPIRMode(bool activeLow) {
    _pirActiveLow = activeLow;
    pinMode(PIN_PIR, activeLow ? INPUT_PULLUP : INPUT_PULLDOWN);
    Serial.print("[Sensor] PIR mode: ");
    Serial.println(activeLow ? "ACTIVE_LOW (người -> chân xuống LOW)"
                             : "ACTIVE_HIGH (người -> chân lên HIGH)");
}

bool SensorManager::isPIRActiveLow() {
    return _pirActiveLow;
}

// Quét toàn bộ bus I2C: (1) cổng I2C0 = Wire trực tiếp (line tracer/đỏ),
// (2) Wire1: MUX 0x70 + từng kênh 0..7. Trả về chuỗi phân tách bằng '|'.
String SensorManager::scanI2CReport() {
    String report = "";
    const uint8_t startA = 0x03, endA = 0x78;

    // ── Bus I2C0 (Port A3, Wire trực tiếp) ──
    report += "SCAN A3(I2C0/Wire):";
    for (uint8_t addr = startA; addr <= endA; addr++) {
        Wire.beginTransmission(addr);
        if (Wire.endTransmission() == 0) {
            report += " 0x" + String(addr, HEX);
            delay(2);
        }
    }
    if (report.endsWith(":")) report += " none";

    // ── Bus Wire1: MUX + kênh 0..7 ──
    report += "|MUX0x70:";
    Wire1.beginTransmission(ADDR_PCA954X);
    bool muxFound = (Wire1.endTransmission() == 0);
    report += muxFound ? "yes" : "no";

    if (muxFound) {
        for (uint8_t ch = 0; ch < 8; ch++) {
            Wire1.beginTransmission(ADDR_PCA954X);
            Wire1.write(1 << ch);
            Wire1.endTransmission();
            delay(2);
            String found = "";
            for (uint8_t addr = startA; addr <= endA; addr++) {
                Wire1.beginTransmission(addr);
                if (Wire1.endTransmission() == 0) {
                    found += " 0x" + String(addr, HEX);
                    delay(2);
                }
            }
            report += "|ch" + String(ch) + ":" + (found.length() ? found : "none");
        }
        Wire1.beginTransmission(ADDR_PCA954X);
        Wire1.write(0);
        Wire1.endTransmission();
    }
    return report;
}

void SensorManager::calibrateBegin() {
    _lineTracer->startCalibration();
}

void SensorManager::calibrateEnd() {
    _lineTracer->endCalibration();
}

bool SensorManager::readSwitch() {
    return digitalRead(PIN_SWITCH) == LOW;
}
