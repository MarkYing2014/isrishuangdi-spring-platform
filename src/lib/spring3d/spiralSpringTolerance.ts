import { clampPositive } from "./spiralSpringFormulas";

export type ToleranceEMode = "MPa" | "%";

export function computeToleranceEOverE(params: {
  E0_MPa: number;
  toleranceE: number;
  toleranceEMode: ToleranceEMode;
}): {
  dEOverE: number;
  EMin_MPa: number;
  EMax_MPa: number;
} {
  const { E0_MPa, toleranceE, toleranceEMode } = params;
  const dEOverE =
    toleranceEMode === "%" ? toleranceE / 100 : Math.abs(E0_MPa) > 1e-9 ? toleranceE / E0_MPa : 0;
  const EMin_MPa = clampPositive(E0_MPa * (1 - dEOverE));
  const EMax_MPa = clampPositive(E0_MPa * (1 + dEOverE));
  return { dEOverE, EMin_MPa, EMax_MPa };
}

export function computeSpiralToleranceBand(params: {
  springRateNom_NmmPerDeg: number;
  preloadTorque_Nmm: number;
  thetaMaxUsed_deg: number;
  b_mm: number;
  t_mm: number;
  L_mm: number;
  E0_MPa: number;
  toleranceB_mm: number;
  toleranceT_mm: number;
  toleranceL_mm: number;
  toleranceE: number;
  toleranceEMode: ToleranceEMode;
  samples?: number;
}): {
  kMin: number;
  kMax: number;
  TMaxBandMin: number;
  TMaxBandMax: number;
  torqueBandCurve: Array<{ thetaDeg: number; torqueNom: number; torqueMin: number; torqueMax: number }>;
  EMin_MPa: number;
  EMax_MPa: number;
  dEOverE: number;
} {
  const {
    springRateNom_NmmPerDeg,
    preloadTorque_Nmm,
    thetaMaxUsed_deg,
    b_mm,
    t_mm,
    L_mm,
    E0_MPa,
    toleranceB_mm,
    toleranceT_mm,
    toleranceL_mm,
    toleranceE,
    toleranceEMode,
  } = params;

  const b0 = clampPositive(b_mm);
  const t0 = clampPositive(t_mm);
  const L0 = clampPositive(L_mm);

  const bMin = clampPositive(b0 - toleranceB_mm);
  const bMax = b0 + toleranceB_mm;
  const tMin = clampPositive(t0 - toleranceT_mm);
  const tMax = t0 + toleranceT_mm;
  const LMin = clampPositive(L0 - toleranceL_mm);
  const LMax = L0 + toleranceL_mm;

  const { dEOverE, EMin_MPa, EMax_MPa } = computeToleranceEOverE({ E0_MPa, toleranceE, toleranceEMode });

  const kMin =
    springRateNom_NmmPerDeg *
    (bMin / b0) *
    Math.pow(tMin / t0, 3) *
    (L0 / LMax) *
    (E0_MPa > 0 ? EMin_MPa / E0_MPa : 1);
  const kMax =
    springRateNom_NmmPerDeg *
    (bMax / b0) *
    Math.pow(tMax / t0, 3) *
    (L0 / LMin) *
    (E0_MPa > 0 ? EMax_MPa / E0_MPa : 1);

  const TMaxBandMin = preloadTorque_Nmm + kMin * thetaMaxUsed_deg;
  const TMaxBandMax = preloadTorque_Nmm + kMax * thetaMaxUsed_deg;

  const curveSamples = params.samples ?? 100;
  const torqueBandCurve = Array.from({ length: curveSamples }, (_, i) => {
    const alpha = curveSamples <= 1 ? 0 : i / (curveSamples - 1);
    const thetaDeg = thetaMaxUsed_deg * alpha;
    return {
      thetaDeg,
      torqueNom: preloadTorque_Nmm + springRateNom_NmmPerDeg * thetaDeg,
      torqueMin: preloadTorque_Nmm + kMin * thetaDeg,
      torqueMax: preloadTorque_Nmm + kMax * thetaDeg,
    };
  });

  return { kMin, kMax, TMaxBandMin, TMaxBandMax, torqueBandCurve, EMin_MPa, EMax_MPa, dEOverE };
}
