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
}

void BLEHandler::sendMessage(const String& msg) {
    if (!isConnected()) return;

    uint8_t buf[20];
    int len = msg.length();
    int pos = 0;

    while (pos < len) {
        int chunk = min(20, len - pos);
        for (int i = 0; i < chunk; i++) {
            buf[i] = (uint8_t)msg[pos + i];
        }
        txChar.writeValue((const void*)buf, chunk, false);
        pos += chunk;
        delay(10);
    }
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
        if (c == '\n' || c == '\r') {
            if (instance->_rxBuffer.length() > 0) {
                instance->_msgReady = true;
            }
        } else {
            instance->_rxBuffer += c;
        }
    }
}
