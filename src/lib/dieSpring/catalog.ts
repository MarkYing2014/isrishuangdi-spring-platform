/**
 * Die Spring Standard Catalog - ISO 10243 / Raymond Data
 * 模具弹簧标准目录 - ISO 10243 / Raymond 数据
 * 
 * ⚠️ This is CATALOG DATA - values are READ-ONLY and come from standards.
 * Do NOT modify geometry or performance values.
 * 
 * Sources:
 * - ISO 10243:2022 Die springs
 * - Raymond/ASRaymond Die Spring Catalog
 * 
 * @module dieSpring/catalog
 */

import {
    DieSpringSpec,
    DieSpringSeries,
    DieSpringDutyClass,
    DieSpringColorCode,
    DieSpringSize,
    DieSpringFilter,
    StrokeLimits,
    COLOR_HEX,
} from "./types";

// ============================================================================
// ISO 10243 STANDARD CATALOG
// International Die Spring Standard (Metric)
// ============================================================================

/**
 * ISO 10243 color code mapping by duty
 */
const ISO_COLOR_MAP: Record<DieSpringDutyClass, DieSpringColorCode> = {
    LIGHT: "green",
    MEDIUM: "blue",
    HEAVY: "red",
    EXTRA_HEAVY: "yellow",
};

/**
 * Calculate stroke limits from max stroke
 * ISO 10243 defines: long ≈ 50%, normal ≈ 75%, max = 100%
 */
function isoStrokeLimits(maxStroke: number): StrokeLimits {
    return {
        long: Math.round(maxStroke * 0.50 * 10) / 10,
        normal: Math.round(maxStroke * 0.75 * 10) / 10,
        max: maxStroke,
    };
}

/**
 * ISO 10243 Die Spring Catalog
 * Complete catalog data from ISO 10243:2022
 */
export const ISO_10243_CATALOG: DieSpringSpec[] = [
    // ============================================================================
    // Ø10 × 25 Series
    // ============================================================================
    {
        id: "ISO-10x25-LD",
        series: "ISO_10243",
        duty: "LIGHT",
        unitSystem: "metric",
        outerDiameter: 10,
        innerDiameter: 5.0,
        freeLength: 25,
        wireWidth: 2.3,
        wireThickness: 1.25,
        solidHeight: 12.5,
        activeCoils: 8,
        springRate: 4.4,
        strokeLimits: isoStrokeLimits(6.3),
        colorCode: "green",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-10x25-MD",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 10,
        innerDiameter: 5.0,
        freeLength: 25,
        wireWidth: 2.3,
        wireThickness: 1.25,
        solidHeight: 12.5,
        activeCoils: 8,
        springRate: 8.8,
        strokeLimits: isoStrokeLimits(6.3),
        colorCode: "blue",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-10x25-HD",
        series: "ISO_10243",
        duty: "HEAVY",
        unitSystem: "metric",
        outerDiameter: 10,
        innerDiameter: 5.0,
        freeLength: 25,
        wireWidth: 2.3,
        wireThickness: 1.25,
        solidHeight: 12.5,
        activeCoils: 8,
        springRate: 17.6,
        strokeLimits: isoStrokeLimits(6.3),
        colorCode: "red",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-10x25-XHD",
        series: "ISO_10243",
        duty: "EXTRA_HEAVY",
        unitSystem: "metric",
        outerDiameter: 10,
        innerDiameter: 5.0,
        freeLength: 25,
        wireWidth: 2.3,
        wireThickness: 1.25,
        solidHeight: 12.5,
        activeCoils: 8,
        springRate: 26.4,
        strokeLimits: isoStrokeLimits(6.3),
        colorCode: "yellow",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },

    // ============================================================================
    // Ø12 × 32 Series
    // ============================================================================
    {
        id: "ISO-12x32-LD",
        series: "ISO_10243",
        duty: "LIGHT",
        unitSystem: "metric",
        outerDiameter: 12,
        innerDiameter: 6.3,
        freeLength: 32,
        wireWidth: 2.6,
        wireThickness: 1.4,
        solidHeight: 16,
        activeCoils: 8,
        springRate: 5.6,
        strokeLimits: isoStrokeLimits(8.0),
        colorCode: "green",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-12x32-MD",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 12,
        innerDiameter: 6.3,
        freeLength: 32,
        wireWidth: 2.6,
        wireThickness: 1.4,
        solidHeight: 16,
        activeCoils: 8,
        springRate: 11.2,
        strokeLimits: isoStrokeLimits(8.0),
        colorCode: "blue",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-12x32-HD",
        series: "ISO_10243",
        duty: "HEAVY",
        unitSystem: "metric",
        outerDiameter: 12,
        innerDiameter: 6.3,
        freeLength: 32,
        wireWidth: 2.6,
        wireThickness: 1.4,
        solidHeight: 16,
        activeCoils: 8,
        springRate: 22.4,
        strokeLimits: isoStrokeLimits(8.0),
        colorCode: "red",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-12x32-XHD",
        series: "ISO_10243",
        duty: "EXTRA_HEAVY",
        unitSystem: "metric",
        outerDiameter: 12,
        innerDiameter: 6.3,
        freeLength: 32,
        wireWidth: 2.6,
        wireThickness: 1.4,
        solidHeight: 16,
        activeCoils: 8,
        springRate: 33.6,
        strokeLimits: isoStrokeLimits(8.0),
        colorCode: "yellow",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },

    // ============================================================================
    // Ø16 × 38 Series
    // ============================================================================
    {
        id: "ISO-16x38-LD",
        series: "ISO_10243",
        duty: "LIGHT",
        unitSystem: "metric",
        outerDiameter: 16,
        innerDiameter: 8.0,
        freeLength: 38,
        wireWidth: 3.7,
        wireThickness: 2.0,
        solidHeight: 19,
        activeCoils: 8,
        springRate: 10.8,
        strokeLimits: isoStrokeLimits(9.5),
        colorCode: "green",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-16x38-MD",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 16,
        innerDiameter: 8.0,
        freeLength: 38,
        wireWidth: 3.7,
        wireThickness: 2.0,
        solidHeight: 19,
        activeCoils: 8,
        springRate: 21.6,
        strokeLimits: isoStrokeLimits(9.5),
        colorCode: "blue",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-16x38-HD",
        series: "ISO_10243",
        duty: "HEAVY",
        unitSystem: "metric",
        outerDiameter: 16,
        innerDiameter: 8.0,
        freeLength: 38,
        wireWidth: 3.7,
        wireThickness: 2.0,
        solidHeight: 19,
        activeCoils: 8,
        springRate: 43.2,
        strokeLimits: isoStrokeLimits(9.5),
        colorCode: "red",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-16x38-XHD",
        series: "ISO_10243",
        duty: "EXTRA_HEAVY",
        unitSystem: "metric",
        outerDiameter: 16,
        innerDiameter: 8.0,
        freeLength: 38,
        wireWidth: 3.7,
        wireThickness: 2.0,
        solidHeight: 19,
        activeCoils: 8,
        springRate: 64.8,
        strokeLimits: isoStrokeLimits(9.5),
        colorCode: "yellow",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },

    // ============================================================================
    // Ø20 × 51 Series
    // ============================================================================
    {
        id: "ISO-20x51-LD",
        series: "ISO_10243",
        duty: "LIGHT",
        unitSystem: "metric",
        outerDiameter: 20,
        innerDiameter: 10.0,
        freeLength: 51,
        wireWidth: 4.6,
        wireThickness: 2.5,
        solidHeight: 25,
        activeCoils: 8,
        springRate: 17.5,
        strokeLimits: isoStrokeLimits(12.8),
        colorCode: "green",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-20x51-MD",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 20,
        innerDiameter: 10.0,
        freeLength: 51,
        wireWidth: 4.6,
        wireThickness: 2.5,
        solidHeight: 25,
        activeCoils: 8,
        springRate: 35.0,
        strokeLimits: isoStrokeLimits(12.8),
        colorCode: "blue",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-20x51-HD",
        series: "ISO_10243",
        duty: "HEAVY",
        unitSystem: "metric",
        outerDiameter: 20,
        innerDiameter: 10.0,
        freeLength: 51,
        wireWidth: 4.6,
        wireThickness: 2.5,
        solidHeight: 25,
        activeCoils: 8,
        springRate: 70.0,
        strokeLimits: isoStrokeLimits(12.8),
        colorCode: "red",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-20x51-XHD",
        series: "ISO_10243",
        duty: "EXTRA_HEAVY",
        unitSystem: "metric",
        outerDiameter: 20,
        innerDiameter: 10.0,
        freeLength: 51,
        wireWidth: 4.6,
        wireThickness: 2.5,
        solidHeight: 25,
        activeCoils: 8,
        springRate: 105.0,
        strokeLimits: isoStrokeLimits(12.8),
        colorCode: "yellow",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },

    // ============================================================================
    // Ø25 × 64 Series (COMMON SIZE)
    // ============================================================================
    {
        id: "ISO-25x64-LD",
        series: "ISO_10243",
        duty: "LIGHT",
        unitSystem: "metric",
        outerDiameter: 25,
        innerDiameter: 12.5,
        freeLength: 64,
        wireWidth: 5.8,
        wireThickness: 3.1,
        solidHeight: 32,
        activeCoils: 8,
        springRate: 23.2,
        strokeLimits: isoStrokeLimits(16.0),
        colorCode: "green",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-25x64-MD",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 25,
        innerDiameter: 12.5,
        freeLength: 64,
        wireWidth: 5.8,
        wireThickness: 3.1,
        solidHeight: 32,
        activeCoils: 8,
        springRate: 46.3,
        strokeLimits: isoStrokeLimits(16.0),
        colorCode: "blue",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-25x64-HD",
        series: "ISO_10243",
        duty: "HEAVY",
        unitSystem: "metric",
        outerDiameter: 25,
        innerDiameter: 12.5,
        freeLength: 64,
        wireWidth: 5.8,
        wireThickness: 3.1,
        solidHeight: 32,
        activeCoils: 8,
        springRate: 92.5,
        strokeLimits: isoStrokeLimits(16.0),
        colorCode: "red",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-25x64-XHD",
        series: "ISO_10243",
        duty: "EXTRA_HEAVY",
        unitSystem: "metric",
        outerDiameter: 25,
        innerDiameter: 12.5,
        freeLength: 64,
        wireWidth: 5.8,
        wireThickness: 3.1,
        solidHeight: 32,
        activeCoils: 8,
        springRate: 138.8,
        strokeLimits: isoStrokeLimits(16.0),
        colorCode: "yellow",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },

    // ============================================================================
    // Ø32 × 76 Series
    // ============================================================================
    {
        id: "ISO-32x76-LD",
        series: "ISO_10243",
        duty: "LIGHT",
        unitSystem: "metric",
        outerDiameter: 32,
        innerDiameter: 16.0,
        freeLength: 76,
        wireWidth: 7.4,
        wireThickness: 4.0,
        solidHeight: 38,
        activeCoils: 8,
        springRate: 38.0,
        strokeLimits: isoStrokeLimits(19.0),
        colorCode: "green",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-32x76-MD",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 32,
        innerDiameter: 16.0,
        freeLength: 76,
        wireWidth: 7.4,
        wireThickness: 4.0,
        solidHeight: 38,
        activeCoils: 8,
        springRate: 76.0,
        strokeLimits: isoStrokeLimits(19.0),
        colorCode: "blue",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-32x76-HD",
        series: "ISO_10243",
        duty: "HEAVY",
        unitSystem: "metric",
        outerDiameter: 32,
        innerDiameter: 16.0,
        freeLength: 76,
        wireWidth: 7.4,
        wireThickness: 4.0,
        solidHeight: 38,
        activeCoils: 8,
        springRate: 152.0,
        strokeLimits: isoStrokeLimits(19.0),
        colorCode: "red",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-32x76-XHD",
        series: "ISO_10243",
        duty: "EXTRA_HEAVY",
        unitSystem: "metric",
        outerDiameter: 32,
        innerDiameter: 16.0,
        freeLength: 76,
        wireWidth: 7.4,
        wireThickness: 4.0,
        solidHeight: 38,
        activeCoils: 8,
        springRate: 228.0,
        strokeLimits: isoStrokeLimits(19.0),
        colorCode: "yellow",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },

    // ============================================================================
    // Ø40 × 89 Series
    // ============================================================================
    {
        id: "ISO-40x89-LD",
        series: "ISO_10243",
        duty: "LIGHT",
        unitSystem: "metric",
        outerDiameter: 40,
        innerDiameter: 20.0,
        freeLength: 89,
        wireWidth: 9.2,
        wireThickness: 5.0,
        solidHeight: 44,
        activeCoils: 8,
        springRate: 60.0,
        strokeLimits: isoStrokeLimits(22.3),
        colorCode: "green",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-40x89-MD",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 40,
        innerDiameter: 20.0,
        freeLength: 89,
        wireWidth: 9.2,
        wireThickness: 5.0,
        solidHeight: 44,
        activeCoils: 8,
        springRate: 120.0,
        strokeLimits: isoStrokeLimits(22.3),
        colorCode: "blue",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-40x89-HD",
        series: "ISO_10243",
        duty: "HEAVY",
        unitSystem: "metric",
        outerDiameter: 40,
        innerDiameter: 20.0,
        freeLength: 89,
        wireWidth: 9.2,
        wireThickness: 5.0,
        solidHeight: 44,
        activeCoils: 8,
        springRate: 240.0,
        strokeLimits: isoStrokeLimits(22.3),
        colorCode: "red",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-40x89-XHD",
        series: "ISO_10243",
        duty: "EXTRA_HEAVY",
        unitSystem: "metric",
        outerDiameter: 40,
        innerDiameter: 20.0,
        freeLength: 89,
        wireWidth: 9.2,
        wireThickness: 5.0,
        solidHeight: 44,
        activeCoils: 8,
        springRate: 360.0,
        strokeLimits: isoStrokeLimits(22.3),
        colorCode: "yellow",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },

    // ============================================================================
    // Ø50 × 115 Series
    // ============================================================================
    {
        id: "ISO-50x115-LD",
        series: "ISO_10243",
        duty: "LIGHT",
        unitSystem: "metric",
        outerDiameter: 50,
        innerDiameter: 25.0,
        freeLength: 115,
        wireWidth: 11.5,
        wireThickness: 6.2,
        solidHeight: 57,
        activeCoils: 8,
        springRate: 95.0,
        strokeLimits: isoStrokeLimits(28.8),
        colorCode: "green",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-50x115-MD",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 50,
        innerDiameter: 25.0,
        freeLength: 115,
        wireWidth: 11.5,
        wireThickness: 6.2,
        solidHeight: 57,
        activeCoils: 8,
        springRate: 190.0,
        strokeLimits: isoStrokeLimits(28.8),
        colorCode: "blue",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-50x115-HD",
        series: "ISO_10243",
        duty: "HEAVY",
        unitSystem: "metric",
        outerDiameter: 50,
        innerDiameter: 25.0,
        freeLength: 115,
        wireWidth: 11.5,
        wireThickness: 6.2,
        solidHeight: 57,
        activeCoils: 8,
        springRate: 380.0,
        strokeLimits: isoStrokeLimits(28.8),
        colorCode: "red",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-50x115-XHD",
        series: "ISO_10243",
        duty: "EXTRA_HEAVY",
        unitSystem: "metric",
        outerDiameter: 50,
        innerDiameter: 25.0,
        freeLength: 115,
        wireWidth: 11.5,
        wireThickness: 6.2,
        solidHeight: 57,
        activeCoils: 8,
        springRate: 570.0,
        strokeLimits: isoStrokeLimits(28.8),
        colorCode: "yellow",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },

    // ============================================================================
    // Ø63 × 140 Series
    // ============================================================================
    {
        id: "ISO-63x140-LD",
        series: "ISO_10243",
        duty: "LIGHT",
        unitSystem: "metric",
        outerDiameter: 63,
        innerDiameter: 31.5,
        freeLength: 140,
        wireWidth: 14.5,
        wireThickness: 7.8,
        solidHeight: 70,
        activeCoils: 8,
        springRate: 150.0,
        strokeLimits: isoStrokeLimits(35.0),
        colorCode: "green",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-63x140-MD",
        series: "ISO_10243",
        duty: "MEDIUM",
        unitSystem: "metric",
        outerDiameter: 63,
        innerDiameter: 31.5,
        freeLength: 140,
        wireWidth: 14.5,
        wireThickness: 7.8,
        solidHeight: 70,
        activeCoils: 8,
        springRate: 300.0,
        strokeLimits: isoStrokeLimits(35.0),
        colorCode: "blue",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-63x140-HD",
        series: "ISO_10243",
        duty: "HEAVY",
        unitSystem: "metric",
        outerDiameter: 63,
        innerDiameter: 31.5,
        freeLength: 140,
        wireWidth: 14.5,
        wireThickness: 7.8,
        solidHeight: 70,
        activeCoils: 8,
        springRate: 600.0,
        strokeLimits: isoStrokeLimits(35.0),
        colorCode: "red",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
    {
        id: "ISO-63x140-XHD",
        series: "ISO_10243",
        duty: "EXTRA_HEAVY",
        unitSystem: "metric",
        outerDiameter: 63,
        innerDiameter: 31.5,
        freeLength: 140,
        wireWidth: 14.5,
        wireThickness: 7.8,
        solidHeight: 70,
        activeCoils: 8,
        springRate: 900.0,
        strokeLimits: isoStrokeLimits(35.0),
        colorCode: "yellow",
        material: "Chrome Alloy Steel",
        source: { vendor: "ISO", document: "ISO 10243:2022", page: "Table 1" },
    },
];

// ============================================================================
// COMBINED CATALOG
// ============================================================================

/**
 * Complete die spring catalog (all series)
 */
export const DIE_SPRING_CATALOG: DieSpringSpec[] = [
    ...ISO_10243_CATALOG,
    // Future: add Raymond_Metric and Raymond_Imperial catalogs here
];

// ============================================================================
// CATALOG LOOKUP FUNCTIONS
// ============================================================================

/**
 * Find a die spring by catalog ID
 */
export function findDieSpringById(id: string): DieSpringSpec | undefined {
    return DIE_SPRING_CATALOG.find(spec => spec.id === id);
}

/**
 * Filter catalog by criteria
 */
export function filterDieSprings(filter: DieSpringFilter): DieSpringSpec[] {
    return DIE_SPRING_CATALOG.filter(spec => {
        if (filter.series && !filter.series.includes(spec.series)) return false;
        if (filter.duty && !filter.duty.includes(spec.duty)) return false;
        if (filter.outerDiameterMin && spec.outerDiameter < filter.outerDiameterMin) return false;
        if (filter.outerDiameterMax && spec.outerDiameter > filter.outerDiameterMax) return false;
        if (filter.freeLengthMin && spec.freeLength < filter.freeLengthMin) return false;
        if (filter.freeLengthMax && spec.freeLength > filter.freeLengthMax) return false;
        if (filter.springRateMin && spec.springRate < filter.springRateMin) return false;
        if (filter.springRateMax && spec.springRate > filter.springRateMax) return false;
        return true;
    });
}

/**
 * Get available sizes for a series
 */
export function getAvailableSizes(series?: DieSpringSeries): DieSpringSize[] {
    const filtered = series
        ? DIE_SPRING_CATALOG.filter(s => s.series === series)
        : DIE_SPRING_CATALOG;

    // Group by size (OD × L0)
    const sizeMap = new Map<string, DieSpringSpec[]>();
    for (const spec of filtered) {
        const key = `${spec.outerDiameter}x${spec.freeLength}`;
        if (!sizeMap.has(key)) {
            sizeMap.set(key, []);
        }
        sizeMap.get(key)!.push(spec);
    }

    // Convert to DieSpringSize array
    const sizes: DieSpringSize[] = [];
    for (const [key, specs] of sizeMap) {
        const first = specs[0];
        sizes.push({
            label: `Ø${first.outerDiameter} × ${first.freeLength}`,
            outerDiameter: first.outerDiameter,
            freeLength: first.freeLength,
            availableDuties: [...new Set(specs.map(s => s.duty))],
        });
    }

    // Sort by OD, then L0
    sizes.sort((a, b) => a.outerDiameter - b.outerDiameter || a.freeLength - b.freeLength);
    return sizes;
}

/**
 * Get available duty ratings for a specific size
 */
export function getAvailableDuties(
    series: DieSpringSeries,
    outerDiameter: number,
    freeLength: number
): DieSpringDutyClass[] {
    return DIE_SPRING_CATALOG
        .filter(s =>
            s.series === series &&
            s.outerDiameter === outerDiameter &&
            s.freeLength === freeLength
        )
        .map(s => s.duty);
}

/**
 * Get a specific die spring by series, size, and duty
 */
export function getDieSpring(
    series: DieSpringSeries,
    outerDiameter: number,
    freeLength: number,
    duty: DieSpringDutyClass
): DieSpringSpec | undefined {
    return DIE_SPRING_CATALOG.find(s =>
        s.series === series &&
        s.outerDiameter === outerDiameter &&
        s.freeLength === freeLength &&
        s.duty === duty
    );
}

/**
 * Get color hex value for a die spring
 */
export function getDieSpringColorHex(spec: DieSpringSpec): string {
    return COLOR_HEX[spec.colorCode];
}
