import { describe, expect, test } from "vitest";
import * as THREE from "three";

import {
  buildWaveSpringMeshGeometry,
  validateWaveSpringGeometry,
  estimateWaveSpringWireLength,
  getDefaultWaveSpringGeometryInput,
  type WaveSpringGeometryInput,
} from "@/lib/spring3d/waveSpringGeometryV2";

describe("Wave Spring Geometry Validation", () => {
  test("valid input passes validation", () => {
    const input = getDefaultWaveSpringGeometryInput();
    const result = validateWaveSpringGeometry(input);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("invalid mean diameter fails validation", () => {
    const input: WaveSpringGeometryInput = {
      meanDiameter: 0,
      thickness: 1,
      width: 4,
      amplitude: 1.5,
      waves: 4,
      turns: 1,
    };
    const result = validateWaveSpringGeometry(input);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Mean diameter"))).toBe(true);
  });

  test("waves < 2 fails validation", () => {
    const input: WaveSpringGeometryInput = {
      meanDiameter: 25,
      thickness: 1,
      width: 4,
      amplitude: 1.5,
      waves: 1,
      turns: 1,
    };
    const result = validateWaveSpringGeometry(input);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Waves must be >= 2"))).toBe(true);
  });

  test("high amplitude produces warning", () => {
    const input: WaveSpringGeometryInput = {
      meanDiameter: 25,
      thickness: 1,
      width: 4,
      amplitude: 10, // amplitude * 2 = 20 >= width = 4
      waves: 4,
      turns: 1,
    };
    const result = validateWaveSpringGeometry(input);

    expect(result.isValid).toBe(true);
    expect(result.warnings.some((w) => w.includes("amplitude") || w.includes("Amplitude"))).toBe(true);
  });
});

describe("Wave Spring Geometry Builder", () => {
  test("default input produces valid geometry", () => {
    const input = getDefaultWaveSpringGeometryInput();
    const result = buildWaveSpringMeshGeometry(input);

    expect(result.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(result.wireLength).toBeGreaterThan(0);
    expect(result.boundingBox.min).toBeDefined();
    expect(result.boundingBox.max).toBeDefined();
  });

  test("geometry has vertices and no NaN values", () => {
    const input = getDefaultWaveSpringGeometryInput();
    const result = buildWaveSpringMeshGeometry(input);

    const positions = result.geometry.getAttribute("position");
    expect(positions).toBeDefined();
    expect(positions.count).toBeGreaterThan(0);

    const posArray = positions.array as Float32Array;
    for (let i = 0; i < posArray.length; i++) {
      expect(isNaN(posArray[i])).toBe(false);
    }
  });

  test("bounding box is reasonable", () => {
    const input = getDefaultWaveSpringGeometryInput();
    const result = buildWaveSpringMeshGeometry(input);

    const { min, max } = result.boundingBox;

    expect(max.x - min.x).toBeGreaterThan(0);
    expect(max.y - min.y).toBeGreaterThan(0);

    const expectedRadius = input.meanDiameter / 2 + input.thickness / 2;
    expect(max.x).toBeLessThanOrEqual(expectedRadius * 1.5);
    expect(max.y).toBeLessThanOrEqual(expectedRadius * 1.5);
  });

  test("wire length is approximately circumference for single turn", () => {
    const input: WaveSpringGeometryInput = {
      meanDiameter: 25,
      thickness: 1,
      width: 4,
      amplitude: 0,
      waves: 4,
      turns: 1,
    };
    const result = buildWaveSpringMeshGeometry(input);

    const expectedCircumference = Math.PI * input.meanDiameter;
    expect(result.wireLength).toBeCloseTo(expectedCircumference, 0);
  });

  test("multi-turn produces longer wire length", () => {
    const singleTurn: WaveSpringGeometryInput = {
      meanDiameter: 25,
      thickness: 1,
      width: 4,
      amplitude: 1.5,
      waves: 4,
      turns: 1,
    };
    const doubleTurn: WaveSpringGeometryInput = {
      ...singleTurn,
      turns: 2,
    };

    const singleResult = buildWaveSpringMeshGeometry(singleTurn);
    const doubleResult = buildWaveSpringMeshGeometry(doubleTurn);

    expect(doubleResult.wireLength).toBeGreaterThan(singleResult.wireLength * 1.9);
  });
});

describe("Wave Spring Wire Length Estimation", () => {
  test("estimate matches builder result", () => {
    const input = getDefaultWaveSpringGeometryInput();
    const builderResult = buildWaveSpringMeshGeometry(input);
    const estimated = estimateWaveSpringWireLength(input);

    // Allow 5% tolerance between estimate and actual
    const tolerance = builderResult.wireLength * 0.05;
    expect(Math.abs(estimated - builderResult.wireLength)).toBeLessThan(tolerance);
  });
});

describe("Wave Spring Radial Stacking Mode", () => {
  test("radial stacking produces geometry with increasing radius", () => {
    const input: WaveSpringGeometryInput = {
      meanDiameter: 25,
      thickness: 0.5,
      width: 4,
      amplitude: 1.5,
      waves: 4,
      turns: 3,
      stackingMode: "radial",
      radialPitch: 2,
    };
    const result = buildWaveSpringMeshGeometry(input);

    expect(result.geometry).toBeDefined();
    expect(result.wireLength).toBeGreaterThan(0);

    // Bounding box should be larger than single turn due to radial expansion
    const { max } = result.boundingBox;
    expect(max.x).toBeGreaterThan(input.meanDiameter / 2);
  });

  test("radial pitch validation catches overlap", () => {
    const input: WaveSpringGeometryInput = {
      meanDiameter: 25,
      thickness: 1,
      width: 4,
      amplitude: 1.5,
      waves: 4,
      turns: 3,
      stackingMode: "radial",
      radialPitch: 0.5, // Too small - less than thickness
    };
    const validation = validateWaveSpringGeometry(input);

    expect(validation.isValid).toBe(false);
    expect(validation.errors.some((e) => e.includes("Radial pitch must be >= thickness"))).toBe(true);
  });
});

describe("Wave Spring Nested Mode", () => {
  test("nested mode generates multiple independent layers", () => {
    const input: WaveSpringGeometryInput = {
      meanDiameter: 25,
      thickness: 0.5,
      width: 3,
      amplitude: 1.5,
      waves: 4,
      turns: 1,
      stackingMode: "nested",
      nestedLayers: [
        { radiusOffset: 0 },
        { radiusOffset: 5 },
        { radiusOffset: 10 },
      ],
    };
    const result = buildWaveSpringMeshGeometry(input);

    expect(result.geometry).toBeDefined();
    expect(result.wireLength).toBeGreaterThan(0);

    // Should have geometry for all 3 layers
    const positions = result.geometry.getAttribute("position");
    expect(positions.count).toBeGreaterThan(0);
  });

  test("nested layers can have different wave counts", () => {
    const input: WaveSpringGeometryInput = {
      meanDiameter: 25,
      thickness: 0.5,
      width: 3,
      amplitude: 1.5,
      waves: 4,
      turns: 1,
      stackingMode: "nested",
      nestedLayers: [
        { radiusOffset: 0, waves: 3 },
        { radiusOffset: 5, waves: 4 },
        { radiusOffset: 10, waves: 6 },
      ],
    };
    const result = buildWaveSpringMeshGeometry(input);

    expect(result.geometry).toBeDefined();
  });

  test("nested layer overlap produces warning", () => {
    const input: WaveSpringGeometryInput = {
      meanDiameter: 25,
      thickness: 0.5,
      width: 5,
      amplitude: 1.5,
      waves: 4,
      turns: 1,
      stackingMode: "nested",
      nestedLayers: [
        { radiusOffset: 0 },
        { radiusOffset: 3 }, // Gap is 3, but width is 5 - overlap
      ],
    };
    const validation = validateWaveSpringGeometry(input);

    expect(validation.warnings.some((w) => w.includes("may overlap radially"))).toBe(true);
  });
});
