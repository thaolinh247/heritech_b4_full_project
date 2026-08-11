import { useCallback } from "react";
import type { Language } from "@/types/language";
import { useLanguageStore } from "@/store/language";

const vi = {
  // ── Common ─────────────────────────────
  "common.back": "Quay lại",
  "common.confirm": "Xác nhận",
  "common.cancel": "Hủy",
  "common.retry": "Thử lại",
  "common.connected": "Đã kết nối robot",
  "common.disconnected": "Chưa kết nối",
  "common.scanning": "Đang quét...",
  "common.connecting": "Đang kết nối...",
  "common.connect": "Kết nối",
  "common.start": "Xuất phát",

  // ── Welcome (index.tsx) ────────────────
  "index.brand": "Buddy Bảo Tàng",
  "index.greeting": "Xin chào, mình là",
  "index.greetingName": "Buddy!",
  "index.tagline": "Mình sẽ đồng hành cùng bạn khám phá bảo tàng hôm nay!",
  "index.cta": "Bắt đầu",

  // ── Selection / onboarding ─────────────
  "selection.languageLabel": "Chọn ngôn ngữ",
  "selection.languageVi": "Tiếng Việt",
  "selection.languageEn": "English",
  "selection.title": "Chọn chế độ hỗ trợ phù hợp",
  "selection.mode.vision": "Khiếm thị",
  "selection.mode.hearing": "Khiếm thính",
  "selection.mode.speech": "Khiếm ngôn",

  // ── Museum map (museum-map.tsx) ────────
  "map.title": "Bản đồ bảo tàng",
  "map.alertNotConnectedTitle": "Chưa kết nối",
  "map.alertNotConnectedBody": "Bạn cần kết nối với robot trước khi xuất phát.",
  "map.alertStartTitle": "Xuất phát",
  "map.alertStartBody": "Robot sẽ bắt đầu di chuyển theo bản đồ?",
  "map.alertStartConfirm": "Xuất phát",
  "map.alertStartSuccess": "Thành công",
  "map.alertStartSuccessBody": "Robot đã bắt đầu di chuyển!",
  "map.alertResetTitle": "Đặt lại tiến trình",
  "map.alertResetBody": "Bạn có chắc muốn xoá toàn bộ tiến trình khám phá?",
  "map.alertResetConfirm": "Xác nhận",
  "map.sectionLabel": "Khu vực",

  // ── Node video (node/[id].tsx) ─────────
  "node.notFound": "Không tìm thấy nội dung",
  "node.watched": "Bạn đã xem nội dung này.",
  "node.watchHint": "Xem video để khám phá thêm về hiện vật này.",
  "node.askBuddy": "Hỏi Buddy",
  "node.askBuddyA11y": "Mở trợ lý Buddy",
  "node.next": "Đi tiếp",
  "node.endTour": "Kết thúc hành trình",
  "node.backToMap": "Quay lại bản đồ",

  // ── Chat (chat/[nodeId].tsx + components) ─
  "chat.defaultTitle": "Chat với Buddy",
  "chat.serverError": "Không kết nối được máy chủ. Vui lòng kiểm tra mạng!",
  "chat.emptyGreeting":
    "Chào bạn! Mình là Buddy.\nHỏi mình bất cứ điều gì về hiện vật này nhé!",
  "chat.recordingHint": "Đang ghi âm... nhấn lại để gửi",
  "chat.inputPlaceholder": "Nhập câu hỏi...",
  "chat.buddyReading": "Buddy đang đọc...",
  "chat.buddyThinking": "Buddy đang suy nghĩ...",

  // ── Mic button (MicButton.tsx) ─────────
  "mic.listening": "Đang nghe...",
  "mic.recording": "Đang ghi âm...",
  "mic.thinking": "Buddy đang suy nghĩ...",
  "mic.speaking": "Buddy đang trả lời...",
  "mic.error": "Lỗi, nhấn để thử lại",
  "mic.tapToSpeak": "Nhấn để nói",

  // ── Celebration ────────────────────────
  "celeb.title": "Chúc mừng! 🎉",
  "celeb.subtitle": "Bạn đã khám phá hết bảo tàng",
  "celeb.goodbye": "Hẹn gặp lại bạn lần sau nhé!",
  "celeb.restart": "Khám phá lại",

  // ── Warnings (robot-interaction-overlay.tsx) ─
  "warn.person":
    "Có người hoặc vật cản phía trước. Robot đã dừng lại. Robot sẽ tự động tiếp tục khi đường thoáng.",
  "warn.turnL": "Robot đang rẽ trái.",
  "warn.turnR": "Robot đang rẽ phải.",
  "warn.personTitle": "Cảnh báo",
  "warn.personBanner":
    "Có người hoặc vật cản phía trước. Robot đã dừng lại và sẽ tự động tiếp tục.",
  "warn.turnLeftToast": "Robot đang rẽ trái",
  "warn.turnRightToast": "Robot đang rẽ phải",

  // ── Status (robot-interaction-overlay.tsx) ─
  "status.resumed": "Robot đã tiếp tục hành trình.",
  "status.autoResumed": "Robot tự động tiếp tục hành trình.",
  "status.resumedToast": "Robot đã tiếp tục hành trình",
  "status.autoResumedToast": "Robot tự động tiếp tục hành trình",

  // ── SOS (robot-interaction-overlay.tsx) ─
  "sos.title": "SOS — Đã gửi tín hiệu khẩn cấp",
  "sos.body": "Robot đã dừng lại và bật đèn báo để mọi người thấy bạn.",
  "sos.resume": "Tiếp tục hành trình",
  "sos.resumeA11y": "Tiếp tục hành trình sau khi gọi SOS",
  "sos.spoken": "Đã kích hoạt SOS. Robot đã dừng lại để đảm bảo an toàn.",
  "sos.resuming": "Hành trình tiếp tục.",
  "sos.holding": "Đang giữ…",
  "sos.fabA11y": "Nút SOS. Giữ hai giây để gọi khẩn cấp.",

  // ── Map node / section (map-node.tsx, section-banner.tsx) ─
  "mapNode.completed": "đã hoàn thành",
  "mapNode.current": "đang mở",
  "mapNode.locked": "đã khoá",

  // ── Voice assistant (use-voice-assistant.ts) ─
  "va.recordFailed": "(ghi âm thất bại)",
  "va.recordedVoice": "(đã ghi âm giọng nói)",
  "va.unheard": "(không nghe rõ)",
  "va.speechFailed": "(không thể nhận dạng giọng nói)",
  "va.cantHear": "Mình không nghe rõ bạn nói gì. Bạn thử nói lại nhé!",
  "va.serverDown":
    "Mình không kết nối được máy chủ. Bạn kiểm tra lại mạng hoặc thử lại nhé!",
  "va.errorGeneric": "Xin lỗi, mình gặp sự cố. Bạn thử lại nhé!",

  // ── Context builder (contextBuilder.ts) ─
  "ctx.museumName": "Bảo tàng Lịch sử Quốc gia",
  "ctx.museumDesc":
    "Bảo tàng lịch sử Việt Nam, nơi lưu giữ những di sản và câu chuyện của đất nước.",
  "ctx.museumFact":
    "Mỗi hiện vật đều mang một câu chuyện riêng về lịch sử và văn hóa Việt Nam.",
  "ctx.nodeDescFallback":
    "Hiện vật thuộc {section}, thứ tự {order} trong chuyến tham quan.",
  "ctx.nodeFactFallback":
    "Đây là một hiện vật đáng chú ý trong hành trình khám phá bảo tàng.",

  // ── LLM errors (llm.ts) ────────────────
  "llm.connErr": "Không thể kết nối đến máy chủ",
  "llm.connectFailed": "Xin lỗi, mình gặp sự cố kết nối. Bạn thử lại nhé!",
  "llm.unknownError": "Lỗi không xác định",
  "llm.networkErrorTemplate":
    "Không thể kết nối đến máy chủ ({msg}). Bạn kiểm tra mạng và thử lại nhé!",
  "llm.hearFailed": "Xin lỗi, mình không nghe rõ. Bạn thử lại nhé!",
} as const;

type TranslationKey = keyof typeof vi;

const en: Record<TranslationKey, string> = {
  // ── Common ─────────────────────────────
  "common.back": "Back",
  "common.confirm": "Confirm",
  "common.cancel": "Cancel",
  "common.retry": "Retry",
  "common.connected": "Robot connected",
  "common.disconnected": "Not connected",
  "common.scanning": "Scanning...",
  "common.connecting": "Connecting...",
  "common.connect": "Connect",
  "common.start": "Start",

  // ── Welcome (index.tsx) ────────────────
  "index.brand": "Buddy Museum",
  "index.greeting": "Hello, I'm",
  "index.greetingName": "Buddy!",
  "index.tagline": "I'll be your companion exploring the museum today!",
  "index.cta": "Get Started",

  // ── Selection / onboarding ─────────────
  "selection.languageLabel": "Choose your language",
  "selection.languageVi": "Tiếng Việt",
  "selection.languageEn": "English",
  "selection.title": "Choose your support mode",
  "selection.mode.vision": "Visually impaired",
  "selection.mode.hearing": "Hearing impaired",
  "selection.mode.speech": "Speech impaired",

  // ── Museum map (museum-map.tsx) ────────
  "map.title": "Museum Map",
  "map.alertNotConnectedTitle": "Not connected",
  "map.alertNotConnectedBody": "Connect to the robot before starting.",
  "map.alertStartTitle": "Start",
  "map.alertStartBody": "The robot will start following the map route?",
  "map.alertStartConfirm": "Start",
  "map.alertStartSuccess": "Success",
  "map.alertStartSuccessBody": "The robot has started moving!",
  "map.alertResetTitle": "Reset progress",
  "map.alertResetBody": "Are you sure you want to clear all exploration progress?",
  "map.alertResetConfirm": "Confirm",
  "map.sectionLabel": "Section",

  // ── Node video (node/[id].tsx) ─────────
  "node.notFound": "Content not found",
  "node.watched": "You've already seen this content.",
  "node.watchHint": "Watch the video to learn more about this artifact.",
  "node.askBuddy": "Ask Buddy",
  "node.askBuddyA11y": "Open Buddy assistant",
  "node.next": "Continue",
  "node.endTour": "Finish tour",
  "node.backToMap": "Back to map",

  // ── Chat (chat/[nodeId].tsx + components) ─
  "chat.defaultTitle": "Chat with Buddy",
  "chat.serverError": "Cannot connect to the server. Please check your connection!",
  "chat.emptyGreeting":
    "Hi there! I'm Buddy.\nAsk me anything about this artifact!",
  "chat.recordingHint": "Recording... tap again to send",
  "chat.inputPlaceholder": "Type your question...",
  "chat.buddyReading": "Buddy is speaking...",
  "chat.buddyThinking": "Buddy is thinking...",

  // ── Mic button (MicButton.tsx) ─────────
  "mic.listening": "Listening...",
  "mic.recording": "Recording...",
  "mic.thinking": "Buddy is thinking...",
  "mic.speaking": "Buddy is answering...",
  "mic.error": "Error, tap to retry",
  "mic.tapToSpeak": "Tap to speak",

  // ── Celebration ────────────────────────
  "celeb.title": "Congratulations! 🎉",
  "celeb.subtitle": "You've explored the whole museum",
  "celeb.goodbye": "See you again next time!",
  "celeb.restart": "Explore again",

  // ── Warnings (robot-interaction-overlay.tsx) ─
  "warn.person":
    "There is a person or obstacle ahead. The robot has stopped. It will continue automatically when the path is clear.",
  "warn.turnL": "The robot is turning left.",
  "warn.turnR": "The robot is turning right.",
  "warn.personTitle": "Warning",
  "warn.personBanner":
    "There is a person or obstacle ahead. The robot has stopped and will continue automatically.",
  "warn.turnLeftToast": "Robot turning left",
  "warn.turnRightToast": "Robot turning right",

  // ── Status (robot-interaction-overlay.tsx) ─
  "status.resumed": "The robot has resumed the tour.",
  "status.autoResumed": "The robot has automatically resumed the tour.",
  "status.resumedToast": "Robot resumed the tour",
  "status.autoResumedToast": "Robot automatically resumed the tour",

  // ── SOS (robot-interaction-overlay.tsx) ─
  "sos.title": "SOS — Emergency signal sent",
  "sos.body": "The robot has stopped and turned on its light so people can see you.",
  "sos.resume": "Resume tour",
  "sos.resumeA11y": "Resume the tour after SOS",
  "sos.spoken": "SOS activated. The robot has stopped to keep you safe.",
  "sos.resuming": "Resuming the tour.",
  "sos.holding": "Holding…",
  "sos.fabA11y": "SOS button. Hold for two seconds to call for help.",

  // ── Map node / section (map-node.tsx, section-banner.tsx) ─
  "mapNode.completed": "completed",
  "mapNode.current": "open",
  "mapNode.locked": "locked",

  // ── Voice assistant (use-voice-assistant.ts) ─
  "va.recordFailed": "(recording failed)",
  "va.recordedVoice": "(voice recorded)",
  "va.unheard": "(couldn't hear)",
  "va.speechFailed": "(couldn't recognize speech)",
  "va.cantHear": "I couldn't hear you clearly. Please try again!",
  "va.serverDown": "I can't reach the server. Please check your connection and try again!",
  "va.errorGeneric": "Sorry, something went wrong. Please try again!",

  // ── Context builder (contextBuilder.ts) ─
  "ctx.museumName": "Vietnam National Museum of History",
  "ctx.museumDesc":
    "A museum of Vietnamese history, home to the nation's heritage and stories.",
  "ctx.museumFact":
    "Every artifact carries its own story about Vietnam's history and culture.",
  "ctx.nodeDescFallback": "An artifact in {section}, number {order} of the tour.",
  "ctx.nodeFactFallback": "This is a notable artifact on your museum journey.",

  // ── LLM errors (llm.ts) ────────────────
  "llm.connErr": "Cannot connect to server",
  "llm.connectFailed": "Sorry, I'm having connection trouble. Please try again!",
  "llm.unknownError": "Unknown error",
  "llm.networkErrorTemplate":
    "Cannot connect to the server ({msg}). Please check your connection and try again!",
  "llm.hearFailed": "Sorry, I couldn't hear you. Please try again!",
};

export const STRINGS: Record<Language, Record<TranslationKey, string>> = { vi, en };

export function getLanguage(): Language {
  return useLanguageStore.getState().language;
}

type TranslateOptions = Record<string, string | number>;

function interpolate(text: string, options?: TranslateOptions): string {
  if (!options) return text;
  return Object.entries(options).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, String(value)),
    text,
  );
}

export function t(key: TranslationKey, options?: TranslateOptions, language?: Language): string {
  const lang = language ?? getLanguage();
  const text = STRINGS[lang][key] ?? STRINGS.vi[key] ?? key;
  return interpolate(text, options);
}

export function useT() {
  const language = useLanguageStore((s) => s.language);
  return useCallback(
    (key: TranslationKey, options?: TranslateOptions) => t(key, options, language),
    [language],
  );
}

export function pickViEn(viText: string, enText?: string | null, language?: Language): string {
  const lang = language ?? getLanguage();
  if (lang === "en" && enText && enText.trim()) {
    return enText;
  }
  return viText;
}
