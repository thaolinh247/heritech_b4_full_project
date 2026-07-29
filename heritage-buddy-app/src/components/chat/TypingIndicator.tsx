import { View, Text } from "@/tw";
import { Image } from "expo-image";
import { images } from "@/constants/images";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

export function TypingIndicator() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const animation = (sv: Animated.SharedValue<number>, delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );
    dot1.value = animation(dot1, 0);
    dot2.value = animation(dot2, 200);
    dot3.value = animation(dot3, 400);
  }, [dot1, dot2, dot3]);

  const style1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const style2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const style3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View className="flex-row items-start px-4 mb-3">
      <Image
        source={images.mascotThinking}
        style={{ width: 36, height: 36, marginRight: 8, marginTop: 4 }}
        contentFit="contain"
      />
      <View
        className="px-4 py-3"
        style={{
          backgroundColor: "#FDF3E7",
          borderRadius: 16,
          borderTopLeftRadius: 4,
        }}
      >
        <View className="flex-row items-center">
          <Animated.View
            style={[
              { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E8935E", marginRight: 4 },
              style1,
            ]}
          />
          <Animated.View
            style={[
              { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E8935E", marginRight: 4 },
              style2,
            ]}
          />
          <Animated.View
            style={[
              { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E8935E" },
              style3,
            ]}
          />
        </View>
        <Text
          className="mt-1"
          style={{
            fontFamily: "Helvetica-Italic",
            fontSize: 13,
            color: "#7A5233",
          }}
        >
          Buddy đang suy nghĩ...
        </Text>
      </View>
    </View>
  );
}
