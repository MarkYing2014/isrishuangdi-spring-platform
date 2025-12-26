export const designRulesDefaults = {
  arc: {
    nWarn: 20,
    nHigh: 30,
    kGap: 1.05,
    wireLenWarnMm: 1000,
    wireLenHighMm: 2000,
    springIndexPrefMin: 4,
    springIndexPrefMax: 12,
    springIndexLowWarn: 4,
    springIndexVeryLowWarn: 3,
    pWorkLEdSeverity: "warning" as const,
  },

  compression: {
    springIndexPrefMin: 4,
    springIndexPrefMax: 12,
    springIndexVeryLowWarn: 3,
    sfWarn: 1.5,
    sfFail: 1.2,
    coilBindClearanceFactor: 0.1,
    slendernessWarn: 4,
    slendernessHigh: 6,
    stressWarnMpa: 900,
    stressHighMpa: 1100,
    allowShearUtilWarn: 0.9,
    allowShearUtilFail: 1.0,
    naturalFreqWarnHz: 20,
  },

  extension: {
    springIndexPrefMin: 4,
    springIndexPrefMax: 12,
    springIndexVeryLowWarn: 3,
    hookRiskIndexWarn: 6,
    extensionRatioWarn: 0.25,
    extensionRatioHigh: 0.4,
    initialTensionPreExtRatioLow: 0.01,
    initialTensionPreExtRatioHigh: 0.08,
    // 新增：尺寸/成形要求
    activeCoilsMin: 3,                    // Na 最小值
    activeCoilsWarn: 5,                   // Na 推荐最小值
    wireOdRatioMin: 0.05,                 // d/OD 最小值 (太小难成形)
    wireOdRatioMax: 0.25,                 // d/OD 最大值 (太大刚度过高)
    wireOdRatioWarn: 0.20,                // d/OD 警告阈值
    bodyDmRatioMin: 0.5,                  // bodyLength/Dm 最小值
    bodyDmRatioMax: 20,                   // bodyLength/Dm 最大值 (太长不稳定)
    bodyDmRatioWarn: 15,                  // bodyLength/Dm 警告阈值
    freeLengthBodyLengthMin: 1.0,         // freeLengthInsideHooks/bodyLength 最小值
    // 钩型对弹簧指数的要求
    hookIndexRequirements: {
      machine: { min: 4, max: 16 },       // Machine Hook 适用范围
      side: { min: 5, max: 14 },          // Side Hook 需要稍大的 C
      crossover: { min: 4, max: 12 },     // Crossover Hook 适用范围
      extended: { min: 6, max: 16 },      // Extended Hook 需要较大的 C
      doubleLoop: { min: 5, max: 14 },    // Double Loop 需要稍大的 C
    } as Record<string, { min: number; max: number }>,
  },

  torsion: {
    springIndexPrefMin: 4,
    springIndexPrefMax: 12,
    springIndexVeryLowWarn: 3,
    deflectionWarnDeg: 90,
    deflectionHighDeg: 180,
    stressWarnMpa: 900,
    stressHighMpa: 1100,
    angleUtilWarn: 0.8,
    armLengthRatioWarn: 1.0,
    armLengthRatioHigh: 0.75,
  },

  conical: {
    taperRatioWarn: 2.0,
    taperRatioHigh: 3.0,
    minIndexWarn: 4,
    guidanceTaperWarn: 2.5,
    guidanceSlendernessWarn: 4,
    stageProximityD: 1,
  },

  variablePitch: {
    pitchMinFactorWarn: 1.05,
    pitchLEdSeverity: "warning" as const,
    lengthMismatchWarnRatio: 0.2,
    stageProximityD: 1,
    solidProximityD: 2,
  },

  spiral: {
    strain_ok: 0.004,
    strain_warn: 0.006,
    diameter_ratio_ok_min: 2,
    diameter_ratio_ok_max: 6,
    diameter_ratio_fail_max: 10,
    width_thickness_ok_min: 6,
    width_thickness_ok_max: 20,
    width_thickness_fail_min: 4,
    width_thickness_fail_max: 30,
    n_warn: 15,
    n_fail: 25,
    theta_warn_rad: 8 * Math.PI,
    theta_fail_rad: 12 * Math.PI,
  },

  garter: {
    springIndexPrefMin: 4,
    springIndexPrefMax: 15,
    springIndexVeryLowWarn: 3,
    stretchRatioWarn: 0.10,
    stretchRatioHigh: 0.15,
    minCoilCount: 50,
  },
} as const;
