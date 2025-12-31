/**
 * PDF Export Utilities
 * Phase 9: Professional PDF Report Generation
 * 
 * Provides client-side and server-side PDF export options.
 */

import type { SpringDesignReport, ReportOptions } from "./report-types";
import { generateCustomerReportHTML } from "./templates/customer-report";
import { generateEngineeringReportHTML } from "./templates/engineering-report";

// =============================================================================
// HTML Generation
// =============================================================================

/**
 * Generate report HTML based on type
 */
export function generateReportHTML(
    report: SpringDesignReport,
    options?: Partial<ReportOptions>
): string {
    const type = options?.type ?? "customer";

    if (type === "engineering") {
        return generateEngineeringReportHTML(report, options);
    }

    return generateCustomerReportHTML(report, options);
}

// =============================================================================
// Client-Side Export (Browser)
// =============================================================================

/**
 * Open report in new window for printing (client-side)
 */
export function printReport(
    report: SpringDesignReport,
    options?: Partial<ReportOptions>
): void {
    const html = generateReportHTML(report, options);

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
        alert("Please allow popups to print the report.");
        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };
}

/**
 * Download report as HTML file (client-side)
 */
export function downloadReportHTML(
    report: SpringDesignReport,
    options?: Partial<ReportOptions>,
    filename?: string
): void {
    const html = generateReportHTML(report, options);
    const type = options?.type ?? "customer";
    const defaultFilename = `${report.meta.projectName.replace(/\s+/g, "_")}_${type}_report.html`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename ?? defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Copy report HTML to clipboard (client-side)
 */
export async function copyReportHTML(
    report: SpringDesignReport,
    options?: Partial<ReportOptions>
): Promise<boolean> {
    const html = generateReportHTML(report, options);

    try {
        await navigator.clipboard.writeText(html);
        return true;
    } catch (e) {
        console.error("Failed to copy report HTML:", e);
        return false;
    }
}

// =============================================================================
// PDF Export via Browser Print
// =============================================================================

/**
 * Export to PDF using browser's print-to-PDF feature
 * This is the most reliable cross-platform approach for client-side PDF.
 * 
 * User workflow:
 * 1. Opens print dialog
 * 2. User selects "Save as PDF" as destination
 * 3. PDF is saved locally
 */
export function exportToPDFViaPrint(
    report: SpringDesignReport,
    options?: Partial<ReportOptions>
): void {
    printReport(report, options);
}

// =============================================================================
// Server-Side PDF (Puppeteer) - Placeholder
// =============================================================================

/**
 * Export to PDF using Puppeteer (server-side only)
 * 
 * This function is designed to be called from a Next.js API route.
 * Puppeteer is not available in the browser.
 * 
 * @example
 * // In an API route: /api/report/pdf
 * import { exportToPDFBuffer } from '@/lib/spring-platform/reporting';
 * 
 * export async function POST(req: Request) {
 *   const { report, options } = await req.json();
 *   const pdfBuffer = await exportToPDFBuffer(report, options);
 *   return new Response(pdfBuffer, {
 *     headers: {
 *       'Content-Type': 'application/pdf',
 *       'Content-Disposition': `attachment; filename="${report.meta.projectName}_report.pdf"`,
 *     },
 *   });
 * }
 */
export async function exportToPDFBuffer(
    report: SpringDesignReport,
    options?: Partial<ReportOptions>
): Promise<Buffer> {
    // This is a placeholder that documents the server-side approach.
    // Actual implementation requires Puppeteer which must be installed separately.

    const html = generateReportHTML(report, options);

    // Dynamic import to avoid bundling Puppeteer in client code
    try {
        // @ts-ignore - puppeteer is optional, only available server-side
        const puppeteer = await import(/* webpackIgnore: true */ "puppeteer");

        const browser = await puppeteer.default.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "15mm",
                bottom: "20mm",
                left: "12mm",
                right: "12mm",
            },
        });

        await browser.close();

        return Buffer.from(pdfBuffer);
    } catch (e) {
        console.error("Puppeteer PDF export failed:", e);
        throw new Error(
            "PDF export requires Puppeteer. Install it with: npm install puppeteer\n" +
            "Or use the print-to-PDF workflow with exportToPDFViaPrint()."
        );
    }
}

// =============================================================================
// Report Export Wrapper (Combines all methods)
// =============================================================================

export type ExportMethod = "print" | "html" | "clipboard" | "pdf-server";

export interface ExportResult {
    success: boolean;
    method: ExportMethod;
    filename?: string;
    error?: string;
}

/**
 * Unified export function
 */
export async function exportReport(
    report: SpringDesignReport,
    method: ExportMethod,
    options?: Partial<ReportOptions>
): Promise<ExportResult> {
    try {
        switch (method) {
            case "print":
                printReport(report, options);
                return { success: true, method };

            case "html":
                const type = options?.type ?? "customer";
                const filename = `${report.meta.projectName.replace(/\s+/g, "_")}_${type}_report.html`;
                downloadReportHTML(report, options, filename);
                return { success: true, method, filename };

            case "clipboard":
                const copied = await copyReportHTML(report, options);
                return { success: copied, method };

            case "pdf-server":
                // This should only be called from server-side code
                throw new Error("Use exportToPDFBuffer() in server context");

            default:
                return { success: false, method, error: `Unknown method: ${method}` };
        }
    } catch (e) {
        return {
            success: false,
            method,
            error: e instanceof Error ? e.message : String(e)
        };
    }
}
