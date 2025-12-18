import { describe, expect, test } from "vitest";

import { calculateLoadAndStress } from "@/lib/springMath";
import type { CompressionSpringDesign } from "@/lib/springTypes";

import { analyzeDataset } from "@/lib/quality/analytics/analyzeDataset";
import { inferMapping } from "@/lib/quality/ingestion/inferMapping";
import { parseCsv } from "@/lib/quality/ingestion/parseCsv";
import type { QualityDataset } from "@/lib/quality/types";

describe("Quality V1 sidecar regression", () => {
  test("running quality analytics does not change spring math outputs", () => {
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

    const csvText = [
      "timestamp,characteristic,value,lsl,usl,unit,lot,machine",
      "2025-01-01 08:00:00,FreeLength,50.02,49.8,50.2,mm,L1,M01",
      "2025-01-01 08:03:00,FreeLength,49.96,49.8,50.2,mm,L1,M01",
      "2025-01-01 08:06:00,FreeLength,50.11,49.8,50.2,mm,L1,M02",
      "2025-01-01 08:09:00,FreeLength,50.18,49.8,50.2,mm,L1,M02",
    ].join("\n");

    const parsed = parseCsv({ text: csvText });
    const mapping = inferMapping(parsed.headers).mapping;

    const dataset: QualityDataset = {
      id: "qds_test",
      name: "test",
      createdAtISO: new Date(0).toISOString(),
      source: { type: "upload", fileName: "test.csv" },
      headers: parsed.headers,
      rows: parsed.rows,
      inferredMapping: mapping,
    };

    const result = analyzeDataset({ dataset, mapping });
    expect(result.datasetId).toBe("qds_test");

    const after = calculateLoadAndStress(nominal, dx);

    expect(after.k).toBeCloseTo(baseline.k, 12);
    expect(after.load).toBeCloseTo(baseline.load, 12);
    expect(after.shearStress).toBeCloseTo(baseline.shearStress, 12);
    expect(after.springIndex).toBeCloseTo(baseline.springIndex, 12);
    expect(after.wahlFactor).toBeCloseTo(baseline.wahlFactor, 12);
  });
});
