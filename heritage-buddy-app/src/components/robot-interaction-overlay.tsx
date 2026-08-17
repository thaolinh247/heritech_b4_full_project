import { useCallback, useEffect, useRef, useState } from "react";
import { Vibration } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { Pressable, Text, View } from "@/tw";
import { Image } from "expo-image";
import { images } from "@/constants/images";
import { onMessage, sendCommand } from "@/lib/bluetooth";
import { speak, stopSpeaking } from "@/lib/tts";
import { useRobotStore } from "@/store/robot";
import { getLanguage, useT } from "@/lib/i18n";
import type { WarnType } from "@/types/robot";

// ─── Hằng số thời gian ───────────────────────

// Banner cảnh báo PIR CHỈ biến mất khi robot gửi STATUS:auto_resumed (robot
// đã thực sự chạy tiếp). 60s chỉ là phao cứu sinh khi robot mất kết nối hẳn
// (không có robot nào gửi auto_resumed) — trước đây 10.5s khiến banner tự tắt
// sớm trong khi robot vẫn đứng yên → khách tưởng robot đi nhưng không.
const WARN_PERSON_DISMISS_MS = 60000;
const WARN_TURN_TOAST_MS = 3500;      // Toast thông báo rẽ
const STATUS_TOAST_MS = 2600;         // Toast xác nhận trạng thái robot
const SOS_HOLD_MS = 2000;             // Giữ ≥2s để kích hoạt SOS

// ─── Component ───────────────────────────────

export function RobotInteractionOverlay() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const t = useT();

  const activeWarn = useRobotStore((s) => s.activeWarn);
  const robotStatus = useRobotStore((s) => s.robotStatus);
  const sosActive = useRobotStore((s) => s.sosActive);
  const setActiveWarn = useRobotStore((s) => s.setActiveWarn);
  const setRobotStatus = useRobotStore((s) => s.setRobotStatus);
  const setSosActive = useRobotStore((s) => s.setSosActive);

  const sosHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const personDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isHoldingSos, setIsHoldingSos] = useState(false);

  function clearTimers() {
    [
      sosHoldTimer,
      personDismissTimer,
      turnDismissTimer,
      statusTimer,
    ].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  }

  const clearWarn = useCallback(() => {
    setActiveWarn(null);
    if (personDismissTimer.current) {
      clearTimeout(personDismissTimer.current);
      personDismissTimer.current = null;
    }
    if (turnDismissTimer.current) {
      clearTimeout(turnDismissTimer.current);
      turnDismissTimer.current = null;
    }
  }, [setActiveWarn]);

  // ─── Xử lý tín hiệu robot ──────────────────

  const handleWarn = useCallback(
    (type: WarnType) => {
      clearWarn();
      setActiveWarn(type);

      if (type === "person") {
        Vibration.vibrate();
        speak({ text: t("warn.person"), language: getLanguage() });
        // Fallback: nếu robot mất kết nối giữa vòng chờ, tự tắt banner sau ~10s
        personDismissTimer.current = setTimeout(() => {
          setActiveWarn(null);
          personDismissTimer.current = null;
        }, WARN_PERSON_DISMISS_MS);
      } else if (type === "turn_l" || type === "turn_r") {
        speak({
          text: type === "turn_l" ? t("warn.turnL") : t("warn.turnR"),
          language: getLanguage(),
        });
        turnDismissTimer.current = setTimeout(() => {
          setActiveWarn(null);
          turnDismissTimer.current = null;
        }, WARN_TURN_TOAST_MS);
      }
    },
    [clearWarn, setActiveWarn, t],
  );

  const handleStatus = useCallback(
    (s: string) => {
      if (statusTimer.current) clearTimeout(statusTimer.current);

      if (s === "resumed" || s === "auto_resumed") {
        clearWarn();
        setSosActive(false);
        setRobotStatus(s);
        speak({
          text:
            s === "resumed"
              ? t("status.resumed")
              : t("status.autoResumed"),
          language: getLanguage(),
        });
      } else if (s === "sos") {
        Vibration.vibrate();
        setSosActive(true);
        setRobotStatus("sos");
        speak({ text: t("sos.spoken"), language: getLanguage() });
      } else {
        setRobotStatus("unknown");
      }

      statusTimer.current = setTimeout(() => {
        setRobotStatus(null);
        statusTimer.current = null;
      }, STATUS_TOAST_MS);
    },
    [clearWarn, setRobotStatus, setSosActive, t],
  );

  // Lắng nghe tín hiệu WARN/STATUS từ robot (chạy trên mọi màn hình)
  useEffect(() => {
    const unsubscribe = onMessage((msg: string) => {
      const trimmed = msg.trim();
      if (trimmed.startsWith("WARN:")) {
        handleWarn(trimmed.slice(5) as WarnType);
      } else if (trimmed.startsWith("STATUS:")) {
        handleStatus(trimmed.slice(7).toLowerCase());
      }
    });

    return () => {
      unsubscribe();
      clearTimers();
      stopSpeaking();
    };
  }, [handleWarn, handleStatus]);

  // ─── Hành động người dùng ──────────────────

  function startSosHold() {
    setIsHoldingSos(true);
    sosHoldTimer.current = setTimeout(() => {
      setIsHoldingSos(false);
      sosHoldTimer.current = null;
      // Phản hồi NGAY lập tức trên app (banner SOS + rung + giọng nói) — không
      // chờ robot xác nhận STATUS:sos. Nếu BLE bị ngắt thì khách vẫn thấy thông
      // báo, robot vẫn sẽ xử lý khi có kết nối trở lại (sendCommand bên dưới).
      setSosActive(true);
      setRobotStatus("sos");
      Vibration.vibrate();
      speak({ text: t("sos.spoken"), language: getLanguage() });
      sendCommand("SOS");
    }, SOS_HOLD_MS);
  }

  function cancelSosHold() {
    setIsHoldingSos(false);
    if (sosHoldTimer.current) {
      clearTimeout(sosHoldTimer.current);
      sosHoldTimer.current = null;
    }
  }

  async function resumeAfterSos() {
    await stopSpeaking();
    setSosActive(false);
    setRobotStatus(null);
    await sendCommand("RESUME");
    speak({ text: t("sos.resuming"), language: getLanguage() });
  }

  const showPersonBanner = activeWarn === "person" && !sosActive;
  const showTurnToast =
    (activeWarn === "turn_l" || activeWarn === "turn_r") && !sosActive;

  // Ẩn nút SOS nổi trên màn hình onboarding (chưa có robot) và màn hình chat
  // (tránh đè lên ô nhập câu hỏi / nút mic — SOS và Hỏi Buddy không lẫn nhau).
  const showSosFab =
    !sosActive &&
    !showPersonBanner &&
    pathname !== "/" &&
    pathname !== "/selection" &&
    !pathname.startsWith("/chat/");

  const statusToastText =
    robotStatus === "resumed" || robotStatus === "auto_resumed"
      ? robotStatus === "resumed"
        ? t("status.resumedToast")
        : t("status.autoResumedToast")
      : null;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      {/* ── Banner SOS (trang trọng nhất) ── */}
      {sosActive && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.72)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            className="w-full rounded-3xl p-6 items-center"
            style={{ backgroundColor: "#FDF3E7" }}
          >
            <Image
              source={images.mascotConfused}
              style={{ width: 128, height: 128 }}
              contentFit="contain"
            />
            <Text
              className="text-3xl mt-4 text-center"
              style={{ fontFamily: "Helvetica-Bold", color: "#E85D4E" }}
            >
              {t("sos.title")}
            </Text>
            <Text
              className="text-xl mt-2 text-center leading-relaxed"
              style={{ fontFamily: "Helvetica-Regular", color: "#5C3A21" }}
            >
              {t("sos.body")}
            </Text>
            <Pressable
              onPress={resumeAfterSos}
              className="w-full py-4 mt-6 rounded-2xl items-center"
              style={{
                backgroundColor: "#2E8B7E",
                minHeight: 56,
                justifyContent: "center",
              }}
              accessibilityRole="button"
              accessibilityLabel={t("sos.resumeA11y")}
            >
              <Text
                className="text-white text-lg text-center"
                style={{ fontFamily: "Helvetica-Bold" }}
              >
                {t("sos.resume")}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Banner cảnh báo người/vật cản (WARN:person) ── */}
      {showPersonBanner && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            className="w-full rounded-3xl p-6"
            style={{ backgroundColor: "#FDF3E7" }}
          >
            <View className="flex-row items-center mb-4">
              <Image
                source={images.mascotDefault}
                style={{ width: 96, height: 96 }}
                contentFit="contain"
              />
              <View className="flex-1 ml-4">
                <Text
                  className="text-2xl"
                  style={{ fontFamily: "Helvetica-Bold", color: "#E85D4E" }}
                >
                  {t("warn.personTitle")}
                </Text>
                <Text
                  className="text-lg leading-relaxed"
                  style={{ fontFamily: "Helvetica-Regular", color: "#5C3A21" }}
                >
                  {t("warn.personBanner")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Toast thông báo rẽ (WARN:turn_*) ── */}
      {showTurnToast && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 16,
            left: 24,
            right: 24,
            alignItems: "center",
          }}
          pointerEvents="none"
        >
          <View
            className="px-6 py-3 rounded-2xl"
            style={{
              backgroundColor: "#2E8B7E",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text
              className="text-lg text-center"
              style={{ fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}
            >
              {activeWarn === "turn_l" ? t("warn.turnLeftToast") : t("warn.turnRightToast")}
            </Text>
          </View>
        </View>
      )}

      {/* ── Toast xác nhận trạng thái (STATUS) ── */}
      {statusToastText && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 16,
            left: 24,
            right: 24,
            alignItems: "center",
          }}
          pointerEvents="none"
        >
          <View
            className="px-6 py-3 rounded-2xl"
            style={{
              backgroundColor: "#5C3A21",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text
              className="text-lg text-center"
              style={{ fontFamily: "Helvetica-Bold", color: "#FFFFFF" }}
            >
              {statusToastText}
            </Text>
          </View>
        </View>
      )}

      {/* ── Nút SOS cố định (giữ ≥2s) ── */}
      {showSosFab && (
        <Pressable
          onPressIn={startSosHold}
          onPressOut={cancelSosHold}
          style={{
            position: "absolute",
            right: 20,
            bottom: insets.bottom + 24,
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: isHoldingSos ? "#C94A3C" : "#E85D4E",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#E85D4E",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 6,
            borderWidth: 3,
            borderColor: "#FFFFFF",
          }}
          accessibilityRole="button"
          accessibilityLabel={t("sos.fabA11y")}
        >
          <Text
            className="text-white text-lg"
            style={{ fontFamily: "Helvetica-Bold" }}
          >
            {isHoldingSos ? t("sos.holding") : "SOS"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}