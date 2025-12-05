/**
 * Manufacturability Check Module - Phase 6
 * 可制造性检查模块
 * 
 * Inspects design for manufacturing feasibility
 */

/**
 * Manufacturability check parameters
 */
export interface ManufacturabilityParams {
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Mean diameter (mm) */
  meanDiameter: number;
  /** Outer diameter (mm) */
  outerDiameter: number;
  /** Inner diameter (mm) */
  innerDiameter: number;
  /** Free length (mm) */
  freeLength: number;
  /** Active coils */
  activeCoils: number;
  /** Total coils */
  totalCoils: number;
  /** Pitch (mm) */
  pitch: number;
  /** End type */
  endType: 'open' | 'closed' | 'ground' | 'closed_ground';
  /** Spring type */
  springType: 'compression' | 'extension' | 'torsion' | 'conical';
  /** Production volume */
  productionVolume: 'prototype' | 'low' | 'medium' | 'high';
}

/**
 * Manufacturing capability limits
 */
export interface ManufacturingCapabilities {
  /** Minimum wire diameter (mm) */
  minWireDiameter: number;
  /** Maximum wire diameter (mm) */
  maxWireDiameter: number;
  /** Minimum spring index */
  minSpringIndex: number;
  /** Maximum spring index */
  maxSpringIndex: number;
  /** Minimum pitch (mm) */
  minPitch: number;
  /** Minimum coils */
  minCoils: number;
  /** Maximum free length (mm) */
  maxFreeLength: number;
  /** Can grind ends */
  canGrindEnds: boolean;
  /** Can do shot peening */
  canShotPeen: boolean;
}

/**
 * Manufacturability issue
 */
export interface ManufacturabilityIssue {
  /** Issue code */
  code: string;
  /** Severity */
  severity: 'critical' | 'major' | 'minor' | 'info';
  /** Issue description */
  description: string;
  /** Affected parameter */
  parameter: string;
  /** Current value */
  currentValue: number | string;
  /** Required/recommended value */
  requiredValue: number | string;
  /** Correction suggestion */
  suggestion: string;
  /** Estimated cost impact */
  costImpact: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Manufacturability check result
 */
export interface ManufacturabilityResult {
  /** Overall manufacturability */
  isManufacturable: boolean;
  /** Manufacturing difficulty score (0-100, lower is easier) */
  difficultyScore: number;
  /** Issues found */
  issues: ManufacturabilityIssue[];
  /** Critical issues count */
  criticalCount: number;
  /** Major issues count */
  majorCount: number;
  /** Minor issues count */
  minorCount: number;
  /** Recommended manufacturing process */
  recommendedProcess: string;
  /** Estimated tooling requirements */
  toolingRequirements: string[];
  /** Quality control checkpoints */
  qcCheckpoints: string[];
  /** Summary */
  summary: string;
}

/**
 * Default manufacturing capabilities (typical CNC coiler)
 */
const DEFAULT_CAPABILITIES: ManufacturingCapabilities = {
  minWireDiameter: 0.3,
  maxWireDiameter: 16,
  minSpringIndex: 3,
  maxSpringIndex: 22,
  minPitch: 0.5,
  minCoils: 2,
  maxFreeLength: 500,
  canGrindEnds: true,
  canShotPeen: true,
};

/**
 * Check wire diameter manufacturability
 */
function checkWireDiameter(
  wireDiameter: number,
  capabilities: ManufacturingCapabilities
): ManufacturabilityIssue | null {
  if (wireDiameter < capabilities.minWireDiameter) {
    return {
      code: 'WIRE_TOO_THIN',
      severity: 'critical',
      description: 'Wire diameter below minimum manufacturing capability',
      parameter: 'wireDiameter',
      currentValue: wireDiameter,
      requiredValue: `≥ ${capabilities.minWireDiameter} mm`,
      suggestion: 'Increase wire diameter or find specialized manufacturer',
      costImpact: 'high',
    };
  }
  
  if (wireDiameter > capabilities.maxWireDiameter) {
    return {
      code: 'WIRE_TOO_THICK',
      severity: 'critical',
      description: 'Wire diameter exceeds maximum manufacturing capability',
      parameter: 'wireDiameter',
      currentValue: wireDiameter,
      requiredValue: `≤ ${capabilities.maxWireDiameter} mm`,
      suggestion: 'Reduce wire diameter or use hot coiling process',
      costImpact: 'high',
    };
  }
  
  return null;
}

/**
 * Check spring index manufacturability
 */
function checkSpringIndex(
  meanDiameter: number,
  wireDiameter: number,
  capabilities: ManufacturingCapabilities
): ManufacturabilityIssue | null {
  const springIndex = meanDiameter / wireDiameter;
  
  if (springIndex < capabilities.minSpringIndex) {
    return {
      code: 'INDEX_TOO_LOW',
      severity: 'critical',
      description: 'Spring index too low - wire will crack during coiling',
      parameter: 'springIndex',
      currentValue: springIndex.toFixed(2),
      requiredValue: `≥ ${capabilities.minSpringIndex}`,
      suggestion: 'Increase mean diameter or decrease wire diameter',
      costImpact: 'none',
    };
  }
  
  if (springIndex > capabilities.maxSpringIndex) {
    return {
      code: 'INDEX_TOO_HIGH',
      severity: 'major',
      description: 'Spring index very high - may cause coiling instability',
      parameter: 'springIndex',
      currentValue: springIndex.toFixed(2),
      requiredValue: `≤ ${capabilities.maxSpringIndex}`,
      suggestion: 'Decrease mean diameter or increase wire diameter',
      costImpact: 'low',
    };
  }
  
  return null;
}

/**
 * Check pitch manufacturability
 */
function checkPitch(
  pitch: number,
  wireDiameter: number,
  capabilities: ManufacturingCapabilities
): ManufacturabilityIssue[] {
  const issues: ManufacturabilityIssue[] = [];
  
  // Minimum pitch check
  if (pitch < wireDiameter * 1.1) {
    issues.push({
      code: 'PITCH_TOO_SMALL',
      severity: 'critical',
      description: 'Pitch less than wire diameter - coils will interfere',
      parameter: 'pitch',
      currentValue: pitch,
      requiredValue: `≥ ${(wireDiameter * 1.1).toFixed(2)} mm`,
      suggestion: 'Increase pitch or reduce wire diameter',
      costImpact: 'none',
    });
  }
  
  // Tooling minimum pitch
  if (pitch < capabilities.minPitch) {
    issues.push({
      code: 'PITCH_BELOW_TOOLING',
      severity: 'major',
      description: 'Pitch below tooling minimum capability',
      parameter: 'pitch',
      currentValue: pitch,
      requiredValue: `≥ ${capabilities.minPitch} mm`,
      suggestion: 'Increase pitch or use specialized tooling',
      costImpact: 'medium',
    });
  }
  
  // Very large pitch warning
  if (pitch > wireDiameter * 3) {
    issues.push({
      code: 'PITCH_VERY_LARGE',
      severity: 'minor',
      description: 'Large pitch may cause coiling instability',
      parameter: 'pitch',
      currentValue: pitch,
      requiredValue: `Recommended ≤ ${(wireDiameter * 3).toFixed(2)} mm`,
      suggestion: 'Consider using pitch support during coiling',
      costImpact: 'low',
    });
  }
  
  return issues;
}

/**
 * Check coil count manufacturability
 */
function checkCoilCount(
  activeCoils: number,
  totalCoils: number,
  capabilities: ManufacturingCapabilities
): ManufacturabilityIssue | null {
  if (activeCoils < capabilities.minCoils) {
    return {
      code: 'TOO_FEW_COILS',
      severity: 'major',
      description: 'Too few active coils for stable spring behavior',
      parameter: 'activeCoils',
      currentValue: activeCoils,
      requiredValue: `≥ ${capabilities.minCoils}`,
      suggestion: 'Increase number of active coils',
      costImpact: 'none',
    };
  }
  
  if (totalCoils > 50) {
    return {
      code: 'MANY_COILS',
      severity: 'minor',
      description: 'High coil count may require multiple coiling passes',
      parameter: 'totalCoils',
      currentValue: totalCoils,
      requiredValue: 'Recommended ≤ 50',
      suggestion: 'Consider design optimization to reduce coil count',
      costImpact: 'medium',
    };
  }
  
  return null;
}

/**
 * Check mandrel/wire interference
 */
function checkMandrelInterference(
  innerDiameter: number,
  wireDiameter: number
): ManufacturabilityIssue | null {
  const mandrelDiameter = innerDiameter - wireDiameter;
  
  if (mandrelDiameter < wireDiameter * 2) {
    return {
      code: 'MANDREL_TOO_SMALL',
      severity: 'critical',
      description: 'Mandrel diameter too small - risk of wire damage',
      parameter: 'innerDiameter',
      currentValue: innerDiameter,
      requiredValue: `ID ≥ ${(wireDiameter * 3).toFixed(2)} mm`,
      suggestion: 'Increase inner diameter (reduce wire or increase mean diameter)',
      costImpact: 'none',
    };
  }
  
  return null;
}

/**
 * Check free length manufacturability
 */
function checkFreeLength(
  freeLength: number,
  meanDiameter: number,
  capabilities: ManufacturingCapabilities
): ManufacturabilityIssue[] {
  const issues: ManufacturabilityIssue[] = [];
  
  if (freeLength > capabilities.maxFreeLength) {
    issues.push({
      code: 'LENGTH_TOO_LONG',
      severity: 'major',
      description: 'Free length exceeds standard manufacturing capability',
      parameter: 'freeLength',
      currentValue: freeLength,
      requiredValue: `≤ ${capabilities.maxFreeLength} mm`,
      suggestion: 'Reduce free length or use specialized equipment',
      costImpact: 'high',
    });
  }
  
  // Slenderness check
  const slenderness = freeLength / meanDiameter;
  if (slenderness > 10) {
    issues.push({
      code: 'VERY_SLENDER',
      severity: 'minor',
      description: 'Very slender spring - handling and assembly challenges',
      parameter: 'slenderness',
      currentValue: slenderness.toFixed(1),
      requiredValue: 'Recommended ≤ 10',
      suggestion: 'Consider guided operation or nested spring design',
      costImpact: 'low',
    });
  }
  
  return issues;
}

/**
 * Check end type manufacturability
 */
function checkEndType(
  endType: ManufacturabilityParams['endType'],
  wireDiameter: number,
  capabilities: ManufacturingCapabilities
): ManufacturabilityIssue | null {
  if ((endType === 'ground' || endType === 'closed_ground') && !capabilities.canGrindEnds) {
    return {
      code: 'GRINDING_NOT_AVAILABLE',
      severity: 'major',
      description: 'End grinding not available with current manufacturing setup',
      parameter: 'endType',
      currentValue: endType,
      requiredValue: 'closed or open',
      suggestion: 'Change to closed ends or find manufacturer with grinding capability',
      costImpact: 'medium',
    };
  }
  
  if ((endType === 'ground' || endType === 'closed_ground') && wireDiameter < 1.0) {
    return {
      code: 'GRINDING_THIN_WIRE',
      severity: 'minor',
      description: 'Grinding thin wire ends is difficult and may cause damage',
      parameter: 'endType',
      currentValue: endType,
      requiredValue: 'Closed ends recommended for thin wire',
      suggestion: 'Consider closed (unground) ends for thin wire',
      costImpact: 'low',
    };
  }
  
  return null;
}

/**
 * Calculate manufacturing difficulty score
 */
function calculateDifficultyScore(params: ManufacturabilityParams): number {
  let score = 0;
  
  const springIndex = params.meanDiameter / params.wireDiameter;
  
  // Wire diameter difficulty
  if (params.wireDiameter < 0.5) score += 20;
  else if (params.wireDiameter < 1.0) score += 10;
  else if (params.wireDiameter > 10) score += 15;
  
  // Spring index difficulty
  if (springIndex < 4) score += 25;
  else if (springIndex < 5) score += 10;
  else if (springIndex > 15) score += 10;
  
  // Coil count difficulty
  if (params.totalCoils > 30) score += 10;
  if (params.totalCoils > 50) score += 15;
  
  // Length difficulty
  if (params.freeLength > 200) score += 10;
  if (params.freeLength > 400) score += 15;
  
  // End type difficulty
  if (params.endType === 'closed_ground') score += 10;
  else if (params.endType === 'ground') score += 5;
  
  // Production volume adjustment
  if (params.productionVolume === 'prototype') score += 15;
  else if (params.productionVolume === 'low') score += 5;
  
  return Math.min(100, score);
}

/**
 * Get recommended manufacturing process
 */
function getRecommendedProcess(params: ManufacturabilityParams): string {
  const springIndex = params.meanDiameter / params.wireDiameter;
  
  if (params.wireDiameter > 12) {
    return 'Hot coiling with subsequent heat treatment';
  }
  
  if (params.wireDiameter > 6) {
    return 'CNC coiling with stress relief heat treatment';
  }
  
  if (springIndex < 5) {
    return 'Specialized tight-coil CNC forming';
  }
  
  if (params.productionVolume === 'high') {
    return 'High-speed CNC coiling with automated inspection';
  }
  
  return 'Standard CNC cold coiling';
}

/**
 * Get tooling requirements
 */
function getToolingRequirements(params: ManufacturabilityParams): string[] {
  const requirements: string[] = [];
  const springIndex = params.meanDiameter / params.wireDiameter;
  
  // Mandrel
  const mandrelDiameter = params.innerDiameter - params.wireDiameter;
  requirements.push(`Coiling mandrel: Ø${mandrelDiameter.toFixed(1)} mm`);
  
  // Wire guide
  requirements.push(`Wire guide for Ø${params.wireDiameter} mm wire`);
  
  // Pitch tool
  requirements.push(`Pitch cam for ${params.pitch.toFixed(2)} mm pitch`);
  
  // Cut-off tool
  requirements.push('Cut-off tool for wire separation');
  
  // Grinding
  if (params.endType === 'ground' || params.endType === 'closed_ground') {
    requirements.push('End grinding fixture');
  }
  
  // Special tooling
  if (springIndex < 5) {
    requirements.push('Tight-coil forming tool');
  }
  
  if (params.wireDiameter > 8) {
    requirements.push('Heavy-duty wire straightener');
  }
  
  return requirements;
}

/**
 * Get QC checkpoints
 */
function getQCCheckpoints(params: ManufacturabilityParams): string[] {
  const checkpoints: string[] = [
    'Wire diameter verification (micrometer)',
    'Free length measurement',
    'Outer diameter measurement',
    'Coil count verification',
    'Squareness check (perpendicularity)',
    'Spring rate test (load-deflection)',
  ];
  
  if (params.endType === 'ground' || params.endType === 'closed_ground') {
    checkpoints.push('Ground end flatness check');
  }
  
  if (params.productionVolume === 'high') {
    checkpoints.push('Statistical process control (SPC)');
    checkpoints.push('Automated vision inspection');
  }
  
  return checkpoints;
}

/**
 * Main manufacturability check function
 */
export function checkManufacturability(
  params: ManufacturabilityParams,
  capabilities: ManufacturingCapabilities = DEFAULT_CAPABILITIES
): ManufacturabilityResult {
  const issues: ManufacturabilityIssue[] = [];
  
  // Run all checks
  const wireCheck = checkWireDiameter(params.wireDiameter, capabilities);
  if (wireCheck) issues.push(wireCheck);
  
  const indexCheck = checkSpringIndex(params.meanDiameter, params.wireDiameter, capabilities);
  if (indexCheck) issues.push(indexCheck);
  
  const pitchIssues = checkPitch(params.pitch, params.wireDiameter, capabilities);
  issues.push(...pitchIssues);
  
  const coilCheck = checkCoilCount(params.activeCoils, params.totalCoils, capabilities);
  if (coilCheck) issues.push(coilCheck);
  
  const mandrelCheck = checkMandrelInterference(params.innerDiameter, params.wireDiameter);
  if (mandrelCheck) issues.push(mandrelCheck);
  
  const lengthIssues = checkFreeLength(params.freeLength, params.meanDiameter, capabilities);
  issues.push(...lengthIssues);
  
  const endCheck = checkEndType(params.endType, params.wireDiameter, capabilities);
  if (endCheck) issues.push(endCheck);
  
  // Count issues by severity
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const majorCount = issues.filter(i => i.severity === 'major').length;
  const minorCount = issues.filter(i => i.severity === 'minor').length;
  
  // Determine manufacturability
  const isManufacturable = criticalCount === 0;
  
  // Calculate difficulty score
  const difficultyScore = calculateDifficultyScore(params);
  
  // Get recommendations
  const recommendedProcess = getRecommendedProcess(params);
  const toolingRequirements = getToolingRequirements(params);
  const qcCheckpoints = getQCCheckpoints(params);
  
  // Generate summary
  let summary: string;
  if (!isManufacturable) {
    summary = `UNMANUFACTURABLE DESIGN: ${criticalCount} critical issue(s) must be resolved. ` +
      issues.filter(i => i.severity === 'critical').map(i => i.description).join('; ');
  } else if (majorCount > 0) {
    summary = `Design is manufacturable with ${majorCount} major concern(s). ` +
      `Difficulty score: ${difficultyScore}/100. Review recommendations.`;
  } else if (minorCount > 0) {
    summary = `Design is manufacturable with ${minorCount} minor note(s). ` +
      `Difficulty score: ${difficultyScore}/100.`;
  } else {
    summary = `Design is fully manufacturable. Difficulty score: ${difficultyScore}/100. ` +
      `Recommended process: ${recommendedProcess}`;
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
