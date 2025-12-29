
import { describe, it, expect, beforeEach } from "vitest";
import { useQualityStore } from "../qualityStore";
import { ColumnMappingItem, ValidationSummary } from "../types";

// Mock zustand if needed, but integration testing the store directly is usually fine in node env.

describe("Quality Store Actions", () => {
    // Reset store before each test
    beforeEach(() => {
        useQualityStore.getState().reset();
    });

    it("importData should load raw rows and reset validation", () => {
        useQualityStore.getState().importData({
            rawRows: [
                { id: "1", cells: { A: "10" } } as any
            ],
            columns: ["A"],
            fileName: "test.csv"
        });

        const state = useQualityStore.getState();
        expect(state.mode).toBe("RAW");
        expect(state.rawRows).toHaveLength(1);
        expect(state.normalizedRows).toHaveLength(0); // Should be empty until mapping
        expect(state.auditTrail[0].type).toBe("IMPORT");
    });

    it("updateMapping should generate normalized rows and validate them", () => {
        // Setup
        useQualityStore.getState().importData({
            rawRows: [
                { id: "1", cells: { A: "10", B: "foo" } } as any,
                { id: "2", cells: { A: "invalid", B: "bar" } } as any
            ],
            columns: ["A", "B"]
        });

        // Act
        const mapping: ColumnMappingItem[] = [
            { rawKey: "A", targetKey: "Num", type: "number", required: true },
            { rawKey: "B", targetKey: "Str", type: "string" }
        ];
        useQualityStore.getState().updateMapping(mapping);

        // Assert
        const state = useQualityStore.getState();
        // Mode switch disabled in store now: expect(state.mode).toBe("NORMALIZED"); -> No, mode remains RAW.
        expect(state.columnMapping).toHaveLength(2);

        const rows = state.normalizedRows;
        expect(rows).toHaveLength(2);

        // Row 1: Valid
        expect(rows[0].values.Num).toBe(10);
        expect(rows[0].status).toBe("PASS");

        // Row 2: Invalid (NaN)
        expect(rows[1].values.Num).toBeNaN();
        expect(rows[1].status).toBe("FAIL");

        // Summary
        const summary = state.validationSummary;
        expect(summary.total).toBe(2);
        expect(summary.pass).toBe(1);
        expect(summary.fail).toBe(1);
        expect(summary.status).toBe("FAIL");
    });

    it("excludeFailedRows should update decision and recalc summary", () => {
        // Setup with 1 fail 1 pass
        useQualityStore.getState().importData({ rawRows: [{ id: "1", cells: { A: "bad" } } as any, { id: "2", cells: { A: "10" } } as any] });
        useQualityStore.getState().updateMapping([{ rawKey: "A", targetKey: "N", type: "number" }]);

        const preState = useQualityStore.getState();
        expect(preState.validationSummary.fail).toBe(1);
        expect(preState.gateDecision.excludedFailed).toBe(false);

        // Act
        useQualityStore.getState().excludeFailedRows();

        // Assert
        const postState = useQualityStore.getState();
        expect(postState.gateDecision.excludedFailed).toBe(true);
        expect(postState.normalizedRows.find(r => r.id === "1")?.excluded).toBe(true);
        expect(postState.normalizedRows.find(r => r.id === "2")?.excluded).toBe(false);

        // Summary should reflect exclusion
        expect(postState.validationSummary.fail).toBe(0); // Failures excluded
        expect(postState.validationSummary.excluded).toBe(1);
        expect(postState.validationSummary.status).toBe("PASS"); // Only passes remain
    });
});
