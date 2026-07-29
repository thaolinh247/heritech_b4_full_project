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

private:
    BLEService service{SERVICE_UUID};
    BLECharacteristic txChar{TX_CHAR_UUID, BLERead | BLENotify, 20};
    BLECharacteristic rxChar{RX_CHAR_UUID, BLEWrite, 20};

    BLEDevice _central;
    String _rxBuffer;
    bool _msgReady = false;
    bool _prevConnected = false;

    static void onRXWritten(BLEDevice central, BLECharacteristic characteristic);
};

#endif
