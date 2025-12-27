import type { ArcSpringInput } from "@/lib/arcSpring";
import type { CompressionSpringEds } from "@/lib/eds/engineeringDefinition";
import type { ResolveCompressionNominalResult } from "@/lib/eds/compressionResolver";
import type { DiskSpringDesign } from "@/lib/springTypes";
import type {
  AnalysisResult,
  ConicalGeometry,
  ExtensionGeometry,
  SpiralTorsionGeometry,
  TorsionGeometry,
} from "@/lib/stores/springDesignStore";

import type { ArcSpringRuleContext } from "@/lib/designRules/arcSpringRules";
import type { CompressionRuleContext } from "@/lib/designRules/compressionRules";

import { buildArcSpringDesignRuleReport } from "@/lib/designRules/arcSpringRules";
import { buildCompressionDesignRuleReport } from "@/lib/designRules/compressionRules";
import { buildConicalDesignRuleReport } from "@/lib/designRules/conicalRules";
import { buildExtensionDesignRuleReport } from "@/lib/designRules/extensionRules";
import { buildSpiralSpringDesignRuleReport } from "@/lib/designRules/spiralSpringRules";
import { buildTorsionDesignRuleReport } from "@/lib/designRules/torsionRules";
import { buildVariablePitchCompressionDesignRuleReport } from "@/lib/designRules/variablePitchRules";
import { buildWaveSpringDesignRuleReport } from "@/lib/designRules/waveSpringRules";
import { buildDieSpringDesignRuleReport } from "@/lib/designRules/dieSpringRules";
import { buildDiskSpringDesignRuleReport } from "@/lib/designRules/diskSpringRules";
import type { WaveSpringInput, WaveSpringResult } from "@/lib/waveSpring/math";
import type { DieSpringInput, LegacyDieSpringResult as DieSpringResult } from "@/lib/dieSpring";

import type { EngineeringRiskRadar } from "./types";
import { radarFromDesignRuleReport } from "./fromDesignRules";

export function buildArcRiskRadar(
  input: ArcSpringInput | null | undefined,
  context?: ArcSpringRuleContext
): EngineeringRiskRadar {
  const report = buildArcSpringDesignRuleReport(input, context);
  return radarFromDesignRuleReport({ springType: "arc", report });
}

export function buildCompressionRiskRadar(params: {
  eds?: CompressionSpringEds | null;
  resolved?: ResolveCompressionNominalResult | null;
  analysisResult?: AnalysisResult | null;
  context?: CompressionRuleContext;
}): EngineeringRiskRadar {
  const report = buildCompressionDesignRuleReport(params);
  return radarFromDesignRuleReport({ springType: "compression", report });
}

export function buildSpiralRiskRadar(params: {
  geometry?: SpiralTorsionGeometry | null;
  analysisResult?: AnalysisResult | null;
}): EngineeringRiskRadar {
  const report = buildSpiralSpringDesignRuleReport(params);
  return radarFromDesignRuleReport({ springType: "spiral", report });
}

export function buildExtensionRiskRadar(params: {
  geometry?: ExtensionGeometry | null;
  analysisResult?: AnalysisResult | null;
}): EngineeringRiskRadar {
  const report = buildExtensionDesignRuleReport(params);
  return radarFromDesignRuleReport({ springType: "extension", report });
}

export function buildTorsionRiskRadar(params: {
  geometry?: TorsionGeometry | null;
  analysisResult?: AnalysisResult | null;
}): EngineeringRiskRadar {
  const report = buildTorsionDesignRuleReport(params);
  return radarFromDesignRuleReport({ springType: "torsion", report });
}

export function buildConicalRiskRadar(params: {
  geometry?: ConicalGeometry | null;
  analysisResult?: AnalysisResult | null;
  context?: {
    nonlinearResult?: import("@/lib/springMath").ConicalNonlinearResult | null;
    nonlinearCurve?: import("@/lib/springMath").ConicalNonlinearCurvePoint[] | null;
  };
}): EngineeringRiskRadar {
  const report = buildConicalDesignRuleReport(params);
  return radarFromDesignRuleReport({ springType: "conical", report });
}

export function buildVariablePitchRiskRadar(params: {
  wireDiameter: number;
  meanDiameter: number;
  totalCoils: number;
  freeLength?: number;
  segments: import("@/lib/springMath").VariablePitchSegment[];
  context?: {
    deflection?: number;
  };
}): EngineeringRiskRadar {
  const report = buildVariablePitchCompressionDesignRuleReport(params);
  return radarFromDesignRuleReport({ springType: "variablePitch", report });
}

export function buildWaveRiskRadar(params: {
  input: WaveSpringInput | null | undefined;
  result?: WaveSpringResult | null;
}): EngineeringRiskRadar {
  const report = buildWaveSpringDesignRuleReport(params);
  return radarFromDesignRuleReport({ springType: "wave", report });
}

export function buildDieSpringRiskRadar(params: {
  input: DieSpringInput | null | undefined;
  result?: DieSpringResult | null;
}): EngineeringRiskRadar {
  const report = buildDieSpringDesignRuleReport(params.input ?? null, params.result ?? null);
  return radarFromDesignRuleReport({ springType: "dieSpring", report });
}

export function buildDiskRiskRadar(params: {
  design: DiskSpringDesign | null;
  analysisResult?: AnalysisResult | null;
}): EngineeringRiskRadar {
  const report = buildDiskSpringDesignRuleReport(params);
  return radarFromDesignRuleReport({ springType: "disk", report });
}
