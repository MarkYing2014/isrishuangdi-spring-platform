/**
 * Suspension (Shock) Spring Types
 * 减震器弹簧类型定义
 * 
 * V1: Linear round wire compression spring
 * V2 预留: Progressive/dual-rate springs
 * V2 预留: 旋向(右旋/左旋)、涂层厚度、磨平比例、高度定义方式
 */

export type EndType = "open" | "closed" | "closed_ground";

export interface SuspensionSpringGeometry {
  // 任选一种输入方式：OD/ID 或 Dm
  od_mm?: number;
  id_mm?: number;
  meanDiameter_mm?: number;

  wireDiameter_mm: number;     // d
  activeCoils_Na: number;      // Na
  totalCoils_Nt?: number;      // Nt (默认 Na + 2)
  freeLength_Hf_mm: number;    // Hf

  endType: EndType;
  
  // buckling/导向
  guide: {
    holeDiameter_mm?: number;  // containment hole
    rodDiameter_mm?: number;   // internal rod
  };
}

export interface SuspensionSpringMaterial {
  shearModulus_G_MPa: number;  // G
  yieldStrength_MPa: number;   // Sy (用于屈服安全系数)
  fatigueLimit_MPa?: number;   // Se (V2/风险提示用)
  shotPeened?: boolean;
  preset?: string;
}

export interface SuspensionSpringLoadcase {
  // 工况输入：至少给 ride load
  preload_N?: number;          // F0
  rideLoad_N: number;          // F_ride
  bumpTravel_mm: number;       // x_bump_max（相对自由长的最大压缩）
  droopTravel_mm?: number;

  // 动态（可选）
  cornerMass_kg?: number;
  motionRatio?: number;        // MR default 1
  targetFreq_Hz?: number;      // 如果填了，给建议 k（V2）
  solidMargin_mm?: number;     // default 3
}

export interface SuspensionSpringInput {
  geometry: SuspensionSpringGeometry;
  material: SuspensionSpringMaterial;
  loadcase: SuspensionSpringLoadcase;
}

export interface SuspensionSpringResult {
  errors: string[];
  warnings: string[];

  derived: {
    meanDiameter_mm: number;
    springIndex_C: number;
    totalCoils_Nt: number;
    solidHeight_Hs_mm: number;
    od_mm: number;
    id_mm: number;
  };

  // 核心输出
  springRate_N_per_mm: number;
  rideDeflection_mm: number;
  preloadDeflection_mm: number;
  rideHeight_mm: number;
  bumpHeight_mm: number;

  forces: {
    preload_N: number;
    ride_N: number;
    bump_N: number;
  };

  stress: {
    wahlFactor_Kw: number;
    tauRide_MPa: number;
    tauBump_MPa: number;
    yieldSafetyFactor_ride: number;
    yieldSafetyFactor_bump: number;
    stressRatio_bump: number; // tau/allow
  };

  dynamics?: {
    wheelRate_N_per_mm: number;
    naturalFreq_Hz: number;
  };

  // 曲线（给图表）
  curve: {
    x_mm: number[];
    F_N: number[];
    tau_MPa: number[];
  };
}

// 材料预设
export interface SuspensionSpringMaterialPreset {
  name: string;
  shearModulus_G_MPa: number;
  yieldStrength_MPa: number;
  fatigueLimit_MPa?: number;
}

export const SUSPENSION_SPRING_MATERIAL_PRESETS: SuspensionSpringMaterialPreset[] = [
  {
    name: "Chrome Silicon (Cr-Si)",
    shearModulus_G_MPa: 79000,
    yieldStrength_MPa: 1600,
    fatigueLimit_MPa: 550,
  },
  {
    name: "Chrome Vanadium (Cr-V)",
    shearModulus_G_MPa: 79000,
    yieldStrength_MPa: 1400,
    fatigueLimit_MPa: 480,
  },
  {
    name: "Music Wire (ASTM A228)",
    shearModulus_G_MPa: 81500,
    yieldStrength_MPa: 1800,
    fatigueLimit_MPa: 600,
  },
  {
    name: "Oil Tempered (ASTM A229)",
    shearModulus_G_MPa: 79000,
    yieldStrength_MPa: 1300,
    fatigueLimit_MPa: 420,
  },
];
