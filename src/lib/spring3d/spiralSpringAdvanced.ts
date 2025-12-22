/**
 * Spiral Torsion Spring Advanced Analysis Module
 * 螺旋扭转弹簧高级分析模块
 * 
 * P1: Manufacturability check, Fatigue life prediction
 * P2: Natural frequency, Temperature effects
 * P3: Creep/relaxation, Friction/hysteresis
 */

import {
  getSpiralSpringMaterial,
  type SpiralSpringMaterial,
} from "./spiralSpringMaterials";

// ============================================================================
// P1: Manufacturability Check
// ============================================================================

export interface SpiralManufacturabilityIssue {
  code: string;
  severity: "critical" | "major" | "minor" | "info";
  description: string;
  parameter: string;
  currentValue: number | string;
  requiredValue: string;
  suggestion: string;
  costImpact: "none" | "low" | "medium" | "high";
}

export interface SpiralManufacturabilityResult {
  isManufacturable: boolean;
  difficultyScore: number;
  issues: SpiralManufacturabilityIssue[];
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  recommendedProcess: string;
  toolingRequirements: string[];
  qcCheckpoints: string[];
  summary: string;
}

export interface SpiralManufacturabilityParams {
  stripWidth: number;      // b (mm)
  stripThickness: number;  // t (mm)
  activeLength: number;    // L (mm)
  innerDiameter: number;   // Di (mm)
  outerDiameter: number;   // Do (mm)
  activeCoils: number;     // n
  materialId?: SpiralSpringMaterial["id"];
  productionVolume?: "prototype" | "low" | "medium" | "high";
}

const SPIRAL_MANUFACTURING_LIMITS = {
  minThickness: 0.1,       // mm
  maxThickness: 3.0,       // mm
  minWidth: 2.0,           // mm
  maxWidth: 50.0,          // mm
  minBtRatio: 6,           // b/t ratio
  maxBtRatio: 60,          // b/t ratio
  optimalBtRatioMin: 8,
  optimalBtRatioMax: 40,
  minActiveLength: 50,     // mm
  maxActiveLength: 5000,   // mm
  minCoils: 2,
  maxCoils: 30,
  minInnerDiameter: 5,     // mm
};

function checkStripThickness(t: number): SpiralManufacturabilityIssue | null {
  if (t < SPIRAL_MANUFACTURING_LIMITS.minThickness) {
    return {
      code: "THICKNESS_TOO_THIN",
      severity: "critical",
      description: "Strip thickness below minimum manufacturing capability",
      parameter: "stripThickness",
      currentValue: t,
      requiredValue: `≥ ${SPIRAL_MANUFACTURING_LIMITS.minThickness} mm`,
      suggestion: "Increase strip thickness or use specialized thin-strip equipment",
      costImpact: "high",
    };
  }
  if (t > SPIRAL_MANUFACTURING_LIMITS.maxThickness) {
    return {
      code: "THICKNESS_TOO_THICK",
      severity: "critical",
      description: "Strip thickness exceeds typical spiral spring range",
      parameter: "stripThickness",
      currentValue: t,
      requiredValue: `≤ ${SPIRAL_MANUFACTURING_LIMITS.maxThickness} mm`,
      suggestion: "Reduce thickness or consider alternative spring type",
      costImpact: "high",
    };
  }
  return null;
}

function checkStripWidth(b: number): SpiralManufacturabilityIssue | null {
  if (b < SPIRAL_MANUFACTURING_LIMITS.minWidth) {
    return {
      code: "WIDTH_TOO_NARROW",
      severity: "major",
      description: "Strip width is very narrow - handling difficulties",
      parameter: "stripWidth",
      currentValue: b,
      requiredValue: `≥ ${SPIRAL_MANUFACTURING_LIMITS.minWidth} mm`,
      suggestion: "Increase strip width for easier handling",
      costImpact: "medium",
    };
  }
  if (b > SPIRAL_MANUFACTURING_LIMITS.maxWidth) {
    return {
      code: "WIDTH_TOO_WIDE",
      severity: "major",
      description: "Strip width exceeds standard coiling equipment",
      parameter: "stripWidth",
      currentValue: b,
      requiredValue: `≤ ${SPIRAL_MANUFACTURING_LIMITS.maxWidth} mm`,
      suggestion: "Reduce width or use specialized wide-strip equipment",
      costImpact: "high",
    };
  }
  return null;
}

function checkBtRatio(b: number, t: number): SpiralManufacturabilityIssue | null {
  const btRatio = b / t;

  if (btRatio < SPIRAL_MANUFACTURING_LIMITS.minBtRatio) {
    return {
      code: "BT_RATIO_TOO_LOW",
      severity: "critical",
      description: "b/t ratio too low - strip will buckle during winding",
      parameter: "b/t ratio",
      currentValue: btRatio.toFixed(1),
      requiredValue: `≥ ${SPIRAL_MANUFACTURING_LIMITS.minBtRatio}`,
      suggestion: "Increase width or decrease thickness",
      costImpact: "none",
    };
  }

  if (btRatio > SPIRAL_MANUFACTURING_LIMITS.maxBtRatio) {
    return {
      code: "BT_RATIO_TOO_HIGH",
      severity: "major",
      description: "b/t ratio very high - edge waviness risk",
      parameter: "b/t ratio",
      currentValue: btRatio.toFixed(1),
      requiredValue: `≤ ${SPIRAL_MANUFACTURING_LIMITS.maxBtRatio}`,
      suggestion: "Decrease width or increase thickness",
      costImpact: "low",
    };
  }

  if (btRatio < SPIRAL_MANUFACTURING_LIMITS.optimalBtRatioMin ||
    btRatio > SPIRAL_MANUFACTURING_LIMITS.optimalBtRatioMax) {
    return {
      code: "BT_RATIO_SUBOPTIMAL",
      severity: "minor",
      description: "b/t ratio outside optimal range",
      parameter: "b/t ratio",
      currentValue: btRatio.toFixed(1),
      requiredValue: `${SPIRAL_MANUFACTURING_LIMITS.optimalBtRatioMin} - ${SPIRAL_MANUFACTURING_LIMITS.optimalBtRatioMax}`,
      suggestion: "Adjust dimensions for optimal manufacturability",
      costImpact: "low",
    };
  }

  return null;
}

function checkActiveLength(L: number): SpiralManufacturabilityIssue | null {
  if (L < SPIRAL_MANUFACTURING_LIMITS.minActiveLength) {
    return {
      code: "LENGTH_TOO_SHORT",
      severity: "major",
      description: "Active length too short for stable spring behavior",
      parameter: "activeLength",
      currentValue: L,
      requiredValue: `≥ ${SPIRAL_MANUFACTURING_LIMITS.minActiveLength} mm`,
      suggestion: "Increase active length",
      costImpact: "none",
    };
  }
  if (L > SPIRAL_MANUFACTURING_LIMITS.maxActiveLength) {
    return {
      code: "LENGTH_TOO_LONG",
      severity: "minor",
      description: "Very long strip - material handling challenges",
      parameter: "activeLength",
      currentValue: L,
      requiredValue: `≤ ${SPIRAL_MANUFACTURING_LIMITS.maxActiveLength} mm`,
      suggestion: "Consider design optimization to reduce length",
      costImpact: "medium",
    };
  }
  return null;
}

function checkInnerDiameter(Di: number, t: number): SpiralManufacturabilityIssue | null {
  const minDi = Math.max(SPIRAL_MANUFACTURING_LIMITS.minInnerDiameter, t * 10);

  if (Di < minDi) {
    return {
      code: "INNER_DIAMETER_TOO_SMALL",
      severity: "critical",
      description: "Inner diameter too small - arbor interference",
      parameter: "innerDiameter",
      currentValue: Di,
      requiredValue: `≥ ${minDi.toFixed(1)} mm`,
      suggestion: "Increase inner diameter or reduce thickness",
      costImpact: "none",
    };
  }
  return null;
}

function checkCoilCount(n: number): SpiralManufacturabilityIssue | null {
  if (n < SPIRAL_MANUFACTURING_LIMITS.minCoils) {
    return {
      code: "TOO_FEW_COILS",
      severity: "major",
      description: "Too few coils for stable spring behavior",
      parameter: "activeCoils",
      currentValue: n,
      requiredValue: `≥ ${SPIRAL_MANUFACTURING_LIMITS.minCoils}`,
      suggestion: "Increase number of coils",
      costImpact: "none",
    };
  }
  if (n > SPIRAL_MANUFACTURING_LIMITS.maxCoils) {
    return {
      code: "MANY_COILS",
      severity: "minor",
      description: "High coil count may require special winding equipment",
      parameter: "activeCoils",
      currentValue: n,
      requiredValue: `≤ ${SPIRAL_MANUFACTURING_LIMITS.maxCoils}`,
      suggestion: "Consider design optimization",
      costImpact: "medium",
    };
  }
  return null;
}

function calculateSpiralDifficultyScore(params: SpiralManufacturabilityParams): number {
  let score = 0;

  const btRatio = params.stripWidth / params.stripThickness;

  // Thickness difficulty
  if (params.stripThickness < 0.3) score += 25;
  else if (params.stripThickness < 0.5) score += 15;
  else if (params.stripThickness > 2.0) score += 10;

  // Width difficulty
  if (params.stripWidth < 5) score += 15;
  else if (params.stripWidth > 30) score += 10;

  // b/t ratio difficulty
  if (btRatio < 10 || btRatio > 35) score += 10;

  // Length difficulty
  if (params.activeLength > 2000) score += 15;
  else if (params.activeLength > 1000) score += 5;

  // Coil count difficulty
  if (params.activeCoils > 15) score += 10;

  // Production volume adjustment
  if (params.productionVolume === "prototype") score += 15;
  else if (params.productionVolume === "low") score += 5;

  return Math.min(100, score);
}

function getSpiralRecommendedProcess(params: SpiralManufacturabilityParams): string {
  if (params.stripThickness > 1.5) {
    return "Power coiling with heat treatment";
  }
  if (params.stripThickness < 0.3) {
    return "Precision thin-strip coiling";
  }
  if (params.productionVolume === "high") {
    return "Automated CNC spiral winding with inline inspection";
  }
  return "Standard CNC spiral winding";
}

function getSpiralToolingRequirements(params: SpiralManufacturabilityParams): string[] {
  const requirements: string[] = [];

  requirements.push(`Arbor diameter: ≥ ${(params.innerDiameter - 2).toFixed(1)} mm`);
  requirements.push(`Strip guide for ${params.stripWidth.toFixed(1)} × ${params.stripThickness.toFixed(2)} mm`);
  requirements.push(`Tension control for ${params.activeLength.toFixed(0)} mm strip`);

  if (params.stripThickness < 0.5) {
    requirements.push("Precision thin-strip handling system");
  }
  if (params.stripWidth > 25) {
    requirements.push("Wide-strip support rollers");
  }

  return requirements;
}

function getSpiralQCCheckpoints(): string[] {
  return [
    "Strip thickness verification (micrometer)",
    "Strip width verification",
    "Inner diameter measurement",
    "Outer diameter measurement",
    "Coil count verification",
    "Spring rate test (torque-angle)",
    "Surface finish inspection",
    "End termination inspection",
  ];
}

export function checkSpiralManufacturability(
  params: SpiralManufacturabilityParams
): SpiralManufacturabilityResult {
  const issues: SpiralManufacturabilityIssue[] = [];

  const thicknessCheck = checkStripThickness(params.stripThickness);
  if (thicknessCheck) issues.push(thicknessCheck);

  const widthCheck = checkStripWidth(params.stripWidth);
  if (widthCheck) issues.push(widthCheck);

  const btCheck = checkBtRatio(params.stripWidth, params.stripThickness);
  if (btCheck) issues.push(btCheck);

  const lengthCheck = checkActiveLength(params.activeLength);
  if (lengthCheck) issues.push(lengthCheck);

  const diCheck = checkInnerDiameter(params.innerDiameter, params.stripThickness);
  if (diCheck) issues.push(diCheck);

  const coilCheck = checkCoilCount(params.activeCoils);
  if (coilCheck) issues.push(coilCheck);

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const majorCount = issues.filter(i => i.severity === "major").length;
  const minorCount = issues.filter(i => i.severity === "minor").length;

  const isManufacturable = criticalCount === 0;
  const difficultyScore = calculateSpiralDifficultyScore(params);
  const recommendedProcess = getSpiralRecommendedProcess(params);
  const toolingRequirements = getSpiralToolingRequirements(params);
  const qcCheckpoints = getSpiralQCCheckpoints();

  let summary: string;
  if (!isManufacturable) {
    summary = `UNMANUFACTURABLE: ${criticalCount} critical issue(s). ` +
      issues.filter(i => i.severity === "critical").map(i => i.description).join("; ");
  } else if (majorCount > 0) {
    summary = `Manufacturable with ${majorCount} major concern(s). Difficulty: ${difficultyScore}/100.`;
  } else if (minorCount > 0) {
    summary = `Manufacturable with ${minorCount} minor note(s). Difficulty: ${difficultyScore}/100.`;
  } else {
    summary = `Fully manufacturable. Difficulty: ${difficultyScore}/100. Process: ${recommendedProcess}`;
  }

  return {
    isManufacturable,
    difficultyScore,
    issues,
    criticalCount,
    majorCount,
    minorCount,
    recommendedProcess,
    toolingRequirements,
    qcCheckpoints,
    summary,
  };
}

// ============================================================================
// P1: Fatigue Life Prediction (S-N Curve)
// ============================================================================

export interface SpiralFatigueLifeResult {
  estimatedCycles: number;
  rating: "infinite" | "high" | "medium" | "low" | "very_low";
  message: { en: string; zh: string };
  sigmaA: number;
  sigmaM: number;
  Se: number | null;
  Su: number | null;
  basquinA: number | null;
  basquinB: number | null;
  snCurveData: Array<{ cycles: number; stress: number }>;
}

export function calculateSpiralFatigueLife(params: {
  sigmaMin_MPa: number;
  sigmaMax_MPa: number;
  materialId?: SpiralSpringMaterial["id"];
  Su_MPa?: number | null;
  Se_MPa?: number | null;
}): SpiralFatigueLifeResult {
  const sigmaA = (params.sigmaMax_MPa - params.sigmaMin_MPa) / 2;
  const sigmaM = (params.sigmaMax_MPa + params.sigmaMin_MPa) / 2;

  // Get material properties
  const material = params.materialId ? getSpiralSpringMaterial(params.materialId) : undefined;
  const Su = params.Su_MPa ?? material?.ultimateStrength_MPa ?? null;
  const SePrime = params.Se_MPa ?? material?.SePrime_MPa ?? (Su ? 0.5 * Su : null);

  // Apply Goodman correction for mean stress
  const Se = SePrime && Su ? SePrime / (1 + sigmaM / Su) : SePrime;

  // Basquin equation parameters: S = A × N^(-b)
  // For spring steels: b ≈ 0.085-0.12, typically use 0.1
  // At N1 = 1e3, S1 ≈ 0.9 × Su
  // At N2 = 1e6, S2 ≈ Se
  let basquinA: number | null = null;
  let basquinB: number | null = null;
  let estimatedCycles = Infinity;

  if (Su && Se && Se > 0) {
    const N1 = 1e3;
    const N2 = 1e6;
    const S1 = 0.9 * Su;
    const S2 = Se;

    basquinB = Math.log(S1 / S2) / Math.log(N2 / N1);
    basquinA = S1 * Math.pow(N1, basquinB);

    // Estimate life using effective stress amplitude
    const sigmaAEffective = sigmaA / (1 - sigmaM / Su);

    if (sigmaAEffective <= 0) {
      estimatedCycles = Infinity;
    } else if (sigmaAEffective >= S1) {
      // Very high stress - extrapolate below N1
      estimatedCycles = Math.max(100, Math.pow(basquinA / sigmaAEffective, 1 / basquinB));
    } else if (sigmaAEffective <= S2) {
      // Below endurance limit
      estimatedCycles = Infinity;
    } else {
      estimatedCycles = Math.pow(basquinA / sigmaAEffective, 1 / basquinB);
    }
  }

  // Generate S-N curve data
  const snCurveData: Array<{ cycles: number; stress: number }> = [];
  if (basquinA && basquinB) {
    for (let i = 0; i < 50; i++) {
      const logN = 3 + (i / 49) * 5; // 1e3 to 1e8
      const N = Math.pow(10, logN);
      const S = basquinA * Math.pow(N, -basquinB);
      snCurveData.push({ cycles: N, stress: S });
    }
  }

  // Determine rating
  let rating: SpiralFatigueLifeResult["rating"];
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
    sigmaA,
    sigmaM,
    Se,
    Su,
    basquinA,
    basquinB,
    snCurveData,
  };
}

// ============================================================================
// P2: Natural Frequency / Vibration Analysis
// ============================================================================

export interface SpiralVibrationResult {
  naturalFrequency_Hz: number;
  naturalFrequency_rpm: number;
  criticalSpeed_rpm: number;
  momentOfInertia_kgmm2: number;
  resonanceRisk: "safe" | "warning" | "danger";
  operatingFrequencyRatio: number | null;
  recommendations: string[];
}

export function calculateSpiralVibration(params: {
  springRate_NmmPerDeg: number;
  stripWidth_mm: number;
  stripThickness_mm: number;
  activeLength_mm: number;
  materialDensity_kgm3?: number;
  operatingFrequency_Hz?: number;
}): SpiralVibrationResult {
  const {
    springRate_NmmPerDeg,
    stripWidth_mm,
    stripThickness_mm,
    activeLength_mm,
    materialDensity_kgm3 = 7850, // Steel default
    operatingFrequency_Hz,
  } = params;

  // Convert spring rate to N·mm/rad
  const k_NmmPerRad = springRate_NmmPerDeg * (180 / Math.PI);

  // Calculate strip mass
  const volume_mm3 = stripWidth_mm * stripThickness_mm * activeLength_mm;
  const mass_kg = volume_mm3 * 1e-9 * materialDensity_kgm3;

  // Moment of inertia of strip about center (approximation)
  // J ≈ m × r² where r is average radius
  const avgRadius_mm = (activeLength_mm / (2 * Math.PI)) / 2; // Rough estimate
  const J_kgmm2 = mass_kg * avgRadius_mm * avgRadius_mm;

  // Natural frequency: fn = (1/2π) × √(k/J)
  // Note: k in N·mm/rad, J in kg·mm²
  // Need to convert: k_Nmm/rad = k_Nm/rad × 1000
  const k_Nm_per_rad = k_NmmPerRad / 1000;
  const J_kgm2 = J_kgmm2 * 1e-6;

  const omega_n = Math.sqrt(k_Nm_per_rad / J_kgm2); // rad/s
  const fn_Hz = omega_n / (2 * Math.PI);
  const fn_rpm = fn_Hz * 60;

  // Critical speed (typically 0.7-0.8 of natural frequency for safety)
  const criticalSpeed_rpm = fn_rpm * 0.75;

  // Resonance risk assessment
  let resonanceRisk: SpiralVibrationResult["resonanceRisk"] = "safe";
  let operatingFrequencyRatio: number | null = null;
  const recommendations: string[] = [];

  if (operatingFrequency_Hz !== undefined) {
    operatingFrequencyRatio = operatingFrequency_Hz / fn_Hz;

    if (operatingFrequencyRatio > 0.7 && operatingFrequencyRatio < 1.3) {
      resonanceRisk = "danger";
      recommendations.push("Operating frequency is near resonance - redesign required");
      recommendations.push("Increase spring rate or reduce mass to raise natural frequency");
    } else if (operatingFrequencyRatio > 0.5 && operatingFrequencyRatio < 1.5) {
      resonanceRisk = "warning";
      recommendations.push("Operating frequency is approaching resonance zone");
      recommendations.push("Consider adding damping or adjusting operating speed");
    }
  }

  if (fn_Hz < 10) {
    recommendations.push("Low natural frequency - susceptible to external vibrations");
  }

  return {
    naturalFrequency_Hz: fn_Hz,
    naturalFrequency_rpm: fn_rpm,
    criticalSpeed_rpm,
    momentOfInertia_kgmm2: J_kgmm2,
    resonanceRisk,
    operatingFrequencyRatio,
    recommendations,
  };
}

// ============================================================================
// P2: Temperature Effects Analysis
// ============================================================================

export interface SpiralTemperatureResult {
  E_adjusted_MPa: number;
  k_adjusted_NmmPerDeg: number;
  Su_adjusted_MPa: number | null;
  Se_adjusted_MPa: number | null;
  thermalExpansion_mm: number;
  temperatureFactor: number;
  safetyFactorReduction: number;
  warnings: string[];
}

export function calculateSpiralTemperatureEffects(params: {
  temperature_C: number;
  E0_MPa: number;
  k0_NmmPerDeg: number;
  activeLength_mm: number;
  Su0_MPa?: number | null;
  Se0_MPa?: number | null;
  materialId?: SpiralSpringMaterial["id"];
}): SpiralTemperatureResult {
  const {
    temperature_C,
    E0_MPa,
    k0_NmmPerDeg,
    activeLength_mm,
    Su0_MPa,
    Se0_MPa,
  } = params;

  const warnings: string[] = [];

  // Temperature factor for elastic modulus (typical for spring steels)
  // E decreases approximately 0.03% per °C above 20°C
  const deltaT = temperature_C - 20;
  let tempFactor = 1.0;

  if (temperature_C > 20) {
    tempFactor = 1 - 0.0003 * deltaT;
  } else if (temperature_C < -40) {
    // Cold brittleness warning
    warnings.push("Temperature below -40°C: risk of cold brittleness");
    tempFactor = 1 + 0.0001 * Math.abs(deltaT); // Slight increase in E at low temp
  }

  // Clamp temperature factor
  tempFactor = Math.max(0.5, Math.min(1.1, tempFactor));

  // Adjusted properties
  const E_adjusted = E0_MPa * tempFactor;
  const k_adjusted = k0_NmmPerDeg * tempFactor;

  // Strength reduction at high temperature
  let strengthFactor = 1.0;
  if (temperature_C > 150) {
    strengthFactor = 1 - 0.002 * (temperature_C - 150);
    warnings.push("Temperature above 150°C: significant strength reduction");
  }
  if (temperature_C > 250) {
    strengthFactor = Math.max(0.5, strengthFactor);
    warnings.push("Temperature above 250°C: consider heat-resistant alloy");
  }
  strengthFactor = Math.max(0.5, strengthFactor);

  const Su_adjusted = Su0_MPa ? Su0_MPa * strengthFactor : null;
  const Se_adjusted = Se0_MPa ? Se0_MPa * strengthFactor * tempFactor : null;

  // Thermal expansion (steel: ~12 × 10⁻⁶ /°C)
  const thermalCoeff = 12e-6;
  const thermalExpansion = activeLength_mm * thermalCoeff * deltaT;

  // Safety factor reduction
  const safetyFactorReduction = 1 - (tempFactor * strengthFactor);

  if (temperature_C > 200) {
    warnings.push("Consider creep effects at this temperature");
  }

  return {
    E_adjusted_MPa: E_adjusted,
    k_adjusted_NmmPerDeg: k_adjusted,
    Su_adjusted_MPa: Su_adjusted,
    Se_adjusted_MPa: Se_adjusted,
    thermalExpansion_mm: thermalExpansion,
    temperatureFactor: tempFactor,
    safetyFactorReduction,
    warnings,
  };
}

// ============================================================================
// P3: Creep / Relaxation Analysis
// ============================================================================

export interface SpiralCreepResult {
  torqueLoss_percent: number;
  torqueLoss_Nmm: number;
  finalTorque_Nmm: number;
  creepRate_percentPerHour: number;
  timeToRelax10Percent_hours: number | null;
  relaxationCurve: Array<{ hours: number; torquePercent: number }>;
  warnings: string[];
}

export function calculateSpiralCreep(params: {
  initialTorque_Nmm: number;
  temperature_C: number;
  duration_hours: number;
  stressRatio?: number; // σ/σy
  materialId?: SpiralSpringMaterial["id"];
}): SpiralCreepResult {
  const {
    initialTorque_Nmm,
    temperature_C,
    duration_hours,
    stressRatio = 0.5,
  } = params;

  const warnings: string[] = [];

  // Larson-Miller parameter approach (simplified)
  // Creep rate increases exponentially with temperature and stress

  // Base creep rate at 20°C, 50% stress ratio (% per 1000 hours)
  const baseCreepRate = 0.1; // Very low at room temperature

  // Temperature acceleration (Arrhenius-type)
  const tempFactor = Math.exp((temperature_C - 20) / 50);

  // Stress acceleration
  const stressFactor = Math.pow(stressRatio, 2);

  // Effective creep rate (% per hour)
  const creepRate = (baseCreepRate / 1000) * tempFactor * stressFactor;

  // Total relaxation using logarithmic model
  // Relaxation follows: ΔT/T0 = A × log(1 + t/t0)
  const A = creepRate * 10; // Scaling factor
  const t0 = 1; // Reference time (hours)

  const torqueLoss_percent = A * Math.log(1 + duration_hours / t0) * 100;
  const torqueLoss_Nmm = initialTorque_Nmm * (torqueLoss_percent / 100);
  const finalTorque_Nmm = initialTorque_Nmm - torqueLoss_Nmm;

  // Time to 10% relaxation
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
      torquePercent: 100 - Math.min(loss, 50), // Cap at 50% loss
    });
  }

  // Warnings
  if (temperature_C > 100) {
    warnings.push("Elevated temperature accelerates creep significantly");
  }
  if (stressRatio > 0.7) {
    warnings.push("High stress ratio increases creep rate");
  }
  if (torqueLoss_percent > 5) {
    warnings.push("Significant torque loss expected - consider overdesign");
  }
  if (torqueLoss_percent > 15) {
    warnings.push("Excessive relaxation - redesign recommended");
  }

  return {
    torqueLoss_percent: Math.min(torqueLoss_percent, 50),
    torqueLoss_Nmm,
    finalTorque_Nmm: Math.max(0, finalTorque_Nmm),
    creepRate_percentPerHour: creepRate * 100,
    timeToRelax10Percent_hours: timeToRelax10Percent,
    relaxationCurve,
    warnings,
  };
}

// ============================================================================
// P3: Friction / Hysteresis Analysis
// ============================================================================

export interface SpiralFrictionResult {
  frictionTorque_Nmm: number;
  hysteresisLoss_percent: number;
  effectiveSpringRate_NmmPerDeg: number;
  loadingTorque_Nmm: number;
  unloadingTorque_Nmm: number;
  hysteresisCurve: Array<{ angle_deg: number; loadingTorque: number; unloadingTorque: number }>;
  energyLossPerCycle_Nmm: number;
  recommendations: string[];
}

export function calculateSpiralFriction(params: {
  springRate_NmmPerDeg: number;
  preloadTorque_Nmm: number;
  maxAngle_deg: number;
  frictionCoefficient?: number;
  normalForce_N?: number;
  meanRadius_mm?: number;
  activeCoils?: number;
}): SpiralFrictionResult {
  const {
    springRate_NmmPerDeg,
    preloadTorque_Nmm,
    maxAngle_deg,
    frictionCoefficient = 0.15, // Steel on steel, lubricated
    normalForce_N,
    meanRadius_mm = 20,
    activeCoils = 5,
  } = params;

  const recommendations: string[] = [];

  // Estimate normal force from spring geometry if not provided
  // Normal force comes from coil contact pressure
  const estimatedNormalForce = normalForce_N ??
    (springRate_NmmPerDeg * maxAngle_deg / meanRadius_mm) * 0.1;

  // Friction torque per coil contact
  const frictionForce = frictionCoefficient * estimatedNormalForce;
  const frictionTorquePerCoil = frictionForce * meanRadius_mm;
  const totalFrictionTorque = frictionTorquePerCoil * (activeCoils - 1);

  // Hysteresis loss as percentage of max torque
  const maxTorque = preloadTorque_Nmm + springRate_NmmPerDeg * maxAngle_deg;
  const hysteresisLoss = (2 * totalFrictionTorque / maxTorque) * 100;

  // Effective spring rate (slightly reduced due to friction)
  const effectiveRate = springRate_NmmPerDeg * (1 - hysteresisLoss / 200);

  // Loading and unloading torques at max angle
  const loadingTorque = maxTorque + totalFrictionTorque;
  const unloadingTorque = maxTorque - totalFrictionTorque;

  // Generate hysteresis curve
  const hysteresisCurve: Array<{ angle_deg: number; loadingTorque: number; unloadingTorque: number }> = [];
  for (let i = 0; i <= 20; i++) {
    const angle = (maxAngle_deg * i) / 20;
    const baseTorque = preloadTorque_Nmm + springRate_NmmPerDeg * angle;
    hysteresisCurve.push({
      angle_deg: angle,
      loadingTorque: baseTorque + totalFrictionTorque * (angle / maxAngle_deg),
      unloadingTorque: baseTorque - totalFrictionTorque * (angle / maxAngle_deg),
    });
  }

  // Energy loss per cycle (area of hysteresis loop)
  const energyLossPerCycle = 2 * totalFrictionTorque * maxAngle_deg * (Math.PI / 180);

  // Recommendations
  if (hysteresisLoss > 10) {
    recommendations.push("High hysteresis loss - consider lubrication");
  }
  if (hysteresisLoss > 20) {
    recommendations.push("Excessive friction - check coil clearance");
  }
  if (frictionCoefficient > 0.2) {
    recommendations.push("High friction coefficient - consider surface treatment");
  }

  return {
    frictionTorque_Nmm: totalFrictionTorque,
    hysteresisLoss_percent: hysteresisLoss,
    effectiveSpringRate_NmmPerDeg: effectiveRate,
    loadingTorque_Nmm: loadingTorque,
    unloadingTorque_Nmm: unloadingTorque,
    hysteresisCurve,
    energyLossPerCycle_Nmm: energyLossPerCycle,
    recommendations,
  };
}
