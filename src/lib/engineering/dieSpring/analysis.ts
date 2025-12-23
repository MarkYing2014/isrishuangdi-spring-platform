/**
 * Die Spring Engineering Analysis
 * 模具弹簧工程分析 - 完整计算逻辑
 */

import type { DieSpringGeometry, AnalysisResult, MaterialInfo } from "@/lib/stores/springDesignStore";
import type { DieSpringCatalogEntry, DieSpringDutyColor } from "./catalog";
import {
  MAX_DEFLECTION_RATIO_BY_DUTY,
  type DieSpringDuty,
} from "@/lib/dieSpring/riskModel";
import { getTemperatureLoadLoss } from "@/lib/dieSpring/temperatureLoadLoss";
import type { DieSpringMaterialType } from "@/lib/dieSpring/types";

export interface DieSpringEngineeringInput {
  geometry: DieSpringGeometry;
  material: MaterialInfo;
  analysisResult?: AnalysisResult | null;
  catalogEntry?: DieSpringCatalogEntry;
  workingDeflection_mm?: number;
  operatingTemperature_C?: number;
  dieMaterialType?: DieSpringMaterialType;
}

export interface DieSpringEngineeringSummary {
  designStatus: "PASS" | "MARGINAL" | "FAIL";
  springRate_Nmm: number | null;
  loadAtWork_N: number | null;
  stressRatio: number | null;
  deflectionPercent: number | null;
  cycleLifeLevel: "HIGH" | "MEDIUM" | "LOW";
  guideRisk: "LOW" | "MEDIUM" | "HIGH";
  tempLoadLossPercent?: number | null;
}

const DEFAULT_SUMMARY: DieSpringEngineeringSummary = {
  designStatus: "MARGINAL",
  springRate_Nmm: null,
  loadAtWork_N: null,
  stressRatio: null,
  deflectionPercent: null,
  cycleLifeLevel: "MEDIUM",
  guideRisk: "MEDIUM",
  tempLoadLossPercent: null,
};

const DUTY_COLOR_TO_CODE: Record<DieSpringDutyColor, DieSpringDuty> = {
  blue: "LD",
  red: "MD",
  gold: "HD",
  green: "XHD",
};

export function computeDieSpringEngineeringSummary(
  input: DieSpringEngineeringInput
): DieSpringEngineeringSummary {
  if (!input.analysisResult) {
    return DEFAULT_SUMMARY;
  }

  const { analysisResult, geometry, catalogEntry, operatingTemperature_C, dieMaterialType } = input;

  // Deflection percent
  const travel = geometry.freeLength - geometry.workingLength;
  const deflectionPercent =
    geometry.freeLength > 0 ? travel / geometry.freeLength : null;

  // Stress ratio (shear stress / yield strength approximation)
  const stressRatio = analysisResult.shearStress ?? analysisResult.maxStress ?? null;

  // Cycle life level based on deflection vs duty max
  const dutyCode = geometry.dutyColor
    ? DUTY_COLOR_TO_CODE[geometry.dutyColor]
    : "MD";
  const maxDeflRatio = MAX_DEFLECTION_RATIO_BY_DUTY[dutyCode];
  let cycleLifeLevel: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  if (deflectionPercent !== null) {
    const utilizationRatio = deflectionPercent / maxDeflRatio;
    if (utilizationRatio < 0.7) {
      cycleLifeLevel = "HIGH";
    } else if (utilizationRatio > 1.0) {
      cycleLifeLevel = "LOW";
    }
  }

  // Guide risk based on hole/rod clearance
  let guideRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  const od = geometry.outerDiameter;
  const id = geometry.innerDiameter ?? od - 2 * geometry.wireWidth;
  if (geometry.holeDiameter) {
    const holeClearance = geometry.holeDiameter - od;
    if (holeClearance < 0.5) guideRisk = "HIGH";
    else if (holeClearance < 1.0) guideRisk = "MEDIUM";
  }
  if (geometry.rodDiameter) {
    const rodClearance = id - geometry.rodDiameter;
    if (rodClearance < 0.3) guideRisk = "HIGH";
    else if (rodClearance < 0.8 && guideRisk !== "HIGH") guideRisk = "MEDIUM";
  }

  // Temperature load loss
  let tempLoadLossPercent: number | null = null;
  if (operatingTemperature_C && dieMaterialType && operatingTemperature_C > 20) {
    tempLoadLossPercent = getTemperatureLoadLoss(dieMaterialType, operatingTemperature_C);
  }

  // Design status
  let designStatus: "PASS" | "MARGINAL" | "FAIL" = "PASS";
  if (cycleLifeLevel === "LOW" || guideRisk === "HIGH") {
    designStatus = "FAIL";
  } else if (cycleLifeLevel === "MEDIUM" || guideRisk === "MEDIUM") {
    designStatus = "MARGINAL";
  }

  return {
    designStatus,
    springRate_Nmm: analysisResult.springRate,
    loadAtWork_N: analysisResult.workingLoad ?? null,
    stressRatio,
    deflectionPercent,
    cycleLifeLevel,
    guideRisk,
    tempLoadLossPercent,
  };
}

export interface DieSpringTabPayload {
  summary: DieSpringEngineeringSummary;
  geometry: DieSpringGeometry;
  catalogEntry?: DieSpringCatalogEntry;
}

export function buildDieSpringTabPayload(
  input: DieSpringEngineeringInput
): DieSpringTabPayload {
  return {
    summary: computeDieSpringEngineeringSummary(input),
    geometry: input.geometry,
    catalogEntry: input.catalogEntry,
  };
}

// ============================================================================
// Load-Deflection Curve
// ============================================================================

export interface LoadDeflectionPoint {
  deflection_mm: number;
  load_N: number;
  deflectionPercent: number;
}

export function generateLoadDeflectionCurve(
  geometry: DieSpringGeometry,
  springRate_Nmm: number,
  steps: number = 20
): LoadDeflectionPoint[] {
  const maxTravel = geometry.freeLength - (geometry.solidHeight ?? geometry.totalCoils * geometry.wireThickness);
  const points: LoadDeflectionPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const deflection_mm = (i / steps) * maxTravel;
    const load_N = springRate_Nmm * deflection_mm;
    const deflectionPercent = geometry.freeLength > 0 ? deflection_mm / geometry.freeLength : 0;
    points.push({ deflection_mm, load_N, deflectionPercent });
  }

  return points;
}

// ============================================================================
// Stress Analysis
// ============================================================================

export interface DieSpringStressAnalysis {
  stress_MPa: number;
  stressRatio: number;
  btRatio: number;
  springIndex: number;
  equivalentWireDiameter_mm: number;
  betaFactor: number;
}

const BETA_CONSERVATIVE = 3.0;

export function computeDieSpringStress(
  geometry: DieSpringGeometry,
  load_N: number,
  yieldStrength_MPa: number = 1400
): DieSpringStressAnalysis {
  const b = geometry.wireWidth;
  const t = geometry.wireThickness;
  const od = geometry.outerDiameter;
  const meanDiameter = geometry.meanDiameter ?? od - t;

  const btRatio = b / t;
  const springIndex = meanDiameter / t;
  const equivalentWireDiameter_mm = Math.sqrt(b * t);

  // Stress: σ = (P * D) / (b * t * sqrt(b*t)) * β
  const btProduct = b * t;
  const btSqrt = Math.sqrt(btProduct);
  const stress_MPa = (load_N * meanDiameter) / (btProduct * btSqrt) * BETA_CONSERVATIVE;

  const stressRatio = stress_MPa / yieldStrength_MPa;

  return {
    stress_MPa,
    stressRatio,
    btRatio,
    springIndex,
    equivalentWireDiameter_mm,
    betaFactor: BETA_CONSERVATIVE,
  };
}

// ============================================================================
// Guide Clearance Analysis
// ============================================================================

export interface GuideClearanceAnalysis {
  holeClearance_mm: number | null;
  rodClearance_mm: number | null;
  holeStatus: "OK" | "TIGHT" | "INTERFERENCE";
  rodStatus: "OK" | "TIGHT" | "INTERFERENCE";
  recommendation: string;
}

export function analyzeGuideClearance(geometry: DieSpringGeometry): GuideClearanceAnalysis {
  const od = geometry.outerDiameter;
  const id = geometry.innerDiameter ?? od - 2 * geometry.wireWidth;

  let holeClearance_mm: number | null = null;
  let holeStatus: "OK" | "TIGHT" | "INTERFERENCE" = "OK";

  if (geometry.holeDiameter) {
    holeClearance_mm = geometry.holeDiameter - od;
    if (holeClearance_mm < 0) holeStatus = "INTERFERENCE";
    else if (holeClearance_mm < 0.5) holeStatus = "TIGHT";
  }

  let rodClearance_mm: number | null = null;
  let rodStatus: "OK" | "TIGHT" | "INTERFERENCE" = "OK";

  if (geometry.rodDiameter) {
    rodClearance_mm = id - geometry.rodDiameter;
    if (rodClearance_mm < 0) rodStatus = "INTERFERENCE";
    else if (rodClearance_mm < 0.3) rodStatus = "TIGHT";
  }

  let recommendation = "Clearances are acceptable.";
  if (holeStatus === "INTERFERENCE" || rodStatus === "INTERFERENCE") {
    recommendation = "CRITICAL: Interference detected. Resize hole/rod or spring.";
  } else if (holeStatus === "TIGHT" || rodStatus === "TIGHT") {
    recommendation = "Clearances are tight. Consider increasing for reliable operation.";
  }

  return {
    holeClearance_mm,
    rodClearance_mm,
    holeStatus,
    rodStatus,
    recommendation,
  };
}

// ============================================================================
// Cycle Life Estimation
// ============================================================================

export interface CycleLifeEstimate {
  deflectionRatio: number;
  maxAllowedRatio: number;
  utilizationPercent: number;
  lifeCategory: "HIGH" | "MEDIUM" | "LOW";
  estimatedCycles: string;
}

export function estimateCycleLife(
  geometry: DieSpringGeometry,
  dutyCode: DieSpringDuty
): CycleLifeEstimate {
  const travel = geometry.freeLength - geometry.workingLength;
  const deflectionRatio = geometry.freeLength > 0 ? travel / geometry.freeLength : 0;
  const maxAllowedRatio = MAX_DEFLECTION_RATIO_BY_DUTY[dutyCode];
  const utilizationPercent = maxAllowedRatio > 0 ? (deflectionRatio / maxAllowedRatio) * 100 : 0;

  let lifeCategory: "HIGH" | "MEDIUM" | "LOW";
  let estimatedCycles: string;

  if (utilizationPercent < 70) {
    lifeCategory = "HIGH";
    estimatedCycles = "> 1,000,000 cycles";
  } else if (utilizationPercent <= 100) {
    lifeCategory = "MEDIUM";
    estimatedCycles = "100,000 – 1,000,000 cycles";
  } else {
    lifeCategory = "LOW";
    estimatedCycles = "< 100,000 cycles (over-deflection)";
  }

  return {
    deflectionRatio,
    maxAllowedRatio,
    utilizationPercent,
    lifeCategory,
    estimatedCycles,
  };
}
