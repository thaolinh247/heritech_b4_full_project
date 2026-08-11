import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Pressable } from "@/tw";
import { images } from "@/constants/images";
import { Image } from "expo-image";
import { useCallback, useEffect } from "react";
import { useMapProgress } from "@/hooks/use-map-progress";
import { useRobotConnection } from "@/hooks/use-robot-connection";
import { useT } from "@/lib/i18n";

export default function CelebrationScreen() {
  const router = useRouter();
  const { resetProgress } = useMapProgress();
  const { sendCommand, isConnected } = useRobotConnection();
  const t = useT();

  // Send STOP to robot when celebration screen mounts
  useEffect(() => {
    if (isConnected) {
      sendCommand("STOP");
    }
  }, [isConnected, sendCommand]);

  const handleRestart = useCallback(async () => {
    await resetProgress();
    router.replace("/museum-map");
  }, [resetProgress, router]);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#FDF3E7",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        source={images.mascotHappy}
        style={{ width: 160, height: 160 }}
        contentFit="contain"
      />

      <Text
        className="text-3xl text-center mt-6 px-8"
        style={{ fontFamily: "Helvetica-Bold", color: "#5C3A21" }}
      >
        {t("celeb.title")}
      </Text>

      <Text
        className="text-lg text-center mt-3 px-8"
        style={{ fontFamily: "Helvetica-Bold", color: "#7A5233" }}
      >
        {t("celeb.subtitle")}
      </Text>

      <Text
        className="text-base text-center mt-2 px-8"
        style={{ fontFamily: "Helvetica-Bold", color: "#2E8B7E" }}
      >
        {t("celeb.goodbye")}
      </Text>

      <Pressable
        onPress={handleRestart}
        className="mt-10 px-10 py-4 rounded-2xl active:opacity-80"
        style={{ backgroundColor: "#E8935E" }}
      >
        <Text
          className="text-white text-lg text-center"
          style={{ fontFamily: "Helvetica-Bold" }}
        >
          {t("celeb.restart")}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
