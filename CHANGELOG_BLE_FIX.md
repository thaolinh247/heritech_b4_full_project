# BLE Discovery Fix — Changelog

## Vấn đề

App kết nối BLE với robot thành công (LED xanh trên robot) nhưng vẫn hiện "Chưa kết nối".

**Log:**
```
LOG  [BLE] Connected!
WARN [BLE] Discover error: [BleError: Operation timed out]
WARN [BLE] UART service not found
LOG  [BLE] System disconnected
```

## Nguyên nhân gốc

1. **Delay 3.5s cứng trong `findUART()`** — được thêm vào vì firmware cũ có `playConnectSound()` dùng `delay()` blocking, làm treo `BLE.poll()`. Firmware đã được viết lại non-blocking (state machine `updateSound()` + `ble.update()` chạy song song mỗi loop), nhưng app chưa được cập nhật tương ứng.

2. **Không có retry** — `discoverAllServicesAndCharacteristics()` chỉ gọi đúng 1 lần. Nếu timeout (do jitter BLE, stack Android chưa sẵn sàng, khoảng cách...), code coi là thất bại vĩnh viễn và gọi `cancelConnection()` ngay — ngắt luôn kết nối đang có.

3. **`cancelConnection()` xóa kết nối thành công ở tầng link-layer** — robot đã connected (LED xanh), nhưng app tự ngắt chỉ vì 1 lần discover không thành công.

## Fix

**File:** `heritage-buddy-app/src/lib/bluetooth.ts` — hàm `findUART()`

### Trước
```ts
async function findUART(connectedDevice: any): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 3500));
  try {
    await connectedDevice.discoverAllServicesAndCharacteristics();
  } catch (e) {
    console.warn("[BLE] Discover error:", e);
    return false;
  }
  // ... services + characteristics
}
```

### Sau
```ts
async function findUART(connectedDevice: any): Promise<boolean> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await connectedDevice.discoverAllServicesAndCharacteristics();
      break;
    } catch (e) {
      console.warn(`[BLE] Discover error (attempt ${attempt}/${MAX_ATTEMPTS}):`, e);
      if (attempt === MAX_ATTEMPTS) return false;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  // ... services + characteristics (giữ nguyên)
}
```

### Thay đổi
| Trước | Sau |
|---|---|
| Delay 3.5s cứng trước discover | Bỏ delay (firmware đã non-blocking) |
| 0 lần retry | 3 lần retry với 800ms backoff |
| Thất bại 1 lần → `cancelConnection()` | Chỉ bỏ cuộc sau 3 lần, giữ kết nối khi retry |
