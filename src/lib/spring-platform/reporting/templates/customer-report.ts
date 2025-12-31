/**
 * Customer Report Template
 * Phase 9: Professional PDF Report Generation
 * 
 * Clean, professional report for external customers.
 * Hides engineering internals, emphasizes key results.
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
 * Generate Customer Report HTML
 */
export function generateCustomerReportHTML(
    report: SpringDesignReport,
    options?: Partial<ReportOptions>
): string {
    const lang = report.meta.language;
    const companyName = options?.companyName ?? report.meta.companyName ?? "Spring Platform";

    // Filter inputs to show only key geometry parameters (categories: geometry)
    const keyInputs = report.inputs.filter(p => p.category === "geometry").slice(0, 8);

    return `<!DOCTYPE html>
<html lang="${lang === "zh" ? "zh-CN" : "en"}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.meta.projectName} - ${t(report, "Spring Design Report", "弹簧设计报告")}</title>
    <style>${getReportStyles()}</style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <header class="report-header">
            <div class="report-logo">${companyName}</div>
            <div class="report-title">
                <h1>${t(report, "Spring Design Report", "弹簧设计报告")}</h1>
                <div class="spring-type">${lang === "zh" ? report.meta.springTypeZh : report.meta.springType}</div>
            </div>
        </header>
        
        <!-- Meta Info -->
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
        
        <!-- Key Results -->
        <section class="section">
            <h2 class="section-title">${t(report, "Key Results", "关键结果")}</h2>
            <div class="results-grid">
                <div class="result-card">
                    <div class="result-label">${t(report, "Spring Rate", "弹簧刚度")}</div>
                    <div class="result-value">
                        ${fmt(report.keyResults.springRate.value, 2)}
                        <span class="result-unit">${report.keyResults.springRate.unit}</span>
                    </div>
                </div>
                ${report.keyResults.maxStress ? `
                <div class="result-card">
                    <div class="result-label">${t(report, "Max Stress", "最大应力")}</div>
                    <div class="result-value">
                        ${fmt(report.keyResults.maxStress.value, 0)}
                        <span class="result-unit">${report.keyResults.maxStress.unit}</span>
                    </div>
                </div>
                ` : ""}
                ${report.keyResults.safetyFactor ? `
                <div class="result-card">
                    <div class="result-label">${t(report, "Safety Factor", "安全系数")}</div>
                    <div class="result-value">${fmt(report.keyResults.safetyFactor.value, 2)}</div>
                </div>
                ` : ""}
                ${report.keyResults.energy ? `
                <div class="result-card">
                    <div class="result-label">${t(report, "Energy", "能量")}</div>
                    <div class="result-value">
                        ${fmt(report.keyResults.energy.value, 3)}
                        <span class="result-unit">${report.keyResults.energy.unit}</span>
                    </div>
                </div>
                ` : ""}
            </div>
        </section>
        
        <!-- Parameters -->
        <section class="section avoid-break">
            <h2 class="section-title">${t(report, "Design Parameters", "设计参数")}</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>${t(report, "Parameter", "参数")}</th>
                        <th>${t(report, "Value", "数值")}</th>
                        <th>${t(report, "Unit", "单位")}</th>
                    </tr>
                </thead>
                <tbody>
                    ${keyInputs.map(p => `
                    <tr>
                        <td>${lang === "zh" ? p.labelZh : p.labelEn}</td>
                        <td class="numeric">${typeof p.value === "number" ? fmt(p.value, 3) : p.value}</td>
                        <td class="unit">${p.unit ?? "-"}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
        </section>
        
        <!-- Load Cases (Simplified) -->
        ${report.loadCases.length > 0 ? `
        <section class="section avoid-break">
            <h2 class="section-title">${t(report, "Working Points", "工作点")}</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>${t(report, "Point", "点")}</th>
                        <th>${report.loadCases[0]?.xLabel ?? "X"}</th>
                        <th>${report.loadCases[0]?.yLabel ?? "Y"}</th>
                        <th>${t(report, "Status", "状态")}</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.loadCases.map(c => `
                    <tr>
                        <td>${c.id}</td>
                        <td class="numeric">${fmt(c.x, 2)}</td>
                        <td class="numeric">${fmt(c.y, 1)}</td>
                        <td>${getStatusBadge(c.status, lang)}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
        </section>
        ` : ""}
        
        <!-- Review Summary -->
        <section class="section avoid-break">
            <h2 class="section-title">${t(report, "Design Review", "设计审核")}</h2>
            <div class="review-box review-${report.review.overallStatus.toLowerCase()}">
                <div class="review-header">
                    ${getReviewIcon(report.review.overallStatus)}
                    <span class="review-status">${getStatusBadge(report.review.overallStatus, lang)}</span>
                </div>
                <p class="review-summary">
                    ${lang === "zh" ? report.review.summaryZh : report.review.summaryEn}
                </p>
            </div>
        </section>
        
        <!-- Footer -->
        <footer class="report-footer">
            <span>${t(report, "Generated by", "生成于")} ${companyName}</span>
            <span>${report.meta.date}</span>
        </footer>
    </div>
</body>
</html>`;
}
