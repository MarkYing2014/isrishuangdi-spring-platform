import { createElement } from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Path, Line } from "@react-pdf/renderer";

import type { FieldMapping, QualityAnalysisResult, QualityDataset } from "../types";
import { buildQualityReportNarrative } from "./reportNarrator";
import { computeHistogram } from "../analytics/histogram";

export type QualityAnalysisReportModel = {
  dataset: Pick<QualityDataset, "id" | "name" | "createdAtISO" | "source" | "headers">;
  mapping: FieldMapping;
  analysis: QualityAnalysisResult;
  meta?: {
    title?: string;
    projectName?: string;
    engineer?: string;
    customer?: string;
    supplier?: string;
    partNumber?: string;
    partName?: string;
    rev?: string;
    preparedBy?: string;
    approvedBy?: string;
    approvedAtISO?: string;
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

// --- SVG Chart Generators ---

function svgControlChart(
  title: string,
  points: { x: number; value: number; outOfControl?: boolean; ucl?: number; lcl?: number; cl?: number }[],
  options: { height?: number; width?: number; yLabel?: string } = {}
): string {
  const width = options.width || 600;
  const height = options.height || 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (points.length === 0) return "";

  const values = points.map((p) => p.value);
  const ucls = points.map(p => p.ucl ?? -Infinity).filter(isFinite);
  const lcls = points.map(p => p.lcl ?? Infinity).filter(isFinite);

  // Dynamic Range
  let min = Math.min(...values, ...lcls);
  let max = Math.max(...values, ...ucls);

  if (min === Infinity) min = Math.min(...values);
  if (max === -Infinity) max = Math.max(...values);

  // Pad
  const span = max - min || 1;
  min -= span * 0.1;
  max += span * 0.1;

  const xScale = (i: number) => padding.left + (i / (points.length - 1 || 1)) * innerW;
  const yScale = (v: number) => padding.top + innerH - ((v - min) / (max - min)) * innerH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(p.value)}`).join(" ");

  // Limits
  const clLine = points[0].cl !== undefined ? `
    <line x1="${padding.left}" y1="${yScale(points[0].cl)}" x2="${width - padding.right}" y2="${yScale(points[0].cl)}" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,4" />
    <text x="${width - padding.right + 4}" y="${yScale(points[0].cl)}" font-size="10" fill="#10b981" alignment-baseline="middle">CL</text>
  ` : "";

  const uclLine = points[0].ucl !== undefined ? `
    <line x1="${padding.left}" y1="${yScale(points[0].ucl!)}" x2="${width - padding.right}" y2="${yScale(points[0].ucl!)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />
    <text x="${width - padding.right + 4}" y="${yScale(points[0].ucl!)}" font-size="10" fill="#ef4444" alignment-baseline="middle">UCL</text>
  ` : "";

  const lclLine = points[0].lcl !== undefined ? `
    <line x1="${padding.left}" y1="${yScale(points[0].lcl!)}" x2="${width - padding.right}" y2="${yScale(points[0].lcl!)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />
    <text x="${width - padding.right + 4}" y="${yScale(points[0].lcl!)}" font-size="10" fill="#ef4444" alignment-baseline="middle">LCL</text>
  ` : "";

  // Points (Red if OOC)
  const dots = points.map((p, i) => {
    const cx = xScale(i);
    const cy = yScale(p.value);
    const color = p.outOfControl ? "#ef4444" : "#3b82f6";
    const r = p.outOfControl ? 4 : 2;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />`;
  }).join("");

  // Labels (X Axis for every nth item to avoid crowding)
  const step = Math.ceil(points.length / 10);
  const xLabels = points.map((_, i) => {
    if (i % step !== 0) return "";
    return `<text x="${xScale(i)}" y="${height - 5}" font-size="10" fill="#64748b" text-anchor="middle">${i + 1}</text>`;
  }).join("");

  // Y Labels
  const yLabels = [min, (min + max) / 2, max].map(v => {
    return `<text x="${padding.left - 6}" y="${yScale(v)}" font-size="10" fill="#64748b" text-anchor="end" alignment-baseline="middle">${v.toFixed(2)}</text>`;
  }).join("");

  return `
    <div style="margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 4px;">${title}</div>
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="4" />
        <!-- Grid -->
        <rect x="${padding.left}" y="${padding.top}" width="${innerW}" height="${innerH}" fill="none" stroke="#e2e8f0" />
        ${yLabels}
        ${xLabels}
        ${clLine} ${uclLine} ${lclLine}
        <path d="${path}" fill="none" stroke="#3b82f6" stroke-width="2" />
        ${dots}
      </svg>
    </div>
  `;
}

function svgHistogram(
  title: string,
  values: number[],
  specs: { lsl: number | null; usl: number | null; target: number | null },
  options: { height?: number; width?: number } = {}
): string {
  const width = options.width || 600;
  const height = options.height || 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const hist = computeHistogram(values);
  if (hist.bins.length === 0) return "";

  const xScale = (v: number) => padding.left + ((v - hist.min) / (hist.max - hist.min)) * innerW;
  const yScale = (count: number) => padding.top + innerH - (count / hist.maxCount) * innerH;

  const bars = hist.bins.map(b => {
    const x = xScale(b.start);
    const w = Math.max(0, xScale(b.end) - x - 1);
    const h = innerH - (yScale(b.count) - padding.top);
    const y = yScale(b.count);
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#93c5fd" />`;
  }).join("");

  // Specs
  const specLines = [];
  if (specs.lsl !== null) {
    const x = xScale(specs.lsl);
    if (x >= padding.left && x <= width - padding.right) {
      specLines.push(`<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="#ef4444" stroke-dasharray="4,4" stroke-width="2" />
             <text x="${x}" y="${padding.top - 6}" font-size="10" fill="#ef4444" text-anchor="middle">LSL</text>`);
    }
  }
  if (specs.usl !== null) {
    const x = xScale(specs.usl);
    if (x >= padding.left && x <= width - padding.right) {
      specLines.push(`<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${height - padding.bottom}" stroke="#ef4444" stroke-dasharray="4,4" stroke-width="2" />
             <text x="${x}" y="${padding.top - 6}" font-size="10" fill="#ef4444" text-anchor="middle">USL</text>`);
    }
  }

  return `
    <div style="margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 4px;">${title}</div>
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
         <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="4" />
         <!-- Axis -->
         <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#94a3b8" />
         ${bars}
         ${specLines.join("")}
         <!-- Min/Max Labels -->
         <text x="${padding.left}" y="${height - 10}" font-size="10" fill="#64748b">${hist.min.toFixed(2)}</text>
         <text x="${width - padding.right}" y="${height - 10}" font-size="10" fill="#64748b" text-anchor="end">${hist.max.toFixed(2)}</text>
      </svg>
    </div>
    `;
}

function svgStratificationChart(result: NonNullable<QualityAnalysisResult["stratification"]>, title: string): string {
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxScore = 100;
  const barHeight = 20;
  const gap = 10;

  // Sort items by key
  const items = result.strata.slice(0, 5); // Top 5

  const yScale = (i: number) => padding.top + i * (barHeight + gap);
  const xScale = (score: number) => padding.left + (score / maxScore) * innerW;

  const bars = items.map((item, i) => {
    const y = yScale(i);
    const w = xScale(item.score) - padding.left;
    const color = item.score >= 90 ? "#10b981" : item.score >= 60 ? "#f59e0b" : "#ef4444";
    return `
          <text x="${padding.left - 8}" y="${y + barHeight / 2 + 4}" font-size="12" fill="#334155" text-anchor="end">${item.key}</text>
          <rect x="${padding.left}" y="${y}" width="${w}" height="${barHeight}" fill="${color}" rx="2" />
          <text x="${padding.left + w + 8}" y="${y + barHeight / 2 + 4}" font-size="10" fill="#334155">${item.score}</text>
        `;
  }).join("");

  return `
    <div style="margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 4px;">${title}</div>
      <svg width="${width}" height="${Math.max(height, items.length * 30 + 50)}" viewBox="0 0 ${width} ${Math.max(height, items.length * 30 + 50)}">
         <rect x="0" y="0" width="${width}" height="${height}" fill="#f8fafc" rx="4" />
         <!-- Grid -->
         <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#e2e8f0" />
         ${bars}
         <text x="${xScale(0)}" y="${height - 10}" font-size="10" fill="#94a3b8">0</text>
         <text x="${xScale(50)}" y="${height - 10}" font-size="10" fill="#94a3b8" text-anchor="middle">50</text>
         <text x="${xScale(100)}" y="${height - 10}" font-size="10" fill="#94a3b8" text-anchor="end">100</text>
      </svg>
    </div>
    `;
}

// ------------------------------------

export function generateQualityAnalysisReportHTML(model: QualityAnalysisReportModel): string {
  const lang = model.meta?.language ?? "bilingual";

  const title = model.meta?.title ?? t(lang, "Quality Analysis Report", "质量分析报告");
  const generatedAt = new Date().toLocaleString();

  const narrative = buildQualityReportNarrative({ analysis: model.analysis, lang });

  // 1. Prepare Executive Summary HTML
  const executiveReasonsHtml = narrative.executiveSummary.keyReasons
    .map((r) => `<li>${t(lang, r.en, r.zh)}</li>`)
    .join("\n");

  const executiveDispositionHtml = narrative.executiveSummary.disposition
    .map((x) => `<li>${t(lang, x.en, x.zh)}</li>`)
    .join("\n");

  // 2. Prepare Detailed Characteristic Sections (Charts + Specific Findings)
  const characteristicDetailsHtml = model.analysis.characteristics.map(c => {
    // A. Charts
    const values = c.imr.points.map(p => p.value);
    const lsl = c.capability.lsl ?? null;
    const usl = c.capability.usl ?? null;
    // const target = c.capability.target ?? null;

    const chartHist = svgHistogram(t(lang, `Distribution: ${c.name}`, `分布图: ${c.name}`), values, { lsl, usl, target: null });

    const chartI = svgControlChart(t(lang, "I Chart", "I 图 (单值)"), c.imr.points.map(p => ({
      x: p.x, value: p.value, ucl: p.ucl, lcl: p.lcl, cl: p.cl, outOfControl: p.outOfControl
    })));

    // Compute MR points for Chart
    const mrPoints = [];
    const xs = c.imr.points;
    for (let i = 1; i < xs.length; i++) {
      mrPoints.push({
        x: i + 1,
        value: Math.abs(xs[i].value - xs[i - 1].value),
        // approximate MR limits if not stored (UCL_MR = 3.267 * MRbar roughly, or D4*MRbar)
        // But we can just plot the values. 
        // Better: use the MRbar from imr object
        cl: c.imr.mrBar,
        ucl: 3.267 * c.imr.mrBar, // D4 for n=2 is 3.267
        lcl: 0, // D3 for n=2 is 0
        outOfControl: false // We verify this if needed
      });
    }

    const chartMR = svgControlChart(t(lang, "MR Chart", "MR 图 (移动极差)"), mrPoints);


    let chartXbar = "";
    let chartR = "";

    if (c.xbarr) {
      chartXbar = svgControlChart(t(lang, `Xbar Chart (n=${c.xbarr.subgroupSize})`, `Xbar 图 (n=${c.xbarr.subgroupSize})`), c.xbarr.points.map((p, i) => ({
        x: i, value: p.mean, ucl: p.xucl, lcl: p.xlcl, cl: p.xcl, outOfControl: p.xOutOfControl
      })));

      chartR = svgControlChart(t(lang, "R Chart", "R 图 (极差)"), c.xbarr.points.map((p, i) => ({
        x: i, value: p.range, ucl: p.rucl, lcl: p.rlcl ?? 0, cl: p.rcl, outOfControl: p.rOutOfControl
      })));
    }

    // B. Findings Text (from narrative)
    const findingItem = narrative.criticalFindingsByCharacteristic.items.find(it => it.characteristic === c.name);
    let textHtml = "";
    if (findingItem) {
      const stability = findingItem.stability.length
        ? `<ul>${findingItem.stability.map((b) => `<li>${t(lang, b.en, b.zh)}</li>`).join("\n")}</ul>`
        : "";
      const capability = findingItem.capability.length
        ? `<ul>${findingItem.capability.map((b) => `<li>${t(lang, b.en, b.zh)}</li>`).join("\n")}</ul>`
        : "";
      const rec = findingItem.recommendation.length
        ? `<ul>${findingItem.recommendation.map((b) => `<li>${t(lang, b.en, b.zh)}</li>`).join("\n")}</ul>`
        : "";

      textHtml = `
            <div style="margin-top:16px; border-top:1px dashed #e2e8f0; padding-top:12px">
                ${stability ? `<div style="margin-top:6px"><div style="font-weight:700; color:#334155">${t(lang, findingItem.stabilityLabel.en, findingItem.stabilityLabel.zh)}</div>${stability}</div>` : ""}
                ${capability ? `<div style="margin-top:6px"><div style="font-weight:700; color:#334155">${t(lang, findingItem.capabilityLabel.en, findingItem.capabilityLabel.zh)}</div>${capability}</div>` : ""}
                <div style="margin-top:6px"><strong style="color:#334155">${t(lang, findingItem.assessmentLabel.en, findingItem.assessmentLabel.zh)}</strong>: ${t(lang, findingItem.assessment.en, findingItem.assessment.zh)}</div>
                ${rec ? `<div style="margin-top:6px"><div style="font-weight:700; color:#334155">${t(lang, findingItem.recommendationLabel.en, findingItem.recommendationLabel.zh)}</div>${rec}</div>` : ""}
            </div>
        `;
    }

    return `
        <div class="card">
           <div class="section-title" style="font-size:16px; color:#1e40af">${c.name}</div>
           <div style="display:flex; flex-wrap:wrap; gap:12px;">
              ${chartHist}
              ${chartI}
              ${chartMR}
              ${chartXbar}
              ${chartR}
           </div>
           ${textHtml}
        </div>
      `;
  }).join("\n");


  // 3. Other Sections
  const spcInterpretationHtml = (() => {
    const items = narrative.controlChartInterpretation.items
      .map((it) => {
        const bullets = it.bullets.map((b) => `<li>${t(lang, b.en, b.zh)}</li>`).join("\n");
        return `<li><strong>${it.characteristic}</strong><ul>${bullets}</ul></li>`;
      })
      .join("\n");
    return items ? `<ul>${items}</ul>` : "";
  })();

  const measurementHtml = (() => {
    const findings = narrative.measurementSystem.findings.map((x) => `<li>${t(lang, x.en, x.zh)}</li>`).join("\n");
    const rec = narrative.measurementSystem.recommendation.map((x) => `<li>${t(lang, x.en, x.zh)}</li>`).join("\n");

    const msaRows = narrative.measurementSystem.msaSummary
      .map((m) => {
        const pct = m.pctGrr === null || !isFinite(m.pctGrr) ? "—" : `${m.pctGrr.toFixed(1)}%`;
        const ndc = m.ndc === null || !isFinite(m.ndc) ? "—" : String(m.ndc);
        return `<tr><td>${m.characteristic}</td><td style=\"text-align:right\">${pct}</td><td style=\"text-align:right\">${ndc}</td><td>${m.assessment}</td></tr>`;
      })
      .join("\n");

    const msaTable = msaRows
      ? `
        <div style=\"margin-bottom:8px\">
          <div style=\"font-weight:700\">${t(lang, narrative.measurementSystem.msaSummaryLabel.en, narrative.measurementSystem.msaSummaryLabel.zh)}</div>
          <table>
            <thead>
              <tr>
                <th>${t(lang, "Characteristic", "特性")}</th>
                <th style=\"text-align:right\">%GRR</th>
                <th style=\"text-align:right\">ndc</th>
                <th>${t(lang, "Assessment", "评价")}</th>
              </tr>
            </thead>
            <tbody>
              ${msaRows}
            </tbody>
          </table>
        </div>
      `
      : "";

    return `
      <div style="margin-bottom:8px">
        <div style="font-weight:700">${t(lang, narrative.measurementSystem.findingsLabel.en, narrative.measurementSystem.findingsLabel.zh)}</div>
        <ul>${findings}</ul>
      </div>
      <div style="margin-bottom:8px">
        <div style="font-weight:700">${t(lang, narrative.measurementSystem.riskLabel.en, narrative.measurementSystem.riskLabel.zh)}</div>
        <div>${t(lang, narrative.measurementSystem.risk.en, narrative.measurementSystem.risk.zh)}</div>
      </div>
      ${msaTable}
      <div>
        <div style="font-weight:700">${t(lang, narrative.measurementSystem.recommendationLabel.en, narrative.measurementSystem.recommendationLabel.zh)}</div>
        <ul>${rec}</ul>
      </div>
    `;
  })();

  const xbarrSummaryHtml = (() => {
    const items = model.analysis.characteristics
      .map((c) => {
        const xb = c.xbarr;
        if (!xb) return "";
        const xOoc = xb.points.filter((p) => p.xOutOfControl).length;
        const rOoc = xb.points.filter((p) => p.rOutOfControl).length;
        return `<li><strong>${c.name}</strong>: n=${xb.subgroupSize}, subgroups=${xb.points.length}, X OOC=${xOoc}, R OOC=${rOoc}</li>`;
      })
      .filter(Boolean)
      .join("\n");

    return items ? `<ul>${items}</ul>` : "";
  })();

  const stratificationSummaryHtml = (() => {
    const s = narrative.stratification;
    if (!s) return "";
    const items = s.lines.map((x) => `<li><strong>${x.key}</strong>: ${x.status} / ${x.score} / n=${x.n}</li>`).join("\n");
    return items
      ? `<div>
          <div style="color:#334155;margin-bottom:6px">${t(lang, "By", "维度")}: ${s.by}</div>
          <div style="color:#334155;margin-bottom:6px">${t(lang, s.interpretation.en, s.interpretation.zh)}</div>
          
          <!-- Stratification Chart Here if needed, but we already have it separately? Or reuse logic -->
          ${model.analysis.stratification ? svgStratificationChart(model.analysis.stratification, t(lang, "Stratification Score Comparison", "分层评分对比")) : ""}

          <ul>${items}</ul>
        </div>`
      : "";
  })();

  const charsTableHtml = narrative.capability.rows
    .map((r) => {
      const cpk = r.cpk === null ? "—" : fmt(r.cpk, 3);
      const cp = r.cp === null ? "—" : fmt(r.cp, 3);
      const assess = t(lang, r.assessment.en, r.assessment.zh);
      const note = r.note ? t(lang, r.note.en, r.note.zh) : "";
      return `
        <tr>
          <td>${r.characteristic}</td>
          <td style="text-align:right">${r.n}</td>
          <td style="text-align:right">${fmt(r.mean, 3)}</td>
          <td style="text-align:right">${fmt(r.std, 3)}</td>
          <td style="text-align:right">${cp}</td>
          <td style="text-align:right">${cpk}</td>
          <td>${assess}${note ? `<div style=\"color:#64748b;font-size:11px;margin-top:2px\">${note}</div>` : ""}</td>
        </tr>
      `;
    })
    .join("\n");

  // Metadata Table
  const metaTable = `
    <table style="margin-top:8px">
      <tbody>
        <tr><td style="width:180px;color:#64748b">${t(lang, "Customer", "客户")}</td><td>${model.meta?.customer ?? "—"}</td></tr>
        <tr><td style="color:#64748b">${t(lang, "Supplier", "供应商")}</td><td>${model.meta?.supplier ?? "—"}</td></tr>
        <tr><td style="color:#64748b">${t(lang, "Part No.", "零件号")}</td><td>${model.meta?.partNumber ?? "—"}</td></tr>
        <tr><td style="color:#64748b">${t(lang, "Part Name", "零件名称")}</td><td>${model.meta?.partName ?? "—"}</td></tr>
        <tr><td style="color:#64748b">${t(lang, "Rev", "版本")}</td><td>${model.meta?.rev ?? "—"}</td></tr>
        <tr><td style="color:#64748b">${t(lang, "Prepared By", "编制")}</td><td>${model.meta?.preparedBy ?? model.meta?.engineer ?? "—"}</td></tr>
        <tr><td style="color:#64748b">${t(lang, "Approved By", "批准")}</td><td>${model.meta?.approvedBy ?? "—"}</td></tr>
        <tr><td style="color:#64748b">${t(lang, "Approved Date", "批准日期")}</td><td>${model.meta?.approvedAtISO ?? "—"}</td></tr>
      </tbody>
    </table>
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;padding:24px;color:#0f172a; max-width: 900px; margin: 0 auto;}
    h1{margin:0 0 6px 0;color:#1d4ed8}
    .meta{color:#64748b;font-size:12px;margin-bottom:18px}
    .card{border:1px solid #e2e8f0;border-radius:10px;padding:14px;background:#f8fafc;margin-bottom:14px; page-break-inside: avoid;}
    .section-title { font-weight: bold; margin-bottom: 8px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #e2e8f0;padding:8px;font-size:12px}
    th{text-align:left;color:#334155;background:#f1f5f9}
    ul { padding-left: 20px; margin: 0; }
    li { margin-bottom: 4px; font-size: 13px; }
    @media print {
      .card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">${t(lang, "Generated", "生成")}: ${generatedAt} | ${t(lang, "Dataset", "数据集")}: ${model.dataset.name || "N/A"}</div>

  <div class="card">
    <div class="section-title">${t(lang, "Report Info", "报告信息")}</div>
    ${metaTable}
  </div>

  <div class="card">
    <div class="section-title">${t(lang, narrative.executiveSummary.title.en, narrative.executiveSummary.title.zh)}</div>
    <div>
      <div><span style="font-weight:700">${t(lang, narrative.executiveSummary.overallStatusLabel.en, narrative.executiveSummary.overallStatusLabel.zh)}</span>: ${model.analysis.status}</div>
      <div><span style="font-weight:700">${t(lang, "Score", "评分")}</span>: ${model.analysis.score}</div>
      <div style="margin-top:8px"><span style="font-weight:700">${t(lang, narrative.executiveSummary.conclusionLabel.en, narrative.executiveSummary.conclusionLabel.zh)}</span>: ${t(lang, narrative.executiveSummary.conclusion.en, narrative.executiveSummary.conclusion.zh)}</div>
      
      <div style="margin-top:8px; font-weight:bold; color:#ef4444">${t(lang, "Key Findings", "关键发现")}</div>
      <ul>${executiveReasonsHtml}</ul>
      
      <div style="margin-top:8px"><span style="font-weight:700">${t(lang, narrative.executiveSummary.dispositionLabel.en, narrative.executiveSummary.dispositionLabel.zh)}</span><ul>${executiveDispositionHtml}</ul></div>
      <div style="margin-top:6px;color:#64748b;font-size:11px">${t(lang, narrative.executiveSummary.scoreExplain.en, narrative.executiveSummary.scoreExplain.zh)}</div>
    </div>
  </div>
  
  <h2 style="font-size:16px; margin-top:24px; margin-bottom:12px; border-bottom:2px solid #e2e8f0; padding-bottom:6px">${t(lang, "Characteristic Details", "特性详情")}</h2>
  ${characteristicDetailsHtml}

  ${spcInterpretationHtml ? `
  <div class="card">
    <div class="section-title">${t(lang, narrative.controlChartInterpretation.title.en, narrative.controlChartInterpretation.title.zh)}</div>
    ${spcInterpretationHtml}
  </div>
  ` : ""}

  <div class="card">
    <div class="section-title">${t(lang, narrative.measurementSystem.title.en, narrative.measurementSystem.title.zh)}</div>
    ${measurementHtml}
  </div>

  ${xbarrSummaryHtml ? `
  <div class="card">
    <strong>${t(lang, "Xbar-R Summary", "Xbar-R 汇总")}</strong>
    ${xbarrSummaryHtml}
  </div>
  ` : ""}

  ${stratificationSummaryHtml ? `
  <div class="card">
    <strong>${t(lang, "Stratification", "分层")}</strong>
    ${stratificationSummaryHtml}
  </div>
  ` : ""}

  <div class="card">
    <strong>${t(lang, narrative.engineeringJudgment.title.en, narrative.engineeringJudgment.title.zh)}</strong>
    <div style="margin-top:6px">${t(lang, narrative.engineeringJudgment.text.en, narrative.engineeringJudgment.text.zh)}</div>
  </div>

  <div class="card">
    <strong>${t(lang, narrative.recommendedActions.title.en, narrative.recommendedActions.title.zh)}</strong>
    <ul>
      ${narrative.recommendedActions.items.map((x) => `<li>${t(lang, x.en, x.zh)}</li>`).join("\n")}
    </ul>
  </div>

  <div class="card">
    <div class="section-title">${t(lang, narrative.capability.title.en, narrative.capability.title.zh)}</div>
    <table>
      <thead>
        <tr>
          <th>${t(lang, "Characteristic", "特性")}</th>
          <th style="text-align:right">n</th>
          <th style="text-align:right">mean</th>
          <th style="text-align:right">std</th>
          <th style="text-align:right">Cp</th>
          <th style="text-align:right">Cpk</th>
          <th>${t(lang, "Assessment", "评价")}</th>
        </tr>
      </thead>
      <tbody>
        ${charsTableHtml}
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

  const narrative = buildQualityReportNarrative({ analysis: model.analysis, lang });

  const executiveLines = [
    `${t(lang, narrative.executiveSummary.overallStatusLabel.en, narrative.executiveSummary.overallStatusLabel.zh)}: ${model.analysis.status}`,
    `${t(lang, "Score", "评分")}: ${model.analysis.score}`,
    `${t(lang, narrative.executiveSummary.conclusionLabel.en, narrative.executiveSummary.conclusionLabel.zh)}: ${t(lang, narrative.executiveSummary.conclusion.en, narrative.executiveSummary.conclusion.zh)}`,
    `${t(lang, narrative.executiveSummary.keyReasonsLabel.en, narrative.executiveSummary.keyReasonsLabel.zh)}:`,
    ...narrative.executiveSummary.keyReasons.map((r) => `- ${t(lang, r.en, r.zh)}`),
    `${t(lang, narrative.executiveSummary.dispositionLabel.en, narrative.executiveSummary.dispositionLabel.zh)}:`,
    ...narrative.executiveSummary.disposition.map((r) => `- ${t(lang, r.en, r.zh)}`),
    t(lang, narrative.executiveSummary.scoreExplain.en, narrative.executiveSummary.scoreExplain.zh),
  ];

  const criticalByCharLines = narrative.criticalFindingsByCharacteristic.items.flatMap((it) => {
    const out: string[] = [];
    out.push(`${it.characteristic}`);
    if (it.stability.length) {
      out.push(`${t(lang, it.stabilityLabel.en, it.stabilityLabel.zh)}:`);
      out.push(...it.stability.map((b) => `- ${t(lang, b.en, b.zh)}`));
    }
    if (it.capability.length) {
      out.push(`${t(lang, it.capabilityLabel.en, it.capabilityLabel.zh)}:`);
      out.push(...it.capability.map((b) => `- ${t(lang, b.en, b.zh)}`));
    }
    out.push(`${t(lang, it.assessmentLabel.en, it.assessmentLabel.zh)}: ${t(lang, it.assessment.en, it.assessment.zh)}`);
    if (it.recommendation.length) {
      out.push(`${t(lang, it.recommendationLabel.en, it.recommendationLabel.zh)}:`);
      out.push(...it.recommendation.map((b) => `- ${t(lang, b.en, b.zh)}`));
    }
    return out;
  });

  const spcLines = narrative.controlChartInterpretation.items.flatMap((it) => {
    return [`${it.characteristic}`, ...it.bullets.map((b) => `- ${t(lang, b.en, b.zh)}`)];
  });

  const measurementLines = [
    `${t(lang, narrative.measurementSystem.findingsLabel.en, narrative.measurementSystem.findingsLabel.zh)}:`,
    ...narrative.measurementSystem.findings.map((x) => `- ${t(lang, x.en, x.zh)}`),
    `${t(lang, narrative.measurementSystem.riskLabel.en, narrative.measurementSystem.riskLabel.zh)}: ${t(lang, narrative.measurementSystem.risk.en, narrative.measurementSystem.risk.zh)}`,
    `${t(lang, narrative.measurementSystem.recommendationLabel.en, narrative.measurementSystem.recommendationLabel.zh)}:`,
    ...narrative.measurementSystem.recommendation.map((x) => `- ${t(lang, x.en, x.zh)}`),
  ];

  const msaLines = narrative.measurementSystem.msaSummary.flatMap((m) => {
    const pct = m.pctGrr === null || !isFinite(m.pctGrr) ? "—" : `${m.pctGrr.toFixed(1)}%`;
    const ndc = m.ndc === null || !isFinite(m.ndc) ? "—" : String(m.ndc);
    return [`${m.characteristic}: %GRR=${pct}, ndc=${ndc}, ${m.assessment}`];
  });

  const ppapInfoLines = [
    `${t(lang, "Customer", "客户")}: ${model.meta?.customer ?? "—"}`,
    `${t(lang, "Supplier", "供应商")}: ${model.meta?.supplier ?? "—"}`,
    `${t(lang, "Part No.", "零件号")}: ${model.meta?.partNumber ?? "—"}`,
    `${t(lang, "Part Name", "零件名称")}: ${model.meta?.partName ?? "—"}`,
    `${t(lang, "Rev", "版本")}: ${model.meta?.rev ?? "—"}`,
    `${t(lang, "Prepared By", "编制")}: ${model.meta?.preparedBy ?? model.meta?.engineer ?? "—"}`,
    `${t(lang, "Approved By", "批准")}: ${model.meta?.approvedBy ?? "—"}`,
    `${t(lang, "Approved Date", "批准日期")}: ${model.meta?.approvedAtISO ?? "—"}`,
  ];

  const xbarrLines = model.analysis.characteristics
    .map((c) => {
      const xb = c.xbarr;
      if (!xb) return null;
      const xOoc = xb.points.filter((p) => p.xOutOfControl).length;
      const rOoc = xb.points.filter((p) => p.rOutOfControl).length;
      return `${c.name}: n=${xb.subgroupSize}, subgroups=${xb.points.length}, X OOC=${xOoc}, R OOC=${rOoc}`;
    })
    .filter((x): x is string => typeof x === "string");

  const stratificationLines = (() => {
    const s = narrative.stratification;
    if (!s) return [] as string[];
    return [
      `${t(lang, "By", "维度")}: ${s.by}`,
      t(lang, s.interpretation.en, s.interpretation.zh),
      ...s.lines.map((x) => `${x.key}: ${x.status} / ${x.score} / n=${x.n}`),
    ];
  })();

  const judgmentLines = [t(lang, narrative.engineeringJudgment.text.en, narrative.engineeringJudgment.text.zh)];
  const actionLines = narrative.recommendedActions.items.map((x) => `- ${t(lang, x.en, x.zh)}`);

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
      ppapInfoLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, "PPAP / Report Info", "PPAP / 报告信息")),
        createElement(
          View,
          { style: styles.card },
          ...ppapInfoLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
        )
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
      executiveLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, narrative.executiveSummary.title.en, narrative.executiveSummary.title.zh)),
        createElement(
          View,
          { style: styles.card },
          ...executiveLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
        )
      ),
      criticalByCharLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, narrative.criticalFindingsByCharacteristic.title.en, narrative.criticalFindingsByCharacteristic.title.zh)),
        createElement(
          View,
          { style: styles.card },
          ...criticalByCharLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
        )
      ),
      spcLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, narrative.controlChartInterpretation.title.en, narrative.controlChartInterpretation.title.zh)),
        createElement(
          View,
          { style: styles.card },
          ...spcLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
        )
      ),
      measurementLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, narrative.measurementSystem.title.en, narrative.measurementSystem.title.zh)),
        createElement(
          View,
          { style: styles.card },
          ...measurementLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
        )
      ),
      msaLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, narrative.measurementSystem.msaSummaryLabel.en, narrative.measurementSystem.msaSummaryLabel.zh)),
        createElement(
          View,
          { style: styles.card },
          ...msaLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
        )
      ),
      xbarrLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, "Xbar-R", "Xbar-R")),
        createElement(
          View,
          { style: styles.card },
          ...xbarrLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
        )
      ),
      stratificationLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, "Stratification", "分层")),
        createElement(
          View,
          { style: styles.card },
          ...stratificationLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
        )
      ),
      judgmentLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, narrative.engineeringJudgment.title.en, narrative.engineeringJudgment.title.zh)),
        createElement(
          View,
          { style: styles.card },
          ...judgmentLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
        )
      ),
      actionLines.length > 0 &&
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, t(lang, narrative.recommendedActions.title.en, narrative.recommendedActions.title.zh)),
        createElement(
          View,
          { style: styles.card },
          ...actionLines.map((line, idx) => createElement(Text, { key: `${idx}-${line}` }, line))
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fixed: true,
        } as any,
        ""
      )
    )
  );
}
