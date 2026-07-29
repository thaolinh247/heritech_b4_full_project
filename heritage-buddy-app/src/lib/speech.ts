import { useState, useCallback, useEffect } from "react";

const VIETNAMESE_CONFIG = {
  lang: "vi-VN",
  continuous: true,
  interimResults: true,
  contextualStrings: ["Hey Buddy", "Buddy", "buddy"],
  iosVoiceProcessingEnabled: true,
  addsPunctuation: true,
} as const;

// Use require() inside try-catch — the standard pattern for optional native modules.
// Metro bundles require() synchronously; if requireNativeModule throws, catch blocks it.
let _module: typeof import("expo-speech-recognition") | null = null;
let _available = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _module = require("expo-speech-recognition");
  _available = true;
} catch {
  _module = null;
  _available = false;
}

const ExpoMod = _module?.ExpoSpeechRecognitionModule;

export const isSpeechAvailable = _available;

export async function requestMicPermission(): Promise<boolean> {
  if (!ExpoMod) return false;
  const result = await ExpoMod.requestPermissionsAsync();
  return result.granted;
}

export function startListening() {
  ExpoMod?.start(VIETNAMESE_CONFIG);
}

export function stopListening() {
  try {
    ExpoMod?.stop();
  } catch {
    // Already stopped
  }
}

export function abortListening() {
  try {
    ExpoMod?.abort();
  } catch {
    // Already stopped
  }
}

export function detectWakeWord(transcript: string): boolean {
  const normalized = transcript.toLowerCase().trim();
  return /hey\s*buddy|buddy|hey\s*buddi/.test(normalized);
}

export function useSpeechRecognition() {
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string | null>(_available ? null : "unavailable");

  useEffect(() => {
    if (!ExpoMod) {
      return;
    }

    const sub1 = ExpoMod.addListener("start", () => {
      setRecognizing(true);
      setError(null);
    });
    const sub2 = ExpoMod.addListener("end", () => {
      setRecognizing(false);
    });
    const sub3 = ExpoMod.addListener("result", (event: { results: { transcript: string }[]; isFinal: boolean }) => {
      const result = event.results[0];
      if (result) {
        setTranscript(result.transcript);
        setIsFinal(event.isFinal);
      }
    });
    const sub4 = ExpoMod.addListener("error", (event: { error: string }) => {
      setError(event.error);
      setRecognizing(false);
    });

    return () => {
      sub1.remove();
      sub2.remove();
      sub3.remove();
      sub4.remove();
    };
  }, []);

  const start = useCallback(async () => {
    if (!_available) {
      setError("unavailable");
      return false;
    }
    const granted = await requestMicPermission();
    if (!granted) {
      setError("mic_denied");
      return false;
    }
    startListening();
    return true;
  }, []);

  const stop = useCallback(() => {
    stopListening();
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setIsFinal(false);
    setError(null);
  }, []);

  return {
    recognizing,
    transcript,
    isFinal,
    error,
    start,
    stop,
    reset,
  };
}
