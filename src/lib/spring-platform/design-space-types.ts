import { PlatformSpringType, PlatformInputMode } from "./types";

/**
 * DesignTarget represents a specific performance requirement (Load at Height, Torque at Angle, etc.)
 */
export interface DesignTarget {
    inputValue: number;
    inputMode: PlatformInputMode;
    targetValue: number;    // Target Load (N) or Torque (Nmm)
    tolerance?: number;      // Allowed deviation (percentage, e.g. 0.05 for 5%)
}

/**
 * DesignSpace defines the search boundaries for the automated design generation engine.
 */
export interface DesignSpace {
    springType: PlatformSpringType;

    // Parameter search ranges [min, max]
    ranges: {
        d: [number, number];       // Wire Diameter (mm)
        D: [number, number];       // Mean Diameter (mm)
        n: [number, number];       // Active Coils
        H0?: [number, number];     // Free Length (mm)
        L0?: [number, number];     // Free Length (mm)
        P0?: [number, number];     // Initial Tension (N)
        nScale?: [number, number]; // Conical Scale

        // Disc specific
        t?: [number, number];      // Thickness (mm)
        h0?: [number, number];     // Cone Height (mm)
        Ns?: [number, number];     // Series count
        Np?: [number, number];     // Parallel count
    };

    // Physical envelope constraints
    envelope?: {
        ODMax?: number;            // Maximum Outer Diameter (mm)
        IDMin?: number;            // Minimum Inner Diameter (mm)
        LengthMax?: number;        // Maximum allowed length in any state (mm)
    };

    // The performance targets we are solving for
    targets: DesignTarget[];
}
