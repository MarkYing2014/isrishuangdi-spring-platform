
import { generateCadQueryPython } from '../cadquery';
import { buildExtensionSpringCenterlineMm } from '../extensionSpringCad';
import type { ExtensionDesignMeta } from '@/lib/stores/springSimulationStore';

describe('CadQuery Script Generator', () => {
    const mockDesign: ExtensionDesignMeta = {
        type: 'extension',
        wireDiameter: 2,
        outerDiameter: 22,
        activeCoils: 10,
        bodyLength: 22,
        freeLengthInsideHooks: 30,
        initialTension: 5,
        hookType: 'machine',
        springRate: 1,
        shearModulus: 79000,
        materialId: 'music_wire_a228'
    };

    test('generates valid python script structure', () => {
        const cl = buildExtensionSpringCenterlineMm(mockDesign, 0);
        const result = generateCadQueryPython(cl, mockDesign);

        expect(result.ok).toBe(true);
        expect(result.filename).toMatch(/\.py$/);
        expect(result.content).toContain('import cadquery as cq');
        expect(result.content).toContain('import json');
        expect(result.content).toContain('# Parameters:');
        expect(result.content).toContain('cq.Wire.makeSpline');
        expect(result.content).toContain('cq.exporters.export');
    });

    test('embeds correct metadata', () => {
        const cl = buildExtensionSpringCenterlineMm(mockDesign, 0);
        const result = generateCadQueryPython(cl, mockDesign);

        expect(result.content).toContain(`Wire Dia: 2`);
        expect(result.content).toContain(`Active Coils: 10`);
        expect(result.meta.partName).toBe('ExtensionSpring');
    });

    test('decimates body points in JSON payload', () => {
        // Generate high-res centerline
        const cl = buildExtensionSpringCenterlineMm(mockDesign, 0);
        const fullBodyCount = cl.body.length;

        // Generate script (which applies decimation)
        const result = generateCadQueryPython(cl, mockDesign);

        // Parse the embedded JSON from the script string
        // This is a bit hacky but effective for unit testing the output
        const jsonMatch = result.content.match(/data = json\.loads\('''([\s\S]*?)'''\)/);
        expect(jsonMatch).toBeTruthy();

        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            const scriptBodyCount = data.body.length;

            // Decimation factor is 4, so expect roughly 1/4 points
            expect(scriptBodyCount).toBeLessThan(fullBodyCount);
            expect(scriptBodyCount).toBeGreaterThan(fullBodyCount / 5); // Allow some margin
        }
    });
});
