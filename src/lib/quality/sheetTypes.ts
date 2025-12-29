export type CellValue = string | number | boolean | Date | null;

export interface QualityRow {
    id: string; // Unique ID (UUID)
    index: number; // 0-based original file index
    data: Record<string, CellValue>; // Raw key-value pairs
}

export interface ValidationIssue {
    rowIndex: number;
    colKey: string;
    level: "PASS" | "WARN" | "FAIL";
    message: string;
}

export type FieldType = "string" | "number" | "date" | "boolean";

export interface ColumnMapping {
    raw: string;      // Header in CSV/XLSX
    target: string;   // System field key (e.g., "load_p1")
    type: FieldType;  // Expected data type
    required?: boolean;
}

export interface NormalizedRow {
    id: string; // Maps back to QualityRow.id
    rowIndex: number;
    raw: Record<string, CellValue>; // Reference for traceability
    normalized: Record<string, CellValue>; // Cleaned/Converted data
    status: "PASS" | "WARN" | "FAIL";
    issues: ValidationIssue[]; // Aggregated issues
    isExcluded?: boolean; // Manual exclusion from analysis
}

export interface QualityAuditLog {
    id: string;
    timestamp: string;
    action: "IMPORT" | "MAP_UPDATE" | "CELL_EDIT" | "VALIDATE" | "EXCLUDE" | "RESET";
    details: string;
}
