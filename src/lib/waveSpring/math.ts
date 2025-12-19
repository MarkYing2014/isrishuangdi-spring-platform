/**
 * Wave Spring V1 Calculation Module
 * 波形弹簧 V1 计算模块
 * 
 * Simplified model for wave springs (crest-to-crest type)
 * Uses empirical formulas for spring rate and load estimation
 */

const PI = Math.PI;

// ============================================================================
// Types
// ============================================================================

export type WaveSpringMode = "loadAtWorkingHeight" | "springRate";

export interface WaveSpringGeometry {
  /** Inner diameter ID (mm) */
  id: number;
  /** Outer diameter OD (mm) */
  od: number;
  /** Material thickness t (mm) */
  thickness_t: number;
  /** Radial wall width b (mm) */
  radialWall_b: number;
  /** Number of turns Nt */
  turns_Nt: number;
  /** Waves per turn Nw */
  wavesPerTurn_Nw: number;
  /** Free height Hf (mm) */
  freeHeight_Hf: number;
  /** Working height Hw (mm) */
  workingHeight_Hw: number;
}

export interface WaveSpringInput {
  id?: string;
  units?: "mm" | "in";
  geometry: WaveSpringGeometry;
  material?: {
    id?: string;
    E_MPa?: number;
    name?: string;
  };
  targets?: {
    mode: WaveSpringMode;
    value?: number;
  };
}

export interface WaveSpringResult {
  isValid: boolean;
  travel_mm: number;
  springRate_Nmm: number;
  loadAtWorkingHeight_N: number;
  meanDiameter_mm: number;
  waveAmplitude_mm: number;
  totalWaves: number;
  stressMax_MPa: number;
  warnings: string[];
  errors: string[];
}

// ============================================================================
// Default Material (17-7PH Stainless Steel)
// ============================================================================

export const DEFAULT_WAVE_SPRING_MATERIAL = {
  id: "17-7PH",
  name: "17-7PH Stainless Steel",
  E_MPa: 203000,
  yieldStrength_MPa: 1170,
  ultimateStrength_MPa: 1310,
};

// ============================================================================
// Validation
// ============================================================================

export function validateWaveSpringInput(input: WaveSpringInput): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const g = input.geometry;

  // Basic geometry checks
  if (g.od <= 0) errors.push("OD must be > 0");
  if (g.id <= 0) errors.push("ID must be > 0");
  if (g.id >= g.od) errors.push("ID must be < OD");
  if (g.thickness_t <= 0) errors.push("Thickness t must be > 0");
  if (g.radialWall_b <= 0) errors.push("Radial wall b must be > 0");
  if (g.turns_Nt <= 0) errors.push("Number of turns Nt must be > 0");
  if (g.wavesPerTurn_Nw <= 0) errors.push("Waves per turn Nw must be > 0");
  if (g.freeHeight_Hf <= 0) errors.push("Free height Hf must be > 0");
  if (g.workingHeight_Hw <= 0) errors.push("Working height Hw must be > 0");
  if (g.workingHeight_Hw >= g.freeHeight_Hf) errors.push("Working height Hw must be < Free height Hf");

  // Radial wall check
  const radialSpace = (g.od - g.id) / 2;
  if (g.radialWall_b > radialSpace) {
    errors.push(`Radial wall b (${g.radialWall_b}) exceeds available space (${radialSpace.toFixed(2)})`);
  }

  // Warnings for suboptimal designs
  if (g.wavesPerTurn_Nw < 2) {
    warnings.push("Waves per turn < 2 may result in unstable spring behavior");
  }
  if (g.wavesPerTurn_Nw > 8) {
    warnings.push("Waves per turn > 8 may be difficult to manufacture");
  }
  if (g.turns_Nt > 20) {
    warnings.push("High turn count (> 20) may require special manufacturing");
  }

  // Thickness ratio check
  const thicknessRatio = g.radialWall_b / g.thickness_t;
  if (thicknessRatio < 3) {
    warnings.push(`b/t ratio (${thicknessRatio.toFixed(1)}) is low; recommend ≥ 3`);
  }
  if (thicknessRatio > 20) {
    warnings.push(`b/t ratio (${thicknessRatio.toFixed(1)}) is high; may buckle`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// V1 Calculation (Simplified Empirical Model)
// ============================================================================

/**
 * Calculate wave spring properties using simplified empirical formulas
 * 
 * Reference formulas (simplified crest-to-crest model):
 * - Mean diameter: Dm = (OD + ID) / 2
 * - Wave amplitude: h = (Hf - Nt * t) / (2 * Nt * Nw)
 * - Spring rate: k = (E * b * t³ * Nw⁴) / (2.4 * Dm³ * Nt)
 * - Load: F = k * deflection
 * - Stress: σ = (3 * π * F * Dm) / (4 * Nw * b * t²)
 */
export function calculateWaveSpring(input: WaveSpringInput): WaveSpringResult {
  const validation = validateWaveSpringInput(input);
  
  if (!validation.isValid) {
    return {
      isValid: false,
      travel_mm: 0,
      springRate_Nmm: 0,
      loadAtWorkingHeight_N: 0,
      meanDiameter_mm: 0,
      waveAmplitude_mm: 0,
      totalWaves: 0,
      stressMax_MPa: 0,
      warnings: validation.warnings,
      errors: validation.errors,
    };
  }

  const g = input.geometry;
  const E = input.material?.E_MPa ?? DEFAULT_WAVE_SPRING_MATERIAL.E_MPa;

  // Derived geometry
  const meanDiameter = (g.od + g.id) / 2;
  const travel = g.freeHeight_Hf - g.workingHeight_Hw;
  const totalWaves = g.turns_Nt * g.wavesPerTurn_Nw;

  // Wave amplitude (half peak-to-peak per wave)
  // Simplified: assume waves are evenly distributed
  const solidHeight = g.turns_Nt * g.thickness_t;
  const availableDeflection = g.freeHeight_Hf - solidHeight;
  const waveAmplitude = availableDeflection / (2 * totalWaves);

  // Spring rate calculation (empirical formula for crest-to-crest wave springs)
  // k = (E * b * t³ * Nw⁴) / (2.4 * Dm³ * Nt)
  // Note: This is a simplified formula; actual wave springs may vary
  const k_numerator = E * g.radialWall_b * Math.pow(g.thickness_t, 3) * Math.pow(g.wavesPerTurn_Nw, 4);
  const k_denominator = 2.4 * Math.pow(meanDiameter, 3) * g.turns_Nt;
  const springRate = k_numerator / k_denominator;

  // Load at working height
  const loadAtWorkingHeight = springRate * travel;

  // Maximum bending stress (simplified)
  // σ = (3 * π * F * Dm) / (4 * Nw * b * t²)
  const stress_numerator = 3 * PI * loadAtWorkingHeight * meanDiameter;
  const stress_denominator = 4 * g.wavesPerTurn_Nw * g.radialWall_b * Math.pow(g.thickness_t, 2);
  const stressMax = stress_numerator / stress_denominator;

  // Additional warnings based on results
  const warnings = [...validation.warnings];
  
  if (travel > availableDeflection * 0.9) {
    warnings.push("Working deflection is near solid height - risk of coil clash");
  }

  const yieldStrength = DEFAULT_WAVE_SPRING_MATERIAL.yieldStrength_MPa;
  if (stressMax > yieldStrength * 0.8) {
    warnings.push(`Stress (${stressMax.toFixed(0)} MPa) exceeds 80% of yield strength`);
  }

  return {
    isValid: true,
    travel_mm: travel,
    springRate_Nmm: springRate,
    loadAtWorkingHeight_N: loadAtWorkingHeight,
    meanDiameter_mm: meanDiameter,
    waveAmplitude_mm: waveAmplitude,
    totalWaves,
    stressMax_MPa: stressMax,
    warnings,
    errors: [],
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getDefaultWaveSpringInput(): WaveSpringInput {
  return {
    id: undefined,
    units: "mm",
    geometry: {
      id: 20,
      od: 30,
      thickness_t: 1.0,
      radialWall_b: 4,
      turns_Nt: 10,
      wavesPerTurn_Nw: 4,
      freeHeight_Hf: 20,
      workingHeight_Hw: 18,
    },
    material: {
      id: DEFAULT_WAVE_SPRING_MATERIAL.id,
      E_MPa: DEFAULT_WAVE_SPRING_MATERIAL.E_MPa,
      name: DEFAULT_WAVE_SPRING_MATERIAL.name,
    },
    targets: {
      mode: "loadAtWorkingHeight",
    },
  };
}

export function deriveTravel(freeHeight: number, workingHeight: number): number {
  return Math.max(0, freeHeight - workingHeight);
}

export function deriveSolidHeight(turns: number, thickness: number): number {
  return turns * thickness;
}
