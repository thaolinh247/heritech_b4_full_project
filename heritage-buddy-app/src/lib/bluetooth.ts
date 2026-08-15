import { PermissionsAndroid, Platform } from "react-native";

// ─── BLE UUIDs (Nordic UART Service) ────────

const DEVICE_NAME = "HeritageBuddy";
const SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";

// ─── Types ──────────────────────────────────

type MessageCallback = (message: string) => void;
type DisconnectCallback = () => void;

interface BLEState {
  manager: any | null;
  device: any | null;
  deviceId: string | null;      // Cached MAC address for reconnection
  txCharacteristic: any | null;
  rxCharacteristic: any | null;
  isConnected: boolean;
  isConnecting: boolean;
  isScanning: boolean;
  messageCallbacks: MessageCallback[];
  disconnectCallbacks: DisconnectCallback[];
}

// ─── BLE Singleton ──────────────────────────

const bleState: BLEState = {
  manager: null,
  device: null,
  deviceId: null,
  txCharacteristic: null,
  rxCharacteristic: null,
  isConnected: false,
  isConnecting: false,
  isScanning: false,
  messageCallbacks: [],
  disconnectCallbacks: [],
};

// ─── Lazy load BLE module ───────────────────

let bleModule: any = null;

async function getBLEModule() {
  if (bleModule) return bleModule;

  try {
    bleModule = require("react-native-ble-plx");
    return bleModule;
  } catch (error) {
    console.warn("[BLE] react-native-ble-plx not available:", error);
    return null;
  }
}

async function getManager() {
  if (bleState.manager) return bleState.manager;
  const mod = await getBLEModule();
  if (!mod) return null;
  bleState.manager = new mod.BleManager();
  return bleState.manager;
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

// ─── Helper: subscribe notifications ────────

function subscribeNotifications(char: any) {
  const startMonitor = () => {
    char.monitor((error: any, characteristic: any) => {
      if (error) {
        console.warn("[BLE] Monitor error:", error?.message);
        // Resubscribe after a short delay — BLE notification monitoring
        // stops permanently after an error, so we must re-subscribe.
        setTimeout(() => {
          if (bleState.isConnected) {
            startMonitor();
          }
        }, 500);
        return;
      }
      if (characteristic?.value) {
        const message = atob(characteristic.value);
        console.log("[BLE RX]", message);
        bleState.messageCallbacks.forEach((cb) => cb(message));
      }
    });
  };
  startMonitor();
}

// ─── Helper: subscribe + find UART chars ────
// Retry discovery với backoff — firmware đã non-blocking nên không cần delay cứng 3.5s nữa.

async function findUART(connectedDevice: any): Promise<boolean> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await connectedDevice.discoverAllServicesAndCharacteristics();
      break;
    } catch (e) {
      console.warn(`[BLE] Discover error (attempt ${attempt}/${MAX_ATTEMPTS}):`, e);
      if (attempt === MAX_ATTEMPTS) return false;
      // Tăng backoff để firmware kịp BLE.poll() nếu đang busy
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  let services;
  try {
    services = await connectedDevice.services();
  } catch (e) {
    console.warn("[BLE] Services fetch error:", e);
    return false;
  }

  for (const service of services) {
    if (service.uuid.toUpperCase().includes("6E400001")) {
      let characteristics;
      try {
        characteristics = await service.characteristics();
      } catch (e) {
        console.warn("[BLE] Characteristics fetch error:", e);
        return false;
      }
      for (const char of characteristics) {
        const uuid = char.uuid.toUpperCase();
        if (uuid.includes("6E400003")) {
          bleState.txCharacteristic = char;
          subscribeNotifications(char);
        } else if (uuid.includes("6E400002")) {
          bleState.rxCharacteristic = char;
        }
      }
      return !!(bleState.txCharacteristic && bleState.rxCharacteristic);
    }
  }
  return false;
}

// ─── Connection mutex ───────────────────────
// Prevents concurrent scanAndConnect calls from racing.
let connectingPromise: Promise<boolean> | null = null;

// ─── Main Functions ─────────────────────────

export async function scanAndConnect(): Promise<boolean> {
  const manager = await getManager();
  if (!manager) return false;

  // Nếu đã kết nối rồi thì thoát
  if (bleState.isConnected) return true;

  // If a connection attempt is already in progress, share its result
  if (connectingPromise) {
    console.log("[BLE] Reusing in-progress connection attempt");
    return connectingPromise;
  }

  connectingPromise = doConnect(manager);
  try {
    return await connectingPromise;
  } finally {
    connectingPromise = null;
  }
}

async function doConnect(manager: any): Promise<boolean> {
  const permissions = await requestAndroidPermissions();
  if (!permissions) return false;

  // Strategy 1: cached deviceId (fastest — connect by MAC, no scan)
  if (bleState.deviceId) {
    console.log("[BLE] Trying cached device ID:", bleState.deviceId);
    const ok = await connectToCachedDevice(manager, bleState.deviceId);
    if (ok) return true;
  }

  // Strategy 2: scan (primary path, giống commit gốc)
  bleState.isScanning = true;
  console.log("[BLE] Scanning...");
  manager.stopDeviceScan();

  const scanResult = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(async () => {
      manager.stopDeviceScan();
      bleState.isScanning = false;
      console.log("[BLE] Scan timeout");

      // Last resort: connectedDevices
      try {
        const all = await manager.connectedDevices([]);
        const match = all.find((d: any) => d.name === DEVICE_NAME);
        if (match) {
          console.log("[BLE] Found via connectedDevices, connecting...");
          try { await match.cancelConnection(); } catch {}
          await new Promise((r) => setTimeout(r, 1000));
          const device = await manager.connectToDevice(match.id);
          const ok = await setupDevice(device);
          resolve(ok);
          return;
        }
      } catch {}
      resolve(false);
    }, 10000);

    manager.startDeviceScan(
      [SERVICE_UUID],
      null,
      async (error: any, device: any) => {
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
          console.log("[BLE] Found:", device.name);

          try {
            const connected = await manager.connectToDevice(device.id);
            const ok = await setupDevice(connected);
            bleState.isScanning = false;
            resolve(ok);
          } catch (connectError: any) {
            console.error("[BLE] Connection error:", connectError?.message ?? connectError);
            bleState.isScanning = false;
            resolve(false);
          }
        }
      },
    );
  });

  if (scanResult) return true;
  return false;
}

/** Connect to device by cached ID (no scan needed) */
async function connectToCachedDevice(manager: any, deviceId: string): Promise<boolean> {
  try {
    const device = await manager.connectToDevice(deviceId);
    console.log("[BLE] Connected via cached ID:", deviceId);
    const ok = await setupDevice(device);
    return ok;
  } catch (e) {
    console.warn("[BLE] Cached device connection failed:", e);
    return false;
  }
}

/** Connect + discover UART + set up state (giống commit gốc) */
let disconnectHandlerSetup = false;

async function setupDevice(connectedDevice: any): Promise<boolean> {
  console.log("[BLE] Connected!");

  // Settle delay: cho stack BLE bên robot ổn định link trước khi discover lần đầu
  await new Promise((r) => setTimeout(r, 500));

  const ok = await findUART(connectedDevice);
  if (!ok) {
    console.warn("[BLE] UART service not found");
    try {
      await connectedDevice.cancelConnection();
    } catch {
      // Device already disconnected
    }
    return false;
  }

  // Chỉ set onDisconnected sau khi discovery thành công
  // để tránh resetConnection() chạy giữa lúc discovery timeout
  if (!disconnectHandlerSetup) {
    connectedDevice.onDisconnected((err: any) => {
      // Chỉ reset khi device ngắt đúng là connection hiện tại — device cũ
      // ngắt muộn (sau khi đã kết nối device mới) không được đè trạng thái mới
      if (bleState.device === connectedDevice) {
        console.log("[BLE] System disconnected", err?.message ?? "");
        resetConnection();
      }
    });
    disconnectHandlerSetup = true;
  }

  bleState.device = connectedDevice;
  bleState.deviceId = connectedDevice.id;
  bleState.isConnected = true;
  console.log("[BLE] Ready");
  return true;
}

export async function sendCommand(cmd: string): Promise<void> {
  if (!bleState.rxCharacteristic || !bleState.isConnected) {
    console.warn("[BLE] Not connected, cannot send command");
    return;
  }

  try {
    // Bắt buộc kết thúc bằng "\n" — firmware chỉ hoàn tất 1 message khi gặp
    // '\n' hoặc '\r' trong onRXWritten (ble_handler.cpp). Thiếu ký tự này thì
    // mọi lệnh app → robot (START, SOS, NODE_DONE...) bị kẹt vĩnh viễn trong
    // _rxBuffer và robot không bao giờ xử lý.
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
  bleState.isConnecting = false;
  bleState.isScanning = false;
  disconnectHandlerSetup = false;

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
