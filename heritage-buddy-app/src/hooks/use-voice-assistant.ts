import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useVoiceAssistantStore } from "@/store/voice-assistant";
import { useRobotConnection } from "@/hooks/use-robot-connection";
import { useSpeechRecognition, stopListening, startListeningWithWait } from "@/lib/speech";
import { useVoiceRecorder, getRecordingMimeType } from "@/lib/voice-recorder";
import { playRecordBeep } from "@/lib/sound";
import { useTTS } from "@/lib/tts";
import { askBuddy, askBuddyWithAudio, checkServerHealth } from "@/lib/llm";
import { buildArtifactContext } from "@/lib/contextBuilder";
import { useMapProgress } from "@/hooks/use-map-progress";
import { useT } from "@/lib/i18n";
import type { MapNode } from "@/types/museum-map";
import type { ChatMessage } from "@/types/voice-assistant";

export type ServerStatus = "checking" | "connected" | "error";

const NAV_KEYWORDS = [
  "dừng",
  "dừng lại",
  "stop",
  "tiếp",
  "tiếp theo",
  "next",
  "continue",
  "keep going",
  "move on",
  "sang node",
  "chuyển node",
  "next stop",
];

// Chờ TTS/audio nhả nguồn rồi mới mở mic — tránh xung đột audio focus trên Android.
const MIC_RESTART_DELAY_MS = 1000;
// Chờ engine STT xác nhận khởi động được (busy/network thường thất bại nhanh).
const STT_START_TIMEOUT_MS = 6000;
const STT_RETRY_DELAY_MS = 1200;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isNavCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return NAV_KEYWORDS.some((kw) => t.includes(kw));
}

export function useVoiceAssistant(node: MapNode | null) {
  const { state, messages, addMessage, markSpeakingDone, setState, setCurrentNode, clearChat } =
    useVoiceAssistantStore();
  const { recognizing, transcript, isFinal, error: speechError, stop: stopSTT, reset: resetSTT } =
    useSpeechRecognition();
  const inputLockRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const submitRef = useRef(false);
  const nodeRef = useRef(node);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const router = useRouter();
  const { completeNode } = useMapProgress();
  const { sendCommand, isConnected, onVoiceStop } = useRobotConnection();
  const t = useT();

  const canUseSpeech = speechError !== "unavailable";

  // Check server on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setServerStatus("checking");
      const result = await checkServerHealth();
      if (!cancelled) {
        setServerStatus(result.ok ? "connected" : "error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const startListeningAfterSpeakingRef = useRef<() => void>(() => {});
  const handleAutoStopRef = useRef<() => void>(() => {});

  const {
    state: recorderState,
    error: recorderError,
    startRecording,
    stopRecording,
    readAudioBase64,
  } = useVoiceRecorder(() => handleAutoStopRef.current());
  const { play: playTTS, stop: stopTTS } = useTTS();

  const beginVoiceInput = useCallback(async () => {
    if (inputLockRef.current) return;
    // Dọn phiên nghe còn sót (mic vẫn mở từ lần trước) trước khi mở lại
    stopListening();
    resetSTT();
    finalTranscriptRef.current = "";
    submitRef.current = false;
    // Đợi audio focus ổn định rồi mới mở mic (tránh race với STT start).
    // Beep "đang nghe" sẽ phát SAU khi STT xác nhận mở được — người dùng
    // nghe thấy bíp thì mới bắt đầu nói (không nói vào mic chưa mở).
    await delay(700);
    if (canUseSpeech) {
      const started = await startListeningWithWait(STT_START_TIMEOUT_MS);
      if (started) {
        playRecordBeep();
        setState("listening");
        return;
      }
      // Engine thất bại (busy/network...) → thử lại 1 lần sau khi nhả nguồn
      await delay(STT_RETRY_DELAY_MS);
      const retried = await startListeningWithWait(STT_START_TIMEOUT_MS);
      if (retried) {
        playRecordBeep();
        setState("listening");
        return;
      }
      // Fallback: ghi âm qua expo-audio + Gemini transcribe (đường AAC đã sửa)
      const rec = await startRecording();
      if (rec) {
        playRecordBeep();
        setState("recording");
        return;
      }
      setState("error");
    } else {
      const ok = await startRecording();
      if (ok) {
        playRecordBeep();
        setState("recording");
      } else {
        setState("error");
      }
    }
  }, [canUseSpeech, resetSTT, startRecording, setState]);

  // Conversational mode: restart mic after bot finishes speaking.
  // Đợi một chút để engine TTS nhả audio focus, nếu không STT khởi động
  // quá sớm sẽ không bắt được giọng (triệu chứng "mic tự mở ko nghe được").
  const startListeningAfterSpeaking = useCallback(async () => {
    if (inputLockRef.current) return;
    await delay(MIC_RESTART_DELAY_MS);
    if (inputLockRef.current) return;
    await beginVoiceInput();
  }, [beginVoiceInput]);

  useEffect(() => {
    startListeningAfterSpeakingRef.current = startListeningAfterSpeaking;
  });

  useEffect(() => {
    nodeRef.current = node;
  });

  useEffect(() => {
    if (node) {
      setCurrentNode(node.id);
    }
    return () => {
      stopListening();
      stopTTS();
      clearChat();
    };
  }, [node, setCurrentNode, stopTTS, clearChat]);

  // Sync recorder state → store state
  useEffect(() => {
    if (recorderState === "recording") {
      setState("recording");
    } else if (recorderState === "processing") {
      setState("thinking");
    }
  }, [recorderState, setState]);

  // Watchdog: nếu đang "listening" mà engine STT tự kết thúc (recognizing=false)
  // mà chưa hề nhận được kết quả nào → engine chết im lặng → hiện lỗi để thử lại.
  useEffect(() => {
    if (state !== "listening") return;
    if (recognizing) return;
    if (submitRef.current) return;
    const timer = setTimeout(() => {
      setState("error");
    }, 900);
    return () => clearTimeout(timer);
  }, [state, recognizing, setState]);

  // Listen for VOICE_STOP from robot → auto-start mic
  useEffect(() => {
    onVoiceStop(() => {
      // Wait a moment for TTS to finish, then restart mic
      setTimeout(() => {
        if (!inputLockRef.current) {
          startListeningAfterSpeaking();
        }
      }, 500);
    });
  }, [onVoiceStop, startListeningAfterSpeaking]);

  const navigateToNextNode = useCallback(() => {
    const current = nodeRef.current;
    if (!current) return;
    completeNode(current.id);
    stopListening();
    stopTTS();
    // Về bản đồ trước → robot di chuyển, app mở node khi nhận NODE_START
    router.replace("/museum-map");
  }, [completeNode, router, stopTTS]);

  const handleUserMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (inputLockRef.current) return;
      inputLockRef.current = true;
      submitRef.current = true;

      // Đóng mic trước khi "suy nghĩ" + Buddy nói — nếu không STT vẫn chạy
      // và thu cả giọng Buddy (gây transcript rác / lỗi busy lần mở sau).
      stopListening();
      resetSTT();
      finalTranscriptRef.current = "";

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text,
        timestamp: Date.now(),
      };
      addMessage(userMsg);

      setState("thinking");

      try {
        const context = buildArtifactContext(nodeRef.current);
        const response = await askBuddy({ question: text, artifactContext: context });

        const buddyMsg: ChatMessage = {
          id: `buddy-${Date.now()}`,
          role: "buddy",
          text: response.answer,
          timestamp: Date.now(),
          isSpeaking: true,
        };
        addMessage(buddyMsg);
        setState("speaking");

        if (!response.answer) {
          setState("idle");
          inputLockRef.current = false;
          finalTranscriptRef.current = "";
          return;
        }

        playTTS(response.answer, {
          onDone: () => {
            markSpeakingDone(buddyMsg.id);
            inputLockRef.current = false;
            finalTranscriptRef.current = "";
            setState("idle");
            startListeningAfterSpeaking();
          },
        });

        setTimeout(() => {
          if (inputLockRef.current) {
            markSpeakingDone(buddyMsg.id);
            inputLockRef.current = false;
            finalTranscriptRef.current = "";
            setState("idle");
          }
        }, 20000);
      } catch {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "buddy",
          text: t("va.errorGeneric"),
          timestamp: Date.now(),
        };
        addMessage(errorMsg);
        setState("idle");
        inputLockRef.current = false;
      }
    },
    [addMessage, markSpeakingDone, setState, playTTS, startListeningAfterSpeaking, resetSTT, t],
  );

  const handleAudioMessage = useCallback(
    async (audioUri: string) => {
      if (inputLockRef.current) return;
      inputLockRef.current = true;
      submitRef.current = true;
      stopListening();
      resetSTT();
      finalTranscriptRef.current = "";

      const userMsgId = `user-${Date.now()}`;

      const base64 = await readAudioBase64(audioUri);
      if (!base64) {
        addMessage({
          id: userMsgId,
          role: "user",
          text: t("va.recordFailed"),
          timestamp: Date.now(),
        });
        setState("idle");
        inputLockRef.current = false;
        return;
      }

      setState("thinking");

      try {
        const context = buildArtifactContext(nodeRef.current);
        const response = await askBuddyWithAudio({
          audioBase64: base64,
          mimeType: getRecordingMimeType(),
          artifactContext: context,
        });

        const userText = response.transcription
          ? response.transcription
          : t("va.recordedVoice");

        // Check if transcription is a navigation command
        if (response.transcription && isNavCommand(response.transcription)) {
          setState("idle");
          inputLockRef.current = false;
          // Send VOICE_NEXT to robot via BLE
          if (isConnected) {
            sendCommand("VOICE_NEXT");
          }
          navigateToNextNode();
          return;
        }

        // If transcription is empty, don't show buddy response — ask to retry
        if (!response.transcription) {
          addMessage({
            id: userMsgId,
            role: "user",
            text: t("va.unheard"),
            timestamp: Date.now(),
          });
          addMessage({
            id: `buddy-${Date.now()}`,
            role: "buddy",
            text: t("va.cantHear"),
            timestamp: Date.now(),
          });
          setState("idle");
          inputLockRef.current = false;
          return;
        }

        addMessage({
          id: userMsgId,
          role: "user",
          text: userText,
          timestamp: Date.now(),
        });

        const buddyMsg: ChatMessage = {
          id: `buddy-${Date.now()}`,
          role: "buddy",
          text: response.answer,
          timestamp: Date.now(),
          isSpeaking: true,
        };
        addMessage(buddyMsg);
        setState("speaking");

        if (!response.answer) {
          setState("idle");
          inputLockRef.current = false;
          return;
        }

        playTTS(response.answer, {
          onDone: () => {
            markSpeakingDone(buddyMsg.id);
            inputLockRef.current = false;
            finalTranscriptRef.current = "";
            setState("idle");
            startListeningAfterSpeaking();
          },
        });

        setTimeout(() => {
          if (inputLockRef.current) {
            markSpeakingDone(buddyMsg.id);
            inputLockRef.current = false;
            finalTranscriptRef.current = "";
            setState("idle");
          }
        }, 20000);
      } catch {
        addMessage({
          id: userMsgId,
          role: "user",
          text: t("va.speechFailed"),
          timestamp: Date.now(),
        });
        addMessage({
          id: `buddy-${Date.now()}`,
          role: "buddy",
          text: t("va.serverDown"),
          timestamp: Date.now(),
        });
        setState("idle");
        inputLockRef.current = false;
      }
    },
    [addMessage, markSpeakingDone, setState, playTTS, readAudioBase64, startListeningAfterSpeaking, navigateToNextNode, sendCommand, isConnected, resetSTT, t],
  );

  useEffect(() => {
    handleAutoStopRef.current = async () => {
      if (recorderState !== "recording") return;
      const uri = await stopRecording();
      if (uri) {
        await handleAudioMessage(uri);
      }
    };
  });

  // STT: final transcript → text message or navigation command
  useEffect(() => {
    // Chỉ xử lý khi đang trong phiên nghe — bỏ qua kết quả cũ của phiên vừa đóng
    if (state !== "listening") return;
    if (isFinal && transcript && transcript !== finalTranscriptRef.current) {
      finalTranscriptRef.current = transcript;
      submitRef.current = true;
      // Đóng mic khi đã có câu hỏi — không để STT chạy tiếp trong lúc xử lý
      stopListening();
      if (isNavCommand(transcript)) {
        // Send VOICE_NEXT to robot via BLE
        if (isConnected) {
          sendCommand("VOICE_NEXT");
        }
        navigateToNextNode();
      } else {
        handleUserMessage(transcript);
      }
      resetSTT();
    }
  }, [state, isFinal, transcript, resetSTT, handleUserMessage, navigateToNextNode, sendCommand, isConnected]);

  const toggleListening = useCallback(async () => {
    if (state === "listening") {
      stopSTT();
      setState("idle");
    } else if (state === "recording") {
      const uri = await stopRecording();
      if (uri) {
        await handleAudioMessage(uri);
      }
    } else if (state === "thinking") {
      // Đang xử lý câu hỏi — bỏ qua bấm mic (tránh mở mic giữa chừng)
      return;
    } else if (state === "speaking") {
      await stopTTS();
      // Speech.stop() không gọi onDone → phải tự mở khóa, nếu không
      // câu hỏi kế tiếp sẽ bị drop im lặng vì inputLockRef còn true.
      inputLockRef.current = false;
      stopListening();
      resetSTT();
      finalTranscriptRef.current = "";
      await beginVoiceInput();
    } else {
      stopListening();
      resetSTT();
      finalTranscriptRef.current = "";
      await beginVoiceInput();
    }
  }, [state, beginVoiceInput, setState, stopSTT, stopTTS, stopRecording, handleAudioMessage, resetSTT]);

  const speaking =
    state === "listening"
      ? "listening"
      : state === "recording"
        ? "recording"
        : state === "speaking"
          ? "speaking"
          : state === "thinking"
            ? "thinking"
            : state === "error"
              ? "error"
              : "idle";

  return {
    state,
    messages,
    recognizing,
    transcript,
    speechError,
    recorderState,
    recorderError,
    canUseSpeech,
    serverStatus,
    toggleListening,
    sendMessage: handleUserMessage,
    speaking,
  };
}
