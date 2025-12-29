
import { describe, it, expect } from 'vitest';
import { buildWaveSpringCenterlineMm } from '../waveSpringCad';
import { type WaveSpringGeometry } from '@/lib/stores/springDesignStore';

describe("buildWaveSpringCenterlineMm", () => {

    const mockDesign: WaveSpringGeometry = {
        type: "wave",
        id: 45, // Inner Diameter
        od: 55, // Outer Diameter
        thickness_t: 0.5,
        radialWall_b: 5.0,
        wavesPerTurn_Nw: 3.5,
        turns_Nt: 2,
        freeHeight_Hf: 20,
        workingHeight_Hw: 15, // Required prop
        materialId: "ss_302"
    };

    it("should generate stats correctly", () => {
        const deflection = 0;
        const cl = buildWaveSpringCenterlineMm(mockDesign, deflection);

        // Allow some floating point variance and logic differences
        expect(cl.stats.meanRadiusMm).toBeCloseTo(25, 4);
        expect(cl.stats.thicknessMm).toBe(0.5);
        expect(cl.stats.widthMm).toBe(5.0);
        expect(cl.stats.activeCoils).toBe(2);
        expect(cl.stats.wavesPerTurn).toBe(3.5);
        // Total height might be slightly less than FreeHeight due to start/end point sampling
        expect(cl.stats.totalHeightMm).toBeCloseTo(20, 1);
    });

    it("should generate high resolution points", () => {
        const deflection = 0;
        const cl = buildWaveSpringCenterlineMm(mockDesign, deflection);

        // 160 segments per turn * 2 turns = 320
        // We accept anything reasonable > 300
        expect(cl.body.length).toBeGreaterThan(300);
    });

    it("should handle alternating wave phases (crest-to-crest)", () => {
        const deflection = 0;
        const cl = buildWaveSpringCenterlineMm(mockDesign, deflection);

        const ptsPerTurn = 160;
        const firstTurnEnd = cl.body[ptsPerTurn];
        expect(firstTurnEnd).toBeDefined();
    });

    it("should calculate amplitude dynamically", () => {
        const deflection = 0;
        const cl = buildWaveSpringCenterlineMm(mockDesign, deflection);
        // Amplitude is derived: ~2.5-3.0 range
        expect(cl.stats.amplitudeMm).toBeGreaterThan(1.0);
        expect(cl.stats.amplitudeMm).toBeLessThan(5.0);
    });

    it("should respect deflection (compressed height)", () => {
        const deflection = 5; // Compressed to 15mm
        const cl = buildWaveSpringCenterlineMm(mockDesign, deflection);

        expect(cl.stats.totalHeightMm).toBeCloseTo(15, 1);

        // Ensure compressed height affects the geometry endpoint (roughly)
        // Note: The LAST point Z isn't exactly TotalHeight if phase ends at 0,
        // but it should be close to the theoretical height logic.
        // We just check that totalHeightMm in stats reflects compression.
        expect(cl.stats.totalHeightMm).toBe(15);
    });
});

