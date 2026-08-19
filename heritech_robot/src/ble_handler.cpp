#include "ble_handler.h"
#include "config.h"

static BLEHandler* instance = nullptr;

void BLEHandler::begin() {
    if (!BLE.begin()) {
        Serial.println("[BLE] Failed to initialise");
        return;
    }

    BLE.setLocalName(BLE_DEVICE_NAME);
    BLE.setAdvertisedService(service);

    service.addCharacteristic(txChar);
    service.addCharacteristic(rxChar);

    rxChar.setEventHandler(BLEWritten, onRXWritten);

    BLE.addService(service);
    BLE.advertise();

    instance = this;
    Serial.println("[BLE] Advertising as HeritageBuddy");
}

bool BLEHandler::isConnected() {
    return _central && _central.connected();
}

bool BLEHandler::hasCentral() {
    return (bool)_central;
}

bool BLEHandler::wasConnected() {
    bool changed = _prevConnected != isConnected();
    _prevConnected = isConnected();
    return changed;
}

void BLEHandler::update() {
    BLE.poll();

    // Non-blocking chunked TX — must run every loop() iteration
    updateSend();

    if (!_central) {
        _central = BLE.central();
        if (_central) {
            Serial.print("[BLE] Connected to: ");
            Serial.println(_central.address());
        }
        return;
    }

    if (!_central.connected()) {
        Serial.println("[BLE] Disconnected");
        _central = BLEDevice();
    }

    // Khoan dung lệnh thiếu ký tự kết thúc: nếu 150ms không nhận thêm byte nào
    // mà buffer còn dữ liệu thì coi là hết lệnh. Chống kịch bản nRF Connect
    // gửi "MOTOR_TEST:40:40" mà quên bật end-of-line (\n không đến nơi).
    if (_rxBuffer.length() > 0 && millis() - _lastWriteMs > 150) {
        _msgReady = true;
    }
}

void BLEHandler::sendMessage(const String& msg) {
    if (!isConnected()) return;
    // If a previous message is still streaming, drop this one
    // (main loop should check isSending() before calling).
    if (_sendPos < _sendLen) return;

    _sendBuf = msg;
    _sendPos = 0;
    _sendLen = msg.length();
    _lastChunkMs = 0; // Force immediate first chunk
}

void BLEHandler::updateSend() {
    if (_sendPos >= _sendLen) return;

    // Throttle: 10ms between chunks — non-blocking, driven by millis()
    unsigned long now = millis();
    if (now - _lastChunkMs < 10) return;
    _lastChunkMs = now;

    int chunk = min(20, _sendLen - _sendPos);
    txChar.writeValue((const void*)(_sendBuf.c_str() + _sendPos), chunk, false);
    _sendPos += chunk;
}

bool BLEHandler::hasReceivedMessage() {
    bool ready = _msgReady;
    if (ready) _msgReady = false;
    return ready;
}

String BLEHandler::getReceivedMessage() {
    String msg = _rxBuffer;
    _rxBuffer = "";
    _msgReady = false;
    return msg;
}

void BLEHandler::onRXWritten(BLEDevice central, BLECharacteristic characteristic) {
    if (!instance) return;

    const uint8_t* data = characteristic.value();
    int len = characteristic.valueLength();

    for (int i = 0; i < len; i++) {
        char c = (char)data[i];
        if (c == '\\n' || c == '\\r') {
            if (instance->_rxBuffer.length() > 0) {
                instance->_msgReady = true;
            }
        } else {
            instance->_rxBuffer += c;
        }
    }
    instance->_lastWriteMs = millis();
}
