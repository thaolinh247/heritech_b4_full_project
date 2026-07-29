import { View, Text } from "@/tw";
import { Image } from "expo-image";
import { images } from "@/constants/images";
import type { ChatMessage } from "@/types/voice-assistant";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const buddyMascot = message.isSpeaking ? images.mascotHappy : images.mascotDefault;

  return (
    <View
      className={`flex-row ${isUser ? "justify-end" : "justify-start"} mb-3 px-4`}
    >
      {!isUser && (
        <Image
          source={buddyMascot}
          style={{ width: 36, height: 36, marginRight: 8, marginTop: 4 }}
          contentFit="contain"
        />
      )}
      <View
        className="max-w-[80%] px-4 py-3"
        style={{
          backgroundColor: isUser ? "#2E8B7E" : "#FDF3E7",
          borderRadius: 16,
          borderTopRightRadius: isUser ? 4 : 16,
          borderTopLeftRadius: isUser ? 16 : 4,
          borderWidth: message.isSpeaking ? 2 : 0,
          borderColor: message.isSpeaking ? "#E8935E" : "transparent",
        }}
      >
        <Text
          style={{
            fontFamily: "Helvetica-Bold",
            fontSize: 16,
            color: isUser ? "#FFFFFF" : "#5C3A21",
            lineHeight: 22,
          }}
        >
          {message.text}
        </Text>
        {message.isSpeaking && (
          <Text
            style={{
              fontFamily: "Helvetica-Italic",
              fontSize: 12,
              color: "#E8935E",
              marginTop: 4,
            }}
          >
            Buddy đang đọc...
          </Text>
        )}
      </View>
    </View>
  );
}
