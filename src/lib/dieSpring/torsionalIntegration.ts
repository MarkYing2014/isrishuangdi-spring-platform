/**
 * Die Spring Torsional System Integration
 * 模具弹簧扭转系统集成
 * 
 * Provides functions to integrate catalog die springs into
 * multi-stage torsional spring systems (clutch dampers).
 * 
 * @module dieSpring/torsionalIntegration
 */

import type { TorsionalSpringGroup } from "@/lib/torsional/torsionalSystemTypes";
import type {
    DieSpringSpec,
    DieSpringLifeClass,
} from "./types";
import {
    getMeanDiameter,
    getStrokeLimitForLifeClass,
    calculateTorsionalStiffness,
    calculateMaxAngularDeflection,
} from "./math";

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

export interface CreateDieSpringGroupParams {
    /** Die spring specification from catalog */
    spec: DieSpringSpec;
    /** Number of springs in this group */
    count: number;
    /** Installation radius (mm) - distance from rotation axis to spring center */
    installRadius: number;
    /** Engagement angle (degrees) - angle at which this group starts contributing */
    engagementAngle?: number;
    /** Stage number for multi-stage systems */
    stage?: 1 | 2 | 3;
    /** Optional group name */
    name?: string;
    /** Life class for stroke limit */
    lifeClass?: DieSpringLifeClass;
    /** Additional clearance before solid stop (mm) */
    clearance?: number;
}

/**
 * Create a TorsionalSpringGroup from a DieSpringSpec
 * 
 * This converts a catalog die spring into a format compatible
 * with the torsional spring system calculator.
 * 
 * @param params - Die spring group parameters
 * @returns TorsionalSpringGroup for use in system design
 */
export function createDieSpringGroup(params: CreateDieSpringGroupParams): TorsionalSpringGroup {
    const {
        spec,
        count,
        installRadius,
        engagementAngle = 0,
        stage = 1,
        name,
        lifeClass = "NORMAL",
        clearance = 0,
    } = params;

    // Calculate derived values
    const meanDiameter = getMeanDiameter(spec);
    const equivalentWireDiameter = Math.sqrt(spec.wireWidth * spec.wireThickness);

    return {
        id: `die-${spec.id}-${stage}`,
        name: name ?? `${spec.id} Stage ${stage}`,
        enabled: true,

        // Spring configuration
        n: count,
        k: spec.springRate,
        R: installRadius,
        theta_start: engagementAngle,

        // Geometry for stress and stop calculations
        d: equivalentWireDiameter,
        Dm: meanDiameter,
        L_free: spec.freeLength,
        L_solid: spec.solidHeight,
        clearance,

        // OEM metadata
        stage,
        role: `Die Spring ${spec.duty}`,
        stageName: `Stage ${stage}`,
        stageColor: getStageColor(stage),
    };
}

// ============================================================================
// MULTI-STAGE HELPERS
// ============================================================================

export interface DieSpringStageConfig {
    /** Die spring specification from catalog */
    spec: DieSpringSpec;
    /** Number of springs in this stage */
    count: number;
    /** Installation radius (mm) */
    installRadius: number;
    /** Engagement angle (degrees) - stage activation point */
    engagementAngle: number;
    /** Life class for stroke limit */
    lifeClass?: DieSpringLifeClass;
    /** Optional stage name */
    name?: string;
    /** Optional slot travel limit (mm) */
    slotTravelMm?: number;
}

/**
 * Create a complete multi-stage die spring system
 * 
 * @param stages - Array of stage configurations (1-3 stages)
 * @returns Array of TorsionalSpringGroup ready for system design
 */
export function createMultiStageDieSpringSystem(
    stages: DieSpringStageConfig[]
): TorsionalSpringGroup[] {
    return stages.map((config, index) => {
        const stageNum = (index + 1) as 1 | 2 | 3;
        return createDieSpringGroup({
            spec: config.spec,
            count: config.count,
            installRadius: config.installRadius,
            engagementAngle: config.engagementAngle,
            stage: stageNum,
            name: config.name,
            lifeClass: config.lifeClass,
        });
    });
}

// ============================================================================
// ANALYSIS HELPERS (Phase 7 Integrated)
// ============================================================================

import {
    TorsionalStage,
    generateSystemCurve,
    generateStageCurve,
    SystemCurve,
    StageCurve,
    StageSafeResult,
    computeStageSafe,
    computeStageKthetaNmmPerDeg
} from "@/lib/torsional";

export interface DieSpringSystemAnalysis {
    systemCurve: SystemCurve;
    stageCurves: StageCurve[];
    stageSafeResults: StageSafeResult[];
    stageKtheta: number[]; // Nmm/deg
    simpleAnalysis: {
        totalStiffness: number; // Nm/rad (legacy compat)
        systemMaxAngle: number;
    };
    // Traceability (Phase 8)
    customerDrawing?: {
        number: string;
        revision: string;
    };
    operatingRequirement?: {
        angleDeg: number;
        source: string;
    };
    assumptions?: string[];
}

/**
 * Analyze complete multi-stage system using Phase 7/8 Physics Engine
 */
export function analyzeDieSpringSystem(
    stages: DieSpringStageConfig[],
    thetaOperatingDeg?: number,
    drawingInfo?: { number: string; revision: string },
    operatingSource?: string,
    assumptions?: string[]
): DieSpringSystemAnalysis {
    // 1. Map to Torsional Core Types
    const torsionalStages: TorsionalStage[] = stages.map((s, i) => ({
        stageId: (i + 1).toString(),
        geometry: {
            effectiveRadiusMm: s.installRadius,
            slotTravelMm: s.slotTravelMm ?? Infinity
        },
        pack: {
            kind: "die",
            spec: s.spec,
            count: s.count,
            lifeClass: s.lifeClass ?? "NORMAL"
        }
    }));

    // 2. Compute Core Physics
    const systemCurve = generateSystemCurve(torsionalStages, 80, thetaOperatingDeg);
    const stageSafeResults = torsionalStages.map(computeStageSafe);
    const stageCurves = torsionalStages.map(s => generateStageCurve(s, systemCurve.thetaSafeSystemDeg));

    // 3. Stiffness & Legacy Compat
    const stageKtheta = torsionalStages.map(s =>
        computeStageKthetaNmmPerDeg(s.pack.spec.springRate, s.geometry.effectiveRadiusMm, s.pack.count)
    );

    const totalStiffnessNmPerRad = torsionalStages.reduce((sum, s) => {
        const k = s.pack.spec.springRate;
        const R = s.geometry.effectiveRadiusMm;
        const n = s.pack.count;
        return sum + (n * k * R * R * 1e-3);
    }, 0);

    return {
        systemCurve,
        stageCurves,
        stageSafeResults,
        stageKtheta,
        simpleAnalysis: {
            totalStiffness: totalStiffnessNmPerRad,
            systemMaxAngle: systemCurve.thetaSafeSystemDeg
        },
        customerDrawing: drawingInfo,
        operatingRequirement: thetaOperatingDeg ? {
            angleDeg: thetaOperatingDeg,
            source: operatingSource ?? "CUSTOMER_SPEC"
        } : undefined,
        assumptions
    };
}

// ============================================================================
// HELPERS
// ============================================================================

function getStageColor(stage: 1 | 2 | 3): string {
    switch (stage) {
        case 1: return "#3b82f6"; // blue
        case 2: return "#f59e0b"; // amber
        case 3: return "#ef4444"; // red
        default: return "#6b7280"; // gray
    }
}

export default createDieSpringGroup;

