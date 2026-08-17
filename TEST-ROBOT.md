# TEST-ROBOT — Chương trình kiểm thử Robot + Tích hợp App, hướng tới chốt dự án

> **Ngày:** 2026-08-17 | **Phạm vi:** firmware `heritech_robot/` (PlatformIO, Uno R4 WiFi + MatrixMiniR4) + tích hợp BLE với app `heritage-buddy-app/`
> **Tham chiếu:** `TEST-FULL.md` (toàn bộ app/server/ML) · `TEST-INTERACTION.md` (chi tiết giao thức BLE)
> **Quy ước:** ghi `[x]` khi pass. Chỗ nào KHÔNG pass → chụp log/ảnh, ghi ngay vào cột Ghi chú.

---

## 0. Thông số HARDWARE đã chốt (sau đợt sửa 16/08) — bắt buộc đúng để test có nghĩa

| Hạng mục | Giá trị chốt | Ghi chú |
|---|---|---|
| Động cơ kéo | **Chỉ M1 (trái) / M2 (phải)**, KHÔNG có M3/M4 | `MiniR4.M1/M2.setPower()` |
| Chiều động cơ | `M1.setReverse(true)`, `M2.setReverse(false)` → **+power = đi tới** | Đã test thực tế MOTOR_TEST |
| Line tracer | **Cổng I2C0 = Port A3** — Wire trực tiếp, KHÔNG qua MUX | `MiniR4.I2C0.MXLineTracer` (giống B3) |
| Gesture / Color | Chờ kết quả `SCAN` lúc kết nối BLE (mục 2.3) để xác nhận cổng | |
| PIR | Chân D3; mức báo HIGH hoặc LOW (tuỳ module, thử `PIR_MODE`) | Chờ kết quả mục 6 |
| BLE | Service Nordic UART `6E400001/2/3`; lệnh KHÔNG cần `\n` (tự kết thúc 150ms) | Heartbeat 2s kèm `err/w/pir/pm/color/raw` |

---

## 1. Chuẩn bị

| Hạng mục | Chuẩn bị |
|---|---|
| Firmware | `pio run -t upload` (từ `heritech_robot/`) — phải build SUCCESS |
| Công cụ BLE | nRF Connect (Android/iOS), bật **Notify** trên characteristic TX `6E400003` |
| App | `npx expo start` → cài Expo Go; server: `scripts/start-dev.cmd` (nếu test chat) |
| Sân test | Sân line đầy đủ: vạch thẳng, ≥2 ngã ba (trái/phải), vạch đỏ điểm dừng, nền sáng |
| An toàn | Kê robot khi test motor; giữ người đứng cách robot ≥1m khi chạy tuyến |

---

## 2. Kiểm tra tĩnh & khởi động

| # | Test case | Các bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|---|
| 2.1 | Build firmware | `pio run` | `[SUCCESS]`, RAM ≤ 50%, Flash ≤ 55% | [ ] | |
| 2.2 | Khởi động | Cấp nguồn (bật >60s trước test PIR) | Buzzer âm khởi động; **LED đỏ chớp 500ms khi CHƯA có BLE**; vào IDLE | [ ] | |
| 2.3 | Bản đồ I2C | Kết nối nRF Connect → đọc dòng `SCAN...` | `SCAN A3(I2C0/Wire): 0x30` (line tracer!). Xác nhận cổng gesture/color từ `ch0..7` và ghi vào THÔNG SỐ CHỐT | [ ] | |
| 2.4 | Heartbeat | Nhìn log 2s/lần | `STATUS:heartbeat err=.. w=.. pir=.. pm=.. color=.. raw=..` đều, không `raw=NO_RESPONSE` | [ ] | |
| 2.5 | LED kết nối | Kết nối thành công | **LED xanh dương** (stopped) + âm connect | [ ] | |
| 2.6 | Ngắt kết nối | Tắt Bluetooth điện thoại | Robot dừng motor ngay (mất BLE = stop), LED đỏ chớp; kết nối lại → xanh dương | [ ] | |

---

## 3. Motor & LED

| # | Test case | Các bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|---|
| 3.1 | MOTOR_TEST 2 cặp | Kê robot → `MOTOR_TEST:40:40` | Echo `STATUS:motor_test:ok`; **chỉ M1/M2 quay** (M3/M4 không có dây); đi TỚI (chiều đúng); đúng 2s rồi dừng | [ ] | |
| 3.2 | MOTOR_TEST riêng cặp 1 | `MOTOR_TEST1:40:40` | Chỉ cặp M1/M2 quay 2s, echo `motor_test1:ok` | [ ] | |
| 3.3 | MOTOR_TEST riêng cặp 3 | `MOTOR_TEST3:40:40` | Không bánh nào quay (không có M3/M4), echo `motor_test3:ok` | [ ] | |
| 3.4 | Pin | Nhìn log `batt=` trong MOTOR_TEST | ≥ 7.2V (2S) — dưới 6.5V là pin yếu, không test tuyến | [ ] | |
| 3.5 | LED di chuyển | Gửi `START` trên sân | **LED xanh lá** ngay khi rời node | [ ] | |
| 3.6 | LED dừng | Robot về node / RESUME dừng | **LED xanh dương** khi đứng yên | [ ] | |

---

## 4. Line tracer (cổng A3/I2C0)

| # | Test case | Các bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|---|
| 4.1 | Nền trắng | Đặt robot trên nền trắng → nhìn `raw=` | 10 giá trị cao (gần 100), `w=0`, `err≈0` | [ ] | |
| 4.2 | Trên vạch đen | Đặt robot trên line → nhìn `raw=` | 2–4 sensor giữa giảm thấp (nhiễu), `w≥2`, `err` ≠ 0 | [ ] | |
| 4.3 | Giữa vạch | Căn giữa line | `err` nhỏ (|err| < 0.5) | [ ] | |
| 4.4 | Ngã ba | Đưa robot qua ngã ba trái/phải | `junc=1` (trái) / `junc=2` (phải) đúng hướng thực tế | [ ] | |
| 4.5 | Cảm biến đỏ | Đặt robot lên vạch đỏ | `color=` ra mã đỏ (9) — nếu color sensor nằm vị trí đúng | [ ] | |

> Nếu 4.1/4.2 lệch nhiều: chỉnh `LINE_THRESHOLD` (config.h, hiện 50) rồi build lại. Nếu `color=` luôn 0x mà sensor có thật → tìm đúng cổng qua `SCAN` (mục 2.3) và sửa `_colorSensor` như đã làm cho line tracer.

---

## 5. Chạy tuyến (test chính — nhiều lần)

### 5A. Một vòng đơn giản — bấm START trên app

| # | Test case | Các bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|---|
| 5.1 | Xuất phát | Robot tại điểm bắt đầu → app bấm START | `[BLE RX] START`; robot đi tới, **bám line không rời, không giật** | [ ] | |
| 5.2 | Đi thẳng | Đoạn thẳng dài | Tốc độ ổn định (BASE_SPEED=40 — chậm hơn B3=46), không đổ dốc theo PID | [ ] | |
| 5.3 | Rẽ trái | Ngã ba trái | Robot rẽ đúng hướng, thoát line đúng, không rẽ thừa | [ ] | |
| 5.4 | Rẽ phải | Ngã ba phải | Như 5.3 | [ ] | |
| 5.5 | Dừng đỏ | Vạch đỏ điểm dừng | Robot dừng tại node: LED xanh dương, app nhận `NODE_START` + mở nội dung | [ ] | |
| 5.6 | Node → node | Bấm Đi tiếp/Nói "đi tiếp" | Gửi `NODE_DONE:x` → robot chạy tiếp, `NODE_START` node sau | [ ] | |
| 5.7 | Kết thúc | Hết tour về "Kết thúc" | App nhận `ALL_DONE` → màn celebration | [ ] | |

### 5B. Các tình huống

| # | Test case | Các bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|---|
| 5.8 | Người cắt ngang (PIR) | Đi tiếp → người đi qua trước robot | Robot dừng trong ~1s: LED xanh dương, app banner `WARN:person` + TTS; đường thoáng ~2s → tự đi tiếp (`STATUS:auto_resumed`) | [ ] | |
| 5.9 | Mất line giữa chừng | Nhấc/nghiêng robot qua line | Không rẽ vô hạn: `TURN_TIMEOUT_MS` 4s → FAILED → IDLE, LED xanh dương | [ ] | |
| 5.10 | Kê robot lúc đang chạy | Bấm SOS hoặc RESUME | Các transition không crash (SOS→IDLE dừng, RESUME→chạy tiếp) | [ ] | |

---

## 6. PIR & Công tắc

| # | Test case | Các bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|---|
| 6.1 | Đọc thô PIR | Nguồn bật >60s; nhìn `pir=` (pm=hi) | Không tay → `pir=LOW`; đưa tay qua 4s → `pir=HIGH` | [ ] | |
| 6.2 | Thử active-low | Nếu 6.1 luôn LOW cả khi có tay → gửi `PIR_MODE:LOW` (pm=lo) | Không tay → `pir=LOW`; có tay → `pir=HIGH` → **chốt PIR_MODE:LOW** | [ ] | |
| 6.3 | WARN:person trên tuyến | Lặp 5.8 sau khi chốt mode | Robot tự dừng đúng | [ ] | |
| 6.4 | Warmup | Khởi động lại → test PIR trong 60s đầu | PIR BỊ BỎ QUA (không WARN giả) — đúng thiết kế | [ ] | |
| 6.5 | SWITCH_PRESS | Bấm nhanh công tắc vật lý | App nhận `SWITCH_PRESS` (mở mic/chat nếu ở đúng màn) | [ ] | |
| 6.6 | Giữ công tắc ≥10s | Giữ switch 10s | `STATUS:sos` — robot dừng, LED đỏ, còi | [ ] | |
| 6.7 | Nhấn nhanh không SOS | Bấm ~0.5s | Chỉ `SWITCH_PRESS`, không SOS | [ ] | |

---

## 7. Gesture (M-Vision / PAJ7620)

| # | Test case | Các bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|---|
| 7.1 | Quét cảm biến | Mục 2.3 xác nhận gesture trong `SCAN` | Có địa chỉ gesture (0x73) trên kênh nào đó | [ ] | |
| 7.2 | Swipe phải | Vẫy tay phải→ trái qua sensor | App nhận `GESTURE:SWIPE_RIGHT` → đi tiếp (nếu ở node) | [ ] | |
| 7.3 | Swipe trái | Vẫy ngược lại | App nhận `GESTURE:SWIPE_LEFT` | [ ] | |
| 7.4 | Không nhận khi idle sai | Gửi gesture khi app ở map | App không làm gì (guard theo màn) | [ ] | |

---

## 8. Tích hợp App ↔ Robot (kết hợp TEST-FULL mục 7)

| # | Test case | Các bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|---|
| 8.1 | Auto-connect | Bật app khi robot đã BLE | App tự scan + connect ≤ 15s; badge "Đã kết nối robot" | [ ] | |
| 8.2 | NODE_START → mở màn | Robot ở node 2 → GỬI log hiện trên app | App tự mở `/node/...` đúng node | [ ] | |
| 8.3 | NODE_COMPLETE | Chạy hết node | Node đánh dấu ✓, progress tăng | [ ] | |
| 8.4 | SOS app | Giữ nút SOS ≥2s | Robot nhận `SOS`: LED đỏ, còi; app banner SOS; "Tiếp tục hành trình" → `RESUME` | [ ] | |
| 8.5 | Chưa kết nối | Tắt BLE → START/Đi tiếp/SOS | App alert "Chưa kết nối" thân thiện, không crash | [ ] | |
| 8.6 | Chat Buddy với robot | Ở node → nói "đi tiếp" | `VOICE_NEXT` → robot chạy tiếp, app về map | [ ] | |
| 8.7 | ALL_DONE | Chạy đủ tour | App bắn màn Celebration | [ ] | |

---

## 9. Chốt dự án (Final Acceptance)

### 9.1 Cổng chốt — tất cả phải ✅

| GATE | Tiêu chí | KQ | Ghi chú |
|---|---|---|---|
| GATE 1 | Robot bám line, rẽ đúng, dừng đúng node, hết tour về Kết thúc (mục 5A chạy 3 vòng liên tục) | [ ] | |
| GATE 2 | PIR dừng + tự đi tiếp; SOS hoạt động 2 chiều (app→robot, switch→app) | [ ] | |
| GATE 3 | App: onboarding → map → node → chat → gesture → celebration không crash (TEST-FULL mục 2–7) | [ ] | |
| GATE 4 | `npx tsc --noEmit`, `npx expo lint` (root), `npx jest` — sạch | [ ] | |
| GATE 5 | Firmware `pio run` SUCCESS; `npx expo-doctor` không lỗi chặn | [ ] | |
| GATE 6 | Không lộ API key; `.env` không commit; backend chỉ gọi LLM (TEST-FULL 8.7) | [ ] | |
| GATE 7 | CHANGELOG.md đầy đủ mọi thay đổi; tài liệu: UPDATE-GUIDE.md cập nhật thông số mới (line A3, chiều motor, PIR_MODE) | [ ] | |

### 9.2 Dữ liệu cần ghi lại cho báo cáo

1. Ảnh/chụp: robot trên sân, app các màn chính, log BLE `heartbeat + SCAN` một lần.
2. Metric (đo 5 lần mỗi hạng mục):
   - Thời gian auto-connect app (mục 8.1): **< 15s**
   - Thời gian START → robot di chuyển: **< 2s**
   - Thời gian WARN:person → dừng hẳn: **< 2s**
   - LLM chat round-trip (TEST-FULL 11.2): **< 8s**
3. Kết quả 3 vòng tuyến liên tục (GATE 1): số thành công/3, nếu fail ghi node & lỗi.

### 9.3 Bước cuối cho "chốt dự án"

```bash
# App
npx tsc --noEmit && npx expo lint && npx jest
# Robot
cd heritech_robot && pio run
# Git
git add . && git status && git diff --cached && git commit -m "docs: final test runbook & acceptance gates"
git tag -a v1.0.0 -m "Heritage Buddy v1.0.0 - chot du an WRO 2026"
git push origin master --tags
```

> Chỉ tag release SAU khi mọi GATE ở 9.1 pass. Nếu có fail: sửa xong → lặp lại vòng test tương ứng → cập nhật CHANGELOG trước khi tag.