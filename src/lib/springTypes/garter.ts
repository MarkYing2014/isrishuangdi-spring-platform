
import { SpringDesignBase, SpringCalculationResultBase } from "../springTypes";

// ============================================================================
// GARTER SPRING / OIL SEAL SPRING TYPES
// 油封弹簧 / 环形拉伸弹簧类型定义
// ============================================================================

export type GarterJointType = "hook" | "screw" | "loop";

export const GARTER_JOINT_LABELS: Record<GarterJointType, { en: string; zh: string }> = {
    hook: { en: "Hook Joint", zh: "钩接头" },
    screw: { en: "Screw Joint", zh: "螺纹接头" },
    loop: { en: "Loop Joint", zh: "环接头" },
};

/**
 * Garter Spring Geometry
 * 
 * Typically treated as an extension spring coiled into a ring.
 * - d: Wire diameter
 * - Dm: Mean coil diameter (of the spring body itself)
 * - Na: Active coils (of the spring body itself)
 * - L0: Free length (linear length of the spring body before joined)
 * - D_ring_free: Free diameter of the ring (formed by joining ends)
 */
export interface GarterSpringDesign extends SpringDesignBase {
    type: "garter";

    /** Mean coil diameter of the spring body itself (mm) */
    meanDiameter: number;

    /** Active coils of the spring body */
    activeCoils: number;

    /** Total coils (often equal to active for garter, or depends on ends) */
    totalCoils?: number;

    /** 
     * Free length of the spring body (mm) - Linear
     * This is the length of the spring if it were straight, before joining.
     * L0 ≈ π * D_ring_free
     */
    freeLength: number;

    /** Joint type */
    jointType?: GarterJointType;

    /** Joint stress concentration factor (optional override) */
    jointFactor?: number;

    /** 
     * Free Ring Diameter (mm) - Centerline diameter of the ring when joined but not installed.
     * D_ring_free = L0 / π
     */
    ringFreeDiameter: number;

    /**
     * Installed Ring Diameter (mm) - Diameter when installed on the shaft/lip.
     */
    ringInstalledDiameter?: number;
}

/**
 * Garter Calculation Result
 */
export interface GarterCalculationResult extends SpringCalculationResultBase {
    type: "garter";

    /** Spring Rate (Axial equivalent) in N/mm */
    k: number;

    /** Installed Ring Diameter in mm */
    ringInstalledDiameter: number;

    /** Circumferential Change (Travel) in mm: ΔC = π * (D_installed - D_free) */
    circumferentialChange: number;

    /** Ring Tension (Axial Force in the spring wire) in N */
    tension: number;

    /** Estimated Radial Force (Pressing force) in N */
    radialForceEstimate: number;

    /** Stress Ratio */
    stressRatio: number; // For convenience in result

    /** Safety Factor */
    safetyFactor: number; // For convenience in result
}
