import { create } from "zustand";
import type {
  GestureType,
  BLEConnectionStatus,
  WarnType,
  RobotStatusType,
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

  // Warning / status / SOS (two-way interaction)
  activeWarn: WarnType | null;
  robotStatus: RobotStatusType | null;
  sosActive: boolean;

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
  setActiveWarn: (warn: WarnType | null) => void;
  setRobotStatus: (status: RobotStatusType | null) => void;
  setSosActive: (active: boolean) => void;
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

  // Warning / status / SOS
  activeWarn: null,
  robotStatus: null,
  sosActive: false,

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
  setActiveWarn: (activeWarn) => set({ activeWarn }),
  setRobotStatus: (robotStatus) => set({ robotStatus }),
  setSosActive: (sosActive) => set({ sosActive }),
  addRobotMessage: (msg) =>
    set((s) => ({
      robotMessageQueue: [...s.robotMessageQueue, msg],
      robotMessage: msg,
    })),
  clearRobotMessage: () => set({ robotMessage: null }),
  clearMessages: () => set({ robotMessageQueue: [], robotMessage: null }),
}));
