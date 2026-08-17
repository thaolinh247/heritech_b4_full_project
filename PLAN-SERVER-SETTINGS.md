# PLAN: Cài đặt "Máy chủ AI" trong app (đổi IP không cần build lại)

## Mục tiêu
APK standalone nạp cứng `EXPO_PUBLIC_BACKEND_URL` lúc build → DHCP đổi IP là hỏng "Hỏi Buddy".
Thêm ô nhập URL + nút kiểm tra trong app → sửa IP trong 30 giây, KHÔNG build lại.

## Phương án tối ưu (so sánh)
| Phương án | Đổi IP | Đổi mạng khác | Build lại |
|---|---|---|---|
| Chỉ IP tĩnh | Không đổi được | Cần build | Có |
| **Ô nhập URL + kiểm tra (CHỌN)** | Sửa trong app 10s | Sửa trong app | Không bao giờ |

## Thay đổi (5 file + 2 file mới)

### 1. `store/server.ts` (MỚI) — Zustand persist theo mẫu `language.ts`
- `serverUrl: string | null`, `setServerUrl()`, `resetServerUrl()`
- Persist AsyncStorage key `heritage-buddy-server` → nhớ vĩnh viễn

### 2. `lib/llm.ts` (SỬA) — URL ưu tiên, đọc ĐỘNG mỗi lần gọi
```
① URL đã lưu trong Settings → ② hostUri (dev) → ③ EXPO_PUBLIC_BACKEND_URL → ④ localhost
```
- Bỏ `const BASE_URLS` (tính 1 lần lúc import) → `getBackendUrls()` gọi mỗi lần request
- Lỗi kết nối → trả về kèm **URL đang thử** (để màn hình chat hiển thị: "Không gọi được http://... — vào Cài đặt kiểm tra")

### 3. `app/settings.tsx` (MỚI) — màn hình Cài đặt
- Hiển thị **"Máy chủ đang dùng: <URL>"** (luôn nhìn thấy app trỏ tới đâu)
- Ô nhập URL (keyboard URL, placeholder = URL mặc định)
- Nút **"Lưu & Kiểm tra"**: lưu → gọi `checkServerHealth()` (có sẵn) → hiện:
  - ✓ "Máy chủ hoạt động — AI sẵn sàng"
  - ✗ lý do cụ thể (không tới được / thiếu GEMINI_API_KEY / HTTP xxx)
- Nút **"Khôi phục mặc định"**: xoá URL override
- Accessibility: text ≥ 18px, nút ≥ 48dp, contrast cao, `accessibilityLabel`

### 4. `app/_layout.tsx` + vào Settings (SỬA)
- Nút ⚙️ góc trên **museum-map.tsx** (màn hình chính lúc demo) → `router.push("/settings")`
- `_layout.tsx` thêm `Stack.Screen name="settings"` (headerShown đã tắt toàn cục)

### 5. `lib/i18n.ts` (SỬA) — key vi/en
```
settings.title / settings.serverUrl / settings.saveCheck / settings.reset /
settings.currentUrl / settings.healthOk / settings.healthFail / settings.healthNoKey
```
- Thêm key lỗi chat: `llm.reachHint` ("Vào Cài đặt kiểm tra máy chủ")

### 6. `store/server.test.ts` (MỚI) — test theo mẫu `language.test.ts`
- set/reset serverUrl, persist round-trip

## Xác minh
- `npx tsc --noEmit`, `npx expo lint`, `npx jest` — sạch
- Changelog + commit + push

## Kịch bản demo (sau khi build APK lần cuối)
1. Cài APK → ⚙️ → gõ `http://<IP>:3000` → Lưu & Kiểm tra → ✓
2. IP đổi bất kỳ lúc nào → ⚙️ → sửa → Kiểm tra → ✓ — **không bao giờ build lại**

## Không đụng tới
- Firmware robot, BLE, robot-interaction-overlay, museum-map logic — giữ nguyên
- `server/` backend — giữ nguyên (đã chạy + có GEMINI_API_KEY)
