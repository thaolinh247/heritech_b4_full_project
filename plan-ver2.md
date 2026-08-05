# PLAN-VER2 — HERITAGE BUDDY: Robot dẫn đường hỗ trợ khách khiếm thị (BẢN PROTOTYPE)

> **Ngày:** 2026-08-05 | **Deadline toàn dự án:** 20/08/2026
> **Thay thế:** PLAN.md (line-follower) — Line Tracer + Color Sensor GIỮ làm nền vận hành chính.
> **Tính năng mới (làm thật):** Tương tác 2 chiều (ACK) + SOS + loa ngoài.
> **Định hướng công nghệ (chỉ báo cáo):** AprilTag + Radar — chi tiết tại `PLAN-APRILTAG.md`, không thực thi trong bản này.
> **Bắt buộc:** MỌI thay đổi code/nội dung PHẢI có mục trong `CHANGELOG.md` trước khi commit (Conventional Commits theo AGENTS.md); commit xong phải `git push`.

---

## 1. Tổng quan

Heritage Buddy là robot dẫn đường đồng hành cho khách tham quan bảo tàng, đặc biệt ưu tiên hỗ trợ khách **khiếm thị**. Mô hình thử nghiệm dùng **Line Tracer + Color Sensor** để vận hành; báo cáo trình bày rõ hướng nâng cấp lên **AprilTag + Radar** khi triển khai thực địa.

**Nguyên tắc prototype:** chỉ LÀM THẬT những gì chạy được, độ khó thấp, ít rủi ro trên phần cứng đang có; phần công nghệ mới chưa đủ đồ nghề chỉ trình bày bằng báo cáo. Không ảo tưởng phần cứng, không trì hoãn deadline.

## 2. Bảng hạng mục & trạng thái

| Hạng mục | Trạng thái | Loại |
|---|---|---|
| Định vị & dẫn đường | Line Tracer + Color Sensor (giữ nguyên từ V1–V3) | 🟢 Làm thật |
| Hướng nâng cấp định vị | AprilTag (thay Color Sensor) | 📄 Chỉ viết báo cáo |
| Hướng nâng cấp an toàn di chuyển | Radar (thay Line Tracer) | 📄 Chỉ viết báo cáo |
| Kênh âm thanh | Loa điện thoại qua app (thay tai nghe truyền xương) | 🟢 Làm thật — dễ, ít rủi ro |
| Tương tác hai chiều (cảnh báo → phản hồi → ACK) | Robot cảnh báo, khách phản hồi (nút/giọng), robot xác nhận | 🟢 Làm thật — không phụ thuộc AprilTag |
| Nhận diện ký hiệu tay | Bộ từ vựng đóng (5–6 ký hiệu cơ bản) | 🟡 Làm nếu còn thời gian (P1) |
| Đa ngôn ngữ | Tiếng Việt (giữ nguyên) + tiếng Anh nếu dư thời gian | 🟡 Làm nếu còn thời gian (P1) |
| SOS khẩn cấp | Nút vật lý/app → gửi tín hiệu + vị trí node gần nhất | 🟢 Làm thật — giá trị cao, độ khó thấp |
| Dashboard bảo tàng | 1 trang web: danh sách SOS + vị trí robot (theo node cuối cùng ghi nhận) | 🟡 Làm nếu còn thời gian (P1), tối giản hết mức |
| Khả năng nhân rộng sang bảo tàng khác | Trình bày bằng kiến trúc dữ liệu cấu hình (route/node) đã có sẵn từ Color Sensor | 📄 Chỉ viết báo cáo (dùng lại logic cũ, không cần AprilTag mới lập luận được) |

## 3. Kiến trúc hệ thống (phần LÀM THẬT)

```
[Line Tracer 10 kênh] ──PID bám tuyến──► [Mini R4 điều khiển động cơ]
[Color Sensor] ──nhận diện node (3 lần đọc ổn định)──► [Mini R4]
[Laser, PIR] ──phát hiện vật cản/người──► [Mini R4]
        ↕ BLE (giữ nguyên NUS đã có, bổ sung thêm tín hiệu)
[App Smartphone gắn trên robot]
        ├─→ Loa ngoài (cảnh báo, thuyết minh, xác nhận) — MỚI thay tai nghe
        ├─→ Mic + nút bấm (khách phản hồi/ACK) — MỚI
        ├─→ Nút SOS (app + switch vật lý) — MỚI
        ├─→ (nếu còn thời gian) Camera phụ nhận ký hiệu tay — P1
        ↓ (API AI: LLM/RAG — giữ nguyên kiến trúc backend proxy cũ)
[Backend proxy AI]
        ↓ (nếu còn thời gian) POST /api/sos, /api/robot-status
[Dashboard web đơn giản] — P1, tối giản 1 trang
```

**Không có module AprilTag/Radar/OpenMV/M-Vision trong sơ đồ thực thi** — các thành phần này chỉ xuất hiện trong phần báo cáo (mục 10).

## 4. Giao thức BLE (mở rộng từ NUS đã có)

### Robot → App
| Tín hiệu | Ý nghĩa |
|---|---|
| `NODE_START:<id>` / `NODE_COMPLETE:<id>` / `ALL_DONE` | Vòng tour (đã có) |
| `ALARM` (PIR) · `SWITCH_PRESS` · `GESTURE:SWIPE_UP` | Cảm biến (đã có) |
| **`WARN:<type>`** | Cảnh báo — MỚI. `type ∈ turn_l \| turn_r \| obstacle \| node` |
| **`STATUS:<state>`** | Xác nhận trạng thái (`resumed` / `sos` / `IDLE`…) — MỚI |

### App → Robot
| Tín hiệu | Ý nghĩa |
|---|---|
| `START` / `STOP` / `NODE_DONE:<id>` / `NEXT_NODE` / `VOICE_NEXT` / `VOICE_STOP` | Điều khiển (đã có) |
| **`ACK`** | Khách đã "Đã hiểu / Tiếp tục" sau WARN — MỚI |
| **`SOS`** | Khách bấm SOS (app) — MỚI |

### Nguồn tín hiệu WARN (khi làm thật)
| `WARN:<type>` | Nguồn cảm biến | Ghi chú |
|---|---|---|
| `turn_l` / `turn_r` | Line Tracer 10 kênh — `readJunctionType()` | Có sẵn trong `sensor_manager.h` |
| `obstacle` | Laser / khoảng cách | Cảnh báo vật cản phía trước |
| `node` | Color Sensor — nhận diện màu đỏ | Trùng thời điểm đến node |

## 5. Danh sách việc cần làm chi tiết

### A. 🟢 Giữ nguyên & xác nhận lại phần cứng/thuật toán cũ (không sửa)
- [ ] Kiểm tra lại toàn bộ firmware Line Tracer (PID bám tuyến) đang chạy ổn định trên bản V3 — không sửa, chỉ xác nhận.
- [ ] Kiểm tra lại Color Sensor (cơ chế "3 lần đọc ổn định") — không sửa.
- [ ] Kiểm tra lại Laser, PIR, Gesture Sensor, Miniature Switch — không sửa.
- [ ] Kiểm tra lại kiến trúc AI (LLM + RAG qua backend proxy) — không sửa.
- [ ] Chạy thử 1 lượt tour đầy đủ trên sa bàn hiện có để xác nhận mọi thứ vẫn hoạt động đúng trước khi bổ sung tính năng mới.

### B. 🟢 Loa điện thoại thay tai nghe truyền xương
- [ ] Gỡ vai trò tai nghe truyền xương khỏi luồng thông báo (nếu đang có trong code/app).
- [ ] Lập trình app phát cảnh báo/thuyết minh qua loa ngoài của smartphone.
- [ ] Đo thử âm lượng thực tế trên sa bàn, đối chiếu tiếng ồn nền — ghi số liệu vào báo cáo.

### C. 🟢 Tương tác hai chiều (ACK) — không phụ thuộc AprilTag
- [ ] Định nghĩa tín hiệu BLE: robot gửi `WARN:<type>` khi sắp đến node có cảnh báo (rẽ/vật cản) hoặc khi Color Sensor xác nhận đã đến node (bảng mục 4).
- [ ] Lập trình app: hiển thị nút lớn "Đã hiểu / Tiếp tục", nút "Dừng lại" khi nhận WARN; TTS đọc to cảnh báo.
- [ ] Lập trình robot: nhận phản hồi từ app (`ACK`, `STOP`, `CMD`) → cập nhật trạng thái, gửi lại `STATUS` xác nhận.
- [ ] Thêm cơ chế timeout: nếu khách không phản hồi sau X giây → robot tự hiểu "đã rõ", tiếp tục hành trình (log rõ).
- [ ] Kiểm thử toàn bộ vòng lặp với người dùng thử nghiệm (có thể bịt mắt mô phỏng khiếm thị).

### D. 🟢 SOS khẩn cấp
- [ ] Gán 1 nút vật lý (dùng lại Miniature Switch hiện có hoặc thêm 1 nút riêng) làm nút SOS, giữ ≥2 giây để kích hoạt (tránh bấm nhầm).
- [ ] Thêm nút SOS cố định trên giao diện app.
- [ ] Lập trình gửi tín hiệu SOS kèm vị trí node gần nhất mà Color Sensor vừa xác nhận (không cần AprilTag, dùng lại dữ liệu node đã có sẵn).
- [ ] Robot khi nhận lệnh SOS: dừng tại chỗ, bật đèn báo hiệu (LED sẵn có), phát âm thanh trấn an qua loa. (Firmware đã nhận `SOS` → STOP + LED đỏ + `STATUS:sos`.)
- [ ] (Nếu làm Dashboard) gửi tiếp tín hiệu SOS lên server; nếu không kịp làm Dashboard, tối thiểu vẫn phải đảm bảo tín hiệu SOS hiển thị rõ ràng trên app để người đi cùng/giáo viên thấy ngay.

### E. 🟡 Dashboard tối giản (P1 — chỉ làm nếu còn thời gian sau khi hoàn thành A–D)
- [ ] 1 trang web đơn giản: danh sách cảnh báo SOS (thời gian, vị trí node, trạng thái xử lý).
- [ ] Hiển thị vị trí robot = node gần nhất Color Sensor vừa ghi nhận (không cần bản đồ tọa độ chính xác — chỉ cần biết robot "đang ở khu vực nào").
- [ ] Cơ chế cập nhật: polling đơn giản (ví dụ mỗi 10 giây), không cần real-time phức tạp.
- [ ] Lưu log bằng file JSON trên server (không cần database) — đúng tinh thần tối giản.
- [ ] Server endpoints kèm theo (khi làm Dashboard): `POST /api/sos` · `POST /api/robot-status` · `GET /api/dashboard`.

### F. 🟡 Đa ngôn ngữ & nhận diện ký hiệu tay (P1 — làm sau cùng nếu dư thời gian)
- [ ] Nếu làm: thêm gói ngôn ngữ tiếng Anh cho phần thuyết minh/cảnh báo cơ bản.
- [ ] Nếu làm: thử nghiệm nhận diện 5–6 ký hiệu tay đơn giản (dừng, tiếp tục, SOS, cảm ơn, đồng ý) bằng camera phụ trên điện thoại + mô hình nhận diện tay có sẵn (ví dụ MediaPipe Hands) — phạm vi rất nhỏ, không cố gắng "dịch" ngôn ngữ ký hiệu đầy đủ.
- [ ] Nếu không kịp làm, không đưa vào phần "đã làm được" của báo cáo — chỉ nêu ở phần "hướng phát triển".

### G. 📄 Viết phần "Định hướng công nghệ khi triển khai thực tế" trong báo cáo
- [ ] Viết mục mới (đề xuất: 3.8) trình bày rõ: mô hình thử nghiệm dùng Line Tracer + Color Sensor; định hướng thực tế chuyển sang Radar + AprilTag.
- [ ] Giải thích lý do nâng cấp: line vật lý không khả thi trên sàn di sản thật (ảnh hưởng thẩm mỹ, khó bảo trì); AprilTag mở rộng số điểm định vị linh hoạt, hỗ trợ nhân rộng sang bảo tàng khác chỉ bằng đổi dữ liệu cấu hình; Radar cho phạm vi phát hiện vật cản rộng hơn trong không gian thực tế đông người.
- [ ] Thêm ghi chú minh bạch rõ ràng: phần AprilTag/Radar chưa được hiện thực hóa trên mô hình vật lý trong phạm vi dự án lần này, là hướng phát triển cho giai đoạn tiếp theo.
- [ ] (Tùy chọn, không bắt buộc) Chèn 1 ảnh minh họa AprilTag mẫu vào slide/poster để trực quan hóa định hướng, không cần robot đọc được thật.

### H. Kiểm thử tổng thể & hoàn thiện báo cáo
- [ ] Chạy thử toàn bộ 1 tour hoàn chỉnh sau khi hoàn thành mục B, C, D: từ lúc bắt đầu → cảnh báo → phản hồi (ACK) → SOS thử nghiệm → kết thúc.
- [ ] Thử nghiệm với người bịt mắt mô phỏng khiếm thị, ghi nhận phản hồi thực tế.
- [ ] Đo và ghi số liệu định lượng: độ chính xác nhận diện node (Color Sensor, số liệu "3 lần đọc ổn định"), thời gian phản ứng cảnh báo vật cản, thời gian phản hồi ACK, thời gian từ lúc bấm SOS đến khi hiển thị cảnh báo.
- [ ] Cập nhật báo cáo: giữ nguyên phần kỹ thuật cũ (3.7) mô tả đúng mô hình đang chạy thật; thêm mục 3.8 (định hướng công nghệ, xem mục G); cập nhật phần "Hạn chế & hướng phát triển" (Phần 4/5) để nhất quán, không lặp lại thông tin.

## 6. Chỉ tiêu số & GATE

| Chỉ tiêu | Target | GATE |
|---|---|---|
| ACK end-to-end (WARN→khách bấm→STATUS) | <3s | GATE 1 |
| SOS → hiển thị trên app | <2s | GATE 1 |
| SOS → Dashboard (nếu làm) | <5s | GATE 1 |
| Độ chính xác nhận diện node (Color Sensor) | giữ số liệu V3 (3 lần đọc ổn định) | GATE 1 |
| Robot tự hành: đến node đúng → gửi `NODE_START:<id>` | không crash, log rõ | GATE 1 |

- **GATE 1 (đầu ~14/08):** B + C + D chạy được trên tuyến thật, đo số liệu đạt target.
- **GATE 2 (18/08):** tour hoàn chỉnh trên sa bàn (line-follower) + SOS thật + số liệu báo cáo.
- **Đóng băng tính năng:** trước 20/08 tối thiểu 3 ngày, chỉ test + sửa lỗi.

## 7. Timeline (deadline 20/08) & đội hình

| Khoảng | Việc |
|---|---|
| 05–07/08 | A (xác nhận tour cũ) + B (loa ngoài) + khởi động C (protocol WARN/ACK) |
| 08–11/08 | C (UI ACK, banner WARN, timeout) + D (SOS) |
| 12–13/08 | Test vòng tương tác trên tuyến thật, đo số liệu → GATE 1 |
| 14–16/08 | E/F (nếu kịp) + viết báo cáo mục 3.8 (G) |
| 17–18/08 | H (tour hoàn chỉnh + người bịt mắt) → GATE 2 |
| 19–20/08 | Đóng băng tính năng, test + sửa lỗi, hoàn thiện báo cáo |

- **2 người cứng nhất:** BLE protocol + firmware (C, D).
- **1 người:** app (ACK UI, banner WARN, SOS button, loa ngoài).
- **1 người:** (nếu làm) server endpoints + Dashboard + viết báo cáo + kiểm thử.

## 8. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Quá tải 15 ngày | Cao | Làm B/C/D trước (lõi demo); E/F chỉ khi dư thời gian; đóng băng tính năng ≥3 ngày |
| BLE mất kết nối giữa vòng ACK/SOS | TB | Giữ auto-reconnect đã có; app hiện rõ trạng thái offline |
| SOS phụ thuộc mạng (Dashboard) | TB | Fallback: SOS hiển thị rõ trên app; Dashboard chỉ là nâng cấp |
| SLR / ký hiệu tay kém chính xác | TB | Stretch; từ vựng nhỏ; fallback nút bấm |
| AprilTag/Radar chưa hiện thực hóa | Cao (kỳ vọng) | Ghi minh bạch là hướng phát triển; mô hình thật vẫn hoạt động bằng Line Tracer + Color Sensor |

## 10. Định hướng công nghệ khi triển khai thực tế (chỉ báo cáo)

Chi tiết runbook chuẩn bị + thử nghiệm AprilTag: **`PLAN-APRILTAG.md`** (tag family TAG36H11, in/dán/đo tọa độ, hiệu chuẩn camera, `map_config.json`/`route_config.json`, GATE 0 ≤48h, checklist đồ nghề). Nội dung này chỉ phục vụ mục G của báo cáo và giai đoạn phát triển sau deadline — **không nằm trong sơ đồ thực thi của bản prototype này**.

## 11. Definition of Done (20/08)

- GATE 1 đạt: vòng tương tác 2 chiều (ACK) + SOS hoạt động trên tuyến thật, đo được số liệu.
- GATE 2 đạt: tour hoàn chỉnh trên sa bàn (Line Tracer + Color Sensor) + SOS thật + báo cáo có số liệu.
- `npx tsc --noEmit` + `npx expo lint` pass; không `any`, không `console.log` (riêng firmware: biên dịch sạch qua PlatformIO).
- Mọi thay đổi có mục trong `CHANGELOG.md` + commit theo Conventional Commits + `git push`.
- Báo cáo WRO cập nhật kiến trúc + số liệu + phần hạn chế minh bạch (AprilTag/Radar = hướng phát triển).

---

*Tham chiếu: `PLAN-APRILTAG.md` · `PLAN.md` (bản cũ) · `heritech_robot/` · `server/` · `CHANGELOG.md`*
