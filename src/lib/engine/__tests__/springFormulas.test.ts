/**
 * Spring Formula Verification Tests
 * 弹簧公式验证测试
 * 
 * 测试策略：
 * 1. 与手册标准值对比（DIN EN 13906, SMI Handbook）
 * 2. 与已知商业软件结果对比
 * 3. 边界条件测试
 * 4. 单位一致性测试
 * 
 * @see docs/SPRING_FORMULAS_VERIFICATION.md
 */

// @ts-nocheck
// 注意：运行测试前需要安装 vitest: npm install -D vitest
import { describe, it, expect } from 'vitest';
import { 
  calculateCompressionSpringRate,
  calculateExtensionSpringRate,
  calculateTorsionSpringRate,
  calculateConicalSpringRate,
} from '../forceCurve';
import { 
  calculateWahlFactor,
  calculateBergstrasserFactor,
  calculateNominalShearStress,
  calculateBendingStress,
} from '../stress';
import { calculateTorsionFrequency, calculateTorsionMass } from '../torsionAdvancedAnalysis';
import type { 
  CompressionSpringGeometry, 
  ExtensionSpringGeometry,
  TorsionSpringGeometry,
  ConicalSpringGeometry,
} from '../types';

const PI = Math.PI;

// ============================================================================
// 测试用例：标准弹簧参数（来自 SMI Handbook）
// ============================================================================

/**
 * 标准压缩弹簧测试用例
 * 来源: SMI Handbook Example 5.1
 */
const COMPRESSION_SPRING_STANDARD: CompressionSpringGeometry = {
  type: 'compression',
  wireDiameter: 2.0,        // mm
  meanDiameter: 16.0,       // mm (OD=18, ID=14)
  activeCoils: 8,
  totalCoils: 10,
  freeLength: 50.0,         // mm
  materialId: 'music_wire_a228',
  endType: 'closed_ground',
};

/**
 * 标准拉伸弹簧测试用例
 */
const EXTENSION_SPRING_STANDARD: ExtensionSpringGeometry = {
  type: 'extension',
  wireDiameter: 1.5,        // mm
  meanDiameter: 12.0,       // mm
  activeCoils: 10,
  bodyLength: 15.0,         // mm
  initialTension: 5.0,      // N
  materialId: 'music_wire_a228',
  hookType: 'machine',
};

/**
 * 标准扭转弹簧测试用例
 */
const TORSION_SPRING_STANDARD: TorsionSpringGeometry = {
  type: 'torsion',
  wireDiameter: 2.0,        // mm
  meanDiameter: 20.0,       // mm
  activeCoils: 6,
  bodyLength: 12.0,         // mm
  legLength1: 30.0,         // mm
  legLength2: 30.0,         // mm
  freeAngle: 90,            // degrees
  materialId: 'music_wire_a228',
};

/**
 * 标准锥形弹簧测试用例
 */
const CONICAL_SPRING_STANDARD: ConicalSpringGeometry = {
  type: 'conical',
  wireDiameter: 2.5,        // mm
  largeOuterDiameter: 30.0, // mm
  smallOuterDiameter: 15.0, // mm
  activeCoils: 6,
  totalCoils: 8,
  freeLength: 40.0,         // mm
  materialId: 'music_wire_a228',
};

// ============================================================================
// 1. 刚度公式测试
// ============================================================================

describe('Spring Rate Formulas / 刚度公式', () => {
  
  describe('Compression Spring Rate / 压缩弹簧刚度', () => {
    it('should match SMI Handbook formula: k = Gd⁴/(8Dm³Na)', () => {
      const k = calculateCompressionSpringRate(COMPRESSION_SPRING_STANDARD);
      
      // 手动计算验证
      // G = 79300 MPa (music wire)
      // k = 79300 × 2⁴ / (8 × 16³ × 8)
      // k = 79300 × 16 / (8 × 4096 × 8)
      // k = 1268800 / 262144 = 4.84 N/mm
      const G = 79300;
      const d = 2.0;
      const Dm = 16.0;
      const Na = 8;
      const k_expected = (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * Na);
      
      expect(k).toBeCloseTo(k_expected, 2);
      expect(k).toBeCloseTo(4.84, 1); // 约 4.84 N/mm
    });

    it('should increase with wire diameter to the 4th power', () => {
      const spring1 = { ...COMPRESSION_SPRING_STANDARD, wireDiameter: 1.0 };
      const spring2 = { ...COMPRESSION_SPRING_STANDARD, wireDiameter: 2.0 };
      
      const k1 = calculateCompressionSpringRate(spring1);
      const k2 = calculateCompressionSpringRate(spring2);
      
      // k2/k1 should be 2⁴ = 16
      expect(k2 / k1).toBeCloseTo(16, 1);
    });

    it('should decrease with mean diameter to the 3rd power', () => {
      const spring1 = { ...COMPRESSION_SPRING_STANDARD, meanDiameter: 10.0 };
      const spring2 = { ...COMPRESSION_SPRING_STANDARD, meanDiameter: 20.0 };
      
      const k1 = calculateCompressionSpringRate(spring1);
      const k2 = calculateCompressionSpringRate(spring2);
      
      // k1/k2 should be 2³ = 8
      expect(k1 / k2).toBeCloseTo(8, 1);
    });
  });

  describe('Extension Spring Rate / 拉伸弹簧刚度', () => {
    it('should have same formula as compression spring', () => {
      const compressionSpring: CompressionSpringGeometry = {
        ...COMPRESSION_SPRING_STANDARD,
        wireDiameter: 1.5,
        meanDiameter: 12.0,
        activeCoils: 10,
      };
      
      const k_compression = calculateCompressionSpringRate(compressionSpring);
      const k_extension = calculateExtensionSpringRate(EXTENSION_SPRING_STANDARD);
      
      expect(k_extension).toBeCloseTo(k_compression, 2);
    });
  });

  describe('Torsion Spring Rate / 扭转弹簧刚度', () => {
    it('should use correct formula: k_rad = Ed⁴/(10.8×Dm×Na)', () => {
      const k_deg = calculateTorsionSpringRate(TORSION_SPRING_STANDARD);
      
      // 手动计算验证
      // E = 207000 MPa (music wire elastic modulus)
      // k_rad = 207000 × 2⁴ / (10.8 × 20 × 6)
      // k_rad = 207000 × 16 / 1296 = 2555.56 N·mm/rad
      // k_deg = k_rad × (π/180) = 44.6 N·mm/deg
      const E = 207000;
      const d = 2.0;
      const Dm = 20.0;
      const Na = 6;
      const k_rad_expected = (E * Math.pow(d, 4)) / (10.8 * Dm * Na);
      const k_deg_expected = k_rad_expected * (PI / 180);
      
      expect(k_deg).toBeCloseTo(k_deg_expected, 1);
      expect(k_deg).toBeGreaterThan(40); // 约 44.6 N·mm/deg
      expect(k_deg).toBeLessThan(50);
    });

    it('should NOT use old incorrect formula with 64', () => {
      // 旧的错误公式会给出更小的值
      const E = 207000;
      const d = 2.0;
      const Dm = 20.0;
      const Na = 6;
      
      // 错误公式 (64)
      const k_wrong = (E * Math.pow(d, 4)) / (64 * Dm * Na) * (PI / 180);
      
      // 正确公式 (10.8)
      const k_correct = calculateTorsionSpringRate(TORSION_SPRING_STANDARD);
      
      // 正确值应该比错误值大约 64/10.8 ≈ 5.93 倍
      expect(k_correct / k_wrong).toBeCloseTo(64 / 10.8, 1);
    });

    it('should use elastic modulus E, not shear modulus G', () => {
      // 扭簧使用 E（约 207000 MPa），不是 G（约 79300 MPa）
      // 如果错误使用 G，刚度会小约 2.6 倍
      const k = calculateTorsionSpringRate(TORSION_SPRING_STANDARD);
      
      // 使用 G 的错误计算
      const G = 79300;
      const d = 2.0;
      const Dm = 20.0;
      const Na = 6;
      const k_with_G = (G * Math.pow(d, 4)) / (10.8 * Dm * Na) * (PI / 180);
      
      // 正确值应该比使用 G 的值大约 207000/79300 ≈ 2.6 倍
      expect(k / k_with_G).toBeCloseTo(207000 / 79300, 1);
    });
  });

  describe('Conical Spring Rate / 锥形弹簧刚度', () => {
    it('should use correct formula: k = Gd⁴/(2Na(D1+D2)(D1²+D2²))', () => {
      const k = calculateConicalSpringRate(CONICAL_SPRING_STANDARD);
      
      // 手动计算验证
      const G = 79300;
      const d = 2.5;
      const D1 = 30.0 - 2.5; // 大端中径 = 27.5
      const D2 = 15.0 - 2.5; // 小端中径 = 12.5
      const Na = 6;
      
      const k_expected = (G * Math.pow(d, 4)) / 
                         (2 * Na * (D1 + D2) * (D1*D1 + D2*D2));
      
      expect(k).toBeCloseTo(k_expected, 2);
    });
  });
});

// ============================================================================
// 2. 应力修正系数测试
// ============================================================================

describe('Stress Correction Factors / 应力修正系数', () => {
  
  describe('Wahl Factor / Wahl 系数', () => {
    it('should match formula: Kw = (4C-1)/(4C-4) + 0.615/C', () => {
      const C = 8; // 典型旋绕比
      const Kw = calculateWahlFactor(C);
      
      const Kw_expected = (4*C - 1) / (4*C - 4) + 0.615 / C;
      
      expect(Kw).toBeCloseTo(Kw_expected, 4);
      expect(Kw).toBeCloseTo(1.184, 2); // C=8 时约 1.184
    });

    it('should increase as C decreases (tighter coils = higher stress)', () => {
      const Kw_C4 = calculateWahlFactor(4);
      const Kw_C8 = calculateWahlFactor(8);
      const Kw_C12 = calculateWahlFactor(12);
      
      expect(Kw_C4).toBeGreaterThan(Kw_C8);
      expect(Kw_C8).toBeGreaterThan(Kw_C12);
    });

    it('should approach 1.0 as C approaches infinity', () => {
      const Kw_large = calculateWahlFactor(100);
      expect(Kw_large).toBeCloseTo(1.0, 1);
    });
  });

  describe('Bergsträsser Factor / Bergsträsser 系数', () => {
    it('should match formula: Kb = (4C+2)/(4C-3)', () => {
      const C = 8;
      const Kb = calculateBergstrasserFactor(C);
      
      const Kb_expected = (4*C + 2) / (4*C - 3);
      
      expect(Kb).toBeCloseTo(Kb_expected, 4);
    });

    it('should be slightly different from Wahl factor', () => {
      const C = 8;
      const Kw = calculateWahlFactor(C);
      const Kb = calculateBergstrasserFactor(C);
      
      // 两者应该接近但不完全相同
      expect(Math.abs(Kw - Kb)).toBeLessThan(0.05);
    });
  });
});

// ============================================================================
// 3. 应力计算测试
// ============================================================================

describe('Stress Calculations / 应力计算', () => {
  
  describe('Shear Stress / 剪切应力', () => {
    it('should match formula: τ = 8FDm/(πd³)', () => {
      const F = 100; // N
      const Dm = 16; // mm
      const d = 2;   // mm
      
      const tau = calculateNominalShearStress(F, Dm, d);
      const tau_expected = (8 * F * Dm) / (PI * Math.pow(d, 3));
      
      expect(tau).toBeCloseTo(tau_expected, 2);
    });
  });

  describe('Bending Stress (Torsion Spring) / 弯曲应力', () => {
    it('should use bending formula with Ki correction', () => {
      const M = 1000; // N·mm
      const Dm = 20;  // mm
      const d = 2;    // mm
      
      const sigma = calculateBendingStress(M, Dm, d);
      
      // Ki = (4C² - C - 1) / (4C(C-1))
      const C = Dm / d;
      const Ki = (4*C*C - C - 1) / (4*C*(C-1));
      const sigma_expected = Ki * (32 * M) / (PI * Math.pow(d, 3));
      
      expect(sigma).toBeCloseTo(sigma_expected, 1);
    });
  });
});

// ============================================================================
// 4. 扭簧高级分析测试
// ============================================================================

describe('Torsion Spring Advanced Analysis / 扭簧高级分析', () => {
  
  const torsionParams = {
    wireDiameter: 2.0,
    meanDiameter: 20.0,
    activeCoils: 6,
    bodyLength: 12.0,
    legLength1: 30.0,
    legLength2: 30.0,
    freeAngle: 90,
    workingAngle: 45,
    materialId: 'music_wire_a' as const,
  };

  describe('Mass Calculation / 质量计算', () => {
    it('should calculate total wire length correctly', () => {
      const result = calculateTorsionMass(torsionParams);
      
      // L_coil = π × Dm × Na = π × 20 × 6 = 376.99 mm
      // L_total = L_coil + L1 + L2 = 376.99 + 30 + 30 = 436.99 mm
      const L_coil_expected = PI * 20 * 6;
      const L_total_expected = L_coil_expected + 30 + 30;
      
      expect(result.totalWireLength).toBeCloseTo(L_total_expected, 1);
    });

    it('should calculate mass using density and volume', () => {
      const result = calculateTorsionMass(torsionParams);
      
      // Volume = (π × d²/4) × L_total
      // Mass = ρ × Volume (ρ = 7850 kg/m³ = 7.85e-6 g/mm³)
      const wireArea = PI * Math.pow(2.0 / 2, 2);
      const density_g_mm3 = 7850 * 1e-6;
      const mass_expected = wireArea * result.totalWireLength * density_g_mm3;
      
      expect(result.totalMass).toBeCloseTo(mass_expected, 2);
    });
  });

  describe('Natural Frequency / 固有频率', () => {
    it('should use k_rad (not k_deg) in frequency calculation', () => {
      const result = calculateTorsionFrequency(torsionParams);
      
      // k_rad = E × d⁴ / (10.8 × Dm × Na)
      // 材料的 E 可能略有不同（206000 vs 207000）
      const E = 206000; // 实际材料库中的值
      const k_rad = (E * Math.pow(2, 4)) / (10.8 * 20 * 6);
      
      // 允许 1% 的误差
      expect(result.torsionalStiffness).toBeCloseTo(k_rad, -1);
    });

    it('should calculate moment of inertia for legs', () => {
      const result = calculateTorsionFrequency(torsionParams);
      
      // J = (1/3) × m_leg × L²
      // 应该有正的转动惯量
      expect(result.momentOfInertia).toBeGreaterThan(0);
    });

    it('should produce reasonable natural frequency', () => {
      const result = calculateTorsionFrequency(torsionParams);
      
      // 典型扭簧固有频率在几十到几百 Hz
      expect(result.naturalFrequency).toBeGreaterThan(10);
      expect(result.naturalFrequency).toBeLessThan(10000);
    });
  });
});

// ============================================================================
// 5. 单位一致性测试
// ============================================================================

describe('Unit Consistency / 单位一致性', () => {
  
  it('compression spring rate should be in N/mm', () => {
    const k = calculateCompressionSpringRate(COMPRESSION_SPRING_STANDARD);
    // 典型压缩弹簧刚度在 1-100 N/mm 范围
    expect(k).toBeGreaterThan(0.1);
    expect(k).toBeLessThan(1000);
  });

  it('torsion spring rate should be in N·mm/deg', () => {
    const k = calculateTorsionSpringRate(TORSION_SPRING_STANDARD);
    // 典型扭簧刚度在 10-1000 N·mm/deg 范围
    expect(k).toBeGreaterThan(1);
    expect(k).toBeLessThan(10000);
  });

  it('stress should be in MPa', () => {
    const tau = calculateNominalShearStress(100, 16, 2);
    // 典型应力在 100-2000 MPa 范围
    expect(tau).toBeGreaterThan(10);
    expect(tau).toBeLessThan(5000);
  });
});

// ============================================================================
// 6. 边界条件测试
// ============================================================================

describe('Boundary Conditions / 边界条件', () => {
  
  it('should handle minimum practical spring index C=4', () => {
    const Kw = calculateWahlFactor(4);
    expect(Kw).toBeGreaterThan(1);
    expect(Kw).toBeLessThan(2);
  });

  it('should handle maximum practical spring index C=16', () => {
    const Kw = calculateWahlFactor(16);
    expect(Kw).toBeGreaterThan(1);
    expect(Kw).toBeLessThan(1.2);
  });

  it('should throw error for invalid spring index C<=1', () => {
    expect(() => calculateWahlFactor(1)).toThrow();
    expect(() => calculateWahlFactor(0.5)).toThrow();
  });
});
