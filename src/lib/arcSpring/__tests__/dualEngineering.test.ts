
import { describe, it, expect } from 'vitest';
import { computeArcSpringCurve, springRate_k } from '../math';
import { ArcSpringInput } from '../types';

describe('Dual Spring Engineering Logic', () => {
    const baseInput: ArcSpringInput = {
        d: 4, D: 30, n: 5, r: 80,
        alpha0: 50, alphaC: 10,
        materialKey: 'EN10270_2',
        systemMode: 'single'
    };

    it('calculates Single Spring correctly (Baseline)', () => {
        const res = computeArcSpringCurve(baseInput);
        expect(res.k).toBeGreaterThan(0);
        expect(res.R_deg).toBeGreaterThan(0);
        // S1 Torque check: M = k * r^2 * rad
        // k ~ G d^4 / 8D^3n = 79500 * 256 / 8*27000*5 = 18.84 N/mm
        // R_deg ~ 18.84 * 6400 * pi/180 ~ 2100 Nmm/deg
        expect(res.R_deg).toBeCloseTo(2105, -2); // Approx
    });

    it('aggregates Stiffness in Dual Parallel Mode', () => {
        const dualInput: ArcSpringInput = {
            ...baseInput,
            systemMode: 'dual_parallel',
            spring2: {
                d: 2, D: 15, n: 5, r: 80, // S2
                alpha0: 50, alphaC: 10
            }
        };

        const res = computeArcSpringCurve(dualInput);
        const s1 = computeArcSpringCurve({ ...baseInput });
        const s2 = computeArcSpringCurve({ ...baseInput, ...dualInput.spring2, systemMode: 'single' });

        // R_total should be R1 + R2
        expect(res.R_deg).toBeCloseTo(s1.R_deg + s2.R_deg, 2);

        // M_total should include both
        expect(res.MMax_load).toBeGreaterThan(s1.MMax_load);
    });

    it('calculates Stress independently', () => {
        const dualInput: ArcSpringInput = {
            ...baseInput,
            systemMode: 'dual_parallel',
            spring2: {
                d: 2, D: 15, n: 5, r: 80,
                alpha0: 50, alphaC: 10
            }
        };

        const res = computeArcSpringCurve(dualInput);
        const s1 = computeArcSpringCurve({ ...baseInput });
        const s2_only = computeArcSpringCurve({ ...baseInput, ...dualInput.spring2, systemMode: 'single' });

        // S1 Stress should match Single mode stress (NOT affected by S2 presence)
        // Previous bug: S1 stress used M_total, which would be huge.
        expect(res.tauMax).toBeCloseTo(s1.tauMax, 1);

        // S2 Stress should apply to Inner Spring
        expect(res.spring2Result).toBeDefined();
        if (res.spring2Result) {
            expect(res.spring2Result.tauMax).toBeCloseTo(s2_only.tauMax, 1);
        }
    });

    it('handles Staged Spring (Piecewise Torque)', () => {
        const stagedInput: ArcSpringInput = {
            ...baseInput, // 40 deg travel
            systemMode: 'dual_staged',
            engageAngle2: 20, // S2 engages halfway
            spring2: {
                d: 4, D: 30, n: 5, r: 80, // Identical sprint for easy math
                alpha0: 50, alphaC: 10
            }
        };

        const res = computeArcSpringCurve(stagedInput);

        // At full travel (40 deg):
        // S1 has traveled 40 deg.
        // S2 has traveled 20 deg (40 - 20).
        // Since springs are identical, M_total should be M(40) + M(20) ~ 1.5 * M(40)

        const s1 = computeArcSpringCurve(baseInput);
        const M_full = s1.MMax_load;
        const M_expected = M_full + (M_full * (20 / 40));

        expect(res.MMax_load).toBeCloseTo(M_expected, -2);
    });
});
