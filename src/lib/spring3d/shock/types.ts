/**
 * Shock Spring Module - Type Definitions
 * 
 * Strictly separated into:
 * - ShockSpringInput: User parameters from UI
 * - ShockSpringDerived: Geometry derived from laws (d(s), pitch(s), etc)
 * - ShockSpringResult: Physics analysis output (k(x), P(x), fatigue)
 */

import * as THREE from 'three';

// ============================================================================
// Enums & Literals
// ============================================================================

export type MeanDiameterShape = "linear" | "bulge" | "hourglass";
export type PitchStyle = "symmetric" | "progressive" | "regressive";
export type EndCondition = "closed" | "closed_ground" | "open";
export type GrindingMode = "none" | "visualClip" | "exportCut";

// ============================================================================
// 1. Input Interface (User Parameters)
// ============================================================================

export interface ShockSpringInput {
    /** Total number of turns (Nt) */
    totalTurns: number;

    /** Samples per turn for centerline generation (default 60) */
    samplesPerTurn: number;

    /** Mean Diameter Law */
    meanDia: {
        start: number;
        mid: number;
        end: number;
        shape: MeanDiameterShape;
    };

    /** Wire Diameter Law */
    wireDia: {
        start: number;
        mid: number;
        end: number;
    };

    /** Pitch Law */
    pitch: {
        style: PitchStyle;
        /** Number of closed turns at [start, end] */
        closedTurns: { start: number; end: number };
        workingMin: number;
        workingMax: number;
        /** Sharpness of transition from closed to working pitch (0.1 - 2.0) */
        transitionSharpness: number;
        /** Factor for closed pitch (default 1.05 * d) */
        closedPitchFactor: number;
    };

    /** Grinding Configuration */
    grinding: {
        mode: GrindingMode;
        /** Grind start (bottom) end? */
        grindStart: boolean;
        /** Grind end (top) end? */
        grindEnd: boolean;
        /** Offset in turns (not height) */
        offsetTurns: number;
    };

    /** Material Properties */
    material: {
        name: string;
        shearModulus: number; // MPa
        tensileStrength: number; // MPa (Su)
        density: number; // g/cm³
    };

    /** Installation / Constraints */
    installation: {
        guided: boolean;
        guideDia: number; // Guide rod or hole diameter
        guideType: "rod" | "hole" | "none";
        preloadedLength?: number; // L_preload
    };

    /** Load Case Definition */
    loadCase: {
        rideHeight?: number; // L_ride
        rideDeflection?: number; // x_ride
        bumpHeight?: number; // L_bump
        bumpDeflection?: number; // x_bump
        solidMargin: number; // mm
    };
}

// Legacy Compatibility Aliases
export type ShockSpringParams = ShockSpringInput;

// ============================================================================
// 2. Derived Geometry Interface (Intermediate Laws)
// ============================================================================

export interface SegmentProps {
    index: number;
    isActive: boolean;
    normStart: number; // Normalized t [0,1]
    normEnd: number;
    pitch: number;
    wireDia: number;
    meanDia: number;
    gap: number; // Local gap = pitch - wireDia
}

export interface ShockSpringDerived {
    /** Total wire length (uncoiled) */
    wireLength: number;
    /** Free length (L0) calculated from pitch integration */
    freeLength: number;
    /** Solid height (Hs) calculated from wire stack */
    solidHeight: number;
    /** Mass of the active spring body (g) */
    mass: number;
    /** Centerline curve (3D points) */
    centerline: THREE.Vector3[];
    /** Frenet frames for visualization */
    frames: {
        tangents: THREE.Vector3[];
        normals: THREE.Vector3[];
        binormals: THREE.Vector3[];
    };
    /** Tube radius at each centerline point */
    radii: number[];
    /** Grinding planes in local coordinates */
    grindingPlanes: {
        startZ: number | null;
        endZ: number | null;
        startNormal: THREE.Vector3;
        endNormal: THREE.Vector3;
    };
    /** Segments for contact analysis */
    segments: SegmentProps[];
}

// ============================================================================
// 3. Result Interface (Physics Output)
// ============================================================================

export interface KxPoint {
    x: number; // Deflection (mm)
    k: number; // Stiffness (N/mm)
    force: number; // Force (N) - from integral
    activeCoils: number; // Effective Na
    stress: number; // Max shear stress (MPa)
}

export interface FatigueResult {
    meanStress: number; // MPa
    altStress: number; // MPa
    utilization: number; // % of fatigue limit
    safetyFactor: number;
    lifeEstimate: "infinite" | "high_cycle" | "low_cycle" | "fail";
    assumptions: string[];
}

export interface ShockSpringResult {
    /** True if geometry generation succeeded */
    isValid: boolean;
    errors: string[];

    /** Derived geometry */
    derived: ShockSpringDerived;

    /** Non-linear stiffness curve (x -> k, P) */
    kxCurve: KxPoint[];

    /** Energy curve (x -> Joules) */
    energyCurve: { x: number; joules: number }[];

    /** Operating Points */
    preload: { x: number; force: number; stress: number; k: number };
    ride: { x: number; force: number; stress: number; k: number; sf: number };
    bump: { x: number; force: number; stress: number; k: number; sf: number };

    /** Fatigue Analysis */
    fatigue: FatigueResult;

    /** Design Rule Checks */
    designRules: {
        id: string;
        message: string;
        severity: "ok" | "warning" | "error";
        value: number;
        limit: number;
    }[];
}

// ============================================================================
// 4. Default Parameters
// ============================================================================

export const DEFAULT_SHOCK_SPRING_PARAMS: ShockSpringInput = {
    totalTurns: 10,
    samplesPerTurn: 60,
    meanDia: { start: 40, mid: 40, end: 40, shape: 'linear' },
    wireDia: { start: 4, mid: 4, end: 4 },
    pitch: {
        style: 'symmetric',
        closedTurns: { start: 1.5, end: 1.5 },
        workingMin: 10,
        workingMax: 10,
        transitionSharpness: 0.5,
        closedPitchFactor: 1.05
    },
    grinding: {
        mode: 'none',
        grindStart: false,
        grindEnd: false,
        offsetTurns: 0
    },
    material: {
        name: 'Spring Steel',
        shearModulus: 79000,
        tensileStrength: 1600,
        density: 7.85
    },
    installation: {
        guided: false,
        guideDia: 0,
        guideType: 'none'
    },
    loadCase: {
        solidMargin: 3.0
    }
};
