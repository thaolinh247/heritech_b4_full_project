import { View, Text, Pressable } from "@/tw";
import { Image } from "expo-image";
import { images } from "@/constants/images";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();
  return (
    <View className="flex-1">
      <Image
        source={images.onboardingScreen}
        style={{ flex: 1, width: "100%" }}
        contentFit="cover"
      />

      <View className="absolute top-14 left-0 right-0 px-8 gap-4">
        <View className="flex-row items-center gap-2">
          <Image
            source={images.mascotAuth}
            style={{ width: 32, height: 32 }}
            contentFit="contain"
          />
          <Text
            className="text-lg text-white font-['Helvetica-Bold'] tracking-[2px]"
            style={{
              textShadowColor: "rgba(0,0,0,0.85)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}
          >
            Buddy Bảo Tàng
          </Text>
        </View>

        <View className="gap-4">
          <Text
            className="text-4xl text-white text-left leading-tight font-['Helvetica-Bold']"
            style={{
              textShadowColor: "rgba(0,0,0,0.85)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            }}
          >
            Xin chào, mình là{" "}
            <Text className="text-[#E8935E]">Buddy!</Text>
          </Text>
          <Text
            className="text-xl text-white font-['Helvetica-Bold'] leading-relaxed"
            style={{
              textShadowColor: "rgba(0,0,0,0.85)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 6,
            }}
          >
            Mình sẽ đồng hành cùng bạn khám phá bảo tàng hôm nay!
          </Text>
        </View>
      </View>

      <View
        className="absolute bottom-0 left-0 right-0 bg-black/60 px-6 pt-5 pb-12"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <Pressable onPress={() => router.push("/selection")} className="w-full py-4 rounded-2xl bg-[#E8935E] active:opacity-80">
          <Text
            className="text-lg text-white font-['Helvetica-Bold'] text-center"
            style={{
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            Bắt đầu
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
