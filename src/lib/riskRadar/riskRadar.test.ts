import { describe, expect, test } from "vitest";

import type { DesignRuleReport } from "@/lib/designRules";
import { radarFromDesignRuleReport } from "@/lib/riskRadar";

function makeReport(args: {
  metrics?: DesignRuleReport["metrics"];
  findings: DesignRuleReport["findings"];
}): DesignRuleReport {
  return {
    summary: { status: "OK" },
    metrics: args.metrics ?? {},
    findings: args.findings,
  };
}

describe("riskRadar V1", () => {
  test("compression: ERROR in engineering => overall HIGH_RISK", () => {
    const report = makeReport({
      findings: [
        {
          id: "COMP_ALLOW_SHEAR_EXCEEDED",
          level: "error",
          titleEn: "Allowable shear exceeded",
          titleZh: "超过许用剪应力",
          detailEn: "util >= 1.0",
          detailZh: "util >= 1.0",
        },
      ],
    });

    const radar = radarFromDesignRuleReport({ springType: "compression", report });

    expect(radar.dimensions.engineering.status).toBe("FAIL");
    expect(radar.overallStatus).toBe("HIGH_RISK");
    expect(radar.summary.score).toBeLessThan(100);
  });

  test("arc: WARNING in manufacturing => overall MANUFACTURING_RISK", () => {
    const report = makeReport({
      findings: [
        {
          id: "ARC_TURN_SPACING_FREE_TIGHT",
          level: "warning",
          titleEn: "Turn spacing is tight in free state",
          titleZh: "自由态圈距偏小",
          detailEn: "p_free <= k·d",
          detailZh: "p_free <= k·d",
        },
      ],
    });

    const radar = radarFromDesignRuleReport({ springType: "arc", report });

    expect(radar.dimensions.manufacturing.status).toBe("WARN");
    expect(radar.dimensions.engineering.status).toBe("OK");
    expect(radar.overallStatus).toBe("MANUFACTURING_RISK");
  });

  test("spiral: strain warning classified as engineering; diameter ratio error classified as manufacturing", () => {
    const report = makeReport({
      findings: [
        {
          id: "SPIRAL_STRAIN_TOO_HIGH",
          level: "warning",
          titleEn: "Max bending strain is notable",
          titleZh: "最大弯曲应变偏高",
          detailEn: "eps > ok",
          detailZh: "eps > ok",
        },
        {
          id: "SPIRAL_DIAMETER_RATIO_BAD",
          level: "error",
          titleEn: "Diameter ratio is outside manufacturable range",
          titleZh: "内外径比超出可制造范围",
          detailEn: "ratio out of range",
          detailZh: "ratio out of range",
        },
      ],
      metrics: {
        eps_max: {
          value: 0.005,
          labelEn: "Estimated max bending strain ε_max",
          labelZh: "估算最大弯曲应变 ε_max",
        },
        diameter_ratio: {
          value: 1.5,
          labelEn: "Diameter ratio Dout/Din",
          labelZh: "内外径比 Dout/Din",
        },
      },
    });

    const radar = radarFromDesignRuleReport({ springType: "spiral", report });

    expect(radar.dimensions.engineering.findings.some((f) => f.ruleId === "SPIRAL_STRAIN_TOO_HIGH")).toBe(true);
    expect(radar.dimensions.manufacturing.findings.some((f) => f.ruleId === "SPIRAL_DIAMETER_RATIO_BAD")).toBe(true);
    expect(radar.overallStatus).toBe("HIGH_RISK");
  });
});
