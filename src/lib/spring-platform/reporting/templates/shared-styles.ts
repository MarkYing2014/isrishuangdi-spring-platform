/**
 * Shared Styles for OEM Reports
 * Phase 9: Professional PDF Report Generation
 * 
 * Professional CSS for A4 print layout.
 */

/**
 * Base styles for all reports
 */
export const BASE_STYLES = `
/* Reset and Base */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    background: #ffffff;
}

/* Page Setup for A4 */
@page {
    size: A4;
    margin: 15mm 12mm 20mm 12mm;
}

@media print {
    body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    
    .no-print {
        display: none !important;
    }
    
    .page-break {
        page-break-before: always;
    }
    
    .avoid-break {
        page-break-inside: avoid;
    }
}

/* Container */
.report-container {
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
}

/* Header */
.report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 12px;
    border-bottom: 2px solid #1e40af;
    margin-bottom: 16px;
}

.report-logo {
    font-size: 14pt;
    font-weight: 700;
    color: #1e40af;
}

.report-title {
    text-align: right;
}

.report-title h1 {
    font-size: 16pt;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 4px;
}

.report-title .spring-type {
    font-size: 11pt;
    color: #4b5563;
}

/* Meta Info */
.meta-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    background: #f8fafc;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 16px;
}

.meta-item {
    text-align: center;
}

.meta-label {
    font-size: 8pt;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.meta-value {
    font-size: 10pt;
    font-weight: 600;
    color: #1a1a1a;
}

/* Section */
.section {
    margin-bottom: 16px;
}

.section-title {
    font-size: 11pt;
    font-weight: 600;
    color: #1e40af;
    padding-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 8px;
}

/* Tables */
.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
}

.data-table th,
.data-table td {
    padding: 6px 8px;
    text-align: left;
    border: 1px solid #e5e7eb;
}

.data-table th {
    background: #f1f5f9;
    font-weight: 600;
    color: #374151;
}

.data-table tr:nth-child(even) {
    background: #fafafa;
}

.data-table .numeric {
    text-align: right;
    font-family: "SF Mono", Monaco, Consolas, monospace;
}

.data-table .unit {
    color: #6b7280;
    font-size: 8pt;
}

/* Status Badges */
.status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
}

.status-pass {
    background: #dcfce7;
    color: #166534;
}

.status-marginal {
    background: #fef9c3;
    color: #854d0e;
}

.status-fail {
    background: #fee2e2;
    color: #991b1b;
}

.status-ok {
    background: #dcfce7;
    color: #166534;
}

.status-warning {
    background: #fef9c3;
    color: #854d0e;
}

.status-danger {
    background: #fee2e2;
    color: #991b1b;
}

/* Key Results Grid */
.results-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
}

.result-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
}

.result-label {
    font-size: 8pt;
    color: #6b7280;
    margin-bottom: 4px;
}

.result-value {
    font-size: 14pt;
    font-weight: 700;
    color: #1e40af;
}

.result-unit {
    font-size: 9pt;
    color: #6b7280;
    font-weight: 400;
}

/* Review Summary */
.review-box {
    border: 2px solid;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
}

.review-pass {
    border-color: #22c55e;
    background: #f0fdf4;
}

.review-marginal {
    border-color: #eab308;
    background: #fefce8;
}

.review-fail {
    border-color: #ef4444;
    background: #fef2f2;
}

.review-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.review-icon {
    width: 24px;
    height: 24px;
}

.review-status {
    font-size: 12pt;
    font-weight: 700;
}

.review-summary {
    font-size: 9pt;
    color: #4b5563;
}

/* Issues List */
.issues-list {
    list-style: none;
    padding: 0;
}

.issue-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid #e5e7eb;
}

.issue-item:last-child {
    border-bottom: none;
}

.issue-severity {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    margin-top: 5px;
    border-radius: 50%;
}

.issue-error {
    background: #ef4444;
}

.issue-warning {
    background: #eab308;
}

.issue-info {
    background: #3b82f6;
}

.issue-text {
    font-size: 9pt;
    color: #374151;
}

.issue-suggestion {
    font-size: 8pt;
    color: #6b7280;
    font-style: italic;
    margin-top: 2px;
}

/* Chart Placeholder */
.chart-container {
    width: 100%;
    height: 180px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 10pt;
    margin-bottom: 16px;
}

/* Footer */
.report-footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #9ca3af;
}

.version-hash {
    font-family: "SF Mono", Monaco, Consolas, monospace;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 3px;
}

/* Pareto Section (Engineering Only) */
.pareto-section {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
}

.pareto-title {
    font-size: 10pt;
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 8px;
}

.pareto-table {
    font-size: 8pt;
}

.pareto-chosen {
    background: #dbeafe !important;
    font-weight: 600;
}

/* Signature Block (Engineering Only) */
.signature-block {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}

.signature-box {
    border-top: 1px solid #1a1a1a;
    padding-top: 8px;
    text-align: center;
}

.signature-label {
    font-size: 8pt;
    color: #6b7280;
}
`;

/**
 * Get the complete CSS for a report
 */
export function getReportStyles(): string {
    return BASE_STYLES;
}
