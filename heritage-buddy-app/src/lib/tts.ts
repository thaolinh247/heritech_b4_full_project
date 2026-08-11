import * as Speech from "expo-speech";
import { useCallback, useRef, useState, useEffect } from "react";
import { getLanguage } from "@/lib/i18n";
import type { Language } from "@/types/language";

const LANGUAGE_TAGS: Record<Language, string> = {
  vi: "vi-VN",
  en: "en-US",
};

let voiceCache: Record<Language, string | undefined> | null = null;
let voiceCachePromise: Promise<Record<Language, string | undefined>> | null = null;

// Lấy danh sách giọng nói khả dụng 1 lần (cache) — chọn giọng khớp ngôn ngữ
// (vi-* / en-*). Nếu không có → trả undefined, speak fallback về language tag.
async function loadVoices(): Promise<Record<Language, string | undefined>> {
  if (voiceCache) return voiceCache;
  if (!voiceCachePromise) {
    voiceCachePromise = (async () => {
      const result: Record<Language, string | undefined> = { vi: undefined, en: undefined };
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        for (const voice of voices) {
          const lang = voice.language ?? "";
          if (!result.vi && lang.toLowerCase().startsWith("vi-")) result.vi = voice.identifier;
          if (!result.en && lang.toLowerCase().startsWith("en-")) result.en = voice.identifier;
        }
      } catch {
        // Voice pack không tải được → bỏ qua, dùng giọng mặc định theo language tag
      }
      voiceCache = result;
      return result;
    })();
  }
  return voiceCachePromise;
}

export async function resolveVoice(language: Language): Promise<string | undefined> {
  const voices = await loadVoices();
  return voices[language];
}

interface SpeakOptions {
  text: string;
  language?: Language;
  rate?: number;
  pitch?: number;
  onDone?: () => void;
  onError?: (error: string) => void;
}

export async function speak({
  text,
  language,
  rate = 0.85,
  pitch = 1.0,
  onDone,
  onError,
}: SpeakOptions) {
  const lang = language ?? getLanguage();
  const tag = LANGUAGE_TAGS[lang];
  let voice: string | undefined;
  try {
    voice = await resolveVoice(lang);
  } catch {
    voice = undefined;
  }
  try {
    Speech.speak(text, {
      ...(voice ? { voice } : { language: tag }),
      rate,
      pitch,
      onDone: () => onDone?.(),
      onError: (err) => onError?.(String(err)),
    });
  } catch (err) {
    onError?.(String(err));
  }
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

      const lang = getLanguage();
      const tag = LANGUAGE_TAGS[lang];
      resolveVoice(lang)
        .then((voice) => {
          try {
            Speech.speak(text, {
              ...(voice ? { voice } : { language: tag }),
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
          } catch {
            setSpeaking(false);
          }
        })
        .catch(() => {
          setSpeaking(false);
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
