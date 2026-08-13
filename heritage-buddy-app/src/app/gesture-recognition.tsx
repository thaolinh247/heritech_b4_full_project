import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Asset } from "expo-asset";
import { Image } from "expo-image";
import { Pressable, Text, View } from "@/tw";
import { images } from "@/constants/images";
import { pickBrowserImage } from "@/lib/browser-camera";
import { BrowserCameraPreview, type BrowserCameraHandle } from "@/components/BrowserCameraPreview";
import {
  recognizeSign,
  SIGN_LETTERS,
  SIGN_TEST_ACCURACY,
  type SignPrediction,
} from "@/ml/sign";

type SourceKind = "camera" | "upload" | "sample";

export default function GestureRecognitionScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<SignPrediction | null>(null);
  const [source, setSource] = useState<SourceKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraLive, setCameraLive] = useState(true);
  const cameraRef = useRef<BrowserCameraHandle>(null);

  const analyze = async (uri: string, kind: SourceKind) => {
    cameraRef.current?.stop();
    setCameraLive(false);
    setBusy(true);
    setError(null);
    setPrediction(null);
    setImageUri(uri);
    setSource(kind);
    try {
      setPrediction(await recognizeSign(uri, kind === "sample"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không nhận diện được ảnh");
    } finally {
      setBusy(false);
    }
  };

  const captureCamera = async () => {
    setBusy(true);
    setError(null);
    try {
      const uri = cameraRef.current?.capture();
      if (!uri) throw new Error("Camera chưa sẵn sàng.");
      cameraRef.current?.stop();
      setCameraLive(false);
      await analyze(uri, "camera");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không mở được camera");
      setBusy(false);
    }
  };

  const useUpload = async () => {
    try {
      await analyze(await pickBrowserImage(), "upload");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không chọn được ảnh");
    }
  };

  const useSample = async () => {
    const asset = Asset.fromModule(images.gestureSampleA);
    await asset.downloadAsync();
    await analyze(asset.localUri ?? asset.uri, "sample");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF3E7" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-3">
          <View className="flex-row items-center mb-4">
            <Pressable
              testID="gesture-back-button"
              onPress={() => router.back()}
              className="w-12 h-12 items-center justify-center rounded-full bg-white active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
            >
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, color: "#5C3A21" }}>←</Text>
            </Pressable>
            <View className="ml-3 flex-1">
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 24, color: "#5C3A21" }}>
                Nhận diện ký hiệu tay
              </Text>
              <Text style={{ fontFamily: "Helvetica-Regular", fontSize: 16, color: "#7A5233" }}>
                Model chạy trực tiếp trên thiết bị
              </Text>
            </View>
          </View>

          <View
            className="overflow-hidden items-center justify-center"
            style={{ height: 330, borderRadius: 28, backgroundColor: "#2E8B7E" }}
          >
            {cameraLive ? (
              <BrowserCameraPreview
                ref={cameraRef}
                facingMode="user"
                mirrored
                onReady={() => setError(null)}
                onError={(message) => setError(message)}
              />
            ) : imageUri ? (
              <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <View className="items-center px-8">
                <Text style={{ fontSize: 64 }}>🤟</Text>
                <Text
                  className="text-center mt-3"
                  style={{ fontFamily: "Helvetica-Bold", fontSize: 21, lineHeight: 28, color: "#FFFFFF" }}
                >
                  Đưa bàn tay vào giữa khung hình
                </Text>
                <Text
                  className="text-center mt-2"
                  style={{ fontFamily: "Helvetica-Regular", fontSize: 16, lineHeight: 23, color: "#E4FFF9" }}
                >
                  Nền đơn giản và đủ sáng sẽ cho kết quả tốt hơn
                </Text>
              </View>
            )}
            {busy && (
              <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: "rgba(46,43,33,0.72)" }}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text className="mt-3" style={{ fontFamily: "Helvetica-Bold", fontSize: 18, color: "#FFFFFF" }}>
                  Đang nhận diện…
                </Text>
              </View>
            )}
          </View>

          {prediction && (
            <View
              testID="gesture-result-card"
              className="mt-4 p-5"
              style={{ borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#2E8B7E" }}
            >
              <Text className="text-center" style={{ fontFamily: "Helvetica-Regular", fontSize: 16, color: "#7A5233" }}>
                Kết quả nhận diện
              </Text>
              <Text className="text-center mt-1" style={{ fontFamily: "Helvetica-Bold", fontSize: 68, color: "#2E8B7E" }}>
                {prediction.letter}
              </Text>
              <Text className="text-center" style={{ fontFamily: "Helvetica-Bold", fontSize: 20, color: "#5C3A21" }}>
                Độ tin cậy {(prediction.confidence * 100).toFixed(1)}%
              </Text>
              <Text className="text-center mt-1" style={{ fontFamily: "Helvetica-Regular", fontSize: 15, color: "#7A5233" }}>
                Xử lý trong {prediction.tookMs} ms · {source === "sample" ? "Ảnh mẫu kiểm thử" : source === "camera" ? "Camera" : "Ảnh đã chọn"}
              </Text>
              <View className="flex-row justify-center gap-2 mt-4">
                {prediction.alternatives.map((item) => (
                  <View key={item.letter} className="px-3 py-2 rounded-full" style={{ backgroundColor: "#FDF3E7" }}>
                    <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 15, color: "#5C3A21" }}>
                      {item.letter} {(item.confidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {error && (
            <View className="mt-4 p-4 rounded-2xl" style={{ backgroundColor: "#FDE5E1" }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16, lineHeight: 23, color: "#A8342A" }}>
                {error}
              </Text>
              <Text className="mt-1" style={{ fontFamily: "Helvetica-Regular", fontSize: 15, color: "#7A5233" }}>
                Bạn vẫn có thể dùng ảnh mẫu để kiểm tra model.
              </Text>
            </View>
          )}

          <View className="gap-3 mt-5">
            <Pressable
              testID="gesture-capture-button"
              onPress={cameraLive ? captureCamera : () => {
                setImageUri(null);
                setPrediction(null);
                setError(null);
                setCameraLive(true);
              }}
              disabled={busy}
              className="w-full py-4 rounded-2xl items-center active:opacity-80"
              style={{ backgroundColor: "#2E8B7E", minHeight: 56 }}
            >
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, color: "#FFFFFF" }}>
                {cameraLive ? "Chụp & nhận diện" : "Mở lại camera"}
              </Text>
            </Pressable>
            <Pressable
              onPress={useUpload}
              disabled={busy}
              className="w-full py-4 rounded-2xl items-center active:opacity-80"
              style={{ backgroundColor: "#E8935E", minHeight: 56 }}
            >
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, color: "#FFFFFF" }}>🖼️ Chọn ảnh từ máy</Text>
            </Pressable>
            <Pressable
              testID="gesture-sample-button"
              onPress={useSample}
              disabled={busy}
              className="w-full py-4 rounded-2xl items-center active:opacity-80"
              style={{ backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#E8935E", minHeight: 56 }}
            >
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, color: "#5C3A21" }}>🧪 Dùng ảnh mẫu chữ A</Text>
            </Pressable>
          </View>

          <View className="mt-5 p-4 rounded-2xl" style={{ backgroundColor: "#FFF8F0" }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 16, color: "#5C3A21" }}>
              Phạm vi model
            </Text>
            <Text className="mt-1" style={{ fontFamily: "Helvetica-Regular", fontSize: 15, lineHeight: 22, color: "#7A5233" }}>
              Nhận 22 chữ cái: {SIGN_LETTERS.split("").join(" · ")}. Độ chính xác tập kiểm thử {(SIGN_TEST_ACCURACY * 100).toFixed(1)}%.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
