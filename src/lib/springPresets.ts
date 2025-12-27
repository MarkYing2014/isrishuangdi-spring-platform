/**
 * Spring Presets - Real-World OEM Sample Data
 * 弹簧预设 - 真实 OEM 案例数据
 * 
 * Purpose: Provide realistic sample data for each spring type
 * to help users quickly understand and get started with the calculator.
 */

// ============================================================================
// COMPRESSION SPRING SAMPLES
// 压缩弹簧样本
// ============================================================================

export const COMPRESSION_SAMPLES = {
    /** Automotive Valve Spring (汽车气门弹簧) */
    valve_spring: {
        name: { en: "Automotive Valve Spring", zh: "汽车气门弹簧" },
        description: {
            en: "High-performance engine valve spring, typical for 4-cylinder passenger car",
            zh: "高性能发动机气门弹簧，典型四缸乘用车规格"
        },
        wireDiameter: 4.0,
        meanDiameter: 26.0,
        activeCoils: 5.5,
        totalCoils: 7.5,
        freeLength: 48.0,
        shearModulus: 79300,
        deflection: 12.0,
        materialId: "chrome_vanadium"
    },
    /** Industrial Return Spring (工业回位弹簧) */
    return_spring: {
        name: { en: "Industrial Return Spring", zh: "工业回位弹簧" },
        description: {
            en: "Machine tool return spring, medium duty cycle",
            zh: "机床回位弹簧，中等负载循环"
        },
        wireDiameter: 3.2,
        meanDiameter: 24.0,
        activeCoils: 8,
        totalCoils: 10,
        freeLength: 50.0,
        shearModulus: 78500,
        deflection: 10.0,
        materialId: "music_wire_a228"
    },
    /** Small Precision Spring (小型精密弹簧) */
    precision_spring: {
        name: { en: "Small Precision Spring", zh: "小型精密弹簧" },
        description: {
            en: "Electronics/precision instrument spring",
            zh: "电子/精密仪器用弹簧"
        },
        wireDiameter: 0.8,
        meanDiameter: 6.0,
        activeCoils: 12,
        totalCoils: 14,
        freeLength: 25.0,
        shearModulus: 81000,
        deflection: 5.0,
        materialId: "stainless_302"
    }
} as const;

// ============================================================================
// EXTENSION SPRING SAMPLES
// 拉伸弹簧样本
// ============================================================================

export const EXTENSION_SAMPLES = {
    /** Garage Door Spring (车库门弹簧) */
    garage_door: {
        name: { en: "Garage Door Spring", zh: "车库门拉伸弹簧" },
        description: {
            en: "Standard residential garage door spring, 10,000 cycle life",
            zh: "标准住宅车库门弹簧，10,000次循环寿命"
        },
        wireDiameter: 4.5,
        outerDiameter: 32.0,
        activeCoils: 120,
        bodyLength: 600.0,
        freeLengthInsideHooks: 650.0,
        shearModulus: 78500,
        initialTension: 25.0,
        hookType: "german" as const,
        deflection: 80.0,
        materialId: "oil_tempered_mb"
    },
    /** Industrial Tension Spring (工业拉簧) */
    industrial_tension: {
        name: { en: "Industrial Tension Spring", zh: "工业拉簧" },
        description: {
            en: "Machine safety cover return spring",
            zh: "机械安全罩回位拉簧"
        },
        wireDiameter: 2.5,
        outerDiameter: 18.0,
        activeCoils: 25,
        bodyLength: 80.0,
        freeLengthInsideHooks: 95.0,
        shearModulus: 79300,
        initialTension: 8.0,
        hookType: "machine" as const,
        deflection: 30.0,
        materialId: "music_wire_a228"
    }
} as const;

// ============================================================================
// TORSION SPRING SAMPLES
// 扭转弹簧样本
// ============================================================================

export const TORSION_SAMPLES = {
    /** Door Hinge Spring (门铰链弹簧) */
    door_hinge: {
        name: { en: "Door Hinge Spring", zh: "门铰链扭簧" },
        description: {
            en: "Self-closing door hinge, right-hand wound",
            zh: "自关闭门铰链弹簧，右旋"
        },
        wireDiameter: 3.5,
        meanDiameter: 22.0,
        activeCoils: 6,
        legLength1: 35.0,
        legLength2: 35.0,
        freeAngle: 90.0,
        shearModulus: 78500,
        windingDirection: "right" as const,
        workingAngle: 45.0,
        materialId: "music_wire_a228"
    },
    /** Clipboard Spring (夹板弹簧) */
    clipboard: {
        name: { en: "Clipboard Clamp Spring", zh: "夹板弹簧" },
        description: {
            en: "Office/stationery application",
            zh: "办公/文具应用"
        },
        wireDiameter: 1.2,
        meanDiameter: 10.0,
        activeCoils: 4,
        legLength1: 20.0,
        legLength2: 25.0,
        freeAngle: 180.0,
        shearModulus: 81000,
        windingDirection: "left" as const,
        workingAngle: 30.0,
        materialId: "stainless_302"
    }
} as const;

// ============================================================================
// DIE SPRING SAMPLES (Color-Coded by Load)
// 模具弹簧样本（按负载颜色编码）
// ============================================================================

export const DIE_SPRING_SAMPLES = {
    /** Green - Light Load (绿色-轻载) */
    green_light: {
        name: { en: "Green Die Spring (Light Load)", zh: "绿色模具弹簧（轻载）" },
        description: {
            en: "ISO 10243 light load, stripping applications",
            zh: "ISO 10243 轻载，卸料应用"
        },
        type: "green" as const,
        holeDiameter: 20.0,
        rodDiameter: 10.0,
        freeLength: 51.0,
        deflection: 12.75  // 25% of free length
    },
    /** Blue - Medium Load (蓝色-中载) */
    blue_medium: {
        name: { en: "Blue Die Spring (Medium Load)", zh: "蓝色模具弹簧（中载）" },
        description: {
            en: "ISO 10243 medium load, general stamping",
            zh: "ISO 10243 中载，通用冲压"
        },
        type: "blue" as const,
        holeDiameter: 25.0,
        rodDiameter: 12.5,
        freeLength: 64.0,
        deflection: 16.0  // 25% of free length
    },
    /** Red - Heavy Load (红色-重载) */
    red_heavy: {
        name: { en: "Red Die Spring (Heavy Load)", zh: "红色模具弹簧（重载）" },
        description: {
            en: "ISO 10243 heavy load, deep drawing",
            zh: "ISO 10243 重载，深拉伸"
        },
        type: "red" as const,
        holeDiameter: 32.0,
        rodDiameter: 16.0,
        freeLength: 76.0,
        deflection: 19.0  // 25% of free length
    }
} as const;

// ============================================================================
// WAVE SPRING SAMPLES
// 波形弹簧样本
// ============================================================================

export const WAVE_SPRING_SAMPLES = {
    /** Bearing Preload (轴承预紧) */
    bearing_preload: {
        name: { en: "Bearing Preload Wave Spring", zh: "轴承预紧波形弹簧" },
        description: {
            en: "Angular contact ball bearing preload, Class 7 precision",
            zh: "角接触球轴承预紧，7级精度"
        },
        outerDiameter: 52.0,
        innerDiameter: 40.0,
        thickness: 0.5,
        waves: 4,
        turns: 3,
        freeHeight: 8.0,
        deflection: 2.0,
        materialId: "stainless_17_7ph"
    },
    /** Seal Spring (密封弹簧) */
    seal_spring: {
        name: { en: "Mechanical Seal Spring", zh: "机械密封弹簧" },
        description: {
            en: "Pump mechanical seal, constant force",
            zh: "泵机械密封，恒力弹簧"
        },
        outerDiameter: 38.0,
        innerDiameter: 28.0,
        thickness: 0.4,
        waves: 3,
        turns: 5,
        freeHeight: 12.0,
        deflection: 3.0,
        materialId: "inconel_x750"
    }
} as const;

// ============================================================================
// DISK / BELLEVILLE SPRING SAMPLES
// 碟形弹簧样本
// ============================================================================

export const DISK_SPRING_SAMPLES = {
    /** Standard DIN 2093 (标准 DIN 2093) */
    din_standard: {
        name: { en: "DIN 2093 Standard Disk Spring", zh: "DIN 2093 标准碟形弹簧" },
        description: {
            en: "Series A, bolted flange connection",
            zh: "A 系列，螺栓法兰连接"
        },
        outerDiameter: 50.0,
        innerDiameter: 25.4,
        thickness: 2.5,
        freeHeight: 3.8,
        flatHeight: 2.5,
        deflection: 1.0,
        materialId: "spring_steel_51crv4"
    },
    /** Heavy Duty Stack (重载堆叠) */
    heavy_stack: {
        name: { en: "Heavy Duty Stacked Belleville", zh: "重载堆叠碟簧" },
        description: {
            en: "Parallel stack (3x), high load bolted joint",
            zh: "并联堆叠（3片），高负载螺栓连接"
        },
        outerDiameter: 80.0,
        innerDiameter: 41.0,
        thickness: 4.0,
        freeHeight: 5.5,
        flatHeight: 4.0,
        deflection: 1.2,
        stackCount: 3,
        stackType: "parallel" as const,
        materialId: "spring_steel_51crv4"
    }
} as const;

// ============================================================================
// CONICAL SPRING SAMPLES
// 锥形弹簧样本
// ============================================================================

export const CONICAL_SPRING_SAMPLES = {
    /** Automotive Seat Spring (汽车座椅弹簧) */
    seat_spring: {
        name: { en: "Automotive Seat Spring", zh: "汽车座椅锥形弹簧" },
        description: {
            en: "Progressive rate seat cushion spring",
            zh: "渐进刚度座椅垫弹簧"
        },
        wireDiameter: 4.5,
        largeOuterDiameter: 65.0,
        smallOuterDiameter: 35.0,
        activeCoils: 5,
        freeLength: 80.0,
        shearModulus: 78500,
        deflection: 25.0,
        materialId: "oil_tempered_mb"
    },
    /** Battery Contact (电池接触弹簧) */
    battery_contact: {
        name: { en: "Battery Contact Spring", zh: "电池接触锥形弹簧" },
        description: {
            en: "Consumer electronics, gold flash plating",
            zh: "消费电子，镀金闪光"
        },
        wireDiameter: 0.6,
        largeOuterDiameter: 8.0,
        smallOuterDiameter: 4.0,
        activeCoils: 4,
        freeLength: 12.0,
        shearModulus: 81000,
        deflection: 3.0,
        materialId: "phosphor_bronze"
    }
} as const;

// ============================================================================
// SUSPENSION SPRING SAMPLES
// 悬挂弹簧样本
// ============================================================================

export const SUSPENSION_SPRING_SAMPLES = {
    /** Front Strut Spring (前减震弹簧) */
    front_strut: {
        name: { en: "Front Strut Spring (C-Segment)", zh: "前减震弹簧（C级轿车）" },
        description: {
            en: "McPherson strut, progressive wound",
            zh: "麦弗逊支柱式，渐进绕制"
        },
        wireDiameter: 12.5,
        outerDiameter: 145.0,
        innerDiameter: 120.0,
        activeCoils: 5.5,
        freeLength: 380.0,
        sprungMass: 350.0, // kg per corner
        rideFrequency: 1.2, // Hz
        materialId: "sae_9254"
    },
    /** Rear Coil Spring (后螺旋弹簧) */
    rear_coil: {
        name: { en: "Rear Coil Spring (SUV)", zh: "后螺旋弹簧（SUV）" },
        description: {
            en: "Multi-link rear suspension, barrel wound",
            zh: "多连杆后悬挂，桶形绕制"
        },
        wireDiameter: 14.0,
        outerDiameter: 160.0,
        innerDiameter: 130.0,
        activeCoils: 4.5,
        freeLength: 320.0,
        sprungMass: 450.0,
        rideFrequency: 1.4,
        materialId: "sae_9254"
    }
} as const;

// ============================================================================
// ARC SPRING SAMPLES
// 弧形弹簧样本
// ============================================================================

export const ARC_SPRING_SAMPLES = {
    /** Clutch Arc Spring (离合器弧形弹簧) */
    clutch_arc: {
        name: { en: "Clutch Damper Arc Spring", zh: "离合器减震弧形弹簧" },
        description: {
            en: "DMF arc spring, 8-piece set",
            zh: "双质量飞轮弧形弹簧，8件套"
        },
        wireDiameter: 5.5,
        outerDiameter: 180.0,
        arcAngle: 120.0,
        windingAngle: 900.0,
        activeCoils: 2.5,
        shearModulus: 79300,
        torsion: 50.0, // Nm
        materialId: "chrome_silicon"
    }
} as const;

// ============================================================================
// SPIRAL TORSION SPRING SAMPLES
// 螺旋扭转弹簧样本
// ============================================================================

export const SPIRAL_TORSION_SAMPLES = {
    /** Clock Mainspring (钟表发条) */
    clock_mainspring: {
        name: { en: "Clock Mainspring", zh: "钟表发条" },
        description: {
            en: "8-day clock, carbon steel, blued",
            zh: "8天钟表，碳钢，发蓝处理"
        },
        thickness: 0.3,
        width: 6.0,
        arbor: 6.0,
        barrel: 35.0,
        turns: 12,
        windingTorque: 0.15 // Nm
    },
    /** Seatbelt Retractor (安全带卷收器) */
    seatbelt_retractor: {
        name: { en: "Seatbelt Retractor Spring", zh: "安全带卷收器弹簧" },
        description: {
            en: "Automotive ELR mechanism, constant torque",
            zh: "汽车 ELR 机构，恒扭矩"
        },
        thickness: 0.5,
        width: 25.0,
        arbor: 25.0,
        barrel: 60.0,
        turns: 8,
        windingTorque: 3.5 // Nm
    }
} as const;

// ============================================================================
// GARTER SPRING SAMPLES
// 环形弹簧样本
// ============================================================================

export const GARTER_SPRING_SAMPLES = {
    /** Oil Seal Spring (油封弹簧) */
    oil_seal: {
        name: { en: "Radial Lip Oil Seal Spring", zh: "径向唇油封弹簧" },
        description: {
            en: "Crankshaft main seal, double lip",
            zh: "曲轴主密封，双唇结构"
        },
        wireDiameter: 0.8,
        coilDiameter: 4.0,
        installedDiameter: 85.0,
        radialForce: 6.5 // N per mm circumference
    }
} as const;

// ============================================================================
// DEFAULT SAMPLE GETTERS
// 默认样本获取器
// ============================================================================

export function getDefaultCompressionSample() {
    return COMPRESSION_SAMPLES.return_spring;
}

export function getDefaultExtensionSample() {
    return EXTENSION_SAMPLES.industrial_tension;
}

export function getDefaultTorsionSample() {
    return TORSION_SAMPLES.door_hinge;
}

export function getDefaultDieSpringSample() {
    return DIE_SPRING_SAMPLES.blue_medium;
}

export function getDefaultWaveSpringSample() {
    return WAVE_SPRING_SAMPLES.bearing_preload;
}

export function getDefaultDiskSpringSample() {
    return DISK_SPRING_SAMPLES.din_standard;
}

export function getDefaultConicalSample() {
    return CONICAL_SPRING_SAMPLES.seat_spring;
}

export function getDefaultSuspensionSample() {
    return SUSPENSION_SPRING_SAMPLES.front_strut;
}

export function getDefaultArcSpringSample() {
    return ARC_SPRING_SAMPLES.clutch_arc;
}

export function getDefaultSpiralTorsionSample() {
    return SPIRAL_TORSION_SAMPLES.seatbelt_retractor;
}

export function getDefaultGarterSample() {
    return GARTER_SPRING_SAMPLES.oil_seal;
}
