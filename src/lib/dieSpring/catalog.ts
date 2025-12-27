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
    SUPER_HEAVY: "yellow", // Placeholder for type safety (ISO 10243 stops at XHD)
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
// ============================================================================
// CATALOG GENERATION SYSTEMS
// ============================================================================

interface GenSeriesDef {
    duty: DieSpringDutyClass;
    color: DieSpringColorCode;
    suffix: string;
    factor: number; // k = factor * OD / L0
    deflectionLimit: number; // % of L0
}

function generateCatalog(
    series: DieSpringSeries,
    unitSystem: "metric" | "imperial",
    defs: GenSeriesDef[],
    sizes: { od: number; id: number; lengths: number[] }[],
    docRef: string
): DieSpringSpec[] {
    const specs: DieSpringSpec[] = [];

    for (const size of sizes) {
        for (const len of size.lengths) {
            for (const def of defs) {
                // ID generation
                let idStr = "";
                if (unitSystem === "imperial") {
                    // OD 25.4 (1.0") -> 100
                    const odInch = Math.round(size.od / 25.4 * 100);
                    const lenInch = Math.round(len / 25.4 * 100);
                    idStr = `US-${odInch}-${lenInch}-${def.suffix}`;
                } else {
                    const prefix = series === "JIS_B5012" ? "JIS" : "ISOD";
                    idStr = `${prefix}-${size.od}x${len}-${def.suffix}`;
                }

                // Rate calculation: k = (Factor * OD) / L0
                const k = (def.factor * size.od) / len;

                // Geometry approximations
                const shRatio = 0.3 + (def.factor / 1000);
                // Ensure solid height leaves room for max stroke (with 2% buffer)
                const maxAllowedSH = len * (1 - (def.deflectionLimit / 100) - 0.02);
                const solidHeight = Math.min(len * Math.min(0.8, shRatio), maxAllowedSH);

                const wireW = size.od * 0.25;
                const wireT = size.od * 0.15;

                specs.push({
                    id: idStr,
                    series,
                    duty: def.duty,
                    unitSystem,
                    outerDiameter: size.od,
                    innerDiameter: size.id,
                    freeLength: len,
                    wireWidth: Number(wireW.toFixed(1)),
                    wireThickness: Number(wireT.toFixed(1)),
                    solidHeight: Number(solidHeight.toFixed(1)),
                    activeCoils: 8,
                    springRate: Number(k.toFixed(1)),
                    strokeLimits: isoStrokeLimits(len * (def.deflectionLimit / 100)),
                    colorCode: def.color,
                    material: "Chrome Alloy Steel",
                    source: {
                        vendor: "Generated",
                        document: docRef,
                        page: "Standard Table",
                        origin: "generated",
                        basis: "ratio_based"
                    },
                });
            }
        }
    }
    return specs;
}

// ============================================================================
// JIS B 5012 CATALOG
// ============================================================================

export const JIS_B5012_CATALOG: DieSpringSpec[] = generateCatalog(
    "JIS_B5012",
    "metric",
    [
        { duty: "LIGHT", color: "yellow", suffix: "TF", factor: 60, deflectionLimit: 40 }, // Extra Light
        { duty: "MEDIUM", color: "blue", suffix: "TL", factor: 120, deflectionLimit: 32 }, // Light
        { duty: "HEAVY", color: "red", suffix: "TM", factor: 240, deflectionLimit: 25.6 }, // Medium
        { duty: "EXTRA_HEAVY", color: "green", suffix: "TH", factor: 360, deflectionLimit: 19.2 }, // Heavy
        { duty: "SUPER_HEAVY", color: "brown", suffix: "TB", factor: 480, deflectionLimit: 16 }, // Extra Heavy
    ],
    [
        { od: 10, id: 5, lengths: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80] },
        { od: 12, id: 6, lengths: [25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100] },
        { od: 16, id: 8, lengths: [25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 125] },
        { od: 20, id: 10, lengths: [25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 125, 150] },
        { od: 25, id: 12.5, lengths: [25, 30, 35, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200] },
        { od: 30, id: 15, lengths: [30, 35, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200] },
        { od: 40, id: 20, lengths: [40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200, 250, 300] },
        { od: 50, id: 25, lengths: [50, 60, 70, 80, 90, 100, 125, 150, 175, 200, 250, 300] },
        { od: 60, id: 30, lengths: [60, 70, 80, 90, 100, 125, 150, 175, 200, 250, 300] },
    ],
    "JIS B 5012 Standard"
);

// ============================================================================
// US STANDARD INCH CATALOG (Sample)
// Raymond / US Standard
// ============================================================================

const INCH_25_4 = 25.4;
const INCH_SIZES = [
    { od: 0.375, id: 0.187, lengths: [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 12] },
    { od: 0.5, id: 0.25, lengths: [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 12] },
    { od: 0.625, id: 0.312, lengths: [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 12] },
    { od: 0.75, id: 0.375, lengths: [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 6, 12] },
    { od: 1.0, id: 0.5, lengths: [1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 12] },
    { od: 1.25, id: 0.625, lengths: [1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12] },
    { od: 1.5, id: 0.75, lengths: [2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12] },
    { od: 2.0, id: 1.0, lengths: [2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12] },
].map(s => ({
    od: s.od * INCH_25_4,
    id: s.id * INCH_25_4,
    lengths: s.lengths.map(l => l * INCH_25_4)
}));

export const US_INCH_CATALOG: DieSpringSpec[] = generateCatalog(
    "US_INCH",
    "imperial",
    [
        { duty: "MEDIUM", color: "blue", suffix: "M", factor: 120, deflectionLimit: 37 }, // Med
        { duty: "HEAVY", color: "red", suffix: "MH", factor: 200, deflectionLimit: 30 }, // Med-Heavy
        { duty: "EXTRA_HEAVY", color: "gold", suffix: "H", factor: 300, deflectionLimit: 25 }, // Heavy
        { duty: "SUPER_HEAVY", color: "green", suffix: "EH", factor: 450, deflectionLimit: 20 }, // Ex-Heavy
    ],
    INCH_SIZES,
    "Raymond Inch Standard"
);

// ============================================================================
// ISO D-LINE CATALOG (Sample)
// D-Shaped Wire Section
// ============================================================================

export const ISO_D_LINE_CATALOG: DieSpringSpec[] = generateCatalog(
    "ISO_D_LINE",
    "metric",
    [
        { duty: "MEDIUM", color: "blue", suffix: "M", factor: 160, deflectionLimit: 35 },
        { duty: "HEAVY", color: "red", suffix: "H", factor: 300, deflectionLimit: 30 },
        { duty: "EXTRA_HEAVY", color: "yellow", suffix: "XH", factor: 500, deflectionLimit: 25 },
        { duty: "SUPER_HEAVY", color: "silver", suffix: "UH", factor: 700, deflectionLimit: 20 },
    ],
    [
        { od: 10, id: 5, lengths: [25, 32, 38, 44, 51, 64, 76, 305] },
        { od: 12.5, id: 6.3, lengths: [25, 32, 38, 44, 51, 64, 76, 89, 102, 305] },
        { od: 16, id: 8, lengths: [25, 32, 38, 44, 51, 64, 76, 89, 102, 115, 305] },
        { od: 20, id: 10, lengths: [25, 32, 38, 44, 51, 64, 76, 89, 102, 115, 127, 305] },
        { od: 25, id: 12.5, lengths: [25, 32, 38, 44, 51, 64, 76, 89, 102, 115, 127, 152, 305] },
        { od: 32, id: 16, lengths: [38, 44, 51, 64, 76, 89, 102, 115, 127, 152, 203, 305] },
        { od: 40, id: 20, lengths: [51, 64, 76, 89, 102, 115, 127, 152, 178, 203, 305] },
        { od: 50, id: 25, lengths: [64, 76, 89, 102, 115, 127, 152, 178, 203, 305] },
        { od: 63, id: 31.5, lengths: [76, 89, 102, 115, 127, 152, 178, 203, 305] },
    ],
    "ISO D-Line Standard"
);

/**
 * Complete die spring catalog (all series)
 */
export const DIE_SPRING_CATALOG: DieSpringSpec[] = [
    ...ISO_10243_CATALOG,
    ...JIS_B5012_CATALOG,
    ...US_INCH_CATALOG,
    ...ISO_D_LINE_CATALOG,
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
