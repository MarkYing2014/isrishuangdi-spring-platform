import { describe, expect, test } from "vitest";

import { NextRequest } from "next/server";

import { calculateLoadAndStress } from "@/lib/springMath";
import { resolveCompressionNominal } from "@/lib/eds/compressionResolver";
import { toEdsFromLegacyForm } from "@/lib/eds/legacyAdapters";
import { buildCompressionPpapReport } from "@/lib/reports/compressionPpapReport";

import { POST } from "./route";

describe("/api/reports/compression-ppap", () => {
  test("returns application/pdf with non-empty bytes", async () => {
    const eds = toEdsFromLegacyForm({
      wireDiameter: 3.2,
      meanDiameter: 24,
      activeCoils: 8,
      totalCoils: 10,
      shearModulus: 79300,
      freeLength: 50,
      topGround: true,
      bottomGround: true,
      materialId: "music_wire_a228",
    });

    const resolved = resolveCompressionNominal(eds);
    const calc = calculateLoadAndStress(resolved.design, 10);

    const model = buildCompressionPpapReport(eds, resolved, {
      springRate: calc.k,
      springRateUnit: "N/mm",
      workingLoad: calc.load,
      workingDeflection: 10,
      maxDeflection: 10,
      shearStress: calc.shearStress,
      springIndex: calc.springIndex,
      wahlFactor: calc.wahlFactor,
    });

    const req = new NextRequest("http://localhost/api/reports/compression-ppap", {
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

  test("returns text/html when format=html", async () => {
    const eds = toEdsFromLegacyForm({
      wireDiameter: 3.2,
      meanDiameter: 24,
      activeCoils: 8,
      totalCoils: 10,
      shearModulus: 79300,
      freeLength: 50,
      topGround: true,
      bottomGround: true,
      materialId: "music_wire_a228",
    });

    const resolved = resolveCompressionNominal(eds);
    const calc = calculateLoadAndStress(resolved.design, 10);

    const model = buildCompressionPpapReport(eds, resolved, {
      springRate: calc.k,
      springRateUnit: "N/mm",
      workingLoad: calc.load,
      workingDeflection: 10,
      maxDeflection: 10,
      shearStress: calc.shearStress,
      springIndex: calc.springIndex,
      wahlFactor: calc.wahlFactor,
    });

    const req = new NextRequest("http://localhost/api/reports/compression-ppap?format=html", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(model),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toContain("text/html");

    const html = await res.text();
    expect(html).toContain("Compression Spring PPAP");
  });
});
