/**
 * Die Spring Math Tests
 * 模具弹簧计算测试
 */

import { describe, it, expect } from "vitest";
import {
  calculateDieSpring,
  validateDieSpringInput,
} from "../math";
import type { DieSpringInput } from "../types";

describe("Die Spring Validation", () => {
  const validInput: DieSpringInput = {
    geometry: {
      od_mm: 25,
      freeLength_mm: 50,
      workingLength_mm: 40,
      coils: 8,
      wire_b_mm: 4,
      wire_t_mm: 2,
    },
    material: "CHROME_ALLOY",
  };

  it("valid input passes validation", () => {
    const result = validateDieSpringInput(validInput);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("invalid OD fails validation", () => {
    const input: DieSpringInput = {
      ...validInput,
      geometry: { ...validInput.geometry, od_mm: 0 },
    };
    const result = validateDieSpringInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("OD"))).toBe(true);
  });

  it("working length >= free length fails validation", () => {
    const input: DieSpringInput = {
      ...validInput,
      geometry: { ...validInput.geometry, workingLength_mm: 55 },
    };
    const result = validateDieSpringInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Working length"))).toBe(true);
  });

  it("high compression ratio produces error", () => {
    const input: DieSpringInput = {
      ...validInput,
      geometry: { ...validInput.geometry, workingLength_mm: 30 }, // 40% compression
    };
    const result = validateDieSpringInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Compression ratio"))).toBe(true);
  });

  it("temperature exceeding material limit produces error", () => {
    const input: DieSpringInput = {
      ...validInput,
      operating: { temperature_C: 250 }, // CHROME_ALLOY max is 200
    };
    const result = validateDieSpringInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Temperature"))).toBe(true);
  });
});

describe("Die Spring Calculation", () => {
  const validInput: DieSpringInput = {
    geometry: {
      od_mm: 25,
      freeLength_mm: 50,
      workingLength_mm: 40,
      coils: 8,
      wire_b_mm: 4,
      wire_t_mm: 2,
    },
    material: "CHROME_ALLOY",
  };

  it("calculates travel correctly", () => {
    const result = calculateDieSpring(validInput);
    expect(result.ok).toBe(true);
    expect(result.travel_mm).toBe(10); // 50 - 40
  });

  it("calculates mean diameter correctly", () => {
    const result = calculateDieSpring(validInput);
    expect(result.meanDiameter_mm).toBe(23); // 25 - 2
  });

  it("calculates spring index correctly", () => {
    const result = calculateDieSpring(validInput);
    expect(result.springIndex).toBe(11.5); // 23 / 2
  });

  it("calculates equivalent wire diameter correctly", () => {
    const result = calculateDieSpring(validInput);
    expect(result.equivalentWireDiameter_mm).toBeCloseTo(Math.sqrt(4 * 2), 3);
  });

  it("spring rate is positive", () => {
    const result = calculateDieSpring(validInput);
    expect(result.springRate_Nmm).toBeGreaterThan(0);
  });

  it("load at working is positive", () => {
    const result = calculateDieSpring(validInput);
    expect(result.loadAtWorking_N).toBeGreaterThan(0);
  });

  it("stress is positive", () => {
    const result = calculateDieSpring(validInput);
    expect(result.stress_MPa).toBeGreaterThan(0);
  });

  it("stress ratio is less than 1 for valid design", () => {
    const result = calculateDieSpring(validInput);
    expect(result.stressRatio).toBeLessThan(1);
  });

  it("compression ratio matches expected", () => {
    const result = calculateDieSpring(validInput);
    expect(result.compressionRatio).toBeCloseTo(0.2, 2); // 10/50 = 0.2
  });
});

describe("Die Spring Temperature Derating", () => {
  const validInput: DieSpringInput = {
    geometry: {
      od_mm: 25,
      freeLength_mm: 50,
      workingLength_mm: 40,
      coils: 8,
      wire_b_mm: 4,
      wire_t_mm: 2,
    },
    material: "CHROME_ALLOY",
  };

  it("no derating at room temperature", () => {
    const result = calculateDieSpring(validInput);
    expect(result.tempLoadLossPct).toBeUndefined();
    expect(result.deratedLoad_N).toBeUndefined();
  });

  it("applies derating at elevated temperature", () => {
    const input: DieSpringInput = {
      ...validInput,
      operating: { temperature_C: 150 },
    };
    const result = calculateDieSpring(input);
    expect(result.tempLoadLossPct).toBeDefined();
    expect(result.tempLoadLossPct).toBeGreaterThan(0);
    expect(result.deratedLoad_N).toBeDefined();
    expect(result.deratedLoad_N!).toBeLessThan(result.loadAtWorking_N);
  });
});

describe("Die Spring Material Comparison", () => {
  const baseGeometry = {
    od_mm: 25,
    freeLength_mm: 50,
    workingLength_mm: 40,
    coils: 8,
    wire_b_mm: 4,
    wire_t_mm: 2,
  };

  it("higher yield material has lower stress ratio", () => {
    const oilTempered = calculateDieSpring({
      geometry: baseGeometry,
      material: "OIL_TEMPERED", // 1200 MPa
    });
    const chromeSilicon = calculateDieSpring({
      geometry: baseGeometry,
      material: "CHROME_SILICON", // 1600 MPa
    });

    // Same stress, different yield -> different ratio
    expect(oilTempered.stress_MPa).toBeCloseTo(chromeSilicon.stress_MPa, 1);
    expect(chromeSilicon.stressRatio).toBeLessThan(oilTempered.stressRatio);
  });
});
