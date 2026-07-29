import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "expo-router";
import { useVoiceAssistantStore } from "@/store/voice-assistant";
import { useRobotConnection } from "@/hooks/use-robot-connection";
import { useSpeechRecognition, stopListening } from "@/lib/speech";
import { useVoiceRecorder } from "@/lib/voice-recorder";
import { useTTS } from "@/lib/tts";
import { askBuddy, askBuddyWithAudio, checkServerHealth } from "@/lib/llm";
import { buildArtifactContext } from "@/lib/contextBuilder";
import { useMapProgress } from "@/hooks/use-map-progress";
import { MUSEUM_NODES } from "@/data/museum-map";
import type { MapNode } from "@/types/museum-map";
import type { ChatMessage } from "@/types/voice-assistant";

export type ServerStatus = "checking" | "connected" | "error";

const NAV_KEYWORDS = ["dừng", "dừng lại", "stop", "tiếp", "tiếp theo", "next", "continue", "sang node", "chuyển node"];

function isNavCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return NAV_KEYWORDS.some((kw) => t.includes(kw));
}

export function useVoiceAssistant(node: MapNode | null) {
  const { state, messages, addMessage, markSpeakingDone, setState, setCurrentNode, clearChat } =
    useVoiceAssistantStore();
  const { recognizing, transcript, isFinal, error: speechError, start: startSTT, stop: stopSTT, reset: resetSTT } =
    useSpeechRecognition();
  const inputLockRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const nodeRef = useRef(node);
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const router = useRouter();
  const { completeNode } = useMapProgress();
  const { sendCommand, isConnected, onVoiceStop } = useRobotConnection();

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

  // Conversational mode: restart mic after bot finishes speaking
  const startListeningAfterSpeaking = useCallback(() => {
    if (inputLockRef.current) return;
    if (canUseSpeech) {
      const granted = startSTT();
      if (granted) setState("listening");
    } else {
      startRecording();
      setState("recording");
    }
  }, [canUseSpeech, startSTT, startRecording, setState]);

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
    const next = MUSEUM_NODES.find((n) => n.order === current.order + 1);
    completeNode(current.id);
    stopListening();
    stopTTS();
    if (next) {
      router.replace(`/node/${next.id}`);
    }
  }, [completeNode, router, stopTTS]);

  const handleUserMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (inputLockRef.current) return;
      inputLockRef.current = true;

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
          text: "Xin lỗi, mình gặp sự cố. Bạn thử lại nhé!",
          timestamp: Date.now(),
        };
        addMessage(errorMsg);
        setState("idle");
        inputLockRef.current = false;
      }
    },
    [addMessage, markSpeakingDone, setState, playTTS, startListeningAfterSpeaking],
  );

  const handleAudioMessage = useCallback(
    async (audioUri: string) => {
      if (inputLockRef.current) return;
      inputLockRef.current = true;

      const userMsgId = `user-${Date.now()}`;

      const base64 = await readAudioBase64(audioUri);
      if (!base64) {
        addMessage({
          id: userMsgId,
          role: "user",
          text: "(ghi âm thất bại)",
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
          mimeType: "audio/m4a",
          artifactContext: context,
        });

        const userText = response.transcription
          ? response.transcription
          : "(đã ghi âm giọng nói)";

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
            text: "(không nghe rõ)",
            timestamp: Date.now(),
          });
          addMessage({
            id: `buddy-${Date.now()}`,
            role: "buddy",
            text: "Mình không nghe rõ bạn nói gì. Bạn thử nói lại nhé!",
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
          text: "(không thể nhận dạng giọng nói)",
          timestamp: Date.now(),
        });
        addMessage({
          id: `buddy-${Date.now()}`,
          role: "buddy",
          text: "Mình không kết nối được máy chủ. Bạn kiểm tra lại mạng hoặc thử lại nhé!",
          timestamp: Date.now(),
        });
        setState("idle");
        inputLockRef.current = false;
      }
    },
    [addMessage, markSpeakingDone, setState, playTTS, readAudioBase64, startListeningAfterSpeaking, navigateToNextNode, sendCommand, isConnected],
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
    if (isFinal && transcript && transcript !== finalTranscriptRef.current) {
      finalTranscriptRef.current = transcript;
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
  }, [isFinal, transcript, resetSTT, handleUserMessage, navigateToNextNode, sendCommand, isConnected]);

  const toggleListening = useCallback(async () => {
    if (state === "listening") {
      stopSTT();
      setState("idle");
    } else if (state === "recording") {
      const uri = await stopRecording();
      if (uri) {
        await handleAudioMessage(uri);
      }
    } else if (state === "speaking") {
      await stopTTS();
      stopListening();
      finalTranscriptRef.current = "";
      if (canUseSpeech) {
        const granted = await startSTT();
        if (granted) setState("listening");
      } else {
        const ok = await startRecording();
        if (ok) setState("recording");
      }
    } else {
      stopListening();
      finalTranscriptRef.current = "";
      if (canUseSpeech) {
        const granted = await startSTT();
        if (granted) setState("listening");
      } else {
        const ok = await startRecording();
        if (ok) setState("recording");
      }
    }
  }, [state, canUseSpeech, setState, startSTT, stopSTT, stopTTS, startRecording, stopRecording, handleAudioMessage]);

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
