import { describe, expect, test } from "vitest";

import { calculateWaveSpring, getDefaultWaveSpringInput, type WaveSpringInput } from "@/lib/waveSpring/math";
import { buildWaveSpringDesignRuleReport } from "@/lib/designRules/waveSpringRules";
import { buildWaveRiskRadar } from "@/lib/riskRadar/builders";

import { calculateLoadAndStress } from "@/lib/springMath";
import type { CompressionSpringDesign } from "@/lib/springTypes";
import { buildCompressionSpringGeometry } from "@/lib/spring3d/compressionSpringGeometry";

function roundN(x: number, n = 6) {
  const k = Math.pow(10, n);
  return Math.round(x * k) / k;
}

function geometrySummary(g: ReturnType<typeof buildCompressionSpringGeometry>) {
  g.tubeGeometry.computeBoundingBox();
  const bb = g.tubeGeometry.boundingBox;

  return {
    posCount: g.tubeGeometry.getAttribute("position")?.count ?? 0,
    idxCount: g.tubeGeometry.getIndex()?.count ?? 0,
    bb: bb
      ? {
          min: [roundN(bb.min.x), roundN(bb.min.y), roundN(bb.min.z)],
          max: [roundN(bb.max.x), roundN(bb.max.y), roundN(bb.max.z)],
        }
      : null,
    endDiscs: {
      bottomPosition: roundN(g.endDiscs.bottomPosition),
      topPosition: roundN(g.endDiscs.topPosition),
      outerRadius: roundN(g.endDiscs.outerRadius),
      innerRadius: roundN(g.endDiscs.innerRadius),
    },
    totalHeight: roundN(g.totalHeight),
  };
}

describe("Wave Spring V1 Calculation", () => {
  test("default input produces valid result", () => {
    const input = getDefaultWaveSpringInput();
    const result = calculateWaveSpring(input);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.travel_mm).toBeGreaterThan(0);
    expect(result.springRate_Nmm).toBeGreaterThan(0);
    expect(result.loadAtWorkingHeight_N).toBeGreaterThan(0);
  });

  test("invalid geometry produces errors", () => {
    const input: WaveSpringInput = {
      units: "mm",
      geometry: {
        id: 30,
        od: 20,
        thickness_t: 0.5,
        radialWall_b: 4,
        turns_Nt: 5,
        wavesPerTurn_Nw: 3,
        freeHeight_Hf: 10,
        workingHeight_Hw: 7,
      },
    };
    const result = calculateWaveSpring(input);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("ID must be < OD"))).toBe(true);
  });

  test("working height >= free height produces error", () => {
    const input: WaveSpringInput = {
      units: "mm",
      geometry: {
        id: 20,
        od: 30,
        thickness_t: 0.5,
        radialWall_b: 4,
        turns_Nt: 5,
        wavesPerTurn_Nw: 3,
        freeHeight_Hf: 10,
        workingHeight_Hw: 12,
      },
    };
    const result = calculateWaveSpring(input);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Working height Hw must be < Free height Hf"))).toBe(true);
  });
});

describe("Wave Spring Design Rules", () => {
  test("valid input produces report with metrics", () => {
    const input = getDefaultWaveSpringInput();
    const result = calculateWaveSpring(input);
    const report = buildWaveSpringDesignRuleReport({ input, result });

    expect(report.metrics).toBeDefined();
    expect(report.metrics["springRate"]).toBeDefined();
    expect(report.metrics["loadAtWorkingHeight"]).toBeDefined();
    expect(report.findings).toBeDefined();
  });

  test("null input produces error finding", () => {
    const report = buildWaveSpringDesignRuleReport({ input: null });

    expect(report.summary.status).toBe("FAIL");
    expect(report.findings.some((f) => f.id === "WAVE_NO_INPUT")).toBe(true);
  });

  test("low spring index produces E2 error", () => {
    const input: WaveSpringInput = {
      units: "mm",
      geometry: {
        id: 18,
        od: 22,
        thickness_t: 0.5,
        radialWall_b: 10,
        turns_Nt: 5,
        wavesPerTurn_Nw: 3,
        freeHeight_Hf: 10,
        workingHeight_Hw: 7,
      },
    };
    const result = calculateWaveSpring(input);
    const report = buildWaveSpringDesignRuleReport({ input, result });

    expect(report.findings.some((f) => f.id === "WAVE_E2_INDEX_LOW")).toBe(true);
  });
});

describe("Wave Spring RiskRadar", () => {
  test("valid input produces radar with correct spring type", () => {
    const input = getDefaultWaveSpringInput();
    const result = calculateWaveSpring(input);
    const radar = buildWaveRiskRadar({ input, result });

    expect(radar.springType).toBe("wave");
    expect(radar.dimensions).toBeDefined();
    expect(radar.dimensions.engineering).toBeDefined();
    expect(radar.dimensions.manufacturing).toBeDefined();
    expect(radar.dimensions.quality).toBeDefined();
  });

  test("findings are classified into correct dimensions", () => {
    const input: WaveSpringInput = {
      units: "mm",
      geometry: {
        id: 18,
        od: 22,
        thickness_t: 0.5,
        radialWall_b: 10,
        turns_Nt: 25,
        wavesPerTurn_Nw: 1,
        freeHeight_Hf: 50,
        workingHeight_Hw: 10,
      },
    };
    const result = calculateWaveSpring(input);
    const radar = buildWaveRiskRadar({ input, result });

    const engFindings = radar.dimensions.engineering.findings;
    const mfgFindings = radar.dimensions.manufacturing.findings;

    expect(engFindings.some((f) => f.ruleId.startsWith("WAVE_E"))).toBe(true);
    expect(mfgFindings.some((f) => f.ruleId.startsWith("WAVE_M"))).toBe(true);
  });
});

describe("Wave Spring does NOT affect other spring types", () => {
  const compressionNominal: CompressionSpringDesign = {
    type: "compression",
    wireDiameter: 3.2,
    meanDiameter: 24,
    activeCoils: 8,
    totalCoils: 10,
    shearModulus: 79300,
    freeLength: 50,
    topGround: true,
    bottomGround: true,
    materialId: "music_wire_a228",
  };

  const dx = 10;

  test("compression spring calculation unchanged after wave spring operations", () => {
    const baselineCalc = calculateLoadAndStress(compressionNominal, dx);

    const waveInput = getDefaultWaveSpringInput();
    calculateWaveSpring(waveInput);
    buildWaveSpringDesignRuleReport({ input: waveInput });
    buildWaveRiskRadar({ input: waveInput });

    const afterWaveCalc = calculateLoadAndStress(compressionNominal, dx);

    expect(roundN(afterWaveCalc.load)).toBe(roundN(baselineCalc.load));
    expect(roundN(afterWaveCalc.shearStress)).toBe(roundN(baselineCalc.shearStress));
    expect(roundN(afterWaveCalc.k)).toBe(roundN(baselineCalc.k));
  });

  test("compression spring 3D geometry unchanged after wave spring operations", () => {
    const springRate = 10;
    const baselineGeom = buildCompressionSpringGeometry({
      wireDiameter: compressionNominal.wireDiameter,
      meanDiameter: compressionNominal.meanDiameter,
      activeCoils: compressionNominal.activeCoils,
      totalCoils: compressionNominal.totalCoils ?? compressionNominal.activeCoils + 2,
      freeLength: compressionNominal.freeLength ?? 50,
      currentDeflection: dx,
      scale: 1,
    }, springRate);
    const baselineSummary = geometrySummary(baselineGeom);

    const waveInput = getDefaultWaveSpringInput();
    calculateWaveSpring(waveInput);
    buildWaveSpringDesignRuleReport({ input: waveInput });
    buildWaveRiskRadar({ input: waveInput });

    const afterWaveGeom = buildCompressionSpringGeometry({
      wireDiameter: compressionNominal.wireDiameter,
      meanDiameter: compressionNominal.meanDiameter,
      activeCoils: compressionNominal.activeCoils,
      totalCoils: compressionNominal.totalCoils ?? compressionNominal.activeCoils + 2,
      freeLength: compressionNominal.freeLength ?? 50,
      currentDeflection: dx,
      scale: 1,
    }, springRate);
    const afterWaveSummary = geometrySummary(afterWaveGeom);

    expect(afterWaveSummary).toEqual(baselineSummary);
  });
});
