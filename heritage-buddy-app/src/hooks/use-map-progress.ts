import { useCallback, useEffect, useMemo } from "react";
import { MUSEUM_NODES, MUSEUM_SECTIONS } from "@/data/museum-map";
import { useMapProgressStore } from "@/store/map-progress";
import type { NodeStatus, MapNode } from "@/types/museum-map";

export function useMapProgress() {
  const { completedNodeIds, loaded, loadProgress, addCompletedNode, resetProgress } =
    useMapProgressStore();

  useEffect(() => {
    if (!loaded) {
      loadProgress();
    }
  }, [loaded, loadProgress]);

  const sortedNodes = useMemo(
    () => [...MUSEUM_NODES].sort((a, b) => a.order - b.order),
    [],
  );

  const lastCompletedOrder = useMemo(() => {
    if (completedNodeIds.length === 0) return 0;
    const completedNodes = sortedNodes.filter((n) =>
      completedNodeIds.includes(n.id),
    );
    if (completedNodes.length === 0) return 0;
    return Math.max(...completedNodes.map((n) => n.order));
  }, [completedNodeIds, sortedNodes]);

  const currentNode = useMemo(() => {
    return sortedNodes.find((n) => n.order === lastCompletedOrder + 1) ?? null;
  }, [sortedNodes, lastCompletedOrder]);

  const totalCompleted = completedNodeIds.length;
  const totalNodes = sortedNodes.length;

  const getNodeStatus = useCallback(
    (node: MapNode): NodeStatus => {
      if (completedNodeIds.includes(node.id)) return "completed";
      if (node.order === lastCompletedOrder + 1) return "current";
      return "locked";
    },
    [completedNodeIds, lastCompletedOrder],
  );

  const completeNode = useCallback(
    async (id: string) => {
      await addCompletedNode(id);
    },
    [addCompletedNode],
  );

  return {
    nodes: sortedNodes,
    sections: MUSEUM_SECTIONS,
    currentNode,
    totalCompleted,
    totalNodes,
    getNodeStatus,
    completeNode,
    resetProgress,
    loaded,
  };
}
