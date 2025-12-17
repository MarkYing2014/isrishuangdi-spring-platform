import { describe, expect, test } from "vitest";

import type { ArcSpringInput } from "@/lib/arcSpring";
import { getDefaultArcSpringInput } from "@/lib/arcSpring";
import type { CompressionSpringEds } from "@/lib/eds/engineeringDefinition";
import type { ConicalGeometry, ExtensionGeometry, TorsionGeometry } from "@/lib/stores/springDesignStore";
import { calculateConicalSpringNonlinear } from "@/lib/springMath";

import {
  buildArcSpringDesignRuleReport,
  buildCompressionDesignRuleReport,
  buildConicalDesignRuleReport,
  buildExtensionDesignRuleReport,
  buildTorsionDesignRuleReport,
  buildVariablePitchCompressionDesignRuleReport,
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

  test("compression: allowable shear utilization yields FAIL when exceeded", () => {
    const eds: CompressionSpringEds = {
      type: "compression",
      geometry: {
        wireDiameter: { nominal: 2, unit: "mm" },
        meanDiameter: { nominal: 20, unit: "mm" },
        activeCoils: { nominal: 6, unit: "turn" },
        totalCoils: { nominal: 10, unit: "turn" },
        freeLength: { nominal: 60, unit: "mm" },
      },
      material: {
        materialId: "music_wire_a228",
        shearModulus: { nominal: 79300, unit: "MPa" },
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
          freeLength: 60,
          materialId: "music_wire_a228",
        },
        issues: [],
      },
      analysisResult: {
        springRate: 10,
        springRateUnit: "N/mm",
        workingDeflection: 0,
        shearStress: 650, // allowShearStatic for music wire is 560
      },
    });

    expect(report.summary.status).toBe("FAIL");
    expect(report.findings.some((f: DesignRuleFinding) => f.id === "COMP_ALLOW_SHEAR_EXCEEDED")).toBe(true);
    expect(report.metrics.allow_shear_static).toBeDefined();
    expect(report.metrics.shear_utilization).toBeDefined();
  });

  test("compression: natural frequency metric is present when density exists", () => {
    const eds: CompressionSpringEds = {
      type: "compression",
      geometry: {
        wireDiameter: { nominal: 2, unit: "mm" },
        meanDiameter: { nominal: 20, unit: "mm" },
        activeCoils: { nominal: 6, unit: "turn" },
        totalCoils: { nominal: 10, unit: "turn" },
        freeLength: { nominal: 60, unit: "mm" },
      },
      material: {
        materialId: "music_wire_a228",
        shearModulus: { nominal: 79300, unit: "MPa" },
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
          freeLength: 60,
          materialId: "music_wire_a228",
        },
        issues: [],
      },
      analysisResult: {
        springRate: 10,
        springRateUnit: "N/mm",
        workingDeflection: 0,
      },
    });

    expect(report.metrics.natural_freq_hz).toBeDefined();
  });

  test("extension: initial tension window warning when Fi/k too high", () => {
    const geom: ExtensionGeometry = {
      type: "extension",
      wireDiameter: 1.5,
      outerDiameter: 15,
      activeCoils: 10,
      bodyLength: 30,
      initialTension: 30,
      hookType: "machine",
      materialId: "music_wire_a228",
    };

    const report = buildExtensionDesignRuleReport({
      geometry: geom,
      analysisResult: {
        springRate: 1,
        springRateUnit: "N/mm",
        initialTension: 30,
        workingDeflection: 0,
      },
    });

    expect(report.findings.some((f: DesignRuleFinding) => f.id === "EXT_INITIAL_TENSION_WINDOW")).toBe(true);
    expect(report.metrics.pre_extension).toBeDefined();
  });

  test("torsion: arm envelope risk + high angle utilization", () => {
    const geom: TorsionGeometry = {
      type: "torsion",
      wireDiameter: 2,
      meanDiameter: 10,
      activeCoils: 5,
      legLength1: 5,
      legLength2: 5,
      workingAngle: 170,
      materialId: "music_wire_a228",
    };

    const report = buildTorsionDesignRuleReport({
      geometry: geom,
      analysisResult: {
        springRate: 10,
        springRateUnit: "N·mm/deg",
        workingDeflection: 170,
      },
    });

    expect(report.findings.some((f: DesignRuleFinding) => f.id === "TOR_ARM_ENVELOPE_RISK")).toBe(true);
    expect(report.findings.some((f: DesignRuleFinding) => f.id === "TOR_ANGLE_UTILIZATION_HIGH")).toBe(true);
    expect(report.metrics.arm_ratio_min).toBeDefined();
    expect(report.metrics.angle_utilization).toBeDefined();
  });

  test("conical: nonlinear local stiffness info present when curve provided", () => {
    const geom: ConicalGeometry = {
      type: "conical",
      wireDiameter: 2,
      largeOuterDiameter: 30,
      smallOuterDiameter: 15,
      activeCoils: 5,
      totalCoils: 7,
      freeLength: 50,
      endType: "closed_ground",
      materialId: "music_wire_a228",
    };

    const nl = calculateConicalSpringNonlinear({
      wireDiameter: geom.wireDiameter,
      largeOuterDiameter: geom.largeOuterDiameter,
      smallOuterDiameter: geom.smallOuterDiameter,
      activeCoils: geom.activeCoils,
      shearModulus: 79300,
      freeLength: geom.freeLength,
      maxDeflection: 12,
      samplePoints: 20,
    });

    const report = buildConicalDesignRuleReport({
      geometry: geom,
      analysisResult: {
        springRate: 10,
        springRateUnit: "N/mm",
        workingDeflection: 12,
      },
      context: {
        nonlinearResult: nl,
        nonlinearCurve: nl.curve,
      },
    });

    expect(report.findings.some((f: DesignRuleFinding) => f.id === "CON_NONLINEAR_STIFFNESS_INFO")).toBe(true);
    expect(report.metrics.k_local).toBeDefined();
  });

  test("variable-pitch: near contact stage warning when deflection near first contact", () => {
    const report = buildVariablePitchCompressionDesignRuleReport({
      wireDiameter: 2,
      meanDiameter: 20,
      totalCoils: 10,
      freeLength: 40,
      segments: [
        { coils: 2, pitch: 3 }, // spacing=1, cap=2
        { coils: 3, pitch: 5 }, // spacing=3, cap=9
      ],
      context: {
        deflection: 2,
      },
    });

    expect(report.metrics.first_contact_deflection).toBeDefined();
    expect(report.findings.some((f: DesignRuleFinding) => f.id === "VP_NEAR_CONTACT_STAGE")).toBe(true);
  });
});
