/**
 * Phase 7 - Digital Twin System
 * 数字孪生系统
 * 
 * Advanced manufacturing simulation and AI design features
 */

// Part 1: FEA Auto Solver Scripts
export {
  generateAbaqusScript,
  generateANSYSScript,
  generateFEAScripts,
  downloadFEAScript,
  getDefaultLoadCases,
  DEFAULT_MESH_SETTINGS,
  type LoadCase,
  type MeshSettings,
  type MaterialModel,
  type FEASolverOptions,
  type FEAScriptResult,
} from './feaSolverScripts';

// Part 2: Fatigue Crack Initiation Probability
export {
  calculateCrackInitiationProbability,
  getProbabilityAtCycles,
  getCyclesForReliability,
  WEIBULL_PARAMS,
  type SurfaceCondition,
  type EnvironmentFactors,
  type StressState,
  type WeibullParameters,
  type CrackInitiationResult,
} from './crackInitiationProbability';

// Part 3: Corrosion Acceleration Model
export {
  analyzeCorrosion,
  getRemainingLifeAtTime,
  MATERIAL_CORROSION_DATA,
  type CorrosionEnvironment,
  type CorrosionEnvironmentParams,
  type MaterialCorrosionData,
  type CorrosionAnalysisResult,
} from './corrosionModel';

// Part 4: Diffusion Coating Simulation
export {
  simulateCoating,
  compareCoatings,
  recommendCoating,
  COATING_DATABASE,
  type CoatingType,
  type CoatingProperties,
  type CoatingSimulationParams,
  type CoatingSimulationResult,
} from './coatingSimulation';

// Part 5: Digital Twin Calibration
export {
  calibrateDigitalTwin,
  parseForceDeflectionCSV,
  exportCalibrationReport,
  type ExperimentalDataPoint,
  type ExperimentalTestData,
  type TheoreticalParameters,
  type DeviationAnalysis,
  type ReverseSolvedParameters,
  type CalibrationResult,
} from './digitalTwinCalibration';

// Part 6: CNC Machine Reverse Guidance
export {
  generateCNCGuidance,
  exportCNCGuidanceJSON,
  exportCNCProgram,
  type CNCMachineType,
  type CNCCoilingParams,
  type RevolutionCorrection,
  type CompensationCurve,
  type CNCGuidanceResult,
  type SpringDesignForCNC,
} from './cncReverseGuidance';

// Part 7: Cost & Yield AI Predictor
export {
  predictCostAndYield,
  compareBatchCosts,
  findOptimalBatchSize,
  type MaterialGrade,
  type SurfaceTreatment,
  type CostPredictionInput,
  type CostBreakdown,
  type YieldPrediction,
  type RiskFactors,
  type CostYieldPredictionResult,
} from './costYieldPredictor';

// Part 9: Resonance Harmonic Response
export {
  analyzeHarmonicResponse,
  checkResonanceAtRPM,
  type VibrationMode,
  type SpringDynamicProperties,
  type OperatingConditions,
  type DetectedMode,
  type ResonanceRisk,
  type FrequencyResponsePoint,
  type HarmonicResponseResult,
} from './harmonicResponse';

// Part 8: Fracture Prediction and Hotspot Tracking
export {
  analyzeFractureHotspots,
  getHotspotColor,
  type StressHotspot,
  type CrackNucleationSite,
  type HotspotTrackingResult,
  type SpringGeometryForHotspot,
  type OperatingStressState,
} from './fractureHotspot';

// Part 10: Structural Health Degradation
export {
  modelHealthDegradation,
  calculateRemainingLife,
  type DegradationFactors,
  type CreepProperties,
  type DegradationTimePoint,
  type EndOfLifePrediction,
  type HealthDegradationResult,
} from './healthDegradation';
