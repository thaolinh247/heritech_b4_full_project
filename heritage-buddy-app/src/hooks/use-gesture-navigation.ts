import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useRobotStore } from "@/store/robot";
import { useRobotConnection } from "@/hooks/use-robot-connection";
import { useMapProgress } from "@/hooks/use-map-progress";
import { MUSEUM_NODES } from "@/data/museum-map";
import { stopListening } from "@/lib/speech";

export function useGestureNavigation(currentNodeId: string | null) {
  const router = useRouter();
  const { lastGesture, setGesture } = useRobotStore();
  const { sendCommand, isConnected } = useRobotConnection();
  const { completeNode } = useMapProgress();
  const handledGestureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastGesture || !currentNodeId) return;
    if (handledGestureRef.current === lastGesture) return;

    handledGestureRef.current = lastGesture;
    setGesture(null);

    const current = MUSEUM_NODES.find((n) => n.id === currentNodeId);
    if (!current) return;

    const next = MUSEUM_NODES.find((n) => n.order === current.order + 1);

    completeNode(current.id);

    stopListening();

    // Send VOICE_NEXT to robot via BLE when navigating by gesture
    if (isConnected) {
      sendCommand("VOICE_NEXT");
    }

    if (next) {
      router.replace(`/node/${next.id}`);
    }
  }, [lastGesture, currentNodeId, completeNode, setGesture, router, sendCommand, isConnected]);
}
