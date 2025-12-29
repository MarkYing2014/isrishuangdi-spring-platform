
import { buildExtensionSpringCenterlineMm } from '../extensionSpringCad';
import type { ExtensionDesignMeta } from '@/lib/stores/springSimulationStore';

describe('Extension Spring CAD Export (Strict)', () => {
    const mockDesign: ExtensionDesignMeta = {
        type: 'extension',
        wireDiameter: 2,
        outerDiameter: 22, // Mean D = 20, Mean R = 10
        activeCoils: 10,
        bodyLength: 22,    // Close wound: (10+1)*2
        freeLengthInsideHooks: 30, // Irrelevant for body coil check
        initialTension: 5,
        hookType: 'machine',
        springRate: 1,
        shearModulus: 79000,
        materialId: 'music_wire_a228' // Added required field
    };

    test('generates correct MM dimensions', () => {
        const cl = buildExtensionSpringCenterlineMm(mockDesign, 0);

        // Mean Radius should be exactly (OD-d)/2 = 10
        expect(cl.stats.meanRadiusMm).toBe(10);

        // Extended length check
        // Solid body = activeCoils * d = 20
        expect(cl.stats.extendedLengthMm).toBe(20);

        // Z coordinate check for body
        const lastBodyPoint = cl.body[cl.body.length - 1];
        expect(lastBodyPoint.z).toBeCloseTo(20, 1);
    });

    test('body sampling complies with smoothness request', () => {
        const cl = buildExtensionSpringCenterlineMm(mockDesign, 5);

        // Requested: ~120 points per turn
        // 10 coils * 120 = 1200 points approx
        expect(cl.body.length).toBeGreaterThan(1000);
        expect(cl.stats.samplePerTurn).toBe(120);
    });

    test('handles extension correctly', () => {
        const extension = 10;
        const cl = buildExtensionSpringCenterlineMm(mockDesign, extension);

        // Extended length = solidBody + extension = 20 + 10 = 30
        expect(cl.stats.extendedLengthMm).toBe(30);

        const lastBodyPoint = cl.body[cl.body.length - 1];
        expect(lastBodyPoint.z).toBeCloseTo(30, 1);
    });

    test('generates hooks', () => {
        const cl = buildExtensionSpringCenterlineMm(mockDesign, 0);
        expect(cl.startHook.length).toBeGreaterThan(0);
        expect(cl.endHook.length).toBeGreaterThan(0);

        // Check connectivity: end of startHook ~ start of body
        const hookEnd = cl.startHook[cl.startHook.length - 1];
        const bodyStart = cl.body[0];

        // Should be very close (continuity)
        const dx = hookEnd.x - bodyStart.x;
        const dy = hookEnd.y - bodyStart.y;
        const dz = hookEnd.z - bodyStart.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        expect(dist).toBeLessThan(0.1);
    });
});
