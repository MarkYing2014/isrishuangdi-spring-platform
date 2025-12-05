/**
 * Multi-Spring Assembly Matching Analyzer - Phase 6
 * 多弹簧装配匹配分析器
 * 
 * Analyzes multi-spring systems (e.g., valve springs, nested springs)
 */

/**
 * Individual spring in assembly
 */
export interface AssemblySpring {
  /** Spring identifier */
  id: string;
  /** Spring name/description */
  name: string;
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
  /** Spring rate (N/mm) */
  springRate: number;
  /** Solid height (mm) */
  solidHeight: number;
  /** Natural frequency (Hz) */
  naturalFrequency: number;
  /** Maximum stress at working deflection (MPa) */
  maxStress: number;
  /** Coil direction */
  coilDirection: 'left' | 'right';
  /** Position in assembly */
  position: 'inner' | 'outer' | 'primary' | 'secondary';
}

/**
 * Assembly configuration
 */
export interface AssemblyConfig {
  /** Assembly type */
  assemblyType: 'nested' | 'series' | 'parallel' | 'valve_double';
  /** Springs in assembly */
  springs: AssemblySpring[];
  /** Working deflection (mm) */
  workingDeflection: number;
  /** Preload deflection (mm) */
  preloadDeflection: number;
  /** Operating frequency (Hz) */
  operatingFrequency?: number;
  /** Shared housing ID (mm) */
  housingInnerDiameter?: number;
  /** Shared rod OD (mm) */
  rodOuterDiameter?: number;
}

/**
 * Interference analysis result
 */
export interface InterferenceAnalysis {
  /** Has interference */
  hasInterference: boolean;
  /** Minimum clearance (mm) */
  minClearance: number;
  /** Clearance location */
  clearanceLocation: string;
  /** Interference details */
  details: string[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Resonance coupling analysis
 */
export interface ResonanceCouplingAnalysis {
  /** Individual natural frequencies (Hz) */
  individualFrequencies: { springId: string; frequency: number }[];
  /** Combined system frequencies (Hz) */
  systemFrequencies: number[];
  /** Frequency ratios between springs */
  frequencyRatios: { spring1: string; spring2: string; ratio: number }[];
  /** Resonance coupling risk */
  couplingRisk: 'low' | 'medium' | 'high';
  /** Critical frequencies to avoid */
  criticalFrequencies: number[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Load sharing analysis
 */
export interface LoadSharingAnalysis {
  /** Load distribution at working deflection */
  loadDistribution: { springId: string; load: number; percentage: number }[];
  /** Combined spring rate */
  combinedSpringRate: number;
  /** Preload forces */
  preloadForces: { springId: string; preload: number }[];
  /** Preload compatibility */
  preloadCompatible: boolean;
  /** Stress distribution */
  stressDistribution: { springId: string; stress: number; safetyFactor: number }[];
  /** Weakest link */
  weakestSpring: string;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Assembly analysis result
 */
export interface AssemblyAnalysisResult {
  /** Assembly configuration */
  config: AssemblyConfig;
  /** Combined stiffness (N/mm) */
  combinedStiffness: number;
  /** Combined preload (N) */
  combinedPreload: number;
  /** Working load (N) */
  workingLoad: number;
  /** Interference analysis */
  interferenceAnalysis: InterferenceAnalysis;
  /** Resonance coupling analysis */
  resonanceCoupling: ResonanceCouplingAnalysis;
  /** Load sharing analysis */
  loadSharing: LoadSharingAnalysis;
  /** Overall assembly rating */
  assemblyRating: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
  /** Issues found */
  issues: string[];
  /** Summary */
  summary: string;
}

/**
 * Calculate combined spring rate for series configuration
 * 1/k_total = 1/k1 + 1/k2 + ...
 */
function calculateSeriesStiffness(springs: AssemblySpring[]): number {
  const sumInverse = springs.reduce((sum, s) => sum + 1 / s.springRate, 0);
  return 1 / sumInverse;
}

/**
 * Calculate combined spring rate for parallel configuration
 * k_total = k1 + k2 + ...
 */
function calculateParallelStiffness(springs: AssemblySpring[]): number {
  return springs.reduce((sum, s) => sum + s.springRate, 0);
}

/**
 * Analyze interference between nested springs
 */
function analyzeInterference(config: AssemblyConfig): InterferenceAnalysis {
  const details: string[] = [];
  const recommendations: string[] = [];
  let hasInterference = false;
  let minClearance = Infinity;
  let clearanceLocation = '';

  if (config.assemblyType === 'nested' || config.assemblyType === 'valve_double') {
    // Find inner and outer springs
    const innerSpring = config.springs.find(s => s.position === 'inner');
    const outerSpring = config.springs.find(s => s.position === 'outer');

    if (innerSpring && outerSpring) {
      // Check radial clearance
      const radialClearance = outerSpring.innerDiameter - innerSpring.outerDiameter;
      
      if (radialClearance < innerSpring.wireDiameter * 0.5) {
        hasInterference = true;
        details.push(`Radial clearance (${radialClearance.toFixed(2)} mm) less than minimum`);
        recommendations.push('Increase outer spring ID or decrease inner spring OD');
      }
      
      if (radialClearance < minClearance) {
        minClearance = radialClearance;
        clearanceLocation = 'Radial (between inner OD and outer ID)';
      }

      // Check axial clearance at solid height
      const innerSolidHeight = innerSpring.solidHeight;
      const outerSolidHeight = outerSpring.solidHeight;
      
      if (Math.abs(innerSolidHeight - outerSolidHeight) > 2) {
        details.push(`Solid heights differ by ${Math.abs(innerSolidHeight - outerSolidHeight).toFixed(1)} mm`);
        recommendations.push('Consider matching solid heights for uniform bottoming');
      }

      // Check coil direction
      if (innerSpring.coilDirection === outerSpring.coilDirection) {
        details.push('Same coil direction - risk of coil interlocking');
        recommendations.push('Use opposite coil directions (one left, one right hand)');
      }
    }

    // Check housing clearance
    if (config.housingInnerDiameter) {
      const outerSpringOD = outerSpring?.outerDiameter ?? 0;
      const housingClearance = config.housingInnerDiameter - outerSpringOD;
      
      if (housingClearance < 1) {
        hasInterference = true;
        details.push(`Housing clearance (${housingClearance.toFixed(2)} mm) too small`);
        recommendations.push('Increase housing ID or decrease outer spring OD');
      }
      
      if (housingClearance < minClearance) {
        minClearance = housingClearance;
        clearanceLocation = 'Housing (outer spring to housing)';
      }
    }

    // Check rod clearance
    if (config.rodOuterDiameter) {
      const innerSpringID = innerSpring?.innerDiameter ?? Infinity;
      const rodClearance = innerSpringID - config.rodOuterDiameter;
      
      if (rodClearance < 1) {
        hasInterference = true;
        details.push(`Rod clearance (${rodClearance.toFixed(2)} mm) too small`);
        recommendations.push('Decrease rod OD or increase inner spring ID');
      }
      
      if (rodClearance < minClearance) {
        minClearance = rodClearance;
        clearanceLocation = 'Rod (inner spring to rod)';
      }
    }
  }

  if (minClearance === Infinity) {
    minClearance = 0;
    clearanceLocation = 'N/A';
  }

  return {
    hasInterference,
    minClearance,
    clearanceLocation,
    details,
    recommendations,
  };
}

/**
 * Analyze resonance coupling between springs
 */
function analyzeResonanceCoupling(config: AssemblyConfig): ResonanceCouplingAnalysis {
  const individualFrequencies = config.springs.map(s => ({
    springId: s.id,
    frequency: s.naturalFrequency,
  }));

  // Calculate frequency ratios
  const frequencyRatios: ResonanceCouplingAnalysis['frequencyRatios'] = [];
  for (let i = 0; i < config.springs.length; i++) {
    for (let j = i + 1; j < config.springs.length; j++) {
      const ratio = config.springs[i].naturalFrequency / config.springs[j].naturalFrequency;
      frequencyRatios.push({
        spring1: config.springs[i].id,
        spring2: config.springs[j].id,
        ratio: ratio > 1 ? ratio : 1 / ratio,
      });
    }
  }

  // Calculate system frequencies (simplified - actual would need modal analysis)
  const systemFrequencies: number[] = [];
  
  if (config.assemblyType === 'parallel' || config.assemblyType === 'nested') {
    // Parallel: combined frequency
    const combinedK = calculateParallelStiffness(config.springs);
    const totalMass = config.springs.reduce((sum, s) => {
      // Approximate mass from spring rate and frequency
      const mass = s.springRate / Math.pow(2 * Math.PI * s.naturalFrequency, 2);
      return sum + mass;
    }, 0);
    const combinedFreq = Math.sqrt(combinedK / totalMass) / (2 * Math.PI);
    systemFrequencies.push(combinedFreq);
  } else if (config.assemblyType === 'series') {
    // Series: lower combined frequency
    const combinedK = calculateSeriesStiffness(config.springs);
    const avgMass = config.springs.reduce((sum, s) => {
      const mass = s.springRate / Math.pow(2 * Math.PI * s.naturalFrequency, 2);
      return sum + mass;
    }, 0) / config.springs.length;
    const combinedFreq = Math.sqrt(combinedK / avgMass) / (2 * Math.PI);
    systemFrequencies.push(combinedFreq);
  }

  // Determine coupling risk
  let couplingRisk: ResonanceCouplingAnalysis['couplingRisk'] = 'low';
  const recommendations: string[] = [];
  const criticalFrequencies: number[] = [];

  // Check for problematic frequency ratios (near 1:1, 2:1, 3:1)
  for (const fr of frequencyRatios) {
    const nearInteger = Math.abs(fr.ratio - Math.round(fr.ratio));
    if (nearInteger < 0.1) {
      couplingRisk = 'high';
      recommendations.push(`Frequency ratio ${fr.spring1}/${fr.spring2} near ${Math.round(fr.ratio)}:1 - high coupling risk`);
      criticalFrequencies.push(
        individualFrequencies.find(f => f.springId === fr.spring1)?.frequency ?? 0
      );
    } else if (nearInteger < 0.2) {
      if (couplingRisk === 'low') couplingRisk = 'medium';
      recommendations.push(`Frequency ratio ${fr.spring1}/${fr.spring2} = ${fr.ratio.toFixed(2)} - moderate coupling risk`);
    }
  }

  // Check operating frequency
  if (config.operatingFrequency) {
    for (const sf of systemFrequencies) {
      const ratio = config.operatingFrequency / sf;
      if (ratio > 0.7 && ratio < 1.3) {
        couplingRisk = 'high';
        recommendations.push(`Operating frequency near system resonance (${sf.toFixed(0)} Hz)`);
        criticalFrequencies.push(sf);
      }
    }
  }

  if (couplingRisk === 'low') {
    recommendations.push('Frequency separation is adequate - low resonance coupling risk');
  }

  return {
    individualFrequencies,
    systemFrequencies,
    frequencyRatios,
    couplingRisk,
    criticalFrequencies,
    recommendations,
  };
}

/**
 * Analyze load sharing between springs
 */
function analyzeLoadSharing(config: AssemblyConfig): LoadSharingAnalysis {
  const recommendations: string[] = [];
  
  // Calculate combined spring rate based on assembly type
  let combinedSpringRate: number;
  if (config.assemblyType === 'series') {
    combinedSpringRate = calculateSeriesStiffness(config.springs);
  } else {
    combinedSpringRate = calculateParallelStiffness(config.springs);
  }

  // Calculate preload forces
  const preloadForces = config.springs.map(s => ({
    springId: s.id,
    preload: s.springRate * config.preloadDeflection,
  }));

  // Calculate load distribution at working deflection
  const totalDeflection = config.preloadDeflection + config.workingDeflection;
  let loadDistribution: LoadSharingAnalysis['loadDistribution'];
  
  if (config.assemblyType === 'series') {
    // Series: same force through all springs
    const totalForce = combinedSpringRate * totalDeflection;
    loadDistribution = config.springs.map(s => ({
      springId: s.id,
      load: totalForce,
      percentage: 100 / config.springs.length,
    }));
  } else {
    // Parallel: force proportional to stiffness
    const totalForce = combinedSpringRate * totalDeflection;
    loadDistribution = config.springs.map(s => ({
      springId: s.id,
      load: s.springRate * totalDeflection,
      percentage: (s.springRate / combinedSpringRate) * 100,
    }));
  }

  // Calculate stress distribution
  const stressDistribution = config.springs.map(s => {
    const load = loadDistribution.find(l => l.springId === s.id)?.load ?? 0;
    // Approximate stress from load (simplified)
    const stress = s.maxStress * (load / (s.springRate * config.workingDeflection));
    const allowableStress = 560; // Simplified
    return {
      springId: s.id,
      stress,
      safetyFactor: allowableStress / stress,
    };
  });

  // Find weakest spring
  const weakestSpring = stressDistribution.reduce((min, s) => 
    s.safetyFactor < min.safetyFactor ? s : min
  ).springId;

  // Check preload compatibility
  const preloadVariation = Math.max(...preloadForces.map(p => p.preload)) - 
    Math.min(...preloadForces.map(p => p.preload));
  const avgPreload = preloadForces.reduce((sum, p) => sum + p.preload, 0) / preloadForces.length;
  const preloadCompatible = preloadVariation / avgPreload < 0.2;

  if (!preloadCompatible) {
    recommendations.push('Preload forces vary significantly - consider matching spring rates');
  }

  // Check load balance
  const loadVariation = Math.max(...loadDistribution.map(l => l.percentage)) - 
    Math.min(...loadDistribution.map(l => l.percentage));
  if (loadVariation > 30) {
    recommendations.push('Uneven load distribution - consider balancing spring rates');
  }

  // Check safety factors
  const minSF = Math.min(...stressDistribution.map(s => s.safetyFactor));
  if (minSF < 1.2) {
    recommendations.push(`Low safety factor on ${weakestSpring} - consider strengthening`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Load sharing is well balanced');
  }

  return {
    loadDistribution,
    combinedSpringRate,
    preloadForces,
    preloadCompatible,
    stressDistribution,
    weakestSpring,
    recommendations,
  };
}

/**
 * Determine overall assembly rating
 */
function determineAssemblyRating(
  interference: InterferenceAnalysis,
  resonance: ResonanceCouplingAnalysis,
  loadSharing: LoadSharingAnalysis
): AssemblyAnalysisResult['assemblyRating'] {
  if (interference.hasInterference) return 'unacceptable';
  
  const minSF = Math.min(...loadSharing.stressDistribution.map(s => s.safetyFactor));
  if (minSF < 1.0) return 'unacceptable';
  
  if (resonance.couplingRisk === 'high') return 'poor';
  if (minSF < 1.2) return 'poor';
  
  if (resonance.couplingRisk === 'medium' || !loadSharing.preloadCompatible) return 'acceptable';
  
  if (minSF >= 1.5 && resonance.couplingRisk === 'low' && interference.minClearance >= 2) {
    return 'excellent';
  }
  
  return 'good';
}

/**
 * Main assembly analysis function
 */
export function analyzeMultiSpringAssembly(config: AssemblyConfig): AssemblyAnalysisResult {
  // Run all analyses
  const interferenceAnalysis = analyzeInterference(config);
  const resonanceCoupling = analyzeResonanceCoupling(config);
  const loadSharing = analyzeLoadSharing(config);

  // Calculate combined properties
  const combinedStiffness = loadSharing.combinedSpringRate;
  const combinedPreload = loadSharing.preloadForces.reduce((sum, p) => sum + p.preload, 0);
  const workingLoad = combinedStiffness * (config.preloadDeflection + config.workingDeflection);

  // Determine rating
  const assemblyRating = determineAssemblyRating(interferenceAnalysis, resonanceCoupling, loadSharing);

  // Collect all issues
  const issues: string[] = [
    ...interferenceAnalysis.details,
    ...resonanceCoupling.recommendations.filter(r => r.includes('risk')),
    ...loadSharing.recommendations.filter(r => r.includes('consider') || r.includes('Low')),
  ];

  // Generate summary
  let summary: string;
  switch (assemblyRating) {
    case 'excellent':
      summary = 'Assembly design is excellent with good clearances, balanced loads, and low resonance risk.';
      break;
    case 'good':
      summary = 'Assembly design is good. Minor optimizations possible.';
      break;
    case 'acceptable':
      summary = 'Assembly design is acceptable but has some concerns that should be reviewed.';
      break;
    case 'poor':
      summary = 'Assembly design has significant issues. Redesign recommended.';
      break;
    case 'unacceptable':
      summary = 'Assembly design is unacceptable due to interference or safety concerns. Must be redesigned.';
      break;
  }

  return {
    config,
    combinedStiffness,
    combinedPreload,
    workingLoad,
    interferenceAnalysis,
    resonanceCoupling,
    loadSharing,
    assemblyRating,
    issues,
    summary,
  };
}

/**
 * Quick compatibility check for two springs
 */
export function checkSpringCompatibility(
  spring1: AssemblySpring,
  spring2: AssemblySpring,
  assemblyType: AssemblyConfig['assemblyType']
): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for nested configuration
  if (assemblyType === 'nested' || assemblyType === 'valve_double') {
    // Determine inner/outer
    const [inner, outer] = spring1.outerDiameter < spring2.outerDiameter 
      ? [spring1, spring2] : [spring2, spring1];

    // Radial clearance
    const clearance = outer.innerDiameter - inner.outerDiameter;
    if (clearance < inner.wireDiameter * 0.5) {
      issues.push('Insufficient radial clearance');
      recommendations.push('Increase size difference between springs');
    }

    // Coil direction
    if (spring1.coilDirection === spring2.coilDirection) {
      issues.push('Same coil direction');
      recommendations.push('Use opposite hand coils');
    }

    // Free length match
    const lengthDiff = Math.abs(spring1.freeLength - spring2.freeLength);
    if (lengthDiff > 5) {
      issues.push(`Free lengths differ by ${lengthDiff.toFixed(1)} mm`);
      recommendations.push('Match free lengths for uniform compression');
    }
  }

  // Frequency ratio check
  const freqRatio = spring1.naturalFrequency / spring2.naturalFrequency;
  const normalizedRatio = freqRatio > 1 ? freqRatio : 1 / freqRatio;
  if (Math.abs(normalizedRatio - Math.round(normalizedRatio)) < 0.1) {
    issues.push(`Frequency ratio near ${Math.round(normalizedRatio)}:1`);
    recommendations.push('Adjust spring rates to avoid resonance coupling');
  }

  return {
    compatible: issues.length === 0,
    issues,
    recommendations,
  };
}
