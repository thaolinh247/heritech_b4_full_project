// ─── BLE UUIDs (Nordic UART Service) ────────

const SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const TX_CHAR_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const RX_CHAR_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
const DEVICE_NAME = "HeritageBuddy";

// ─── Types ──────────────────────────────────

type MessageCallback = (message: string) => void;

interface BLEState {
  device: any | null;
  txCharacteristic: any | null;
  rxCharacteristic: any | null;
  isConnected: boolean;
  isScanning: boolean;
  messageCallbacks: MessageCallback[];
}

// ─── BLE Singleton ──────────────────────────

const bleState: BLEState = {
  device: null,
  txCharacteristic: null,
  rxCharacteristic: null,
  isConnected: false,
  isScanning: false,
  messageCallbacks: [],
};

// ─── Lazy load BLE module ───────────────────

let ble: any = null;

async function getBLEModule() {
  if (ble) return ble;

  try {
    ble = require("react-native-ble-plx");
    return ble;
  } catch (error) {
    console.warn("[BLE] react-native-ble-plx not available:", error);
    return null;
  }
}

// ─── Main Functions ─────────────────────────

export async function scanAndConnect(): Promise<boolean> {
  const BLEModule = await getBLEModule();
  if (!BLEModule) {
    console.error("[BLE] Module not available");
    return false;
  }

  try {
    bleState.isScanning = true;

    // Create BLE manager
    const manager = new BLEModule.BleManager();

    // Request permissions
    const permissions = await manager.requestPermissionsForAndroid();
    if (!permissions) {
      console.error("[BLE] Permissions denied");
      bleState.isScanning = false;
      return false;
    }

    // Scan for devices
    console.log("[BLE] Scanning for devices...");

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        manager.stopDeviceScan();
        bleState.isScanning = false;
        console.log("[BLE] Scan timeout");
        resolve(false);
      }, 10000);

      manager.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          console.error("[BLE] Scan error:", error);
          clearTimeout(timeout);
          manager.stopDeviceScan();
          bleState.isScanning = false;
          resolve(false);
          return;
        }

        if (device?.name === DEVICE_NAME) {
          clearTimeout(timeout);
          manager.stopDeviceScan();
          console.log(`[BLE] Found device: ${device.name}`);

          try {
            // Connect to device
            const connectedDevice = await manager.connectToDevice(device.id);
            console.log("[BLE] Connected!");

            // Discover services and characteristics
            await connectedDevice.discoverAllServicesAndCharacteristics();

            // Find UART service
            const services = await connectedDevice.servicesForDevice();

            for (const service of services) {
              if (service.uuid.toUpperCase().includes("6E400001")) {
                const characteristics =
                  await service.characteristicsForService();

                for (const char of characteristics) {
                  if (char.uuid.toUpperCase().includes("6E400003")) {
                    bleState.txCharacteristic = char;
                    // Subscribe to notifications
                    char.monitorCharacteristic((error: any, value: any) => {
                      if (error) {
                        console.error("[BLE] Monitor error:", error);
                        return;
                      }
                      if (value) {
                        const message = value.value;
                        console.log("[BLE RX]", message);
                        bleState.messageCallbacks.forEach((cb) => cb(message));
                      }
                    });
                  } else if (char.uuid.toUpperCase().includes("6E400002")) {
                    bleState.rxCharacteristic = char;
                  }
                }
              }
            }

            bleState.device = connectedDevice;
            bleState.isConnected = true;
            bleState.isScanning = false;

            console.log("[BLE] Ready for communication");
            resolve(true);
          } catch (connectError) {
            console.error("[BLE] Connection error:", connectError);
            bleState.isScanning = false;
            resolve(false);
          }
        }
      });
    });
  } catch (error) {
    console.error("[BLE] Error:", error);
    bleState.isScanning = false;
    return false;
  }
}

export async function sendCommand(cmd: string): Promise<void> {
  if (!bleState.rxCharacteristic || !bleState.isConnected) {
    console.warn("[BLE] Not connected, cannot send command");
    return;
  }

  try {
    const bytes = new TextEncoder().encode(cmd);
    await bleState.rxCharacteristic.writeWithResponse(bytes);
    console.log("[BLE TX]", cmd);
  } catch (error) {
    console.error("[BLE] Send error:", error);
  }
}

export function onMessage(callback: MessageCallback): () => void {
  bleState.messageCallbacks.push(callback);

  return () => {
    const index = bleState.messageCallbacks.indexOf(callback);
    if (index > -1) {
      bleState.messageCallbacks.splice(index, 1);
    }
  };
}

export async function disconnect(): Promise<void> {
  if (bleState.device) {
    try {
      await bleState.device.cancelConnection();
      console.log("[BLE] Disconnected");
    } catch (error) {
      console.warn("[BLE] Disconnect error:", error);
    }
  }

  bleState.device = null;
  bleState.txCharacteristic = null;
  bleState.rxCharacteristic = null;
  bleState.isConnected = false;
}

export function isConnected(): boolean {
  return bleState.isConnected;
}

export function isScanning(): boolean {
  return bleState.isScanning;
}
