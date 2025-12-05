/**
 * Spring Engineering Report Generator
 * 弹簧工程报告生成器
 * 
 * Generates professional PDF reports for spring analysis
 */

import type {
  SpringGeometry,
  WorkingConditions,
  SpringAnalysisResult,
  ReportConfig,
  ReportData,
} from '@/lib/engine/types';
import { getSpringMaterial } from '@/lib/materials/springMaterials';

/**
 * Format number with specified decimals
 */
function formatNumber(n: number, decimals = 2): string {
  return Number(n.toFixed(decimals)).toLocaleString();
}

/**
 * Format cycles for display
 */
function formatCycles(n: number): string {
  if (!isFinite(n)) return "∞ (Infinite)";
  if (n >= 1e7) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return n.toString();
}

/**
 * Get spring type name
 */
function getSpringTypeName(type: string, lang: 'en' | 'zh'): string {
  const names: Record<string, { en: string; zh: string }> = {
    compression: { en: 'Compression Spring', zh: '压缩弹簧' },
    extension: { en: 'Extension Spring', zh: '拉伸弹簧' },
    torsion: { en: 'Torsion Spring', zh: '扭转弹簧' },
    conical: { en: 'Conical Spring', zh: '锥形弹簧' },
  };
  return names[type]?.[lang] ?? type;
}

/**
 * Generate HTML content for the report
 */
export function generateReportHTML(data: ReportData): string {
  const { config, geometry, workingConditions, results } = data;
  const lang = config.language === 'en' ? 'en' : 'zh';
  const isBilingual = config.language === 'bilingual';
  
  const material = getSpringMaterial(geometry.materialId);
  const materialName = material 
    ? (lang === 'zh' ? material.nameZh : material.nameEn)
    : geometry.materialId;

  const springTypeName = getSpringTypeName(geometry.type, lang);
  const date = new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US');

  // Helper for bilingual text
  const t = (en: string, zh: string) => {
    if (isBilingual) return `${zh} / ${en}`;
    return lang === 'zh' ? zh : en;
  };

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('Spring Engineering Report', '弹簧工程报告')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      padding: 20mm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header-left h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 4px;
    }
    .header-left p {
      color: #6b7280;
      font-size: 11px;
    }
    .header-right {
      text-align: right;
      font-size: 11px;
      color: #6b7280;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e40af;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      margin-bottom: 12px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    .card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .param-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dotted #e5e7eb;
    }
    .param-row:last-child {
      border-bottom: none;
    }
    .param-label {
      color: #6b7280;
    }
    .param-value {
      font-weight: 500;
    }
    .status-safe {
      color: #16a34a;
      font-weight: 600;
    }
    .status-warning {
      color: #d97706;
      font-weight: 600;
    }
    .status-danger {
      color: #dc2626;
      font-weight: 600;
    }
    .highlight {
      background: #dbeafe;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .warning-box {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 12px;
      margin-top: 16px;
    }
    .warning-box h4 {
      color: #b45309;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .warning-box ul {
      margin-left: 16px;
      color: #92400e;
      font-size: 11px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
    }
    .snapshot {
      margin-top: 16px;
      text-align: center;
    }
    .snapshot img {
      max-width: 100%;
      max-height: 200px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    @media print {
      body {
        padding: 10mm;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>${config.companyName || 'ISRI-SHUANGDI'}</h1>
      <p>${t('Spring Engineering Report', '弹簧工程报告')}</p>
    </div>
    <div class="header-right">
      <p><strong>${t('Date', '日期')}:</strong> ${date}</p>
      ${config.modelId ? `<p><strong>${t('Model ID', '型号')}:</strong> ${config.modelId}</p>` : ''}
      ${config.engineerName ? `<p><strong>${t('Engineer', '工程师')}:</strong> ${config.engineerName}</p>` : ''}
    </div>
  </div>

  <!-- Spring Info -->
  <div class="section">
    <h2 class="section-title">${t('Spring Information', '弹簧信息')}</h2>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">${t('Type & Material', '类型与材料')}</div>
        <div class="param-row">
          <span class="param-label">${t('Spring Type', '弹簧类型')}</span>
          <span class="param-value">${springTypeName}</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Material', '材料')}</span>
          <span class="param-value">${materialName}</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Shear Modulus G', '剪切模量 G')}</span>
          <span class="param-value">${material?.shearModulus ?? '-'} MPa</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">${t('Working Conditions', '工作条件')}</div>
        <div class="param-row">
          <span class="param-label">${t('Min Deflection', '最小位移')}</span>
          <span class="param-value">${formatNumber(workingConditions.minDeflection)} mm</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Max Deflection', '最大位移')}</span>
          <span class="param-value">${formatNumber(workingConditions.maxDeflection)} mm</span>
        </div>
        ${workingConditions.temperature ? `
        <div class="param-row">
          <span class="param-label">${t('Temperature', '温度')}</span>
          <span class="param-value">${workingConditions.temperature}°C</span>
        </div>
        ` : ''}
      </div>
    </div>
  </div>

  <!-- Geometry -->
  <div class="section">
    <h2 class="section-title">${t('Geometry Parameters', '几何参数')}</h2>
    <div class="grid-3">
      <div class="card">
        <div class="param-row">
          <span class="param-label">${t('Wire Diameter d', '线径 d')}</span>
          <span class="param-value">${formatNumber(results.geometry.wireDiameter)} mm</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Mean Diameter Dm', '中径 Dm')}</span>
          <span class="param-value">${formatNumber(results.geometry.meanDiameter)} mm</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Spring Index C', '弹簧指数 C')}</span>
          <span class="param-value">${formatNumber(results.geometry.springIndex)}</span>
        </div>
      </div>
      <div class="card">
        <div class="param-row">
          <span class="param-label">${t('Active Coils Na', '有效圈数 Na')}</span>
          <span class="param-value">${results.geometry.activeCoils}</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Total Coils Nt', '总圈数 Nt')}</span>
          <span class="param-value">${results.geometry.totalCoils}</span>
        </div>
        ${results.geometry.pitch ? `
        <div class="param-row">
          <span class="param-label">${t('Pitch p', '节距 p')}</span>
          <span class="param-value">${formatNumber(results.geometry.pitch)} mm</span>
        </div>
        ` : ''}
      </div>
      <div class="card">
        ${results.geometry.freeLength ? `
        <div class="param-row">
          <span class="param-label">${t('Free Length L0', '自由长度 L0')}</span>
          <span class="param-value">${formatNumber(results.geometry.freeLength)} mm</span>
        </div>
        ` : ''}
        ${results.geometry.solidHeight ? `
        <div class="param-row">
          <span class="param-label">${t('Solid Height Hs', '固体高度 Hs')}</span>
          <span class="param-value">${formatNumber(results.geometry.solidHeight)} mm</span>
        </div>
        ` : ''}
        <div class="param-row">
          <span class="param-label">${t('Spring Rate k', '刚度 k')}</span>
          <span class="param-value highlight">${formatNumber(results.springRate)} N/mm</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Stress Analysis -->
  <div class="section">
    <h2 class="section-title">${t('Stress Analysis', '应力分析')}</h2>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">${t('Stress Correction Factors', '应力修正系数')}</div>
        <div class="param-row">
          <span class="param-label">Wahl Factor K_w</span>
          <span class="param-value">${formatNumber(results.stress.wahlFactor, 3)}</span>
        </div>
        <div class="param-row">
          <span class="param-label">Surface Factor K_s</span>
          <span class="param-value">${formatNumber(results.stress.surfaceFactor, 3)}</span>
        </div>
        <div class="param-row">
          <span class="param-label">Size Factor K_d</span>
          <span class="param-value">${formatNumber(results.stress.sizeFactor, 3)}</span>
        </div>
        <div class="param-row">
          <span class="param-label">Temp Factor K_t</span>
          <span class="param-value">${formatNumber(results.stress.tempFactor, 3)}</span>
        </div>
        <div class="param-row">
          <span class="param-label"><strong>Total K</strong></span>
          <span class="param-value"><strong>${formatNumber(results.stress.totalCorrectionFactor, 3)}</strong></span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">${t('Stress Results', '应力结果')}</div>
        <div class="param-row">
          <span class="param-label">${t('Nominal Stress τ_nom', '名义应力 τ_nom')}</span>
          <span class="param-value">${formatNumber(results.stress.tauNominal)} MPa</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Effective Stress τ_eff', '有效应力 τ_eff')}</span>
          <span class="param-value highlight">${formatNumber(results.stress.tauEffective)} MPa</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Allowable Stress τ_allow', '许用应力 τ_allow')}</span>
          <span class="param-value">${formatNumber(results.safety.allowableStress)} MPa</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Safety Factor SF', '安全系数 SF')}</span>
          <span class="param-value ${results.safety.status === 'safe' ? 'status-safe' : results.safety.status === 'warning' ? 'status-warning' : 'status-danger'}">
            ${formatNumber(results.safety.staticSafetyFactor)}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Fatigue Analysis -->
  <div class="section">
    <h2 class="section-title">${t('Fatigue Life Analysis', '疲劳寿命分析')}</h2>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">${t('Fatigue Parameters', '疲劳参数')}</div>
        <div class="param-row">
          <span class="param-label">${t('Mean Stress τ_mean', '平均应力 τ_mean')}</span>
          <span class="param-value">${formatNumber(results.fatigue.tauMean)} MPa</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Alternating Stress τ_alt', '交变应力 τ_alt')}</span>
          <span class="param-value">${formatNumber(results.fatigue.tauAlt)} MPa</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Stress Ratio R', '应力比 R')}</span>
          <span class="param-value">${formatNumber(results.fatigue.stressRatio, 3)}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">${t('Fatigue Life Estimation', '疲劳寿命估算')}</div>
        <div class="param-row">
          <span class="param-label">${t('Estimated Cycles N', '预估循环次数 N')}</span>
          <span class="param-value highlight">${formatCycles(results.fatigue.estimatedCycles)}</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Infinite Life SF', '无限寿命 SF')}</span>
          <span class="param-value">${formatNumber(results.fatigue.infiniteLifeSafetyFactor)}</span>
        </div>
        <div class="param-row">
          <span class="param-label">${t('Rating', '等级')}</span>
          <span class="param-value">${lang === 'zh' ? results.fatigue.message.zh : results.fatigue.message.en}</span>
        </div>
      </div>
    </div>
  </div>

  ${results.buckling ? `
  <!-- Buckling Analysis -->
  <div class="section">
    <h2 class="section-title">${t('Buckling Analysis', '屈曲分析')}</h2>
    <div class="card">
      <div class="grid-3">
        <div>
          <div class="param-row">
            <span class="param-label">${t('Slenderness λ', '细长比 λ')}</span>
            <span class="param-value">${formatNumber(results.buckling.slendernessRatio)}</span>
          </div>
        </div>
        <div>
          <div class="param-row">
            <span class="param-label">${t('Critical Load P_cr', '临界载荷 P_cr')}</span>
            <span class="param-value">${formatNumber(results.buckling.criticalLoad)} N</span>
          </div>
        </div>
        <div>
          <div class="param-row">
            <span class="param-label">${t('Buckling SF', '屈曲 SF')}</span>
            <span class="param-value ${results.buckling.status === 'safe' ? 'status-safe' : results.buckling.status === 'warning' ? 'status-warning' : 'status-danger'}">
              ${formatNumber(results.buckling.bucklingSafetyFactor)}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  ${data.snapshot3D ? `
  <!-- 3D Snapshot -->
  <div class="section">
    <h2 class="section-title">${t('3D Model', '3D 模型')}</h2>
    <div class="snapshot">
      <img src="${data.snapshot3D}" alt="3D Spring Model" />
    </div>
  </div>
  ` : ''}

  ${results.warnings.length > 0 ? `
  <!-- Warnings -->
  <div class="warning-box">
    <h4>⚠ ${t('Warnings', '警告')}</h4>
    <ul>
      ${results.warnings.map(w => `<li>${w}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      ${t('Generated by ISRI-SHUANGDI Spring Engineering Platform', '由 ISRI-SHUANGDI 弹簧工程平台生成')}
    </div>
    <div>
      ${t('Report Date', '报告日期')}: ${date}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate PDF report (client-side using browser print)
 */
export function printReport(data: ReportData): void {
  const html = generateReportHTML(data);
  
  // Open in new window and print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

/**
 * Download report as HTML file
 */
export function downloadReportHTML(data: ReportData, filename?: string): void {
  const html = generateReportHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `spring-report-${Date.now()}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create report data from analysis result
 */
export function createReportData(
  geometry: SpringGeometry,
  workingConditions: WorkingConditions,
  results: SpringAnalysisResult,
  config?: Partial<ReportConfig>
): ReportData {
  return {
    config: {
      companyName: 'ISRI-SHUANGDI',
      language: 'bilingual',
      ...config,
    },
    geometry,
    workingConditions,
    results,
  };
}
