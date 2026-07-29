import { create } from "zustand";
import type { ChatMessage, VoiceAssistantState } from "@/types/voice-assistant";

interface VoiceAssistantStore {
  state: VoiceAssistantState;
  messages: ChatMessage[];
  currentNodeId: string | null;

  addMessage: (msg: ChatMessage) => void;
  markSpeakingDone: (msgId: string) => void;
  setState: (state: VoiceAssistantState) => void;
  setCurrentNode: (nodeId: string) => void;
  clearChat: () => void;
}

export const useVoiceAssistantStore = create<VoiceAssistantStore>((set) => ({
  state: "idle",
  messages: [],
  currentNodeId: null,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  markSpeakingDone: (msgId) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === msgId ? { ...m, isSpeaking: false } : m,
      ),
    })),
  setState: (state) => set({ state }),
  setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),
  clearChat: () => set({ messages: [], state: "idle", currentNodeId: null }),
}));
