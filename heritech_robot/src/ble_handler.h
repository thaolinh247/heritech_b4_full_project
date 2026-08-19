#ifndef BLE_HANDLER_H
#define BLE_HANDLER_H

#include <Arduino.h>
#include <ArduinoBLE.h>
#include "config.h"

class BLEHandler {
public:
    void begin();
    bool isConnected();
    bool hasCentral();
    void update();

    void sendMessage(const String& msg);
    bool hasReceivedMessage();
    String getReceivedMessage();

    bool wasConnected();

    // Returns true while a sendMessage() is still streaming chunks.
    // Main loop MUST keep calling ble.update() during this time.
    bool isSending() const { return _sendPos < _sendLen; }

private:
    BLEService service{SERVICE_UUID};
    BLECharacteristic txChar{TX_CHAR_UUID, BLERead | BLENotify, 20};
    BLECharacteristic rxChar{RX_CHAR_UUID, BLEWrite, 20};

    BLEDevice _central;
    String _rxBuffer;
    bool _msgReady = false;
    bool _prevConnected = false;
    unsigned long _lastWriteMs = 0;

    // Non-blocking chunked send state
    String _sendBuf;
    int _sendPos = 0;
    int _sendLen = 0;
    unsigned long _lastChunkMs = 0;

    void updateSend();

    static void onRXWritten(BLEDevice central, BLECharacteristic characteristic);
};

#endif
