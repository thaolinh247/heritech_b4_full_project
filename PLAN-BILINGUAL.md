# PLAN-BILINGUAL — Song ngữ tiếng Việt + tiếng Anh (mục E plan-ver2)

> **Ngày:** 2026-08-11 | **Trạng thái:** chờ triển khai
> **Tham chiếu:** `plan-ver2.md` mục E · `CHANGELOG.md` · `heritage-buddy-app/`

---

## 1. Nguyên tắc đã chốt

- **Ngôn ngữ chọn 1 lần duy nhất** ở màn `selection.tsx` (onboarding), persist qua AsyncStorage.
  **Không có nút đổi ngôn ngữ ở bất kỳ đâu khác** — khách đi theo ngôn ngữ đã chọn từ đầu.
- **Giữ nguyên mọi thao tác hiện tại**: switch/mic để hỏi Buddy, gesture, SOS. Không đụng wake word
  "Hey Buddy" (phiên bản hiện tại không dùng), không thêm luồng tương tác mới.
- **Phạm vi dịch: TOÀN BỘ UI + nội dung + cảnh báo** (banner + TTS) khi chọn tiếng Anh.
- **Thuyết minh = video**: tạm thời giữ bản tiếng Việt ở cả 2 ngôn ngữ. Data thêm `videoSourceEn?`
  (rỗng) để sau này chỉ cần điền link video tiếng Anh, không đụng code.
- **Không cài thêm thư viện**: đã có `zustand ^5` (persist) + `@react-native-async-storage/async-storage`.
  i18n tự viết dictionary đơn giản, phù hợp mục đích dạy-học.

---

## 2. Các bước triển khai

### Bước 1 — Nền tảng
- `heritage-buddy-app/src/types/language.ts` (mới): `export type Language = "vi" | "en";`
- `heritage-buddy-app/src/store/language.ts` (mới): Zustand `persist` middleware +
  `createJSONStorage(() => AsyncStorage)`; `language`, `setLanguage`; `onRehydrateStorage` set cờ
  `hydrated` (chống hiện tượng "nháy" ngôn ngữ khi mở lại app).
- `heritage-buddy-app/src/app/_layout.tsx`: gate splash hiện có → `if (!fontsLoaded || !hydrated) return null;`
  rồi mới `SplashScreen.hideAsync()`.
- `heritage-buddy-app/src/lib/i18n.ts` (mới):
  - `getLanguage()` = `useLanguageStore.getState().language` — **dùng ngoài component** (tts/speech/llm/
    contextBuilder), không dùng hook.
  - `t(key)` — chuỗi UI theo ngôn ngữ đã chọn.
  - `pickViEn(vi, en)` — trả `en` nếu `en?.trim()` có giá trị, ngược lại `vi` (fallback phòng thủ khi
    thiếu bản dịch, tránh hiện `undefined` hoặc gửi context trống cho LLM).
  - Dictionary ~100 key × 2 ngôn ngữ (key set `vi` và `en` phải đối xứng — test ở Bước 5).

### Bước 2 — Dữ liệu
- `heritage-buddy-app/src/types/museum-map.ts`: thêm vào `MapNode`:
  - `titleEn: string`, `descriptionEn: string`, `funFactEn: string` (required — ép đủ bản dịch),
  - `videoSourceEn?: string` (rỗng hiện tại, để dành video tiếng Anh sau).
  - `MuseumSection` thêm `nameEn: string`.
- `heritage-buddy-app/src/data/museum-map.ts`: dịch 13 hiện vật × 3 trường + 4 tên khu.
- `heritage-buddy-app/src/lib/contextBuilder.ts`: dùng `pickViEn` theo ngôn ngữ để LLM nhận context
  đúng ngôn ngữ.

### Bước 3 — Giọng nói & LLM
- `heritage-buddy-app/src/lib/tts.ts`: chọn `vi-VN` / `en-US` theo ngôn ngữ store (cả `speak()` lẫn `useTTS`).
  Thêm `resolveVoice(language)` dùng `Speech.getAvailableVoicesAsync()` (cache 1 lần) — tìm voice khớp
  `vi-VN`/`en-*`; không có → gọi `speak` với language tag (dùng giọng mặc định, không crash). Bọc try/catch.
- `heritage-buddy-app/src/lib/speech.ts`: config STT `lang` theo ngôn ngữ đã chọn tại thời điểm start
  (`vi-VN`/`en-US`). Không đổi wake word / `detectWakeWord`.
- `heritage-buddy-app/src/lib/llm.ts` + `heritage-buddy-app/server/index.js`:
  - Thêm trường `language` vào body của `/api/ask-buddy` và `/api/ask-buddy-audio`.
  - `SYSTEM_PROMPT` và prompt audio tham số hóa ngôn ngữ ("trả lời bằng tiếng Việt" / "answer in English").
  - Mặc định `vi` khi client không gửi (tương thích ngược).
  - Dịch chuỗi lỗi fallback trong `llm.ts` theo ngôn ngữ.

### Bước 4 — UI
Thay chuỗi hardcode → `t(key)`. Checklist file có chuỗi user-facing (đã rà soát bằng
grep Unicode `[\u00C0-\u1EF9]` trong `"..."`):
- Màn: `app/index.tsx`, `app/selection.tsx` (+ bộ chọn ngôn ngữ đặt đầu màn, chọn trước chế độ hỗ trợ),
  `app/museum-map.tsx` (kể cả 4 `Alert`), `app/node/[id].tsx`, `app/chat/[nodeId].tsx`,
  `app/celebration.tsx`.
- Component: `components/robot-interaction-overlay.tsx` (WARN/SOS/STATUS text + TTS + accessibilityLabel),
  `components/chat/ChatBubble.tsx`, `ChatHeader.tsx`, `MicButton.tsx`, `TypingIndicator.tsx`,
  `components/map/map-node.tsx`, `components/map/section-banner.tsx`.
- Hook/lib: `hooks/use-voice-assistant.ts` (chỉ các chuỗi hiển thị, bỏ qua comment),
  `lib/contextBuilder.ts`, `lib/llm.ts`.

Không cần dịch (đã kiểm tra): `use-robot-connection.ts`, `use-gesture-navigation.ts`, `lib/bluetooth.ts`,
`lib/sound.ts`, `lib/voice-recorder.ts`, các store, theme, `types/robot.ts` (string literal), `app/_layout.tsx`.

Video giữ nguyên bản tiếng Việt ở cả 2 ngôn ngữ (bản EN sẽ thay sau qua `videoSourceEn`).

### Bước 5 — Hoàn thiện
- `heritage-buddy-app/src/lib/i18n.test.ts` (Jest có sẵn trong Expo):
  - Key set `vi` vs `en` phải bằng nhau.
  - `pickViEn` fallback về VI khi EN rỗng.
  - `t()` với key thiếu.
- `CHANGELOG.md` — ghi đầy đủ theo từng commit.
- `plan-ver2.md` — check mục E khi hoàn tất.
- `TEST-INTERACTION.md` — thêm test: chọn EN → UI/nội dung/bản đồ/cảnh báo tiếng Anh, TTS `en-US`,
  STT `en-US`, LLM trả lời tiếng Anh.
- Kiểm tra: `npx expo lint` + `npx jest` + `npx tsc --noEmit`
  (lưu ý: `tsc` treo trong môi trường này — chạy timeout dài + kill node procs; không phải lỗi code).

---

## 3. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Bản dịch 13 hiện vật sai/thiếu tự nhiên | TB | Viết bản dịch + để người dùng review trước khi merge |
| Thiết bị không có voice pack tiếng Anh | TB | `resolveVoice()` qua `getAvailableVoicesAsync()` + fallback giọng mặc định; test trên máy thật |
| Khối lượng thay chuỗi nhiều file (~13 file) | TB | Checklist rà soát ở Bước 4; grep cuối trước khi merge |
| `npx tsc --noEmit` treo | TB | Vấn đề môi trường đã biết, không phải lỗi code |

---

## 4. Definition of Done

- Chọn EN ở onboarding → toàn bộ UI, nội dung hiện vật, bản đồ, cảnh báo (banner + TTS) hiển thị/đọc tiếng Anh.
- Chọn VI → giữ nguyên hành vi hiện tại 100%.
- Ngôn ngữ persist qua AsyncStorage; không nháy ngôn ngữ khi mở lại app.
- Không thay đổi luồng thao tác (switch/mic/SOS/gesture), không đụng wake word.
- `npx expo lint` pass, `npx jest` pass, `npx tsc --noEmit` pass (nếu môi trường cho phép).
- CHANGELOG + commit Conventional Commits + push.
