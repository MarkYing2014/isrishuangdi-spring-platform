/**
 * Die Spring Risk Model
 * 模具弹簧风险模型
 * 
 * V1: Risk based on deflection ratio (mm-based, no stress calculation)
 * 
 * Industry standard max deflection ratios by duty:
 * - Light Duty (Blue): 50%
 * - Medium Duty (Red): 37%
 * - Heavy Duty (Gold): 30%
 * - Extra Heavy Duty (Green): 25%
 */

// ============================================================================
// Types
// ============================================================================

export type DieSpringDuty = "LD" | "MD" | "HD" | "XHD";

export type DieSpringRiskStatus = "OK" | "WARNING" | "DANGER";

export interface DieSpringRiskResult {
  /** Current deflection x = Hf - H (mm) */
  deflection_mm: number;
  /** Deflection ratio = x / Hf */
  deflectionRatio: number;
  /** Risk value 0~1+ (1.0 = at max recommended) */
  risk: number;
  /** Risk status */
  status: DieSpringRiskStatus;
  /** Estimated load F = k * x (N) */
  load_N: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Max recommended deflection ratio by duty (industry standard) */
export const MAX_DEFLECTION_RATIO_BY_DUTY: Record<DieSpringDuty, number> = {
  LD: 0.50,   // Light Duty (Blue) - 50%
  MD: 0.37,   // Medium Duty (Red) - 37%
  HD: 0.30,   // Heavy Duty (Gold) - 30%
  XHD: 0.25,  // Extra Heavy Duty (Green) - 25%
};

/** Duty colors (standard die spring colors) */
export const DUTY_COLORS: Record<DieSpringDuty, string> = {
  LD: "#2563eb",   // Blue
  MD: "#dc2626",   // Red
  HD: "#d97706",   // Gold/Yellow
  XHD: "#16a34a",  // Green
};

/** Duty labels */
export const DUTY_LABELS: Record<DieSpringDuty, { en: string; zh: string }> = {
  LD: { en: "Light Duty", zh: "轻载" },
  MD: { en: "Medium Duty", zh: "中载" },
  HD: { en: "Heavy Duty", zh: "重载" },
  XHD: { en: "Extra Heavy Duty", zh: "超重载" },
};

// ============================================================================
// Utility Functions
// ============================================================================

/** Clamp value to 0-1 range */
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Smoothstep interpolation */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// ============================================================================
// Risk Calculation
// ============================================================================

/**
 * Compute die spring risk based on current height
 * 
 * @param params.duty - Spring duty rating (LD/MD/HD/XHD)
 * @param params.freeLength_mm - Free length Hf (mm)
 * @param params.currentHeight_mm - Current height H (mm)
 * @param params.springRate_Nmm - Spring rate k (N/mm), optional for load calculation
 */
export function computeDieSpringRisk(params: {
  duty: DieSpringDuty;
  freeLength_mm: number;
  currentHeight_mm: number;
  springRate_Nmm?: number;
}): DieSpringRiskResult {
  const { duty, freeLength_mm, currentHeight_mm, springRate_Nmm = 0 } = params;

  // Deflection x = Hf - H
  const deflection_mm = Math.max(0, freeLength_mm - currentHeight_mm);
  
  // Deflection ratio = x / Hf
  const deflectionRatio = freeLength_mm > 0 ? deflection_mm / freeLength_mm : 0;
  
  // Max recommended ratio for this duty
  const maxRatio = MAX_DEFLECTION_RATIO_BY_DUTY[duty];
  
  // Risk = deflectionRatio / maxRatio (1.0 = at limit, >1.0 = over limit)
  const risk = maxRatio > 0 ? deflectionRatio / maxRatio : 0;
  
  // Status based on risk level
  let status: DieSpringRiskStatus;
  if (risk < 0.75) {
    status = "OK";
  } else if (risk < 1.0) {
    status = "WARNING";
  } else {
    status = "DANGER";
  }
  
  // Load F = k * x
  const load_N = springRate_Nmm * deflection_mm;

  return {
    deflection_mm,
    deflectionRatio,
    risk,
    status,
    load_N,
  };
}

/**
 * Get emissive color and intensity based on risk
 * For Three.js material visualization
 */
export function getRiskEmissive(risk: number): {
  color: string;
  intensity: number;
} {
  const warn = smoothstep(0.75, 1.0, risk);   // 0~1 in warning zone
  const fail = smoothstep(1.0, 1.2, risk);    // 0~1 in danger zone

  // Orange for warning, red for danger
  const color = fail > 0.1 ? "#ff2d2d" : "#ff8a00";
  
  // Intensity ramps up with risk
  const intensity = 0.0 + 1.2 * warn + 1.8 * fail;

  return { color, intensity };
}

/**
 * Convert lb/in to N/mm
 * 1 lb/in = 0.175126835 N/mm
 */
export function lbPerInToNPerMm(k_lb_per_in: number): number {
  return k_lb_per_in * 0.175126835;
}
