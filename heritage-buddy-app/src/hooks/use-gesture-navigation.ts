import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useRobotStore } from "@/store/robot";
import { useMapProgress } from "@/hooks/use-map-progress";
import { MUSEUM_NODES } from "@/data/museum-map";
import { sendCommand as bleSend, isConnected as bleIsConnected } from "@/lib/bluetooth";
import { stopListening } from "@/lib/speech";

export function useGestureNavigation(currentNodeId: string | null) {
  const router = useRouter();
  const { lastGesture, setGesture } = useRobotStore();
  const { completeNode } = useMapProgress();
  const handledGestureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastGesture || !currentNodeId) return;
    if (handledGestureRef.current === lastGesture) return;

    handledGestureRef.current = lastGesture;
    setGesture(null);

    const current = MUSEUM_NODES.find((n) => n.id === currentNodeId);
    if (!current) return;

    completeNode(current.id);

    stopListening();

    // Send VOICE_NEXT to robot via BLE when navigating by gesture
    if (bleIsConnected()) {
      bleSend("VOICE_NEXT");
    }

    // Navigate to museum map — robot auto-moves, app opens node on NODE_START
    router.replace("/museum-map");
  }, [lastGesture, currentNodeId, completeNode, setGesture, router]);
}
