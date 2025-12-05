/**
 * Spring Analysis Engine - Inverse Design Solver & Multi-Objective Optimizer
 * 弹簧分析引擎 - 逆向设计求解器与多目标优化器
 * 
 * Solves for optimal spring parameters given target requirements
 * Uses genetic algorithm for multi-objective optimization
 */

import type { SpringGeometry, CompressionSpringGeometry, WorkingConditions } from './types';
import { SpringAnalysisEngine } from './SpringAnalysisEngine';
import { calculateDynamics } from './dynamics';
import { calculateBuckling } from './buckling';
import { SPRING_MATERIALS, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Design targets
 */
export interface DesignTargets {
  /** Target spring rate (N/mm) */
  targetStiffness?: number;
  /** Minimum fatigue life (cycles) */
  minFatigueLife?: number;
  /** Maximum stress (MPa) */
  maxStress?: number;
  /** Minimum safety factor */
  minSafetyFactor?: number;
  /** Maximum free length (mm) */
  maxFreeLength?: number;
  /** Maximum outer diameter (mm) */
  maxOuterDiameter?: number;
  /** Minimum natural frequency (Hz) */
  minNaturalFrequency?: number;
  /** Target force at deflection (N) */
  targetForce?: { deflection: number; force: number };
}

/**
 * Design constraints
 */
export interface DesignConstraints {
  /** Wire diameter range [min, max] (mm) */
  wireDiameterRange: [number, number];
  /** Mean diameter range [min, max] (mm) */
  meanDiameterRange: [number, number];
  /** Active coils range [min, max] */
  activeCoilsRange: [number, number];
  /** Free length range [min, max] (mm) */
  freeLengthRange: [number, number];
  /** Allowed materials */
  allowedMaterials: SpringMaterialId[];
  /** Spring index range [min, max] */
  springIndexRange: [number, number];
}

/**
 * Optimization weights
 */
export interface OptimizationWeights {
  /** Weight for stress minimization */
  stressWeight: number;
  /** Weight for safety factor maximization */
  safetyWeight: number;
  /** Weight for fatigue life maximization */
  fatigueWeight: number;
  /** Weight for buckling safety */
  bucklingWeight: number;
  /** Weight for mass minimization */
  massWeight: number;
  /** Weight for cost minimization */
  costWeight: number;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  /** Best solution found */
  bestSolution: {
    wireDiameter: number;
    meanDiameter: number;
    activeCoils: number;
    freeLength: number;
    materialId: SpringMaterialId;
  };
  /** Expected performance */
  expectedPerformance: {
    springRate: number;
    maxStress: number;
    safetyFactor: number;
    fatigueLife: number;
    naturalFrequency: number;
    mass: number;
  };
  /** Fitness score */
  fitnessScore: number;
  /** Convergence history */
  convergenceHistory: Array<{ generation: number; bestFitness: number; avgFitness: number }>;
  /** Pareto front solutions */
  paretoFront: Array<{
    solution: OptimizationResult['bestSolution'];
    objectives: { stress: number; safety: number; fatigue: number; mass: number };
  }>;
  /** Optimization status */
  status: 'success' | 'partial' | 'failed';
  /** Message */
  message: { en: string; zh: string };
}

/**
 * Individual in genetic algorithm
 */
interface Individual {
  genes: {
    wireDiameter: number;
    meanDiameter: number;
    activeCoils: number;
    freeLength: number;
    materialIndex: number;
  };
  fitness: number;
  objectives: {
    stress: number;
    safety: number;
    fatigue: number;
    buckling: number;
    mass: number;
    cost: number;
  };
  feasible: boolean;
}

/**
 * Default constraints
 */
export const DEFAULT_CONSTRAINTS: DesignConstraints = {
  wireDiameterRange: [0.5, 10],
  meanDiameterRange: [5, 100],
  activeCoilsRange: [3, 30],
  freeLengthRange: [10, 300],
  allowedMaterials: ['music_wire_a228', 'oil_tempered', 'chrome_silicon', 'chrome_vanadium', 'ss_302'],
  springIndexRange: [4, 12],
};

/**
 * Default weights
 */
export const DEFAULT_WEIGHTS: OptimizationWeights = {
  stressWeight: 1.0,
  safetyWeight: 1.5,
  fatigueWeight: 1.0,
  bucklingWeight: 0.8,
  massWeight: 0.3,
  costWeight: 0.2,
};

/**
 * Material cost factors (relative)
 */
const MATERIAL_COSTS: Record<SpringMaterialId, number> = {
  music_wire_a228: 1.0,
  oil_tempered: 0.9,
  ss_302: 2.5,
  chrome_silicon: 1.5,
  chrome_vanadium: 1.3,
  phosphor_bronze: 3.0,
};

/**
 * Calculate spring rate for compression spring
 */
function calculateSpringRate(
  wireDiameter: number,
  meanDiameter: number,
  activeCoils: number,
  shearModulus: number
): number {
  return (shearModulus * Math.pow(wireDiameter, 4)) / 
         (8 * Math.pow(meanDiameter, 3) * activeCoils);
}

/**
 * Calculate spring mass
 */
function calculateMass(
  wireDiameter: number,
  meanDiameter: number,
  totalCoils: number,
  density: number
): number {
  const wireLength = Math.PI * meanDiameter * totalCoils;
  const wireArea = Math.PI * Math.pow(wireDiameter / 2, 2);
  const volume = wireArea * wireLength;
  return volume * density * 1e-9; // Convert mm³ to m³, then to kg
}

/**
 * Create random individual
 */
function createRandomIndividual(constraints: DesignConstraints): Individual {
  const { wireDiameterRange, meanDiameterRange, activeCoilsRange, freeLengthRange, allowedMaterials } = constraints;
  
  return {
    genes: {
      wireDiameter: wireDiameterRange[0] + Math.random() * (wireDiameterRange[1] - wireDiameterRange[0]),
      meanDiameter: meanDiameterRange[0] + Math.random() * (meanDiameterRange[1] - meanDiameterRange[0]),
      activeCoils: Math.round(activeCoilsRange[0] + Math.random() * (activeCoilsRange[1] - activeCoilsRange[0])),
      freeLength: freeLengthRange[0] + Math.random() * (freeLengthRange[1] - freeLengthRange[0]),
      materialIndex: Math.floor(Math.random() * allowedMaterials.length),
    },
    fitness: 0,
    objectives: { stress: 0, safety: 0, fatigue: 0, buckling: 0, mass: 0, cost: 0 },
    feasible: false,
  };
}

/**
 * Evaluate individual fitness
 */
function evaluateIndividual(
  individual: Individual,
  targets: DesignTargets,
  constraints: DesignConstraints,
  weights: OptimizationWeights,
  workingConditions: WorkingConditions
): void {
  const { wireDiameter, meanDiameter, activeCoils, freeLength, materialIndex } = individual.genes;
  const materialId = constraints.allowedMaterials[materialIndex];
  const material = SPRING_MATERIALS.find(m => m.id === materialId);
  
  if (!material) {
    individual.fitness = -Infinity;
    individual.feasible = false;
    return;
  }
  
  // Check spring index constraint
  const springIndex = meanDiameter / wireDiameter;
  if (springIndex < constraints.springIndexRange[0] || springIndex > constraints.springIndexRange[1]) {
    individual.fitness = -Infinity;
    individual.feasible = false;
    return;
  }
  
  // Create geometry
  const totalCoils = activeCoils + 2;
  const geometry: CompressionSpringGeometry = {
    type: 'compression',
    wireDiameter,
    meanDiameter,
    activeCoils,
    totalCoils,
    freeLength,
    materialId,
  };
  
  try {
    // Run analysis
    const result = SpringAnalysisEngine.analyze(geometry, workingConditions);
    
    // Calculate spring rate
    const springRate = calculateSpringRate(wireDiameter, meanDiameter, activeCoils, material.shearModulus);
    
    // Calculate mass
    const mass = calculateMass(wireDiameter, meanDiameter, totalCoils, material.density ?? 7850);
    
    // Calculate cost factor
    const cost = mass * (MATERIAL_COSTS[materialId] ?? 1.0);
    
    // Store objectives
    individual.objectives = {
      stress: result.stress.tauEffective / material.allowShearStatic,
      safety: 1 / result.safety.staticSafetyFactor,
      fatigue: 1 / Math.log10(Math.max(result.fatigue.estimatedCycles, 1)),
      buckling: result.buckling ? 1 / result.buckling.bucklingSafetyFactor : 0,
      mass,
      cost,
    };
    
    // Check feasibility against targets
    individual.feasible = true;
    let penaltySum = 0;
    
    if (targets.targetStiffness) {
      const stiffnessError = Math.abs(springRate - targets.targetStiffness) / targets.targetStiffness;
      penaltySum += stiffnessError * 10;
      if (stiffnessError > 0.1) individual.feasible = false;
    }
    
    if (targets.maxStress && result.stress.tauEffective > targets.maxStress) {
      penaltySum += (result.stress.tauEffective - targets.maxStress) / targets.maxStress * 5;
      individual.feasible = false;
    }
    
    if (targets.minSafetyFactor && result.safety.staticSafetyFactor < targets.minSafetyFactor) {
      penaltySum += (targets.minSafetyFactor - result.safety.staticSafetyFactor) * 3;
      individual.feasible = false;
    }
    
    if (targets.minFatigueLife && result.fatigue.estimatedCycles < targets.minFatigueLife) {
      penaltySum += Math.log10(targets.minFatigueLife / Math.max(result.fatigue.estimatedCycles, 1));
      individual.feasible = false;
    }
    
    if (targets.maxFreeLength && freeLength > targets.maxFreeLength) {
      penaltySum += (freeLength - targets.maxFreeLength) / targets.maxFreeLength * 2;
      individual.feasible = false;
    }
    
    if (targets.maxOuterDiameter && (meanDiameter + wireDiameter) > targets.maxOuterDiameter) {
      penaltySum += ((meanDiameter + wireDiameter) - targets.maxOuterDiameter) / targets.maxOuterDiameter * 2;
      individual.feasible = false;
    }
    
    // Calculate weighted fitness (lower is better)
    const weightedCost = 
      weights.stressWeight * individual.objectives.stress +
      weights.safetyWeight * individual.objectives.safety +
      weights.fatigueWeight * individual.objectives.fatigue +
      weights.bucklingWeight * individual.objectives.buckling +
      weights.massWeight * individual.objectives.mass +
      weights.costWeight * individual.objectives.cost +
      penaltySum;
    
    individual.fitness = -weightedCost; // Negate because we maximize fitness
    
  } catch {
    individual.fitness = -Infinity;
    individual.feasible = false;
  }
}

/**
 * Tournament selection
 */
function tournamentSelect(population: Individual[], tournamentSize: number = 3): Individual {
  let best: Individual | null = null;
  
  for (let i = 0; i < tournamentSize; i++) {
    const idx = Math.floor(Math.random() * population.length);
    const candidate = population[idx];
    if (!best || candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  
  return best!;
}

/**
 * Crossover two individuals
 */
function crossover(parent1: Individual, parent2: Individual, constraints: DesignConstraints): Individual {
  const child: Individual = {
    genes: {
      wireDiameter: Math.random() < 0.5 ? parent1.genes.wireDiameter : parent2.genes.wireDiameter,
      meanDiameter: Math.random() < 0.5 ? parent1.genes.meanDiameter : parent2.genes.meanDiameter,
      activeCoils: Math.random() < 0.5 ? parent1.genes.activeCoils : parent2.genes.activeCoils,
      freeLength: Math.random() < 0.5 ? parent1.genes.freeLength : parent2.genes.freeLength,
      materialIndex: Math.random() < 0.5 ? parent1.genes.materialIndex : parent2.genes.materialIndex,
    },
    fitness: 0,
    objectives: { stress: 0, safety: 0, fatigue: 0, buckling: 0, mass: 0, cost: 0 },
    feasible: false,
  };
  
  // Blend crossover for continuous variables
  if (Math.random() < 0.3) {
    const alpha = Math.random();
    child.genes.wireDiameter = alpha * parent1.genes.wireDiameter + (1 - alpha) * parent2.genes.wireDiameter;
    child.genes.meanDiameter = alpha * parent1.genes.meanDiameter + (1 - alpha) * parent2.genes.meanDiameter;
    child.genes.freeLength = alpha * parent1.genes.freeLength + (1 - alpha) * parent2.genes.freeLength;
  }
  
  // Clamp to constraints
  child.genes.wireDiameter = Math.max(constraints.wireDiameterRange[0], 
    Math.min(constraints.wireDiameterRange[1], child.genes.wireDiameter));
  child.genes.meanDiameter = Math.max(constraints.meanDiameterRange[0], 
    Math.min(constraints.meanDiameterRange[1], child.genes.meanDiameter));
  child.genes.freeLength = Math.max(constraints.freeLengthRange[0], 
    Math.min(constraints.freeLengthRange[1], child.genes.freeLength));
  
  return child;
}

/**
 * Mutate individual
 */
function mutate(individual: Individual, constraints: DesignConstraints, mutationRate: number = 0.1): void {
  const { wireDiameterRange, meanDiameterRange, activeCoilsRange, freeLengthRange, allowedMaterials } = constraints;
  
  if (Math.random() < mutationRate) {
    const delta = (wireDiameterRange[1] - wireDiameterRange[0]) * 0.1 * (Math.random() - 0.5);
    individual.genes.wireDiameter = Math.max(wireDiameterRange[0], 
      Math.min(wireDiameterRange[1], individual.genes.wireDiameter + delta));
  }
  
  if (Math.random() < mutationRate) {
    const delta = (meanDiameterRange[1] - meanDiameterRange[0]) * 0.1 * (Math.random() - 0.5);
    individual.genes.meanDiameter = Math.max(meanDiameterRange[0], 
      Math.min(meanDiameterRange[1], individual.genes.meanDiameter + delta));
  }
  
  if (Math.random() < mutationRate) {
    const delta = Math.round((Math.random() - 0.5) * 4);
    individual.genes.activeCoils = Math.max(activeCoilsRange[0], 
      Math.min(activeCoilsRange[1], individual.genes.activeCoils + delta));
  }
  
  if (Math.random() < mutationRate) {
    const delta = (freeLengthRange[1] - freeLengthRange[0]) * 0.1 * (Math.random() - 0.5);
    individual.genes.freeLength = Math.max(freeLengthRange[0], 
      Math.min(freeLengthRange[1], individual.genes.freeLength + delta));
  }
  
  if (Math.random() < mutationRate * 0.5) {
    individual.genes.materialIndex = Math.floor(Math.random() * allowedMaterials.length);
  }
}

/**
 * Check Pareto dominance
 */
function dominates(a: Individual, b: Individual): boolean {
  const objA = a.objectives;
  const objB = b.objectives;
  
  let dominated = false;
  let dominates = false;
  
  for (const key of Object.keys(objA) as (keyof typeof objA)[]) {
    if (objA[key] < objB[key]) dominates = true;
    if (objA[key] > objB[key]) dominated = true;
  }
  
  return dominates && !dominated;
}

/**
 * Extract Pareto front
 */
function extractParetoFront(population: Individual[]): Individual[] {
  const paretoFront: Individual[] = [];
  
  for (const individual of population) {
    if (!individual.feasible) continue;
    
    let dominated = false;
    for (const other of population) {
      if (other !== individual && dominates(other, individual)) {
        dominated = true;
        break;
      }
    }
    
    if (!dominated) {
      paretoFront.push(individual);
    }
  }
  
  return paretoFront;
}

/**
 * Run genetic algorithm optimization
 */
export function optimizeSpringDesign(
  targets: DesignTargets,
  workingConditions: WorkingConditions,
  constraints: DesignConstraints = DEFAULT_CONSTRAINTS,
  weights: OptimizationWeights = DEFAULT_WEIGHTS,
  options: {
    populationSize?: number;
    generations?: number;
    eliteCount?: number;
    mutationRate?: number;
  } = {}
): OptimizationResult {
  const {
    populationSize = 50,
    generations = 100,
    eliteCount = 5,
    mutationRate = 0.15,
  } = options;
  
  // Initialize population
  let population: Individual[] = [];
  for (let i = 0; i < populationSize; i++) {
    population.push(createRandomIndividual(constraints));
  }
  
  // Evaluate initial population
  for (const individual of population) {
    evaluateIndividual(individual, targets, constraints, weights, workingConditions);
  }
  
  const convergenceHistory: OptimizationResult['convergenceHistory'] = [];
  let bestEver: Individual | null = null;
  
  // Evolution loop
  for (let gen = 0; gen < generations; gen++) {
    // Sort by fitness
    population.sort((a, b) => b.fitness - a.fitness);
    
    // Track best
    if (!bestEver || population[0].fitness > bestEver.fitness) {
      bestEver = { ...population[0], genes: { ...population[0].genes } };
    }
    
    // Record convergence
    const avgFitness = population.reduce((sum, ind) => sum + ind.fitness, 0) / populationSize;
    convergenceHistory.push({
      generation: gen,
      bestFitness: population[0].fitness,
      avgFitness,
    });
    
    // Create next generation
    const nextGen: Individual[] = [];
    
    // Elitism
    for (let i = 0; i < eliteCount; i++) {
      nextGen.push({ ...population[i], genes: { ...population[i].genes } });
    }
    
    // Crossover and mutation
    while (nextGen.length < populationSize) {
      const parent1 = tournamentSelect(population);
      const parent2 = tournamentSelect(population);
      const child = crossover(parent1, parent2, constraints);
      mutate(child, constraints, mutationRate);
      evaluateIndividual(child, targets, constraints, weights, workingConditions);
      nextGen.push(child);
    }
    
    population = nextGen;
  }
  
  // Final sort
  population.sort((a, b) => b.fitness - a.fitness);
  
  // Extract Pareto front
  const paretoIndividuals = extractParetoFront(population);
  
  // Build result
  const best = bestEver ?? population[0];
  const materialId = constraints.allowedMaterials[best.genes.materialIndex];
  const material = SPRING_MATERIALS.find(m => m.id === materialId)!;
  
  const springRate = calculateSpringRate(
    best.genes.wireDiameter,
    best.genes.meanDiameter,
    best.genes.activeCoils,
    material.shearModulus
  );
  
  const mass = calculateMass(
    best.genes.wireDiameter,
    best.genes.meanDiameter,
    best.genes.activeCoils + 2,
    material.density ?? 7850
  );
  
  // Determine status
  let status: OptimizationResult['status'] = 'success';
  let message: { en: string; zh: string };
  
  if (!best.feasible) {
    status = 'partial';
    message = {
      en: 'Optimization completed but no fully feasible solution found. Consider relaxing constraints.',
      zh: '优化完成但未找到完全可行的解决方案。考虑放宽约束条件。',
    };
  } else if (best.fitness < -10) {
    status = 'partial';
    message = {
      en: 'Solution found but with significant compromises. Review targets and constraints.',
      zh: '找到解决方案但有显著折中。请审查目标和约束条件。',
    };
  } else {
    message = {
      en: `Optimization successful. Best fitness: ${best.fitness.toFixed(3)}`,
      zh: `优化成功。最佳适应度：${best.fitness.toFixed(3)}`,
    };
  }
  
  return {
    bestSolution: {
      wireDiameter: Math.round(best.genes.wireDiameter * 100) / 100,
      meanDiameter: Math.round(best.genes.meanDiameter * 100) / 100,
      activeCoils: best.genes.activeCoils,
      freeLength: Math.round(best.genes.freeLength * 10) / 10,
      materialId,
    },
    expectedPerformance: {
      springRate: Math.round(springRate * 100) / 100,
      maxStress: Math.round(best.objectives.stress * material.allowShearStatic * 10) / 10,
      safetyFactor: Math.round(1 / best.objectives.safety * 100) / 100,
      fatigueLife: Math.pow(10, 1 / best.objectives.fatigue),
      naturalFrequency: 0, // Would need dynamics calculation
      mass: Math.round(mass * 1000) / 1000,
    },
    fitnessScore: best.fitness,
    convergenceHistory,
    paretoFront: paretoIndividuals.slice(0, 10).map(ind => ({
      solution: {
        wireDiameter: Math.round(ind.genes.wireDiameter * 100) / 100,
        meanDiameter: Math.round(ind.genes.meanDiameter * 100) / 100,
        activeCoils: ind.genes.activeCoils,
        freeLength: Math.round(ind.genes.freeLength * 10) / 10,
        materialId: constraints.allowedMaterials[ind.genes.materialIndex],
      },
      objectives: {
        stress: ind.objectives.stress,
        safety: 1 / ind.objectives.safety,
        fatigue: Math.pow(10, 1 / ind.objectives.fatigue),
        mass: ind.objectives.mass,
      },
    })),
    status,
    message,
  };
}

/**
 * Quick inverse solve for single target
 */
export function inverseDesignSolve(
  targetStiffness: number,
  targetForce: number,
  targetDeflection: number,
  constraints: Partial<DesignConstraints> = {}
): OptimizationResult {
  const fullConstraints: DesignConstraints = {
    ...DEFAULT_CONSTRAINTS,
    ...constraints,
  };
  
  const targets: DesignTargets = {
    targetStiffness,
    targetForce: { deflection: targetDeflection, force: targetForce },
    minSafetyFactor: 1.5,
    minFatigueLife: 1e6,
  };
  
  const workingConditions: WorkingConditions = {
    minDeflection: 0,
    maxDeflection: targetDeflection,
  };
  
  return optimizeSpringDesign(targets, workingConditions, fullConstraints);
}
