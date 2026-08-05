# PLAN-BLE-FIX — Kế hoạch sửa lỗi BLE Discovery Timeout

> **Ngày:** 2026-08-05 | **Deadline:** 08/08 (trước khi test tour ở GATE 1)
> **Liên quan:** `CHANGELOG_BLE_FIX.md` (đã fix lần 1) · `heritage-buddy-app/src/lib/bluetooth.ts` · `heritech_robot/src/main.cpp` · `heritech_robot/platformio.ini`
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

**Ảnh hưởng:** app không nhận `NODE_START`/`WARN`, không gửi được lệnh → toàn bộ flow tour + tương tác 2 chiều (P1-C/D) đứng.

## 2. Chẩn đoán — xác minh giả thuyết TRƯỚC khi sửa

| # | Giả thuyết | Bằng chứng để xác nhận | Kết luận sau kiểm |
|---|---|---|---|
| H1 | Robot đang chạy firmware CŨ (blocking `delay()` treo `BLE.poll()`) | Nhìn `git log` bản đang nạp trên robot; mở Serial robot xem poll có đều | ☐ |
| H2 | `discoverAllServices...` gọi quá sớm sau connect, stack GATT chưa "chín" | Quan sát: có lúc attempt 2/3 thành công? | ☐ |
| H3 | Android GATT cache cũ (đã từng connect cùng robot) | Sau khi "quên" device + tắt/bật BT, connect có qua? | ☐ |
| H4 | (Hỗ trợ debug) `monitor_speed` sai → không đọc được Serial firmware | `platformio.ini` = 115200 nhưng `Serial.begin(9600)` | ☐ |

> **Nguyên lý gốc (đã ghi trong `CHANGELOG_BLE_FIX.md`):** ArduinoBLE chỉ xử lý GATT service discovery **bên trong `BLE.poll()`**. Nếu firmware không poll đều trong vài giây đầu sau connect → robot không trả lời discovery → Android timeout. App retry 3 lần đều fail ⇒ nghiêng về H1/H3 hơn H2.

## 3. Các fix theo thứ tự ưu tiên

### Fix 1 (🔴 Bắt buộc) — Firmware: bảo đảm `BLE.poll()` chạy đều khi connected
**Files:** `heritech_robot/src/main.cpp`, `heritech_robot/src/ble_handler.cpp`
- [ ] Xác nhận robot đã nạp firmware mới nhất (bản có `updateSound()` non-blocking, sau commit `c2701de`). Nếu chưa → nạp lại bằng PlatformIO.
- [ ] Soát lại nhánh loop **khi connected**: không có `delay()` blocking ngoài `LOOP_DELAY_MS=20` (hiện OK: `delay(50)` trong `checkButton` chỉ chạy khi có cạnh nút; `handleEnd` có `delay(150)`/`delay(300)` nhưng chỉ ở trạng thái END).
- [ ] Thêm log debug tạm thời: in độ dài vòng lặp (`millis()`) mỗi ~3s khi connected, để bắt chỗ blocking (I2C gesture/laser, `Serial.print` chậm...).
- [ ] Kết luận H1. Nếu vẫn còn chỗ blocking → tách thành non-blocking (giống cách làm `updateSound()`).

### Fix 2 (🟠 Bắt buộc) — App: cho discovery thêm thời gian "chín" + auto-retry
**File:** `heritage-buddy-app/src/lib/bluetooth.ts`
- [ ] Thêm delay ngắn **~500ms sau `connectToDevice()` trước lần discover đầu tiên** (cho stack bên robot ổn định link).
- [ ] Tăng backoff giữa các lần retry: `1500ms → 2500ms` (attempt 2/3 có thêm cơ hội khi robot đang bận poll).
- [ ] **Auto-retry toàn bộ flow khi discovery fail**: thay vì chỉ trả `false` rồi bỏ, lên lịch lại `scanAndConnect()` tối đa 2 lần (cách nhau ~3s) trước khi báo lỗi — để không cần bấm tay nút "Kết nối".
- [ ] Đảm bảo `onDisconnected` chỉ đăng ký sau discovery thành công (đã làm) — không đổi.
- [ ] Kết luận H2.

### Fix 3 (🟡 Điều kiện) — Android: xử lý GATT cache cũ
**Thao tác trên điện thoại test:** Settings → Bluetooth → quên "HeritageBuddy" → tắt/bật Bluetooth → connect lại. Nếu qua được ⇒ H3.
- [ ] Nếu H3 đúng: ghi bước này vào **runbook nạp firmware** (`UPDATE-GUIDE.md`) — mỗi lần nạp firmware mới cho robot, phone phải "quên" device trước.
- [ ] App không có API clear GATT cache công khai trong ble-plx → không sửa code cho mục này.

### Fix 4 (🔵 Hỗ trợ debug) — Sửa `monitor_speed` để đọc được Serial robot
**File:** `heritech_robot/platformio.ini`
- [ ] Đổi `monitor_speed = 115200` → `9600` (khớp `Serial.begin(9600)` ở `main.cpp:120`), hoặc đổi firmware lên 115200. Chọn 1 cách duy nhất.

## 4. Kiểm thử (sau khi hoàn thành Fix 1 + 2)

- [ ] **Đơn kết nối:** connect 10 lần liên tiếp (robot bật, phone ở gần) — ghi success rate + thời gian từ bấm Kết nối đến `[BLE] Ready`.
- [ ] **Reconnect:** tắt/bật robot giữa chừng → app tự quét lại và connect (không bấm tay).
- [ ] **Sau reboot cả 2 máy:** connect lần đầu có qua không (kiểm cache).
- [ ] **End-to-end:** chạy tour, xác nhận app nhận `NODE_START:<id>` và gửi `NODE_DONE` thành công.
- [ ] **Serial firmware:** monitor 9600 thấy `[BLE] Connected to:` và không có khoảng gap lạ giữa các log → poll đều.

## 5. Definition of Done (GATE cho mục này)

- Connect thành công ≥ 9/10 lần; discovery thường < 3s.
- App nhận đủ `NODE_START`/`WARN`/`STATUS` trong tour thật, không cần bấm tay "Kết nối".
- Serial robot monitor được (9600) → debug được.
- Không `any`, không `console.log` mới; `npx tsc --noEmit` + `npx expo lint` pass.

## 6. Timeline

| Khoảng | Việc |
|---|---|
| 05/08 | Fix 1 (firmware: verify + log debug) + Fix 4 (monitor_speed) |
| 05–06/08 | Fix 2 (app: delay + backoff + auto-retry) |
| 06/08 | Kiểm thử mục 4 → kết luận H1/H2/H3 |
| 07/08 | Fix 3 (runbook nếu H3) + tổng kết số liệu vào báo cáo |

---

*Tham chiếu: `CHANGELOG_BLE_FIX.md` · `heritage-buddy-app/src/lib/bluetooth.ts` · `heritech_robot/src/main.cpp` · `heritech_robot/platformio.ini`*
