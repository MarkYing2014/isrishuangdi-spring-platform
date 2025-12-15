import { describe, expect, test } from "vitest";

import type { AnalysisResult, MaterialInfo, SpiralTorsionGeometry } from "@/lib/stores/springDesignStore";
import { buildSpiralReportModel } from "./SpiralSpringReportTemplate";

describe("SpiralSpringReportTemplate", () => {
  test("buildSpiralReportModel returns draft_v1 model with expected top-level sections", () => {
    const geometry: SpiralTorsionGeometry = {
      type: "spiralTorsion",
      stripWidth: 10,
      stripThickness: 1,
      activeLength: 100,
      innerDiameter: 10,
      outerDiameter: 50,
      activeCoils: 6,
      preloadAngle: 0,
      minWorkingAngle: 0,
      maxWorkingAngle: 100,
      closeOutAngle: 200,
      windingDirection: "cw",
      innerEndType: "fixed",
      outerEndType: "fixed",
      materialId: "music_wire_a228",
    };

    const calculatorMaterial: MaterialInfo = {
      id: "music_wire_a228",
      name: "Music Wire",
      shearModulus: 79000,
      elasticModulus: 200000,
      density: 7850,
      tensileStrength: 2000,
      surfaceFactor: 1,
      tempFactor: 1,
    };

    const analysisResult: AnalysisResult = {
      springRate: 1,
      springRateUnit: "N·mm/deg",
      maxStress: 100,
      staticSafetyFactor: 2,
    };

    const model = buildSpiralReportModel({
      geometry,
      calculatorMaterial,
      analysisResult,
    });

    expect(model.meta.version).toBe("draft_v1");
    expect(model.inputs.geometry.type).toBe("spiralTorsion");
    expect(model.results.fatigue).toBeTruthy();
    expect(model.curves).toBeTruthy();
  });
});
