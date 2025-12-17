import { describe, expect, test } from "vitest";

import type { ArcSpringInput } from "@/lib/arcSpring";
import { getDefaultArcSpringInput } from "@/lib/arcSpring";
import type { CompressionSpringEds } from "@/lib/eds/engineeringDefinition";

import {
  buildArcSpringDesignRuleReport,
  buildCompressionDesignRuleReport,
} from "@/lib/designRules";
import type { DesignRuleFinding } from "@/lib/designRules/types";

describe("designRules framework", () => {
  test("arc: invalid input yields FAIL and includes error findings", () => {
    const input: ArcSpringInput = {
      ...getDefaultArcSpringInput(),
      d: 0,
    };

    const report = buildArcSpringDesignRuleReport(input, {
      showDeadCoils: true,
      deadCoilsPerEnd: 1,
    });

    expect(report.summary.status).toBe("FAIL");
    expect(report.findings.some((f: DesignRuleFinding) => f.level === "error")).toBe(true);
  });

  test("arc: n high yields WARN", () => {
    const input: ArcSpringInput = {
      ...getDefaultArcSpringInput(),
      n: 40,
    };

    const report = buildArcSpringDesignRuleReport(input, {
      showDeadCoils: false,
    });

    expect(report.summary.status).toBe("WARN");
    expect(report.findings.some((f: DesignRuleFinding) => f.id === "ARC_TURNS_VERY_HIGH")).toBe(true);
  });

  test("compression: missing resolved yields info-only OK", () => {
    const report = buildCompressionDesignRuleReport({
      eds: null,
      resolved: null,
      analysisResult: null,
    });

    expect(report.summary.status).toBe("OK");
    expect(report.findings.some((f: DesignRuleFinding) => f.level === "info")).toBe(true);
  });

  test("compression: coil bind at free length yields FAIL", () => {
    const eds: CompressionSpringEds = {
      type: "compression",
      geometry: {
        wireDiameter: { nominal: 2, unit: "mm" },
        meanDiameter: { nominal: 20, unit: "mm" },
        activeCoils: { nominal: 6, unit: "turn" },
        totalCoils: { nominal: 10, unit: "turn" },
        freeLength: { nominal: 15, unit: "mm" },
      },
      material: {
        materialId: "music_wire_a228",
        shearModulus: { nominal: 79300, unit: "MPa" },
      },
      flags: {
        topGround: true,
        bottomGround: true,
      },
    };

    const report = buildCompressionDesignRuleReport({
      eds,
      resolved: {
        design: {
          type: "compression",
          wireDiameter: 2,
          meanDiameter: 20,
          activeCoils: 6,
          totalCoils: 10,
          shearModulus: 79300,
          freeLength: 15,
          materialId: "music_wire_a228",
          topGround: true,
          bottomGround: true,
        },
        issues: [],
      },
      analysisResult: {
        springRate: 10,
        springRateUnit: "N/mm",
        workingDeflection: 0,
        maxDeflection: 0,
      },
    });

    expect(report.summary.status).toBe("FAIL");
    expect(report.findings.some((f: DesignRuleFinding) => f.level === "error")).toBe(true);
  });
});
