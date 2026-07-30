import { PermissionsAndroid, Platform } from "react-native";

// ─── BLE UUIDs (Nordic UART Service) ────────

const DEVICE_NAME = "HeritageBuddy";

// ─── Types ──────────────────────────────────

type MessageCallback = (message: string) => void;
type DisconnectCallback = () => void;

interface BLEState {
  device: any | null;
  txCharacteristic: any | null;
  rxCharacteristic: any | null;
  isConnected: boolean;
  isScanning: boolean;
  messageCallbacks: MessageCallback[];
  disconnectCallbacks: DisconnectCallback[];
}

// ─── BLE Singleton ──────────────────────────

const bleState: BLEState = {
  device: null,
  txCharacteristic: null,
  rxCharacteristic: null,
  isConnected: false,
  isScanning: false,
  messageCallbacks: [],
  disconnectCallbacks: [],
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

// ─── Android Permissions ────────────────────

async function requestAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);

    const allGranted = Object.values(granted).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED,
    );

    if (!allGranted) {
      console.error("[BLE] Permissions denied");
      return false;
    }

    return true;
  } catch (error) {
    console.error("[BLE] Permission request error:", error);
    return false;
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

    // Request Android permissions
    const permissions = await requestAndroidPermissions();
    if (!permissions) {
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

      manager.startDeviceScan(null, null, async (error: any, device: any) => {
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
            const services = await connectedDevice.services();

            for (const service of services) {
              if (service.uuid.toUpperCase().includes("6E400001")) {
                  const characteristics =
                    await service.characteristics();

                for (const char of characteristics) {
                  if (char.uuid.toUpperCase().includes("6E400003")) {
                    bleState.txCharacteristic = char;
                    // Subscribe to notifications
                    char.monitor((error: any, characteristic: any) => {
                      if (error) {
                        console.warn("[BLE] Monitor disconnected");
                        resetConnection();
                        return;
                      }
                      if (characteristic?.value) {
                        const message = atob(characteristic.value);
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
    const base64 = btoa(cmd + "\n");
    await bleState.rxCharacteristic.writeWithResponse(base64);
    console.log("[BLE TX]", cmd);
  } catch {
    console.warn("[BLE] Send failed — device disconnected");
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

export function onDisconnect(callback: DisconnectCallback): () => void {
  bleState.disconnectCallbacks.push(callback);

  return () => {
    const index = bleState.disconnectCallbacks.indexOf(callback);
    if (index > -1) {
      bleState.disconnectCallbacks.splice(index, 1);
    }
  };
}

export function resetConnection(): void {
  bleState.device = null;
  bleState.txCharacteristic = null;
  bleState.rxCharacteristic = null;
  bleState.isConnected = false;
  bleState.isScanning = false;

  bleState.disconnectCallbacks.forEach((cb) => cb());
}

export async function disconnect(): Promise<void> {
  if (bleState.device) {
    try {
      await bleState.device.cancelConnection();
      console.log("[BLE] Disconnected");
    } catch {
      // Device already disconnected
    }
  }

  resetConnection();
}

export function isConnected(): boolean {
  return bleState.isConnected;
}

export function isScanning(): boolean {
  return bleState.isScanning;
}
