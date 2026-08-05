# PLAN-BLE-FIX — Kế hoạch sửa lỗi BLE Discovery Timeout

> **Ngày:** 2026-08-05 | **Deadline:** 14/08 (GATE 1 — kiểm thử tích hợp trên tuyến thật, theo `plan-ver2.md`)
> **Liên quan:** `CHANGELOG_BLE_FIX.md` (đã fix lần 1) · `heritage-buddy-app/src/lib/bluetooth.ts` · `heritage-buddy-app/src/hooks/use-robot-connection.ts` · `heritech_robot/src/main.cpp` · `heritech_robot/platformio.ini`
> **Bắt buộc:** Mọi thay đổi code phải có mục trong `CHANGELOG.md` + commit theo Conventional Commits + `git push`.

---

## 1. Vấn đề

App quét thấy robot (`Found: HeritageBuddy`), kết nối link-layer thành công (robot LED xanh) **nhưng** quá trình tìm dịch vụ UART fail, app tự ngắt.

**Log:**
```
LOG  [BLE] Scanning...
LOG  [BLE] Found: HeritageBuddy
LOG  [BLE] Connected!
WARN [BLE] Discover error (attempt 1/3): [BleError: Operation timed out]
WARN [BLE] UART service not found
```

**Ảnh hưởng:** app không nhận `NODE_START`/`WARN`, không gửi được lệnh → toàn bộ flow tour + tương tác 2 chiều đứng.

> **Ghi chú log:** format "attempt x/3" chỉ có trong code retry **mới nhất** (`bluetooth.ts` sau commit `708e60a`) ⇒ log này chứng minh **code hiện tại fail cả 3 lần** → lỗi mang tính hệ thống, không phải jitter nhất thời (nếu là jitter thì attempt 2/3 đã có lúc qua). H2 (gọi quá sớm) gần như bị loại; nguyên nhân nghiêng về **H1 (firmware cũ trên robot)** hoặc **H3 (GATT cache Android)**.

## 2. Chẩn đoán — xác minh giả thuyết TRƯỚC khi sửa

| # | Giả thuyết | Bằng chứng để xác nhận | Kết luận sau kiểm |
|---|---|---|---|
| H1 | Robot đang chạy firmware CŨ (trước commit `c2701de`, `playConnectSound()` blocking) | **Fingerprint tốc độ Serial:** firmware cũ = 115200, mới = 9600 (`main.cpp:110` block cũ đã comment). Monitor 115200 thấy log → firmware cũ. Ngoài ra so `git log` bản đã nạp | ☐ |
| H2 | `discoverAllServices...` gọi quá sớm sau connect, stack GATT chưa "chín" | ~~Quan sát attempt 2/3 thành công~~ — **log hiện tại fail 3/3 ⇒ H2 gần như loại**, chỉ xem lại nếu sau Bước 0 vẫn fail | ☐ |
| H3 | Android GATT cache cũ (đã từng connect cùng robot) | Sau khi "quên" device + tắt/bật BT, connect có qua? | ☐ |
| H4 | (Hỗ trợ debug) `monitor_speed` sai → không đọc được Serial firmware | `platformio.ini` = 115200 nhưng `Serial.begin(9600)` ở `main.cpp:122` | ☐ |

> **Nguyên lý gốc (đã ghi trong `CHANGELOG_BLE_FIX.md`):** ArduinoBLE chỉ xử lý GATT service discovery **bên trong `BLE.poll()`**. Nếu firmware không poll đều trong vài giây đầu sau connect → robot không trả lời discovery → Android timeout.

## 3. Bước 0 — test rẻ nhất, KHÔNG cần sửa code (chạy trước mọi fix)

Hai thao tác này mỗi cái < 2 phút, có thể giải quyết vấn đề ngay mà không đụng code:

- [ ] **(a) Xác định firmware trên robot bằng monitor speed:** mở PlatformIO Serial Monitor ở 115200 → bấm nút reset robot.
  - Thấy log (`[BLE] Advertising as HeritageBuddy`) → robot đang chạy **firmware CŨ (115200)** → **H1 xác nhận** → nạp lại bản mới nhất, xong.
  - Không thấy log → thử 9600. Thấy log → firmware MỚI → **H1 loại**, sang (b).
- [ ] **(b) Loại trừ GATT cache:** Settings → Bluetooth → quên "HeritageBuddy" → tắt/bật Bluetooth → connect lại từ app.
  - Connect qua → **H3 xác nhận** → áp Fix 3 (runbook), không cần sửa code app.
  - Vẫn fail → H3 loại, đi tiếp Fix 4 → Fix 1 → Fix 2.

## 4. Các fix theo thứ tự ưu tiên

### Fix 4 (🔵 1 phút) — Sửa `monitor_speed` khớp firmware hiện tại
**File:** `heritech_robot/platformio.ini`
- [x] Đổi `monitor_speed = 115200` → `9600` (khớp `Serial.begin(9600)` ở `main.cpp:122`). Đây vừa là fix debug vừa là công cụ cho Bước 0(a). *(done — commit BLE-fix 2026-08-05)*

### Fix 1 (🔴 Bắt buộc nếu H1) — Firmware: bảo đảm `BLE.poll()` chạy đều khi connected
**Files:** `heritech_robot/src/main.cpp`, `heritech_robot/src/ble_handler.cpp`
- [x] Xác nhận code firmware đã non-blocking (`updateSound()` — commit `c2701de` trở đi). *(done — xác minh bằng code)*
- [ ] **THAO TÁC PHẦN CỨNG:** nạp lại firmware mới nhất bằng PlatformIO (`pio run -t upload`).
- [x] Soát nhánh loop **khi connected**: không có `delay()` blocking ngoài `LOOP_DELAY_MS=20` (hiện OK: `delay(50)` trong `checkButton` chỉ chạy khi có cạnh nút — main.cpp:249; `handleEnd` chỉ có `delay(150)` khi vào END — main.cpp:566; `sendMessage` có `delay(10)/chunk` — ble_handler.cpp:73 nhưng chỉ khi gửi). *(done)*
- [x] Thêm log debug tạm thời: in độ dài vòng lặp (`millis()`) mỗi ~3s khi connected (`[LOOP] max loop time:`), để bắt chỗ blocking (I2C gesture/laser, `Serial.print` chậm...). *(done — main.cpp)*
- [ ] Kiểm trên Serial: `[LOOP] max loop time` luôn ≤ ~50ms; nếu có chỗ blocking → tách non-blocking (giống `updateSound()`).

### Fix 2 (🟠 Bắt buộc) — App: cứng hóa discovery + auto-retry
**Files:** `heritage-buddy-app/src/lib/bluetooth.ts`, `heritage-buddy-app/src/hooks/use-robot-connection.ts`
- [x] Thêm delay ngắn **~500ms sau `connectToDevice()` trước lần discover đầu tiên** (`setupDevice`). *(done)*
- [x] Tăng backoff giữa các lần retry: `1500ms → 2500ms`. *(done)*
- [x] **Wrap try/catch quanh `services()` và `service.characteristics()`** — timeout ở bước này không còn bị log nhầm thành "Connection error". *(done)*
- [x] **Auto-retry khi discovery fail + auto-reconnect:** hook level — sau `connect()` thất bại hoặc mất kết nối (trừ người dùng chủ động ngắt) → tự gọi lại `connect()` sau 3s, tối đa 2 lần. *(done — dùng `connectRef` + `useEffect` để tránh circular dep)*
- [x] **Fix bug `onDisconnected` của device cũ:** callback chỉ reset khi `bleState.device === connectedDevice` — device cũ ngắt muộn không đè trạng thái connection mới. *(done)*
- [ ] Nếu H3 đúng và không chịu được việc khách phải "quên device" thủ công: **last-resort** — `manager.destroy()` + tạo lại `BleManager`; chỉ làm khi các fix trên chưa đủ.

### Fix 3 (🟡 Điều kiện, nếu H3) — Android: xử lý GATT cache cũ
- [ ] Ghi bước "quên HeritageBuddy + tắt/bật Bluetooth" vào **runbook nạp firmware** — mỗi lần nạp firmware mới cho robot, phone phải "quên" device trước.
- [ ] App không có API clear GATT cache công khai trong ble-plx → không sửa code cho mục này (ngoài last-resort ở Fix 2).

## 5. Kiểm thử (sau Bước 0 + Fix 1/2/4)

> **Phụ thuộc:** mục "Reconnect tự động" chỉ khả thi **sau khi Fix 2 đã được triển khai** (code hiện tại không có auto-reconnect).

- [ ] **Đơn kết nối:** connect 10 lần liên tiếp (robot bật, phone ở gần) — ghi success rate + thời gian từ bấm Kết nối đến `[BLE] Ready`.
- [ ] **Reconnect tự động (cần Fix 2):** tắt/bật robot giữa chừng → app tự quét lại và connect, không bấm tay.
- [ ] **Sau reboot cả 2 máy:** connect lần đầu có qua không (kiểm cache).
- [ ] **End-to-end:** chạy tour, xác nhận app nhận `NODE_START:<id>` và gửi `NODE_DONE` thành công.
- [ ] **Serial firmware:** monitor 9600 thấy `[BLE] Connected to:` và không có khoảng gap lạ giữa các log → poll đều.

## 6. Definition of Done (GATE cho mục này)

- Connect thành công ≥ 9/10 lần; discovery thường < 3s.
- App nhận đủ `NODE_START`/`WARN`/`STATUS` trong tour thật, không cần bấm tay "Kết nối".
- Serial robot monitor được (9600) → debug được.
- Không `any`, không `console.log` mới; `npx tsc --noEmit` + `npx expo lint` pass.

## 7. Timeline

| Khoảng | Việc |
|---|---|
| 05/08 (sáng) | Bước 0: (a) fingerprint firmware qua monitor speed + (b) test GATT cache |
| 05/08 | Fix 4 (monitor_speed) + Fix 1 (verify firmware, log debug) |
| 05–06/08 | Fix 2 (app: settle delay + backoff + try/catch + auto-retry + fix stale callback) |
| 06/08 | Kiểm thử mục 5 → kết luận H1/H2/H3 |
| 07/08 | Fix 3 (runbook nếu H3) + tổng kết số liệu vào báo cáo |

---

*Tham chiếu: `CHANGELOG_BLE_FIX.md` · `plan-ver2.md` (GATE 1 = đầu 14/08) · `heritage-buddy-app/src/lib/bluetooth.ts` · `heritage-buddy-app/src/hooks/use-robot-connection.ts` · `heritech_robot/src/main.cpp` · `heritech_robot/platformio.ini`*
