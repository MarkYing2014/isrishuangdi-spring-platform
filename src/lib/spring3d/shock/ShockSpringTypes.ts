/**
 * Shock Absorber Spring Types
 * 减震器弹簧类型定义
 * 
 * This module defines the parameter interfaces for advanced parametric
 * shock absorber springs with variable wire diameter, mean diameter, and pitch.
 */

import * as THREE from 'three';

// ============================================================================
// Shape Types
// ============================================================================

export type MeanDiameterShape = "bulge" | "hourglass" | "linear";

/** Pitch style for different spring applications */
export type PitchStyle =
    | "symmetric"    // both ends closed, open in middle (standard shock absorber)
    | "progressive"  // pitch increases from bottom to top (progressive rate)
    | "regressive";  // pitch decreases from bottom to top (for special applications)

// ============================================================================
// Main Parameter Interface
// ============================================================================

export interface ShockSpringParams {
    /** Total number of turns */
    totalTurns: number;

    /** Samples per turn for centerline generation (40-80 recommended) */
    samplesPerTurn: number;

    /** Mean diameter law parameters (mm) */
    meanDia: {
        start: number;
        mid: number;
        end: number;
        shape: MeanDiameterShape;
    };

    /** Wire diameter law parameters (mm) */
    wireDia: {
        start: number;
        mid: number;
        end: number;
    };

    /** Pitch law parameters */
    pitch: {
        /** Pitch style (symmetric, progressive, regressive) */
        style?: PitchStyle;
        /** 
         * Number of closed (dead) turns at each end 
         * - number: same for both ends (symmetric)
         * - object: specific for each end { start: number, end: number }
         */
        closedTurns: number | { start: number; end: number };
        /** Minimum working pitch (mm/turn) */
        workingMin: number;
        /** Maximum working pitch (mm/turn) */
        workingMax: number;
        /** Transition sharpness (0.1-1.0), lower = smoother */
        transitionSharpness: number;
        /** Closed pitch factor (default 1.0, pitch = factor * end wire dia) */
        closedPitchFactor?: number;
    };

    /** End grinding parameters */
    grind: {
        /** Grind bottom end */
        top: boolean;
        /** Grind top end */
        bottom: boolean;
        /** Grinding offset in TURNS (not height!) */
        offsetTurns: number;
    };

    /** Material properties */
    material: {
        name: string;
        shearModulus: number; // MPa (G)
        tensileStrength: number; // MPa (Rm)
        density: number; // g/cm3
    };

    /** Load requirements (for validation) */
    loadcase: {
        length1: number; // mm
        force1: number;  // N
        length2?: number; // mm
        force2?: number;  // N
        freeLength?: number; // mm (target)
    };

    /** Guide / Assembly constraints */
    guide: {
        type: "rod" | "tube" | "none"; // Rod (Inner) or Tube (Outer)
        diameter: number; // mm
    };

    /** Dynamic properties (optional) */
    dynamics: {
        mass?: number; // g
        naturalFrequency?: number; // Hz
    };

    /** Debug visualization options */
    debug: {
        showCenterline: boolean;
        showFrames: boolean;
        showSections: boolean;
        showGrindingPlanes: boolean;
    };
}

// ============================================================================
// Result Interfaces
// ============================================================================

/**
 * Result from centerline generation
 */
export interface CenterlineResult {
    /** Centerline points */
    points: THREE.Vector3[];
    /** Wire radius at each point (half of wire diameter) */
    radii: number[];
    /** Total height of the spring (z_max - z_min) */
    totalHeight: number;
    /** Normalized parameter s for each point (0 to 1) */
    s: number[];
}

/**
 * Parallel Transport Frames result
 */
export interface FramesResult {
    /** Tangent vectors at each point */
    tangents: THREE.Vector3[];
    /** Normal vectors at each point */
    normals: THREE.Vector3[];
    /** Binormal vectors at each point */
    binormals: THREE.Vector3[];
}

/**
 * Grinding cut plane z-coordinates
 * null if that end is not ground
 */
export interface GrindCutPlanes {
    /** z-coordinate for bottom cut plane */
    zCutBottom: number | null;
    /** z-coordinate for top cut plane */
    zCutTop: number | null;
}

/**
 * Validation result with warnings and errors
 */
export interface ShockSpringValidation {
    warnings: string[];
    errors: string[];
}

/**
 * Computed metrics for the spring
 */
export interface ShockSpringMetrics {
    /** Total wire length in mm */
    wireLength: number;
    /** Minimum wire radius in mm */
    minRadius: number;
    /** Maximum wire radius in mm */
    maxRadius: number;
    /** Minimum pitch in mm */
    minPitch: number;
    /** Maximum pitch in mm */
    maxPitch: number;
}

// ============================================================================
// Default Parameters - Industrial Shock Absorber Spring Example
// ============================================================================

export const DEFAULT_SHOCK_SPRING_PARAMS: ShockSpringParams = {
    // 10 turns total, similar to typical shock absorber springs
    totalTurns: 10,
    samplesPerTurn: 60,

    // Cylindrical shape (uniform diameter) - typical for shock absorbers
    meanDia: {
        start: 50,    // 50mm outer diameter
        mid: 50,      // same as start - cylindrical
        end: 50,      // same as start - cylindrical
        shape: "linear", // linear = cylindrical when all same
    },

    // Uniform wire diameter - typical for industrial springs
    wireDia: {
        start: 5.0,   // 5mm wire
        mid: 5.0,     // uniform
        end: 5.0,     // uniform
    },

    // Pitch variation: closed ends, open middle
    pitch: {
        closedTurns: 1.5,       // 1.5 closed turns at each end
        workingMin: 6.0,        // min pitch in working zone
        workingMax: 14.0,       // max pitch in middle
        transitionSharpness: 0.5, // medium transition
        closedPitchFactor: 1.05,  // slightly larger than wire dia for contact
    },

    // End grinding
    grind: {
        top: true,
        bottom: true,
        offsetTurns: 0.6,  // grind about 0.6 turn from each end
    },

    // Default Material: Chrome Silicon (Cr-Si)
    material: {
        name: "Chrome Silicon (Cr-Si)",
        shearModulus: 79000,
        tensileStrength: 1600,
        density: 7.85,
    },

    // Default Loadcase (Empty/Placeholder)
    loadcase: {
        length1: 100,
        force1: 500,
    },

    // Default Guide (None)
    guide: {
        type: "none",
        diameter: 0,
    },

    dynamics: {},

    debug: {
        showCenterline: false,
        showFrames: false,
        showSections: false,
        showGrindingPlanes: false,  // hide by default for cleaner view
    },
};
