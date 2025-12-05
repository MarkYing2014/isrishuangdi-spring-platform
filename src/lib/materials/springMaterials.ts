/**
 * Spring Material Database
 * 弹簧材料数据库
 * 
 * Contains material properties for spring design calculations including:
 * - Mechanical properties (G, E, density)
 * - Strength and fatigue parameters
 * - Correction factors for stress analysis
 */

export type SpringMaterialId =
  | "music_wire_a228"
  | "oil_tempered"
  | "ss_302"
  | "chrome_silicon"
  | "chrome_vanadium"
  | "phosphor_bronze";

export interface SNcurveData {
  /** Reference cycle count 1 (typically 1e3 or 1e4) */
  N1: number;
  /** Shear stress amplitude at N1 cycles, MPa */
  tau1: number;
  /** Reference cycle count 2 (typically 1e6 or 1e7) */
  N2: number;
  /** Shear stress amplitude at N2 cycles, MPa */
  tau2: number;
}

export interface SpringMaterial {
  id: SpringMaterialId;
  nameEn: string;
  nameZh: string;
  /** Material standard (e.g., ASTM A228, JIS G3521) */
  standard?: string;
  /** Shear modulus G, MPa */
  shearModulus: number;
  /** Elastic modulus E, MPa */
  elasticModulus?: number;
  /** Density, kg/m³ */
  density?: number;

  // Strength and fatigue parameters
  /** Static allowable shear stress, MPa */
  allowShearStatic: number;
  /** Ultimate tensile strength (approximate), MPa */
  tensileStrength?: number;
  /** S-N curve data for fatigue life estimation */
  snCurve: SNcurveData;

  // Default correction factors
  /** Surface roughness factor K_surface (default 1.0) */
  surfaceFactor?: number;
  /** Size factor K_size (default 1.0) */
  sizeFactor?: number;
  /** Temperature factor K_temp (default 1.0) */
  tempFactor?: number;

  /** Additional notes */
  notes?: string;
}

/**
 * Spring Materials Database
 * 弹簧材料数据库
 */
export const SPRING_MATERIALS: SpringMaterial[] = [
  {
    id: "music_wire_a228",
    nameEn: "Music Wire (ASTM A228)",
    nameZh: "琴钢丝 (ASTM A228)",
    standard: "ASTM A228",
    shearModulus: 79300,
    elasticModulus: 207000,
    density: 7850,
    allowShearStatic: 560,
    tensileStrength: 2200,
    snCurve: {
      N1: 1e4,
      tau1: 620,
      N2: 1e6,
      tau2: 420,
    },
    surfaceFactor: 0.95,
    sizeFactor: 1.0,
    tempFactor: 1.0,
    notes: "High strength, excellent fatigue resistance. Best for precision springs.",
  },
  {
    id: "oil_tempered",
    nameEn: "Oil Tempered Wire (ASTM A229)",
    nameZh: "油淬火钢丝 (ASTM A229)",
    standard: "ASTM A229",
    shearModulus: 79300,
    elasticModulus: 207000,
    density: 7850,
    allowShearStatic: 480,
    tensileStrength: 1900,
    snCurve: {
      N1: 1e4,
      tau1: 550,
      N2: 1e6,
      tau2: 360,
    },
    surfaceFactor: 0.90,
    sizeFactor: 1.0,
    tempFactor: 1.0,
    notes: "Good general purpose spring wire. Lower cost than music wire.",
  },
  {
    id: "ss_302",
    nameEn: "Stainless Steel 302/304",
    nameZh: "不锈钢 302/304",
    standard: "ASTM A313 Type 302",
    shearModulus: 69000,
    elasticModulus: 193000,
    density: 7900,
    allowShearStatic: 420,
    tensileStrength: 1600,
    snCurve: {
      N1: 1e4,
      tau1: 480,
      N2: 1e6,
      tau2: 310,
    },
    surfaceFactor: 0.92,
    sizeFactor: 1.0,
    tempFactor: 1.0,
    notes: "Corrosion resistant. Good for food/medical applications.",
  },
  {
    id: "chrome_silicon",
    nameEn: "Chrome Silicon (ASTM A401)",
    nameZh: "铬硅钢丝 (ASTM A401)",
    standard: "ASTM A401",
    shearModulus: 79300,
    elasticModulus: 207000,
    density: 7850,
    allowShearStatic: 620,
    tensileStrength: 2100,
    snCurve: {
      N1: 1e4,
      tau1: 680,
      N2: 1e6,
      tau2: 480,
    },
    surfaceFactor: 0.93,
    sizeFactor: 1.0,
    tempFactor: 1.0,
    notes: "Excellent for high-stress, high-temperature applications. Valve springs.",
  },
  {
    id: "chrome_vanadium",
    nameEn: "Chrome Vanadium (ASTM A231)",
    nameZh: "铬钒钢丝 (ASTM A231)",
    standard: "ASTM A231",
    shearModulus: 79300,
    elasticModulus: 207000,
    density: 7850,
    allowShearStatic: 550,
    tensileStrength: 2000,
    snCurve: {
      N1: 1e4,
      tau1: 600,
      N2: 1e6,
      tau2: 420,
    },
    surfaceFactor: 0.92,
    sizeFactor: 1.0,
    tempFactor: 1.0,
    notes: "Good shock resistance. Automotive and aerospace applications.",
  },
  {
    id: "phosphor_bronze",
    nameEn: "Phosphor Bronze (ASTM B159)",
    nameZh: "磷青铜 (ASTM B159)",
    standard: "ASTM B159",
    shearModulus: 41000,
    elasticModulus: 103000,
    density: 8800,
    allowShearStatic: 280,
    tensileStrength: 900,
    snCurve: {
      N1: 1e4,
      tau1: 320,
      N2: 1e6,
      tau2: 200,
    },
    surfaceFactor: 0.95,
    sizeFactor: 1.0,
    tempFactor: 1.0,
    notes: "Non-magnetic, corrosion resistant. Electrical applications.",
  },
];

/**
 * Get a spring material by ID
 * @param id Material ID
 * @returns SpringMaterial or undefined if not found
 */
export function getSpringMaterial(id: SpringMaterialId): SpringMaterial | undefined {
  return SPRING_MATERIALS.find((m) => m.id === id);
}

/**
 * Get the default spring material (Music Wire)
 * @returns Default SpringMaterial
 */
export function getDefaultSpringMaterial(): SpringMaterial {
  return SPRING_MATERIALS[0]; // Music Wire A228
}

/**
 * Get all material options for select dropdown
 * @returns Array of {value, labelEn, labelZh}
 */
export function getMaterialOptions(): Array<{
  value: SpringMaterialId;
  labelEn: string;
  labelZh: string;
}> {
  return SPRING_MATERIALS.map((m) => ({
    value: m.id,
    labelEn: m.nameEn,
    labelZh: m.nameZh,
  }));
}

/**
 * Temperature correction factor lookup
 * Returns a factor based on operating temperature
 * @param tempC Operating temperature in Celsius
 * @param materialId Material ID
 * @returns Temperature correction factor
 */
export function getTemperatureFactor(tempC: number, materialId: SpringMaterialId): number {
  // Simplified temperature correction
  // For steel alloys, strength decreases at elevated temperatures
  if (materialId === "phosphor_bronze") {
    // Bronze has different temperature behavior
    if (tempC <= 20) return 1.0;
    if (tempC <= 100) return 0.98;
    if (tempC <= 150) return 0.95;
    return 0.90;
  }

  // Steel alloys
  if (tempC <= 20) return 1.0;
  if (tempC <= 100) return 0.98;
  if (tempC <= 150) return 0.95;
  if (tempC <= 200) return 0.90;
  if (tempC <= 250) return 0.85;
  if (tempC <= 300) return 0.78;
  return 0.70;
}

/**
 * Size correction factor based on wire diameter
 * Larger wires have lower fatigue strength
 * @param wireDiameter Wire diameter in mm
 * @returns Size correction factor
 */
export function getSizeFactor(wireDiameter: number): number {
  if (wireDiameter <= 1.0) return 1.0;
  if (wireDiameter <= 2.0) return 0.98;
  if (wireDiameter <= 4.0) return 0.95;
  if (wireDiameter <= 6.0) return 0.92;
  if (wireDiameter <= 10.0) return 0.88;
  return 0.85;
}
