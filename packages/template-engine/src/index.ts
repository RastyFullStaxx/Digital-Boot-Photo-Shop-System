import type { Placement, Template } from "@photobooth/shared-types";

export interface RenderTarget {
  width: number;
  height: number;
}

export interface SlotFitResult {
  slotId: string;
  sourceAssetId: string;
  placement: Placement;
}

export function scalePlacement(placement: Placement, target: RenderTarget, source: RenderTarget): Placement {
  const xScale = target.width / source.width;
  const yScale = target.height / source.height;

  return {
    x: placement.x * xScale,
    y: placement.y * yScale,
    width: placement.width * xScale,
    height: placement.height * yScale,
    rotation: placement.rotation
  };
}

export function fitAssetsToTemplate(template: Template, selectedAssetIds: string[]): SlotFitResult[] {
  if (selectedAssetIds.length === 0) {
    return [];
  }

  return template.slots.map((slot, index) => ({
    slotId: slot.id,
    sourceAssetId: selectedAssetIds[index % selectedAssetIds.length],
    placement: slot.placement
  }));
}

export function isInsideSafeArea(area: Placement, object: Placement): boolean {
  const areaRight = area.x + area.width;
  const areaBottom = area.y + area.height;
  const objRight = object.x + object.width;
  const objBottom = object.y + object.height;

  return object.x >= area.x && object.y >= area.y && objRight <= areaRight && objBottom <= areaBottom;
}

export function validateTemplateCoverage(template: Template): { ok: boolean; reason?: string } {
  if (template.slots.length === 0) {
    return { ok: false, reason: "Template must include at least one slot." };
  }

  const canvas = {
    x: 0,
    y: 0,
    width: template.canvasSize.width,
    height: template.canvasSize.height,
    rotation: 0
  };

  for (const slot of template.slots) {
    if (!isInsideSafeArea(canvas, slot.placement)) {
      return {
        ok: false,
        reason: `Slot ${slot.id} exceeds template canvas bounds.`
      };
    }
  }

  return { ok: true };
}
