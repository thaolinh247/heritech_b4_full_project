import { Text, View } from "@/tw";
import type { MuseumSection } from "@/types/museum-map";

interface SectionBannerProps {
  section: MuseumSection;
  top: number;
  height: number;
}

export function SectionBanner({ section, top, height }: SectionBannerProps) {
  const hexToRgba = (hex: string, alpha: number) => {
    const c = parseInt(hex.replace("#", ""), 16);
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        top,
        height,
        zIndex: 0,
        backgroundColor: hexToRgba(section.color, 0.1),
        borderRadius: 16,
        borderWidth: 1,
        borderColor: hexToRgba(section.color, 0.2),
      }}
      accessibilityRole="header"
      accessibilityLabel={`Khu vực: ${section.name}`}
    >
      <View
        style={{
          position: "absolute",
          top: -1,
          left: 24,
          backgroundColor: section.color,
          paddingVertical: 4,
          paddingHorizontal: 16,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "Helvetica-Bold",
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          {section.name.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}
