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

    // Màu sắc (0x29) và gesture (0x73): TỰ DÒ — thử A3/Wire trước, rồi MUX
    // ch0..7 — robot chạy demo được ngay dù cắm cổng nào.
    locateColorSensor();
    initGestureSensor();

    // INPUT_PULLDOWN: nếu dây tín hiệu PIR bị đứt/hở, chân sẽ đọc LOW thay vì
    // nổi HIGH — tránh WARN:person giả liên tục khi không có người.
    // (Module báo mức LOW khi có người? gửi lệnh PIR_MODE:LOW để đảo.)
    pinMode(PIN_PIR, _pirActiveLow ? INPUT_PULLUP : INPUT_PULLDOWN);
    pinMode(PIN_SWITCH, INPUT_PULLUP);

    Serial.println("[Sensor] All sensors initialised");
    Serial.println(scanI2CReport());
}

void SensorManager::selectMuxChannel(uint8_t ch) {
    // MUX PCA9548 trên bus Wire1 — chọn kênh 0..7 (byte = 1<<ch).
    // Gọi an toàn kể cả khi MUX không tồn tại (write bị bỏ qua, không ACK).
    Wire1.beginTransmission(ADDR_PCA954X);
    Wire1.write(1 << ch);
    Wire1.endTransmission();
    delayMicroseconds(100);
}

// Thử xem thiết bị địa chỉ `addr` có nằm trên spot (wire, ch) không.
// ch = 255 → không qua MUX (đường A3/Wire trực tiếp).
static bool devicePresentOnSpot(TwoWire* wire, uint8_t ch, uint8_t addr) {
    if (ch != 255 && wire == &Wire1) {
        Wire1.beginTransmission(ADDR_PCA954X);
        Wire1.write(1 << ch);
        Wire1.endTransmission();
        delayMicroseconds(100);
    }
    wire->beginTransmission(addr);
    return wire->endTransmission() == 0;
}

bool SensorManager::tryGestureOnWire(TwoWire* wire, uint8_t ch) {
    if (ch == 255 && wire != &Wire) return false;     // A3 luôn là Wire
    if (!devicePresentOnSpot(wire, ch, PAJ7620_IIC_ADDR)) return false;
    _gestureSensor._ch = ch;
    _gestureSensor._pWire = wire;
    int result = _gestureSensor.begin();
    if (result == 0) {
        Serial.print("[Sensor] Gesture OK @ ");
        Serial.print(wire == &Wire ? "A3/Wire" : "MUX ch");
        if (wire != &Wire) Serial.print(ch);
        Serial.println();
        _gestureOK = true;
        return true;
    }
    return false;
}

bool SensorManager::initGestureSensor() {
    _gestureOK = false;
    // Ưu tiên: cấu hình cũ (MUX ch1) → A3/Wire → quét toàn bộ kênh MUX.
    if (tryGestureOnWire(&Wire1, I2C_CH_GESTURE)) return true;
    if (tryGestureOnWire(&Wire, 255)) return true;
    for (int ch = 0; ch < 8; ch++) {
        if (ch == I2C_CH_GESTURE) continue;
        if (tryGestureOnWire(&Wire1, (uint8_t)ch)) return true;
    }
    Serial.println("[Sensor] Gesture sensor NOT found");
    return false;
}

void SensorManager::locateColorSensor() {
    // Ưu tiên: A3/Wire → cấu hình cũ (MUX ch2) → quét toàn bộ kênh MUX.
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
