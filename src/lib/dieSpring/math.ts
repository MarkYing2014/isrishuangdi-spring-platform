/**
 * Die Spring Math Engine (V1)
 * 模具弹簧计算引擎
 * 
 * Engineering-safe approximations for rectangular wire die springs
 */

import type {
  DieSpringInput,
  DieSpringResult,
  DieSpringMaterialType,
} from "./types";
import { DIE_SPRING_MATERIALS } from "./types";
import { calculateDeratedLoad } from "./temperatureLoadLoss";

// ============================================================================
// Constants
// ============================================================================

/** Steel shear modulus (MPa) */
const G_STEEL = 79000;

/** Conservative stress factor β for rectangular wire */
const BETA_CONSERVATIVE = 3.0;

// ============================================================================
// Validation
// ============================================================================

export function validateDieSpringInput(input: DieSpringInput): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const g = input.geometry;

  // Basic geometry checks
  if (g.od_mm <= 0) errors.push("OD must be > 0");
  if (g.freeLength_mm <= 0) errors.push("Free length must be > 0");
  if (g.workingLength_mm <= 0) errors.push("Working length must be > 0");
  if (g.workingLength_mm >= g.freeLength_mm) {
    errors.push("Working length must be < free length");
  }
  if (g.coils <= 0) errors.push("Coils must be > 0");
  if (g.wire_b_mm <= 0) errors.push("Wire width b must be > 0");
  if (g.wire_t_mm <= 0) errors.push("Wire thickness t must be > 0");

  // Derived geometry checks
  const meanDiameter = g.od_mm - g.wire_t_mm;
  if (meanDiameter <= 0) {
    errors.push("Mean diameter (OD - t) must be > 0");
  }

  // Spring index check
  const springIndex = meanDiameter / g.wire_t_mm;
  if (springIndex < 3) {
    warnings.push(`Spring index ${springIndex.toFixed(1)} is very low (< 3)`);
  } else if (springIndex > 12) {
    warnings.push(`Spring index ${springIndex.toFixed(1)} is high (> 12)`);
  }

  // b/t ratio check
  const btRatio = g.wire_b_mm / g.wire_t_mm;
  if (btRatio < 1.5) {
    warnings.push(`b/t ratio ${btRatio.toFixed(2)} is low (< 1.5)`);
  } else if (btRatio > 4.5) {
    warnings.push(`b/t ratio ${btRatio.toFixed(2)} is high (> 4.5)`);
  }

  // Compression ratio check
  const travel = g.freeLength_mm - g.workingLength_mm;
  const compressionRatio = travel / g.freeLength_mm;
  if (compressionRatio > 0.35) {
    errors.push(`Compression ratio ${(compressionRatio * 100).toFixed(1)}% exceeds 35%`);
  } else if (compressionRatio > 0.25) {
    warnings.push(`Compression ratio ${(compressionRatio * 100).toFixed(1)}% is high (> 25%)`);
  }

  // Temperature check
  if (input.operating?.temperature_C) {
    const mat = DIE_SPRING_MATERIALS[input.material];
    if (input.operating.temperature_C > mat.maxTemperature_C) {
      errors.push(
        `Temperature ${input.operating.temperature_C}°C exceeds material limit ${mat.maxTemperature_C}°C`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Core Calculation
// ============================================================================

/**
 * Calculate active coils based on end style
 * 
 * | endStyle       | Na                    |
 * |----------------|----------------------|
 * | open           | Nt (all coils active)|
 * | closed         | Nt - 2               |
 * | closed_ground  | Nt - 2               |
 */
function getActiveCoils(totalCoils: number, endStyle: string | undefined): number {
  switch (endStyle) {
    case "open":
      return totalCoils;
    case "closed":
    case "closed_ground":
    default:
      return Math.max(1, totalCoils - 2);
  }
}

/**
 * Calculate die spring properties
 * 
 * Formulas (V1 approximate):
 * - d_eq = sqrt(b * t)  -- equivalent wire diameter
 * - k = (G * d_eq^4) / (8 * Dm^3 * Na)  -- spring rate
 * - σ = (P * D) / (b * t * sqrt(b*t)) * β  -- rectangular wire stress
 */
export function calculateDieSpring(input: DieSpringInput): DieSpringResult {
  const validation = validateDieSpringInput(input);
  
  if (!validation.isValid) {
    return {
      ok: false,
      errors: validation.errors,
      warnings: validation.warnings,
      travel_mm: 0,
      springRate_Nmm: 0,
      loadAtWorking_N: 0,
      meanDiameter_mm: 0,
      springIndex: 0,
      equivalentWireDiameter_mm: 0,
      stress_MPa: 0,
      stressRatio: 0,
      compressionRatio: 0,
      slendernessRatio: 0,
      activeCoils: 0,
      solidHeight_mm: 0,
    };
  }

  const g = input.geometry;
  const mat = DIE_SPRING_MATERIALS[input.material];
  const endStyle = g.endStyle ?? "closed_ground";

  // Geometry calculations
  const travel_mm = g.freeLength_mm - g.workingLength_mm;
  const meanDiameter_mm = g.od_mm - g.wire_t_mm;
  const springIndex = meanDiameter_mm / g.wire_t_mm;
  const equivalentWireDiameter_mm = Math.sqrt(g.wire_b_mm * g.wire_t_mm);
  const compressionRatio = travel_mm / g.freeLength_mm;
  const slendernessRatio = g.freeLength_mm / meanDiameter_mm;

  // Active coils based on end style
  const activeCoils = getActiveCoils(g.coils, endStyle);

  // Solid height: Hs = Nt * wire_t
  const solidHeight_mm = g.coils * g.wire_t_mm;

  // Spring rate: k = (G * d_eq^4) / (8 * Dm^3 * Na)
  const d_eq4 = Math.pow(equivalentWireDiameter_mm, 4);
  const Dm3 = Math.pow(meanDiameter_mm, 3);
  const springRate_Nmm = (G_STEEL * d_eq4) / (8 * Dm3 * activeCoils);

  // Load at working length
  const loadAtWorking_N = springRate_Nmm * travel_mm;

  // Stress calculation (rectangular wire)
  // σ = (P * D) / (b * t * sqrt(b*t)) * β
  const btProduct = g.wire_b_mm * g.wire_t_mm;
  const btSqrt = Math.sqrt(btProduct);
  const stress_MPa = (loadAtWorking_N * meanDiameter_mm) / (btProduct * btSqrt) * BETA_CONSERVATIVE;

  // Stress ratio
  const stressRatio = stress_MPa / mat.yieldStrength_MPa;

  // Temperature derating
  let tempLoadLossPct: number | undefined;
  let deratedLoad_N: number | undefined;
  
  if (input.operating?.temperature_C && input.operating.temperature_C > 20) {
    const derating = calculateDeratedLoad(
      loadAtWorking_N,
      input.material,
      input.operating.temperature_C
    );
    tempLoadLossPct = derating.lossPct;
    deratedLoad_N = derating.deratedLoad_N;
  }

  return {
    ok: true,
    errors: [],
    warnings: validation.warnings,
    travel_mm,
    springRate_Nmm,
    loadAtWorking_N,
    meanDiameter_mm,
    springIndex,
    equivalentWireDiameter_mm,
    stress_MPa,
    stressRatio,
    compressionRatio,
    slendernessRatio,
    tempLoadLossPct,
    deratedLoad_N,
    activeCoils,
    solidHeight_mm,
  };
}
