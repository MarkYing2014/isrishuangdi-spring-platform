import type { MaterialInfo } from "@/lib/stores/springDesignStore";
import {

  computeEndKt,
  nominalStressAtTorque_MPa,
  type EndKtType,
} from "./spiralSpringFormulas";
import { computeFatigueCriteriaFoS } from "./spiralSpringFatigue";
import { computeSpiralToleranceBand, type ToleranceEMode } from "./spiralSpringTolerance";
import { buildCloseoutCurves } from "./spiralSpringCloseout";
import {
  adjustSpiralStrengthByThicknessAndHeatTreatment,
  getSpiralSpringMaterial,
  reliabilityFactor,
  shotPeenFactor,
  surfaceFinishFactor,
  type SpiralHeatTreatment,
  type SpiralReliability,
  type SpiralStrengthBasis,
  type SpiralSpringMaterial,
  type SpiralSurfaceFinish,
} from "./spiralSpringMaterials";
import { reviewSpiralDesign } from "./spiralSpringReview";

export type SpiralSpringAdvancedAnalysisParams = {
  springRate_NmmPerDeg: number;
  preloadTorque_Nmm: number;
  minTorque_Nmm: number;
  maxTorque_Nmm: number;

  b_mm: number;
  t_mm: number;
  L_mm: number;

  thetaMaxUsed_deg: number;
  closeOutAngle_deg: number;
  maxWorkingAngle_deg: number;

  material: MaterialInfo;
  materialFactors?: {
    surfaceFactor?: number;
    tempFactor?: number;
    sizeFactor?: number;
  };

  endKt: {
    innerEndKtType: EndKtType;
    outerEndKtType: EndKtType;
    innerKtOverride?: number | null;
    outerKtOverride?: number | null;
  };

  tolerance: {
    toleranceT_mm: number;
    toleranceB_mm: number;
    toleranceL_mm: number;
    toleranceE: number;
    toleranceEMode: ToleranceEMode;
  };

  closeout: {
    enableNonlinearCloseout: boolean;
    thetaContactStartDeg: number;
    hardeningA: number;
    hardeningP: number;
    hardeningFactorLegacy: number;
  };

  engineeringMaterial?: {
    materialId: SpiralSpringMaterial["id"];
    surface: SpiralSurfaceFinish;
    reliability: SpiralReliability;
    shotPeened: boolean;
    strengthBasis?: SpiralStrengthBasis;
    heatTreatment?: SpiralHeatTreatment;
  };
};

export function computeSpiralSpringAdvancedDerived(p: SpiralSpringAdvancedAnalysisParams) {
  const inputMessages: string[] = [];
  if (!isFinite(p.b_mm) || p.b_mm <= 0) inputMessages.push("Invalid input: b must be > 0");
  if (!isFinite(p.t_mm) || p.t_mm <= 0) inputMessages.push("Invalid input: t must be > 0");
  if (!isFinite(p.L_mm) || p.L_mm <= 0) inputMessages.push("Invalid input: L must be > 0");
  if (!isFinite(p.closeOutAngle_deg) || p.closeOutAngle_deg <= 0) inputMessages.push("Invalid input: thetaCo must be > 0");
  if (
    isFinite(p.closeout.thetaContactStartDeg) &&
    isFinite(p.closeOutAngle_deg) &&
    p.closeOutAngle_deg > 0 &&
    p.closeout.thetaContactStartDeg > p.closeOutAngle_deg
  ) {
    inputMessages.push("Invalid input: thetaContactStart must be <= thetaCo");
  }

  const { innerKt, outerKt, governingKt } = computeEndKt({
    innerEndKtType: p.endKt.innerEndKtType,
    outerEndKtType: p.endKt.outerEndKtType,
    innerKtOverride: p.endKt.innerKtOverride,
    outerKtOverride: p.endKt.outerKtOverride,
  });

  const sigmaNomMin = nominalStressAtTorque_MPa(p.minTorque_Nmm, p.b_mm, p.t_mm);
  const sigmaNomMax = nominalStressAtTorque_MPa(p.maxTorque_Nmm, p.b_mm, p.t_mm);
  const sigmaMin = governingKt * sigmaNomMin;
  const sigmaMax = governingKt * sigmaNomMax;

  const stressType = "bending_normal" as const;
  const sigmaVM = Math.abs(sigmaMax);

  const Ks = p.materialFactors?.surfaceFactor ?? 1;
  const Kt = p.materialFactors?.tempFactor ?? 1;
  const Ksize = p.materialFactors?.sizeFactor ?? 1;

  const engMat = p.engineeringMaterial ? getSpiralSpringMaterial(p.engineeringMaterial.materialId) : undefined;
  const kSurface = p.engineeringMaterial ? surfaceFinishFactor(p.engineeringMaterial.surface) : null;
  const kReliability = p.engineeringMaterial ? reliabilityFactor(p.engineeringMaterial.reliability) : null;
  const kPeen = p.engineeringMaterial ? shotPeenFactor(p.engineeringMaterial.shotPeened) : null;

  const shotPeenAssumptions = p.engineeringMaterial?.shotPeened
    ? [
      "Shot peening is modeled as an endurance-limit multiplier only (k_peen applied to Se').",
      "Residual stress and mean-stress shift are not explicitly modeled.",
    ]
    : [];

  const strengthAdj = p.engineeringMaterial
    ? adjustSpiralStrengthByThicknessAndHeatTreatment({
      materialId: p.engineeringMaterial.materialId,
      thickness_mm: p.t_mm,
      basis: p.engineeringMaterial.strengthBasis ?? "nominal",
      heatTreatment: p.engineeringMaterial.heatTreatment ?? "default",
    })
    : null;

  const SuUsed =
    strengthAdj?.SuUsed_MPa ?? engMat?.ultimateStrength_MPa ?? p.material.tensileStrength ?? null;
  const SyUsed =
    strengthAdj?.SyUsed_MPa ?? engMat?.yieldStrength_MPa ?? (SuUsed ? 0.7 * SuUsed : null);
  const SePrimeUsed =
    strengthAdj?.SePrimeUsed_MPa ?? engMat?.SePrime_MPa ?? (SuUsed ? 0.5 * SuUsed : null);
  const Se =
    SePrimeUsed && kSurface !== null && kReliability !== null && kPeen !== null
      ? SePrimeUsed * kSurface * kReliability * kPeen
      : SuUsed
        ? 0.5 * SuUsed * Ks * Kt * Ksize
        : null;

  const fatigue = computeFatigueCriteriaFoS({
    sigmaMin_MPa: sigmaMin,
    sigmaMax_MPa: sigmaMax,
    Su_MPa: SuUsed,
    Sy_MPa: SyUsed,
    Se_MPa: Se,
  });

  const tol = computeSpiralToleranceBand({
    springRateNom_NmmPerDeg: p.springRate_NmmPerDeg,
    preloadTorque_Nmm: p.preloadTorque_Nmm,
    thetaMaxUsed_deg: p.thetaMaxUsed_deg,
    b_mm: p.b_mm,
    t_mm: p.t_mm,
    L_mm: p.L_mm,
    E0_MPa: p.material.elasticModulus,
    toleranceB_mm: p.tolerance.toleranceB_mm,
    toleranceT_mm: p.tolerance.toleranceT_mm,
    toleranceL_mm: p.tolerance.toleranceL_mm,
    toleranceE: p.tolerance.toleranceE,
    toleranceEMode: p.tolerance.toleranceEMode,
  });

  const closeout = buildCloseoutCurves({
    preloadTorque_Nmm: p.preloadTorque_Nmm,
    springRate_NmmPerDeg: p.springRate_NmmPerDeg,
    thetaCo_deg: p.closeOutAngle_deg,
    thetaMaxUsed_deg: p.thetaMaxUsed_deg,
    enableNonlinearCloseout: p.closeout.enableNonlinearCloseout,
    thetaContactStart_deg: p.closeout.thetaContactStartDeg,
    hardeningA: p.closeout.hardeningA,
    hardeningP: p.closeout.hardeningP,
    hardeningFactorLegacy: p.closeout.hardeningFactorLegacy,
  });

  const deltaBeyond = Math.max(0, p.maxWorkingAngle_deg - p.closeOutAngle_deg);
  const closeOutTorque = p.preloadTorque_Nmm + p.springRate_NmmPerDeg * p.closeOutAngle_deg;
  const maxTorqueHardening =
    deltaBeyond > 0
      ? closeOutTorque + p.springRate_NmmPerDeg * p.closeout.hardeningFactorLegacy * deltaBeyond
      : null;

  const sensitivity = {
    t: 3,
    b: 1,
    L: 1,
  };

  const review = reviewSpiralDesign({
    sigmaMax_MPa: sigmaMax,
    Sy_MPa: SyUsed,
    fatigueSF: fatigue.goodmanFoS,
    thetaMax_deg: p.maxWorkingAngle_deg,
    thetaCo_deg: p.closeOutAngle_deg,
    stripWidth_mm: p.b_mm,
    stripThickness_mm: p.t_mm,
  });

  const reviewWithInputs = {
    ...review,
    messages: inputMessages.length ? [...inputMessages, ...review.messages] : review.messages,
  };

  return {
    innerKt,
    outerKt,
    governingKt,
    sigmaNomMin,
    sigmaNomMax,
    sigmaMin,
    sigmaMax,
    sigmaVM,
    stressType,
    sigmaA: fatigue.sigmaA_MPa,
    sigmaM: fatigue.sigmaM_MPa,
    Se,
    SePrime: SePrimeUsed,
    Su: SuUsed,
    Sy: SyUsed,
    kSurface,
    kReliability,
    kPeen,
    shotPeenAssumptions,
    strengthBasis: p.engineeringMaterial?.strengthBasis ?? "nominal",
    heatTreatment: p.engineeringMaterial?.heatTreatment ?? "default",
    kThickness: strengthAdj?.thicknessFactor ?? 1,
    kHeatTreatment: strengthAdj?.heatTreatmentFactor ?? 1,
    strengthAssumptions: strengthAdj?.assumptions ?? [],
    fatigueSafetyFactor: fatigue.goodmanFoS,
    fatigueCriteria: {
      goodman: fatigue.goodmanFoS,
      gerber: fatigue.gerberFoS,
      soderberg: fatigue.soderbergFoS,
    },
    review: reviewWithInputs,
    kMin: tol.kMin,
    kMax: tol.kMax,
    TMaxBandMin: tol.TMaxBandMin,
    TMaxBandMax: tol.TMaxBandMax,
    EMin: tol.EMin_MPa,
    EMax: tol.EMax_MPa,
    dEOverE: tol.dEOverE,
    torqueBandCurve: tol.torqueBandCurve,
    curveCloseoutLinear: closeout.curveCloseoutLinear,
    curveCloseoutNonlinear: closeout.curveCloseoutNonlinear,
    thetaContactStartUsed: closeout.thetaContactStartUsed_deg,
    nonlinearTorqueAtMax: closeout.nonlinearTorqueAtMax ?? null,
    maxTorqueHardening,
    sensitivity,
  };
}
