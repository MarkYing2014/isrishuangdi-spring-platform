
import { describe, it, expect } from "vitest";
import { generateSystemCurve } from "../curves";
import { TorsionalStage } from "../types";
import { DieSpringSpec } from "@/lib/dieSpring/types";

// Mock spec
const MOCK_SPEC: DieSpringSpec = {
    id: "MOCK",
    colorCode: "blue",
    duty: "MEDIUM",
    series: "ISO_10243",
    unitSystem: "metric",
    outerDiameter: 20,
    innerDiameter: 10,
    freeLength: 100,
    springRate: 100, // N/mm
    wireWidth: 5,
    wireThickness: 5,
    activeCoils: 5,
    solidHeight: 60,
    strokeLimits: { long: 30, normal: 35, max: 40 },
    material: "Test",
    source: { vendor: "Test", document: "Doc" }
};

const MOCK_STAGE: TorsionalStage = {
    stageId: "1",
    geometry: { effectiveRadiusMm: 100, slotTravelMm: Infinity },
    pack: { kind: "die", spec: MOCK_SPEC, count: 1, lifeClass: "NORMAL" }
};

describe("Audit 80% Safety Rule", () => {
    it("passes when operating requirement is exactly 80% of safe limit", () => {
        // effectiveRadius = 100
        // Life Limit (NORMAL) = 35mm
        // Theta Safe = strokeToTheta(35, 100) = (35/100) * (180/PI) ≈ 20.05
        // 80% of 20.05 ≈ 16.04

        const curve = generateSystemCurve([MOCK_STAGE]);
        const thetaSafe = curve.thetaSafeSystemDeg;
        const req = thetaSafe * 0.8;

        const audit = generateSystemCurve([MOCK_STAGE], 80, req);
        expect(audit.systemResult).toBe("PASS");
        expect(audit.deviationRequired).toBe(false);
    });

    it("warns when operating requirement is slightly above 80% (e.g. 81%)", () => {
        const curve = generateSystemCurve([MOCK_STAGE]);
        const thetaSafe = curve.thetaSafeSystemDeg;
        const req = thetaSafe * 0.81;

        const audit = generateSystemCurve([MOCK_STAGE], 80, req);
        expect(audit.systemResult).toBe("WARN");
        expect(audit.deviationRequired).toBe(false);
    });

    it("fails when operating requirement exceeds safe limit", () => {
        const curve = generateSystemCurve([MOCK_STAGE]);
        const thetaSafe = curve.thetaSafeSystemDeg;
        const req = thetaSafe * 1.01;

        const audit = generateSystemCurve([MOCK_STAGE], 80, req);
        expect(audit.systemResult).toBe("FAIL");
        expect(audit.deviationRequired).toBe(true);
    });
});
