import Svg, { Path } from "react-native-svg";
import type { MapNode } from "@/types/museum-map";
import { yToPx } from "@/data/museum-map";

interface MapPathProps {
  nodes: MapNode[];
  containerWidth: number;
  containerHeight: number;
}

function nodeToCoords(
  node: MapNode,
  containerWidth: number,
): { x: number; y: number } {
  return {
    x: (node.x / 100) * containerWidth,
    y: yToPx(node.y),
  };
}

export function MapPath({ nodes, containerWidth, containerHeight }: MapPathProps) {
  if (nodes.length < 2) return null;

  const sorted = [...nodes].sort((a, b) => a.order - b.order);
  const points = sorted.map((n) => nodeToCoords(n, containerWidth));

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }

  return (
    <Svg
      width={containerWidth}
      height={containerHeight}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
    >
      <Path
        d={d}
        stroke="#E8935E"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={undefined}
        opacity={0.6}
      />
      {points.slice(0, -1).map((_, i) => {
        const segD = `M ${points[i].x} ${points[i].y} C ${points[i].x} ${(points[i].y + points[i + 1].y) / 2}, ${points[i + 1].x} ${(points[i].y + points[i + 1].y) / 2}, ${points[i + 1].x} ${points[i + 1].y}`;
        return (
          <Path
            key={`segment-${i}`}
            d={segD}
            stroke={i < sorted.length - 1 ? "#2E8B7E" : "#E8935E"}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={0.3}
          />
        );
      })}
    </Svg>
  );
}
