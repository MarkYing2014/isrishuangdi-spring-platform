import { describe, expect, test } from "vitest";

import type { AnalysisResult, MaterialInfo, SpiralTorsionGeometry } from "@/lib/stores/springDesignStore";
import { buildSpiralReportModel } from "./SpiralSpringReportTemplate";
import { generateSpiralReportDraftHTML } from "./SpiralSpringReportDraftHtml";

describe("SpiralSpringReportDraftHtml", () => {
  test("generateSpiralReportDraftHTML returns an HTML document", () => {
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
      extras: {
        reportMeta: {
          fatigueCriterion: "gerber",
        },
      },
      derived: {
        torqueBandCurve: [
          { thetaDeg: 0, torqueNom: 0, torqueMin: 0, torqueMax: 0 },
          { thetaDeg: 100, torqueNom: 100, torqueMin: 90, torqueMax: 110 },
        ],
        curveCloseoutLinear: [
          { thetaDeg: 0, torque: 0 },
          { thetaDeg: 100, torque: 100 },
        ],
        curveCloseoutNonlinear: [
          { thetaDeg: 0, torque: 0 },
          { thetaDeg: 100, torque: 120 },
        ],
        sigmaA: 50,
        sigmaM: 80,
        Se: 300,
        Su: 1000,
        Sy: 800,
        fatigueCriteria: {
          goodman: 1.2,
          gerber: 1.5,
          soderberg: 1.1,
        },
        thetaContactStartUsed: 170,
      },
    });

    const html = generateSpiralReportDraftHTML(model);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Spiral Torsion Report Draft");
    expect(html).toContain("<svg");
    expect(html).toContain("Tmax=");
    expect(html).toContain("thetaMax=");
    expect(html).toContain("SF G=");
    expect(html).toContain("Selected: Gerber");
    expect(html).toContain("Gerber (default)");
  });
});
