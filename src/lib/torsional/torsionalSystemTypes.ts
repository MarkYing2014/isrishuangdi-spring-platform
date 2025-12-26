/**
 * Torsional Spring System (Clutch Damper) Types
 * 
 * Target: Multi-group circumferential spring layout
 */

export interface TorsionalSpringGroup {
    id: string;
    name?: string;
    enabled: boolean;

    // Count of springs in this group
    n: number;

    // Spring rate k (axial compression) [N/mm]
    k: number;

    // Mounting Radius R [mm]
    R: number;

    // Engagement / Activation Angle θ_start [deg]
    theta_start: number;

    // Geometric parameters for stress and stop calculation
    d: number;      // wire diameter [mm]
    Dm: number;     // mean coil diameter [mm]
    L_free: number; // free length [mm]
    L_solid: number;// solid length [mm]
    clearance: number; // additional clearance before rigid stop [mm]

    materialId?: string;
}

export interface TorsionalSpringSystemDesign {
    type: "torsionalSpringSystem";
    id?: string;
    name?: string;
    groups: TorsionalSpringGroup[];

    // System-level friction torque [Nm]
    frictionTorque: number;

    // Reference angle for analysis [deg] (Current work angle)
    referenceAngle: number;

    // Optional inertia (V2)
    inertia?: number;
}

/**
 * Result point for plotting Curves
 */
export interface TorsionalCurvePoint {
    theta: number;       // [deg]
    torqueLoad: number;  // [Nm]
    torqueUnload: number;// [Nm]
    stiffness: number;   // [Nm/deg]
    activeGroups: string[];
}

/**
 * Result per group at a specific total torque/angle
 */
export interface TorsionalGroupResult {
    groupId: string;
    torque: number;      // Torque contribution of this group [Nm]
    force: number;       // Force per spring in this group [N]
    stress: number;      // Current shear stress [MPa]
    utilization: number; // stress / allowable
    isStopping: boolean; // if this group hit its own geometry stop
}

export interface TorsionalSystemResult {
    curves: TorsionalCurvePoint[];
    perGroup: TorsionalGroupResult[]; // Results at referenceAngle
    totalTorque: {
        load: number;
        unload: number;
    };
    totalStiffness: number; // [Nm/deg]
    thetaStop: number;      // System-wide stop angle [deg]
    warnings: string[];
}
