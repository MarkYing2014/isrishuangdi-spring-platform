import {
    NormalizedRow,
    ColumnMappingItem,
    CellIssue,
    ValidationSummary,
    QualityRowId
} from "./types";

export function validateRow(
    row: NormalizedRow,
    mapping: ColumnMappingItem[],
    rowIndex: number
): { status: "PASS" | "WARN" | "FAIL"; issues: CellIssue[] } {
    const issues: CellIssue[] = [];
    let hasFail = false;
    let hasWarn = false;

    mapping.forEach(col => {
        const val = row.values[col.targetKey];
        const key = col.targetKey;

        // 1. Required Check
        if (col.required) {
            if (val === null || val === undefined || val === "") {
                issues.push({
                    rowId: row.id,
                    rowIndex,
                    colKey: key,
                    severity: "FAIL",
                    code: "REQUIRED",
                    message: "Required value missing"
                });
                hasFail = true;
            }
        }

        // 2. Type Check (Number)
        if (col.type === "number") {
            if (typeof val === "number" && isNaN(val)) {
                issues.push({
                    rowId: row.id,
                    rowIndex,
                    colKey: key,
                    severity: "FAIL",
                    code: "INVALID_NUMBER",
                    message: "Invalid number format"
                });
                hasFail = true;
            }
        }

        // 3. Type Check (Date)
        if (col.type === "date") {
            if (val === "Invalid Date" || (val instanceof Date && isNaN(val.getTime()))) {
                issues.push({
                    rowId: row.id,
                    rowIndex,
                    colKey: key,
                    severity: "FAIL",
                    code: "INVALID_DATE",
                    message: "Invalid date format"
                });
                hasFail = true;
            }
        }
    });

    // Determine Row Status
    let status: "PASS" | "WARN" | "FAIL" = "PASS";
    if (hasFail) status = "FAIL";
    else if (hasWarn) status = "WARN";

    return { status, issues };
}

export function validateAll(
    rows: NormalizedRow[],
    mapping: ColumnMappingItem[]
): {
    summary: ValidationSummary;
    issuesByRow: Record<QualityRowId, CellIssue[]>
} {
    let pass = 0;
    let warn = 0;
    let fail = 0;
    let excluded = rows.filter(r => r.excluded).length;

    const issuesByRow: Record<QualityRowId, CellIssue[]> = {};

    rows.forEach((row, idx) => {
        if (row.excluded) return; // Skip excluded from stats

        // Validate
        const { status, issues } = validateRow(row, mapping, idx);

        // Update Row State (Mutation on the object provided, careful)
        // In a pure function ideally we return new rows, but for performance with 10k rows
        // we might rely on the store to update the row's status property.
        // For this function, let's assume it returns data to be merged.

        if (status === "PASS") pass++;
        else if (status === "WARN") warn++;
        else if (status === "FAIL") fail++;

        if (issues.length > 0) {
            issuesByRow[row.id] = issues;
        }
    });

    const summary: ValidationSummary = {
        total: rows.length,
        pass,
        warn,
        fail,
        excluded,
        status: fail > 0 ? "FAIL" : warn > 0 ? "WARN" : "PASS"
    };

    return { summary, issuesByRow };
}
