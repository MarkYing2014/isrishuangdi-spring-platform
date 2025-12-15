import type { SpiralReportCurvePoint, SpiralReportModel } from "./SpiralSpringReportTemplate";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmt(n: unknown, decimals = 2): string {
  const v = typeof n === "number" ? n : Number.NaN;
  if (!isFinite(v)) return "—";
  return Number(v.toFixed(decimals)).toLocaleString();
}

function nearestPoint(points: SpiralReportCurvePoint[], xTarget: number): SpiralReportCurvePoint | null {
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

function svgLineChart(
  title: string,
  series: Array<{ label: string; color: string; points: SpiralReportCurvePoint[] }>,
  opts?: {
    width?: number;
    height?: number;
    xLabel?: string;
    yLabel?: string;
    point?: { x: number; y: number; color: string };
    annotations?: Array<{ x: number; y: number; color: string; text: string }>;
    highlightLegendLabel?: string;
  }
): string {
  const width = opts?.width ?? 720;
  const height = opts?.height ?? 260;
  const padding = { left: 52, right: 16, top: 18, bottom: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const all = series.flatMap((s) => s.points);
  if (all.length < 2) {
    return `<div class="chart"><div class="chart-title">${esc(title)}</div><div class="chart-empty">(no data)</div></div>`;
  }

  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = Math.max(1e-9, xMax - xMin);
  const ySpan = Math.max(1e-9, yMax - yMin);

  const xScale = (x: number) => padding.left + ((x - xMin) / xSpan) * chartW;
  const yScale = (y: number) => padding.top + chartH - ((y - yMin) / ySpan) * chartH;

  const pathOf = (pts: SpiralReportCurvePoint[]) =>
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x).toFixed(1)} ${yScale(p.y).toFixed(1)}`)
      .join(" ");

  const pointSvg = opts?.point
    ? `<circle cx="${xScale(opts.point.x).toFixed(1)}" cy="${yScale(opts.point.y).toFixed(1)}" r="4" fill="${esc(opts.point.color)}" stroke="#fff" stroke-width="2" />`
    : "";

  const annSvg =
    opts?.annotations
      ?.map((a) => {
        const ax = xScale(a.x).toFixed(1);
        const ay = yScale(a.y).toFixed(1);
        const lines = a.text.split("\n");
        const tspans = lines
          .map((line, i) =>
            `<tspan x="${(Number(ax) + 6).toFixed(1)}" dy="${i === 0 ? 0 : 10}">${esc(line)}</tspan>`
          )
          .join("");
        return `
          <circle cx="${ax}" cy="${ay}" r="3" fill="${esc(a.color)}" stroke="#fff" stroke-width="2" />
          <text x="${(Number(ax) + 6).toFixed(1)}" y="${Math.max(12, Number(ay) - 6).toFixed(1)}" font-size="11" fill="${esc(
            a.color
          )}">${tspans}</text>
        `;
      })
      .join("\n") ?? "";

  const legend = series
    .map(
      (s) => {
        const isHighlight = opts?.highlightLegendLabel && s.label === opts.highlightLegendLabel;
        return `<span class="legend-item" style="${isHighlight ? "font-weight:800;color:#0f172a" : ""}"><span class="legend-swatch" style="background:${esc(
          s.color
        )}"></span>${esc(s.label)}${isHighlight ? " (default)" : ""}</span>`;
      }
    )
    .join("");

  return `
  <div class="chart">
    <div class="chart-title">${esc(title)}</div>
    <div class="legend">${legend}</div>
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#334155" stroke-width="1" />
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#334155" stroke-width="1" />
      ${series
        .map((s) => `<path d="${pathOf(s.points)}" fill="none" stroke="${esc(s.color)}" stroke-width="2" />`)
        .join("\n")}
      ${pointSvg}
      ${annSvg}
      <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#334155">${esc(
        opts?.xLabel ?? "x"
      )}</text>
      <text x="16" y="${height / 2}" text-anchor="middle" font-size="11" fill="#334155" transform="rotate(-90, 16, ${height / 2})">${esc(
        opts?.yLabel ?? "y"
      )}</text>
    </svg>
  </div>`;
}

export function generateSpiralReportDraftHTML(model: SpiralReportModel): string {
  const g = model.inputs.geometry;
  const r = model.results;

  const selectedCriterion = (model.meta.fatigueCriterion ?? "goodman") as
    | "goodman"
    | "gerber"
    | "soderberg";
  const selectedCriterionLabel =
    selectedCriterion === "goodman" ? "Goodman" : selectedCriterion === "gerber" ? "Gerber" : "Soderberg";

  const metaRows = [
    {
      label: "Project / 项目",
      value: model.meta.projectName ?? "—",
    },
    {
      label: "Engineer / 工程师",
      value: model.meta.engineer ?? "—",
    },
    {
      label: "Part No. / 零件号",
      value: model.meta.partNo ?? "—",
    },
  ];

  const torqueBandSvg = model.curves.torqueBand
    ? svgLineChart(
        "Torque Band (T-Theta)",
        [
          { label: "min", color: "#94a3b8", points: model.curves.torqueBand.min },
          { label: "nom", color: "#2563eb", points: model.curves.torqueBand.nom },
          { label: "max", color: "#0f766e", points: model.curves.torqueBand.max },
        ],
        {
          xLabel: "theta (deg)",
          yLabel: "T (N·mm)",
          annotations: (() => {
            const thetaMax = g.maxWorkingAngle;
            const pMin = nearestPoint(model.curves.torqueBand!.min, thetaMax);
            const pNom = nearestPoint(model.curves.torqueBand!.nom, thetaMax);
            const pMax = nearestPoint(model.curves.torqueBand!.max, thetaMax);
            const anns: Array<{ x: number; y: number; color: string; text: string }> = [];
            if (pMin) anns.push({ x: pMin.x, y: pMin.y, color: "#94a3b8", text: `Tmin=${fmt(pMin.y, 0)}` });
            if (pNom) anns.push({ x: pNom.x, y: pNom.y, color: "#2563eb", text: `Tnom=${fmt(pNom.y, 0)}` });
            if (pMax) anns.push({ x: pMax.x, y: pMax.y, color: "#0f766e", text: `Tmax=${fmt(pMax.y, 0)}` });
            return anns;
          })(),
        }
      )
    : "";

  const closeoutSvg = model.curves.closeout
    ? svgLineChart(
        "Close-out (T-Theta)",
        [
          { label: "linear", color: "#64748b", points: model.curves.closeout.linear },
          { label: "nonlinear", color: "#7c3aed", points: model.curves.closeout.nonlinear },
        ],
        {
          xLabel: "theta (deg)",
          yLabel: "T (N·mm)",
          annotations: (() => {
            const thetaMax = g.maxWorkingAngle;
            const thetaCs = r.closeout.thetaContactStartUsedDeg ?? null;
            const anns: Array<{ x: number; y: number; color: string; text: string }> = [];

            if (typeof thetaCs === "number" && Number.isFinite(thetaCs)) {
              const pCs = nearestPoint(model.curves.closeout!.nonlinear, thetaCs);
              if (pCs) {
                anns.push({
                  x: pCs.x,
                  y: pCs.y,
                  color: "#7c3aed",
                  text: `thetaCs=${fmt(pCs.x, 1)}\nTnl=${fmt(pCs.y, 0)}`,
                });
              }
            }

            const pMaxLin = nearestPoint(model.curves.closeout!.linear, thetaMax);
            const pMaxNl = nearestPoint(model.curves.closeout!.nonlinear, thetaMax);
            if (pMaxLin) {
              anns.push({
                x: pMaxLin.x,
                y: pMaxLin.y,
                color: "#64748b",
                text: `thetaMax=${fmt(pMaxLin.x, 1)}\nTlin=${fmt(pMaxLin.y, 0)}`,
              });
            }
            if (pMaxNl) {
              anns.push({
                x: pMaxNl.x,
                y: pMaxNl.y,
                color: "#7c3aed",
                text: `Tnl=${fmt(pMaxNl.y, 0)}`,
              });
            }

            return anns;
          })(),
        }
      )
    : "";

  const fatigueSvg = (() => {
    const Se = r.fatigue.Se_MPa ?? null;
    const Su = r.fatigue.Su_MPa ?? null;
    const Sy = r.fatigue.Sy_MPa ?? null;

    const isPos = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
    if (!isPos(Se) || !isPos(Su) || !model.curves.goodman) return "";

    const goodman = [{ x: 0, y: Se }, { x: Su, y: 0 }];

    const n = 60;
    const gerber: SpiralReportCurvePoint[] = [];
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * Su;
      const y = Se * (1 - Math.pow(x / Su, 2));
      gerber.push({ x, y: Math.max(0, y) });
    }

    const series: Array<{ label: string; color: string; points: SpiralReportCurvePoint[] }> = [
      { label: "Goodman", color: "#7c3aed", points: goodman },
      { label: "Gerber", color: "#2563eb", points: gerber },
    ];
    if (isPos(Sy)) {
      series.push({ label: "Soderberg", color: "#f59e0b", points: [{ x: 0, y: Se }, { x: Sy, y: 0 }] });
    }

    const pt = model.curves.goodman.point;
    return svgLineChart(
      "Fatigue (sigmaA-sigmaM)",
      series,
      {
        xLabel: "sigmaM (MPa)",
        yLabel: "sigmaA (MPa)",
        highlightLegendLabel: selectedCriterionLabel,
        point: pt ? { x: pt.sigmaM, y: pt.sigmaA, color: "#f59e0b" } : undefined,
        annotations: pt
          ? [
              {
                x: pt.sigmaM,
                y: pt.sigmaA,
                color: "#0f172a",
                text: `sigmam=${fmt(pt.sigmaM, 0)} sigmaa=${fmt(pt.sigmaA, 0)}\nSF G=${fmt(r.fatigue.fatigueSF_Goodman, 2)} Ge=${fmt(r.fatigue.fatigueSF_Gerber, 2)} S=${fmt(r.fatigue.fatigueSF_Soderberg, 2)}`,
              },
            ]
          : undefined,
      }
    );
  })();

  const messages = model.review?.messages?.length
    ? `<ul>${model.review.messages.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`
    : "<div class=\"muted\">(none)</div>";

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Spiral Torsion Report Draft</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif;color:#0f172a;background:#f8fafc;margin:0;padding:20px}
    .container{max-width:1024px;margin:0 auto}
    .header{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin-bottom:16px}
    .title{font-size:22px;font-weight:800;color:#5b21b6;margin:0}
    .sub{margin-top:6px;color:#64748b;font-size:12px}
    .section{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:16px}
    .section h2{font-size:14px;margin:0 0 10px 0;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .card{border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#f9fafb}
    .card h3{font-size:12px;margin:0 0 8px 0;color:#0f172a}
    .row{display:flex;justify-content:space-between;border-bottom:1px dotted #e2e8f0;padding:4px 0;font-size:12px}
    .row:last-child{border-bottom:none}
    .label{color:#64748b}
    .value{font-weight:700}
    .muted{color:#64748b;font-size:12px}
    .chart{margin-top:12px}
    .chart-title{font-weight:700;color:#0f172a;margin-bottom:6px}
    .legend{display:flex;gap:10px;flex-wrap:wrap;color:#475569;font-size:12px;margin-bottom:6px}
    .legend-item{display:flex;align-items:center;gap:6px}
    .legend-swatch{width:10px;height:10px;border-radius:999px;display:inline-block}
    .chart-empty{color:#64748b;font-size:12px}
    ul{margin:0;padding-left:18px;color:#475569;font-size:12px}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Spiral Torsion Report Draft</div>
      <div class="sub">Generated: ${esc(model.meta.generatedAtISO)} | Version: ${esc(model.meta.version)} | Language: ${esc(model.meta.language ?? "bilingual")}</div>
      <div class="grid2" style="margin-top:10px">
        <div class="card">
          <h3>Metadata / 报告信息</h3>
          ${metaRows
            .map((r) => `<div class="row"><span class="label">${esc(r.label)}</span><span class="value">${esc(r.value)}</span></div>`)
            .join("")}
        </div>
        <div class="card">
          <h3>Material / 材料</h3>
          <div class="row"><span class="label">Calculator material</span><span class="value">${esc(model.inputs.calculatorMaterial.id)}</span></div>
          ${model.inputs.engineeringMaterial ? `<div class="row"><span class="label">Engineering material</span><span class="value">${esc(model.inputs.engineeringMaterial.materialId)}</span></div>` : ""}
          ${model.inputs.engineeringMaterial ? `<div class="row"><span class="label">Surface</span><span class="value">${esc(model.inputs.engineeringMaterial.surface)}</span></div>` : ""}
          ${model.inputs.engineeringMaterial ? `<div class="row"><span class="label">Reliability</span><span class="value">${fmt(model.inputs.engineeringMaterial.reliability, 2)}</span></div>` : ""}
          ${model.inputs.engineeringMaterial ? `<div class="row"><span class="label">Shot peened</span><span class="value">${model.inputs.engineeringMaterial.shotPeened ? "Yes" : "No"}</span></div>` : ""}
          ${model.inputs.engineeringMaterial?.kPeen !== undefined ? `<div class="row"><span class="label">k_peen</span><span class="value">${fmt(model.inputs.engineeringMaterial.kPeen, 3)}</span></div>` : ""}
          ${model.inputs.engineeringMaterial?.shotPeenAssumptions?.length ? `<div class="row"><span class="label">Shot peen assumptions</span><span class="value">${model.inputs.engineeringMaterial.shotPeenAssumptions.slice(0, 4).map(esc).join("<br/>")}</span></div>` : ""}
          ${model.inputs.engineeringMaterial?.strengthBasis ? `<div class="row"><span class="label">Strength basis</span><span class="value">${esc(model.inputs.engineeringMaterial.strengthBasis)}</span></div>` : ""}
          ${model.inputs.engineeringMaterial?.heatTreatment ? `<div class="row"><span class="label">Heat treatment</span><span class="value">${esc(model.inputs.engineeringMaterial.heatTreatment)}</span></div>` : ""}
          ${model.inputs.engineeringMaterial?.kThickness !== undefined ? `<div class="row"><span class="label">k_thickness</span><span class="value">${fmt(model.inputs.engineeringMaterial.kThickness, 3)}</span></div>` : ""}
          ${model.inputs.engineeringMaterial?.kHeatTreatment !== undefined ? `<div class="row"><span class="label">k_heat_treatment</span><span class="value">${fmt(model.inputs.engineeringMaterial.kHeatTreatment, 3)}</span></div>` : ""}
          ${model.inputs.engineeringMaterial?.strengthAssumptions?.length ? `<div class="row"><span class="label">Assumptions</span><span class="value">${model.inputs.engineeringMaterial.strengthAssumptions.slice(0, 6).map(esc).join("<br/>")}</span></div>` : ""}
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Inputs</h2>
      <div class="grid2">
        <div class="card">
          <h3>Geometry</h3>
          <div class="row"><span class="label">b (mm)</span><span class="value">${fmt(g.stripWidth, 2)}</span></div>
          <div class="row"><span class="label">t (mm)</span><span class="value">${fmt(g.stripThickness, 3)}</span></div>
          <div class="row"><span class="label">L (mm)</span><span class="value">${fmt(g.activeLength, 1)}</span></div>
          <div class="row"><span class="label">Di (mm)</span><span class="value">${fmt(g.innerDiameter, 1)}</span></div>
          <div class="row"><span class="label">Do (mm)</span><span class="value">${fmt(g.outerDiameter, 1)}</span></div>
          <div class="row"><span class="label">theta0 (deg)</span><span class="value">${fmt(g.preloadAngle, 1)}</span></div>
          <div class="row"><span class="label">thetaMin (deg)</span><span class="value">${fmt(g.minWorkingAngle, 1)}</span></div>
          <div class="row"><span class="label">thetaMax (deg)</span><span class="value">${fmt(g.maxWorkingAngle, 1)}</span></div>
          <div class="row"><span class="label">thetaCo (deg)</span><span class="value">${fmt(g.closeOutAngle, 1)}</span></div>
        </div>
        <div class="card">
          <h3>End Kt / 端部 Kt</h3>
          <div class="row"><span class="label">innerEnd / 内端</span><span class="value">${esc(model.inputs.endKt?.innerEndKtType ?? "—")}</span></div>
          <div class="row"><span class="label">outerEnd / 外端</span><span class="value">${esc(model.inputs.endKt?.outerEndKtType ?? "—")}</span></div>
          <div class="row"><span class="label">governingKt</span><span class="value">${fmt(model.inputs.endKt?.governingKt, 2)}</span></div>
          <div class="row"><span class="label">innerKt</span><span class="value">${fmt(model.inputs.endKt?.innerKt, 2)}</span></div>
          <div class="row"><span class="label">outerKt</span><span class="value">${fmt(model.inputs.endKt?.outerKt, 2)}</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Results</h2>
      <div class="grid2">
        <div class="card">
          <h3>Core</h3>
          <div class="row"><span class="label">k (N*mm/deg)</span><span class="value">${fmt(r.springRate_NmmPerDeg, 4)}</span></div>
          <div class="row"><span class="label">sigmaMax_bending (MPa)</span><span class="value">${fmt(r.maxStress_MPa, 1)}</span></div>
          <div class="row"><span class="label">sigmaVM (MPa)</span><span class="value">${r.maxStress_MPa !== undefined ? fmt(Math.abs(r.maxStress_MPa), 1) : "—"}</span></div>
          <div class="row"><span class="label">Static SF</span><span class="value">${fmt(r.staticSafetyFactor, 2)}</span></div>
          <div class="row"><span class="label">Yield SF (Sy/sigmaMax)</span><span class="value">${model.review?.staticSF !== null && model.review?.staticSF !== undefined ? fmt(model.review.staticSF, 2) : "—"}</span></div>
        </div>
        <div class="card">
          <h3>Fatigue (Criteria)</h3>
          <div class="muted" style="margin:6px 0 10px 0">Selected: ${esc(
            selectedCriterionLabel
          )} / 当前选择：${esc(selectedCriterionLabel)} | Review basis: Goodman / 评审默认：Goodman</div>
          <div class="row"><span class="label">sigmaA (MPa)</span><span class="value">${fmt(r.fatigue.sigmaA_MPa, 1)}</span></div>
          <div class="row"><span class="label">sigmaM (MPa)</span><span class="value">${fmt(r.fatigue.sigmaM_MPa, 1)}</span></div>
          <div class="row"><span class="label">Se (MPa)</span><span class="value">${r.fatigue.Se_MPa === null ? "—" : fmt(r.fatigue.Se_MPa, 0)}</span></div>
          <div class="row"><span class="label">Su (MPa)</span><span class="value">${r.fatigue.Su_MPa === null ? "—" : fmt(r.fatigue.Su_MPa, 0)}</span></div>
          <div class="row"><span class="label">Sy (MPa)</span><span class="value">${r.fatigue.Sy_MPa === null ? "—" : fmt(r.fatigue.Sy_MPa, 0)}</span></div>
          <div class="row"><span class="label">SF (Goodman)</span><span class="value">${r.fatigue.fatigueSF_Goodman === null ? "—" : fmt(r.fatigue.fatigueSF_Goodman, 2)}</span></div>
          <div class="row"><span class="label">SF (Gerber)</span><span class="value">${r.fatigue.fatigueSF_Gerber === null ? "—" : fmt(r.fatigue.fatigueSF_Gerber, 2)}</span></div>
          <div class="row"><span class="label">SF (Soderberg)</span><span class="value">${r.fatigue.fatigueSF_Soderberg === null ? "—" : fmt(r.fatigue.fatigueSF_Soderberg, 2)}</span></div>
          <div class="row"><span class="label">Util (Goodman)</span><span class="value">${r.fatigue.utilization_Goodman === null ? "—" : fmt(r.fatigue.utilization_Goodman, 3)}</span></div>
          <div class="row"><span class="label">Util (Gerber)</span><span class="value">${r.fatigue.utilization_Gerber === null ? "—" : fmt(r.fatigue.utilization_Gerber, 3)}</span></div>
          <div class="row"><span class="label">Util (Soderberg)</span><span class="value">${r.fatigue.utilization_Soderberg === null ? "—" : fmt(r.fatigue.utilization_Soderberg, 3)}</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Engineering Review</h2>
      ${messages}
    </div>

    <div class="section">
      <h2>Curves</h2>
      ${torqueBandSvg}
      ${closeoutSvg}
      ${fatigueSvg}
    </div>

    <div class="muted" style="text-align:center; padding:10px 0;">ISRI-SHUANGDI Spring Engineering Platform</div>
  </div>
</body>
</html>`;
}
