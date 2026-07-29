import { create } from "zustand";
import type { AccessibilityMode } from "@/types/accessibility";

interface AccessibilityState {
  selectedMode: AccessibilityMode | null;
  setMode: (mode: AccessibilityMode) => void;
  clearMode: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>((set) => ({
  selectedMode: null,
  setMode: (mode) => set({ selectedMode: mode }),
  clearMode: () => set({ selectedMode: null }),
}));
