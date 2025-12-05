/**
 * Wire Cross-Section Shape Variation Model - Phase 6
 * 线材截面形状变化模型
 * 
 * Models elliptical distortion, diameter tolerance, surface plating, and eccentricity
 */

/**
 * Wire cross-section parameters
 */
export interface WireCrossSectionParams {
  /** Nominal wire diameter (mm) */
  nominalDiameter: number;
  /** Diameter tolerance (mm, ±) */
  diameterTolerance: number;
  /** Elliptical distortion factor (0 = circular, 0.1 = 10% distortion) */
  ellipticalDistortion: number;
  /** Surface plating thickness (mm) */
  platingThickness: number;
  /** Plating material */
  platingMaterial: 'none' | 'zinc' | 'nickel' | 'chrome' | 'cadmium';
}

/**
 * Wire eccentricity parameters
 */
export interface WireEccentricityParams {
  /** Eccentricity offset (mm) */
  eccentricityOffset: number;
  /** Eccentricity angle (degrees) - direction of offset */
  eccentricityAngle: number;
  /** Nominal mean diameter (mm) */
  nominalMeanDiameter: number;
}

/**
 * Wire geometry analysis result
 */
export interface WireGeometryResult {
  /** Effective wire diameter (mm) */
  effectiveDiameter: number;
  /** Minimum diameter (with tolerance) */
  minDiameter: number;
  /** Maximum diameter (with tolerance) */
  maxDiameter: number;
  /** Ellipse semi-major axis (mm) */
  semiMajorAxis: number;
  /** Ellipse semi-minor axis (mm) */
  semiMinorAxis: number;
  /** Cross-sectional area (mm²) */
  crossSectionalArea: number;
  /** Second moment of area (mm⁴) */
  secondMomentOfArea: number;
  /** Stress correction factor for elliptical section */
  ellipticStressFactor: number;
  /** Plating effect on stress */
  platingStressFactor: number;
  /** Combined stress correction factor */
  combinedStressFactor: number;
  /** Stiffness variation range (%) */
  stiffnessVariationRange: number;
}

/**
 * Eccentricity analysis result
 */
export interface EccentricityResult {
  /** Local mean diameter at angle θ */
  localMeanDiameter: (theta: number) => number;
  /** Maximum mean diameter (mm) */
  maxMeanDiameter: number;
  /** Minimum mean diameter (mm) */
  minMeanDiameter: number;
  /** Stress variation factor */
  stressVariationFactor: number;
  /** Critical angle (degrees) - location of max stress */
  criticalAngle: number;
  /** Stress distribution around coil */
  stressDistribution: {
    angle: number;
    stressFactor: number;
  }[];
}

/**
 * Plating material properties
 */
const PLATING_PROPERTIES: Record<string, { modulus: number; density: number; corrosionResistance: number }> = {
  none: { modulus: 0, density: 0, corrosionResistance: 1.0 },
  zinc: { modulus: 108000, density: 7140, corrosionResistance: 3.0 },
  nickel: { modulus: 200000, density: 8900, corrosionResistance: 4.0 },
  chrome: { modulus: 248000, density: 7190, corrosionResistance: 5.0 },
  cadmium: { modulus: 50000, density: 8650, corrosionResistance: 4.5 },
};

/**
 * Calculate ellipse semi-axes from circular diameter and distortion
 * semi-major: a = d/2 * (1 + δ)
 * semi-minor: b = d/2 * (1 - δ)
 */
export function calculateEllipseAxes(
  diameter: number,
  distortion: number
): { semiMajor: number; semiMinor: number } {
  const radius = diameter / 2;
  return {
    semiMajor: radius * (1 + distortion),
    semiMinor: radius * (1 - distortion),
  };
}

/**
 * Calculate cross-sectional area of ellipse
 * A = π * a * b
 */
export function calculateEllipseArea(semiMajor: number, semiMinor: number): number {
  return Math.PI * semiMajor * semiMinor;
}

/**
 * Calculate second moment of area for ellipse
 * I = π * a * b³ / 4 (about minor axis)
 */
export function calculateEllipseSecondMoment(semiMajor: number, semiMinor: number): number {
  return (Math.PI * semiMajor * Math.pow(semiMinor, 3)) / 4;
}

/**
 * Calculate stress correction factor for elliptical cross-section
 * K_elliptic = (b/a)^(1/3)
 */
export function calculateEllipticStressFactor(semiMajor: number, semiMinor: number): number {
  if (semiMajor <= 0) return 1;
  return Math.pow(semiMinor / semiMajor, 1 / 3);
}

/**
 * Calculate plating effect on stress
 * Plating adds material but may have different modulus
 */
export function calculatePlatingStressFactor(
  coreDiameter: number,
  platingThickness: number,
  platingMaterial: string,
  coreModulus: number = 207000
): number {
  if (platingThickness <= 0 || platingMaterial === 'none') return 1;

  const platingProps = PLATING_PROPERTIES[platingMaterial] || PLATING_PROPERTIES.none;
  
  // Effective modulus using rule of mixtures
  const coreArea = Math.PI * Math.pow(coreDiameter / 2, 2);
  const totalDiameter = coreDiameter + 2 * platingThickness;
  const totalArea = Math.PI * Math.pow(totalDiameter / 2, 2);
  const platingArea = totalArea - coreArea;
  
  const effectiveModulus = (coreModulus * coreArea + platingProps.modulus * platingArea) / totalArea;
  
  // Stress factor (higher modulus = higher stress for same strain)
  return effectiveModulus / coreModulus;
}

/**
 * Calculate stiffness variation due to diameter tolerance
 * k ∝ d⁴, so Δk/k ≈ 4 * Δd/d
 */
export function calculateStiffnessVariation(
  nominalDiameter: number,
  tolerance: number
): number {
  const relativeVariation = tolerance / nominalDiameter;
  return 4 * relativeVariation * 100; // Percentage
}

/**
 * Analyze wire cross-section geometry
 */
export function analyzeWireCrossSection(params: WireCrossSectionParams): WireGeometryResult {
  const {
    nominalDiameter,
    diameterTolerance,
    ellipticalDistortion,
    platingThickness,
    platingMaterial,
  } = params;

  // Effective diameter including plating
  const effectiveDiameter = nominalDiameter + 2 * platingThickness;

  // Diameter range with tolerance
  const minDiameter = nominalDiameter - diameterTolerance;
  const maxDiameter = nominalDiameter + diameterTolerance;

  // Ellipse axes
  const { semiMajor, semiMinor } = calculateEllipseAxes(effectiveDiameter, ellipticalDistortion);

  // Cross-sectional properties
  const crossSectionalArea = calculateEllipseArea(semiMajor, semiMinor);
  const secondMomentOfArea = calculateEllipseSecondMoment(semiMajor, semiMinor);

  // Stress correction factors
  const ellipticStressFactor = calculateEllipticStressFactor(semiMajor, semiMinor);
  const platingStressFactor = calculatePlatingStressFactor(
    nominalDiameter,
    platingThickness,
    platingMaterial
  );

  // Combined factor
  const combinedStressFactor = ellipticStressFactor * platingStressFactor;

  // Stiffness variation
  const stiffnessVariationRange = calculateStiffnessVariation(nominalDiameter, diameterTolerance);

  return {
    effectiveDiameter,
    minDiameter,
    maxDiameter,
    semiMajorAxis: semiMajor,
    semiMinorAxis: semiMinor,
    crossSectionalArea,
    secondMomentOfArea,
    ellipticStressFactor,
    platingStressFactor,
    combinedStressFactor,
    stiffnessVariationRange,
  };
}

/**
 * Calculate local mean diameter with eccentricity
 * Dm_local = Dm + e * cos(θ)
 */
export function calculateLocalMeanDiameter(
  nominalMeanDiameter: number,
  eccentricityOffset: number,
  eccentricityAngle: number,
  theta: number
): number {
  const angleRad = ((theta - eccentricityAngle) * Math.PI) / 180;
  return nominalMeanDiameter + eccentricityOffset * Math.cos(angleRad);
}

/**
 * Calculate stress factor at angle θ due to eccentricity
 * Stress ∝ D, so stress factor = Dm_local / Dm_nominal
 */
export function calculateEccentricityStressFactor(
  nominalMeanDiameter: number,
  localMeanDiameter: number
): number {
  return localMeanDiameter / nominalMeanDiameter;
}

/**
 * Analyze wire eccentricity effects
 */
export function analyzeWireEccentricity(params: WireEccentricityParams): EccentricityResult {
  const {
    eccentricityOffset,
    eccentricityAngle,
    nominalMeanDiameter,
  } = params;

  // Local mean diameter function
  const localMeanDiameter = (theta: number) =>
    calculateLocalMeanDiameter(nominalMeanDiameter, eccentricityOffset, eccentricityAngle, theta);

  // Max and min mean diameters
  const maxMeanDiameter = nominalMeanDiameter + eccentricityOffset;
  const minMeanDiameter = nominalMeanDiameter - eccentricityOffset;

  // Stress variation factor (ratio of max to min)
  const stressVariationFactor = maxMeanDiameter / minMeanDiameter;

  // Critical angle (where stress is maximum)
  const criticalAngle = eccentricityAngle;

  // Generate stress distribution around coil
  const stressDistribution: { angle: number; stressFactor: number }[] = [];
  for (let angle = 0; angle < 360; angle += 10) {
    const localDm = localMeanDiameter(angle);
    const stressFactor = calculateEccentricityStressFactor(nominalMeanDiameter, localDm);
    stressDistribution.push({ angle, stressFactor });
  }

  return {
    localMeanDiameter,
    maxMeanDiameter,
    minMeanDiameter,
    stressVariationFactor,
    criticalAngle,
    stressDistribution,
  };
}

/**
 * Calculate corrected maximum stress with all wire geometry effects
 * τmax_new = K_elliptic * K_plating * K_eccentricity * τmax
 */
export function calculateCorrectedMaxStress(
  baseMaxStress: number,
  crossSectionResult: WireGeometryResult,
  eccentricityResult?: EccentricityResult
): {
  correctedStress: number;
  totalCorrectionFactor: number;
  breakdown: {
    elliptic: number;
    plating: number;
    eccentricity: number;
  };
} {
  const ellipticFactor = crossSectionResult.ellipticStressFactor;
  const platingFactor = crossSectionResult.platingStressFactor;
  const eccentricityFactor = eccentricityResult?.stressVariationFactor ?? 1;

  const totalCorrectionFactor = ellipticFactor * platingFactor * eccentricityFactor;
  const correctedStress = baseMaxStress * totalCorrectionFactor;

  return {
    correctedStress,
    totalCorrectionFactor,
    breakdown: {
      elliptic: ellipticFactor,
      plating: platingFactor,
      eccentricity: eccentricityFactor,
    },
  };
}

/**
 * Calculate worst-case stress considering all tolerances
 */
export function calculateWorstCaseStress(
  baseMaxStress: number,
  params: WireCrossSectionParams,
  eccentricityParams?: WireEccentricityParams
): {
  nominalStress: number;
  worstCaseStress: number;
  stressRange: { min: number; max: number };
  safetyMargin: number;
} {
  // Analyze cross-section
  const crossSectionResult = analyzeWireCrossSection(params);

  // Analyze eccentricity if provided
  const eccentricityResult = eccentricityParams
    ? analyzeWireEccentricity(eccentricityParams)
    : undefined;

  // Nominal stress with corrections
  const { correctedStress: nominalStress } = calculateCorrectedMaxStress(
    baseMaxStress,
    crossSectionResult,
    eccentricityResult
  );

  // Worst case: minimum diameter (highest stress)
  const worstCaseParams = {
    ...params,
    nominalDiameter: params.nominalDiameter - params.diameterTolerance,
    ellipticalDistortion: params.ellipticalDistortion * 1.5, // Assume worst distortion
  };
  const worstCaseCrossSection = analyzeWireCrossSection(worstCaseParams);
  const { correctedStress: worstCaseStress } = calculateCorrectedMaxStress(
    baseMaxStress,
    worstCaseCrossSection,
    eccentricityResult
  );

  // Best case: maximum diameter (lowest stress)
  const bestCaseParams = {
    ...params,
    nominalDiameter: params.nominalDiameter + params.diameterTolerance,
    ellipticalDistortion: params.ellipticalDistortion * 0.5,
  };
  const bestCaseCrossSection = analyzeWireCrossSection(bestCaseParams);
  const { correctedStress: bestCaseStress } = calculateCorrectedMaxStress(
    baseMaxStress,
    bestCaseCrossSection,
    eccentricityResult
  );

  // Safety margin (how much worse than nominal)
  const safetyMargin = (worstCaseStress - nominalStress) / nominalStress * 100;

  return {
    nominalStress,
    worstCaseStress,
    stressRange: { min: bestCaseStress, max: worstCaseStress },
    safetyMargin,
  };
}
