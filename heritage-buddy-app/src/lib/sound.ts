import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import recordBeep from "@/assets/sounds/record-beep.wav";

let recordBeepPlayer: AudioPlayer | null = null;

// Tiếng "bíp bíp" báo cho người xung quanh biết điện thoại đang bắt đầu ghi âm.
// Tạo player lười (lazy) để không tạo native object khi module vừa import.
export function playRecordBeep() {
  try {
    if (!recordBeepPlayer) {
      recordBeepPlayer = createAudioPlayer(recordBeep);
    }
    if (recordBeepPlayer.isLoaded) {
      recordBeepPlayer.seekTo(0).catch(() => {});
    }
    recordBeepPlayer.play();
  } catch {
    // Beep chỉ là tín hiệu phụ trợ — không được làm hỏng luồng ghi âm.
  }
}
