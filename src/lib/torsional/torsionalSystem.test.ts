import { describe, it, expect } from "vitest";
import { calculateTorsionalSystem } from "./torsionalSystemMath";
import { TorsionalSpringSystemDesign } from "./torsionalSystemTypes";

describe("Torsional Spring System Math", () => {
    const baseDesign: TorsionalSpringSystemDesign = {
        type: "torsionalSpringSystem",
        groups: [
            {
                id: "g1",
                name: "Test Group",
                enabled: true,
                n: 6,
                k: 10,     // N/mm
                R: 100,    // mm
                theta_start: 0,
                d: 5,
                Dm: 30,
                L_free: 100,
                L_solid: 50,
                clearance: 5,
                materialId: "music_wire_a228"
            }
        ],
        frictionTorque: 0,
        referenceAngle: 0
    };

    it("should calculate correct linear stiffness for a single group", () => {
        // Kθ = n * k * R^2 * PI/180 / 1000 [Nm/deg]
        // Kθ = 6 * 10 * 100^2 * PI / 180 / 1000 = 60 * 10000 * PI / 180000 = 600000 * PI / 180000 = 3.333 * PI = ~10.47 Nm/deg
        const result = calculateTorsionalSystem({ ...baseDesign, referenceAngle: 1.0 });
        expect(result.totalStiffness).toBeCloseTo(10.47, 1);
        expect(result.totalTorque.load).toBeCloseTo(10.47, 1);
    });

    it("should handle staged engagement", () => {
        const stagedDesign: TorsionalSpringSystemDesign = {
            ...baseDesign,
            groups: [
                { ...baseDesign.groups[0], id: "g1", theta_start: 0, k: 10 },
                { ...baseDesign.groups[0], id: "g2", theta_start: 10, k: 20 }
            ]
        };

        const resAt5 = calculateTorsionalSystem({ ...stagedDesign, referenceAngle: 5.0 });
        const resAt15 = calculateTorsionalSystem({ ...stagedDesign, referenceAngle: 15.0 });

        // At 5 deg, only G1 active
        expect(resAt5.totalStiffness).toBeCloseTo(10.47, 1);

        // At 15 deg, both active. G2 is 2x rate of G1.
        // KTotal = K1 + K2 = 10.47 + 20.94 = 31.41
        expect(resAt15.totalStiffness).toBeCloseTo(31.41, 1);
    });

    it("should clamp at system stop", () => {
        const result = calculateTorsionalSystem({ ...baseDesign, referenceAngle: 50.0 });
        // Stop is roughly at (100-50-5)/100 rad = 0.45 rad = 25.78 deg
        expect(result.thetaStop / 1.0).toBeLessThan(30);

        // Torque after stop should be huge
        const atStop = calculateTorsionalSystem({ ...baseDesign, referenceAngle: result.thetaStop + 1 });
        expect(atStop.totalStiffness).toBeGreaterThan(10000);
    });

    it("should handle hysteresis dead-zone", () => {
        const designWithFriction: TorsionalSpringSystemDesign = {
            ...baseDesign,
            frictionTorque: 50, // Huge friction
            referenceAngle: 2.0
        };
        const result = calculateTorsionalSystem(designWithFriction);
        // TorqueLoad is ~20Nm. Friction is 50. Unload should be clamped to 0.
        expect(result.totalTorque.load).toBeGreaterThan(0);
        expect(result.totalTorque.unload).toBe(0);
    });
});
