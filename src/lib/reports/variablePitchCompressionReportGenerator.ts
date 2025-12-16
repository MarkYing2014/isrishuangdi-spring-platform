import type { VariablePitchCompressionReportPayload } from "@/lib/reports/variablePitchCompressionReport";

export type VariablePitchCompressionReportMeta = {
  title?: string;
  projectName?: string;
  engineer?: string;
  language?: "en" | "zh" | "bilingual";
};

function fmt(n: unknown, decimals = 2): string {
  const v = typeof n === "number" ? n : Number.NaN;
  if (!isFinite(v)) return "—";
  return Number(v.toFixed(decimals)).toLocaleString();
}

function t(lang: VariablePitchCompressionReportMeta["language"], en: string, zh: string): string {
  if (lang === "zh") return zh;
  if (lang === "en") return en;
  return `${en} / ${zh}`;
}

function generateCurveSvg(payload: VariablePitchCompressionReportPayload): string {
  const xs = payload.curves.deflection;
  const ys = payload.curves.load;

  const points = xs
    .map((x, i) => ({ x, y: ys[i] ?? 0 }))
    .filter((p) => isFinite(p.x) && isFinite(p.y));

  const width = 720;
  const height = 260;
  const padding = { left: 40, right: 16, top: 18, bottom: 30 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xMin = points.length ? Math.min(...points.map((p) => p.x)) : 0;
  const xMax = points.length ? Math.max(...points.map((p) => p.x)) : 1;
  const yMin = 0;
  const yMax = points.length ? Math.max(...points.map((p) => p.y)) : 1;

  const xSpan = Math.max(1e-9, xMax - xMin);
  const ySpan = Math.max(1e-9, yMax - yMin);

  const xScale = (x: number) => padding.left + ((x - xMin) / xSpan) * innerW;
  const yScale = (y: number) => padding.top + innerH - ((y - yMin) / ySpan) * innerH;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x).toFixed(1)} ${yScale(p.y).toFixed(1)}`)
    .join(" ");

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
  <line x1="${padding.left}" y1="${padding.top + innerH}" x2="${width - padding.right}" y2="${padding.top + innerH}" stroke="#94a3b8" stroke-width="1"/>
  <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + innerH}" stroke="#94a3b8" stroke-width="1"/>
  <path d="${path}" fill="none" stroke="#2563eb" stroke-width="2"/>
  <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#334155">Δx (mm)</text>
  <text x="14" y="${height / 2}" text-anchor="middle" font-size="11" fill="#334155" transform="rotate(-90, 14, ${height / 2})">F (N)</text>
</svg>
`;
}

export function generateVariablePitchCompressionReportHTML(
  payload: VariablePitchCompressionReportPayload,
  meta: VariablePitchCompressionReportMeta = {}
): string {
  const lang = meta.language ?? "bilingual";
  const title = meta.title ?? t(lang, "Variable Pitch Compression Spring Report", "变节距压缩弹簧报告");

  const generatedAt = new Date().toLocaleString();
  const project = meta.projectName ?? "—";
  const engineer = meta.engineer ?? "—";

  const spring = payload.spring;

  const segmentsRows = payload.segments
    .map(
      (s) => `
<tr>
  <td>${s.index + 1}</td>
  <td>${fmt(s.coils, 2)}</td>
  <td>${fmt(s.pitch, 2)}</td>
  <td>${fmt(s.bindCapacity, 2)}</td>
</tr>`
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #0f172a; margin: 24px; }
    h1 { margin: 0; font-size: 20px; }
    .sub { margin-top: 6px; color: #64748b; font-size: 12px; }
    .meta { margin-top: 10px; display: flex; gap: 16px; flex-wrap: wrap; color: #475569; font-size: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; }
    .kv { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; padding: 3px 0; }
    .kv span:first-child { color: #64748b; }
    .section { margin-top: 18px; }
    .section h2 { font-size: 14px; margin: 0 0 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 6px; text-align: left; }
    th { background: #f1f5f9; color: #475569; }
    .chart { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; background: #ffffff; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="sub">${t(lang, "Generated", "生成")}: ${generatedAt}</div>
  <div class="meta">
    <div>${t(lang, "Project", "项目")}: <b>${project}</b></div>
    <div>${t(lang, "Engineer", "工程师")}: <b>${engineer}</b></div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="kv"><span>d (mm)</span><span><b>${fmt(spring.wireDiameter, 2)}</b></span></div>
      <div class="kv"><span>Dm (mm)</span><span><b>${fmt(spring.meanDiameter, 2)}</b></span></div>
      <div class="kv"><span>Nt</span><span><b>${fmt(spring.totalCoils, 2)}</b></span></div>
      <div class="kv"><span>Na0</span><span><b>${fmt(spring.activeCoils0, 2)}</b></span></div>
      <div class="kv"><span>G (MPa)</span><span><b>${fmt(spring.shearModulus, 0)}</b></span></div>
      <div class="kv"><span>L0 (mm)</span><span><b>${fmt(spring.freeLength, 2)}</b></span></div>
      <div class="kv"><span>${t(lang, "Material", "材料")}</span><span><b>${spring.materialName ?? spring.materialId ?? "—"}</b></span></div>
    </div>
    <div class="card">
      <div class="kv"><span>springIndex C</span><span><b>${fmt(payload.summary.springIndex, 3)}</b></span></div>
      <div class="kv"><span>Wahl Kw</span><span><b>${fmt(payload.summary.wahlFactor, 3)}</b></span></div>
      <div class="kv"><span>deltaMax (mm)</span><span><b>${fmt(payload.summary.deltaMax, 2)}</b></span></div>
      <div class="kv"><span>${t(lang, "Issues", "问题")}</span><span><b>${payload.summary.issues.length}</b></span></div>
      ${payload.summary.issues.length ? `<div class="sub" style="margin-top:6px;">${payload.summary.issues.map((x) => `- ${x}`).join("<br/>")}</div>` : ""}
    </div>
  </div>

  <div class="section">
    <h2>${t(lang, "Segments", "分段")}</h2>
    <div class="card" style="background:#fff;">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Ni</th>
            <th>pi (mm)</th>
            <th>Ni*(pi-d)</th>
          </tr>
        </thead>
        <tbody>
          ${segmentsRows}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <h2>${t(lang, "Force-Deflection", "力-位移")}</h2>
    <div class="chart">
      ${generateCurveSvg(payload)}
    </div>
  </div>
</body>
</html>`;
}

export function downloadVariablePitchCompressionPDF(
  payload: VariablePitchCompressionReportPayload,
  meta: VariablePitchCompressionReportMeta = {}
): void {
  const body = JSON.stringify({ payload, meta: { ...meta, language: meta.language ?? "bilingual" } });

  fetch("/api/reports/variable-pitch-compression", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `variable-pitch-compression-report-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch(() => {
      printVariablePitchCompressionReport(payload, meta);
    });
}

export function printVariablePitchCompressionReport(
  payload: VariablePitchCompressionReportPayload,
  meta: VariablePitchCompressionReportMeta = {}
): void {
  const html = generateVariablePitchCompressionReportHTML(payload, meta);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
}
