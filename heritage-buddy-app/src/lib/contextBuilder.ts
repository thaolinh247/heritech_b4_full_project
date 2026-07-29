import type { MapNode } from "@/types/museum-map";

export interface ArtifactContext {
  name: string;
  description: string;
  funFact: string;
  section: string;
}

export function buildArtifactContext(node: MapNode | null): ArtifactContext {
  if (!node) {
    return {
      name: "Bảo tàng Lịch sử Quốc gia",
      description: "Bảo tàng lịch sử Việt Nam",
      funFact: "",
      section: "",
    };
  }

  return {
    name: node.title,
    description: `Hiện vật thuộc ${node.sectionId}, thứ tự ${node.order} trong chuyến tham quan.`,
    funFact: "",
    section: node.sectionId,
  };
}
