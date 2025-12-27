
import { describe, it, expect } from "vitest";
import { generateSystemCurve } from "../curves";
import { TorsionalStage } from "../types";
import { DieSpringSpec } from "@/lib/dieSpring/types";
import { computeStageLimits } from "../limits";

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
    springRate: 100,
    wireWidth: 5,
    wireThickness: 5,
    activeCoils: 5,
    solidHeight: 60,
    strokeLimits: { long: 10, normal: 20, max: 50 },
    material: "Scragged",
    source: { vendor: "Test", document: "T1" }
};

describe("Audit Governing Limits", () => {
    const BASE_STAGE: TorsionalStage = {
        stageId: "1",
        geometry: { effectiveRadiusMm: 100, slotTravelMm: Infinity },
        pack: { kind: "die", spec: MOCK_SPEC, count: 1, lifeClass: "NORMAL" }
    };

    it("identifies LIFE_LIMIT when governed by fatigue stroke (20mm)", () => {
        // Normal life limit = 20mm. Solid limit = 100-60 = 40mm.
        // So safe = 20mm (life). hard = 40mm.
        // Governing should be LIFE_LIMIT.

        const lim = computeStageLimits(MOCK_SPEC, Infinity, "NORMAL", 100);
        expect(lim.safeStrokeMm).toBe(20);
        expect(lim.hardLimitStrokeMm).toBe(40);
        expect(lim.governing.code).toBe("LIFE_LIMIT");
    });

    it("identifies SLOT_TRAVEL when governed by slot (15mm < 20mm)", () => {
        // Slot travel = 15mm. Life = 20mm. Solid = 40mm.
        // Safe = min(15, 20, 40) = 15.
        // Hard = min(15, 40) = 15.
        // Correct governing code? SLOT_TRAVEL.

        const lim = computeStageLimits(MOCK_SPEC, 15, "NORMAL", 100);
        expect(lim.safeStrokeMm).toBe(15);
        expect(lim.hardLimitStrokeMm).toBe(15);
        expect(lim.governing.code).toBe("SLOT_TRAVEL");
    });

    it("identifies SOLID_HEIGHT when governed by solid (if life is HUGE)", () => {
        // Mock a really robust spring or SHORT life class allowed up to solid?
        // Let's use 'max' life limit (25mm) but set solid limit to 22mm (artificial).
        const TIGHT_SOLID_SPEC = { ...MOCK_SPEC, solidHeight: 78 }; // free 100, solid 78 -> stroke 22.
        // Max limit is 25.
        // So safe = min(22, 25) = 22.
        // Hard = 22.
        // Governing -> SOLID_HEIGHT.

        const lim = computeStageLimits(TIGHT_SOLID_SPEC, Infinity, "SHORT", 100);
        expect(lim.safeStrokeMm).toBe(22);
        expect(lim.governing.code).toBe("SOLID_HEIGHT");
    });

    it("ensures thetaHard >= thetaSafe always", () => {
        const lim = computeStageLimits(MOCK_SPEC, Infinity, "NORMAL", 100);
        expect(lim.hardLimitStrokeMm).toBeGreaterThanOrEqual(lim.safeStrokeMm);

        const lim2 = computeStageLimits(MOCK_SPEC, 5, "NORMAL", 100); // slot tiny
        expect(lim2.hardLimitStrokeMm).toBeGreaterThanOrEqual(lim2.safeStrokeMm);
    });
});
