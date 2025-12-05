/**
 * Resonance Harmonic Response Analysis - Phase 7
 * 共振谐波响应分析
 * 
 * Scans frequency domain to detect resonance risks
 */

/**
 * Vibration mode type
 */
export type VibrationMode = 
  | 'axial_fundamental'
  | 'axial_harmonic'
  | 'torsional'
  | 'lateral_bending'
  | 'surge'
  | 'coupled';

/**
 * Spring dynamic properties
 */
export interface SpringDynamicProperties {
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Mean diameter (mm) */
  meanDiameter: number;
  /** Active coils */
  activeCoils: number;
  /** Free length (mm) */
  freeLength: number;
  /** Spring rate (N/mm) */
  springRate: number;
  /** Material density (kg/m³) */
  density: number;
  /** Shear modulus (MPa) */
  shearModulus: number;
  /** Elastic modulus (MPa) */
  elasticModulus: number;
  /** Installed length (mm) - optional */
  installedLength?: number;
  /** End mass (kg) - optional */
  endMass?: number;
}

/**
 * Operating conditions
 */
export interface OperatingConditions {
  /** Operating frequency range (Hz) */
  frequencyRange: { min: number; max: number };
  /** Operating RPM (if applicable) */
  operatingRPM?: number;
  /** Excitation amplitude (mm) */
  excitationAmplitude?: number;
  /** Damping ratio */
  dampingRatio?: number;
}

/**
 * Detected vibration mode
 */
export interface DetectedMode {
  /** Mode type */
  type: VibrationMode;
  /** Natural frequency (Hz) */
  frequency: number;
  /** Mode number (1st, 2nd, etc.) */
  modeNumber: number;
  /** Modal mass participation (%) */
  massParticipation: number;
  /** Mode shape description */
  description: string;
  /** Damping ratio for this mode */
  dampingRatio: number;
}

/**
 * Resonance risk assessment
 */
export interface ResonanceRisk {
  /** Mode causing risk */
  mode: DetectedMode;
  /** Operating frequency causing resonance */
  operatingFrequency: number;
  /** Frequency ratio (operating/natural) */
  frequencyRatio: number;
  /** Amplification factor */
  amplificationFactor: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Recommended action */
  recommendation: string;
}

/**
 * Frequency response point
 */
export interface FrequencyResponsePoint {
  /** Frequency (Hz) */
  frequency: number;
  /** Amplitude ratio */
  amplitudeRatio: number;
  /** Phase angle (degrees) */
  phaseAngle: number;
  /** Transmissibility */
  transmissibility: number;
}

/**
 * Harmonic response result
 */
export interface HarmonicResponseResult {
  /** Detected vibration modes */
  detectedModes: DetectedMode[];
  /** Frequency response curve */
  frequencyResponse: FrequencyResponsePoint[];
  /** Resonance risks */
  resonanceRisks: ResonanceRisk[];
  /** Safe operating frequency bands */
  safeFrequencyBands: { min: number; max: number }[];
  /** Critical frequencies to avoid */
  criticalFrequencies: number[];
  /** Overall resonance risk */
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  /** Recommendations */
  recommendations: string[];
}

/**
 * Calculate spring mass
 */
function calculateSpringMass(props: SpringDynamicProperties): number {
  const totalCoils = props.activeCoils + 2;
  const coilCircumference = Math.PI * props.meanDiameter;
  const wireLength = totalCoils * coilCircumference;
  const wireArea = Math.PI * Math.pow(props.wireDiameter / 2, 2);
  const volume = wireArea * wireLength;  // mm³
  return (volume / 1e9) * props.density;  // kg
}

/**
 * Calculate axial natural frequency
 * f_n = (1/2π) * sqrt(k/m_eff)
 */
function calculateAxialFrequency(
  springRate: number,  // N/mm
  springMass: number,  // kg
  endMass: number = 0,  // kg
  modeNumber: number = 1
): number {
  // Effective mass (1/3 of spring mass + end mass)
  const effectiveMass = springMass / 3 + endMass;
  
  // Convert spring rate to N/m
  const k = springRate * 1000;
  
  // Natural frequency
  const fn = (modeNumber / (2 * Math.PI)) * Math.sqrt(k / effectiveMass);
  
  return fn;
}

/**
 * Calculate surge frequency (wave propagation)
 * f_surge = (n/4L) * sqrt(G*g / ρ)
 */
function calculateSurgeFrequency(
  props: SpringDynamicProperties,
  modeNumber: number = 1
): number {
  const { shearModulus, density, activeCoils, meanDiameter, wireDiameter } = props;
  
  // Wave velocity in spring
  const G = shearModulus * 1e6;  // Pa
  const rho = density;  // kg/m³
  const waveVelocity = Math.sqrt(G / rho);
  
  // Active length of wire
  const wireLength = activeCoils * Math.PI * meanDiameter / 1000;  // m
  
  // Surge frequency
  const fSurge = (modeNumber * waveVelocity) / (4 * wireLength);
  
  return fSurge;
}

/**
 * Calculate torsional natural frequency
 */
function calculateTorsionalFrequency(
  props: SpringDynamicProperties,
  modeNumber: number = 1
): number {
  const { shearModulus, density, wireDiameter, meanDiameter, activeCoils } = props;
  
  // Torsional stiffness
  const G = shearModulus * 1e6;  // Pa
  const d = wireDiameter / 1000;  // m
  const D = meanDiameter / 1000;  // m
  const n = activeCoils;
  
  // Polar moment of inertia
  const Ip = Math.PI * Math.pow(d, 4) / 32;
  
  // Torsional stiffness
  const kt = (G * Ip) / (Math.PI * D * n);
  
  // Mass moment of inertia
  const wireLength = n * Math.PI * D;
  const mass = (Math.PI * Math.pow(d/2, 2) * wireLength) * density;
  const J = mass * Math.pow(D/2, 2) / 2;
  
  // Torsional frequency
  const ft = (modeNumber / (2 * Math.PI)) * Math.sqrt(kt / J);
  
  return ft;
}

/**
 * Calculate lateral bending frequency
 */
function calculateBendingFrequency(
  props: SpringDynamicProperties,
  modeNumber: number = 1
): number {
  const { elasticModulus, density, wireDiameter, freeLength, activeCoils } = props;
  
  // Treat spring as equivalent beam
  const E = elasticModulus * 1e6;  // Pa
  const d = wireDiameter / 1000;  // m
  const L = freeLength / 1000;  // m
  
  // Moment of inertia (equivalent)
  const I = Math.PI * Math.pow(d, 4) / 64 * activeCoils;
  
  // Linear mass density
  const wireLength = activeCoils * Math.PI * props.meanDiameter / 1000;
  const mass = (Math.PI * Math.pow(d/2, 2) * wireLength) * density;
  const mu = mass / L;
  
  // Bending frequency (simply supported beam)
  const lambda = modeNumber * Math.PI;
  const fb = (lambda * lambda / (2 * Math.PI * L * L)) * Math.sqrt(E * I / mu);
  
  return fb;
}

/**
 * Calculate frequency response (transmissibility)
 */
function calculateFrequencyResponse(
  naturalFrequency: number,
  dampingRatio: number,
  frequencyRange: { min: number; max: number },
  numPoints: number = 200
): FrequencyResponsePoint[] {
  const response: FrequencyResponsePoint[] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const f = frequencyRange.min + (frequencyRange.max - frequencyRange.min) * (i / numPoints);
    const r = f / naturalFrequency;  // Frequency ratio
    const zeta = dampingRatio;
    
    // Transmissibility
    const numerator = Math.sqrt(1 + Math.pow(2 * zeta * r, 2));
    const denominator = Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
    const T = numerator / denominator;
    
    // Amplitude ratio (for force excitation)
    const H = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
    
    // Phase angle
    const phi = Math.atan2(2 * zeta * r, 1 - r * r) * 180 / Math.PI;
    
    response.push({
      frequency: f,
      amplitudeRatio: H,
      phaseAngle: phi,
      transmissibility: T,
    });
  }
  
  return response;
}

/**
 * Assess resonance risk
 */
function assessResonanceRisk(
  mode: DetectedMode,
  operatingFrequency: number,
  dampingRatio: number
): ResonanceRisk {
  const frequencyRatio = operatingFrequency / mode.frequency;
  
  // Amplification factor at this frequency ratio
  const r = frequencyRatio;
  const zeta = dampingRatio;
  const amplificationFactor = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
  
  // Risk level based on frequency ratio and amplification
  let riskLevel: ResonanceRisk['riskLevel'];
  let recommendation: string;
  
  if (frequencyRatio > 0.85 && frequencyRatio < 1.15) {
    riskLevel = 'critical';
    recommendation = `Operating frequency ${operatingFrequency.toFixed(0)} Hz is at resonance with ${mode.type} mode. Immediate design change required.`;
  } else if (frequencyRatio > 0.7 && frequencyRatio < 1.3) {
    riskLevel = 'high';
    recommendation = `Operating frequency is near ${mode.type} resonance. Consider changing spring rate or mass.`;
  } else if (amplificationFactor > 2) {
    riskLevel = 'medium';
    recommendation = `Moderate amplification at ${mode.type} mode. Monitor for vibration issues.`;
  } else {
    riskLevel = 'low';
    recommendation = `${mode.type} mode is well separated from operating frequency.`;
  }
  
  return {
    mode,
    operatingFrequency,
    frequencyRatio,
    amplificationFactor,
    riskLevel,
    recommendation,
  };
}

/**
 * Perform harmonic response analysis
 */
export function analyzeHarmonicResponse(
  props: SpringDynamicProperties,
  conditions: OperatingConditions
): HarmonicResponseResult {
  const springMass = calculateSpringMass(props);
  const dampingRatio = conditions.dampingRatio || 0.02;  // Default 2% damping
  
  // Detect all vibration modes
  const detectedModes: DetectedMode[] = [];
  
  // Axial modes (1st through 3rd)
  for (let n = 1; n <= 3; n++) {
    const freq = calculateAxialFrequency(props.springRate, springMass, props.endMass || 0, n);
    if (freq <= conditions.frequencyRange.max * 1.5) {
      detectedModes.push({
        type: n === 1 ? 'axial_fundamental' : 'axial_harmonic',
        frequency: freq,
        modeNumber: n,
        massParticipation: n === 1 ? 85 : 10 / n,
        description: `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : 'rd'} axial mode - spring compression/extension`,
        dampingRatio,
      });
    }
  }
  
  // Surge modes
  for (let n = 1; n <= 2; n++) {
    const freq = calculateSurgeFrequency(props, n);
    if (freq <= conditions.frequencyRange.max * 1.5) {
      detectedModes.push({
        type: 'surge',
        frequency: freq,
        modeNumber: n,
        massParticipation: 5,
        description: `${n}${n === 1 ? 'st' : 'nd'} surge mode - wave propagation along coils`,
        dampingRatio: dampingRatio * 0.5,  // Surge has less damping
      });
    }
  }
  
  // Torsional mode
  const torsionalFreq = calculateTorsionalFrequency(props, 1);
  if (torsionalFreq <= conditions.frequencyRange.max * 1.5) {
    detectedModes.push({
      type: 'torsional',
      frequency: torsionalFreq,
      modeNumber: 1,
      massParticipation: 15,
      description: '1st torsional mode - rotational oscillation',
      dampingRatio,
    });
  }
  
  // Lateral bending modes
  for (let n = 1; n <= 2; n++) {
    const freq = calculateBendingFrequency(props, n);
    if (freq <= conditions.frequencyRange.max * 1.5) {
      detectedModes.push({
        type: 'lateral_bending',
        frequency: freq,
        modeNumber: n,
        massParticipation: 8 / n,
        description: `${n}${n === 1 ? 'st' : 'nd'} lateral bending mode`,
        dampingRatio: dampingRatio * 1.2,
      });
    }
  }
  
  // Sort by frequency
  detectedModes.sort((a, b) => a.frequency - b.frequency);
  
  // Calculate frequency response for fundamental mode
  const fundamentalMode = detectedModes.find(m => m.type === 'axial_fundamental');
  const frequencyResponse = fundamentalMode ? 
    calculateFrequencyResponse(fundamentalMode.frequency, dampingRatio, conditions.frequencyRange) :
    [];
  
  // Assess resonance risks
  const resonanceRisks: ResonanceRisk[] = [];
  const operatingFrequencies: number[] = [];
  
  // Add operating RPM as frequency
  if (conditions.operatingRPM) {
    operatingFrequencies.push(conditions.operatingRPM / 60);  // Convert to Hz
    // Add harmonics
    operatingFrequencies.push(conditions.operatingRPM / 60 * 2);
    operatingFrequencies.push(conditions.operatingRPM / 60 * 3);
  }
  
  // Check each operating frequency against each mode
  for (const opFreq of operatingFrequencies) {
    for (const mode of detectedModes) {
      const risk = assessResonanceRisk(mode, opFreq, dampingRatio);
      if (risk.riskLevel !== 'low') {
        resonanceRisks.push(risk);
      }
    }
  }
  
  // Determine safe frequency bands
  const safeFrequencyBands: { min: number; max: number }[] = [];
  const criticalFrequencies = detectedModes.map(m => m.frequency);
  
  // Safe bands are regions away from natural frequencies
  let lastCritical = 0;
  for (const freq of criticalFrequencies) {
    const safeMin = lastCritical * 1.3;
    const safeMax = freq * 0.7;
    if (safeMax > safeMin && safeMin >= conditions.frequencyRange.min) {
      safeFrequencyBands.push({ min: safeMin, max: Math.min(safeMax, conditions.frequencyRange.max) });
    }
    lastCritical = freq;
  }
  
  // Add band above last critical
  if (lastCritical * 1.3 < conditions.frequencyRange.max) {
    safeFrequencyBands.push({ 
      min: lastCritical * 1.3, 
      max: conditions.frequencyRange.max 
    });
  }
  
  // Overall risk assessment
  let overallRisk: HarmonicResponseResult['overallRisk'] = 'low';
  if (resonanceRisks.some(r => r.riskLevel === 'critical')) {
    overallRisk = 'critical';
  } else if (resonanceRisks.some(r => r.riskLevel === 'high')) {
    overallRisk = 'high';
  } else if (resonanceRisks.some(r => r.riskLevel === 'medium')) {
    overallRisk = 'medium';
  }
  
  // Generate recommendations
  const recommendations = generateResonanceRecommendations(
    detectedModes,
    resonanceRisks,
    conditions,
    props
  );
  
  return {
    detectedModes,
    frequencyResponse,
    resonanceRisks,
    safeFrequencyBands,
    criticalFrequencies,
    overallRisk,
    recommendations,
  };
}

/**
 * Generate resonance recommendations
 */
function generateResonanceRecommendations(
  modes: DetectedMode[],
  risks: ResonanceRisk[],
  conditions: OperatingConditions,
  props: SpringDynamicProperties
): string[] {
  const recommendations: string[] = [];
  
  // Critical risks
  const criticalRisks = risks.filter(r => r.riskLevel === 'critical');
  for (const risk of criticalRisks) {
    recommendations.push(risk.recommendation);
  }
  
  // Surge frequency warning
  const surgeMode = modes.find(m => m.type === 'surge');
  if (surgeMode && conditions.operatingRPM) {
    const opFreq = conditions.operatingRPM / 60;
    if (surgeMode.frequency < opFreq * 10) {
      recommendations.push(
        `Surge frequency (${surgeMode.frequency.toFixed(0)} Hz) is relatively low. ` +
        `Consider increasing spring rate or reducing active coils.`
      );
    }
  }
  
  // General design guidance
  if (risks.length > 0) {
    const fundamentalFreq = modes.find(m => m.type === 'axial_fundamental')?.frequency || 0;
    
    // Suggest stiffness change
    if (conditions.operatingRPM) {
      const opFreq = conditions.operatingRPM / 60;
      if (fundamentalFreq < opFreq * 1.5) {
        const requiredK = props.springRate * Math.pow(opFreq * 1.5 / fundamentalFreq, 2);
        recommendations.push(
          `To avoid resonance, increase spring rate to approximately ${requiredK.toFixed(1)} N/mm`
        );
      }
    }
    
    // Suggest mass change
    if (props.endMass && props.endMass > 0) {
      recommendations.push(
        `Reducing end mass will increase natural frequency and may help avoid resonance`
      );
    }
    
    // Damping suggestion
    if (conditions.dampingRatio && conditions.dampingRatio < 0.05) {
      recommendations.push(
        `Consider adding damping (current: ${(conditions.dampingRatio * 100).toFixed(1)}%) to reduce resonance amplification`
      );
    }
  }
  
  if (recommendations.length === 0) {
    recommendations.push('No significant resonance risks detected for the specified operating conditions');
  }
  
  return recommendations;
}

/**
 * Quick check for resonance risk at specific RPM
 */
export function checkResonanceAtRPM(
  props: SpringDynamicProperties,
  rpm: number
): { safe: boolean; nearestMode: DetectedMode | null; margin: number } {
  const result = analyzeHarmonicResponse(props, {
    frequencyRange: { min: 1, max: 2000 },
    operatingRPM: rpm,
  });
  
  const opFreq = rpm / 60;
  let nearestMode: DetectedMode | null = null;
  let minMargin = Infinity;
  
  for (const mode of result.detectedModes) {
    const margin = Math.abs(mode.frequency - opFreq) / mode.frequency;
    if (margin < minMargin) {
      minMargin = margin;
      nearestMode = mode;
    }
  }
  
  return {
    safe: minMargin > 0.3,  // 30% margin considered safe
    nearestMode,
    margin: minMargin,
  };
}
