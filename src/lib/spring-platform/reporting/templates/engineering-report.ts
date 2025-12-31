/**
 * Engineering Report Template
 * Phase 9: Professional PDF Report Generation
 * 
 * Full audit-ready report for internal engineering and OEM review.
 * Includes all parameters, version hash, issues, and Pareto results.
 */

import type { SpringDesignReport, ReportOptions } from "../report-types";
import { getReportStyles } from "./shared-styles";

/**
 * Helper for bilingual text
 */
function t(report: SpringDesignReport, en: string, zh: string): string {
    const lang = report.meta.language;
    if (lang === "en") return en;
    if (lang === "zh") return zh;
    return `${en} / ${zh}`;
}

/**
 * Format number with specified decimals
 */
function fmt(n: number | undefined, decimals = 2): string {
    if (n === undefined || n === null || isNaN(n)) return "-";
    return n.toFixed(decimals);
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status: string, lang: "en" | "zh" | "bilingual"): string {
    const labels: Record<string, { en: string; zh: string; class: string }> = {
        "PASS": { en: "PASS", zh: "通过", class: "status-pass" },
        "MARGINAL": { en: "MARGINAL", zh: "临界", class: "status-marginal" },
        "FAIL": { en: "FAIL", zh: "不通过", class: "status-fail" },
        "ok": { en: "OK", zh: "正常", class: "status-ok" },
        "warning": { en: "Warning", zh: "警告", class: "status-warning" },
        "danger": { en: "Danger", zh: "危险", class: "status-danger" },
    };

    const info = labels[status] ?? { en: status, zh: status, class: "status-marginal" };
    const text = lang === "en" ? info.en : lang === "zh" ? info.zh : `${info.en}/${info.zh}`;

    return `<span class="status-badge ${info.class}">${text}</span>`;
}

/**
 * Generate review icon SVG
 */
function getReviewIcon(status: "PASS" | "MARGINAL" | "FAIL"): string {
    if (status === "PASS") {
        return `<svg class="review-icon" viewBox="0 0 24 24" fill="#22c55e">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`;
    } else if (status === "MARGINAL") {
        return `<svg class="review-icon" viewBox="0 0 24 24" fill="#eab308">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>`;
    } else {
        return `<svg class="review-icon" viewBox="0 0 24 24" fill="#ef4444">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
        </svg>`;
    }
}

/**
 * Generate Engineering Report HTML
 */
export function generateEngineeringReportHTML(
    report: SpringDesignReport,
    options?: Partial<ReportOptions>
): string {
    const lang = report.meta.language;
    const companyName = options?.companyName ?? report.meta.companyName ?? "Spring Platform";

    // Group inputs by category
    const geometryParams = report.inputs.filter(p => p.category === "geometry");
    const materialParams = report.inputs.filter(p => p.category === "material");
    const workingParams = report.inputs.filter(p => p.category === "working");
    const advancedParams = report.inputs.filter(p => p.category === "advanced");

    return `<!DOCTYPE html>
<html lang="${lang === "zh" ? "zh-CN" : "en"}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.meta.projectName} - ${t(report, "Engineering Report", "工程报告")}</title>
    <style>${getReportStyles()}</style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <header class="report-header">
            <div class="report-logo">${companyName}</div>
            <div class="report-title">
                <h1>${t(report, "Engineering Report", "工程报告")}</h1>
                <div class="spring-type">${lang === "zh" ? report.meta.springTypeZh : report.meta.springType}</div>
            </div>
        </header>
        
        <!-- Meta Info with Version Hash -->
        <div class="meta-grid">
            <div class="meta-item">
                <div class="meta-label">${t(report, "Project", "项目")}</div>
                <div class="meta-value">${report.meta.projectName}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">${t(report, "Material", "材料")}</div>
                <div class="meta-value">${report.meta.material}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">${t(report, "Date", "日期")}</div>
                <div class="meta-value">${report.meta.date}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">${t(report, "Status", "状态")}</div>
                <div class="meta-value">${getStatusBadge(report.review.overallStatus, lang)}</div>
            </div>
        </div>
        
        <!-- Version Hash -->
        <div style="text-align: right; margin-bottom: 16px;">
            <span style="font-size: 8pt; color: #6b7280;">${t(report, "Version Hash", "版本哈希")}:</span>
            <code class="version-hash">${report.meta.versionHash}</code>
        </div>
        
        <!-- Key Results -->
        <section class="section">
            <h2 class="section-title">${t(report, "Key Results", "关键结果")}</h2>
            <div class="results-grid">
                <div class="result-card">
                    <div class="result-label">${t(report, "Spring Rate", "弹簧刚度")}</div>
                    <div class="result-value">
                        ${fmt(report.keyResults.springRate.value, 3)}
                        <span class="result-unit">${report.keyResults.springRate.unit}</span>
                    </div>
                </div>
                ${report.keyResults.maxStress ? `
                <div class="result-card">
                    <div class="result-label">${t(report, "Max Stress τ", "最大应力 τ")}</div>
                    <div class="result-value">
                        ${fmt(report.keyResults.maxStress.value, 1)}
                        <span class="result-unit">${report.keyResults.maxStress.unit}</span>
                    </div>
                </div>
                ` : ""}
                ${report.keyResults.safetyFactor ? `
                <div class="result-card">
                    <div class="result-label">${t(report, "Safety Factor η", "安全系数 η")}</div>
                    <div class="result-value">${fmt(report.keyResults.safetyFactor.value, 2)}</div>
                </div>
                ` : ""}
                ${report.keyResults.energy ? `
                <div class="result-card">
                    <div class="result-label">${t(report, "Energy U", "能量 U")}</div>
                    <div class="result-value">
                        ${fmt(report.keyResults.energy.value, 4)}
                        <span class="result-unit">${report.keyResults.energy.unit}</span>
                    </div>
                </div>
                ` : ""}
            </div>
        </section>
        
        <!-- Full Parameters - Geometry -->
        <section class="section avoid-break">
            <h2 class="section-title">${t(report, "Geometry Parameters", "几何参数")}</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>${t(report, "Parameter", "参数")}</th>
                        <th>${t(report, "Symbol", "符号")}</th>
                        <th>${t(report, "Value", "数值")}</th>
                        <th>${t(report, "Unit", "单位")}</th>
                    </tr>
                </thead>
                <tbody>
                    ${geometryParams.map(p => `
                    <tr>
                        <td>${lang === "zh" ? p.labelZh : lang === "en" ? p.labelEn : `${p.labelEn} / ${p.labelZh}`}</td>
                        <td style="font-style: italic;">${p.key}</td>
                        <td class="numeric">${typeof p.value === "number" ? fmt(p.value, 4) : p.value}</td>
                        <td class="unit">${p.unit ?? "-"}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
        </section>
        
        <!-- Full Parameters - Material -->
        ${materialParams.length > 0 ? `
        <section class="section avoid-break">
            <h2 class="section-title">${t(report, "Material Parameters", "材料参数")}</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>${t(report, "Parameter", "参数")}</th>
                        <th>${t(report, "Symbol", "符号")}</th>
                        <th>${t(report, "Value", "数值")}</th>
                        <th>${t(report, "Unit", "单位")}</th>
                    </tr>
                </thead>
                <tbody>
                    ${materialParams.map(p => `
                    <tr>
                        <td>${lang === "zh" ? p.labelZh : lang === "en" ? p.labelEn : `${p.labelEn} / ${p.labelZh}`}</td>
                        <td style="font-style: italic;">${p.key}</td>
                        <td class="numeric">${typeof p.value === "number" ? fmt(p.value, 0) : p.value}</td>
                        <td class="unit">${p.unit ?? "-"}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
        </section>
        ` : ""}
        
        <!-- Load Cases (Full Detail) -->
        <section class="section page-break avoid-break">
            <h2 class="section-title">${t(report, "Load Case Analysis", "工况分析")}</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>${t(report, "ID", "编号")}</th>
                        <th>${report.loadCases[0]?.xLabel ?? "X"}</th>
                        <th>${report.loadCases[0]?.yLabel ?? "Y"}</th>
                        <th>${t(report, "Stress τ (MPa)", "应力 τ (MPa)")}</th>
                        <th>${t(report, "Stage", "阶段")}</th>
                        <th>${t(report, "Status", "状态")}</th>
                        <th>${t(report, "Notes", "备注")}</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.loadCases.map(c => `
                    <tr>
                        <td><strong>${c.id}</strong></td>
                        <td class="numeric">${fmt(c.x, 3)}</td>
                        <td class="numeric">${fmt(c.y, 2)}</td>
                        <td class="numeric">${c.stress ? fmt(c.stress, 1) : "-"}</td>
                        <td>${c.stage ?? "-"}</td>
                        <td>${getStatusBadge(c.status, lang)}</td>
                        <td style="font-size: 8pt; color: #6b7280;">${c.message ?? "-"}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
        </section>
        
        <!-- Review with Issues -->
        <section class="section avoid-break">
            <h2 class="section-title">${t(report, "Engineering Review", "工程审核")}</h2>
            <div class="review-box review-${report.review.overallStatus.toLowerCase()}">
                <div class="review-header">
                    ${getReviewIcon(report.review.overallStatus)}
                    <span class="review-status">${getStatusBadge(report.review.overallStatus, lang)}</span>
                </div>
                <p class="review-summary">
                    ${lang === "zh" ? report.review.summaryZh : lang === "en" ? report.review.summaryEn : `${report.review.summaryEn}<br/>${report.review.summaryZh}`}
                </p>
            </div>
            
            ${report.review.issues.length > 0 ? `
            <h3 style="font-size: 10pt; margin: 12px 0 8px 0; color: #374151;">${t(report, "Issues & Recommendations", "问题与建议")}</h3>
            <ul class="issues-list">
                ${report.review.issues.map(issue => `
                <li class="issue-item">
                    <span class="issue-severity issue-${issue.severity}"></span>
                    <div>
                        <div class="issue-text">
                            <strong>[${issue.category}]</strong>
                            ${lang === "zh" ? issue.messageZh : lang === "en" ? issue.messageEn : `${issue.messageEn} / ${issue.messageZh}`}
                        </div>
                        ${issue.suggestionEn ? `
                        <div class="issue-suggestion">
                            💡 ${lang === "zh" ? issue.suggestionZh : lang === "en" ? issue.suggestionEn : `${issue.suggestionEn} / ${issue.suggestionZh}`}
                        </div>
                        ` : ""}
                    </div>
                </li>
                `).join("")}
            </ul>
            ` : ""}
        </section>
        
        <!-- Pareto Results (if available) -->
        ${report.pareto ? `
        <section class="section page-break avoid-break">
            <h2 class="section-title">${t(report, "Optimization Results", "优化结果")}</h2>
            <div class="pareto-section">
                <div class="pareto-title">
                    ${t(report, "Pareto Front - Top Candidates", "帕累托前沿 - 顶级候选方案")}
                    <span style="font-weight: 400; font-size: 9pt; color: #6b7280;">
                        (${t(report, "Preset", "预设")}: ${report.pareto.preset}, 
                        ${t(report, "Total", "总数")}: ${report.pareto.totalCandidates})
                    </span>
                </div>
                <table class="data-table pareto-table">
                    <thead>
                        <tr>
                            <th>${t(report, "Rank", "排名")}</th>
                            <th>${t(report, "Parameters", "参数")}</th>
                            <th>${t(report, "Score", "评分")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.pareto.candidates.slice(0, 5).map(c => `
                        <tr class="${report.pareto?.chosen?.rank === c.rank ? "pareto-chosen" : ""}">
                            <td>#${c.rank}${report.pareto?.chosen?.rank === c.rank ? " ✓" : ""}</td>
                            <td style="font-family: monospace; font-size: 8pt;">
                                ${Object.entries(c.params).map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(2) : v}`).join(", ")}
                            </td>
                            <td class="numeric">${fmt(c.score, 3)}</td>
                        </tr>
                        `).join("")}
                    </tbody>
                </table>
                ${report.pareto.chosen ? `
                <p style="margin-top: 8px; font-size: 9pt; color: #374151;">
                    <strong>${t(report, "Chosen", "已选择")}:</strong> #${report.pareto.chosen.rank} — 
                    ${lang === "zh" ? report.pareto.chosen.reasonZh : report.pareto.chosen.reasonEn}
                </p>
                ` : ""}
            </div>
        </section>
        ` : ""}
        
        <!-- Signature Block -->
        <section class="section avoid-break">
            <div class="signature-block">
                <div class="signature-box">
                    <div class="signature-label">${t(report, "Prepared By", "编制")}</div>
                </div>
                <div class="signature-box">
                    <div class="signature-label">${t(report, "Reviewed By", "审核")}</div>
                </div>
                <div class="signature-box">
                    <div class="signature-label">${t(report, "Approved By", "批准")}</div>
                </div>
            </div>
        </section>
        
        <!-- Footer -->
        <footer class="report-footer">
            <span>${t(report, "Generated by", "生成于")} ${companyName}</span>
            <span>
                ${t(report, "Version", "版本")}: <code class="version-hash">${report.meta.versionHash}</code>
            </span>
            <span>${report.meta.date}</span>
        </footer>
    </div>
</body>
</html>`;
}
