/**
 * Arc Spring Advanced Analysis Module
 * 弧形弹簧高级分析模块
 * 
 * P1: Manufacturability check, Fatigue life prediction, Scoring system
 * P2: Natural frequency, Temperature effects, Centrifugal force (DMF)
 * P3: Creep/relaxation analysis
 */

import type { ArcSpringInput, ArcSpringResult } from "./types";
import { ARC_SPRING_MATERIALS } from "./materials";

const PI = Math.PI;

// ============================================================================
// P1: Manufacturability Check
// ============================================================================

export interface ArcManufacturabilityIssue {
  code: string;
  severity: "critical" | "major" | "minor" | "info";
  description: string;
  descriptionZh: string;
  parameter: string;
  currentValue: number | string;
  requiredValue: string;
  suggestion: string;
  suggestionZh: string;
}

export interface ArcManufacturabilityResult {
  isManufacturable: boolean;
  difficultyScore: number;
  issues: ArcManufacturabilityIssue[];
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  recommendedProcess: string;
  wireLengthMm: number;
  coilPitchFree: number;
  coilPitchWork: number;
  summary: string;
  summaryZh: string;
}

const ARC_MANUFACTURING_LIMITS = {
  minWireDiameter: 0.5,      // mm
  maxWireDiameter: 12.0,     // mm
  minSpringIndex: 4,         // D/d
  maxSpringIndex: 16,        // D/d
  optimalSpringIndexMin: 6,
  optimalSpringIndexMax: 12,
  minActiveCoils: 2,
  maxActiveCoils: 25,
  minWorkingAngle: 5,        // deg
  maxWireLength: 5000,       // mm
  minPitchToWireRatio: 1.1,  // pitch/d at work position
};

function checkWireDiameter(d: number): ArcManufacturabilityIssue | null {
  if (d < ARC_MANUFACTURING_LIMITS.minWireDiameter) {
    return {
      code: "WIRE_TOO_THIN",
      severity: "critical",
      description: `Wire diameter ${d}mm is below minimum ${ARC_MANUFACTURING_LIMITS.minWireDiameter}mm`,
      descriptionZh: `线径 ${d}mm 低于最小值 ${ARC_MANUFACTURING_LIMITS.minWireDiameter}mm`,
      parameter: "d",
      currentValue: d,
      requiredValue: `≥ ${ARC_MANUFACTURING_LIMITS.minWireDiameter} mm`,
      suggestion: "Increase wire diameter",
      suggestionZh: "增加线径",
    };
  }
  if (d > ARC_MANUFACTURING_LIMITS.maxWireDiameter) {
    return {
      code: "WIRE_TOO_THICK",
      severity: "critical",
      description: `Wire diameter ${d}mm exceeds maximum ${ARC_MANUFACTURING_LIMITS.maxWireDiameter}mm`,
      descriptionZh: `线径 ${d}mm 超过最大值 ${ARC_MANUFACTURING_LIMITS.maxWireDiameter}mm`,
      parameter: "d",
      currentValue: d,
      requiredValue: `≤ ${ARC_MANUFACTURING_LIMITS.maxWireDiameter} mm`,
      suggestion: "Reduce wire diameter or use specialized equipment",
      suggestionZh: "减小线径或使用专用设备",
    };
  }
  return null;
}

function checkSpringIndex(D: number, d: number): ArcManufacturabilityIssue | null {
  const C = D / d;
  
  if (C < ARC_MANUFACTURING_LIMITS.minSpringIndex) {
    return {
      code: "SPRING_INDEX_TOO_LOW",
      severity: "critical",
      description: `Spring index C=${C.toFixed(1)} is too low (< ${ARC_MANUFACTURING_LIMITS.minSpringIndex})`,
      descriptionZh: `弹簧指数 C=${C.toFixed(1)} 过低 (< ${ARC_MANUFACTURING_LIMITS.minSpringIndex})`,
      parameter: "D/d",
      currentValue: C.toFixed(2),
      requiredValue: `≥ ${ARC_MANUFACTURING_LIMITS.minSpringIndex}`,
      suggestion: "Increase mean diameter D or reduce wire diameter d",
      suggestionZh: "增加中径 D 或减小线径 d",
    };
  }
  
  if (C > ARC_MANUFACTURING_LIMITS.maxSpringIndex) {
    return {
      code: "SPRING_INDEX_TOO_HIGH",
      severity: "major",
      description: `Spring index C=${C.toFixed(1)} is high (> ${ARC_MANUFACTURING_LIMITS.maxSpringIndex})`,
      descriptionZh: `弹簧指数 C=${C.toFixed(1)} 偏高 (> ${ARC_MANUFACTURING_LIMITS.maxSpringIndex})`,
      parameter: "D/d",
      currentValue: C.toFixed(2),
      requiredValue: `≤ ${ARC_MANUFACTURING_LIMITS.maxSpringIndex}`,
      suggestion: "Reduce mean diameter D or increase wire diameter d",
      suggestionZh: "减小中径 D 或增加线径 d",
    };
  }
  
  if (C < ARC_MANUFACTURING_LIMITS.optimalSpringIndexMin || 
      C > ARC_MANUFACTURING_LIMITS.optimalSpringIndexMax) {
    return {
      code: "SPRING_INDEX_SUBOPTIMAL",
      severity: "minor",
      description: `Spring index C=${C.toFixed(1)} outside optimal range (${ARC_MANUFACTURING_LIMITS.optimalSpringIndexMin}-${ARC_MANUFACTURING_LIMITS.optimalSpringIndexMax})`,
      descriptionZh: `弹簧指数 C=${C.toFixed(1)} 在最优范围外 (${ARC_MANUFACTURING_LIMITS.optimalSpringIndexMin}-${ARC_MANUFACTURING_LIMITS.optimalSpringIndexMax})`,
      parameter: "D/d",
      currentValue: C.toFixed(2),
      requiredValue: `${ARC_MANUFACTURING_LIMITS.optimalSpringIndexMin} - ${ARC_MANUFACTURING_LIMITS.optimalSpringIndexMax}`,
      suggestion: "Adjust D/d ratio for optimal manufacturability",
      suggestionZh: "调整 D/d 比例以获得最佳可制造性",
    };
  }
  
  return null;
}

function checkActiveCoils(n: number): ArcManufacturabilityIssue | null {
  if (n < ARC_MANUFACTURING_LIMITS.minActiveCoils) {
    return {
      code: "TOO_FEW_COILS",
      severity: "major",
      description: `Active coils n=${n} is below minimum ${ARC_MANUFACTURING_LIMITS.minActiveCoils}`,
      descriptionZh: `有效圈数 n=${n} 低于最小值 ${ARC_MANUFACTURING_LIMITS.minActiveCoils}`,
      parameter: "n",
      currentValue: n,
      requiredValue: `≥ ${ARC_MANUFACTURING_LIMITS.minActiveCoils}`,
      suggestion: "Increase number of active coils",
      suggestionZh: "增加有效圈数",
    };
  }
  if (n > ARC_MANUFACTURING_LIMITS.maxActiveCoils) {
    return {
      code: "MANY_COILS",
      severity: "minor",
      description: `Active coils n=${n} is high - may require special handling`,
      descriptionZh: `有效圈数 n=${n} 较多 - 可能需要特殊处理`,
      parameter: "n",
      currentValue: n,
      requiredValue: `≤ ${ARC_MANUFACTURING_LIMITS.maxActiveCoils}`,
      suggestion: "Consider design optimization to reduce coil count",
      suggestionZh: "考虑优化设计以减少圈数",
    };
  }
  return null;
}

function checkWorkingAngle(alpha0: number, alphaC: number): ArcManufacturabilityIssue | null {
  const deltaMax = alpha0 - alphaC;
  if (deltaMax < ARC_MANUFACTURING_LIMITS.minWorkingAngle) {
    return {
      code: "WORKING_ANGLE_TOO_SMALL",
      severity: "major",
      description: `Working angle range ${deltaMax.toFixed(1)}° is too small`,
      descriptionZh: `工作角度范围 ${deltaMax.toFixed(1)}° 过小`,
      parameter: "alpha0-alphaC",
      currentValue: deltaMax.toFixed(1),
      requiredValue: `≥ ${ARC_MANUFACTURING_LIMITS.minWorkingAngle}°`,
      suggestion: "Increase free angle or reduce coil bind angle",
      suggestionZh: "增加自由角或减小压并角",
    };
  }
  return null;
}

function checkWireLength(wireLengthMm: number): ArcManufacturabilityIssue | null {
  if (wireLengthMm > ARC_MANUFACTURING_LIMITS.maxWireLength) {
    return {
      code: "WIRE_LENGTH_EXCESSIVE",
      severity: "minor",
      description: `Wire length ${wireLengthMm.toFixed(0)}mm is very long - material handling challenges`,
      descriptionZh: `线长 ${wireLengthMm.toFixed(0)}mm 过长 - 材料处理困难`,
      parameter: "wireLength",
      currentValue: wireLengthMm.toFixed(0),
      requiredValue: `≤ ${ARC_MANUFACTURING_LIMITS.maxWireLength} mm`,
      suggestion: "Consider design optimization to reduce wire length",
      suggestionZh: "考虑优化设计以减少线长",
    };
  }
  return null;
}

function checkCoilPitch(pitchWork: number, d: number): ArcManufacturabilityIssue | null {
  const ratio = pitchWork / d;
  if (ratio < ARC_MANUFACTURING_LIMITS.minPitchToWireRatio) {
    return {
      code: "PITCH_TOO_TIGHT",
      severity: "major",
      description: `Coil pitch at work position is too tight (p/d=${ratio.toFixed(2)})`,
      descriptionZh: `工作位置圈距过紧 (p/d=${ratio.toFixed(2)})`,
      parameter: "pitch/d",
      currentValue: ratio.toFixed(2),
      requiredValue: `≥ ${ARC_MANUFACTURING_LIMITS.minPitchToWireRatio}`,
      suggestion: "Increase arc angle or reduce coil count",
      suggestionZh: "增加弧角或减少圈数",
    };
  }
  return null;
}

function calculateArcDifficultyScore(input: ArcSpringInput, wireLengthMm: number): number {
  let score = 0;
  const C = input.D / input.d;
  
  // Wire diameter difficulty
  if (input.d < 1.0) score += 20;
  else if (input.d < 2.0) score += 10;
  else if (input.d > 8.0) score += 15;
  
  // Spring index difficulty
  if (C < 5 || C > 14) score += 15;
  else if (C < 6 || C > 12) score += 5;
  
  // Coil count difficulty
  if (input.n > 15) score += 10;
  else if (input.n > 10) score += 5;
  
  // Wire length difficulty
  if (wireLengthMm > 3000) score += 15;
  else if (wireLengthMm > 2000) score += 5;
  
  // Arc layout difficulty
  if (input.alpha0 > 120) score += 10;
  if ((input.countParallel ?? 1) > 4) score += 10;
  
  return Math.min(100, score);
}

export function checkArcManufacturability(input: ArcSpringInput): ArcManufacturabilityResult {
  const issues: ArcManufacturabilityIssue[] = [];
  
  // Calculate derived values
  const deg2rad = (deg: number) => (deg * PI) / 180;
  const nTotal = input.n + 2; // Assume 2 dead coils
  const alpha0Rad = deg2rad(input.alpha0);
  const alphaCRad = deg2rad(input.alphaC);
  const lFree = input.r * alpha0Rad;
  const lWork = input.r * alphaCRad;
  const coilPitchFree = nTotal > 0 ? lFree / nTotal : 0;
  const coilPitchWork = nTotal > 0 ? lWork / nTotal : 0;
  const perTurn = Math.sqrt(Math.pow(PI * input.D, 2) + Math.pow(coilPitchFree, 2));
  const wireLengthMm = perTurn * nTotal;
  
  // Run checks
  const wireCheck = checkWireDiameter(input.d);
  if (wireCheck) issues.push(wireCheck);
  
  const indexCheck = checkSpringIndex(input.D, input.d);
  if (indexCheck) issues.push(indexCheck);
  
  const coilCheck = checkActiveCoils(input.n);
  if (coilCheck) issues.push(coilCheck);
  
  const angleCheck = checkWorkingAngle(input.alpha0, input.alphaC);
  if (angleCheck) issues.push(angleCheck);
  
  const lengthCheck = checkWireLength(wireLengthMm);
  if (lengthCheck) issues.push(lengthCheck);
  
  const pitchCheck = checkCoilPitch(coilPitchWork, input.d);
  if (pitchCheck) issues.push(pitchCheck);
  
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const majorCount = issues.filter(i => i.severity === "major").length;
  const minorCount = issues.filter(i => i.severity === "minor").length;
  
  const isManufacturable = criticalCount === 0;
  const difficultyScore = calculateArcDifficultyScore(input, wireLengthMm);
  
  const recommendedProcess = input.d > 6 
    ? "Hot coiling with heat treatment"
    : input.d < 1.5 
      ? "Precision cold coiling"
      : "Standard CNC cold coiling";
  
  let summary: string;
  let summaryZh: string;
  
  if (!isManufacturable) {
    summary = `NOT MANUFACTURABLE: ${criticalCount} critical issue(s)`;
    summaryZh = `不可制造：${criticalCount} 个严重问题`;
  } else if (majorCount > 0) {
    summary = `Manufacturable with ${majorCount} major concern(s). Difficulty: ${difficultyScore}/100`;
    summaryZh = `可制造，有 ${majorCount} 个主要问题。难度：${difficultyScore}/100`;
  } else if (minorCount > 0) {
    summary = `Manufacturable with ${minorCount} minor note(s). Difficulty: ${difficultyScore}/100`;
    summaryZh = `可制造，有 ${minorCount} 个次要问题。难度：${difficultyScore}/100`;
  } else {
    summary = `Fully manufacturable. Difficulty: ${difficultyScore}/100`;
    summaryZh = `完全可制造。难度：${difficultyScore}/100`;
  }
  
  return {
    isManufacturable,
    difficultyScore,
    issues,
    criticalCount,
    majorCount,
    minorCount,
    recommendedProcess,
    wireLengthMm,
    coilPitchFree,
    coilPitchWork,
    summary,
    summaryZh,
  };
}

// ============================================================================
// P1: Fatigue Life Prediction
// ============================================================================

export interface ArcFatigueLifeResult {
  estimatedCycles: number;
  rating: "infinite" | "high" | "medium" | "low" | "very_low";
  message: { en: string; zh: string };
  tauA: number;           // Shear stress amplitude (MPa)
  tauM: number;           // Mean shear stress (MPa)
  tauMax: number;         // Max shear stress (MPa)
  tauMin: number;         // Min shear stress (MPa)
  Se: number | null;      // Endurance limit (MPa)
  Su: number | null;      // Ultimate strength (MPa)
  goodmanFoS: number | null;
  gerberFoS: number | null;
  snCurveData: Array<{ cycles: number; stress: number }>;
}

export function calculateArcFatigueLife(params: {
  tauMax_MPa: number;
  tauMin_MPa?: number;
  materialKey?: string;
  Su_MPa?: number;
  Se_MPa?: number;
}): ArcFatigueLifeResult {
  const tauMax = params.tauMax_MPa;
  const tauMin = params.tauMin_MPa ?? 0;
  
  const tauA = (tauMax - tauMin) / 2;
  const tauM = (tauMax + tauMin) / 2;
  
  // Get material properties
  const material = ARC_SPRING_MATERIALS.find(m => m.key === params.materialKey);
  
  // Estimate Su from material or use provided value
  // For spring steels: Su ≈ 1500-2000 MPa typically
  const Su = params.Su_MPa ?? 1700;
  
  // Endurance limit for shear: Se ≈ 0.29 × Su (for torsion/shear)
  const SePrime = params.Se_MPa ?? 0.29 * Su;
  
  // Apply Goodman correction for mean stress
  const Se = SePrime / (1 + tauM / (0.577 * Su)); // Convert to shear
  
  // Goodman criterion: tauA/Se + tauM/(0.577*Su) = 1/FoS
  const goodmanDen = tauA / Se + tauM / (0.577 * Su);
  const goodmanFoS = goodmanDen > 0 ? 1 / goodmanDen : null;
  
  // Gerber criterion: tauA/Se + (tauM/(0.577*Su))² = 1/FoS
  const gerberDen = tauA / Se + Math.pow(tauM / (0.577 * Su), 2);
  const gerberFoS = gerberDen > 0 ? 1 / gerberDen : null;
  
  // Basquin equation for fatigue life
  // S = A × N^(-b), typical b ≈ 0.1 for spring steels
  let estimatedCycles = Infinity;
  
  if (Su && Se && Se > 0) {
    const N1 = 1e3;
    const N2 = 1e6;
    const S1 = 0.9 * 0.577 * Su; // 90% of shear ultimate at 1e3 cycles
    const S2 = Se;
    
    const b = Math.log(S1 / S2) / Math.log(N2 / N1);
    const A = S1 * Math.pow(N1, b);
    
    // Effective stress amplitude with mean stress correction
    const tauAEffective = tauA / (1 - tauM / (0.577 * Su));
    
    if (tauAEffective <= 0) {
      estimatedCycles = Infinity;
    } else if (tauAEffective >= S1) {
      estimatedCycles = Math.max(100, Math.pow(A / tauAEffective, 1 / b));
    } else if (tauAEffective <= S2) {
      estimatedCycles = Infinity;
    } else {
      estimatedCycles = Math.pow(A / tauAEffective, 1 / b);
    }
  }
  
  // Generate S-N curve data
  const snCurveData: Array<{ cycles: number; stress: number }> = [];
  if (Su && Se) {
    const S1 = 0.9 * 0.577 * Su;
    const S2 = Se;
    const b = Math.log(S1 / S2) / Math.log(1e6 / 1e3);
    const A = S1 * Math.pow(1e3, b);
    
    for (let i = 0; i < 50; i++) {
      const logN = 3 + (i / 49) * 5;
      const N = Math.pow(10, logN);
      const S = A * Math.pow(N, -b);
      snCurveData.push({ cycles: N, stress: S });
    }
  }
  
  // Determine rating
  let rating: ArcFatigueLifeResult["rating"];
  let message: { en: string; zh: string };
  
  if (!isFinite(estimatedCycles) || estimatedCycles >= 1e7) {
    rating = "infinite";
    message = { en: "Infinite Life (N ≥ 10⁷)", zh: "无限寿命 (N ≥ 10⁷)" };
  } else if (estimatedCycles >= 1e6) {
    rating = "high";
    message = { en: "High Cycle (10⁶ ≤ N < 10⁷)", zh: "高周疲劳 (10⁶ ≤ N < 10⁷)" };
  } else if (estimatedCycles >= 1e5) {
    rating = "medium";
    message = { en: "Medium Cycle (10⁵ ≤ N < 10⁶)", zh: "中周疲劳 (10⁵ ≤ N < 10⁶)" };
  } else if (estimatedCycles >= 1e4) {
    rating = "low";
    message = { en: "Low Cycle (10⁴ ≤ N < 10⁵)", zh: "低周疲劳 (10⁴ ≤ N < 10⁵)" };
  } else {
    rating = "very_low";
    message = { en: "Very Low Cycle (N < 10⁴)", zh: "极低周疲劳 (N < 10⁴)" };
  }
  
  return {
    estimatedCycles: isFinite(estimatedCycles) ? Math.round(estimatedCycles) : Infinity,
    rating,
    message,
    tauA,
    tauM,
    tauMax,
    tauMin,
    Se,
    Su,
    goodmanFoS,
    gerberFoS,
    snCurveData,
  };
}

// ============================================================================
// P1: Comprehensive Scoring System
// ============================================================================

export interface ArcDesignScore {
  overallScore: number;
  staticSafetyScore: number;
  fatigueSafetyScore: number;
  manufacturabilityScore: number;
  geometryScore: number;
  rating: "excellent" | "good" | "acceptable" | "marginal" | "poor";
  ratingZh: string;
  breakdown: {
    category: string;
    categoryZh: string;
    score: number;
    maxScore: number;
    notes: string;
  }[];
}

export function calculateArcDesignScore(params: {
  manufacturability: ArcManufacturabilityResult;
  fatigueLife: ArcFatigueLifeResult;
  staticSF: number;
  fatigueSF: number | null;
  springIndex: number;
}): ArcDesignScore {
  const breakdown: ArcDesignScore["breakdown"] = [];
  
  // Static Safety (25 points max)
  let staticSafetyScore = 25;
  if (params.staticSF < 1.0) {
    staticSafetyScore = 0;
  } else if (params.staticSF < 1.2) {
    staticSafetyScore = 10;
  } else if (params.staticSF < 1.5) {
    staticSafetyScore = 18;
  }
  breakdown.push({
    category: "Static Safety",
    categoryZh: "静强度安全",
    score: staticSafetyScore,
    maxScore: 25,
    notes: `SF = ${params.staticSF.toFixed(2)}`,
  });
  
  // Fatigue Safety (25 points max)
  let fatigueSafetyScore = 25;
  const fatigueSF = params.fatigueSF ?? params.fatigueLife.goodmanFoS;
  if (fatigueSF === null || fatigueSF < 1.0) {
    fatigueSafetyScore = 0;
  } else if (fatigueSF < 1.2) {
    fatigueSafetyScore = 10;
  } else if (fatigueSF < 1.5) {
    fatigueSafetyScore = 18;
  }
  breakdown.push({
    category: "Fatigue Safety",
    categoryZh: "疲劳安全",
    score: fatigueSafetyScore,
    maxScore: 25,
    notes: `SF = ${fatigueSF?.toFixed(2) ?? "N/A"}`,
  });
  
  // Manufacturability (30 points max)
  let manufacturabilityScore = 30;
  if (!params.manufacturability.isManufacturable) {
    manufacturabilityScore = 0;
  } else {
    manufacturabilityScore -= params.manufacturability.criticalCount * 30;
    manufacturabilityScore -= params.manufacturability.majorCount * 10;
    manufacturabilityScore -= params.manufacturability.minorCount * 3;
    manufacturabilityScore = Math.max(0, manufacturabilityScore);
  }
  breakdown.push({
    category: "Manufacturability",
    categoryZh: "可制造性",
    score: manufacturabilityScore,
    maxScore: 30,
    notes: `Difficulty: ${params.manufacturability.difficultyScore}/100`,
  });
  
  // Geometry (20 points max)
  let geometryScore = 20;
  const C = params.springIndex;
  if (C < 4 || C > 16) {
    geometryScore = 5;
  } else if (C < 6 || C > 12) {
    geometryScore = 15;
  }
  breakdown.push({
    category: "Geometry",
    categoryZh: "几何设计",
    score: geometryScore,
    maxScore: 20,
    notes: `C = ${C.toFixed(2)}`,
  });
  
  const overallScore = staticSafetyScore + fatigueSafetyScore + manufacturabilityScore + geometryScore;
  
  let rating: ArcDesignScore["rating"];
  let ratingZh: string;
  
  if (overallScore >= 90) {
    rating = "excellent";
    ratingZh = "优秀";
  } else if (overallScore >= 75) {
    rating = "good";
    ratingZh = "良好";
  } else if (overallScore >= 60) {
    rating = "acceptable";
    ratingZh = "可接受";
  } else if (overallScore >= 40) {
    rating = "marginal";
    ratingZh = "边缘";
  } else {
    rating = "poor";
    ratingZh = "差";
  }
  
  return {
    overallScore,
    staticSafetyScore,
    fatigueSafetyScore,
    manufacturabilityScore,
    geometryScore,
    rating,
    ratingZh,
    breakdown,
  };
}

// ============================================================================
// P2: Natural Frequency Analysis
// ============================================================================

export interface ArcVibrationResult {
  naturalFrequency_Hz: number;
  naturalFrequency_rpm: number;
  criticalSpeed_rpm: number;
  effectiveMass_kg: number;
  momentOfInertia_kgmm2: number;
  resonanceRisk: "safe" | "warning" | "danger";
  operatingFrequencyRatio: number | null;
  recommendations: string[];
  recommendationsZh: string[];
}

export function calculateArcVibration(params: {
  R_NmmPerDeg: number;
  d_mm: number;
  D_mm: number;
  n: number;
  r_mm: number;
  alpha0_deg: number;
  materialDensity_kgm3?: number;
  operatingRpm?: number;
}): ArcVibrationResult {
  const {
    R_NmmPerDeg,
    d_mm,
    D_mm,
    n,
    r_mm,
    alpha0_deg,
    materialDensity_kgm3 = 7850,
    operatingRpm,
  } = params;
  
  const recommendations: string[] = [];
  const recommendationsZh: string[] = [];
  
  // Convert rotational stiffness to N·mm/rad
  const R_NmmPerRad = R_NmmPerDeg * (180 / PI);
  
  // Calculate wire length and mass
  const deg2rad = (deg: number) => (deg * PI) / 180;
  const arcLength = r_mm * deg2rad(alpha0_deg);
  const pitchPerTurn = arcLength / n;
  const perTurn = Math.sqrt(Math.pow(PI * D_mm, 2) + Math.pow(pitchPerTurn, 2));
  const wireLength_mm = perTurn * n;
  
  // Wire cross-section area and volume
  const wireArea_mm2 = PI * Math.pow(d_mm / 2, 2);
  const wireVolume_mm3 = wireArea_mm2 * wireLength_mm;
  const mass_kg = wireVolume_mm3 * 1e-9 * materialDensity_kgm3;
  
  // Moment of inertia about rotation axis
  // J ≈ m × r² (simplified)
  const J_kgmm2 = mass_kg * r_mm * r_mm;
  const J_kgm2 = J_kgmm2 * 1e-6;
  
  // Natural frequency: fn = (1/2π) × √(R/J)
  const R_Nm_per_rad = R_NmmPerRad / 1000;
  const omega_n = Math.sqrt(R_Nm_per_rad / J_kgm2);
  const fn_Hz = omega_n / (2 * PI);
  const fn_rpm = fn_Hz * 60;
  
  // Critical speed (typically 0.7-0.8 of natural frequency)
  const criticalSpeed_rpm = fn_rpm * 0.75;
  
  // Resonance risk assessment
  let resonanceRisk: ArcVibrationResult["resonanceRisk"] = "safe";
  let operatingFrequencyRatio: number | null = null;
  
  if (operatingRpm !== undefined && operatingRpm > 0) {
    operatingFrequencyRatio = operatingRpm / fn_rpm;
    
    if (operatingFrequencyRatio > 0.7 && operatingFrequencyRatio < 1.3) {
      resonanceRisk = "danger";
      recommendations.push("Operating speed is near resonance - redesign required");
      recommendationsZh.push("工作转速接近共振 - 需要重新设计");
    } else if (operatingFrequencyRatio > 0.5 && operatingFrequencyRatio < 1.5) {
      resonanceRisk = "warning";
      recommendations.push("Operating speed approaching resonance zone");
      recommendationsZh.push("工作转速接近共振区域");
    }
  }
  
  if (fn_Hz < 20) {
    recommendations.push("Low natural frequency - susceptible to external vibrations");
    recommendationsZh.push("固有频率较低 - 易受外部振动影响");
  }
  
  return {
    naturalFrequency_Hz: fn_Hz,
    naturalFrequency_rpm: fn_rpm,
    criticalSpeed_rpm,
    effectiveMass_kg: mass_kg,
    momentOfInertia_kgmm2: J_kgmm2,
    resonanceRisk,
    operatingFrequencyRatio,
    recommendations,
    recommendationsZh,
  };
}

// ============================================================================
// P2: Temperature Effects
// ============================================================================

export interface ArcTemperatureResult {
  G_adjusted_MPa: number;
  k_adjusted_Nmm: number;
  R_adjusted_NmmPerDeg: number;
  temperatureFactor: number;
  stiffnessChange_percent: number;
  warnings: string[];
  warningsZh: string[];
}

export function calculateArcTemperatureEffects(params: {
  temperature_C: number;
  G0_MPa: number;
  k0_Nmm: number;
  R0_NmmPerDeg: number;
}): ArcTemperatureResult {
  const { temperature_C, G0_MPa, k0_Nmm, R0_NmmPerDeg } = params;
  
  const warnings: string[] = [];
  const warningsZh: string[] = [];
  
  // Temperature factor for shear modulus
  // G decreases approximately 0.03% per °C above 20°C
  const deltaT = temperature_C - 20;
  let tempFactor = 1.0;
  
  if (temperature_C > 20) {
    tempFactor = 1 - 0.0003 * deltaT;
  } else if (temperature_C < -40) {
    warnings.push("Temperature below -40°C: risk of cold brittleness");
    warningsZh.push("温度低于 -40°C：存在冷脆风险");
    tempFactor = 1 + 0.0001 * Math.abs(deltaT);
  }
  
  tempFactor = Math.max(0.5, Math.min(1.1, tempFactor));
  
  if (temperature_C > 150) {
    warnings.push("Temperature above 150°C: significant stiffness reduction");
    warningsZh.push("温度高于 150°C：刚度显著降低");
  }
  if (temperature_C > 250) {
    warnings.push("Temperature above 250°C: consider heat-resistant alloy");
    warningsZh.push("温度高于 250°C：建议使用耐热合金");
  }
  
  const G_adjusted = G0_MPa * tempFactor;
  const k_adjusted = k0_Nmm * tempFactor;
  const R_adjusted = R0_NmmPerDeg * tempFactor;
  const stiffnessChange = (tempFactor - 1) * 100;
  
  return {
    G_adjusted_MPa: G_adjusted,
    k_adjusted_Nmm: k_adjusted,
    R_adjusted_NmmPerDeg: R_adjusted,
    temperatureFactor: tempFactor,
    stiffnessChange_percent: stiffnessChange,
    warnings,
    warningsZh,
  };
}

// ============================================================================
// P2: Centrifugal Force Effects (DMF Application)
// ============================================================================

export interface ArcCentrifugalResult {
  centrifugalForce_N: number;
  additionalFrictionTorque_Nmm: number;
  totalFrictionTorque_Nmm: number;
  frictionIncrease_percent: number;
  effectiveDampingCapacity_percent: number;
  warnings: string[];
  warningsZh: string[];
}

export function calculateArcCentrifugalEffects(params: {
  rpm: number;
  r_mm: number;
  d_mm: number;
  D_mm: number;
  n: number;
  alpha0_deg: number;
  frictionCoeff?: number;
  baseFrictionTorque_Nmm?: number;
  materialDensity_kgm3?: number;
}): ArcCentrifugalResult {
  const {
    rpm,
    r_mm,
    d_mm,
    D_mm,
    n,
    alpha0_deg,
    frictionCoeff = 0.15,
    baseFrictionTorque_Nmm = 0,
    materialDensity_kgm3 = 7850,
  } = params;
  
  const warnings: string[] = [];
  const warningsZh: string[] = [];
  
  // Calculate wire mass
  const deg2rad = (deg: number) => (deg * PI) / 180;
  const arcLength = r_mm * deg2rad(alpha0_deg);
  const pitchPerTurn = arcLength / n;
  const perTurn = Math.sqrt(Math.pow(PI * D_mm, 2) + Math.pow(pitchPerTurn, 2));
  const wireLength_mm = perTurn * n;
  const wireArea_mm2 = PI * Math.pow(d_mm / 2, 2);
  const wireVolume_mm3 = wireArea_mm2 * wireLength_mm;
  const mass_kg = wireVolume_mm3 * 1e-9 * materialDensity_kgm3;
  
  // Angular velocity
  const omega = (rpm * 2 * PI) / 60; // rad/s
  
  // Centrifugal force: F_c = m × r × ω²
  const r_m = r_mm / 1000;
  const centrifugalForce_N = mass_kg * r_m * omega * omega;
  
  // Additional friction torque from centrifugal force
  // M_f = μ × F_c × r
  const additionalFrictionTorque_Nmm = frictionCoeff * centrifugalForce_N * r_mm;
  const totalFrictionTorque_Nmm = baseFrictionTorque_Nmm + additionalFrictionTorque_Nmm;
  
  // Friction increase percentage
  const frictionIncrease = baseFrictionTorque_Nmm > 0 
    ? (additionalFrictionTorque_Nmm / baseFrictionTorque_Nmm) * 100 
    : 0;
  
  // Effective damping capacity (simplified estimate)
  const effectiveDampingCapacity = baseFrictionTorque_Nmm > 0
    ? (totalFrictionTorque_Nmm / baseFrictionTorque_Nmm) * 100
    : 100;
  
  if (rpm > 3000) {
    warnings.push("High RPM: centrifugal effects are significant");
    warningsZh.push("高转速：离心力效应显著");
  }
  if (frictionIncrease > 50) {
    warnings.push("Centrifugal friction increase exceeds 50%");
    warningsZh.push("离心摩擦增加超过 50%");
  }
  
  return {
    centrifugalForce_N,
    additionalFrictionTorque_Nmm,
    totalFrictionTorque_Nmm,
    frictionIncrease_percent: frictionIncrease,
    effectiveDampingCapacity_percent: effectiveDampingCapacity,
    warnings,
    warningsZh,
  };
}

// ============================================================================
// P3: Creep / Relaxation Analysis
// ============================================================================

export interface ArcCreepResult {
  torqueLoss_percent: number;
  torqueLoss_Nmm: number;
  finalTorque_Nmm: number;
  creepRate_percentPerHour: number;
  timeToRelax10Percent_hours: number | null;
  relaxationCurve: Array<{ hours: number; torquePercent: number }>;
  warnings: string[];
  warningsZh: string[];
}

export function calculateArcCreep(params: {
  initialTorque_Nmm: number;
  temperature_C: number;
  duration_hours: number;
  stressRatio?: number;
}): ArcCreepResult {
  const {
    initialTorque_Nmm,
    temperature_C,
    duration_hours,
    stressRatio = 0.5,
  } = params;
  
  const warnings: string[] = [];
  const warningsZh: string[] = [];
  
  // Base creep rate at 20°C (% per 1000 hours)
  let baseCreepRate = 0.1;
  
  // Temperature acceleration
  const tempFactor = Math.exp((temperature_C - 20) / 50);
  
  // Stress acceleration
  const stressFactor = Math.pow(stressRatio, 2);
  
  // Effective creep rate (% per hour)
  const creepRate = (baseCreepRate / 1000) * tempFactor * stressFactor;
  
  // Logarithmic relaxation model
  const A = creepRate * 10;
  const t0 = 1;
  
  const torqueLoss_percent = A * Math.log(1 + duration_hours / t0) * 100;
  const torqueLoss_Nmm = initialTorque_Nmm * (torqueLoss_percent / 100);
  const finalTorque_Nmm = initialTorque_Nmm - torqueLoss_Nmm;
  
  const timeToRelax10Percent = torqueLoss_percent > 0 
    ? t0 * (Math.exp(0.1 / A) - 1)
    : null;
  
  // Generate relaxation curve
  const relaxationCurve: Array<{ hours: number; torquePercent: number }> = [];
  for (let i = 0; i <= 20; i++) {
    const t = (duration_hours * i) / 20;
    const loss = A * Math.log(1 + t / t0) * 100;
    relaxationCurve.push({
      hours: t,
      torquePercent: 100 - Math.min(loss, 50),
    });
  }
  
  if (temperature_C > 100) {
    warnings.push("Elevated temperature accelerates creep");
    warningsZh.push("高温加速蠕变");
  }
  if (torqueLoss_percent > 5) {
    warnings.push("Significant torque loss expected");
    warningsZh.push("预计扭矩损失显著");
  }
  
  return {
    torqueLoss_percent: Math.min(torqueLoss_percent, 50),
    torqueLoss_Nmm,
    finalTorque_Nmm: Math.max(0, finalTorque_Nmm),
    creepRate_percentPerHour: creepRate * 100,
    timeToRelax10Percent_hours: timeToRelax10Percent,
    relaxationCurve,
    warnings,
    warningsZh,
  };
}
