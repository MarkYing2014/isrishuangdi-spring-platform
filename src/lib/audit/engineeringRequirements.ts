/**
 * Engineering Requirements Schema
 * 
 * Purpose: Deliverability constraints for OEM audit - NOT for calculation.
 * 
 * These fields are STRICTLY PROHIBITED from being used in:
 * - Spring calculation engines
 * - Stress/load formulas
 * - Solver optimization variables
 * 
 * They are ONLY used by AuditEngine.evaluateDeliverability() to determine
 * if a design can be manufactured, assembled, and delivered reliably.
 */

// =============================================================================
// 1. 尺寸公差 / Dimensional Tolerances
// =============================================================================

/**
 * Tolerance grades (Manufacturing language, not calculation language)
 * - STANDARD: Factory default (e.g., ±0.03mm wire dia)
 * - PRECISION: Controlled tolerance (e.g., ±0.015mm)
 * - ULTRA_PRECISION: Critical application (e.g., ±0.005mm)
 */
export type ToleranceGrade = "STANDARD" | "PRECISION" | "ULTRA_PRECISION";

export interface DimensionalTolerances {
    /** Wire diameter tolerance grade */
    wireDiameter?: ToleranceGrade;
    /** Coil/mean diameter tolerance grade */
    coilDiameter?: ToleranceGrade;
    /** Free length tolerance grade */
    freeLength?: ToleranceGrade;
    /** Load tolerance at working height */
    loadTolerance?: "±10%" | "±5%" | "±3%" | "±1.5%";
}

// =============================================================================
// 2. 装配配合 / Assembly Fit
// =============================================================================

export type GuideType = "NONE" | "ROD" | "BORE";
export type ClearanceClass = "LOOSE" | "STANDARD" | "TIGHT"; // >1mm / 0.3-1mm / <0.3mm
export type SeatCondition = "FLAT" | "TAPERED" | "FLOATING" | "POCKET";

export interface AssemblyFit {
    /** Guide type for spring installation */
    guideType?: GuideType;
    /** Guide rod/bore diameter (mm) - for clearance check only */
    guideDiameter?: number;
    /** Clearance class requirement */
    clearanceClass?: ClearanceClass;
    /** End seat condition */
    seatCondition?: SeatCondition;
    /** Squareness requirement */
    squareness?: "STANDARD" | "PRECISION"; // ≤3° / ≤1.5°
}

// =============================================================================
// 3. 表面处理 / Surface Treatment
// =============================================================================

export type SurfaceFinish =
    | "NONE"
    | "SHOT_PEEN"
    | "PHOSPHATE"
    | "ZINC"
    | "ZINC_NICKEL"
    | "ELECTROPOLISH"
    | "PASSIVATE"
    | "POWDER_COAT"
    | "CUSTOM";

export type CorrosionClass =
    | "INDOOR"
    | "OUTDOOR"
    | "SALT_SPRAY_48H"
    | "SALT_SPRAY_96H"
    | "SALT_SPRAY_240H"
    | "SALT_SPRAY_480H";

export interface SurfaceTreatment {
    /** Surface finish requirement */
    finish?: SurfaceFinish;
    /** Corrosion resistance class */
    corrosionClass?: CorrosionClass;
    /** Custom coating specification */
    customCoating?: string;
    /** Shot peening coverage requirement */
    shotPeenCoverage?: "100%" | "200%";
}

// =============================================================================
// 4. 环境要求 / Environment Requirements
// =============================================================================

export type TemperatureRange =
    | "STANDARD"    // -20°C to +80°C
    | "EXTENDED"    // -40°C to +120°C  
    | "HIGH_TEMP"   // -20°C to +200°C
    | "EXTREME";    // -60°C to +300°C

export type HumidityClass = "DRY" | "HUMID" | "CONDENSING" | "SUBMERGED";

export type ChemicalExposure =
    | "NONE"
    | "OIL"
    | "COOLANT"
    | "BRAKE_FLUID"
    | "FUEL"
    | "CORROSIVE";

export interface EnvironmentRequirements {
    /** Operating temperature range */
    operatingTempRange?: TemperatureRange;
    /** Humidity condition */
    humidity?: HumidityClass;
    /** Chemical exposure type */
    chemicalExposure?: ChemicalExposure;
    /** Vacuum or special atmosphere */
    specialAtmosphere?: "NONE" | "VACUUM" | "INERT_GAS";
}

// =============================================================================
// 5. 寿命要求 / Lifespan Requirements
// =============================================================================

export type CycleClass =
    | "STATIC"      // <1K cycles
    | "LOW_CYCLE"   // 1K - 100K cycles
    | "HIGH_CYCLE"  // 100K - 1M cycles
    | "INFINITE";   // >1M cycles (fatigue-rated)

export interface LifespanRequirements {
    /** Cycle life class */
    cycleClass?: CycleClass;
    /** Target cycle count (if specified) */
    targetCycles?: number;
    /** Stress amplitude ratio (τa/τm) for fatigue check */
    stressAmplitudeRatio?: number;
    /** Relaxation requirement */
    relaxationLimit?: "STANDARD" | "LOW_RELAX"; // ≤5% / ≤2%
}

// =============================================================================
// Combined Engineering Requirements
// =============================================================================

export interface EngineeringRequirements {
    /** Dimensional tolerance requirements */
    tolerances?: DimensionalTolerances;
    /** Assembly fit requirements */
    assembly?: AssemblyFit;
    /** Surface treatment requirements */
    surface?: SurfaceTreatment;
    /** Environmental requirements */
    environment?: EnvironmentRequirements;
    /** Lifespan requirements */
    lifespan?: LifespanRequirements;
}

// =============================================================================
// Default Values (Standard Manufacturing)
// =============================================================================

export const DEFAULT_ENGINEERING_REQUIREMENTS: EngineeringRequirements = {
    tolerances: {
        wireDiameter: "STANDARD",
        coilDiameter: "STANDARD",
        freeLength: "STANDARD",
        loadTolerance: "±5%",
    },
    assembly: {
        guideType: "NONE",
        clearanceClass: "STANDARD",
        seatCondition: "FLAT",
        squareness: "STANDARD",
    },
    surface: {
        finish: "NONE",
        corrosionClass: "INDOOR",
    },
    environment: {
        operatingTempRange: "STANDARD",
        humidity: "DRY",
        chemicalExposure: "NONE",
        specialAtmosphere: "NONE",
    },
    lifespan: {
        cycleClass: "STATIC",
        relaxationLimit: "STANDARD",
    },
};

// =============================================================================
// UI Display Helpers (Bilingual Labels)
// =============================================================================

export const TOLERANCE_GRADE_LABELS: Record<ToleranceGrade, { en: string; zh: string }> = {
    STANDARD: { en: "Standard", zh: "常规" },
    PRECISION: { en: "Precision", zh: "精密" },
    ULTRA_PRECISION: { en: "Ultra Precision", zh: "超精密" },
};

export const CLEARANCE_CLASS_LABELS: Record<ClearanceClass, { en: string; zh: string; range: string }> = {
    LOOSE: { en: "Loose", zh: "宽松", range: ">1mm" },
    STANDARD: { en: "Standard", zh: "标准", range: "0.3-1mm" },
    TIGHT: { en: "Tight", zh: "紧配", range: "<0.3mm" },
};

export const SURFACE_FINISH_LABELS: Record<SurfaceFinish, { en: string; zh: string }> = {
    NONE: { en: "None (Raw)", zh: "无处理 (原色)" },
    SHOT_PEEN: { en: "Shot Peening", zh: "喷丸强化" },
    PHOSPHATE: { en: "Phosphate", zh: "磷化" },
    ZINC: { en: "Zinc Plating", zh: "镀锌" },
    ZINC_NICKEL: { en: "Zinc-Nickel", zh: "锌镍合金" },
    ELECTROPOLISH: { en: "Electropolish", zh: "电解抛光" },
    PASSIVATE: { en: "Passivation", zh: "钝化" },
    POWDER_COAT: { en: "Powder Coat", zh: "粉末涂装" },
    CUSTOM: { en: "Custom", zh: "定制" },
};

export const CORROSION_CLASS_LABELS: Record<CorrosionClass, { en: string; zh: string; hours?: number }> = {
    INDOOR: { en: "Indoor Only", zh: "室内使用" },
    OUTDOOR: { en: "Outdoor", zh: "户外使用" },
    SALT_SPRAY_48H: { en: "Salt Spray 48H", zh: "盐雾48小时", hours: 48 },
    SALT_SPRAY_96H: { en: "Salt Spray 96H", zh: "盐雾96小时", hours: 96 },
    SALT_SPRAY_240H: { en: "Salt Spray 240H", zh: "盐雾240小时", hours: 240 },
    SALT_SPRAY_480H: { en: "Salt Spray 480H", zh: "盐雾480小时", hours: 480 },
};

export const CYCLE_CLASS_LABELS: Record<CycleClass, { en: string; zh: string; range: string }> = {
    STATIC: { en: "Static", zh: "静态", range: "<1K" },
    LOW_CYCLE: { en: "Low Cycle", zh: "低循环", range: "1K-100K" },
    HIGH_CYCLE: { en: "High Cycle", zh: "高循环", range: "100K-1M" },
    INFINITE: { en: "Infinite Life", zh: "无限寿命", range: ">1M" },
};

export const TEMPERATURE_RANGE_LABELS: Record<TemperatureRange, { en: string; zh: string; range: string }> = {
    STANDARD: { en: "Standard", zh: "常规", range: "-20°C to +80°C" },
    EXTENDED: { en: "Extended", zh: "扩展", range: "-40°C to +120°C" },
    HIGH_TEMP: { en: "High Temperature", zh: "高温", range: "-20°C to +200°C" },
    EXTREME: { en: "Extreme", zh: "极限", range: "-60°C to +300°C" },
};
