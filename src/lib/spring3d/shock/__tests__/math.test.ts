
import { describe, it, expect } from 'vitest';
import { linearStiffness, correctedShearStress, wahlFactor } from '../math';

describe('ShockSpring Math (Phase 3)', () => {
    it('calculates Wahl factor correctly (Standard Values)', () => {
        // C=5 -> K=1.31
        expect(wahlFactor(5)).toBeCloseTo(1.3105, 3);
        // C=10 -> K=1.14
        expect(wahlFactor(10)).toBeCloseTo(1.1448, 3);
    });

    it('calculates shear stress correctly', () => {
        // Example: P=1000N, D=10mm, d=1mm -> C=10
        // Tau = K * 8PD / pi*d^3
        // K(10) ≈ 1.1448
        // Tau = 1.1448 * 8 * 1000 * 10 / (3.14159 * 1) ≈ 2915 MPa (Huge because d=1 is small)

        const P = 1000;
        const D = 50;
        const d = 5;
        // C = 10
        const K = wahlFactor(10);
        const expected = K * (8 * P * D) / (Math.PI * Math.pow(d, 3));

        expect(correctedShearStress(P, D, d)).toBeCloseTo(expected, 1);
    });

    it('calculates linear stiffness correctly', () => {
        // k = Gd^4 / 8D^3Na
        const G = 79000;
        const d = 4;
        const D = 40;
        const Na = 10;

        // k = 79000 * 256 / (8 * 64000 * 10) = 20224000 / 5120000 = 3.95
        expect(linearStiffness(G, d, D, Na)).toBeCloseTo(3.95, 2);
    });
});
