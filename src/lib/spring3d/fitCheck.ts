export interface SpringDimensions {
    meanDiameter: number;
    wireDiameter: number;
}

export interface FitResult {
    outerID: number;
    innerOD: number;
    clearance: number;
    status: "PASS" | "WARN" | "FAIL";
    message?: string;
}

export const DEFAULT_RADIAL_CLEARANCE_MM = 0.25;

/**
 * Calculates the radial clearance between nested springs.
 * clearance = (Outer_ID - Inner_OD) / 2
 */
export function calculateFit(
    outer: SpringDimensions,
    inner: SpringDimensions,
    policyClearanceMm: number = DEFAULT_RADIAL_CLEARANCE_MM
): FitResult {
    // Input Defense (Clamp to >= 0)
    const D1 = Math.max(0, outer.meanDiameter);
    const d1 = Math.max(0, outer.wireDiameter);
    const D2 = Math.max(0, inner.meanDiameter);
    const d2 = Math.max(0, inner.wireDiameter);

    const outerID = D1 - d1;
    const innerOD = D2 + d2;
    const diametralClearance = outerID - innerOD;
    const radialClearance = diametralClearance / 2;

    let status: "PASS" | "WARN" | "FAIL";
    let message = "OK: Clearance meets policy";

    if (radialClearance <= 0) {
        status = "FAIL";
        message = "Interference: Inner exceeds outer envelope";
    } else if (radialClearance < policyClearanceMm) {
        status = "WARN";
        message = "Geometric fit, but violates policy clearance";
    } else {
        status = "PASS";
    }

    return {
        outerID,
        innerOD,
        clearance: radialClearance,
        status,
        message
    };
}
