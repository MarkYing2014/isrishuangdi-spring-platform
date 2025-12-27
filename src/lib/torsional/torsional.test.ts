
import { describe, it, expect } from 'vitest';
import {
    computeStageSafe,
    generateSystemCurve,
    generateStageCurve,
    TorsionalStage
} from './index';
import { DieSpringSpec } from '@/lib/dieSpring';

function mockSpec(overrides: Partial<DieSpringSpec> = {}): DieSpringSpec {
    return {
        id: "TEST-SPEC",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 25,
        innerDiameter: 12.5,
        freeLength: 50,
        wireWidth: 5,
        wireThickness: 3,
        solidHeight: 32,
        activeCoils: 8,
        springRate: 50,
        strokeLimits: { max: 20, normal: 16, long: 12 },
        colorCode: "blue",
        material: "Steel",
        source: { vendor: "TEST", document: "TEST", origin: "generated" },
        ...overrides
    };
}

describe('Phase 7: Torsional System Invariants (Strict)', () => {

    it('Invariant 1: Unit Guard (Non-finite/Negative Throws)', () => {
        const badStage: TorsionalStage = {
            stageId: "bad",
            geometry: { effectiveRadiusMm: 0, slotTravelMm: 10 },
            pack: {
                kind: "die",
                spec: mockSpec(),
                count: 1,
                lifeClass: "NORMAL"
            }
        };
        // Expect throw on R=0
        expect(() => computeStageSafe(badStage)).toThrow();

        badStage.geometry.effectiveRadiusMm = 50;
        badStage.pack.spec.springRate = -5;
        expect(() => computeStageSafe(badStage)).toThrow();
    });

    it('Invariant 2: Hard-Limit Invariant', () => {
        // Spec: Physical=18 (50-32). Max=20.
        // Stage A: Slot=16. Life=SHORT (Max=20).
        // Cap = Min(20, 18, 16) = 16.
        // Governing = SLOT_TRAVEL.
        const specA = mockSpec({ freeLength: 50, solidHeight: 32, strokeLimits: { max: 20, normal: 19, long: 10 } });
        const stageA: TorsionalStage = {
            stageId: "A",
            geometry: { effectiveRadiusMm: 100, slotTravelMm: 16 },
            pack: { kind: "die", spec: specA, count: 1, lifeClass: "SHORT" }
        };
        const resA = computeStageSafe(stageA);
        expect(resA.hardLimitStrokeMm).toBe(16);
        expect(resA.governing.code).toBe("SLOT_TRAVEL");
        expect(resA.governing.limitThetaDeg).toBeDefined();

        // Stage B: Slot=100. SolidStroke=5 (50-45). Max=20.
        // Cap = Min(20, 5, 100) = 5.
        // Governing = SOLID_HEIGHT.
        const specB = mockSpec({ freeLength: 50, solidHeight: 45, strokeLimits: { max: 20, normal: 19, long: 10 } });
        const stageB: TorsionalStage = {
            stageId: "B",
            geometry: { effectiveRadiusMm: 100, slotTravelMm: 100 },
            pack: { kind: "die", spec: specB, count: 1, lifeClass: "SHORT" }
        };
        const resB = computeStageSafe(stageB);
        expect(resB.hardLimitStrokeMm).toBe(5);
        expect(resB.governing.code).toBe("SOLID_HEIGHT");
    });

    it('Invariant 3: R² Invariant', async () => {
        const spec = mockSpec();
        const n = 1;
        const R1 = 50;
        const R2 = 100; // 2x R1 => 4x Torque

        const s1: TorsionalStage = {
            stageId: "1",
            geometry: { effectiveRadiusMm: R1, slotTravelMm: 999 },
            pack: { kind: "die", spec, count: n, lifeClass: "NORMAL" }
        };
        const s2: TorsionalStage = {
            stageId: "2",
            geometry: { effectiveRadiusMm: R2, slotTravelMm: 999 },
            pack: { kind: "die", spec, count: n, lifeClass: "NORMAL" }
        };

        const c1 = generateStageCurve(s1, 10, 1);
        const c2 = generateStageCurve(s2, 10, 1);

        const t1 = c1.points[1].torqueNmm;
        const t2 = c2.points[1].torqueNmm;

        expect(t2 / t1).toBeCloseTo(4, 3);
    });

    it('Invariant 4: Governing Trace Invariant', () => {
        const spec = mockSpec({ freeLength: 100, solidHeight: 50 });
        const sA: TorsionalStage = {
            stageId: "A",
            // A limited by slot=10
            geometry: { effectiveRadiusMm: 100, slotTravelMm: 10 },
            pack: { kind: "die", spec, count: 1, lifeClass: "SHORT" }
        };
        const sB: TorsionalStage = {
            stageId: "B",
            // B limited by slot=100
            geometry: { effectiveRadiusMm: 100, slotTravelMm: 100 },
            pack: { kind: "die", spec, count: 1, lifeClass: "SHORT" }
        };

        const sys = generateSystemCurve([sA, sB]);

        // System governed by A
        expect(sys.governingStageId).toBe("A");
        expect(sys.governing.code).toBe("SLOT_TRAVEL");

        // R=100, stroke=10 => theta = 0.1 rad = 5.73 deg
        expect(sys.thetaSafeSystemDeg).toBeCloseTo(5.729, 2);
    });
});
