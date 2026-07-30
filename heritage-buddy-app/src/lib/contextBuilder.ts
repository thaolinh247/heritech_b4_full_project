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
      description: "Bảo tàng lịch sử Việt Nam, nơi lưu giữ những di sản và câu chuyện của đất nước.",
      funFact: "Mỗi hiện vật đều mang một câu chuyện riêng về lịch sử và văn hóa Việt Nam.",
      section: "",
    };
  }

  const description = node.description?.trim() || `Hiện vật thuộc ${node.sectionId}, thứ tự ${node.order} trong chuyến tham quan.`;
  const funFact = node.funFact?.trim() || "Đây là một hiện vật đáng chú ý trong hành trình khám phá bảo tàng.";

  return {
    name: node.title,
    description,
    funFact,
    section: node.sectionId,
  };
}
