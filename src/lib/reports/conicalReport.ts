/**
 * Conical Spring Design Report Data Structure and Utilities
 */

import type { 
  ConicalNonlinearCurvePoint, 
  ConicalNonlinearResult,
  SafetyFactorResult,
  FatigueLifeResult,
  PreloadResult,
} from "@/lib/springMath";
import type { SpringMaterialId } from "@/lib/materials/springMaterials";

/**
 * Complete data structure for a conical spring design report.
 */
export interface ConicalDesignReportData {
  designId?: string;
  generatedAt: string;

  // Basic parameters
  largeDiameter: number;      // D1, mm
  smallDiameter: number;      // D2, mm
  wireDiameter: number;       // d, mm
  activeCoils: number;        // Na
  freeLength: number;         // L0, mm
  shearModulus: number;       // G, MPa
  maxDeflection: number;      // Δx_max, mm

  // Derived geometry
  solidHeight: number;        // H_solid = Na * d
  totalDeflectionCapacity: number; // X_total = L0 - H_solid
  pitch: number;              // mm per coil

  // Final results
  finalLoad: number;          // N
  finalStiffness: number;     // N/mm
  finalShearStress: number;   // MPa
  finalActiveCoils: number;
  finalCollapsedCoils: number;
  safetyFactor?: number;      // If material allowable stress is known

  // Stage transitions
  stages: {
    stage: number;
    collapsedCoils: number;
    activeCoils: number;
    startDeflection: number;
    stiffness: number;
  }[];

  // Key curve points (sampled)
  curveKeyPoints: {
    deflection: number;
    load: number;
    k: number;
    activeCoils: number;
  }[];

  // Full curve (optional, for detailed export)
  fullCurve?: {
    deflection: number;
    load: number;
    k: number;
    activeCoils: number;
  }[];

  // Notes
  notes?: string;
  exceededSolidHeight: boolean;

  // Material and Safety (new fields)
  material?: {
    id: SpringMaterialId;
    nameEn: string;
    nameZh: string;
    shearModulus: number;
    allowShearStatic: number;
  };

  safetyAnalysis?: {
    safetyFactor: SafetyFactorResult;
    fatigueLife?: FatigueLifeResult;
  };

  preload?: PreloadResult;

  // CAD export info
  cadExport?: {
    fileName?: string;
    format?: string;
    exportedAt?: string;
  };
}

/**
 * Parameters for building the report data.
 */
export interface BuildReportParams {
  largeDiameter: number;
  smallDiameter: number;
  wireDiameter: number;
  activeCoils: number;
  freeLength: number;
  shearModulus: number;
  maxDeflection: number;
  nonlinearResult: ConicalNonlinearResult;
  stages: {
    stage: number;
    deflection: number;
    activeCoils: number;
    stiffness: number;
  }[];
  allowableStress?: number; // MPa, for safety factor calculation
}

/**
 * Calculate shear stress for conical spring at a given load.
 * Uses Wahl factor correction.
 */
function calculateShearStress(
  load: number,
  meanDiameter: number,
  wireDiameter: number
): number {
  const springIndex = meanDiameter / wireDiameter;
  const wahlFactor = (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;
  const tau = wahlFactor * (8 * load * meanDiameter) / (Math.PI * Math.pow(wireDiameter, 3));
  return tau;
}

/**
 * Build a complete ConicalDesignReportData object from calculation results.
 */
export function buildConicalDesignReportData(params: BuildReportParams): ConicalDesignReportData {
  const {
    largeDiameter,
    smallDiameter,
    wireDiameter,
    activeCoils,
    freeLength,
    shearModulus,
    maxDeflection,
    nonlinearResult,
    stages,
    allowableStress,
  } = params;

  const curve = nonlinearResult.curve;
  const finalPoint = curve[curve.length - 1];

  // Calculate mean diameter at final state for stress calculation
  // Use equivalent mean diameter based on remaining active coils
  const collapseRatio = finalPoint.collapsedCoils / activeCoils;
  const D1_mean = largeDiameter - wireDiameter;
  const D2_mean = smallDiameter - wireDiameter;
  const effectiveMeanDiameter = D1_mean - (D1_mean - D2_mean) * collapseRatio;

  // Calculate final shear stress
  const finalShearStress = calculateShearStress(
    finalPoint.load,
    effectiveMeanDiameter,
    wireDiameter
  );

  // Calculate safety factor if allowable stress is provided
  const safetyFactor = allowableStress ? allowableStress / finalShearStress : undefined;

  // Sample key points from curve (0%, 25%, 50%, 75%, 100%)
  const keyPointIndices = [0, 0.25, 0.5, 0.75, 1].map(pct => 
    Math.min(Math.floor(pct * (curve.length - 1)), curve.length - 1)
  );
  const curveKeyPoints = keyPointIndices.map(idx => ({
    deflection: curve[idx].x,
    load: curve[idx].load,
    k: curve[idx].k,
    activeCoils: curve[idx].activeCoils,
  }));

  // Map stages to report format
  const reportStages = stages.map(s => ({
    stage: s.stage,
    collapsedCoils: s.stage, // stage number equals collapsed coils
    activeCoils: s.activeCoils,
    startDeflection: s.deflection,
    stiffness: s.stiffness,
  }));

  return {
    generatedAt: new Date().toISOString(),
    
    // Basic parameters
    largeDiameter,
    smallDiameter,
    wireDiameter,
    activeCoils,
    freeLength,
    shearModulus,
    maxDeflection,

    // Derived geometry
    solidHeight: nonlinearResult.solidHeight,
    totalDeflectionCapacity: nonlinearResult.totalDeflectionCapacity,
    pitch: nonlinearResult.pitch,

    // Final results
    finalLoad: finalPoint.load,
    finalStiffness: finalPoint.k,
    finalShearStress,
    finalActiveCoils: finalPoint.activeCoils,
    finalCollapsedCoils: finalPoint.collapsedCoils,
    safetyFactor,

    // Stages
    stages: reportStages,

    // Key points
    curveKeyPoints,

    // Full curve (truncated to reasonable size)
    fullCurve: curve.map(p => ({
      deflection: p.x,
      load: p.load,
      k: p.k,
      activeCoils: p.activeCoils,
    })),

    exceededSolidHeight: nonlinearResult.exceededSolidHeight,
  };
}

/**
 * Generate a text summary for RFQ pre-fill.
 */
export function generateRfqSummary(data: ConicalDesignReportData): string {
  return `Conical compression spring design:
- Large OD: ${data.largeDiameter} mm, Small OD: ${data.smallDiameter} mm
- Wire diameter: ${data.wireDiameter} mm
- Active coils: ${data.activeCoils}, Free length: ${data.freeLength} mm
- Max deflection: ${data.maxDeflection} mm
- Final load: ${data.finalLoad.toFixed(2)} N at ${data.finalStiffness.toFixed(2)} N/mm
- Progressive stiffness with ${data.finalCollapsedCoils} coils collapsed
- Shear stress: ${data.finalShearStress.toFixed(1)} MPa${data.safetyFactor ? `, SF ≈ ${data.safetyFactor.toFixed(2)}` : ""}`;
}
