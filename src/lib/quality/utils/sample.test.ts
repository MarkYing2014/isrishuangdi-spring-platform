
import { sampleDeterministic } from "./sample";

describe("sampleDeterministic", () => {
    const data = Array.from({ length: 100 }, (_, i) => ({ id: i, val: `v${i}` }));

    test("returns empty for empty input", () => {
        expect(sampleDeterministic([], 10)).toEqual([]);
    });

    test("returns all if n >= length", () => {
        const res = sampleDeterministic(data, 100);
        expect(res).toHaveLength(100);
        expect(res[0].id).toBe(0); // Order preserved
        expect(res[99].id).toBe(99);
    });

    test("returns exactly n items if n < length", () => {
        const res = sampleDeterministic(data, 10);
        expect(res).toHaveLength(10);
    });

    test("is deterministic with same seed", () => {
        const run1 = sampleDeterministic(data, 5, 123);
        const run2 = sampleDeterministic(data, 5, 123);
        expect(run1).toEqual(run2);
    });

    test("changes with different seed", () => {
        const run1 = sampleDeterministic(data, 5, 123);
        const run2 = sampleDeterministic(data, 5, 456);
        expect(run1).not.toEqual(run2);
    });

    test("preserves relative order", () => {
        const res = sampleDeterministic(data, 20, 1);
        // Check strict increasing ID
        for (let i = 1; i < res.length; i++) {
            expect(res[i].id).toBeGreaterThan(res[i - 1].id);
        }
    });
});
