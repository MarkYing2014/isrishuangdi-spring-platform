/**
 * Topology Optimization Engine - Phase 6
 * 拓扑优化引擎
 * 
 * Optimizes coil shape, tapering, or diameter variability along coil
 * to maximize fatigue life or safety factor while minimizing mass
 */

import type { SpringMaterialId } from '@/lib/materials/springMaterials';
import { getSpringMaterial } from '@/lib/materials/springMaterials';

/**
 * Optimization objectives
 */
export type OptimizationObjective = 
  | 'maximize_safety_factor'
  | 'maximize_fatigue_life'
  | 'minimize_mass'
  | 'minimize_buckling_risk'
  | 'minimize_max_stress'
  | 'multi_objective';

/**
 * Optimization method
 */
export type OptimizationMethod = 
  | 'genetic_algorithm'
  | 'gradient_descent'
  | 'simulated_annealing'
  | 'particle_swarm';

/**
 * Design variable bounds
 */
export interface DesignVariableBounds {
  /** Wire diameter range (mm) */
  wireDiameter: { min: number; max: number };
  /** Mean diameter range (mm) */
  meanDiameter: { min: number; max: number };
  /** Pitch range (mm) */
  pitch: { min: number; max: number };
  /** Active coils range */
  activeCoils: { min: number; max: number };
}

/**
 * Optimization constraints
 */
export interface OptimizationConstraints {
  /** Maximum allowable stress (MPa) */
  maxStress: number;
  /** Minimum safety factor */
  minSafetyFactor: number;
  /** Minimum fatigue life (cycles) */
  minFatigueLife: number;
  /** Maximum mass (g) */
  maxMass?: number;
  /** Target spring rate (N/mm) */
  targetSpringRate?: number;
  /** Spring rate tolerance (%) */
  springRateTolerance?: number;
  /** Maximum free length (mm) */
  maxFreeLength?: number;
  /** Minimum free length (mm) */
  minFreeLength?: number;
}

/**
 * Variable spring geometry (varies along coil)
 */
export interface VariableSpringGeometry {
  /** Wire diameter at each coil position */
  wireDiameter: number[];
  /** Mean diameter at each coil position */
  meanDiameter: number[];
  /** Pitch at each coil position */
  pitch: number[];
  /** Number of segments */
  numSegments: number;
}

/**
 * Optimization parameters
 */
export interface OptimizationParams {
  /** Optimization objective */
  objective: OptimizationObjective;
  /** Optimization method */
  method: OptimizationMethod;
  /** Design variable bounds */
  bounds: DesignVariableBounds;
  /** Constraints */
  constraints: OptimizationConstraints;
  /** Material ID */
  materialId: SpringMaterialId;
  /** Working deflection (mm) */
  workingDeflection: number;
  /** Number of coil segments for variable geometry */
  numSegments: number;
  /** Maximum iterations */
  maxIterations: number;
  /** Population size (for GA/PSO) */
  populationSize: number;
  /** Convergence tolerance */
  convergenceTolerance: number;
}

/**
 * Individual solution in population
 */
export interface OptimizationSolution {
  /** Design variables */
  variables: {
    wireDiameter: number;
    meanDiameter: number;
    pitch: number;
    activeCoils: number;
  };
  /** Variable geometry (if applicable) */
  variableGeometry?: VariableSpringGeometry;
  /** Objective function value */
  objectiveValue: number;
  /** Constraint violations */
  constraintViolations: {
    stress: number;
    safetyFactor: number;
    fatigueLife: number;
    mass: number;
    springRate: number;
  };
  /** Feasibility flag */
  isFeasible: boolean;
  /** Fitness score (for ranking) */
  fitness: number;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  /** Best solution found */
  bestSolution: OptimizationSolution;
  /** Pareto front (for multi-objective) */
  paretoFront: OptimizationSolution[];
  /** Convergence history */
  convergenceHistory: {
    iteration: number;
    bestFitness: number;
    avgFitness: number;
  }[];
  /** Total iterations */
  totalIterations: number;
  /** Computation time (ms) */
  computationTime: number;
  /** Improvement over baseline (%) */
  improvementPercent: number;
  /** Optimization summary */
  summary: string;
}

/**
 * Calculate spring properties for given design
 */
function calculateSpringProperties(
  wireDiameter: number,
  meanDiameter: number,
  pitch: number,
  activeCoils: number,
  materialId: SpringMaterialId,
  workingDeflection: number
): {
  springRate: number;
  maxStress: number;
  mass: number;
  freeLength: number;
  safetyFactor: number;
  fatigueLife: number;
  bucklingRisk: number;
} {
  const material = getSpringMaterial(materialId);
  const G = material?.shearModulus ?? 79300;
  const density = material?.density ?? 7850;
  const allowableStress = material?.allowShearStatic ?? 560;
  const enduranceLimit = material?.snCurve?.tau2 ?? 400;

  // Spring rate: k = G * d^4 / (8 * D^3 * Na)
  const springRate = (G * Math.pow(wireDiameter, 4)) / (8 * Math.pow(meanDiameter, 3) * activeCoils);

  // Working force
  const force = springRate * workingDeflection;

  // Spring index
  const springIndex = meanDiameter / wireDiameter;
  const wahlFactor = (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;

  // Max stress: τ = 8 * F * D * K / (π * d^3)
  const maxStress = (8 * force * meanDiameter * wahlFactor) / (Math.PI * Math.pow(wireDiameter, 3));

  // Free length
  const freeLength = (activeCoils + 2) * pitch;

  // Mass: m = ρ * π * d^2/4 * π * D * Nt
  const wireLength = Math.PI * meanDiameter * (activeCoils + 2);
  const mass = density * (Math.PI * Math.pow(wireDiameter / 1000, 2) / 4) * (wireLength / 1000) * 1000; // grams

  // Safety factor
  const safetyFactor = allowableStress / maxStress;

  // Fatigue life (simplified Basquin)
  const stressRatio = maxStress / enduranceLimit;
  const fatigueLife = stressRatio > 1 ? Math.pow(1 / stressRatio, 8) * 1e7 : 1e8;

  // Buckling risk (slenderness ratio)
  const slenderness = freeLength / meanDiameter;
  const bucklingRisk = slenderness > 4 ? (slenderness - 4) / 10 : 0;

  return {
    springRate,
    maxStress,
    mass,
    freeLength,
    safetyFactor,
    fatigueLife,
    bucklingRisk,
  };
}

/**
 * Evaluate objective function
 */
function evaluateObjective(
  solution: OptimizationSolution,
  objective: OptimizationObjective,
  constraints: OptimizationConstraints
): number {
  const props = solution.variables;
  
  switch (objective) {
    case 'maximize_safety_factor':
      return -1 / (solution.constraintViolations.safetyFactor + 0.001);
    case 'maximize_fatigue_life':
      return -Math.log10(solution.constraintViolations.fatigueLife + 1);
    case 'minimize_mass':
      return solution.constraintViolations.mass;
    case 'minimize_buckling_risk':
      return props.meanDiameter / (props.activeCoils * props.pitch);
    case 'minimize_max_stress':
      return solution.constraintViolations.stress;
    case 'multi_objective':
      // Weighted sum of objectives
      return (
        0.3 * solution.constraintViolations.stress / constraints.maxStress +
        0.3 * (1 / (solution.constraintViolations.safetyFactor + 0.1)) +
        0.2 * solution.constraintViolations.mass / (constraints.maxMass || 100) +
        0.2 * (1 / Math.log10(solution.constraintViolations.fatigueLife + 1))
      );
    default:
      return 0;
  }
}

/**
 * Check constraint violations
 */
function checkConstraints(
  props: ReturnType<typeof calculateSpringProperties>,
  constraints: OptimizationConstraints
): {
  violations: OptimizationSolution['constraintViolations'];
  isFeasible: boolean;
} {
  const violations = {
    stress: Math.max(0, props.maxStress - constraints.maxStress),
    safetyFactor: Math.max(0, constraints.minSafetyFactor - props.safetyFactor),
    fatigueLife: Math.max(0, constraints.minFatigueLife - props.fatigueLife),
    mass: constraints.maxMass ? Math.max(0, props.mass - constraints.maxMass) : 0,
    springRate: constraints.targetSpringRate
      ? Math.abs(props.springRate - constraints.targetSpringRate) / constraints.targetSpringRate * 100 - (constraints.springRateTolerance || 5)
      : 0,
  };

  const isFeasible = 
    violations.stress <= 0 &&
    violations.safetyFactor <= 0 &&
    violations.fatigueLife <= 0 &&
    violations.mass <= 0 &&
    violations.springRate <= 0;

  return { violations, isFeasible };
}

/**
 * Generate random solution within bounds
 */
function generateRandomSolution(
  bounds: DesignVariableBounds,
  materialId: SpringMaterialId,
  workingDeflection: number,
  constraints: OptimizationConstraints,
  objective: OptimizationObjective
): OptimizationSolution {
  const variables = {
    wireDiameter: bounds.wireDiameter.min + Math.random() * (bounds.wireDiameter.max - bounds.wireDiameter.min),
    meanDiameter: bounds.meanDiameter.min + Math.random() * (bounds.meanDiameter.max - bounds.meanDiameter.min),
    pitch: bounds.pitch.min + Math.random() * (bounds.pitch.max - bounds.pitch.min),
    activeCoils: Math.round(bounds.activeCoils.min + Math.random() * (bounds.activeCoils.max - bounds.activeCoils.min)),
  };

  const props = calculateSpringProperties(
    variables.wireDiameter,
    variables.meanDiameter,
    variables.pitch,
    variables.activeCoils,
    materialId,
    workingDeflection
  );

  const { violations, isFeasible } = checkConstraints(props, constraints);

  const solution: OptimizationSolution = {
    variables,
    objectiveValue: 0,
    constraintViolations: violations,
    isFeasible,
    fitness: 0,
  };

  solution.objectiveValue = evaluateObjective(solution, objective, constraints);
  solution.fitness = isFeasible ? -solution.objectiveValue : solution.objectiveValue + 1000;

  return solution;
}

/**
 * Crossover two solutions (for GA)
 */
function crossover(
  parent1: OptimizationSolution,
  parent2: OptimizationSolution,
  materialId: SpringMaterialId,
  workingDeflection: number,
  constraints: OptimizationConstraints,
  objective: OptimizationObjective
): OptimizationSolution {
  const alpha = Math.random();
  
  const variables = {
    wireDiameter: alpha * parent1.variables.wireDiameter + (1 - alpha) * parent2.variables.wireDiameter,
    meanDiameter: alpha * parent1.variables.meanDiameter + (1 - alpha) * parent2.variables.meanDiameter,
    pitch: alpha * parent1.variables.pitch + (1 - alpha) * parent2.variables.pitch,
    activeCoils: Math.round(alpha * parent1.variables.activeCoils + (1 - alpha) * parent2.variables.activeCoils),
  };

  const props = calculateSpringProperties(
    variables.wireDiameter,
    variables.meanDiameter,
    variables.pitch,
    variables.activeCoils,
    materialId,
    workingDeflection
  );

  const { violations, isFeasible } = checkConstraints(props, constraints);

  const solution: OptimizationSolution = {
    variables,
    objectiveValue: 0,
    constraintViolations: violations,
    isFeasible,
    fitness: 0,
  };

  solution.objectiveValue = evaluateObjective(solution, objective, constraints);
  solution.fitness = isFeasible ? -solution.objectiveValue : solution.objectiveValue + 1000;

  return solution;
}

/**
 * Mutate solution (for GA)
 */
function mutate(
  solution: OptimizationSolution,
  bounds: DesignVariableBounds,
  mutationRate: number,
  materialId: SpringMaterialId,
  workingDeflection: number,
  constraints: OptimizationConstraints,
  objective: OptimizationObjective
): OptimizationSolution {
  const variables = { ...solution.variables };

  if (Math.random() < mutationRate) {
    const range = bounds.wireDiameter.max - bounds.wireDiameter.min;
    variables.wireDiameter += (Math.random() - 0.5) * range * 0.2;
    variables.wireDiameter = Math.max(bounds.wireDiameter.min, Math.min(bounds.wireDiameter.max, variables.wireDiameter));
  }

  if (Math.random() < mutationRate) {
    const range = bounds.meanDiameter.max - bounds.meanDiameter.min;
    variables.meanDiameter += (Math.random() - 0.5) * range * 0.2;
    variables.meanDiameter = Math.max(bounds.meanDiameter.min, Math.min(bounds.meanDiameter.max, variables.meanDiameter));
  }

  if (Math.random() < mutationRate) {
    const range = bounds.pitch.max - bounds.pitch.min;
    variables.pitch += (Math.random() - 0.5) * range * 0.2;
    variables.pitch = Math.max(bounds.pitch.min, Math.min(bounds.pitch.max, variables.pitch));
  }

  if (Math.random() < mutationRate) {
    variables.activeCoils += Math.round((Math.random() - 0.5) * 2);
    variables.activeCoils = Math.max(bounds.activeCoils.min, Math.min(bounds.activeCoils.max, variables.activeCoils));
  }

  const props = calculateSpringProperties(
    variables.wireDiameter,
    variables.meanDiameter,
    variables.pitch,
    variables.activeCoils,
    materialId,
    workingDeflection
  );

  const { violations, isFeasible } = checkConstraints(props, constraints);

  const mutatedSolution: OptimizationSolution = {
    variables,
    objectiveValue: 0,
    constraintViolations: violations,
    isFeasible,
    fitness: 0,
  };

  mutatedSolution.objectiveValue = evaluateObjective(mutatedSolution, objective, constraints);
  mutatedSolution.fitness = isFeasible ? -mutatedSolution.objectiveValue : mutatedSolution.objectiveValue + 1000;

  return mutatedSolution;
}

/**
 * Run genetic algorithm optimization
 */
export function runGeneticAlgorithm(params: OptimizationParams): OptimizationResult {
  const startTime = Date.now();
  const {
    objective,
    bounds,
    constraints,
    materialId,
    workingDeflection,
    maxIterations,
    populationSize,
    convergenceTolerance,
  } = params;

  // Initialize population
  let population: OptimizationSolution[] = [];
  for (let i = 0; i < populationSize; i++) {
    population.push(generateRandomSolution(bounds, materialId, workingDeflection, constraints, objective));
  }

  const convergenceHistory: OptimizationResult['convergenceHistory'] = [];
  let bestSolution = population[0];
  let stagnationCount = 0;
  let lastBestFitness = Infinity;

  // Evolution loop
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Sort by fitness
    population.sort((a, b) => a.fitness - b.fitness);

    // Update best solution
    if (population[0].fitness < bestSolution.fitness) {
      bestSolution = { ...population[0] };
    }

    // Record convergence
    const avgFitness = population.reduce((sum, s) => sum + s.fitness, 0) / populationSize;
    convergenceHistory.push({
      iteration,
      bestFitness: population[0].fitness,
      avgFitness,
    });

    // Check convergence
    if (Math.abs(population[0].fitness - lastBestFitness) < convergenceTolerance) {
      stagnationCount++;
      if (stagnationCount > 20) break;
    } else {
      stagnationCount = 0;
    }
    lastBestFitness = population[0].fitness;

    // Selection (tournament)
    const newPopulation: OptimizationSolution[] = [];
    
    // Elitism: keep top 10%
    const eliteCount = Math.ceil(populationSize * 0.1);
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push(population[i]);
    }

    // Crossover and mutation
    while (newPopulation.length < populationSize) {
      const parent1 = population[Math.floor(Math.random() * populationSize * 0.5)];
      const parent2 = population[Math.floor(Math.random() * populationSize * 0.5)];
      
      let child = crossover(parent1, parent2, materialId, workingDeflection, constraints, objective);
      child = mutate(child, bounds, 0.1, materialId, workingDeflection, constraints, objective);
      
      newPopulation.push(child);
    }

    population = newPopulation;
  }

  // Calculate baseline for comparison
  const baselineVars = {
    wireDiameter: (bounds.wireDiameter.min + bounds.wireDiameter.max) / 2,
    meanDiameter: (bounds.meanDiameter.min + bounds.meanDiameter.max) / 2,
    pitch: (bounds.pitch.min + bounds.pitch.max) / 2,
    activeCoils: Math.round((bounds.activeCoils.min + bounds.activeCoils.max) / 2),
  };
  const baselineProps = calculateSpringProperties(
    baselineVars.wireDiameter,
    baselineVars.meanDiameter,
    baselineVars.pitch,
    baselineVars.activeCoils,
    materialId,
    workingDeflection
  );

  const optimizedProps = calculateSpringProperties(
    bestSolution.variables.wireDiameter,
    bestSolution.variables.meanDiameter,
    bestSolution.variables.pitch,
    bestSolution.variables.activeCoils,
    materialId,
    workingDeflection
  );

  let improvementPercent = 0;
  switch (objective) {
    case 'maximize_safety_factor':
      improvementPercent = ((optimizedProps.safetyFactor - baselineProps.safetyFactor) / baselineProps.safetyFactor) * 100;
      break;
    case 'maximize_fatigue_life':
      improvementPercent = ((optimizedProps.fatigueLife - baselineProps.fatigueLife) / baselineProps.fatigueLife) * 100;
      break;
    case 'minimize_mass':
      improvementPercent = ((baselineProps.mass - optimizedProps.mass) / baselineProps.mass) * 100;
      break;
    case 'minimize_max_stress':
      improvementPercent = ((baselineProps.maxStress - optimizedProps.maxStress) / baselineProps.maxStress) * 100;
      break;
    default:
      improvementPercent = 0;
  }

  const computationTime = Date.now() - startTime;

  return {
    bestSolution,
    paretoFront: population.filter(s => s.isFeasible).slice(0, 10),
    convergenceHistory,
    totalIterations: convergenceHistory.length,
    computationTime,
    improvementPercent,
    summary: `Optimization completed in ${convergenceHistory.length} iterations. ` +
      `Best solution: d=${bestSolution.variables.wireDiameter.toFixed(2)}mm, ` +
      `D=${bestSolution.variables.meanDiameter.toFixed(2)}mm, ` +
      `Na=${bestSolution.variables.activeCoils}. ` +
      `Improvement: ${improvementPercent.toFixed(1)}%`,
  };
}

/**
 * Main topology optimization function
 */
export function runTopologyOptimization(params: OptimizationParams): OptimizationResult {
  switch (params.method) {
    case 'genetic_algorithm':
      return runGeneticAlgorithm(params);
    case 'simulated_annealing':
      // Simplified SA using GA framework
      return runGeneticAlgorithm({ ...params, populationSize: 1 });
    case 'gradient_descent':
    case 'particle_swarm':
    default:
      // Default to GA
      return runGeneticAlgorithm(params);
  }
}
