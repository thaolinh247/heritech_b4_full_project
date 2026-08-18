import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { View, Text, Pressable, ScrollView } from "@/tw";
import { MapNode } from "@/components/map/map-node";
import { MapPath } from "@/components/map/map-path";
import { useMapProgress } from "@/hooks/use-map-progress";
import { useRobotConnection } from "@/hooks/use-robot-connection";
import { getMaxNodeY } from "@/data/museum-map";
import { images } from "@/constants/images";
import { useT } from "@/lib/i18n";
import type { MapNode as MapNodeType } from "@/types/museum-map";

const NODE_SIZE = 56;
const EXTRA_PADDING = 80;
const MAP_Y_SPACING = 10;

export default function MuseumMapScreen() {
  const router = useRouter();
  const {
    nodes,
    totalCompleted,
    totalNodes,
    getNodeStatus,
    resetProgress,
    loaded,
  } = useMapProgress();

  const {
    isConnected,
    connectionStatus,
    connect,
    sendCommand,
  } = useRobotConnection();

  const [containerWidth, setContainerWidth] = useState(0);
  const t = useT();

  const maxY = getMaxNodeY();
  const mapHeight = maxY * MAP_Y_SPACING + NODE_SIZE + EXTRA_PADDING;

  const handleNodePress = useCallback(
    (node: MapNodeType) => {
      const status = getNodeStatus(node);
      if (status === "current" || status === "completed") {
        router.push(`/node/${node.id}`);
      }
    },
    [getNodeStatus, router],
  );

  const handleStart = useCallback(() => {
    if (!isConnected) {
      Alert.alert(
        t("map.alertNotConnectedTitle"),
        t("map.alertNotConnectedBody"),
        [
          { text: t("common.retry"), onPress: () => connect() },
          { text: t("common.cancel"), style: "cancel" },
        ],
      );
      return;
    }

    Alert.alert(t("map.alertStartTitle"), t("map.alertStartBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("map.alertStartConfirm"),
        onPress: () => {
          sendCommand("START");
          Alert.alert(t("map.alertStartSuccess"), t("map.alertStartSuccessBody"));
        },
      },
    ]);
  }, [isConnected, connect, sendCommand, t]);

  const handleReset = useCallback(() => {
    Alert.alert(
      t("map.alertResetTitle"),
      t("map.alertResetBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("map.alertResetConfirm"),
          style: "destructive",
          onPress: async () => {
            await resetProgress();
          },
        },
      ],
    );
  }, [resetProgress, t]);

  if (!loaded) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF3E7" }}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between" style={{ zIndex: 30 }}>
        <Pressable
          onPress={() => router.back()}
          className="w-12 h-12 items-center justify-center rounded-full bg-white"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text className="text-xl" style={{ fontFamily: "Helvetica-Bold" }}>←</Text>
        </Pressable>

        <Text
          className="text-lg text-center flex-1"
          style={{ fontFamily: "Helvetica-Bold", color: "#5C3A21" }}
        >
          {t("map.title")}
        </Text>

        <View
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: totalCompleted === totalNodes ? "#2E8B7E" : "#E8935E" }}
        >
          <Text
            className="text-white text-sm"
            style={{ fontFamily: "Helvetica-Bold" }}
          >
            {totalCompleted}/{totalNodes}
          </Text>
        </View>
      </View>

      {/* Scrollable Map */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) setContainerWidth(w);
          }}
          style={{
            width: "100%",
            height: mapHeight,
            position: "relative",
          }}
        >
          <Image
            source={images.mapImage}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: mapHeight,
              zIndex: 0,
            }}
            contentFit="cover"
          />

          {containerWidth > 0 && (
            <MapPath
              nodes={nodes}
              containerWidth={containerWidth}
              containerHeight={mapHeight}
            />
          )}

          {containerWidth > 0 &&
            nodes.map((node) => (
              <MapNode
                key={node.id}
                node={node}
                status={getNodeStatus(node)}
                containerWidth={containerWidth}
                onPress={handleNodePress}
              />
            ))}
        </View>
      </ScrollView>

      {/* Bottom Panel */}
      <View
        className="px-5 pb-5 pt-3"
        style={{
          backgroundColor: "#FDF3E7",
          borderTopWidth: 1,
          borderTopColor: "#E2D2C1",
          paddingRight: 112,
        }}
      >
        {/* BLE Connection Status */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{
                backgroundColor: isConnected ? "#2E8B7E" : "#E85D4E",
              }}
            />
            <Text
              className="text-sm"
              style={{
                fontFamily: "Helvetica-Bold",
                color: isConnected ? "#2E8B7E" : "#E85D4E",
              }}
            >
              {connectionStatus === "connected"
                ? t("common.connected")
                : connectionStatus === "scanning"
                  ? t("common.scanning")
                  : connectionStatus === "connecting"
                    ? t("common.connecting")
                    : t("common.disconnected")}
            </Text>
          </View>

          {!isConnected && connectionStatus !== "scanning" && (
            <Pressable
              onPress={connect}
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: "#E8935E" }}
            >
              <Text
                className="text-white text-xs"
                style={{ fontFamily: "Helvetica-Bold" }}
              >
                {t("common.connect")}
              </Text>
            </Pressable>
          )}

          {connectionStatus === "scanning" && (
            <ActivityIndicator size="small" color="#E8935E" />
          )}
        </View>

        {/* Start Button */}
        <Pressable
          onPress={handleStart}
          className="w-full py-4 rounded-2xl items-center justify-center active:opacity-80"
          style={{
            backgroundColor: isConnected ? "#2E8B7E" : "#D4C5B6",
          }}
        >
          <Text
            className="text-lg text-white"
            style={{ fontFamily: "Helvetica-Bold" }}
          >
            {isConnected ? t("common.start") : t("common.disconnected")}
          </Text>
        </Pressable>
      </View>

      {/* Reset FAB */}
      <Pressable
        testID="gesture-entry-button"
        onPress={() => router.push("/gesture-recognition")}
        className="absolute right-4 w-16 h-16 rounded-full items-center justify-center"
        style={{
          bottom: 190,
          backgroundColor: "#2E8B7E",
          zIndex: 50,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 6,
        }}
        accessibilityRole="button"
        accessibilityLabel="Mở nhận diện ký hiệu tay"
      >
        <Text style={{ fontSize: 28 }}>🤟</Text>
      </Pressable>

      <Pressable
        onPress={handleReset}
        className="absolute left-4 w-12 h-12 rounded-full items-center justify-center"
        style={{
          bottom: 190,
          backgroundColor: "#E85D4E",
          zIndex: 50,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Text className="text-white text-lg">↺</Text>
      </Pressable>

      {/* Settings FAB */}
      <Pressable
        onPress={() => router.push("/settings")}
        className="absolute left-4 w-12 h-12 rounded-full items-center justify-center"
        style={{
          bottom: 130,
          backgroundColor: "#5C3A21",
          zIndex: 50,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 5,
        }}
        accessibilityRole="button"
        accessibilityLabel={t("settings.title")}
      >
        <Text className="text-white text-lg">⚙</Text>
      </Pressable>
    </SafeAreaView>
  );
}
