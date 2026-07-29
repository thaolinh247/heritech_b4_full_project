import { useCallback, useState, useEffect } from "react";
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
        "Chưa kết nối",
        "Bạn cần kết nối với robot trước khi xuất phát.",
        [
          { text: "Thử lại", onPress: () => connect() },
          { text: "Huỷ", style: "cancel" },
        ],
      );
      return;
    }

    Alert.alert("Xuất phát", "Robot sẽ bắt đầu di chuyển theo bản đồ?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xuất phát",
        onPress: () => {
          sendCommand("START");
          Alert.alert("Thành công", "Robot đã bắt đầu di chuyển!");
        },
      },
    ]);
  }, [isConnected, connect, sendCommand]);

  const handleReset = useCallback(() => {
    Alert.alert(
      "Đặt lại tiến trình",
      "Bạn có chắc muốn xoá toàn bộ tiến trình khám phá?",
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Xác nhận",
          style: "destructive",
          onPress: async () => {
            await resetProgress();
          },
        },
      ],
    );
  }, [resetProgress]);

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
          Bản đồ bảo tàng
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
                ? "Đã kết nối robot"
                : connectionStatus === "scanning"
                  ? "Đang quét..."
                  : connectionStatus === "connecting"
                    ? "Đang kết nối..."
                    : "Chưa kết nối"}
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
                Kết nối
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
            {isConnected ? "Xuất phát" : "Chưa kết nối"}
          </Text>
        </Pressable>
      </View>

      {/* Reset FAB */}
      <Pressable
        onPress={handleReset}
        className="absolute bottom-32 right-4 w-12 h-12 rounded-full items-center justify-center"
        style={{
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
    </SafeAreaView>
  );
}
