import { useLocalSearchParams, useRouter, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, Pressable } from "@/tw";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEventListener } from "expo";
import { MUSEUM_NODES } from "@/data/museum-map";
import { useMapProgress } from "@/hooks/use-map-progress";
import { useGestureNavigation } from "@/hooks/use-gesture-navigation";
import { useRobotConnection } from "@/hooks/use-robot-connection";
import { images } from "@/constants/images";
import { Image } from "expo-image";
import { useCallback, useEffect } from "react";
import { useT, pickViEn } from "@/lib/i18n";

export default function NodeVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const node = MUSEUM_NODES.find((n) => n.id === id);
  const t = useT();

  if (!node) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#FDF3E7",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          source={images.mascotConfused}
          style={{ width: 120, height: 120 }}
          contentFit="contain"
        />
        <Text
          className="text-lg text-[#5C3A21] text-center mt-4 px-8"
          style={{ fontFamily: "Helvetica-Bold" }}
        >
          {t("node.notFound")}
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 px-8 py-3 rounded-2xl"
          style={{ backgroundColor: "#E8935E" }}
        >
          <Text
            className="text-white text-base"
            style={{ fontFamily: "Helvetica-Bold" }}
          >
            {t("common.back")}
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return <NodeVideoContent node={node} />;
}

function NodeVideoContent({ node }: { node: NonNullable<(typeof MUSEUM_NODES)[number]> }) {
  const router = useRouter();
  const pathname = usePathname();
  const { completeNode, getNodeStatus } = useMapProgress();
  const { sendCommand, isConnected, onSwitchPress } = useRobotConnection();
  useGestureNavigation(node.id);
  const t = useT();

  const player = useVideoPlayer(node.videoSource, (player) => {
    player.loop = false;
    player.play();
  });

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay" && !player.playing) {
      player.play();
    }
  });

  const status = getNodeStatus(node);
  const isLastNode = node.order === 13;
  const isAlreadyCompleted = status === "completed";

  // Switch lần 1 → mở "Hỏi Buddy" (phần câu hỏi), bấm lần nữa (trong chat) mới kích hoạt ghi âm.
  // Guard bằng pathname: màn hình node vẫn mounted phía dưới chat (stack push), nên nếu không
  // chặn, bấm switch ở chat sẽ khiến màn hình node mở thêm 1 màn chat trùng (gửi câu hỏi 2 lần).
  useEffect(() => {
    return onSwitchPress(() => {
      if (pathname !== `/node/${node.id}`) return;
      router.push(`/chat/${node.id}`);
    });
  }, [node.id, router, onSwitchPress, pathname]);

  const handleComplete = useCallback(async () => {
    if (isAlreadyCompleted) {
      router.back();
      return;
    }

    // Send NODE_DONE to robot via BLE
    if (isConnected) {
      await sendCommand(`NODE_DONE:${node.order - 1}`);
    }

    await completeNode(node.id);

    if (isLastNode) {
      router.replace("/celebration");
    } else {
      // Về bản đồ trước → robot di chuyển, app mở node khi nhận NODE_START
      router.replace("/museum-map");
    }
  }, [node.id, isAlreadyCompleted, isLastNode, node.order, completeNode, router, sendCommand, isConnected]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF3E7" }}>
      <Pressable
        onPress={() => router.back()}
        className="absolute top-4 left-4 w-12 h-12 items-center justify-center rounded-full z-10"
        style={{
          backgroundColor: "rgba(255,255,255,0.85)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text className="text-xl" style={{ fontFamily: "Helvetica-Bold" }}>←</Text>
      </Pressable>

      <View className="flex-1">
        <VideoView
          player={player}
          style={{ width: "100%", aspectRatio: 16 / 9 }}
          nativeControls
        />

        <View className="flex-1 px-5 pt-5">
          <Text
            className="text-2xl mb-2"
            style={{ fontFamily: "Helvetica-Bold", color: "#5C3A21" }}
          >
            {pickViEn(node.title, node.titleEn)}
          </Text>
          <Text
            className="text-base"
            style={{ fontFamily: "Helvetica-Bold", color: "#7A5233" }}
          >
            {isAlreadyCompleted
              ? t("node.watched")
              : t("node.watchHint")}
          </Text>
        </View>

        <View className="px-5 pb-6" style={{ paddingRight: 112 }}>
          {/* Hỏi Buddy Button */}
          <Pressable
            onPress={() => router.push(`/chat/${node.id}`)}
            className="w-full py-3 mb-3 rounded-2xl active:opacity-80"
            style={{
              backgroundColor: "#E8935E",
              shadowColor: "#E8935E",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
            accessibilityLabel={t("node.askBuddy")}
            accessibilityRole="button"
          >
            <Text
              className="text-white text-base text-center"
              style={{ fontFamily: "Helvetica-Bold" }}
            >
              🎙️ {t("node.askBuddy")}
            </Text>
          </Pressable>

          {/* Đi tiếp Button */}
          <Pressable
            onPress={handleComplete}
            className="w-full py-4 rounded-2xl active:opacity-80"
            style={{
              backgroundColor: isAlreadyCompleted ? "#D4C5B6" : "#2E8B7E",
              shadowColor: isAlreadyCompleted ? "#D4C5B6" : "#2E8B7E",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isAlreadyCompleted ? 0 : 0.3,
              shadowRadius: 8,
              elevation: isAlreadyCompleted ? 0 : 5,
            }}
            accessibilityLabel={t("node.next")}
            accessibilityRole="button"
          >
            <Text
              className="text-white text-lg text-center"
              style={{ fontFamily: "Helvetica-Bold" }}
            >
              {isLastNode
                ? t("node.endTour")
                : isAlreadyCompleted
                  ? t("node.backToMap")
                  : t("node.next")}
            </Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}
