import * as Speech from "expo-speech";
import { useCallback, useRef, useState, useEffect } from "react";

interface SpeakOptions {
  text: string;
  language?: string;
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: (error: string) => void;
}

export function speak({
  text,
  language = "vi-VN",
  rate = 0.85,
  pitch = 1.0,
  onDone,
  onError,
}: SpeakOptions) {
  Speech.speak(text, {
    language,
    rate,
    pitch,
    onDone: () => onDone?.(),
    onError: (err) => onError?.(String(err)),
  });
}

export async function stopSpeaking() {
  await Speech.stop();
}

export async function isCurrentlySpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const onDoneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const play = useCallback(
    (text: string, options?: { rate?: number; pitch?: number; onDone?: () => void }) => {
      setSpeaking(true);
      onDoneRef.current = options?.onDone ?? null;

      Speech.speak(text, {
        language: "vi-VN",
        rate: options?.rate ?? 0.85,
        pitch: options?.pitch ?? 1.0,
        onDone: () => {
          setSpeaking(false);
          onDoneRef.current?.();
        },
        onError: () => {
          setSpeaking(false);
        },
      });
    },
    [],
  );

  const stop = useCallback(async () => {
    await Speech.stop();
    setSpeaking(false);
  }, []);

  return { speaking, play, stop };
}
