/**
 * Spiral Torsion Spring Engine - Unit Tests
 * 螺旋扭转弹簧计算引擎单元测试
 * 
 * 验收用例：SAFE / WARNING / EXCEEDED 三种工况
 */

import { 
  calculateSpiralTorsionSpring,
  type SpiralTorsionSpringInput,
  type SpiralTorsionSpringResult,
  degreesToRevolutions,
  revolutionsToDegrees,
} from "../spiralTorsionSpringEngine";

// ============================================================================
// Test Data - 3 Sanity Cases
// ============================================================================

/** 基础输入参数 */
const baseInput: SpiralTorsionSpringInput = {
  stripWidth: 10,           // b = 10 mm
  stripThickness: 0.5,      // t = 0.5 mm
  activeLength: 500,        // L = 500 mm
  innerDiameter: 15,        // Di = 15 mm (空间校核)
  outerDiameter: 50,        // Do = 50 mm (空间校核)
  activeCoils: 5,           // Na = 5 (参考)
  preloadAngle: 0,          // θ0 = 0°
  minWorkingAngle: 0,       // θ_min = 0°
  maxWorkingAngle: 200,     // θ_max = 200° (SAFE: 200/360 = 0.56 < 0.8)
  closeOutAngle: 360,       // θ_co = 360° (1 revolution)
  allowableStressOverride: null,
  allowableStressRule: "0.45_UTS",
  windingDirection: "cw",
  innerEndType: "fixed",
  outerEndType: "fixed",
  materialId: "music_wire_a228",
};

// ============================================================================
// Test Case 1: SAFE (θ ≤ 0.8 × θ_co)
// ============================================================================

describe("Spiral Torsion Spring Engine - SAFE Case", () => {
  const input: SpiralTorsionSpringInput = {
    ...baseInput,
    maxWorkingAngle: 200, // 200/360 = 0.56 rev ≤ 0.8 → SAFE
  };

  let result: SpiralTorsionSpringResult | null;

  beforeAll(() => {
    result = calculateSpiralTorsionSpring(input);
  });

  test("should return valid result", () => {
    expect(result).not.toBeNull();
  });

  test("operatingStatus should be SAFE", () => {
    expect(result?.operatingStatus).toBe("SAFE");
  });

  test("isInCloseOut should be false", () => {
    expect(result?.isInCloseOut).toBe(false);
  });

  test("isValid should be true", () => {
    expect(result?.isValid).toBe(true);
  });

  test("maxTorque should be calculated (not clamped)", () => {
    // T = k × θ (线性区)
    expect(result?.maxTorque).toBeGreaterThan(0);
    expect(result?.maxTorque).toBeLessThan(result?.closeOutTorque ?? Infinity);
  });

  test("warnings should not contain close-out warning", () => {
    expect(result?.warnings).not.toContain(expect.stringContaining("close-out"));
  });

  test("errors should be empty", () => {
    expect(result?.errors).toHaveLength(0);
  });
});

// ============================================================================
// Test Case 2: WARNING (0.8 × θ_co < θ ≤ θ_co)
// ============================================================================

describe("Spiral Torsion Spring Engine - WARNING Case", () => {
  const input: SpiralTorsionSpringInput = {
    ...baseInput,
    maxWorkingAngle: 320, // 320/360 = 0.89 rev, 0.8 < 0.89 ≤ 1.0 → WARNING
  };

  let result: SpiralTorsionSpringResult | null;

  beforeAll(() => {
    result = calculateSpiralTorsionSpring(input);
  });

  test("should return valid result", () => {
    expect(result).not.toBeNull();
  });

  test("operatingStatus should be WARNING", () => {
    expect(result?.operatingStatus).toBe("WARNING");
  });

  test("isInCloseOut should be false (still in linear region)", () => {
    expect(result?.isInCloseOut).toBe(false);
  });

  test("isValid should be true", () => {
    expect(result?.isValid).toBe(true);
  });

  test("warnings should contain safety margin warning", () => {
    expect(result?.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("0.8·θ_co")
      ])
    );
  });
});

// ============================================================================
// Test Case 3: EXCEEDED (θ > θ_co)
// ============================================================================

describe("Spiral Torsion Spring Engine - EXCEEDED Case", () => {
  const input: SpiralTorsionSpringInput = {
    ...baseInput,
    maxWorkingAngle: 400, // 400/360 = 1.11 rev > 1.0 → EXCEEDED
  };

  let result: SpiralTorsionSpringResult | null;

  beforeAll(() => {
    result = calculateSpiralTorsionSpring(input);
  });

  test("should return valid result", () => {
    expect(result).not.toBeNull();
  });

  test("operatingStatus should be EXCEEDED", () => {
    expect(result?.operatingStatus).toBe("EXCEEDED");
  });

  test("isInCloseOut should be true", () => {
    expect(result?.isInCloseOut).toBe(true);
  });

  test("maxTorque should be clamped to closeOutTorque (不胡算)", () => {
    // 超过 close-out 后，maxTorque 固定在 closeOutTorque
    expect(result?.maxTorque).toBe(result?.closeOutTorque);
  });

  test("warnings should contain close-out exceeded warning", () => {
    expect(result?.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("close-out")
      ])
    );
  });

  test("curve points beyond close-out should have NO_CALC flag", () => {
    const closeOutPoints = result?.curvePoints.filter(p => p.region === "closeout");
    expect(closeOutPoints?.length).toBeGreaterThan(0);
    closeOutPoints?.forEach(p => {
      expect(p.flags).toContain("NO_CALC");
      expect(p.flags).toContain("CLOSEOUT");
    });
  });

  test("curve points beyond close-out should have flat torque (平台)", () => {
    const closeOutPoints = result?.curvePoints.filter(p => p.region === "closeout");
    const closeOutTorque = result?.closeOutTorque;
    closeOutPoints?.forEach(p => {
      expect(p.torque).toBe(closeOutTorque);
    });
  });
});

// ============================================================================
// Test Case 4: Allowable Stress Override
// ============================================================================

describe("Spiral Torsion Spring Engine - Allowable Stress Override", () => {
  const input: SpiralTorsionSpringInput = {
    ...baseInput,
    allowableStressOverride: 500, // 用户自定义 500 MPa
  };

  let result: SpiralTorsionSpringResult | null;

  beforeAll(() => {
    result = calculateSpiralTorsionSpring(input);
  });

  test("allowableStress should be user override value", () => {
    expect(result?.allowableStress).toBe(500);
  });

  test("allowableStressSource should indicate user override", () => {
    expect(result?.allowableStressSource).toContain("用户自定义");
  });
});

// ============================================================================
// Test Case 5: Utility Functions
// ============================================================================

describe("Spiral Torsion Spring Engine - Utility Functions", () => {
  test("degreesToRevolutions should convert correctly", () => {
    expect(degreesToRevolutions(360)).toBe(1);
    expect(degreesToRevolutions(180)).toBe(0.5);
    expect(degreesToRevolutions(720)).toBe(2);
  });

  test("revolutionsToDegrees should convert correctly", () => {
    expect(revolutionsToDegrees(1)).toBe(360);
    expect(revolutionsToDegrees(0.5)).toBe(180);
    expect(revolutionsToDegrees(2)).toBe(720);
  });
});

// ============================================================================
// Expected Results Summary (for verification)
// ============================================================================

/**
 * SANITY CASE SUMMARY
 * 
 * | Case     | maxWorkingAngle | θ/θ_co | operatingStatus | isInCloseOut | maxTorque behavior |
 * |----------|-----------------|--------|-----------------|--------------|-------------------|
 * | SAFE     | 200°            | 0.56   | SAFE            | false        | Calculated        |
 * | WARNING  | 320°            | 0.89   | WARNING         | false        | Calculated        |
 * | EXCEEDED | 400°            | 1.11   | EXCEEDED        | true         | Clamped to θ_co   |
 * 
 * Material: music_wire_a228 (UTS = 1860 MPa)
 * Allowable Stress (0.45 × UTS): 837 MPa
 * 
 * Formula verification:
 * - k_rev = πEbt³/(6L) = π × 206000 × 10 × 0.5³ / (6 × 500) = 26.93 N·mm/rev
 * - k_deg = k_rev / 360 = 0.0748 N·mm/°
 * - T(200°) = k_deg × 200 = 14.96 N·mm
 * - T(360°) = k_deg × 360 = 26.93 N·mm (close-out torque)
 */
