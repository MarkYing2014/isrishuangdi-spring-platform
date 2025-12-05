/**
 * Fracture Prediction and Hotspot Tracking - Phase 7
 * 断裂预测和热点追踪
 * 
 * Identifies peak stress zones and potential crack nucleation points
 */

/**
 * Stress hotspot location
 */
export interface StressHotspot {
  id: string;
  locationType: 'inner_coil' | 'outer_coil' | 'hook_bend' | 'end_coil' | 'transition_zone';
  axialPosition: number;
  angularPosition: number;
  coordinates: { x: number; y: number; z: number };
  maxPrincipalStress: number;
  vonMisesStress: number;
  shearStress: number;
  stressConcentrationFactor: number;
  crackProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Crack nucleation site
 */
export interface CrackNucleationSite {
  hotspot: StressHotspot;
  mechanism: 'surface_defect' | 'inclusion' | 'stress_concentration' | 'corrosion_pit' | 'fretting';
  crackOrientation: number;
  growthDirection: 'circumferential' | 'longitudinal' | 'mixed';
  initiationCycles: number;
  growthRate: number;
}

/**
 * Hotspot tracking result
 */
export interface HotspotTrackingResult {
  hotspots: StressHotspot[];
  criticalHotspots: StressHotspot[];
  nucleationSites: CrackNucleationSite[];
  visualizationData: {
    vertices: { x: number; y: number; z: number; stress: number; risk: number }[];
    criticalVertices: number[];
  };
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

/**
 * Spring geometry for hotspot analysis
 */
export interface SpringGeometryForHotspot {
  type: 'compression' | 'extension' | 'torsion' | 'conical';
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  freeLength: number;
  endType: 'open' | 'closed' | 'ground' | 'closed_ground';
  hasHooks?: boolean;
  hookRadius?: number;
}

/**
 * Operating stress state
 */
export interface OperatingStressState {
  maxShearStress: number;
  meanShearStress: number;
  alternatingShearStress: number;
  axialStress?: number;
  bendingStress?: number;
}

/**
 * Calculate Wahl correction factor
 */
function calculateWahlFactor(springIndex: number): number {
  const C = springIndex;
  return (4 * C - 1) / (4 * C - 4) + 0.615 / C;
}

/**
 * Calculate stress concentration at hook bend
 */
function calculateHookStressConcentration(hookRadius: number, wireDiameter: number): number {
  const r = hookRadius;
  const d = wireDiameter;
  const Kt_bending = 1 + d / (4 * r);
  const Kt_torsion = 1 + 0.5 * d / r;
  return Math.max(Kt_bending, Kt_torsion);
}

/**
 * Generate hotspot locations along spring
 */
function generateHotspotLocations(
  geometry: SpringGeometryForHotspot,
  stress: OperatingStressState
): StressHotspot[] {
  const hotspots: StressHotspot[] = [];
  const { wireDiameter, meanDiameter, activeCoils, freeLength, type, hasHooks, hookRadius } = geometry;
  
  const springIndex = meanDiameter / wireDiameter;
  const wahlFactor = calculateWahlFactor(springIndex);
  const pitch = (freeLength - wireDiameter * 2) / activeCoils;
  const totalCoils = activeCoils + 2;
  const radius = meanDiameter / 2;

  // Inner coil surface hotspots
  for (let coil = 0; coil < totalCoils; coil++) {
    const axialPos = coil / totalCoils;
    const z = coil * pitch + wireDiameter;
    
    // Inner surface (maximum stress location)
    const innerStress = stress.maxShearStress * wahlFactor;
    const innerRisk = calculateRiskLevel(innerStress, stress.maxShearStress);
    
    hotspots.push({
      id: `inner_coil_${coil}`,
      locationType: 'inner_coil',
      axialPosition: axialPos,
      angularPosition: 0,
      coordinates: { x: radius - wireDiameter/2, y: 0, z },
      maxPrincipalStress: innerStress * 1.15,
      vonMisesStress: innerStress * 1.1,
      shearStress: innerStress,
      stressConcentrationFactor: wahlFactor,
      crackProbability: calculateCrackProbability(innerStress, stress.alternatingShearStress),
      riskLevel: innerRisk,
    });
  }

  // End coil transition zones
  const endZones = [0.05, 0.95];
  for (const pos of endZones) {
    const z = pos * freeLength;
    const transitionStress = stress.maxShearStress * 1.2;
    
    hotspots.push({
      id: `transition_${pos}`,
      locationType: 'transition_zone',
      axialPosition: pos,
      angularPosition: 180,
      coordinates: { x: -radius, y: 0, z },
      maxPrincipalStress: transitionStress * 1.1,
      vonMisesStress: transitionStress,
      shearStress: transitionStress * 0.9,
      stressConcentrationFactor: 1.2,
      crackProbability: calculateCrackProbability(transitionStress, stress.alternatingShearStress),
      riskLevel: calculateRiskLevel(transitionStress, stress.maxShearStress),
    });
  }

  // Hook bends for extension springs
  if (type === 'extension' && hasHooks && hookRadius) {
    const hookKt = calculateHookStressConcentration(hookRadius, wireDiameter);
    const hookStress = stress.maxShearStress * hookKt;
    
    hotspots.push({
      id: 'hook_bottom',
      locationType: 'hook_bend',
      axialPosition: 0,
      angularPosition: 90,
      coordinates: { x: 0, y: radius + hookRadius, z: -hookRadius },
      maxPrincipalStress: hookStress * 1.3,
      vonMisesStress: hookStress * 1.2,
      shearStress: hookStress,
      stressConcentrationFactor: hookKt,
      crackProbability: calculateCrackProbability(hookStress, stress.alternatingShearStress) * 1.5,
      riskLevel: calculateRiskLevel(hookStress * 1.2, stress.maxShearStress),
    });

    hotspots.push({
      id: 'hook_top',
      locationType: 'hook_bend',
      axialPosition: 1,
      angularPosition: 270,
      coordinates: { x: 0, y: -radius - hookRadius, z: freeLength + hookRadius },
      maxPrincipalStress: hookStress * 1.3,
      vonMisesStress: hookStress * 1.2,
      shearStress: hookStress,
      stressConcentrationFactor: hookKt,
      crackProbability: calculateCrackProbability(hookStress, stress.alternatingShearStress) * 1.5,
      riskLevel: calculateRiskLevel(hookStress * 1.2, stress.maxShearStress),
    });
  }

  return hotspots;
}

/**
 * Calculate risk level based on stress
 */
function calculateRiskLevel(stress: number, baseStress: number): 'low' | 'medium' | 'high' | 'critical' {
  const ratio = stress / baseStress;
  if (ratio < 1.1) return 'low';
  if (ratio < 1.3) return 'medium';
  if (ratio < 1.5) return 'high';
  return 'critical';
}

/**
 * Calculate crack initiation probability
 */
function calculateCrackProbability(stress: number, alternatingStress: number): number {
  const stressFactor = stress / 1000;
  const cyclicFactor = alternatingStress / 500;
  const probability = Math.min(1, stressFactor * cyclicFactor * 0.5);
  return probability;
}

/**
 * Identify crack nucleation sites
 */
function identifyNucleationSites(
  hotspots: StressHotspot[],
  ultimateStrength: number
): CrackNucleationSite[] {
  const sites: CrackNucleationSite[] = [];
  
  for (const hotspot of hotspots) {
    if (hotspot.riskLevel === 'high' || hotspot.riskLevel === 'critical') {
      let mechanism: CrackNucleationSite['mechanism'] = 'stress_concentration';
      let orientation = 45;
      let direction: CrackNucleationSite['growthDirection'] = 'mixed';
      
      if (hotspot.locationType === 'hook_bend') {
        mechanism = 'stress_concentration';
        orientation = 90;
        direction = 'circumferential';
      } else if (hotspot.locationType === 'inner_coil') {
        mechanism = 'surface_defect';
        orientation = 45;
        direction = 'mixed';
      }
      
      const stressRatio = hotspot.maxPrincipalStress / ultimateStrength;
      const initiationCycles = Math.pow(10, 7 - stressRatio * 3);
      const growthRate = 1e-7 * Math.pow(stressRatio, 3);
      
      sites.push({
        hotspot,
        mechanism,
        crackOrientation: orientation,
        growthDirection: direction,
        initiationCycles,
        growthRate,
      });
    }
  }
  
  return sites;
}

/**
 * Generate 3D visualization data
 */
function generateVisualizationData(
  geometry: SpringGeometryForHotspot,
  hotspots: StressHotspot[]
): HotspotTrackingResult['visualizationData'] {
  const vertices: { x: number; y: number; z: number; stress: number; risk: number }[] = [];
  const criticalVertices: number[] = [];
  
  const { meanDiameter, activeCoils, freeLength, wireDiameter } = geometry;
  const radius = meanDiameter / 2;
  const pitch = (freeLength - wireDiameter * 2) / activeCoils;
  const totalCoils = activeCoils + 2;
  
  const pointsPerCoil = 36;
  const totalPoints = totalCoils * pointsPerCoil;
  
  for (let i = 0; i < totalPoints; i++) {
    const coilProgress = i / pointsPerCoil;
    const angle = (i % pointsPerCoil) * (360 / pointsPerCoil);
    const angleRad = angle * Math.PI / 180;
    
    const x = radius * Math.cos(angleRad);
    const y = radius * Math.sin(angleRad);
    const z = coilProgress * pitch + wireDiameter;
    
    const nearestHotspot = hotspots.reduce((nearest, h) => {
      const dist = Math.abs(h.axialPosition - coilProgress / totalCoils);
      const nearestDist = Math.abs(nearest.axialPosition - coilProgress / totalCoils);
      return dist < nearestDist ? h : nearest;
    });
    
    const stress = nearestHotspot.vonMisesStress * (0.8 + 0.4 * Math.random());
    const risk = nearestHotspot.riskLevel === 'critical' ? 1 : 
                 nearestHotspot.riskLevel === 'high' ? 0.75 :
                 nearestHotspot.riskLevel === 'medium' ? 0.5 : 0.25;
    
    vertices.push({ x, y, z, stress, risk });
    
    if (risk >= 0.75) {
      criticalVertices.push(i);
    }
  }
  
  return { vertices, criticalVertices };
}

/**
 * Analyze fracture hotspots
 */
export function analyzeFractureHotspots(
  geometry: SpringGeometryForHotspot,
  stress: OperatingStressState,
  ultimateStrength: number = 1600
): HotspotTrackingResult {
  const hotspots = generateHotspotLocations(geometry, stress);
  const criticalHotspots = hotspots.filter(h => h.riskLevel === 'high' || h.riskLevel === 'critical');
  const nucleationSites = identifyNucleationSites(hotspots, ultimateStrength);
  const visualizationData = generateVisualizationData(geometry, hotspots);
  
  let overallRisk: HotspotTrackingResult['overallRisk'] = 'low';
  if (hotspots.some(h => h.riskLevel === 'critical')) {
    overallRisk = 'critical';
  } else if (hotspots.some(h => h.riskLevel === 'high')) {
    overallRisk = 'high';
  } else if (hotspots.some(h => h.riskLevel === 'medium')) {
    overallRisk = 'medium';
  }
  
  const recommendations: string[] = [];
  
  if (criticalHotspots.length > 0) {
    recommendations.push(`${criticalHotspots.length} critical stress hotspots identified - design review required`);
  }
  
  const hookHotspots = hotspots.filter(h => h.locationType === 'hook_bend');
  if (hookHotspots.some(h => h.riskLevel !== 'low')) {
    recommendations.push('Hook bend stress concentration is high - consider larger hook radius');
  }
  
  const innerCoilMax = Math.max(...hotspots.filter(h => h.locationType === 'inner_coil').map(h => h.shearStress));
  if (innerCoilMax > stress.maxShearStress * 1.3) {
    recommendations.push('Inner coil stress exceeds 130% of nominal - consider increasing spring index');
  }
  
  if (nucleationSites.length > 0) {
    const minCycles = Math.min(...nucleationSites.map(s => s.initiationCycles));
    recommendations.push(`Earliest crack initiation expected at ${minCycles.toExponential(1)} cycles`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('No significant fracture risks identified');
  }
  
  return {
    hotspots,
    criticalHotspots,
    nucleationSites,
    visualizationData,
    overallRisk,
    recommendations,
  };
}

/**
 * Get hotspot color for visualization
 */
export function getHotspotColor(riskLevel: string): { r: number; g: number; b: number } {
  switch (riskLevel) {
    case 'critical': return { r: 255, g: 0, b: 0 };
    case 'high': return { r: 255, g: 128, b: 0 };
    case 'medium': return { r: 255, g: 255, b: 0 };
    default: return { r: 0, g: 255, b: 0 };
  }
}
