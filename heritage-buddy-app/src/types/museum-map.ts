export interface MapNode {
  id: string;
  order: number;
  title: string;
  sectionId: string;
  x: number;
  y: number;
  videoSource: string;
  thumbnail: string;
}

export interface MuseumSection {
  id: string;
  name: string;
  color: string;
}

export type NodeStatus = "locked" | "current" | "completed";
