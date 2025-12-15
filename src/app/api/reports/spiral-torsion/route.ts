import { NextRequest, NextResponse } from "next/server";
import {
  Circle,
  Document,
  Line,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createElement } from "react";

import type { SpiralReportModel } from "@/lib/reports/SpiralSpringReportTemplate";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    marginBottom: 16,
    borderBottom: "2px solid #7c3aed",
    paddingBottom: 10,
  },
  headerMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  headerMeta: {
    fontSize: 9,
    color: "#64748b",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5b21b6",
  },
  subtitle: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 4,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 4,
    marginBottom: 8,
  },
  grid2: {
    flexDirection: "row",
  },
  card: {
    flexGrow: 1,
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#f8fafc",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  label: {
    color: "#64748b",
    flexGrow: 1,
  },
  value: {
    fontWeight: "bold",
    textAlign: "right",
    flexShrink: 0,
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 9,
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  message: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 2,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 8,
  },

  chartWrap: {
    marginTop: 6,
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  chartTitle: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 4,
    fontWeight: "bold",
  },
});

function fmt(value: unknown, decimals = 2): string {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

function t(language: SpiralReportModel["meta"]["language"], en: string, zh: string): string {
  if (language === "zh") return zh;
  if (language === "en") return en;
  return `${en} / ${zh}`;
}

function Header({ data, pageTitle }: { data: SpiralReportModel; pageTitle: string }) {
  const lang = data.meta.language ?? "bilingual";
  const project = data.meta.projectName ?? "—";
  const engineer = data.meta.engineer ?? "—";
  const partNo = data.meta.partNo ?? "—";

  return createElement(
    View,
    { style: styles.header },
    createElement(Text, { style: styles.title }, pageTitle),
    createElement(
      Text,
      { style: styles.subtitle },
      `${t(lang, "Generated", "生成")} : ${data.meta.generatedAtISO}`
    ),
    createElement(
      View,
      { style: styles.headerMetaRow },
      createElement(Text, { style: styles.headerMeta }, `${t(lang, "Project", "项目")}: ${project}`),
      createElement(Text, { style: styles.headerMeta }, `${t(lang, "Engineer", "工程师")}: ${engineer}`),
      createElement(Text, { style: styles.headerMeta }, `${t(lang, "Part No.", "零件号")}: ${partNo}`)
    )
  );
}

type XY = { x: number; y: number };

function clampFinite(n: number, fallback: number) {
  return Number.isFinite(n) ? n : fallback;
}

function nearestPoint(points: XY[], xTarget: number): XY | null {
  if (!points.length || !Number.isFinite(xTarget)) return null;
  let best = points[0];
  let bestDx = Math.abs(points[0].x - xTarget);
  for (let i = 1; i < points.length; i++) {
    const dx = Math.abs(points[i].x - xTarget);
    if (dx < bestDx) {
      best = points[i];
      bestDx = dx;
    }
  }
  return best;
}

function linePath(points: XY[], xScale: (x: number) => number, yScale: (y: number) => number): string {
  if (points.length < 2) return "";
  return points
    .map((p, i) => {
      const x = xScale(p.x);
      const y = yScale(p.y);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function SimpleLineChart({
  width,
  height,
  series,
  point,
  annotations,
  legend,
}: {
  width: number;
  height: number;
  series: Array<{ points: XY[]; stroke: string; strokeWidth?: number }>;
  point?: { x: number; y: number; fill: string };
  annotations?: Array<{ x: number; y: number; text: string; fill?: string }>;
  legend?: Array<{ label: string; color: string }>;
}) {
  const padding = { left: 26, right: 10, top: 10, bottom: 18 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allPts = series.flatMap((s) => s.points);
  const xs = allPts.map((p) => p.x);
  const ys = allPts.map((p) => p.y);

  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const yMin = ys.length ? Math.min(...ys) : 0;
  const yMax = ys.length ? Math.max(...ys) : 1;

  const xSpan = Math.max(1e-9, xMax - xMin);
  const ySpan = Math.max(1e-9, yMax - yMin);

  const xScale = (x: number) => padding.left + ((x - xMin) / xSpan) * innerW;
  const yScale = (y: number) => padding.top + innerH - ((y - yMin) / ySpan) * innerH;

  const ptX = point ? xScale(clampFinite(point.x, xMin)) : null;
  const ptY = point ? yScale(clampFinite(point.y, yMin)) : null;

  return createElement(
    View,
    { style: styles.chartWrap },
    createElement(
      Svg,
      { width, height, viewBox: `0 0 ${width} ${height}` },
      createElement(Rect, { x: 0, y: 0, width, height, fill: "#ffffff" }),
      createElement(Line, {
        x1: padding.left,
        y1: padding.top + innerH,
        x2: width - padding.right,
        y2: padding.top + innerH,
        stroke: "#94a3b8",
        strokeWidth: 1,
      }),
      createElement(Line, {
        x1: padding.left,
        y1: padding.top,
        x2: padding.left,
        y2: padding.top + innerH,
        stroke: "#94a3b8",
        strokeWidth: 1,
      }),
      ...series.map((s, idx) =>
        createElement(Path, {
          key: idx,
          d: linePath(s.points, xScale, yScale),
          fill: "none",
          stroke: s.stroke,
          strokeWidth: s.strokeWidth ?? 2,
        })
      ),
      ...(annotations ?? []).flatMap((a, idx) => {
        const ax = xScale(clampFinite(a.x, xMin));
        const ay = yScale(clampFinite(a.y, yMin));
        const fill = a.fill ?? "#0f172a";
        const lines = (a.text ?? "").split("\n").filter((s) => s.trim().length > 0);
        const lineStep = 8;
        const startY = Math.max(8, ay - 4);
        return [
          createElement(Circle, {
            key: `ann-dot-${idx}`,
            cx: ax,
            cy: ay,
            r: 2.5,
            fill,
            stroke: "#ffffff",
            strokeWidth: 1,
          }),
          ...lines.map((line, lineIdx) =>
            createElement(
              Text,
              {
                key: `ann-txt-${idx}-${lineIdx}`,
                x: ax + 5,
                y: startY + lineIdx * lineStep,
                fontSize: 7,
                fill,
              } as any,
              line
            )
          ),
        ];
      }),
      point && ptX !== null && ptY !== null
        ? createElement(Circle, {
            cx: ptX,
            cy: ptY,
            r: 3.5,
            fill: point.fill,
            stroke: "#ffffff",
            strokeWidth: 1.5,
          })
        : null
    ),
    legend?.length
      ? createElement(
          View,
          { style: { flexDirection: "row", flexWrap: "wrap", padding: 6 } as any },
          ...legend.map((l, i) =>
            createElement(
              View,
              {
                key: i,
                style: {
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 10,
                  marginBottom: 2,
                } as any,
              },
              createElement(View, { style: { width: 10, height: 2, backgroundColor: l.color } as any }),
              createElement(Text, { style: { fontSize: 8, color: "#475569", marginLeft: 4 } }, l.label)
            )
          )
        )
      : null
  );
}

function rygColor(ryg?: string): string {
  if (ryg === "GREEN") return "#16a34a";
  if (ryg === "YELLOW") return "#f59e0b";
  return "#dc2626";
}

function kv(label: string, value: string) {
  return createElement(
    View,
    { style: styles.row },
    createElement(Text, { style: styles.label }, label),
    createElement(Text, { style: styles.value }, value)
  );
}

function fatigueCriterionLabel(c?: SpiralReportModel["meta"]["fatigueCriterion"]): string {
  if (c === "gerber") return "Gerber";
  if (c === "soderberg") return "Soderberg";
  return "Goodman";
}

function buildFatigueLimitSeries(fatigue: SpiralReportModel["results"]["fatigue"]): Array<{
  points: XY[];
  stroke: string;
  strokeWidth?: number;
}> {
  const Se = fatigue.Se_MPa ?? null;
  const Su = fatigue.Su_MPa ?? null;
  const Sy = fatigue.Sy_MPa ?? null;

  const isPos = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
  if (!isPos(Se)) return [];

  const series: Array<{ points: XY[]; stroke: string; strokeWidth?: number }> = [];

  if (isPos(Su)) {
    series.push({ points: [{ x: 0, y: Se }, { x: Su, y: 0 }], stroke: "#7c3aed", strokeWidth: 2 });

    const n = 60;
    const gerberPts: XY[] = [];
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * Su;
      const y = Se * (1 - Math.pow(x / Su, 2));
      gerberPts.push({ x, y: Math.max(0, y) });
    }
    series.push({ points: gerberPts, stroke: "#2563eb", strokeWidth: 2 });
  }

  if (isPos(Sy)) {
    series.push({ points: [{ x: 0, y: Se }, { x: Sy, y: 0 }], stroke: "#f59e0b", strokeWidth: 2 });
  }

  return series;
}

function buildTorqueBandAnnotations(
  torqueBand: NonNullable<SpiralReportModel["curves"]["torqueBand"]>,
  thetaMax_deg: number
): Array<{ x: number; y: number; text: string; fill?: string }> {
  const pMin = nearestPoint(torqueBand.min as XY[], thetaMax_deg);
  const pNom = nearestPoint(torqueBand.nom as XY[], thetaMax_deg);
  const pMax = nearestPoint(torqueBand.max as XY[], thetaMax_deg);
  const anns: Array<{ x: number; y: number; text: string; fill?: string }> = [];
  if (pMin) anns.push({ x: pMin.x, y: pMin.y, text: `Tmin=${fmt(pMin.y, 0)}`, fill: "#94a3b8" });
  if (pNom) anns.push({ x: pNom.x, y: pNom.y, text: `Tnom=${fmt(pNom.y, 0)}`, fill: "#2563eb" });
  if (pMax) anns.push({ x: pMax.x, y: pMax.y, text: `Tmax=${fmt(pMax.y, 0)}`, fill: "#0f766e" });
  return anns;
}

function buildCloseoutAnnotations(params: {
  closeout: NonNullable<SpiralReportModel["curves"]["closeout"]>;
  thetaContactStart_deg?: number | null;
  thetaMax_deg: number;
}): Array<{ x: number; y: number; text: string; fill?: string }> {
  const { closeout, thetaContactStart_deg, thetaMax_deg } = params;
  const anns: Array<{ x: number; y: number; text: string; fill?: string }> = [];

  if (typeof thetaContactStart_deg === "number" && Number.isFinite(thetaContactStart_deg)) {
    const pStart = nearestPoint(closeout.nonlinear as XY[], thetaContactStart_deg);
    if (pStart) {
      anns.push({
        x: pStart.x,
        y: pStart.y,
        text: `thetaCs=${fmt(pStart.x, 1)} Tnl=${fmt(pStart.y, 0)}`,
        fill: "#7c3aed",
      });
    }
  }

  const pMaxLin = nearestPoint(closeout.linear as XY[], thetaMax_deg);
  const pMaxNl = nearestPoint(closeout.nonlinear as XY[], thetaMax_deg);
  if (pMaxLin) {
    anns.push({
      x: pMaxLin.x,
      y: pMaxLin.y,
      text: `thetaMax=${fmt(pMaxLin.x, 1)} Tlin=${fmt(pMaxLin.y, 0)}`,
      fill: "#64748b",
    });
  }
  if (pMaxNl) {
    anns.push({
      x: pMaxNl.x,
      y: pMaxNl.y,
      text: `Tnl=${fmt(pMaxNl.y, 0)}`,
      fill: "#7c3aed",
    });
  }

  return anns;
}

function SpiralTorsionReportPDF({ data }: { data: SpiralReportModel }) {
  const g = data.inputs.geometry;
  const r = data.results;
  const review = data.review;
  const curves = data.curves;

  const lang = data.meta.language ?? "bilingual";
  const reportTitle = t(lang, "Spiral Torsion Spring Report", "螺旋扭转弹簧工程报告");

  const selectedCriterion = data.meta.fatigueCriterion ?? "goodman";
  const selectedCriterionLabel = fatigueCriterionLabel(selectedCriterion);

  const titleInputs = t(lang, "Inputs", "输入");
  const titleResults = t(lang, "Results", "结果");
  const titleReview = t(lang, "Engineering Review", "工程评审");
  const titleCurves = t(lang, "Curves", "曲线");

  const title = "Spiral Torsion Spring Report";

  return createElement(
    Document,
    {},
    // Page 1: Cover + Inputs
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(Header, { data, pageTitle: reportTitle }),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, titleInputs),
        createElement(
          View,
          { style: styles.grid2 },
          createElement(
            View,
            { style: styles.card },
            createElement(Text, { style: { fontWeight: "bold", marginBottom: 6 } }, t(lang, "Geometry", "几何")),
            kv("b (mm)", fmt(g.stripWidth, 2)),
            kv("t (mm)", fmt(g.stripThickness, 3)),
            kv("L (mm)", fmt(g.activeLength, 1)),
            kv("Di (mm)", fmt(g.innerDiameter, 1)),
            kv("Do (mm)", fmt(g.outerDiameter, 1)),
            kv("theta0 (deg)", fmt(g.preloadAngle, 1)),
            kv("thetaMin (deg)", fmt(g.minWorkingAngle, 1)),
            kv("thetaMax (deg)", fmt(g.maxWorkingAngle, 1)),
            kv("thetaCo (deg)", fmt(g.closeOutAngle, 1))
          ),
          createElement(
            View,
            { style: [styles.card, { marginLeft: 10 }] },
            createElement(Text, { style: { fontWeight: "bold", marginBottom: 6 } }, t(lang, "Materials", "材料")),
            kv(t(lang, "Calculator", "计算器"), data.inputs.calculatorMaterial.id),
            data.inputs.engineeringMaterial
              ? createElement(
                  View,
                  {},
                  kv(t(lang, "Engineering", "工程"), data.inputs.engineeringMaterial.materialId),
                  kv(t(lang, "Surface", "表面"), data.inputs.engineeringMaterial.surface),
                  kv(t(lang, "Reliability", "可靠度"), fmt(data.inputs.engineeringMaterial.reliability, 2)),
                  kv(t(lang, "Shot peened", "喷丸"), data.inputs.engineeringMaterial.shotPeened ? "Yes" : "No"),
                  data.inputs.engineeringMaterial.kPeen !== undefined
                    ? kv("k_peen", fmt(data.inputs.engineeringMaterial.kPeen, 3))
                    : null,
                  data.inputs.engineeringMaterial.shotPeenAssumptions?.length
                    ? createElement(
                        Text,
                        { style: styles.message },
                        `Shot peen assumptions: ${data.inputs.engineeringMaterial.shotPeenAssumptions.slice(0, 2).join(" | ")}`
                      )
                    : null,
                  data.inputs.engineeringMaterial.strengthBasis
                    ? kv("Strength basis", data.inputs.engineeringMaterial.strengthBasis)
                    : null,
                  data.inputs.engineeringMaterial.heatTreatment
                    ? kv("Heat treatment", data.inputs.engineeringMaterial.heatTreatment)
                    : null,
                  data.inputs.engineeringMaterial.kThickness !== undefined
                    ? kv("k_thickness", fmt(data.inputs.engineeringMaterial.kThickness, 3))
                    : null,
                  data.inputs.engineeringMaterial.kHeatTreatment !== undefined
                    ? kv("k_heat_treatment", fmt(data.inputs.engineeringMaterial.kHeatTreatment, 3))
                    : null,
                  data.inputs.engineeringMaterial.strengthAssumptions?.length
                    ? createElement(
                        Text,
                        { style: styles.message },
                        `Assumptions: ${data.inputs.engineeringMaterial.strengthAssumptions.slice(0, 4).join(" | ")}`
                      )
                    : null,
                  kv("Su (MPa)", fmt(data.inputs.engineeringMaterial.Su_MPa, 0)),
                  kv("Sy (MPa)", fmt(data.inputs.engineeringMaterial.Sy_MPa, 0)),
                  kv("Se' (MPa)", fmt(data.inputs.engineeringMaterial.SePrime_MPa, 0))
                )
              : createElement(Text, { style: styles.message }, t(lang, "No engineering material", "无工程材料"))
          )
        )
      ),
      createElement(
        Text,
        {
          style: styles.footer,
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `${pageNumber} / ${totalPages}`,
          fixed: true,
        } as any,
        ""
      )
    ),

    // Page 2: Results
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(Header, { data, pageTitle: reportTitle }),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, titleResults),
        createElement(
          View,
          { style: styles.grid2 },
          createElement(
            View,
            { style: styles.card },
            createElement(Text, { style: { fontWeight: "bold", marginBottom: 6 } }, t(lang, "Core", "核心")),
            kv("k (N*mm/deg)", fmt(r.springRate_NmmPerDeg, 4)),
            kv("sigmaMax_bending (MPa)", fmt(r.maxStress_MPa, 1)),
            kv("sigmaVM (MPa)", r.maxStress_MPa !== undefined ? fmt(Math.abs(r.maxStress_MPa), 1) : "—"),
            kv("Static SF", fmt(r.staticSafetyFactor, 2)),
            kv("Yield SF (Sy/sigmaMax)", data.review?.staticSF !== null && data.review?.staticSF !== undefined ? fmt(data.review.staticSF, 2) : "—"),
            kv("thetaMax/thetaCo", fmt(r.closeout.thetaMaxOverThetaCo, 2))
          ),
          createElement(
            View,
            { style: [styles.card, { marginLeft: 10 }] },
            createElement(Text, { style: { fontWeight: "bold", marginBottom: 6 } }, t(lang, "Fatigue (Criteria)", "疲劳（多准则）")),
            createElement(
              Text,
              { style: styles.message },
              t(lang, `Selected criterion: ${selectedCriterionLabel}`, `当前选择准则：${selectedCriterionLabel}`)
            ),
            createElement(Text, { style: styles.message }, t(lang, "Review basis: Goodman", "评审默认：Goodman")),
            kv("sigmaA (MPa)", fmt(r.fatigue.sigmaA_MPa, 1)),
            kv("sigmaM (MPa)", fmt(r.fatigue.sigmaM_MPa, 1)),
            kv("Se (MPa)", r.fatigue.Se_MPa === null ? "—" : fmt(r.fatigue.Se_MPa, 0)),
            kv("Su (MPa)", r.fatigue.Su_MPa === null ? "—" : fmt(r.fatigue.Su_MPa, 0)),
            kv("Sy (MPa)", r.fatigue.Sy_MPa === null ? "—" : fmt(r.fatigue.Sy_MPa, 0)),
            kv("SF (Goodman)", r.fatigue.fatigueSF_Goodman === null ? "—" : fmt(r.fatigue.fatigueSF_Goodman, 2)),
            kv("SF (Gerber)", r.fatigue.fatigueSF_Gerber === null ? "—" : fmt(r.fatigue.fatigueSF_Gerber, 2)),
            kv("SF (Soderberg)", r.fatigue.fatigueSF_Soderberg === null ? "—" : fmt(r.fatigue.fatigueSF_Soderberg, 2)),
            kv("Util (Goodman)", r.fatigue.utilization_Goodman === null ? "—" : fmt(r.fatigue.utilization_Goodman, 3)),
            kv("Util (Gerber)", r.fatigue.utilization_Gerber === null ? "—" : fmt(r.fatigue.utilization_Gerber, 3)),
            kv("Util (Soderberg)", r.fatigue.utilization_Soderberg === null ? "—" : fmt(r.fatigue.utilization_Soderberg, 3))
          )
        ),
        createElement(
          View,
          { style: [styles.grid2, { marginTop: 10 }] },
          createElement(
            View,
            { style: styles.card },
            createElement(Text, { style: { fontWeight: "bold", marginBottom: 6 } }, t(lang, "Tolerance", "公差")),
            kv("kMin", fmt(r.tolerance.kMin, 4)),
            kv("kMax", fmt(r.tolerance.kMax, 4)),
            kv("TmaxBandMin (N*mm)", fmt(r.tolerance.TmaxBandMin_Nmm, 1)),
            kv("TmaxBandMax (N*mm)", fmt(r.tolerance.TmaxBandMax_Nmm, 1))
          ),
          createElement(
            View,
            { style: [styles.card, { marginLeft: 10 }] },
            createElement(Text, { style: { fontWeight: "bold", marginBottom: 6 } }, t(lang, "Close-out", "贴合")),
            kv("thetaContactStartUsed (deg)", fmt(r.closeout.thetaContactStartUsedDeg, 1)),
            kv("nonlinearTorqueAtMax (N*mm)", fmt(r.closeout.nonlinearTorqueAtMax_Nmm, 1))
          )
        )
      ),
      createElement(
        Text,
        {
          style: styles.footer,
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `${pageNumber} / ${totalPages}`,
          fixed: true,
        } as any,
        ""
      )
    ),

    // Page 3: Review
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(Header, { data, pageTitle: reportTitle }),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, titleReview),
        review
          ? createElement(
              View,
              { style: styles.grid2 },
              createElement(
                View,
                { style: styles.card },
                createElement(Text, { style: [styles.badge, { backgroundColor: rygColor(review.overall) }] }, `${t(lang, "OVERALL", "总体")}: ${review.overall}`),
                kv(t(lang, "Static", "静强度"), review.staticRYG ?? "—"),
                kv(t(lang, "Fatigue", "疲劳"), review.fatigueRYG ?? "—"),
                kv(t(lang, "Close-out", "贴合"), review.closeoutRYG ?? "—"),
                kv(t(lang, "Geometry", "几何"), review.geometryRYG ?? "—")
              ),
              createElement(
                View,
                { style: [styles.card, { marginLeft: 10 }] },
                createElement(Text, { style: { fontWeight: "bold", marginBottom: 6 } }, t(lang, "Messages", "信息")),
                ...(review.messages?.length
                  ? review.messages.map((m, i) => createElement(Text, { key: i, style: styles.message }, `- ${m}`))
                  : [createElement(Text, { key: "none", style: styles.message }, "- None")])
              )
            )
          : createElement(Text, { style: styles.message }, "- review not available")
      ),
      createElement(
        Text,
        {
          style: styles.footer,
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `${pageNumber} / ${totalPages}`,
          fixed: true,
        } as any,
        ""
      )
    ),

    // Page 4: Curves
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(Header, { data, pageTitle: reportTitle }),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, titleCurves),
        createElement(
          View,
          { style: styles.grid2 },
          createElement(
            View,
            { style: styles.card },
            createElement(Text, { style: styles.chartTitle }, "Torque Band (T-Theta)"),
            curves.torqueBand
              ? createElement(SimpleLineChart, {
                  width: 250,
                  height: 170,
                  series: [
                    { points: curves.torqueBand.min, stroke: "#94a3b8", strokeWidth: 1.5 },
                    { points: curves.torqueBand.nom, stroke: "#2563eb" },
                    { points: curves.torqueBand.max, stroke: "#0f766e", strokeWidth: 1.5 },
                  ],
                  annotations: buildTorqueBandAnnotations(curves.torqueBand, g.maxWorkingAngle),
                })
              : createElement(Text, { style: styles.message }, "- torqueBand not available")
          ),
          createElement(
            View,
            { style: [styles.card, { marginLeft: 10 }] },
            createElement(Text, { style: styles.chartTitle }, "Close-out (T-Theta)"),
            curves.closeout
              ? createElement(SimpleLineChart, {
                  width: 250,
                  height: 170,
                  series: [
                    { points: curves.closeout.linear, stroke: "#64748b", strokeWidth: 1.5 },
                    { points: curves.closeout.nonlinear, stroke: "#7c3aed" },
                  ],
                  annotations: buildCloseoutAnnotations({
                    closeout: curves.closeout,
                    thetaContactStart_deg: r.closeout.thetaContactStartUsedDeg ?? null,
                    thetaMax_deg: g.maxWorkingAngle,
                  }),
                })
              : createElement(Text, { style: styles.message }, "- closeout not available")
          )
        ),
        createElement(
          View,
          { style: [styles.card, { marginTop: 10 }] },
          createElement(Text, { style: styles.chartTitle }, "Fatigue (sigmaA-sigmaM)"),
          createElement(SimpleLineChart, {
            width: 520,
            height: 220,
            series: buildFatigueLimitSeries(r.fatigue),
            point: curves.goodman?.point
              ? { x: curves.goodman.point.sigmaM, y: curves.goodman.point.sigmaA, fill: "#f59e0b" }
              : undefined,
            annotations:
              curves.goodman?.point
                ? [
                    {
                      x: curves.goodman.point.sigmaM,
                      y: curves.goodman.point.sigmaA,
                      text: `sigmam=${fmt(curves.goodman.point.sigmaM, 0)} sigmaa=${fmt(curves.goodman.point.sigmaA, 0)}\nSF: G=${fmt(r.fatigue.fatigueSF_Goodman, 2)} Ge=${fmt(r.fatigue.fatigueSF_Gerber, 2)} S=${fmt(r.fatigue.fatigueSF_Soderberg, 2)}`,
                      fill: "#0f172a",
                    },
                  ]
                : undefined,
            legend: [
              { label: `Goodman${selectedCriterion === "goodman" ? " (selected)" : ""}`, color: "#7c3aed" },
              { label: `Gerber${selectedCriterion === "gerber" ? " (selected)" : ""}`, color: "#2563eb" },
              { label: `Soderberg${selectedCriterion === "soderberg" ? " (selected)" : ""}`, color: "#f59e0b" },
            ],
          })
        )
      ),
      createElement(
        Text,
        {
          style: styles.footer,
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `${pageNumber} / ${totalPages}`,
          fixed: true,
        } as any,
        ""
      )
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as SpiralReportModel;

    if (!data?.inputs?.geometry || !data?.results?.fatigue) {
      return NextResponse.json({ error: "Invalid report model" }, { status: 400 });
    }

    const pdfElement = createElement(SpiralTorsionReportPDF, { data });
    // @ts-expect-error - renderToBuffer types are not fully compatible with createElement
    const pdfBuffer = await renderToBuffer(pdfElement);

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="spiral-torsion-report-${Date.now()}.pdf"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
