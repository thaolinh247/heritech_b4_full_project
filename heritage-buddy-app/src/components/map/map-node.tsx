import { Pressable, Text, View } from "@/tw";
import type { MapNode as MapNodeType, NodeStatus } from "@/types/museum-map";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { yToPx } from "@/data/museum-map";

interface MapNodeProps {
  node: MapNodeType;
  status: NodeStatus;
  containerWidth: number;
  onPress: (node: MapNodeType) => void;
}

const NODE_SIZE = 56;
const NODE_HALF = NODE_SIZE / 2;
const LOCK_SIZE = 18;

export function MapNode({ node, status, containerWidth, onPress }: MapNodeProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (status === "current") {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.3, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = 1;
      glow.value = 0;
    }
  }, [status, scale, glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const leftPx = (node.x / 100) * containerWidth - NODE_HALF;
  const topPx = yToPx(node.y) - NODE_HALF;

  const isDisabled = status === "locked";

  const bgColor = status === "completed"
    ? "#2E8B7E"
    : status === "current"
      ? "#E8935E"
      : "#D4C5B6";

  const borderColor = status === "completed"
    ? "#1F6B5F"
    : status === "current"
      ? "#D47A45"
      : "#B8A89A";

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: leftPx,
          top: topPx,
          width: NODE_SIZE,
          height: NODE_SIZE,
          zIndex: status === "current" ? 20 : 10,
        },
        animatedStyle,
      ]}
      accessibilityLabel={`${node.title}, ${
        status === "completed"
          ? "đã hoàn thành"
          : status === "current"
            ? "đang mở"
            : "đã khoá"
      }`}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {status === "current" && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: -8,
              left: -8,
              width: NODE_SIZE + 16,
              height: NODE_SIZE + 16,
              borderRadius: (NODE_SIZE + 16) / 2,
              backgroundColor: "#E8935E",
            },
            glowStyle,
          ]}
        />
      )}

      <Pressable
        onPress={() => {
          if (!isDisabled) onPress(node);
        }}
        disabled={isDisabled}
        style={{
          width: NODE_SIZE,
          height: NODE_SIZE,
          borderRadius: NODE_HALF,
          backgroundColor: bgColor,
          borderWidth: 3,
          borderColor: borderColor,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: status === "current" ? 0.3 : 0.1,
          shadowRadius: status === "current" ? 8 : 4,
          elevation: status === "current" ? 6 : 2,
        }}
      >
        {status === "completed" && (
          <Text style={{ fontSize: 22, color: "#FFFFFF", fontWeight: "bold" }}>✓</Text>
        )}
        {status === "current" && (
          <Text style={{ fontSize: 14, color: "#FFFFFF", fontFamily: "Helvetica-Bold" }}>
            {node.order}
          </Text>
        )}
        {status === "locked" && (
          <View
            style={{
              width: LOCK_SIZE,
              height: LOCK_SIZE,
              borderRadius: 4,
              backgroundColor: "#FFFFFF",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 12, color: "#B8A89A", fontWeight: "bold" }}>🔒</Text>
          </View>
        )}
      </Pressable>

      <View
        style={{
          position: "absolute",
          top: NODE_SIZE + 4,
          left: -42,
          width: NODE_SIZE + 84,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 11,
            color: "#000000",
            fontFamily: "Helvetica-Bold",
            textAlign: "center",
          }}
          numberOfLines={3}
        >
          {node.title}
        </Text>
      </View>
    </Animated.View>
  );
}
