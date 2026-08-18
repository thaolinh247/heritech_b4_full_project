import { useState, useCallback } from "react";
import { TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "@/tw";
import { Image } from "expo-image";
import { images } from "@/constants/images";
import { useServerStore } from "@/store/server";
import { checkServerHealth } from "@/lib/llm";
import { useT } from "@/lib/i18n";

const ENV_DEFAULT = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

type TestStatus = "idle" | "testing" | "ok" | "fail";

export default function SettingsScreen() {
  const router = useRouter();
  const t = useT();
  const customUrl = useServerStore((s) => s.customBackendUrl);
  const setCustomBackendUrl = useServerStore((s) => s.setCustomBackendUrl);

  const [input, setInput] = useState(customUrl ?? "");
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");

  const handleSave = useCallback(() => {
    const trimmed = input.trim();
    setCustomBackendUrl(trimmed || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [input, setCustomBackendUrl]);

  const handleTest = useCallback(async () => {
    setTestStatus("testing");
    // Lưu tạm thời để checkServerHealth dùng URL mới nhất
    const trimmed = input.trim();
    setCustomBackendUrl(trimmed || null);
    const result = await checkServerHealth();
    setTestStatus(result.ok ? "ok" : "fail");
    setTimeout(() => setTestStatus("idle"), 4000);
  }, [input, setCustomBackendUrl]);

  const handleReset = useCallback(() => {
    setInput("");
    setCustomBackendUrl(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [setCustomBackendUrl]);

  const activeUrl = input.trim() || ENV_DEFAULT;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF3E7" }}>
      <View className="flex-1 px-5 pt-4 pb-6">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: "#FFF8F0" }}
            accessibilityLabel={t("common.back")}
          >
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 20, color: "#5C3A21" }}>
              ←
            </Text>
          </Pressable>
          <Text
            style={{ fontFamily: "Helvetica-Bold", fontSize: 22, color: "#3E2723" }}
          >
            {t("settings.title")}
          </Text>
        </View>

        {/* Mascot */}
        <View className="items-center mb-4">
          <Image
            source={images.mascotDefault}
            style={{ width: 72, height: 72 }}
            contentFit="contain"
          />
        </View>

        {/* Backend URL section */}
        <View
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: "#FFF8F0", borderWidth: 1, borderColor: "#E2D2C1" }}
        >
          <Text
            style={{ fontFamily: "Helvetica-Bold", fontSize: 16, color: "#3E2723", marginBottom: 8 }}
          >
            {t("settings.backendLabel")}
          </Text>

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t("settings.backendPlaceholder")}
            placeholderTextColor="#B8A898"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{
              fontFamily: "Helvetica-Regular",
              fontSize: 16,
              color: "#3E2723",
              backgroundColor: "#FDF3E7",
              borderWidth: 1,
              borderColor: "#E2D2C1",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 14,
              minHeight: 48,
            }}
          />

          <Text
            style={{
              fontFamily: "Helvetica-Regular",
              fontSize: 13,
              color: "#7A5233",
              marginTop: 8,
              lineHeight: 18,
            }}
          >
            {t("settings.backendHint")}
          </Text>

          {/* Current active URL */}
          <View
            className="flex-row items-center mt-3 px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#FDF3E7" }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: customUrl ? "#2E8B7E" : "#E8935E",
                marginRight: 8,
              }}
            />
            <Text
              style={{ fontFamily: "Helvetica-Regular", fontSize: 13, color: "#5C3A21", flex: 1 }}
              numberOfLines={1}
            >
              {activeUrl}
            </Text>
          </View>

          {/* Buttons */}
          <View className="flex-row mt-4 gap-3">
            <Pressable
              onPress={handleTest}
              disabled={testStatus === "testing"}
              className="flex-1 py-3 rounded-xl items-center"
              style={{
                backgroundColor: "#2E8B7E",
                minHeight: 48,
                justifyContent: "center",
                opacity: testStatus === "testing" ? 0.6 : 1,
              }}
            >
              {testStatus === "testing" ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: "#FFFFFF" }}>
                  {t("settings.backendTest")}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleSave}
              className="flex-1 py-3 rounded-xl items-center"
              style={{
                backgroundColor: "#E8935E",
                minHeight: 48,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: "#FFFFFF" }}>
                {saved ? `✓ ${t("settings.backendSaved")}` : t("common.confirm")}
              </Text>
            </Pressable>
          </View>

          {/* Test result */}
          {testStatus === "ok" && (
            <View className="mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: "#E8F5E9" }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: "#2E8B7E" }}>
                ✓ {t("settings.backendOk")}
              </Text>
            </View>
          )}
          {testStatus === "fail" && (
            <View className="mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: "#FFEBEE" }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 14, color: "#E85D4E" }}>
                ✗ {t("settings.backendFail")}
              </Text>
            </View>
          )}

          {/* Reset button */}
          {customUrl && (
            <Pressable
              onPress={handleReset}
              className="mt-3 py-2 items-center"
            >
              <Text style={{ fontFamily: "Helvetica-Regular", fontSize: 14, color: "#E85D4E" }}>
                {t("settings.backendReset")}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
