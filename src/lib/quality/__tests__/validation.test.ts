import { describe, it, expect, beforeEach } from "vitest";
import { useQualityStore } from "../qualityStore";
import { ColumnMappingItem } from "../types";

describe("Quality Store Validation", () => {
    // Reset store before each test
    const store = useQualityStore.getState();
    beforeEach(() => {
        store.resetAll();
    });

    it("should validate required fields", () => {
        const { importData, updateMapping, applyMappingAndNormalize, validate } = useQualityStore.getState();

        // 1. Setup Data
        importData({
            rawColumns: ["P1", "L1"],
            rows: [
                { __rowId: "r1", P1: "100", L1: "" }, // Missing L1
                { __rowId: "r2", P1: "200", L1: "50" }
            ]
        });

        // 2. Setup Mapping
        const mapping: ColumnMappingItem[] = [
            { raw: "P1", target: "Load", type: "number", required: false },
            { raw: "L1", target: "Length", type: "number", required: true } // Required
        ];
        updateMapping(mapping);

        // 3. Normalize & Validate
        applyMappingAndNormalize();
        // validate() is auto-called by applyMappingAndNormalize, but let's be safe
        // Check state
        const state = useQualityStore.getState();
        const r1Obj = state.normalizedRows.find(r => r.__rowId === "r1");

        expect(state.mode).toBe("normalized");
        expect(state.rowStatus["r1"]).toBe("FAIL");
        expect(state.rowStatus["r2"]).toBe("PASS");

        // Check issues
        const issueKey = `r1:Length`;
        const issues = state.issuesByCell[issueKey];
        expect(issues).toBeDefined();
        expect(issues[0].severity).toBe("FAIL");
        expect(issues[0].message).toContain("Required");
    });

    it("should validate number types", () => {
        const { importData, updateMapping, applyMappingAndNormalize } = useQualityStore.getState();

        importData({
            rawColumns: ["Val"],
            rows: [{ __rowId: "r1", Val: "abc" }] // Invalid number
        });

        updateMapping([
            { raw: "Val", target: "Data", type: "number" }
        ]);

        applyMappingAndNormalize();

        const state = useQualityStore.getState();
        expect(state.rowStatus["r1"]).toBe("FAIL");

        const issues = state.issuesByCell["r1:Data"];
        expect(issues[0].message).toContain("Invalid number");
    });
});
