"use client";

import { useEffect, useMemo, useState } from "react";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { DesignRuleReport } from "@/lib/designRules";
import {
  buildCompressionRiskRadar,
  buildConicalRiskRadar,
  buildDiskRiskRadar,
  buildExtensionRiskRadar,
  buildSpiralRiskRadar,
  buildTorsionRiskRadar,
  radarFromDesignRuleReport,
} from "@/lib/riskRadar";
import type { EngineeringRiskRadar, RadarOverallStatus } from "@/lib/riskRadar";
import { useSpringDesignStore } from "@/lib/stores/springDesignStore";

import { LanguageText, useLanguage } from "@/components/language-context";

function overallStatusLabel(status: RadarOverallStatus): { en: string; zh: string } {
  switch (status) {
    case "ENGINEERING_OK":
      return { en: "Engineering OK", zh: "工程通过" };
    case "MANUFACTURING_RISK":
      return { en: "Manufacturing Risk", zh: "制造风险" };
    case "HIGH_RISK":
      return { en: "High Risk", zh: "高风险" };
  }
}

function springTypeLabel(geometryType: string | null | undefined): { en: string; zh: string } {
  switch (geometryType) {
    case "compression":
      return { en: "Compression Spring", zh: "压缩弹簧" };
    case "extension":
      return { en: "Extension Spring", zh: "拉伸弹簧" };
    case "torsion":
      return { en: "Torsion Spring", zh: "扭转弹簧" };
    case "conical":
      return { en: "Conical Spring", zh: "圆锥弹簧" };
    case "spiralTorsion":
      return { en: "Spiral Torsion Spring", zh: "螺旋扭簧" };
    case "disk":
      return { en: "Disk / Belleville Spring", zh: "碟形弹簧" };
    default:
      return { en: "Unknown Spring", zh: "未知弹簧" };
  }
}

function overallStatusTone(status: RadarOverallStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case "ENGINEERING_OK":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    case "MANUFACTURING_RISK":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    case "HIGH_RISK":
      return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
  }
}

function dimensionBadgeTone(status: "OK" | "WARN" | "FAIL"): { bg: string; text: string; border: string } {
  switch (status) {
    case "OK":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    case "WARN":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    case "FAIL":
      return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
  }
}

function buildDemoRadar(): EngineeringRiskRadar {
  const report: DesignRuleReport = {
    summary: { status: "OK" },
    metrics: {},
    findings: [
      {
        id: "COMP_SPRING_INDEX_LOW",
        level: "warning",
        titleEn: "Spring index is low",
        titleZh: "旋绕比偏低",
        detailEn: "C is near lower limit.",
        detailZh: "旋绕比 C 接近下限。",
      },
      {
        id: "COMP_COIL_BIND_MARGIN_LOW",
        level: "warning",
        titleEn: "Coil bind margin is low",
        titleZh: "贴圈余量偏小",
        detailEn: "Clearance to solid height is small.",
        detailZh: "并紧余量偏小。",
      },
      {
        id: "COMP_PITCH_EST_TIGHT",
        level: "warning",
        titleEn: "Pitch estimate is tight",
        titleZh: "估算节距偏紧",
        detailEn: "Pitch/spacing may be difficult to manufacture.",
        detailZh: "节距/间隙可能偏难制造。",
      },
      {
        id: "COMP_READ_ONLY_WARN_READ_ONLY",
        level: "warning",
        titleEn: "Quality exposure requires review",
        titleZh: "质量风险需复核",
        detailEn: "Validate tolerance / inspection plan before release.",
        detailZh: "发布前建议复核公差/检验方案。",
      },
      {
        id: "COMP_RULES_READ_ONLY",
        level: "info",
        titleEn: "Rules are read-only",
        titleZh: "规则为只读旁路",
        detailEn: "This panel evaluates inputs/results and does not change geometry, calculation, or 3D.",
        detailZh: "该面板仅分析输入与结果，不会修改几何/计算/3D。",
      },
    ],
  };

  return radarFromDesignRuleReport({ springType: "compression", report });
}

export function HomeRiskRadar() {
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);

  const geometry = useSpringDesignStore((s) => s.geometry);
  const analysisResult = useSpringDesignStore((s) => s.analysisResult);
  const eds = useSpringDesignStore((s) => s.eds);
  const resolved = useSpringDesignStore((s) => s.resolved);

  useEffect(() => {
    setMounted(true);
  }, []);

  const radar = useMemo((): EngineeringRiskRadar => {
    if (!geometry) return buildDemoRadar();

    if (geometry.type === "compression") {
      const compressionEds = eds?.type === "compression" ? eds : null;
      const compressionResolved =
        resolved?.type === "compression"
          ? {
              design: resolved.design,
              issues: resolved.issues,
            }
          : null;

      return buildCompressionRiskRadar({
        eds: compressionEds,
        resolved: compressionResolved,
        analysisResult,
      });
    }

    if (geometry.type === "extension") {
      return buildExtensionRiskRadar({
        geometry,
        analysisResult,
      });
    }

    if (geometry.type === "torsion") {
      return buildTorsionRiskRadar({
        geometry,
        analysisResult,
      });
    }

    if (geometry.type === "conical") {
      return buildConicalRiskRadar({
        geometry,
        analysisResult,
      });
    }

    if (geometry.type === "spiralTorsion") {
      return buildSpiralRiskRadar({
        geometry,
        analysisResult,
      });
    }

    if (geometry.type === "disk") {
      return buildDiskRiskRadar({
        design: geometry,
        analysisResult,
      });
    }

    return buildDemoRadar();
  }, [geometry, analysisResult, eds, resolved]);

  const isDemo = !geometry;
  const currentSpringTypeLabel = useMemo(() => {
    if (!geometry) return null;
    return springTypeLabel(geometry.type);
  }, [geometry]);

  const chartData = useMemo(() => {
    const labels =
      language === "en"
        ? { engineering: "Engineering", manufacturing: "Manufacturing", quality: "Quality" }
        : { engineering: "工程", manufacturing: "制造", quality: "质量" };

    return [
      { subject: labels.engineering, score: radar.dimensions.engineering.score, fullMark: 100 },
      { subject: labels.manufacturing, score: radar.dimensions.manufacturing.score, fullMark: 100 },
      { subject: labels.quality, score: radar.dimensions.quality.score, fullMark: 100 },
    ];
  }, [language, radar]);

  const overallTone = overallStatusTone(radar.overallStatus);
  const overallLabel = overallStatusLabel(radar.overallStatus);

  const keyFindings = useMemo(() => {
    const rank = (level: EngineeringRiskRadar["findings"][number]["level"]) =>
      level === "ERROR" ? 2 : level === "WARNING" ? 1 : 0;

    return radar.findings
      .filter((f) => f.level !== "INFO")
      .slice()
      .sort((a, b) => rank(b.level) - rank(a.level))
      .slice(0, 3);
  }, [radar]);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-muted/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">
            <LanguageText
              en={isDemo ? "Radar demo" : `Radar (live: ${currentSpringTypeLabel?.en ?? "Unknown Spring"})`}
              zh={isDemo ? "雷达示例" : `雷达（当前设计：${currentSpringTypeLabel?.zh ?? "未知弹簧"}）`}
            />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <LanguageText
              en={
                isDemo
                  ? "Showing a demo radar. Run a calculator to see live risk."
                  : `Built from the current ${currentSpringTypeLabel?.en ?? "spring"} in SpringDesignStore.`
              }
              zh={
                isDemo
                  ? "当前显示示例雷达。请在任一计算器计算后查看实时风险。"
                  : `基于 SpringDesignStore 的当前设计（${currentSpringTypeLabel?.zh ?? "未知弹簧"}）生成。`
              }
            />
          </p>
        </div>

        <div
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${overallTone.bg} ${overallTone.text} ${overallTone.border}`}
        >
          <LanguageText en={`Score: ${radar.summary.score}`} zh={`得分：${radar.summary.score}`} />
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <LanguageText en="Overall" zh="总体" />
          </p>
          <p className="mt-1 text-base font-semibold">
            <LanguageText en={overallLabel.en} zh={overallLabel.zh} />
          </p>

          <div className="mt-4 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [Number(value).toFixed(0), language === "en" ? "Score" : "得分"]}
                />
                <Radar
                  dataKey="score"
                  stroke={radar.overallStatus === "HIGH_RISK" ? "#e11d48" : radar.overallStatus === "MANUFACTURING_RISK" ? "#f59e0b" : "#10b981"}
                  fill={radar.overallStatus === "HIGH_RISK" ? "#fb7185" : radar.overallStatus === "MANUFACTURING_RISK" ? "#fbbf24" : "#34d399"}
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid gap-2 text-sm">
            {(
              [
                {
                  key: "engineering" as const,
                  label: <LanguageText en="Engineering" zh="工程" />,
                  status: radar.dimensions.engineering.status,
                },
                {
                  key: "manufacturing" as const,
                  label: <LanguageText en="Manufacturing" zh="制造" />,
                  status: radar.dimensions.manufacturing.status,
                },
                {
                  key: "quality" as const,
                  label: <LanguageText en="Quality" zh="质量" />,
                  status: radar.dimensions.quality.status,
                },
              ] as const
            ).map((row) => {
              const tone = dimensionBadgeTone(row.status);
              return (
                <div key={row.key} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tone.bg} ${tone.text} ${tone.border}`}>
                    {row.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <LanguageText en="Key risks" zh="关键风险" />
          </p>
          <div className="mt-2 space-y-2 text-sm">
            {keyFindings.length === 0 ? (
              <p className="text-muted-foreground">
                <LanguageText en="No notable risks." zh="暂无显著风险。" />
              </p>
            ) : (
              keyFindings.map((f, idx) => (
                <p key={f.ruleId}>
                  <span className="font-semibold">{idx + 1}.</span>{" "}
                  <LanguageText en={f.title.en} zh={f.title.zh} />
                </p>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <LanguageText en="What makes this different" zh="差异点" />
          </p>
          <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
            <p>
              <LanguageText en="Calculates + Engineering Risk Radar" zh="不仅计算，更提供工程风险雷达" />
            </p>
            <p>
              <LanguageText en="3D visualization + manufacturing insight" zh="3D 可视化 + 制造可行性洞察" />
            </p>
            <p>
              <LanguageText en="PPAP / DFM ready outputs" zh="面向 PPAP / DFM 的输出" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
