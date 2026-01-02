/**
 * Die Spring Design Rules
 * 模具弹簧设计规则
 * 
 * Engineering / Manufacturing / Quality rules for rectangular wire die springs
 */

import type {
  DesignRuleReport,
  DesignRuleFinding,
  DesignRuleMetric,
} from "./types";
import { summarizeRuleStatus } from "./types";
// Import legacy types from barrel export (maintains backward compatibility)
import type { DieSpringInput, LegacyDieSpringResult } from "@/lib/dieSpring";
import { DIE_SPRING_MATERIALS } from "@/lib/dieSpring";

// Alias for backward compatibility
type DieSpringResult = LegacyDieSpringResult;

// ============================================================================
// Thresholds
// ============================================================================

const DIE_SPRING_THRESHOLDS = {
  // Spring index
  minSpringIndex: 3,
  maxSpringIndex: 12,

  // Stress ratio
  warnStressRatio: 0.7,
  maxStressRatio: 0.85,

  // b/t ratio
  minBtRatio: 1.5,
  maxBtRatio: 4.5,

  // Compression ratio (material-dependent, using conservative values)
  warnCompressionRatio: 0.25,
  maxCompressionRatio: 0.35,

  // Buckling (slenderness ratio)
  bucklingRiskRatio: 3.0,

  // Temperature load loss
  warnTempLoadLoss: 10,

  // Installation clearances (mm)
  minHoleClearance: 0.5,      // Hole Dia - OD >= 0.5mm (min)
  recommendedHoleClearance: 1.0,  // Recommended 1.0mm for die/mold use
  minRodClearance: 0.3,       // ID - Rod Dia >= 0.3mm (min)
  recommendedRodClearance: 0.8,   // Recommended 0.8mm

  // Solid height safety
  minSolidHeightMargin: 0.5,  // Working length should be > solid height + margin

  // Preload recommendation
  minPreloadRatio: 0.05,      // Preload >= 5% of max load recommended
  recommendedPreloadRatio: 0.10,  // 10% recommended
};

// ============================================================================
// Main Builder
// ============================================================================

export function buildDieSpringDesignRuleReport(
  input: DieSpringInput | null,
  result: DieSpringResult | null
): DesignRuleReport {
  const metrics: Record<string, DesignRuleMetric> = {};
  const findings: DesignRuleFinding[] = [];

  if (!input || !result) {
    return {
      summary: { status: "OK" },
      metrics,
      findings,
    };
  }

  if (!result.ok) {
    // Add errors from calculation
    if (result && 'errors' in result && Array.isArray(result.errors)) {
      for (const err of result.errors) {
        findings.push({
          id: "DIE_E0_CALC_ERROR",
          level: "error",
          titleEn: err,
          titleZh: err,
        });
      }
    }
    return {
      summary: { status: summarizeRuleStatus(findings) },
      metrics,
      findings,
    };
  }

  const g = input.geometry;
  const mat = DIE_SPRING_MATERIALS[input.material];

  // ========== Metrics ==========

  metrics["outerDiameter"] = {
    value: g.od_mm.toFixed(2),
    unit: "mm",
    labelEn: "Outer Diameter OD",
    labelZh: "外径 OD",
  };

  metrics["meanDiameter"] = {
    value: result.meanDiameter_mm.toFixed(2),
    unit: "mm",
    labelEn: "Mean Diameter Dm",
    labelZh: "中径 Dm",
  };

  metrics["equivalentWireDiameter"] = {
    value: result.equivalentWireDiameter_mm.toFixed(3),
    unit: "mm",
    labelEn: "Equivalent Wire Diameter d_eq",
    labelZh: "等效线径 d_eq",
  };

  metrics["springIndex"] = {
    value: result.springIndex.toFixed(2),
    labelEn: "Spring Index (Dm/t)",
    labelZh: "弹簧指数 (Dm/t)",
  };

  metrics["btRatio"] = {
    value: (g.wire_b_mm / g.wire_t_mm).toFixed(2),
    labelEn: "b/t Ratio",
    labelZh: "b/t 比",
  };

  metrics["springRate"] = {
    value: result.springRate_Nmm.toFixed(3),
    unit: "N/mm",
    labelEn: "Spring Rate k",
    labelZh: "刚度 k",
  };

  metrics["loadAtWorking"] = {
    value: result.loadAtWorking_N.toFixed(2),
    unit: "N",
    labelEn: "Load @ Working Length",
    labelZh: "工作长度载荷",
  };

  metrics["travel"] = {
    value: result.travel_mm.toFixed(2),
    unit: "mm",
    labelEn: "Travel (L0 - Lw)",
    labelZh: "行程 (L0 - Lw)",
  };

  metrics["stress"] = {
    value: result.stress_MPa.toFixed(1),
    unit: "MPa",
    labelEn: "Max Stress σ",
    labelZh: "最大应力 σ",
  };

  metrics["stressRatio"] = {
    value: (result.stressRatio * 100).toFixed(1),
    unit: "%",
    labelEn: "Stress / Yield",
    labelZh: "应力/屈服比",
  };

  metrics["compressionRatio"] = {
    value: (result.compressionRatio * 100).toFixed(1),
    unit: "%",
    labelEn: "Compression Ratio",
    labelZh: "压缩比",
  };

  metrics["slendernessRatio"] = {
    value: result.slendernessRatio.toFixed(2),
    labelEn: "Slenderness (L0/Dm)",
    labelZh: "细长比 (L0/Dm)",
  };

  if (result.tempLoadLossPct !== undefined) {
    metrics["tempLoadLoss"] = {
      value: result.tempLoadLossPct.toFixed(1),
      unit: "%",
      labelEn: "Temperature Load Loss",
      labelZh: "温度载荷损失",
    };
  }

  if (result.deratedLoad_N !== undefined) {
    metrics["deratedLoad"] = {
      value: result.deratedLoad_N.toFixed(2),
      unit: "N",
      labelEn: "Derated Load",
      labelZh: "降额载荷",
    };
  }

  // ========== Engineering Rules (E*) ==========

  // E1: Geometry validity (handled in math.ts validation)

  // E2: Spring index check
  if (result.springIndex < DIE_SPRING_THRESHOLDS.minSpringIndex) {
    findings.push({
      id: "DIE_E2_INDEX_LOW",
      level: "warning",
      titleEn: `Spring index too low (${result.springIndex.toFixed(1)} < ${DIE_SPRING_THRESHOLDS.minSpringIndex})`,
      titleZh: `弹簧指数过低 (${result.springIndex.toFixed(1)} < ${DIE_SPRING_THRESHOLDS.minSpringIndex})`,
      suggestionEn: "Increase mean diameter or reduce wire thickness",
      suggestionZh: "增加中径或减小线材厚度",
    });
  } else if (result.springIndex > DIE_SPRING_THRESHOLDS.maxSpringIndex) {
    findings.push({
      id: "DIE_E2_INDEX_HIGH",
      level: "warning",
      titleEn: `Spring index high (${result.springIndex.toFixed(1)} > ${DIE_SPRING_THRESHOLDS.maxSpringIndex})`,
      titleZh: `弹簧指数偏高 (${result.springIndex.toFixed(1)} > ${DIE_SPRING_THRESHOLDS.maxSpringIndex})`,
      suggestionEn: "Reduce mean diameter or increase wire thickness",
      suggestionZh: "减小中径或增加线材厚度",
    });
  }

  // E3: Stress ratio check
  if (result.stressRatio > DIE_SPRING_THRESHOLDS.maxStressRatio) {
    findings.push({
      id: "DIE_E3_STRESS_HIGH",
      level: "error",
      titleEn: `Stress exceeds ${DIE_SPRING_THRESHOLDS.maxStressRatio * 100}% of yield (${(result.stressRatio * 100).toFixed(1)}%)`,
      titleZh: `应力超过屈服强度的 ${DIE_SPRING_THRESHOLDS.maxStressRatio * 100}% (${(result.stressRatio * 100).toFixed(1)}%)`,
      suggestionEn: "Reduce load, increase wire size, or use stronger material",
      suggestionZh: "减小载荷、增加线材尺寸或使用更强材料",
    });
  } else if (result.stressRatio > DIE_SPRING_THRESHOLDS.warnStressRatio) {
    findings.push({
      id: "DIE_E3_STRESS_WARN",
      level: "warning",
      titleEn: `Stress ratio high (${(result.stressRatio * 100).toFixed(1)}% > ${DIE_SPRING_THRESHOLDS.warnStressRatio * 100}%)`,
      titleZh: `应力比偏高 (${(result.stressRatio * 100).toFixed(1)}% > ${DIE_SPRING_THRESHOLDS.warnStressRatio * 100}%)`,
      suggestionEn: "Consider reducing load or increasing wire size",
      suggestionZh: "考虑减小载荷或增加线材尺寸",
    });
  }

  // ========== Manufacturing Rules (M*) ==========

  // M1: b/t ratio check
  const btRatio = g.wire_b_mm / g.wire_t_mm;
  if (btRatio < DIE_SPRING_THRESHOLDS.minBtRatio) {
    findings.push({
      id: "DIE_M1_BT_LOW",
      level: "warning",
      titleEn: `b/t ratio too low (${btRatio.toFixed(2)} < ${DIE_SPRING_THRESHOLDS.minBtRatio})`,
      titleZh: `b/t 比过低 (${btRatio.toFixed(2)} < ${DIE_SPRING_THRESHOLDS.minBtRatio})`,
      suggestionEn: "Increase wire width or reduce thickness",
      suggestionZh: "增加线材宽度或减小厚度",
    });
  } else if (btRatio > DIE_SPRING_THRESHOLDS.maxBtRatio) {
    findings.push({
      id: "DIE_M1_BT_HIGH",
      level: "warning",
      titleEn: `b/t ratio high (${btRatio.toFixed(2)} > ${DIE_SPRING_THRESHOLDS.maxBtRatio})`,
      titleZh: `b/t 比偏高 (${btRatio.toFixed(2)} > ${DIE_SPRING_THRESHOLDS.maxBtRatio})`,
      suggestionEn: "Reduce wire width or increase thickness",
      suggestionZh: "减小线材宽度或增加厚度",
    });
  }

  // M2: Compression ratio check
  if (result.compressionRatio > DIE_SPRING_THRESHOLDS.maxCompressionRatio) {
    findings.push({
      id: "DIE_M2_COMPRESSION_HIGH",
      level: "error",
      titleEn: `Compression ratio exceeds ${DIE_SPRING_THRESHOLDS.maxCompressionRatio * 100}% (${(result.compressionRatio * 100).toFixed(1)}%)`,
      titleZh: `压缩比超过 ${DIE_SPRING_THRESHOLDS.maxCompressionRatio * 100}% (${(result.compressionRatio * 100).toFixed(1)}%)`,
      suggestionEn: "Reduce travel or increase free length",
      suggestionZh: "减小行程或增加自由长度",
    });
  } else if (result.compressionRatio > DIE_SPRING_THRESHOLDS.warnCompressionRatio) {
    findings.push({
      id: "DIE_M2_COMPRESSION_WARN",
      level: "warning",
      titleEn: `Compression ratio high (${(result.compressionRatio * 100).toFixed(1)}% > ${DIE_SPRING_THRESHOLDS.warnCompressionRatio * 100}%)`,
      titleZh: `压缩比偏高 (${(result.compressionRatio * 100).toFixed(1)}% > ${DIE_SPRING_THRESHOLDS.warnCompressionRatio * 100}%)`,
      suggestionEn: "Consider reducing travel",
      suggestionZh: "考虑减小行程",
    });
  }

  // M3: Buckling risk check
  const hasGuide = input.operating?.holeDiameter_mm || input.operating?.rodDiameter_mm;
  if (result.slendernessRatio > DIE_SPRING_THRESHOLDS.bucklingRiskRatio && !hasGuide) {
    findings.push({
      id: "DIE_M3_BUCKLING_RISK",
      level: "warning",
      titleEn: `Buckling risk: L0/Dm = ${result.slendernessRatio.toFixed(2)} > ${DIE_SPRING_THRESHOLDS.bucklingRiskRatio} without guide`,
      titleZh: `屈曲风险: L0/Dm = ${result.slendernessRatio.toFixed(2)} > ${DIE_SPRING_THRESHOLDS.bucklingRiskRatio} 且无导向`,
      suggestionEn: "Use guide rod or hole, or reduce free length",
      suggestionZh: "使用导向杆或导向孔，或减小自由长度",
    });
  }

  // ========== Quality Rules (Q*) ==========

  // Q1: Temperature load loss check
  if (result.tempLoadLossPct !== undefined && result.tempLoadLossPct > DIE_SPRING_THRESHOLDS.warnTempLoadLoss) {
    findings.push({
      id: "DIE_Q1_TEMP_LOSS_HIGH",
      level: "warning",
      titleEn: `Temperature load loss ${result.tempLoadLossPct.toFixed(1)}% > ${DIE_SPRING_THRESHOLDS.warnTempLoadLoss}%`,
      titleZh: `温度载荷损失 ${result.tempLoadLossPct.toFixed(1)}% > ${DIE_SPRING_THRESHOLDS.warnTempLoadLoss}%`,
      suggestionEn: "Consider using higher temperature rated material",
      suggestionZh: "考虑使用更高温度等级的材料",
    });
  }

  // Q2: Temperature exceeds material rating (already checked in math.ts)
  if (input.operating?.temperature_C && input.operating.temperature_C > mat.maxTemperature_C) {
    findings.push({
      id: "DIE_Q2_TEMP_EXCEED",
      level: "error",
      titleEn: `Temperature ${input.operating.temperature_C}°C exceeds material limit ${mat.maxTemperature_C}°C`,
      titleZh: `温度 ${input.operating.temperature_C}°C 超过材料极限 ${mat.maxTemperature_C}°C`,
      suggestionEn: "Use higher temperature rated material or reduce operating temperature",
      suggestionZh: "使用更高温度等级的材料或降低工作温度",
    });
  }

  // ========== Installation Rules (I*) ==========

  // I1: Hole clearance check
  if (input.operating?.holeDiameter_mm) {
    const holeClearance = input.operating.holeDiameter_mm - g.od_mm;

    metrics["holeClearance"] = {
      value: holeClearance.toFixed(2),
      unit: "mm",
      labelEn: "Hole Clearance (Hole - OD)",
      labelZh: "孔间隙 (孔径 - OD)",
    };

    if (holeClearance < 0) {
      findings.push({
        id: "DIE_I1_HOLE_INTERFERENCE",
        level: "error",
        titleEn: `Hole interference: OD ${g.od_mm}mm > Hole ${input.operating.holeDiameter_mm}mm`,
        titleZh: `孔干涉: OD ${g.od_mm}mm > 孔径 ${input.operating.holeDiameter_mm}mm`,
        suggestionEn: "Increase hole diameter or reduce spring OD",
        suggestionZh: "增加孔径或减小弹簧外径",
      });
    } else if (holeClearance < DIE_SPRING_THRESHOLDS.minHoleClearance) {
      findings.push({
        id: "DIE_I1_HOLE_TIGHT",
        level: "error",
        titleEn: `Hole clearance too small: ${holeClearance.toFixed(2)}mm < ${DIE_SPRING_THRESHOLDS.minHoleClearance}mm`,
        titleZh: `孔间隙过小: ${holeClearance.toFixed(2)}mm < ${DIE_SPRING_THRESHOLDS.minHoleClearance}mm`,
        suggestionEn: "Risk of friction, heat build-up, and premature failure. Increase clearance.",
        suggestionZh: "存在摩擦、发热和早期失效风险。增加间隙。",
      });
    } else if (holeClearance < DIE_SPRING_THRESHOLDS.recommendedHoleClearance) {
      findings.push({
        id: "DIE_I1_HOLE_WARN",
        level: "warning",
        titleEn: `Hole clearance below recommended: ${holeClearance.toFixed(2)}mm < ${DIE_SPRING_THRESHOLDS.recommendedHoleClearance}mm`,
        titleZh: `孔间隙低于推荐值: ${holeClearance.toFixed(2)}mm < ${DIE_SPRING_THRESHOLDS.recommendedHoleClearance}mm`,
        suggestionEn: "Consider increasing clearance for die/mold applications",
        suggestionZh: "模具应用建议增加间隙",
      });
    }
  }

  // I2: Rod clearance check
  if (input.operating?.rodDiameter_mm) {
    const innerDiameter = g.od_mm - 2 * g.wire_b_mm;  // ID = OD - 2*b
    const rodClearance = innerDiameter - input.operating.rodDiameter_mm;

    metrics["innerDiameter"] = {
      value: innerDiameter.toFixed(2),
      unit: "mm",
      labelEn: "Inner Diameter ID",
      labelZh: "内径 ID",
    };

    metrics["rodClearance"] = {
      value: rodClearance.toFixed(2),
      unit: "mm",
      labelEn: "Rod Clearance (ID - Rod)",
      labelZh: "杆间隙 (ID - 杆径)",
    };

    if (rodClearance < 0) {
      findings.push({
        id: "DIE_I2_ROD_INTERFERENCE",
        level: "error",
        titleEn: `Rod interference: Rod ${input.operating.rodDiameter_mm}mm > ID ${innerDiameter.toFixed(2)}mm`,
        titleZh: `杆干涉: 杆径 ${input.operating.rodDiameter_mm}mm > ID ${innerDiameter.toFixed(2)}mm`,
        suggestionEn: "Reduce rod diameter or increase spring ID",
        suggestionZh: "减小杆径或增加弹簧内径",
      });
    } else if (rodClearance < DIE_SPRING_THRESHOLDS.minRodClearance) {
      findings.push({
        id: "DIE_I2_ROD_TIGHT",
        level: "error",
        titleEn: `Rod clearance too small: ${rodClearance.toFixed(2)}mm < ${DIE_SPRING_THRESHOLDS.minRodClearance}mm`,
        titleZh: `杆间隙过小: ${rodClearance.toFixed(2)}mm < ${DIE_SPRING_THRESHOLDS.minRodClearance}mm`,
        suggestionEn: "Risk of binding and wear. Increase clearance.",
        suggestionZh: "存在卡死和磨损风险。增加间隙。",
      });
    } else if (rodClearance < DIE_SPRING_THRESHOLDS.recommendedRodClearance) {
      findings.push({
        id: "DIE_I2_ROD_WARN",
        level: "warning",
        titleEn: `Rod clearance below recommended: ${rodClearance.toFixed(2)}mm < ${DIE_SPRING_THRESHOLDS.recommendedRodClearance}mm`,
        titleZh: `杆间隙低于推荐值: ${rodClearance.toFixed(2)}mm < ${DIE_SPRING_THRESHOLDS.recommendedRodClearance}mm`,
        suggestionEn: "Consider increasing clearance for reliable operation",
        suggestionZh: "建议增加间隙以确保可靠运行",
      });
    }
  }

  // I3: Solid height check - working length must be > solid height
  if (result.solidHeight_mm > 0) {
    metrics["solidHeight"] = {
      value: result.solidHeight_mm.toFixed(2),
      unit: "mm",
      labelEn: "Solid Height Hs",
      labelZh: "固高 Hs",
    };

    const solidMargin = g.workingLength_mm - result.solidHeight_mm;

    if (solidMargin < 0) {
      findings.push({
        id: "DIE_I3_SOLID_EXCEED",
        level: "error",
        titleEn: `Working length ${g.workingLength_mm}mm < Solid height ${result.solidHeight_mm.toFixed(2)}mm`,
        titleZh: `工作长度 ${g.workingLength_mm}mm < 固高 ${result.solidHeight_mm.toFixed(2)}mm`,
        suggestionEn: "Spring will be compressed to solid. Reduce travel or increase free length.",
        suggestionZh: "弹簧将被压至固高。减小行程或增加自由长度。",
      });
    } else if (solidMargin < DIE_SPRING_THRESHOLDS.minSolidHeightMargin) {
      findings.push({
        id: "DIE_I3_SOLID_CLOSE",
        level: "warning",
        titleEn: `Working length very close to solid height (margin: ${solidMargin.toFixed(2)}mm)`,
        titleZh: `工作长度非常接近固高 (余量: ${solidMargin.toFixed(2)}mm)`,
        suggestionEn: "Risk of coil clash. Consider increasing margin.",
        suggestionZh: "存在线圈碰撞风险。建议增加余量。",
      });
    }
  }

  // I4: Zero preload warning (informational)
  // Note: We don't have explicit preload input, but we can check if working length is very close to free length
  const preloadRatio = result.travel_mm / g.freeLength_mm;
  if (preloadRatio < DIE_SPRING_THRESHOLDS.minPreloadRatio) {
    findings.push({
      id: "DIE_I4_LOW_PRELOAD",
      level: "info",
      titleEn: `Very low preload (${(preloadRatio * 100).toFixed(1)}% deflection). Consider adding preload.`,
      titleZh: `预载很低 (${(preloadRatio * 100).toFixed(1)}% 变形)。建议增加预载。`,
      suggestionEn: "Die springs work best with 5-10% preload to avoid initial stress concentration",
      suggestionZh: "模具弹簧建议 5-10% 预载以避免初始应力集中",
    });
  }

  // Add warnings from calculation
  if (result && 'warnings' in result && Array.isArray(result.warnings)) {
    for (const warn of result.warnings) {
      findings.push({
        id: "DIE_CALC_WARNING",
        level: "warning",
        titleEn: warn,
        titleZh: warn,
      });
    }
  }

  return {
    summary: { status: summarizeRuleStatus(findings) },
    metrics,
    findings,
  };
}
