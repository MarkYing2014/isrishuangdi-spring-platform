import type { SpiralTorsionGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";

function formatNumber(n: number, decimals = 2): string {
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

export interface SpiralTorsionReportOptions {
  title?: string;
  projectName?: string;
  engineer?: string;
}

export interface SpiralTorsionReportExtras {
  innerEndKtType?: "clamped" | "slot" | "hole" | "rivet" | "hook" | "custom";
  outerEndKtType?: "clamped" | "slot" | "hole" | "rivet" | "hook" | "custom";
  innerKt?: number;
  outerKt?: number;
  toleranceT?: number;
  toleranceB?: number;
  toleranceL?: number;
  toleranceE?: number;
  toleranceEMode?: "MPa" | "%";
  hardeningFactor?: number;
  enableNonlinearCloseout?: boolean;
  thetaContactStartDeg?: number;
  hardeningA?: number;
  hardeningP?: number;
}

function buildCurveSVG(points: Array<{ thetaDeg: number; torque: number }>): string {
  if (points.length < 2) return "";

  const width = 640;
  const height = 260;
  const padding = { left: 44, right: 16, top: 16, bottom: 34 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xs = points.map((p) => p.thetaDeg);
  const ys = points.map((p) => p.torque);

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);

  const xScale = (x: number) => {
    if (xMax - xMin <= 1e-9) return padding.left;
    return padding.left + ((x - xMin) / (xMax - xMin)) * chartW;
  };
  const yScale = (y: number) => {
    if (yMax - yMin <= 1e-9) return padding.top + chartH;
    return padding.top + chartH - ((y - yMin) / (yMax - yMin)) * chartH;
  };

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.thetaDeg).toFixed(1)} ${yScale(p.torque).toFixed(1)}`)
    .join(" ");

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#374151" stroke-width="1"/>
  <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="#374151" stroke-width="1"/>
  <text x="${width / 2}" y="${height - 6}" text-anchor="middle" font-size="10" fill="#374151">θ (deg)</text>
  <text x="12" y="${height / 2}" text-anchor="middle" font-size="10" fill="#374151" transform="rotate(-90, 12, ${height / 2})">T (N·mm)</text>
  <path d="${path}" fill="none" stroke="#2563eb" stroke-width="2"/>
</svg>`;
}

export function generateSpiralTorsionReportHTML(
  geometry: SpiralTorsionGeometry,
  material: MaterialInfo,
  analysisResult: AnalysisResult,
  extras: SpiralTorsionReportExtras = {},
  options: SpiralTorsionReportOptions = {}
): string {
  const date = new Date().toLocaleDateString("zh-CN");
  const title = options.title ?? "Spiral Torsion Spring Report / 螺旋扭转弹簧工程报告";
  const projectName = options.projectName ?? "—";
  const engineer = options.engineer ?? "—";

  const b = geometry.stripWidth;
  const t = geometry.stripThickness;
  const L = geometry.activeLength;

  const k = analysisResult.springRate;
  const theta0 = geometry.preloadAngle;
  const thetaMin = geometry.minWorkingAngle;
  const thetaMax = geometry.maxWorkingAngle;
  const thetaCo = geometry.closeOutAngle;

  const preloadTorque = k * theta0;
  const minTorque = preloadTorque + k * thetaMin;
  const maxTorqueClamped = preloadTorque + k * Math.min(thetaMax, thetaCo);
  const closeOutTorque = preloadTorque + k * thetaCo;

  const staticFoS = analysisResult.staticSafetyFactor ?? NaN;
  const sigmaFromStore = analysisResult.maxStress ?? NaN;

  // If store provides a static safety factor and stress, we can back-calculate an allowable stress.
  const sigmaAllowDerived = isFinite(sigmaFromStore) && isFinite(staticFoS) ? sigmaFromStore * staticFoS : NaN;

  const nominalStressAtTorque = (torque: number) => (6 * torque) / (b * t * t);
  const sigmaNomMin = nominalStressAtTorque(minTorque);
  const sigmaNomMax = nominalStressAtTorque(maxTorqueClamped);

  // End Kt (governing)
  const innerKt = Math.max(1, extras.innerKt ?? 1);
  const outerKt = Math.max(1, extras.outerKt ?? 1);
  const governingKt = Math.max(innerKt, outerKt);

  // Peak stress used for fatigue: σ_peak = governingKt × σ_nominal
  const sigmaMin = governingKt * sigmaNomMin;
  const sigmaMax = governingKt * sigmaNomMax;
  const sigmaA = (sigmaMax - sigmaMin) / 2;
  const sigmaM = (sigmaMax + sigmaMin) / 2;

  const UTS = material.tensileStrength ?? null;
  const Se = UTS ? 0.5 * UTS : null;
  const goodmanDen = UTS && Se ? (sigmaA / Se + sigmaM / UTS) : null;
  const fatigueFoS = goodmanDen && goodmanDen > 0 ? 1 / goodmanDen : null;

  const tolT = extras.toleranceT ?? 0.02;
  const tolB = extras.toleranceB ?? 0.1;
  const tolL = extras.toleranceL ?? 5;
  const tolE = extras.toleranceE ?? 0;
  const tolEMode = extras.toleranceEMode ?? "MPa";

  const clampPositive = (x: number) => Math.max(1e-9, x);
  const bMin = clampPositive(b - tolB);
  const bMax = b + tolB;
  const tMin = clampPositive(t - tolT);
  const tMax = t + tolT;
  const LMin = clampPositive(L - tolL);
  const LMax = L + tolL;

  const E0 = material.elasticModulus;
  const dEOverE = tolEMode === "%" ? tolE / 100 : (Math.abs(E0) > 1e-9 ? tolE / E0 : 0);
  const EMin = clampPositive(E0 * (1 - dEOverE));
  const EMax = clampPositive(E0 * (1 + dEOverE));

  const kMin = k * (bMin / b) * Math.pow(tMin / t, 3) * (L / LMax) * (E0 > 0 ? EMin / E0 : 1);
  const kMax = k * (bMax / b) * Math.pow(tMax / t, 3) * (L / LMin) * (E0 > 0 ? EMax / E0 : 1);

  const thetaUsed = Math.min(thetaMax, thetaCo);
  const TmaxBandMin = preloadTorque + kMin * thetaUsed;
  const TmaxBandMax = preloadTorque + kMax * thetaUsed;

  const hardeningFactor = extras.hardeningFactor ?? 8;
  const deltaBeyond = Math.max(0, thetaMax - thetaCo);
  const maxTorqueHardening = deltaBeyond > 0 ? closeOutTorque + k * hardeningFactor * deltaBeyond : null;

  const curveLinear: Array<{ thetaDeg: number; torque: number }> = [];
  const curveNonlinear: Array<{ thetaDeg: number; torque: number }> = [];

  const maxPlotTheta = Math.max(thetaMax, thetaCo);
  const samples = 80;
  for (let i = 0; i <= samples; i++) {
    const th = (i / samples) * maxPlotTheta;
    const tLin = preloadTorque + k * Math.min(th, thetaCo);
    curveLinear.push({ thetaDeg: th, torque: tLin });
  }

  const enableNonlinearCloseout = extras.enableNonlinearCloseout ?? false;
  if (enableNonlinearCloseout) {
    const clampTheta = (x: number) => Math.max(0, x);
    const thetaContactStart = clampTheta(extras.thetaContactStartDeg ?? 0.85 * thetaCo);
    const thetaC1 = Math.min(thetaContactStart, thetaCo);
    const A = extras.hardeningA ?? 6.0;
    const p = extras.hardeningP ?? 2.5;
    const denom = Math.max(1e-9, thetaCo - thetaC1);

    const kAt = (thetaDeg: number) => {
      const th = clampTheta(thetaDeg);
      if (th <= thetaC1) return k;
      const xi = Math.min(1, Math.max(0, (th - thetaC1) / denom));
      return k * (1 + A * Math.pow(xi, p));
    };

    let acc = preloadTorque;
    let prevTheta = 0;
    let prevK = kAt(0);
    curveNonlinear.push({ thetaDeg: 0, torque: acc });

    for (let i = 1; i <= samples; i++) {
      const th = (i / samples) * maxPlotTheta;
      const thUse = Math.min(th, thetaCo);
      const kNow = kAt(thUse);
      const dTheta = thUse - prevTheta;
      acc += 0.5 * (prevK + kNow) * dTheta;
      prevTheta = thUse;
      prevK = kNow;
      curveNonlinear.push({ thetaDeg: th, torque: acc });
    }
  } else {
    for (let i = 0; i <= samples; i++) {
      const th = (i / samples) * maxPlotTheta;
      if (th <= thetaCo) {
        curveNonlinear.push({ thetaDeg: th, torque: preloadTorque + k * th });
      } else {
        const tHard = closeOutTorque + k * hardeningFactor * (th - thetaCo);
        curveNonlinear.push({ thetaDeg: th, torque: tHard });
      }
    }
  }

  const chartSvg = buildCurveSVG(curveLinear);
  const chartNonlinearSvg = enableNonlinearCloseout ? buildCurveSVG(curveNonlinear) : "";

  const warnings: string[] = [];
  if (thetaMax > thetaCo) {
    warnings.push("Working angle exceeds close-out (θ_max > θ_co)");
  }
  if (!isFinite(sigmaAllowDerived)) {
    warnings.push("Allowable stress is not available (cannot derive from store)");
  }

  const warningHtml = warnings.length
    ? `<div class="warn"><div class="warn-title">Warnings / 警告</div>${warnings
        .map((w) => `<div class="warn-item">${w}</div>`)
        .join("")}</div>`
    : "";

  return `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #111827;
      padding: 15mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 12px;
      margin-bottom: 18px;
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
    .param-value { font-size: 12px; font-weight: 600; color: #0f172a; }
    .param-unit { font-size: 9px; color: #94a3b8; margin-left: 2px; }
    .highlight { background: #eff6ff; border-color: #bfdbfe; }
    .warn {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 10px 12px;
      margin-top: 10px;
    }
    .warn-title { font-weight: 700; color: #991b1b; font-size: 11px; margin-bottom: 6px; }
    .warn-item { color: #7f1d1d; font-size: 10px; margin: 2px 0; }
    .formula {
      background: #fefce8;
      border: 1px solid #fde047;
      border-radius: 6px;
      padding: 10px 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 10px;
      color: #854d0e;
      margin-top: 8px;
    }
    .chart {
      margin-top: 10px;
      text-align: center;
    }
    .chart-title {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
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

  <div class="section">
    <div class="section-title">Input Parameters / 输入参数</div>

    <div style="margin-bottom: 8px; font-size: 10px; font-weight: 600; color: #475569;">Strip Geometry / 带材几何</div>
    <div class="grid">
      <div class="param"><div class="param-label">b / 带材宽度</div><div class="param-value">${formatNumber(b, 2)}<span class="param-unit">mm</span></div></div>
      <div class="param"><div class="param-label">t / 带材厚度</div><div class="param-value">${formatNumber(t, 3)}<span class="param-unit">mm</span></div></div>
      <div class="param"><div class="param-label">L / 有效长度</div><div class="param-value">${formatNumber(L, 1)}<span class="param-unit">mm</span></div></div>
    </div>

    <div style="margin: 8px 0; font-size: 10px; font-weight: 600; color: #475569;">Space Check / 空间校核</div>
    <div class="grid">
      <div class="param"><div class="param-label">Di / 内径</div><div class="param-value">${formatNumber(geometry.innerDiameter, 1)}<span class="param-unit">mm</span></div></div>
      <div class="param"><div class="param-label">Do / 外径</div><div class="param-value">${formatNumber(geometry.outerDiameter, 1)}<span class="param-unit">mm</span></div></div>
      <div class="param"><div class="param-label">Active Coils Na / 参考圈数</div><div class="param-value">${formatNumber(geometry.activeCoils, 2)}</div></div>
    </div>

    <div style="margin: 8px 0; font-size: 10px; font-weight: 600; color: #475569;">Working Angles / 工作角度</div>
    <div class="grid">
      <div class="param"><div class="param-label">θ0 / 预紧角</div><div class="param-value">${formatNumber(theta0, 1)}<span class="param-unit">deg</span></div></div>
      <div class="param"><div class="param-label">θ_min</div><div class="param-value">${formatNumber(thetaMin, 1)}<span class="param-unit">deg</span></div></div>
      <div class="param"><div class="param-label">θ_max</div><div class="param-value">${formatNumber(thetaMax, 1)}<span class="param-unit">deg</span></div></div>
      <div class="param"><div class="param-label">θ_co (close-out)</div><div class="param-value">${formatNumber(thetaCo, 1)}<span class="param-unit">deg</span></div></div>
      <div class="param"><div class="param-label">Winding / 绕向</div><div class="param-value">${geometry.windingDirection === "cw" ? "CW" : "CCW"}</div></div>
      <div class="param"><div class="param-label">End Type / 端部</div><div class="param-value">${geometry.innerEndType ?? "fixed"} / ${geometry.outerEndType ?? "fixed"}</div></div>
    </div>

    <div style="margin: 8px 0; font-size: 10px; font-weight: 600; color: #475569;">Material / 材料</div>
    <div class="grid">
      <div class="param"><div class="param-label">Material ID</div><div class="param-value" style="font-size:10px;">${material.id}</div></div>
      <div class="param"><div class="param-label">E / 弹性模量</div><div class="param-value">${formatNumber(material.elasticModulus, 0)}<span class="param-unit">MPa</span></div></div>
      <div class="param"><div class="param-label">UTS / 抗拉强度</div><div class="param-value">${UTS ? formatNumber(UTS, 0) : "—"}<span class="param-unit">MPa</span></div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Results / 计算结果</div>
    <div class="grid">
      <div class="param highlight"><div class="param-label">k / 刚度</div><div class="param-value">${formatNumber(k, 4)}<span class="param-unit">N·mm/deg</span></div></div>
      <div class="param"><div class="param-label">T0 / 预紧扭矩</div><div class="param-value">${formatNumber(preloadTorque, 2)}<span class="param-unit">N·mm</span></div></div>
      <div class="param"><div class="param-label">T(θ_min)</div><div class="param-value">${formatNumber(minTorque, 2)}<span class="param-unit">N·mm</span></div></div>
      <div class="param"><div class="param-label">T(θ_max)</div><div class="param-value">${formatNumber(maxTorqueClamped, 2)}<span class="param-unit">N·mm</span></div></div>
      <div class="param"><div class="param-label">T(θ_co)</div><div class="param-value">${formatNumber(closeOutTorque, 2)}<span class="param-unit">N·mm</span></div></div>
      <div class="param"><div class="param-label">σ_peak@θ_max (Kt)</div><div class="param-value">${formatNumber(sigmaMax, 1)}<span class="param-unit">MPa</span></div></div>
    </div>

    <div style="margin-top: 10px;" class="grid-2">
      <div class="param"><div class="param-label">Static FoS (from store)</div><div class="param-value">${formatNumber(staticFoS, 2)}</div></div>
      <div class="param"><div class="param-label">σ_allow (derived)</div><div class="param-value">${formatNumber(sigmaAllowDerived, 0)}<span class="param-unit">MPa</span></div></div>
    </div>

    ${warningHtml}

    <div class="formula">
      k_deg = (π E b t³) / (6 L) / 360
      <br/>T(θ) = k_deg·θ + T0
      <br/>σ_nom = 6T / (b t²)
    </div>

    <div class="chart">
      <div class="chart-title">Torque–Angle (Linear) / 扭矩-角度（线性段）</div>
      ${chartSvg}
    </div>

    ${enableNonlinearCloseout ? `
    <div class="chart">
      <div class="chart-title">Torque–Angle (Nonlinear Close-out) / 扭矩-角度（渐进硬化）</div>
      ${chartNonlinearSvg}
    </div>
    ` : ""}
  </div>

  <div class="section">
    <div class="section-title">Engineering Enhancements / 工程增强</div>

    <div style="margin-bottom: 8px; font-size: 10px; font-weight: 600; color: #475569;">End Kt / 端部应力集中</div>
    <div class="grid">
      <div class="param"><div class="param-label">innerKt</div><div class="param-value">${formatNumber(innerKt, 2)}</div></div>
      <div class="param"><div class="param-label">outerKt</div><div class="param-value">${formatNumber(outerKt, 2)}</div></div>
      <div class="param"><div class="param-label">governingKt</div><div class="param-value">${formatNumber(governingKt, 2)}</div></div>
    </div>

    <div style="margin-top: 8px;" class="grid">
      <div class="param"><div class="param-label">σ_nom@θ_max</div><div class="param-value">${formatNumber(sigmaNomMax, 1)}<span class="param-unit">MPa</span></div></div>
      <div class="param"><div class="param-label">σ_peak@θ_max</div><div class="param-value">${formatNumber(sigmaMax, 1)}<span class="param-unit">MPa</span></div></div>
      <div class="param"><div class="param-label">peakStaticFoS (derived)</div><div class="param-value">${isFinite(sigmaAllowDerived) && sigmaMax > 0 ? formatNumber(sigmaAllowDerived / sigmaMax, 2) : "—"}</div></div>
    </div>

    <div style="margin: 10px 0 8px; font-size: 10px; font-weight: 600; color: #475569;">Fatigue (Goodman) / 疲劳</div>
    <div class="grid">
      <div class="param"><div class="param-label">σ_a</div><div class="param-value">${formatNumber(sigmaA, 1)}<span class="param-unit">MPa</span></div></div>
      <div class="param"><div class="param-label">σ_m</div><div class="param-value">${formatNumber(sigmaM, 1)}<span class="param-unit">MPa</span></div></div>
      <div class="param"><div class="param-label">Se (simplified)</div><div class="param-value">${Se ? formatNumber(Se, 0) : "—"}<span class="param-unit">MPa</span></div></div>
      <div class="param highlight"><div class="param-label">Goodman FoS</div><div class="param-value">${fatigueFoS !== null ? formatNumber(fatigueFoS, 2) : "—"}</div></div>
      <div class="param"><div class="param-label">σ_min</div><div class="param-value">${formatNumber(sigmaMin, 1)}<span class="param-unit">MPa</span></div></div>
      <div class="param"><div class="param-label">σ_max</div><div class="param-value">${formatNumber(sigmaMax, 1)}<span class="param-unit">MPa</span></div></div>
    </div>

    <div style="margin: 10px 0 8px; font-size: 10px; font-weight: 600; color: #475569;">Tolerance Band / 公差带</div>
    <div class="grid">
      <div class="param"><div class="param-label">Δt</div><div class="param-value">±${formatNumber(tolT, 3)}<span class="param-unit">mm</span></div></div>
      <div class="param"><div class="param-label">Δb</div><div class="param-value">±${formatNumber(tolB, 2)}<span class="param-unit">mm</span></div></div>
      <div class="param"><div class="param-label">ΔL</div><div class="param-value">±${formatNumber(tolL, 1)}<span class="param-unit">mm</span></div></div>
      <div class="param"><div class="param-label">k_min</div><div class="param-value">${formatNumber(kMin, 4)}<span class="param-unit">N·mm/deg</span></div></div>
      <div class="param"><div class="param-label">k_max</div><div class="param-value">${formatNumber(kMax, 4)}<span class="param-unit">N·mm/deg</span></div></div>
      <div class="param"><div class="param-label">T@θ_max band</div><div class="param-value">${formatNumber(TmaxBandMin, 1)} ~ ${formatNumber(TmaxBandMax, 1)}<span class="param-unit">N·mm</span></div></div>
    </div>

    <div style="margin: 10px 0 8px; font-size: 10px; font-weight: 600; color: #475569;">Close-out Nonlinearity / close-out 非线性</div>
    <div class="grid">
      <div class="param"><div class="param-label">Hardening Factor</div><div class="param-value">${formatNumber(hardeningFactor, 0)}</div></div>
      <div class="param"><div class="param-label">T_clamped</div><div class="param-value">${formatNumber(maxTorqueClamped, 1)}<span class="param-unit">N·mm</span></div></div>
      <div class="param"><div class="param-label">T_hardening (estimate)</div><div class="param-value">${maxTorqueHardening !== null ? formatNumber(maxTorqueHardening, 1) : "—"}<span class="param-unit">N·mm</span></div></div>
    </div>

    <div class="chart">
      <div class="chart-title">Torque–Angle (Linear vs Hardening) / 线性与硬化对比</div>
      ${buildCurveSVG(curveNonlinear)}
    </div>
  </div>
</body>
</html>`;
}

export function downloadSpiralTorsionPDF(
  geometry: SpiralTorsionGeometry,
  material: MaterialInfo,
  analysisResult: AnalysisResult,
  extras: SpiralTorsionReportExtras = {},
  options: SpiralTorsionReportOptions = {}
): void {
  const html = generateSpiralTorsionReportHTML(geometry, material, analysisResult, extras, options);

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
