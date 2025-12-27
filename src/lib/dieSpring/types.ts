/**
 * Die Spring Standard Library - Type Definitions
 * 模具弹簧标准库 - 类型定义
 * 
 * ⚠️ Die springs are catalog-rated components, NOT parametric springs.
 * All geometry and performance values come from standards (ISO 10243 / Raymond).
 * 
 * @module dieSpring/types
 */

// ============================================================================
// UNIT SYSTEM
// ============================================================================

/**
 * Unit system for catalog data ingestion.
 * All values are stored internally in metric (mm / N).
 * Imperial catalogs are converted on ingestion.
 */
export type UnitSystem = "metric" | "imperial";

// ============================================================================
// CATALOG SERIES
// ============================================================================

/**
 * Die spring catalog series / standard.
 * 
 * - ISO_10243: International standard (metric, most common)
 * - Raymond_Metric: Raymond/Associated Spring metric catalog
 * - Raymond_Imperial: Raymond/Associated Spring inch catalog
 */
export type DieSpringSeries =
  | "ISO_10243"
  | "Raymond_Metric"
  | "Raymond_Imperial";

/**
 * Display information for each series
 */
export const SERIES_INFO: Record<DieSpringSeries, {
  name: { en: string; zh: string };
  description: { en: string; zh: string };
  unitSystem: UnitSystem;
}> = {
  ISO_10243: {
    name: { en: "ISO 10243", zh: "ISO 10243" },
    description: {
      en: "International standard for die springs",
      zh: "模具弹簧国际标准"
    },
    unitSystem: "metric"
  },
  Raymond_Metric: {
    name: { en: "Raymond Metric", zh: "Raymond 公制" },
    description: {
      en: "Raymond/ASRaymond metric catalog",
      zh: "Raymond/ASRaymond 公制目录"
    },
    unitSystem: "metric"
  },
  Raymond_Imperial: {
    name: { en: "Raymond Imperial", zh: "Raymond 英制" },
    description: {
      en: "Raymond/ASRaymond inch catalog",
      zh: "Raymond/ASRaymond 英制目录"
    },
    unitSystem: "imperial"
  }
};

// ============================================================================
// DUTY RATING (LOAD CLASS)
// ============================================================================

/**
 * Die spring duty rating / load class.
 * Color coding is series-specific, NOT hard-coded to duty.
 * 
 * Load capacity order: LIGHT < MEDIUM < HEAVY < EXTRA_HEAVY
 * 
 * Note: This is the NEW catalog-based duty type.
 * Legacy code uses DieSpringDuty from riskModel.ts ("LD"|"MD"|"HD"|"XHD").
 */
export type DieSpringDutyClass =
  | "LIGHT"
  | "MEDIUM"
  | "HEAVY"
  | "EXTRA_HEAVY";

/**
 * Duty display information
 */
export const DUTY_CLASS_INFO: Record<DieSpringDutyClass, {
  name: { en: string; zh: string };
  abbreviation: string;
  loadFactor: number; // Relative load capacity (1.0 = medium baseline)
}> = {
  LIGHT: {
    name: { en: "Light Duty", zh: "轻载" },
    abbreviation: "LD",
    loadFactor: 0.6
  },
  MEDIUM: {
    name: { en: "Medium Duty", zh: "中载" },
    abbreviation: "MD",
    loadFactor: 1.0
  },
  HEAVY: {
    name: { en: "Heavy Duty", zh: "重载" },
    abbreviation: "HD",
    loadFactor: 1.4
  },
  EXTRA_HEAVY: {
    name: { en: "Extra Heavy Duty", zh: "超重载" },
    abbreviation: "XHD",
    loadFactor: 1.8
  }
};

// ============================================================================
// LIFE CLASS
// ============================================================================

/**
 * Die spring life class / fatigue target.
 * Determines allowable stroke as percentage of catalog maximum.
 * 
 * - LONG: Conservative, maximum fatigue life (typically 2M+ cycles)
 * - NORMAL: Standard catalog recommendation (typically 1M cycles)
 * - SHORT: Maximum stroke, reduced life (prototype/low-cycle use)
 */
export type DieSpringLifeClass =
  | "SHORT"
  | "NORMAL"
  | "LONG";

/**
 * Stroke limits for different life targets (all values in mm)
 */
export interface StrokeLimits {
  /** Conservative stroke for long fatigue life */
  long: number;
  /** Standard catalog recommended stroke */
  normal: number;
  /** Absolute maximum stroke (catalog limit) */
  max: number;
}

/**
 * Life class display information
 */
export const LIFE_CLASS_INFO: Record<DieSpringLifeClass, {
  name: { en: string; zh: string };
  description: { en: string; zh: string };
  typicalCycles: string;
  strokeField: keyof StrokeLimits;
}> = {
  LONG: {
    name: { en: "Long Life", zh: "长寿命" },
    description: {
      en: "Conservative stroke for maximum fatigue life",
      zh: "保守行程，最大疲劳寿命"
    },
    typicalCycles: "2,000,000+",
    strokeField: "long"
  },
  NORMAL: {
    name: { en: "Normal Life", zh: "标准寿命" },
    description: {
      en: "Catalog recommended stroke",
      zh: "目录推荐行程"
    },
    typicalCycles: "1,000,000",
    strokeField: "normal"
  },
  SHORT: {
    name: { en: "Short Life", zh: "短寿命" },
    description: {
      en: "Maximum stroke, reduced cycle life",
      zh: "最大行程，减少循环寿命"
    },
    typicalCycles: "100,000",
    strokeField: "max"
  }
};

// ============================================================================
// CATALOG SOURCE METADATA
// ============================================================================

/**
 * Traceability information for catalog data.
 * Required for OEM audits and quality documentation.
 */
export interface CatalogSource {
  /** Vendor / standards body name */
  vendor: string;
  /** Document title or catalog number */
  document: string;
  /** Revision date or version */
  revisionDate?: string;
  /** Page reference in document */
  page?: string;
}

// ============================================================================
// COLOR CODES
// ============================================================================

/**
 * Standard die spring color codes.
 * Mapping varies by manufacturer/series.
 */
export type DieSpringColorCode =
  | "green"   // Typically: Light Load (ISO), Light (Raymond)
  | "blue"    // Typically: Medium Load (ISO), Medium (Raymond)
  | "red"     // Typically: Heavy Load (ISO), Heavy (Raymond)
  | "yellow"  // Typically: Extra Heavy Load (ISO)
  | "brown"   // Typically: Extra Heavy (Raymond Imperial)
  | "gold";   // Alternative Extra Heavy

/**
 * Color hex values for rendering
 */
export const COLOR_HEX: Record<DieSpringColorCode, string> = {
  green: "#22c55e",
  blue: "#3b82f6",
  red: "#ef4444",
  yellow: "#eab308",
  brown: "#92400e",
  gold: "#d97706"
};

// ============================================================================
// DIE SPRING SPECIFICATION (CATALOG ENTRY)
// ============================================================================

/**
 * Complete die spring specification from catalog.
 * 
 * ⚠️ ALL VALUES ARE READ-ONLY.
 * Geometry and performance come from catalog, not user input.
 */
export interface DieSpringSpec {
  // ---- Identification ----
  /** Unique catalog part number */
  id: string;
  /** Catalog series / standard */
  series: DieSpringSeries;
  /** Load class / duty rating */
  duty: DieSpringDutyClass;
  /** Original unit system in catalog (values stored in metric) */
  unitSystem: UnitSystem;

  // ---- Geometry (LOCKED, CATALOG ONLY) ----
  /** Outer diameter (mm) */
  outerDiameter: number;
  /** Inner diameter (mm) */
  innerDiameter: number;
  /** Free length L0 (mm) */
  freeLength: number;
  /** Wire radial width b (mm) */
  wireWidth: number;
  /** Wire axial thickness t (mm) */
  wireThickness: number;
  /** Solid height Hs (mm) */
  solidHeight: number;
  /** Number of active coils */
  activeCoils: number;

  // ---- Performance (FROM CATALOG) ----
  /** Spring rate k (N/mm) - catalog nominal value */
  springRate: number;
  /** Stroke limits for different life classes (mm) */
  strokeLimits: StrokeLimits;

  // ---- Display ----
  /** Color code from catalog (series-specific) */
  colorCode: DieSpringColorCode;

  // ---- Material ----
  /** Material specification */
  material: string;

  // ---- Traceability ----
  /** Catalog source documentation */
  source: CatalogSource;
}

// ============================================================================
// INSTALLATION PARAMETERS
// ============================================================================

/**
 * Installation configuration for audit checks.
 * These are user-provided operating conditions.
 */
export interface DieSpringInstallation {
  /** Applied stroke / deflection (mm) */
  appliedStroke: number;
  /** Selected life target */
  lifeClass: DieSpringLifeClass;
  /** Preload stroke (mm) - optional */
  preloadStroke?: number;
  /** Pocket / bore diameter (mm) - if guided by hole */
  pocketDiameter?: number;
  /** Guide rod diameter (mm) - if guided by rod */
  guideRodDiameter?: number;
  /** Whether bottom surface is flat (proper seating) */
  bottomFlatness?: boolean;
}

// ============================================================================
// AUDIT RESULT
// ============================================================================

/**
 * Audit status for factory validation
 */
export type DieSpringAuditStatus = "PASS" | "WARN" | "FAIL";

/**
 * Individual audit finding
 */
export interface DieSpringAuditFinding {
  /** Rule identifier */
  ruleId: string;
  /** Rule name */
  rule: string;
  /** Finding status */
  status: DieSpringAuditStatus;
  /** Human-readable message */
  message: { en: string; zh: string };
  /** Current value (if applicable) */
  value?: number;
  /** Limit value (if applicable) */
  limit?: number;
}

/**
 * Complete audit result for a die spring configuration
 */
export interface DieSpringAuditResult {
  /** Overall status (worst of all findings) */
  status: DieSpringAuditStatus;
  /** Individual rule findings */
  findings: DieSpringAuditFinding[];
  /** Summary messages for display */
  summaryMessages: { en: string[]; zh: string[] };
}

// ============================================================================
// COMPUTED RESULTS
// ============================================================================

/**
 * Computed performance at operating point
 */
export interface DieSpringLoadResult {
  /** Force at applied stroke (N) */
  force: number;
  /** Force at preload stroke (N) */
  preloadForce: number;
  /** Spring rate (N/mm) */
  stiffness: number;
  /** Stroke utilization vs max (%) */
  utilizationMax: number;
  /** Stroke utilization vs selected life class (%) */
  utilizationLife: number;
  /** Remaining travel before solid (mm) */
  remainingTravel: number;
  /** Working height at applied stroke (mm) */
  workingHeight: number;
}

// ============================================================================
// FILTER / SELECTION TYPES
// ============================================================================

/**
 * Filter criteria for catalog search
 */
export interface DieSpringFilter {
  series?: DieSpringSeries[];
  duty?: DieSpringDutyClass[];
  outerDiameterMin?: number;
  outerDiameterMax?: number;
  freeLengthMin?: number;
  freeLengthMax?: number;
  springRateMin?: number;
  springRateMax?: number;
}

/**
 * Size option for dropdown display
 */
export interface DieSpringSize {
  /** Display label (e.g., "Ø20 × 60") */
  label: string;
  /** Outer diameter (mm) */
  outerDiameter: number;
  /** Free length (mm) */
  freeLength: number;
  /** Available duty ratings at this size */
  availableDuties: DieSpringDutyClass[];
}

// ============================================================================
// LEGACY COMPATIBILITY (DEPRECATED)
// These types are kept for backward compatibility with existing code.
// New code should use the catalog-based types above.
// ============================================================================

/** @deprecated Use DieSpringSpec instead */
export type DieSpringMaterialType =
  | "OIL_TEMPERED"
  | "CHROME_ALLOY"
  | "CHROME_SILICON";

/** @deprecated Use DieSpringSpec instead */
export interface DieSpringMaterialProperties {
  id: DieSpringMaterialType;
  name: string;
  nameZh: string;
  yieldStrength_MPa: number;
  shearModulus_MPa: number;
  maxTemperature_C: number;
}

/** @deprecated Use DieSpringSpec instead */
export const DIE_SPRING_MATERIALS: Record<DieSpringMaterialType, DieSpringMaterialProperties> = {
  OIL_TEMPERED: {
    id: "OIL_TEMPERED",
    name: "Oil Tempered Steel",
    nameZh: "油淬火钢",
    yieldStrength_MPa: 1200,
    shearModulus_MPa: 79000,
    maxTemperature_C: 120,
  },
  CHROME_ALLOY: {
    id: "CHROME_ALLOY",
    name: "Chrome Alloy Steel",
    nameZh: "铬合金钢",
    yieldStrength_MPa: 1400,
    shearModulus_MPa: 79000,
    maxTemperature_C: 200,
  },
  CHROME_SILICON: {
    id: "CHROME_SILICON",
    name: "Chrome Silicon Steel",
    nameZh: "铬硅钢",
    yieldStrength_MPa: 1600,
    shearModulus_MPa: 79000,
    maxTemperature_C: 250,
  },
};

/** @deprecated Use DieSpringSpec instead */
export type DieSpringEndStyle = "open" | "closed" | "closed_ground";

/** @deprecated Use DieSpringSpec instead */
export const DIE_SPRING_END_STYLES: Record<DieSpringEndStyle, { name: string; nameZh: string }> = {
  open: { name: "Open Ends", nameZh: "开口" },
  closed: { name: "Closed Ends", nameZh: "并口" },
  closed_ground: { name: "Closed & Ground", nameZh: "并口磨平" },
};
