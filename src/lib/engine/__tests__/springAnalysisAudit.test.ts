/**
 * Spring Analysis Engine - Comprehensive Audit Test
 * 弹簧分析引擎 - 全面审计测试
 * 
 * Validates calculations for all spring types against known formulas
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { SpringAnalysisEngine } from '../SpringAnalysisEngine';
import { calculateSpringRate } from '../forceCurve';
import { calculateWahlFactor, calculateBendingStress, calculateNominalShearStress } from '../stress';
import type { 
  CompressionSpringGeometry, 
  ExtensionSpringGeometry, 
  TorsionSpringGeometry, 
  ConicalSpringGeometry,
  WorkingConditions 
} from '../types';

const PI = Math.PI;

// ============================================================================
// Test Data - Standard Spring Configurations
// ============================================================================

const compressionSpring: CompressionSpringGeometry = {
  type: 'compression',
  wireDiameter: 3.0,        // d = 3mm
  meanDiameter: 24.0,       // Dm = 24mm
  activeCoils: 8,           // Na = 8
  totalCoils: 10,           // Nt = 10
  freeLength: 50.0,         // L0 = 50mm
  endType: 'closed_ground',
  materialId: 'music_wire_a228',
};

const extensionSpring: ExtensionSpringGeometry = {
  type: 'extension',
  wireDiameter: 2.0,        // d = 2mm
  meanDiameter: 16.0,       // Dm = 16mm
  activeCoils: 10,          // Na = 10
  bodyLength: 30.0,         // Body length
  initialTension: 10,       // F0 = 10N
  hookType: 'machine',
  materialId: 'music_wire_a228',
};

const torsionSpring: TorsionSpringGeometry = {
  type: 'torsion',
  wireDiameter: 1.5,        // d = 1.5mm
  meanDiameter: 12.0,       // Dm = 12mm
  activeCoils: 6,           // Na = 6
  bodyLength: 12.0,         // Body length
  legLength1: 25.0,         // Leg 1
  legLength2: 25.0,         // Leg 2
  legAngle: 90,
  materialId: 'music_wire_a228',
};

const conicalSpring: ConicalSpringGeometry = {
  type: 'conical',
  wireDiameter: 2.5,        // d = 2.5mm
  largeOuterDiameter: 30.0, // D1 = 30mm
  smallOuterDiameter: 15.0, // D2 = 15mm
  activeCoils: 6,           // Na = 6
  freeLength: 40.0,         // L0 = 40mm
  materialId: 'music_wire_a228',
};

const workingConditions: WorkingConditions = {
  minDeflection: 5,
  maxDeflection: 20,
  temperature: 20,
  targetCycles: 1e6,
};

// ============================================================================
// Compression Spring Tests
// ============================================================================

describe('Compression Spring Analysis', () => {
  let engine: SpringAnalysisEngine;
  
  beforeAll(() => {
    engine = new SpringAnalysisEngine(compressionSpring, workingConditions);
  });

  test('Spring rate formula: k = Gd⁴ / (8Dm³Na)', () => {
    const G = 79300; // Music wire shear modulus (MPa)
    const d = compressionSpring.wireDiameter;
    const Dm = compressionSpring.meanDiameter;
    const Na = compressionSpring.activeCoils;
    
    // Expected: k = 79300 × 3⁴ / (8 × 24³ × 8) = 79300 × 81 / (8 × 13824 × 8)
    const expectedRate = (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * Na);
    const calculatedRate = engine.getSpringRate();
    
    console.log(`Compression Spring Rate: Expected=${expectedRate.toFixed(2)}, Calculated=${calculatedRate.toFixed(2)}`);
    expect(calculatedRate).toBeCloseTo(expectedRate, 1);
  });

  test('Spring index: C = Dm/d', () => {
    const geometry = engine.getGeometry();
    const expectedIndex = compressionSpring.meanDiameter / compressionSpring.wireDiameter;
    
    expect(geometry.springIndex).toBeCloseTo(expectedIndex, 2);
    expect(geometry.springIndex).toBe(8); // 24/3 = 8
  });

  test('Wahl factor formula: Kw = (4C-1)/(4C-4) + 0.615/C', () => {
    const C = 8;
    const expectedWahl = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
    const calculatedWahl = calculateWahlFactor(C);
    
    console.log(`Wahl Factor (C=8): Expected=${expectedWahl.toFixed(4)}, Calculated=${calculatedWahl.toFixed(4)}`);
    expect(calculatedWahl).toBeCloseTo(expectedWahl, 4);
  });

  test('Shear stress formula: τ = 8FDm / (πd³) × Kw', () => {
    const springRate = engine.getSpringRate();
    const force = springRate * workingConditions.maxDeflection;
    const stress = engine.getMaxStress();
    
    const d = compressionSpring.wireDiameter;
    const Dm = compressionSpring.meanDiameter;
    const C = Dm / d;
    const Kw = calculateWahlFactor(C);
    
    const tauNominal = (8 * force * Dm) / (PI * Math.pow(d, 3));
    const expectedStress = tauNominal * Kw;
    
    console.log(`Compression Stress: Force=${force.toFixed(1)}N, τ_nominal=${tauNominal.toFixed(1)}MPa, τ_effective=${stress.tauEffective.toFixed(1)}MPa`);
    
    // Note: tauEffective includes additional factors (surface, size, temp)
    expect(stress.tauNominal).toBeCloseTo(tauNominal, 0);
    expect(stress.wahlFactor).toBeCloseTo(Kw, 3);
  });

  test('Safety factor: SF = τ_allow / τ_effective', () => {
    const safety = engine.getSafetyFactor();
    const stress = engine.getMaxStress();
    
    // Music wire A228 allowable stress is around 600-700 MPa
    expect(safety.staticSafetyFactor).toBeGreaterThan(0);
    expect(safety.allowableStress).toBeGreaterThan(0);
    
    const expectedSF = safety.allowableStress / stress.tauEffective;
    expect(safety.staticSafetyFactor).toBeCloseTo(expectedSF, 2);
    
    console.log(`Compression Safety: SF=${safety.staticSafetyFactor.toFixed(2)}, Status=${safety.status}`);
  });

  test('Buckling analysis available for compression springs', () => {
    const buckling = engine.getBuckling();
    expect(buckling).toBeDefined();
    expect(buckling?.slendernessRatio).toBeGreaterThan(0);
    
    console.log(`Buckling: λ=${buckling?.slendernessRatio.toFixed(2)}, Status=${buckling?.status}`);
  });
});

// ============================================================================
// Extension Spring Tests
// ============================================================================

describe('Extension Spring Analysis', () => {
  let engine: SpringAnalysisEngine;
  
  beforeAll(() => {
    engine = new SpringAnalysisEngine(extensionSpring, workingConditions);
  });

  test('Spring rate same formula as compression', () => {
    const G = 79300;
    const d = extensionSpring.wireDiameter;
    const Dm = extensionSpring.meanDiameter;
    const Na = extensionSpring.activeCoils;
    
    const expectedRate = (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * Na);
    const calculatedRate = engine.getSpringRate();
    
    console.log(`Extension Spring Rate: Expected=${expectedRate.toFixed(2)}, Calculated=${calculatedRate.toFixed(2)}`);
    expect(calculatedRate).toBeCloseTo(expectedRate, 1);
  });

  test('Force includes initial tension: F = F0 + k×δ', () => {
    const springRate = engine.getSpringRate();
    const maxDeflection = workingConditions.maxDeflection;
    const initialTension = extensionSpring.initialTension;
    
    const expectedForce = initialTension + springRate * maxDeflection;
    const stress = engine.getMaxStress();
    
    // Verify stress is calculated with total force
    const d = extensionSpring.wireDiameter;
    const Dm = extensionSpring.meanDiameter;
    const tauNominal = (8 * expectedForce * Dm) / (PI * Math.pow(d, 3));
    
    console.log(`Extension Force: F0=${initialTension}N, k×δ=${(springRate * maxDeflection).toFixed(1)}N, Total=${expectedForce.toFixed(1)}N`);
    expect(stress.tauNominal).toBeCloseTo(tauNominal, 0);
  });

  test('No buckling analysis for extension springs', () => {
    const buckling = engine.getBuckling();
    expect(buckling).toBeUndefined();
  });
});

// ============================================================================
// Torsion Spring Tests
// ============================================================================

describe('Torsion Spring Analysis', () => {
  let engine: SpringAnalysisEngine;
  
  beforeAll(() => {
    engine = new SpringAnalysisEngine(torsionSpring, workingConditions);
  });

  test('Spring rate formula: k = Ed⁴ / (10.8×Dm×Na) × (π/180)', () => {
    const E = 207000; // Elastic modulus (MPa)
    const d = torsionSpring.wireDiameter;
    const Dm = torsionSpring.meanDiameter;
    const Na = torsionSpring.activeCoils;
    
    // Rate in N·mm per radian, then convert to per degree
    const k_rad = (E * Math.pow(d, 4)) / (10.8 * Dm * Na);
    const expectedRate = k_rad * (PI / 180);
    const calculatedRate = engine.getSpringRate();
    
    console.log(`Torsion Spring Rate: Expected=${expectedRate.toFixed(2)} N·mm/deg, Calculated=${calculatedRate.toFixed(2)} N·mm/deg`);
    expect(calculatedRate).toBeCloseTo(expectedRate, 1);
  });

  test('Bending stress formula: σ = Ki × 32M / (πd³)', () => {
    const d = torsionSpring.wireDiameter;
    const Dm = torsionSpring.meanDiameter;
    const C = Dm / d;
    
    // Inner fiber stress concentration factor
    const Ki = (4 * C * C - C - 1) / (4 * C * (C - 1));
    
    const torque = 100; // Test torque in N·mm
    const expectedBendingStress = Ki * (32 * torque) / (PI * Math.pow(d, 3));
    const calculatedBendingStress = calculateBendingStress(torque, Dm, d);
    
    console.log(`Torsion Bending Stress: Ki=${Ki.toFixed(3)}, Expected=${expectedBendingStress.toFixed(1)}MPa, Calculated=${calculatedBendingStress.toFixed(1)}MPa`);
    expect(calculatedBendingStress).toBeCloseTo(expectedBendingStress, 0);
  });

  test('No buckling analysis for torsion springs', () => {
    const buckling = engine.getBuckling();
    expect(buckling).toBeUndefined();
  });
});

// ============================================================================
// Conical Spring Tests
// ============================================================================

describe('Conical Spring Analysis', () => {
  let engine: SpringAnalysisEngine;
  
  beforeAll(() => {
    engine = new SpringAnalysisEngine(conicalSpring, workingConditions);
  });

  test('Spring rate formula: k = Gd⁴ / (2Na(D1+D2)(D1²+D2²))', () => {
    const G = 79300;
    const d = conicalSpring.wireDiameter;
    const D1 = conicalSpring.largeOuterDiameter - d; // Large mean diameter
    const D2 = conicalSpring.smallOuterDiameter - d; // Small mean diameter
    const Na = conicalSpring.activeCoils;
    
    const expectedRate = (G * Math.pow(d, 4)) / 
                         (2 * Na * (D1 + D2) * (D1 * D1 + D2 * D2));
    const calculatedRate = engine.getSpringRate();
    
    console.log(`Conical Spring Rate: Expected=${expectedRate.toFixed(2)}, Calculated=${calculatedRate.toFixed(2)}`);
    expect(calculatedRate).toBeCloseTo(expectedRate, 1);
  });

  test('Maximum stress at large end', () => {
    const stress = engine.getMaxStress();
    const springRate = engine.getSpringRate();
    const force = springRate * workingConditions.maxDeflection;
    
    const d = conicalSpring.wireDiameter;
    const D1 = conicalSpring.largeOuterDiameter - d; // Large mean diameter
    
    // Stress should be calculated at large end (highest stress)
    const tauNominalLarge = (8 * force * D1) / (PI * Math.pow(d, 3));
    
    console.log(`Conical Stress: Force=${force.toFixed(1)}N, τ_nominal(large)=${tauNominalLarge.toFixed(1)}MPa, τ_nominal(calc)=${stress.tauNominal.toFixed(1)}MPa`);
    expect(stress.tauNominal).toBeCloseTo(tauNominalLarge, 0);
  });

  test('Nonlinear force curve with coil collapse', () => {
    const curve = engine.getForceCurve(20);
    
    // Conical springs have increasing stiffness as coils collapse
    expect(curve.length).toBeGreaterThan(0);
    
    // Check that stiffness increases (or stays same) as deflection increases
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].stiffness).toBeGreaterThanOrEqual(curve[i-1].stiffness * 0.99); // Allow small tolerance
    }
    
    console.log(`Conical Force Curve: ${curve.length} points, Initial k=${curve[0].stiffness.toFixed(2)}, Final k=${curve[curve.length-1].stiffness.toFixed(2)}`);
  });

  test('No buckling analysis for conical springs', () => {
    const buckling = engine.getBuckling();
    expect(buckling).toBeUndefined();
  });
});

// ============================================================================
// Cross-Type Validation
// ============================================================================

describe('Cross-Type Validation', () => {
  test('All spring types produce valid analysis results', () => {
    const springs = [
      { name: 'Compression', geometry: compressionSpring },
      { name: 'Extension', geometry: extensionSpring },
      { name: 'Torsion', geometry: torsionSpring },
      { name: 'Conical', geometry: conicalSpring },
    ];

    for (const { name, geometry } of springs) {
      const engine = new SpringAnalysisEngine(geometry, workingConditions);
      const result = engine.analyze();

      console.log(`\n=== ${name} Spring Analysis ===`);
      console.log(`  Spring Rate: ${result.springRate.toFixed(2)}`);
      console.log(`  Max Stress: ${result.stress.tauEffective.toFixed(1)} MPa`);
      console.log(`  Safety Factor: ${result.safety.staticSafetyFactor.toFixed(2)} (${result.safety.status})`);
      console.log(`  Fatigue Life: ${result.fatigue.estimatedCycles.toExponential(1)} cycles (${result.fatigue.rating})`);
      
      // Validate all results are reasonable
      expect(result.springRate).toBeGreaterThan(0);
      expect(result.stress.tauEffective).toBeGreaterThan(0);
      expect(result.safety.staticSafetyFactor).toBeGreaterThan(0);
      expect(result.fatigue.estimatedCycles).toBeGreaterThan(0);
      expect(result.forceCurve.length).toBeGreaterThan(0);
    }
  });

  test('Safety factor correctly identifies unsafe designs', () => {
    // Create an unsafe design with very high stress
    const unsafeSpring: CompressionSpringGeometry = {
      ...compressionSpring,
      wireDiameter: 0.8,      // Very thin wire
      meanDiameter: 25.0,     // Large diameter
      activeCoils: 3,         // Few coils = high rate
    };

    const engine = new SpringAnalysisEngine(unsafeSpring, {
      ...workingConditions,
      maxDeflection: 40,      // Large deflection to create high stress
    });

    const result = engine.analyze();
    
    console.log(`\nUnsafe Design Test:`);
    console.log(`  Spring Rate: ${result.springRate.toFixed(2)}`);
    console.log(`  Max Stress: ${result.stress.tauEffective.toFixed(1)} MPa`);
    console.log(`  Safety Factor: ${result.safety.staticSafetyFactor.toFixed(2)}`);
    console.log(`  Status: ${result.safety.status}`);

    // This design should have low or dangerous safety factor (< 1.5)
    expect(result.safety.staticSafetyFactor).toBeLessThan(1.5);
  });
});
