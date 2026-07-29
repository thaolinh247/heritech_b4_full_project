import { View, Text, Pressable } from "@/tw";

interface ChatHeaderProps {
  title: string;
  onBack: () => void;
}

export function ChatHeader({ title, onBack }: ChatHeaderProps) {
  return (
    <View
      className="flex-row items-center px-4 py-3"
      style={{
        backgroundColor: "#FDF3E7",
        borderBottomWidth: 1,
        borderBottomColor: "#F5E6D0",
        shadowColor: "#5C3A21",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Pressable
        onPress={onBack}
        className="w-10 h-10 items-center justify-center rounded-full mr-3"
        style={{ backgroundColor: "rgba(92, 58, 33, 0.08)" }}
        accessibilityLabel="Quay lại"
        accessibilityRole="button"
      >
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 20, color: "#5C3A21" }}>
          ←
        </Text>
      </Pressable>
      <Text
        className="flex-1"
        style={{
          fontFamily: "Helvetica-Bold",
          fontSize: 18,
          color: "#5C3A21",
          numberOfLines: 1,
        }}
        numberOfLines={1}
      >
        🐯 {title}
      </Text>
    </View>
  );
}
