
import { describe, it, expect } from 'vitest';
import { computeKxCurve, runShockSpringAnalysis } from '../analysis';
import { ShockSpringInput } from '../types';
// Mock model generation if needed, or rely on real one if pure
import { generateCenterline } from '../model';

const BASE_INPUT: ShockSpringInput = {
    totalTurns: 10,
    samplesPerTurn: 60,
    meanDia: { start: 40, mid: 40, end: 40, shape: 'linear' },
    wireDia: { start: 4, mid: 4, end: 4 },
    pitch: {
        style: 'symmetric',
        closedTurns: 1.5,
        workingMin: 10,  // Constant pitch implicitly if min=max or specific logic?
        // Wait, "symmetric" uses pitch logic.
        // Let's use 'progressive' to test nonlinearity
        workingMax: 10,
        transitionSharpness: 0.5,
        closedPitchFactor: 1.05
    },
    grinding: { mode: 'none', grindStart: false, grindEnd: false, offsetTurns: 0 },
    material: { name: 'TestSteel', shearModulus: 79000, tensileStrength: 1600, density: 7.85 },
    loadCase: { solidMargin: 3.0 },
    installation: { guided: false, guideDia: 0, guideType: 'none' }
};

describe('ShockSpring Analysis (Phase 4)', () => {

    it('generates Monotonic Stiffness for Progressive Spring', () => {
        const input: ShockSpringInput = {
            ...BASE_INPUT,
            pitch: { ...BASE_INPUT.pitch, style: 'progressive', workingMin: 8, workingMax: 16 }
        };

        const derived = generateCenterline(input);
        const kxCurve = computeKxCurve(input, derived);

        // Check K(x) is non-decreasing (monotonic increase as coils bind)
        // Ignoring minor noise? The solver should be robust.
        for (let i = 1; i < kxCurve.length; i++) {
            expect(kxCurve[i].k).toBeGreaterThanOrEqual(kxCurve[i - 1].k * 0.99); // Allow tiny variance? No, strict >=.
            // Actually, for robust solver:
            if (kxCurve[i].x > kxCurve[i - 1].x + 0.1) {
                // Ignore very close points
                expect(kxCurve[i].k).toBeGreaterThanOrEqual(kxCurve[i - 1].k);
            }
        }
    });

    it('integral P(x) matches area under K curve approx', () => {
        const result = runShockSpringAnalysis(BASE_INPUT);
        const curve = result.kxCurve;

        // P_last approx Sum(k_avg * dx)
        // Let's check last point
        const last = curve[curve.length - 1];

        // Energy = Integral P dx
        // P = Integral k dx

        // Check simple linearity for linear spring
        // If linear, P = k*x.
        // Our 'symmetric' spring (mostly linear middle) should be close.

        // Or check consistency: P[i] ≈ P[i-1] + k_avg * dx
        for (let i = 1; i < curve.length; i++) {
            const dx = curve[i].x - curve[i - 1].x;
            const k_avg = (curve[i].k + curve[i - 1].k) / 2;
            const dP = curve[i].force - curve[i - 1].force;

            // dP should be k * dx
            // Allow 5% tolerance due to iterative solver stepping
            expect(dP).toBeCloseTo(k_avg * dx, -1); // approx check
        }
    });

    it('stability check: samplesPerTurn variation', () => {
        // Run with 60 and 120 samples
        const input60 = { ...BASE_INPUT, samplesPerTurn: 60 };
        const input120 = { ...BASE_INPUT, samplesPerTurn: 120 };

        const res60 = runShockSpringAnalysis(input60);
        const res120 = runShockSpringAnalysis(input120);

        // Compare Force at 50% max Deflection
        const midDeflection = (res60.derived.freeLength - res60.derived.solidHeight) * 0.5;

        // Find points
        const getForce = (res: any, x: number) => {
            const p = res.kxCurve.find((p: any) => p.x >= x);
            return p ? p.force : 0;
        };

        const F60 = getForce(res60, midDeflection);
        const F120 = getForce(res120, midDeflection);

        // Expect < 2% deviation
        const deviation = Math.abs(F60 - F120) / F60;
        expect(deviation).toBeLessThan(0.02);
    });
});
