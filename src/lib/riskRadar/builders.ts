import type { ArcSpringInput } from "@/lib/arcSpring";
import type { CompressionSpringEds } from "@/lib/eds/engineeringDefinition";
import type { ResolveCompressionNominalResult } from "@/lib/eds/compressionResolver";
import type { AnalysisResult, SpiralTorsionGeometry } from "@/lib/stores/springDesignStore";

import type { ArcSpringRuleContext } from "@/lib/designRules/arcSpringRules";
import type { CompressionRuleContext } from "@/lib/designRules/compressionRules";

import { buildArcSpringDesignRuleReport } from "@/lib/designRules/arcSpringRules";
import { buildCompressionDesignRuleReport } from "@/lib/designRules/compressionRules";
import { buildSpiralSpringDesignRuleReport } from "@/lib/designRules/spiralSpringRules";

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
