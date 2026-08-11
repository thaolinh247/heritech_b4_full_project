import { images } from "@/constants/images";
import { Pressable, Text, View } from "@/tw";
import { Image } from "expo-image";
import { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAccessibilityStore } from "@/store/accessibility";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n";
import type { Language } from "@/types/language";

type ModeType = "vision" | "hearing" | "speech";

const CARDS = [
  {
    id: "vision" as ModeType,
    labelKey: "selection.mode.vision" as const,
    mascot: images.mascotKhiemThi,
    accent: "#7A4A2B",
  },
  {
    id: "hearing" as ModeType,
    labelKey: "selection.mode.hearing" as const,
    mascot: images.mascotDiec,
    accent: "#2E8B7E",
  },
  {
    id: "speech" as ModeType,
    labelKey: "selection.mode.speech" as const,
    mascot: images.mascotCam,
    accent: "#7A4A2B",
  },
] as const;

const LANGUAGE_OPTIONS = [
  { id: "vi" as Language, labelKey: "selection.languageVi" as const },
  { id: "en" as Language, labelKey: "selection.languageEn" as const },
] as const;

export default function SelectionScreen() {
  const [selectedId, setSelectedId] = useState<ModeType | null>(null);
  const router = useRouter();
  const setMode = useAccessibilityStore((s) => s.setMode);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const t = useT();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF3E7" }}>
      <View className="flex-1 px-5 pt-4 pb-4">
        {/* Language selector */}
        <View className="items-center mb-4" style={{ flexGrow: 0, flexShrink: 0 }}>
          <Text
            style={{
              fontFamily: "Helvetica-Bold",
              fontSize: 14,
              color: "#7A5233",
              marginBottom: 8,
            }}
          >
            {t("selection.languageLabel")}
          </Text>
          <View className="flex-row gap-2">
            {LANGUAGE_OPTIONS.map((opt) => {
              const isActive = language === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setLanguage(opt.id)}
                  className="px-6 py-2 rounded-full active:opacity-80"
                  style={{
                    backgroundColor: isActive ? "#2E8B7E" : "#FFF8F0",
                    borderWidth: 2,
                    borderColor: isActive ? "#2E8B7E" : "#E2D2C1",
                    minHeight: 48,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Helvetica-Bold",
                      fontSize: 16,
                      color: isActive ? "#FFFFFF" : "#5C3A21",
                    }}
                  >
                    {t(opt.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
          {t("selection.title")}
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
                  {t(card.labelKey)}
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
            {t("common.confirm")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}