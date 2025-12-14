/**
 * Arc Spring Report Generator
 * 弧形弹簧计算报告生成器
 */

import { ArcSpringInput, ArcSpringResult } from "./types";
import { ARC_SPRING_MATERIALS } from "./materials";

function formatNumber(n: number, decimals = 2): string {
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

function getMaterialName(key: string): string {
  const m = ARC_SPRING_MATERIALS.find(x => x.key === key);
  return m?.name ?? key;
}

function getHysteresisModeName(mode: string): string {
  switch (mode) {
    case "none": return "None (无迟滞)";
    case "constant": return "Constant Tf (恒定摩擦)";
    case "proportional": return "Proportional (比例摩擦)";
    default: return mode;
  }
}

function getSystemModeName(mode: string): string {
  switch (mode) {
    case "single": return "Single (单级)";
    case "dual_parallel": return "Dual Parallel (双级并联)";
    case "dual_staged": return "Dual Staged (双级分段)";
    default: return mode;
  }
}

export interface ArcSpringReportOptions {
  title?: string;
  projectName?: string;
  engineer?: string;
  includeChart?: boolean;
}

export function generateArcSpringReportHTML(
  input: ArcSpringInput,
  result: ArcSpringResult,
  options: ArcSpringReportOptions = {}
): string {
  const date = new Date().toLocaleDateString("zh-CN");
  const title = options.title ?? "Arc Spring Calculation Report / 弧形弹簧计算报告";
  const projectName = options.projectName ?? "—";
  const engineer = options.engineer ?? "—";

  const chartSvg = generateChartSVG(result);

  return `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1f2937;
      padding: 15mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header-left h1 { font-size: 18px; font-weight: 700; color: #1e40af; }
    .header-left p { font-size: 10px; color: #6b7280; margin-top: 4px; }
    .header-right { text-align: right; font-size: 10px; color: #6b7280; }
    .section { margin-bottom: 16px; }
    .section-title {
      font-size: 12px;
      font-weight: 600;
      color: #1e40af;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .param {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 8px;
    }
    .param-label { font-size: 9px; color: #64748b; }
    .param-value { font-size: 12px; font-weight: 600; color: #1e293b; }
    .param-unit { font-size: 9px; color: #94a3b8; margin-left: 2px; }
    .result-highlight {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .chart-container {
      margin-top: 16px;
      text-align: center;
    }
    .chart-title {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .formula-box {
      background: #fefce8;
      border: 1px solid #fde047;
      border-radius: 4px;
      padding: 8px;
      font-family: 'Courier New', monospace;
      font-size: 10px;
    }
    .warnings {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 4px;
      padding: 8px;
      color: #991b1b;
      font-size: 10px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { padding: 10mm; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${title}</h1>
      <p>ISRI-SHUANGDI Spring Engineering Platform</p>
    </div>
    <div class="header-right">
      <p>Date / 日期: ${date}</p>
      <p>Project / 项目: ${projectName}</p>
      <p>Engineer / 工程师: ${engineer}</p>
    </div>
  </div>

  <!-- Input Parameters -->
  <div class="section">
    <div class="section-title">Input Parameters / 输入参数</div>
    
    <div style="margin-bottom: 8px; font-size: 10px; font-weight: 600; color: #475569;">Geometry / 几何参数</div>
    <div class="grid">
      <div class="param">
        <div class="param-label">Wire Diameter d / 线径</div>
        <div class="param-value">${formatNumber(input.d)}<span class="param-unit">mm</span></div>
      </div>
      <div class="param">
        <div class="param-label">Mean Coil Diameter D / 中径</div>
        <div class="param-value">${formatNumber(input.D)}<span class="param-unit">mm</span></div>
      </div>
      <div class="param">
        <div class="param-label">Active Coils n / 有效圈数</div>
        <div class="param-value">${formatNumber(input.n, 1)}</div>
      </div>
    </div>

    <div style="margin: 8px 0; font-size: 10px; font-weight: 600; color: #475569;">Arc Layout / 弧形布局</div>
    <div class="grid">
      <div class="param">
        <div class="param-label">Working Radius r / 工作半径</div>
        <div class="param-value">${formatNumber(input.r)}<span class="param-unit">mm</span></div>
      </div>
      <div class="param">
        <div class="param-label">Free Angle α₀ / 自由角</div>
        <div class="param-value">${formatNumber(input.alpha0, 1)}<span class="param-unit">°</span></div>
      </div>
      <div class="param">
        <div class="param-label">Coil Bind Angle αc / 压并角</div>
        <div class="param-value">${formatNumber(input.alphaC, 1)}<span class="param-unit">°</span></div>
      </div>
    </div>

    <div style="margin: 8px 0; font-size: 10px; font-weight: 600; color: #475569;">Material & System / 材料与系统</div>
    <div class="grid">
      <div class="param">
        <div class="param-label">Material / 材料</div>
        <div class="param-value" style="font-size: 10px;">${getMaterialName(input.materialKey)}</div>
      </div>
      <div class="param">
        <div class="param-label">Hysteresis Mode / 迟滞模式</div>
        <div class="param-value" style="font-size: 10px;">${getHysteresisModeName(input.hysteresisMode ?? "none")}</div>
      </div>
      <div class="param">
        <div class="param-label">System Mode / 系统模式</div>
        <div class="param-value" style="font-size: 10px;">${getSystemModeName(input.systemMode ?? "single")}</div>
      </div>
    </div>
    ${input.hysteresisMode === "constant" ? `
    <div class="grid" style="margin-top: 8px;">
      <div class="param">
        <div class="param-label">Friction Torque Tf / 摩擦扭矩</div>
        <div class="param-value">${formatNumber(input.Tf_const ?? 0, 0)}<span class="param-unit">N·mm</span></div>
      </div>
    </div>
    ` : ""}
    ${input.hysteresisMode === "proportional" ? `
    <div class="grid" style="margin-top: 8px;">
      <div class="param">
        <div class="param-label">Friction Coefficient cf / 摩擦系数</div>
        <div class="param-value">${formatNumber(input.cf ?? 0, 3)}</div>
      </div>
    </div>
    ` : ""}
  </div>

  <!-- Calculation Results -->
  <div class="section">
    <div class="section-title">Calculation Results / 计算结果</div>
    
    <!-- Primary Result -->
    <div class="param result-highlight" style="background: #eef2ff; border: 1px solid #c7d2fe; margin-bottom: 8px;">
      <div class="param-label" style="color: #4f46e5;">Rotational Stiffness R / 旋转刚度 (核心参数)</div>
      <div class="param-value" style="font-size: 16px; color: #3730a3;">${formatNumber(result.R_deg)}<span class="param-unit">N·mm/deg</span></div>
    </div>
    
    <div class="grid-2">
      <div class="param result-highlight">
        <div class="param-label">Spring Rate k / 弹簧刚度 (切向)</div>
        <div class="param-value">${formatNumber(result.k)}<span class="param-unit">N/mm</span></div>
      </div>
      <div class="param result-highlight">
        <div class="param-label">Max Angle Δα / 最大转角</div>
        <div class="param-value">${formatNumber(result.deltaAlphaMax, 1)}<span class="param-unit">°</span></div>
      </div>
      <div class="param result-highlight">
        <div class="param-label">Max Torque (Load) / 最大加载扭矩</div>
        <div class="param-value">${formatNumber(result.MMax_load, 0)}<span class="param-unit">N·mm</span></div>
      </div>
      <div class="param result-highlight">
        <div class="param-label">Max Torque (Unload) / 最大卸载扭矩</div>
        <div class="param-value">${formatNumber(result.MMax_unload, 0)}<span class="param-unit">N·mm</span></div>
      </div>
    </div>
    
    <!-- Geometry & Safety -->
    <div style="margin-top: 12px; font-size: 10px; font-weight: 600; color: #475569;">Geometry & Safety / 几何与安全</div>
    <div class="grid">
      <div class="param">
        <div class="param-label">Outer Diameter De / 外径</div>
        <div class="param-value">${formatNumber(result.De, 1)}<span class="param-unit">mm</span></div>
      </div>
      <div class="param">
        <div class="param-label">Inner Diameter Di / 内径</div>
        <div class="param-value">${formatNumber(result.Di, 1)}<span class="param-unit">mm</span></div>
      </div>
      <div class="param">
        <div class="param-label">Safety Margin / 安全裕度</div>
        <div class="param-value">${formatNumber(result.safetyMarginToSolid, 1)}<span class="param-unit">°</span></div>
      </div>
    </div>
    ${result.housingClearance !== undefined ? `
    <div class="param" style="margin-top: 8px; ${result.housingClearance < (input.minClearance ?? 1) ? 'background: #fef2f2; border-color: #fecaca;' : 'background: #f0fdf4; border-color: #bbf7d0;'}">
      <div class="param-label">Housing Clearance / 滑壳间隙</div>
      <div class="param-value">${formatNumber(result.housingClearance, 1)}<span class="param-unit">mm</span> ${result.housingClearance < (input.minClearance ?? 1) ? '⚠️ Too small!' : '✓ OK'}</div>
    </div>
    ` : ""}
    
    <!-- Stress Analysis -->
    <div style="margin-top: 12px; font-size: 10px; font-weight: 600; color: #475569;">Stress Analysis / 应力分析 (Wahl Factor)</div>
    <div class="grid">
      <div class="param" style="background: #fff1f2; border-color: #fecdd3;">
        <div class="param-label" style="color: #be123c;">Spring Index C / 弹簧指数</div>
        <div class="param-value" style="color: #9f1239;">${formatNumber(result.springIndex, 2)}</div>
      </div>
      <div class="param" style="background: #fff1f2; border-color: #fecdd3;">
        <div class="param-label" style="color: #be123c;">Wahl Factor K_W / 应力修正因子</div>
        <div class="param-value" style="color: #9f1239;">${formatNumber(result.wahlFactor, 3)}</div>
      </div>
      <div class="param" style="background: #fff1f2; border-color: #fecdd3;">
        <div class="param-label" style="color: #be123c;">Max Shear Stress τ_max / 最大剪切应力</div>
        <div class="param-value" style="color: #9f1239;">${formatNumber(result.tauMax, 0)}<span class="param-unit">MPa</span></div>
      </div>
    </div>
    
    <!-- Damping -->
    ${input.hysteresisMode !== "none" ? `
    <div style="margin-top: 12px; font-size: 10px; font-weight: 600; color: #475569;">Damping / 阻尼</div>
    <div class="grid-2">
      <div class="param" style="background: #faf5ff; border-color: #e9d5ff;">
        <div class="param-label" style="color: #7c3aed;">Hysteresis Work / 阻尼能量</div>
        <div class="param-value" style="color: #6d28d9;">${formatNumber(result.hysteresisWork, 0)}<span class="param-unit">N·mm·deg</span></div>
      </div>
      <div class="param" style="background: #faf5ff; border-color: #e9d5ff;">
        <div class="param-label" style="color: #7c3aed;">Damping Capacity / 阻尼效率</div>
        <div class="param-value" style="color: #6d28d9;">${formatNumber(result.dampingCapacity, 1)}<span class="param-unit">%</span></div>
      </div>
    </div>
    ` : ""}
    
    <!-- Dual System -->
    ${result.engageAngleMarker !== undefined || result.spring2Clearance !== undefined ? `
    <div style="margin-top: 12px; font-size: 10px; font-weight: 600; color: #475569;">Dual System / 双级系统</div>
    <div class="grid-2">
      ${result.engageAngleMarker !== undefined ? `
      <div class="param" style="background: #fffbeb; border-color: #fde68a;">
        <div class="param-label" style="color: #b45309;">Engage Angle / 拐点角度</div>
        <div class="param-value" style="color: #92400e;">${formatNumber(result.engageAngleMarker, 1)}<span class="param-unit">°</span></div>
      </div>
      ` : ""}
      ${result.spring2Clearance !== undefined ? `
      <div class="param" style="${result.spring2Clearance < (input.minClearance ?? 1) ? 'background: #fef2f2; border-color: #fecaca;' : 'background: #f0fdf4; border-color: #bbf7d0;'}">
        <div class="param-label">Spring Clearance / 弹簧间隙</div>
        <div class="param-value">${formatNumber(result.spring2Clearance, 1)}<span class="param-unit">mm</span></div>
      </div>
      ` : ""}
    </div>
    ` : ""}
  </div>

  <!-- Formulas -->
  <div class="section">
    <div class="section-title">Engineering Formulas / 工程公式</div>
    <div class="formula-box">
      <p><strong>Spring Rate:</strong> k = G·d⁴ / (8·D³·n) [N/mm]</p>
      <p><strong>Rotational Stiffness:</strong> R = k·r²·(π/180) [N·mm/deg]</p>
      <p><strong>Torque:</strong> M(α) = F(α)·r = k·x·r = k·r²·Δα(rad) [N·mm]</p>
      <p><strong>Hysteresis:</strong> M_load = M + Tf, M_unload = M - Tf</p>
    </div>
  </div>

  ${result.warnings.length > 0 ? `
  <div class="section">
    <div class="section-title">Warnings / 警告</div>
    <div class="warnings">
      ${result.warnings.map(w => `<p>⚠️ ${w}</p>`).join("")}
    </div>
  </div>
  ` : ""}

  <!-- Chart -->
  <div class="section">
    <div class="section-title">Torque–Angle Curve / 扭矩-角度曲线</div>
    <div class="chart-container">
      ${chartSvg}
      <p style="font-size: 9px; color: #6b7280; margin-top: 4px;">
        Blue: Loading (加载) | Orange: Unloading (卸载)
      </p>
    </div>
  </div>

  <div class="footer">
    <p>Generated by ISRI-SHUANGDI Spring Engineering Platform</p>
    <p>This report is for reference only. Please verify all calculations before production use.</p>
  </div>
</body>
</html>
`;
}

function generateChartSVG(result: ArcSpringResult): string {
  if (result.curve.length === 0) {
    return '<p style="color: #9ca3af;">No data available</p>';
  }

  const width = 500;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxX = result.deltaAlphaMax;
  const maxY = Math.max(result.MMax_load, Math.abs(result.MMax_unload)) * 1.1;
  const minY = Math.min(0, result.curve[result.curve.length - 1]?.M_unload ?? 0) * 1.1;

  const scaleX = (x: number) => padding.left + (x / maxX) * chartWidth;
  const scaleY = (y: number) => padding.top + chartHeight - ((y - minY) / (maxY - minY)) * chartHeight;

  // Generate path data
  const loadPath = result.curve
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.deltaDeg).toFixed(1)} ${scaleY(p.M_load).toFixed(1)}`)
    .join(" ");
  
  const unloadPath = result.curve
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.deltaDeg).toFixed(1)} ${scaleY(p.M_unload).toFixed(1)}`)
    .join(" ");

  // Grid lines
  const gridLinesX = [];
  const gridLinesY = [];
  const xTicks = 5;
  const yTicks = 5;

  for (let i = 0; i <= xTicks; i++) {
    const x = padding.left + (i / xTicks) * chartWidth;
    const val = (maxX * i / xTicks).toFixed(0);
    gridLinesX.push(`<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + chartHeight}" stroke="#e5e7eb" stroke-width="1"/>`);
    gridLinesX.push(`<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="9" fill="#6b7280">${val}°</text>`);
  }

  for (let i = 0; i <= yTicks; i++) {
    const y = padding.top + (i / yTicks) * chartHeight;
    const val = (maxY - (maxY - minY) * i / yTicks).toFixed(0);
    gridLinesY.push(`<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`);
    gridLinesY.push(`<text x="${padding.left - 5}" y="${y + 3}" text-anchor="end" font-size="9" fill="#6b7280">${val}</text>`);
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Grid -->
  ${gridLinesX.join("\n  ")}
  ${gridLinesY.join("\n  ")}
  
  <!-- Axes -->
  <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#374151" stroke-width="1"/>
  <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#374151" stroke-width="1"/>
  
  <!-- Axis labels -->
  <text x="${width / 2}" y="${height - 2}" text-anchor="middle" font-size="10" fill="#374151">Δα (deg)</text>
  <text x="12" y="${height / 2}" text-anchor="middle" font-size="10" fill="#374151" transform="rotate(-90, 12, ${height / 2})">M (N·mm)</text>
  
  <!-- Data lines -->
  <path d="${loadPath}" fill="none" stroke="#2563eb" stroke-width="2"/>
  <path d="${unloadPath}" fill="none" stroke="#ea580c" stroke-width="2"/>
</svg>
`;
}

/**
 * Trigger PDF download via print dialog
 */
export function downloadArcSpringPDF(
  input: ArcSpringInput,
  result: ArcSpringResult,
  options: ArcSpringReportOptions = {}
): void {
  const html = generateArcSpringReportHTML(input, result, options);
  
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
}
