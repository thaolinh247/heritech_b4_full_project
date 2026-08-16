# PLAN-VER2 — HERITAGE BUDDY: Robot dẫn đường hỗ trợ khách khiếm thị (BẢN PROTOTYPE)

> **Ngày:** 2026-08-05 | **Deadline toàn dự án:** 20/08/2026
> **Thay thế:** PLAN.md (line-follower) — **Định vị & dẫn đường chính thức:** Line Tracer + Color Sensor (giữ nguyên V1–V3).
> **Tính năng mới (làm thật):** Cảnh báo người cản → tự đi tiếp khi đường thoáng + SOS + loa ngoài.
> **Thứ tự ưu tiên:** phần mềm & tương tác làm TRƯỚC; phần di chuyển xác nhận/hiệu chỉnh làm SAU.
> **Bắt buộc:** MỌI thay đổi code/nội dung PHẢI có mục trong `CHANGELOG.md` trước khi commit (Conventional Commits theo AGENTS.md); commit xong phải `git push`.

---

## 1. Tổng quan

Heritage Buddy là robot dẫn đường đồng hành cho khách tham quan bảo tàng, ưu tiên hỗ trợ khách **khiếm thị**. Mô hình chạy bằng **Line Tracer + Color Sensor** — đây là kiến trúc chính thức của toàn dự án, không có hướng thay thế định vị trong phạm vi dự án.

**Nguyên tắc prototype:** chỉ LÀM THẬT những gì chạy được trên phần cứng đang có; ưu tiên hoàn thiện phần mềm & tương tác (giá trị demo cao, ít rủi ro) trước khi đụng đến di chuyển. Không ảo tưởng phần cứng, không trì hoãn deadline.

## 2. Bảng hạng mục & trạng thái

| Hạng mục | Trạng thái | Loại |
|---|---|---|
| Định vị & dẫn đường | Line Tracer + Color Sensor (giữ nguyên V1–V3) | 🟢 Làm thật |
| Kênh âm thanh | Loa điện thoại qua app (thay tai nghe truyền xương) | 🟢 Làm thật — dễ, ít rủi ro |
| Tương tác hai chiều (cảnh báo → tự xử lý → xác nhận) | Robot cảnh báo (`WARN`), robot tự xử lý khi đường thoáng (`STATUS:auto_resumed`), khách có SOS khẩn cấp | 🟢 Làm thật — phần mềm, ưu tiên 1 |
| SOS khẩn cấp | Long-press ≥10s trên Miniature Switch hiện có + nút SOS trên app (giữ ≥2s) | 🟢 Làm thật — phần mềm, ưu tiên 1 |
| Xác nhận lại phần di chuyển | Line Tracer (PID), Color Sensor (node), hiệu chỉnh ngã ba → `WARN:turn` | 🟢 Làm thật — ưu tiên 2, làm sau phần mềm |
| Dashboard bảo tàng | 1 trang web: danh sách SOS + vị trí robot (node cuối cùng) | 🟡 Làm nếu còn thời gian (P1), tối giản |
| Đa ngôn ngữ | Tiếng Việt (giữ nguyên) + tiếng Anh nếu dư thời gian | 🟡 Làm nếu còn thời gian (P1) |
| Nhận diện ký hiệu tay | Bộ từ vựng đóng (5–6 ký hiệu cơ bản) | 🟡 Làm nếu còn thời gian (P1) |
| Khả năng nhân rộng sang bảo tàng khác | Trình bày bằng kiến trúc dữ liệu cấu hình route/node đã có sẵn | 📄 Chỉ viết báo cáo |

## 3. Kiến trúc hệ thống (phần LÀM THẬT)

```
[Line Tracer 10 kênh] ──PID bám tuyến + ngã ba (WARN:turn)──► [Mini R4]
[Color Sensor] ──nhận diện node (3 lần đọc ổn định)──► [Mini R4]
[PIR] ──phát hiện người/vật cản → WARN:person──► [Mini R4]
        ↕ BLE (giữ nguyên NUS đã có, bổ sung tín hiệu)
[App Smartphone gắn trên robot]
        ├─→ Loa ngoài (cảnh báo, thuyết minh, xác nhận) — MỚI
        ├─→ Tự động đi tiếp khi đường thoáng sau WARN:person (không cần nút) — MỚI
        ├─→ Nút SOS (app, giữ ≥2s) + switch vật lý long-press ≥10s — MỚI
        ↓ (API AI: LLM/RAG — giữ nguyên kiến trúc backend proxy cũ)
[Backend proxy AI]
        ↓ (nếu còn thời gian) POST /api/sos, /api/robot-status
[Dashboard web đơn giản] — P1, tối giản 1 trang
```

Kiến trúc thực thi là kiến trúc chính thức của dự án — không có module định vị thay thế nào khác.

## 4. Giao thức BLE (mở rộng từ NUS đã có)

### Robot → App
| Tín hiệu | Ý nghĩa |
|---|---|
| `NODE_START:<id>` / `NODE_COMPLETE:<id>` / `ALL_DONE` | Vòng tour (đã có) |
| `ALARM` (PIR) · `SWITCH_PRESS` · `GESTURE:SWIPE_RIGHT`/`GESTURE:SWIPE_LEFT` | Cảm biến (đã có) |
| **`WARN:person`** | Có người/vật cản gần robot (PIR) — MỚI, thay `ALARM` |
| **`WARN:turn_l` / `WARN:turn_r`** | Robot đang rẽ trái/phải tại ngã ba (Line Tracer `readJunctionType()`) — MỚI |
| **`STATUS:<state>`** | Xác nhận trạng thái (`resumed` / `auto_resumed` / `sos` / `IDLE`…) — MỚI |

### App → Robot
| Tín hiệu | Ý nghĩa |
|---|---|
| `START` / `STOP` / `NODE_DONE:<id>` / `NEXT_NODE` / `VOICE_NEXT` / `VOICE_STOP` | Điều khiển (đã có) |
| **`SOS`** | Khách bấm SOS (app) — MỚI (nhánh firmware đã có sẵn) |

### Hành vi khi nhận WARN (định nghĩa rõ để đo được)
| `WARN` | Robot làm gì | Khi nào đi tiếp? |
|---|---|---|
| `person` | **Dừng ngay**, loa đọc to cảnh báo, app hiện banner (không có nút bấm) | **Tự đi tiếp khi đường thoáng**: PIR im lặng liên tục ≥ `PIR_CLEAR_CONFIRM_MS` (2s) → `STATUS:auto_resumed`; an toàn hết `WARN_CLEAR_TIMEOUT_MS` (10s) mà PIR vẫn báo → vẫn tự đi tiếp + `STATUS:auto_resumed` (log rõ). Lý do bỏ nút ACK: khách khiếm thị không tự biết người cản đã đi chưa. |
| `turn_l` / `turn_r` | Chỉ thông báo bằng giọng TẠI ngã ba (không dừng, không cần ACK) — cảm biến ngã ba báo tại điểm rẽ, không báo trước được | ❌ |

### Các hành vi liên quan
- **SOS (long-press switch ≥10s hoặc nút app giữ ≥2s):** robot dừng tại chỗ, LED đỏ, còi trấn an, gửi `STATUS:sos`; khách tiếp tục bằng nút `START` trên app.
- **Mất kết nối BLE (an toàn):** firmware `motors.stop()` ngay — robot KHÔNG chạy tiếp với lệnh tốc độ cũ.
- **`WARN:person` chỉ dừng robot khi đang `FOLLOW_LINE`;** ở `AT_NODE`/`IDLE` chỉ thông báo (giữ cooldown PIR 3s chống báo liên tục).

## 5. Danh sách việc cần làm chi tiết (theo thứ tự ưu tiên)

### A. 🟢 PHẦN MỀM & TƯƠNG TÁC (ưu tiên 1 — làm trước)
- [x] Giao thức: chốt bảng tín hiệu mục 4; ghi rõ trong CHANGELOG. — **ĐÃ XONG** (bảng tín hiệu mục 4 + commit `8b8fe5b`, `1184cec`, CHANGELOG mục Changed).
- [x] **Firmware (phần tương tác):** thay `ALARM` bằng `WARN:person` + dừng chờ đường thoáng (state `WAIT_CLEAR`) + tự resume khi PIR im ≥ `PIR_CLEAR_CONFIRM_MS` + timeout 10s an toàn + `STATUS:auto_resumed`; long-press ≥10s trên switch → `SOS` (phân biệt với `SWITCH_PRESS` nhấn ngắn); `motors.stop()` khi mất BLE. (Nhánh nhận `SOS` đã có ở `main.cpp` — giữ nguyên, không viết lại.) — **ĐÃ XONG** (`heritech_robot/src/main.cpp`, `state_machine.*`, `config.h`; `SOS_HOLD_MS=10000`; build sạch qua PlatformIO).
- [x] **App — loa ngoài:** gỡ vai trò tai nghe truyền xương (nếu có); phát cảnh báo/thuyết minh qua loa ngoài; đo âm lượng trên sa bàn, ghi số liệu vào báo cáo. — **ĐÃ XONG** (âm thanh qua loa phone; còn thiếu đo âm lượng — ghi vào mục F/C).
- [x] **App — WARN UI:** nhận `WARN:person` → banner lớn + TTS đọc to (KHÔNG có nút — robot tự đi tiếp khi đường thoáng); nhận `WARN:turn_*` → thông báo + TTS, không cần nút; hiển thị `STATUS`. — **ĐÃ XONG** (`components/robot-interaction-overlay.tsx`).
- [x] **App — SOS:** nút SOS cố định trên màn hình, giữ ≥2s để kích hoạt (tránh bấm nhầm); hiển thị trạng thái SOS rõ ràng (mascot + màu + chữ). — **ĐÃ XONG** (`components/robot-interaction-overlay.tsx`).
- [ ] Test bàn (robot đứng yên, không cần di chuyển): kích PIR bằng tay → cả vòng `WARN:person → (ngừng vẫy tay, PIR im ≥2s) → STATUS:auto_resumed`; vẫy tay liên tục → timeout 10s → `STATUS:auto_resumed`; long-press switch → SOS; app hiển thị đúng từng trạng thái.

### B. 🟢 DI CHUYỂN (ưu tiên 2 — làm sau A)
- [ ] Xác nhận lại Line Tracer (PID bám tuyến) + Color Sensor ("3 lần đọc ổn định") chạy ổn định như V3 — không sửa, chỉ chạy xác nhận 1 tour đầy đủ. *(16/08: đã thêm debug `[LINE] err=/w=/junc=` mỗi 2s, KHÔNG sửa logic — chỉ còn chờ chạy 1 tour thật.)*
- [x] Hiệu chỉnh phát hiện ngã ba (`readJunctionType()`) để gửi `WARN:turn_l/r` đúng, không báo trùng — **CODE XONG 16/08** (`main.cpp` `checkJunction()`: xác nhận 3 lần đọc liên tiếp + latch/rearm 500ms, gửi đúng 1 lần, chỉ khi `FOLLOW_LINE`; log `[JUNC]`). Chờ chạy tuyến thật; dự phòng Phase 2: custom theo `WRO2026_B3_LineFollowing_Turns.md` (width≥8 + kênh) nếu thư viện nhiễu. Chi tiết: `WRO2026_B3_Movement_Code.md`.
- [ ] Kiểm tra lại PIR/Gesture/Switch và AI (LLM + RAG qua backend proxy) — không sửa. *(Laser: BỎ khỏi mục B theo quyết định team — không có trong firmware; PIR warm-up/debounce + gesture auto-retry + I2C2 đã sửa ở round trước, build sạch.)*

### C. 🟢 Kiểm thử tích hợp trên tuyến thật → GATE 1
- [ ] Chạy vòng tương tác đầy đủ trên tuyến: robot chạy → PIR kích → `WARN:person` → dừng → TTS + banner → người cản đi khỏi → tự `STATUS:auto_resumed` → chạy tiếp; test cả nhánh PIR báo liên tục → timeout 10s.
- [ ] Test SOS thật: long-press switch và nút app → robot dừng + LED đỏ + `STATUS:sos` → `START` để tiếp tục.
- [ ] Đo số liệu (10 lần/lượt): thời gian `WARN:person` → hiển thị banner, → khách bấm → `STATUS` nhận được; thời gian bấm SOS → hiển thị trên app; ghi cách đo vào báo cáo.

### D. 🟡 Dashboard tối giản (P1 — chỉ làm nếu còn thời gian)
- [ ] 1 trang web: danh sách SOS (thời gian, node, trạng thái) + vị trí robot = node gần nhất Color Sensor ghi nhận.
- [ ] Polling mỗi **2 giây** cho mục đích SOS (không dùng 10s vì không đạt chỉ tiêu <5s); log file JSON, không cần database.
- [ ] Endpoints: `POST /api/sos` · `POST /api/robot-status` · `GET /api/dashboard`.

### E. 🟡 Đa ngôn ngữ & nhận diện ký hiệu tay (P1 — làm sau cùng)
- [x] **Song ngữ tiếng Việt + tiếng Anh** (mục E — đã làm, chi tiết `PLAN-BILINGUAL.md`): i18n dictionary ~90 key × 2 ngôn ngữ, ngôn ngữ chọn 1 lần ở onboarding (`selection.tsx`) persist AsyncStorage, dữ liệu 13 hiện vật + 4 khu dịch đủ, TTS/STT/LLM theo ngôn ngữ (`vi-VN`/`en-US` + `resolveVoice` fallback, server gửi prompt ngôn ngữ tương ứng), toàn bộ UI + cảnh báo (banner + TTS) qua `t(key)`. Video thuyết minh tạm giữ bản tiếng Việt (`videoSourceEn?` rỗng, sau chỉ cần điền link). Kiểm tra thủ công ở `TEST-INTERACTION.md` mục 9.
- [ ] Nếu làm tiếp: 5–6 ký hiệu tay (dừng, tiếp tục, SOS, cảm ơn, đồng ý) bằng camera phụ + MediaPipe Hands — phạm vi rất nhỏ.
- [ ] Nếu không kịp: chỉ nêu ở phần "hướng phát triển" của báo cáo, không đưa vào "đã làm được".

### F. 📄 Báo cáo (không còn mục định hướng công nghệ)
- [ ] Giữ nguyên phần kỹ thuật (3.7) mô tả đúng mô hình đang chạy thật; cập nhật kiến trúc mới (WARN/auto-resume/SOS/loa ngoài).
- [ ] Cập nhật "Hạn chế & hướng phát triển": ghi minh bạch các hạn chế đo được — cảnh báo rẽ báo tại ngã ba (không báo trước), PIR chỉ phát hiện chuyển động (không đo khoảng cách vật cản tĩnh), nút vật lý duy nhất kiêm 2 chức năng.
- [ ] Số liệu định lượng từ mục C: độ chính xác nhận diện node (3 lần đọc ổn định), thời gian auto-resume, thời gian SOS, thời gian phản ứng cảnh báo.

### G. 🟢 Kiểm thử tổng thể → GATE 2
- [ ] Tour hoàn chỉnh: bắt đầu → cảnh báo → đường thoáng tự resume → SOS thử nghiệm → kết thúc.
- [ ] Thử nghiệm với người bịt mắt mô phỏng khiếm thị, ghi nhận phản hồi.

## 6. Chỉ tiêu số & GATE

| Chỉ tiêu | Target | Cách đo |
|---|---|---|
| `WARN:person` → banner hiển thị + TTS bắt đầu | <1s | Log app (timestamps) |
| Auto-resume end-to-end (`WARN` → đường thoáng → nhận `STATUS:auto_resumed`) | <3s | Log app + firmware, 10 lần |
| SOS (nút app/long-press) → robot dừng + `STATUS:sos` | <2s | Log firmware |
| SOS → Dashboard (nếu làm) | <5s | Polling 2s |
| Độ chính xác nhận diện node (Color Sensor) | giữ số liệu V3 (3 lần đọc ổn định) | Thống kê trên tour |
| Robot tự hành đến node đúng → gửi `NODE_START:<id>` | không crash, log rõ | Quan sát + log |

- **GATE 1 (đầu 14/08):** A + B + C chạy trên tuyến thật, số liệu đạt target.
- **GATE 2 (18/08):** tour hoàn chỉnh + SOS thật + số liệu báo cáo.
- **Đóng băng tính năng:** từ 17/08 — chỉ test + sửa lỗi.

## 7. Timeline (deadline 20/08) & đội hình

| Khoảng | Việc |
|---|---|
| 05–08/08 | **A (phần mềm & tương tác):** giao thức + firmware tương tác (WARN:person, long-press SOS, auto-stop) + app (loa, banner tự-resume, SOS) |
| 09–11/08 | A: test bàn toàn bộ vòng tương tác (robot đứng yên) + đo thử timing |
| 12–13/08 | **B (di chuyển):** xác nhận tour cũ + hiệu chỉnh ngã ba → `WARN:turn`; tích hợp trên tuyến thật → GATE 1 |
| 14–16/08 | D/E (nếu kịp) + viết báo cáo (F) |
| 17/08 | Đóng băng tính năng |
| 17–18/08 | G: tour hoàn chỉnh + người bịt mắt → GATE 2 |
| 19–20/08 | Test + sửa lỗi, hoàn thiện báo cáo |

- **2 người phần mềm & tương tác** (ưu tiên 1): 1 người app (banner WARN tự-resume, SOS, loa ngoài) + 1 người firmware tương tác + BLE protocol (WARN:person, long-press SOS, auto-stop, đo kiểm).
- **1 người:** di chuyển (xác nhận tour + hiệu chỉnh ngã ba).
- **1 người:** (nếu làm) server + Dashboard + viết báo cáo + kiểm thử tổng thể.

## 8. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Quá tải 15 ngày | Cao | Phần mềm/tương tác làm trước (giá trị demo cao); di chuyển giữ code cũ, không đổi thuật toán; đóng băng từ 17/08 |
| PIR báo nhầm (người đi ngang) | TB | Cooldown 3s; chỉ dừng khi `FOLLOW_LINE`; timeout 10s tự chạy tiếp |
| Phát hiện ngã ba sai/trùng → `WARN:turn` nhiễu | TB | Chỉ hiệu chỉnh ngưỡng, không đổi PID; nếu không kịp, `WARN:turn` chỉ là thông báo, không làm gãy tour |
| Long-press switch nhầm thành SOS | TB | Ngưỡng rõ ràng (app 2s, switch 10s); sau SOS có thể `START` lại; ghi log |
| BLE mất kết nối giữa vòng WARN:person/SOS | TB | Auto-reconnect đã có; firmware auto-stop khi mất BLE; timeout vẫn chạy độc lập; app hiện rõ trạng thái offline |
| SOS phụ thuộc mạng (Dashboard) | TB | Fallback: SOS hiển thị rõ trên app; Dashboard chỉ là nâng cấp |
| Ký hiệu tay kém chính xác | TB | Stretch; từ vựng nhỏ; fallback nút bấm |

## 9. Definition of Done (20/08)

- GATE 1 đạt: vòng WARN:person tự-resume (đường thoáng) + SOS hoạt động trên tuyến thật, đo được số liệu.
- GATE 2 đạt: tour hoàn chỉnh (Line Tracer + Color Sensor) + SOS thật + báo cáo có số liệu.
- `npx tsc --noEmit` + `npx expo lint` pass; không `any`, không `console.log` (riêng firmware: biên dịch sạch qua PlatformIO).
- Mọi thay đổi có mục trong `CHANGELOG.md` + commit theo Conventional Commits + `git push`.
- Báo cáo WRO cập nhật kiến trúc + số liệu + phần hạn chế minh bạch (không có phần định hướng công nghệ chưa hiện thực hóa).

---

*Tham chiếu: `PLAN.md` (bản cũ) · `TEST-INTERACTION.md` · `heritech_robot/` · `server/` · `CHANGELOG.md`*
