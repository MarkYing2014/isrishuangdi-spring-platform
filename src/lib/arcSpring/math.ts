/**
 * Arc Spring 核心计算
 * 
 * 单位约定:
 * - G: N/mm² (MPa)
 * - 长度: mm
 * - 角度: deg (计算时转 rad)
 * - 扭矩: N·mm
 * - 力: N
 * - 刚度 k: N/mm
 * - 旋转刚度 R: N·mm/deg
 */

import { ArcSpringInput, ArcSpringResult, ArcSpringPoint } from "./types";
import { ARC_SPRING_MATERIALS } from "./materials";

const PI = Math.PI;
const deg2rad = (a: number) => a * PI / 180;

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

function getG(input: ArcSpringInput): number {
  const m = ARC_SPRING_MATERIALS.find(x => x.key === input.materialKey);
  const base = m?.G ?? 80000;
  if (input.materialKey === "CUSTOM") return input.G_override ?? base;
  return input.G_override ?? base;
}

/**
 * 弹簧刚度 k = G d^4 / (8 D^3 n) [N/mm]
 */
export function springRate_k(G: number, d: number, D: number, n: number): number {
  return (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * n);
}

/**
 * 位移 x = r * Δα(rad) [mm]
 */
export function xFromDeltaDeg(r: number, deltaDeg: number): number {
  return r * deg2rad(deltaDeg);
}

/** Alias for OEM Scheme A */
export function calculateTangentialDisplacement(deltaDeg: number, r: number): number {
  return xFromDeltaDeg(r, deltaDeg);
}

/** Reverse conversion */
export function calculateAngleFromDisplacement(s: number, r: number): number {
  if (r <= 0) return 0;
  return (s / r) * (180 / PI);
}

/**
 * 扭矩计算
 * M = F * r, F = k * x => M = k * r² * Δα(rad) [N·mm]
 */
export function torqueFromDeltaDeg(k: number, r: number, deltaDeg: number) {
  const x = xFromDeltaDeg(r, deltaDeg);
  const F = k * x;
  const M = F * r;
  return { x, F, M };
}

/**
 * 摩擦扭矩计算
 * - constant: Tf = Tf_const
 * - proportional: Tf = cf * F * r
 */
export function frictionTorque(input: ArcSpringInput, F: number): number {
  const mode = input.hysteresisMode ?? "none";
  if (mode === "none") return 0;

  if (mode === "constant") {
    return Math.max(0, input.Tf_const ?? 0);
  }

  // proportional: Tf = cf * F * r
  const cf = Math.max(0, input.cf ?? 0);
  return cf * F * input.r;
}

/**
 * 输入参数校验
 */
export function validateArcSpringInput(input: ArcSpringInput): string[] {
  const errs: string[] = [];
  if (!(input.d > 0)) errs.push("d must be > 0");
  if (!(input.D > input.d)) errs.push("D must be > d");
  if (!(input.n > 0)) errs.push("n must be > 0");
  if (!(input.r > 0)) errs.push("r must be > 0");
  if (!(input.alpha0 > input.alphaC)) errs.push("alpha0 must be > alphaC");

  const system = input.systemMode ?? "single";
  if (system === "dual_staged") {
    const deltaMax = input.alpha0 - input.alphaC;
    const engage = input.engageAngle2 ?? 0;
    if (!(engage >= 0 && engage < deltaMax)) {
      errs.push("engageAngle2 must be >= 0 and < (alpha0-alphaC)");
    }
  }
  return errs;
}

/**
 * 计算迟滞回线面积 (阻尼能量)
 * 使用梯形积分法
 */
function computeHysteresisWork(curve: ArcSpringPoint[]): number {
  if (curve.length < 2) return 0;

  let work = 0;
  for (let i = 1; i < curve.length; i++) {
    const dAlpha = curve[i].deltaDeg - curve[i - 1].deltaDeg;
    const avgTf = (curve[i].Tf + curve[i - 1].Tf) / 2;
    work += 2 * avgTf * dAlpha; // 回线面积 = 2 * ∫Tf dα
  }
  return work;
}

/**
 * 单级弹簧曲线计算
 */
export function computeArcSpringCurveSingle(input: ArcSpringInput): ArcSpringResult {
  const warnings: string[] = [];
  const errors = validateArcSpringInput(input);
  if (errors.length) {
    return {
      k: NaN, R_deg: NaN, deltaAlphaMax: NaN, xMax: NaN,
      MMax_load: NaN, MMax_unload: NaN,
      De: NaN, Di: NaN,
      springIndex: NaN, wahlFactor: NaN, tauMax: NaN,
      safetyMarginToSolid: NaN,
      hysteresisWork: NaN,
      dampingCapacity: NaN,
      curve: [],
      warnings: errors,
    };
  }

  const G = getG(input);
  const k = springRate_k(G, input.d, input.D, input.n);
  const deltaAlphaMax = input.alpha0 - input.alphaC;
  const samples = Math.max(10, input.samples ?? 120);
  const nParallel = input.countParallel ?? 1; // 并联弹簧数量

  // 几何尺寸
  const De = input.D + input.d;  // 外径
  const Di = input.D - input.d;  // 内径

  // 弹簧指数 C = D/d (Spring Index)
  const springIndex = input.D / input.d;

  // Wahl 应力修正因子 K_W = (4C-1)/(4C-4) + 0.615/C
  // 用于修正螺旋弹簧内侧的应力集中
  const wahlFactor = (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;

  // R_deg = k * r² * (π/180) * nParallel [N·mm/deg]
  // 并联弹簧的总旋转刚度 = 单根刚度 × 并联数量
  const R_deg = k * input.r * input.r * (PI / 180) * nParallel;
  const curve: ArcSpringPoint[] = [];

  let MMax_load = -Infinity;
  let MMax_unload = -Infinity;

  for (let i = 0; i <= samples; i++) {
    const deltaDeg = deltaAlphaMax * (i / samples);
    const { x, F, M } = torqueFromDeltaDeg(k, input.r, deltaDeg);
    const Tf = frictionTorque(input, F);

    // 并联弹簧：力和扭矩乘以并联数量
    const F_total = F * nParallel;
    const M_total = M * nParallel;
    const Tf_total = Tf * nParallel;
    const M_load = M_total + Tf_total;
    const M_unload = M_total - Tf_total;

    MMax_load = Math.max(MMax_load, M_load);
    MMax_unload = Math.max(MMax_unload, M_unload);

    curve.push({
      deltaDeg,
      alphaDeg: input.alpha0 - deltaDeg,
      x,
      F: F_total,
      M: M_total,
      Tf: Tf_total,
      M_load,
      M_unload,
      coilBind: Math.abs(deltaDeg - deltaAlphaMax) < 1e-9,
    });
  }

  const xMax = xFromDeltaDeg(input.r, deltaAlphaMax);

  // 安全裕度：假设工作角度为 80% 的最大行程
  const safetyMarginToSolid = deltaAlphaMax * 0.2;

  // 阻尼能量
  const hysteresisWork = computeHysteresisWork(curve);

  // 阻尼效率 = Hysteresis Energy / Total Potential Energy * 100%
  // Total Potential Energy ≈ 0.5 * M_max * Δα_max (简化为三角形面积)
  const totalPotentialEnergy = 0.5 * MMax_load * deltaAlphaMax;
  const dampingCapacity = totalPotentialEnergy > 0
    ? (hysteresisWork / totalPotentialEnergy) * 100
    : 0;

  // 干涉检查
  let housingClearance: number | undefined;
  if (input.maxHousingDiameter !== undefined && input.maxHousingDiameter > 0) {
    housingClearance = input.maxHousingDiameter - De;
    const minClearance = input.minClearance ?? 1;
    if (housingClearance < minClearance) {
      warnings.push(`Housing clearance (${housingClearance.toFixed(1)}mm) < min required (${minClearance}mm). De=${De.toFixed(1)}mm exceeds available space.`);
    }
  }

  // 最大剪切应力 τ_max = K_W * (8 * F_max * D) / (π * d³) [MPa]
  // F_max = M_max / r
  const F_max = MMax_load / input.r;
  const tauMax = wahlFactor * (8 * F_max * input.D) / (PI * Math.pow(input.d, 3));

  if (!isFinite(k) || k <= 0) warnings.push("Computed k is not valid.");

  return {
    k, R_deg, deltaAlphaMax, xMax, MMax_load, MMax_unload,
    De, Di, springIndex, wahlFactor, tauMax,
    safetyMarginToSolid, housingClearance, hysteresisWork, dampingCapacity,
    curve, warnings
  };
}

/**
 * 双级弹簧曲线计算 (并联/分段)
 */
export function computeArcSpringCurve(input: ArcSpringInput): ArcSpringResult {
  const system = input.systemMode ?? "single";
  if (system === "single") return computeArcSpringCurveSingle(input);

  const s1 = computeArcSpringCurveSingle({ ...input, systemMode: "single" });

  // 构建 spring2 参数，使用 spring1 的默认值
  const s2in: ArcSpringInput = {
    ...input,
    ...input.spring2,
    systemMode: "single",
    samples: input.samples,
    hysteresisMode: input.spring2?.hysteresisMode ?? input.hysteresisMode,
    Tf_const: input.spring2?.Tf_const ?? input.Tf_const,
    cf: input.spring2?.cf ?? input.cf,
    materialKey: input.spring2?.materialKey ?? input.materialKey,
    G_override: input.spring2?.G_override ?? input.G_override,
    d: input.spring2?.d ?? input.d,
    D: input.spring2?.D ?? input.D,
    n: input.spring2?.n ?? input.n,
    r: input.spring2?.r ?? input.r,
    alpha0: input.spring2?.alpha0 ?? input.alpha0,
    alphaWork: input.spring2?.alphaWork ?? input.alphaWork,
    alphaC: input.spring2?.alphaC ?? input.alphaC,
  };

  const s2 = computeArcSpringCurveSingle(s2in);

  const curve: ArcSpringPoint[] = [];
  const warnings = [...s1.warnings, ...s2.warnings];

  const engage = input.engageAngle2 ?? 0;

  // 辅助函数：在曲线上按 deltaDeg 插值采样
  const sampleAt = (res: ArcSpringResult, deltaDeg: number) => {
    const dMax = res.deltaAlphaMax;
    if (dMax <= 0 || res.curve.length === 0) return null;
    const u = clamp(deltaDeg / dMax, 0, 1);
    const idx = u * (res.curve.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(res.curve.length - 1, i0 + 1);
    const t = idx - i0;
    const p0 = res.curve[i0];
    const p1 = res.curve[i1];
    const lerp = (a: number, b: number) => a + (b - a) * t;
    return {
      x: lerp(p0.x, p1.x),
      F: lerp(p0.F, p1.F),
      M: lerp(p0.M, p1.M),
      Tf: lerp(p0.Tf, p1.Tf),
      M_load: lerp(p0.M_load, p1.M_load),
      M_unload: lerp(p0.M_unload, p1.M_unload),
    };
  };

  const base = s1.curve;
  let MMax_load = -Infinity;
  let MMax_unload = -Infinity;

  for (let i = 0; i < base.length; i++) {
    const deltaDeg = base[i].deltaDeg;

    const p1 = sampleAt(s1, deltaDeg)!;

    let p2 = null;
    if (system === "dual_parallel") {
      p2 = sampleAt(s2, deltaDeg);
    } else if (system === "dual_staged") {
      if (deltaDeg >= engage) {
        p2 = sampleAt(s2, deltaDeg - engage);
      }
    }

    const M = p1.M + (p2?.M ?? 0);
    const Tf = p1.Tf + (p2?.Tf ?? 0);
    const M_load = p1.M_load + (p2?.M_load ?? 0);
    const M_unload = p1.M_unload + (p2?.M_unload ?? 0);

    MMax_load = Math.max(MMax_load, M_load);
    MMax_unload = Math.max(MMax_unload, M_unload);

    curve.push({
      deltaDeg,
      alphaDeg: input.alpha0 - deltaDeg,
      x: p1.x + (p2?.x ?? 0),
      F: p1.F + (p2?.F ?? 0),
      M, Tf, M_load, M_unload,
      coilBind: base[i].coilBind,
    });
  }

  // v1: 报告 k/R 为 spring1 的基准值
  const k = s1.k;
  const R_deg = s1.R_deg;
  const deltaAlphaMax = s1.deltaAlphaMax;
  const xMax = s1.xMax;
  const De = s1.De;
  const Di = s1.Di;
  const safetyMarginToSolid = s1.safetyMarginToSolid;
  const housingClearance = s1.housingClearance;

  // 阻尼能量
  const hysteresisWork = computeHysteresisWork(curve);

  // 阻尼效率 = Hysteresis Energy / Total Potential Energy * 100%
  const totalPotentialEnergy = 0.5 * MMax_load * deltaAlphaMax;
  const dampingCapacity = totalPotentialEnergy > 0
    ? (hysteresisWork / totalPotentialEnergy) * 100
    : 0;

  // 双级系统：计算内外弹簧间隙
  let spring2Clearance: number | undefined;
  if (s2.Di !== undefined && s1.De !== undefined) {
    // 外弹簧内径 vs 内弹簧外径
    spring2Clearance = s1.Di - s2.De;
    if (spring2Clearance < (input.minClearance ?? 1)) {
      warnings.push(`Inner/outer spring clearance (${spring2Clearance.toFixed(1)}mm) is too small. Risk of interference.`);
    }
  }

  // 拐点角度标记 (dual_staged)
  const engageAngleMarker = system === "dual_staged" ? engage : undefined;

  // --------------------------------------------------------
  // Dual Spring Engineering (Physics Correction)
  // --------------------------------------------------------

  // 1. Stress Analysis (Independent)
  // S1 Stress: Uses M1_load (partial torque)
  const F1_max = s1.MMax_load / input.r; // Note: s1.MMax_load is isolated S1 (see line 232)
  const tau1_max = s1.wahlFactor * (8 * F1_max * input.D) / (PI * Math.pow(input.d, 3));

  // S2 Stress: Uses M2_load
  const F2_max = s2.MMax_load / input.spring2?.r!; // s2 is computed from s2in, so safe
  const tau2_max = s2.wahlFactor * (8 * F2_max * s2in.D) / (PI * Math.pow(s2in.d, 3));

  // System Max Stress & Governing Spring
  const tauMaxSystem = isFinite(tau2_max) ? Math.max(tau1_max, tau2_max) : tau1_max;
  const governingSpring: 1 | 2 = (isFinite(tau2_max) && tau2_max > tau1_max) ? 2 : 1;

  // 2. System Stiffness (R_deg)
  let R_system = s1.R_deg;
  if (system === "dual_parallel") {
    R_system = s1.R_deg + s2.R_deg;
  } else if (system === "dual_staged") {
    // Staged stiffness is piecewise. 
    // We report the INITIAL stiffness (stage 1) as K1
    // The secondary stiffness is K1 + K2, but R_deg usually implies primary rate.
    // However, usually specific 'bi-linear' fields are better. 
    // For now, let's keep R_deg as Stage 1 to avoid breaking single-rate assumption 
    // or return the max rate? 
    // Standard practice: Report K1. The curve shows the staging.
    R_system = s1.R_deg;
  }

  // 3. Work Point Stress
  let deltaAlphaWork: number | undefined;
  let M_work: number | undefined;
  let tauWork: number | undefined;
  let s2_M_work: number | undefined;
  let s2_tauWork: number | undefined;

  if (input.alphaWork !== undefined) {
    deltaAlphaWork = Math.max(0, input.alpha0 - input.alphaWork);

    // System Work Point
    const pWork = sampleAt({ curve, deltaAlphaMax: deltaAlphaMax } as any, deltaAlphaWork);
    if (pWork) {
      M_work = pWork.M_load;

      // Calculate S1 Component at Work Point
      const p1Work = sampleAt(s1, deltaAlphaWork);
      if (p1Work) {
        const F1_work = p1Work.M_load / input.r;
        tauWork = s1.wahlFactor * (8 * F1_work * input.D) / (PI * Math.pow(input.d, 3));
      }

      // Calculate S2 Component at Work Point
      let p2Work = null;
      if (system === "dual_parallel") {
        p2Work = sampleAt(s2, deltaAlphaWork);
      } else if (system === "dual_staged" && deltaAlphaWork >= engage) {
        p2Work = sampleAt(s2, deltaAlphaWork - engage);
      }

      if (p2Work) {
        s2_M_work = p2Work.M_load;
        const F2_work = p2Work.M_load / s2in.r;
        s2_tauWork = s2.wahlFactor * (8 * F2_work * s2in.D) / (PI * Math.pow(s2in.d, 3));
      }
    }
  }

  return {
    // System Level Props
    k: s1.k, // Tangential stiffness of S1 (Reference)
    R_deg: R_system, // System Rotational Stiffness (Corrected)
    deltaAlphaMax, xMax, MMax_load, MMax_unload,
    De, Di, safetyMarginToSolid, housingClearance, hysteresisWork, dampingCapacity,
    engageAngleMarker, spring2Clearance,

    // S1 Limits
    springIndex: s1.springIndex,
    wahlFactor: s1.wahlFactor,
    tauMax: tauMaxSystem, // Corrected: System Max Stress
    governingSpring,

    // S1 Work Point
    deltaAlphaWork, M_work, tauWork,

    // S2 Details
    spring2Result: {
      k: s2.k,
      R_deg: s2.R_deg,
      tauMax: tau2_max,
      wahlFactor: s2.wahlFactor,
      M_work: s2_M_work,
      tauWork: s2_tauWork,
      engagedAtWork: system === "dual_staged" ? (deltaAlphaWork ?? 0) >= engage : true
    },

    curve, warnings
  };
}

/**
 * 默认输入参数
 */
export function getDefaultArcSpringInput(): ArcSpringInput {
  return {
    d: 3.0,
    D: 25,
    n: 6,
    r: 60,
    alpha0: 45,
    alphaC: 10,
    materialKey: "EN10270_2",
    hysteresisMode: "constant",
    Tf_const: 3000,
    samples: 160,
    systemMode: "single",
  };
}
