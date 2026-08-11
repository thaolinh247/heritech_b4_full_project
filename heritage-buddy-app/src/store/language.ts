import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Language } from "@/types/language";

interface LanguageState {
  language: Language;
  hydrated: boolean;
  setLanguage: (language: Language) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "vi",
      hydrated: false,
      setLanguage: (language) => set({ language }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "heritage-buddy-language",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
