import type { DesignRuleFinding, DesignRuleReport } from "@/lib/designRules";

import type {
  EngineeringRiskRadar,
  RiskDimension,
  RiskDimensionKey,
  RiskFinding,
  RiskFindingLevel,
  RiskMetric,
  RiskRadarSpringType,
} from "./types";
import { computeOverallStatus, overallLabel, scoreDimension, scoreOverall, summarizeDimensionStatus } from "./scoring";

function toRiskFindingLevel(level: DesignRuleFinding["level"]): RiskFindingLevel {
  switch (level) {
    case "error":
      return "ERROR";
    case "warning":
      return "WARNING";
    case "info":
      return "INFO";
  }
}

function pickTitle(f: DesignRuleFinding): { en: string; zh: string } {
  return { en: f.titleEn, zh: f.titleZh };
}

function pickExplanation(f: DesignRuleFinding): { en: string; zh: string } {
  return { en: f.detailEn ?? f.titleEn, zh: f.detailZh ?? f.titleZh };
}

function classifyDimension(args: {
  springType: RiskRadarSpringType;
  findingId: string;
}): RiskDimensionKey {
  const id = args.findingId;

  if (args.springType === "spiral") {
    if (id.startsWith("SPIRAL_STRAIN") || id.startsWith("SPIRAL_THETA") || id.startsWith("SPIRAL_THETA_RATIO")) {
      return "engineering";
    }
    if (id.startsWith("SPIRAL_DIAMETER_RATIO") || id.startsWith("SPIRAL_WT_RATIO") || id.startsWith("SPIRAL_TURNS")) {
      return "manufacturing";
    }
  }

  if (args.springType === "arc") {
    if (id.startsWith("ARC_TURN_SPACING") || id.startsWith("ARC_WIRE_LENGTH") || id.startsWith("ARC_TURNS")) {
      return "manufacturing";
    }
    if (id.startsWith("ARC_GEOM_INVALID") || id.startsWith("ARC_SPRING_INDEX")) {
      return "engineering";
    }
  }

  if (args.springType === "compression") {
    if (id.startsWith("COMP_SOLID_HEIGHT") || id.includes("COIL_BIND") || id.includes("PITCH") || id.includes("WIRE_LENGTH")) {
      return "manufacturing";
    }
    if (id.startsWith("COMP_ALLOW_SHEAR") || id.startsWith("COMP_SPRING_INDEX") || id.startsWith("COMP_MATERIAL") || id.startsWith("COMP_GEOM")) {
      return "engineering";
    }
  }

  if (args.springType === "extension") {
    if (id.startsWith("EXT_GEOM_INVALID")) return "engineering";
    if (id.startsWith("EXT_INDEX") || id.includes("HOOK") || id.includes("TENSION")) return "manufacturing";
    if (id.startsWith("EXT_MAX_EXTENSION") || id.startsWith("EXT_INITIAL_TENSION")) return "engineering";
  }

  if (args.springType === "torsion") {
    if (id.startsWith("TOR_GEOM_INVALID")) return "engineering";
    if (id.startsWith("TOR_ARM") || id.startsWith("TOR_INDEX")) return "manufacturing";
    if (id.startsWith("TOR_DEFLECTION") || id.startsWith("TOR_STRESS") || id.startsWith("TOR_ANGLE")) return "engineering";
  }

  if (args.springType === "conical") {
    if (id.startsWith("CON_GEOM_INVALID")) return "engineering";
    if (id.startsWith("CON_BIND") || id.startsWith("CON_BIND_AT_FREE")) return "manufacturing";
    if (id.startsWith("CON_TAPER") || id.startsWith("CON_MIN_INDEX") || id.startsWith("CON_GUIDANCE") || id.startsWith("CON_NEAR_STAGE") || id.startsWith("CON_NONLINEAR")) {
      return "manufacturing";
    }
  }

  if (args.springType === "variablePitch") {
    if (id.startsWith("VP_GEOM_INVALID")) return "engineering";
    if (id.startsWith("VP_PITCH") || id.startsWith("VP_SUM_LENGTH") || id.startsWith("VP_NEAR_CONTACT_STAGE")) return "manufacturing";
    if (id.startsWith("VP_OVER_SOLID") || id.startsWith("VP_NEAR_SOLID")) return "manufacturing";
  }

  if (args.springType === "wave") {
    if (id.startsWith("WAVE_E")) return "engineering";
    if (id.startsWith("WAVE_M")) return "manufacturing";
    if (id.startsWith("WAVE_Q")) return "quality";
  }

  if (id.includes("READ_ONLY")) return "quality";

  return "engineering";
}

function toRiskFinding(args: {
  springType: RiskRadarSpringType;
  finding: DesignRuleFinding;
}): RiskFinding {
  const { finding } = args;
  return {
    ruleId: finding.id,
    level: toRiskFindingLevel(finding.level),
    dimension: classifyDimension({ springType: args.springType, findingId: finding.id }),
    title: pickTitle(finding),
    explanation: pickExplanation(finding),
    evidence: undefined,
    recommendation:
      finding.suggestionEn || finding.suggestionZh
        ? {
            en: finding.suggestionEn ?? "",
            zh: finding.suggestionZh ?? "",
          }
        : undefined,
  };
}

function toRiskMetric(args: {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  reference?: string;
}): RiskMetric {
  return {
    id: args.id,
    label: args.label,
    value: args.value,
    unit: args.unit,
    reference: args.reference,
  };
}

function metricLabel(m: { labelEn?: string; labelZh?: string }): string {
  const en = m.labelEn ?? "";
  const zh = m.labelZh ?? "";
  if (en && zh && en !== zh) return `${en} / ${zh}`;
  return en || zh || "Metric";
}

function dimensionMetricsFromReport(args: {
  springType: RiskRadarSpringType;
  report: DesignRuleReport;
  dimension: RiskDimensionKey;
}): RiskMetric[] {
  const m = args.report.metrics;

  const pick = (...keys: string[]) =>
    keys
      .map((k) => {
        const v = m[k];
        if (!v) return null;
        return toRiskMetric({
          id: k,
          label: metricLabel(v),
          value: v.value,
          unit: v.unit,
          reference: v.noteEn ?? v.noteZh,
        });
      })
      .filter((x): x is RiskMetric => x !== null);

  if (args.springType === "arc") {
    if (args.dimension === "manufacturing") {
      return pick("n_total", "p_free", "p_work", "wire_length_est");
    }
    if (args.dimension === "engineering") {
      return pick("n_total");
    }
  }

  if (args.springType === "compression") {
    if (args.dimension === "engineering") {
      return pick("spring_index", "shear_stress", "shear_utilization", "sf_static", "slenderness");
    }
    if (args.dimension === "manufacturing") {
      return pick("pitch_est", "solid_height_est", "coil_bind_clearance", "deflection", "length_at_deflection");
    }
  }

  if (args.springType === "spiral") {
    if (args.dimension === "engineering") {
      return pick("eps_max", "theta_work", "theta_ratio", "allowable_stress_derived");
    }
    if (args.dimension === "manufacturing") {
      return pick("diameter_ratio", "width_thickness_ratio", "n_eff");
    }
  }

  if (args.springType === "extension") {
    if (args.dimension === "engineering") {
      return pick("extension_ratio", "initial_tension", "pre_extension");
    }
    if (args.dimension === "manufacturing") {
      return pick("spring_index");
    }
  }

  if (args.springType === "torsion") {
    if (args.dimension === "engineering") {
      return pick("theta_work", "angle_utilization", "max_stress");
    }
    if (args.dimension === "manufacturing") {
      return pick("spring_index", "arm_ratio_min");
    }
  }

  if (args.springType === "conical") {
    if (args.dimension === "engineering") {
      return pick("slenderness", "c_min");
    }
    if (args.dimension === "manufacturing") {
      return pick("taper_ratio", "solid_height_est", "k_local", "collapsed_coils");
    }
  }

  if (args.springType === "variablePitch") {
    if (args.dimension === "engineering") {
      return pick("segment_count");
    }
    if (args.dimension === "manufacturing") {
      return pick(
        "min_pitch",
        "first_contact_deflection",
        "full_solid_deflection",
        "sum_pitch_length"
      );
    }
  }

  return [];
}

export function radarFromDesignRuleReport(args: {
  springType: RiskRadarSpringType;
  report: DesignRuleReport;
}): EngineeringRiskRadar {
  const findings = args.report.findings.map((f) => toRiskFinding({ springType: args.springType, finding: f }));

  const byDim = (dim: RiskDimensionKey) => findings.filter((f) => f.dimension === dim);

  const buildDim = (dimension: RiskDimensionKey): RiskDimension => {
    const dimFindings = byDim(dimension);
    const metrics = dimensionMetricsFromReport({
      springType: args.springType,
      report: args.report,
      dimension,
    });

    const status = summarizeDimensionStatus(dimFindings);
    const score = scoreDimension(dimFindings);

    return {
      status,
      score,
      metrics,
      findings: dimFindings,
    };
  };

  const dimensions = {
    engineering: buildDim("engineering"),
    manufacturing: buildDim("manufacturing"),
    quality: buildDim("quality"),
  };

  const overallStatus = computeOverallStatus(dimensions);
  const score = scoreOverall(dimensions);

  const keyRisks = findings
    .filter((f) => f.level !== "INFO")
    .sort((a, b) => {
      const pa = a.level === "ERROR" ? 2 : a.level === "WARNING" ? 1 : 0;
      const pb = b.level === "ERROR" ? 2 : b.level === "WARNING" ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return a.ruleId.localeCompare(b.ruleId);
    })
    .slice(0, 3)
    .map((f) => f.title.en);

  return {
    springType: args.springType,
    overallStatus,
    dimensions,
    summary: {
      score,
      label: overallLabel(overallStatus),
      keyRisks,
    },
    findings,
  };
}
