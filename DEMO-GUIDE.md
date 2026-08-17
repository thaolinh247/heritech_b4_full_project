# DEMO-GUIDE — Chạy demo Heritage Buddy (B4)

Hướng dẫn 1 trang: bật robot lên và chạy demo tour đầy đủ — không cần test từng cảm biến.
Firmware giờ **tự dò cổng mọi cảm biến** (line tracer cố định A3; màu + gesture tự tìm trên A3 hoặc MUX ch0–7),
nên việc cắm tai nào vào cổng nào gần như không quan trọng nữa.

---

## 0. Trước demo (10 phút)

1. **Bố trí tuyến**: đường line kín, có 4 ngã ba rẽ và 5 điểm màu **ĐỎ** (nút đánh dấu mỗi chặng).
   Nếu chưa có đủ điểm đỏ, dán **băng keo đỏ 8–10 cm** lên line tại các vị trí dừng.
2. **Nạp firmware** (thay đổi gần nhất):
   ```
   cd heritech_robot && pio run -t upload
   ```
3. **Bật nguồn robot trước khán giả ≥ 1 phút** — PIR cần thời gian warm-up (~60s), tránh báo người giả lúc đầu.
4. Kết nối BLE từ điện thoại một lần cho quen: mở app → màn hình chính tự kết nối "HeritageBuddy".
   (Kiểm tra nhanh: máy tính mở nRF Connect, connect, bật Notify trên service TX → thấy
   `STATUS:heartbeat … raw=s1..s10 …` là ổn. Khi nằm trên line đen, `err=` dao động quanh 0.)

## 1. Chạy demo (kịch bản 4 phút — hoàn toàn tự động)

| Bước | Người dẫn | Robot / App hiển thị |
|---|---|---|
| 1 | Đặt robot ngay **đầu tuyến** (trên line, trước điểm đỏ đầu tiên) | — |
| 2 | Trên app bấm **Bắt đầu tour** | App: "Kết nối… Đang chạy"; robot chạy chậm (~30%) |
| 3 | Điểm đỏ thứ 1 → **tự động** | Còi nhỏ bíp; robot dừng; app TỰ MỞ node 1, video tự phát |
| 4 | Khách ra hiệu **"đi tiếp"** (nói / vẫy tay / bấm nút sau lưng robot) | Robot TỰ rời node, chạy chặng kế tiếp, tự rẽ ở ngã ba |
| 5 | Cứ mỗi điểm đỏ | Lặp lại bước 3–4: node 2, node 3, node 4 mở tự động theo thứ tự |
| 6 | Khán giả vẫy tay trước cảm biến | App: hộp cử chỉ hiện **SWIPE** (nếu cắm gesture) |
| 7 | Người đi tới trước robot | Robot dừng + cảnh báo; người rời đi → **banner biến mất → robot tự đi tiếp** |
| 8 | Điểm đỏ cuối (Finish) | Sau 15s: app tự sang màn hình **Hoàn thành tour** + huy chương 🎉 |

> Không cần chạm màn hình trong suốt tour — robot tự mở node theo thứ tự (đỏ lần 1 = node 1, lần 2 = node 2...).
> App KHÔNG tự gửi "đi tiếp": robot chỉ rời node khi nhận hiệu lệnh từ **giọng nói / vẫy tay / nút sau lưng** (hoặc bấm "Tiếp tục" trên màn hình — dự phòng an toàn 45s ở firmware).

> Luật an toàn mặc định: robot chỉ dừng khi có **người cắt ngang** phía trước, không cản khán giả đứng bên cạnh.

## 2. Nếu trục trặc (xử lý trong 30 giây)

- **Robot không bám line** → cắm lại line tracer vào **Port A3** (cổng analog 3, 4 chân), vặn biến trở trên
  sensor cho tới khi led chỉ bật khi trên màu đen.
- **Robot "báo rẽ" nhưng không rẽ** → đã sửa triệt để 17/08: báo rẽ giờ phát ra đúng lúc robot bắt đầu xoay
  (không còn 2 bộ phát hiện ngã ba độc lập). Nếu vẫn xoay lệch/không chụp được line sau rẽ → robot tự xoay lại
  thêm tối đa 2 lần rồi mới dừng; kiểm tra ngã ba có băng keo đen đủ rộng (≥ 2 cm) và không bị đứt quãng.
- **Không dừng ở điểm đỏ** → điểm đỏ phải nằm **đúng trên line**, băng keo dán thẳng, robot chạy qua trung tâm.
- **App không kết nối** → tắt Bluetooth rồi bật lại; vào Settings → HeritageBuddy → Forget, mở lại app.
- **Cảnh báo người giả liên tục** → là dây PIR đứt/hở (xin đổi dây) hoặc PIR bị chiếu sáng mạnh; thử lệnh
  `PIR_MODE:HIGH` qua nRF Connect.
- **Gesture không nhận** → kiểm tra cáp sensor, đưa tay ở khoảng 5–15 cm; không cần thiết cho demo chính.

## 3. Sau demo

- Bấm **Reset tour** trên app (hoặc nhấn nút Reset robot, hoặc gửi lệnh `RESUME` nếu chỉ muốn đi tiếp).

---

Tham chiếu nhanh:
- Hướng dẫn test chi tiết từng phần: [TEST-ROBOT.md](TEST-ROBOT.md)
- Thông số tuyến (5 node, 4 chặng): `heritech_robot/src/route_config.h` + `maneuver_nav.h`
- Giao thức BLE: `heritech_robot/src/ble_handler.cpp`