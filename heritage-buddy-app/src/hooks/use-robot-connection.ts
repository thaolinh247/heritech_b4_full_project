import { useEffect, useCallback, useRef } from "react";
import { Alert, Vibration } from "react-native";
import { useRouter } from "expo-router";
import { useRobotStore } from "@/store/robot";
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
  const lastSwitchPressRef = useRef(0);

  // Connect to robot
  const connect = useCallback(async () => {
    if (bleIsConnected()) {
      console.log("[useRobotConnection] Already connected");
      return;
    }

    setConnectionStatus("scanning");
    const success = await bleConnect();

    if (success) {
      setConnectionStatus("connected");
      setConnected(true);
      setCurrentDevice("HeritageBuddy");
    } else {
      setConnectionStatus("disconnected");
      setConnected(false);
      setCurrentDevice(null);
    }
  }, [setConnectionStatus, setConnected, setCurrentDevice]);

  // Disconnect from robot
  const disconnect = useCallback(async () => {
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
          {
            const now = Date.now();
            if (now - lastSwitchPressRef.current < 500) {
              console.log("[useRobotConnection] Switch press debounced");
              break;
            }
            lastSwitchPressRef.current = now;
            console.log("[useRobotConnection] Switch pressed");
            if (onSwitchPressRef.current) {
              onSwitchPressRef.current();
            }
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
          if (command.startsWith("NODE_START:")) {
            const nodeParam = command.split(":")[1];
            setCurrentStop(parseInt(nodeParam, 10) || 0);

            // Auto-navigate to node screen (robot has arrived at a stop)
            const nodeIndex = parseInt(nodeParam, 10);
            if (!isNaN(nodeIndex) && MUSEUM_NODES[nodeIndex]) {
              router.replace(`/node/${MUSEUM_NODES[nodeIndex].id}`);
            } else {
              // Fallback: try direct node ID lookup
              const node = MUSEUM_NODES.find((n) => n.id === nodeParam);
              if (node) {
                router.replace(`/node/${node.id}`);
              }
            }
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

  // Auto-reconnect on mount & listen for unexpected disconnection
  useEffect(() => {
    if (connectionStatus === "disconnected") {
      connect();
    }

    const unsubDisconnect = bleOnDisconnect(() => {
      setConnectionStatus("disconnected");
      setConnected(false);
    });

    return () => {
      unsubDisconnect();
      if (bleIsConnected()) {
        bleDisconnect();
      }
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
