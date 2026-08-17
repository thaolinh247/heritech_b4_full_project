# HUONG-DAN-SU-DUNG — Heritage Buddy (dành cho người vận hành demo)

Tài liệu này hướng dẫn sử dụng app Heritage Buddy từ lúc cài đặt đến lúc demo thành công.
Kịch bản demo chi tiết (bố trí tuyến, các bước 4 phút, xử lý trục trặc robot) xem [DEMO-GUIDE.md](DEMO-GUIDE.md).

---

## 1. Cài đặt app (chỉ 1 lần)

### a) Build APK standalone (không cần máy tính lúc demo)
```bash
npm i -g eas-cli          # cài công cụ, 1 lần
eas login                 # đăng nhập tài khoản Expo (lần đầu)
eas build -p android --profile preview    # build APK trên cloud ~10-20 phút
```
- Build xong, EAS in link tải APK → cài vào điện thoại
  (Cài đặt → cho phép nguồn không xác định).
- Xem lại link: `eas build:list` · Build lại khi lỗi cache: thêm `--clear-cache`.

### b) Bật máy chủ AI trên máy tính (chỉ cho "Hỏi Buddy")
```bash
cd server
npm install               # 1 lần
npm run dev               # mỗi buổi demo: giữ cửa sổ này mở
```
- Máy tính và điện thoại phải **cùng một Wi-Fi**.
- Kiểm tra nhanh từ điện thoại: mở trình duyệt gõ `http://<IP-máy>:3000/api/health`
  → thấy `"ok": true` là AI sẵn sàng.

## 2. Cấu hình "Máy chủ AI" trong app (đã thêm màn hình Cài đặt)

Khi IP máy tính bị đổi (Wi-Fi cấp IP động), KHÔNG cần build lại app:

1. Mở app → bấm nút **⚙️** (góc trên màn hình chính).
2. Nhìn dòng **"Máy chủ đang dùng: http://…"** — đây là nơi app đang trỏ tới.
3. Gõ địa chỉ mới vào ô **Máy chủ AI** → bấm **"Lưu & Kiểm tra"**.
4. ✓ xanh = AI sẵn sàng. ✗ đỏ = xem lý do (không tới được / thiếu GEMINI_API_KEY).
5. Muốn trả về mặc định → bấm **"Khôi phục mặc định"**.

> Quy tắc 30 giây mỗi buổi demo: ⚙️ → Kiểm tra → xanh là demo được.
> Nếu quên: lúc khách hỏi Buddy mà lỗi, app hiện thông báo kèm **URL đang thử** → vào ⚙️ sửa theo đó.

## 3. Sử dụng app trong demo

| Thao tác | Cách làm |
|---|---|
| **Bắt đầu tour** | Đặt robot lên line → app → **Bắt đầu tour** |
| **Xem nội dung node** | Tự động: robot dừng điểm đỏ → còi → app mở node → video tự phát |
| **Ra hiệu "đi tiếp"** | Nói "đi tiếp" / vẫy tay trước cảm biến / bấm nút sau lưng robot |
| **Hoàn thành tour** | Điểm đỏ cuối → app tự sang màn hình Hoàn thành + huy chương |
| **Reset tour** | Bấm Reset tour trên app (hoặc nút Reset robot) |

- Tour demo (bám line, video, PIR, gesture) **không cần** server AI.
- "Hỏi Buddy" (khách hỏi hiện vật) **cần** máy chủ AI đang chạy + cùng Wi-Fi.

## 4. Trục trặc thường gặp

| Vấn đề | Cách xử lý |
|---|---|
| App không kết nối robot | Tắt/bật Bluetooth; vào Cài đặt → HeritageBuddy → Forget → mở lại app |
| "Hỏi Buddy" báo lỗi kết nối | Kiểm tra máy chủ đang chạy (`npm run dev`); vào ⚙️ → sửa IP → Kiểm tra |
| Robot báo người giả liên tục | Dây PIR đứt/hở → đổi dây; hoặc gửi `PIR_MODE:HIGH` qua nRF Connect |
| Robot không bám line | Cắm line tracer vào Port A3; chỉnh biến trở sensor cho led chỉ sáng trên vạch đen |
| Robot rẽ lệch | Đã tự thử lại tối đa 2 lần; kiểm tra ngã ba có băng keo đen ≥ 2 cm, không đứt quãng |

## 5. Nhắc nhanh ngày demo

- [ ] Nạp firmware mới nhất: `cd heritech_robot && pio run -t upload`
- [ ] Bật nguồn robot **≥ 1 phút trước khi demo** (PIR warm-up)
- [ ] Mở server: `cd server && npm run dev`
- [ ] Điện thoại cùng Wi-Fi máy tính; ⚙️ → Kiểm tra máy chủ → ✓
- [ ] Bố trí tuyến: 5 điểm đỏ trên line, 4 ngã ba rẽ

---

Tham chiếu: [DEMO-GUIDE.md](DEMO-GUIDE.md) (kịch bản 4 phút) · [TEST-ROBOT.md](TEST-ROBOT.md) (test chi tiết) · [PLAN-SERVER-SETTINGS.md](PLAN-SERVER-SETTINGS.md) (thiết kế màn hình Cài đặt)
