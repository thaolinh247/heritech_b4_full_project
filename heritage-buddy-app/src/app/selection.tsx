import { images } from "@/constants/images";
import { Pressable, Text, View } from "@/tw";
import { Image } from "expo-image";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAccessibilityStore } from "@/store/accessibility";

type ModeType = "vision" | "hearing" | "speech";

const CARDS = [
  {
    id: "vision" as ModeType,
    label: "Khiếm thị",
    mascot: images.mascotKhiemThi,
    accent: "#7A4A2B",
  },
  {
    id: "hearing" as ModeType,
    label: "Khiếm thính",
    mascot: images.mascotDiec,
    accent: "#2E8B7E",
  },
  {
    id: "speech" as ModeType,
    label: "Khiếm ngôn",
    mascot: images.mascotCam,
    accent: "#7A4A2B",
  },
] as const;

export default function SelectionScreen() {
  const [selectedId, setSelectedId] = useState<ModeType | null>(null);
  const router = useRouter();
  const setMode = useAccessibilityStore((s) => s.setMode);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF3E7" }}>
      <View className="flex-1 px-5 pt-4 pb-4">
        {/* Mascot */}
        <View className="items-center" style={{ flexGrow: 0, flexShrink: 0 }}>
          <Image
            source={images.mascotAuth}
            style={{ width: 88, height: 88 }}
            contentFit="contain"
          />
        </View>

        {/* Title */}
        <Text
          className="text-center text-[#3E2723]"
          style={{
            fontSize: 22,
            lineHeight: 50,
            fontFamily: "Helvetica-Bold",
            flexGrow: 0,
            flexShrink: 0,
          }}
        >
          Chọn chế độ hỗ trợ phù hợp
        </Text>

        {/* Selection Cards List */}
        <View className="gap-2.5 mt-2" style={{ flexGrow: 0, flexShrink: 0 }}>
          {CARDS.map((card) => {
            const isSelected = selectedId === card.id;
            return (
              <Pressable
                key={card.id}
                onPress={() => setSelectedId(card.id)}
                className="flex-row items-center justify-between active:opacity-80"
                style={{
                  paddingVertical: 20,
                  paddingHorizontal: 14,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: isSelected ? "#3E2723" : "#E2D2C1",
                  backgroundColor: "#FFF8F0",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                {/* Left: Mascot Image */}
                <Image
                  source={card.mascot}
                  style={{ width: 76, height: 76 }}
                  contentFit="contain"
                />

                {/* Middle: Title */}
                <Text
                  className="flex-1 ml-3 text-[#3E2723]"
                  style={{
                    fontSize: 20,
                    lineHeight: 26,
                    fontFamily: "Helvetica-Bold",
                  }}
                >
                  {card.label}
                </Text>

                {/* Right: Checkmark Indicator */}
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    borderWidth: 2,
                    borderColor: card.accent,
                    backgroundColor: isSelected ? card.accent : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <Text
                      style={{
                        color: "#FFF",
                        fontSize: 16,
                        fontWeight: "bold",
                      }}
                    >
                      ✓
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Bottom Button */}
        <Pressable
          disabled={!selectedId}
          onPress={() => {
            if (selectedId) {
              setMode(selectedId);
              router.replace("/museum-map");
            }
          }}
          className="w-full py-6 rounded-2xl mt-4 active:opacity-80"
          style={{
            backgroundColor: selectedId ? "#E8935E" : "#D4C5B6",
          }}
        >
          <Text
            className="text-lg text-white font-['Helvetica-Bold'] text-center"
            style={{
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            Xác nhận
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}