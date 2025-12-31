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
  | "phosphor_bronze"
  | "65Mn"
  | "60Si2Mn"
  | "swpb"
  | "sus304"
  | "sus316"
  | "custom"
  | "70"
  | "55CrSi"
  | "50CrVA"
  | "sus631"
  | "swpa"
  | "swo-v"
  | "swc";

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
  /** Alias for shearModulus */
  G?: number;
  /** Elastic modulus E, MPa */
  elasticModulus?: number;
  /** Density, kg/m³ */
  density?: number;

  // Strength and fatigue parameters
  /** Static allowable shear stress, MPa */
  allowShearStatic: number;
  /** Alias for allowShearStatic */
  tauAllow?: number;
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
  {
    id: "65Mn" as SpringMaterialId,
    nameEn: "65Mn Spring Steel",
    nameZh: "65Mn 弹簧钢",
    standard: "GB/T 1222",
    shearModulus: 79000,
    G: 79000,
    elasticModulus: 206000,
    density: 7850,
    allowShearStatic: 720,
    tauAllow: 720,
    snCurve: { N1: 1e4, tau1: 650, N2: 1e6, tau2: 450 },
    notes: "Common spring steel in China. Good cost-performance ratio.",
  },
  {
    id: "60Si2Mn" as SpringMaterialId,
    nameEn: "60Si2Mn Alloy Steel",
    nameZh: "60Si2Mn 硅锰弹簧钢",
    standard: "GB/T 1222",
    shearModulus: 79000,
    G: 79000,
    elasticModulus: 206000,
    density: 7850,
    allowShearStatic: 880,
    tauAllow: 880,
    snCurve: { N1: 1e4, tau1: 750, N2: 1e6, tau2: 520 },
    notes: "High strength alloy steel for heavy duty springs.",
  },
  {
    id: "swpb" as SpringMaterialId,
    nameEn: "Piano Wire (JIS SWPB)",
    nameZh: "琴钢丝 (JIS SWPB)",
    standard: "JIS G 3522",
    shearModulus: 83000,
    G: 83000,
    elasticModulus: 210000,
    density: 7850,
    allowShearStatic: 1000,
    tauAllow: 1000,
    snCurve: { N1: 1e4, tau1: 850, N2: 1e6, tau2: 580 },
    notes: "Highest strength precision spring wire.",
  },
  {
    id: "sus304" as SpringMaterialId,
    nameEn: "Stainless Steel 304 (JIS)",
    nameZh: "SUS304 不锈钢",
    standard: "JIS G 4314",
    shearModulus: 69000,
    G: 69000,
    elasticModulus: 193000,
    density: 7930,
    allowShearStatic: 500,
    tauAllow: 500,
    snCurve: { N1: 1e4, tau1: 450, N2: 1e6, tau2: 300 },
    notes: "Excellent corrosion resistance.",
  },
  {
    id: "70" as SpringMaterialId,
    nameEn: "70 Carbon Steel",
    nameZh: "70# 碳素钢",
    standard: "GB/T 1222",
    shearModulus: 79000,
    G: 79000,
    elasticModulus: 206000,
    density: 7850,
    allowShearStatic: 680,
    tauAllow: 680,
    snCurve: { N1: 1e4, tau1: 600, N2: 1e6, tau2: 400 },
    notes: "Economy steel for general use.",
  },
  {
    id: "55CrSi" as SpringMaterialId,
    nameEn: "55CrSi Alloy Steel",
    nameZh: "55CrSi 铬硅弹簧钢",
    standard: "GB/T 1222",
    shearModulus: 79000,
    G: 79000,
    elasticModulus: 206000,
    density: 7850,
    allowShearStatic: 980,
    tauAllow: 980,
    snCurve: { N1: 1e4, tau1: 850, N2: 1e6, tau2: 600 },
    notes: "Good performance at elevated temperatures.",
  },
  {
    id: "50CrVA" as SpringMaterialId,
    nameEn: "50CrVA Chrome Vanadium",
    nameZh: "50CrVA 铬钒弹簧钢",
    standard: "GB/T 1222",
    shearModulus: 79000,
    G: 79000,
    elasticModulus: 206000,
    density: 7850,
    allowShearStatic: 920,
    tauAllow: 920,
    snCurve: { N1: 1e4, tau1: 800, N2: 1e6, tau2: 550 },
    notes: "Excellent shock and fatigue resistance.",
  },
  {
    id: "sus631" as SpringMaterialId,
    nameEn: "SUS631 (17-7PH)",
    nameZh: "SUS631 沉淀硬化不锈钢",
    standard: "JIS G 4314",
    shearModulus: 75000,
    G: 75000,
    elasticModulus: 200000,
    density: 7800,
    allowShearStatic: 820,
    tauAllow: 820,
    snCurve: { N1: 1e4, tau1: 700, N2: 1e6, tau2: 480 },
    notes: "High strength stainless steel.",
  },
  {
    id: "swpa" as SpringMaterialId,
    nameEn: "Piano Wire (JIS SWPA)",
    nameZh: "琴钢丝 (JIS SWPA)",
    standard: "JIS G 3522",
    shearModulus: 83000,
    G: 83000,
    elasticModulus: 210000,
    density: 7850,
    allowShearStatic: 950,
    tauAllow: 950,
    snCurve: { N1: 1e4, tau1: 800, N2: 1e6, tau2: 550 },
    notes: "Standard grade piano wire.",
  },
  {
    id: "swo-v" as SpringMaterialId,
    nameEn: "Oil Tempered (JIS SWO-V)",
    nameZh: "油淬回火钢丝 (SWO-V)",
    standard: "JIS G 3561",
    shearModulus: 79000,
    G: 79000,
    elasticModulus: 206000,
    density: 7850,
    allowShearStatic: 820,
    tauAllow: 820,
    snCurve: { N1: 1e4, tau1: 720, N2: 1e6, tau2: 500 },
    notes: "Valve spring quality wire.",
  },
  {
    id: "swc" as SpringMaterialId,
    nameEn: "Hard Drawn (JIS SWC)",
    nameZh: "硬钢丝 (JIS SWC)",
    standard: "JIS G 3521",
    shearModulus: 79000,
    G: 79000,
    elasticModulus: 206000,
    density: 7850,
    allowShearStatic: 620,
    tauAllow: 620,
    snCurve: { N1: 1e4, tau1: 520, N2: 1e6, tau2: 350 },
    notes: "Low stress applications.",
  },
  {
    id: "custom" as SpringMaterialId,
    nameEn: "Custom",
    nameZh: "自定义",
    shearModulus: 79000,
    allowShearStatic: 700,
    snCurve: { N1: 1e4, tau1: 600, N2: 1e6, tau2: 400 },
    notes: "User-defined properties.",
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
    value: m.id as SpringMaterialId,
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
