# Plan: Di chuyển & Cảm biến — Khóa app + Chuẩn bị

## Trạng thái hiện tại

Phần firmware đã **hoàn thiện và hoạt động tốt**:
- PID line-following (10-channel sensor)
- 5 legs navigation với junction-based turning
- Color sensor phát hiện node (màu đỏ)
- PIR obstacle detection + auto-resume
- Gesture sensor (PAJ7620) — swipe left/right
- Physical switch (short press = voice, long press = SOS)
- BLE bidirectional communication (NUS protocol)
- State machine: IDLE → FOLLOW_LINE → WAIT_CLEAR → AT_NODE → END

Phần app đã **hoạt động nhưng có lỗ hổng kiến trúc** cần fix trước khi lock.

---

## Phase 1: Lock App — Fix kiến trúc + Cleanup

### 1.1 Thu thập telemetry chuẩn (robot.ts store)

**Vấn đề**: `RobotTelemetry` interface đã define nhưng **không bao giờ được populate**. Heartbeat data parse dạng string thô.

**Fix**:
- [ ] Parse heartbeat `HB:...` trong `use-robot-connection.ts` → populate `RobotTelemetry` vào store
- [ ] Thêm fields vào store: `batteryVoltage`, `motorSpeed`, `lineError`, `pirRaw`, `uptime`
- [ ] heartbeat format từ firmware: `HB:<state>:<stop>:<battery>:<speed>:<lineErr>:<pir>`
- [ ] Update store type trong `store/robot.ts` để thêm telemetry fields

**Files**:
- `store/robot.ts` — thêm telemetry state
- `hooks/use-robot-connection.ts` — parse heartbeat
- `types/robot.ts` — update `RobotTelemetry` interface

### 1.2 Display telemetry trên Museum Map

**Vấn đề**: Map screen chỉ hiện connection dot, không hiện trạng thái robot.

**Fix**:
- [ ] Thêm telemetry panel trên map (battery %, current stop, moving state)
- [ ] Battery indicator: icon pin + percentage (green/yellow/red)
- [ ] Current stop: hiện "Stop X/5" hoặc "Finish"
- [ ] Moving indicator: icon ▶ hoặc ⏸
- [ ] BLE connection giữ nguyên

**Files**:
- `app/museum-map.tsx` — thêm telemetry panel
- Component mới: `components/robot-telemetry-panel.tsx` (nếu cần tách)

### 1.3 Fix WARN/STATUS message handling song song

**Vấn đề**: WARN/STATUS được handle ở **2 nơi**: `use-robot-connection.ts` VÀ `robot-interaction-overlay.tsx`. Overlay subscribe trực tiếp BLE, bypass store.

**Fix**:
- [ ] `robot-interaction-overlay.tsx` chỉ đọc từ store (không subscribe BLE trực tiếp)
- [ ] `use-robot-connection.ts` parse WARN/STATUS → cập nhật store
- [ ] Overlay react theo store changes
- [ ] Kiểm tra: overlay vẫn hoạt động đúng khi app ở background (Expo keepAwake)

**Files**:
- `components/robot-interaction-overlay.tsx` — remove direct BLE subscription
- `hooks/use-robot-connection.ts` — ensure store updates for WARN/STATUS

### 1.4 Sync voice-assistant store với robot store

**Vấn đề**: `voice-assistant.ts` track `currentNodeId` độc lập với `robot.ts`'s `currentStop` → có thể lệch.

**Fix**:
- [ ] Voice assistant store chỉ đọc `currentStop` từ robot store (không track riêng)
- [ ] Hoặc merge 2 store thành 1 unified state

**Files**:
- `store/voice-assistant.ts` — sửa currentNodeId
- `store/robot.ts` — thêm getter nếu cần

### 1.5 Replace Vibration với expo-haptics

**Vấn đề**: AGENTS.md yêu cầu `expo-haptics` nhưng đang dùng `Vibration` từ react-native.

**Fix**:
- [ ] Thay `Vibration.vibrate()` bằng `Haptics.impactAsync()` trong robot-interaction-overlay
- [ ] Thay `Vibration.vibrate()` trong chat screen
- [ ] Thêm `expo-haptics` vào dependencies (nếu chưa có)

**Files**:
- `components/robot-interaction-overlay.tsx`
- `app/chat/[nodeId].tsx`
- `hooks/use-voice-assistant.ts`

### 1.6 TypeScript + Lint cleanup

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npx expo lint` — 0 errors
- [ ] Review và fix any `@ts-ignore` hoặc `as any`
- [ ] Đảm bảo không có `console.log` trong production code

---

## Phase 2: Chuẩn bị phần Di chuyển & Cảm biến

### 2.1 Firmware —那些需要物理验证的东西

Firmware đã hoàn thiện, nhưng có **3 thứ cần verify trên thực tế**:

| # | Thức cần verify | Cách test | Risk |
|---|-----------------|-----------|------|
| 1 | `M_BACK_TO_JUNCTION` — robot lùi có detect junction không? | Cho robot lùi trên line, xem line tracer có trả junction type không | CAO — sensor có thể không đọc được khi lùi |
| 2 | Line tracer calibration — sufficiently calibrated cho arena thực? | Chạy calibration sweep (BTN_UP 2s), test trên line thật | TRUNG BÌNH |
| 3 | PIR detection range — đủ cho visitors? | Đặt visitor ở các khoảng cách 0.5m, 1m, 2m, xem PIR trigger không | THẤP — PIR thường hoạt động tốt |

### 2.2 App — Robot Telemetry Dashboard (optional, cho WRO presentation)

Nếu cần hiện telemetry chi tiết cho judges:

- [ ] Battery voltage → percentage conversion
- [ ] Real-time line error visualization (mini chart)
- [ ] Motor speed display
- [ ] PIR state indicator (HIGH/LOW)
- [ ] Uptime counter
- [ ] Connection quality indicator (RSSI nếu có)

**Đánh giá**: Không cần thiết cho MVP. Chỉ cần battery + current stop + moving state.

### 2.3 App — Narration Audio Caching (offline support)

AGENTS.md yêu cầu: "Narration mode should work offline once audio files are cached".

- [ ] Cache video/audio files từ Google Drive URLs vào AsyncStorage/FileSystem
- [ ] Kiểm tra cache trước khi stream
- [ ] Hiển thị download progress

**Đánh giá**:低 priority cho MVP. Museum WiFi thường ổn định.

### 2.4 App — Upcoming Hazard Warnings

AGENTS.md yêu cầu: "upcoming stairs/turns" warnings.

- [ ] Firmware gửi `WARN:approaching_turn` trước 2-3s khi đến junction
- [ ] App hiện banner "Sắp rẽ trái/phải" trước khi robot actually turn
- [ ] Cần firmware modify: thêm lookahead trong LegExecutor

**Đánh giá**: Trung bình priority. Hiện tại WARN:turn_l/r đã hoạt động nhưng hơi muộn.

---

## Thứ tự thực hiện

```
Phase 1 (Lock App):          Estimated: 2-3 giờ
├─ 1.1 Telemetry store       (30 min)
├─ 1.2 Telemetry UI          (45 min)
├─ 1.3 Fix WARN/STATUS       (30 min)
├─ 1.4 Sync stores           (20 min)
├─ 1.5 expo-haptics          (15 min)
└─ 1.6 TypeScript/lint       (30 min)

Phase 2 (Prep):              Estimated: 1-2 giờ (chỉ phần app)
├─ 2.1 Physical verify       (cần robot + arena)
├─ 2.2 Telemetry dashboard   (optional, 1-2h)
├─ 2.3 Audio caching         (low priority, skip cho MVP)
└─ 2.4 Upcoming hazards      (trung bình, firmware + app)
```

---

## Lock Criteria

App được coi là "locked" khi:
- [ ] Telemetry store populate đúng từ heartbeat
- [ ] Map screen hiện battery + current stop + moving state
- [ ] WARN/STATUS chỉ handle 1 nơi (store-based)
- [ ] Voice assistant sync với robot store
- [ ] expo-haptics thay Vibration
- [ ] `tsc --noEmit` 0 errors
- [ ] `expo lint` 0 errors
- [ ] Test trên device: BLE connect → START → line follow → node detection → PIR warning → resume → finish
