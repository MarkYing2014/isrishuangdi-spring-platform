import { createElement } from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Path, Line } from "@react-pdf/renderer";

import type { FieldMapping, QualityAnalysisResult, QualityDataset } from "../types";

export type QualityAnalysisReportModel = {
  dataset: Pick<QualityDataset, "id" | "name" | "createdAtISO" | "source" | "headers">;
  mapping: FieldMapping;
  analysis: QualityAnalysisResult;
  meta?: {
    title?: string;
    projectName?: string;
    engineer?: string;
    language?: "en" | "zh" | "bilingual";
  };
};

function t(lang: NonNullable<QualityAnalysisReportModel["meta"]>["language"], en: string, zh: string): string {
  if (lang === "zh") return zh;
  if (lang === "en") return en;
  return `${en} / ${zh}`;
}

function fmt(value: unknown, decimals = 3): string {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

type XY = { x: number; y: number };

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

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  header: { marginBottom: 16, borderBottom: "2px solid #2563eb", paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: "bold", color: "#1d4ed8" },
  subtitle: { fontSize: 9, color: "#64748b", marginTop: 4 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 4,
    marginBottom: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#64748b", flexGrow: 1 },
  value: { fontWeight: "bold", textAlign: "right", flexShrink: 0, marginLeft: 8 },
  card: { border: "1px solid #e2e8f0", borderRadius: 4, padding: 8, backgroundColor: "#f8fafc" },
  chartWrap: { marginTop: 6, border: "1px solid #e2e8f0", borderRadius: 4, backgroundColor: "#ffffff", padding: 8 },
  chartTitle: { fontSize: 9, color: "#334155", marginBottom: 4, fontWeight: "bold" },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, textAlign: "center", color: "#94a3b8", fontSize: 8 },
});

function kv(label: string, value: string) {
  return createElement(
    View,
    { style: styles.row },
    createElement(Text, { style: styles.label }, label),
    createElement(Text, { style: styles.value }, value)
  );
}

function SimpleLineChart({ title, points }: { title: string; points: XY[] }) {
  const width = 520;
  const height = 180;
  const padding = { left: 30, right: 10, top: 12, bottom: 22 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const yMin = ys.length ? Math.min(...ys) : 0;
  const yMax = ys.length ? Math.max(...ys) : 1;

  const xSpan = Math.max(1e-9, xMax - xMin);
  const ySpan = Math.max(1e-9, yMax - yMin);

  const xScale = (x: number) => padding.left + ((x - xMin) / xSpan) * innerW;
  const yScale = (y: number) => padding.top + innerH - ((y - yMin) / ySpan) * innerH;

  return createElement(
    View,
    { style: styles.chartWrap },
    createElement(Text, { style: styles.chartTitle }, title),
    createElement(
      Svg,
      { width, height, viewBox: `0 0 ${width} ${height}` },
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
      createElement(Path, {
        d: linePath(points, xScale, yScale),
        fill: "none",
        stroke: "#2563eb",
        strokeWidth: 2,
      })
    )
  );
}

export function generateQualityAnalysisReportHTML(model: QualityAnalysisReportModel): string {
  const lang = model.meta?.language ?? "bilingual";

  const title = model.meta?.title ?? t(lang, "Quality Analysis Report", "质量分析报告");
  const generatedAt = new Date().toLocaleString();

  const f = (sev: string) => (sev === "ERROR" ? "#dc2626" : sev === "WARN" ? "#d97706" : "#2563eb");

  const keyFindingsHtml = model.analysis.keyFindings
    .map((x) => `<li><span style="color:${f(x.severity)};font-weight:700">${x.severity}</span> ${x.title.en} / ${x.title.zh}</li>`)
    .join("\n");

  const charsHtml = model.analysis.characteristics
    .map((c) => {
      const cap = c.capability;
      const cpk = cap.cpk === null ? "—" : fmt(cap.cpk, 3);
      const cp = cap.cp === null ? "—" : fmt(cap.cp, 3);
      return `
        <tr>
          <td>${c.name}</td>
          <td style="text-align:right">${c.count}</td>
          <td style="text-align:right">${fmt(cap.mean, 3)}</td>
          <td style="text-align:right">${fmt(cap.std, 3)}</td>
          <td style="text-align:right">${cp}</td>
          <td style="text-align:right">${cpk}</td>
        </tr>
      `;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;padding:24px;color:#0f172a}
    h1{margin:0 0 6px 0;color:#1d4ed8}
    .meta{color:#64748b;font-size:12px;margin-bottom:18px}
    .card{border:1px solid #e2e8f0;border-radius:10px;padding:14px;background:#f8fafc;margin-bottom:14px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #e2e8f0;padding:8px;font-size:12px}
    th{text-align:left;color:#334155;background:#f1f5f9}
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">${t(lang, "Generated", "生成")}: ${generatedAt} | ${t(lang, "Dataset", "数据集")}: ${model.dataset.name}</div>

  <div class="card">
    <strong>${t(lang, "Overall", "总体")}</strong><br/>
    ${t(lang, "Status", "状态")}: ${model.analysis.status} &nbsp; | &nbsp; ${t(lang, "Score", "评分")}: ${model.analysis.score}
  </div>

  <div class="card">
    <strong>${t(lang, "Key Findings", "关键发现")}</strong>
    <ul>${keyFindingsHtml || ""}</ul>
  </div>

  <div class="card">
    <strong>${t(lang, "Capability Summary", "过程能力汇总")}</strong>
    <table>
      <thead>
        <tr>
          <th>${t(lang, "Characteristic", "特性")}</th>
          <th style="text-align:right">n</th>
          <th style="text-align:right">mean</th>
          <th style="text-align:right">std</th>
          <th style="text-align:right">Cp</th>
          <th style="text-align:right">Cpk</th>
        </tr>
      </thead>
      <tbody>
        ${charsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

export function QualityAnalysisReportPDF({ model }: { model: QualityAnalysisReportModel }) {
  const lang = model.meta?.language ?? "bilingual";
  const title = model.meta?.title ?? t(lang, "Quality Analysis Report", "质量分析报告");
  const generatedAt = new Date().toLocaleString();

  const first = model.analysis.characteristics[0];
  const chartPoints: XY[] = first
    ? first.imr.points.map((p) => ({ x: p.x, y: p.value }))
    : [];

  return createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(
        View,
        { style: styles.header },
        createElement(Text, { style: styles.title }, title),
        createElement(Text, { style: styles.subtitle }, `${t(lang, "Generated", "生成")}: ${generatedAt}`),
        createElement(Text, { style: styles.subtitle }, `${t(lang, "Dataset", "数据集")}: ${model.dataset.name}`)
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, "Summary", "概要")),
        createElement(View, { style: styles.card },
          kv(`${t(lang, "Status", "状态")}`, model.analysis.status),
          kv(`${t(lang, "Score", "评分")}`, String(model.analysis.score)),
          kv(`${t(lang, "Rows", "行数")}`, String(model.analysis.dataQuality.stats.totalRows)),
          kv(`${t(lang, "Valid", "有效")}`, String(model.analysis.dataQuality.stats.validMeasurements))
        )
      ),
      first &&
        createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.sectionTitle },
            `${t(lang, "I Chart (first characteristic)", "I 图（首个特性）")}: ${first.name}`
          ),
          createElement(SimpleLineChart, {
            title: `${t(lang, "Individuals", "单值")}`,
            points: chartPoints,
          })
        ),
      createElement(
        Text,
        {
          style: styles.footer,
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`,
          fixed: true,
        } as any,
        ""
      )
    )
  );
}
