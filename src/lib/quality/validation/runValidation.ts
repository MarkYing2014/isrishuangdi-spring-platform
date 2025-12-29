import type { NormalizedRow, ColumnMapping, ValidationIssue } from '../sheetTypes';
import { isRequired, isNumber, isDate } from './validators';

export function runValidation(
    rows: NormalizedRow[],
    mapping: ColumnMapping[]
): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Pre-process mapping for fast lookup
    const mapDict = new Map(mapping.map(m => [m.target, m]));

    rows.forEach(row => {
        // iterate over mapped columns
        mapping.forEach(col => {
            const val = row.normalized[col.target];
            const rules = col; // In future, rules can be separate from mapping

            // 1. Required Check
            if (col.required && !isRequired(val)) {
                issues.push({
                    rowIndex: row.rowIndex,
                    colKey: col.target,
                    level: "FAIL",
                    message: "Required value missing"
                });
                return; // Stop further checks if missing
            }

            // 2. Type Check
            if (val !== null && val !== undefined && val !== "") {
                if (col.type === "number" && !isNumber(val)) {
                    issues.push({
                        rowIndex: row.rowIndex,
                        colKey: col.target,
                        level: "FAIL", // Type mismatch is usually critical
                        message: "Invalid number"
                    });
                } else if (col.type === "date" && !isDate(val)) {
                    issues.push({
                        rowIndex: row.rowIndex,
                        colKey: col.target,
                        level: "WARN", // Date parsing is flaky, warn first
                        message: "Invalid date format"
                    });
                }
            }

            // 3. Logic Checks (Hardcoded for now based on prompt example)
            // e.g. FreeLength > SolidHeight
            // This requires cross-column validation which is advanced.
        });
    });

    return issues;
}
