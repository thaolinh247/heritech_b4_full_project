# Robot-App Interaction Test Plan

## 1. BLE Connection

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1 | Auto-connect on app launch | 1. Mở app khi robot đang bật BLE | App tự động quét và kết nối đến robot "HeritageBuddy" |
| 1.2 | Manual connect | 1. Mở màn hình Museum Map<br>2. Nhấn "Kết nối" | connectionStatus chuyển: `disconnected` → `scanning` → `connected` |
| 1.3 | Scan timeout | 1. Tắt BLE trên robot<br>2. Nhấn "Kết nối" | Sau 10s, scan dừng, status về `disconnected`, hiển thị "Chưa kết nối" |
| 1.4 | Android permissions denied | 1. Từ chối cấp quyền Bluetooth | `scanAndConnect()` trả về `false`, không kết nối được |
| 1.5 | Unexpected disconnect | 1. App đang kết nối<br>2. Tắt robot | App nhận disconnect callback, status → `disconnected`, isConnected → `false` |
| 1.6 | Reconnect after disconnect | 1. App mất kết nối<br>2. Bật lại robot | `useEffect` auto-connect chạy, quét và kết nối lại |
| 1.7 | BLE module unavailable | 1. Chạy app trên thiết bị không hỗ trợ BLE | `getBLEModule()` trả về `null`, log warning, không crash |

## 2. Robot → App Commands

### 2.1 Narration / Tour Flow

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1.1 | NODE_START received | Robot gửi `NODE_START:ancient-01` | `setCurrentStop()` được gọi, `currentStop` cập nhật |
| 2.1.2 | NODE_START với id không hợp lệ | Robot gửi `NODE_START:invalid` | `parseInt("invalid")` → `NaN` → `0`, không crash |
| 2.1.3 | ALL_DONE received | Robot gửi `ALL_DONE` | Lệnh được parse, log "All nodes completed", không crash |

### 2.2 Alarm / Safety

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.2.1 | PIR alarm triggered | Robot gửi `ALARM` | `setPirDetected(true)`, rung `Vibration.vibrate()`, hiện Alert "Phát hiện người đi qua!" |
| 2.2.2 | PIR auto-reset | Robot gửi `ALARM` | Sau 2s, `pirDetected` tự động về `false` |
| 2.2.3 | Multiple rapid alarms | Robot gửi `ALARM` 3 lần liên tiếp | Mỗi lần đều rung + hiện alert, không bị throttle |

### 2.3 Physical Switch / Button

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.3.1 | Switch press on node screen | 1. Đang ở màn hình `/node/:id`<br>2. Robot gửi `SWITCH_PRESS` | `onSwitchPressRef.current` được gọi → navigate đến `/chat/:nodeId` |
| 2.3.2 | Switch press on non-node screen | Robot gửi `SWITCH_PRESS` ở màn hình Museum Map | `onSwitchPressRef.current` là `null` → không crash, không navigate |
| 2.3.3 | Switch press unregistered | 1. Rời khỏi node screen<br>2. Robot gửi `SWITCH_PRESS` | Cleanup từ `useEffect` đã unregister callback, không navigate |

### 2.4 Voice Stop

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.4.1 | Voice stop received | Robot gửi `VOICE_STOP` | `onVoiceStopRef.current` được gọi |
| 2.4.2 | Voice stop with no listener | Robot gửi `VOICE_STOP` khi không có callback | Không crash, bỏ qua silently |

### 2.5 Gesture Commands

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.5.1 | Swipe Right gesture | Robot gửi `GESTURE:SWIPE_RIGHT` | `setGesture("swipe_right")` (khi app ở màn hình node) |
| 2.5.2 | Swipe Left gesture | Robot gửi `GESTURE:SWIPE_LEFT` | `setGesture("swipe_left")` (khi app ở màn hình node) |
| 2.5.3 | Swipe Up gesture (stop) | Robot gửi `GESTURE:SWIPE_UP` | `setGesturePaused(true)` bất kể màn hình (robot tự tạm dừng ở firmware) |
| 2.5.4 | Gesture "đi tiếp" sau khi paused | Robot đang PAUSED, gửi `GESTURE:SWIPE_RIGHT/LEFT` | Firmware resume (`STATUS:resumed`), app xoá trạng thái dừng |
| 2.5.5 | Unknown gesture format | Robot gửi `GESTURE:UNKNOWN` | `parseRobotMessage()` trả về null → bỏ qua, log warning |

### 2.6 Unknown / Malformed Commands

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.6.1 | Unknown command string | Robot gửi `HELLO_WORLD` | `parseRobotMessage()` trả về `null`, log warning |
| 2.6.2 | Empty message | Robot gửi `""` hoặc `" "` | `trimmed` empty → `null`, log warning |
| 2.6.3 | Garbage data | Robot gửi `!@#$%^&*()` | `parseRobotMessage()` không match → `null`, bỏ qua |

## 3. App → Robot Commands

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1 | START sent | 1. Kết nối robot<br>2. Nhấn "Xuất phát" → confirm | App gọi `sendCommand("START")`, Base64 gửi qua BLE TX characteristic |
| 3.2 | START khi chưa kết nối | 1. Chưa kết nối<br>2. Nhấn "Xuất phát" | Không gửi lệnh, hiện alert "Bạn cần kết nối với robot" |
| 3.3 | NODE_DONE sent | 1. Ở màn hình node<br>2. Nhấn "Đi tiếp" | App gửi `NODE_DONE:ancient-01` (với id node hiện tại) |
| 3.4 | NEXT_NODE sent (last node) | 1. Ở node cuối (order=13)<br>2. Nhấn "Kết thúc hành trình" | App gửi `NEXT_NODE`, sau đó navigate đến `/celebration` |
| 3.5 | STOP sent | 1. Hoàn thành tất cả node<br>2. Vào màn hình Celebration | `useEffect` gọi `sendCommand("STOP")` khi mount |
| 3.6 | STOP khi chưa kết nối | 1. Vào Celebration khi robot offline | `sendCommand("STOP")` không gửi (kiểm tra `isConnected` → false) |
| 3.7 | VOICE_NEXT sent (via gesture) | 1. Ở màn hình node<br>2. Robot gửi `GESTURE:SWIPE_*` | `useGestureNavigation` gọi `sendCommand("VOICE_NEXT")` |
| 3.8 | VOICE_STOP sent | 1. Chat assistant đang nói<br>2. Robot gửi `VOICE_STOP` | App gửi VOICE_STOP, TTS dừng |
| 3.9 | Send command khi BLE disconnected | 1. Mất kết nối<br>2. Gọi `sendCommand("START")` | `bleState.isConnected` → false, log warning, không throw error |
| 3.10 | Send command sau khi robot tắt | 1. Đang gửi lệnh<br>2. Robot tắt giữa chừng | `writeWithResponse` fail → catch block, log warning |

## 4. Gesture Navigation Flow

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1 | Swipe to next node | 1. Ở node `ancient-01`<br>2. Robot gửi `GESTURE:SWIPE_RIGHT` | `completeNode("ancient-01")`, navigate đến `/node/ancient-02`, gửi `VOICE_NEXT` |
| 4.2 | Duplicate gesture debounce | 1. Robot gửi `GESTURE:SWIPE_RIGHT` 2 lần nhanh | Chỉ xử lý lần đầu, lần 2 bị `handledGestureRef` chặn |
| 4.3 | Gesture after gesture reset | 1. Xử lý swipe<br>2. `setGesture(null)` được gọi<br>3. Robot gửi gesture mới | `handledGestureRef` reset, gesture mới được xử lý |
| 4.4 | Different gesture types | 1. `GESTURE:SWIPE_RIGHT` → next<br>2. `GESTURE:SWIPE_LEFT` → next | Cả 2 đều trigger navigation (không phân biệt hướng) |
| 4.5 | Gesture on unknown node | 1. `currentNodeId` không hợp lệ<br>2. Robot gửi gesture | `MUSEUM_NODES.find()` → undefined, không navigate |
| 4.6 | Gesture with no current node | 1. `currentNodeId` = null<br>2. Robot gửi gesture | Early return ở đầu `useEffect`, không xử lý |
| 4.7 | Gesture on last node | 1. Ở node cuối (order=13)<br>2. Robot gửi gesture | `MUSEUM_NODES.find(n => n.order === 14)` → undefined, navigate không xảy ra |
| 4.8 | Gesture khi chưa kết nối BLE | 1. Mất kết nối BLE<br>2. Robot gửi gesture | Navigation vẫn hoạt động, chỉ bỏ qua `sendCommand("VOICE_NEXT")` |
| 4.9 | Swipe Up = STOP (màn hình node) | 1. Ở màn hình node<br>2. Robot gửi `GESTURE:SWIPE_UP` | `gesturePaused=true`, KHÔNG `completeNode`, KHÔNG navigate, KHÔNG gửi `VOICE_NEXT` |
| 4.10 | Swipe Up = STOP (đang chạy, app ở map) | 1. App ở /museum-map, robot đang chạy<br>2. Robot gửi `GESTURE:SWIPE_UP` | `gesturePaused=true`, banner "Robot đã dừng" hiện toàn cục, robot dừng tại chỗ |
| 4.11 | Tiếp tục sau khi dừng bằng cử chỉ | 1. Robot đang PAUSED<br>2. Gửi `VOICE_NEXT` / nói "tiếp theo" / vuốt trái-phải | Firmware resume chặng dở, app xoá banner dừng (`STATUS:resumed`) |

## 5. Screen Integration Flows

### 5.1 Museum Map Screen

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1.1 | Connection status indicator - connected | Robot đã kết nối | Hiển thị chấm xanh + text "Đã kết nối robot" |
| 5.1.2 | Connection status indicator - disconnected | Robot chưa kết nối | Hiển thị chấm đỏ + text "Chưa kết nối" + nút "Kết nối" |
| 5.1.3 | Connection status indicator - scanning | Đang quét robot | Hiển thị `ActivityIndicator` + text "Đang quét..." |
| 5.1.4 | Start button enabled | Robot connected | Nút "Xuất phát" màu xanh `#2E8B7E`, có thể bấm |
| 5.1.5 | Start button disabled | Robot disconnected | Nút màu xám `#D4C5B6`, text "Chưa kết nối" |
| 5.1.6 | Start tour flow | 1. Connected<br>2. Nhấn "Xuất phát"<br>3. Confirm | Gửi `START` command, hiển thị "Robot đã bắt đầu di chuyển!" |
| 5.1.7 | Node press (current/completed) | Nhấn vào node đang mở khóa | Navigate đến `/node/:id` |
| 5.1.8 | Node press (locked) | Nhấn vào node bị khóa | Không navigate |
| 5.1.9 | Reset progress | Nhấn nút reset (↺) | Confirm dialog → xoá toàn bộ completedNodeIds |

### 5.2 Node Screen [id]

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.2.1 | Video auto-play | Vào màn hình node | Video tự động phát (`player.play()` khi readyToPlay) |
| 5.2.2 | "Hỏi Buddy" button | Nhấn "🎙️ Hỏi Buddy" | Navigate đến `/chat/:nodeId` |
| 5.2.3 | "Đi tiếp" button | Nhấn "Đi tiếp" | Gửi `NODE_DONE:<id>`, navigate đến node tiếp theo |
| 5.2.4 | "Đi tiếp" on last node | 1. Ở node cuối<br>2. Nhấn "Kết thúc hành trình" | Gửi `NEXT_NODE`, navigate đến `/celebration` |
| 5.2.5 | "Đi tiếp" on completed node | 1. Vào lại node đã hoàn thành<br>2. Nhấn "Quay lại bản đồ" | `handleComplete` gọi `router.back()` |
| 5.2.6 | Switch press → Chat | Robot gửi `SWITCH_PRESS` | Navigate đến `/chat/:nodeId` |
| 5.2.7 | Unknown node ID | Vào `/node/invalid-id` | Hiển thị mascotConfused + "Không tìm thấy nội dung" |
| 5.2.8 | Gesture swipe on node screen | Robot gửi gesture | `useGestureNavigation` xử lý, navigate đến node tiếp |

### 5.3 Chat Screen [nodeId]

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.3.1 | Empty state | Vào chat mới | Hiển thị mascotIdle + "Chào bạn! Mình là Buddy..." |
| 5.3.2 | Send text message | Nhập câu hỏi → gửi | `sendMessage(text)` được gọi, message hiển thị |
| 5.3.3 | Mic toggle | Nhấn nút micro | `toggleListening()` chuyển state `idle` ↔ `recording` |
| 5.3.4 | Thinking state | Đang chờ LLM response | Hiển thị `TypingIndicator` |
| 5.3.5 | Server error banner | Server không phản hồi | Hiển thị banner đỏ "Không kết nối được máy chủ" |
| 5.3.6 | VOICE_STOP from robot | Robot gửi `VOICE_STOP` | `onVoiceStopRef.current` được gọi |
| 5.3.7 | Unknown nodeId in chat | Vào `/chat/invalid-id` | `node` = null, app không crash, ChatHeader hiển thị "Chat với Buddy" |

### 5.4 Celebration Screen

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.4.1 | STOP sent on mount | 1. Hoàn thành tour<br>2. Vào Celebration | `useEffect` gọi `sendCommand("STOP")` (nếu connected) |
| 5.4.2 | Mascot + message | Vào Celebration | Hiển thị mascotHappy + "Chúc mừng!" |
| 5.4.3 | Restart tour | Nhấn "Khám phá lại" | `resetProgress()`, navigate đến `/museum-map` |

## 6. Error & Edge Cases

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 6.1 | Robot disconnects mid-video | 1. Đang xem video tại node<br>2. Robot mất kết nối | `useEffect` cleanup chạy, video vẫn phát, "Đi tiếp" vẫn hoạt động |
| 6.2 | Robot reconnects during tour | 1. Mất kết nối<br>2. App tự động quét lại | `auto-connect effect` chạy, kết nối lại |
| 6.3 | Multiple screen mounts/unmounts | 1. Vào node → ra → vào nhanh | `onSwitchPress` cleanup/unregister hoạt động đúng, không memory leak |
| 6.4 | Rapid NODE_START commands | Robot gửi `NODE_START` cho nhiều node liên tiếp | `currentStop` cập nhật mỗi lần, không crash |
| 6.5 | BLE send queue | Gọi `sendCommand()` nhiều lần liên tiếp | Mỗi lần gọi đều `await writeWithResponse`, xử lý tuần tự |
| 6.6 | App background → foreground | 1. App đang kết nối BLE<br>2. Chuyển app về background<br>3. Mở lại | BLE connection giữ nguyên (nếu OS không kill) |

## 7. BLE Protocol Validation

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 7.1 | UART Service UUID | Kiểm tra kết nối | Service `6E400001-...` được discover |
| 7.2 | TX Characteristic | Robot → App | Characteristic `6E400003-...` subscribe `monitor()` |
| 7.3 | RX Characteristic | App → Robot | Characteristic `6E400002-...` ghi `writeWithResponse()` |
| 7.4 | Base64 encoding | `sendCommand("START")` | Lệnh được `btoa()` encode trước khi gửi |
| 7.5 | Base64 decoding | Nhận message từ robot | Message được `atob()` decode trước khi parse |
| 7.6 | Device name filter | Quét BLE | Chỉ kết nối device có name = "HeritageBuddy" |
