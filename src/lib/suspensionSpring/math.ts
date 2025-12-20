/**
 * Suspension (Shock) Spring Math
 * 减震器弹簧计算核心
 */

import type { SuspensionSpringInput, SuspensionSpringResult, EndType } from "./types";

export function calculateSuspensionSpring(input: SuspensionSpringInput): SuspensionSpringResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const g = input.geometry;
  const m = input.material;
  const lc = input.loadcase;

  const d = g.wireDiameter_mm;
  const Na = g.activeCoils_Na;
  const Nt = g.totalCoils_Nt ?? (Na + 2);

  // mean diameter calculation
  let Dm: number;
  if (g.meanDiameter_mm != null && g.meanDiameter_mm > 0) {
    Dm = g.meanDiameter_mm;
  } else if (g.od_mm != null && g.id_mm != null) {
    Dm = (g.od_mm + g.id_mm) / 2;
  } else if (g.od_mm != null) {
    Dm = g.od_mm - d;
  } else if (g.id_mm != null) {
    Dm = g.id_mm + d;
  } else {
    Dm = NaN;
  }

  // Derived OD/ID
  const od = Dm + d;
  const id = Dm - d;

  // Validation
  if (!Number.isFinite(Dm) || Dm <= 0) {
    errors.push("Mean diameter is missing or invalid (provide Dm or OD+ID).");
  }
  if (d <= 0) errors.push("Wire diameter must be > 0.");
  if (Na <= 1) errors.push("Active coils must be > 1.");
  if (g.freeLength_Hf_mm <= 0) errors.push("Free length must be > 0.");
  if (lc.rideLoad_N <= 0) errors.push("Ride load must be > 0.");
  if (lc.bumpTravel_mm <= 0) errors.push("Bump travel must be > 0.");

  if (errors.length) return emptyResultWith(errors);

  const Hf = g.freeLength_Hf_mm;
  const margin = lc.solidMargin_mm ?? 3;

  // Spring index
  const C = Dm / d;
  if (C < 4) warnings.push("Spring index C < 4: manufacturing difficulty, high stress concentration.");
  if (C > 20) warnings.push("Spring index C > 20: may be unstable, prone to buckling.");

  const Kw = wahlFactor(C);

  // Spring rate k (N/mm)
  const G = m.shearModulus_G_MPa; // N/mm^2
  const k = (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * Na);

  // Loadcases
  const F0 = lc.preload_N ?? 0;
  const Fr = lc.rideLoad_N;
  const xb = lc.bumpTravel_mm;

  const x0 = F0 / k;
  const xr = Fr / k;
  const Fb = k * xb;

  const Hb_ride = Hf - xr;
  const Hb_bump = Hf - xb;

  // Solid height estimate
  const Hs = Nt * d * solidFactor(g.endType);

  if (Hf <= Hs + margin) {
    errors.push(`Free length too short: Hf (${Hf.toFixed(1)}mm) <= solid height + margin (${(Hs + margin).toFixed(1)}mm).`);
  }
  if (Hb_bump <= Hs + margin) {
    warnings.push(`Bump height (${Hb_bump.toFixed(1)}mm) is near solid height (${Hs.toFixed(1)}mm) - risk of coil bind.`);
  }

  // Stress calculations
  const tauRide = shearStress(Kw, Fr, Dm, d);
  const tauBump = shearStress(Kw, Fb, Dm, d);

  // Shear yield strength approximation: τy ≈ 0.577 × Sy (von Mises)
  const tauAllow = m.yieldStrength_MPa * 0.577;
  const SFride = tauAllow / tauRide;
  const SFbump = tauAllow / tauBump;
  const stressRatio = tauBump / tauAllow;

  if (SFbump < 1.0) {
    errors.push(`Yield safety factor at bump < 1.0 (${SFbump.toFixed(2)}): spring will yield.`);
  } else if (SFbump < 1.2) {
    warnings.push(`Yield safety factor at bump is low (${SFbump.toFixed(2)}): consider stronger material or larger wire.`);
  }

  // Guide checks
  guideChecks(g, od, id, warnings);

  // Buckling check (simplified)
  const slendernessRatio = Hf / Dm;
  if (slendernessRatio > 4 && !g.guide.holeDiameter_mm && !g.guide.rodDiameter_mm) {
    warnings.push(`Slenderness ratio (Hf/Dm = ${slendernessRatio.toFixed(1)}) > 4: buckling risk without guide rod/hole.`);
  }

  // Curve arrays for charts
  const n = 80;
  const xs: number[] = [];
  const Fs: number[] = [];
  const taus: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = (xb * i) / n;
    const F = k * x;
    xs.push(x);
    Fs.push(F);
    taus.push(shearStress(Kw, F, Dm, d));
  }

  // Dynamics (optional)
  let dynamics: SuspensionSpringResult["dynamics"] | undefined;
  if (lc.cornerMass_kg && lc.cornerMass_kg > 0) {
    const MR = lc.motionRatio ?? 1;
    const wheelRate = k * MR * MR;
    const m_kg = lc.cornerMass_kg;
    // N/mm -> N/m: *1000
    const wn = Math.sqrt((wheelRate * 1000) / m_kg);
    const fn = wn / (2 * Math.PI);
    dynamics = { wheelRate_N_per_mm: wheelRate, naturalFreq_Hz: fn };

    // Frequency check
    if (lc.targetFreq_Hz && Math.abs(fn - lc.targetFreq_Hz) > 0.5) {
      warnings.push(`Natural frequency (${fn.toFixed(2)} Hz) differs from target (${lc.targetFreq_Hz} Hz).`);
    }
  }

  return {
    errors,
    warnings,
    derived: {
      meanDiameter_mm: Dm,
      springIndex_C: C,
      totalCoils_Nt: Nt,
      solidHeight_Hs_mm: Hs,
      od_mm: od,
      id_mm: id,
    },
    springRate_N_per_mm: k,
    preloadDeflection_mm: x0,
    rideDeflection_mm: xr,
    rideHeight_mm: Hb_ride,
    bumpHeight_mm: Hb_bump,
    forces: { preload_N: F0, ride_N: Fr, bump_N: Fb },
    stress: {
      wahlFactor_Kw: Kw,
      tauRide_MPa: tauRide,
      tauBump_MPa: tauBump,
      yieldSafetyFactor_ride: SFride,
      yieldSafetyFactor_bump: SFbump,
      stressRatio_bump: stressRatio,
    },
    dynamics,
    curve: { x_mm: xs, F_N: Fs, tau_MPa: taus },
  };
}

function wahlFactor(C: number): number {
  if (C <= 1) return 999;
  return (4 * C - 1) / (4 * C - 4) + 0.615 / C;
}

function shearStress(Kw: number, F: number, Dm: number, d: number): number {
  return Kw * (8 * F * Dm) / (Math.PI * Math.pow(d, 3));
}

function solidFactor(endType: EndType): number {
  // Ground ends slightly smaller (empirical)
  return endType === "closed_ground" ? 0.98 : 1.0;
}

function guideChecks(
  g: { od_mm?: number; id_mm?: number; guide: { holeDiameter_mm?: number; rodDiameter_mm?: number } },
  od: number,
  id: number,
  warnings: string[]
): void {
  const hole = g.guide?.holeDiameter_mm;
  if (hole && hole <= od) {
    warnings.push(`Containment hole diameter (${hole}mm) <= spring OD (${od.toFixed(1)}mm): friction/interference risk.`);
  }
  const rod = g.guide?.rodDiameter_mm;
  if (rod && rod >= id) {
    warnings.push(`Rod diameter (${rod}mm) >= spring ID (${id.toFixed(1)}mm): interference risk.`);
  }
}

function emptyResultWith(errors: string[]): SuspensionSpringResult {
  return {
    errors,
    warnings: [],
    derived: { meanDiameter_mm: 0, springIndex_C: 0, totalCoils_Nt: 0, solidHeight_Hs_mm: 0, od_mm: 0, id_mm: 0 },
    springRate_N_per_mm: 0,
    rideDeflection_mm: 0,
    preloadDeflection_mm: 0,
    rideHeight_mm: 0,
    bumpHeight_mm: 0,
    forces: { preload_N: 0, ride_N: 0, bump_N: 0 },
    stress: {
      wahlFactor_Kw: 0,
      tauRide_MPa: 0,
      tauBump_MPa: 0,
      yieldSafetyFactor_ride: 0,
      yieldSafetyFactor_bump: 0,
      stressRatio_bump: 0,
    },
    curve: { x_mm: [], F_N: [], tau_MPa: [] },
  };
}

/**
 * Calculate stress at a specific deflection
 */
export function calculateStressAtDeflection(
  k: number,
  Kw: number,
  Dm: number,
  d: number,
  deflection_mm: number
): number {
  const F = k * deflection_mm;
  return shearStress(Kw, F, Dm, d);
}

/**
 * Calculate stress ratio at a specific deflection
 */
export function calculateStressRatioAtDeflection(
  k: number,
  Kw: number,
  Dm: number,
  d: number,
  yieldStrength_MPa: number,
  deflection_mm: number
): number {
  const tau = calculateStressAtDeflection(k, Kw, Dm, d, deflection_mm);
  const tauAllow = yieldStrength_MPa * 0.577;
  return tau / tauAllow;
}
