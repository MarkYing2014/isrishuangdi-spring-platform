/**
 * Spring Platform Reporting Module
 * Phase 9: Professional PDF Report Generation
 * 
 * Public exports for the OEM Report Template System.
 */

// Types
export type {
    SpringDesignReport,
    ReportMeta,
    ReportParameter,
    ReportLoadCase,
    ReportCurve,
    ReportIssue,
    ReportReview,
    ReportParetoCandidate,
    ReportParetoResults,
    ReportOptions,
} from "./report-types";

export {
    DEFAULT_REPORT_OPTIONS,
    DEFAULT_ENGINEERING_OPTIONS,
} from "./report-types";

// Builder
export {
    buildSpringDesignReport,
    type ReportBuilderInput,
} from "./report-builder";

// Templates
export { generateCustomerReportHTML } from "./templates/customer-report";
export { generateEngineeringReportHTML } from "./templates/engineering-report";
export { getReportStyles } from "./templates/shared-styles";

// Export utilities
export {
    generateReportHTML,
    printReport,
    downloadReportHTML,
    copyReportHTML,
    exportToPDFViaPrint,
    exportToPDFBuffer,
    exportReport,
    type ExportMethod,
    type ExportResult,
} from "./export-pdf";
