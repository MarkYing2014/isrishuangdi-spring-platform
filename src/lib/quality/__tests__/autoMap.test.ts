
import { describe, it, expect, beforeEach } from "vitest";
import { useQualityStore } from "../qualityStore";

describe("Store Auto-Mapping (importData)", () => {
    beforeEach(() => {
        useQualityStore.getState().reset();
    });

    it("should infer and apply mapping for Sample Data", () => {
        const rawRows = [
            { id: "1", cells: { "PartNo": "PN-001", "Load": "10.5", "Date": "2023-01-01" }, __meta: { rowIndex: 0 } }
        ];
        const columns = ["PartNo", "Load", "Date"];

        // Action
        useQualityStore.getState().importData({ rawRows, columns });

        const state = useQualityStore.getState();

        // 1. Check Mapping
        expect(state.columnMapping).toBeDefined();
        expect(state.columnMapping.length).toBeGreaterThan(0);

        const partMap = state.columnMapping.find(m => m.targetKey === "PartNo");
        expect(partMap).toBeDefined();
        expect(partMap?.rawKey).toBe("PartNo");

        // 2. Check Normalized Rows (Immediate Apply)
        expect(state.normalizedRows.length).toBe(1);
        expect(state.normalizedRows[0].values["PartNo"]).toBe("PN-001");
        expect(state.normalizedRows[0].values["Load"]).toBe(10.5);

        // 3. Confirm Mode is RAW initially
        expect(state.mode).toBe("RAW");

        // 4. Navigate Key -> MAPPING -> Should switch to NORMALIZED
        useQualityStore.getState().setActiveStep("MAPPING");
        expect(useQualityStore.getState().mode).toBe("NORMALIZED");

        // 5. Normalized Rows should persist
        expect(useQualityStore.getState().normalizedRows[0].values["PartNo"]).toBe("PN-001");
    });
});
