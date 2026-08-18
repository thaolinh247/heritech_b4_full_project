# Hướng dẫn Build APK & Triển khai Heritage Buddy

## Mục lục
1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Yêu cầu trước khi build](#2-yêu-cầu-trước-khi-build)
3. [Các bước thực hiện](#3-các-bước-thực-hiện)
4. [Sau khi build xong](#4-sau-khi-build-xong)
5. [Cách cập nhật app sau khi build](#5-cách-cập-nhật-app-sau-khi-build)
6. [Các lỗi thường gặp & cách fix](#6-các-lỗi-thường-gặp--cách-fix)
7. [Lưu ý quan trọng](#7-lưu-ý-quan-trọng)

---

## 1. Tổng quan kiến trúc

```
┌─────────────────┐     WiFi      ┌──────────────────────┐     HTTPS     ┌──────────────┐
│  Điện thoại      │ ────────────→ │  Máy tính bạn        │ ────────────→ │  Gemini API  │
│  (APK Heritage  │  IP:port      │  (Server Node.js     │  API Key      │  (Google LLM)│
│   Buddy)        │  192.168.x.x  │   port 3000)         │               │              │
└─────────────────┘               └──────────────────────┘               └──────────────┘
```

- **Điện thoại**: Chạy app Heritage Buddy (APK)
- **M máy tính**: Chạy server Node.js (proxy gọi Gemini API)
- **Gemini API**: Google AI xử lý câu hỏi

**Điện thoại KHÔNG gọi trực tiếp Gemini API** — tất cả đều qua server trên máy tính để bảo mật API key.

---

## 2. Yêu cầu trước khi build

### 2.1. Phần mềm cần cài

| Phần mềm | Phiên bản | Link cài |
|---|---|---|
| Node.js | ≥ 18 | https://nodejs.org |
| Git | Latest | https://git-scm.com |
| Expo CLI | Có sẵn qua npx | Không cần cài riêng |
| EAS CLI | Có sẵn qua npx | Không cần cài riêng |

### 2.2. Tài khoản cần có

| Tài khoản | Mục đích | Đăng ký |
|---|---|---|
| **Expo Account** | Build APK trên cloud | https://expo.dev/signup (Free) |
| **Gemini API Key** | LLM cho Buddy | https://aistudio.google.com/apikey (Free) |

### 2.3. Điện thoại Android

- Bật **Developer Options**: Cài đặt → About Phone → nhấn 7 lần "Build Number"
- Bật **USB Debugging**: Cài đặt → Developer Options → USB Debugging = ON
- (Hoặc cài APK bằng cách tải file rồi mở trên điện thoại)

---

## 3. Các bước thực hiện

### Bước 1: Clone & Cài dependencies

```bash
cd C:\heritech
npm install
```

### Bước 2: Cấu hình IP Server

Mở file `C:\heritech\.env` và sửa IP cho đúng IP máy tính bạn:

```env
# Tìm IP máy tính:cmd → ipconfig → IPv4 Address
EXPO_PUBLIC_BACKEND_URL=http://<IP_MÁY_TÍNH>:3000
```

Ví dụ:
```env
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.33:3000
```

> **LƯU Ý QUAN TRỌNG**: IP này bị **hardcode vào APK** khi build. Nếu DHCP đổi IP → phải sửa lại + build lại APK. Nên đặt **IP tĩnh** cho máy chạy server trong router.

### Bước 3: Đăng nhập Expo

```bash
npx eas login
```

Nhập email + password của tài khoản Expo. Nếu chưa có tài khoản → đăng ký tại https://expo.dev/signup

### Bước 4: Build APK

```bash
cd C:\heritech
npx eas build --profile preview --platform android
```

Quá trình build:
1. Hỏi về Android Keystore → Chọn **"Generate a new Android Keystore"** (lần đầu)
2. Upload source code lên cloud Expo
3. Build trên cloud (~15-20 phút)
4. Xong → hiển thị link download APK

### Bước 5: Tải & Cài APK

**Cách 1: Tải từ link**
- Mở link APK hiển thị sau khi build xong
- Tải file `.apk` về máy tính
- Copy vào điện thoại (USB, Google Drive, hay email)
- Mở file APK trên điện thoại → cho phép cài từ nguồn không xác định → Install

**Cách 2: Dùng ADB (nếu điện thoại đang kết nối USB)**
```bash
# Tìm đường dẫn file APK trong output của eas build
adb install /path/to/downloaded.apk
```

### Bước 6: Chạy Server trên máy tính

```bash
cd C:\heritech\server
npm run dev
```

Output sẽ hiển thị:
```
[Server] Heritage Buddy backend running on :3000
  Local:   http://localhost:3000
  Network: http://192.168.1.33:3000
  GEMINI_API_KEY: loaded (AQ.Ab8...)
```

> **Server PHẢI luôn chạy** khi sử dụng app. Nếu server tắt → app không gọi được LLM.

### Bước 7: Mở app trên điện thoại

1. Mở app "Heritage Buddy"
2. Nếu IP server đúng → app tự kết nối
3. Nếu sai → nhấn ⚙ gear icon trên màn hình bản đồ → nhập đúng IP → **Test Connection** → **Xác nhận**

---

## 4. Sau khi build xong

### 4.1. Cài lại APK (khi có bản mới)

```bash
# Build lại
npx eas build --profile preview --platform android

# Tải APK mới, cài đè lên bản cũ (không mất data)
```

### 4.2. Cài lại APK (khi muốn clean install)

```bash
# Gỡ APK cũ trên điện thoại trước
# Sau đó cài APK mới
```

### 4.3. Chạy server

Mỗi lần muốn dùng app → phải mở terminal chạy server:

```bash
cd C:\heritech\server
npm run dev
```

Để server chạy nền (không cần mở terminal):
- **Windows**: Dùng PM2 hoặc tạo shortcut chạy ẩn
- **Mac/Linux**: Dùng `nohup npm run dev &` hoặc PM2

---

## 5. Cách cập nhật app sau khi build

### 5.1. OTA Update (nhanh — không cần build lại APK)

Áp dụng khi: sửa JS/TS/CSS, sửa UI, fix bug, thêm screen mới

```bash
npx eas update --branch production --message "mô tả thay đổi"
```

App sẽ tự tải bản mới khi người dùng mở lại app.

**KHÔNG áp dụng cho:**
- Thêm native library mới
- Sửa `app.json` (icon, splash, permission)
- Thay đổi config native

### 5.2. Rebuild APK (chậm — build lại từ đầu)

Áp dụng khi: thay đổi native code, thêm library, sửa config

```bash
npx eas build --profile preview --platform android
```

Tải APK mới → cài đè lên bản cũ.

### 5.3. Tóm tắt

| Loại thay đổi | Cách làm | Thời gian |
|---|---|---|
| Sửa code app (JS/TS) | `eas update` | 2-3 phút |
| Sửa icon, splash, permission | `eas build` | 15-20 phút |
| Thêm native library | `eas build` | 15-20 phút |
| Sửa server code | Restart server | 5 giây |

---

## 6. Các lỗi thường gặp & cách fix

### Lỗi 1: "Không kết nối được máy chủ"

**Nguyên nhân**: IP server sai hoặc server chưa chạy

**Cách fix**:
1. Kiểm tra server đang chạy: mở trình duyệt → `http://<IP>:3000/api/health`
2. Nếu server chạy nhưng app không kết nối được → vào Settings (⚙) → sửa IP
3. Đảm bảo điện thoại và máy tính cùng mạng WiFi

### Lỗi 2: "Server missing GEMINI_API_KEY"

**Nguyên nhân**: File `.env` của server thiếu API key

**Cách fix**:
```bash
# Mở C:\heritech\server\.env
# Thêm dòng:
GEMINI_API_KEY=<your_key_here>
# Restart server
```

### Lỗi 3: Build bị lỗi

**Nguyên nhân**: Package không tương thích hoặc thiếu dependency

**Cách fix**:
```bash
# Kiểm tra doctor
npx expo-doctor

# Fix dependencies
npx expo install --fix

# Thử build lại
npx eas build --profile preview --platform android
```

### Lỗi 4: App crash khi mở

**Nguyên nhân**: APK cũ không tương thích với code mới

**Cách fix**:
1. Gỡ app cũ trên điện thoại
2. Build APK mới
3. Cài lại

### Lỗi 5: IP thay đổi sau khi reset router

**Nguyên nhân**: DHCP cấp IP mới cho máy tính

**Cách fix**:
1. Tìm IP mới: `ipconfig` → IPv4 Address
2. Sửa `.env`: `EXPO_PUBLIC_BACKEND_URL=http://<IP_MỚI>:3000`
3. Build lại APK: `npx eas build --profile preview --platform android`
4. **Hoặc** vào Settings (⚙) trong app → sửa IP → Save (không cần build lại)

### Lỗi 6: "Cannot reach server" khi test connection

**Cách fix**:
1. Kiểm tra firewall Windows: cho phép port 3000
2. Kiểm tra server đang listen trên `0.0.0.0` (đã fix)
3. Thử tắt antivirus tạm thời

---

## 7. Lưu ý quan trọng

### 7.1. Về IP Server

- IP trong `.env` bị **hardcode vào APK** lúc build
- DHCP có thể đổi IP → phải sửa `.env` + build lại
- **Giải pháp tốt nhất**: Đặt **IP tĩnh** cho máy tính trong router
  - Vào router admin → DHCP Reservation → thêm MAC address máy tính
- **Hoặc** dùng Settings screen trong app (⚙) để sửa IP runtime (không cần build lại)

### 7.2. Về Server

- Server **PHẢI luôn chạy** khi dùng app
- Server chạy trên port 3000 (có thể đổi trong `.env` của server)
- Server listen trên `0.0.0.0` (đã fix) — accessible từ mọi device trên WiFi
- Nếu server crash → restart lại: `npm run dev`

### 7.3. Về API Key

- **KHÔNG BAO GIỜ** commit API key lên git
- API key chỉ nằm trong `server/.env` (đã có trong `.gitignore`)
- APK **không chứa** API key — chỉ chứa IP server

### 7.4. Về WiFi

- Điện thoại và máy tính **PHẢI cùng mạng WiFi**
- Museum WiFi thường yếu → app có retry logic (đã fix)
- Nếu WiFi mất tạm thời → app sẽ hiển thị lỗi rõ ràng

### 7.5. Về Version

- Khi build APK mới → version code tự tăng (đã config `autoIncrement`)
- APK mới **cài đè** lên bản cũ được (không mất data)
- Muốn clean install → gỡ app cũ trước

### 7.6. Về OTA Update

- `eas update` chỉ cập nhật JS/TS code
- KHÔNG cập nhật native modules
- Người dùng mở app → tự tải bản mới (có thể cần kill app + mở lại)
- Phù hợp cho bug fix và UI update nhanh

### 7.7. Về Debug

- Log server: xem terminal đang chạy `npm run dev`
- Log app: `adb logcat | grep HeritageBuddy`
- Health check: `curl http://<IP>:3000/api/health`
