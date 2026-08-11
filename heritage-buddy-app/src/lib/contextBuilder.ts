import { pickViEn, t } from "@/lib/i18n";
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
      name: t("ctx.museumName"),
      description: t("ctx.museumDesc"),
      funFact: t("ctx.museumFact"),
      section: "",
    };
  }

  const description =
    node.description?.trim() ||
    t("ctx.nodeDescFallback", { section: node.sectionId, order: node.order });
  const funFact = node.funFact?.trim() || t("ctx.nodeFactFallback");

  return {
    name: pickViEn(node.title, node.titleEn),
    description: pickViEn(description, node.descriptionEn),
    funFact: pickViEn(funFact, node.funFactEn),
    section: node.sectionId,
  };
}
