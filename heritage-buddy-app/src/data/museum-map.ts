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

export const MUSEUM_NODES: MapNode[] = [
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
  {
    id: "medieval-02",
    order: 5,
    title: "Chiến thắng Bạch Đằng",
    titleEn: "Victory of Bach Dang",
    sectionId: "medieval",
    x: 20,
    y: 44,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnail: "",
    description: "Chiến thắng Bạch Đằng là một dấu mốc quan trọng trong lịch sử chống ngoại xâm của dân tộc Việt Nam.",
    descriptionEn:
      "The victory at Bach Dang was an important milestone in the Vietnamese people's history of resisting foreign invaders.",
    funFact: "Chiến công này gắn liền với sự sáng tạo trong chiến thuật quân sự và lòng yêu nước của nhân dân.",
    funFactEn:
      "This achievement is tied to creative military tactics and the patriotism of the people.",
  },
  {
    id: "medieval-03",
    order: 6,
    title: "Triều Lý & Trần",
    titleEn: "Ly and Tran Dynasties",
    sectionId: "medieval",
    x: 68,
    y: 52,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnail: "",
    description: "Triều Lý và Trần là hai thời kỳ rực rỡ trong lịch sử Việt Nam, nổi tiếng với việc xây dựng đất nước và phát triển văn hóa.",
    descriptionEn:
      "The Ly and Tran dynasties were two brilliant periods in Vietnamese history, famous for nation-building and cultural development.",
    funFact: "Những triều đại này để lại nhiều công trình kiến trúc và bản sắc văn hóa sâu sắc.",
    funFactEn: "These dynasties left behind many architectural works and a profound cultural identity.",
  },
  {
    id: "medieval-04",
    order: 7,
    title: "Văn miếu Quốc Tử Giám",
    titleEn: "Temple of Literature",
    sectionId: "medieval",
    x: 15,
    y: 62,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnail: "",
    description: "Văn miếu Quốc Tử Giám là trung tâm học thuật và giáo dục nổi tiếng, thể hiện giá trị của nền văn minh Việt Nam.",
    descriptionEn:
      "The Temple of Literature was a renowned center of scholarship and education, embodying the values of Vietnamese civilization.",
    funFact: "Nơi đây từng là biểu tượng cho sự tôn trọng tri thức và những thế hệ học trò tài năng.",
    funFactEn:
      "It was once a symbol of respect for knowledge and generations of talented scholars.",
  },
  {
    id: "early-modern-01",
    order: 8,
    title: "Lá cờ \"Bình dân học vụ\"",
    titleEn: "Flag of the Popular Education Movement",
    sectionId: "early-modern",
    x: 62,
    y: 70,
    videoSource: "https://drive.google.com/uc?export=download&id=1ciNnXvFb49osyY9M4U298YG_TW3ElN1T",
    thumbnail: "",
    description: "Lá cờ Bình dân học vụ gắn liền với phong trào giáo dục dân tộc và ý chí đổi mới tri thức.",
    descriptionEn:
      "The Popular Education flag is linked to the national education movement and the will to renew knowledge.",
    funFact: "Biểu tượng này nhắc đến một thời kỳ mà giáo dục trở thành công cụ nâng cao dân trí.",
    funFactEn:
      "This symbol recalls an era when education became a tool for raising public literacy.",
  },
  {
    id: "early-modern-02",
    order: 9,
    title: "Khăn len quàng cổ của Mary Luois",
    titleEn: "Mary Louis's Woolen Scarf",
    sectionId: "early-modern",
    x: 22,
    y: 80,
    videoSource: "https://drive.google.com/uc?export=download&id=12Tf1bH7wHdWXFEfQmdgN3wVn_R1NaR60",
    thumbnail: "",
    description: "Khăn len quàng cổ của Mary Luois là một hiện vật mang dấu ấn thời trang và giao lưu văn hóa quốc tế.",
    descriptionEn:
      "Mary Louis's woolen scarf is an artifact bearing the mark of fashion and international cultural exchange.",
    funFact: "Đồ vật này cho thấy sự kết nối giữa phong cách cá nhân và những thay đổi xã hội trong giai đoạn lịch sử.",
    funFactEn:
      "This object shows the connection between personal style and the social changes of that historical period.",
  },
  {
    id: "early-modern-03",
    order: 10,
    title: "Tác phẩm \"Bản án chế độ thực dân Pháp\"",
    titleEn: "The Work \"French Colonialism on Trial\"",
    sectionId: "early-modern",
    x: 70,
    y: 88,
    videoSource: "https://drive.google.com/uc?export=download&id=1A3sczgdt2q6PVfJv1kX88Qz_SYhPdjNW",
    thumbnail: "",
    description: "Tác phẩm này ghi lại những đau thương và đấu tranh của dân tộc trước áp lực thuộc địa.",
    descriptionEn:
      "This work records the suffering and struggle of the nation under colonial pressure.",
    funFact: "Một sự kiện lịch sử quan trọng này thường được kể lại như lời nhắc về ý chí giữ nước.",
    funFactEn:
      "This important historical work is often retold as a reminder of the will to defend the nation.",
  },
  {
    id: "modern-01",
    order: 11,
    title: "Hồ Chí Minh & độc lập",
    titleEn: "Ho Chi Minh & Independence",
    sectionId: "modern",
    x: 25,
    y: 98,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
    thumbnail: "",
    description: "Hồ Chí Minh là biểu tượng của nền độc lập và tự do, gắn liền với hành trình dựng nước mới của Việt Nam.",
    descriptionEn:
      "Ho Chi Minh is a symbol of independence and freedom, tied to Vietnam's journey of building a new nation.",
    funFact: "Tư tưởng của Bác Hồ vẫn tiếp tục truyền cảm hứng cho nhiều thế hệ hôm nay.",
    funFactEn: "Uncle Ho's ideology continues to inspire generations today.",
  },
  {
    id: "modern-02",
    order: 12,
    title: "Bảo tàng số & tương lai",
    titleEn: "Digital Museum & the Future",
    sectionId: "modern",
    x: 68,
    y: 108,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "",
    description: "Bảo tàng số là một cách mới để lưu trữ, chia sẻ và trải nghiệm di sản văn hóa trong thời đại kỹ thuật số.",
    descriptionEn:
      "The digital museum is a new way to preserve, share, and experience cultural heritage in the digital age.",
    funFact: "Công nghệ giúp nhiều người tiếp cận tri thức bảo tàng mà không cần đến trực tiếp.",
    funFactEn:
      "Technology helps more people access museum knowledge without having to visit in person.",
  },
  {
    id: "modern-03",
    order: 13,
    title: "Hành trình kết nối văn hoá",
    titleEn: "A Journey Connecting Cultures",
    sectionId: "modern",
    x: 30,
    y: 118,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "",
    description: "Hành trình kết nối văn hóa cho thấy cách các di sản truyền thống tiếp tục được lan tỏa đến nhiều thế hệ.",
    descriptionEn:
      "The journey of cultural connection shows how traditional heritage continues to spread across generations.",
    funFact: "Mỗi câu chuyện được kể lại có thể mở ra một kết nối mới giữa quá khứ và hiện tại.",
    funFactEn:
      "Every story retold can open a new connection between the past and the present.",
  },
];
