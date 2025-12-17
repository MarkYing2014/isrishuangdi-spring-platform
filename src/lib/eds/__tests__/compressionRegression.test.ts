import { describe, expect, test } from "vitest";

import { calculateLoadAndStress } from "@/lib/springMath";
import type { CompressionSpringDesign } from "@/lib/springTypes";
import { buildCompressionSpringGeometry } from "@/lib/spring3d/compressionSpringGeometry";

import type { CompressionSpringEds } from "@/lib/eds/engineeringDefinition";
import { resolveCompressionNominal } from "@/lib/eds/compressionResolver";
import { toEdsFromLegacyForm, toLegacyInputsFromEds } from "@/lib/eds/legacyAdapters";
import { useSpringDesignStore } from "@/lib/stores/springDesignStore";

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

describe("EDS compression regression", () => {
  test("same nominal -> same formula outputs; tolerance does not modify geometry", () => {
    const nominal: CompressionSpringDesign = {
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
    const baseline = calculateLoadAndStress(nominal, dx);

    const eds: CompressionSpringEds = {
      type: "compression",
      geometry: {
        wireDiameter: { nominal: nominal.wireDiameter, unit: "mm", tolerance: { plus: 0.02, minus: 0 } },
        meanDiameter: { nominal: nominal.meanDiameter, unit: "mm", tolerance: { plus: 0.1, minus: 0.1 } },
        activeCoils: { nominal: nominal.activeCoils, unit: "turn" },
        totalCoils: { nominal: nominal.totalCoils ?? 0, unit: "turn" },
        freeLength: { nominal: nominal.freeLength ?? 0, unit: "mm", tolerance: { plus: 0.5, minus: 0.5 } },
      },
      material: {
        materialId: nominal.materialId,
        shearModulus: { nominal: nominal.shearModulus, unit: "MPa", tolerance: { plus: 0, minus: 0 } },
      },
      flags: {
        topGround: nominal.topGround,
        bottomGround: nominal.bottomGround,
      },
      quality: {
        inspectionLevel: "V1",
      },
      process: {
        route: "V1",
      },
    };

    const resolved = resolveCompressionNominal(eds);
    expect(resolved.issues.length).toBe(0);

    const viaEds = calculateLoadAndStress(resolved.design, dx);
    expect(viaEds.k).toBeCloseTo(baseline.k, 10);
    expect(viaEds.load).toBeCloseTo(baseline.load, 10);
    expect(viaEds.shearStress).toBeCloseTo(baseline.shearStress, 10);
    expect(viaEds.springIndex).toBeCloseTo(baseline.springIndex, 10);
    expect(viaEds.wahlFactor).toBeCloseTo(baseline.wahlFactor, 10);

    const p0 = {
      totalCoils: nominal.totalCoils ?? 0,
      activeCoils: nominal.activeCoils,
      meanDiameter: nominal.meanDiameter,
      wireDiameter: nominal.wireDiameter,
      freeLength: nominal.freeLength ?? 0,
      currentDeflection: dx,
      scale: 1,
    };

    const p1 = {
      totalCoils: resolved.design.totalCoils ?? 0,
      activeCoils: resolved.design.activeCoils,
      meanDiameter: resolved.design.meanDiameter,
      wireDiameter: resolved.design.wireDiameter,
      freeLength: resolved.design.freeLength ?? 0,
      currentDeflection: dx,
      scale: 1,
    };

    const g0 = buildCompressionSpringGeometry(p0, baseline.k);
    const g1 = buildCompressionSpringGeometry(p1, viaEds.k);

    expect(geometrySummary(g1)).toEqual(geometrySummary(g0));

    g0.tubeGeometry.dispose();
    g1.tubeGeometry.dispose();
  });

  test("adapter round-trip keeps nominal values", () => {
    const legacy = {
      wireDiameter: 3.2,
      meanDiameter: 24,
      activeCoils: 8,
      totalCoils: 10,
      shearModulus: 79300,
      freeLength: 50,
      topGround: true,
      bottomGround: true,
      materialId: "music_wire_a228" as const,
    };

    const eds = toEdsFromLegacyForm(legacy);
    const legacy2 = toLegacyInputsFromEds(eds);

    expect(legacy2.wireDiameter).toBeCloseTo(legacy.wireDiameter, 12);
    expect(legacy2.meanDiameter).toBeCloseTo(legacy.meanDiameter, 12);
    expect(legacy2.activeCoils).toBeCloseTo(legacy.activeCoils, 12);
    expect(legacy2.totalCoils).toBeCloseTo(legacy.totalCoils, 12);
    expect(legacy2.shearModulus).toBeCloseTo(legacy.shearModulus, 12);
    expect(legacy2.freeLength).toBeCloseTo(legacy.freeLength ?? 0, 12);
    expect(legacy2.topGround).toBe(legacy.topGround);
    expect(legacy2.bottomGround).toBe(legacy.bottomGround);
    expect(legacy2.materialId).toBe(legacy.materialId);
  });

  test("store setDesign backfills eds+resolved for compression; tolerance/quality/process do not change nominal geometry", () => {
    useSpringDesignStore.getState().clear();

    const geometry = {
      type: "compression" as const,
      wireDiameter: 3.2,
      meanDiameter: 24,
      activeCoils: 8,
      totalCoils: 10,
      freeLength: 50,
      topGround: true,
      bottomGround: true,
      shearModulus: 79300,
      materialId: "music_wire_a228" as const,
    };

    const material = {
      id: "music_wire_a228" as const,
      name: "Music Wire",
      shearModulus: 79300,
      elasticModulus: 200000,
      density: 7850,
    };

    const analysisResult = {
      springRate: 0,
      springRateUnit: "N/mm" as const,
      workingDeflection: 10,
      maxDeflection: 10,
    };

    useSpringDesignStore.getState().setDesign({
      springType: "compression",
      geometry,
      material,
      analysisResult,
      meta: { designCode: "T" },
    });

    const s0 = useSpringDesignStore.getState();
    expect(s0.eds).not.toBeNull();
    expect(s0.eds?.type).toBe("compression");
    expect(s0.resolved?.type).toBe("compression");

    const nominalGeom0 = s0.geometry;
    if (!nominalGeom0 || nominalGeom0.type !== "compression") throw new Error("missing compression geometry");

    const g0 = buildCompressionSpringGeometry(
      {
        totalCoils: nominalGeom0.totalCoils,
        activeCoils: nominalGeom0.activeCoils,
        meanDiameter: nominalGeom0.meanDiameter,
        wireDiameter: nominalGeom0.wireDiameter,
        freeLength: nominalGeom0.freeLength,
        currentDeflection: analysisResult.workingDeflection,
        scale: 1,
      },
      s0.analysisResult?.springRate ?? 0
    );

    const summary0 = geometrySummary(g0);
    g0.tubeGeometry.dispose();

    const edsWithExtra: CompressionSpringEds = {
      ...(s0.eds as CompressionSpringEds),
      geometry: {
        ...(s0.eds as CompressionSpringEds).geometry,
        wireDiameter: {
          ...(s0.eds as CompressionSpringEds).geometry.wireDiameter,
          tolerance: { plus: 0.02, minus: 0 },
        },
      },
      quality: { ppap: "reserved" },
      process: { route: "reserved" },
    };

    useSpringDesignStore.getState().setEds(edsWithExtra);
    const s1 = useSpringDesignStore.getState();

    const nominalGeom1 = s1.geometry;
    if (!nominalGeom1 || nominalGeom1.type !== "compression") throw new Error("missing compression geometry");

    const g1 = buildCompressionSpringGeometry(
      {
        totalCoils: nominalGeom1.totalCoils,
        activeCoils: nominalGeom1.activeCoils,
        meanDiameter: nominalGeom1.meanDiameter,
        wireDiameter: nominalGeom1.wireDiameter,
        freeLength: nominalGeom1.freeLength,
        currentDeflection: analysisResult.workingDeflection,
        scale: 1,
      },
      s1.analysisResult?.springRate ?? 0
    );

    const summary1 = geometrySummary(g1);
    g1.tubeGeometry.dispose();

    expect(summary1).toEqual(summary0);
  });
});
