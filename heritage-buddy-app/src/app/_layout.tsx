import "../global.css";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Helvetica-Regular": require("../../assets/fonts/Helvetica-Regular.ttf"),
    "Helvetica-Bold": require("../../assets/fonts/Helvetica-Bold.ttf"),
    "Helvetica-Italic": require("../../assets/fonts/Helvetica-Italic.ttf"),
    "Helvetica-BoldItalic": require("../../assets/fonts/Helvetica-BoldItalic.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
