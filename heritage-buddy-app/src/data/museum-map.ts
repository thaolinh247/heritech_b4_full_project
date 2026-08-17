import type { MapNode, MuseumSection } from "@/types/museum-map";

export const MAP_Y_SPACING = 10;

export function yToPx(y: number): number {
  return y * MAP_Y_SPACING;
}

export function getMaxNodeY(): number {
  return Math.max(...MUSEUM_NODES.map((n) => n.y));
}

export const MUSEUM_SECTIONS: MuseumSection[] = [
  { id: "ancient", name: "Khu Cổ đại", nameEn: "Ancient Section", color: "#E8935E" },
  { id: "medieval", name: "Khu Trung đại", nameEn: "Medieval Section", color: "#2E8B7E" },
  { id: "early-modern", name: "Khu Cận đại", nameEn: "Early Modern Section", color: "#E85D4E" },
  { id: "modern", name: "Khu Hiện đại", nameEn: "Modern Section", color: "#7A5233" },
];

// Tour thật chỉ có 4 điểm dừng (leg-based, 16/08):
//   - index 0 = Entrance (xuất phát — robot KHÔNG bao giờ gửi NODE_START:0 lúc đầu)
//   - index 1..4 = 4 điểm dừng — khớp NodeID 1..4 firmware gửi (NODE_START:<idx>)
//     → History (ancient-01), Ceramics (ancient-02), Artifacts (ancient-03),
//       Special (medieval-01) — tạm lấy 4 vật đầu theo yêu cầu team.
//   - order 5 = Entrance: hiện SAU node 4 trên bản đồ — node cuối của tour.
//     Lúc mở đầu KHÔNG tính (locked, badge chỉ 4/5); CHỈ tính khi robot quay về
//     cổng (Finish = Entrance vật lý) → firmware gửi NODE_COMPLETE:0 → 5/5 ✓
export const MUSEUM_NODES: MapNode[] = [
  {
    id: "entrance",
    order: 5,
    title: "Kết thúc",
    titleEn: "Finish",
    sectionId: "ancient",
    x: 45,
    y: 40,
    videoSource: "",
    thumbnail: "",
    description: "Bạn đã quay về cổng bảo tàng! Hành trình tham quan hoàn thành.",
    descriptionEn: "You are back at the museum entrance! Your tour is complete.",
    funFact: "",
    funFactEn: "",
  },
  {
    id: "ancient-01",
    order: 1,
    title: "Bức tượng chân dung Chủ tịch Hồ Chí Minh",
    titleEn: "Portrait Statue of President Ho Chi Minh",
    sectionId: "ancient",
    x: 22,
    y: 6,
    videoSource: "https://drive.google.com/uc?export=download&id=1BVLYXbK_THS2JpiE218LWA0PiRrNL8lJ",
    thumbnail: "",
    description: "Bức tượng chân dung Chủ tịch Hồ Chí Minh là hình ảnh tượng trưng cho sự nghiệp cách mạng và lòng yêu nước của dân tộc Việt Nam.",
    descriptionEn:
      "The portrait statue of President Ho Chi Minh symbolizes the revolutionary career and patriotism of the Vietnamese nation.",
    funFact: "Bác Hồ luôn được nhắc đến như biểu tượng của lòng nhân ái và tinh thần đoàn kết.",
    funFactEn: "Uncle Ho is always remembered as a symbol of compassion and the spirit of unity.",
  },
  {
    id: "ancient-02",
    order: 2,
    title: "Trống đồng Đông Sơn",
    titleEn: "Dong Son Bronze Drum",
    sectionId: "ancient",
    x: 72,
    y: 14,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "",
    description: "Trống đồng Đông Sơn là một hiện vật tiêu biểu của nền văn hóa cổ đại, nổi bật với hoa văn trang trí tinh xảo.",
    descriptionEn:
      "The Dong Son bronze drum is a hallmark artifact of the ancient civilization, famous for its exquisite decorative patterns.",
    funFact: "Những đường nét trên mặt trống thường mô tả người, thú vật và các nghi lễ truyền thống.",
    funFactEn: "The patterns on the drum's face often depict people, animals, and traditional rituals.",
  },
  {
    id: "ancient-03",
    order: 3,
    title: "Văn hoá Sa Huỳnh",
    titleEn: "Sa Huynh Culture",
    sectionId: "ancient",
    x: 18,
    y: 24,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: "",
    description: "Văn hóa Sa Huỳnh phản ánh đời sống, tín ngưỡng và các hoạt động trao đổi ở khu vực duyên hải miền Trung thời cổ đại.",
    descriptionEn:
      "The Sa Huynh culture reflects the daily life, beliefs, and exchange activities of the central coastal region in ancient times.",
    funFact: "Các di vật Sa Huỳnh cho thấy cư dân xưa rất giỏi trong chế tác đồ trang sức và đồ dùng sinh hoạt.",
    funFactEn:
      "Sa Huynh artifacts show that ancient inhabitants were highly skilled at crafting jewelry and household items.",
  },
  {
    id: "medieval-01",
    order: 4,
    title: "Thời kỳ Bắc thuộc",
    titleEn: "Period of Northern Domination",
    sectionId: "medieval",
    x: 65,
    y: 33,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: "",
    description: "Thời kỳ Bắc thuộc là giai đoạn lịch sử dài, nơi các giá trị văn hóa bản địa vẫn được giữ gìn và phát triển.",
    descriptionEn:
      "The period of Northern domination was a long historical era in which indigenous cultural values were still preserved and developed.",
    funFact: "Giai đoạn này giúp du khách hiểu rõ hơn về sự tiếp biến giữa văn hóa bản địa và văn hóa bên ngoài.",
    funFactEn:
      "This period helps visitors better understand the cultural exchange between local and outside cultures.",
  },
];
