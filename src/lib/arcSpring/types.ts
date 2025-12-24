/**
 * Arc Spring (弧形弹簧 / DMF 弹簧) 类型定义
 * 
 * Arc Spring 本质是螺旋压缩弹簧在圆弧轴线上的力学映射
 * 核心关系: M(α) = F(α) · r
 */

export type Handedness = "cw" | "ccw"; // 预留未来几何可视化用

export type HysteresisMode = "none" | "constant" | "proportional";
export type SystemMode = "single" | "dual_parallel" | "dual_staged";

export type MaterialKey = "EN10270_1" | "EN10270_2" | "EN10270_3" | "CUSTOM";

export interface ArcSpringMaterial {
  key: MaterialKey;
  name: string;
  G: number; // N/mm² (MPa) - 剪切模量
}

export interface ArcSpringInput {
  // Geometry (几何参数) - 线圈本身
  d: number;   // mm - 线径
  D: number;   // mm - 中径 (Mean coil diameter)
  n: number;   // 有效圈数

  // Arc layout (弧形布局) - 圆弧配置
  r: number;       // mm - 工作半径 (力臂，决定扭矩)
  alpha0: number;  // deg - 自由角
  alphaWork?: number; // deg - 工作角 (Working Angle)
  alphaC: number;  // deg - 压并角 (alphaC < alpha0)
  countParallel?: number; // 并联弹簧数量 (DMF 常用多根并联，默认 1)

  // Space constraints (空间约束) - 干涉检查
  maxHousingDiameter?: number;  // mm - 最大可用安装空间 (滑壳内径)
  minClearance?: number;        // mm - 最小间隙要求 (默认 1mm)

  // Material (材料)
  materialKey: MaterialKey;
  G_override?: number; // 可选，如果 materialKey=CUSTOM 或用户覆盖

  // Curve sampling (曲线采样)
  samples?: number; // 默认 120

  // Hysteresis (迟滞) - 高级模型
  hysteresisMode?: HysteresisMode;
  Tf_const?: number;    // N·mm - 恒定摩擦扭矩
  cf?: number;          // 无量纲 - 比例摩擦系数
  frictionCoeff?: number; // μ - 摩擦系数 (高级模式)
  rpm?: number;           // RPM - 转速 (离心力影响)

  // System (系统模式)
  systemMode?: SystemMode;

  // Second spring (双级弹簧) - 内弹簧参数
  spring2?: Partial<Omit<ArcSpringInput,
    "systemMode" | "spring2" | "samples" | "maxHousingDiameter"
  >>;

  engageAngle2?: number; // deg - 仅用于 dual_staged (Δα 阈值，拐点角度)
}

export interface ArcSpringPoint {
  deltaDeg: number;  // Δα in deg (0..Δαmax)
  alphaDeg: number;  // α = α0 - Δα
  x: number;         // mm - 位移
  F: number;         // N - 弹簧力
  M: number;         // N·mm - 扭矩 (无摩擦)
  Tf: number;        // N·mm - 摩擦扭矩
  M_load: number;    // N·mm - 加载扭矩
  M_unload: number;  // N·mm - 卸载扭矩
  coilBind: boolean; // 是否压并
}

export interface ArcSpringResult {
  // 基本刚度
  k: number;              // N/mm - 弹簧刚度 (切向线刚度，中间计算值)
  R_deg: number;          // N·mm/deg - 旋转刚度 (系统核心参数)

  // 行程与扭矩
  deltaAlphaMax: number;  // deg - 最大转角
  xMax: number;           // mm - 最大位移
  MMax_load: number;      // N·mm - 最大加载扭矩
  MMax_unload: number;    // N·mm - 最大卸载扭矩

  // 工作点 (如果提供了 alphaWork)
  deltaAlphaWork?: number; // deg - 工作转角
  M_work?: number;         // N·mm - 工作扭矩
  tauWork?: number;        // MPa - 工作应力

  // 几何尺寸
  De: number;             // mm - 外径 (Outer coil diameter) = D + d
  Di: number;             // mm - 内径 (Inner coil diameter) = D - d

  // 安全裕度
  safetyMarginToSolid: number;  // deg - 剩余行程安全裕度
  housingClearance?: number;    // mm - 与滑壳的间隙 (如果提供了 maxHousingDiameter)

  // 应力分析 (Wahl Factor)
  springIndex: number;          // C = D/d - 弹簧指数
  wahlFactor: number;           // K_W - Wahl 应力修正因子
  tauMax: number;               // MPa - 最大剪切应力 (考虑 Wahl 修正)

  // 迟滞与阻尼
  hysteresisWork: number;       // N·mm·deg - 阻尼能量 (迟滞回线面积)
  dampingCapacity: number;      // % - 阻尼效率 (Hysteresis Energy / Total Potential Energy)

  // 双级系统
  engageAngleMarker?: number;   // deg - 拐点角度 (dual_staged 模式)
  spring2Clearance?: number;    // mm - 内外弹簧间隙 (dual 模式)

  // 曲线数据
  curve: ArcSpringPoint[];
  warnings: string[];
}
