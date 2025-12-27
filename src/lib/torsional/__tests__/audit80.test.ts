import { describe, it, expect } from "vitest";
import { generateSystemCurve } from "../curves";
import { TorsionalStage } from "../types";

describe("Torsional Audit 80% Rule", () => {
    // Mock simple stage
    const mockStages: TorsionalStage[] = [
        {
            stageId: "S1",
            geometry: { effectiveRadiusMm: 100, slotTravelMm: 10 }, // 10mm travel
            pack: {
                kind: "die",
                spec: {
                    id: "test",
                    series: "ISO_10243",
                    duty: "EXTRA_LIGHT",
                    colorCode: "YELLOW",
                    outerDiameter: 20,
                    innerDiameter: 10,
                    freeLength: 100,
                    solidHeight: 50,
                    wireWidth: 5,
                    wireThickness: 3,
                    activeCoils: 10,
                    springRate: 10,
                    material: "Steel",
                    source: { vendor: "Test", document: "Doc" },
                    strokeLimits: { long: 20, normal: 15, max: 10 }
                } as any,
                count: 1,
                lifeClass: "NORMAL"
            }
        }
    ];

    // theta_safe = 10mm / 100mm = 0.1 rad = 5.73 deg
    const thetaSafe = (10 / 100) * (180 / Math.PI); // 5.729...

    it("should return PASS if thetaOperating <= 80% of thetaSafe", () => {
        const result = generateSystemCurve(mockStages, 10, thetaSafe * 0.7);
        expect(result.systemResult).toBe("PASS");
        expect(result.conformsToCustomerRange).toBe(true);
    });

    it("should return WARN if 80% < thetaOperating <= 100% of thetaSafe", () => {
        const result = generateSystemCurve(mockStages, 10, thetaSafe * 0.9);
        expect(result.systemResult).toBe("WARN");
        expect(result.conformsToCustomerRange).toBe(true);
    });

    it("should return FAIL if thetaOperating > thetaSafe", () => {
        const result = generateSystemCurve(mockStages, 10, thetaSafe * 1.1);
        expect(result.systemResult).toBe("FAIL");
        expect(result.conformsToCustomerRange).toBe(false);
        expect(result.deviationRequired).toBe(true);
    });

    it("should return INFO if no thetaOperating is provided", () => {
        const result = generateSystemCurve(mockStages, 10);
        expect(result.systemResult).toBe("INFO");
    });
});
