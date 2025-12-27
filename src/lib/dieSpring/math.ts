/**
 * Die Spring Engineering Math - Catalog-Based Calculations
 * 模具弹簧工程计算 - 基于目录的计算
 * 
 * ⚠️ All calculations use CATALOG VALUES.
 * Do NOT recalculate spring rate or stress from geometry.
 * OEMs expect catalog values, not theoretical overfitting.
 * 
 * @module dieSpring/math
 */

import {
  DieSpringSpec,
  DieSpringInstallation,
  DieSpringLoadResult,
  DieSpringLifeClass,
  StrokeLimits,
  LIFE_CLASS_INFO,
} from "./types";

// ============================================================================
// LOAD CALCULATION
// ============================================================================

/**
 * Compute load and performance at operating point.
 * Uses CATALOG spring rate - does NOT recalculate from geometry.
 * 
 * @param spec - Die spring specification from catalog
 * @param installation - User installation parameters
 * @returns Load result with force, utilization, and remaining travel
 */
export function computeDieSpringLoad(
  spec: DieSpringSpec,
  installation: DieSpringInstallation
): DieSpringLoadResult {
  const { appliedStroke, lifeClass, preloadStroke = 0 } = installation;

  // Force = k × stroke (catalog spring rate)
  const force = spec.springRate * appliedStroke;
  const preloadForce = spec.springRate * preloadStroke;

  // Utilization calculations
  const lifeLimit = getStrokeLimitForLifeClass(spec.strokeLimits, lifeClass);
  const utilizationMax = (appliedStroke / spec.strokeLimits.max) * 100;
  const utilizationLife = (appliedStroke / lifeLimit) * 100;

  // Remaining travel before solid
  const maxPhysicalStroke = spec.freeLength - spec.solidHeight;
  const remainingTravel = maxPhysicalStroke - appliedStroke;

  // Working height
  const workingHeight = spec.freeLength - appliedStroke;

  return {
    force,
    preloadForce,
    stiffness: spec.springRate,
    utilizationMax,
    utilizationLife,
    remainingTravel,
    workingHeight,
  };
}

/**
 * Get stroke limit for a specific life class
 */
export function getStrokeLimitForLifeClass(
  limits: StrokeLimits,
  lifeClass: DieSpringLifeClass
): number {
  const field = LIFE_CLASS_INFO[lifeClass].strokeField;
  return limits[field];
}

// ============================================================================
// FORCE-BASED SELECTION
// ============================================================================

/**
 * Calculate required stroke to achieve target force
 * 
 * @param spec - Die spring specification
 * @param targetForce - Required force in N
 * @returns Required stroke in mm
 */
export function calculateRequiredStroke(
  spec: DieSpringSpec,
  targetForce: number
): number {
  return targetForce / spec.springRate;
}

/**
 * Check if a die spring can provide the required force
 * within the specified life class stroke limit
 * 
 * @param spec - Die spring specification
 * @param requiredForce - Required force in N
 * @param lifeClass - Target life class
 * @returns Whether the spring is suitable
 */
export function canProvideForce(
  spec: DieSpringSpec,
  requiredForce: number,
  lifeClass: DieSpringLifeClass
): boolean {
  const requiredStroke = calculateRequiredStroke(spec, requiredForce);
  const strokeLimit = getStrokeLimitForLifeClass(spec.strokeLimits, lifeClass);
  return requiredStroke <= strokeLimit;
}

// ============================================================================
// GEOMETRY HELPERS (READ-ONLY)
// ============================================================================

/**
 * Get mean diameter from catalog spec
 * Dm = OD - t (wire thickness)
 */
export function getMeanDiameter(spec: DieSpringSpec): number {
  return spec.outerDiameter - spec.wireThickness;
}

/**
 * Get slenderness ratio for buckling assessment
 * λ = L0 / OD
 */
export function getSlendernessRatio(spec: DieSpringSpec): number {
  return spec.freeLength / spec.outerDiameter;
}

/**
 * Get maximum physical stroke before solid
 * s_max_physical = L0 - Hs
 */
export function getMaxPhysicalStroke(spec: DieSpringSpec): number {
  return spec.freeLength - spec.solidHeight;
}

/**
 * Get the more restrictive stroke limit
 * Compares catalog max stroke vs physical max stroke
 */
export function getEffectiveMaxStroke(spec: DieSpringSpec): number {
  const physicalMax = getMaxPhysicalStroke(spec);
  return Math.min(spec.strokeLimits.max, physicalMax);
}

// ============================================================================
// ENERGY CALCULATION
// ============================================================================

/**
 * Calculate stored elastic energy at a given stroke
 * W = 0.5 × k × s²
 * 
 * @param spec - Die spring specification
 * @param stroke - Deflection in mm
 * @returns Energy in mJ (millijoules)
 */
export function calculateEnergy(spec: DieSpringSpec, stroke: number): number {
  return 0.5 * spec.springRate * stroke * stroke;
}

/**
 * Calculate work done between two stroke positions
 * W = 0.5 × k × (s2² - s1²)
 * 
 * @param spec - Die spring specification
 * @param strokeFrom - Starting stroke in mm
 * @param strokeTo - Ending stroke in mm
 * @returns Work in mJ (millijoules)
 */
export function calculateWork(
  spec: DieSpringSpec,
  strokeFrom: number,
  strokeTo: number
): number {
  return 0.5 * spec.springRate * (strokeTo * strokeTo - strokeFrom * strokeFrom);
}

// ============================================================================
// STACK / PARALLEL CONFIGURATION
// ============================================================================

/**
 * Calculate effective spring rate for parallel configuration
 * k_parallel = n × k_single
 */
export function parallelSpringRate(spec: DieSpringSpec, count: number): number {
  return spec.springRate * count;
}

/**
 * Calculate effective spring rate for series configuration
 * k_series = k_single / n
 */
export function seriesSpringRate(spec: DieSpringSpec, count: number): number {
  return spec.springRate / count;
}

/**
 * Calculate total free length for series stack
 */
export function seriesFreeLength(spec: DieSpringSpec, count: number): number {
  return spec.freeLength * count;
}

/**
 * Calculate total solid height for series stack
 */
export function seriesSolidHeight(spec: DieSpringSpec, count: number): number {
  return spec.solidHeight * count;
}

// ============================================================================
// TORSIONAL SYSTEM INTEGRATION
// ============================================================================

/**
 * Calculate torsional stiffness contribution for clutch/damper systems
 * Kθ = n × k × R²
 * 
 * @param spec - Die spring specification
 * @param springCount - Number of springs in the stage
 * @param installRadius - Installation radius in mm
 * @returns Torsional stiffness in Nm/rad
 */
export function calculateTorsionalStiffness(
  spec: DieSpringSpec,
  springCount: number,
  installRadius: number
): number {
  // k is in N/mm, R is in mm, result is in Nmm/rad
  // Convert to Nm/rad by dividing by 1000
  const stiffnessNmmPerRad = springCount * spec.springRate * installRadius * installRadius;
  return stiffnessNmmPerRad / 1000;
}

/**
 * Calculate maximum angular deflection for a die spring stage
 * θ_max = s_max / R (radians)
 * 
 * @param spec - Die spring specification
 * @param installRadius - Installation radius in mm
 * @param lifeClass - Life class for stroke limit
 * @returns Maximum angular deflection in degrees
 */
export function calculateMaxAngularDeflection(
  spec: DieSpringSpec,
  installRadius: number,
  lifeClass: DieSpringLifeClass
): number {
  const strokeLimit = getStrokeLimitForLifeClass(spec.strokeLimits, lifeClass);
  const radiansMax = strokeLimit / installRadius;
  return radiansMax * (180 / Math.PI);
}
