# Heritage Buddy — Danh sách Assets

## Quy tắc chung

- **Phong cách:** Flat vector, thick black outlines, warm palette
- **Màu sắc:** Orange `#F57C00`, Cream `#FFF3E0`, Jade `#00897B`
- **Kích thước:** Xuất ở 1x, 2x, 3x (ví dụ: `mascot_default.png`, `mascot_default@2x.png`, `mascot_default@3x.png`)
- **Định dạng:** PNG (trong suốt nếu là mascot/icon, có nền nếu là illustration)
- **Nội dung:** Không text trong ảnh

---

## 1. Mascot "Buddy" (linh vật hổ con)

| # | Asset | Dùng cho | Mô tả |
|---|-------|----------|-------|
| 1 | `mascot_default.png` | Màn hình chính, idle | Hổ con đứng thẳng, mặt chính diện, cười hiền |
| 2 | `mascot_happy.png` | Success state | Hổ con nhảy cẫng lên, tay giơ cao, mắt lấp lánh |
| 3 | `mascot_listening.png` | "Hey Buddy" listening | Hổ con nghiêng đầu, tay để tai, vẻ chăm chú |
| 4 | `mascot_thinking.png` | LLM thinking | Hổ con tay chống cằm, nhìn lên suy tư |
| 5 | `mascot_confused.png` | Error state | Hổ con nghiêng đầu, dấu ? trên đầu, lo lắng |
| 6 | `mascot_idle.png` | Standby/waiting | Hổ con ngồi, đuôi cuộn, mỉm cười nhẹ |

**Prompt gốc cho AI (áp dụng cho tất cả biến thể):**
> *"A cute chibi tiger cub mascot named Buddy, flat vector style, thick black outlines, warm orange fur with cream belly, jade/teal accent on collar."*

---

## 2. Onboarding Illustrations

| # | Asset | Dùng cho | Mô tả |
|---|-------|----------|-------|
| 7 | `onboarding_welcome.png` | Màn hình chào mừng | Bảo tàng với robot chỉ tay vào hiện vật, ánh sáng ấm |
| 8 | `onboarding_accessibility.png` | Chọn chế độ accessibility | 3 biểu tượng: tai + sóng âm (điếc), mắt + kính (mù), miệng + bong bóng hội thoại (câm) |
| 9 | `onboarding_gesture.png` | Hướng dẫn cử chỉ tay | Bàn tay "dừng" (xòe) và "tiếp" (chỉ), có check mark |

---

## 3. State Illustrations

| # | Asset | Dùng cho | Mô tả |
|---|-------|----------|-------|
| 10 | `empty_route.png` | Không có lộ trình | Sơ đồ bảo tàng có đường đứt nét, Buddy ngồi nhìn |
| 11 | `success_tour_complete.png` | Hoàn thành tour | Buddy đeo mũ thám hiểm, bản đồ có checkmarks, confetti |
| 12 | `error_no_connection.png` | Mất kết nối robot | Buddy nhìn điện thoại hiện "disconnected", robot mờ dần |

---

## 4. App Icon & Splash (đã có sẵn, cần thay thế)

| # | Asset | Dùng cho | Ghi chú |
|---|-------|----------|---------|
| 13 | `icon.png` | App icon | Hiện tại là Expo default — cần đổi thành Buddy avatar |
| 14 | `splash-icon.png` | Màn hình splash | Hiện tại là Expo default — cần đổi thành Buddy + tên app |
| 15 | `favicon.png` | Web favicon | 32x32px |

---

## 5. Thư mục lưu trữ

```
assets/images/
├── mascot_default.png
├── mascot_default@2x.png
├── mascot_default@3x.png
├── mascot_happy.png
├── mascot_happy@2x.png
├── mascot_happy@3x.png
├── mascot_listening.png
├── mascot_listening@2x.png
├── mascot_listening@3x.png
├── mascot_thinking.png
├── mascot_thinking@2x.png
├── mascot_thinking@3x.png
├── mascot_confused.png
├── mascot_confused@2x.png
├── mascot_confused@3x.png
├── mascot_idle.png
├── mascot_idle@2x.png
├── mascot_idle@3x.png
├── onboarding_welcome.png
├── onboarding_welcome@2x.png
├── onboarding_welcome@3x.png
├── onboarding_accessibility.png
├── onboarding_accessibility@2x.png
├── onboarding_accessibility@3x.png
├── onboarding_gesture.png
├── onboarding_gesture@2x.png
├── onboarding_gesture@3x.png
├── empty_route.png
├── empty_route@2x.png
├── empty_route@3x.png
├── success_tour_complete.png
├── success_tour_complete@2x.png
├── success_tour_complete@3x.png
├── error_no_connection.png
├── error_no_connection@2x.png
├── error_no_connection@3x.png
├── icon.png
├── splash-icon.png
└── favicon.png
```

> **Tổng cộng:** 12 asset chính × 3 kích thước = 36 file + 3 file app icon/splash = **39 file PNG**

---

## Import trong code

Tất cả asset được import qua `src/constants/images.ts`:

```ts
import { images } from "@/constants/images";

// Sử dụng
<Image source={images.mascotDefault} />
<Image source={images.mascotHappy} />
<Image source={images.mascotListening} />
// ...
```
