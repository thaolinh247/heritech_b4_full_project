# PLAN DI CHUYỂN CUỐI CÙNG — Điều hướng theo CHUỖI THAO TÁC RỜI RẠC (leg-based)

> **Ngày:** 2026-08-16 (đóng băng tính năng 17/08 — NGÀY MAI)
> **Trạng thái:** BẢN PLAN CHỜ CHỐT — chưa code.
> **Quyết định chính:** thay thế "bám line liên tục + màu đỏ = node" bằng **5 chặng (Leg) thao tác rời rạc**: đi thẳng → rẽ 90° tại ngã ba → đi thẳng → gặp đỏ = tới node. Robot **dừng hẳn** mỗi node, chỉ rời node khi app gửi "đi tiếp".
> **Nguồn tham chiếu:** `route_config.h` + `maneuver_nav.h` (2 file mới, do team cung cấp — chưa có trên máy) · code hiện tại `heritech_robot/src/`

---

## 1. Tuyến thật (đã xác nhận — mô tả chặng)

```
Entrance ──► NGÃ BA ──► NGÃ BA ──► NGÃ RẼ PHẢI ──► Node1 History
Node1 ──(lùi)──► NGÃ BA ──► NGÃ TRÁI ──► Node2 Ceramics
Node2 ──(lùi)──► NGÃ BA(T) ──► NGÃ TRÁI ──► Node3 Artifacts
Node3 ──(lùi)──► NGÃ TRÁI ──► NGÃ TRÁI ──► NGÃ TRÁI ──► Node4 Special
Node4 ──(lùi)──► NGÃ BA(T) ──► RẼ PHẢI ──► RẼ PHẢI ──► NGÃ TRÁI ──► Finish (đỏ cuối)
```

Chuỗi ngã ba từng chặng (theo `maneuver_nav.h`):
| Chặng | Đi đến | Chuỗi thao tác |
|---|---|---|
| LEG1 | Node1 | thẳng → **RẼ TRÁI** → thẳng → **RẼ TRÁI** → thẳng → **RẼ PHẢI** → thẳng→đỏ |
| LEG2 | Node2 | **lùi**→ngã phải → **RẼ PHẢI** → thẳng → **RẼ TRÁI** → thẳng→đỏ |
| LEG3 | Node3 | **lùi**→ngã T → **RẼ PHẢI** → thẳng → **RẼ TRÁI** → thẳng→đỏ |
| LEG4 | Node4 | **lùi**→ngã trái → **RẼ TRÁI** ×3 → thẳng→đỏ |
| LEG5 | Finish | **lùi**→ngã T → **RẼ PHẢI** ×3 → **RẼ TRÁI** → thẳng→đỏ→`ALL_DONE` |

---

## 2. Kiến trúc & thay đổi từng file (trong `C:\heritech\heritech_robot\`)

### 2.1 `src/route_config.h` (MỚI) — bảng route + NodeManager 5 node
- Đúng nội dung đã chốt (NODE_ENTRANCE..NODE_5_FINISH, `isStop/isFinish`, `arrivedAtNext()`).
- **XUNG ĐỘT TÊN:** class `NodeManager` đã tồn tại ở `src/node_manager.h/.cpp` (13 node, `TOTAL_NODES`). → **Xóa `node_manager.h/.cpp` cũ** (toàn bộ tham chiếu nằm ở `main.cpp`), biến `nodes` giữ nguyên tên nên `main.cpp` không phải đổi tên — chỉ đổi include.

### 2.2 `src/maneuver_nav.h` (MỚI) — LegExecutor + 5 legs
- Đúng nội dung đã chốt (`ManeuverType`, `ROUTE_LEGS[0..5]`, `LegExecutor::start/update/isDone`, `junctionMatches`).
- Bổ sung so với bản paste (an toàn):
  - `#include <math.h>` cho `fabs()`.
  - **TURN_TIMEOUT** cho `M_TURN_LEFT/RIGHT`: nếu xoay mà mãi không thấy line giữa sensor (line đứt quãng rộng), robot tự dừng + log lỗi thay vì xoay vô hạn. (Hằng số thêm vào `config.h` — không đụng PID.)
  - `M_BACK_TO_JUNCTION` giữ `motors.move(-BASE_SPEED, -BASE_SPEED)` như paste — **⚠️ cần xác nhận: Line Tracer 10CH nằm ở phía nào?** Khi lùi, sensor phải quét QUA ngã ba phía sau mới thấy type đúng. Nếu sensor chỉ phủ phía trước bánh xe → lùi sẽ không phát hiện ngã ba → chặng lùi kẹt. (Check vật lý trước khi code.)

### 2.3 `src/motor_control.h/.cpp` — thêm 3 method, KHÔNG sửa `followLine()/PID`
```cpp
void turnLeft90();   // setDrive(-TURN_SPEED, +TURN_SPEED) — bánh trái lùi, bánh phải tiến (M3/M4)
void turnRight90();  // setDrive(+TURN_SPEED, -TURN_SPEED)
bool isLineCentered(SensorManager& sensors); // |err|<0.8 && w∈[2,4] — thoát khỏi pha rẽ khi line nằm giữa
```
- `TURN_SPEED=35`, `LINE_CENTER_ERR_TOL=0.8f`, `LINE_CENTER_WIDTH_MIN/MAX=2/4` — hằng số thêm vào `src/config.h` (không sửa dòng PID hiện có).

### 2.4 `src/main.cpp` — tích hợp (thay thế đúng 4 chỗ, giữ mọi thứ khác)
1. **checkButton()** (nhả BTN_DOWN khi IDLE) + lệnh `START` từ app: `nodes.reset(); legExec.start(1);` rồi mới `FOLLOW_LINE`.
2. **handleFollowLine()**: bỏ phần PID+đỏ cũ, gọi `legExec.update(sensors, motors)`; khi `legExec.isDone()` → `nodes.arrivedAtNext()`:
   - `isFinish` → `motors.stop()` + `NODE_START:0` + `NODE_COMPLETE:0` + `AT_NODE` — Finish ≡ Entrance vật lý: mở node Entrance + đánh dấu ✓ (chỉ tính khi VỀ, badge 5/5); chờ "đi tiếp" → `ALL_DONE` + `END`
   - ngược lại → `AT_NODE` (dừng hẳn, `nodeNotified=false`)
3. **handleAtNode()**: giữ nguyên (đứng yên + `NODE_START:<nodeId>` 1 lần). Không có logic tự rời node.
4. **Nhánh BLE "đi tiếp"**: 3 lệnh `NODE_DONE:<id>` / `VOICE_NEXT` / `NEXT_NODE` — khi đang `AT_NODE`:
   - `nodes.current().isFinish` → `ALL_DONE` + `END` (đã quay về Entrance — kết thúc tour)
   - ngược lại → `legExec.start(nodes.index() + 1); state=FOLLOW_LINE;` (chặng lùi-ra). Bỏ logic `completeCurrentNode()/nextNode()` cũ. ⚠️ firmware hiện nhận `NODE_DONE:<id>` kèm id — giữ `startsWith("NODE_DONE:")` như hiện tại.

### 2.5 GIỮ NGUYÊN (không đụng — an toàn bắt buộc)
| Thành phần | Lý do |
|---|---|
| `MotorControl::followLine()` + PID (KP/KI/KD, BASE/MAX/MIN_SPEED) | Luật B1: không sửa |
| `checkJunction()` → `WARN:turn_l/r` | Chạy **song song** chỉ để báo UI — độc lập với việc rẽ thật |
| `WAIT_CLEAR` (PIR → dừng → tự resume ≤10s) | Khi đang chạy leg bị người cản: state rời `FOLLOW_LINE`, `legExec` **giữ nguyên vị trí bước**, resume về `FOLLOW_LINE` thì `legExec.update()` tiếp tục đúng bước dở — không mất tiến trình |
| SOS switch/app + `STATUS:sos` + RESUME | RESUME chỉ trả về `FOLLOW_LINE` — leg tiếp tục từ bước dở (nếu đang AT_NODE thì vẫn chờ tín hiệu next) |
| Mất BLE → `motors.stop()` | Giữ |
| `checkGesture()`, `checkPIR()`, `handleEnd()` | Giữ |

### 2.6 State machine sau khi tích hợp
```
IDLE ──START──► FOLLOW_LINE(legExec.start(1))
FOLLOW_LINE: legExec chạy nội bộ (rẽ trong leg KHÔNG đổi state)
   │ legExec.done + node.isFinish ─► NODE_START:0 + NODE_COMPLETE:0 + AT_NODE
   │   └─ "đi tiếp" at Finish ──► END (ALL_DONE)
   │ legExec.done + node thường   ──► AT_NODE (NODE_START:<id>, đứng yên vô hạn)
   │ PIR giữa leg                  ──► WAIT_CLEAR (dừng) ─► tự resume về FOLLOW_LINE
AT_NODE: chờ NODE_DONE/VOICE_NEXT/NEXT_NODE ──► FOLLOW_LINE(legExec.start(idx+1))
```

---

## 3. ⚠️ ĐIỂM MỞ — CẦN CHỐT TRƯỚC KHI CODE (4 câu hỏi)

1. **App có 13 node trên bản đồ nhưng tuyến thật chỉ 4 điểm dừng.** — ✅ **ĐÃ CHỐT + XONG 16/08:** rút `museum-map.ts` xuống **5 node** — index 0 = Entrance (robot không bao giờ gửi NODE_START:0), index 1..4 = 4 điểm dừng (tạm lấy 4 vật đầu: ancient-01/02/03 + medieval-01) khớp NodeID 1..4 firmware. Lưu ý còn: badge tiến độ app hiển thị tối đa 4/5 (Entrance không tính hoàn thành).
2. **Không còn gửi `NODE_COMPLETE:<id>`** → map app không đánh dấu ✓ node đã xong. Chấp nhận bỏ tính năng này?
3. **Cách rẽ 90°:** paste dùng "xoay tại chỗ + thoát khi `isLineCentered()`". Phương án dự phòng tốt hơn: **IMU gyro** (`MiniR4.Motion.begin()` + `turnByAngle()` — đã có sẵn ở `C:\Users\thaol\Downloads\WRO 2026 B3\src\utils.cpp:180`, vòng PI trên `gyroZ`, quay đúng góc không phụ thuộc line). → Thử line-centered trước (đơn giản), IMU làm kế hoạch B?
4. **Sensor Line Tracer khi lùi (`M_BACK_TO_JUNCTION`):** xác nhận cảm biến quét được ngã ba khi robot đang lùi (câu 2.2 ở trên). Nếu không → đổi thành: lùi theo thời gian cố định tới vị trí biết trước rồi rẽ (đo sẵn trên tuyến thật).

---

## 4. LỘ TRÌNH THỰC TEST (sau khi code)

### Vòng 1 — Test bàn (16/08 chiều, không cần tuyến)
| # | Test | Kỳ vọng |
|---|---|---|
| 1.1 | Nạp firmware, boot log | `[STATE] ready`; phát hiện đủ sensor; **KHÔNG** WARN:person giả (warm-up 60s) |
| 1.2 | Nhả BTN_DOWN → START | `legExec.start(1)`; state FOLLOW_LINE; `[STATE] FOLLOW_LINE (leg-based)` |
| 1.3 | Đưa tay qua line giả vờ ngã ba (hoặc nhấc robot khỏi sàn) | Không rẽ thật trên bàn — chỉ đọc log `[JUNC]`/debug step để theo dõi |
| 1.4 | Test WAIT_CLEAR giữa leg | Vẫy tay PIR → dừng; im 2s → resume; step vẫn đúng bước dở |

### Vòng 2 — Tuyến thật từng chặng (17/08 SÁNG, test xong trước "đóng băng")
| # | Test | Kỳ vọng |
|---|---|---|
| 2.1 | LEG1 (Entrance→Node1) ×3 | Rẽ đúng trái-trái-phải, dừng tại đỏ, `NODE_START:1`, có `WARN:turn_l/r` đúng lúc |
| 2.2 | LEG2 ×3 (bấm "Đi tiếp" sau Node1) | Lùi đúng ra ngã ba, rẽ phải-trái, tới đỏ Node2 |
| 2.3 | LEG3 ×3 | Lùi ngã T, rẽ phải-trái, Node3 |
| 2.4 | LEG4 ×3 | Lùi, 3 lần rẽ trái, Node4 |
| 2.5 | LEG5 ×3 | Lùi ngã T, rẽ phải-phải-trái, đỏ cuối → `NODE_START:0` + `NODE_COMPLETE:0` + AT_NODE (Finish = Entrance); app mở node Entrance + badge 5/5 |
| 2.5b | "Đi tiếp" tại Entrance | Bấm nút/vẫy tay ở màn hình Entrance → `ALL_DONE` + END; app mở Celebration |
| 2.6 | Hết vòng tròn tín hiệu | `NODE_DONE` chỉ tác dụng khi AT_NODE; gửi khi đang FOLLOW_LINE bị bỏ qua |

### Vòng 3 — Chỉ tiêu (mỗi metric 10 lần, ghi vào `TEST-INTERACTION.md` 9.x)
- `WARN:person → banner` <1s · auto-resume <3s · SOS <2s · **% rẽ đúng 90°** (mục tiêu 100%) · **% dừng đúng node** (100%) · **số lần `[JUNC]` trùng 1 ngã ba = 0**

---

## 5. KẾ HOẠCH THỜI GIAN (16→17/08) + FALLBACK

| Mốc | Việc |
|---|---|
| 16/08 tối (hôm nay) | Chốt 4 câu hỏi mục 3 → code: `route_config.h`, `maneuver_nav.h`, motor_control, main.cpp, xóa node_manager cũ → build PlatformIO sạch |
| 17/08 sáng | Test bàn 1.x + tuyến thật 2.1–2.5, hiệu chỉnh tốc độ rẽ/`LINE_CENTER_*` |
| 17/08 trưa | Đóng băng → mọi bug xử lý trong ngày |
| 17–20/08 | GATE 1 (C) + báo cáo (F) + GATE 2 (G) theo plan-ver2 |

**FALLBACK (nếu leg-based lỗi trên tuyến, hết giờ):** quay lại chế độ hiện tại — bám line liên tục + đỏ=node + `WARN:turn_l/r` (đã code xong, build sạch `4ce2bd4`), chỉ cần `threshold/ngưỡng` hiệu chỉnh nhẹ, nếu không kịp thì `WARN:turn` chỉ là thông báo (rủi ro đã ghi trong plan-ver2 §8). Tour vẫn chạy được — GATE 1 không phụ thuộc leg-based.

---

## 6. RỦI RO

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Rẽ 90° không chính xác (line-centered phụ thuộc sensor giữa line) | Cao | TURN_TIMEOUT + fallback IMU `turnByAngle` (có sẵn) |
| Lùi không thấy ngã ba (vị trí sensor) | Cao | Xác nhận vật lý TRƯỚC khi code; fallback lùi thời gian cố định |
| App 13 node vs tuyến 4 điểm dừng | TB | ✅ Chốt 16/08: app rút còn 5 node khớp NodeID 1..4; badge hiển thị tối đa 4/5 |
| Hết thời gian (freeze 17/08) | TB | Fallback mode cũ luôn sẵn sàng; GATE 1 độc lập leg-based |
| `NEXT_NODE`/`NODE_DONE` cũ có thể tới khi đang FOLLOW_LINE (app cũ/nhiễu) | Thấp | Chỉ xử lý khi AT_NODE (paste đã chốt) |

---

*Tham chiếu: `heritech_robot/src/` (code hiện tại) · `WRO2026_B3_Movement_Code.md` (code boom + test tuyến) · `WRO2026_B3_LineFollowing_Turns.md` (V3 cũ) · `C:\Users\thaol\Downloads\WRO 2026 B3\src\utils.cpp:180` (`turnByAngle` IMU dự phòng)*