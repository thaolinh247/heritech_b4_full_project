import { create } from "zustand";
import type {
  GestureType,
  BLEConnectionStatus,
} from "@/types/robot";

interface RobotStore {
  // BLE connection
  connectionStatus: BLEConnectionStatus;
  currentBLEDevice: string | null;
  isConnected: boolean;

  // Robot state
  currentStop: number;
  isMoving: boolean;
  pirDetected: boolean;

  // Gesture
  lastGesture: GestureType;

  // Message queue
  robotMessageQueue: string[];
  robotMessage: string | null;

  // Actions
  setConnectionStatus: (status: BLEConnectionStatus) => void;
  setCurrentDevice: (device: string | null) => void;
  setConnected: (connected: boolean) => void;
  setCurrentStop: (stop: number) => void;
  setIsMoving: (moving: boolean) => void;
  setPirDetected: (detected: boolean) => void;
  setGesture: (gesture: GestureType) => void;
  addRobotMessage: (msg: string) => void;
  clearRobotMessage: () => void;
  clearMessages: () => void;
}

export const useRobotStore = create<RobotStore>((set) => ({
  // BLE connection
  connectionStatus: "disconnected",
  currentBLEDevice: null,
  isConnected: false,

  // Robot state
  currentStop: 0,
  isMoving: false,
  pirDetected: false,

  // Gesture
  lastGesture: null,

  // Message queue
  robotMessageQueue: [],
  robotMessage: null,

  // Actions
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setCurrentDevice: (currentBLEDevice) => set({ currentBLEDevice }),
  setConnected: (isConnected) => set({ isConnected }),
  setCurrentStop: (currentStop) => set({ currentStop }),
  setIsMoving: (isMoving) => set({ isMoving }),
  setPirDetected: (pirDetected) => set({ pirDetected }),
  setGesture: (lastGesture) => set({ lastGesture }),
  addRobotMessage: (msg) =>
    set((s) => ({
      robotMessageQueue: [...s.robotMessageQueue, msg],
      robotMessage: msg,
    })),
  clearRobotMessage: () => set({ robotMessage: null }),
  clearMessages: () => set({ robotMessageQueue: [], robotMessage: null }),
}));
