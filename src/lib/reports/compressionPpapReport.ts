import type { CompressionSpringEds, CompressionPpapCtq, CompressionProcessStep } from "@/lib/eds/engineeringDefinition";
import type { ResolveCompressionNominalResult } from "@/lib/eds/compressionResolver";
import type { AnalysisResult } from "@/lib/stores/springDesignStore";

export type CompressionPpapReportModel = {
  meta: {
    generatedAtISO: string;
    version: "ppap_v1";
  };

  inputs: {
    eds: CompressionSpringEds;
    resolved: ResolveCompressionNominalResult;
    analysisResult: AnalysisResult;
  };

  ppap: {
    customer?: string;
    partNumber?: string;
    rev?: string;
    submissionLevel?: string;
    ctq: CompressionPpapCtq[];
  };

  process: {
    route: CompressionProcessStep[];
  };
};

export function buildCompressionPpapReport(
  eds: CompressionSpringEds,
  resolved: ResolveCompressionNominalResult,
  analysisResult: AnalysisResult
): CompressionPpapReportModel {
  const ppap = eds.quality?.ppap;
  return {
    meta: {
      generatedAtISO: new Date().toISOString(),
      version: "ppap_v1",
    },
    inputs: {
      eds,
      resolved,
      analysisResult,
    },
    ppap: {
      customer: ppap?.customer,
      partNumber: ppap?.partNumber,
      rev: ppap?.rev,
      submissionLevel: ppap?.submissionLevel,
      ctq: ppap?.ctq ?? [],
    },
    process: {
      route: eds.process?.route ?? [],
    },
  };
}

function esc(x: string): string {
  return x
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function generateCompressionPpapReportHTML(model: CompressionPpapReportModel): string {
  const g = model.inputs.resolved.design;
  const a = model.inputs.analysisResult;

  const ctqRows = model.ppap.ctq
    .map(
      (c) => `
<tr>
  <td>${esc(c.characteristic ?? "")}</td>
  <td>${esc(c.spec ?? "")}</td>
  <td>${esc(c.method ?? "")}</td>
  <td>${esc(c.frequency ?? "")}</td>
  <td>${esc(c.reactionPlan ?? "")}</td>
</tr>`
    )
    .join("\n");

  const routeRows = model.process.route
    .map(
      (s, idx) => `
<tr>
  <td>${idx + 1}</td>
  <td>${esc(s.stepName ?? "")}</td>
  <td>${esc(s.machine ?? "")}</td>
  <td>${esc(s.keyParams ?? "")}</td>
  <td>${esc(s.operatorCheck ?? "")}</td>
  <td>${esc(s.inProcessCheck ?? "")}</td>
</tr>`
    )
    .join("\n");

  const fmt = (v: unknown, decimals = 2) => {
    const n = typeof v === "number" ? v : Number.NaN;
    if (!isFinite(n)) return "—";
    return Number(n.toFixed(decimals)).toLocaleString();
  };

  const title = "Compression Spring PPAP (V1)";

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
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; }
    .kv { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; padding: 3px 0; }
    .kv span:first-child { color: #64748b; }
    .section { margin-top: 18px; }
    .section h2 { font-size: 14px; margin: 0 0 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 6px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; color: #475569; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="sub">Generated: ${esc(model.meta.generatedAtISO)}</div>

  <div class="grid">
    <div class="card">
      <div class="kv"><span>wireDiameter d (mm)</span><span><b>${fmt(g.wireDiameter, 2)}</b></span></div>
      <div class="kv"><span>meanDiameter Dm (mm)</span><span><b>${fmt(g.meanDiameter, 2)}</b></span></div>
      <div class="kv"><span>activeCoils Na</span><span><b>${fmt(g.activeCoils, 2)}</b></span></div>
      <div class="kv"><span>totalCoils Nt</span><span><b>${fmt(g.totalCoils, 2)}</b></span></div>
      <div class="kv"><span>freeLength L0 (mm)</span><span><b>${fmt(g.freeLength, 2)}</b></span></div>
      <div class="kv"><span>materialId</span><span><b>${esc(g.materialId ?? model.inputs.eds.material.materialId ?? "—")}</b></span></div>
    </div>
    <div class="card">
      <div class="kv"><span>springRate k (N/mm)</span><span><b>${fmt(a.springRate, 4)}</b></span></div>
      <div class="kv"><span>workingLoad F (N)</span><span><b>${fmt(a.workingLoad, 2)}</b></span></div>
      <div class="kv"><span>shearStress τ (MPa)</span><span><b>${fmt(a.shearStress, 1)}</b></span></div>
      <div class="kv"><span>springIndex C</span><span><b>${fmt(a.springIndex, 3)}</b></span></div>
      <div class="kv"><span>Wahl Kw</span><span><b>${fmt(a.wahlFactor, 3)}</b></span></div>
    </div>
  </div>

  <div class="section">
    <h2>PPAP</h2>
    <div class="card" style="background:#fff;">
      <div class="kv"><span>customer</span><span><b>${esc(model.ppap.customer ?? "—")}</b></span></div>
      <div class="kv"><span>partNumber</span><span><b>${esc(model.ppap.partNumber ?? "—")}</b></span></div>
      <div class="kv"><span>rev</span><span><b>${esc(model.ppap.rev ?? "—")}</b></span></div>
      <div class="kv"><span>submissionLevel</span><span><b>${esc(model.ppap.submissionLevel ?? "—")}</b></span></div>
    </div>
  </div>

  <div class="section">
    <h2>CTQ</h2>
    <div class="card" style="background:#fff;">
      <table>
        <thead>
          <tr>
            <th>Characteristic</th>
            <th>Spec</th>
            <th>Method</th>
            <th>Frequency</th>
            <th>Reaction Plan</th>
          </tr>
        </thead>
        <tbody>
          ${ctqRows || "<tr><td colspan=\"5\">—</td></tr>"}
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <h2>Process Route</h2>
    <div class="card" style="background:#fff;">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Step</th>
            <th>Machine</th>
            <th>Key Params</th>
            <th>Operator Check</th>
            <th>In-process Check</th>
          </tr>
        </thead>
        <tbody>
          ${routeRows || "<tr><td colspan=\"6\">—</td></tr>"}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}
