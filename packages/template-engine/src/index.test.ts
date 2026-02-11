import { describe, expect, it } from "vitest";
import { fitAssetsToTemplate, validateTemplateCoverage } from "./index";

describe("template-engine", () => {
  it("assigns assets to template slots", () => {
    const template = {
      id: "tmpl-1",
      name: "Test",
      canvasSize: { width: 1200, height: 1800, dpi: 300 },
      slots: [
        { id: "s1", placement: { x: 0, y: 0, width: 600, height: 800, rotation: 0 }, cornerRadius: 0 },
        { id: "s2", placement: { x: 600, y: 0, width: 600, height: 800, rotation: 0 }, cornerRadius: 0 }
      ],
      safeAreas: [{ x: 0, y: 0, width: 1200, height: 1800, rotation: 0 }],
      printProfileId: "pp-1"
    };

    const fit = fitAssetsToTemplate(template, ["a1"]);
    expect(fit).toHaveLength(2);
    expect(fit[1]?.sourceAssetId).toBe("a1");
  });

  it("validates canvas overflow", () => {
    const template = {
      id: "tmpl-2",
      name: "Out",
      canvasSize: { width: 100, height: 100, dpi: 300 },
      slots: [{ id: "s1", placement: { x: 90, y: 90, width: 20, height: 20, rotation: 0 }, cornerRadius: 0 }],
      safeAreas: [{ x: 0, y: 0, width: 100, height: 100, rotation: 0 }],
      printProfileId: "pp-1"
    };

    const result = validateTemplateCoverage(template);
    expect(result.ok).toBe(false);
  });
});
