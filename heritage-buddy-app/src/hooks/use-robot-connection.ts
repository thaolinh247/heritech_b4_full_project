import { useEffect, useCallback, useRef } from "react";
import { Alert, Vibration } from "react-native";
import { useRouter } from "expo-router";
import { useRobotStore } from "@/store/robot";
import { useMapProgressStore } from "@/store/map-progress";
import { MUSEUM_NODES } from "@/data/museum-map";
import {
  scanAndConnect as bleConnect,
  sendCommand as bleSend,
  onMessage,
  onDisconnect as bleOnDisconnect,
  disconnect as bleDisconnect,
  isConnected as bleIsConnected,
} from "@/lib/bluetooth";
import type { RobotToAppCommand } from "@/types/robot";

// ─── Command Parsing ────────────────────────

function parseRobotMessage(msg: string): RobotToAppCommand | null {
  const trimmed = msg.trim();

  if (trimmed.startsWith("NODE_START:")) return trimmed as RobotToAppCommand;
  if (trimmed.startsWith("NODE_COMPLETE:")) return trimmed as RobotToAppCommand;
  if (trimmed.startsWith("WARN:")) return trimmed as RobotToAppCommand;
  if (trimmed.startsWith("STATUS:")) return trimmed as RobotToAppCommand;
  if (trimmed === "ALL_DONE") return "ALL_DONE";
  if (trimmed === "ALARM") return "ALARM";
  if (trimmed === "SWITCH_PRESS") return "SWITCH_PRESS";
  if (trimmed === "VOICE_STOP") return "VOICE_STOP";
  if (trimmed === "GESTURE:SWIPE_UP") return "GESTURE:SWIPE_UP";

  return null;
}

// ─── Hook ───────────────────────────────────

export function useRobotConnection() {
  const router = useRouter();
  const {
    connectionStatus,
    setConnectionStatus,
    setConnected,
    setCurrentDevice,
    setCurrentStop,
    setPirDetected,
    setGesture,
    addRobotMessage,
  } = useRobotStore();

  const onSwitchPressRef = useRef<(() => void) | null>(null);
  const onVoiceStopRef = useRef<(() => void) | null>(null);

  // ─── Auto-reconnect ───────────────────────
  // Khi mất kết nối ngoài ý muốn (robot tắt/bật, sóng yếu...) → tự quét lại tối đa 2 lần.
  // Người dùng chủ động ngắt (disconnect) thì KHÔNG tự kết nối lại.
  const MAX_AUTO_RECONNECT_ATTEMPTS = 2;
  const AUTO_RECONNECT_DELAY_MS = 3000;
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const manualDisconnectRef = useRef(false);
  const connectRef = useRef<() => Promise<void>>(async () => {});

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_AUTO_RECONNECT_ATTEMPTS) {
      console.log("[useRobotConnection] Max auto-reconnect attempts reached");
      return;
    }
    reconnectAttemptsRef.current += 1;
    console.log(
      `[useRobotConnection] Auto-reconnect in ${AUTO_RECONNECT_DELAY_MS / 1000}s (attempt ${reconnectAttemptsRef.current}/${MAX_AUTO_RECONNECT_ATTEMPTS})`,
    );
    reconnectTimerRef.current = setTimeout(() => {
      connectRef.current();
    }, AUTO_RECONNECT_DELAY_MS);
  }, []);

  // Connect to robot
  const connect = useCallback(async () => {
    if (bleIsConnected()) {
      console.log("[useRobotConnection] Already connected");
      reconnectAttemptsRef.current = 0;
      return;
    }

    setConnectionStatus("scanning");
    const success = await bleConnect();

    if (success) {
      reconnectAttemptsRef.current = 0;
      setConnectionStatus("connected");
      setConnected(true);
      setCurrentDevice("HeritageBuddy");
    } else {
      setConnectionStatus("disconnected");
      setConnected(false);
      setCurrentDevice(null);
      scheduleReconnect();
    }
  }, [setConnectionStatus, setConnected, setCurrentDevice, scheduleReconnect]);

  // Sync latest connect into ref (refs must be updated in effects, not during render)
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Disconnect from robot
  const disconnect = useCallback(async () => {
    manualDisconnectRef.current = true;
    await bleDisconnect();
    setConnectionStatus("disconnected");
    setConnected(false);
    setCurrentDevice(null);
  }, [setConnectionStatus, setConnected, setCurrentDevice]);

  // Send command to robot
  const sendCommand = useCallback(
    async (cmd: string) => {
      await bleSend(cmd);
    },
    []
  );

  // Register switch press callbacks (returns cleanup)
  const onSwitchPress = useCallback((callback: (() => void) | null) => {
    onSwitchPressRef.current = callback;
    return () => {
      onSwitchPressRef.current = null;
    };
  }, []);

  // Register voice stop callback
  const onVoiceStop = useCallback((callback: () => void) => {
    onVoiceStopRef.current = callback;
  }, []);

  // Listen for robot messages
  useEffect(() => {
    const unsubscribe = onMessage((msg: string) => {
      const command = parseRobotMessage(msg);
      if (!command) {
        console.warn("[useRobotConnection] Unknown command:", msg);
        return;
      }

      addRobotMessage(msg);

      // Process command
      switch (command) {
        case "ALL_DONE":
          console.log("[useRobotConnection] All nodes completed");
          router.replace("/celebration");
          break;

        case "ALARM":
          console.log("[useRobotConnection] PIR alarm");
          setPirDetected(true);
          Vibration.vibrate();
          Alert.alert("Cảnh báo", "Phát hiện người đi qua!", [
            { text: "OK" },
          ]);
          setTimeout(() => setPirDetected(false), 2000);
          break;

        case "SWITCH_PRESS":
          console.log("[useRobotConnection] Switch pressed");
          if (onSwitchPressRef.current) {
            onSwitchPressRef.current();
          }
          break;

        case "VOICE_STOP":
          console.log("[useRobotConnection] Voice stop received");
          if (onVoiceStopRef.current) {
            onVoiceStopRef.current();
          }
          break;

        default:
          // NODE_START or NODE_COMPLETE - handled elsewhere
          if (command.startsWith("NODE_COMPLETE:")) {
            const nodeIndex = parseInt(command.split(":")[1], 10);
            if (!isNaN(nodeIndex) && MUSEUM_NODES[nodeIndex]) {
              const nodeId = MUSEUM_NODES[nodeIndex].id;
              const { completedNodeIds, addCompletedNode } = useMapProgressStore.getState();
              if (!completedNodeIds.includes(nodeId)) {
                addCompletedNode(nodeId);
              }
            }
          }

          if (command.startsWith("NODE_START:")) {
            const nodeId = command.split(":")[1];
            setCurrentStop(parseInt(nodeId, 10) || 0);
          }
          if (command === "GESTURE:SWIPE_UP") {
            setGesture("swipe_up");
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [addRobotMessage, setPirDetected, setCurrentStop, setGesture, router]);

  // Auto-connect on mount (only if BLE not already connected at module level)
  // IMPORTANT: cleanup does NOT call bleDisconnect — BLE lifecycle is managed
  // by the singleton in bluetooth.ts, not by component mount/unmount.
  useEffect(() => {
    if (connectionStatus === "disconnected" && !bleIsConnected()) {
      connect();
    }

    const unsubDisconnect = bleOnDisconnect(() => {
      setConnectionStatus("disconnected");
      setConnected(false);
      if (!manualDisconnectRef.current) {
        scheduleReconnect();
      }
      manualDisconnectRef.current = false;
    });

    return () => {
      unsubDisconnect();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      // Do NOT call bleDisconnect() here — would disconnect BLE for all screens
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected: connectionStatus === "connected",
    connectionStatus,
    connect,
    disconnect,
    sendCommand,
    onSwitchPress,
    onVoiceStop,
  };
}
