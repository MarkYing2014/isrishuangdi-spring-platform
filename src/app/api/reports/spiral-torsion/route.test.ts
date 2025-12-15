import { describe, expect, test } from "vitest";

import { NextRequest } from "next/server";

import type { AnalysisResult, MaterialInfo, SpiralTorsionGeometry } from "@/lib/stores/springDesignStore";
import { computeSpiralSpringAdvancedDerived } from "@/lib/spring3d/spiralSpringAnalysis";
import { buildSpiralReportModel } from "@/lib/reports/SpiralSpringReportTemplate";

import { POST } from "./route";

describe("/api/reports/spiral-torsion", () => {
  test("returns application/pdf with non-empty bytes", async () => {
    const geometry: SpiralTorsionGeometry = {
      type: "spiralTorsion",
      stripWidth: 10,
      stripThickness: 0.8,
      activeLength: 120,
      innerDiameter: 10,
      outerDiameter: 50,
      activeCoils: 6,
      preloadAngle: 0,
      minWorkingAngle: 0,
      maxWorkingAngle: 100,
      closeOutAngle: 180,
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
      springRate: 2,
      springRateUnit: "N·mm/deg",
      maxStress: 100,
      staticSafetyFactor: 2,
    };

    const derived = computeSpiralSpringAdvancedDerived({
      springRate_NmmPerDeg: 2,
      preloadTorque_Nmm: 10,
      minTorque_Nmm: 10,
      maxTorque_Nmm: 210,
      b_mm: 10,
      t_mm: 0.8,
      L_mm: 120,
      thetaMaxUsed_deg: 100,
      closeOutAngle_deg: 180,
      maxWorkingAngle_deg: 100,
      material: calculatorMaterial,
      materialFactors: { surfaceFactor: 1, tempFactor: 1, sizeFactor: 1 },
      endKt: {
        innerEndKtType: "clamped",
        outerEndKtType: "clamped",
        innerKtOverride: null,
        outerKtOverride: null,
      },
      tolerance: {
        toleranceT_mm: 0.02,
        toleranceB_mm: 0.1,
        toleranceL_mm: 2,
        toleranceE: 0,
        toleranceEMode: "MPa",
      },
      closeout: {
        enableNonlinearCloseout: true,
        thetaContactStartDeg: 120,
        hardeningA: 6,
        hardeningP: 2.5,
        hardeningFactorLegacy: 8,
      },
    });

    const model = buildSpiralReportModel({
      geometry,
      calculatorMaterial,
      analysisResult,
      derived,
      extras: {
        reportMeta: {
          language: "bilingual",
          fatigueCriterion: "goodman",
        },
      },
    });

    const req = new NextRequest("http://localhost/api/reports/spiral-torsion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(model),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toContain("application/pdf");

    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});
