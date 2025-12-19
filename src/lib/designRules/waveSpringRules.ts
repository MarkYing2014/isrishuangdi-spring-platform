/**
 * Wave Spring Design Rules
 * 波形弹簧设计规则
 * 
 * Rule ID Prefixes:
 * - E* -> Engineering dimension
 * - M* -> Manufacturing dimension
 * - Q* -> Quality dimension
 */

import type { DesignRuleFinding, DesignRuleMetric, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import type { WaveSpringInput, WaveSpringResult } from "@/lib/waveSpring/math";
import { calculateWaveSpring, DEFAULT_WAVE_SPRING_MATERIAL } from "@/lib/waveSpring/math";

// ============================================================================
// Rule Thresholds
// ============================================================================

const WAVE_SPRING_THRESHOLDS = {
  // Engineering thresholds
  minSpringIndex: 4,
  maxSpringIndex: 20,
  maxStressRatio: 0.8,
  minDeflectionRatio: 0.1,
  maxDeflectionRatio: 0.85,
  
  // Manufacturing thresholds
  minWavesPerTurn: 2,
  maxWavesPerTurn: 8,
  minTurns: 1,
  maxTurns: 20,
  minThicknessRatio: 3,
  maxThicknessRatio: 20,
  minRadialWallRatio: 0.1,
  maxRadialWallRatio: 0.45,
};

// ============================================================================
// Build Design Rule Report
// ============================================================================

export function buildWaveSpringDesignRuleReport(params: {
  input: WaveSpringInput | null | undefined;
  result?: WaveSpringResult | null;
}): DesignRuleReport {
  const { input, result: providedResult } = params;
  const findings: DesignRuleFinding[] = [];
  const metrics: Record<string, DesignRuleMetric> = {};

  // Handle null/undefined input
  if (!input) {
    findings.push({
      id: "WAVE_NO_INPUT",
      level: "error",
      titleEn: "No wave spring input provided",
      titleZh: "未提供波形弹簧输入",
    });
    return {
      summary: { status: summarizeRuleStatus(findings) },
      metrics,
      findings,
    };
  }

  const g = input.geometry;
  const result = providedResult ?? calculateWaveSpring(input);

  // Add errors from calculation
  for (const err of result.errors) {
    findings.push({
      id: "WAVE_E1_GEOM_INVALID",
      level: "error",
      titleEn: "Invalid geometry",
      titleZh: "几何无效",
      detailEn: err,
      detailZh: err,
    });
  }

  // Add warnings from calculation
  for (const warn of result.warnings) {
    findings.push({
      id: "WAVE_M1_CALC_WARNING",
      level: "warning",
      titleEn: "Calculation warning",
      titleZh: "计算警告",
      detailEn: warn,
      detailZh: warn,
    });
  }

  // ========== Metrics ==========
  
  const meanDiameter = (g.od + g.id) / 2;
  const radialSpace = (g.od - g.id) / 2;
  // Spring Index for wave spring: Dm/t (using thickness, not radial wall)
  // This is analogous to D/d for coil springs
  const springIndex = meanDiameter / g.thickness_t;
  const thicknessRatio = g.radialWall_b / g.thickness_t;
  const radialWallRatio = g.radialWall_b / radialSpace;
  // Solid height estimate (conservative): Nt * t
  // Note: actual solid height depends on wave geometry/contact
  const solidHeight = g.turns_Nt * g.thickness_t;
  
  // Check for invalid free height (must be > solid height)
  if (g.freeHeight_Hf <= solidHeight) {
    findings.push({
      id: "WAVE_E0_HEIGHT_INVALID",
      level: "error",
      titleEn: `Free height (${g.freeHeight_Hf.toFixed(2)}mm) <= solid height estimate (${solidHeight.toFixed(2)}mm)`,
      titleZh: `自由高度 (${g.freeHeight_Hf.toFixed(2)}mm) <= 固态高度估算 (${solidHeight.toFixed(2)}mm)`,
      detailEn: "Free height must be greater than solid height for spring to function",
      detailZh: "自由高度必须大于固态高度才能使弹簧正常工作",
    });
    // Return early with error - deflectionRatio would be invalid
    return {
      summary: { status: summarizeRuleStatus(findings) },
      metrics,
      findings,
    };
  }
  
  const deflectionRatio = result.travel_mm / (g.freeHeight_Hf - solidHeight);
  const yieldStrength = DEFAULT_WAVE_SPRING_MATERIAL.yieldStrength_MPa;
  const stressRatio = result.stressMax_MPa / yieldStrength;

  metrics["meanDiameter"] = {
    value: meanDiameter.toFixed(2),
    unit: "mm",
    labelEn: "Mean Diameter Dm",
    labelZh: "中径 Dm",
  };

  metrics["springIndex"] = {
    value: springIndex.toFixed(2),
    labelEn: "Geometry Slenderness (Dm/t)",
    labelZh: "几何细长比 (Dm/t)",
  };

  metrics["thicknessRatio"] = {
    value: thicknessRatio.toFixed(2),
    labelEn: "b/t Ratio",
    labelZh: "b/t 比",
  };

  metrics["springRate"] = {
    value: result.springRate_Nmm.toFixed(3),
    unit: "N/mm",
    labelEn: "Spring Rate k",
    labelZh: "刚度 k",
  };

  metrics["loadAtWorkingHeight"] = {
    value: result.loadAtWorkingHeight_N.toFixed(2),
    unit: "N",
    labelEn: "Load @ Working Height",
    labelZh: "工作高度载荷",
  };

  metrics["travel"] = {
    value: result.travel_mm.toFixed(2),
    unit: "mm",
    labelEn: "Travel (Hf - Hw)",
    labelZh: "行程 (Hf - Hw)",
  };

  metrics["stressMax"] = {
    value: result.stressMax_MPa.toFixed(1),
    unit: "MPa",
    labelEn: "Max Stress σ",
    labelZh: "最大应力 σ",
  };

  metrics["stressRatio"] = {
    value: (stressRatio * 100).toFixed(1),
    unit: "%",
    labelEn: "Stress / Yield",
    labelZh: "应力/屈服比",
  };

  metrics["deflectionRatio"] = {
    value: (deflectionRatio * 100).toFixed(1),
    unit: "%",
    labelEn: "Deflection / Available",
    labelZh: "变形/可用比",
  };

  // ===== Crest-to-crest contact geometry (multi-turn wave spring) =====
  const pitchPerTurn = g.freeHeight_Hf / g.turns_Nt; // P
  const targetAmplitude = 0.5 * pitchPerTurn;        // A_target so that 2A = P
  const contactRatio = (2 * targetAmplitude) / pitchPerTurn; // always 1 with this definition

  metrics["pitchPerTurn"] = {
    value: pitchPerTurn.toFixed(3),
    unit: "mm/turn",
    labelEn: "Helix Pitch per Turn P",
    labelZh: "每圈螺旋节距 P",
  };

  metrics["targetWaveAmplitude"] = {
    value: targetAmplitude.toFixed(3),
    unit: "mm",
    labelEn: "Target Wave Amplitude A (crest-to-crest)",
    labelZh: "目标波幅 A（波峰顶住）",
  };

  metrics["crestContactRatio"] = {
    value: (contactRatio * 100).toFixed(1),
    unit: "%",
    labelEn: "Crest Contact Ratio (2A/P)",
    labelZh: "顶住比 (2A/P)",
  };

  // ========== Engineering Rules (E*) ==========

  // E1: Geometry validation (already handled above)

  // E2: Spring index check
  if (springIndex < WAVE_SPRING_THRESHOLDS.minSpringIndex) {
    findings.push({
      id: "WAVE_E2_INDEX_LOW",
      level: "error",
      titleEn: `Spring index too low (${springIndex.toFixed(1)} < ${WAVE_SPRING_THRESHOLDS.minSpringIndex})`,
      titleZh: `弹簧指数过低 (${springIndex.toFixed(1)} < ${WAVE_SPRING_THRESHOLDS.minSpringIndex})`,
      suggestionEn: "Increase mean diameter or reduce radial wall width",
      suggestionZh: "增加中径或减小径向壁宽",
    });
  } else if (springIndex > WAVE_SPRING_THRESHOLDS.maxSpringIndex) {
    findings.push({
      id: "WAVE_E2_INDEX_HIGH",
      level: "warning",
      titleEn: `Spring index high (${springIndex.toFixed(1)} > ${WAVE_SPRING_THRESHOLDS.maxSpringIndex})`,
      titleZh: `弹簧指数偏高 (${springIndex.toFixed(1)} > ${WAVE_SPRING_THRESHOLDS.maxSpringIndex})`,
      suggestionEn: "Reduce mean diameter or increase radial wall width",
      suggestionZh: "减小中径或增加径向壁宽",
    });
  }

  // E3: Stress ratio check
  if (stressRatio > WAVE_SPRING_THRESHOLDS.maxStressRatio) {
    findings.push({
      id: "WAVE_E3_STRESS_HIGH",
      level: "error",
      titleEn: `Stress exceeds ${WAVE_SPRING_THRESHOLDS.maxStressRatio * 100}% of yield (${(stressRatio * 100).toFixed(1)}%)`,
      titleZh: `应力超过屈服强度的 ${WAVE_SPRING_THRESHOLDS.maxStressRatio * 100}% (${(stressRatio * 100).toFixed(1)}%)`,
      suggestionEn: "Reduce load, increase thickness, or use stronger material",
      suggestionZh: "减小载荷、增加厚度或使用更强材料",
    });
  }

  // E4: Crest-to-crest contact requirement for multi-turn wave springs
  if (g.turns_Nt >= 2) {
    // Multi-turn wave spring should be designed with crest-to-crest contact
    // Geometry builder uses: z = (P/2π)*θ + A*sin(Nw*θ)*s(θ), where s(θ) = (-1)^floor(θ/2π)
    // With A = P/2, adjacent turns touch at wave peaks
    findings.push({
      id: "WAVE_E4_CREST_CONTACT",
      level: "info",
      titleEn: `Multi-turn wave spring designed for crest-to-crest contact (P=${pitchPerTurn.toFixed(2)}mm, A=${targetAmplitude.toFixed(2)}mm)`,
      titleZh: `多圈波形弹簧按波峰顶住设计 (P=${pitchPerTurn.toFixed(2)}mm, A=${targetAmplitude.toFixed(2)}mm)`,
      detailEn: "Continuous helix with alternating wave phase per turn; wave amplitude A = P/2 ensures adjacent turn peaks touch in free state.",
      detailZh: "采用连续螺旋上升并每圈波形交错；波幅 A = P/2，使相邻圈波峰在自由态接触。",
    });
  }

  // ========== Manufacturing Rules (M*) ==========

  // M1: Waves per turn check
  if (g.wavesPerTurn_Nw < WAVE_SPRING_THRESHOLDS.minWavesPerTurn) {
    findings.push({
      id: "WAVE_M1_WAVES_LOW",
      level: "warning",
      titleEn: `Waves per turn too low (${g.wavesPerTurn_Nw} < ${WAVE_SPRING_THRESHOLDS.minWavesPerTurn})`,
      titleZh: `每圈波数过少 (${g.wavesPerTurn_Nw} < ${WAVE_SPRING_THRESHOLDS.minWavesPerTurn})`,
      suggestionEn: "Increase waves per turn for stability",
      suggestionZh: "增加每圈波数以提高稳定性",
    });
  } else if (g.wavesPerTurn_Nw > WAVE_SPRING_THRESHOLDS.maxWavesPerTurn) {
    findings.push({
      id: "WAVE_M1_WAVES_HIGH",
      level: "warning",
      titleEn: `Waves per turn high (${g.wavesPerTurn_Nw} > ${WAVE_SPRING_THRESHOLDS.maxWavesPerTurn})`,
      titleZh: `每圈波数过多 (${g.wavesPerTurn_Nw} > ${WAVE_SPRING_THRESHOLDS.maxWavesPerTurn})`,
      suggestionEn: "Reduce waves per turn for easier manufacturing",
      suggestionZh: "减少每圈波数以便于制造",
    });
  }

  // M2: Thickness ratio check
  if (thicknessRatio < WAVE_SPRING_THRESHOLDS.minThicknessRatio) {
    findings.push({
      id: "WAVE_M2_THICKNESS_RATIO_LOW",
      level: "warning",
      titleEn: `b/t ratio too low (${thicknessRatio.toFixed(1)} < ${WAVE_SPRING_THRESHOLDS.minThicknessRatio})`,
      titleZh: `b/t 比过低 (${thicknessRatio.toFixed(1)} < ${WAVE_SPRING_THRESHOLDS.minThicknessRatio})`,
      suggestionEn: "Increase radial wall width or reduce thickness",
      suggestionZh: "增加径向壁宽或减小厚度",
    });
  } else if (thicknessRatio > WAVE_SPRING_THRESHOLDS.maxThicknessRatio) {
    findings.push({
      id: "WAVE_M2_THICKNESS_RATIO_HIGH",
      level: "warning",
      titleEn: `b/t ratio high (${thicknessRatio.toFixed(1)} > ${WAVE_SPRING_THRESHOLDS.maxThicknessRatio})`,
      titleZh: `b/t 比偏高 (${thicknessRatio.toFixed(1)} > ${WAVE_SPRING_THRESHOLDS.maxThicknessRatio})`,
      suggestionEn: "Reduce radial wall width or increase thickness",
      suggestionZh: "减小径向壁宽或增加厚度",
    });
  }

  // M3: Turn count check
  if (g.turns_Nt > WAVE_SPRING_THRESHOLDS.maxTurns) {
    findings.push({
      id: "WAVE_M3_TURNS_HIGH",
      level: "warning",
      titleEn: `Turn count high (${g.turns_Nt} > ${WAVE_SPRING_THRESHOLDS.maxTurns})`,
      titleZh: `圈数过多 (${g.turns_Nt} > ${WAVE_SPRING_THRESHOLDS.maxTurns})`,
      suggestionEn: "Consider reducing turns or using nested design",
      suggestionZh: "考虑减少圈数或使用嵌套设计",
    });
  }

  // ========== Quality Rules (Q*) ==========

  // Q1: Deflection ratio check (near solid)
  if (deflectionRatio > WAVE_SPRING_THRESHOLDS.maxDeflectionRatio) {
    findings.push({
      id: "WAVE_Q1_NEAR_SOLID",
      level: "warning",
      titleEn: `Working deflection near solid height (${(deflectionRatio * 100).toFixed(1)}% of available)`,
      titleZh: `工作变形接近并紧高度 (可用的 ${(deflectionRatio * 100).toFixed(1)}%)`,
      suggestionEn: "Reduce working deflection or increase free height",
      suggestionZh: "减小工作变形或增加自由高度",
    });
  }

  return {
    summary: { status: summarizeRuleStatus(findings) },
    metrics,
    findings,
  };
}
