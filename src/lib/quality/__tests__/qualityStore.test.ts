import { describe, it, expect, beforeEach } from "vitest";
import { useQualityStore } from "../qualityStore";

describe("Quality Store E2E", () => {
    beforeEach(() => {
        useQualityStore.getState().resetAll();
    });

    it("should handle full workflow: Import -> Map -> Edit -> Validate", () => {
        const store = useQualityStore.getState();

        // 1. Import
        store.importData({
            rawColumns: ["A", "B"],
            rows: [{ __rowId: "row1", A: "10", B: "20" }]
        });

        let state = useQualityStore.getState();
        expect(state.mode).toBe("raw");
        expect(state.rawRows.length).toBe(1);

        // 2. Map
        store.updateMapping([
            { raw: "A", target: "ColA", type: "number", required: true }
        ]);

        store.applyMappingAndNormalize();
        state = useQualityStore.getState();

        expect(state.mode).toBe("normalized");
        expect(state.normalizedRows[0]["ColA"]).toBe(10);
        expect(state.rowStatus["row1"]).toBe("PASS");

        // 3. Edit Cell (Make it invalid)
        store.editCell("row1", "ColA", null); // Clear required value

        state = useQualityStore.getState();
        // Should auto-validate? In implementation yes.
        expect(state.normalizedRows[0]["ColA"]).toBeNull();
        expect(state.rowStatus["row1"]).toBe("FAIL"); // Required missing

        // 4. Edit Cell (Fix it)
        store.editCell("row1", "ColA", 99);
        state = useQualityStore.getState();
        expect(state.rowStatus["row1"]).toBe("PASS");
    });
});
