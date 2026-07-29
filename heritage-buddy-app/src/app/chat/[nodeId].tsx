import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView } from "@/tw";
import { Image } from "expo-image";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { MUSEUM_NODES } from "@/data/museum-map";
import { images } from "@/constants/images";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { MicButton } from "@/components/chat/MicButton";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useRef, useEffect, useState } from "react";
import { TextInput, Pressable } from "react-native";

export default function ChatScreen() {
  const { nodeId } = useLocalSearchParams<{ nodeId: string }>();
  const router = useRouter();
  const node = MUSEUM_NODES.find((n) => n.id === nodeId) ?? null;
  const { state, messages, transcript, serverStatus, toggleListening, sendMessage } = useVoiceAssistant(node);
  const scrollRef = useRef<ScrollView>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, state]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF3E7" }}>
      <ChatHeader
        title={node?.title ?? "Chat với Buddy"}
        onBack={() => router.back()}
      />

      {serverStatus === "error" && (
        <View
          style={{
            backgroundColor: "#FEE2E2",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#FECACA",
          }}
        >
          <Text
            style={{
              fontFamily: "Helvetica-Bold",
              fontSize: 13,
              color: "#B91C1C",
              textAlign: "center",
            }}
          >
            {"Không kết nối được máy chủ. Vui lòng kiểm tra mạng!"}
          </Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="py-4"
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && state === "idle" && (
          <View className="items-center mt-12 px-8">
            <Image
              source={images.mascotIdle}
              style={{ width: 100, height: 100, marginBottom: 16 }}
              contentFit="contain"
            />
            <Text
              className="text-center"
              style={{
                fontFamily: "Helvetica-Bold",
                fontSize: 18,
                color: "#7A5233",
                lineHeight: 26,
              }}
            >
              {"Chào bạn! Mình là Buddy.\nHỏi mình bất cứ điều gì về hiện vật này nhé!"}
            </Text>
          </View>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {state === "thinking" && <TypingIndicator />}

        {state === "recording" && (
          <View className="items-center py-4">
            <Text
              className="text-center"
              style={{
                fontFamily: "Helvetica-Bold",
                fontSize: 16,
                color: "#E85D4E",
              }}
            >
              Đang ghi âm... nhấn lại để gửi
            </Text>
          </View>
        )}

        {state === "listening" && transcript && (
          <View className="px-4 mb-2">
            <Text
              className="text-center"
              style={{
                fontFamily: "Helvetica-Italic",
                fontSize: 14,
                color: "#7A5233",
                opacity: 0.7,
              }}
            >
              {"\u201C" + transcript + "\u201D"}
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 10,
          borderTopWidth: 1,
          borderTopColor: "#F0E4D5",
        }}
      >
        {state !== "recording" && (
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "#E5D5C5",
              paddingHorizontal: 16,
              height: 48,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Nhập câu hỏi..."
              placeholderTextColor="#A0846B"
              style={{
                flex: 1,
                fontFamily: "Helvetica-Regular",
                fontSize: 16,
                color: "#5C3A21",
                height: 48,
              }}
              onSubmitEditing={() => {
                if (text.trim()) {
                  sendMessage(text);
                  setText("");
                }
              }}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => {
                if (text.trim()) {
                  sendMessage(text);
                  setText("");
                }
              }}
              disabled={!text.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: text.trim() ? "#2E8B7E" : "#D4C5B6",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
            >
              <Text style={{ fontSize: 18, color: "#FFFFFF" }}>↑</Text>
            </Pressable>
          </View>
        )}

        <MicButton state={state} onPress={toggleListening} />
      </View>
    </SafeAreaView>
  );
}
