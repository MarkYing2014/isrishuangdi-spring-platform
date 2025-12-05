/**
 * Shot Peening Residual Stress Model - Phase 6
 * 喷丸残余应力模型
 * 
 * Models residual compressive stress profile from shot peening process
 */

/**
 * Shot peening parameters
 */
export interface ShotPeeningParams {
  /** Peak compressive stress at surface (MPa) - typically 400-800 MPa */
  peakStress: number;
  /** Attenuation depth factor (mm) - typically 0.05-0.2 mm */
  attenuationDepth: number;
  /** Coverage percentage (%) */
  coverage: number;
  /** Shot diameter (mm) */
  shotDiameter: number;
  /** Almen intensity (A, N, or C scale) */
  almenIntensity: string;
  /** Wire diameter for depth calculation (mm) */
  wireDiameter: number;
}

/**
 * Shot peening result
 */
export interface ShotPeeningResult {
  /** Surface compressive stress (MPa) */
  surfaceStress: number;
  /** Stress profile vs depth */
  stressProfile: {
    depth: number;  // mm from surface
    stress: number; // MPa (negative = compressive)
  }[];
  /** Effective depth of compressive layer (mm) */
  effectiveDepth: number;
  /** Fatigue endurance enhancement factor */
  enduranceEnhancementFactor: number;
  /** New endurance limit (MPa) */
  newEnduranceLimit: number;
  /** Corrected effective stress (MPa) */
  correctedEffectiveStress: number;
  /** Surface roughness increase factor */
  roughnessIncreaseFactor: number;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Default shot peening parameters for different applications
 */
export const SHOT_PEENING_PRESETS: Record<string, Partial<ShotPeeningParams>> = {
  light: {
    peakStress: 400,
    attenuationDepth: 0.05,
    coverage: 100,
    almenIntensity: '0.15A',
  },
  standard: {
    peakStress: 600,
    attenuationDepth: 0.1,
    coverage: 200,
    almenIntensity: '0.25A',
  },
  heavy: {
    peakStress: 800,
    attenuationDepth: 0.15,
    coverage: 300,
    almenIntensity: '0.35A',
  },
  aerospace: {
    peakStress: 700,
    attenuationDepth: 0.12,
    coverage: 400,
    almenIntensity: '0.30A',
  },
};

/**
 * Calculate residual stress at depth z
 * τ_shot(z) = τ_peak * exp(-z / a)
 * 
 * @param depth - Depth from surface (mm)
 * @param peakStress - Peak compressive stress at surface (MPa)
 * @param attenuationDepth - Attenuation depth factor (mm)
 * @returns Residual stress at depth (MPa, negative = compressive)
 */
export function calculateResidualStressAtDepth(
  depth: number,
  peakStress: number,
  attenuationDepth: number
): number {
  if (depth < 0) return 0;
  return -peakStress * Math.exp(-depth / attenuationDepth);
}

/**
 * Generate stress profile from surface to depth
 */
export function generateStressProfile(
  peakStress: number,
  attenuationDepth: number,
  maxDepth: number,
  numPoints: number = 50
): { depth: number; stress: number }[] {
  const profile: { depth: number; stress: number }[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const depth = (i / (numPoints - 1)) * maxDepth;
    const stress = calculateResidualStressAtDepth(depth, peakStress, attenuationDepth);
    profile.push({ depth, stress });
  }
  
  return profile;
}

/**
 * Calculate effective depth where compressive stress drops to 10% of peak
 */
export function calculateEffectiveDepth(
  peakStress: number,
  attenuationDepth: number,
  threshold: number = 0.1
): number {
  // Solve: τ_peak * exp(-z/a) = threshold * τ_peak
  // z = -a * ln(threshold)
  return -attenuationDepth * Math.log(threshold);
}

/**
 * Calculate fatigue endurance enhancement factor
 * Based on empirical data from shot peening studies
 */
export function calculateEnduranceEnhancement(
  peakStress: number,
  coverage: number,
  baseEnduranceLimit: number
): number {
  // Enhancement factor increases with peak stress and coverage
  // Typical range: 1.1 to 1.5 (10% to 50% improvement)
  const stressFactor = Math.min(1.0, peakStress / 800);
  const coverageFactor = Math.min(1.0, coverage / 200);
  
  // Combined enhancement factor
  const enhancement = 0.1 + 0.3 * stressFactor + 0.1 * coverageFactor;
  
  return 1 + enhancement;
}

/**
 * Calculate corrected effective stress with shot peening
 * τ_corrected = τ_effective - τ_shot(0)
 */
export function calculateCorrectedStress(
  effectiveStress: number,
  surfaceCompressiveStress: number
): number {
  // Surface compressive stress reduces effective tensile stress
  return effectiveStress - Math.abs(surfaceCompressiveStress);
}

/**
 * Calculate surface roughness increase from shot peening
 */
export function calculateRoughnessIncrease(
  shotDiameter: number,
  almenIntensity: string
): number {
  // Parse Almen intensity (e.g., "0.25A" -> 0.25)
  const intensityValue = parseFloat(almenIntensity) || 0.2;
  
  // Roughness increase factor (Ra increase)
  // Larger shots and higher intensity = more roughness
  const roughnessFactor = 1 + 0.5 * (shotDiameter / 0.5) * intensityValue;
  
  return Math.min(2.0, roughnessFactor);
}

/**
 * Main shot peening simulation
 */
export function simulateShotPeening(
  params: ShotPeeningParams,
  baseEnduranceLimit: number,
  effectiveStress: number
): ShotPeeningResult {
  const {
    peakStress,
    attenuationDepth,
    coverage,
    shotDiameter,
    almenIntensity,
    wireDiameter,
  } = params;

  // Calculate surface stress
  const surfaceStress = -peakStress; // Compressive = negative

  // Generate stress profile (to 1/4 wire diameter depth)
  const maxDepth = wireDiameter / 4;
  const stressProfile = generateStressProfile(peakStress, attenuationDepth, maxDepth);

  // Calculate effective depth
  const effectiveDepth = calculateEffectiveDepth(peakStress, attenuationDepth);

  // Calculate endurance enhancement
  const enduranceEnhancementFactor = calculateEnduranceEnhancement(
    peakStress,
    coverage,
    baseEnduranceLimit
  );

  // New endurance limit
  const newEnduranceLimit = baseEnduranceLimit * enduranceEnhancementFactor;

  // Corrected effective stress
  const correctedEffectiveStress = calculateCorrectedStress(effectiveStress, peakStress);

  // Surface roughness increase
  const roughnessIncreaseFactor = calculateRoughnessIncrease(shotDiameter, almenIntensity);

  // Generate recommendations
  const recommendations: string[] = [];

  if (effectiveDepth < wireDiameter * 0.05) {
    recommendations.push('Consider increasing shot peening intensity for deeper compressive layer');
  }

  if (roughnessIncreaseFactor > 1.5) {
    recommendations.push('High surface roughness - consider post-peening polishing for critical applications');
  }

  if (coverage < 100) {
    recommendations.push('Coverage below 100% - ensure full surface treatment');
  }

  if (peakStress > 0.5 * baseEnduranceLimit) {
    recommendations.push('Excellent compressive stress level for fatigue improvement');
  }

  return {
    surfaceStress,
    stressProfile,
    effectiveDepth,
    enduranceEnhancementFactor,
    newEnduranceLimit,
    correctedEffectiveStress,
    roughnessIncreaseFactor,
    recommendations,
  };
}

/**
 * Combined stress analysis with shot peening
 */
export function analyzeStressWithShotPeening(
  maxShearStress: number,
  meanStress: number,
  shotPeeningParams: ShotPeeningParams,
  baseEnduranceLimit: number,
  ultimateStrength: number
): {
  originalSafetyFactor: number;
  improvedSafetyFactor: number;
  fatigueLifeImprovement: number;
  shotPeeningResult: ShotPeeningResult;
} {
  // Original Goodman safety factor
  const originalSF = 1 / (maxShearStress / baseEnduranceLimit + meanStress / ultimateStrength);

  // Simulate shot peening
  const shotPeeningResult = simulateShotPeening(
    shotPeeningParams,
    baseEnduranceLimit,
    maxShearStress
  );

  // Improved safety factor with shot peening
  const improvedEndurance = shotPeeningResult.newEnduranceLimit;
  const improvedStress = shotPeeningResult.correctedEffectiveStress;
  const improvedMeanStress = meanStress - shotPeeningResult.surfaceStress * 0.3; // Partial mean stress reduction

  const improvedSF = 1 / (
    improvedStress / improvedEndurance + 
    Math.max(0, improvedMeanStress) / ultimateStrength
  );

  // Fatigue life improvement (approximate using S-N slope)
  const fatigueLifeImprovement = Math.pow(improvedSF / originalSF, 5); // Typical S-N slope ~5

  return {
    originalSafetyFactor: originalSF,
    improvedSafetyFactor: improvedSF,
    fatigueLifeImprovement,
    shotPeeningResult,
  };
}
