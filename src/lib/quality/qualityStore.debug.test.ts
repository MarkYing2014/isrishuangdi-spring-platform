
import { useQualityStore, getRawRowsForDebug } from "./qualityStore";
import { RawRow } from "./types";

// Mock Zustand
// Note: Running real store in tests usually works if purely functional.

describe("qualityStore Debug Selectors", () => {

    // Setup initial state helper
    const createMockState = (chartMode: "RAW" | "AGGREGATED", debugMode: "OFF" | "RAW" | "SERIES", showRawAgg: "EMPTY" | "SAMPLED") => {
        const rawRows = Array.from({ length: 100 }, (_, i) => ({
            id: `row-${i}`,
            cells: { val: i },
            __meta: { rowIndex: i }
        } as unknown as RawRow));

        return {
            rawRows,
            chart: {
                chartMode,
                debug: {
                    mode: debugMode,
                    rawSampleSize: 10,
                    showRawWhenAggregated: showRawAgg,
                    rawSampleSeed: 1
                }
            }
        } as any;
    };

    test("Debug OFF -> return empty", () => {
        const state = createMockState("AGGREGATED", "OFF", "EMPTY");
        const res = getRawRowsForDebug(state);
        expect(res).toEqual([]);
    });

    test("Aggregated + Debug RAW + EMPTY -> return empty", () => {
        const state = createMockState("AGGREGATED", "RAW", "EMPTY");
        const res = getRawRowsForDebug(state);
        expect(res).toEqual([]);
    });

    test("Aggregated + Debug RAW + SAMPLED -> return sampled", () => {
        const state = createMockState("AGGREGATED", "RAW", "SAMPLED");
        const res = getRawRowsForDebug(state);
        expect(res).toHaveLength(10);
        // Verify mapping
        expect(res[0].id).toBeDefined();
        expect(res[0].__rowIndex).toBeDefined();
    });

    test("RAW + Debug RAW -> return all", () => {
        const state = createMockState("RAW", "RAW", "EMPTY"); // showRawWhenAggregated irrelevant
        const res = getRawRowsForDebug(state);
        expect(res).toHaveLength(100);
    });
});
