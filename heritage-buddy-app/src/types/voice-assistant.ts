export type VoiceAssistantState =
  | "idle"
  | "listening"
  | "recording"
  | "thinking"
  | "speaking"
  | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "buddy";
  text: string;
  timestamp: number;
  isSpeaking?: boolean;
}
