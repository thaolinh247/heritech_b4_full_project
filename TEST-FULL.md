# TEST-FULL — Danh sách kiểm thử toàn bộ dự án Heritage Buddy (App + Server + ML)

> **Ngày:** 2026-08-14 | **Phạm vi:** toàn bộ dự án — app Expo (`heritage-buddy-app/`), backend (`server/`), nhận diện ký hiệu tay on-device (`src/ml/`), tương tác robot BLE (`heritech_robot/`)
> **Tham chiếu:** `TEST-INTERACTION.md` (chi tiết robot↔app) · `PLAN.md` · `plan-ver2.md` · `PLAN-BILINGUAL.md`
> **Quy ước:** ghi `[x]` vào cột KQ khi pass; test đo thời gian ghi số đo vào bảng metric (mục 11).

---

## 0. Chuẩn bị & môi trường

| Hạng mục | Chuẩn bị |
|---|---|
| Node | `node -v` ≥ 18; `npm` cài sẵn |
| App | `npm install` tại root; server `npm install` trong `server/` |
| Server | Tạo `server/.env` (sao chép `server/.env.example`) + đặt `GEMINI_API_KEY` thật |
| Robot (nếu test BLE) | Nạp firmware qua PlatformIO, mở Serial Monitor @9600 |
| Thiết bị test | Android (khuyến nghị, BLE + micro thật) + Web (`npx expo start --web` cho gesture recognition) |
| Công cụ | BLE UART terminal (nRF Connect) để gửi lệnh giả; đồng hồ bấm giờ |

**Lệnh khởi động nhanh:** `scripts/start-dev.cmd` (server + Expo một lệnh) hoặc `scripts/start-server.cmd` (server tự restart khi crash).

**Cấu hình backend URL:** app tự dò IP máy chạy server theo thứ tự `Constants.expoConfig.hostUri` → `EXPO_PUBLIC_BACKEND_URL` → `http://localhost:3000` (`src/lib/llm.ts`). USB debug: `adb reverse tcp:3000 tcp:3000`.

---

## 1. Kiểm tra tĩnh & unit test (test bàn, không cần thiết bị)

| # | Test case | Lệnh | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 1.1 | TypeScript compile | `npx tsc --noEmit` (root) | Compile sạch | [ ] |
| 1.2 | ESLint | `npx expo lint` (root) | 0 lỗi (warning không chặn) | [ ] |
| 1.3 | Unit test toàn bộ | `npx jest` | Tất cả test pass | [ ] |
| 1.4 | Unit test i18n | `npx jest heritage-buddy-app/src/lib/i18n.test.ts` | 3 suite pass (dictionary, `t()`, `pickViEn`) | [ ] |
| 1.5 | Unit test language store | `npx jest heritage-buddy-app/src/store/language.test.ts` | Pass (default `vi`, chuyển `en`, persist) | [ ] |

### 1A. Lỗi tsc đã biết (ghi nhận, không chặn test chức năng)

| File | Lỗi | Trạng thái |
|---|---|---|
| `src/hooks/use-voice-assistant.ts:230,310` | Thiếu `language` trong `LLMRequest` gọi `askBuddy`/`askBuddyWithAudio` | Có sẵn trước merge; `llm.ts` tự thêm `language: getLanguage()` nên runtime OK |
| `src/lib/i18n.test.ts`, `src/store/language.test.ts` | `describe`/`it`/`expect` không nhận type jest trong `tsc --noEmit` | Có sẵn trước merge; Jest vẫn chạy được |
| (đã hết) `src/app/museum-map.tsx:263` | Route `/gesture-recognition` chưa có trong typed routes | Đã sửa bằng `npx expo start --clear` (sinh lại `.expo/types/router.d.ts`) |

---

## 2. Onboarding — ngôn ngữ & chế độ hỗ trợ

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 2.1 | Mở app lần đầu | `npx expo start` → mở app | Splash giữ tới khi font + language store rehydrate xong; hiện màn hình chào có mascot + nút "Bắt đầu" (`testID=onboarding-start-button`) | [ ] |
| 2.2 | Bộ chọn ngôn ngữ | Vào `/selection` | 2 chip "Tiếng Việt" / "English" hiện đầu màn; chip active màu jade `#2E8B7E` | [ ] |
| 2.3 | Đổi ngôn ngữ | Chọn English | Toàn bộ UI màn selection đổi sang tiếng Anh ngay (reactive `useT`) | [ ] |
| 2.4 | Persist ngôn ngữ | Chọn EN → tắt app → mở lại | Vẫn English (AsyncStorage key `heritage-buddy-language`); không nháy về VI (gate `hydrated`) | [ ] |
| 2.5 | Chọn chế độ khiếm thị | Bấm `selection-vision` | Card có viền đậm + dấu ✓; nút "Xác nhận" sáng cam `#E8935E` | [ ] |
| 2.6 | Xác nhận chưa chọn gì | Không chọn → bấm "Xác nhận" | Nút `disabled` (nền xám `#D4C5B6`), không điều hướng | [ ] |
| 2.7 | Xác nhận có chọn | Chọn `hearing` → bấm `selection-confirm-button` | `useAccessibilityStore.selectedMode = "hearing"`; `router.replace("/museum-map")` | [ ] |
| 2.8 | 3 chế độ đầy đủ | Quan sát | Có đủ: khiếm thị (vision), khiếm thính (hearing), khiếm ngôn (speech) — mỗi card mascot riêng | [ ] |

---

## 3. Bản đồ bảo tàng & tiến trình tour

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 3.1 | Hiển thị 13 node | Vào `/museum-map` | 13 node theo thứ tự 1–13 đúng tọa độ `x/y` + đường path SVG nối giữa chúng; 4 section banner | [ ] |
| 3.2 | Trạng thái node ban đầu | Progress trống | Node 1 là `current` (pulse + glow cam), node 2–13 là `locked` (🔒 xám); badge `0/13` | [ ] |
| 3.3 | Chỉ mở được node hiện tại | Bấm node locked | Không điều hướng (Pressable disabled, accessibilityState disabled) | [ ] |
| 3.4 | Mở node current/completed | Bấm node 1 (current) | `router.push("/node/ancient-01")` | [ ] |
| 3.5 | Persist tiến trình | Hoàn thành vài node → tắt app → mở lại | Số node hoàn thành giữ nguyên (key `heritage-buddy:map-progress`); badge cập nhật | [ ] |
| 3.6 | Reset progress | Bấm nút reset ↺ (đỏ, góc phải) → xác nhận | Alert hỏi xác nhận; xác nhận → badge `0/13`, toàn bộ node về locked | [ ] |
| 3.7 | Nút 🚫/chưa kết nối khi bấm "Xuất phát" | Tắt BLE → bấm "Xuất phát" | Alert "Chưa kết nối" với nút "Thử lại" (`connect()`) và "Hủy" | [ ] |
| 3.8 | Xuất phát khi đã kết nối | Kết nối BLE → bấm "Xuất phát" | Alert xác nhận → gửi `START` → alert "Robot đã bắt đầu di chuyển!" | [ ] |
| 3.9 | Nút mở gesture recognition | Bấm nút tròn 🤟 (`testID=gesture-entry-button`, màu jade) | `router.push("/gesture-recognition")` (xem mục 7) | [ ] |

---

## 4. Màn hình nội dung node (video + narration)

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 4.1 | Node hợp lệ | Mở `/node/ancient-01` | Video tự phát (expo-video, autoplay, loop=false); title `pickViEn` đúng ngôn ngữ; hint "Xem video..." | [ ] |
| 4.2 | Node không tồn tại | Mở `/node/xyz` | Màn hình lỗi mascot confused + "Không tìm thấy nội dung" + nút Quay lại | [ ] |
| 4.3 | Nút "Đi tiếp" (node thường) | Xem video → bấm "Đi tiếp" | Gửi `NODE_DONE:{order-1}` (nếu kết nối) → `completeNode(id)` → `router.replace("/museum-map")`; node đánh dấu ✓ jade | [ ] |
| 4.4 | Nút "Đi tiếp" (node cuối) | Node 13 xem xong → bấm "Kết thúc hành trình" | Gửi `NODE_DONE:12` → `router.replace("/celebration")` | [ ] |
| 4.5 | Node đã xem | Mở lại node completed | Hint "Bạn đã xem nội dung này."; nút "Đi tiếp" xám (`#D4C5B6`) → back về map | [ ] |
| 4.6 | Nút "Hỏi Buddy" | Bấm `🎙️ Hỏi Buddy` | `router.push("/chat/{node.id}")` (xem mục 5) | [ ] |
| 4.7 | Phụ đề song song | Xem video | Video có âm thanh qua loa ngoài; nội dung chữ (title + hint) hiển thị đồng thời — yêu cầu accessibility | [ ] |

---

## 5. Chat "Hỏi Buddy" — trợ lý giọng nói (STT → LLM → TTS)

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 5.1 | Server health khi mở chat | Vào `/chat/:nodeId` | Gọi `GET /api/health`; nếu OK banner lỗi không hiện; nếu lỗi → banner đỏ "Không kết nối được máy chủ" | [ ] |
| 5.2 | Trạng thái ban đầu | Mới vào | Mascot idle + lời chào; nút mic cam "Nhấn để nói" (`state=idle`) | [ ] |
| 5.3 | Gửi câu hỏi bằng text | Gõ "Hiện vật này bao nhiêu tuổi?" → Enter | Bubble user xanh; `state=thinking` (TypingIndicator 3 chấm + mascot thinking); gọi `/api/ask-buddy` với `artifactContext` của node hiện tại | [ ] |
| 5.4 | Buddy trả lời | Chờ LLM | Bubble trả lời + TTS đọc (Hẹn gặp lại `state=speaking`, bubble có viền cam + "Buddy đang đọc..."); xong TTS → `state=idle` + tự nghe lại sau ~1s (`MIC_RESTART_DELAY_MS`) | [ ] |
| 5.5 | Mic → STT | Bấm nút mic | Bíp rồi `state=listening` (nút đỏ, nhịp pulse, mascot listening); transcript hiện italic trong dấu ngoặc kép | [ ] |
| 5.6 | STT text → gửi | Nói xong (isFinal) | Mic tự đóng → `state=thinking` → LLM → TTS như 5.4 | [ ] |
| 5.7 | Lệnh điều hướng bằng giọng | Nói "đi tiếp" / "next" / "chuyển node" | Không gọi LLM: gửi `VOICE_NEXT` (nếu kết nối) → `completeNode` → về `/museum-map` | [ ] |
| 5.8 | Lệnh "dừng" | Nói "dừng lại" / "stop" | Gửi `VOICE_NEXT` + về map (từ khoá NAV_KEYWORDS gồm dừng/tiếp/stop/next/continue...) | [ ] |
| 5.9 | STT không khả dụng | Thiết bị/web không có STT (speechError=unavailable) | Fallback ghi âm: `state=recording` "Đang ghi âm..."; gửi qua `/api/ask-buddy-audio` | [ ] |
| 5.10 | Ghi âm qua micro | Bấm mic lần 2 khi đang recording | Dừng ghi → đọc base64 (AAC/m4a) → gửi audio lên server → Buddy trả lời | [ ] |
| 5.11 | Tự dừng ghi âm khi im lặng | Nói rồi im ~3s | Auto-stop qua metering (ngưỡng -45dB, poll 400ms); gửi câu hỏi tự động | [ ] |
| 5.12 | Giới hạn 10s ghi âm | Ghi liên tục 10s | Auto-stop (`MAX_RECORDING_MS=10000`); không ghi dài hơn | [ ] |
| 5.13 | Swipe/switch mở mic | Nhận `SWITCH_PRESS` khi đang ở chat | `toggleListening()` — không mở chat trùng (guard pathname ở node screen) | [ ] |
| 5.14 | VOICE_STOP từ robot | Nhận `VOICE_STOP` | Sau ~500ms tự mở mic nghe tiếp (`startListeningAfterSpeaking`) nếu không bị lock | [ ] |
| 5.15 | Lỗi STT engine | STT start thất bại (busy/network) | Thử lại 1 lần sau 1.2s; vẫn fail → fallback ghi âm; ghi âm fail → `state=error` (nút đỏ, bấm để thử lại) | [ ] |
| 5.16 | Server mất mạng | Tắt server → gửi câu hỏi | Bubble user hiện; bubble Buddy lỗi "không kết nối được máy chủ" (i18n `va.serverDown`); `state=idle` | [ ] |
| 5.17 | Lock chống trùng | Bấm mic liên tục khi `thinking` | Bấm giữa chừng bị bỏ qua (`inputLockRef`) — không mở mic giữa lúc xử lý | [ ] |
| 5.18 | Rời màn hình dọn dẹp | Đang nói → back | `stopListening()`, `stopTTS()`, `clearChat()` — không rò rỉ mic/âm thanh | [ ] |

---

## 6. Nhận diện ký hiệu tay — model on-device (tính năng mới từ edge-ai-recognition)

> Model: CNN int8 nhúng (conv2d→maxpool ×3 → flatten → dense ×2), input ảnh xám 28×28, chạy bằng JS thuần `src/ml/runtime.ts` — không cần mạng, không cần server. Bảng chữ: `"ABCDEGHIKLMNOPQRSTUVXY"` (22 chữ, tiếng Việt VSL). Độ chính xác tập test: **95.77%**. Ngưỡng tin cậy: **35%**.

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 6.1 | Vào màn hình | Map → nút 🤟 (hoặc route trực tiếp) | Màn hình "Nhận diện ký hiệu tay — Model chạy trực tiếp trên thiết bị"; khung camera/placeholder mascot 🤟 | [ ] |
| 6.2 | Camera web bật | Mở trên `npx expo start --web` | Camera selfie hiện trong khung tròn (mirrored); không hiện lỗi | [ ] |
| 6.3 | Chụp & nhận diện | Đưa tay chữ A vào khung → "Chụp & nhận diện" | Overlay "Đang nhận diện…" → `gesture-result-card` hiện chữ **A**, độ tin cậy %, thời gian ms, top-3 alternatives | [ ] |
| 6.4 | Ảnh mẫu chữ A | Bấm "🧪 Dùng ảnh mẫu chữ A" (`gesture-sample-button`) | Nhận diện ảnh mẫu `gesture-sample-a.jpg` → kết quả chữ A (xác minh end-to-end khi không có camera) | [ ] |
| 6.5 | Chọn ảnh từ máy | Bấm "🖼️ Chọn ảnh từ máy" | File picker mở (web: `<input type=file>`); ảnh chụp tay → nhận diện đúng | [ ] |
| 6.6 | Mở lại camera | Sau khi nhận diện → "Mở lại camera" | Camera chạy lại, kết quả cũ bị xoá | [ ] |
| 6.7 | Lỗi camera | Từ chối quyền webcam | Hiện error banner + hint "Bạn vẫn có thể dùng ảnh mẫu"; app không crash | [ ] |
| 6.8 | Cả 22 chữ cái | Test lần lượt vài chữ (A, B, C, E, V...) | Nhận diện ≥ 35% confidence cho chữ đúng; sai chữ bị xếp sau trong alternatives | [ ] |
| 6.9 | Ngưỡng tin cậy | Ảnh không phải tay | `confident=false` (confidence < 35%) vẫn hiện top-3 — UI không khẳng định sai | [ ] |
| 6.10 | Chạy offline | Tắt mạng → lặp 6.4 | Vẫn nhận diện được (model nằm trong bundle `sign-model.ts`) | [ ] |
| 6.11 | Hot reload không crash | Sửa file → Fast Refresh | Không crash, không mất model | [ ] |
| 6.12 | Hiệu năng | Đo `tookMs` nhiều lần | Trung bình < 500ms trên máy thường (ghi vào mục 11.3) | [ ] |

---

## 7. Robot ↔ App qua BLE (tóm tắt — chi tiết tại TEST-INTERACTION.md)

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 7.1 | Kết nối tự động | Robot bật BLE → mở app | Quét tìm `HeritageBuddy` (service `6E400001-...`), tự kết nối; badge "Đã kết nối robot" xanh jade | [ ] |
| 7.2 | Auto-reconnect | Mất sóng → robot bật lại | Tự quét lại tối đa 2 lần, mỗi lần trễ 3s; khi hết lượt dừng hẳn (không quét vô hạn) | [ ] |
| 7.3 | NODE_START mở node tự động | Robot gửi `NODE_START:2` khi app đang ở map | App tự `router.replace("/node/...")` đúng node (trừ khi đang đứng ở node đó) | [ ] |
| 7.4 | NODE_COMPLETE cập nhật tiến trình | Robot gửi `NODE_COMPLETE:3` | Node 3 đánh dấu hoàn thành nếu chưa có (không trùng lặp) | [ ] |
| 7.5 | SWITCH_PRESS mở chat | Ở node screen → gửi `SWITCH_PRESS` | `router.push("/chat/{id}")`; bấm 2 lần trong 500ms bị debounce | [ ] |
| 7.6 | Gesture swipe đi tiếp | Ở node screen → gửi `GESTURE:SWIPE_RIGHT` | `completeNode` + gửi `VOICE_NEXT` (nếu BLE) + về `/museum-map`; cả SWIPE_LEFT/RIGHT đều xử lý | [ ] |
| 7.7 | Gesture bỏ qua khi không ở node | Gửi gesture khi đang ở map/chat | Không làm gì (chỉ xử lý khi `pathname.startsWith("/node/")`) | [ ] |
| 7.8 | WARN:person banner | Gửi `WARN:person` | Banner toàn màn hình + TTS + rung; tự tắt sau 10.5s fallback nếu không có STATUS | [ ] |
| 7.9 | WARN:turn toast | Gửi `WARN:turn_l` / `WARN:turn_r` | Toast 3.5s + TTS, không chặn màn hình | [ ] |
| 7.10 | STATUS:resumed / auto_resumed | Gửi `STATUS:resumed` | Toast đậm 2.6s "Robot đã tiếp tục hành trình" + TTS; `STATUS:auto_resumed` tương tự | [ ] |
| 7.11 | SOS từ app | Giữ nút SOS ≥2s (`SOS_HOLD_MS`) | Nút đổi "Đang giữ…"; đủ 2s → gửi `SOS`; banner SOS + mascot confused + TTS; nhả sớm <2s không kích hoạt | [ ] |
| 7.12 | Resume sau SOS | Bấm "Tiếp tục hành trình" | Gửi `RESUME` → toast/TTS "Hành trình tiếp tục"; tour KHÔNG reset | [ ] |
| 7.13 | SOS bị lỗi | Chưa kết nối BLE → giữ SOS | Không crash; UI offline rõ ràng | [ ] |
| 7.14 | ALL_DONE → Celebration | Gửi `ALL_DONE` | `router.replace("/celebration")` | [ ] |
| 7.15 | ALARM (legacy) | Gửi `ALARM` | Chỉ rung nhẹ + `pirDetected` 2s, KHÔNG hộp thoại | [ ] |
| 7.16 | Command lạ | Gửi `HELLO`, `""`, `!@#$` | Log warning, không crash | [ ] |

---

## 8. Backend server (Express + Gemini)

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 8.1 | Khởi động | `npm run dev` trong `server/` | Log `[Server] running on :3000`; cảnh báo nếu thiếu `GEMINI_API_KEY` | [ ] |
| 8.2 | `GET /api/health` | `curl http://localhost:3000/api/health` | `{ ok: true, hasApiKey: true/false }`; nếu không có key → `hasApiKey:false` và app hiện banner lỗi | [ ] |
| 8.3 | `POST /api/ask-buddy` hợp lệ | JSON `{ question, artifactContext }` | `{ answer }` — trả lời 2–3 câu, thân thiện, đúng hiện vật; prompt system kèm name/description/funFact | [ ] |
| 8.4 | `POST /api/ask-buddy` thiếu question | Gửi `{}` | `400 { error: "Missing question" }` | [ ] |
| 8.5 | `POST /api/ask-buddy-audio` hợp lệ | Gửi `audioBase64` + `mimeType` | `{ answer, transcription }`; audio AAC/m4a/webm từ app được Gemini nghe và trả lời | [ ] |
| 8.6 | Lỗi LLM | Hết hạn key / Gemini lỗi | `500 { error: "LLM request failed" }`; app map sang `va.serverDown` | [ ] |
| 8.7 | API key không lộ | Tìm `GEMINI_API_KEY` trong app code | ✅ Chỉ tồn tại trong `server/.env`, không có trong bundle app (llm.ts chỉ gọi server) | [ ] |
| 8.8 | Timeout phía app | Server tắt → gửi câu hỏi | App tự thử từng base URL (LAN → localhost), 20s timeout mỗi URL, trả lỗi i18n thân thiện | [ ] |

---

## 9. Song ngữ (Việt/Anh) — regression nhanh

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 9.1 | UI toàn chuỗi EN | Chọn English → đi index → selection → map → node → chat → celebration | Toàn bộ nhãn, Alert, banner, accessibilityLabel tiếng Anh (không hardcode VN trong màn) | [ ] |
| 9.2 | Nội dung node EN | Mở node → title/description | `titleEn`/`descriptionEn` hiển thị khi EN; mô tả rỗng → fallback i18n tiếng Anh | [ ] |
| 9.3 | TTS theo ngôn ngữ | Kích WARN khi EN | Giọng `en-US` (`tts.ts` chọn voice theo tag, fallback language tag) | [ ] |
| 9.4 | STT theo ngôn ngữ | Chat khi EN | `lang: "en-US"` trong config STT; transcript tiếng Anh | [ ] |
| 9.5 | LLM theo ngôn ngữ | Gửi câu hỏi khi EN | `llm.ts` thêm `language: "en"` vào request; server trả câu hỏi cùng ngôn ngữ | [ ] |
| 9.6 | Dictionary khớp | Jest `i18n.test.ts` | Key tiếng Anh == key tiếng Việt (1 đối 1), không key trống | [ ] |

> ⚠️ Ghi nhận: `server/src/index.ts` hiện build system prompt cố định tiếng Việt ("Bạn trả lời ... bằng tiếng Việt") và KHÔNG đọc trường `language` trong body — câu trả lời LLM có thể vẫn là tiếng Việt dù app đang ở EN. Cần test 9.5 + cập nhật server nếu fail.

---

## 10. Accessibility (chuẩn tối thiểu dự án)

| # | Test case | Các bước | Kết quả mong đợi | KQ |
|---|---|---|---|---|
| 10.1 | Touch target ≥48dp | Quét nút bấm chính (Confirm, Start, Mic, SOS FAB, card...) | Mỗi vùng chạm ≥48×48 (đã đặt `minHeight: 56`/48 cho hầu hết) | [ ] |
| 10.2 | Font scale 200% | Bật font lớn hệ thống (150%–200%) → duyệt các màn | Layout không vỡ, text không cắt, ScrollView không kẹt | [ ] |
| 10.3 | Trạng thái 2 kênh | Listening/thinking/error/success | Luôn có chữ + icon/mascot + màu (vd MicButton: màu+nền+mascot+label) — không chỉ dùng màu | [ ] |
| 10.4 | accessibilityRole/Label | Mở TalkBack/VoiceOver → duyệt màn chính | Nút có nhãn phù hợp (`Hỏi Buddy`, `Nút SOS. Giữ hai giây...`, `Mở nhận diện ký hiệu tay`) | [ ] |
| 10.5 | Phản hồi gesture trực quan | Gửi `GESTURE:SWIPE_RIGHT` | App xác nhận bằng việc chuyển màn/hành động rõ — người khiếm ngôn thấy được kết quả | [ ] |

---

## 11. Chỉ tiêu số (mỗi metric đo 10 lần)

### 11.1 STT → LLM → TTS end-to-end (từ lúc mic nhận transcript đến khi Buddy bắt đầu nói)
Target: **< 10s** (mạng LAN)

| Lần | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | TB | Đạt? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Thời gian (s) | | | | | | | | | | | | |

### 11.2 LLM text round-trip (`askBuddy` không STT)
Target: **< 8s**

| Lần | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | TB | Đạt? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Thời gian (s) | | | | | | | | | | | | |

### 11.3 Nhận diện ký hiệu tay (`tookMs` trên màn gesture)
Target: **< 500ms**

| Lần | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | TB | Đạt? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Thời gian (ms) | | | | | | | | | | | | |

### 11.4 Độ chính xác model ảnh mẫu (chạy 6.4 nhiều lần)
Số lần chữ A đúng chữ: **___ / 10** · Confidence TB: ___%

### 11.5 Tự động kết nối BLE (mở app → connected)
Target: **< 15s** (kể cả scan)

| Lần | 1 | 2 | 3 | 4 | 5 | TB | Đạt? |
|---|---|---|---|---|---|---|---|
| Thời gian (s) | | | | | | | |

---

## 12. Kết luận kiểm thử

| GATE | Tiêu chí | Đạt? | Ghi chú |
|---|---|---|---|
| GATE A | App khởi động, onboarding song ngữ, map 13 node, video node, celebration — không crash | [ ] | |
| GATE B | Chat Buddy: text + voice + audio fallback + TTS + lệnh điều hướng; lỗi mạng xử lý thân thiện | [ ] | |
| GATE C | Nhận diện ký hiệu tay on-device (ảnh mẫu + camera + upload) chạy offline, thời gian đạt target | [ ] | |
| GATE D | Robot ↔ App: BLE, NODE_START/COMPLETE, SWITCH, gesture, WARN, STATUS, SOS, ALL_DONE (tham chiếu TEST-INTERACTION.md) | [ ] | |
| GATE E | Server: health, ask-buddy, ask-buddy-audio; không lộ API key; song ngữ LLM (ghi nhận 9.5) | [ ] | |
| GATE F | Unit test Jest + lint pass; lỗi tsc cũ đã ghi nhận (mục 1A) | [ ] | |