
import {
    NormalizedRow,
    ValidationSummary,
    GateDecision,
    canEnterAnalysis
} from "./types";

/**
 * Bridge function to adapt the new Gate System data to the old Analysis Engine.
 */
export function toAnalysisInput(
    rows: NormalizedRow[],
    summary: ValidationSummary,
    decision: GateDecision
): any[] {
    // 1. Check Gate (Security)
    if (!canEnterAnalysis(summary, decision)) {
        throw new Error("Quality Gate Validation Failed. Cannot enter analysis.");
    }

    // 2. Filter Rows
    return rows
        .filter(r => {
            // Exclude explicit exclusions
            if (r.excluded) return false;

            // Exclude FAIL (defensive, should be 0 if gate passed)
            if (r.status === "FAIL") return false;

            return true;
        })
        .map(r => ({
            ...r.values,
            // Flag warned rows for CPK exclusion if needed
            __isWarn: r.status === "WARN",
            __rowId: r.id
        }));
}
