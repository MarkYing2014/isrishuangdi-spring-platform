
import { describe, it, expect } from 'vitest';
import { calculateFit } from './fitCheck';

describe('Nested Spring Fit Check (SSOT)', () => {
    const outer = { meanDiameter: 30, wireDiameter: 4 }; // ID = 30 - 4 = 26mm
    const innerBase = { meanDiameter: 15, wireDiameter: 3 }; // OD = 15 + 3 = 18mm. Gap = (26-18)/2 = 4mm

    it('PASS: Clearance > Policy', () => {
        // Gap = 4mm > 0.25mm
        const res = calculateFit(outer, innerBase);
        expect(res.status).toBe('PASS');
        expect(res.clearance).toBe(4);
        expect(res.outerID).toBe(26);
        expect(res.innerOD).toBe(18);
    });

    it('WARN: 0 < Clearance < Policy', () => {
        // Need gap < 0.25. 
        // ID = 26. Make inner OD = 25.8. Gap = 0.1mm.
        // Inner: D+d = 25.8. Let d=3, D=22.8.
        const innerWarn = { meanDiameter: 22.8, wireDiameter: 3 };
        const res = calculateFit(outer, innerWarn);
        expect(res.status).toBe('WARN');
        expect(res.clearance).toBeCloseTo(0.1);
    });

    it('FAIL: Clearance == 0', () => {
        // ID = 26. Inner OD = 26.
        const innerFail = { meanDiameter: 23, wireDiameter: 3 };
        const res = calculateFit(outer, innerFail);
        expect(res.status).toBe('FAIL');
        expect(res.clearance).toBe(0);
    });

    it('FAIL: Clearance < 0 (Interference)', () => {
        // ID = 26. Inner OD = 28. Gap = -1.
        const innerCrash = { meanDiameter: 25, wireDiameter: 3 };
        const res = calculateFit(outer, innerCrash);
        expect(res.status).toBe('FAIL');
        expect(res.clearance).toBe(-1);
    });

    it('Respects Custom Policy', () => {
        // Gap = 0.1mm. Default policy (0.25) -> WARN.
        // Custom policy (0.05) -> PASS.
        const innerWarn = { meanDiameter: 22.8, wireDiameter: 3 }; // Gap 0.1
        const res = calculateFit(outer, innerWarn, 0.05);
        expect(res.status).toBe('PASS');
    });
});
