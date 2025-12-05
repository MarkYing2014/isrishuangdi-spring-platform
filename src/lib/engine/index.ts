/**
 * Spring Analysis Engine - Unified Entry Point (Phase 3)
 * 弹簧分析引擎 - 统一入口（第三阶段）
 * 
 * This module provides a unified interface for all spring engineering calculations:
 * 
 * Core Analysis:
 * - Geometry calculations
 * - Stress analysis (Wahl correction)
 * - Fatigue life estimation (S-N curve)
 * - Safety factor validation
 * - Buckling analysis (Pro with Wahl correction)
 * - Force-deflection curves
 * 
 * Phase 3 Advanced Features:
 * - Dynamic modeling (vibration & resonance)
 * - High temperature strength reduction
 * - Stress relaxation & permanent set
 * - Creep model (Norton law)
 * - Corrosion & environmental effects
 * - Friction loss in compression springs
 * - Extension spring hook stress
 * - Torsion spring arm angle effects
 * - Verdict engine (PASS/FAIL determination)
 */

// Core modules
export * from './types';
export * from './geometry';
export * from './stress';
export * from './fatigue';
export * from './safety';
export * from './buckling';
export * from './forceCurve';

// Phase 3 Advanced modules
export * from './dynamics';
export * from './temperature';
export * from './creep';
export * from './environment';
export * from './friction';
export * from './hookStress';

// Phase 4 Smart Diagnostics & Optimization modules
export * from './stressDistribution';
export * from './fatigueDamage';
export * from './failureDiagnostics';
export * from './designSuggestions';
export * from './optimizer';

// Phase 5 Advanced Simulation modules
export * from './nonlinearMaterial';
export * from './thermalEffects';
export * from './shockFatigue';
export * from './feaExport';

// NVH model - rename conflicting export
export {
  type NVHResult,
  type CoilContactAnalysis,
  calculateCoilGap as calculateNVHCoilGap,
  analyzeCoilContact,
  calculateNVH,
  generateNVHCurve,
} from './nvhModel';

// Cyclic creep - rename conflicting export
export {
  type CyclicCreepParams,
  type CyclicCreepResult,
  CYCLIC_CREEP_PARAMS,
  getCyclicCreepParams,
  calculateCreepStrainRate,
  calculateCyclicCreep,
  generateCreepCurve as generateCyclicCreepCurve,
  calculateContactStressMultiplier,
} from './cyclicCreep';

// Nonlinear buckling - rename conflicting export
export {
  type NonlinearBucklingResult,
  type BucklingCurvePoint,
  END_CONDITION_FACTORS,
  calculateBottomedCoils,
  calculateEffectiveStiffness as calculateNonlinearEffectiveStiffness,
  calculateEffectiveSlenderness,
  calculateCriticalBucklingLoad,
  calculateNonlinearBuckling,
  generateBucklingCurve as generateNonlinearBucklingCurve,
  findCriticalDeflection,
} from './nonlinearBuckling';

// Phase 6 Manufacturing & AI modules
export * from './coilingProcess';
export * from './shotPeening';
export * from './wireGeometry';
export * from './manufacturingCompensation';
export * from './materialRecommendation';
export * from './mlFatiguePredictor';
export * from './standardsCheck';
export * from './manufacturabilityCheck';
export * from './multiSpringAssembly';

// Scrag test - rename conflicting exports
export {
  type ScragTestParams,
  type ScragTestResult,
  type SpringbackModelResult,
  calculateScragStress,
  calculatePlasticStrain as calculateScragPlasticStrain,
  calculatePermanentSet as calculateScragPermanentSet,
  simulateScragTest,
  simulateHeatTreatment as simulateScragHeatTreatment,
  calculateSpringbackModel,
} from './scragTest';

// Topology optimizer - rename conflicting exports
export {
  type OptimizationObjective,
  type OptimizationMethod,
  type DesignVariableBounds,
  type OptimizationConstraints,
  type OptimizationParams,
  type OptimizationSolution,
  runGeneticAlgorithm,
  runTopologyOptimization,
} from './topologyOptimizer';

// Torsion arm module - rename conflicting export
export {
  type TorsionArmResult,
  type SupportAngleType,
  calculateSupportMultiplier,
  calculateTorsionSpringRate as calculateTorsionSpringRateArm,
  calculateTorsionBendingStress,
  calculateCoilDiameterChange,
  calculateArmTipForce,
  calculateTorsionArm,
  calculateRequiredTorque,
  calculateRequiredAngle,
  generateTorqueAngleCurve,
} from './torsionArm';

// Verdict module - rename conflicting export
export {
  VERDICT_THRESHOLDS,
  type CriterionResult,
  type VerdictResult,
  checkGoodmanFatigue,
  checkBucklingSafety,
  checkYieldSafety,
  checkStaticSafety,
  checkCreepRisk,
  checkResonanceRisk as checkResonanceRiskVerdict,
  checkSurfaceFinish,
  checkTemperatureEffects,
  checkEnvironmentEffects,
  calculateVerdict,
  generateVerdictSummary,
} from './verdict';

// Unified engine class
export { SpringAnalysisEngine } from './SpringAnalysisEngine';
