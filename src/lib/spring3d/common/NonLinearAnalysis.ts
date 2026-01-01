/**
 * Spring Platform GEN-2: Unified Non-Linear Analysis Template
 * 
 * A generalized solver for 'Segmented Stiffness Aggregation'.
 * Can be reused for Shock, Arc, Wave, and Disc springs.
 * 
 * Logic matches the "Physics Commitments":
 * 1. Segment-based k(x)
 * 2. Integral P(x)
 * 3. Monotonic Stability
 */

export interface AnalysisSegment {
    id: number | string;
    gap: number;        // Distance to closure (mm)
    compliance: number; // 1/stiffness (mm/N)
    activeScalar: number; // Contribution to Active Quantity (e.g. Active Turns, or Angle)
    stressFactor: number; // Shear Stress per Unit Force (MPa/N)
    isClosed: boolean;  // State
}

export interface KxPointGeneric {
    x: number;          // Deflection (mm)
    k: number;          // Instantaneous stiffness (N/mm)
    force: number;      // Force (N)
    activeScalar: number; // Sum of active scalars
    stress: number;     // Max stress in the spring (MPa)
}

/**
 * Solves the non-linear Force-Deflection curve for any segmented spring model.
 * 
 * @param segments Array of segments representing the spring body
 * @param maxDeflection Maximum deflection to simulate (L0 - Hs)
 * @param steps Number of steps for resolution (default 100)
 */
export function computeNonLinearKx(
    segments: AnalysisSegment[],
    maxDeflection: number,
    steps: number = 100
): KxPointGeneric[] {

    // Sort segments by gap? No, the algorithm handles any order, 
    // but sorting helps performance optimization in complex cases.
    // We stick to the robust iterative distribution method.

    const points: KxPointGeneric[] = [];

    // Clone segments to avoid mutating input during simulation
    // We re-clone inside the loop actually to ensure stateless steps if we want parallel safety,
    // but here we can just reuse a working copy if reset properly. 
    // To match `shock` logic exactly, we re-assess at each step independent of history to avoid drift.

    // Pre-calculate total compliance for heuristic
    // const totalCompliance = segments.reduce((sum, s) => sum + s.compliance, 0);

    for (let i = 0; i <= steps; i++) {
        const xTarget = (i / steps) * maxDeflection;

        // 1. Solve Equilibrium for xTarget

        // Working constraints: 
        // sum(delta_i) = xTarget
        // delta_i = min(F * C_i, gap_i) if not closed? 
        // actually: if closed, delta_i = gap_i. if open, delta_i = F * C_i.
        // check: F * C_i >= gap_i -> implies closed.

        // Iterative approach to find F:
        let accumulatedForce = 0;
        let activeCompliance = 0;
        let iter = 0;
        let converged = false;

        // Simulation state for this step
        const stepSegments = segments.map(s => ({ ...s, closed: false }));

        // Initial Guess: All open
        activeCompliance = stepSegments.reduce((sum, s) => sum + s.compliance, 0);

        while (!converged && iter < 15) {
            // Sum of gaps of already closed segments
            const sumClosedGaps = stepSegments.filter(s => s.closed).reduce((sum, s) => sum + s.gap, 0);

            // Check for fully solid
            if (activeCompliance < 1e-12) {
                break; // Theoretical infinite stiffness
            }

            // Estimate F required to deflect REMAINING open compliance by (xTarget - sumClosedGaps)
            const F_estimate = (xTarget - sumClosedGaps) / activeCompliance;

            let newClosure = false;

            // Validation Check
            stepSegments.forEach(s => {
                if (!s.closed) {
                    const estimatedDeflection = F_estimate * s.compliance;
                    // Tolerance for floating point (1e-9)
                    if (estimatedDeflection >= s.gap - 1e-9) {
                        s.closed = true;
                        newClosure = true;
                    }
                }
            });

            // Update Active Compliance
            activeCompliance = stepSegments.filter(s => !s.closed).reduce((sum, s) => sum + s.compliance, 0);

            if (!newClosure) {
                converged = true;
                accumulatedForce = Math.max(0, F_estimate);
            }
            iter++;
        }

        // 2. Compute Instantaneous Stiffness (Tangential)
        // k = 1 / sum(active_compliance)
        // Cap stiffness at reasonable max (e.g. 1e6 or 100x Nominal) to avoid Infinity
        const k_inst = activeCompliance > 1e-9 ? (1 / activeCompliance) : 1e6; // Placeholder max

        // 3. Compute Active Scalar (e.g. Active Turns)
        const currentActiveScalar = stepSegments.filter(s => !s.closed).reduce((sum, s) => sum + s.activeScalar, 0);

        // 4. Compute Max Stress
        // Stress at this force. Find max across all segments.
        let maxStress = 0;
        stepSegments.forEach(s => {
            const stress = accumulatedForce * s.stressFactor;
            if (stress > maxStress) maxStress = stress;
        });

        points.push({
            x: xTarget,
            k: k_inst,
            force: accumulatedForce,
            activeScalar: currentActiveScalar,
            stress: maxStress
        });
    }

    return points;
}

/**
 * Computes Energy (Joules) via Trapezoidal Integration of P(x).
 */
export function computeGenericEnergy(kxCurve: KxPointGeneric[]): { x: number; joules: number }[] {
    const energy: { x: number; joules: number }[] = [];
    let currentJ = 0;

    if (kxCurve.length === 0) return [];
    energy.push({ x: kxCurve[0].x, joules: 0 });

    for (let i = 1; i < kxCurve.length; i++) {
        const p1 = kxCurve[i - 1];
        const p2 = kxCurve[i];
        const dx = (p2.x - p1.x) / 1000; // mm -> m
        const F_avg = (p1.force + p2.force) / 2;
        currentJ += F_avg * dx;
        energy.push({ x: p2.x, joules: currentJ });
    }
    return energy;
}
