import { Pressable, Text } from "@/tw";
import { Image } from "expo-image";
import { images } from "@/constants/images";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useEffect } from "react";
import type { VoiceAssistantState } from "@/types/voice-assistant";
import type { ImageSourcePropType } from "react-native";

interface MicButtonProps {
  state: VoiceAssistantState;
  onPress: () => void;
}

const BUTTON_SIZE = 64;
const MASCOT_SIZE = 40;

export function MicButton({ state, onPress }: MicButtonProps) {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (state === "listening" || state === "recording") {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [state, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const bgColor =
    state === "listening"
      ? "#E85D4E"
      : state === "recording"
        ? "#E85D4E"
        : state === "thinking"
          ? "rgba(232, 147, 94, 0.5)"
          : state === "speaking"
            ? "#2E8B7E"
            : state === "error"
              ? "#E85D4E"
              : "#E8935E";

  const mascotImage: ImageSourcePropType =
    state === "listening"
      ? images.mascotListening
      : state === "recording"
        ? images.mascotDefault
        : state === "thinking"
          ? images.mascotThinking
          : state === "speaking"
            ? images.mascotHappy
            : state === "error"
              ? images.mascotConfused
              : images.mascotIdle;

  const label =
    state === "listening"
      ? "Đang nghe..."
      : state === "recording"
        ? "Đang ghi âm..."
        : state === "thinking"
          ? "Buddy đang suy nghĩ..."
          : state === "speaking"
            ? "Buddy đang trả lời..."
            : state === "error"
              ? "Lỗi, nhấn để thử lại"
              : "Nhấn để nói";

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        style={{
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: BUTTON_SIZE / 2,
          backgroundColor: bgColor,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: bgColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
          overflow: "hidden",
        }}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Image
          source={mascotImage}
          style={{ width: MASCOT_SIZE, height: MASCOT_SIZE }}
          contentFit="contain"
        />
      </Pressable>
      <Text
        className="text-center mt-2"
        style={{
          fontFamily: "Helvetica-Bold",
          fontSize: 14,
          color: "#5C3A21",
          width: 120,
        }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}
