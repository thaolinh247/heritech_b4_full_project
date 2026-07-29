import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "heritage-buddy:map-progress";

interface MapProgressState {
  completedNodeIds: string[];
  loaded: boolean;
  loadProgress: () => Promise<void>;
  addCompletedNode: (id: string) => Promise<void>;
  resetProgress: () => Promise<void>;
}

export const useMapProgressStore = create<MapProgressState>((set, get) => ({
  completedNodeIds: [],
  loaded: false,

  loadProgress: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({ completedNodeIds: parsed.completedNodeIds ?? [], loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  addCompletedNode: async (id: string) => {
    const { completedNodeIds } = get();
    if (completedNodeIds.includes(id)) return;
    const updated = [...completedNodeIds, id];
    set({ completedNodeIds: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ completedNodeIds: updated }));
  },

  resetProgress: async () => {
    set({ completedNodeIds: [] });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ completedNodeIds: [] }));
  },
}));
