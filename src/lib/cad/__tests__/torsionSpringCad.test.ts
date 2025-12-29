
import { buildTorsionSpringCenterlineMm } from "../torsionSpringCad";
import { type TorsionDesignMeta } from "@/lib/stores/springSimulationStore";
import * as THREE from "three";

describe("Torsion Spring CAD Generation", () => {
    const mockDesign: TorsionDesignMeta = {
        type: "torsion",
        wireDiameter: 2.0,
        meanDiameter: 20.0,
        activeCoils: 5.0,
        bodyLength: 10.0, // activeCoils * wireDiameter usually
        pitch: 2.0,
        legLength1: 30.0,
        legLength2: 30.0,
        freeAngle: 90,
        windingDirection: "right",
        shearModulus: 79000,
        springRate: 1.0,
    };

    test("buildTorsionSpringCenterlineMm generates valid geometry", () => {
        const result = buildTorsionSpringCenterlineMm(mockDesign, 0); // 0 deflection

        expect(result).toBeDefined();
        expect(result.leg1.length).toBeGreaterThan(0);
        expect(result.body.length).toBeGreaterThan(0);
        expect(result.leg2.length).toBeGreaterThan(0);
        expect(result.centerline.length).toBeGreaterThan(result.body.length);
    });

    test("Stats match design input", () => {
        const result = buildTorsionSpringCenterlineMm(mockDesign, 0);
        expect(result.stats.meanRadiusMm).toBeCloseTo(10.0);
        expect(result.stats.wireDiameterMm).toBe(2.0);
        expect(result.stats.legLength1Mm).toBe(30.0);
        expect(result.stats.legLength2Mm).toBe(30.0);
    });

    test("Continuity: Leg1 connects to Body Start", () => {
        const result = buildTorsionSpringCenterlineMm(mockDesign, 0);
        const leg1End = result.leg1[result.leg1.length - 1]; // End of leg1 (at body)
        const bodyStart = result.body[0];

        expect(leg1End.x).toBeCloseTo(bodyStart.x);
        expect(leg1End.y).toBeCloseTo(bodyStart.y);
        expect(leg1End.z).toBeCloseTo(bodyStart.z);
    });

    test("Continuity: Body End connects to Leg2", () => {
        const result = buildTorsionSpringCenterlineMm(mockDesign, 0);
        const bodyEnd = result.body[result.body.length - 1];
        const leg2Start = result.leg2[0];

        expect(bodyEnd.x).toBeCloseTo(leg2Start.x);
        expect(bodyEnd.y).toBeCloseTo(leg2Start.y);
        expect(bodyEnd.z).toBeCloseTo(leg2Start.z);
    });

    test("High Resolution Sampling", () => {
        const result = buildTorsionSpringCenterlineMm(mockDesign, 0);
        // We asked for 200 pts/turn * 5 turns = 1000 pts approx
        expect(result.stats.sampleCountBody).toBeGreaterThan(900);
    });

    test("Working Angle affects body length (coils change)", () => {
        const design = { ...mockDesign, freeAngle: 180 };
        // At 0 deflection, angle is 180
        const res0 = buildTorsionSpringCenterlineMm(design, 0);

        // Deflect by 90 degrees -> working angle = 90
        const resDeflected = buildTorsionSpringCenterlineMm(design, 90);

        // Helix angle should change, thus total points/length might change slightly or end point changes
        expect(res0.stats.activeCoils).not.toBe(resDeflected.stats.activeCoils);
    });
});
