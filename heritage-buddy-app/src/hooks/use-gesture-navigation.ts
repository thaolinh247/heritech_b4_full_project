import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useRobotStore } from "@/store/robot";
import { useMapProgress } from "@/hooks/use-map-progress";
import { MUSEUM_NODES } from "@/data/museum-map";
import { sendCommand as bleSend, isConnected as bleIsConnected } from "@/lib/bluetooth";
import { stopListening } from "@/lib/speech";

export function useGestureNavigation(currentNodeId: string | null) {
  const router = useRouter();
  const { lastGesture, setGesture, setGesturePaused } = useRobotStore();
  const { completeNode } = useMapProgress();
  const handledGestureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastGesture || !currentNodeId) return;
    if (handledGestureRef.current === lastGesture) return;

    handledGestureRef.current = lastGesture;
    setGesture(null);

    const current = MUSEUM_NODES.find((n) => n.id === currentNodeId);
    if (!current) return;

    // Vuốt lên = DỪNG: robot đã tự tạm dừng ở firmware (PAUSED) và chờ tín
    // hiệu đi tiếp. Ở đây app chỉ xác nhận trạng thái tạm dừng — KHÔNG đánh
    // dấu node xong, KHÔNG gửi VOICE_NEXT, KHÔNG điều hướng.
    if (lastGesture === "swipe_up") {
      setGesturePaused(true);
      stopListening();
      return;
    }

    completeNode(current.id);
    setGesturePaused(false);
    stopListening();

    // Send VOICE_NEXT to robot via BLE when navigating by gesture
    if (bleIsConnected()) {
      bleSend("VOICE_NEXT");
    }

    // Về bản đồ trước → robot di chuyển, app mở node khi nhận NODE_START
    router.replace("/museum-map");
  }, [lastGesture, currentNodeId, completeNode, setGesture, setGesturePaused, router]);
}
