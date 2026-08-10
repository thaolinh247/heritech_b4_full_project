# TEST-INTERACTION — Danh sách kiểm thử tương tác Robot ↔ App (Tất cả chức năng)

> **Ngày:** 2026-08-10 | **Phạm vi:** BLE, vòng tour, WARN:person tự-resume, SOS, cảnh báo rẽ, cảm biến, an toàn, âm thanh
> **Tham chiếu:** `plan-ver2.md` (mục 4–6) · firmware `heritech_robot/` · app `heritage-buddy-app/`
> **Quy ước:** mỗi test ghi `[x]` vào cột kết quả; với test đo thời gian ghi số đo vào cuối phần tương ứng.

---

## 0. Chuẩn bị & môi trường

| Hạng mục | Chuẩn bị |
|---|---|
| Firmware | Nạp bản mới nhất qua PlatformIO (`pio run -t upload`), mở Serial Monitor @9600 để xem log |
| App | Build + cài lên smartphone gắn trên robot (Android khuyến nghị — BLE) |
| Sa bàn | Tuyến line hoàn chỉnh 13 node, màu đỏ tại node, không có vật cản |
| Nguồn | Pin robot đầy; điện thoại cắm sạc (tour dài) |
| Công cụ đo | Đồng hồ bấm giờ; (tùy chọn) app BLE UART terminal (nRF Connect / Serial Bluetooth Terminal) để gửi lệnh giả kiểm tra app |
| Người test | 2 người: 1 người vận hành robot + theo dõi Serial, 1 người bấm app + bấm giờ |

**Chế độ test bàn (không di chuyển):** robot đặt lên giá đỡ sao cho bánh xe không chạm sàn — vẫn kết nối BLE, vẫn bấm được switch, vẫn kích PIR bằng tay. Dùng để test mục 1, 3, 4, 6, 8 trước khi chạy tuyến thật.

---

## 1. BLE — Kết nối & ổn định (test bàn)

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 1.1 | Tự kết nối khi mở app | Robot bật BLE → mở app (màn hình map/node) | App tự quét và kết nối "HeritageBuddy"; LED robot xanh; app hiện "Đã kết nối" | [ ] |
| 1.2 | Kết nối lại sau khi mất (auto-reconnect) | Đang kết nối → tắt robot 5s → bật lại | App tự quét lại và kết nối trong ~10s, không cần bấm gì | [ ] |
| 1.3 | Scan timeout | Tắt BLE robot → bấm "Kết nối" | Sau 10s: status `disconnected`, hiển thị "Chưa kết nối", không treo | [ ] |
| 1.4 | Mất kết nối đột ngột | Đang chạy tour → tắt nguồn robot | App về `disconnected` ngay, hiện trạng thái offline | [ ] |
| 1.5 | Tín hiệu lạ / rác | Gửi qua UART: `HELLO`, `""`, `!@#$%` | App bỏ qua hoặc log warning, không crash | [ ] |

**Lưu ý quan trọng:** từ firmware mới, khi mất BLE robot **tự dừng** (`motors.stop()`). Test 1.4 trên tuyến thật phải đảm bảo robot dừng tại chỗ (xem mục 7.1).

---

## 2. Vòng tour cơ bản (tuyến thật)

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 2.1 | START từ app | Kết nối → màn hình map → "Xuất phát" | Robot chạy theo line; Serial log `[CMD] START -> FOLLOW_LINE`; LED xanh | [ ] |
| 2.2 | Đến node 1 | Robot chạy đến node màu đỏ đầu tiên | Robot dừng; app tự mở video node 1 (`NODE_START:0`); Serial log `[STATE] AT_NODE` | [ ] |
| 2.3 | "Đi tiếp" sau video | Bấm "Đi tiếp" | App gửi `NODE_DONE:0`; robot `NODE_COMPLETE:0` → chạy tiếp; map đánh dấu node đã xong | [ ] |
| 2.4 | Đi hết 13 node | Lặp 2.2–2.3 cho hết tour | Node cuối: app gửi `NEXT_NODE` → màn hình Celebration; robot `ALL_DONE`, còi kết thúc, LED xanh | [ ] |
| 2.5 | Nhận diện node đúng trình tự | Quan sát toàn bộ tour | Robot dừng ĐÚNG node theo thứ tự, không bỏ node, không dừng nhầm giữa đường | [ ] |
| 2.6 | Nút STOP app | Đang chạy → bấm "Dừng" (nếu có trên UI hiện tại) hoặc gửi `STOP` | Robot dừng ngay, state IDLE, Serial log `[CMD] STOP -> IDLE` | [ ] |
| 2.7 | Nhấn giữ nút vật lý DOWN (robot) | Nhấn nút DOWN → nhả | Nhấn = dừng (còi bíp); nhả = START lại tour từ node 0 (hành vi cũ, không đổi) | [ ] |
| 2.8 | Vị trí robot lên Dashboard | Robot tới node bất kỳ → mở Dashboard | Server log `[robot-status] node=N`; Dashboard "Vị trí robot" hiển thị đúng node đó + thời gian trong <5s | [ ] |

---

## 3. Cảnh báo người cản — WARN:person → tự đi tiếp khi đường thoáng (lõi demo, GATE 1)

> Cơ chế: PIR kích hoạt khi robot đang chạy → robot dừng + gửi `WARN:person` → app banner + TTS (KHÔNG có nút bấm — khách khiếm thị không tự biết người cản đã đi chưa). Robot **tự đi tiếp khi PIR im lặng liên tục ≥2s** (`PIR_CLEAR_CONFIRM_MS`) → `STATUS:auto_resumed`. An toàn: PIR báo liên tục hết 10s (`WARN_CLEAR_TIMEOUT_MS`) → vẫn tự đi tiếp + `STATUS:auto_resumed`.

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 3.1 | WARN:person khi đang chạy (tuyến thật) | Robot đang FOLLOW_LINE → vẫy tay trước PIR | Robot dừng ngay; Serial `[PIR] WARN:person` + `[STATE] PIR -> WAIT_CLEAR`; LED vàng cam; app hiện banner "Có người hoặc vật cản phía trước" + TTS đọc to + rung | [ ] |
| 3.2 | Đường thoáng → tự đi tiếp | Đang banner 3.1 → ngừng vẫy tay, chờ | Sau khi PIR im ≥2s robot tự chạy tiếp + LED xanh; app toast "Robot tự động tiếp tục hành trình" (`STATUS:auto_resumed`); Serial `[STATE] Path clear -> auto resume`; banner tự tắt | [ ] |
| 3.3 | PIR báo liên tục → timeout an toàn | Vẫy tay liên tục trước PIR, không ngừng | Sau ~10s robot vẫn tự chạy tiếp + `STATUS:auto_resumed`; Serial `[STATE] WARN timeout -> auto resume`; không treo ở WAIT_CLEAR | [ ] |
| 3.4 | WARN:person khi robot ĐANG DỪNG (AT_NODE/IDLE) | Ở node / lúc IDLE → vẫy tay PIR | Robot KHÔNG dừng lại (đã đứng); app vẫn hiện banner + TTS; robot không gửi STATUS (không vào WAIT_CLEAR) — app tự tắt banner qua fallback 10.5s | [ ] |
| 3.5 | PIR cooldown 3s | Vẫy tay liên tục trước PIR | Chỉ gửi `WARN:person` tối đa mỗi 3s; trong lúc WAIT_CLEAR không gửi lại (không lặp TTS) | [ ] |
| 3.6 | Bấm SOS ngay khi đang banner | Đang banner 3.1 → giữ nút SOS app 2s | Banner thay bằng banner SOS (ưu tiên cao hơn); robot dừng + đèn đỏ + `STATUS:sos` | [ ] |

---

## 4. SOS khẩn cấp

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 4.1 | SOS từ nút app (giữ 2s) | Đang chạy → giữ nút đỏ SOS 2s | Nút đổi "Đang giữ…" → nhả tay KHÔNG kích hoạt nếu giữ <2s; giữ đủ 2s: robot dừng + LED đỏ + còi + `STATUS:sos`; app banner SOS + TTS "Đã kích hoạt SOS…" + rung | [ ] |
| 4.2 | Nhả sớm không kích hoạt | Giữ nút SOS <2s rồi nhả | Không gửi `SOS`, không có gì xảy ra | [ ] |
| 4.3 | SOS từ switch vật lý (long-press 10s) | Giữ Miniature Switch ≥2s | Như 4.1 (robot dừng + `STATUS:sos`); Serial `[SWITCH] Long press >= 10s -> SOS` | [ ] |
| 4.4 | Nhấn ngắn switch vẫn mở chat | Nhấn switch <2s ở màn hình node | App mở "Hỏi Buddy" (`SWITCH_PRESS`) — chức năng cũ giữ nguyên | [ ] |
| 4.5 | "Tiếp tục hành trình" sau SOS | Đang banner SOS → bấm "Tiếp tục hành trình" | App gửi `RESUME`; robot chạy tiếp KHÔNG reset tour (node đang ở giữ nguyên); toast "Hành trình tiếp tục" | [ ] |
| 4.6 | RESUME không reset tour | SOS giữa tour (vd đã xong node 3) → RESUME | Robot chạy tiếp; node tiếp theo là node 4 (KHÔNG quay về node 0 — kiểm tra trên Serial) | [ ] |
| 4.7 | SOS khi robot đang IDLE | Robot đứng yên → SOS app hoặc switch | Vẫn dừng (không đổi) + banner SOS; RESUME cho chạy tiếp | [ ] |
| 4.8 | SOS khi chưa kết nối BLE | Tắt kết nối → giữ nút SOS app | App không gửi được → hiện trạng thái offline rõ; (nút vật lý switch vẫn hoạt động độc lập — test riêng) | [ ] |
| 4.9 | Còi trấn an + đèn đỏ | Quan sát sau SOS | LED đỏ + còi ~1s; trạng thái duy trì tới khi RESUME/START | [ ] |
| 4.10 | SOS xuất hiện trên Dashboard | Kích SOS (app/switch) → mở Dashboard máy tính bảo tàng | Server log `[sos] ACTIVE`; Dashboard hiện hàng SOS mới với trạng thái "Đang xử lý" (node + thời gian đúng) trong <5s | [ ] |
| 4.11 | RESUME → Dashboard "Đã giải quyết" | Đang 4.10 → bấm "Tiếp tục hành trình" | Server log `[sos] RESOLVED`; hàng SOS đó đổi sang "Đã giải quyết" trong <5s | [ ] |

---

## 5. Cảnh báo rẽ WARN:turn_l / turn_r (app đã hỗ trợ; firmware sẽ gửi khi hiệu chỉnh ngã ba — phần B)

> Test app KHÔNG cần robot chạy: dùng UART terminal gửi giả `WARN:turn_l` / `WARN:turn_r` về app.

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 5.1 | Toast rẽ trái | Gửi `WARN:turn_l` | App hiện toast "Robot đang rẽ trái" ~3.5s + TTS "Robot đang rẽ trái"; KHÔNG có nút, KHÔNG chặn màn hình | [ ] |
| 5.2 | Toast rẽ phải | Gửi `WARN:turn_r` | Như 5.1 với "rẽ phải" | [ ] |
| 5.3 | Tự tắt sau 3.5s | Quan sát | Toast biến mất tự động, không cần thao tác | [ ] |
| 5.4 | Trên tuyến thật (sau khi làm B) | Robot chạy qua ngã ba | Mỗi ngã ba gửi đúng 1 lần `WARN:turn_*`, không báo trùng lặp liên tục; robot KHÔNG dừng | [ ] |

---

## 6. Cảm biến & điều khiển khác (giữ nguyên hành vi cũ — xác nhận không hỏng)

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 6.1 | SWITCH_PRESS mở chat | Node screen → nhấn ngắn switch | Vào `/chat/:nodeId` | [ ] |
| 6.2 | Gesture trái/phải | Vẫy tay trái/phải trước M-Vision Cam (hoặc gửi giả `GESTURE:SWIPE_RIGHT`/`GESTURE:SWIPE_LEFT`) | App xử lý navigation: complete node + `VOICE_NEXT`; robot chạy tiếp | [ ] |
| 6.3 | PIR khi đang AT_NODE | Ở node → vẫy tay PIR | App hiện banner WARN:person (không dừng vì robot đã đứng) — xem 3.5 | [ ] |
| 6.4 | VOICE_NEXT / VOICE_STOP qua app chat | Dùng trợ lý giọng nói | "Đi tiếp" → robot chạy; "Dừng lại" → robot dừng | [ ] |
| 6.5 | ALARM cũ không còn dùng | Quan sát Serial | Firmware KHÔNG còn gửi `ALARM`; chỉ gửi `WARN:person` | [ ] |
| 6.6 | Đi hết node → ALL_DONE + Celebration | Tour hoàn thành | App Celebration + robot còi kết thúc | [ ] |

---

## 7. An toàn & tình huống lỗi

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 7.1 | **Mất BLE khi đang chạy → robot tự dừng** | Đang FOLLOW_LINE → tắt nguồn robot (hoặc app tắt Bluetooth) | Robot DỪNG ngay tại chỗ (KHÔNG chạy tiếp với tốc độ cũ); LED chớp đỏ | [ ] |
| 7.2 | Mất BLE giữa vòng chờ đường thoáng | Robot đang WAIT_CLEAR → tắt app/kết nối | Robot đứng yên (an toàn); sau khi kết nối lại và PIR im ≥2s (hoặc hết deadline) → tự resume; app khi mở lại tự kết nối, banner hết hạn tự tắt | [ ] |
| 7.3 | Reconnect giữa tour | Tắt BLE 5s → bật lại | App tự kết nối lại; robot tiếp tục trạng thái trước đó (WAIT_CLEAR/FOLLOW_LINE đúng theo log) | [ ] |
| 7.4 | App chạy nền → mở lại | Kết nối đang giữ → background → foreground | Kết nối còn (nếu OS không kill); không crash | [ ] |
| 7.5 | Gửi lệnh khi mất kết nối | Tắt robot → bấm SOS | Không crash; log warning "Not connected"; UI vẫn phản hồi trạng thái offline | [ ] |
| 7.6 | Cảnh báo rẽ bị lỗi ngã ba (phần B) | Nếu `WARN:turn` gửi trùng/sai trên tuyến | Chỉ là toast nhiễu — tour vẫn chạy bình thường, không dừng, không gãy | [ ] |

---

## 8. Âm thanh — loa ngoài

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 8.1 | TTS cảnh báo qua loa ngoài | Kích WARN:person | Giọng đọc rõ qua loa điện thoại (không phải tai nghe), tiếng Việt chuẩn | [ ] |
| 8.2 | TTS thuyết minh/narration qua loa | Chạy video node | Âm thanh video phát qua loa ngoài | [ ] |
| 8.3 | Đo âm lượng thực tế | Đo bằng máy đo dB (hoặc so sánh chủ quan) ở khoảng cách 1m, có/không tiếng ồn nền | Ghi số liệu: dB môi trường, dB khi phát, tỉ lệ nghe rõ | [ ] |
| 8.4 | Dừng TTS khi kết thúc cảnh báo | Đang đọc cảnh báo → PIR sạch → robot tự resume | TTS cảnh báo dừng; toast xác nhận hiện không đọc chồng lên | [ ] |

---

## 9. Chỉ tiêu số — bảng đo (mỗi metric 10 lần, GATE 1)

> Cách đo: người thứ 2 bấm giờ theo sự kiện quan sát được (banner xuất hiện / tiếng còi / robot nhúc nhích); ghi từng lần vào bảng. Chấm đạt nếu **trung bình** nằm dưới target.

### 9.1 Auto-resume end-to-end: vẫy tay PIR → banner hiện → ngừng vẫy → robot chạy tiếp
Target: **<3s** (từ lúc ngừng vẫy tay — PIR sạch — đến lúc robot nhúc nhích; gồm 2s xác nhận đường thoáng)

| Lần | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | TB | Đạt? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Thời gian (s) | | | | | | | | | | | | |

### 9.2 WARN:person → banner hiện + TTS bắt đầu
Target: **<1s**

| Lần | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | TB | Đạt? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Thời gian (s) | | | | | | | | | | | | |

### 9.3 SOS → robot dừng + STATUS:sos
Target: **<2s** (từ lúc nhả nút/giữ đủ 2s đến lúc robot dừng hẳn — quan sát + Serial timestamp)

| Lần | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | TB | Đạt? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Thời gian (s) | | | | | | | | | | | | |

### 9.4 Timeout tự resume (an toàn): vẫy tay liên tục → không dừng → robot chạy tiếp
Target: **10s ± 1s** (đo từ lúc robot dừng)

| Lần | 1 | 2 | 3 | 4 | 5 | TB | Đạt? |
|---|---|---|---|---|---|---|---|
| Thời gian (s) | | | | | | | |

### 9.5 Độ chính xác nhận diện node (Color Sensor — giữ số liệu V3)
Số node đúng / tổng node trong tour: **___ / 13** (3 tour) · Lỗi phát hiện: ___

### 9.6 SOS → Dashboard hiển thị
Target: **<5s** (từ lúc `STATUS:sos` nhận trên app đến lúc Dashboard máy tính hiển thị — polling 2s + log server)

| Lần | 1 | 2 | 3 | 4 | 5 | TB | Đạt? |
|---|---|---|---|---|---|---|---|
| Thời gian (s) | | | | | | | |

---

## 10. Kết luận kiểm thử

| GATE | Tiêu chí | Đạt? | Ghi chú |
|---|---|---|---|
| GATE 1 | Vòng WARN:person auto-resume (đường thoáng + timeout) + SOS chạy trên tuyến thật, số liệu 9.1–9.5 đạt target | [ ] | |
| GATE 1 | Dashboard nhận SOS + vị trí robot (9.6 <5s) — nếu làm D | [ ] | |
| GATE 1 | Robot đến node đúng → `NODE_START:<id>` không crash, log rõ | [ ] | |
| GATE 2 | Tour hoàn chỉnh + SOS thật + người bịt mắt | [ ] | |
