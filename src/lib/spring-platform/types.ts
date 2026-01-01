import { SpringType } from "@/lib/springTypes";
import { SpringMaterialId } from "@/lib/materials/springMaterials";

/** Supported spring types for the multi-point platform */
export type PlatformSpringType =
    | "compression"
    | "extension"
    | "torsion"
    | "conical"
    | "arc"
    | "disc"
    | "spiral"
    | "wave"
    | "variablePitch"
    | "shock";

/** Input modes vary by spring type */
export type PlatformInputMode =
    | "height" | "deflection" // Compression / Extension / Conical / Shock
    | "angle" | "torque";     // Torsion / Spiral

export type PlatformDesignMode = "verification" | "targetLoad" | "stiffnessSelection" | "designOpt";

export type PlatformWorkflowStatus = "CONCEPT" | "REVIEW" | "APPROVED" | "RFQ" | "PRODUCTION";

export interface PlatformDesignSummary {
    title: string;
    details: { label: string; value: string; unit?: string }[];
    warnings?: string[];
}

// =============================================================================
// Phase 15: Engineering Evolution & Snapshots
// =============================================================================

export type SnapshotPin = "baseline" | "milestone" | "final";

export interface SnapshotMeta {
    id: string;                 // uuid
    createdAt: string;          // ISO
    author?: string;            // optional
    label?: string;             // e.g., "Fix fatigue", "OEM target"
    comment?: string;           // human note
    pinned?: SnapshotPin;       // controls report inclusion
}

export interface SnapshotPayload {
    springType: PlatformSpringType;
    input: any;                 // engine input (geometry + material params)
    modules: Record<string, boolean>;  // platform module toggles at time of capture
    axisMode?: string;          // height/deflection/angle etc
}

export interface SnapshotSummary {
    status: "pass" | "warning" | "fail";
    kpi: Record<string, number | null>; // fatigueSF, maxStress, energy, etc
    loadCases: Array<{
        name: string;             // L1/L2/Stage1/ride/bump
        x: number;                // deflection/angle
        y: number;                // load/torque
        stress?: number | null;
        status?: "ok" | "warning" | "danger" | "invalid";
    }>;
    assumptions?: string[];     // from getSummary or engine summary
}

export interface DesignSnapshot {
    meta: SnapshotMeta;
    payload: SnapshotPayload;
    summary: SnapshotSummary;
}

export interface EvolutionState {
    snapshots: DesignSnapshot[];
    selectedSnapshotId?: string;      // for viewing
    compareWithId?: string;           // diff anchor
}

/** Shock Spring Specific Input (GEN-2) */
export interface ShockSpringInput {
    totalTurns: number;
    samplesPerTurn: number;

    meanDia: { start: number; mid: number; end: number; shape: "linear" | "bulge" | "hourglass" };
    wireDia: { start: number; mid: number; end: number; shape?: "olive" | "linear" };

    pitch: {
        style: "symmetric" | "progressive" | "regressive";
        closedTurns: number | { start: number; end: number };
        workingMin: number;
        workingMax: number;
        transitionSharpness: number;
        closedPitchFactor?: number;
    };

    ends?: {
        closedTop?: boolean;
        closedBottom?: boolean;
        groundTop?: boolean; // Using boolean for simplicity in Platform
        groundBottom?: boolean;
        grindOffsetTurns?: number;
    };

    materialId?: string;

    installation?: {
        guided: boolean;
        endCondition?: "open" | "closed" | "ground";
        // optional clearance checks
        rodDia?: number;
        tubeId?: number;
        seatODTop?: number;
        seatODBottom?: number;
    };
}

/** Input for the reverse solver */
export interface SolveForTargetInput {
    mode: "singlePoint" | "twoPoint";
    target1: { x: number; y: number }; // (inputVar, outputVar)
    target2?: { x: number; y: number };
    clamps?: {
        nRange?: [number, number];   // default [2, 50]
        P0Range?: [number, number];  // extension, default [0, +inf]
        nScaleRange?: [number, number]; // conical, default [0.5, 2.0]
        kRange?: [number, number];
    };
}

/** Result from the reverse solver */
export interface SolveForTargetResult<TParams = any> {
    ok: boolean;
    solvedParams?: Partial<TParams>;
    derived?: Record<string, number>;
    warnings?: string[];
    errors?: string[];
}

/** Status of a specific load case */
export type CaseStatus = "ok" | "warning" | "danger" | "invalid";

/** Detailed reason for the status */
export type CaseStatusReason =
    | "none"
    | "solid"      // Coil bind / Solid height
    | "stress"     // Primary stress (shear/bending)
    | "hook"       // Extension hook stress
    | "leg"        // Torsion leg stress
    | "geometry"   // Geometric interference / Small ID
    | "travel";    // Travel limit / Over-deflection

/** Modules toggle system */
export interface PlatformModules {
    basicGeometry: boolean;
    loadAnalysis: boolean;
    stressAnalysis: boolean;
    solidAnalysis?: boolean;    // Comp / Conical
    hookAnalysis?: boolean;     // Extension
    legAnalysis?: boolean;      // Torsion
    fatigueAnalysis: boolean;
    dynamics: boolean;
}

/** A single load case (previously LoadPoint) */
export interface LoadCaseResult {
    id: string;               // e.g., "L1", "Theta1"
    labelEn: string;
    labelZh: string;

    // Input value (Height, Deflection, Angle, etc.)
    inputValue: number;
    inputMode: PlatformInputMode;
    altInputValue?: number;   // Opposite of inputValue (e.g. x if input is H)
    altInputLabel?: string;   // Label for alternative input

    // Output values
    load?: number;            // P (N) or M (Nmm)
    stress?: number;          // tau (MPa) or bending sigma (MPa)
    kInstant?: number;        // Stiffness at this point
    sfMin?: number;           // Safety Factor

    // Status
    status: CaseStatus;
    statusReason?: CaseStatusReason;
    isValid: boolean;
    messageEn?: string;
    messageZh?: string;
    warnings?: string[];

    // Phase 7: Metadata for complex springs
    stage?: number;           // 1/2/3 for piecewise non-linear
    energy?: number;          // Accumulated energy at this point (J)

    // Shock specific
    tauMax?: number;          // Alias for stress if needed, but stress field is standard
}

/** Full calculation result from an engine */
export interface PlatformResult {
    springType: PlatformSpringType;
    cases: LoadCaseResult[];

    // Common properties
    springRate: number;       // k (N/mm or Nmm/deg)
    springIndex: number;      // C
    wahlFactor: number;       // Kw

    // Geometry Reference
    H0?: number;              // Free length (Compression/Extension)
    Hb?: number;              // Solid height (Compression/Conical)

    // Extension specific
    P0?: number;              // Initial tension

    // Overall status
    isValid: boolean;
    maxStress: number;        // Peak stress across all cases
    tauAllow: number;         // Material allowable stress
    workflowStatus?: PlatformWorkflowStatus;

    // Phase 7: Energy metric
    totalEnergy?: number;

    // Curves (Optional, added for Shock/Non-linear)
    curves?: {
        kx: { x: number; y: number; meta?: any }[];
        px: { x: number; y: number }[];
        energy: { x: number; y: number }[];
    };

    mass?: number;
    wireLength?: number;
    maxStroke?: number; // Limit

    // Phase 8: Design Rules Checklist
    designRules?: {
        id: string;
        label: string;
        status: "pass" | "fail" | "warning";
        message: string;
        value?: number | string;
        limit?: number | string;
    }[];

    /** Raw engine result (for 3D visualizers or specific tools) */
    rawResult?: any;
}

/** Detailed Material Model for advanced calculations */
export interface PlatformMaterialModel {
    id: string;
    G: number;
    E: number;
    tauAllow: number; // static reference

    // Dynamic/Functional allowables (for future Phase 5 expansion)
    getTauAllow?: (params: any) => number;
    getSigmaAllow?: (params: any) => number;
}


/** Base interface for a spring calculating engine */
export interface ISpringEngine {
    type: PlatformSpringType;

    calculate(params: {
        geometry: any;          // Spring-specific geometry
        material: PlatformMaterialModel;
        cases: {
            mode: PlatformInputMode;
            values: number[];
        };
        modules: PlatformModules;
        springType?: PlatformSpringType;
    }): PlatformResult;

    /**
     * Platform Optimization Methods
     */
    solveForTarget?(context: { geometry: any; material: any }, input: SolveForTargetInput): { ok: boolean; solvedParams?: any; error?: string };

    /**
     * Engineering Report Summary
     */
    getSummary?(context: { geometry: any; material: any; result: PlatformResult }): PlatformDesignSummary;
}

// --- Arc Spring Specific Types ---

export type ArcRLeverMode = "backbone" | "meanDiameter" | "custom";

export interface ArcPackGroup {
    id: string;                 // "G1", "G2"...
    name?: string;              // optional display name
    count: number;              // pcs in this group (torque scales linearly)

    // piecewise stage definition
    phi0Deg?: number;           // deadband / gap removal (default 0)
    phiBreaksDeg: [number, number]; // [b1, b2] with b2 > b1 >= 0
    kStages: [number, number, number]; // [k1,k2,k3] in Nmm/deg

    enabledStages?: [boolean, boolean, boolean]; // default [true,true,true]
}

export interface ArcSpringParams {
    // global geometry (for stress + constraints)
    d: number;                  // wire diameter mm
    Dm: number;                 // mean coil diameter mm
    n: number;                  // active coils (kept for reporting / future)
    R: number;                  // backbone radius mm
    arcSpanDeg: number;         // max allowable travel angle (geometry limit)

    // torque-to-force lever arm model
    rLeverMode: ArcRLeverMode;  // default "backbone"
    rLeverCustom?: number;      // mm (if custom)

    // material
    G: number;                  // shear modulus MPa
    tauAllow?: number;          // MPa

    // pack topology
    packGroups: ArcPackGroup[];

    // smoothing (optional but recommended)
    stageSmoothing?: number;    // 0..1 (default 0.15)
}
