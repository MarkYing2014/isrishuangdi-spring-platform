import { describe, expect, test } from "vitest";

import { computeFatigueCriteriaFoS, computeGoodmanFatigueFoS } from "./spiralSpringFatigue";
import { computeSpiralToleranceBand } from "./spiralSpringTolerance";
import { buildCloseoutCurves } from "./spiralSpringCloseout";
import { computeSpiralSpringAdvancedDerived } from "./spiralSpringAnalysis";
import { reviewSpiralDesign } from "./spiralSpringReview";

describe("spiralSpringFatigue", () => {
  test("computeGoodmanFatigueFoS computes sigmaA/sigmaM and FoS", () => {
    const r = computeGoodmanFatigueFoS({
      sigmaMin_MPa: 0,
      sigmaMax_MPa: 100,
      Su_MPa: 500,
      Se_MPa: 250,
    });

    expect(r.sigmaA_MPa).toBeCloseTo(50, 8);
    expect(r.sigmaM_MPa).toBeCloseTo(50, 8);
    expect(r.goodmanDen).toBeCloseTo(0.3, 8);
    expect(r.fatigueFoS).toBeCloseTo(1 / 0.3, 8);
  });

  test("computeFatigueCriteriaFoS computes Goodman/Gerber/Soderberg FoS", () => {
    const r = computeFatigueCriteriaFoS({
      sigmaMin_MPa: 0,
      sigmaMax_MPa: 100,
      Se_MPa: 250,
      Su_MPa: 500,
      Sy_MPa: 400,
    });

    // sigmaA=50 sigmaM=50
    expect(r.sigmaA_MPa).toBeCloseTo(50, 8);
    expect(r.sigmaM_MPa).toBeCloseTo(50, 8);

    // Goodman: 50/250 + 50/500 = 0.2 + 0.1 = 0.3
    expect(r.goodmanDen).toBeCloseTo(0.3, 8);
    expect(r.goodmanFoS).toBeCloseTo(1 / 0.3, 8);

    // Gerber: 50/250 + (50/500)^2 = 0.2 + 0.01 = 0.21
    expect(r.gerberDen).toBeCloseTo(0.21, 8);
    expect(r.gerberFoS).toBeCloseTo(1 / 0.21, 8);

    // Soderberg: 50/250 + 50/400 = 0.2 + 0.125 = 0.325
    expect(r.soderbergDen).toBeCloseTo(0.325, 8);
    expect(r.soderbergFoS).toBeCloseTo(1 / 0.325, 8);
  });

  test("computeGoodmanFatigueFoS returns null FoS when material data missing", () => {
    const r = computeGoodmanFatigueFoS({
      sigmaMin_MPa: 0,
      sigmaMax_MPa: 100,
      Su_MPa: null,
      Se_MPa: 250,
    });

    expect(r.fatigueFoS).toBeNull();
    expect(r.goodmanDen).toBeNull();
  });

  test("computeSpiralSpringAdvancedDerived exposes stressType/sigmaVM and reports invalid inputs", () => {
    const derivedOk = computeSpiralSpringAdvancedDerived({
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
      material: {
        id: "music_wire_a228",
        name: "Music Wire",
        shearModulus: 79000,
        elasticModulus: 200000,
        density: 7850,
        tensileStrength: 2000,
        surfaceFactor: 1,
        tempFactor: 1,
      },
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

    expect(derivedOk.stressType).toBe("bending_normal");
    expect(derivedOk.sigmaVM).toBeCloseTo(Math.abs(derivedOk.sigmaMax), 8);
    expect(Number.isFinite(derivedOk.sigmaMax)).toBe(true);

    const derivedBad = computeSpiralSpringAdvancedDerived({
      springRate_NmmPerDeg: 2,
      preloadTorque_Nmm: 10,
      minTorque_Nmm: 10,
      maxTorque_Nmm: 210,
      b_mm: 0,
      t_mm: 0,
      L_mm: 0,
      thetaMaxUsed_deg: 100,
      closeOutAngle_deg: 0,
      maxWorkingAngle_deg: 100,
      material: {
        id: "music_wire_a228",
        name: "Music Wire",
        shearModulus: 79000,
        elasticModulus: 200000,
        density: 7850,
        tensileStrength: 2000,
        surfaceFactor: 1,
        tempFactor: 1,
      },
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
        thetaContactStartDeg: 1,
        hardeningA: 6,
        hardeningP: 2.5,
        hardeningFactorLegacy: 8,
      },
    });

    expect(derivedBad.review.messages.join("\n")).toContain("Invalid input");
    expect(Number.isFinite(derivedBad.sigmaMax)).toBe(true);
  });
});

describe("spiralSpringTolerance", () => {
  test("computeSpiralToleranceBand generates kMin/kMax and torque band curve", () => {
    const r = computeSpiralToleranceBand({
      springRateNom_NmmPerDeg: 10,
      preloadTorque_Nmm: 0,
      thetaMaxUsed_deg: 100,
      b_mm: 10,
      t_mm: 1,
      L_mm: 100,
      E0_MPa: 200000,
      toleranceB_mm: 0.5,
      toleranceT_mm: 0.05,
      toleranceL_mm: 5,
      toleranceE: 10,
      toleranceEMode: "%",
    });

    expect(r.kMin).toBeGreaterThan(0);
    expect(r.kMax).toBeGreaterThan(r.kMin);

    expect(r.dEOverE).toBeCloseTo(0.1, 8);
    expect(r.EMin_MPa).toBeCloseTo(180000, 6);
    expect(r.EMax_MPa).toBeCloseTo(220000, 6);

    expect(r.torqueBandCurve.length).toBe(100);
    expect(r.torqueBandCurve[0].thetaDeg).toBeCloseTo(0, 8);
    expect(r.torqueBandCurve[r.torqueBandCurve.length - 1].thetaDeg).toBeCloseTo(100, 8);
  });
});

describe("spiralSpringCloseout", () => {
  test("buildCloseoutCurves (nonlinear enabled) produces monotonic torque", () => {
    const r = buildCloseoutCurves({
      preloadTorque_Nmm: 0,
      springRate_NmmPerDeg: 1,
      thetaCo_deg: 360,
      thetaMaxUsed_deg: 360,
      enableNonlinearCloseout: true,
      thetaContactStart_deg: 180,
      hardeningA: 1,
      hardeningP: 2,
    });

    expect(r.curveCloseoutLinear.length).toBe(100);
    expect(r.curveCloseoutNonlinear.length).toBe(100);

    for (let i = 1; i < r.curveCloseoutNonlinear.length; i++) {
      expect(r.curveCloseoutNonlinear[i].torque).toBeGreaterThanOrEqual(r.curveCloseoutNonlinear[i - 1].torque);
    }

    const lastLinear = r.curveCloseoutLinear[r.curveCloseoutLinear.length - 1].torque;
    const lastNonlinear = r.curveCloseoutNonlinear[r.curveCloseoutNonlinear.length - 1].torque;
    expect(lastNonlinear).toBeGreaterThanOrEqual(lastLinear);
  });

  test("buildCloseoutCurves (nonlinear disabled) uses legacy hardeningFactor beyond closeout", () => {
    const r = buildCloseoutCurves({
      preloadTorque_Nmm: 10,
      springRate_NmmPerDeg: 2,
      thetaCo_deg: 360,
      thetaMaxUsed_deg: 400,
      enableNonlinearCloseout: false,
      thetaContactStart_deg: 300,
      hardeningA: 6,
      hardeningP: 2.5,
      hardeningFactorLegacy: 8,
    });

    const last = r.curveCloseoutNonlinear[r.curveCloseoutNonlinear.length - 1];
    expect(last.thetaDeg).toBeCloseTo(400, 6);

    const expected = 10 + 2 * 360 + 2 * 8 * (400 - 360);
    expect(last.torque).toBeCloseTo(expected, 6);
  });
});

describe("spiralSpringAnalysis", () => {
  test("computeSpiralSpringAdvancedDerived uses governingKt = max(innerKt, outerKt)", () => {
    const derived = computeSpiralSpringAdvancedDerived({
      springRate_NmmPerDeg: 1,
      preloadTorque_Nmm: 0,
      minTorque_Nmm: 0,
      maxTorque_Nmm: 1000,
      b_mm: 10,
      t_mm: 1,
      L_mm: 100,
      thetaMaxUsed_deg: 360,
      closeOutAngle_deg: 360,
      maxWorkingAngle_deg: 360,
      material: {
        id: "music_wire_a228",
        name: "Music Wire",
        shearModulus: 79000,
        elasticModulus: 200000,
        density: 7850,
        tensileStrength: 2000,
        surfaceFactor: 1,
        tempFactor: 1,
      },
      materialFactors: { surfaceFactor: 1, tempFactor: 1, sizeFactor: 1 },
      endKt: {
        innerEndKtType: "slot",
        outerEndKtType: "clamped",
        innerKtOverride: null,
        outerKtOverride: null,
      },
      tolerance: {
        toleranceT_mm: 0.02,
        toleranceB_mm: 0.1,
        toleranceL_mm: 5,
        toleranceE: 0,
        toleranceEMode: "MPa",
      },
      closeout: {
        enableNonlinearCloseout: true,
        thetaContactStartDeg: 300,
        hardeningA: 6,
        hardeningP: 2.5,
        hardeningFactorLegacy: 8,
      },
    });

    expect(derived.innerKt).toBeCloseTo(1.8, 6);
    expect(derived.outerKt).toBeCloseTo(1.2, 6);
    expect(derived.governingKt).toBeCloseTo(1.8, 6);

    expect(derived.sigmaNomMax).toBeCloseTo(600, 6);
    expect(derived.sigmaMax).toBeCloseTo(1080, 6);

    expect(derived.torqueBandCurve.length).toBe(100);
    expect(derived.curveCloseoutLinear.length).toBe(100);
    expect(derived.curveCloseoutNonlinear.length).toBe(100);
  });

  test("computeSpiralSpringAdvancedDerived can use engineeringMaterial for Se and Su", () => {
    const derived = computeSpiralSpringAdvancedDerived({
      springRate_NmmPerDeg: 1,
      preloadTorque_Nmm: 0,
      minTorque_Nmm: 0,
      maxTorque_Nmm: 1000,
      b_mm: 10,
      t_mm: 1,
      L_mm: 100,
      thetaMaxUsed_deg: 360,
      closeOutAngle_deg: 360,
      maxWorkingAngle_deg: 360,
      material: {
        id: "music_wire_a228",
        name: "Music Wire",
        shearModulus: 79000,
        elasticModulus: 200000,
        density: 7850,
        tensileStrength: 2000,
        surfaceFactor: 1,
        tempFactor: 1,
      },
      materialFactors: { surfaceFactor: 1, tempFactor: 1, sizeFactor: 1 },
      endKt: {
        innerEndKtType: "clamped",
        outerEndKtType: "clamped",
        innerKtOverride: null,
        outerKtOverride: null,
      },
      tolerance: {
        toleranceT_mm: 0,
        toleranceB_mm: 0,
        toleranceL_mm: 0,
        toleranceE: 0,
        toleranceEMode: "MPa",
      },
      closeout: {
        enableNonlinearCloseout: true,
        thetaContactStartDeg: 300,
        hardeningA: 6,
        hardeningP: 2.5,
        hardeningFactorLegacy: 8,
      },
      engineeringMaterial: {
        materialId: "sae1095",
        surface: "as_rolled",
        reliability: 0.95,
        shotPeened: true,
      },
    });

    // SAE1095: Se′=925 MPa, k_surface(as_rolled)=0.8, k_reliability(0.95)=0.9, k_peen(true)=1.15
    expect(derived.SePrime).toBeCloseTo(925, 6);
    expect(derived.kSurface).toBeCloseTo(0.8, 6);
    expect(derived.kReliability).toBeCloseTo(0.9, 6);
    expect(derived.kPeen).toBeCloseTo(1.15, 6);
    expect(derived.Se).toBeCloseTo(925 * 0.8 * 0.9 * 1.15, 6);
    expect(derived.Su).toBeCloseTo(1850, 6);
  });
});

describe("spiralSpringReview", () => {
  test("reviewSpiralDesign RYG thresholds and overall aggregation", () => {
    // staticSF=1.10 => YELLOW, fatigueSF=1.10 => RED, closeoutRatio=0.70 => YELLOW, b/t=10 => GREEN => overall RED
    const r = reviewSpiralDesign({
      sigmaMax_MPa: 100,
      Sy_MPa: 110,
      fatigueSF: 1.1,
      thetaMax_deg: 70,
      thetaCo_deg: 100,
      stripWidth_mm: 10,
      stripThickness_mm: 1,
    });

    expect(r.staticRYG).toBe("YELLOW");
    expect(r.fatigueRYG).toBe("RED");
    expect(r.closeoutRYG).toBe("YELLOW");
    expect(r.geometryRYG).toBe("GREEN");
    expect(r.overall).toBe("RED");
  });

  test("reviewSpiralDesign boundary values yield GREEN", () => {
    // staticSF=1.20 => GREEN, fatigueSF=1.50 => GREEN, closeoutRatio=0.60 => GREEN, b/t=8 => GREEN
    const r = reviewSpiralDesign({
      sigmaMax_MPa: 100,
      Sy_MPa: 120,
      fatigueSF: 1.5,
      thetaMax_deg: 60,
      thetaCo_deg: 100,
      stripWidth_mm: 16,
      stripThickness_mm: 2,
    });

    expect(r.staticRYG).toBe("GREEN");
    expect(r.fatigueRYG).toBe("GREEN");
    expect(r.closeoutRYG).toBe("GREEN");
    expect(r.geometryRYG).toBe("GREEN");
    expect(r.overall).toBe("GREEN");
  });
});
