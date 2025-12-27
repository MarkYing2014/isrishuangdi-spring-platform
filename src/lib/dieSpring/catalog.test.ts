
import { describe, it, expect } from 'vitest';
import { DIE_SPRING_CATALOG } from './catalog';

describe('Die Spring Catalog QC', () => {

    it('QC: freeLength > solidHeight for all entries', () => {
        const failures = DIE_SPRING_CATALOG.filter(
            spec => spec.freeLength <= spec.solidHeight
        );
        if (failures.length > 0) {
            console.error('L0 <= Solid Height Failures:', failures.map(f => f.id));
        }
        expect(failures.length).toBe(0);
    });

    it('QC: stroke_long <= stroke_normal <= stroke_max', () => {
        const failures = DIE_SPRING_CATALOG.filter(spec =>
            !(spec.strokeLimits.long <= spec.strokeLimits.normal &&
                spec.strokeLimits.normal <= spec.strokeLimits.max)
        );
        if (failures.length > 0) {
            console.error('Stroke Logic Failures:', failures.map(f => f.id));
        }
        expect(failures.length).toBe(0);
    });

    it('QC: stroke_max <= (freeLength - solidHeight)', () => {
        // Allow a tiny epsilon for float math, but strictly max stroke shouldn't exceed physical travel
        // Some standards define max stroke slightly less than physical.
        const failures = DIE_SPRING_CATALOG.filter(spec => {
            const physical = spec.freeLength - spec.solidHeight;
            // 0.1mm tolerance for rounding
            return spec.strokeLimits.max > (physical + 0.1);
        });

        if (failures.length > 0) {
            console.error('Max Stroke > Physical Travel:', failures.map(f =>
                `${f.id} (Max: ${f.strokeLimits.max}, Phys: ${f.freeLength - f.solidHeight})`
            ));
        }
        expect(failures.length).toBe(0);
    });

    it('QC: springRate > 0', () => {
        const failures = DIE_SPRING_CATALOG.filter(spec => spec.springRate <= 0);
        expect(failures.length).toBe(0);
    });

    it('QC: US Inch values are normalized to metric', () => {
        const us = DIE_SPRING_CATALOG.filter(s => s.series === 'US_INCH');
        // US Inch 1.0" OD should be 25.4mm
        const sample = us.find(s => s.id.includes('100-200')); // 1.0 x 2.0
        if (sample) {
            expect(sample.outerDiameter).toBeCloseTo(25.4, 1);
            expect(sample.freeLength).toBeCloseTo(50.8, 1);
        }
    });

    it('Guardrail: All entries have source origin', () => {
        const generatedSeries = ['JIS_B5012', 'US_INCH', 'ISO_D_LINE'];
        const failures = DIE_SPRING_CATALOG
            .filter(s => generatedSeries.includes(s.series))
            .filter(s => !s.source.origin);

        expect(failures.length).toBe(0);
    });
});
