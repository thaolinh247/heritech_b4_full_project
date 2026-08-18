import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ServerState {
  /** URL tuỳ chỉnh do người dùng nhập trong Settings (persist qua AsyncStorage) */
  customBackendUrl: string | null;
  setCustomBackendUrl: (url: string | null) => void;
}

export const useServerStore = create<ServerState>()(
  persist(
    (set) => ({
      customBackendUrl: null,
      setCustomBackendUrl: (url) => set({ customBackendUrl: url }),
    }),
    {
      name: "heritage-buddy-server",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ customBackendUrl: state.customBackendUrl }),
    },
  ),
);
