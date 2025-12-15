import type { AnalysisResult, MaterialInfo, SpiralTorsionGeometry } from "@/lib/stores/springDesignStore";

export type RYG = "GREEN" | "YELLOW" | "RED";

export interface SpiralReportCurvePoint {
  x: number;
  y: number;
}

export interface SpiralReportModel {
  meta: {
    generatedAtISO: string;
    version: "draft_v1";
    language?: "en" | "zh" | "bilingual";
    projectName?: string;
    engineer?: string;
    partNo?: string;
    fatigueCriterion?: "goodman" | "gerber" | "soderberg";
  };

  inputs: {
    geometry: SpiralTorsionGeometry;
    calculatorMaterial: MaterialInfo;

    engineeringMaterial?: {
      materialId: string;
      surface: string;
      reliability: number;
      shotPeened: boolean;
      kPeen?: number;
      shotPeenAssumptions?: string[];
      strengthBasis?: string;
      heatTreatment?: string;
      kThickness?: number;
      kHeatTreatment?: number;
      strengthAssumptions?: string[];
      E_MPa?: number;
      Su_MPa?: number;
      Sy_MPa?: number;
      SePrime_MPa?: number;
    };

    endKt?: {
      innerEndKtType?: string;
      outerEndKtType?: string;
      innerKt?: number;
      outerKt?: number;
      governingKt?: number;
    };

    tolerance?: {
      toleranceT_mm?: number;
      toleranceB_mm?: number;
      toleranceL_mm?: number;
      toleranceE?: number;
      toleranceEMode?: "MPa" | "%";
    };

    closeoutModel?: {
      enableNonlinearCloseout?: boolean;
      thetaContactStartDeg?: number;
      hardeningA?: number;
      hardeningP?: number;
      hardeningFactorLegacy?: number;
    };
  };

  results: {
    springRate_NmmPerDeg?: number;
    maxStress_MPa?: number;
    staticSafetyFactor?: number;

    fatigue: {
      sigmaA_MPa?: number;
      sigmaM_MPa?: number;
      Se_MPa?: number | null;
      Su_MPa?: number | null;
      Sy_MPa?: number | null;
      fatigueSF_Goodman?: number | null;
      fatigueSF_Gerber?: number | null;
      fatigueSF_Soderberg?: number | null;
      utilization_Goodman?: number | null;
      utilization_Gerber?: number | null;
      utilization_Soderberg?: number | null;
      notes?: string[];
    };

    closeout: {
      thetaMaxOverThetaCo?: number | null;
      thetaContactStartUsedDeg?: number | null;
      nonlinearTorqueAtMax_Nmm?: number | null;
    };

    tolerance: {
      kMin?: number;
      kMax?: number;
      TmaxBandMin_Nmm?: number;
      TmaxBandMax_Nmm?: number;
    };
  };

  review?: {
    overall?: RYG;
    staticRYG?: RYG;
    fatigueRYG?: RYG;
    closeoutRYG?: RYG;
    geometryRYG?: RYG;
    messages?: string[];
    staticSF?: number | null;
    fatigueSF?: number | null;
    closeoutRatio?: number | null;
    btRatio?: number | null;
  };

  curves: {
    torqueBand?: {
      nom: SpiralReportCurvePoint[];
      min: SpiralReportCurvePoint[];
      max: SpiralReportCurvePoint[];
    };
    closeout?: {
      linear: SpiralReportCurvePoint[];
      nonlinear: SpiralReportCurvePoint[];
    };
    goodman?: {
      line: SpiralReportCurvePoint[];
      point?: { sigmaM: number; sigmaA: number };
    };
  };
}

export interface BuildSpiralReportModelArgs {
  geometry: SpiralTorsionGeometry;
  calculatorMaterial: MaterialInfo;
  analysisResult: AnalysisResult;

  derived?: {
    governingKt?: number;
    innerKt?: number;
    outerKt?: number;

    sigmaA?: number;
    sigmaM?: number;
    Se?: number | null;
    SePrime?: number | null;
    Su?: number | null;
    Sy?: number | null;
    kPeen?: number | null;
    strengthBasis?: string;
    heatTreatment?: string;
    kThickness?: number;
    kHeatTreatment?: number;
    strengthAssumptions?: string[];
    shotPeenAssumptions?: string[];
    fatigueSafetyFactor?: number | null;
    fatigueCriteria?: {
      goodman: number | null;
      gerber: number | null;
      soderberg: number | null;
    };

    kMin?: number;
    kMax?: number;
    TMaxBandMin?: number;
    TMaxBandMax?: number;

    torqueBandCurve?: Array<{ thetaDeg: number; torqueNom: number; torqueMin: number; torqueMax: number }>;
    curveCloseoutLinear?: Array<{ thetaDeg: number; torque: number }>;
    curveCloseoutNonlinear?: Array<{ thetaDeg: number; torque: number }>;

    thetaContactStartUsed?: number;
    nonlinearTorqueAtMax?: number | null;

    review?: {
      overall: RYG;
      staticRYG: RYG;
      fatigueRYG: RYG;
      closeoutRYG: RYG;
      geometryRYG: RYG;
      messages: string[];
      staticSF?: number | null;
      fatigueSF?: number | null;
      closeoutRatio?: number | null;
      btRatio?: number | null;
    };
  };

  extras?: {
    reportMeta?: {
      language?: "en" | "zh" | "bilingual";
      projectName?: string;
      engineer?: string;
      partNo?: string;
      fatigueCriterion?: "goodman" | "gerber" | "soderberg";
    };
    innerEndKtType?: string;
    outerEndKtType?: string;
    toleranceT?: number;
    toleranceB?: number;
    toleranceL?: number;
    toleranceE?: number;
    toleranceEMode?: "MPa" | "%";
    hardeningFactor?: number;
    enableNonlinearCloseout?: boolean;
    thetaContactStartDeg?: number;
    hardeningA?: number;
    hardeningP?: number;

    engineeringMaterial?: {
      materialId: string;
      surface: string;
      reliability: number;
      shotPeened: boolean;
      strengthBasis?: string;
      heatTreatment?: string;
    };
  };
}

export function buildSpiralReportModel(args: BuildSpiralReportModelArgs): SpiralReportModel {
  const { geometry, calculatorMaterial, analysisResult, derived, extras } = args;

  const notes: string[] = [];
  if (extras?.engineeringMaterial?.shotPeened) {
    notes.push("Shot peening enabled");
    if (derived?.kPeen !== undefined && derived.kPeen !== null) {
      notes.push(`k_peen=${Number(derived.kPeen).toFixed(3)} (applied to Se')`);
    }
    notes.push("Assumption: shot peening modeled via k_peen on Se' only; residual stress/mean stress shift not modeled.");
  }

  const goodmanSF = derived?.fatigueCriteria?.goodman ?? derived?.fatigueSafetyFactor ?? null;
  const gerberSF = derived?.fatigueCriteria?.gerber ?? null;
  const soderbergSF = derived?.fatigueCriteria?.soderberg ?? null;

  const utilGoodman = goodmanSF !== null && goodmanSF > 0 ? 1 / goodmanSF : null;
  const utilGerber = gerberSF !== null && gerberSF > 0 ? 1 / gerberSF : null;
  const utilSoderberg = soderbergSF !== null && soderbergSF > 0 ? 1 / soderbergSF : null;

  const torqueBand = derived?.torqueBandCurve
    ? {
        nom: derived.torqueBandCurve.map((p) => ({ x: p.thetaDeg, y: p.torqueNom })),
        min: derived.torqueBandCurve.map((p) => ({ x: p.thetaDeg, y: p.torqueMin })),
        max: derived.torqueBandCurve.map((p) => ({ x: p.thetaDeg, y: p.torqueMax })),
      }
    : undefined;

  const closeout = derived?.curveCloseoutLinear && derived?.curveCloseoutNonlinear
    ? {
        linear: derived.curveCloseoutLinear.map((p) => ({ x: p.thetaDeg, y: p.torque })),
        nonlinear: derived.curveCloseoutNonlinear.map((p) => ({ x: p.thetaDeg, y: p.torque })),
      }
    : undefined;

  const goodmanLine =
    derived?.Se !== undefined && derived?.Su !== undefined && derived.Se !== null && derived.Su !== null
      ? [
          { x: 0, y: derived.Se },
          { x: derived.Su, y: 0 },
        ]
      : undefined;

  return {
    meta: {
      generatedAtISO: new Date().toISOString(),
      version: "draft_v1",
      language: extras?.reportMeta?.language,
      projectName: extras?.reportMeta?.projectName,
      engineer: extras?.reportMeta?.engineer,
      partNo: extras?.reportMeta?.partNo,
      fatigueCriterion: extras?.reportMeta?.fatigueCriterion,
    },
    inputs: {
      geometry,
      calculatorMaterial,
      engineeringMaterial: extras?.engineeringMaterial
        ? {
            ...extras.engineeringMaterial,
            kPeen: derived?.kPeen ?? undefined,
            shotPeenAssumptions: derived?.shotPeenAssumptions,
            strengthBasis: extras.engineeringMaterial.strengthBasis,
            heatTreatment: extras.engineeringMaterial.heatTreatment,
            kThickness: derived?.kThickness,
            kHeatTreatment: derived?.kHeatTreatment,
            strengthAssumptions: derived?.strengthAssumptions,
            Su_MPa: derived?.Su ?? undefined,
            Sy_MPa: derived?.Sy ?? undefined,
            SePrime_MPa: derived?.SePrime ?? undefined,
          }
        : undefined,
      endKt: {
        innerEndKtType: extras?.innerEndKtType,
        outerEndKtType: extras?.outerEndKtType,
        innerKt: derived?.innerKt,
        outerKt: derived?.outerKt,
        governingKt: derived?.governingKt,
      },
      tolerance: {
        toleranceT_mm: extras?.toleranceT,
        toleranceB_mm: extras?.toleranceB,
        toleranceL_mm: extras?.toleranceL,
        toleranceE: extras?.toleranceE,
        toleranceEMode: extras?.toleranceEMode,
      },
      closeoutModel: {
        enableNonlinearCloseout: extras?.enableNonlinearCloseout,
        thetaContactStartDeg: extras?.thetaContactStartDeg,
        hardeningA: extras?.hardeningA,
        hardeningP: extras?.hardeningP,
        hardeningFactorLegacy: extras?.hardeningFactor,
      },
    },
    results: {
      springRate_NmmPerDeg: analysisResult.springRate,
      maxStress_MPa: analysisResult.maxStress,
      staticSafetyFactor: analysisResult.staticSafetyFactor,
      fatigue: {
        sigmaA_MPa: derived?.sigmaA,
        sigmaM_MPa: derived?.sigmaM,
        Se_MPa: derived?.Se ?? null,
        Su_MPa: derived?.Su ?? null,
        Sy_MPa: derived?.Sy ?? null,
        fatigueSF_Goodman: goodmanSF,
        fatigueSF_Gerber: gerberSF,
        fatigueSF_Soderberg: soderbergSF,
        utilization_Goodman: utilGoodman,
        utilization_Gerber: utilGerber,
        utilization_Soderberg: utilSoderberg,
        notes,
      },
      closeout: {
        thetaMaxOverThetaCo:
          geometry.closeOutAngle > 0 ? geometry.maxWorkingAngle / geometry.closeOutAngle : null,
        thetaContactStartUsedDeg: derived?.thetaContactStartUsed ?? null,
        nonlinearTorqueAtMax_Nmm: derived?.nonlinearTorqueAtMax ?? null,
      },
      tolerance: {
        kMin: derived?.kMin,
        kMax: derived?.kMax,
        TmaxBandMin_Nmm: derived?.TMaxBandMin,
        TmaxBandMax_Nmm: derived?.TMaxBandMax,
      },
    },
    review: derived?.review
      ? {
          overall: derived.review.overall,
          staticRYG: derived.review.staticRYG,
          fatigueRYG: derived.review.fatigueRYG,
          closeoutRYG: derived.review.closeoutRYG,
          geometryRYG: derived.review.geometryRYG,
          messages: derived.review.messages,
          staticSF: derived.review.staticSF,
          fatigueSF: derived.review.fatigueSF,
          closeoutRatio: derived.review.closeoutRatio,
          btRatio: derived.review.btRatio,
        }
      : undefined,
    curves: {
      torqueBand,
      closeout,
      goodman: {
        line: goodmanLine ?? [],
        point:
          derived?.sigmaM !== undefined && derived?.sigmaA !== undefined
            ? { sigmaM: derived.sigmaM, sigmaA: derived.sigmaA }
            : undefined,
      },
    },
  };
}
