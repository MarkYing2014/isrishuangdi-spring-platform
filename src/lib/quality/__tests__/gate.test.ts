
import { describe, it, expect } from "vitest";
import {
    deriveGateState,
    deriveValidationStatus,
    canEnterAnalysis,
    ValidationSummary,
    NormalizedRow,
    GateDecision
} from "../types";
import { validateRow } from "../validators";
import { toAnalysisInput } from "../analysisBridge";

describe("Quality Gate Logic (SSOT)", () => {

    it("deriveGateState should follow BLOCKED -> CONDITIONAL -> READY logic", () => {
        const base: ValidationSummary = { total: 10, pass: 0, warn: 0, fail: 0, excluded: 0, status: "PASS" };

        expect(deriveGateState({ ...base, fail: 1 })).toBe("BLOCKED");
        expect(deriveGateState({ ...base, fail: 0, warn: 1 })).toBe("CONDITIONAL_READY");
        expect(deriveGateState({ ...base, fail: 0, warn: 0 })).toBe("READY");
    });

    it("canEnterAnalysis should strictly enforce gate", () => {
        const blockedDecision: GateDecision = { acceptedWarnings: false, excludedFailed: false };
        const acceptedDecision: GateDecision = { acceptedWarnings: true, excludedFailed: false };

        const summaryFail: ValidationSummary = { total: 10, pass: 9, warn: 0, fail: 1, excluded: 0, status: "FAIL" };
        expect(canEnterAnalysis(summaryFail, blockedDecision)).toBe(false);
        expect(canEnterAnalysis(summaryFail, acceptedDecision)).toBe(false); // Even if accepted warnings, Fail blocks.

        const summaryWarn: ValidationSummary = { total: 10, pass: 9, warn: 1, fail: 0, excluded: 0, status: "WARN" };
        expect(canEnterAnalysis(summaryWarn, blockedDecision)).toBe(false);
        expect(canEnterAnalysis(summaryWarn, acceptedDecision)).toBe(true);

        const summaryPass: ValidationSummary = { total: 10, pass: 10, warn: 0, fail: 0, excluded: 0, status: "PASS" };
        expect(canEnterAnalysis(summaryPass, blockedDecision)).toBe(true);
    });
});

describe("Validators (Pure)", () => {
    it("validateRow should detect required fields", () => {
        const row = { id: "1", values: { A: null }, status: "PENDING", issues: [], __rowId: "1" } as any;
        const mapping = [{ rawKey: "ra", targetKey: "A", type: "string", required: true }] as any;

        const res = validateRow(row, mapping, 0);
        expect(res.status).toBe("FAIL");
        expect(res.issues[0].code).toBe("REQUIRED");
    });

    it("validateRow should validate types", () => {
        const row = { id: "1", values: { N: NaN }, status: "PENDING", issues: [], __rowId: "1" } as any;
        const mapping = [{ rawKey: "rn", targetKey: "N", type: "number" }] as any;

        const res = validateRow(row, mapping, 0);
        expect(res.status).toBe("FAIL");
        expect(res.issues[0].code).toBe("INVALID_NUMBER");
    });
});

describe("Analysis Bridge", () => {
    it("toAnalysisInput should filter excluded and failed rows", () => {
        const rows: NormalizedRow[] = [
            { id: "1", values: { val: 1 }, status: "PASS", issues: [], __rowId: "1" },
            { id: "2", values: { val: 2 }, status: "FAIL", issues: [], __rowId: "2" },
            { id: "3", values: { val: 3 }, status: "WARN", issues: [], __rowId: "3" },
            { id: "4", values: { val: 4 }, status: "PASS", issues: [], excluded: true, __rowId: "4" },
        ];

        const summary = { total: 4, pass: 1, warn: 1, fail: 1, excluded: 1, status: "FAIL" } as any; // Mock
        // If fail=1, gate is blocked.
        // But if we exclude row 2 (Fail), then summary.fail should be 0.

        // Let's verify behavior if we force call it with "accepted" but data has active Failures -> Should Throw
        // But here we test the Filter Logic assuming Gate Passed

        const summaryClean = { total: 4, pass: 1, warn: 1, fail: 0, excluded: 1, status: "WARN" } as any;
        const decision = { acceptedWarnings: true, excludedFailed: false };

        const result = toAnalysisInput(rows, summaryClean, decision);

        expect(result).toHaveLength(2); // ID 1 (PASS) and ID 3 (WARN)
        expect(result.find(r => r.__rowId === "1")).toBeDefined();
        expect(result.find(r => r.__rowId === "3")).toBeDefined();
        expect(result.find(r => r.__rowId === "2")).toBeUndefined(); // FAIL filtered defensively
        expect(result.find(r => r.__rowId === "4")).toBeUndefined(); // Excluded filtered

        // Check Metadata
        expect(result.find(r => r.__rowId === "3")?.__isWarn).toBe(true);
    });
});
