import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Pressable, Text } from "@/tw";

export interface NativeCameraHandle {
  capture: () => Promise<string>;
  stop: () => void;
}

interface Props {
  onReady?: () => void;
  onError: (message: string) => void;
}

export const CameraNativePreview = forwardRef<NativeCameraHandle, Props>(function CameraNativePreview(
  { onReady, onError }, ref,
) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useImperativeHandle(ref, () => ({
    stop: () => {},
    capture: async () => {
      const camera = cameraRef.current;
      if (!camera) throw new Error("Camera chưa sẵn sàng.");
      const photo = await camera.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) throw new Error("Camera chưa sẵn sàng.");
      return photo.uri;
    },
  }));

  useEffect(() => {
    if (permission?.granted) onReady?.();
  }, [permission?.granted, onReady]);

  if (Platform.OS === "web") return <View style={{ flex: 1 }} />;

  if (!permission) return <View style={{ flex: 1 }} />;

  if (!permission.granted) {
    return (
      <View className="items-center px-8">
        <Text style={{ fontSize: 56 }}>🤟</Text>
        <Text
          className="text-center mt-3"
          style={{ fontFamily: "Helvetica-Bold", fontSize: 21, lineHeight: 28, color: "#FFFFFF" }}
        >
          Cần quyền camera
        </Text>
        <Text
          className="text-center mt-2"
          style={{ fontFamily: "Helvetica-Regular", fontSize: 16, lineHeight: 23, color: "#E4FFF9" }}
        >
          Cho phép camera để chụp ký hiệu tay
        </Text>
        <Pressable
          onPress={() => requestPermission().catch((reason) => onError(String(reason)))}
          className="mt-5 px-6 py-3 rounded-full items-center active:opacity-80"
          style={{ backgroundColor: "#FFFFFF", minHeight: 48 }}
        >
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 17, color: "#2E8B7E" }}>
            Cho phép camera
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CameraView
      ref={cameraRef}
      style={{ width: "100%", height: "100%", transform: [{ scaleX: -1 }] }}
      facing="front"
      mode="picture"
      onCameraReady={() => onReady?.()}
      onMountError={() => onError("Không mở được camera.")}
    />
  );
});
