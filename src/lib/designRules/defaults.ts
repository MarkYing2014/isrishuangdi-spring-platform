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
  },

  extension: {
    springIndexPrefMin: 4,
    springIndexPrefMax: 12,
    springIndexVeryLowWarn: 3,
    hookRiskIndexWarn: 6,
    extensionRatioWarn: 0.25,
    extensionRatioHigh: 0.4,
  },

  torsion: {
    springIndexPrefMin: 4,
    springIndexPrefMax: 12,
    springIndexVeryLowWarn: 3,
    deflectionWarnDeg: 90,
    deflectionHighDeg: 180,
    stressWarnMpa: 900,
    stressHighMpa: 1100,
  },

  conical: {
    taperRatioWarn: 2.0,
    taperRatioHigh: 3.0,
    minIndexWarn: 4,
  },

  variablePitch: {
    pitchMinFactorWarn: 1.05,
    pitchLEdSeverity: "warning" as const,
    lengthMismatchWarnRatio: 0.2,
  },
} as const;
