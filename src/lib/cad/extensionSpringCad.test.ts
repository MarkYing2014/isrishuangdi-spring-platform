
import { buildExtensionSpringCenterlineMm, generateCadQueryPython } from './extensionSpringCad';
import { ExtensionSpringGeometry } from '@/lib/engine/types';

describe('Extension Spring CAD Export', () => {
    const mockGeometry: ExtensionSpringGeometry = {
        type: 'extension',
        wireDiameter: 2,
        activeCoils: 10,
        meanDiameter: 20, // OD = 22
        bodyLength: 22,   // Close wound: (10+1)*2
        initialTension: 5,
        hookType: 'machine',
        materialId: 'music_wire_a228',
    };

    test('calculates correct dimensions in mm', () => {
        const centerline = buildExtensionSpringCenterlineMm(mockGeometry);

        expect(centerline.meta.meanRadiusMm).toBe(10);
        expect(centerline.meta.wireDiameterMm).toBe(2);
        expect(centerline.meta.activeCoils).toBe(10);
    });

    test('generates body helix with correct point count', () => {
        const centerline = buildExtensionSpringCenterlineMm(mockGeometry);

        // We expect 72 points per turn * 10 turns + 1
        const expectedPoints = 10 * 72 + 1;
        expect(centerline.body.length).toBe(expectedPoints);

        // Check first and last points relative to Z
        // Start at z=0 (or close, depending on phase)
        // End at z=bodyLength (approx)
        // In our implementation: z = ratio * extendedBodyLength

        const first = centerline.body[0];
        const last = centerline.body[centerline.body.length - 1];

        expect(first.z).toBeCloseTo(0);
        expect(last.z).toBeCloseTo(mockGeometry.bodyLength);
    });

    test('generates hooks for machine type', () => {
        const centerline = buildExtensionSpringCenterlineMm(mockGeometry);

        expect(centerline.startHook).toBeDefined();
        expect(centerline.endHook).toBeDefined();
        expect(centerline.startHook!.length).toBeGreaterThan(10);
    });

    test('python script contains critical values', () => {
        const centerline = buildExtensionSpringCenterlineMm(mockGeometry);
        const script = generateCadQueryPython(centerline);

        expect(script).toContain('import cadquery as cq');
        expect(script).toContain('"meanRadiusMm": 10');
        expect(script).toContain('"activeCoils": 10');
    });

    test('handles doubleLoop type', () => {
        const geomDouble: ExtensionSpringGeometry = {
            ...mockGeometry,
            hookType: 'doubleLoop'
        };

        const centerline = buildExtensionSpringCenterlineMm(geomDouble);
        expect(centerline.meta.hookType).toBe('doubleLoop');
        expect(centerline.startHook).toBeDefined();
    });
});
