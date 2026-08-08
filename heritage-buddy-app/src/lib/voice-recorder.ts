import { useCallback, useRef, useState, useEffect } from "react";
import { Platform } from "react-native";
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  IOSOutputFormat,
  AudioQuality,
  type RecordingOptions,
} from "expo-audio";
import { File } from "expo-file-system";

export type RecorderState = "idle" | "recording" | "processing" | "error";

const MAX_RECORDING_MS = 10000;
const SILENCE_THRESHOLD_DB = -45;
const SILENCE_TIMEOUT_MS = 3000;
const METERING_POLL_MS = 400;

// LOW_QUALITY preset ghi .3gp (AMR-NB) trên Android — định dạng mà Gemini không đọc được.
// Dùng AAC ADTS + nguồn voice_recognition để bắt rõ giọng và tương thích `audio/aac`.
const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  extension: Platform.OS === "ios" ? ".m4a" : ".aac",
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  android: {
    extension: ".aac",
    outputFormat: "aac_adts",
    audioEncoder: "aac",
    audioSource: "voice_recognition",
    sampleRate: 44100,
  },
  ios: {
    extension: ".m4a",
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    sampleRate: 44100,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 64000,
  },
};

// MIME type đúng với file ghi ra để gửi lên backend/Gemini.
export function getRecordingMimeType(): string {
  if (Platform.OS === "ios") return "audio/m4a";
  if (Platform.OS === "web") return "audio/webm";
  return "audio/aac";
}

export function useVoiceRecorder(onAutoStop?: () => void) {
  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef(false);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (meteringIntervalRef.current) clearInterval(meteringIntervalRef.current);
    autoStopTimerRef.current = null;
    silenceTimerRef.current = null;
    meteringIntervalRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
      if (recordingRef.current) {
        recordingRef.current = false;
        try {
          recorder.stop();
        } catch {
          // Recorder already released — safe to ignore
        }
      }
    };
  }, [recorder, clearAllTimers]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError("mic_denied");
        return false;
      }
      setState("recording");
      setError(null);
      recordingRef.current = true;
      await recorder.prepareToRecordAsync();
      recorder.record();

      clearAllTimers();

      autoStopTimerRef.current = setTimeout(() => {
        if (recordingRef.current) {
          onAutoStop?.();
        }
      }, MAX_RECORDING_MS);

      let heardSpeech = false;
      let lastMeteringAboveThreshold = Date.now();
      meteringIntervalRef.current = setInterval(() => {
        if (!recordingRef.current) return;
        const status = recorder.getStatus();
        const m = status.metering;
        if (typeof m === "number" && m > SILENCE_THRESHOLD_DB) {
          heardSpeech = true;
          lastMeteringAboveThreshold = Date.now();
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (heardSpeech && Date.now() - lastMeteringAboveThreshold > SILENCE_TIMEOUT_MS) {
          if (recordingRef.current) {
            onAutoStop?.();
          }
        }
      }, METERING_POLL_MS);

      return true;
    } catch {
      setState("error");
      setError("prepare_failed");
      recordingRef.current = false;
      clearAllTimers();
      return false;
    }
  }, [recorder, onAutoStop, clearAllTimers]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      clearAllTimers();
      if (!recordingRef.current) {
        setState("idle");
        return null;
      }
      recordingRef.current = false;
      setState("processing");
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setState("error");
        setError("no_audio");
        return null;
      }
      setState("idle");
      return uri;
    } catch {
      setState("error");
      setError("stop_failed");
      return null;
    }
  }, [recorder, clearAllTimers]);

  const readAudioBase64 = useCallback(async (uri: string): Promise<string | null> => {
    try {
      const file = new File(uri);
      const base64 = await file.base64();
      return base64;
    } catch {
      setError("read_failed");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  return {
    state,
    error,
    startRecording,
    stopRecording,
    readAudioBase64,
    reset,
  };
}
