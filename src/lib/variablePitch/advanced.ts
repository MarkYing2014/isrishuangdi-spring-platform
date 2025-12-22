/**
 * Variable Pitch Compression Spring Advanced Analysis Module
 * 变节距压缩弹簧高级分析模块
 * 
 * P1: Manufacturability check, Fatigue life prediction, Scoring system
 * P2: Buckling risk, Natural frequency, Temperature effects
 * P3: Creep/relaxation analysis
 */

import type { VariablePitchSegment } from "@/lib/springMath";

const PI = Math.PI;

// ============================================================================
// P1: Manufacturability Check
// ============================================================================

export interface VPManufacturabilityIssue {
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

export interface VPManufacturabilityResult {
  isManufacturable: boolean;
  difficultyScore: number;
  issues: VPManufacturabilityIssue[];
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  recommendedProcess: string;
  pitchRatio: number;
  minPitch: number;
  maxPitch: number;
  summary: string;
  summaryZh: string;
}

const VP_MANUFACTURING_LIMITS = {
  minWireDiameter: 0.3,
  maxWireDiameter: 16.0,
  minSpringIndex: 4,
  maxSpringIndex: 20,
  optimalSpringIndexMin: 5,
  optimalSpringIndexMax: 12,
  minActiveCoils: 2,
  maxActiveCoils: 30,
  maxSegments: 6,
  maxPitchRatio: 3.0,       // max_pitch / min_pitch
  minPitchToWireRatio: 1.1, // pitch / d
};

function checkWireDiameter(d: number): VPManufacturabilityIssue | null {
  if (d < VP_MANUFACTURING_LIMITS.minWireDiameter) {
    return {
      code: "WIRE_TOO_THIN",
      severity: "critical",
      description: `Wire diameter ${d}mm is below minimum ${VP_MANUFACTURING_LIMITS.minWireDiameter}mm`,
      descriptionZh: `线径 ${d}mm 低于最小值 ${VP_MANUFACTURING_LIMITS.minWireDiameter}mm`,
      parameter: "d",
      currentValue: d,
      requiredValue: `≥ ${VP_MANUFACTURING_LIMITS.minWireDiameter} mm`,
      suggestion: "Increase wire diameter",
      suggestionZh: "增加线径",
    };
  }
  if (d > VP_MANUFACTURING_LIMITS.maxWireDiameter) {
    return {
      code: "WIRE_TOO_THICK",
      severity: "critical",
      description: `Wire diameter ${d}mm exceeds maximum ${VP_MANUFACTURING_LIMITS.maxWireDiameter}mm`,
      descriptionZh: `线径 ${d}mm 超过最大值 ${VP_MANUFACTURING_LIMITS.maxWireDiameter}mm`,
      parameter: "d",
      currentValue: d,
      requiredValue: `≤ ${VP_MANUFACTURING_LIMITS.maxWireDiameter} mm`,
      suggestion: "Reduce wire diameter or use specialized equipment",
      suggestionZh: "减小线径或使用专用设备",
    };
  }
  return null;
}

function checkSpringIndex(D: number, d: number): VPManufacturabilityIssue | null {
  const C = D / d;
  
  if (C < VP_MANUFACTURING_LIMITS.minSpringIndex) {
    return {
      code: "SPRING_INDEX_TOO_LOW",
      severity: "critical",
      description: `Spring index C=${C.toFixed(1)} is too low (< ${VP_MANUFACTURING_LIMITS.minSpringIndex})`,
      descriptionZh: `弹簧指数 C=${C.toFixed(1)} 过低 (< ${VP_MANUFACTURING_LIMITS.minSpringIndex})`,
      parameter: "D/d",
      currentValue: C.toFixed(2),
      requiredValue: `≥ ${VP_MANUFACTURING_LIMITS.minSpringIndex}`,
      suggestion: "Increase mean diameter D or reduce wire diameter d",
      suggestionZh: "增加中径 D 或减小线径 d",
    };
  }
  
  if (C > VP_MANUFACTURING_LIMITS.maxSpringIndex) {
    return {
      code: "SPRING_INDEX_TOO_HIGH",
      severity: "major",
      description: `Spring index C=${C.toFixed(1)} is high (> ${VP_MANUFACTURING_LIMITS.maxSpringIndex})`,
      descriptionZh: `弹簧指数 C=${C.toFixed(1)} 偏高 (> ${VP_MANUFACTURING_LIMITS.maxSpringIndex})`,
      parameter: "D/d",
      currentValue: C.toFixed(2),
      requiredValue: `≤ ${VP_MANUFACTURING_LIMITS.maxSpringIndex}`,
      suggestion: "Reduce mean diameter D or increase wire diameter d",
      suggestionZh: "减小中径 D 或增加线径 d",
    };
  }
  
  if (C < VP_MANUFACTURING_LIMITS.optimalSpringIndexMin || 
      C > VP_MANUFACTURING_LIMITS.optimalSpringIndexMax) {
    return {
      code: "SPRING_INDEX_SUBOPTIMAL",
      severity: "minor",
      description: `Spring index C=${C.toFixed(1)} outside optimal range (${VP_MANUFACTURING_LIMITS.optimalSpringIndexMin}-${VP_MANUFACTURING_LIMITS.optimalSpringIndexMax})`,
      descriptionZh: `弹簧指数 C=${C.toFixed(1)} 在最优范围外 (${VP_MANUFACTURING_LIMITS.optimalSpringIndexMin}-${VP_MANUFACTURING_LIMITS.optimalSpringIndexMax})`,
      parameter: "D/d",
      currentValue: C.toFixed(2),
      requiredValue: `${VP_MANUFACTURING_LIMITS.optimalSpringIndexMin} - ${VP_MANUFACTURING_LIMITS.optimalSpringIndexMax}`,
      suggestion: "Adjust D/d ratio for optimal manufacturability",
      suggestionZh: "调整 D/d 比例以获得最佳可制造性",
    };
  }
  
  return null;
}

function checkActiveCoils(n: number): VPManufacturabilityIssue | null {
  if (n < VP_MANUFACTURING_LIMITS.minActiveCoils) {
    return {
      code: "TOO_FEW_COILS",
      severity: "major",
      description: `Active coils n=${n} is below minimum ${VP_MANUFACTURING_LIMITS.minActiveCoils}`,
      descriptionZh: `有效圈数 n=${n} 低于最小值 ${VP_MANUFACTURING_LIMITS.minActiveCoils}`,
      parameter: "n",
      currentValue: n,
      requiredValue: `≥ ${VP_MANUFACTURING_LIMITS.minActiveCoils}`,
      suggestion: "Increase number of active coils",
      suggestionZh: "增加有效圈数",
    };
  }
  if (n > VP_MANUFACTURING_LIMITS.maxActiveCoils) {
    return {
      code: "MANY_COILS",
      severity: "minor",
      description: `Active coils n=${n} is high - may require special handling`,
      descriptionZh: `有效圈数 n=${n} 较多 - 可能需要特殊处理`,
      parameter: "n",
      currentValue: n,
      requiredValue: `≤ ${VP_MANUFACTURING_LIMITS.maxActiveCoils}`,
      suggestion: "Consider design optimization to reduce coil count",
      suggestionZh: "考虑优化设计以减少圈数",
    };
  }
  return null;
}

function checkSegments(segments: VariablePitchSegment[], d: number): VPManufacturabilityIssue[] {
  const issues: VPManufacturabilityIssue[] = [];
  
  if (segments.length > VP_MANUFACTURING_LIMITS.maxSegments) {
    issues.push({
      code: "TOO_MANY_SEGMENTS",
      severity: "major",
      description: `${segments.length} segments exceeds recommended maximum ${VP_MANUFACTURING_LIMITS.maxSegments}`,
      descriptionZh: `${segments.length} 个分段超过推荐最大值 ${VP_MANUFACTURING_LIMITS.maxSegments}`,
      parameter: "segments",
      currentValue: segments.length,
      requiredValue: `≤ ${VP_MANUFACTURING_LIMITS.maxSegments}`,
      suggestion: "Simplify design by reducing segment count",
      suggestionZh: "简化设计，减少分段数量",
    });
  }
  
  const pitches = segments.map(s => s.pitch).filter(p => isFinite(p) && p > 0);
  if (pitches.length >= 2) {
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const pitchRatio = maxPitch / minPitch;
    
    if (pitchRatio > VP_MANUFACTURING_LIMITS.maxPitchRatio) {
      issues.push({
        code: "PITCH_RATIO_TOO_HIGH",
        severity: "major",
        description: `Pitch ratio ${pitchRatio.toFixed(2)} exceeds ${VP_MANUFACTURING_LIMITS.maxPitchRatio}`,
        descriptionZh: `节距比 ${pitchRatio.toFixed(2)} 超过 ${VP_MANUFACTURING_LIMITS.maxPitchRatio}`,
        parameter: "pitch_ratio",
        currentValue: pitchRatio.toFixed(2),
        requiredValue: `≤ ${VP_MANUFACTURING_LIMITS.maxPitchRatio}`,
        suggestion: "Reduce difference between max and min pitch",
        suggestionZh: "减小最大和最小节距之间的差异",
      });
    }
  }
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.pitch < d * VP_MANUFACTURING_LIMITS.minPitchToWireRatio) {
      issues.push({
        code: `PITCH_TOO_SMALL_SEG${i + 1}`,
        severity: "minor",
        description: `Segment ${i + 1} pitch ${seg.pitch.toFixed(2)}mm is close to wire diameter`,
        descriptionZh: `分段 ${i + 1} 节距 ${seg.pitch.toFixed(2)}mm 接近线径`,
        parameter: `segment[${i}].pitch`,
        currentValue: seg.pitch.toFixed(2),
        requiredValue: `≥ ${(d * VP_MANUFACTURING_LIMITS.minPitchToWireRatio).toFixed(2)} mm`,
        suggestion: "Increase pitch or this segment will be nearly solid",
        suggestionZh: "增加节距，否则此分段几乎处于并紧状态",
      });
    }
  }
  
  return issues;
}

function calculateVPDifficultyScore(
  d: number,
  D: number,
  segments: VariablePitchSegment[],
  activeCoils: number
): number {
  let score = 0;
  const C = D / d;
  
  // Wire diameter difficulty
  if (d < 0.8) score += 25;
  else if (d < 1.5) score += 15;
  else if (d > 10) score += 20;
  
  // Spring index difficulty
  if (C < 5 || C > 15) score += 15;
  else if (C < 6 || C > 12) score += 5;
  
  // Segment complexity
  score += segments.length * 5;
  
  // Pitch variation difficulty
  const pitches = segments.map(s => s.pitch).filter(p => isFinite(p) && p > 0);
  if (pitches.length >= 2) {
    const pitchRatio = Math.max(...pitches) / Math.min(...pitches);
    if (pitchRatio > 2.5) score += 20;
    else if (pitchRatio > 2.0) score += 10;
    else if (pitchRatio > 1.5) score += 5;
  }
  
  // Coil count difficulty
  if (activeCoils > 20) score += 10;
  else if (activeCoils > 15) score += 5;
  
  return Math.min(100, score);
}

export function checkVPManufacturability(params: {
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  segments: VariablePitchSegment[];
}): VPManufacturabilityResult {
  const { wireDiameter, meanDiameter, activeCoils, segments } = params;
  const issues: VPManufacturabilityIssue[] = [];
  
  // Run checks
  const wireCheck = checkWireDiameter(wireDiameter);
  if (wireCheck) issues.push(wireCheck);
  
  const indexCheck = checkSpringIndex(meanDiameter, wireDiameter);
  if (indexCheck) issues.push(indexCheck);
  
  const coilCheck = checkActiveCoils(activeCoils);
  if (coilCheck) issues.push(coilCheck);
  
  const segmentIssues = checkSegments(segments, wireDiameter);
  issues.push(...segmentIssues);
  
  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const majorCount = issues.filter(i => i.severity === "major").length;
  const minorCount = issues.filter(i => i.severity === "minor").length;
  
  const isManufacturable = criticalCount === 0;
  const difficultyScore = calculateVPDifficultyScore(wireDiameter, meanDiameter, segments, activeCoils);
  
  const pitches = segments.map(s => s.pitch).filter(p => isFinite(p) && p > 0);
  const minPitch = pitches.length > 0 ? Math.min(...pitches) : 0;
  const maxPitch = pitches.length > 0 ? Math.max(...pitches) : 0;
  const pitchRatio = minPitch > 0 ? maxPitch / minPitch : 1;
  
  const recommendedProcess = wireDiameter > 8 
    ? "Hot coiling with heat treatment"
    : wireDiameter < 1.0 
      ? "Precision CNC cold coiling"
      : segments.length > 3
        ? "CNC cold coiling with multi-pitch programming"
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
    pitchRatio,
    minPitch,
    maxPitch,
    summary,
    summaryZh,
  };
}

// ============================================================================
// P1: Fatigue Life Prediction
// ============================================================================

export interface VPFatigueLifeResult {
  estimatedCycles: number;
  rating: "infinite" | "high" | "medium" | "low" | "very_low";
  message: { en: string; zh: string };
  tauA: number;
  tauM: number;
  tauMax: number;
  tauMin: number;
  Se: number | null;
  Su: number | null;
  goodmanFoS: number | null;
  gerberFoS: number | null;
}

export function calculateVPFatigueLife(params: {
  tauMax_MPa: number;
  tauMin_MPa?: number;
  Su_MPa?: number;
  Se_MPa?: number;
}): VPFatigueLifeResult {
  const tauMax = params.tauMax_MPa;
  const tauMin = params.tauMin_MPa ?? 0;
  
  const tauA = (tauMax - tauMin) / 2;
  const tauM = (tauMax + tauMin) / 2;
  
  const Su = params.Su_MPa ?? 1700;
  const SePrime = params.Se_MPa ?? 0.29 * Su;
  const Se = SePrime / (1 + tauM / (0.577 * Su));
  
  const goodmanDen = tauA / Se + tauM / (0.577 * Su);
  const goodmanFoS = goodmanDen > 0 ? 1 / goodmanDen : null;
  
  const gerberDen = tauA / Se + Math.pow(tauM / (0.577 * Su), 2);
  const gerberFoS = gerberDen > 0 ? 1 / gerberDen : null;
  
  let estimatedCycles = Infinity;
  
  if (Su && Se && Se > 0) {
    const N1 = 1e3;
    const N2 = 1e6;
    const S1 = 0.9 * 0.577 * Su;
    const S2 = Se;
    
    const b = Math.log(S1 / S2) / Math.log(N2 / N1);
    const A = S1 * Math.pow(N1, b);
    
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
  
  let rating: VPFatigueLifeResult["rating"];
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
  };
}

// ============================================================================
// P1: Comprehensive Scoring System
// ============================================================================

export interface VPDesignScore {
  overallScore: number;
  staticSafetyScore: number;
  fatigueSafetyScore: number;
  manufacturabilityScore: number;
  geometryScore: number;
  bucklingScore: number;
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

export function calculateVPDesignScore(params: {
  manufacturability: VPManufacturabilityResult;
  fatigueLife: VPFatigueLifeResult;
  staticSF: number;
  fatigueSF: number | null;
  springIndex: number;
  slendernessRatio?: number;
  bucklingRisk?: "safe" | "warning" | "danger";
}): VPDesignScore {
  const breakdown: VPDesignScore["breakdown"] = [];
  
  // Static Safety (20 points max)
  let staticSafetyScore = 20;
  if (params.staticSF < 1.0) {
    staticSafetyScore = 0;
  } else if (params.staticSF < 1.2) {
    staticSafetyScore = 8;
  } else if (params.staticSF < 1.5) {
    staticSafetyScore = 15;
  }
  breakdown.push({
    category: "Static Safety",
    categoryZh: "静强度安全",
    score: staticSafetyScore,
    maxScore: 20,
    notes: `SF = ${params.staticSF.toFixed(2)}`,
  });
  
  // Fatigue Safety (20 points max)
  let fatigueSafetyScore = 20;
  const fatigueSF = params.fatigueSF ?? params.fatigueLife.goodmanFoS;
  if (fatigueSF === null || fatigueSF < 1.0) {
    fatigueSafetyScore = 0;
  } else if (fatigueSF < 1.2) {
    fatigueSafetyScore = 8;
  } else if (fatigueSF < 1.5) {
    fatigueSafetyScore = 15;
  }
  breakdown.push({
    category: "Fatigue Safety",
    categoryZh: "疲劳安全",
    score: fatigueSafetyScore,
    maxScore: 20,
    notes: `SF = ${fatigueSF?.toFixed(2) ?? "N/A"}`,
  });
  
  // Manufacturability (25 points max)
  let manufacturabilityScore = 25;
  if (!params.manufacturability.isManufacturable) {
    manufacturabilityScore = 0;
  } else {
    manufacturabilityScore -= params.manufacturability.criticalCount * 25;
    manufacturabilityScore -= params.manufacturability.majorCount * 8;
    manufacturabilityScore -= params.manufacturability.minorCount * 2;
    manufacturabilityScore = Math.max(0, manufacturabilityScore);
  }
  breakdown.push({
    category: "Manufacturability",
    categoryZh: "可制造性",
    score: manufacturabilityScore,
    maxScore: 25,
    notes: `Difficulty: ${params.manufacturability.difficultyScore}/100`,
  });
  
  // Geometry (15 points max)
  let geometryScore = 15;
  const C = params.springIndex;
  if (C < 4 || C > 20) {
    geometryScore = 3;
  } else if (C < 5 || C > 15) {
    geometryScore = 10;
  }
  breakdown.push({
    category: "Geometry",
    categoryZh: "几何设计",
    score: geometryScore,
    maxScore: 15,
    notes: `C = ${C.toFixed(2)}`,
  });
  
  // Buckling (20 points max)
  let bucklingScore = 20;
  if (params.bucklingRisk === "danger") {
    bucklingScore = 0;
  } else if (params.bucklingRisk === "warning") {
    bucklingScore = 10;
  } else if (params.slendernessRatio !== undefined && params.slendernessRatio > 4) {
    bucklingScore = 12;
  }
  breakdown.push({
    category: "Buckling Stability",
    categoryZh: "屈曲稳定性",
    score: bucklingScore,
    maxScore: 20,
    notes: params.slendernessRatio !== undefined 
      ? `λ = ${params.slendernessRatio.toFixed(2)}` 
      : "N/A",
  });
  
  const overallScore = staticSafetyScore + fatigueSafetyScore + manufacturabilityScore + geometryScore + bucklingScore;
  
  let rating: VPDesignScore["rating"];
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
    bucklingScore,
    rating,
    ratingZh,
    breakdown,
  };
}

// ============================================================================
// P2: Buckling Risk Assessment
// ============================================================================

export interface VPBucklingResult {
  slendernessRatio: number;
  criticalLoad_N: number;
  bucklingRisk: "safe" | "warning" | "danger";
  safetyFactor: number;
  effectiveLength_mm: number;
  endConditionFactor: number;
  recommendations: string[];
  recommendationsZh: string[];
}

export function calculateVPBuckling(params: {
  wireDiameter_mm: number;
  meanDiameter_mm: number;
  freeLength_mm: number;
  deflection_mm: number;
  currentLoad_N: number;
  shearModulus_MPa: number;
  endCondition?: "fixed-fixed" | "fixed-free" | "fixed-guided" | "free-free";
}): VPBucklingResult {
  const {
    wireDiameter_mm: d,
    meanDiameter_mm: D,
    freeLength_mm: L0,
    deflection_mm: delta,
    currentLoad_N: F,
    shearModulus_MPa: G,
    endCondition = "fixed-guided",
  } = params;
  
  const recommendations: string[] = [];
  const recommendationsZh: string[] = [];
  
  // End condition factors (K)
  const endFactors: Record<string, number> = {
    "fixed-fixed": 0.5,
    "fixed-guided": 0.707,
    "fixed-free": 2.0,
    "free-free": 1.0,
  };
  const K = endFactors[endCondition] ?? 0.707;
  
  // Current length
  const L = Math.max(d, L0 - delta);
  
  // Slenderness ratio λ = L / D
  const slendernessRatio = L / D;
  
  // Effective length
  const Leff = K * L;
  
  // Critical buckling load (Haringx formula for helical springs)
  // P_cr ≈ (π² × G × d⁴) / (8 × D × L_eff²) × correction
  const E = G * 2.6; // Approximate E from G
  const I = (PI * Math.pow(d, 4)) / 64;
  const P_cr_euler = (PI * PI * E * I) / (Leff * Leff);
  
  // Haringx correction for helical springs
  const C = D / d;
  const haringxFactor = 1 / (1 + 2 / (C * C));
  const criticalLoad = P_cr_euler * haringxFactor;
  
  // Safety factor
  const safetyFactor = F > 0 ? criticalLoad / F : Infinity;
  
  // Risk assessment
  let bucklingRisk: VPBucklingResult["bucklingRisk"] = "safe";
  
  if (safetyFactor < 1.5) {
    bucklingRisk = "danger";
    recommendations.push("Critical buckling risk - redesign required");
    recommendationsZh.push("严重屈曲风险 - 需要重新设计");
  } else if (safetyFactor < 2.5) {
    bucklingRisk = "warning";
    recommendations.push("Buckling risk present - consider guided ends");
    recommendationsZh.push("存在屈曲风险 - 考虑使用导向端");
  }
  
  if (slendernessRatio > 5) {
    recommendations.push("High slenderness ratio - spring may be unstable");
    recommendationsZh.push("细长比过高 - 弹簧可能不稳定");
  }
  
  if (slendernessRatio > 4 && endCondition === "fixed-free") {
    recommendations.push("Consider fixed-guided end condition for better stability");
    recommendationsZh.push("建议使用固定-导向端部条件以提高稳定性");
  }
  
  return {
    slendernessRatio,
    criticalLoad_N: criticalLoad,
    bucklingRisk,
    safetyFactor: isFinite(safetyFactor) ? safetyFactor : Infinity,
    effectiveLength_mm: Leff,
    endConditionFactor: K,
    recommendations,
    recommendationsZh,
  };
}

// ============================================================================
// P2: Natural Frequency Analysis
// ============================================================================

export interface VPVibrationResult {
  naturalFrequency_Hz: number;
  naturalFrequency_rpm: number;
  surgingFrequency_Hz: number;
  effectiveMass_kg: number;
  resonanceRisk: "safe" | "warning" | "danger";
  operatingFrequencyRatio: number | null;
  recommendations: string[];
  recommendationsZh: string[];
}

export function calculateVPVibration(params: {
  springRate_Nmm: number;
  wireDiameter_mm: number;
  meanDiameter_mm: number;
  activeCoils: number;
  materialDensity_kgm3?: number;
  operatingFrequency_Hz?: number;
}): VPVibrationResult {
  const {
    springRate_Nmm,
    wireDiameter_mm: d,
    meanDiameter_mm: D,
    activeCoils: Na,
    materialDensity_kgm3 = 7850,
    operatingFrequency_Hz,
  } = params;
  
  const recommendations: string[] = [];
  const recommendationsZh: string[] = [];
  
  // Wire length and mass
  const wireLength_mm = PI * D * Na;
  const wireArea_mm2 = PI * (d / 2) * (d / 2);
  const wireVolume_mm3 = wireArea_mm2 * wireLength_mm;
  const mass_kg = wireVolume_mm3 * 1e-9 * materialDensity_kgm3;
  
  // Effective mass (1/3 of total mass for compression springs)
  const effectiveMass_kg = mass_kg / 3;
  
  // Natural frequency: fn = (1/2π) × √(k/m)
  const k_Nm = springRate_Nmm; // N/mm = kN/m
  const fn_Hz = (1 / (2 * PI)) * Math.sqrt((k_Nm * 1000) / effectiveMass_kg);
  const fn_rpm = fn_Hz * 60;
  
  // Surging frequency (wave propagation in spring)
  // f_surge ≈ (d / (π × D² × Na)) × √(G / (2 × ρ))
  const G = 79300; // Typical shear modulus MPa
  const surgingFrequency_Hz = (d / (PI * D * D * Na)) * Math.sqrt((G * 1e6) / (2 * materialDensity_kgm3)) * 1000;
  
  // Resonance risk assessment
  let resonanceRisk: VPVibrationResult["resonanceRisk"] = "safe";
  let operatingFrequencyRatio: number | null = null;
  
  if (operatingFrequency_Hz !== undefined && operatingFrequency_Hz > 0) {
    operatingFrequencyRatio = operatingFrequency_Hz / fn_Hz;
    
    if (operatingFrequencyRatio > 0.7 && operatingFrequencyRatio < 1.3) {
      resonanceRisk = "danger";
      recommendations.push("Operating frequency near resonance - redesign required");
      recommendationsZh.push("工作频率接近共振 - 需要重新设计");
    } else if (operatingFrequencyRatio > 0.5 && operatingFrequencyRatio < 1.5) {
      resonanceRisk = "warning";
      recommendations.push("Operating frequency approaching resonance zone");
      recommendationsZh.push("工作频率接近共振区域");
    }
  }
  
  if (fn_Hz < 15) {
    recommendations.push("Low natural frequency - susceptible to external vibrations");
    recommendationsZh.push("固有频率较低 - 易受外部振动影响");
  }
  
  return {
    naturalFrequency_Hz: fn_Hz,
    naturalFrequency_rpm: fn_rpm,
    surgingFrequency_Hz,
    effectiveMass_kg,
    resonanceRisk,
    operatingFrequencyRatio,
    recommendations,
    recommendationsZh,
  };
}

// ============================================================================
// P2: Temperature Effects
// ============================================================================

export interface VPTemperatureResult {
  G_adjusted_MPa: number;
  k_adjusted_Nmm: number;
  temperatureFactor: number;
  stiffnessChange_percent: number;
  warnings: string[];
  warningsZh: string[];
}

export function calculateVPTemperatureEffects(params: {
  temperature_C: number;
  G0_MPa: number;
  k0_Nmm: number;
}): VPTemperatureResult {
  const { temperature_C, G0_MPa, k0_Nmm } = params;
  
  const warnings: string[] = [];
  const warningsZh: string[] = [];
  
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
  const stiffnessChange = (tempFactor - 1) * 100;
  
  return {
    G_adjusted_MPa: G_adjusted,
    k_adjusted_Nmm: k_adjusted,
    temperatureFactor: tempFactor,
    stiffnessChange_percent: stiffnessChange,
    warnings,
    warningsZh,
  };
}

// ============================================================================
// P3: Creep / Relaxation Analysis
// ============================================================================

export interface VPCreepResult {
  loadLoss_percent: number;
  loadLoss_N: number;
  finalLoad_N: number;
  creepRate_percentPerHour: number;
  timeToRelax10Percent_hours: number | null;
  relaxationCurve: Array<{ hours: number; loadPercent: number }>;
  warnings: string[];
  warningsZh: string[];
}

export function calculateVPCreep(params: {
  initialLoad_N: number;
  temperature_C: number;
  duration_hours: number;
  stressRatio?: number;
}): VPCreepResult {
  const {
    initialLoad_N,
    temperature_C,
    duration_hours,
    stressRatio = 0.5,
  } = params;
  
  const warnings: string[] = [];
  const warningsZh: string[] = [];
  
  const baseCreepRate = 0.1;
  const tempFactor = Math.exp((temperature_C - 20) / 50);
  const stressFactor = Math.pow(stressRatio, 2);
  const creepRate = (baseCreepRate / 1000) * tempFactor * stressFactor;
  
  const A = creepRate * 10;
  const t0 = 1;
  
  const loadLoss_percent = A * Math.log(1 + duration_hours / t0) * 100;
  const loadLoss_N = initialLoad_N * (loadLoss_percent / 100);
  const finalLoad_N = initialLoad_N - loadLoss_N;
  
  const timeToRelax10Percent = loadLoss_percent > 0 
    ? t0 * (Math.exp(0.1 / A) - 1)
    : null;
  
  const relaxationCurve: Array<{ hours: number; loadPercent: number }> = [];
  for (let i = 0; i <= 20; i++) {
    const t = (duration_hours * i) / 20;
    const loss = A * Math.log(1 + t / t0) * 100;
    relaxationCurve.push({
      hours: t,
      loadPercent: 100 - Math.min(loss, 50),
    });
  }
  
  if (temperature_C > 100) {
    warnings.push("Elevated temperature accelerates creep");
    warningsZh.push("高温加速蠕变");
  }
  if (loadLoss_percent > 5) {
    warnings.push("Significant load loss expected");
    warningsZh.push("预计载荷损失显著");
  }
  
  return {
    loadLoss_percent: Math.min(loadLoss_percent, 50),
    loadLoss_N,
    finalLoad_N: Math.max(0, finalLoad_N),
    creepRate_percentPerHour: creepRate * 100,
    timeToRelax10Percent_hours: timeToRelax10Percent,
    relaxationCurve,
    warnings,
    warningsZh,
  };
}
