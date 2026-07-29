import { useEffect, useCallback, useRef } from "react";
import { Alert, Vibration } from "react-native";
import { useRobotStore } from "@/store/robot";
import {
  scanAndConnect as bleConnect,
  sendCommand as bleSend,
  onMessage,
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
  if (trimmed.startsWith("GESTURE:")) return trimmed as RobotToAppCommand;

  return null;
}

// ─── Hook ───────────────────────────────────

export function useRobotConnection() {
  const {
    connectionStatus,
    setConnectionStatus,
    setConnected,
    setCurrentDevice,
    setCurrentStop,
    setIsMoving,
    setPirDetected,
    setGesture,
    addRobotMessage,
  } = useRobotStore();

  const onSwitchPressRef = useRef<(() => void) | null>(null);
  const onVoiceStopRef = useRef<(() => void) | null>(null);

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

  // Register switch press callback
  const onSwitchPress = useCallback((callback: () => void) => {
    onSwitchPressRef.current = callback;
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
          if (command.startsWith("NODE_START:")) {
            const nodeId = command.split(":")[1];
            setCurrentStop(parseInt(nodeId, 10) || 0);
          }
          if (command.startsWith("GESTURE:")) {
            const gesturePart = command.split(":")[1];
            const gestureMap: Record<string, "swipe_right" | "swipe_left" | "swipe_up" | "swipe_down"> = {
              SWIPE_RIGHT: "swipe_right",
              SWIPE_LEFT: "swipe_left",
              SWIPE_UP: "swipe_up",
              SWIPE_DOWN: "swipe_down",
            };
            const gesture = gestureMap[gesturePart];
            if (gesture) {
              setGesture(gesture);
            }
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [addRobotMessage, setPirDetected, setCurrentStop, setGesture]);

  // Auto-reconnect on mount
  useEffect(() => {
    if (connectionStatus === "disconnected") {
      connect();
    }

    return () => {
      // Cleanup on unmount
      if (bleIsConnected()) {
        bleDisconnect();
      }
    };
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
