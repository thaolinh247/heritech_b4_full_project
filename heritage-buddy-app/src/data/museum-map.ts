import type { MapNode, MuseumSection } from "@/types/museum-map";

export const MAP_Y_SPACING = 10;

export function yToPx(y: number): number {
  return y * MAP_Y_SPACING;
}

export function getMaxNodeY(): number {
  return Math.max(...MUSEUM_NODES.map((n) => n.y));
}

export const MUSEUM_SECTIONS: MuseumSection[] = [
  { id: "ancient", name: "Khu Cổ đại", color: "#E8935E" },
  { id: "medieval", name: "Khu Trung đại", color: "#2E8B7E" },
  { id: "early-modern", name: "Khu Cận đại", color: "#E85D4E" },
  { id: "modern", name: "Khu Hiện đại", color: "#7A5233" },
];

export const MUSEUM_NODES: MapNode[] = [
  {
    id: "ancient-01",
    order: 1,
    title: "Bức tượng chân dung Chủ tịch Hồ Chí Minh",
    sectionId: "ancient",
    x: 22,
    y: 6,
    videoSource: "https://drive.google.com/uc?export=download&id=1BVLYXbK_THS2JpiE218LWA0PiRrNL8lJ",
    thumbnail: "",
  },
  {
    id: "ancient-02",
    order: 2,
    title: "Trống đồng Đông Sơn",
    sectionId: "ancient",
    x: 72,
    y: 14,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "",
  },
  {
    id: "ancient-03",
    order: 3,
    title: "Văn hoá Sa Huỳnh",
    sectionId: "ancient",
    x: 18,
    y: 24,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: "",
  },
  {
    id: "medieval-01",
    order: 4,
    title: "Thời kỳ Bắc thuộc",
    sectionId: "medieval",
    x: 65,
    y: 33,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: "",
  },
  {
    id: "medieval-02",
    order: 5,
    title: "Chiến thắng Bạch Đằng",
    sectionId: "medieval",
    x: 20,
    y: 44,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnail: "",
  },
  {
    id: "medieval-03",
    order: 6,
    title: "Triều Lý & Trần",
    sectionId: "medieval",
    x: 68,
    y: 52,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnail: "",
  },
  {
    id: "medieval-04",
    order: 7,
    title: "Văn miếu Quốc Tử Giám",
    sectionId: "medieval",
    x: 15,
    y: 62,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnail: "",
  },
  {
    id: "early-modern-01",
    order: 8,
    title: "Lá cờ \"Bình dân học vụ\"",
    sectionId: "early-modern",
    x: 62,
    y: 70,
    videoSource: "https://drive.google.com/uc?export=download&id=1ciNnXvFb49osyY9M4U298YG_TW3ElN1T",
    thumbnail: "",
  },
  {
    id: "early-modern-02",
    order: 9,
    title: "Khăn len quàng cổ của Mary Luois",
    sectionId: "early-modern",
    x: 22,
    y: 80,
    videoSource: "https://drive.google.com/uc?export=download&id=12Tf1bH7wHdWXFEfQmdgN3wVn_R1NaR60",
    thumbnail: "",
  },
  {
    id: "early-modern-03",
    order: 10,
    title: "Tác phẩm \"Bản án chế độ thực dân Pháp\"",
    sectionId: "early-modern",
    x: 70,
    y: 88,
    videoSource: "https://drive.google.com/uc?export=download&id=1A3sczgdt2q6PVfJv1kX88Qz_SYhPdjNW",
    thumbnail: "",
  },
  {
    id: "modern-01",
    order: 11,
    title: "Hồ Chí Minh & độc lập",
    sectionId: "modern",
    x: 25,
    y: 98,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
    thumbnail: "",
  },
  {
    id: "modern-02",
    order: 12,
    title: "Bảo tàng số & tương lai",
    sectionId: "modern",
    x: 68,
    y: 108,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "",
  },
  {
    id: "modern-03",
    order: 13,
    title: "Hành trình kết nối văn hoá",
    sectionId: "modern",
    x: 30,
    y: 118,
    videoSource: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "",
  },
];
