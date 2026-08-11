export interface MapNode {
  id: string;
  order: number;
  title: string;
  titleEn: string;
  sectionId: string;
  x: number;
  y: number;
  videoSource: string;
  videoSourceEn?: string;
  thumbnail: string;
  description?: string;
  descriptionEn: string;
  funFact?: string;
  funFactEn: string;
}

export interface MuseumSection {
  id: string;
  name: string;
  nameEn: string;
  color: string;
}

export type NodeStatus = "locked" | "current" | "completed";
