/**
 * Die Spring Types
 * 模具弹簧类型定义
 * 
 * Rectangular wire die spring for high-load tooling applications
 */

// ============================================================================
// Material Types
// ============================================================================

export type DieSpringMaterialType =
  | "OIL_TEMPERED"
  | "CHROME_ALLOY"
  | "CHROME_SILICON";

export interface DieSpringMaterialProperties {
  id: DieSpringMaterialType;
  name: string;
  nameZh: string;
  yieldStrength_MPa: number;
  shearModulus_MPa: number;
  maxTemperature_C: number;
}

export const DIE_SPRING_MATERIALS: Record<DieSpringMaterialType, DieSpringMaterialProperties> = {
  OIL_TEMPERED: {
    id: "OIL_TEMPERED",
    name: "Oil Tempered Steel",
    nameZh: "油淬火钢",
    yieldStrength_MPa: 1200,
    shearModulus_MPa: 79000,
    maxTemperature_C: 120,
  },
  CHROME_ALLOY: {
    id: "CHROME_ALLOY",
    name: "Chrome Alloy Steel",
    nameZh: "铬合金钢",
    yieldStrength_MPa: 1400,
    shearModulus_MPa: 79000,
    maxTemperature_C: 200,
  },
  CHROME_SILICON: {
    id: "CHROME_SILICON",
    name: "Chrome Silicon Steel",
    nameZh: "铬硅钢",
    yieldStrength_MPa: 1600,
    shearModulus_MPa: 79000,
    maxTemperature_C: 250,
  },
};

// ============================================================================
// End Style Types
// ============================================================================

export type DieSpringEndStyle = "open" | "closed" | "closed_ground";

export const DIE_SPRING_END_STYLES: Record<DieSpringEndStyle, { name: string; nameZh: string }> = {
  open: { name: "Open Ends", nameZh: "开口" },
  closed: { name: "Closed Ends", nameZh: "并口" },
  closed_ground: { name: "Closed & Ground", nameZh: "并口磨平" },
};

// ============================================================================
// Geometry Types
// ============================================================================

export interface DieSpringGeometry {
  /** Outer diameter (mm) */
  od_mm: number;
  /** Free length L0 (mm) */
  freeLength_mm: number;
  /** Working length Lw (mm) */
  workingLength_mm: number;
  /** Total coils */
  coils: number;
  /** Rectangular wire width - radial direction (mm) */
  wire_b_mm: number;
  /** Rectangular wire thickness (mm) */
  wire_t_mm: number;
  /** End style (default: closed_ground) */
  endStyle?: DieSpringEndStyle;
  /** End grind turns per end (default: 0.25) */
  endGrindTurns?: number;
}

export interface DieSpringOperating {
  /** Operating temperature (°C) */
  temperature_C?: number;
  /** Hole diameter for guided spring (mm) */
  holeDiameter_mm?: number;
  /** Rod diameter for guided spring (mm) */
  rodDiameter_mm?: number;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface DieSpringInput {
  geometry: DieSpringGeometry;
  material: DieSpringMaterialType;
  operating?: DieSpringOperating;
}

export interface DieSpringResult {
  ok: boolean;
  errors: string[];
  warnings: string[];

  /** Travel = freeLength - workingLength (mm) */
  travel_mm: number;
  /** Spring rate k (N/mm) */
  springRate_Nmm: number;
  /** Load at working length (N) */
  loadAtWorking_N: number;

  /** Mean diameter Dm = OD - wire_t (mm) */
  meanDiameter_mm: number;
  /** Spring index C = Dm / wire_t */
  springIndex: number;
  /** Equivalent wire diameter d_eq = sqrt(b * t) (mm) */
  equivalentWireDiameter_mm: number;

  /** Stress at working length (MPa) */
  stress_MPa: number;
  /** Stress ratio = stress / yieldStrength */
  stressRatio: number;

  /** Compression ratio = travel / freeLength */
  compressionRatio: number;
  /** Slenderness ratio = freeLength / meanDiameter */
  slendernessRatio: number;

  /** Temperature-induced load loss (%) */
  tempLoadLossPct?: number;
  /** Derated load after temperature correction (N) */
  deratedLoad_N?: number;

  /** Active coils Na (based on endStyle) */
  activeCoils: number;
  /** Solid height Hs = Nt * wire_t (mm) */
  solidHeight_mm: number;
}
